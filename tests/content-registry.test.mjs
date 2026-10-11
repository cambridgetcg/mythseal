import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmdirSync, symlinkSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContentRegistry, auditContent, loadContentSources, resolveReference, localReferences, CAPABILITIES, GRANT_RULES, START_RULES } from '../tools/content-registry.mjs';
import { createProfile, hydrateProfile, beginBattle, finishBattle, startActivity, advanceActivity, isNodeUnlocked, claimWX01StoryPrint, claimExpansionGrant, NODES } from '../progression.mjs';
import { LEGACY_CARD_IDS } from '../engine.mjs';
import { nextNodeInWorld, STORY_NODES } from '../stories.mjs';
import { mintInstance } from '../collection.mjs';
import { createSnapshot, restoreSnapshot } from '../cloud-save.mjs';
import { LZ01_CARDS, LZ01_SPECIALS, LZ01_PLANNED_SPECIALS } from '../liaozhai-cards.mjs';
import { PRINTINGS } from '../printing-catalogue.mjs';

const now = '2026-09-22T12:00:00.000Z';
const sources = loadContentSources();
const registry = buildContentRegistry(sources);
const entry = id => registry.entries.find(item => item.id === id);
const byGroup = (kind, group) => registry.entries.filter(item => item.kind === kind && item.group === group);
const codes = findings => [...new Set(findings.map(finding => finding.code))].sort();
const audit = changes => auditContent({ ...sources, ...changes, content: { ...sources.content, ...changes.content } });
/** Audit the current sources against a registry altered after derivation: the only way to reach the registry-shape guards. */
const forged = mutate => { const copy = structuredClone(registry); mutate(copy.entries); return auditContent(sources, copy); };
/** Source text with one file rewritten, as a renamed test, rule or page would leave it. */
const rewrite = (file, change) => ({ readText: path => path === file ? change(sources.readText(path)) : sources.readText(path) });
/**
 * A consistent planned special, rebuilt from a bound one: the tree as it stood before that image was
 * generated (checklist "Planned · no image", listed in LZ01_PLANNED_SPECIALS, no file, binding or
 * allowlist entry). Since 2026-10-11 every LZ-01 special is bound, so the planned-path faults start here.
 */
const PLANNED_ID = 'lz01-008-ink1';
const plannedPrint = LZ01_SPECIALS.find(print => print.printId === PLANNED_ID);
const plannedChecklist = sources.docs.lz01Checklist.replace(new RegExp('^(\\| `' + PLANNED_ID + '` \\|(?:[^|\\n]*\\|){3}) [^|\\n]* \\|$', 'm'), '$1 Planned · brief only (2026-10-10), no image |');
const PLANNED = (() => {
  const { src, label, ...unbound } = plannedPrint;
  return {
    src,
    content: { LZ01_SPECIALS: LZ01_SPECIALS.filter(print => print !== plannedPrint), LZ01_PLANNED_SPECIALS: [...LZ01_PLANNED_SPECIALS, unbound] },
    previewAssets: sources.previewAssets.filter(path => path !== src),
    fileKind: path => path === src ? 'missing' : sources.fileKind(path),
    readText: path => path === 'liaozhai-cards.mjs' ? sources.readText(path).replace(`src: '${src}', `, '') : sources.readText(path),
    docs: { ...sources.docs, lz01Checklist: plannedChecklist },
  };
})();
/** The planned baseline with some sources changed further. */
const planned = (change = {}) => ({ ...PLANNED, ...change, content: { ...PLANNED.content, ...change.content }, docs: { ...PLANNED.docs, ...change.docs } });
const AUDIT_CODES = [...new Set([...readFileSync(new URL('../tools/content-registry.mjs', import.meta.url), 'utf8').matchAll(/\badd\('([a-z-]+)'/g)].map(match => match[1]))].sort();

test('the registry derives every encounter, the activity and each printing exactly once with honest statuses', () => {
  assert.deepEqual(registry.summary.byKind, {
    'encounter:original': 6, 'encounter:story': 12, 'encounter:campaign': 48, 'activity:fire-mountain': 1,
    'printing:legacy': 24, 'printing:wx01': 29, 'printing:lz01': 19, 'printing:hl01': 11,
  });
  // LZ-01 is 19 printings by design; which are preview and which planned follows liaozhai-cards.mjs.
  const lzBound = [...LZ01_CARDS.map(card => card.printId), ...LZ01_SPECIALS.map(print => print.printId)];
  const lzPlanned = LZ01_PLANNED_SPECIALS.map(print => print.printId);
  assert.equal(lzBound.length + lzPlanned.length, 19);
  assert.deepEqual(registry.summary.byStatus, { 'local-playable': 120, preview: lzBound.length + 11, ...(lzPlanned.length ? { planned: lzPlanned.length } : {}) });
  assert.equal(new Set(registry.entries.map(item => item.id)).size, registry.entries.length);
  assert.deepEqual(registry.entries.filter(item => item.kind === 'encounter').map(item => item.nodeId), NODES.map(node => node.id));
  for (const item of [...byGroup('encounter', 'original'), ...byGroup('encounter', 'story'), ...byGroup('encounter', 'campaign'), ...byGroup('printing', 'wx01'), ...byGroup('printing', 'legacy')]) {
    assert.equal(item.status, 'local-playable', item.id);
  }
  assert.equal(entry('activity:fire-mountain').status, 'local-playable');
  assert.equal(entry('activity:fire-mountain').contentVersion, 1, 'the only declared content version is copied, never invented');
  const lz = byGroup('printing', 'lz01');
  assert.deepEqual(lz.filter(item => item.status === 'planned').map(item => item.printId).sort(), [...lzPlanned].sort());
  assert.deepEqual(lz.filter(item => item.status === 'preview').map(item => item.printId).sort(), [...lzBound].sort(), 'every BASE and every bound special');
  assert(byGroup('printing', 'hl01').every(item => item.status === 'preview'));
  for (const item of registry.entries) {
    assert.equal(Object.hasOwn(item, 'uid'), false, `${item.id} must not carry an owned-copy identity`);
    assert.match(item.contentDigest, /^[0-9a-f]{64}$/);
  }
  assert(Object.isFrozen(registry) && Object.isFrozen(registry.entries) && Object.isFrozen(registry.entries[0].capabilities));
  assert.deepEqual(buildContentRegistry(sources), registry, 'derivation is deterministic');
});

test('capabilities separate preview from playable, state every unavailable reason and never claim server authority', () => {
  for (const item of registry.entries) {
    assert.deepEqual(Object.keys(item.capabilities), [...CAPABILITIES], item.id);
    for (const [name, value] of Object.entries(item.capabilities)) {
      assert(['available', 'unavailable', 'not-applicable'].includes(value.state), `${item.id} ${name}: ${value.state}`);
      if (value.state !== 'available') assert(value.reason?.length > 10, `${item.id} ${name} needs a visible reason`);
    }
    assert.equal(item.capabilities['server-authoritative'].state, 'unavailable', item.id);
  }
  const preview = entry('print:lz01-001-aa1');
  assert.equal(preview.capabilities.preview.state, 'available');
  assert.deepEqual(preview.pages, ['liaozhai.html']);
  for (const name of ['local-playable', 'local-owned', 'backup-compatible']) assert.equal(preview.capabilities[name].state, 'unavailable');
  assert.equal(preview.capabilities['local-owned'].reason,
    'collection.mjs only mints printing-catalogue.mjs printings, and liaozhai.html never loads the profile store (profile-store.mjs).',
    'the profile claim names the pages that serve this printing, not every preview page (playtest.html writes the profile)');
  assert.match(entry('print:hl01-001-base').capabilities['local-playable'].reason, /legacy\/lindaiyu/, 'a preview reprint names the identity that already plays');
  for (const print of LZ01_SPECIALS) {
    const item = entry(`print:${print.printId}`);
    assert.deepEqual([item.status, item.cardId, item.treatment, item.assets, item.capabilities.preview.state], ['preview', print.cardId, print.treatment, [print.src], 'available'], print.printId);
  }
  assert.deepEqual(['print:lz01-001-aa1', 'print:lz01-001-tr1'].map(id => entry(id).cardId), ['niexiaoqian', 'niexiaoqian'], 'one card keeps two specials apart by printId');
  const owned = entry('print:wx01-005-tr1');
  assert.deepEqual(owned.acquisition.map(route => route.rule), ['progression.mjs:buyPack', 'progression.mjs:buyWX01Box', 'progression.mjs:openWX01Ticket', 'progression.mjs:redeemWX01Print']);
  assert.deepEqual(entry('print:wx01-006-base').acquisition.map(route => route.detail),
    ['WX-01 pack', 'WX-01 box of 12 or 24 packs', 'WX-01 ticket pack', 'fire-mountain-red loot']);
  assert.deepEqual(entry('print:wx01-001-aa1').acquisition.map(route => route.grant ?? route.rule), [
    'progression.mjs:buyPack', 'progression.mjs:buyWX01Box', 'progression.mjs:openWX01Ticket', 'progression.mjs:redeemWX01Print',
    'progression.mjs:claimWX01StoryPrint', 'campaign:westward-echo:aa',
  ], 'an AA lists the story gift and the campaign-final choice as well as packs and seals');
  assert.deepEqual(entry('print:wx01-015-base').acquisition.filter(route => route.grant).map(route => route.grant), ['activity-*:stage-2:loot', 'fire-mountain:first-clear']);
  assert.deepEqual(entry('encounter:west-spirit-mountain').rules.reward, ['progression.mjs:finishBattle', 'progression.mjs:claimWX01StoryPrint']);
  assert.deepEqual(entry('encounter:west-flaming-mountain').rules.reward, ['progression.mjs:finishBattle'], 'an earlier westward clear cannot open the story gift');
  assert.deepEqual(entry('encounter:echo-1-3').rules.reward, ['progression.mjs:finishBattle', 'progression.mjs:bankCampaignMilestones'], 'a clear that banks nothing lists no claim');
  assert.deepEqual(entry('encounter:echo-1-8').rules.reward, ['progression.mjs:finishBattle', 'progression.mjs:bankCampaignMilestones', 'progression.mjs:openWX01Ticket']);
  assert.deepEqual(entry('encounter:echo-6-8').rules.reward, ['progression.mjs:finishBattle', 'progression.mjs:bankCampaignMilestones', 'progression.mjs:claimExpansionGrant', 'progression.mjs:openWX01Ticket']);
  assert.deepEqual(entry('activity:fire-mountain').rules.reward, ['progression.mjs:settleActivity', 'progression.mjs:claimExpansionGrant', 'progression.mjs:openWX01Ticket']);
  assert.deepEqual(entry('print:legacy/qingxiao').acquisition.map(route => route.rule), ['progression.mjs:createProfile', 'progression.mjs:hydrateProfile', 'progression.mjs:buyPack', 'progression.mjs:buyCard']);
  assert.deepEqual(entry('encounter:echo-1-1').capabilities['backup-compatible'].limits.map(item => item.references), [
    ['tests/cloud-save.test.mjs › unfinished battles cannot be uploaded or restored and original pending remains untouched'],
    ['cloud-save.mjs:assertLegacyExpansionBoundary'],
  ], 'a limit keeps its references in a field the audit resolves, not in its prose');
  assert.deepEqual(entry('encounter:echo-1-7').routes, ['owned', 'loaner']);
  assert.equal(entry('encounter:mist-gate').opponent, 'random-legacy');
  assert.equal(entry('encounter:mist-gate').unlock.requires, null);
});

test('the current source passes the content audit', () => {
  const findings = auditContent(sources, registry);
  assert.deepEqual(findings, [], findings.map(finding => `${finding.code} ${finding.id ?? ''} ${finding.message}`).join('\n'));
});

test('a consistent planned special audits clean and reports its brief, not an image', () => {
  assert.notEqual(plannedChecklist, sources.docs.lz01Checklist, 'the planned baseline rewrote its checklist row');
  const changed = { ...sources, ...PLANNED, content: { ...sources.content, ...PLANNED.content } };
  const findings = auditContent(changed);
  assert.deepEqual(findings, [], findings.map(finding => `${finding.code} ${finding.id ?? ''} ${finding.message}`).join('\n'));
  const item = buildContentRegistry(changed).entries.find(candidate => candidate.id === `print:${PLANNED_ID}`);
  assert.deepEqual([item.status, item.cardId, item.treatment, item.assets, item.plannedAssets, item.brief], ['planned', plannedPrint.cardId, plannedPrint.treatment, [], [PLANNED.src], 'docs/ART-LZ01.md']);
  assert.match(item.capabilities.preview.reason, /no image/);
  const relabeled = planned({ docs: { lz01Checklist: plannedChecklist.replace('| `lz01-008-ink1` | 畫皮之鬼 / INK', '| `lz01-008-ink1` | 畫皮之鬼 / AA') } });
  assert.equal(buildContentRegistry({ ...sources, ...relabeled, content: { ...sources.content, ...relabeled.content } }).entries.find(candidate => candidate.id === `print:${PLANNED_ID}`).treatment,
    plannedPrint.treatment, 'a planned entry takes its treatment from LZ01_PLANNED_SPECIALS, not the checklist label');
});

const nodes = (id, change) => NODES.map(node => node.id === id ? { ...node, ...change(node) } : node);
const evidenceTitle = 'six map locations unlock sequentially on wins and move the traveller on entry';
const redeemTitle = 'seal redemption charges its advertised tier once and creates a fresh copy beside a trained sibling';
const withoutKey = (record, key) => Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));
/** [label, broken sources, codes that must fire, a message one finding must match] */
const SOURCE_FAULTS = [
  ['a referenced public map dropped from the allowlist', { publicAssets: sources.publicAssets.filter(path => path !== 'assets/maps/westward.png') },
    ['capability-inconsistent', 'public-graph-unlisted'], /assets\/maps\/westward\.png is not in hosting\/public-assets\.json/],
  ['a preview atlas leaking into the public build', { publicAssets: [...sources.publicAssets, 'assets/lz01/base-01.png'] },
    ['allowlist-overlap', 'preview-asset-public', 'public-orphan'], /lz01\/base-01\.png/],
  ['an encounter naming a missing card', { content: { NODES: nodes('west-flower-mountain', node => ({ opponentDeck: ['ghost', ...node.opponentDeck.slice(1)] })) } },
    ['capability-inconsistent'], /unknown card ghost/],
  ['an authored deck the app would silently replace', { content: { NODES: nodes('gods-chentang', node => ({ opponentDeck: [...node.opponentDeck.slice(0, 7), node.opponentDeck[0]] })) } },
    ['capability-inconsistent'], /not a legal deck/],
  ['a dangling prerequisite', { content: { NODES: nodes('echo-2-3', () => ({ requiresNode: 'nowhere' })) } },
    ['capability-inconsistent', 'unlock-dangling'], /nowhere/],
  ['a playable printing without its art file', { content: { PRINTINGS: [...sources.content.PRINTINGS, { id: 'wx01-005-zz1', cardId: 'wukong', setId: 'wx01', treatment: 'aa', name: '測試', art: { src: 'assets/wx01/absent.png', columns: 1, rows: 1, index: 0 } }] } },
    ['capability-inconsistent'], /assets\/wx01\/absent\.png is missing/],
  ['a playable printing with no art at all', { content: { PRINTINGS: [...sources.content.PRINTINGS, { id: 'wx01-005-zz2', cardId: 'wukong', setId: 'wx01', treatment: 'aa', name: '測試' }] } },
    ['capability-inconsistent'], /printing has no art/],
  ['an activity drop that is not the boss BASE', { content: { FIRE_MOUNTAIN: { ...sources.content.FIRE_MOUNTAIN, stages: sources.content.FIRE_MOUNTAIN.stages.map((stage, index) => index ? stage : { ...stage, dropPrintId: 'wx01-010-base' }) } } },
    ['capability-inconsistent'], /not honghaier's WX-01 BASE printing/],
  ['a planned special bound without its image or docs', planned({ content: { LZ01_SPECIALS: [...PLANNED.content.LZ01_SPECIALS, plannedPrint] } }),
    ['capability-inconsistent', 'planned-bound'], /huapi-ink\.png is missing/],
  ['a planned special that lost its brief', planned({ docs: { lz01Briefs: sources.docs.lz01Briefs.replace(/^\| `lz01-008-ink1` .*\n/m, '') } }),
    ['checklist-mismatch'], /no brief with a proposed file/],
  ['a planned special whose briefs heading was renamed', planned({ docs: { lz01Briefs: sources.docs.lz01Briefs.replace('## Specials briefs', '## Special printing notes') } }),
    ['checklist-mismatch'], /has no "Specials briefs" section/],
  ['a checklist that claims an unbound image', { content: { LZ01_SPECIALS: PLANNED.content.LZ01_SPECIALS } },
    ['checklist-mismatch'], /checklist marks this special available but nothing binds it/],
  ['a planned printing missing from LZ01_PLANNED_SPECIALS', planned({ content: { LZ01_PLANNED_SPECIALS } }),
    ['checklist-mismatch'], /checklist marks this printing planned but liaozhai-cards\.mjs LZ01_PLANNED_SPECIALS omits it/],
  ['LZ01_PLANNED_SPECIALS naming a printing the checklist calls generated', { content: { LZ01_PLANNED_SPECIALS: PLANNED.content.LZ01_PLANNED_SPECIALS } },
    ['checklist-mismatch'], /LZ01_PLANNED_SPECIALS lists a printing the checklist does not mark planned/],
  ['a planned image added without binding or docs', planned({ fileKind: sources.fileKind }),
    ['planned-asset-exists'], /huapi-ink\.png exists/],
  ['the public game importing an unlisted module', { readText: path => sources.readText(path) + (path === 'app.mjs' ? "\nimport './q4-unlisted.mjs';\n" : '') },
    ['public-graph-unlisted'], /q4-unlisted\.mjs/],
  ['the public game importing preview-only data', { readText: path => sources.readText(path) + (path === 'app.mjs' ? "\nimport './liaozhai-cards.mjs';\n" : '') },
    ['preview-module-public', 'public-graph-unlisted'], /liaozhai-cards\.mjs/],
  ['a public stylesheet importing an unlisted one with a plain @import string', rewrite('styles.css', text => `@import "q4-theme.css";\n${text}`),
    ['public-graph-unlisted'], /the public game loads q4-theme\.css/],
  ['the public game playing an unlisted sound', rewrite('app.mjs', text => `${text}\nconst sealSound = new Audio('assets/sfx/seal.mp3');\n`),
    ['public-graph-unlisted'], /the public game loads assets\/sfx\/seal\.mp3/],
  ['a circular unlock chain', { content: { NODES: nodes('jade-forest', () => ({ requiresNode: 'ember-pass' })) } },
    ['unlock-cycle'], /loops at/],
  ['a second starting encounter', { content: { NODES: nodes('jade-forest', () => ({ requiresNode: null })) } },
    ['unlock-roots'], /expected one starting encounter, found mist-gate, jade-forest/],
  ['an allowlist listing a path twice', { publicAssets: [...sources.publicAssets, 'app.mjs'] },
    ['allowlist-duplicate'], /public-assets\.json lists a path twice/],
  ['an allowlisted file that does not exist', { previewAssets: [...sources.previewAssets, 'assets/lz01/q4-absent.png'] },
    ['allowlist-missing-file'], /q4-absent\.png is missing/],
  ['a preview page loading an unlisted module', rewrite('liaozhai.html', text => text.replace('</body>', '<script type="module" src="./q4-preview-unlisted.mjs"></script></body>')),
    ['preview-graph-unlisted'], /liaozhai\.html loads q4-preview-unlisted\.mjs/],
  ['a preview-allowlisted file nothing uses', { previewAssets: [...sources.previewAssets, 'README.md'] },
    ['preview-orphan'], /README\.md is preview-allowlisted/],
  ['tooling on an allowlist', { publicAssets: [...sources.publicAssets, 'tools/content-registry.mjs'] },
    ['tooling-served'], /tooling must never be allowlisted/],
  ['a planned image allowlisted before it exists', planned({ previewAssets: sources.previewAssets }),
    ['planned-asset-listed'], /huapi-ink\.png is allowlisted while the checklist says no image/],
  ['a checklist row numbered for the wrong character', planned({ docs: { lz01Checklist: plannedChecklist.replace('| `lz01-008-ink1` | 畫皮之鬼 / INK', '| `lz01-008-ink1` | 小倩 / INK') } }),
    ['planned-card-mismatch'], /lz01-008-ink1 number does not match 小倩/],
  ['a design document without its printing checklist', { docs: { ...sources.docs, lz01Checklist: sources.docs.lz01Checklist.replace('## Proposed printing checklist', '## Printing notes') } },
    ['checklist-missing'], /no "Proposed printing checklist" table/],
  ['a printing listed twice', { content: { PRINTINGS: [...sources.content.PRINTINGS, sources.content.PRINTINGS.find(print => print.id === 'wx01-005-tr1')] } },
    ['duplicate-id'], /wx01-005-tr1 appears twice/],
  ['a printing id that is also a card id', { content: { PRINTINGS: [...sources.content.PRINTINGS, { ...sources.content.PRINTINGS.find(print => print.id === 'wx01-005-aa1'), id: 'wukong' }] } },
    ['print-id-collides'], /printId wukong is also a card id/],
  ['a renamed test behind a backup limit', rewrite('tests/cloud-save.test.mjs', text => text.replace('unfinished battles cannot be uploaded', 'unfinished battles stay local')),
    ['dead-reference'], /unfinished battles cannot be uploaded .* no longer resolves \(cited by 66 entries\)/],
  ['a renamed test behind the activity backup limit', rewrite('tests/cloud-save.test.mjs', text => text.replace('an active activity blocks cloud export', 'an active run blocks cloud export')),
    ['dead-reference'], /an active activity blocks cloud export .* no longer resolves \(cited by 1 entry\)/],
  ['a renamed snapshot boundary rule', rewrite('cloud-save.mjs', text => text.replaceAll('assertLegacyExpansionBoundary', 'assertOldBoundary')),
    ['dead-reference'], /cloud-save\.mjs:assertLegacyExpansionBoundary no longer resolves \(cited by 49 entries\)/],
  ['a renamed unlock rule', rewrite('progression.mjs', text => text.replaceAll('isNodeUnlocked', 'isStageOpen')),
    ['dead-reference'], /progression\.mjs:isNodeUnlocked no longer resolves \(cited by 66 entries\)/],
  ['a renamed story-gift rule', rewrite('progression.mjs', text => text.replaceAll('claimWX01StoryPrint', 'claimStoryGift')),
    ['dead-reference'], /progression\.mjs:claimWX01StoryPrint no longer resolves/],
  ['an evidence test switched off with { skip }', rewrite('tests/progression.test.mjs', text => text.replace(`test('${evidenceTitle}', `, `test('${evidenceTitle}', { skip: 'disabled' }, `)),
    ['dead-reference'], /six map locations unlock sequentially .* no longer resolves \(cited by 6 entries\)/],
  ['an evidence test skipped inside its body with t.skip()', rewrite('tests/progression.test.mjs', text => text.replace(`test('${evidenceTitle}', () => {`, `test('${evidenceTitle}', t => { t.skip('disabled'); return;`)),
    ['dead-reference'], /six map locations unlock sequentially .* no longer resolves \(cited by 6 entries\)/],
  ['an evidence test inside a block comment', rewrite('tests/progression.test.mjs', text => {
    const start = text.indexOf(`test('${evidenceTitle}', `), end = text.indexOf('\n});\n', start) + 5;
    return `${text.slice(0, start)}/* disabled\n${text.slice(start, end)}*/\n${text.slice(end)}`;
  }), ['dead-reference'], /six map locations unlock sequentially .* no longer resolves \(cited by 6 entries\)/],
  ['an evidence test nested in describe.skip, which the runner does not count as skipped', rewrite('tests/progression.test.mjs', text => {
    const start = text.indexOf(`test('${evidenceTitle}', `), end = text.indexOf('\n});\n', start) + 5;
    return `import { describe } from 'node:test';\n${text.slice(0, start)}describe.skip('disabled group', () => {\n${text.slice(start, end)}});\n${text.slice(end)}`;
  }), ['dead-reference'], /six map locations unlock sequentially .* no longer resolves \(cited by 6 entries\)/],
  ['an evidence test skipped with this.skip() in a function body', rewrite('tests/progression.test.mjs', text => text.replace(`test('${evidenceTitle}', () => {`, `test('${evidenceTitle}', function () { this.skip('disabled'); return;`)),
    ['dead-reference'], /six map locations unlock sequentially .* no longer resolves \(cited by 6 entries\)/],
  ['a renamed unlock rule whose old definition survives in a comment', rewrite('progression.mjs', text => `${text.replaceAll('isNodeUnlocked', 'isStageOpen')}\n// Renamed from: export function isNodeUnlocked(profile, nodeId)\n`),
    ['dead-reference'], /progression\.mjs:isNodeUnlocked no longer resolves \(cited by 66 entries\)/],
  ['an evidence test switched off by options held in a variable', rewrite('tests/wx01-progression.test.mjs', text => text.replace(`test('${redeemTitle}', `, `const pending = { skip: 'awaiting balance review' };\ntest('${redeemTitle}', pending, `)),
    ['dead-reference'], /seal redemption charges its advertised tier once .* no longer resolves \(cited by \d+ entries\)/],
  ['an evidence test switched off with a quoted { \'skip\' } key', rewrite('tests/progression.test.mjs', text => text.replace(`test('${evidenceTitle}', `, `test('${evidenceTitle}', { 'skip': 'disabled' }, `)),
    ['dead-reference'], /six map locations unlock sequentially .* no longer resolves \(cited by 6 entries\)/],
  ['an evidence test skipped inside its body with t.skip?.()', rewrite('tests/progression.test.mjs', text => text.replace(`test('${evidenceTitle}', () => {`, `test('${evidenceTitle}', t => { t.skip?.('disabled'); return;`)),
    ['dead-reference'], /six map locations unlock sequentially .* no longer resolves \(cited by 6 entries\)/],
  ['a bound special that lost its image path', { content: { LZ01_SPECIALS: LZ01_SPECIALS.map(print => print === plannedPrint ? withoutKey(print, 'src') : print) } },
    ['capability-inconsistent', 'checklist-mismatch'], /checklist image assets\/lz01\/huapi-ink\.png differs from bound \(no image\)/],
  ['an HL-01 special that lost its image path', { content: { HL01_AA: [].concat(sources.content.HL01_AA).map((print, index) => index ? print : withoutKey(print, 'src')) } },
    ['capability-inconsistent'], /printing has no art/],
  ['a world that lost its map', { content: { WORLDS: sources.content.WORLDS.map(world => world.id === 'westward' ? withoutKey(world, 'map') : world) } },
    ['capability-inconsistent'], /world westward has no map/],
  ['an activity that lost its map', { content: { FIRE_MOUNTAIN: withoutKey(sources.content.FIRE_MOUNTAIN, 'map') } },
    ['capability-inconsistent'], /activity has no map/],
  ['a bound checklist row naming another character', { docs: { ...sources.docs, lz01Checklist: sources.docs.lz01Checklist.replace('| `lz01-009-aa1` | 陳氏 / AA', '| `lz01-009-aa1` | 王六郎 / AA') } },
    ['checklist-mismatch'], /checklist character 王六郎 differs from LZ01_SPECIALS 陳氏/],
  ['a bound checklist row naming another treatment', { docs: { ...sources.docs, lz01Checklist: sources.docs.lz01Checklist.replace('| `lz01-006-ink1` | 陸判 / INK', '| `lz01-006-ink1` | 陸判 / TR') } },
    ['checklist-mismatch'], /checklist treatment TR differs from LZ01_SPECIALS ink/],
  ['a bound checklist row naming another working title', { docs: { ...sources.docs, lz01Checklist: sources.docs.lz01Checklist.replace('| 聶小倩 / TR | 歸燈 |', '| 聶小倩 / TR | 歸途 |') } },
    ['checklist-mismatch'], /checklist working title 歸途 differs from LZ01_SPECIALS 歸燈/],
  ['a planned checklist row naming another treatment', planned({ docs: { lz01Checklist: plannedChecklist.replace('| `lz01-008-ink1` | 畫皮之鬼 / INK', '| `lz01-008-ink1` | 畫皮之鬼 / AA') } }),
    ['checklist-mismatch'], /checklist treatment AA differs from LZ01_PLANNED_SPECIALS ink/],
  ['a bound special whose brief still names its superseded file', { docs: { ...sources.docs, lz01Briefs: sources.docs.lz01Briefs.replace(/^(\| `lz01-004-aa1` \|(?:[^|\n]*\|){2} )`assets\/lz01\/yingning-aa2\.png`/m, '$1`assets/lz01/yingning-aa.png`') } },
    ['checklist-mismatch'], /docs\/ART-LZ01\.md brief file assets\/lz01\/yingning-aa\.png differs from bound assets\/lz01\/yingning-aa2\.png/],
];
/** [label, how the registry is altered after derivation, codes that must fire, a message one finding must match] */
const REGISTRY_FAULTS = [
  ['an owned-copy uid inside the registry', entries => { entries[0].uid = 'u-forged'; }, ['owned-copy-in-registry'], /must not carry an owned-copy uid/],
  ['a capability claiming server authority', entries => { entries[0].capabilities['server-authoritative'] = { state: 'available' }; }, ['false-authority'], /Nothing in this source is server-authoritative/],
  ['an unavailable capability without a reason', entries => { entries.find(item => item.id === 'print:lz01-001-aa1').capabilities['local-owned'] = { state: 'unavailable' }; }, ['missing-reason'], /local-owned is unavailable without a stated reason/],
  ['a reference written into prose', entries => { entries[0].capabilities['backup-compatible'].limits[0].text = 'Blocked (cloud-save.mjs:assertLegacyExpansionBoundary).'; }, ['embedded-reference'], /embeds a reference the audit cannot resolve/],
];

test('the audit catches unlisted, leaking, missing and drifting content', () => {
  for (const [label, changes, expected, message] of SOURCE_FAULTS) {
    const findings = audit(changes);
    for (const code of expected) assert(codes(findings).includes(code), `${label}: expected ${code}, got ${codes(findings).join(', ')}`);
    assert(findings.some(finding => message.test(finding.message)), `${label}: no finding matched ${message}`);
  }
});

test('every audit finding code fires on an injected fault', () => {
  for (const [label, mutate, expected, message] of REGISTRY_FAULTS) {
    const findings = forged(mutate);
    for (const code of expected) assert(codes(findings).includes(code), `${label}: expected ${code}, got ${codes(findings).join(', ')}`);
    assert(findings.some(finding => message.test(finding.message)), `${label}: no finding matched ${message}`);
  }
  assert(AUDIT_CODES.length >= 27, `the source scan found only ${AUDIT_CODES.length} finding codes`);
  const covered = new Set([...SOURCE_FAULTS, ...REGISTRY_FAULTS].flatMap(([, , expected]) => expected));
  assert.deepEqual(AUDIT_CODES.filter(code => !covered.has(code)), [], 'a finding code without an injected-fault case');
});

test('loading sources takes no root, so an audit never mixes two trees', () => {
  assert.throws(() => loadContentSources('/elsewhere/mythseal'), /reads this checkout only/);
  assert.equal(loadContentSources().root, sources.root);
});

test('rule, resume and evidence references must name real code or real tests', () => {
  const read = sources.readText;
  assert(resolveReference('progression.mjs:beginBattle', read));
  assert(resolveReference('progression.mjs:bankCampaignMilestones', read), 'module-private functions resolve by definition');
  assert(resolveReference('app.mjs:resumeBattle', read));
  assert(resolveReference('tests/cloud-save.test.mjs › unfinished battles cannot be uploaded or restored and original pending remains untouched', read));
  assert.equal(resolveReference('progression.mjs:noSuchRule', read), false);
  assert.equal(resolveReference('tests/cloud-save.test.mjs › a renamed test', read), false);
  assert.equal(resolveReference('missing.mjs:anything', read), false);
  const runs = text => resolveReference('tests/sample.test.mjs › a sample', () => text);
  assert(runs("test('a sample', () => {});"));
  assert(runs('test("a sample", { timeout: 50 }, () => {});'), 'options without skip or todo still run');
  assert(runs("test('a sample', { skip: false }, () => {});"));
  assert.equal(runs("test('a sample', { skip: 'disabled' }, () => {});"), false, 'a skipped test is not evidence');
  assert.equal(runs("test('a sample', { todo: true }, () => {});"), false);
  assert.equal(runs("test('a sample', { skip }, () => {});"), false);
  assert.equal(runs("test.skip('a sample', () => {});"), false);
  assert.equal(runs("  // test('a sample', () => {});"), false, 'a commented-out test is not evidence');
  assert.equal(runs("xtest('a sample', () => {});"), false);
  assert(runs("// test('a sample', () => {});\ntest('a sample', () => {});"), 'a later live declaration still counts');
  assert.equal(runs("/*\ntest('a sample', () => {});\n*/"), false, 'a test inside a block comment is not evidence');
  assert.equal(runs("const note = \"test('a sample', () => {})\";"), false, 'a declaration quoted in a string is not evidence');
  assert.equal(runs("test('a sample', t => { t.skip('disabled'); return; });"), false, 'a test that skips itself at run time is not evidence');
  assert.equal(runs("test('a sample', async (t) => { await setup(); t.todo(); });"), false);
  assert.equal(runs("test('a sample', function (context) { if (slow) context.skip(); });"), false, 'a conditional skip may skip, so it does not count');
  assert.equal(runs("test('a sample', { timeout: 50 }, async t => { t?.skip(); });"), false);
  assert(runs("test('a sample', t => { assert.match(text, /'\\}/); t.diagnostic('skip(') });\ntest('another', t => t.skip());"), 'a skip in a later test, a string or a regex does not disqualify this one');
  assert(runs("test('a sample', t => { subject.skip(); st.skip(); });"), 'only the test context skipping counts');
  assert(runs("test('a sample', { timeout: 50, plan: { at: 1 } }, () => {});"), 'nested option objects still run');
  assert.equal(runs("test('a sample', { timeout: { at: 1 }, skip: true }, () => {});"), false);
  assert.equal(runs("test(`a sample`, () => {}); // `test('a sample'` is quoted here"), true);
  assert.equal(runs("describe.skip('group', () => {\n  test('a sample', () => {});\n});"), false, 'a skipped suite hides the test from the skip count, so a nested test is not evidence');
  assert.equal(runs("suite('group', { skip: true }, () => { test('a sample', () => {}); });"), false);
  assert.equal(runs("test('outer', { skip: true }, () => { test('a sample', () => {}); });"), false, 'a test nested in a skipped test is not evidence');
  assert.equal(runs("if (process.env.SLOW) { test('a sample', () => {}); }"), false, 'a test declared inside a block may never be declared');
  assert(runs("describe('group', () => {});\ntest('a sample', () => {});"), 'a top-level test after a suite still counts');
  assert.equal(runs("test('a sample', function () { this.skip('disabled'); });"), false, 'a function callback\'s context is `this`');
  assert.equal(runs("test('a sample', async function () { this.todo(); });"), false);
  assert.equal(runs("test('a sample', function (t) { if (slow) this?.skip(); });"), false);
  assert(runs("test('a sample', function () { assert.ok(this.name); });"), 'a function callback that never skips still counts');
  assert(runs("test('a sample', () => { subject.this.skip(); });"), 'only the context itself skipping counts');
  // Node reports each of these skipped (or runs nothing), so none is evidence.
  assert.equal(runs("const pending = { skip: 'x' };\ntest('a sample', pending, () => {});"), false, 'options held in a variable cannot be read');
  assert.equal(runs("test('a sample', process.env.FAST ? { skip: 'slow' } : {}, () => {});"), false, 'conditional options cannot be read');
  assert.equal(runs("const o = { skip: 'x' };\ntest('a sample', { ...o }, () => {});"), false, 'a spread may carry skip');
  assert.equal(runs("test('a sample', { ['skip']: true }, () => {});"), false, 'a computed key may be skip');
  assert.equal(runs("test('a sample', { 'skip': 'disabled' }, () => {});"), false, 'a quoted skip key still skips');
  assert.equal(runs('test("a sample", { "todo": true }, () => {});'), false);
  assert.equal(runs("test('a sample', { get skip() { return true; } }, () => {});"), false);
  assert.equal(runs("test('a sample', { skip: false || 'slow' }, () => {});"), false, 'only a literal false keeps it running');
  assert(runs("test('a sample', { 'skip': false, 'timeout': 50, }, () => {});"), 'quoted keys are read, not guessed');
  assert.equal(runs("test('a sample', t => { t.skip?.('x'); });"), false, 'an optional call still skips');
  assert.equal(runs("test('a sample', t => { t['skip']('x'); });"), false, 'a bracketed skip still skips');
  assert.equal(runs("test('a sample', t => { t[method]('x'); });"), false, 'a computed member may be skip');
  assert.equal(runs("test('a sample', t => { t.todo.call(t); });"), false);
  assert.equal(runs("test('a sample', function () { this['skip'](); });"), false);
  assert(runs("test('a sample', t => { t['diagnostic']('skip'); });"), 'a bracketed member naming something else still runs');
  assert.equal(runs("test('a sample', named);\nfunction named(t) { t.skip(); }"), false, 'a callback passed by name cannot be read');
  assert.equal(runs("test('a sample');"), false, 'a test without a callback runs nothing');
  assert.equal(runs("test('a sample', { timeout: 50 });"), false);
  assert.equal(runs("test('a sample', ({ skip }) => {});"), false, 'a destructured context cannot be followed');
  assert.equal(runs("test('a sample' + ' again', () => {});"), false, 'a longer title names another test');
  assert(runs("test('a sample', async (t = {}) => { t.diagnostic('x'); },);"), 'a defaulted context and a trailing comma still run');
  const defines = text => resolveReference('sample.mjs:gone', () => text);
  assert(defines('export function gone() {}') && defines('const gone = () => 1;') && defines('function other() {}\nexport { other, gone };'));
  assert.equal(defines('// Renamed from: export function gone(profile) {}'), false, 'a definition left in a comment is not code');
  assert.equal(defines('/* function gone() {} */'), false);
  assert.equal(defines('const note = "function gone(";'), false, 'a definition quoted in a string is not code');
});

test('the asset walker follows every statically visible load form', () => {
  const refs = (path, text) => localReferences(path, text).sort();
  assert.deepEqual(localReferences('styles.css', `a{background:url("data:image/svg+xml,%3Csvg filter='url(%23n)'%3E")} b{background:url('assets/mark.svg')}`), ['assets/mark.svg']);
  assert.deepEqual(localReferences('page.html', '<link rel="canonical" href="https://mythseal.com/"><script type="module" src="./app.mjs?v=1"></script>'), ['app.mjs']);
  assert.deepEqual(refs('styles.css', `@import "theme.css"; @import 'print.css' print; @import url("x.css");
    a{background:image-set("assets/a.avif" type("image/avif"), "assets/a.png" 1x)} @font-face{src:url(fonts/a.woff2)}`),
  ['assets/a.avif', 'assets/a.png', 'fonts/a.woff2', 'print.css', 'theme.css', 'x.css']);
  assert.deepEqual(refs('app.mjs', `const s = new Audio('assets/sfx/seal.mp3'), g = 'assets/fx/spark.gif'; new Worker('./worker.mjs', { type: 'module' });
    fetch('data/cards.json'); img.src = 'media/x.webp'; el.setAttribute('poster', 'media/poster.jpg'); el.srcset = 'a.png 1x, b.png 2x';
    new URL('./art.png', import.meta.url); const view = '<audio src="sfx/hum.ogg"></audio><video poster="cover.jpg"></video>';`),
  ['a.png', 'art.png', 'assets/fx/spark.gif', 'assets/sfx/seal.mp3', 'b.png', 'cover.jpg', 'data/cards.json', 'media/poster.jpg', 'media/x.webp', 'sfx/hum.ogg', 'worker.mjs']);
  assert.deepEqual(refs('ui/panel.mjs', "import '../engine.mjs'; import('./part.mjs'); new Audio('../assets/sfx/seal.mp3');"), ['assets/sfx/seal.mp3', 'engine.mjs', 'ui/part.mjs']);
  assert.deepEqual(refs('app.mjs', "fetch('/api/session'); a.download = 'mythseal-recovery-originals.json'; fetch(url); const art = `assets/${id}.png`;"), [],
    'an API path, a download name and a runtime-built path are not file loads');
  assert.deepEqual(refs('page.html', `<img src="a.png" srcset="a-2x.png 2x, a-3x.png 3x"><video poster="p.jpg" src="v.webm"><track src="c.vtt"></video><audio src='s.mp3'></audio>
    <picture><source srcset="x.avif" type="image/avif"></picture><a href="other.html">x</a><style>@import "inline.css";</style>
    <script type="module">import "./inline.mjs";</script><link rel="preload" as="image" imagesrcset="hero.webp 1x">`),
  ['a-2x.png', 'a-3x.png', 'a.png', 'c.vtt', 'hero.webp', 'inline.css', 'inline.mjs', 'p.jpg', 's.mp3', 'v.webm', 'x.avif']);
});

function ancestors(id) {
  const chain = [];
  for (let current = entry(`encounter:${id}`).unlock.requires; current !== null; current = entry(`encounter:${current}`).unlock.requires) chain.unshift(current);
  return chain;
}
function play(profile, nodeId, route) {
  const started = beginBattle(profile, { kind: 'expedition', nodeId, route, rng: () => .25, now });
  const settled = finishBattle(started.profile, { encounterId: started.encounter.id, winner: 'player', playedCardIds: [], finalResources: { hp: 6, pills: 2 }, now });
  return { started, settled };
}

test('every advertised encounter route starts, completes once, rejects a duplicate and opens its next step', () => {
  let routes = 0;
  for (const item of registry.entries.filter(candidate => candidate.kind === 'encounter' && candidate.capabilities['local-playable'].state === 'available')) {
    for (const route of item.routes) {
      const profile = createProfile({ now }); profile.cleared = ancestors(item.nodeId);
      const next = nextNodeInWorld(item.nodeId);
      if (next) assert.equal(isNodeUnlocked(profile, next), false, `${item.id}: ${next} must wait for this clear`);
      const first = play(profile, item.nodeId, route);
      if (route === 'loaner') assert.deepEqual(first.started.encounter.instanceIds, [], `${item.id} borrows its deck`);
      assert.equal(first.settled.reward.firstClear, true, `${item.id} ${route} first clear`);
      assert.equal(first.settled.profile.pending, null);
      assert.equal(first.settled.profile.location, item.nodeId);
      assert.deepEqual(first.settled.profile.cleared.filter(id => id === item.nodeId), [item.nodeId]);
      assert.throws(() => finishBattle(first.settled.profile, { encounterId: first.started.encounter.id, winner: 'player', finalResources: { hp: 6, pills: 2 }, now }), /已結算/, `${item.id} duplicate completion`);
      if (next) assert.equal(isNodeUnlocked(first.settled.profile, next), true, `${item.id}: returning opens ${next}`);
      const again = play(first.settled.profile, item.nodeId, route);
      assert.equal(again.settled.reward.firstClear, false, `${item.id} ${route} pays its first clear once`);
      if (item.group === 'campaign') {
        assert.equal(again.settled.profile.expansion.grants.filter(grant => grant.source === item.nodeId).length, item.printRefs.length, `${item.id} reward grant is banked once`);
      }
      routes++;
    }
  }
  assert.equal(routes, 66 + 2, 'two campaign nodes also lend a deck');
});

test('the fire-mountain activity completes on both routes and pays its first clear once', () => {
  const item = entry('activity:fire-mountain');
  for (const route of item.routes) {
    let profile = createProfile({ now }); profile.cleared = [item.unlock.requires];
    for (let run = 0; run < 2; run++) {
      profile = startActivity(profile, { route, rng: () => .2, now }).profile;
      for (const [stage, stageId] of item.stageIds.entries()) {
        const encounterId = profile.pending.id;
        assert.equal(profile.pending.activityStage, stage, stageId);
        const settled = finishBattle(profile, { encounterId, winner: 'player', playedCardIds: [], finalResources: { hp: 12, pills: 12 }, now });
        profile = settled.profile;
        assert.throws(() => finishBattle(profile, { encounterId, winner: 'player', finalResources: { hp: 12, pills: 12 }, now }), /已結算/);
        if (stage < item.stageIds.length - 1) profile = advanceActivity(profile, { supply: 'none', expectedRunId: profile.expansion.fireMountain.run.id, expectedStage: stage, now }).profile;
        else assert.equal(settled.reward.activity.complete, true);
      }
      assert.equal(profile.expansion.fireMountain.clears, run + 1);
      assert.equal(profile.expansion.fireMountain.run, null);
      assert.equal(profile.expansion.grants.filter(grant => grant.id === 'fire-mountain:first-clear').length, 1, `${route} run ${run + 1}`);
    }
  }
});

test('acquisition lists exactly the printings each story and expansion grant route mints', () => {
  // Clear every encounter, then win one fire-mountain run whose seeds drop loot on every stage,
  // so every fixed grant is banked and the story gift is open.
  let profile = createProfile({ now });
  for (const item of registry.entries.filter(candidate => candidate.kind === 'encounter')) profile = play(profile, item.nodeId, 'owned').settled.profile;
  profile = startActivity(profile, { route: 'loaner', rng: () => .99, now }).profile;
  for (let stage = 0; stage < 3; stage++) {
    profile = finishBattle(profile, { encounterId: profile.pending.id, winner: 'player', playedCardIds: [], finalResources: { hp: 12, pills: 12 }, now }).profile;
    if (stage < 2) profile = advanceActivity(profile, { supply: 'none', expectedRunId: profile.expansion.fireMountain.run.id, expectedStage: stage, now }).profile;
  }
  const label = grant => grant.id.replace(/^activity-\d+:/, 'activity-*:');
  assert.deepEqual(profile.expansion.grants.map(label).filter(id => !id.startsWith('campaign:echo-')),
    ['campaign:westward-echo:aa', 'activity-*:stage-0:loot', 'activity-*:stage-1:loot', 'activity-*:stage-2:loot', 'fire-mountain:first-clear']);
  const attempt = run => { try { return run(); } catch { return null; } };
  const wx01 = PRINTINGS.filter(print => print.setId === 'wx01'), minted = [];
  for (const print of wx01) {
    if (attempt(() => claimWX01StoryPrint(profile, print.id, { now }))?.cards[0].printId === print.id) minted.push(`${print.id} progression.mjs:claimWX01StoryPrint`);
    for (const grant of profile.expansion.grants) {
      const claimed = attempt(() => claimExpansionGrant(profile, { id: grant.id, ...(grant.kind === 'base' ? {} : { printId: print.id }), now }));
      if (claimed?.cards[0].printId === print.id) minted.push(`${print.id} progression.mjs:claimExpansionGrant ${label(grant)}`);
    }
  }
  const listed = registry.entries.filter(item => item.kind === 'printing').flatMap(item => (item.acquisition ?? [])
    .filter(route => GRANT_RULES.includes(route.rule)).map(route => [item.printId, route.rule, route.grant].filter(Boolean).join(' ')));
  assert.equal(minted.filter(route => route.includes('claimWX01StoryPrint')).length, 6, 'the story gift offers each of the six AA');
  assert.equal(minted.filter(route => route.includes('westward-echo')).length, 6, 'the campaign-final grant offers each of the six AA');
  assert.deepEqual(listed.sort(), minted.sort(), 'every grant route that mints a printing is listed on it, and every listed grant route mints it');
});

test('acquisition lists exactly the printings a new journey and a v2 save migration mint', () => {
  const printsOf = (profile, origin) => [...new Set(profile.instances.filter(instance => instance.origin === origin).map(instance => instance.printId))].sort();
  const listing = (rule, detail) => registry.entries.filter(item => (item.acquisition ?? []).some(route => route.rule === rule && detail.test(route.detail))).map(item => item.printId).sort();
  const fresh = createProfile({ now });
  assert.equal(fresh.instances.length, 16);
  assert.deepEqual(printsOf(fresh, 'starter'), listing(START_RULES[0], /^starter copy/));
  assert.deepEqual(printsOf(fresh, 'welcome'), listing(START_RULES[0], /^welcome gift/));
  assert.equal(listing(START_RULES[0], /./).length, 16);
  // A v2 save keeps its inventory counts; hydrateProfile mints them with a starter floor and, before the collection expansion, the welcome gift.
  const migrated = raw => printsOf(hydrateProfile({ version: 2, ...raw }, { now }), 'migration');
  assert.deepEqual(migrated({ collectionExpansion: 1, inventory: Object.fromEntries(LEGACY_CARD_IDS.map(id => [id, 2])) }), listing(START_RULES[1], /^v2 save migration/));
  assert.deepEqual(migrated({ collectionExpansion: 1 }), listing(START_RULES[1], /at least one/));
  assert.deepEqual(migrated({}), [...listing(START_RULES[1], /at least one/), ...listing(START_RULES[1], /welcome gift/)].sort());
  assert.equal(listing(START_RULES[1], /./).length, 24, 'every legacy printing can come from a v2 save');
  assert.equal(registry.entries.some(item => item.setId !== 'legacy' && (item.acquisition ?? []).some(route => START_RULES.includes(route.rule))), false);
});

test('reward rules name exactly the grant and ticket claims each clear can bank', () => {
  const claim = 'progression.mjs:claimExpansionGrant', ticket = 'progression.mjs:openWX01Ticket', gift = 'progression.mjs:claimWX01StoryPrint';
  const encounters = registry.entries.filter(item => item.kind === 'encounter');
  const aa = PRINTINGS.find(print => print.setId === 'wx01' && print.treatment === 'aa');
  const giftOpen = profile => { try { claimWX01StoryPrint(structuredClone(profile), aa.id, { now }); return true; } catch { return false; } };
  /** Clear encounters in this order; what each first clear banks or opens. */
  const clearAll = order => {
    let profile = createProfile({ now }), open = giftOpen(profile);
    const banked = new Map();
    for (const item of order) {
      const grants = profile.expansion.grants.length, tickets = profile.expansion.tickets;
      profile = play(profile, item.nodeId, 'owned').settled.profile;
      const opened = !open && giftOpen(profile);
      open ||= opened;
      banked.set(item.nodeId, { [claim]: profile.expansion.grants.length > grants, [ticket]: profile.expansion.tickets > tickets, [gift]: opened });
    }
    return banked;
  };
  const inOrder = clearAll(encounters);
  const lists = { [claim]: [], [ticket]: [], [gift]: [] }, banks = { [claim]: [], [ticket]: [], [gift]: [] };
  for (const item of encounters) {
    for (const rule of [claim, ticket, gift]) {
      let banked = inOrder.get(item.nodeId)[rule];
      // A reward that opens when a whole group is cleared (the campaign-final grant, the story gift)
      // could open on another member's clear only if that member were cleared last; try that order too.
      if (!banked && rule !== ticket && item.rules.reward.includes(rule)) {
        try { banked = clearAll([...encounters.filter(other => other !== item), item]).get(item.nodeId)[rule]; } catch { banked = false; }
      }
      if (banked) banks[rule].push(item.nodeId);
      if (item.rules.reward.includes(rule)) lists[rule].push(item.nodeId);
    }
  }
  assert.deepEqual(lists[claim], banks[claim], 'an encounter lists claimExpansionGrant exactly when its clear banks a grant');
  assert.deepEqual(lists[ticket], banks[ticket], 'an encounter lists openWX01Ticket exactly when its clear banks a ticket');
  assert.deepEqual(lists[gift], banks[gift], 'an encounter lists claimWX01StoryPrint exactly when its first clear opens the story gift');
  assert.deepEqual(banks[claim], ['echo-1-1', 'echo-1-2', 'echo-1-4', 'echo-1-6', 'echo-2-8', 'echo-3-8', 'echo-4-8', 'echo-5-8', 'echo-6-8']);
  assert.deepEqual(banks[ticket], ['echo-1-8', 'echo-2-8', 'echo-3-8', 'echo-4-8', 'echo-5-8', 'echo-6-8']);
  assert.deepEqual(banks[gift], ['west-spirit-mountain']);

  const activity = entry('activity:fire-mountain');
  let profile = createProfile({ now }); profile.cleared = [activity.unlock.requires];
  const before = structuredClone(profile.expansion);
  profile = startActivity(profile, { route: 'loaner', rng: () => .2, now }).profile;
  for (let stage = 0; stage < activity.stageIds.length; stage++) {
    profile = finishBattle(profile, { encounterId: profile.pending.id, winner: 'player', playedCardIds: [], finalResources: { hp: 12, pills: 12 }, now }).profile;
    if (stage < activity.stageIds.length - 1) profile = advanceActivity(profile, { supply: 'none', expectedRunId: profile.expansion.fireMountain.run.id, expectedStage: stage, now }).profile;
  }
  assert.equal(activity.rules.reward.includes(claim), profile.expansion.grants.length > before.grants.length, 'a first run banks the first-clear grant');
  assert.equal(activity.rules.reward.includes(ticket), profile.expansion.tickets > before.tickets, 'the first weekly clear banks a ticket');
});

test('a preview printing\'s ownership reason follows the pages that serve it', () => {
  for (const item of registry.entries.filter(candidate => candidate.status === 'preview')) {
    assert.match(item.capabilities['local-owned'].reason, new RegExp(`${item.pages.join(' and ').replaceAll('.', '\\.')} never loads? the profile store`), item.id);
  }
  const writing = buildContentRegistry({ ...sources, ...rewrite('liaozhai.html', text => text.replace('</body>', '<script type="module" src="./playtest-supply-ui.mjs"></script></body>')) });
  assert.equal(writing.entries.find(item => item.id === 'print:lz01-001-aa1').capabilities['local-owned'].reason,
    'collection.mjs only mints printing-catalogue.mjs printings. liaozhai.html loads the profile store (profile-store.mjs) but cannot mint this printing.');
});

test('the story gift opens only after every encounter its acquisition route names', () => {
  const gate = STORY_NODES.filter(node => node.worldId === 'westward').map(node => node.id);
  assert.equal(gate.length, 4);
  const aa = PRINTINGS.find(print => print.setId === 'wx01' && print.treatment === 'aa');
  const route = entry(`print:${aa.id}`).acquisition.find(item => item.rule === 'progression.mjs:claimWX01StoryPrint');
  assert(route.detail.endsWith(`after clearing ${gate.join(', ')}`), route.detail);
  const after = cleared => { const profile = createProfile({ now }); profile.cleared = cleared; return profile; };
  assert.equal(claimWX01StoryPrint(after(gate), aa.id, { now }).cards[0].printId, aa.id);
  for (const id of gate) assert.throws(() => claimWX01StoryPrint(after(gate.filter(other => other !== id)), aa.id, { now }), /通過西行首卷四處地點/, `${id} gates the gift`);
});

test('a backup round trip keeps every playable clear, the activity record and every ownable printing', () => {
  let profile = createProfile({ now });
  for (const item of registry.entries.filter(candidate => candidate.kind === 'encounter' && candidate.capabilities['backup-compatible'].state === 'available')) {
    profile = play(profile, item.nodeId, 'owned').settled.profile;
  }
  profile = startActivity(profile, { route: 'loaner', rng: () => .2, now }).profile;
  for (let stage = 0; stage < 3; stage++) {
    profile = finishBattle(profile, { encounterId: profile.pending.id, winner: 'player', playedCardIds: [], finalResources: { hp: 12, pills: 12 }, now }).profile;
    if (stage < 2) profile = advanceActivity(profile, { supply: 'none', expectedRunId: profile.expansion.fireMountain.run.id, expectedStage: stage, now }).profile;
  }
  const ownable = registry.entries.filter(candidate => candidate.capabilities['backup-compatible'].state === 'available' && candidate.kind === 'printing');
  assert.equal(ownable.length, 53);
  for (const item of ownable) profile = mintInstance(profile, item.cardId, { source: 'registry-fixture', now, printId: item.printId }).profile;
  const restored = restoreSnapshot(JSON.parse(JSON.stringify(createSnapshot(profile))), { now });
  assert.deepEqual(restored.cleared, profile.cleared);
  assert.equal(restored.cleared.length, 66);
  assert.deepEqual(restored.expansion.fireMountain, profile.expansion.fireMountain);
  assert.deepEqual(restored.expansion.grants, profile.expansion.grants);
  const prints = value => value.instances.map(instance => `${instance.uid}:${instance.printId}`).sort();
  assert.deepEqual(prints(restored), prints(profile));
  for (const item of ownable) assert(restored.instances.some(instance => instance.printId === item.printId), item.printId);
});

test('the audit CLI runs and reports when its path goes through a symlink', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mythseal-registry-')), link = join(dir, 'checkout');
  symlinkSync(fileURLToPath(new URL('..', import.meta.url)), link, 'dir');
  try {
    const run = spawnSync(process.execPath, [join(link, 'tools', 'content-registry.mjs')], { encoding: 'utf8' });
    assert.notEqual(run.stdout, '', 'a symlinked path must not skip the audit and exit 0 silently');
    const output = JSON.parse(run.stdout);
    assert.equal(output.summary.entries, registry.summary.entries);
    assert.equal(run.status, output.findings.length ? 1 : 0, run.stderr);
  } finally { unlinkSync(link); rmdirSync(dir); }
});

test('the registry is tooling only: no allowlist or served page can load it', () => {
  const lists = ['hosting/public-assets.json', 'hosting/preview-assets.json'].map(path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')));
  for (const list of lists) assert.equal(list.some(path => path.startsWith('tools/') || path.includes('content-registry')), false);
  for (const path of lists.flat().filter(file => file.endsWith('.mjs') || file.endsWith('.html'))) {
    assert.equal(localReferences(path, sources.readText(path)).some(reference => reference.includes('content-registry') || reference.startsWith('tools/')), false, path);
  }
});
