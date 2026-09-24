/** A transient map cursor. No save, battle, economy or random-number access. */
export function mapRoute(nodes, fromId, toId) {
  const from=nodes.findIndex(node=>node.id===fromId),to=nodes.findIndex(node=>node.id===toId);
  if(from<0||to<0)return [];
  const direction=to>=from?1:-1;
  return Array.from({length:Math.abs(to-from)+1},(_,index)=>nodes[from+index*direction]);
}

export function mapTravelSteps(nodes,fromId,toId,towardId=null) {
  const path=mapRoute(nodes,fromId,toId);
  if(!path.length)return [];
  // Mid-edge reversal first returns to the junction; never cut across a bend.
  return towardId&&path[1]?.id!==towardId?path:path.slice(1);
}

export function mapPieceStart(nodes,{pieceId,location,selectedId,canVisit=()=>true}={}) {
  for(const id of [pieceId,location,selectedId]){
    const node=nodes.find(item=>item.id===id);
    if(node&&canVisit(node))return node;
  }
  return [...nodes].reverse().find(canVisit)||nodes[0];
}

export function mapPieceMarkup(node) {
  return `<div class="map-piece" data-piece-node="${node.id}" style="left:clamp(22px,${node.x}%,calc(100% - 22px));top:clamp(22px,${node.y}%,calc(100% - 22px))" aria-hidden="true"><span class="map-piece-shadow"></span><span class="map-piece-body"><svg class="map-piece-carving" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="16.5"/><path d="M12 15l5-5 4 3m6-1 4-2 5 5M12 34l5 4 4-2m6 1 4 1 5-4"/></svg><span class="map-piece-glyph">旅</span><span class="map-piece-glint"></span></span></div>`;
}

export function createMapTravel({map,nodes,reducedMotion=()=>false,onArrive=()=>{},onStep=()=>{},window=globalThis.window}={}) {
  const piece=map.querySelector('.map-piece'),body=piece.querySelector('.map-piece-body'),shadow=piece.querySelector('.map-piece-shadow');
  const routeLine=map.querySelector('.map-travel-route'),caption=map.parentElement.querySelector('[data-map-caption]');
  const inspect=map.parentElement.querySelector('[data-action="map-inspect"]');
  let current=piece.dataset.pieceNode,target=current,toward=null,serial=0,destroyed=false,animations=[],moving=false;
  const pin=id=>[...map.querySelectorAll('.map-pin')].find(button=>button.dataset.id===id);
  const point=id=>{const button=pin(id);return {left:`${button.offsetLeft}px`,top:`${button.offsetTop}px`};};
  const snap=id=>{const node=nodes.find(item=>item.id===id);piece.style.left=`clamp(22px,${node.x}%,calc(100% - 22px))`;piece.style.top=`clamp(22px,${node.y}%,calc(100% - 22px))`;piece.dataset.pieceNode=id;};
  function stopAnimations(){for(const animation of animations)animation.cancel();animations=[];}
  function rest(){moving=false;toward=null;delete map.dataset.travelling;map.removeAttribute('aria-busy');piece.dataset.pieceNode=current;}
  function mark(id){for(const button of map.querySelectorAll('.map-pin'))button.classList.toggle('has-piece',button.dataset.id===id);}
  function drawRoute(ids){
    const width=map.clientWidth||1,height=map.clientHeight||1;
    routeLine.setAttribute('points',ids.map(id=>{const p=point(id);return `${parseFloat(p.left)/width*100},${parseFloat(p.top)/height*100}`;}).join(' '));
  }
  function finish({silent=false}={}){
    if(!moving||destroyed)return;
    serial++;stopAnimations();current=target;snap(current);mark(current);rest();
    onArrive(current,{silent});
  }
  async function moveTo(id){
    if(destroyed||!pin(id))return false;
    const style=window.getComputedStyle(piece),origin={left:style.left,top:style.top};
    const steps=mapTravelSteps(nodes,current,id,toward);
    const turn=++serial;stopAnimations();Object.assign(piece.style,origin);
    target=id;moving=true;map.dataset.travelling='true';map.setAttribute('aria-busy','true');
    const path=mapRoute(nodes,current,id),name=nodes.find(node=>node.id===id).name;
    if(caption)caption.textContent=`行往 ${name}`;
    if(inspect){inspect.dataset.id=id;inspect.setAttribute('aria-label',`查看${name}，略過移動`);}
    for(const button of map.querySelectorAll('.map-pin')){
      button.classList.toggle('active',button.dataset.id===id);button.setAttribute('aria-pressed',String(button.dataset.id===id));
    }
    drawRoute(path.map(node=>node.id));
    if(reducedMotion()||typeof piece.animate!=='function'||!steps.length){finish();return true;}
    // Short adjacent lifts; far destinations still traverse every waypoint.
    const duration=Math.max(125,Math.min(285,1100/steps.length));
    try{
      for(const node of steps){
        if(destroyed||turn!==serial)return false;
        mark(null);toward=node.id;
        const destination=point(node.id);
        const travel=piece.animate([{},destination],{duration,easing:'cubic-bezier(.35,0,.25,1)',fill:'forwards'});
        const lift=body.animate([{transform:'translateY(0) rotate(-8deg)'},{transform:'translateY(-9px) rotate(-4deg)',offset:.45},{transform:'translateY(1px) rotate(-8deg)',offset:.9},{transform:'translateY(0) rotate(-8deg)'}],{duration,easing:'ease-in-out'});
        const shade=shadow.animate([{opacity:.6,transform:'scale(1)'},{opacity:.28,transform:'scale(.8)',offset:.45},{opacity:.6,transform:'scale(1)'}],{duration});
        animations=[travel,lift,shade];await travel.finished;
        if(destroyed||turn!==serial)return false;
        Object.assign(piece.style,destination);stopAnimations();current=node.id;toward=null;piece.dataset.pieceNode=current;mark(current);
        onStep(current);
      }
      if(turn===serial&&!destroyed){rest();snap(current);onArrive(current,{silent:false});}
      return true;
    }catch(error){
      // Cancellation is expected when input, the view or motion preferences change.
      if(turn===serial&&!destroyed)finish({silent:true});
      return false;
    }
  }
  const resize=()=>finish({silent:true});
  const visibility=()=>{if(window.document.hidden)finish({silent:true});};
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const preferences=()=>{if(reducedMotion())finish({silent:true});};
  const observer=new window.MutationObserver(()=>{if(moving&&map.closest('[hidden],[inert]'))finish({silent:true});});
  observer.observe(map.closest('[data-viewport-module]'),{attributes:true,attributeFilter:['hidden','inert']});
  window.addEventListener('resize',resize);window.document.addEventListener('visibilitychange',visibility);media?.addEventListener('change',preferences);
  mark(current);
  return {moveTo,finish,syncPreferences:preferences,getState:()=>({current,target,moving}),destroy(){destroyed=true;serial++;stopAnimations();observer.disconnect();window.removeEventListener('resize',resize);window.document.removeEventListener('visibilitychange',visibility);media?.removeEventListener('change',preferences);}};
}
