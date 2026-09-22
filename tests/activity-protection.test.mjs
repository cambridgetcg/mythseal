import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile } from '../progression.mjs';
import { mintInstance, getInstanceProtection, setInstanceXP, isInstanceInJourney } from '../collection.mjs';
import { getInheritanceTargetReason, getInheritanceMaterials } from '../inheritance.mjs';

test('a frozen activity copy remains protected between battles even when pending is null', () => {
  let profile = createProfile({now:'2026-09-22T12:00:00Z'});
  const target = profile.instances.find(card => card.cardId === 'qingxiao').uid;
  const minted = mintInstance(profile,'qingxiao',{source:'activity-test',now:'2026-09-22T12:00:00Z'});
  profile = minted.profile;
  const material = minted.instance.uid;
  profile.expansion = {...profile.expansion,fireMountain:{...profile.expansion?.fireMountain,run:{instanceIds:[target,material]}}};
  assert.equal(profile.pending,null);
  assert.equal(isInstanceInJourney(profile,material),true);
  assert.match(getInstanceProtection(profile,material),/活動旅程/);
  assert.throws(()=>setInstanceXP(profile,material,80),/活動旅程/);
  assert.match(getInheritanceTargetReason(profile,target),/未完對局/);
  assert.equal(getInheritanceMaterials(profile,target).find(card=>card.instance.uid===material)?.eligible,false);
  profile.expansion.fireMountain.run=null;
  assert.equal(isInstanceInJourney(profile,material),false);
  assert.equal(getInstanceProtection(profile,material),null);
  assert.equal(setInstanceXP(profile,material,80).instances.find(card=>card.uid===material).xp,80);
});
