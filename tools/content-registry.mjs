/**
 * Q4 content registry: a read-only index of what each piece of authored content
 * can do in this source tree. Every entry is derived from the content modules,
 * hosting/public-assets.json, hosting/preview-assets.json and the LZ-01 printing
 * checklist; nothing here is a second rules, reward or printing database.
 *
 * Node tooling only. It reads repository files (allowlists, docs, module text),
 * and it describes LZ-01/HL-01 preview identities, so it is never served:
 * shipping it would pull preview-only data into the public module graph.
 * Domain validators (engine, progression, collection, cloud-save) still decide
 * legality; this index only reports and audits.
 */
import { closeSync, lstatSync, openSync, readFileSync, readSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARDS, LEGACY_CARD_IDS, validateDeck } from '../engine.mjs';
import { NODES, PACK_SETS } from '../progression.mjs';
import { STORY_NODES, WORLDS } from '../stories.mjs';
import { CAMPAIGN_NODES } from '../campaign-content.mjs';
import { FIRE_MOUNTAIN } from '../activity-content.mjs';
import { PRINTINGS, getPrintForCard, defaultPrintId } from '../printing-catalogue.mjs';
import { WX01_RATES, WX01_SEAL_COSTS } from '../wx01-pack.mjs';
import { basePrintFor } from '../expansion-state.mjs';
import { LZ01_CARDS, LZ01_AA } from '../liaozhai-cards.mjs';
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

const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
};
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
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

/** Everything the registry reads, injectable so tests can audit a deliberately broken copy. */
export function loadContentSources(root = ROOT) {
  const readText = relative => readFileSync(resolve(root, relative), 'utf8');
  return {
    root,
    publicAssets: JSON.parse(readText('hosting/public-assets.json')),
    previewAssets: JSON.parse(readText('hosting/preview-assets.json')),
    docs: { lz01Checklist: readText('docs/EXPANSION-LZ01.md'), lz01Briefs: readText('docs/ART-LZ01.md') },
    content: {
      CARDS, LEGACY_CARD_IDS, validateDeck, NODES, PACK_SETS, STORY_NODES, WORLDS, CAMPAIGN_NODES, FIRE_MOUNTAIN,
      PRINTINGS, getPrintForCard, defaultPrintId, WX01_RATES, WX01_SEAL_COSTS, basePrintFor,
      LZ01_CARDS, LZ01_AA, HL01_CARDS, HL01_AA,
    },
    readText,
    fileKind: relative => fileKind(root, relative),
    isPNG: relative => hasPNGSignature(root, relative),
  };
}

/** Local files a page, module or stylesheet loads. Template-built paths are covered by entry art instead. */
export function localReferences(path, text) {
  const references = new Set();
  const add = specifier => {
    if (!specifier || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|%23|\$\{)/i.test(specifier) || specifier.includes('${')) return;
    const clean = specifier.split(/[?#]/)[0];
    if (!clean || clean === '/') return;
    references.add(posix.normalize(clean.startsWith('/') ? clean.slice(1) : posix.join(posix.dirname(path), clean)));
  };
  const body = text.replace(/(["'])data:[\s\S]*?\1/g, '""');
  if (path.endsWith('.html')) for (const match of body.matchAll(/<(?:script|link|img|source)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/g)) add(match[1]);
  if (path.endsWith('.mjs')) {
    for (const match of body.matchAll(/(?:\bimport\s*(?:[^'";]*?\bfrom\s*)?|\bexport\s+[^'";]*?\bfrom\s*|\bimport\s*\()(['"])([^'"]+)\1/g)) add(match[2]);
    for (const match of body.matchAll(/['"`]((?:\.\/)?assets\/[\w./-]+\.(?:png|svg|webp|avif|jpg|jpeg))['"`]/g)) add(match[1]);
  }
  if (/\.(?:css|mjs|html)$/.test(path)) for (const match of body.matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/g)) add(match[1]);
  return [...references];
}

function walkGraph(sources, roots) {
  const reached = new Set(), stack = [...roots];
  while (stack.length) {
    const path = stack.pop();
    if (reached.has(path)) continue;
    reached.add(path);
    if (/\.(?:mjs|css|html)$/.test(path) && sources.fileKind(path) === 'file') stack.push(...localReferences(path, sources.readText(path)));
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

/** The pending-brief table records each planned special's proposed file. */
export function parsePendingBriefs(markdown, setId) {
  const section = markdown.split(/^## /m).find(part => part.startsWith('Pending specials briefs'));
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
  const servedBy = module => [...(publicGraph.reached.has(module) ? publicPages : []), ...previewPages.filter(page => previewGraphs[page].reached.has(module))];
  const lzChecklist = parsePrintingChecklist(sources.docs.lz01Checklist, 'lz01');
  const lzBriefs = parsePendingBriefs(sources.docs.lz01Briefs, 'lz01');
  return { sources, content, publicSet, previewSet, publicPages, previewPages, publicGraph, previewGraphs, cards, prints, nodeIds, defaultPrint, assetBlockers, servedBy, lzChecklist, lzBriefs };
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

function encounterEntries(ctx) {
  const { content } = ctx;
  const storyIds = new Set(content.STORY_NODES.map(node => node.id)), campaignIds = new Set(content.CAMPAIGN_NODES.map(node => node.id));
  return content.NODES.map((node, index) => {
    const group = campaignIds.has(node.id) ? 'campaign' : storyIds.has(node.id) ? 'story' : 'original';
    const sourceModule = { campaign: 'campaign-content.mjs', story: 'stories.mjs', original: 'progression.mjs' }[group];
    const world = content.WORLDS.find(item => item.nodeIds.includes(node.id)) ?? null;
    // Mirrors progression.mjs:hasClearedPrerequisites; the audit separately checks the chain.
    const requires = Object.hasOwn(node, 'requiresNode') ? node.requiresNode : content.NODES[index - 1]?.id ?? null;
    // Nodes without an authored deck meet a random legal deck from the legacy roster (app.mjs:opponentDeck).
    const opponentPool = node.opponentDeck ?? content.LEGACY_CARD_IDS;
    const art = cardArt(ctx, opponentPool);
    const assets = unique([...(world ? [world.map] : []), ...art.assets]);
    const blockers = [
      ...(world ? [] : [`no world lists encounter ${node.id}`]),
      ...(requires === null || ctx.nodeIds.has(requires) ? [] : [`prerequisite ${requires} is not an encounter`]),
      ...deckBlockers(ctx, 'opponent deck', node.opponentDeck),
      ...deckBlockers(ctx, 'loaner deck', node.loanerDeck),
      ...(node.rewardCharacter && !content.basePrintFor(node.rewardCharacter) ? [`reward character ${node.rewardCharacter} has no WX-01 BASE printing`] : []),
      ...art.blockers,
      ...assets.flatMap(path => ctx.assetBlockers(path, 'public')),
      ...[sourceModule, 'progression.mjs'].filter(module => !ctx.publicGraph.reached.has(module)).map(module => `${module} is not reachable from the public game page`),
    ];
    const playable = { blockers, evidence: [EVIDENCE.routes, ...EVIDENCE[group]] };
    const capabilities = {
      preview: notApplicable('Encounters are entered from the journey map; there is no separate preview surface.'),
      'local-playable': capability(true, playable),
      'local-owned': notApplicable('An encounter records progress; owned copies come from its reward grants (see printing entries).'),
      'backup-compatible': capability(true, { evidence: [EVIDENCE.backup], limits: [
        `An unfinished battle blocks export (${EVIDENCE.pendingBackup}).`,
        ...(group === 'campaign' ? ['Snapshot formats v1/v2 cannot carry campaign progress (cloud-save.mjs:assertLegacyExpansionBoundary).'] : []),
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
        reward: group === 'campaign' ? ['progression.mjs:finishBattle', 'progression.mjs:bankCampaignMilestones', 'progression.mjs:claimExpansionGrant'] : ['progression.mjs:finishBattle'],
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
  const assets = unique([activity.map, ...art.assets, ...printRefs.map(id => ctx.prints.get(id)?.art?.src).filter(Boolean)]);
  const blockers = [
    ...(ctx.nodeIds.has(activity.unlockNode) ? [] : [`unlock node ${activity.unlockNode} is not an encounter`]),
    ...deckBlockers(ctx, 'loaner deck', activity.loanerDeck), ...stageBlockers, ...art.blockers,
    ...assets.flatMap(path => ctx.assetBlockers(path, 'public')),
    ...['activity-content.mjs', 'progression.mjs'].filter(module => !ctx.publicGraph.reached.has(module)).map(module => `${module} is not reachable from the public game page`),
  ];
  const capabilities = {
    preview: notApplicable('The activity is entered from its journey panel; there is no separate preview surface.'),
    'local-playable': capability(true, { blockers, evidence: [EVIDENCE.activityRoutes, ...EVIDENCE.activity] }),
    'local-owned': notApplicable('An activity records runs and clears; owned copies come from its grants (see printing entries).'),
    'backup-compatible': capability(true, { evidence: [EVIDENCE.backup], limits: [`An active run blocks export (${EVIDENCE.activityBackup}).`, 'Snapshot formats v1/v2 cannot carry activity progress (cloud-save.mjs:assertLegacyExpansionBoundary).'] }),
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
      reward: ['progression.mjs:settleActivity', 'progression.mjs:claimExpansionGrant'], resume: 'progression.mjs:getActivityBattleOptions', abandon: 'progression.mjs:abandonActivity',
    },
    capabilities,
  }];
}

function acquisitionFor(ctx, print) {
  const { content } = ctx, routes = [];
  if (print.setId === 'legacy') {
    // buyPack routes the `wx01` set to drawWX01Pack; every other set mints the card's default (legacy) printing.
    for (const [set, pack] of Object.entries(content.PACK_SETS)) if (set !== 'wx01' && pack.cardIds.includes(print.cardId)) routes.push({ rule: 'progression.mjs:buyPack', detail: `${set} pack` });
    if (content.LEGACY_CARD_IDS.includes(print.cardId)) routes.push({ rule: 'progression.mjs:buyCard', detail: 'daily NPC market (legacy roster)' });
  }
  if (print.setId === 'wx01') {
    if (print.treatment === 'base' || Object.hasOwn(content.WX01_RATES, print.treatment)) routes.push({ rule: 'progression.mjs:buyPack', detail: 'WX-01 pack sampler (also buyWX01Box and openWX01Ticket)' });
    if (Object.hasOwn(content.WX01_SEAL_COSTS, print.treatment)) routes.push({ rule: 'progression.mjs:redeemWX01Print', detail: `seal redemption (${print.treatment})` });
    for (const node of content.CAMPAIGN_NODES) if (node.rewardCharacter && content.basePrintFor(node.rewardCharacter) === print.id) routes.push({ rule: 'progression.mjs:claimExpansionGrant', detail: `first clear of ${node.id}` });
    for (const stage of content.FIRE_MOUNTAIN.stages) if (stage.dropPrintId === print.id) routes.push({ rule: 'progression.mjs:claimExpansionGrant', detail: `${stage.id} loot` });
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
        evidence: print.setId === 'wx01' ? [EVIDENCE.packReach, ...(special ? [EVIDENCE.redeem] : [])] : [EVIDENCE.legacyPack] }),
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
function previewEntry(ctx, { setId, sourceModule, card, printId, treatment, src, name, evidence }) {
  const pages = ctx.servedBy(sourceModule);
  const blockers = [...ctx.assetBlockers(src, 'served'), ...(pages.length ? [] : [`${sourceModule} is not reachable from any served page`])];
  const integrated = ctx.prints.has(printId);
  const capabilities = {
    preview: capability(true, { blockers, evidence }),
    'local-playable': integrated ? capability(true, { blockers: ['a preview module claims a catalogue printing; move it to printing-catalogue.mjs'] }) : capability(false, { reason: previewUnavailable(ctx, card.id, printId) }),
    'local-owned': capability(false, { reason: 'collection.mjs only mints printing-catalogue.mjs printings; preview pages never write a profile.' }),
    'backup-compatible': capability(false, { reason: 'Preview data is never stored in a profile, so no backup carries it.' }),
    'server-authoritative': capability(false, { reason: NO_SERVER }),
  };
  return {
    id: `print:${printId}`, kind: 'printing', group: setId, name, status: statusOf(capabilities), sourceModule,
    contentVersion: null, contentDigest: digest({ card, printId, treatment, src }), rulesVersion: null, cardId: card.id, printId, setId, treatment,
    assets: [src], pages, rules: {}, capabilities,
  };
}

function previewEntries(ctx) {
  const { content } = ctx;
  const lzAA = [].concat(content.LZ01_AA), hlAA = [].concat(content.HL01_AA);
  const lzCard = id => content.LZ01_CARDS.find(card => card.id === id), hlCard = id => content.HL01_CARDS.find(card => card.id === id);
  const lz = [
    ...content.LZ01_CARDS.map(card => previewEntry(ctx, { setId: 'lz01', sourceModule: 'liaozhai-cards.mjs', card, printId: card.printId, treatment: 'base', src: card.art.src, name: `${card.name} · 本畫`, evidence: EVIDENCE.lz01 })),
    ...lzAA.map(print => previewEntry(ctx, { setId: 'lz01', sourceModule: 'liaozhai-cards.mjs', card: lzCard(print.cardId) ?? { id: print.cardId }, printId: print.printId, treatment: print.treatment ?? 'aa', src: print.src, name: print.name, evidence: EVIDENCE.lz01 })),
  ];
  const bound = new Set(lz.map(entry => entry.printId));
  const briefs = new Map((ctx.lzBriefs ?? []).map(row => [row.printId, row]));
  const planned = (ctx.lzChecklist?.rows ?? []).filter(row => row.planned && !bound.has(row.printId)).map(row => {
    const card = content.LZ01_CARDS.find(item => item.printId === row.printId.replace(/-[a-z]+\d*$/, '-base')) ?? null;
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
      contentVersion: null, contentDigest: digest(row), rulesVersion: null, cardId: card?.id ?? null, printId: row.printId, setId: 'lz01', treatment: row.treatment,
      assets: [], plannedAssets: briefs.get(row.printId)?.proposedFile ? [briefs.get(row.printId).proposedFile] : [], brief: briefs.has(row.printId) ? 'docs/ART-LZ01.md' : null,
      rules: {}, capabilities,
    };
  });
  const hl = [
    ...content.HL01_CARDS.map(card => previewEntry(ctx, { setId: 'hl01', sourceModule: 'honglou-cards.mjs', card, printId: card.printId, treatment: 'base', src: card.art.src, name: `${card.name} · 本畫`, evidence: EVIDENCE.hl01 })),
    ...hlAA.map(print => previewEntry(ctx, { setId: 'hl01', sourceModule: 'honglou-cards.mjs', card: hlCard(print.cardId) ?? { id: print.cardId }, printId: print.printId, treatment: print.treatment ?? 'aa', src: print.src, name: print.name, evidence: EVIDENCE.hl01 })),
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

/** Does `file.mjs:name` (or `tests/file › title`) still name real code or a real test? */
export function resolveReference(reference, readText) {
  try {
    const test = /^(tests\/[\w.-]+\.mjs) › (.+)$/.exec(reference);
    if (test) {
      const source = readText(test[1]), title = test[2];
      return ["'", '"', '`'].some(quote => source.includes(`test(${quote}${title}${quote}`));
    }
    const code = /^([\w.-]+\.mjs):([A-Za-z_$][\w$]*)$/.exec(reference);
    if (!code) return false;
    const source = readText(code[1]), name = code[2];
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

  // LZ-01 printing checklist (docs) against what liaozhai-cards.mjs binds.
  const checklist = ctx.lzChecklist, briefs = ctx.lzBriefs;
  if (!checklist) add('checklist-missing', null, 'docs/EXPANSION-LZ01.md has no "Proposed printing checklist" table');
  else {
    const lzEntries = entries.filter(entry => entry.group === 'lz01');
    const bound = lzEntries.filter(entry => entry.status === 'preview');
    const boundBase = bound.filter(entry => entry.treatment === 'base').map(entry => entry.printId);
    if (JSON.stringify(boundBase) !== JSON.stringify(checklist.baseRange)) add('checklist-mismatch', null, `BASE checklist ${checklist.baseRange.join(',')} differs from liaozhai-cards.mjs ${boundBase.join(',')}`);
    const rows = new Map(checklist.rows.map(row => [row.printId, row]));
    for (const entry of bound.filter(item => item.treatment !== 'base')) {
      const row = rows.get(entry.printId);
      if (!row) add('checklist-mismatch', entry.id, 'bound special printing is missing from the checklist');
      else if (row.planned) add('planned-bound', entry.id, 'checklist still says "Planned · no image" for a printing liaozhai-cards.mjs binds');
      else if (row.image !== entry.assets[0]) add('checklist-mismatch', entry.id, `checklist image ${row.image} differs from bound ${entry.assets[0]}`);
    }
    for (const row of checklist.rows) {
      if (!row.planned && !bound.some(entry => entry.printId === row.printId)) add('checklist-mismatch', `print:${row.printId}`, 'checklist marks this special available but nothing binds it');
      if (!row.treatment) add('checklist-mismatch', `print:${row.printId}`, `unknown treatment label ${row.label}`);
    }
    const planned = lzEntries.filter(entry => entry.status === 'planned');
    // A brief may outlive its generation (then it describes a bound printing); a planned special may not lack one.
    for (const row of briefs ?? []) if (!rows.has(row.printId)) add('checklist-mismatch', `print:${row.printId}`, 'docs/ART-LZ01.md briefs a printing the checklist does not list');
    for (const entry of planned) {
      const row = rows.get(entry.printId), card = ctx.content.LZ01_CARDS.find(item => item.id === entry.cardId);
      if (!card || !card.name.startsWith(row.character)) add('planned-card-mismatch', entry.id, `${entry.printId} number does not match ${row.character}`);
      if (!entry.plannedAssets.length) add('checklist-mismatch', entry.id, 'planned special has no brief with a proposed file in docs/ART-LZ01.md');
      if (!/no image/.test(row.status)) continue;
      for (const path of entry.plannedAssets) {
        if (ctx.publicSet.has(path) || ctx.previewSet.has(path)) add('planned-asset-listed', entry.id, `${path} is allowlisted while the checklist says no image`);
        if (sources.fileKind(path) !== 'missing') add('planned-asset-exists', entry.id, `${path} exists while the checklist says no image; bind it and update the docs`);
      }
    }
  }

  // Every rule, resume and evidence reference must still name real code or a real test.
  const references = new Set();
  for (const entry of entries) {
    for (const value of Object.values(entry.rules ?? {})) for (const reference of [].concat(value)) references.add(reference);
    for (const route of entry.acquisition ?? []) references.add(route.rule);
    for (const value of Object.values(entry.capabilities)) for (const reference of value.evidence ?? []) references.add(reference);
  }
  for (const reference of references) if (!resolveReference(reference, sources.readText)) add('dead-reference', null, `${reference} no longer resolves`);

  return deepFreeze(findings);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sources = loadContentSources(), registry = buildContentRegistry(sources), findings = auditContent(sources, registry);
  console.log(JSON.stringify(process.argv.includes('--json') ? registry : { summary: registry.summary, findings }, null, 2));
  if (findings.length) process.exitCode = 1;
}
