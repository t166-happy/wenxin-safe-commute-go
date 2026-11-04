import {SafetyRuleEvaluator,type Evaluation,type Facts} from '../safety/evaluator';
import {chainCollision,intersects,type Point,type Box} from '../safety/checkpoints';
import type {Scenario} from '../data/scenarios';
import {campusParkingArea,crossesVehicleGate,crossings,frontRoad,hitsCampusWall,onMarkedCrosswalk,onPedestrianSpace,otherRoads} from './streetMap';
export interface Step {id:string;label:string;action:string;verb:string;target:Point;rule:string;tip:string}
const p=(x:number,z:number):Point=>({x,z});
const step=(id:string,label:string,action:string,verb:string,target:Point,rule='approach',tip='走到金色標記旁，按互動鍵。'):Step=>({id,label,action,verb,target,rule,tip});
function walking(reverse=false,x:number=crossings[0].x):Step[]{
  if(x===crossings[1].x){const z=crossings[1].z;return [
    ...(!reverse?[step('approachSide','從其他街區沿復興北路人行道走向側門','assembly','🚶 沿人行道',p(-43,-10))]:[]),
    step('stop','在復興北路路緣安全區停下','stop','✋ 停步',p(reverse?-33:-41.5,z),'approach','鬆開移動鍵，停在路緣的金色圓圈。'),
    step('left','看看左方來車','left','👀 看左方',p(reverse?-33:-41.5,z)),step('right','看看右方與轉彎車','right','👀 看右方',p(reverse?-33:-41.5,z)),
    step('wait','確認綠燈、停讓與導護','wait','🚦 確認安全',p(reverse?-33:-41.5,z),'cross'),
    step('cross','沿復興北路斑馬線走到對面','cross','🚶 完成穿越',p(reverse?-42:-35,z),'cross'),
    step('guard','在側門安全區向導護確認','guard','🧑‍🏫 確認動線',p(reverse?-43:-33,z),'help'),
    step('destination',reverse?'安全抵達復興北路示意街區':'沿側門步道進入校園','finish','🏁 抵達',p(reverse?-43:-27,reverse?-18:z))
  ];}
  const edge=reverse?.6:8.7,end=reverse?8.7:.6;
  return [step('stop','在路口安全區停下','stop','✋ 停步',p(x,edge),'approach','鬆開移動鍵，停在路緣的金色圓圈。'),step('left','看看左方來車','left','👀 看左方',p(x,edge)),step('right','看看右方與轉彎車','right','👀 看右方',p(x,edge)),step('wait','確認綠燈、停讓與導護','wait','🚦 確認安全',p(x,edge),'cross'),step('cross','沿斑馬線走到對面','cross','🚶 完成穿越',p(x,end),'cross'),step('guard','在安全區向導護確認','guard','🧑‍🏫 確認動線',p(x,reverse?9.5:-2),'help'),step('destination',reverse?'安全抵達示意街角':'沿左側步道進入校門','finish','🏁 抵達',p(x,reverse?12:-10))];
}
export function makeSteps(s:Scenario,reverse:boolean):Step[]{
  if(s.mode==='walk'||s.mode==='guard')return walking(reverse,s.id==='walk_side'?crossings[1].x:crossings[0].x);
  if(s.mode==='human')return [step('observe','觀察狹窄步道，收集風險證據','observe','🔎 標記風險',p(6,-7)),step('stakeholder','留意輪椅與推車的需要','stakeholder','♿ 關心用路人',p(6,-7)),step('place','將改善設施放到金色位置','place','🌱 放置坡道',p(6,-4),'improve','將坡道圖卡拖到 3D 金色圓圈，或到圈旁按互動。'),step('compare','觀察改善前後通行空間','compare','↔ 比較前後',p(6,-4)),step('proposal','以圖卡保存改善建議','proposal','📋 保存提案',p(6,-4))];
  if(s.mode==='parent'){
    const seat=p(130,-1),sidewalk=p(s.stop!.x-3.5,11.4);
    return [
      step('park','確認家長在校門兩側示意區短暫停妥','park','🛑 確認停妥',seat,'parentPark','在車內等完全停穩；短暫停靠，不佔用行人通道，也不催促孩子冒險下車。'),
      step('unbuckle','車停穩後解開安全帶','unbuckle','🔓 解開安全帶',seat,'unbuckle'),
      step('rear','觀察車門後方來車、自行車與機車','rear','👀 看後方',seat,'parentRear','後方有車時先等，不急著開門。'),
      step('side','選擇靠人行道的一側開門','side','🚪 安全側車門',seat,'parentSide'),
      step('alight','確認後方淨空後，從安全側下車','alight','🚶 安全下車',seat,'parentAlight'),
      step('clearCar','關好車門並走到人行道，讓車輛儘速離開','clearCar','🚶 走到人行道',sidewalk,'parentClear','在安全處關好車門，離開臨停區；家長確認安全後駛離，不久佔路側。'),
      step('walkToCrossing','沿人行道走向正門斑馬線','walkToCrossing','🚶 沿人行道',p(6,11),'busExit'),
      ...walking(false),
    ];
  }
  if(s.mode==='scooter'){
    const side=s.id==='scooter_side',seat=p(120,-1);
    return [
      step('arrival','依序進入正門或側門停靠點，等機車完全停妥','arrival','🛑 依序停妥',seat,'scooterArrival','前車離開後再依序停靠；安全帽扣好、坐穩，不能在移動中下車。'),
      step('rear','觀察後方車輛與旁邊行人','rear','👀 看周圍',seat,'scooterRear'),
      step('alight','停穩且周圍安全後，從人行道側下車','alight','🚶 安全下車',seat,'scooterAlight'),
      step('clearScooter','離開機車停靠點，站回人行道','clearScooter','🚶 回到步道',side?p(-33,-8):p(-4,11.5),'scooterClear','不在車道逗留；機車依序駛離，避免與兩側汽車接送混流。'),
      ...(side?[step('destination','從復興北路側門步道進校','finish','🏁 抵達',p(-27,-8))]:walking(false)),
    ];
  }
  const shuttle=s.mode==='after_school_shuttle';
  const publicTransit=['mrt','bus','transfer'].includes(s.mode);
  const mrt=s.mode==='mrt';
  const queue=shuttle?p(2,-5):mrt?p(59,3):p((s.stop?.x??3)-2,11);
  const assembly=shuttle?p(4,-8):mrt?p(53,11):p((s.stop?.x??3)-3,11);
  const steps=[step('assembly',shuttle?'沿左側步道到集合區':mrt?'沿人行空間抵達捷運站外':'走到各自的示意安全候車區','assembly','📍 安全集合',assembly)];
  if(mrt)steps.push(step('station','走進站體，找到通往月台的路','station','🏢 進入車站',p(53,8)),step('fareGate','在閘門刷卡後再往月台走','card','💳 刷卡進站',p(55,7)));
  steps.push(step('identify',mrt?'確認往 A8 的普通車方向':'確認車輛識別：星星 01','identify',mrt?'🚈 確認方向':'⭐ 核對車號',mrt?p(55,6):assembly),step('queue','站在隊伍尾端，等前方同學','queue','👣 依序排隊',queue));
  if(s.mode==='mrt')steps.push(step('platform','站在安全線後，先讓乘客下車','platform','🚈 先下後上',queue,'platform'));
  steps.push(step('clearance',shuttle?'等車停妥，由成人開放指定口':'等車停穩、開門及人員引導','clearance','🧑 請成人確認',queue,'gate'),step('board','沿指定通道走到車門','board','🚪 依序上車',shuttle?p(-4,-5):mrt?p(61,3):p((s.stop?.x??3)-1,11),'board'));
  if(publicTransit){if(!mrt)steps.push(step('card','在車內感應票卡','card','💳 感應票卡',p(110,2)));steps.push(step('rail','走近扶手，站穩扶好','rail','✋ 握住扶手',p(110,0),'rail'),step('depart','準備妥當，開始乘車','depart','🚈 穩穩乘車',p(110,0),'rail'));}
  else steps.push(step('seat','依虛構座號找到 02A','seat','💺 入座 02A',p(108.5,-1),'seat'),step('buckle','將插扣拖入扣環，或點按扣合','buckle','🔒 扣好安全帶',p(108.5,-1),'buckle'),step('depart','坐定繫好，等候發車','depart','🚐 準備出發',p(108.5,-1),'depart'));
  if(s.mode==='bus'||s.mode==='transfer')steps.push(step('bell','接近示意目的站，按下車鈴','bell','🔔 按下車鈴',p(110,0)));
  steps.push(step('arrival','車行中保持安全，等完全停妥','arrival','🛑 確認停穩',publicTransit?p(110,0):p(108.5,-1),'unbuckle'));
  if(!publicTransit)steps.push(step('unbuckle','停穩後再解扣','unbuckle','🔓 解開安全帶',p(108.5,-1),'unbuckle'));
  steps.push(step('alight','依序從安全側下車','alight','🚪 依序下車',p(110,2),'alight'));
  if(mrt)steps.push(step('stationExit','沿站內安全指引走到出口','stationExit','🚶 出站',p(53,11)),step('walkToSchool','沿示意人行道走向文欣國小','walkToSchool','🚶 沿路行走',p(6,11)));
  else steps.push(step('blindspot','離開車身遮蔽，留在行人空間','blindspot','👀 觀察離車動線',shuttle||reverse?p(80,0):p(0,9),'busExit'));
  if(shuttle||reverse)steps.push(step('destination','抵達示意交接安全區','finish','🏁 完成旅程',p(80,-4)));
  else steps.push(...walking(false));
  return steps;
}
export class Journey {
  readonly evaluator=new SafetyRuleEvaluator();
  steps:Step[];index=0;position:Point;checkpoint:Point;facts:Facts={};elapsed=0;stoppedFor=0;queueAt:number|null=null;rideAt:number|null=null;departAt:number|null=null;
  blocked:Evaluation|null=null;complete=false;vehicleProgress=0;onResult?:(r:Evaluation)=>void;
  obstacles:Box[]=[];
  constructor(readonly scenario:Scenario,readonly reverse=false){
    this.steps=makeSteps(scenario,reverse);this.position={...(scenario.mode==='parent'?p(130,-1):scenario.mode==='scooter'?p(120,-1):reverse&&(scenario.mode==='walk'||scenario.mode==='guard')?scenario.id==='walk_side'?p(-27,-8):p(this.crossingX,-10):scenario.start)};this.checkpoint={...this.position};
    const arriving=scenario.mode==='parent'||scenario.mode==='scooter';
    this.facts={safePlace:true,boundaryClear:true,behindLine:true,doorNotClosing:true,correctDirection:false,vehicleCorrect:false,adultCleared:false,studentTurn:false,crossingConflictFree:false,vehicleStopped:false,doorOpen:false,safeSide:true,safeStop:arriving,rearTrafficClear:false,motorcycleTurn:false,rearChecked:!arriving,unbuckled:!arriving,buckled:scenario.mode==='parent',helmeted:scenario.mode==='scooter',feetOnFootrests:scenario.mode==='scooter',seated:arriving,doorClosed:false,clearOfBlindSpot:!arriving,accessible:true,emergencyClear:true,sightClear:true};
  }
  get current(){return this.steps[this.index];}
  get assistedTarget():Point{
    // After leaving the main-gate scooter, follow the sidewalk behind its stopping bay.
    // Walking straight to the crossing would cut through the vehicle approach area.
    if(this.scenario.id==='scooter_main'&&this.current?.id==='stop'&&this.position.x<5.8)return p(6,11);
    return this.current.target;
  }
  get crossingX(){return this.scenario.id==='walk_side'?crossings[1].x:crossings[0].x;}
  get inside(){return this.position.x>105&&this.position.x<115||this.scenario.mode==='scooter'&&this.position.x>117&&this.position.x<123||this.scenario.mode==='parent'&&this.position.x>127&&this.position.x<133;}
  get vehiclePosition(){
    const stop=this.scenario.stop;if(!stop)return undefined;
    if(this.departAt!==null){const progress=Math.min((this.elapsed-this.departAt)/3,1);if(progress>=1)return undefined;return this.scenario.id==='scooter_side'?{x:stop.x,z:stop.z-progress*10}:{x:stop.x+progress*(stop.x<0?-12:12),z:stop.z};}
    if(this.scenario.mode==='parent')return {x:stop.x+(1-this.vehicleProgress)*(stop.x<0?-12:12),z:stop.z};
    if(this.scenario.id==='scooter_main')return {x:stop.x-(1-this.vehicleProgress)*8,z:stop.z};
    if(this.scenario.id==='scooter_side')return {x:stop.x,z:stop.z-(1-this.vehicleProgress)*12};
    return stop.z>=7?{x:stop.x+(1-this.vehicleProgress)*12,z:stop.z}:{x:stop.x,z:stop.z+(1-this.vehicleProgress)*(this.scenario.mode==='after_school_shuttle'?7:12)};
  }
  get gateOpen(){return this.scenario.mode==='after_school_shuttle'&&this.current?.id==='board'&&this.evaluator.evaluate('gate',this.facts).allowed;}
  get signal(){return this.elapsed%18>=6&&this.elapsed%18<15;}
  get yielded(){return this.elapsed%18>=8&&this.elapsed%18<15;}
  update(dt:number,moving=false){
    if(this.blocked||this.complete)return;
    this.elapsed+=dt;this.stoppedFor=moving?0:this.stoppedFor+dt;
    this.facts.green=this.signal||this.facts.crossing===true;this.facts.trafficYielded=this.yielded||this.facts.crossing===true;
    this.facts.rearTrafficClear=this.elapsed%20>=4&&this.elapsed%20<19;
    if(this.scenario.mode==='scooter')this.facts.motorcycleTurn=this.elapsed>=3;
    const walk=this.scenario.mode==='walk'||this.scenario.mode==='guard'||this.current?.id==='wait'||this.current?.id==='cross';
    if(walk)this.facts.adultCleared=this.yielded||this.facts.crossing===true;
    if(this.rideAt!==null){
      const arrived=this.elapsed-this.rideAt>=5&&(this.scenario.mode!=='bus'&&this.scenario.mode!=='transfer'||this.facts.bell===true);
      this.facts.vehicleStopped=arrived;this.facts.doorOpen=arrived;this.facts.crossingConflictFree=arrived;
    }else{
      this.vehicleProgress=Math.min(Math.max(this.elapsed-(this.scenario.mode==='scooter'?3:0))/(this.scenario.mode==='scooter'?2:5),1);this.facts.vehicleStopped=this.vehicleProgress===1;this.facts.doorOpen=this.facts.vehicleStopped;this.facts.crossingConflictFree=this.facts.vehicleStopped;
    }
    if(this.queueAt!==null&&this.elapsed-this.queueAt>=1.5)this.facts.studentTurn=true;
  }
  evaluate(rule:string,overrides:Facts={}):Evaluation{
    const result=this.evaluator.evaluate(rule,{...this.facts,...overrides},this.current?.id??'finished');
    this.onResult?.(result);if(!result.allowed)this.blocked=result;return result;
  }
  attempt(action:string,overrides:Facts={}):boolean{
    if(this.blocked||this.complete)return false;
    const safePlace=this.inside?this.facts.vehicleStopped===true:(this.position.x< -35||this.position.x>70||this.position.z<1.7||this.position.z>7.3);
    if(action==='greet'){return this.evaluate('courtesy',{safePlace,...overrides}).allowed;}
    if(action==='help')return this.evaluate('help',{safePlace:this.inside?!!this.facts.seated&&(!!this.facts.buckled||!!this.facts.holdingRail||this.scenario.mode==='scooter'&&!!this.facts.helmeted&&!!this.facts.feetOnFootrests):safePlace}).allowed;
    const current=this.current;if(!current)return false;
    const near=Math.hypot(this.position.x-current.target.x,this.position.z-current.target.z)<1.4;
    if(action!==current.action){const rule=action==='board'?(this.scenario.mode==='scooter'?'scooterBoard':'board'):action==='alight'?(this.scenario.mode==='scooter'?'scooterAlight':this.scenario.mode==='parent'?'parentAlight':'alight'):action==='unbuckle'?'unbuckle':action==='seat'?(this.scenario.mode==='scooter'?'scooterSeat':'seat'):action==='place'?'improve':'approach';return this.evaluate(rule,{...overrides,nearTarget:false,...(rule==='seat'||rule==='scooterSeat'?{correctSeat:false}:{})}).allowed&&false;}
    if(!near){this.evaluate('approach',{nearTarget:false});return false;}
    const extras:Facts={nearTarget:near,...overrides};
    if(action==='stop')extras.nearTarget=near&&this.stoppedFor>.3;
    if(action==='seat')extras.correctSeat=overrides.correctSeat??near;
    if(action==='helmet')extras.helmeted=true;
    if(action==='footrest')extras.feetOnFootrests=true;
    if(action==='rail')extras.holdingRail=true;
    if(action==='clearance')extras.adultCleared=true;
    if(action==='wait'||action==='cross')extras.onCrosswalk=this.scenario.id==='walk_side'?Math.abs(this.position.z-crossings[1].z)<1.2:Math.abs(this.position.x-this.crossingX)<1.2;
    if(action==='cross'&&this.facts.crossed){extras.green=true;extras.trafficYielded=true;extras.adultCleared=true;}
    if(!this.evaluate(current.rule,extras).allowed)return false;
    if(action==='stop'){this.facts.stopped=true;this.facts.crossed=false;}
    if(action==='left')this.facts.lookLeft=true;
    if(action==='right')this.facts.lookRight=true;
    if(action==='identify'){this.facts.vehicleCorrect=true;this.facts.correctDirection=true;}
    if(action==='queue')this.queueAt=this.elapsed;
    if(action==='rear')this.facts.rearChecked=true;
    if(action==='park'||action==='arrival'&&this.scenario.mode==='scooter')this.facts.adultCleared=true;
    if(action==='helmet')this.facts.helmeted=true;
    if(action==='footrest')this.facts.feetOnFootrests=true;
    if(action==='clearance')this.facts.adultCleared=true;
    if(action==='board')this.position=this.scenario.mode==='scooter'?p(120,2.8):p(110,2.8);
    if(action==='seat'){this.facts.seated=true;this.position=this.scenario.mode==='scooter'?p(120,-1):p(108.5,-1);}
    if(action==='buckle'){this.facts.buckled=true;this.facts.unbuckled=false;}
    if(action==='rail'){this.facts.holdingRail=true;this.facts.seated=true;}
    if(action==='depart'){this.rideAt=this.elapsed;this.facts.vehicleStopped=false;this.facts.doorOpen=false;this.facts.crossingConflictFree=false;this.facts.adultCleared=false;}
    if(action==='arrival')this.facts.adultCleared=true;
    if(action==='bell')this.facts.bell=true;
    if(action==='unbuckle'){this.facts.buckled=false;this.facts.unbuckled=true;}
    if(action==='alight')this.position=this.scenario.mode==='scooter'?(this.scenario.id==='scooter_side'?p(-33,-14):p(-5,11)):this.scenario.mode==='mrt'?p(59,3):this.scenario.mode==='after_school_shuttle'||this.reverse?p(80,2):this.scenario.mode==='parent'?p(this.scenario.stop!.x-2.4,10.8):p(1,9);
    if(action==='clearCar'){this.facts.doorClosed=true;this.facts.clearOfBlindSpot=true;this.departAt=this.elapsed;}
    if(action==='clearScooter'){this.facts.clearOfBlindSpot=true;this.departAt=this.elapsed;}
    this.index++;this.checkpoint={...this.position};this.stoppedFor=0;
    if(this.index>=this.steps.length)this.complete=true;
    return true;
  }
  retry(){this.blocked=null;this.position={...this.checkpoint};this.stoppedFor=0;}
  move(dx:number,dz:number):boolean{
    if(this.blocked||this.complete)return false;
    // A sitting or riding player cannot walk away from the seat/handrail.
    if(this.inside&&(this.scenario.mode==='parent'||this.scenario.mode==='scooter'||this.facts.buckled||this.facts.vehicleStopped===false)){
      if(Math.abs(dx)+Math.abs(dz)>.001)this.evaluate(this.scenario.mode==='scooter'?'scooterStaySeated':this.scenario.mode==='parent'?'parentAlight':'leaveSeat');return false;
    }
    const to={x:this.position.x+dx,z:this.position.z+dz};
    if(this.inside){if(this.scenario.mode==='scooter'?to.x<117||to.x>123||to.z<-4||to.z>3.5:this.scenario.mode==='parent'?to.x<127||to.x>133||to.z<-4||to.z>3.5:to.x<107||to.x>113||to.z<-4||to.z>3.5)return false;}
    else if(this.position.x>70){if(to.x<76||to.x>83||to.z<-6||to.z>5)return false;}
    else if(this.scenario.mode==='mrt'&&this.position.x>45&&this.position.x<70&&this.position.z<7.4){
      if(to.x<47||to.x>62||to.z< -4||to.z>12)return false;
      if(to.x>60.2){const r=this.evaluate('platform',{correctDirection:this.facts.correctDirection,behindLine:this.current?.id==='board',doorNotClosing:this.facts.doorOpen});if(!r.allowed)return false;}
    }
    else {
      const stationWalk=this.scenario.mode==='mrt'&&to.x>=47&&to.x<=62&&to.z>=-4&&to.z<=12;
      if(!(onPedestrianSpace(to)||stationWalk||onMarkedCrosswalk(to))){if(otherRoads.some(road=>intersects(this.position,to,road)))this.evaluate('vehicleLane',{safePlace:false});return false;}
      if(intersects(this.position,to,campusParkingArea)){this.evaluate('vehicleLane',{safePlace:false});return false;}
      if(this.scenario.stop&&this.scenario.stop.z>=7&&intersects(this.position,to,{minX:this.scenario.stop.x-2,maxX:this.scenario.stop.x+2,minZ:7.1,maxZ:10.4})){
        this.evaluate('vehicleLane',{safePlace:false});return false;
      }
      if(crossesVehicleGate(this.position,to)){this.evaluate('vehicleLane',{safePlace:false});return false;}
      if(hitsCampusWall(this.position,to)||chainCollision(this.position,to,this.gateOpen)){this.evaluate('barrier',{boundaryClear:false});return false;}
      if(to.x<.8&&to.x> -15&&to.z<0&&(to.z< -5.85||to.z> -4.15)){
        this.evaluate('barrier',{boundaryClear:false});return false;
      }
      if(this.obstacles.some(box=>intersects(this.position,to,box)))return false;
      const road:Box|undefined=[frontRoad,...otherRoads].find(box=>intersects(this.position,to,box));
      if(!stationWalk&&road){
        const inMark=this.scenario.id==='walk_side'?road===otherRoads[0]&&Math.abs(to.z-crossings[1].z)<1.2&&Math.abs(this.position.z-crossings[1].z)<1.2:road===frontRoad&&Math.abs(to.x-this.crossingX)<1.2&&Math.abs(this.position.x-this.crossingX)<1.2;
        // Once crossing safely starts, traffic remains yielding until player reaches the opposite curb.
        const crossing=this.facts.crossing===true;
        const result=this.evaluator.evaluate('cross',{...this.facts,onCrosswalk:inMark,...(crossing?{green:true,trafficYielded:true,adultCleared:true}:{})},this.current?.id);
        if(!result.allowed){this.onResult?.(result);this.blocked=result;return false;}if(!crossing)this.onResult?.(result);this.facts.crossing=true;
      }else if(this.facts.crossing){this.facts.crossing=false;this.facts.crossed=true;}
    }
    this.position=to;return true;
  }
}
