/** Isolated prototype checks; no personal browser, real save or external API access. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createProfile,hydrateProfile,NODES,beginBattle,finishBattle,PROFILE_KEY } from '../progression.mjs';
import { CAMPAIGN_NODES } from '../campaign-content.mjs';
import { BATTLE_KEY } from '../profile-store.mjs';
import { clickViewportItem,revealViewportItem,viewportFrames } from './viewport-browser-helpers.mjs';

const browserName=process.env.BROWSER||'chromium';
const output=fileURLToPath(new URL('../test-results/',import.meta.url));
if(browserName==='webkit'&&!process.env.PLAYWRIGHT_BROWSERS_PATH)process.env.PLAYWRIGHT_BROWSERS_PATH=output+'webkit-runtime';
const engines=await import('playwright'),base=new URL(process.env.GAME_URL||'http://127.0.0.1:4177');
assert(['localhost','127.0.0.1','[::1]'].includes(base.hostname));
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',now='2026-09-23T12:00:00.000Z';
const sizes=[[1440,900],[1280,720],[390,844],[360,740],[360,640],[844,390]];
const checks=[],errors=[],screenshots=[],contexts=new Set();let failure;
const action=(page,name,id)=>page.locator(`[data-action="${name}"]:not(#app[inert] *)${id?`[data-id="${id}"]`:''}`).first();
const click=(page,name,id)=>clickViewportItem(page,action(page,name,id));
const go=(page,name)=>clickViewportItem(page,page.locator(`.game-dock [data-action="${name}"]`));
const bytes=page=>page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),[PROFILE_KEY,BATTLE_KEY]);
const passed=text=>{checks.push(text);console.log('PASS '+text);};
function fixture(){
  let p=createProfile({now});p.cleared=NODES.filter(n=>!n.campaign).map(n=>n.id);
  for(const node of CAMPAIGN_NODES.slice(0,8)){
    const b=beginBattle(p,{kind:'expedition',nodeId:node.id,rng:()=>.23,now});
    p=finishBattle(b.profile,{encounterId:b.encounter.id,winner:'player',finalResources:{hp:12,pills:12},now}).profile;
  }
  p.location='mist-gate';return hydrateProfile(p,{now});
}
async function pageFor(seed,size,{motion='reduce'}={}){
  const context=await browser.newContext({viewport:{width:size[0],height:size[1]},reducedMotion:'no-preference'});contexts.add(context);
  await context.addInitScript(({seed,key,now,motion})=>{
    const NativeDate=Date,fixed=new NativeDate(now).getTime();
    globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
    globalThis.mapRandomCalls=0;Math.random=()=>{mapRandomCalls++;return .23;};
    if(!localStorage.getItem('map-fixture')){localStorage.setItem('map-fixture','1');localStorage.setItem(key,JSON.stringify(seed));localStorage.setItem('shanhai.experience.v1',JSON.stringify({sound:false,motion,pace:'fast'}));}
  },{seed,key:PROFILE_KEY,now,motion});
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin!==base.origin||url.pathname.startsWith('/api/')){errors.push(`Unexpected request ${url.origin}${url.pathname}`);return route.abort();}
    return route.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(base.href);await page.locator('.game-lobby').waitFor();await go(page,'world');await viewportFrames(page);return page;
}
async function arrived(page,id){
  await page.waitForFunction(id=>document.querySelector('.map-piece')?.dataset.pieceNode===id&&!document.querySelector('.world-map')?.hasAttribute('data-travelling'),id);
  await viewportFrames(page);
}
async function fit(page,label){
  await viewportFrames(page);
  const result=await page.evaluate(()=>{
    const visible=n=>!n.closest('[hidden],[inert]')&&n.getClientRects().length&&n.getBoundingClientRect().width>0;
    const outside=r=>r.left< -2||r.top< -2||r.right>innerWidth+2||r.bottom>innerHeight+2;
    const containers=[...document.querySelectorAll('[data-viewport-surface],[data-viewport-module],[data-viewport-list],.world-map,.viewport-list-frame')].filter(visible);
    const overflow=containers.filter(n=>outside(n.getBoundingClientRect())||n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2).map(n=>n.dataset.viewportModule||n.className);
    const controls=[...document.querySelectorAll('button')].filter(visible).filter(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return outside(r)||r.width<43.5||r.height<43.5||!n.disabled&&!(hit===n||n.contains(hit));}).map(n=>n.dataset.action||n.dataset.viewportTarget||n.textContent);
    return {overflow,controls,width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,viewport:[innerWidth,innerHeight]};
  });
  assert.deepEqual(result.overflow,[],label+' overflow');assert.deepEqual(result.controls,[],label+' controls');
  assert(result.width<=result.viewport[0]+1&&result.height<=result.viewport[1]+1,label+' document');
  const piece=page.locator('.map-piece');
  if(await piece.isVisible()){
    const aligned=await piece.evaluate(n=>{const b=[...document.querySelectorAll('.map-pin')].find(b=>b.dataset.id===n.dataset.pieceNode),p=n.getBoundingClientRect(),r=b.getBoundingClientRect();return Math.abs(p.x+p.width/2-r.x-r.width/2)<1&&Math.abs(p.y+p.height/2-r.y-r.height/2)<1;});assert(aligned,label+' pawn centres on node');
  }
}
async function shot(page,label){await fit(page,label);const file=`map-piece-${browserName}-${label}.png`;await page.screenshot({path:output+file});screenshots.push(file);}
async function world(page,id){await click(page,'world-select',id);await viewportFrames(page);}
async function release(page){contexts.delete(page.context());await page.context().close();}

await mkdir(output,{recursive:true});
const browser=await engines[browserName].launch({headless:true,...(browserName==='chromium'&&existsSync(chrome)?{executablePath:chrome}:{})});
try{
  for(const size of sizes){
    const tag=size.join('x'),page=await pageFor(fixture(),size),before=await bytes(page),random=await page.evaluate(()=>mapRandomCalls);
    for(const [id,target]of [['shanhai','sea-throne'],['westward','west-spirit-mountain'],['westward-echo-1','echo-1-3']]){
      await world(page,id);await fit(page,tag+'/'+id);await click(page,'map-select',target);await arrived(page,target);
      assert(await page.locator('.world-map').isVisible(),'arrival keeps map visible');await fit(page,tag+'/'+id+'/arrived');
      await shot(page,`${tag}-${id}`);
      await click(page,'map-inspect',target);assert(await action(page,'travel',target).isVisible());await fit(page,tag+'/chapter');
      await revealViewportItem(page,action(page,'story-stage',target));await fit(page,tag+'/route-list');
    }
    assert.deepEqual(await bytes(page),before);assert.equal(await page.evaluate(()=>mapRandomCalls),random);
    passed(`${tag}: 6/4/8-node maps, piece alignment, chapters and paged route fit; navigation changes no save or game RNG`);await release(page);
  }
  const moving=await pageFor(fixture(),[1440,900],{motion:'system'}),before=await bytes(moving);
  await click(moving,'map-select','sea-throne');assert.equal(await moving.locator('.world-map').getAttribute('data-travelling'),'true');
  const source=await moving.locator('.map-piece').evaluate(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y}));
  await moving.waitForTimeout(70);
  const midway=await moving.locator('.map-piece').evaluate(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y}));
  assert(Math.hypot(midway.x-source.x,midway.y-source.y)>1,'animation visibly moves');
  await click(moving,'map-select','ember-pass');await arrived(moving,'ember-pass');await moving.waitForTimeout(350);assert.equal(await moving.locator('.map-piece').getAttribute('data-piece-node'),'ember-pass');
  // Reverse halfway along a bent route: the next landing must be the junction,
  // not a diagonal shortcut to the destination behind it.
  await click(moving,'map-select','sea-throne');
  await moving.locator('.map-piece').evaluate(piece=>{const travel=piece.getAnimations()[0];travel.pause();travel.currentTime=travel.effect.getTiming().duration/2;});
  await viewportFrames(moving);await click(moving,'map-select','mist-gate');
  const reversal=await moving.locator('.map-piece').evaluate(piece=>{
    const junction=document.querySelector('.map-pin[data-id="ember-pass"]'),end=piece.getAnimations()[0].effect.getKeyframes().at(-1);
    return {next:[parseFloat(end.left),parseFloat(end.top)],junction:[junction.offsetLeft,junction.offsetTop]};
  });
  assert.deepEqual(reversal.next,reversal.junction,'reverse travel returns through the last junction');await arrived(moving,'mist-gate');
  await click(moving,'map-select','sea-throne');await moving.setViewportSize({width:390,height:844});await arrived(moving,'sea-throne');await fit(moving,'resize-during-move');
  await click(moving,'map-select','mist-gate');await moving.emulateMedia({reducedMotion:'reduce'});await arrived(moving,'mist-gate');
  await moving.emulateMedia({reducedMotion:'no-preference'});await click(moving,'map-select','sea-throne');await go(moving,'home');await moving.waitForTimeout(1300);
  assert(await moving.locator('.game-lobby').isVisible());assert.equal(await moving.locator('.map-piece').count(),0);
  await go(moving,'world');await arrived(moving,'sea-throne');
  await click(moving,'map-select','mist-gate');await world(moving,'westward');await moving.waitForTimeout(1200);assert.equal(await moving.locator('.world-map').getAttribute('data-world'),'westward');
  assert.equal(await moving.evaluate(()=>document.activeElement?.dataset.viewportTarget),'map','world change transfers focus to the map tab');
  await world(moving,'shanhai');await arrived(moving,'mist-gate');
  // Native keyboard activation, including opening the arrived chapter with a second press.
  await action(moving,'map-select','jade-forest').focus();await moving.keyboard.press('Enter');await arrived(moving,'jade-forest');
  await action(moving,'map-select','jade-forest').focus();await moving.keyboard.press('Space');assert(await action(moving,'travel','jade-forest').isVisible());
  await click(moving,'travel','jade-forest');await moving.locator('.encounter-prep').waitFor();await moving.keyboard.press('Escape');
  await revealViewportItem(moving,action(moving,'story-stage','sea-throne'));await action(moving,'story-stage','sea-throne').focus();await moving.keyboard.press('Enter');
  const focusedPin=()=>moving.evaluate(()=>({action:document.activeElement?.dataset.action,id:document.activeElement?.dataset.id,hidden:!!document.activeElement?.closest('[hidden],[inert]')}));
  assert.deepEqual(await focusedPin(),{action:'map-select',id:'sea-throne',hidden:false});await arrived(moving,'sea-throne');
  assert.deepEqual(await focusedPin(),{action:'map-select',id:'sea-throne',hidden:false},'arrival retains keyboard focus');
  assert.deepEqual(await bytes(moving),before);passed('Visible lift, bent-route reversal, rapid retarget, resize, OS reduce-motion, leaving, world switch, keyboard focus and preparation cancellation preserve state');await release(moving);
  const locked=await pageFor(createProfile({now}),[360,640]),lockedBefore=await bytes(locked);
  await click(locked,'map-select','jade-forest');assert(await action(locked,'travel','jade-forest').isDisabled());
  await revealViewportItem(locked,action(locked,'map-select','mist-gate'));assert.equal(await locked.locator('.map-piece').getAttribute('data-piece-node'),'mist-gate');
  assert.deepEqual(await bytes(locked),lockedBefore);passed('Locked chapter remains inspectable and cannot move the pawn, unlock progress or start a battle');await release(locked);
  assert.deepEqual(errors,[]);
}catch(error){failure=error;for(const context of contexts)for(const page of context.pages())await page.screenshot({path:output+`map-piece-${browserName}-failure.png`}).catch(()=>{});}
finally{for(const context of contexts)await context.close();await browser.close();await writeFile(output+`map-piece-${browserName}.json`,JSON.stringify({checks,errors,screenshots,failure:failure?.stack||null},null,2));}
if(failure)throw failure;
