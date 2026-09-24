/** Campaign/activity acceptance. Isolated synthetic saves; loopback requests only. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile, hydrateProfile, PROFILE_KEY, NODES, beginBattle, finishBattle, startActivity, getPendingBattleOptions } from '../progression.mjs';
import { createMatch } from '../engine.mjs';
import { BATTLE_KEY } from '../profile-store.mjs';
import { setInstanceXP } from '../collection.mjs';
import { CAMPAIGN_NODES, CAMPAIGN_WORLDS } from '../campaign-content.mjs';
import { clickViewportItem, revealViewportItem, viewportFrames, visibleViewportIds } from './viewport-browser-helpers.mjs';

const browserName=process.env.BROWSER||'chromium', runtime=fileURLToPath(new URL('../test-results/webkit-runtime',import.meta.url));
if(!['chromium','webkit'].includes(browserName))throw Error('Unsupported browser');
if(browserName==='webkit'&&!process.env.PLAYWRIGHT_BROWSERS_PATH&&existsSync(runtime))process.env.PLAYWRIGHT_BROWSERS_PATH=runtime;
const engines=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.env.GAME_URL||'http://127.0.0.1:4177');
if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname))throw Error('Loopback only');
const chrome=process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const output=fileURLToPath(new URL('../test-results/',import.meta.url)), now='2026-09-22T12:00:00.000Z';
const sizes=[[1440,900],[1280,720],[390,844],[360,740],[360,640],[844,390]];
const selectedSizes=process.env.VIEWPORT_SIZE?sizes.filter(size=>size.join('x')===process.env.VIEWPORT_SIZE):sizes;
const contexts=new Set(), errors=[], checks=[], layouts=[], pagination=[], screenshots=[];
const audit=false;
const action=(page,name,id)=>page.locator(`[data-action="${name}"]:not(#app[inert] *)${id===undefined?'':`[data-id="${id}"]`}`).first();
const click=(page,name,id)=>clickViewportItem(page,action(page,name,id));
const read=(page,key=PROFILE_KEY)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const raw=page=>page.evaluate(key=>localStorage.getItem(key),PROFILE_KEY);
const passed=label=>{checks.push(label);console.log(`PASS ${label}`);};
const close=page=>clickViewportItem(page,page.locator('.modal-close'));
const go=(page,name)=>clickViewportItem(page,page.locator(`.game-dock [data-action="${name}"]`));

function fixture(stages=0){
  let profile=createProfile({now});
  profile.cleared=NODES.filter(node=>!node.campaign).map(node=>node.id);
  for(const item of profile.instances)profile=setInstanceXP(profile,item.uid,700);
  for(const node of CAMPAIGN_NODES.slice(0,stages)){
    const battle=beginBattle(profile,{kind:'expedition',nodeId:node.id,rng:()=>.23,now});
    profile=finishBattle(battle.profile,{encounterId:battle.encounter.id,winner:'player',finalResources:{hp:12,pills:12},now}).profile;
  }
  return hydrateProfile(profile,{now});
}
function supplyFixture(){
  const started=startActivity(fixture(8),{route:'loaner',rng:()=>.23,now});
  return hydrateProfile(finishBattle(started.profile,{encounterId:started.encounter.id,winner:'player',finalResources:{hp:6,pills:3},now}).profile,{now});
}
async function pageFor(seed,width,height){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});contexts.add(context);
  await context.addInitScript(({seed,key,now})=>{
    const NativeDate=Date, fixed=new NativeDate(now).getTime();
    globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
    Math.random=()=>.23;
    if(!localStorage.getItem('expansion-smoke.seeded')){
      localStorage.setItem('expansion-smoke.seeded','true');localStorage.setItem(key,JSON.stringify(seed));
      localStorage.setItem('shanhai.experience.v1',JSON.stringify({sound:false,ambience:.35,effects:.6,motion:'reduce',pace:'fast'}));
    }
  },{seed,key:PROFILE_KEY,now});
  await context.route('**/*',route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==base.origin||!['GET','HEAD'].includes(request.method())){errors.push(`Unexpected request ${url.origin}${url.pathname}`);return route.abort();}
    if(url.pathname==='/api/v1/account')return route.fulfill({contentType:'application/json',body:JSON.stringify({authenticated:false,emailEnabled:false,journeyVersions:[1,2,3]})});
    return route.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${new URL(response.url()).pathname}`);});
  await page.goto(base.href);await page.locator('.game-lobby').waitFor();await viewportFrames(page);
  assert.equal(await raw(page),JSON.stringify(seed));return page;
}
async function shot(page,name){
  await fit(page,name);const file=`expansion-${browserName}-${name}.png`;
  await page.screenshot({path:output+file});screenshots.push(file);
}
async function playRound(page,aim='win'){
  // The test pilot reads its synthetic AI move. Production AI never sees the hidden human bid.
  const move=await page.evaluate(async ({key,aim})=>{
    const {chooseAIMove,resolveRound}=await import('./engine.mjs');
    const saved=JSON.parse(localStorage.getItem(key)),state=saved.match;let best;
    for(const cardId of state.player.hand.filter(id=>!state.player.used.includes(id))){
      const opponent=saved.aiMove||chooseAIMove(state,()=>.23,cardId);
      for(const fury of [false,true])for(let pills=0;pills<=state.player.pills-(fury?3:0);pills++){
        const next=resolveRound(state,{cardId,fury,pills},opponent);
        const score=(next.status==='finished'?next.winner==='player'?1000:next.winner==='draw'?0:-1000:0)+(next.player.hp-next.opponent.hp)*10+next.player.pills*.7-next.opponent.pills*.3;
        if(!best||(aim==='win'?score>best.score:score<best.score))best={cardId,fury,pills,score};
      }
    }
    return best;
  },{key:BATTLE_KEY,aim});
  await click(page,'select',move.cardId);
  if((await action(page,'fury').getAttribute('aria-pressed')==='true')!==move.fury)await click(page,'fury');
  await revealViewportItem(page,page.locator('#pill-slider'));await page.locator('#pill-slider').fill(String(move.pills));
  await click(page,'commit');await page.locator('.battle-reveal[data-phase="complete"]').waitFor();
}
async function finishViaUI(page,aim='win'){
  for(let round=0;round<4;round++){
    await playRound(page,aim);
    const finished=(await action(page,'next-round').textContent()).includes('對局結果');
    await click(page,'next-round');
    if(finished){await page.locator('.match-score').waitFor({state:'attached'});return;}
  }
  throw Error('Match did not finish');
}

async function fit(page, label) {
  await viewportFrames(page);
  const result = await page.evaluate(() => {
    const visible = node => !node.closest('[hidden],[inert]') && getComputedStyle(node).visibility !== 'hidden' && node.getClientRects().length && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
    const name = node => node.dataset.action || node.dataset.viewportAction || node.id || node.className || node.tagName;
    const active = [...document.querySelectorAll('[data-viewport-surface]')].filter(visible);
    const rect = node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const outside = r => r.x < -2 || r.y < -2 || r.right > innerWidth + 2 || r.bottom > innerHeight + 2;
    const boxes = [...new Set([...active.flatMap(surface => [surface, ...surface.querySelectorAll('[data-viewport-module],[data-viewport-list],.viewport-list-frame')]), ...document.querySelectorAll('.modal')])].filter(visible).map(node => ({ name: name(node), rect: rect(node), client: [node.clientWidth, node.clientHeight], scroll: [node.scrollWidth, node.scrollHeight] }));
    const controls = [...new Set([...active.flatMap(surface => [...surface.querySelectorAll('button,input:not([type="hidden"]),select,textarea,a[href]')]), ...document.querySelectorAll('.modal button,.modal input,.modal select,.game-header button,.game-dock button,.cards-hub-tabs button,.scene-resume-strip button')])].filter(visible).map(node => {
      const target = node.matches('input[type="checkbox"],input[type="radio"]') ? node.closest('label') || node : node;
      const r = rect(target), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { name: name(node), rect: r, clipped: outside(r), short: r.height < 43.5 || r.width < 43.5,
        covered: !node.disabled && !(hit === target || target.contains(hit)), font: parseFloat(getComputedStyle(node).fontSize) };
    });
    return { viewport: [innerWidth, innerHeight], document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], scroll: [scrollX, scrollY], surfaces: active.length,
      boxes: boxes.filter(box => outside(box.rect) || box.scroll[0] > box.client[0] + 2 || box.scroll[1] > box.client[1] + 2),
      controls: controls.filter(control => control.clipped || control.short || control.covered), controlsChecked: controls.length };
  });
  result.failed = !result.surfaces || result.document[0] > result.viewport[0] + 1 || result.document[1] > result.viewport[1] + 1 || result.scroll.some(value => value !== 0) || result.boxes.length > 0 || result.controls.length > 0;
  layouts.push({ label, ...result });
  if (audit) return;
  assert(result.surfaces > 0, `${label}: no active viewport surface`);
  assert(result.document[0] <= result.viewport[0] + 1 && result.document[1] <= result.viewport[1] + 1 && result.scroll.every(value => value === 0), `${label}: document scroll ${JSON.stringify(result)}`);
  assert.deepEqual(result.boxes, [], `${label}: active content is clipped/scrolling`);
  assert.deepEqual(result.controls, [], `${label}: actions must be visible, unobstructed and44px`);
}

async function walk(page, label) {
  if (audit) console.log(`AUDIT ${label}`);
  await viewportFrames(page);
  // The app behind a modal is inert; only the dialog's surface is interactive.
  const surface = page.locator('[data-viewport-surface]').filter({ visible: true }).filter({ hasNot: page.locator('[data-viewport-surface]') });
  const candidates = await surface.count();
  let active;
  for (let i = 0; i < candidates; i++) if (!await surface.nth(i).evaluate(node => !!node.closest('[inert]'))) active = surface.nth(i);
  assert(active, `${label}: expected an interactive surface`);
  const tabs = active.locator('[data-viewport-action="module"]');
  const modules = await tabs.evaluateAll(nodes => nodes.map(node => node.dataset.viewportTarget));
  for (const id of modules.length ? modules : [null]) {
    if (id !== null) {
      const tab = active.locator(`[data-viewport-action="module"][data-viewport-target="${id}"]`);
      if (await tab.getAttribute('aria-selected') !== 'true') await tab.click();
      await viewportFrames(page);
    }
    await fit(page, `${label}/${id || 'main'}`);
    const lists = active.locator('[data-viewport-list]').filter({ visible: true });
    for (let i = 0; i < await lists.count(); i++) {
      const list = lists.nth(i), listId = await list.getAttribute('data-viewport-list');
      const all = await list.locator(':scope > [data-viewport-id]').evaluateAll(nodes => nodes.map(node => node.dataset.viewportId));
      assert.equal(all.length, await list.locator(':scope > :not([data-viewport-exclude])').count(), `${label}/${listId}: each paginated child needs a stable identity`);
      assert.equal(new Set(all).size, all.length, `${label}/${listId}: duplicate stable item IDs`);
      const previous = active.locator(`[data-viewport-action="previous"][data-viewport-list-id="${listId}"]`);
      const next = active.locator(`[data-viewport-action="next"][data-viewport-list-id="${listId}"]`);
      for (let n = 0; n < 1000 && await previous.count() && await previous.isEnabled(); n++) { await previous.click(); await viewportFrames(page); }
      const seen = [], receiptUIDs = []; let pages = 0;
      do {
        const visible = await visibleViewportIds(list); seen.push(...visible); pages++;
        receiptUIDs.push(...await list.locator('[data-summary-instance]').filter({ visible: true }).evaluateAll(nodes => nodes.map(node => node.dataset.summaryInstance)));
        assert(visible.length || all.length === 0, `${label}/${listId}: empty page hides remaining content`);
        await fit(page, `${label}/${id || 'main'}/${listId}/${pages}`);
        if (!await next.count() || !await next.isEnabled()) break;
        assert(pages < 1000, 'Pagination did not terminate'); await next.click(); await viewportFrames(page);
      } while (true);
      assert.deepEqual([...seen].sort(), [...all].sort(), `${label}/${listId}: every item must be reachable exactly once`);
      pagination.push({ label, module: id, list: listId, pages, items: seen.length, ...(receiptUIDs.length ? { receiptUIDs } : {}) });
    }
  }
}



await mkdir(output,{recursive:true});
const browser=await engines[browserName].launch({headless:true,...(browserName==='chromium'&&existsSync(chrome)?{executablePath:chrome}:{})});
let failure;
try{
  for(const [width,height] of selectedSizes){
    const tag=`${width}x${height}`,page=await pageFor(fixture(48),width,height),before=await raw(page);
    await go(page,'world');await walk(page,`${tag}/volumes`);
    assert.equal(await page.locator('[data-action="world-select"]').count(),10);
    for(const world of CAMPAIGN_WORLDS){
      await click(page,'world-select',world.id);await walk(page,`${tag}/${world.id}`);
      assert.equal(await page.locator('.map-pin').count(),8);
    }
    await shot(page,`campaign-${tag}`);
    await go(page,'arena');await click(page,'activity-open');await walk(page,`${tag}/activity`);
    await click(page,'activity-route','loaner');await walk(page,`${tag}/loaner`);await shot(page,`activity-${tag}`);await close(page);
    await go(page,'market');await click(page,'expansion-rewards');await walk(page,`${tag}/rewards`);
    await click(page,'expansion-claim','campaign:westward-echo:aa');await walk(page,`${tag}/aa-choice`);await close(page);
    assert.equal(await raw(page),before,'Browsing must not commit a run, reward or resource');
    passed(`${tag}: six volumes, activity routes, grants, tickets,48 mastery rows and AA selector fit and preserve save`);
    await page.context().close();contexts.delete(page.context());

    const supplied=await pageFor(supplyFixture(),width,height);
    await click(supplied,'activity-resume');await walk(supplied,`${tag}/supply`);await shot(supplied,`supply-${tag}`);
    const run=(await read(supplied)).expansion.fireMountain.run;
    await click(supplied,'activity-save-exit');await supplied.reload();await supplied.locator('.game-lobby').waitFor();
    assert.deepEqual((await read(supplied)).expansion.fireMountain.run,run);
    await click(supplied,'activity-resume');await click(supplied,'activity-supply','life');
    const saved=await read(supplied,BATTLE_KEY);assert.equal(saved.match.mode,'activity');
    assert.equal(saved.match.player.hp,12);assert.equal(saved.match.player.pills,8);assert.equal(saved.encounter.activityStage,1);
    await supplied.reload();await supplied.locator('.game-lobby').waitFor();await click(supplied,'resume');
    assert.deepEqual((await read(supplied,BATTLE_KEY)).match,saved.match,'Resume preserves hands/resources');
    passed(`${tag}: supply preview, save/reload, carry resources and current battle resume`);
    await supplied.context().close();contexts.delete(supplied.context());
  }

  const pending=hydrateProfile(beginBattle(fixture(6),{kind:'expedition',nodeId:'echo-1-7',route:'loaner',rng:()=>.23,now}).profile,{now});
  const fallback=await pageFor(pending,390,844), expected=createMatch(getPendingBattleOptions(pending));
  await go(fallback,'world');await click(fallback,'resume');
  assert.deepEqual((await read(fallback,BATTLE_KEY)).match,expected,'Missing battle snapshot reconstructs same saved draw');
  assert.equal((await read(fallback)).pending.instanceIds.length,0);
  const fallbackBefore=(await read(fallback)).instances;
  await finishViaUI(fallback,'lose');assert.deepEqual((await read(fallback)).instances,fallbackBefore,'Chapter loaner never trains owned copies');
  assert(!(await read(fallback)).cleared.includes('echo-1-7'));
  await click(fallback,'next-encounter');await click(fallback,'confirm-start');assert.equal((await read(fallback)).pending.route,'loaner','Retry retains borrowed deck');
  passed('Chapter loaner can retry and reconstruct a missing battle snapshot from its persisted seed without owned-card changes');
  await fallback.context().close();contexts.delete(fallback.context());

  const story=await pageFor(fixture(),1440,900);await go(story,'world');await click(story,'world-select','westward-echo-1');
  await click(story,'map-select','echo-1-1');await click(story,'travel','echo-1-1');await click(story,'confirm-start');
  await finishViaUI(story);let state=await read(story);
  assert(state.cleared.includes('echo-1-1'));assert(state.expansion.grants.some(grant=>grant.id==='campaign:echo-1-1:base'));
  await click(story,'expansion-rewards');await click(story,'expansion-claim','campaign:echo-1-1:base');
  state=await read(story);assert.equal(state.wx01.receipt.kind,'reward');assert.equal(state.wx01.receipt.cards[0].printId,'wx01-001-base');
  const receipt=structuredClone(state.wx01.receipt);await story.reload();await story.locator('.game-lobby').waitFor();await click(story,'pack-resume');
  assert.deepEqual((await read(story)).wx01.receipt,receipt);await click(story,'pack-ack',receipt.id);
  passed('First authored chapter won through UI; exact BASE companion claimed once and recovered receipt preserved');
  await story.context().close();contexts.delete(story.context());

  const rewards=await pageFor(fixture(48),390,844);await go(rewards,'market');await click(rewards,'expansion-rewards');
  const wallet=await read(rewards);await click(rewards,'ticket-open');state=await read(rewards);
  assert.equal(state.coins,wallet.coins);assert.equal(state.expansion.tickets,wallet.expansion.tickets-1);
  assert.equal(state.wx01.opened,wallet.wx01.opened+1);assert.equal(state.wx01.seals,wallet.wx01.seals+1);
  assert.equal(state.wx01.receipt.kind,'ticket');assert.equal(state.wx01.receipt.cards.length,3);
  await rewards.locator('.pack-opening[data-phase="complete"]').waitFor();await click(rewards,'pack-ack',state.wx01.receipt.id);
  await click(rewards,'expansion-rewards');await click(rewards,'expansion-claim','campaign:westward-echo:aa');
  await click(rewards,'expansion-claim-print','wx01-005-aa1');state=await read(rewards);
  assert.equal(state.wx01.receipt.cards[0].printId,'wx01-005-aa1');assert.equal(state.wx01.storyClaimed,false);
  passed('Free ticket uses normal three-card pack andseal; final AA choice is exact and leaves original four-stage reward unclaimed');
  await rewards.context().close();contexts.delete(rewards.context());

  const activity=await pageFor(fixture(),1440,900),owned=structuredClone((await read(activity)).instances);
  await go(activity,'arena');await click(activity,'activity-open');await click(activity,'activity-route','loaner');await click(activity,'activity-start','loaner');
  for(let stage=0;stage<3;stage++){
    await finishViaUI(activity);state=await read(activity);
    assert.equal(state.expansion.fireMountain.lastResult.winner,'player',`loaner test pilot wins stage${stage}`);
    await walk(activity,`loaner-run/result-${stage}`);
    if(stage<2){await click(activity,'next-encounter');const run=state.expansion.fireMountain.run;await click(activity,'activity-supply',run.hp<8||(run.pills===12&&run.hp<12)?'life':run.pills<12?'pills':'none');}
  }
  state=await read(activity);assert.equal(state.expansion.fireMountain.clears,1);assert.equal(state.expansion.fireMountain.run,null);
  assert.equal(state.expansion.tickets,1);assert(state.expansion.grants.some(grant=>grant.id==='fire-mountain:first-clear'));
  assert.deepEqual(state.instances,owned,'Loaner play never grants/trains owned copies');
  await shot(activity,'three-battle-clear');passed('Three real loaner battles cleared through UI with supplies, first-clear BASE and weekly ticket; owned copies unchanged');
  assert.deepEqual(errors,[]);
}catch(error){failure=error;for(const context of contexts)for(const page of context.pages())await page.screenshot({path:output+`expansion-${browserName}-failure.png`}).catch(()=>{});}
finally{
  for(const context of contexts)await context.close();await browser.close();
  await writeFile(output+`expansion-${browserName}.json`,JSON.stringify({browser:browserName,checks,errors,layouts,pagination,screenshots,failure:failure?.stack||null},null,2));
}
if(failure)throw failure;
console.log(`Expansion acceptance: ${checks.length} checks, ${layouts.length} layout checks`);
