import test from 'node:test';
import assert from 'node:assert/strict';
import {FirstRaceHints} from '../src/game/first-race-hints.ts';
const state=(raceId='first',extra={})=>({raceId,phase:'race',animals:[{seat:0,phi:180,seq:-1},{seat:1,phi:180,seq:0}],events:[],...extra});
test('first playable race teaches own walking and successful fire, ignores rival actions, and stays dismissed on rematch',()=>{
 const hints=new FirstRaceHints();hints.observe(state(),null);assert.equal(hints.raceId,'');
 hints.observe(state(),0);assert.ok(hints.visible('first'));assert.equal(hints.walkDone,false);
 hints.observe(state('first',{events:[{type:'shot',seat:1}]}),0);assert.equal(hints.fireDone,false);
 hints.observe(state('first',{animals:[{seat:0,phi:177,seq:1}],events:[{type:'shot',seat:0}]}),0);
 assert.ok(hints.walkDone&&hints.fireDone);
 hints.observe(state('second'),0);assert.equal(hints.visible('second'),false);
 const otherVisit=new FirstRaceHints();otherVisit.observe(state('second'),0);assert.ok(otherVisit.visible('second'));assert.equal(otherVisit.fireDone,false);
});
