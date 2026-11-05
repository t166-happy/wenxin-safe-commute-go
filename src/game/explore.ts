import {chainCollision,intersects,sideGateChainCollision,type Point} from '../safety/checkpoints';
import {SafetyRuleEvaluator,type Evaluation} from '../safety/evaluator';
import {scenarios,type Scenario} from '../data/scenarios';
import {campusParkingArea,crossesVehicleGate,frontRoad,hitsCampusWall,onPedestrianSpace,otherRoads} from './streetMap';

export interface ExploreSite {scenario:Scenario;entry:Point;area:string}
const entries:Record<string,{entry:Point;area:string}>={
  walk:{entry:{x:6,z:10.5},area:'校門外行人空間'},
  walk_side:{entry:{x:-43,z:-24},area:'復興北路外側街區・側門步行示意'},
  after_school_shuttle_courtyard:{entry:{x:5,z:-9},area:'校內接駁廣場'},
  school_bus_gate_exterior:{entry:{x:28,z:11},area:'校門東側校車示意區'},
  mrt:{entry:{x:53,z:11},area:'A8 方向捷運示意站'},
  bus:{entry:{x:16,z:11},area:'公車示意站'},
  parent:{entry:{x:-19,z:11},area:'正門西側汽車接送・黃線示意區'},
  parent_east:{entry:{x:10,z:11},area:'正門東側汽車接送・黃線示意區'},
  scooter_main:{entry:{x:-4,z:11},area:'正門口機車接送示意區'},
  scooter_side:{entry:{x:-33,z:-18},area:'復興北路側門機車接送示意區'},
  transfer:{entry:{x:17,z:11},area:'公車乘車示意站'},
  human:{entry:{x:7,z:-8},area:'人本交通觀察點'},
};
export const exploreSites:ExploreSite[]=scenarios.map(scenario=>({scenario,...entries[scenario.id]}));
export function nearestSite(point:Point){return exploreSites.reduce((best,site)=>Math.hypot(site.entry.x-point.x,site.entry.z-point.z)<Math.hypot(best.entry.x-point.x,best.entry.z-point.z)?site:best);}
export function nearbySite(point:Point){const site=nearestSite(point);return Math.hypot(site.entry.x-point.x,site.entry.z-point.z)<2.2?site:undefined;}
export function atDetachedDestination(point:Point){return point.x>=76&&point.x<=83&&point.z>=-6&&point.z<=12;}

export class Exploration {
  position:Point={x:6,z:11};
  readonly evaluator=new SafetyRuleEvaluator();
  onResult?:(result:Evaluation)=>void;
  move(dx:number,dz:number){
    const from=this.position;const to={x:from.x+dx,z:from.z+dz};
    const station=to.x>=48&&to.x<=68&&to.z>=-4&&to.z<=12;
    const destination=atDetachedDestination(to);
    if([frontRoad,...otherRoads].some(road=>intersects(from,to,road))){
      this.onResult?.(this.evaluator.evaluate('vehicleLane',{safePlace:false},'map-safe-wait'));
      return false;
    }
    if(sideGateChainCollision(from,to)){this.onResult?.(this.evaluator.evaluate('sideBarrier',{boundaryClear:false},'map-side-gate-chain'));return false;}
    if(!(onPedestrianSpace(to)||station||destination)){
      return false;
    }
    if(intersects(from,to,campusParkingArea)){this.onResult?.(this.evaluator.evaluate('vehicleLane',{safePlace:false},'map-parking-area'));return false;}
    if(crossesVehicleGate(from,to)){this.onResult?.(this.evaluator.evaluate('vehicleLane',{safePlace:false},'map-vehicle-gate'));return false;}
    if(hitsCampusWall(from,to)||chainCollision(from,to,false)||to.x<.8&&to.x> -15&&to.z<0&&to.z> -13.7){this.onResult?.(this.evaluator.evaluate('barrier',{boundaryClear:false},'map-boundary'));return false;}
    this.position=to;return true;
  }
  relocate(site:ExploreSite){this.position={...site.entry};}
}
