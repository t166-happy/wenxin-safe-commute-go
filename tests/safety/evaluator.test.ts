import {describe,it,expect} from 'vitest';
import {SafetyRuleEvaluator} from '../../src/safety/evaluator';
import {rules} from '../../src/safety/rules';
import {chainCollision,chainWalls,gateWall,intersects} from '../../src/safety/checkpoints';
import {scenarios,validateScenario} from '../../src/data/scenarios';
import {Journey} from '../../src/game/journey';
import {Exploration,exploreSites,nearbySite} from '../../src/game/explore';
import {campusParkingArea,campusWalls,crossings,crossesVehicleGate,frontRoad,hitsCampusWall,onPedestrianSpace,onMarkedCrosswalk} from '../../src/game/streetMap';

const evaluator=new SafetyRuleEvaluator();
describe('Fail closed: every prerequisite is necessary',()=>{
  for(const [id,rule]of Object.entries(rules)){
    it(`${id}: all required facts permit`,()=>expect(evaluator.evaluate(id,Object.fromEntries(rule.predicates.map(p=>[p,true]))).allowed).toBe(true));
    for(const predicate of rule.predicates)it(`${id}: missing/false ${predicate} blocks with corrective metadata`,()=>{
      const all=Object.fromEntries(rule.predicates.map(p=>[p,true]));
      for(const value of [false,undefined]){const result=evaluator.evaluate(id,{...all,[predicate]:value});expect(result.allowed).toBe(false);expect(result.message.length).toBeGreaterThan(8);expect(result.hazardId).toBeTruthy();expect(result.checkpointId).toBeTruthy();expect(result.explanationId).toBeTruthy();expect(result.correctiveActionId).toBeTruthy();}
    });
  }
  it('unknown rules never grant passage',()=>expect(evaluator.evaluate('unknown',{}).allowed).toBe(false));
});
describe('V2.4 continuous chain, corners, endpoint closure and swept collisions',()=>{
  for(let z=-13.7;z< -1.2;z+=.18)if(z< -6.52||z> -3.48){it(`no cone-gap shortcut at ${z.toFixed(2)}`,()=>{expect(chainCollision({x:-1,z},{x:3,z},true)).toBe(true);});}
  it('closed gate blocks; authorized gate has a real controlled gap',()=>{expect(chainCollision({x:-2,z:-5},{x:4,z:-5},false)).toBe(true);expect(chainCollision({x:-2,z:-5},{x:4,z:-5},true)).toBe(false);});
  it('diagonal high-delta tunneling fails',()=>{expect(chainCollision({x:-5,z:-12},{x:8,z:-7},true)).toBe(true);});
  for(const box of [...chainWalls,gateWall])it(`walls block endpoints ${box.minZ}`,()=>{expect(intersects({x:box.minX-1,z:box.minZ},{x:box.maxX+1,z:box.minZ},box)).toBe(true);});
  it('end caps block bypasses without closing the tree path or the vehicle entrance',()=>{expect(chainCollision({x:0,z:-15},{x:0,z:-12},true)).toBe(true);expect(chainCollision({x:0,z:1},{x:0,z:-2},true)).toBe(true);expect(chainCollision({x:6,z:1},{x:6,z:-2},true)).toBe(false);expect(chainCollision({x:-6,z:2},{x:-6,z:-2},true)).toBe(false);});
});
describe('V2.4 scene data validation',()=>{
  it('exterior school bus and courtyard shuttle never share stop coordinates',()=>{const a=scenarios.find(s=>s.mode==='school_bus')!,b=scenarios.find(s=>s.mode==='after_school_shuttle')!;expect(a.stop).not.toEqual(b.stop);expect(()=>validateScenario({...a,stop:{x:6,z:-5}})).toThrow();expect(()=>validateScenario({...b,stop:{x:6,z:9}})).toThrow();});
  it('school bus and both road-edge car pickup zones remain separate from pedestrians',()=>{const school=scenarios.find(s=>s.mode==='school_bus')!,cars=scenarios.filter(s=>s.mode==='parent');expect(cars).toHaveLength(2);expect(cars.map(s=>s.stop!.x).sort((a,b)=>a-b)).toEqual([-16,12]);for(const car of cars){expect(car.stop!.z).toBe(6);expect(onPedestrianSpace(car.stop!)).toBe(false);expect(Math.hypot(school.stop!.x-car.stop!.x,school.stop!.z-car.stop!.z)).toBeGreaterThan(10);expect(()=>validateScenario({...car,stop:school.stop})).toThrow();}});
  it('each parent car starts seated, drops off on its own side, then reaches the sidewalk',()=>{for(const car of scenarios.filter(s=>s.mode==='parent')){const j=new Journey(car);expect(j.steps.slice(0,7).map(s=>s.id)).toEqual(['park','unbuckle','rear','side','alight','clearCar','walkToCrossing']);expect(j.steps.map(s=>s.id)).not.toContain('queue');expect(j.steps.map(s=>s.id)).not.toContain('board');expect(j.inside).toBe(true);expect(j.facts.buckled).toBe(true);j.update(5);for(let i=0;i<5;i++)expect(j.attempt(j.current.action),`${car.id}/${j.current.id}`).toBe(true);expect(j.position).toEqual({x:car.stop!.x-2.4,z:10.8});j.position={...j.current.target};expect(j.attempt('clearCar')).toBe(true);expect(j.facts.doorClosed).toBe(true);expect(j.departAt).not.toBeNull();}});
  it('visible car approach slows before stopping while the safety gate stays closed',()=>{const car=scenarios.find(s=>s.id==='parent')!;const j=new Journey(car);const start=j.vehiclePosition!;j.update(2.5);const halfway=j.vehiclePosition!;expect(Math.abs(halfway.x-car.stop!.x)).toBeLessThan(Math.abs(start.x-car.stop!.x)/2);expect(j.facts.vehicleStopped).toBe(false);expect(j.attempt('park')).toBe(false);expect(j.blocked?.ruleId).toBe('parentPark');j.retry();j.update(2.5);expect(j.vehiclePosition).toEqual(car.stop);expect(j.facts.vehicleStopped).toBe(true);});
  it('motorcycle pickup is at separate road-side main and Fuxing North side-gate sites',()=>{const bikes=scenarios.filter(s=>s.mode==='scooter');expect(bikes.map(s=>s.id)).toEqual(['scooter_main','scooter_side']);expect(bikes[0].stop).toEqual({x:-1,z:6.5});expect(onPedestrianSpace(bikes[0].stop!)).toBe(false);expect(bikes[1].stop).toEqual({x:-38,z:-14});expect(()=>validateScenario({...bikes[0],stop:{x:-1,z:9}})).toThrow();expect(()=>validateScenario({...bikes[1],stop:{x:6,z:-5}})).toThrow();});
  it('the MRT journey requires walking to a station, entering, tapping, boarding and exiting',()=>{const mrt=scenarios.find(s=>s.mode==='mrt')!;const ids=new Journey(mrt).steps.map(s=>s.id);expect(ids.slice(0,5)).toEqual(['assembly','station','fareGate','identify','queue']);expect(ids).toContain('platform');expect(ids.indexOf('stationExit')).toBeGreaterThan(ids.indexOf('alight'));expect(ids.indexOf('walkToSchool')).toBeGreaterThan(ids.indexOf('stationExit'));});
  it('one map has all practice sites but blocks road and chain shortcuts',()=>{expect(exploreSites).toHaveLength(scenarios.length);const e=new Exploration();expect(nearbySite(e.position)?.scenario.id).toBe('walk');expect(e.move(1,0)).toBe(true);e.position={x:6,z:8};let blocked='';e.onResult=r=>{blocked=r.ruleId;};expect(e.move(0,-2)).toBe(false);expect(blocked).toBe('vehicleLane');e.position={x:3,z:-5};expect(e.move(-5,0)).toBe(false);expect(blocked).toBe('barrier');});
  it('the Fuxing North side approach begins in another block and has its own marked crossing',()=>{expect(crossings).toHaveLength(2);expect(crossings[1]).toMatchObject({x:-38,z:-8});const e=new Exploration();e.position={x:-43,z:-24};expect(nearbySite(e.position)?.scenario.id).toBe('walk_side');for(let z=-23;z<=-10;z++){expect(onPedestrianSpace({x:-43,z})).toBe(true);expect(e.move(0,1)).toBe(true);}expect(onMarkedCrosswalk({x:-38,z:-8})).toBe(true);expect(onMarkedCrosswalk({x:-38,z:4.5})).toBe(false);expect(e.move(5,0)).toBe(false);});
  it('both school crossings go directly to the gate after pre-crossing safety checks',()=>{for(const id of ['walk','walk_side','guard','school_bus_gate_exterior','parent','parent_east','scooter_main']){const scenario=scenarios.find(s=>s.id===id)!;const j=new Journey(scenario);const ids=j.steps.map(step=>step.id);expect(ids.slice(ids.indexOf('stop'),ids.indexOf('destination')+1),id).toEqual(['stop','left','right','wait','cross','destination']);expect(ids).not.toContain('guard');}});
  it('side entrance requires its own crossing safety checks and ends on the campus side',()=>{const side=scenarios.find(s=>s.id==='walk_side')!;const j=new Journey(side);expect(j.steps.map(step=>step.id)).toEqual(['approachSide','stop','left','right','wait','cross','destination']);expect(j.steps[0].target).toEqual({x:-43,z:-10});expect(j.steps.at(-1)?.target).toEqual({x:-27,z:-8});j.position={x:-41,z:-8};expect(j.move(2,0)).toBe(false);expect(j.blocked?.ruleId).toBe('cross');});
  it('four perimeter sides block shortcuts while the small main and side gates stay open',()=>{
    expect(hitsCampusWall({x:-14,z:-2},{x:-14,z:0})).toBe(true);
    expect(hitsCampusWall({x:6,z:-2},{x:6,z:0})).toBe(false);
    expect(crossesVehicleGate({x:-6,z:-2},{x:-6,z:0})).toBe(true);
    expect(campusWalls[0].maxZ).toBeLessThan(frontRoad.minZ-2);
    expect(onPedestrianSpace({x:6,z:0})).toBe(true);
    expect(hitsCampusWall({x:-29,z:-8},{x:-27,z:-8})).toBe(false);
    expect(hitsCampusWall({x:-29,z:-12},{x:-27,z:-12})).toBe(true);
    expect(hitsCampusWall({x:11,z:-13},{x:13,z:-13})).toBe(true);
    expect(hitsCampusWall({x:0,z:-28},{x:0,z:-27})).toBe(true);
  });
  it('side-gate pedestrians stay out of the adjacent parking area',()=>{const e=new Exploration();e.position={x:-27,z:-8};let blocked='';e.onResult=r=>{blocked=r.ruleId;};expect(e.move(3,0)).toBe(false);expect(blocked).toBe('vehicleLane');expect(e.position).toEqual({x:-27,z:-8});expect(campusParkingArea.minX).toBeGreaterThan(-28);});
  it('motorcycle arrival waits its turn and cannot alight while moving',()=>{for(const bike of scenarios.filter(s=>s.mode==='scooter')){const j=new Journey(bike);expect(j.steps.slice(0,4).map(s=>s.id)).toEqual(['arrival','rear','alight','clearScooter']);expect(j.steps.map(s=>s.id)).not.toContain('board');expect(j.inside).toBe(true);expect(j.facts.helmeted).toBe(true);expect(j.attempt('alight')).toBe(false);expect(j.blocked?.ruleId).toBe('scooterAlight');j.retry();j.update(2);expect(j.attempt('arrival')).toBe(false);expect(j.blocked?.ruleId).toBe('scooterArrival');j.retry();j.update(3);expect(j.attempt('arrival')).toBe(true);expect(j.facts.motorcycleTurn).toBe(true);expect(j.attempt('rear')).toBe(true);expect(j.attempt('alight')).toBe(true);expect(j.inside).toBe(false);}});
  it('rear traffic blocks parent door opening until the safe observation window',()=>{const car=scenarios.find(s=>s.id==='parent')!;const j=new Journey(car);j.update(5);expect(j.attempt('park')).toBe(true);expect(j.attempt('unbuckle')).toBe(true);j.update(14.2);expect(j.facts.rearTrafficClear).toBe(false);expect(j.attempt('rear')).toBe(false);expect(j.blocked?.ruleId).toBe('parentRear');j.retry();j.update(5);expect(j.facts.rearTrafficClear).toBe(true);expect(j.attempt('rear')).toBe(true);expect(j.attempt('side')).toBe(true);expect(j.attempt('alight')).toBe(true);});
});
describe.each(scenarios)('$label state machine',s=>{
  for(const reverse of [false,true])it(`has actionable spatial tasks in ${reverse?'return':'arrival'} direction`,()=>{const j=new Journey(s,reverse);expect(j.steps.length).toBeGreaterThan(4);expect(j.steps.every(s=>Number.isFinite(s.target.x)&&s.action&&s.verb)).toBe(true);});
  it('cannot interact remotely',()=>{const j=new Journey(s);j.position={x:-12,z:14};expect(j.attempt(j.current.action)).toBe(false);expect(j.index).toBe(0);expect(j.blocked?.ruleId).toBe('approach');});
  it('unsafe boarding cannot advance',()=>{const j=new Journey(s);expect(j.attempt('board')).toBe(false);expect(j.index).toBe(0);expect(j.blocked?.allowed).toBe(false);});
  it('unsafe road entry is blocked',()=>{const j=new Journey(s);j.position={x:6,z:8};expect(j.move(0,-2)).toBe(false);expect(j.position.z).toBe(8);expect(j.blocked?.ruleId).toBe('cross');});
  it('courtesy never replaces a necessary safety operation',()=>{const j=new Journey(s);j.update(6);const before=j.index;j.attempt('greet');expect(j.index).toBe(before);});
  it('retry returns to checkpoint and keeps failure event',()=>{const j=new Journey(s);const log:string[]=[];j.onResult=r=>log.push(r.ruleId);j.attempt('board');j.retry();expect(j.position).toEqual(j.checkpoint);expect(j.blocked).toBe(null);expect(log).toContain(s.mode==='scooter'?'scooterBoard':'board');});
  it('single-button alternative and reduced-motion do not skip prerequisites',()=>{const j=new Journey(s);j.position={...j.current.target};j.stoppedFor=1;const index=j.index;if(['parent','scooter'].includes(s.mode)){expect(j.attempt(j.current.action)).toBe(false);expect(j.index).toBe(index);j.retry();j.update(6);}expect(j.attempt(j.current.action),`${s.id}: ${JSON.stringify(j.facts)}`).toBe(true);expect(j.index).toBe(index+1);});
  for(const actionIndex of [0,1,2])it(`correct spatial action ${actionIndex+1} advances only the corresponding stage`,()=>{
    const j=new Journey(s);j.update(6);
    for(let index=0;index<=actionIndex;index++){j.position={...j.current.target};j.update(.5);expect(j.attempt(j.current.action)).toBe(true);}
    expect(j.index).toBe(actionIndex+1);
  });
  it('complete valid journey satisfies every state gate including fresh arrival clearance',()=>{
    const j=new Journey(s);let count=0;
    while(!j.complete&&count++<32){j.update(6);j.position={...j.current.target};if(j.current.rule==='cross')while(!j.yielded)j.update(1);j.update(.4);if(j.current.rule==='cross'&&!j.yielded)j.update(12);if(['parent','scooter'].includes(s.mode)&&['rear','side','alight'].includes(j.current.id)){let waits=0;while(!j.facts.rearTrafficClear&&waits++<21)j.update(1);}expect(j.attempt(j.current.action),`${s.id} / ${j.current?.id}`).toBe(true);}
    expect(j.complete).toBe(true);
  });
});
describe('vehicle and gate state transitions',()=>{
  const shuttle=scenarios.find(s=>s.mode==='after_school_shuttle')!;
  function at(j:Journey){j.position={...j.current.target};j.update(.4);return j.attempt(j.current.action);}
  it('stopped alone never opens gate; queue, correct vehicle and adult all required',()=>{const j=new Journey(shuttle);j.update(6);expect(j.gateOpen).toBe(false);expect(at(j)).toBe(true);expect(at(j)).toBe(true);expect(at(j)).toBe(true);expect(j.gateOpen).toBe(false);j.update(2);expect(at(j)).toBe(true);expect(j.gateOpen).toBe(true);j.facts.crossingConflictFree=false;expect(j.gateOpen).toBe(false);});
  it('moving vehicle prevents boarding and adult clearance',()=>{const j=new Journey(shuttle);at(j);at(j);at(j);expect(at(j)).toBe(false);expect(j.gateOpen).toBe(false);});
  it('wrong seat fails and departure is blocked without belt',()=>{const j=new Journey(shuttle);j.update(6);at(j);at(j);at(j);j.update(2);at(j);at(j);expect(j.inside).toBe(true);j.position={...j.current.target};expect(j.attempt('seat',{correctSeat:false})).toBe(false);j.retry();expect(at(j)).toBe(true);expect(j.evaluate('depart').allowed).toBe(false);});
  it('cannot unbuckle, leave seat or alight during motion',()=>{const j=new Journey(shuttle);j.update(6);at(j);at(j);at(j);j.update(2);at(j);at(j);at(j);at(j);at(j);expect(j.facts.vehicleStopped).toBe(false);expect(j.attempt('unbuckle')).toBe(false);j.retry();expect(j.attempt('alight')).toBe(false);j.retry();const pos={...j.position};expect(j.move(1,0)).toBe(false);expect(j.position).toEqual(pos);});
  it('may seek attendant help while seated and buckled in motion without distracting driver',()=>{const j=new Journey(shuttle);j.update(6);at(j);at(j);at(j);j.update(2);at(j);at(j);at(j);at(j);at(j);const stage=j.index;expect(j.facts.vehicleStopped).toBe(false);expect(j.attempt('help')).toBe(true);expect(j.index).toBe(stage);expect(j.attempt('greet')).toBe(false);});
  it('can complete queue, board, seat, belt, ride and stopped alighting',()=>{const j=new Journey(shuttle);j.update(6);let counter=0;while(!j.complete&&counter++<30){j.update(6);expect(at(j),j.current?.id).toBe(true);}expect(j.complete).toBe(true);});
  it('school bus spawn route stays exterior throughout approach',()=>{const s=scenarios.find(s=>s.mode==='school_bus')!;const j=new Journey(s);for(let i=0;i<=100;i++){j.update(.1);expect(j.vehiclePosition!.z).toBeGreaterThanOrEqual(9);}});
  it('side-gate scooter approaches without driving across its pedestrian crossing',()=>{const j=new Journey(scenarios.find(s=>s.id==='scooter_side')!);for(let i=0;i<50;i++){expect(j.vehiclePosition!.x).toBe(-38);expect(j.vehiclePosition!.z).toBeLessThanOrEqual(-14);j.update(.1);}j.update(.01);expect(j.facts.vehicleStopped).toBe(true);});
  it('students cannot wait in the exterior vehicle approach path before the bus arrives',()=>{const j=new Journey(scenarios.find(s=>s.mode==='school_bus')!);j.position={x:28,z:11};expect(j.move(0,-2)).toBe(false);expect(j.blocked?.ruleId).toBe('vehicleLane');expect(j.position.z).toBe(11);});
  it('shuttle enters from controlled vehicle entry and never grants students a driving lane shortcut',()=>{const j=new Journey(shuttle);expect(j.vehiclePosition!.z).toBe(2);j.position={x:-2,z:-5};j.facts={...j.facts,vehicleStopped:true,vehicleCorrect:true,adultCleared:true,studentTurn:true,crossingConflictFree:true};j.index=j.steps.findIndex(s=>s.id==='board');expect(j.move(0,-2)).toBe(false);expect(j.blocked?.ruleId).toBe('barrier');});
});
