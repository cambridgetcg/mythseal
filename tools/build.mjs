import { lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

export async function build(root = fileURLToPath(new URL('../', import.meta.url))) {
  root = resolve(root);
  const output = join(root, 'dist');
  const previous = await lstat(output).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (previous && (!previous.isDirectory() || previous.isSymbolicLink())) throw new Error('dist must be a regular directory');
  // Validate every source before replacing an earlier build. Never recurse through the repo.
  const files = await Promise.all(PUBLIC_FILES.map(async path => ({ path, bytes: await readRegular(root, path) })));
  const headers = await readRegular(root, 'hosting/_headers');
  const { version } = JSON.parse(await readRegular(root, 'package.json'));
  let commit = null;
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
  const assets = files.map(({ path, bytes }) => ({ path, bytes: bytes.length, sha256: sha256(bytes) }));
  const release = {
    schemaVersion: 1, name: 'mythseal', clientVersion: version, gitCommit: commit,
    assetsManifestSHA256: sha256(JSON.stringify(assets)), assets,
    hostingHeadersSHA256: sha256(headers), contractRefs: [],
    enabledFeatures: ['offline-game', 'local-backpack', 'npc-market', 'journey-archive-ui'],
    runtimeGatedFeatures: ['email-login', 'private-journey-backup'],
  };
  await rm(output, { recursive: true, force: true });
  for (const { path, bytes } of files) {
    await mkdir(dirname(join(output, path)), { recursive: true });
    await writeFile(join(output, path), bytes);
  }
  await writeFile(join(output, '_headers'), headers);
  await writeFile(join(output, 'release.json'), JSON.stringify(release, null, 2) + '\n');
  return release;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const release = await build();
  console.log(`Built Mythseal ${release.clientVersion}: ${release.assets.length} public files, manifest ${release.assetsManifestSHA256}`);
}
