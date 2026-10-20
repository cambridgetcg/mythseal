import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const PUBLIC_FILES = Object.freeze(JSON.parse(readFileSync(new URL('../hosting/public-assets.json', import.meta.url), 'utf8')));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function readRegular(root, relative) {
  let path = root;
  for (const part of relative.split('/')) {
    path = join(path, part);
    if ((await lstat(path)).isSymbolicLink()) throw new Error(`Refusing symlink: ${relative}`);
  }
  if (!(await lstat(path)).isFile()) throw new Error(`Not a regular file: ${relative}`);
  return readFile(path);
}

export const BUILD_TARGETS = Object.freeze(['web', 'native']);

/** What the store build leaves out (docs/IOS-FIRST-FLIGHT.md): the account client (the only
 * code that calls /api), 旅程閣's markup and its styles, as files. A store build is an offline
 * guest build, and App Review 2.5.19 does not accept hidden or dormant features, so the part
 * that could reach an account is not shipped at all. What stays is 旅程閣's wiring inside
 * shared modules (app.mjs's account screen, actions and sign-in form handler; save-ui.mjs's and
 * scene-adapters.mjs's cloud copy), switched off by NATIVE_SHELL and the inert controller, with
 * no client left to call: the record says what, and why it cannot run. cloud-save.mjs stays:
 * despite its name it is the local journey's validator, which profile-store.mjs,
 * local-commands.mjs and D2's file import use, and it makes no request. */
export const NATIVE_EXCLUDED = Object.freeze(['account-client.mjs', 'account-ui.mjs', 'account.css']);
/** The only edits the store build makes, so nothing it ships points at an excluded file. Each
 * must match exactly once, or the build stops: a silent miss would ship a broken import.
 * account-offline.mjs exports the same names as the two modules it replaces, inert, and the
 * build checks that it still does (NATIVE_OFFLINE): a name it lacks would pass every Node test
 * and then stop the app at module linking, before the game loads. */
export const NATIVE_EDITS = Object.freeze({
  'app.mjs': Object.freeze([
    ["from './account-client.mjs';", "from './account-offline.mjs';"],
    ["from './account-ui.mjs';", "from './account-offline.mjs';"],
  ]),
  'index.html': Object.freeze([['  <link rel="stylesheet" href="account.css">\n', '']]),
});
export const NATIVE_OFFLINE = 'account-offline.mjs';

/** What `path` (a module) imports from the module at `target` (a path from the root, as
 * localReferences resolves it): each named import by the name it is exported under, plus
 * 'default' for a default import and '*' for a namespace import, which no export list can
 * vouch for. Static imports only; the store build's swap makes only those. */
export function importedNames(path, text, target) {
  const names = [];
  for (const [, clause, reference] of text.matchAll(/\bimport\s*([^'"`;]*?)\s*\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    if (posix.normalize(posix.join(posix.dirname(path), reference)) !== target) continue;
    const named = /\{([^}]*)\}/.exec(clause);
    if (named) names.push(...named[1].split(',').map(part => part.trim().split(/\s+as\s+/)[0]).filter(Boolean));
    const rest = clause.replace(/\{[^}]*\}/, '').replace(/,/g, ' ').trim();
    if (rest) names.push(rest.startsWith('*') ? '*' : 'default');
  }
  return names;
}

/** The names a module exports, read from its text: `export function|class|const|let|var`
 * (the first binding of a declaration), `export { a, b as c }` lists and `export default`. */
export function exportedNames(text) {
  const names = new Set();
  for (const [, name] of text.matchAll(/\bexport\s+(?:async\s+)?(?:function\s*\*?|class|const|let|var)\s*([A-Za-z_$][\w$]*)/g)) names.add(name);
  for (const [, list] of text.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const part of list.split(',')) { const name = part.trim().split(/\s+as\s+/).at(-1); if (name) names.add(name); }
  }
  if (/\bexport\s+default\b/.test(text)) names.add('default');
  return names;
}

/** Local files a shipped page or module refers to: src/href in HTML; static, re-exported and
 * dynamic imports in modules; @import and url() in CSS. Same reading as tests/hosting.test.mjs. */
export function localReferences(path, text) {
  const matches = path.endsWith('.html') ? [...text.matchAll(/\s(?:src|href)="([^"#?:]+)"/g)].map(match => match[1])
    : path.endsWith('.mjs') ? [...text.matchAll(/(?:\bimport|\bexport)\s[^'"`;]*?\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]|\bimport\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)|\bimport\s*['"](\.{1,2}\/[^'"]+)['"]/g)].map(match => match[1] ?? match[2] ?? match[3])
      // CSS: inline data: URIs are dropped first, since an SVG inside one has url(#…) of its own.
      : path.endsWith('.css') ? [...text.replace(/url\(\s*(['"]?)data:[\s\S]*?\1\s*\)/g, '').matchAll(/@import\s+(?:url\()?['"]?([^'")\s]+)|url\(\s*['"]?(?!data:|https?:|#)([^'")]+)['"]?\s*\)/g)].map(match => match[1] ?? match[2])
        : [];
  return matches.map(reference => posix.normalize(posix.join(posix.dirname(path), reference)));
}

function applyNativeEdits(path, bytes) {
  const edits = NATIVE_EDITS[path];
  if (!edits) return bytes;
  let text = bytes.toString('utf8');
  for (const [from, to] of edits) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`Native build: expected exactly one ${JSON.stringify(from)} in ${path}, found ${count}`);
    text = text.replace(from, to);
  }
  return Buffer.from(text, 'utf8');
}

export async function build(root = fileURLToPath(new URL('../', import.meta.url)), { target = 'web' } = {}) {
  if (!BUILD_TARGETS.includes(target)) throw new Error(`Unknown build target: ${target}`);
  root = resolve(root);
  const output = join(root, 'dist');
  const previous = await lstat(output).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (previous && (!previous.isDirectory() || previous.isSymbolicLink())) throw new Error('dist must be a regular directory');
  // Validate every source before replacing an earlier build. Never recurse through the repo.
  const shipped = target === 'native' ? PUBLIC_FILES.filter(path => !NATIVE_EXCLUDED.includes(path)) : PUBLIC_FILES;
  const files = await Promise.all(shipped.map(async path => {
    const bytes = await readRegular(root, path);
    return { path, bytes: target === 'native' ? applyNativeEdits(path, bytes) : bytes };
  }));
  if (target === 'native') {
    for (const { path, bytes } of files) {
      const excluded = localReferences(path, bytes.toString('utf8')).find(reference => NATIVE_EXCLUDED.includes(reference));
      if (excluded) throw new Error(`Native build: ${path} still refers to ${excluded}, which the store build leaves out`);
    }
    // Every name a shipped module takes from the inert stand-in must be one it exports.
    const offline = files.find(file => file.path === NATIVE_OFFLINE);
    const provided = offline ? exportedNames(offline.bytes.toString('utf8')) : new Set();
    for (const { path, bytes } of files) {
      if (!path.endsWith('.mjs')) continue;
      const missing = importedNames(path, bytes.toString('utf8'), NATIVE_OFFLINE).filter(name => name === '*' || !provided.has(name));
      if (missing.length) throw new Error(`Native build: ${path} imports ${missing.join(', ')} from ${NATIVE_OFFLINE}, which ${offline ? `does not export ${missing.length > 1 ? 'them' : 'it'} by that name` : 'the build does not ship'}; give ${NATIVE_OFFLINE} an inert export for each name app.mjs takes from account-client.mjs and account-ui.mjs`);
    }
  }
  // _headers is Cloudflare's hosting file; a native shell serves the bundle itself.
  const headers = target === 'web' ? await readRegular(root, 'hosting/_headers') : null;
  const { version } = JSON.parse(await readRegular(root, 'package.json'));
  let commit = null;
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
  const assets = files.map(({ path, bytes }) => ({ path, bytes: bytes.length, sha256: sha256(bytes) }));
  const release = {
    schemaVersion: 1, name: 'mythseal', ...(target === 'native' ? { target } : {}), clientVersion: version, gitCommit: commit,
    assetsManifestSHA256: sha256(JSON.stringify(assets)), assets,
    hostingHeadersSHA256: headers ? sha256(headers) : null, contractRefs: [],
    // 旅程閣 (journey-archive-ui) is the website's; the store build ships no account client and never shows it.
    enabledFeatures: ['offline-game', 'local-backpack', 'npc-market', ...(target === 'web' ? ['journey-archive-ui'] : [])],
    // Store builds start no account client (account-offline.mjs); only the website gates these at runtime.
    runtimeGatedFeatures: target === 'web' ? ['email-login', 'private-journey-backup'] : [],
  };
  await rm(output, { recursive: true, force: true });
  for (const { path, bytes } of files) {
    await mkdir(dirname(join(output, path)), { recursive: true });
    await writeFile(join(output, path), bytes);
  }
  if (headers) await writeFile(join(output, '_headers'), headers);
  await writeFile(join(output, 'release.json'), JSON.stringify(release, null, 2) + '\n');
  return release;
}

/** The command line: `--target <name>` or `--target=<name>`, web when absent. A bare
 * `--target`, any other option or a stray argument is refused rather than read as the web
 * build, which ships the account client; an unknown name is refused by build(). */
export function parseBuildArgs(args) {
  const { values } = parseArgs({ args, options: { target: { type: 'string', default: 'web' } }, strict: true, allowPositionals: false });
  return { target: values.target };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { target } = parseBuildArgs(process.argv.slice(2));
  const release = await build(undefined, { target });
  console.log(`Built Mythseal ${release.clientVersion}${target === 'web' ? '' : ` (${target})`}: ${release.assets.length} public files, manifest ${release.assetsManifestSHA256}`);
}
