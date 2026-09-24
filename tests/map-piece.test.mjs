import test from 'node:test';
import assert from 'node:assert/strict';
import { mapRoute, mapTravelSteps, mapPieceStart } from '../map-piece.mjs';
const nodes=['a','b','c','d'].map(id=>({id}));

test('travel visits every intermediate node in either direction without mutating authored order',()=>{
  assert.deepEqual(mapRoute(nodes,'a','d').map(node=>node.id),['a','b','c','d']);
  assert.deepEqual(mapRoute(nodes,'d','b').map(node=>node.id),['d','c','b']);
  assert.deepEqual(mapRoute(nodes,'b','b'),[nodes[1]]);
  assert.deepEqual(mapRoute(nodes,'missing','a'),[]);
  assert.deepEqual(nodes.map(node=>node.id),['a','b','c','d']);
});
test('mid-edge retargeting visits the junction on reversal and continues the edge when going forward',()=>{
  assert.deepEqual(mapTravelSteps(nodes,'b','a','c').map(node=>node.id),['b','a']);
  assert.deepEqual(mapTravelSteps(nodes,'b','b','c').map(node=>node.id),['b']);
  assert.deepEqual(mapTravelSteps(nodes,'b','d','c').map(node=>node.id),['c','d']);
  assert.deepEqual(mapTravelSteps(nodes,'b','a').map(node=>node.id),['a']);
  assert.deepEqual(mapTravelSteps(nodes,'missing','a','c'),[]);
});
test('a locked preview cannot become the traveller origin and per-world cursor takes priority',()=>{
  const canVisit=node=>['a','b'].includes(node.id);
  assert.equal(mapPieceStart(nodes,{pieceId:'a',location:'b',selectedId:'d',canVisit}).id,'a');
  assert.equal(mapPieceStart(nodes,{pieceId:'d',location:'b',selectedId:'d',canVisit}).id,'b');
  assert.equal(mapPieceStart(nodes,{location:'other-world',selectedId:'d',canVisit}).id,'b');
  assert.equal(mapPieceStart(nodes,{canVisit:()=>false}).id,'a');
});
