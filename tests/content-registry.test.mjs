import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildContentRegistry, auditContent, loadContentSources, resolveReference, localReferences, CAPABILITIES } from '../tools/content-registry.mjs';
import { createProfile, beginBattle, finishBattle, startActivity, advanceActivity, isNodeUnlocked, NODES } from '../progression.mjs';
import { nextNodeInWorld } from '../stories.mjs';
import { mintInstance } from '../collection.mjs';
import { createSnapshot, restoreSnapshot } from '../cloud-save.mjs';
import { LZ01_AA } from '../liaozhai-cards.mjs';

const now = '2026-09-22T12:00:00.000Z';
const sources = loadContentSources();
const registry = buildContentRegistry(sources);
const entry = id => registry.entries.find(item => item.id === id);
const byGroup = (kind, group) => registry.entries.filter(item => item.kind === kind && item.group === group);
const codes = findings => [...new Set(findings.map(finding => finding.code))].sort();
const audit = changes => auditContent({ ...sources, ...changes, content: { ...sources.content, ...changes.content } });

test('the registry derives every encounter, the activity and each printing exactly once with honest statuses', () => {
  assert.deepEqual(registry.summary.byKind, {
    'encounter:original': 6, 'encounter:story': 12, 'encounter:campaign': 48, 'activity:fire-mountain': 1,
    'printing:legacy': 24, 'printing:wx01': 29, 'printing:lz01': 19, 'printing:hl01': 11,
  });
  assert.deepEqual(registry.summary.byStatus, { 'local-playable': 120, preview: 24, planned: 6 });
  assert.equal(new Set(registry.entries.map(item => item.id)).size, registry.entries.length);
  assert.deepEqual(registry.entries.filter(item => item.kind === 'encounter').map(item => item.nodeId), NODES.map(node => node.id));
  for (const item of [...byGroup('encounter', 'original'), ...byGroup('encounter', 'story'), ...byGroup('encounter', 'campaign'), ...byGroup('printing', 'wx01'), ...byGroup('printing', 'legacy')]) {
    assert.equal(item.status, 'local-playable', item.id);
  }
  assert.equal(entry('activity:fire-mountain').status, 'local-playable');
  assert.equal(entry('activity:fire-mountain').contentVersion, 1, 'the only declared content version is copied, never invented');
  const lz = byGroup('printing', 'lz01');
  assert.deepEqual(lz.filter(item => item.status === 'planned').map(item => item.printId).sort(),
    ['lz01-001-tr1', 'lz01-004-aa1', 'lz01-006-ink1', 'lz01-008-ink1', 'lz01-009-aa1', 'lz01-011-aa1']);
  assert.equal(lz.filter(item => item.status === 'preview').length, 13, 'twelve BASE and the one generated AA');
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
  assert.match(entry('print:hl01-001-base').capabilities['local-playable'].reason, /legacy\/lindaiyu/, 'a preview reprint names the identity that already plays');
  assert.match(entry('print:lz01-009-aa1').capabilities.preview.reason, /no image/);
  assert.equal(entry('print:lz01-009-aa1').cardId, 'chenshi');
  assert.deepEqual(entry('print:lz01-001-tr1').plannedAssets, ['assets/lz01/xiaoqian-treasure.png']);
  const owned = entry('print:wx01-005-tr1');
  assert.deepEqual(owned.acquisition.map(route => route.rule), ['progression.mjs:buyPack', 'progression.mjs:redeemWX01Print']);
  assert.deepEqual(entry('print:wx01-006-base').acquisition.map(route => route.detail),
    ['WX-01 pack sampler (also buyWX01Box and openWX01Ticket)', 'fire-mountain-red loot']);
  assert.deepEqual(entry('encounter:echo-1-7').routes, ['owned', 'loaner']);
  assert.equal(entry('encounter:mist-gate').opponent, 'random-legacy');
  assert.equal(entry('encounter:mist-gate').unlock.requires, null);
});

test('the current source passes the content audit', () => {
  const findings = auditContent(sources, registry);
  assert.deepEqual(findings, [], findings.map(finding => `${finding.code} ${finding.id ?? ''} ${finding.message}`).join('\n'));
});

test('the audit catches unlisted, leaking, missing and drifting content', () => {
  const nodes = (id, change) => NODES.map(node => node.id === id ? { ...node, ...change(node) } : node);
  const cases = [
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
    ['a planned special bound without its image or docs', { content: { LZ01_AA: [LZ01_AA, { cardId: 'yingning', printId: 'lz01-004-aa1', treatment: 'aa', name: '嬰寧 · 花間藏笑', src: 'assets/lz01/yingning-aa.png' }] } },
      ['capability-inconsistent', 'planned-bound'], /yingning-aa\.png is missing/],
    ['a planned special that lost its brief', { docs: { ...sources.docs, lz01Briefs: sources.docs.lz01Briefs.replace(/^\| `lz01-011-aa1` .*\n/m, '') } },
      ['checklist-mismatch'], /no brief with a proposed file/],
    ['a checklist that claims an unbound image', { docs: { ...sources.docs, lz01Checklist: sources.docs.lz01Checklist.replace(/(\| `lz01-009-aa1` [^\n]*\| )Planned · brief only \(2026-10-10\), no image \|/, '$1Generated local preview image: `assets/lz01/chenshi-aa.png` |') } },
      ['checklist-mismatch'], /lz01-009-aa1|nothing binds it/],
    ['a planned image added without binding or docs', { fileKind: path => path === 'assets/lz01/huapi-ink.png' ? 'file' : sources.fileKind(path) },
      ['planned-asset-exists'], /huapi-ink\.png exists/],
    ['the public game importing an unlisted module', { readText: path => sources.readText(path) + (path === 'app.mjs' ? "\nimport './q4-unlisted.mjs';\n" : '') },
      ['public-graph-unlisted'], /q4-unlisted\.mjs/],
    ['the public game importing preview-only data', { readText: path => sources.readText(path) + (path === 'app.mjs' ? "\nimport './liaozhai-cards.mjs';\n" : '') },
      ['preview-module-public', 'public-graph-unlisted'], /liaozhai-cards\.mjs/],
  ];
  for (const [label, changes, expected, message] of cases) {
    const findings = audit(changes);
    for (const code of expected) assert(codes(findings).includes(code), `${label}: expected ${code}, got ${codes(findings).join(', ')}`);
    assert(findings.some(finding => message.test(finding.message)), `${label}: no finding matched ${message}`);
  }
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
  assert.deepEqual(localReferences('styles.css', `a{background:url("data:image/svg+xml,%3Csvg filter='url(%23n)'%3E")} b{background:url('assets/mark.svg')}`), ['assets/mark.svg']);
  assert.deepEqual(localReferences('page.html', '<link rel="canonical" href="https://mythseal.com/"><script type="module" src="./app.mjs?v=1"></script>'), ['app.mjs']);
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

test('the registry is tooling only: no allowlist or served page can load it', () => {
  const lists = ['hosting/public-assets.json', 'hosting/preview-assets.json'].map(path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')));
  for (const list of lists) assert.equal(list.some(path => path.startsWith('tools/') || path.includes('content-registry')), false);
  for (const path of lists.flat().filter(file => file.endsWith('.mjs') || file.endsWith('.html'))) {
    assert.equal(localReferences(path, sources.readText(path)).some(reference => reference.includes('content-registry') || reference.startsWith('tools/')), false, path);
  }
});
