import type {Point} from '../safety/checkpoints';
import routes from '../../data/routes.json';
export type Mode='walk'|'guard'|'mrt'|'bus'|'school_bus'|'after_school_shuttle'|'parent'|'scooter'|'transfer'|'human';
export interface Scenario {id:string;mode:Mode;label:string;icon:string;note:string;start:Point;stop?:Point;verificationStatus:'illustrative';sourceNote:string;lastVerifiedAt:null}
const crossingMainX=6;
const make=(id:string,mode:Mode,label:string,icon:string,note:string,start:Point,stop?:Point):Scenario=>({id,mode,label,icon,note,start,stop,verificationStatus:'illustrative',sourceNote:'V2.4 場景分流與使用者補充方位；尺寸、道路及停靠點皆為教學示意，待現勘。',lastVerifiedAt:null});
export const scenarios:Scenario[]=[
  make('walk','walk','步行到校','🚶','停・看・等・走，安全通過路口',{x:6,z:11}),
  make('walk_side','walk','復興北路側門步行','🚶','從其他街區沿復興北路人行道走到上學開放的側門',{x:-43,z:-24}),
  make('guard','guard','導護站','🧑‍🏫','號誌、車況與導護指引一起看',{x:6,z:11}),
  make('after_school_shuttle_courtyard','after_school_shuttle','安親班接駁','🚐','校內廣場・錐鏈分流・指定口登車',{x:5,z:-10},routes.after_school_shuttle.stop),
  make('school_bus_gate_exterior','school_bus','校車','🚌','校門東側外部示意區，不進入校園',{x:28,z:11},routes.school_bus.stop),
  make('mrt','mrt','機場捷運','🚈','先到站體・進月台・三節車廂',{x:53,z:11},{x:63,z:3}),
  make('bus','bus','公車','🚍','示意站點・排隊刷卡・按鈴下車',{x:15,z:11},{x:18,z:9}),
  make('parent','parent','正門西側汽車送學','🚙','短暫停妥・看後方・安全側下車・沿人行道過馬路',{x:-19,z:11},routes.parent.stop),
  make('parent_east','parent','正門東側汽車送學','🚙','短暫停妥・看後方・安全側下車・沿人行道過馬路',{x:10,z:11},routes.parent_east.stop),
  make('scooter_main','scooter','正門機車送學','🛵','正門口依序停妥・安全下車・不與汽車混流',{x:-4,z:11},routes.scooter_main.stop),
  make('scooter_side','scooter','側門機車送學','🛵','側門口依序停妥・安全下車・走行人步道',{x:-33,z:-18},routes.scooter_side.stop),
  make('transfer','transfer','安全轉乘','🔁','公車 → 步行 → 導護站',{x:17,z:11},{x:20,z:9}),
  make('human','human','人本交通設計師','🌱','觀察證據・改善設施・保留通道',{x:6,z:-10}),
];
export function validateScenario(s:Scenario){
  if(s.mode==='school_bus'&&(!s.stop||s.stop.z<7))throw new Error('V2.4：校車只能在校門外停靠');
  if(s.mode==='parent'&&(!s.stop||s.stop.z<7||s.stop.x< -20||s.stop.x>14||Math.abs(s.stop.x-crossingMainX)<4||Math.hypot(s.stop.x-routes.school_bus.stop.x,s.stop.z-routes.school_bus.stop.z)<10))throw new Error('汽車接送限正門兩側示意區，且不得與校車或行穿線重疊');
  if(s.mode==='scooter'&&(!s.stop||s.id==='scooter_main'&&Math.hypot(s.stop.x+1,s.stop.z-6.5)>1||s.id==='scooter_side'&&Math.hypot(s.stop.x+38,s.stop.z+14)>2||[routes.parent.stop,routes.parent_east.stop].some(car=>Math.hypot(s.stop!.x-car.x,s.stop!.z-car.z)<6)))throw new Error('機車送學須設在正門車道邊或側門獨立示意點，不得與汽車臨停區混用');
  if(s.mode==='after_school_shuttle'&&(!s.stop||s.stop.x> -2||s.stop.z>=0))throw new Error('V2.4：安親班接駁車只使用核准廣場示意格位');
}
scenarios.forEach(validateScenario);
