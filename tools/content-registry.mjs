/**
 * Q4 content registry: a read-only index of what each piece of authored content
 * can do in this source tree. Every entry is derived from the content modules,
 * hosting/public-assets.json, hosting/preview-assets.json and the LZ-01 printing
 * checklist; nothing here is a second rules, reward or printing database. The
 * only mirrored facts are the few grants and tickets progression.mjs hard-codes
 * (see the grant constants below), and tests play those routes to keep them exact.
 *
 * Node tooling only. It reads repository files (allowlists, docs, module text),
 * and it describes LZ-01/HL-01 preview identities, so it is never served:
 * shipping it would pull preview-only data into the public module graph.
 * Domain validators (engine, progression, collection, cloud-save) still decide
 * legality; this index only reports and audits.
 */
import { closeSync, lstatSync, openSync, readFileSync, readSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARDS, LEGACY_CARD_IDS, ORIGINAL_CARD_IDS, validateDeck } from '../engine.mjs';
import { NODES, PACK_SETS, WELCOME_CARD_IDS } from '../progression.mjs';
import { STORY_NODES, WORLDS } from '../stories.mjs';
import { CAMPAIGN_NODES } from '../campaign-content.mjs';
import { FIRE_MOUNTAIN } from '../activity-content.mjs';
import { PRINTINGS, getPrintForCard, defaultPrintId } from '../printing-catalogue.mjs';
import { WX01_RATES, WX01_SEAL_COSTS } from '../wx01-pack.mjs';
import { basePrintFor } from '../expansion-state.mjs';
import { LZ01_CARDS, LZ01_SPECIALS, LZ01_PLANNED_SPECIALS } from '../liaozhai-cards.mjs';
import { HL01_CARDS, HL01_AA } from '../honglou-cards.mjs';

export const REGISTRY_SCHEMA_VERSION = 1;
/** Capability names from docs/EXPERIENCE-MODULES.md (Q4), lowest to highest. */
export const CAPABILITIES = Object.freeze(['preview', 'local-playable', 'local-owned', 'backup-compatible', 'server-authoritative']);
export const STATUSES = Object.freeze(['local-playable', 'preview', 'planned']);

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PNG = [137, 80, 78, 71, 13, 10, 26, 10];
const NO_SERVER = 'No authoritative game server exists yet (ROADMAP M2); an account backup is a private, editable copy of local progress.';
const SCOPE_NOTE = 'Capabilities describe this source tree only. Deployment is never inferred here: release-manifest evidence (dist/release.json, docs/HOSTING.md) decides what is live.';
const CHECKLIST_TREATMENTS = Object.freeze({ AA: 'aa', INK: 'ink', TR: 'treasure' });

// Evidence: existing tests whose titles the audit confirms still exist.
const T = (file, title) => `tests/${file} › ${title}`;
const EVIDENCE = Object.freeze({
  routes: T('content-registry.test.mjs', 'every advertised encounter route starts, completes once, rejects a duplicate and opens its next step'),
  activityRoutes: T('content-registry.test.mjs', 'the fire-mountain activity completes on both routes and pays its first clear once'),
  backup: T('content-registry.test.mjs', 'a backup round trip keeps every playable clear, the activity record and every ownable printing'),
  grantRoutes: T('content-registry.test.mjs', 'acquisition lists exactly the printings each story and expansion grant route mints'),
  startRoutes: T('content-registry.test.mjs', 'acquisition lists exactly the printings a new journey and a v2 save migration mint'),
  rewardRules: T('content-registry.test.mjs', 'reward rules name exactly the grant and ticket claims each clear can bank'),
  original: [
    T('progression.test.mjs', 'six map locations unlock sequentially on wins and move the traveller on entry'),
    T('progression.test.mjs', 'expedition first clear and daily cache are paid once; repeat battles retain base rewards'),
  ],
  story: [T('story-progression.test.mjs', 'story first-clear/cache rewards pay once and losses/draws never open later stages')],
  campaign: [T('expansion-progression.test.mjs', '48 first clears deliver the complete fixed budget once, eight BASE grants, six tickets and separate final AA')],
  activity: [T('expansion-progression.test.mjs', 'a run spanning Monday belongs to its start-week; two weekly tickets and lifetime prizes are once-only')],
  pendingBackup: T('cloud-save.test.mjs', 'unfinished battles cannot be uploaded or restored and original pending remains untouched'),
  activityBackup: T('cloud-save.test.mjs', 'an active activity blocks cloud export and restore even between battles with pending null'),
  printBackup: T('cloud-save.test.mjs', 'print bindings and WX01 receipts reject loss or repair before restore'),
  printArt: T('print-presentation.test.mjs', 'every legacy and WX-01 printing resolves its own atlas cell or full image without changing rules'),
  packReach: T('wx01-drop-model.test.mjs', 'exhaustive conditional outcomes normalize, retain three cards and rarity floor, and reach every print'),
  redeem: T('wx01-progression.test.mjs', 'seal redemption charges its advertised tier once and creates a fresh copy beside a trained sibling'),
  legacyPack: T('progression.test.mjs', 'pack threshold edges and third-slot guarantee use advertised rarity pools'),
  lz01: [
    T('liaozhai-content.test.mjs', 'the preview module graph cannot import game, profile, progression, account or sampling code'),
    T('liaozhai-content.test.mjs', 'new candidate identities stay outside the live game and avoid obvious raw same-role upgrades'),
  ],
  hl01: [
    T('honglou-content.test.mjs', 'preview content remains import-free and cannot access player state, services or randomness'),
    T('honglou-content.test.mjs', 'the page module graph remains limited to the isolated Honglou UI and content files'),
  ],
});

// A reference is a whole string of one of these shapes; the audit resolves every one, wherever it sits in an entry.
const CODE_REFERENCE = /^([\w.-]+\.mjs):([A-Za-z_$][\w$]*)$/;
const TEST_REFERENCE = /^(tests\/[\w.-]+\.mjs) › (.+)$/;
const EMBEDDED_REFERENCE = /[\w.-]+\.mjs:[A-Za-z_$]|tests\/[\w.-]+\.mjs › /;
/** A capability limit: prose for people, plus the code or test references that back it, kept resolvable. */
const limit = (text, ...references) => ({ text, references });
// progression.mjs hard-codes these grant facts; the registry mirrors them and
// tests/content-registry.test.mjs plays every grant route to keep the mirror exact.
const STORY_GIFT_WORLD = 'westward'; // grantWX01Choice kind 'story': one AA after this world's story nodes
const STORY_GIFT_TREATMENT = 'aa';
const CAMPAIGN_FINAL_GRANT = Object.freeze({ id: 'campaign:westward-echo:aa', treatment: 'aa' }); // bankCampaignMilestones
const FIRE_MOUNTAIN_FIRST_CLEAR = Object.freeze({ id: 'fire-mountain:first-clear', cardId: 'niumowang' }); // settleActivity
const FIRE_MOUNTAIN_LOOT = index => `activity-*:stage-${index}:loot`; // settleActivity: `${run.id}:stage-${run.stage}:loot`
// bankCampaignMilestones banks a ticket on each `volumeFinal` first clear, and settleActivity on the
// 1st and 3rd weekly fire-mountain clears; openWX01Ticket is the only rule that spends one.
const CLAIM_GRANT = 'progression.mjs:claimExpansionGrant', OPEN_TICKET = 'progression.mjs:openWX01Ticket';
export const GRANT_RULES = Object.freeze(['progression.mjs:claimWX01StoryPrint', CLAIM_GRANT]);
// createProfile mints one copy of each ORIGINAL_CARD_IDS (starter) and WELCOME_CARD_IDS (welcome)
// card; hydrateProfile turns a v2 save's inventory counts into copies, with the same floor and gift.
export const START_RULES = Object.freeze(['progression.mjs:createProfile', 'progression.mjs:hydrateProfile']);
/** The only module that writes the local profile (createProfileStore). */
const PROFILE_WRITER = 'profile-store.mjs';

const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
};
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stringsIn = value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(stringsIn) : [];
const unique = values => [...new Set(values)];

function fileKind(root, relative) {
  let path = root;
  try {
    for (const part of relative.split('/')) {
      path = resolve(path, part);
      if (lstatSync(path).isSymbolicLink()) return 'symlink';
    }
    return lstatSync(path).isFile() ? 'file' : 'other';
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return 'missing';
    throw error;
  }
}
function hasPNGSignature(root, relative) {
  const handle = openSync(resolve(root, relative), 'r');
  try {
    const bytes = Buffer.alloc(24);
    if (readSync(handle, bytes, 0, 24, 0) < 24) return false;
    return PNG.every((byte, index) => bytes[index] === byte) && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0;
  } finally { closeSync(handle); }
}

/**
 * Everything the registry reads from this checkout. Tests audit a deliberately
 * broken copy by overriding fields of the returned object (content, readText,
 * fileKind, allowlists, docs). There is no root parameter on purpose: the content
 * modules are static imports of this checkout, so pointing only the file readers at
 * another tree would audit a mix of two trees. To audit another copy, run that
 * copy's own tools/content-registry.mjs.
 */
export function loadContentSources(...unexpected) {
  if (unexpected.length) throw new TypeError('loadContentSources() reads this checkout only; run the other copy\'s own tools/content-registry.mjs.');
  const root = ROOT;
  const readText = relative => readFileSync(resolve(root, relative), 'utf8');
  return {
    root,
    publicAssets: JSON.parse(readText('hosting/public-assets.json')),
    previewAssets: JSON.parse(readText('hosting/preview-assets.json')),
    docs: { lz01Checklist: readText('docs/EXPANSION-LZ01.md'), lz01Briefs: readText('docs/ART-LZ01.md') },
    content: {
      CARDS, LEGACY_CARD_IDS, ORIGINAL_CARD_IDS, WELCOME_CARD_IDS, validateDeck, NODES, PACK_SETS, STORY_NODES, WORLDS, CAMPAIGN_NODES, FIRE_MOUNTAIN,
      PRINTINGS, getPrintForCard, defaultPrintId, WX01_RATES, WX01_SEAL_COSTS, basePrintFor,
      LZ01_CARDS, LZ01_SPECIALS, LZ01_PLANNED_SPECIALS, HL01_CARDS, HL01_AA,
    },
    readText,
    fileKind: relative => fileKind(root, relative),
    isPNG: relative => hasPNGSignature(root, relative),
  };
}

// File types a page can fetch. A quoted path ending in one counts as a reference
// in the load forms below; a bare file name elsewhere (a download name) does not.
const LOADABLE = 'png|svg|webp|avif|jpe?g|gif|ico|bmp|mp3|ogg|oga|opus|wav|m4a|aac|flac|mp4|webm|ogv|mov|vtt|woff2?|ttf|otf|eot|json|webmanifest|wasm|mjs|js|css|html?|txt|csv|xml';
const HAS_EXTENSION = new RegExp(`\\.(?:${LOADABLE})(?:[?#].*)?$`, 'i');
const SCANNED = /\.(?:mjs|js|css|html)$/;

/**
 * Local files a page, module or stylesheet loads, in every statically visible form:
 * - HTML: `src`, `href`, `poster`, `srcset` and `imagesrcset` on script, link, img,
 *   source, video, audio, track, iframe, embed and input; inline `<script>` bodies
 *   are read as modules. (`<a href>` is navigation, not a load.)
 * - CSS (also inline in HTML or JS): `url(...)`, `@import "..."` and `image-set("...")`.
 * - JS: static/dynamic `import` and `export ... from`; any quoted `assets/...` path;
 *   any quoted `./` or `../` path with a loadable extension; and a loadable literal
 *   passed to `new Audio/Worker/SharedWorker/EventSource/URL`, `fetch`,
 *   `importScripts` or `.register`, assigned to `.src`/`.srcset`/`.poster`, set
 *   through `setAttribute`, or written in markup inside a string.
 * A path built at runtime (`${...}`, concatenation, a variable) cannot be seen here:
 * content art is covered by entry assets, and tools/serve.py's allowlist 404 plus the
 * browser smokes' failed-response checks catch the rest on the paths they exercise.
 */
export function localReferences(path, text) {
  const references = new Set();
  const add = specifier => {
    if (!specifier || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|%23|\$\{)/i.test(specifier) || specifier.includes('${')) return;
    const clean = specifier.split(/[?#]/)[0];
    if (!clean || clean === '/') return;
    references.add(posix.normalize(clean.startsWith('/') ? clean.slice(1) : posix.join(posix.dirname(path), clean)));
  };
  const addLoadable = specifier => { if (HAS_EXTENSION.test(specifier.trim())) add(specifier.trim()); };
  const addSrcset = value => value.split(',').map(candidate => candidate.trim().split(/\s+/)[0]).forEach(addLoadable);
  const markup = source => {
    for (const [, attributes] of source.matchAll(/<(?:script|link|img|source|video|audio|track|iframe|embed|input)\b([^>]*)>/gi)) {
      for (const [, name, double, single, bare] of attributes.matchAll(/\b(src|href|poster|srcset|imagesrcset)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)) {
        const value = double ?? single ?? bare;
        if (/srcset$/i.test(name)) addSrcset(value); else add(value);
      }
    }
  };
  const stylesheet = source => {
    for (const match of source.matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/g)) add(match[1]);
    for (const match of source.matchAll(/@import\s+(["'])([^"']+)\1/g)) add(match[2]);
    for (const [, set] of source.matchAll(/image-set\(((?:[^()]|\([^()]*\))*)\)/g)) {
      for (const match of set.replace(/\btype\([^)]*\)/g, '').matchAll(/(["'])([^"']+)\1/g)) add(match[2]);
    }
  };
  const script = source => {
    for (const match of source.matchAll(/(?:\bimport\s*(?:[^'";]*?\bfrom\s*)?|\bexport\s+[^'";]*?\bfrom\s*|\bimport\s*\()(['"])([^'"]+)\1/g)) add(match[2]);
    for (const match of source.matchAll(/(['"`])((?:\.\/)?assets\/[\w./-]+\.[A-Za-z0-9]+)\1/g)) add(match[2]);
    for (const match of source.matchAll(/(['"`])(\.{1,2}\/[^'"`\s]+)\1/g)) addLoadable(match[2]);
    for (const match of source.matchAll(/(?:\bnew\s+(?:Audio|Worker|SharedWorker|EventSource|URL)|\bfetch|\bimportScripts|\.register)\s*\(\s*(['"`])([^'"`]+)\1/g)) addLoadable(match[2]);
    for (const match of source.matchAll(/\.(src|srcset|poster)\s*=\s*(['"`])([^'"`]+)\2/g)) { if (match[1] === 'srcset') addSrcset(match[3]); else addLoadable(match[3]); }
    for (const match of source.matchAll(/\.setAttribute\(\s*(['"])(src|srcset|poster)\1\s*,\s*(['"`])([^'"`]+)\3/g)) { if (match[2] === 'srcset') addSrcset(match[4]); else addLoadable(match[4]); }
    markup(source);
  };
  const body = text.replace(/(["'])data:[\s\S]*?\1/g, '""');
  if (path.endsWith('.html')) {
    markup(body);
    for (const [, attributes, inline] of body.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) if (!/\bsrc\s*=/i.test(attributes)) script(inline);
  }
  if (/\.(?:mjs|js)$/.test(path)) script(body);
  if (SCANNED.test(path)) stylesheet(body);
  return [...references];
}

function walkGraph(sources, roots) {
  const reached = new Set(), stack = [...roots];
  while (stack.length) {
    const path = stack.pop();
    if (reached.has(path)) continue;
    reached.add(path);
    if (SCANNED.test(path) && sources.fileKind(path) === 'file') stack.push(...localReferences(path, sources.readText(path)));
  }
  return { reached };
}

/** Rows of a set's "Proposed printing checklist" table, as the set design document maintains them. */
export function parsePrintingChecklist(markdown, setId) {
  const section = markdown.split(/^## /m).find(part => part.startsWith('Proposed printing checklist'));
  if (!section) return null;
  const single = new RegExp(`^\`(${setId}-\\d{3}-[a-z]+\\d*)\`$`), range = new RegExp(`^\`(${setId}-(\\d{3})-base)\`–\`(${setId}-(\\d{3})-base)\`$`);
  const rows = [], baseRange = [];
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    const spanned = range.exec(cells[0]);
    if (spanned) { for (let number = Number(spanned[2]); number <= Number(spanned[4]); number++) baseRange.push(`${setId}-${String(number).padStart(3, '0')}-base`); continue; }
    const match = single.exec(cells[0]);
    if (!match || cells.length < 5) continue;
    const [character, label] = cells[1].split(' / ').map(part => part.trim());
    rows.push({ printId: match[1], character, treatment: CHECKLIST_TREATMENTS[label] ?? null, label, title: cells[2],
      planned: /^Planned\b/.test(cells[4]), status: cells[4], image: /`(assets\/[^`]+)`/.exec(cells[4])?.[1] ?? null });
  }
  return { rows, baseRange };
}

/** The "Specials briefs" table records each special's file: proposed while planned, bound once generated. */
export function parseSpecialsBriefs(markdown, setId) {
  const section = markdown.split(/^## /m).find(part => part.startsWith('Specials briefs'));
  if (!section) return null;
  const single = new RegExp(`^\`(${setId}-\\d{3}-[a-z]+\\d*)\`$`);
  return section.split('\n').filter(line => line.startsWith('|')).map(line => line.split('|').slice(1, -1).map(cell => cell.trim()))
    .filter(cells => single.test(cells[0] ?? '')).map(cells => ({ printId: single.exec(cells[0])[1], slot: cells[1], title: cells[2], proposedFile: /`([^`]+)`/.exec(cells[3])?.[1] ?? null }));
}

function analyze(sources) {
  const { content } = sources;
  const publicSet = new Set(sources.publicAssets), previewSet = new Set(sources.previewAssets);
  const publicPages = sources.publicAssets.filter(path => path.endsWith('.html'));
  const previewPages = sources.previewAssets.filter(path => path.endsWith('.html'));
  const publicGraph = walkGraph(sources, publicPages);
  const previewGraphs = Object.fromEntries(previewPages.map(page => [page, walkGraph(sources, [page])]));
  const cards = new Map(content.CARDS.map(card => [card.id, card]));
  const prints = new Map(content.PRINTINGS.map(print => [print.id, print]));
  const nodeIds = new Set(content.NODES.map(node => node.id));
  const defaultPrint = cardId => {
    if (!cards.has(cardId)) return null;
    try { return content.getPrintForCard(cardId); } catch { return null; }
  };
  const assetBlockers = (path, scope) => {
    const blockers = [], kind = sources.fileKind(path);
    if (kind !== 'file') blockers.push(`asset ${path} is ${kind === 'missing' ? 'missing' : `a ${kind}, not a regular file`}`);
    else if (path.endsWith('.png') && !sources.isPNG(path)) blockers.push(`asset ${path} is not a valid PNG`);
    if (scope === 'public' && !publicSet.has(path)) blockers.push(`asset ${path} is not in hosting/public-assets.json`);
    if (scope === 'served' && !publicSet.has(path) && !previewSet.has(path)) blockers.push(`asset ${path} is in neither asset allowlist`);
    return blockers;
  };
  const pageReaches = (page, module) => (previewGraphs[page] ?? publicGraph).reached.has(module);
  const servedBy = module => [...(publicGraph.reached.has(module) ? publicPages : []), ...previewPages.filter(page => previewGraphs[page].reached.has(module))];
  const lzChecklist = parsePrintingChecklist(sources.docs.lz01Checklist, 'lz01');
  const lzBriefs = parseSpecialsBriefs(sources.docs.lz01Briefs, 'lz01');
  return { sources, content, publicSet, previewSet, publicPages, previewPages, publicGraph, previewGraphs, cards, prints, nodeIds, defaultPrint, assetBlockers, pageReaches, servedBy, lzChecklist, lzBriefs };
}

function capability(claimed, { blockers = [], evidence = [], limits = [], reason = '' } = {}) {
  if (!claimed) return { state: 'unavailable', reason };
  const result = blockers.length ? { state: 'inconsistent', blockers: unique(blockers) } : { state: 'available' };
  if (evidence.length) result.evidence = evidence;
  if (limits.length) result.limits = limits;
  return result;
}
const notApplicable = reason => ({ state: 'not-applicable', reason });
const statusOf = capabilities => ['local-playable', 'local-owned'].some(name => capabilities[name].state !== 'unavailable' && capabilities[name].state !== 'not-applicable')
  ? 'local-playable' : capabilities.preview.state === 'available' || capabilities.preview.state === 'inconsistent' ? 'preview' : 'planned';

function deckBlockers(ctx, label, deck) {
  if (!deck) return [];
  const unknown = deck.filter(id => !ctx.cards.has(id));
  if (unknown.length) return [`${label} references unknown card ${unknown.join(', ')}`];
  const validation = ctx.content.validateDeck(deck);
  return validation.valid ? [] : [`${label} is not a legal deck: ${validation.errors.join(' ')}`];
}
function cardArt(ctx, cardIds) {
  const assets = [], blockers = [];
  for (const cardId of unique(cardIds)) {
    const print = ctx.defaultPrint(cardId);
    if (!print) { if (ctx.cards.has(cardId)) blockers.push(`card ${cardId} has no default printing`); continue; }
    if (print.art?.src) assets.push(print.art.src);
    else blockers.push(`card ${cardId}'s default printing ${print.id} has no art`);
  }
  return { assets: unique(assets), blockers };
}

/** Mirrors progression.mjs:hasClearedPrerequisites; the audit separately checks the chain. */
const prerequisiteOf = (nodes, index) => Object.hasOwn(nodes[index], 'requiresNode') ? nodes[index].requiresNode : nodes[index - 1]?.id ?? null;

/**
 * Of the encounters `ids`, those that none of them has in its prerequisite chain, so
 * their first clear can be the last of the group. A reward that opens only once the
 * whole group is cleared can open on these clears and on no other.
 */
function lastClearable(content, ids) {
  const requires = new Map(content.NODES.map((node, index) => [node.id, prerequisiteOf(content.NODES, index)]));
  const earlier = new Set();
  for (const id of ids) {
    const seen = new Set();
    for (let current = requires.get(id); current != null && !seen.has(current); current = requires.get(current)) { seen.add(current); earlier.add(current); }
  }
  return ids.filter(id => !earlier.has(id));
}

function encounterEntries(ctx) {
  const { content } = ctx;
  const storyIds = new Set(content.STORY_NODES.map(node => node.id)), campaignIds = new Set(content.CAMPAIGN_NODES.map(node => node.id));
  // grantWX01Choice opens the story gift once every westward story node is cleared, and
  // bankCampaignMilestones banks CAMPAIGN_FINAL_GRANT on the clear that completes the campaign.
  const storyGiftNodes = new Set(lastClearable(content, storyGiftNodeIds(content)));
  const finalNodes = new Set(lastClearable(content, content.CAMPAIGN_NODES.map(node => node.id)));
  return content.NODES.map((node, index) => {
    const group = campaignIds.has(node.id) ? 'campaign' : storyIds.has(node.id) ? 'story' : 'original';
    const sourceModule = { campaign: 'campaign-content.mjs', story: 'stories.mjs', original: 'progression.mjs' }[group];
    const world = content.WORLDS.find(item => item.nodeIds.includes(node.id)) ?? null;
    const requires = prerequisiteOf(content.NODES, index);
    // Nodes without an authored deck meet a random legal deck from the legacy roster (app.mjs:opponentDeck).
    const opponentPool = node.opponentDeck ?? content.LEGACY_CARD_IDS;
    const art = cardArt(ctx, opponentPool);
    const assets = unique([...(world?.map ? [world.map] : []), ...art.assets]);
    const blockers = [
      ...(!world ? [`no world lists encounter ${node.id}`] : world.map ? [] : [`world ${world.id} has no map`]),
      ...(requires === null || ctx.nodeIds.has(requires) ? [] : [`prerequisite ${requires} is not an encounter`]),
      ...deckBlockers(ctx, 'opponent deck', node.opponentDeck),
      ...deckBlockers(ctx, 'loaner deck', node.loanerDeck),
      ...(node.rewardCharacter && !content.basePrintFor(node.rewardCharacter) ? [`reward character ${node.rewardCharacter} has no WX-01 BASE printing`] : []),
      ...art.blockers,
      ...assets.flatMap(path => ctx.assetBlockers(path, 'public')),
      ...[sourceModule, 'progression.mjs'].filter(module => !ctx.publicGraph.reached.has(module)).map(module => `${module} is not reachable from the public game page`),
    ];
    const playable = { blockers, evidence: [EVIDENCE.routes, EVIDENCE.rewardRules, ...EVIDENCE[group]] };
    const capabilities = {
      preview: notApplicable('Encounters are entered from the journey map; there is no separate preview surface.'),
      'local-playable': capability(true, playable),
      'local-owned': notApplicable('An encounter records progress; owned copies come from its reward grants (see printing entries).'),
      'backup-compatible': capability(true, { evidence: [EVIDENCE.backup], limits: [
        limit('An unfinished battle blocks backup export and restore.', EVIDENCE.pendingBackup),
        ...(group === 'campaign' ? [limit('Snapshot formats v1/v2 cannot carry campaign progress.', 'cloud-save.mjs:assertLegacyExpansionBoundary')] : []),
      ] }),
      'server-authoritative': capability(false, { reason: NO_SERVER }),
    };
    return {
      id: `encounter:${node.id}`, kind: 'encounter', group, name: node.name, status: statusOf(capabilities), sourceModule,
      contentVersion: null, contentDigest: digest(node), rulesVersion: null, nodeId: node.id, worldId: world?.id ?? null,
      cardRefs: unique([...(node.opponentDeck ?? []), ...(node.loanerDeck ?? []), ...(node.rewardCharacter ? [node.rewardCharacter] : [])]),
      printRefs: node.rewardCharacter ? [content.basePrintFor(node.rewardCharacter)].filter(Boolean) : [],
      assets, opponent: node.opponentDeck ? 'authored' : 'random-legacy',
      unlock: { requires, rule: 'progression.mjs:isNodeUnlocked' },
      routes: node.loanerDeck ? ['owned', 'loaner'] : ['owned'],
      rules: {
        entry: 'progression.mjs:beginBattle', completion: 'progression.mjs:finishBattle',
        // Exactly the claims this node's first clear can open, as tests/content-registry.test.mjs plays them.
        reward: [
          'progression.mjs:finishBattle',
          ...(group === 'campaign' ? ['progression.mjs:bankCampaignMilestones'] : []),
          ...(group === 'campaign' && (node.rewardCharacter || finalNodes.has(node.id)) ? [CLAIM_GRANT] : []),
          ...(group === 'campaign' && node.volumeFinal ? [OPEN_TICKET] : []),
          ...(storyGiftNodes.has(node.id) ? ['progression.mjs:claimWX01StoryPrint'] : []),
        ],
        resume: group === 'campaign' ? 'progression.mjs:getPendingBattleOptions' : 'app.mjs:resumeBattle',
        ...(node.opponentDeck ? {} : { opponent: 'app.mjs:opponentDeck' }),
      },
      capabilities,
    };
  });
}

function activityEntries(ctx) {
  const activity = ctx.content.FIRE_MOUNTAIN;
  const stageBlockers = activity.stages.flatMap(stage => {
    const drop = ctx.prints.get(stage.dropPrintId);
    return [
      ...deckBlockers(ctx, `${stage.id} opponent deck`, stage.opponentDeck),
      ...(stage.opponentDeck.includes(stage.bossId) ? [] : [`${stage.id} boss ${stage.bossId} is not in its own deck`]),
      ...(!drop ? [`${stage.id} drop ${stage.dropPrintId} is not a catalogue printing`]
        : drop.setId !== 'wx01' || drop.treatment !== 'base' || drop.cardId !== stage.bossId ? [`${stage.id} drop ${stage.dropPrintId} is not ${stage.bossId}'s WX-01 BASE printing`] : []),
    ];
  });
  const cardRefs = unique([...activity.loanerDeck, ...activity.stages.flatMap(stage => [stage.bossId, ...stage.opponentDeck])]);
  const art = cardArt(ctx, cardRefs);
  const printRefs = activity.stages.map(stage => stage.dropPrintId);
  const assets = unique([activity.map, ...art.assets, ...printRefs.map(id => ctx.prints.get(id)?.art?.src)].filter(Boolean));
  const blockers = [
    ...(activity.map ? [] : ['activity has no map']),
    ...(ctx.nodeIds.has(activity.unlockNode) ? [] : [`unlock node ${activity.unlockNode} is not an encounter`]),
    ...deckBlockers(ctx, 'loaner deck', activity.loanerDeck), ...stageBlockers, ...art.blockers,
    ...assets.flatMap(path => ctx.assetBlockers(path, 'public')),
    ...['activity-content.mjs', 'progression.mjs'].filter(module => !ctx.publicGraph.reached.has(module)).map(module => `${module} is not reachable from the public game page`),
  ];
  const capabilities = {
    preview: notApplicable('The activity is entered from its journey panel; there is no separate preview surface.'),
    'local-playable': capability(true, { blockers, evidence: [EVIDENCE.activityRoutes, EVIDENCE.rewardRules, ...EVIDENCE.activity] }),
    'local-owned': notApplicable('An activity records runs and clears; owned copies come from its grants (see printing entries).'),
    'backup-compatible': capability(true, { evidence: [EVIDENCE.backup], limits: [
      limit('An active run blocks backup export and restore.', EVIDENCE.activityBackup),
      limit('Snapshot formats v1/v2 cannot carry activity progress.', 'cloud-save.mjs:assertLegacyExpansionBoundary'),
    ] }),
    'server-authoritative': capability(false, { reason: NO_SERVER }),
  };
  return [{
    id: `activity:${activity.id}`, kind: 'activity', group: activity.id, name: activity.name, status: statusOf(capabilities), sourceModule: 'activity-content.mjs',
    contentVersion: activity.version ?? null, contentDigest: digest(activity), rulesVersion: null, activityId: activity.id,
    stageIds: activity.stages.map(stage => stage.id), cardRefs, printRefs, assets,
    unlock: { requires: activity.unlockNode, rule: 'progression.mjs:startActivity' },
    routes: ['owned', 'loaner'],
    rules: {
      entry: 'progression.mjs:startActivity', advance: 'progression.mjs:advanceActivity', completion: 'progression.mjs:finishBattle',
      reward: ['progression.mjs:settleActivity', CLAIM_GRANT, OPEN_TICKET], resume: 'progression.mjs:getActivityBattleOptions', abandon: 'progression.mjs:abandonActivity',
    },
    capabilities,
  }];
}

/**
 * Encounters that must all be cleared before the WX-01 story gift opens
 * (progression.mjs:grantWX01Choice, kind 'story'). Only the one cleared last opens it.
 */
function storyGiftNodeIds(content) {
  return content.STORY_NODES.filter(node => node.worldId === STORY_GIFT_WORLD).map(node => node.id);
}

/**
 * Every route that mints this printing into a profile: a new journey's starter and
 * welcome copies, a v2 save migration, packs, boxes, tickets, the NPC market, seal
 * redemption and the story and expansion grants. Card lists, pack pools and reward
 * content are read from the content modules; the grant facts progression.mjs
 * hard-codes are the constants above. A `grant` names the expansion grant the
 * route claims (`activity-*` stands for the run-specific prefix). Moving or
 * restoring an existing copy (merchant buyback, a v3+ save, a backup restore) mints nothing.
 */
function acquisitionFor(ctx, print) {
  const { content } = ctx, routes = [];
  if (print.setId === 'legacy') {
    // A new journey and a v2 migration mint each card's default printing (collection.mjs:hydrateCollection).
    const isDefault = content.defaultPrintId(print.cardId) === print.id;
    const starter = isDefault && content.ORIGINAL_CARD_IDS.includes(print.cardId), welcome = isDefault && content.WELCOME_CARD_IDS.includes(print.cardId);
    if (starter) routes.push({ rule: START_RULES[0], detail: 'starter copy in every new journey' });
    if (welcome) routes.push({ rule: START_RULES[0], detail: 'welcome gift in every new journey' });
    if (isDefault && content.LEGACY_CARD_IDS.includes(print.cardId)) {
      routes.push({ rule: START_RULES[1], detail: ['v2 save migration: one copy per saved count', ...(starter ? ['at least one'] : []), ...(welcome ? ['plus the welcome gift for a save from before the collection expansion'] : [])].join(', ') });
    }
    // buyPack routes the `wx01` set to drawWX01Pack; every other set mints the card's default (legacy) printing.
    for (const [set, pack] of Object.entries(content.PACK_SETS)) if (set !== 'wx01' && pack.cardIds.includes(print.cardId)) routes.push({ rule: 'progression.mjs:buyPack', detail: `${set} pack` });
    if (content.LEGACY_CARD_IDS.includes(print.cardId)) routes.push({ rule: 'progression.mjs:buyCard', detail: 'daily NPC market (legacy roster)' });
  }
  if (print.setId === 'wx01') {
    // drawWX01Pack samples BASE and every WX01_RATES treatment; three routes open such a pack.
    if (print.treatment === 'base' || Object.hasOwn(content.WX01_RATES, print.treatment)) {
      routes.push({ rule: 'progression.mjs:buyPack', detail: 'WX-01 pack' }, { rule: 'progression.mjs:buyWX01Box', detail: 'WX-01 box of 12 or 24 packs' },
        { rule: 'progression.mjs:openWX01Ticket', detail: 'WX-01 ticket pack' });
    }
    const choosable = Object.hasOwn(content.WX01_SEAL_COSTS, print.treatment);
    if (choosable) routes.push({ rule: 'progression.mjs:redeemWX01Print', detail: `seal redemption (${print.treatment})` });
    if (choosable && print.treatment === STORY_GIFT_TREATMENT) routes.push({ rule: 'progression.mjs:claimWX01StoryPrint', detail: `one-time story gift of a chosen ${STORY_GIFT_TREATMENT.toUpperCase()} after clearing ${storyGiftNodeIds(content).join(', ')}` });
    for (const node of content.CAMPAIGN_NODES) if (node.rewardCharacter && content.basePrintFor(node.rewardCharacter) === print.id) routes.push({ rule: 'progression.mjs:claimExpansionGrant', grant: `campaign:${node.id}:base`, detail: `first clear of ${node.id}` });
    if (print.treatment === CAMPAIGN_FINAL_GRANT.treatment) routes.push({ rule: 'progression.mjs:claimExpansionGrant', grant: CAMPAIGN_FINAL_GRANT.id, detail: `a chosen ${CAMPAIGN_FINAL_GRANT.treatment.toUpperCase()} after all ${content.CAMPAIGN_NODES.length} campaign first clears` });
    content.FIRE_MOUNTAIN.stages.forEach((stage, index) => { if (stage.dropPrintId === print.id) routes.push({ rule: 'progression.mjs:claimExpansionGrant', grant: FIRE_MOUNTAIN_LOOT(index), detail: `${stage.id} loot` }); });
    if (content.basePrintFor(FIRE_MOUNTAIN_FIRST_CLEAR.cardId) === print.id) routes.push({ rule: 'progression.mjs:claimExpansionGrant', grant: FIRE_MOUNTAIN_FIRST_CLEAR.id, detail: `first ${content.FIRE_MOUNTAIN.id} clear` });
  }
  return routes;
}

function printingEntries(ctx) {
  return ctx.content.PRINTINGS.map(print => {
    const card = ctx.cards.get(print.cardId);
    const acquisition = acquisitionFor(ctx, print);
    const src = print.art?.src ?? null;
    const artBlockers = src ? ctx.assetBlockers(src, 'public') : ['printing has no art'];
    const moduleBlockers = ['printing-catalogue.mjs', 'collection.mjs'].filter(module => !ctx.publicGraph.reached.has(module)).map(module => `${module} is not reachable from the public game page`);
    const identity = card ? [] : [`card ${print.cardId} is not in engine.mjs CARDS`];
    const special = print.treatment !== 'base';
    const capabilities = {
      preview: capability(true, { blockers: [...artBlockers, ...moduleBlockers], evidence: [special ? 'pack-ui.mjs:wx01RedeemMarkup' : 'codex-ui.mjs:codexMarkup'] }),
      'local-playable': capability(true, { blockers: [...identity, ...artBlockers, ...moduleBlockers], evidence: [EVIDENCE.printArt] }),
      'local-owned': capability(true, { blockers: [...identity, ...(acquisition.length ? [] : ['no acquisition route grants this printing'])],
        evidence: print.setId === 'wx01' ? [EVIDENCE.packReach, ...(special ? [EVIDENCE.redeem] : []), ...(acquisition.some(route => GRANT_RULES.includes(route.rule)) ? [EVIDENCE.grantRoutes] : [])]
          : [EVIDENCE.legacyPack, ...(acquisition.some(route => START_RULES.includes(route.rule)) ? [EVIDENCE.startRoutes] : [])] }),
      'backup-compatible': capability(true, { evidence: [EVIDENCE.backup, EVIDENCE.printBackup] }),
      'server-authoritative': capability(false, { reason: NO_SERVER }),
    };
    return {
      id: `print:${print.id}`, kind: 'printing', group: print.setId, name: print.name, status: statusOf(capabilities), sourceModule: 'printing-catalogue.mjs',
      contentVersion: null, contentDigest: digest(print), rulesVersion: null, cardId: print.cardId, printId: print.id, setId: print.setId, treatment: print.treatment,
      assets: src ? [src] : [], acquisition,
      rules: { identity: 'printing-catalogue.mjs:getPrinting', ownership: 'collection.mjs:mintInstance', backup: 'cloud-save.mjs:validateSnapshot' },
      capabilities,
    };
  });
}

function previewUnavailable(ctx, cardId, printId) {
  if (!ctx.cards.has(cardId)) return `${cardId} is a preview candidate absent from engine.mjs CARDS; no rules, deck or AI integration exists.`;
  if (!ctx.prints.has(printId)) return `${printId} is absent from printing-catalogue.mjs; ${cardId} plays only as ${ctx.content.defaultPrintId(cardId)}.`;
  return '';
}
const listed = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
/** Why a preview printing cannot be owned, with the profile claim derived from the pages that serve it. */
function previewOwnership(ctx, pages) {
  const mints = 'collection.mjs only mints printing-catalogue.mjs printings';
  if (!pages.length) return `${mints}, and no served page loads this preview.`;
  const writers = pages.filter(page => ctx.pageReaches(page, PROFILE_WRITER)), readers = pages.filter(page => !writers.includes(page));
  if (!writers.length) return `${mints}, and ${listed(pages)} never load${pages.length === 1 ? 's' : ''} the profile store (${PROFILE_WRITER}).`;
  return `${mints}. ${listed(writers)} load${writers.length === 1 ? 's' : ''} the profile store (${PROFILE_WRITER}) but cannot mint this printing${readers.length ? `; ${listed(readers)} never load${readers.length === 1 ? 's' : ''} it` : ''}.`;
}
/** `record` is the authored record the entry stands for: the card for a BASE preview, the special's own record for a special. */
function previewEntry(ctx, { setId, sourceModule, card, record, printId, treatment, src, name, evidence }) {
  const pages = ctx.servedBy(sourceModule);
  const blockers = [...(src ? ctx.assetBlockers(src, 'served') : ['printing has no art']), ...(pages.length ? [] : [`${sourceModule} is not reachable from any served page`])];
  const integrated = ctx.prints.has(printId);
  const capabilities = {
    preview: capability(true, { blockers, evidence }),
    'local-playable': integrated ? capability(true, { blockers: ['a preview module claims a catalogue printing; move it to printing-catalogue.mjs'] }) : capability(false, { reason: previewUnavailable(ctx, card.id, printId) }),
    'local-owned': capability(false, { reason: previewOwnership(ctx, pages) }),
    'backup-compatible': capability(false, { reason: 'Preview data is never stored in a profile, so no backup carries it.' }),
    'server-authoritative': capability(false, { reason: NO_SERVER }),
  };
  return {
    id: `print:${printId}`, kind: 'printing', group: setId, name, status: statusOf(capabilities), sourceModule,
    contentVersion: null, contentDigest: digest(record), rulesVersion: null, cardId: card.id, printId, setId, treatment,
    assets: src ? [src] : [], pages, rules: {}, capabilities,
  };
}

/** The character a checklist row names for a card: its name without a parenthesised source note (`陳氏（畫皮）` → `陳氏`). */
const checklistCharacter = card => card?.name.replace(/（[^（）]*）$/, '') ?? null;

function previewEntries(ctx) {
  const { content } = ctx;
  const hlAA = [].concat(content.HL01_AA);
  const lzCard = id => content.LZ01_CARDS.find(card => card.id === id), hlCard = id => content.HL01_CARDS.find(card => card.id === id);
  const lz = [
    ...content.LZ01_CARDS.map(card => previewEntry(ctx, { setId: 'lz01', sourceModule: 'liaozhai-cards.mjs', card, record: card, printId: card.printId, treatment: 'base', src: card.art?.src, name: `${card.name} · 本畫`, evidence: EVIDENCE.lz01 })),
    // LZ01_SPECIALS is keyed by printId (and cardId:treatment); one card can have several specials.
    ...content.LZ01_SPECIALS.map(print => previewEntry(ctx, { setId: 'lz01', sourceModule: 'liaozhai-cards.mjs', card: lzCard(print.cardId) ?? { id: print.cardId }, record: print, printId: print.printId, treatment: print.treatment, src: print.src, name: print.name, evidence: EVIDENCE.lz01 })),
  ];
  const bound = new Set(lz.map(entry => entry.printId));
  const briefs = new Map((ctx.lzBriefs ?? []).map(row => [row.printId, row]));
  const planned = (ctx.lzChecklist?.rows ?? []).filter(row => row.planned && !bound.has(row.printId)).map(row => {
    const card = content.LZ01_CARDS.find(item => item.printId === row.printId.replace(/-[a-z]+\d*$/, '-base')) ?? null;
    // The module's planned printing decides the treatment; the audit reports a checklist label that disagrees.
    const treatment = content.LZ01_PLANNED_SPECIALS.find(print => print.printId === row.printId)?.treatment ?? row.treatment;
    const reason = `${row.status} (docs/EXPANSION-LZ01.md); nothing is bound in liaozhai-cards.mjs.`;
    const capabilities = {
      preview: capability(false, { reason }),
      'local-playable': capability(false, { reason: card ? previewUnavailable(ctx, card.id, row.printId) || reason : reason }),
      'local-owned': capability(false, { reason: 'A planned printing has no image, catalogue entry or acquisition route.' }),
      'backup-compatible': capability(false, { reason: 'Planned content is never stored in a profile.' }),
      'server-authoritative': capability(false, { reason: NO_SERVER }),
    };
    return {
      id: `print:${row.printId}`, kind: 'printing', group: 'lz01', name: `${row.character} · ${row.title}`, status: statusOf(capabilities), sourceModule: 'docs/EXPANSION-LZ01.md',
      contentVersion: null, contentDigest: digest(row), rulesVersion: null, cardId: card?.id ?? null, printId: row.printId, setId: 'lz01', treatment,
      assets: [], plannedAssets: briefs.get(row.printId)?.proposedFile ? [briefs.get(row.printId).proposedFile] : [], brief: briefs.has(row.printId) ? 'docs/ART-LZ01.md' : null,
      rules: {}, capabilities,
    };
  });
  const hl = [
    ...content.HL01_CARDS.map(card => previewEntry(ctx, { setId: 'hl01', sourceModule: 'honglou-cards.mjs', card, record: card, printId: card.printId, treatment: 'base', src: card.art?.src, name: `${card.name} · 本畫`, evidence: EVIDENCE.hl01 })),
    ...hlAA.map(print => previewEntry(ctx, { setId: 'hl01', sourceModule: 'honglou-cards.mjs', card: hlCard(print.cardId) ?? { id: print.cardId }, record: print, printId: print.printId, treatment: print.treatment ?? 'aa', src: print.src, name: print.name, evidence: EVIDENCE.hl01 })),
  ];
  return [...lz, ...planned, ...hl];
}

function summarize(entries) {
  const count = (items, key) => items.reduce((totals, item) => ({ ...totals, [key(item)]: (totals[key(item)] ?? 0) + 1 }), {});
  return {
    entries: entries.length,
    byKind: count(entries, entry => `${entry.kind}:${entry.group}`),
    byStatus: count(entries, entry => entry.status),
    byCapability: Object.fromEntries(CAPABILITIES.map(name => [name, count(entries, entry => entry.capabilities[name].state)])),
  };
}

/** Build the frozen registry. Reading it never touches a profile, storage or network. */
export function buildContentRegistry(sources = loadContentSources()) {
  const ctx = analyze(sources);
  const entries = [...encounterEntries(ctx), ...activityEntries(ctx), ...printingEntries(ctx), ...previewEntries(ctx)];
  return deepFreeze({
    schemaVersion: REGISTRY_SCHEMA_VERSION, evidenceScope: 'source', note: SCOPE_NOTE,
    versioning: { rules: null, reason: 'engine.mjs declares no rules version; only FIRE_MOUNTAIN declares a content version. contentDigest (SHA-256 of each authored record) detects change without inventing a version.' },
    capabilities: CAPABILITIES, statuses: STATUSES, entries, summary: summarize(entries),
  });
}

const REGEX_MAY_FOLLOW = /^(?:[(,=:[!&|?{};+\-*%<>~^]|return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await)$/;
/**
 * JavaScript source with comments, string and template text and regex bodies blanked
 * (same length and line breaks; quotes and template `${...}` code kept), so a match
 * position can be told apart as code. Regex literals are recognised heuristically by
 * the preceding token, which is enough for this repository's test files.
 */
function maskCode(source) {
  const out = source.split(''), interpolations = []; // UTF-16 units, matching source indices
  const blank = (from, to) => { for (let index = from; index < to && index < out.length; index++) if (out[index] !== '\n') out[index] = ' '; };
  let depth = 0, last = '', at = 0;
  const templateText = from => { // from: index after the opening backtick or the `}` closing an interpolation
    let index = from;
    while (index < source.length && source[index] !== '`' && !(source[index] === '$' && source[index + 1] === '{')) index += source[index] === '\\' ? 2 : 1;
    blank(from, index);
    if (source[index] === '$') { interpolations.push(depth); last = '{'; return index + 2; }
    last = '`'; return index + 1;
  };
  while (at < source.length) {
    const char = source[at], next = source[at + 1];
    if (char === '/' && next === '/') { const end = source.indexOf('\n', at); const stop = end < 0 ? source.length : end; blank(at, stop); at = stop; continue; }
    if (char === '/' && next === '*') { const end = source.indexOf('*/', at + 2); const stop = end < 0 ? source.length : end + 2; blank(at, stop); at = stop; continue; }
    if (char === '"' || char === "'") {
      let index = at + 1;
      while (index < source.length && source[index] !== char && source[index] !== '\n') index += source[index] === '\\' ? 2 : 1;
      blank(at + 1, index); at = index + 1; last = char; continue;
    }
    if (char === '`') { at = templateText(at + 1); continue; }
    if (char === '}' && interpolations.length && interpolations.at(-1) === depth) { interpolations.pop(); at = templateText(at + 1); continue; }
    if (char === '/' && (last === '' || REGEX_MAY_FOLLOW.test(last))) {
      let index = at + 1, inClass = false;
      while (index < source.length && source[index] !== '\n' && (inClass || source[index] !== '/')) {
        if (source[index] === '\\') index++; else if (source[index] === '[') inClass = true; else if (source[index] === ']') inClass = false;
        index++;
      }
      blank(at + 1, index); at = index + 1;
      while (/[a-z]/i.test(source[at] ?? '')) at++;
      last = 'regex'; continue;
    }
    if (/\s/.test(char)) { at++; continue; }
    if (/[\w$]/.test(char)) { let end = at; while (/[\w$]/.test(source[end] ?? '')) end++; last = source.slice(at, end); at = end; continue; }
    if (char === '{') depth++;
    if (char === '}') depth--;
    last = char; at++;
  }
  return out.join('');
}
/** Index of the bracket closing the one at `open` in masked code, or the end of the text. */
function closingBracket(code, open) {
  const pairs = { '(': ')', '[': ']', '{': '}' }, stack = [];
  for (let index = open; index < code.length; index++) {
    if (pairs[code[index]]) stack.push(pairs[code[index]]);
    else if (code[index] === stack.at(-1)) { stack.pop(); if (!stack.length) return index; }
  }
  return code.length;
}

/** Brackets opened and not yet closed before `index` in masked code; 0 is the module's top level. */
function bracketDepth(code, index) {
  let depth = 0;
  for (let at = 0; at < index; at++) {
    if (code[at] === '(' || code[at] === '[' || code[at] === '{') depth++;
    else if (code[at] === ')' || code[at] === ']' || code[at] === '}') depth--;
  }
  return depth;
}

/** Comma-separated items between `from` and `to` in masked code at that bracket level, as trimmed [start, end) ranges; empty items are dropped. */
function topLevelItems(code, from, to) {
  const items = [];
  let start = from, depth = 0;
  for (let index = from; index <= to; index++) {
    if (index === to || (code[index] === ',' && depth === 0)) {
      let first = start, last = index;
      while (first < last && /\s/.test(code[first])) first++;
      while (last > first && /\s/.test(code[last - 1])) last--;
      if (first < last) items.push([first, last]);
      start = index + 1;
    } else if ('([{'.includes(code[index])) depth++;
    else if (')]}'.includes(code[index])) depth--;
  }
  return items;
}

/**
 * Test options Node's runner reads that never stop a test's body or invert its result
 * (Node 26 reads concurrency, expectFailure, only, plan, signal, skip, timeout and todo).
 * An aborted `signal`, a broken `plan` or a `timeout` fails the test visibly.
 */
const RUNNING_OPTIONS = /^(?:timeout|concurrency|only|plan|signal)$/;
/** Options that skip a test or report a throwing body as a pass; each runs only with the literal value `false`. */
const SKIPPING_OPTIONS = /^(?:skip|todo|expectFailure)$/;

/**
 * Can a `test()` options object literal (the masked range [from, to), braces included)
 * switch the test off or invert its result? Only its own keys count, read from the
 * source so a quoted key is seen. A key passes only when it is one of RUNNING_OPTIONS,
 * or one of SKIPPING_OPTIONS (`skip`, `todo`, `expectFailure`) with the literal value
 * `false`. Any other key may be an option this reader does not know (a newer runner's),
 * and a spread, a computed key or a key it cannot parse may hide one, so each fails.
 */
function optionsMaySkip(source, code, [from, to]) {
  for (const [start, end] of topLevelItems(code, from + 1, to - 1)) {
    if (/^(?:\.\.\.|\[)/.test(code.slice(start, end))) return true;
    const key = /^(?:(?:get|set|async)\s+|\*\s*)*(?:(['"])([^'"\\\n]*)\1|([A-Za-z_$][\w$]*))/.exec(source.slice(start, end));
    if (!key) return true;
    const name = key[2] ?? key[3];
    if (RUNNING_OPTIONS.test(name)) continue;
    if (!SKIPPING_OPTIONS.test(name) || !/^\s*:\s*false\s*$/.test(code.slice(start + key[0].length, end))) return true;
  }
  return false;
}

/**
 * The function written inline as a `test()` callback (the masked range [from, to)), or
 * null when the callback is anything else (a name, a call, a bound function), since
 * then its body cannot be read. `params` is the range of its parameter list.
 */
function inlineCallback(code, [from, to]) {
  const text = code.slice(from, to), prefix = /^async\b\s*/.exec(text)?.[0].length ?? 0;
  const keyword = /^function\b\s*\*?\s*[\w$]*\s*(?=\()/.exec(text.slice(prefix));
  if (keyword) { const open = from + prefix + keyword[0].length; return { keyword: true, params: [open + 1, closingBracket(code, open)] }; }
  if (text[prefix] === '(') {
    const open = from + prefix, close = closingBracket(code, open);
    return /^\s*=>/.test(code.slice(close + 1, to)) ? { keyword: false, params: [open + 1, close] } : null;
  }
  const single = /^([A-Za-z_$][\w$]*)\s*=>/.exec(text.slice(prefix));
  return single ? { keyword: false, params: [from + prefix, from + prefix + single[1].length] } : null;
}

/** Words after which `(` opens a grouping, not a call. */
const GROUPING_AFTER = /^(?:return|typeof|await|void|yield|in|of|new|delete|throw|case|do|else|instanceof)$/;
/**
 * Masked code (same length) with grouping parentheses around a bare context blanked,
 * so `(t).skip()` and `((this)).todo()` read as the context itself. A call such as
 * `f(t)` keeps its parentheses.
 */
function ungroupContext(code, names) {
  const group = new RegExp(`\\(\\s*(?:${names})\\s*\\)`, 'g');
  for (let changed = true; changed;) {
    changed = false;
    code = code.replace(group, (match, offset, whole) => {
      const before = /([\w$]+|[)\].'"`])\s*$/.exec(whole.slice(Math.max(0, offset - 64), offset));
      if (before && !GROUPING_AFTER.test(before[1])) return match;
      changed = true;
      return ` ${match.slice(1, -1)} `;
    });
  }
  return code;
}

/**
 * Can the callback body (the masked range [from, to)) skip itself, or hide its checks
 * in a subtest that does not run? Through any of its contexts, written bare or in
 * grouping parentheses (`(t)`):
 * - any access to `skip` or `todo`, called or not (`t.skip()`, `t?.skip?.()`,
 *   `t.skip.call(t)`), and any computed member (`t['skip']`, `t[name]`) unless it is
 *   a plain string naming something other than `skip`, `todo` or `test`;
 * - destructuring the context (`const { skip } = t`), which cannot be followed, like
 *   a destructured first parameter;
 * - a subtest, unless it is a plain `t.test(...)` call whose title is a string or
 *   template literal (or absent) and whose options and inline callback pass the same
 *   rules as a top-level test (runsChecks), recursively. `t.test` stored, bound or
 *   called through `.call`, and a title that might be options or a callback, fail.
 */
function contextMaySkip(source, code, [from, to], contexts) {
  const names = contexts.map(name => name.replace(/\$/g, '\\$')).join('|'), body = ungroupContext(code.slice(from, to), names);
  const context = `(?<![\\w$.])(?:${names})`;
  if (new RegExp(`${context}\\s*\\??\\.\\s*(?:skip|todo)\\b`).test(body)) return true;
  if (new RegExp(`\\}\\s*=\\s*(?:${names})(?![\\w$]|\\s*(?:\\??\\.|\\[))`).test(body)) return true;
  for (const match of body.matchAll(new RegExp(`${context}\\s*(?:\\?\\.\\s*)?\\[`, 'g'))) {
    const open = from + match.index + match[0].length - 1;
    const key = /^\s*(['"`])([\w$]*)\1\s*$/.exec(source.slice(open + 1, closingBracket(code, open)));
    if (!key || /^(?:skip|todo|test)$/.test(key[2])) return true;
  }
  for (const match of body.matchAll(new RegExp(`${context}\\s*\\??\\.\\s*test\\b\\s*(?:\\?\\.\\s*)?`, 'g'))) {
    const open = from + match.index + match[0].length;
    if (code[open] !== '(') return true;
    const items = topLevelItems(code, open + 1, closingBracket(code, open));
    const titled = Boolean(items[0]) && /['"`]/.test(code[items[0][0]]);
    if (!titled && items[0] && code[items[0][0]] !== '{' && !inlineCallback(code, items[0])) return true;
    if (!runsChecks(source, code, titled ? items.slice(1) : items)) return true;
  }
  return false;
}

/**
 * Does a test or subtest whose arguments after its title are `items` (masked ranges)
 * run its checks? Options, if given, must be one object literal that cannot skip
 * (optionsMaySkip); the callback must be written inline; and its body must not skip
 * through its context (contextMaySkip). The context is the callback's first
 * parameter (a destructured or rest first parameter cannot be followed, so it
 * fails), and `this` in a `function` callback.
 */
function runsChecks(source, code, [first, second]) {
  const options = first && code[first[0]] === '{' ? first : null;
  if (options && (closingBracket(code, options[0]) !== options[1] - 1 || optionsMaySkip(source, code, options))) return false;
  const callback = options ? second : first;
  const fn = callback && inlineCallback(code, callback);
  if (!fn) return false;
  const [param] = topLevelItems(code, ...fn.params);
  const context = param && /^([A-Za-z_$][\w$]*)\s*(?:=|$)/.exec(code.slice(...param));
  if (param && !context) return false;
  const contexts = [context?.[1], fn.keyword && 'this'].filter(Boolean);
  return !contexts.length || !contextMaySkip(source, code, callback, contexts);
}

/**
 * Does `source` declare a top-level `test('<title>', ...)` that the runner will
 * execute and report on its own checks? These do not count: a declaration nested in
 * any bracket (a `describe` or `suite` callback, which `.skip` or `{ skip }` can
 * switch off without counting the test as skipped; another test's body; a block or
 * function), a `test.skip`/`test.todo` call, a declaration inside a comment or
 * string, and (runsChecks, contextMaySkip):
 * - options that may skip or invert the result: a `skip`, `todo` or `expectFailure`
 *   key, quoted or not, unless literally `false` (under `expectFailure` a throwing
 *   body is reported as a pass); any key other than those and `timeout`,
 *   `concurrency`, `only`, `plan` and `signal`; and options this reader cannot see
 *   into, which is anything but an object literal (a variable, a conditional, a
 *   call) or one with a spread or a computed key;
 * - a callback that is missing (the test runs nothing) or not written inline (a
 *   name or a call), since its body cannot be read;
 * - a body that reaches its context's `skip` or `todo` anywhere, even
 *   conditionally or through `?.`, `.call`, grouping parentheses or a computed key,
 *   or that destructures its context, since the runner may then report it skipped;
 * - a body whose subtest (`t.test(...)`) fails any of these rules, or cannot be
 *   read, since the outer test then passes without running the subtest's checks.
 * A test hidden behind runtime control flow without brackets
 * (`if (false) test(...)`), or skipped through a helper it hands its context to, a
 * hook such as `beforeEach(t => t.skip())` or an alias of the context, cannot be
 * seen from the text; the runner's own test and skip counts show it.
 */
function declaresRunningTest(source, title) {
  const code = maskCode(source);
  for (const quote of ["'", '"', '`']) {
    const call = `test(${quote}${title}${quote}`;
    for (let at = source.indexOf(call); at >= 0; at = source.indexOf(call, at + 1)) {
      if (/[\w$.]/.test(source[at - 1] ?? '') || !code.startsWith('test(', at) || bracketDepth(code, at) !== 0) continue;
      const end = closingBracket(code, at + 4), afterTitle = at + call.length;
      if (!/^\s*(?:,|$)/.test(code.slice(afterTitle, end))) continue; // the title goes on (`'…' + x`): another test
      if (runsChecks(source, code, topLevelItems(code, afterTitle, end))) return true;
    }
  }
  return false;
}

/**
 * Does `file.mjs:name` (or `tests/file › title`) still name real code or a real, running test?
 * A code reference must be defined in code: a definition left in a comment or a string does not count.
 */
export function resolveReference(reference, readText) {
  try {
    const test = TEST_REFERENCE.exec(reference);
    if (test) return declaresRunningTest(readText(test[1]), test[2]);
    const code = CODE_REFERENCE.exec(reference);
    if (!code) return false;
    const source = maskCode(readText(code[1])), name = code[2];
    return new RegExp(`(?:\\bfunction\\s+${name}\\s*\\(|\\b(?:const|let)\\s+${name}\\s*=|\\bexport\\s*\\{[^}]*\\b${name}\\b)`).test(source);
  } catch { return false; }
}

/**
 * Inconsistencies between what the source advertises and what it actually wires:
 * broken references, unlisted or leaking assets, docs/code drift and dead rule
 * references. An empty array means the audit found nothing; it is not a release check.
 */
export function auditContent(sources = loadContentSources(), registry = buildContentRegistry(sources)) {
  const ctx = analyze(sources), findings = [];
  const add = (code, id, message) => findings.push({ code, id, message });
  const entries = registry.entries;

  // Identity: one entry per id and per printing; rules (cardId), edition (printId) and copy (uid) stay distinct.
  for (const [key, field] of [['id', 'id'], ['printId', 'printId']]) {
    const seen = new Set();
    for (const entry of entries) if (entry[field]) { if (seen.has(entry[field])) add('duplicate-id', entry.id, `${key} ${entry[field]} appears twice`); seen.add(entry[field]); }
  }
  for (const entry of entries) {
    if (Object.hasOwn(entry, 'uid')) add('owned-copy-in-registry', entry.id, 'A registry entry must not carry an owned-copy uid.');
    if (entry.printId && ctx.cards.has(entry.printId)) add('print-id-collides', entry.id, `printId ${entry.printId} is also a card id`);
    for (const [name, value] of Object.entries(entry.capabilities)) {
      if (value.state === 'inconsistent') for (const blocker of value.blockers) add('capability-inconsistent', entry.id, `${name}: ${blocker}`);
      if (value.state === 'unavailable' && !value.reason) add('missing-reason', entry.id, `${name} is unavailable without a stated reason`);
    }
    if (entry.capabilities['server-authoritative'].state !== 'unavailable') add('false-authority', entry.id, 'Nothing in this source is server-authoritative.');
  }

  // Unlock graph: every prerequisite exists and every chain ends at one root without a cycle.
  const requires = new Map(entries.filter(entry => entry.kind === 'encounter').map(entry => [entry.nodeId, entry.unlock.requires]));
  const roots = [...requires].filter(([, parent]) => parent === null).map(([id]) => id);
  if (roots.length !== 1) add('unlock-roots', null, `expected one starting encounter, found ${roots.join(', ') || 'none'}`);
  for (const [id] of requires) {
    const seen = new Set();
    for (let current = id; current !== null; current = requires.get(current)) {
      if (!requires.has(current)) { add('unlock-dangling', `encounter:${id}`, `prerequisite chain reaches unknown ${current}`); break; }
      if (seen.has(current)) { add('unlock-cycle', `encounter:${id}`, `prerequisite chain loops at ${current}`); break; }
      seen.add(current);
    }
  }

  // Allowlists: real files, disjoint, closed over what served pages load, no orphans.
  for (const path of ctx.publicSet) if (ctx.previewSet.has(path)) add('allowlist-overlap', null, `${path} is in both public and preview allowlists`);
  for (const [list, paths] of [['public', sources.publicAssets], ['preview', sources.previewAssets]]) {
    if (new Set(paths).size !== paths.length) add('allowlist-duplicate', null, `hosting/${list}-assets.json lists a path twice`);
    for (const path of paths) { const kind = sources.fileKind(path); if (kind !== 'file') add('allowlist-missing-file', null, `${list} allowlist path ${path} is ${kind}`); }
  }
  for (const path of ctx.publicGraph.reached) if (!ctx.publicSet.has(path)) add('public-graph-unlisted', null, `the public game loads ${path}, which hosting/public-assets.json omits`);
  for (const [page, graph] of Object.entries(ctx.previewGraphs)) for (const path of graph.reached) {
    if (!ctx.publicSet.has(path) && !ctx.previewSet.has(path)) add('preview-graph-unlisted', null, `${page} loads ${path}, which neither allowlist lists`);
  }
  const publicRefs = new Set(entries.filter(entry => entry.status === 'local-playable').flatMap(entry => entry.assets));
  const previewRefs = new Set(entries.filter(entry => entry.status !== 'local-playable').flatMap(entry => [...entry.assets, ...(entry.plannedAssets ?? [])]));
  for (const path of previewRefs) if (!publicRefs.has(path) && ctx.publicSet.has(path)) add('preview-asset-public', null, `${path} belongs only to preview/planned content but is publicly allowlisted`);
  for (const path of ctx.publicGraph.reached) if (ctx.previewSet.has(path)) add('preview-module-public', null, `the public game loads preview-only ${path}`);
  for (const path of ctx.publicSet) if (!ctx.publicGraph.reached.has(path) && !publicRefs.has(path)) add('public-orphan', null, `${path} is publicly allowlisted but nothing playable references it`);
  const previewReached = new Set(Object.values(ctx.previewGraphs).flatMap(graph => [...graph.reached]));
  for (const path of ctx.previewSet) if (!previewReached.has(path) && !previewRefs.has(path)) add('preview-orphan', null, `${path} is preview-allowlisted but no preview page or entry uses it`);
  if ([...ctx.publicSet, ...ctx.previewSet].some(path => path.startsWith('tools/'))) add('tooling-served', null, 'tooling must never be allowlisted');

  // LZ-01 printing checklist (docs) against what liaozhai-cards.mjs binds (LZ01_SPECIALS) and plans (LZ01_PLANNED_SPECIALS).
  const checklist = ctx.lzChecklist, briefs = ctx.lzBriefs;
  if (!checklist) add('checklist-missing', null, 'docs/EXPANSION-LZ01.md has no "Proposed printing checklist" table');
  else {
    const lzEntries = entries.filter(entry => entry.group === 'lz01');
    const bound = lzEntries.filter(entry => entry.status === 'preview');
    const boundBase = bound.filter(entry => entry.treatment === 'base').map(entry => entry.printId);
    if (JSON.stringify(boundBase) !== JSON.stringify(checklist.baseRange)) add('checklist-mismatch', null, `BASE checklist ${checklist.baseRange.join(',')} differs from liaozhai-cards.mjs ${boundBase.join(',')}`);
    // One row per printing: a leftover row (say, from a rebinding) would otherwise be compared or ignored by its position.
    const repeated = list => unique(list.map(row => row.printId).filter((id, index, ids) => ids.indexOf(id) !== index));
    for (const id of repeated(checklist.rows)) add('checklist-mismatch', `print:${id}`, `docs/EXPANSION-LZ01.md checklist lists ${id} in more than one row`);
    for (const id of repeated(briefs ?? [])) add('checklist-mismatch', `print:${id}`, `docs/ART-LZ01.md briefs ${id} in more than one row`);
    const rows = new Map(checklist.rows.map(row => [row.printId, row]));
    const briefed = new Map((briefs ?? []).map(row => [row.printId, row]));
    /** The LZ-01 card a printing's number names: `lz01-004-aa1` is numbered for the card printed as `lz01-004-base`. */
    const numberedCard = printId => ctx.content.LZ01_CARDS.find(card => card.printId === printId.replace(/-[a-z]+\d*$/, '-base')) ?? null;
    /** A row's character, treatment and working-title columns against the printing liaozhai-cards.mjs holds under `list`. */
    const columnDrift = (entry, row, print, list) => {
      const character = checklistCharacter(ctx.content.LZ01_CARDS.find(card => card.id === print.cardId));
      if (character !== row.character) add('checklist-mismatch', entry.id, `checklist character ${row.character} differs from ${list} ${character ?? print.cardId}`);
      if (row.treatment && row.treatment !== print.treatment) add('checklist-mismatch', entry.id, `checklist treatment ${row.label} differs from ${list} ${print.treatment}`);
      if (print.title !== undefined && print.title !== row.title) add('checklist-mismatch', entry.id, `checklist working title ${row.title} differs from ${list} ${print.title}`);
    };
    for (const entry of bound.filter(item => item.treatment !== 'base')) {
      // A special reuses its character's number (docs/EXPANSION-LZ01.md), bound or planned.
      const numbered = numberedCard(entry.printId);
      if (numbered?.id !== entry.cardId) add('card-number-mismatch', entry.id, `${entry.printId} number belongs to ${numbered?.id ?? 'no LZ-01 card'}, but LZ01_SPECIALS binds it to ${entry.cardId}`);
      const row = rows.get(entry.printId);
      if (!row) add('checklist-mismatch', entry.id, 'bound special printing is missing from the checklist');
      else if (row.planned) add('planned-bound', entry.id, 'checklist still says "Planned · no image" for a printing liaozhai-cards.mjs binds');
      else if (row.image !== entry.assets[0]) add('checklist-mismatch', entry.id, `checklist image ${row.image} differs from bound ${entry.assets[0] ?? '(no image)'}`);
      if (row) columnDrift(entry, row, ctx.content.LZ01_SPECIALS.find(print => print.printId === entry.printId), 'LZ01_SPECIALS');
      // A brief that outlives its generation names the file that was bound, never a superseded or proposed one.
      const brief = briefed.get(entry.printId);
      if (brief && brief.proposedFile !== entry.assets[0]) add('checklist-mismatch', entry.id, `docs/ART-LZ01.md brief file ${brief.proposedFile ?? '(none)'} differs from bound ${entry.assets[0] ?? '(no image)'}`);
    }
    for (const row of checklist.rows) {
      if (!row.planned && !bound.some(entry => entry.printId === row.printId)) add('checklist-mismatch', `print:${row.printId}`, 'checklist marks this special available but nothing binds it');
      if (!row.treatment) add('checklist-mismatch', `print:${row.printId}`, `unknown treatment label ${row.label}`);
    }
    const planned = lzEntries.filter(entry => entry.status === 'planned');
    // liaozhai.html prints LZ01_PLANNED_SPECIALS as still planned (仍在規劃中), so it must name exactly the checklist's planned rows.
    const plannedRows = new Set(checklist.rows.filter(row => row.planned).map(row => row.printId));
    const plannedInModule = new Map(ctx.content.LZ01_PLANNED_SPECIALS.map(print => [print.printId, print]));
    for (const id of plannedInModule.keys()) if (!plannedRows.has(id)) add('checklist-mismatch', `print:${id}`, 'liaozhai-cards.mjs LZ01_PLANNED_SPECIALS lists a printing the checklist does not mark planned');
    for (const id of plannedRows) if (!plannedInModule.has(id)) add('checklist-mismatch', `print:${id}`, 'checklist marks this printing planned but liaozhai-cards.mjs LZ01_PLANNED_SPECIALS omits it');
    // A brief may outlive its generation (then it describes a bound printing, checked above); a planned special may not lack one.
    for (const row of briefs ?? []) if (!rows.has(row.printId)) add('checklist-mismatch', `print:${row.printId}`, 'docs/ART-LZ01.md briefs a printing the checklist does not list');
    for (const entry of planned) {
      const row = rows.get(entry.printId), card = ctx.content.LZ01_CARDS.find(item => item.id === entry.cardId);
      if (checklistCharacter(card) !== row.character) add('card-number-mismatch', entry.id, `${entry.printId} number does not match ${row.character}`);
      if (plannedInModule.has(entry.printId)) columnDrift(entry, row, plannedInModule.get(entry.printId), 'LZ01_PLANNED_SPECIALS');
      if (!entry.plannedAssets.length) add('checklist-mismatch', entry.id, briefs ? 'planned special has no brief with a proposed file in docs/ART-LZ01.md' : 'planned special has no brief: docs/ART-LZ01.md has no "Specials briefs" section');
      if (!/no image/.test(row.status)) continue;
      for (const path of entry.plannedAssets) {
        if (ctx.publicSet.has(path) || ctx.previewSet.has(path)) add('planned-asset-listed', entry.id, `${path} is allowlisted while the checklist says no image`);
        if (sources.fileKind(path) !== 'missing') add('planned-asset-exists', entry.id, `${path} exists while the checklist says no image; bind it and update the docs`);
      }
    }
  }

  // Every reference must still name real code or a real, running test. Any string in an entry
  // shaped like a reference is one (rules, unlock, acquisition, evidence, limits), so no field
  // escapes the check; prose may not embed one, because embedded references are never resolved.
  const references = new Map();
  for (const entry of entries) for (const text of stringsIn(entry)) {
    if (CODE_REFERENCE.test(text) || TEST_REFERENCE.test(text)) { if (!references.has(text)) references.set(text, new Set()); references.get(text).add(entry.id); }
    else if (EMBEDDED_REFERENCE.test(text)) add('embedded-reference', entry.id, `"${text}" embeds a reference the audit cannot resolve; move it to a structured field`);
  }
  for (const [reference, ids] of references) {
    if (!resolveReference(reference, sources.readText)) add('dead-reference', [...ids][0], `${reference} no longer resolves (cited by ${ids.size} ${ids.size === 1 ? 'entry' : 'entries'})`);
  }

  return deepFreeze(findings);
}

/**
 * Is this file the script node was asked to run? Both sides are resolved through symlinks:
 * the loader resolves import.meta.url but not argv[1], and a run that silently printed
 * nothing would exit 0, which reads as a clean audit.
 */
function isMainScript() {
  try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (isMainScript()) {
  const sources = loadContentSources(), registry = buildContentRegistry(sources), findings = auditContent(sources, registry);
  console.log(JSON.stringify(process.argv.includes('--json') ? registry : { summary: registry.summary, findings }, null, 2));
  if (findings.length) process.exitCode = 1;
}
