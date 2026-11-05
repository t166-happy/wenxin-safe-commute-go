import * as THREE from 'three';
import type {Journey} from './game/journey';
import type {Point} from './safety/checkpoints';
import {exploreSites} from './game/explore';
import {crossings,frontRoad,otherRoads,signalPlacements} from './game/streetMap';
import {crossingGuideRoutes,guideDirectionProgress,receivingTeacherProgress,type CrossingGuideId,type CrossingGuideRole,type GuideRoute} from './game/crossingGuides';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const palette={grass:0x9bcba8,path:0xe5dcc7,road:0x536575,cream:0xfff2d3,green:0x386e59,mint:0x82bca3,coral:0xef8f71,yellow:0xffca59,blue:0x428cb4};
interface GuideActor {crossing:CrossingGuideId;role:CrossingGuideRole;group:THREE.Group;arm:THREE.Mesh;legs:THREE.Mesh[];route:GuideRoute}
export class World {
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(43,1,.1,300);renderer:THREE.WebGLRenderer;
  private rideScene=new THREE.Scene();private rideCamera=new THREE.PerspectiveCamera(46,1,.1,80);private rideVehicle=new THREE.Group();private rideRoad=new THREE.Group();private rideTrack=new THREE.Group();private rideMode='';private rideDistance=0;private rideLines:THREE.Mesh[]=[];private rideSleepers:THREE.Mesh[]=[];
  root=new THREE.Group();avatar=new THREE.Group();vehicle=new THREE.Group();leadScooter=new THREE.Group();gate=new THREE.Group();marker=new THREE.Group();trafficCar=new THREE.Group();sideTrafficCar=new THREE.Group();passenger=new THREE.Group();improvement=new THREE.Group();exploreMarkers=new THREE.Group();landmarkVehicles=new THREE.Group();transportCabin=new THREE.Group();scooterCabin=new THREE.Group();parentCabin=new THREE.Group();
  belt!:THREE.Mesh;parentBelt!:THREE.Mesh;helmet!:THREE.Mesh;stationRoof!:THREE.Mesh;
  private pedestrianSignals:{red:THREE.Group;green:THREE.Group}[]=[];private vehicleSignals:{red:THREE.Mesh;amber:THREE.Mesh;green:THREE.Mesh}[]=[];
  yaw=.3;distance=25;overview=false;reduced=false;low=false;private focus=new THREE.Vector3(-3,0,-2);private ray=new THREE.Raycaster();private clock=0;private teacherWaveUntil={main:0,side:0};private guides:GuideActor[]=[];private lastMode='';private objects:THREE.Object3D[]=[];private readonly labels=new Set<THREE.Sprite>();private readonly labelPosition=new THREE.Vector3();private readonly mapFog=new THREE.Fog(0xe4f0ec,75,225);private readonly wheelOrigins=new WeakMap<THREE.Group,{x:number;z:number}>();
  constructor(readonly container:HTMLElement){
    this.scene.background=new THREE.Color(0xe4f0ec);this.scene.fog=this.mapFog;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;container.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','可移動角色的 3D 文欣校門教學示意場景');
    const sky=new THREE.HemisphereLight(0xfff5e5,0x84a89d,2);this.scene.add(sky);const sun=new THREE.DirectionalLight(0xfff0d7,2.4);sun.position.set(-15,30,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-35;sun.shadow.camera.right=95;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;sun.shadow.normalBias=.04;this.scene.add(sun);
    this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;
    this.scene.add(this.root);this.buildCampus();this.buildRoadDetails();this.loadStreetFurniture();this.buildCabin();this.buildStation();this.buildDestination();this.buildExploreMarkers();this.buildLandmarkVehicles();this.buildRideView();this.leadScooter=this.makeVehicle('scooter');this.leadScooter.traverse(o=>{if(o instanceof THREE.Mesh&&o.material instanceof THREE.MeshStandardMaterial&&o.material.color.getHex()===0x55a7a0)o.material.color.setHex(0xef8f71);});this.label('前車先駛離',0,3.25,0,3.1,this.leadScooter,'#ffe9d8','#7d3a2e');this.leadScooter.visible=false;this.root.add(this.leadScooter);this.avatar=this.person(0x408cad);this.helmet=this.ball(.36,0xf3c55e,0,1.78,0,this.avatar);this.helmet.visible=false;this.root.add(this.avatar);this.buildMarker();this.scene.add(this.marker);this.resize();new ResizeObserver(()=>this.resize()).observe(container);
  }
  mat(color:number){return new THREE.MeshStandardMaterial({color,roughness:.84,metalness:0});}
  box(w:number,h:number,d:number,color:number,x:number,y:number,z:number,parent:THREE.Object3D=this.root){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  ball(r:number,color:number,x:number,y:number,z:number,parent:THREE.Object3D=this.root){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,10,7),this.mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
  private wheel(radius:number,width:number,x:number,y:number,z:number,parent:THREE.Group,side=0){
    const rolling=new THREE.Group();rolling.position.set(x,y,z);rolling.userData.radius=radius;
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,width,18),this.mat(0x263a40));tire.rotation.z=Math.PI/2;tire.castShadow=true;rolling.add(tire);
    for(const face of side===0?[-1,1]:[side]){
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(radius*.67,radius*.67,.025,18),this.mat(0xb6c8bd));rim.rotation.z=Math.PI/2;rim.position.x=face*(width/2+.015);rolling.add(rim);
      for(let i=0;i<5;i++){const spoke=new THREE.Group();spoke.rotation.x=i*Math.PI*2/5;this.box(.035,radius*.62,.055,0xffedd0,face*(width/2+.038),radius*.34,0,spoke);rolling.add(spoke);}
      const hub=new THREE.Mesh(new THREE.CylinderGeometry(radius*.17,radius*.17,.045,12),this.mat(0x486a70));hub.rotation.z=Math.PI/2;hub.position.x=face*(width/2+.05);rolling.add(hub);
    }
    parent.add(rolling);const wheels=(parent.userData.wheels??=[]) as THREE.Group[];wheels.push(rolling);return rolling;
  }
  private rollVehicle(vehicle:THREE.Group,dt:number){
    const old=this.wheelOrigins.get(vehicle),next={x:vehicle.position.x,z:vehicle.position.z};this.wheelOrigins.set(vehicle,next);
    if(!old||dt<=0)return;
    const dx=next.x-old.x,dz=next.z-old.z;
    if(Math.hypot(dx,dz)>8)return; // The next traffic cycle repositions a car offscreen.
    const travel=dx*Math.sin(vehicle.rotation.y)+dz*Math.cos(vehicle.rotation.y);
    for(const wheel of (vehicle.userData.wheels??[]) as THREE.Group[])wheel.rotation.x+=travel/((wheel.userData.radius as number)*vehicle.scale.x);
  }
  private wheelAngle(vehicle:THREE.Group){return (((vehicle.userData.wheels??[]) as THREE.Group[])[0]?.rotation.x??0).toFixed(3);}
  private setBrakes(vehicle:THREE.Group,on:boolean){for(const lamp of (vehicle.userData.brakeLights??[]) as THREE.Mesh[]){const material=lamp.material as THREE.MeshStandardMaterial;material.emissive.setHex(on?0xff392d:0x000000);material.emissiveIntensity=on?1.2:0;}}
  label(text:string,x:number,y:number,z:number,width=4,parent:THREE.Object3D=this.root,bg='#fff8e6',fg='#234e43'){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const c=canvas.getContext('2d')!;c.fillStyle=bg;c.beginPath();c.roundRect(0,0,768,160,22);c.fill();c.fillStyle=fg;c.font='bold 62px "Microsoft JhengHei", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,384,82,730);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:true}));sprite.position.set(x,y,z);sprite.scale.set(width,width*160/768,1);sprite.userData.labelText=text;sprite.visible=false;parent.add(sprite);this.labels.add(sprite);return sprite;
  }
  person(color:number){const group=new THREE.Group();this.box(.55,.75,.4,color,0,.88,0,group);this.ball(.31,0xf6cfa8,0,1.55,0,group);this.ball(.33,0x483b33,0,1.72,-.04,group);this.box(.54,.12,.35,0x483b33,0,1.62,-.12,group);const leftLeg=this.box(.2,.43,.24,0x354956,-.17,.28,0,group);const rightLeg=this.box(.2,.43,.24,0x354956,.17,.28,0,group);group.userData.legs=[leftLeg,rightLeg];this.box(.26,.12,.4,0xfff6df,-.17,.1,.06,group);this.box(.26,.12,.4,0xfff6df,.17,.1,.06,group);this.box(.46,.57,.22,palette.yellow,0,.95,-.3,group);this.box(.15,.62,.2,color,-.36,.9,0,group);this.box(.15,.62,.2,color,.36,.9,0,group);return group;}
  private addCrossingGuide(crossing:CrossingGuideId,role:CrossingGuideRole,label:string){
    const route=crossingGuideRoutes[crossing][role];const color=role==='teacher'?0xf1a758:0x5dbb83;
    const group=this.person(color);group.position.set(route.home.x,0,route.home.z);group.rotation.y=route.facing;
    // Reflective front stripes distinguish adults from students without a real uniform or logo.
    this.box(.48,.38,.035,role==='teacher'?0xffe49b:0xf8e36c,0,.96,.23,group);
    this.box(.5,.07,.045,0xfff9e5,0,.95,.26,group);
    const arm=this.box(.13,.78,.21,color,.48,1.08,0,group);
    this.label(label,0,2.5,0,role==='teacher'?2.8:2.5,group);
    this.root.add(group);this.guides.push({crossing,role,group,arm,legs:group.userData.legs as THREE.Mesh[],route});
  }
  private pedestrianSignal(x:number,z:number,facing:number){
    const signal=new THREE.Group();signal.position.set(x,0,z);signal.rotation.y=facing;
    this.box(.12,3.25,.12,0x405458,0,1.625,0,signal);
    this.box(.94,1.07,.27,0xe2d29a,0,3.05,.02,signal);
    this.box(.79,.92,.29,0x173a31,0,3.05,.04,signal);
    const icon=(walking:boolean)=>{
      const figure=new THREE.Group();figure.position.set(0,3.04,.23);
      const color=walking?0x66ff91:0xff6158;
      const material=this.mat(color);material.emissive.setHex(color);material.emissiveIntensity=.9;
      const part=(w:number,h:number,px:number,py:number,angle=0)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,.065),material);mesh.position.set(px,py,0);mesh.rotation.z=angle;figure.add(mesh);};
      const head=new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),material);head.position.y=.29;figure.add(head);
      part(.14,.28,0,.055);
      if(walking){part(.085,.25,-.15,.07,-.7);part(.085,.25,.15,.07,.7);part(.09,.29,-.105,-.205,.48);part(.09,.29,.115,-.205,-.52);}
      else{part(.075,.24,-.15,.035,-.1);part(.075,.24,.15,.035,.1);part(.085,.27,-.07,-.205,0);part(.085,.27,.07,-.205,0);}
      signal.add(figure);return figure;
    };
    const red=icon(false),green=icon(true);this.pedestrianSignals.push({red,green});this.root.add(signal);
  }
  private vehicleSignal(x:number,z:number,facing:number){
    const signal=new THREE.Group();signal.position.set(x,0,z);signal.rotation.y=facing;
    this.box(.14,3.3,.14,0x405458,0,1.65,0,signal);this.box(.72,1.52,.34,0x263d40,0,3.45,0,signal);
    const lamp=(y:number)=>this.ball(.2,0x44504a,0,y,.21,signal);
    this.vehicleSignals.push({red:lamp(3.92),amber:lamp(3.45),green:lamp(2.98)});
    this.root.add(signal);
  }
  private showSignals(pedestrianGreen:boolean,vehicleMoving:boolean){
    const light=(mesh:THREE.Mesh,on:boolean,color:number)=>{const material=mesh.material as THREE.MeshStandardMaterial;material.color.setHex(on?color:0x44504a);material.emissive.setHex(on?color:0x000000);material.emissiveIntensity=on?.65:0;};
    for(const signal of this.pedestrianSignals){signal.red.visible=!pedestrianGreen;signal.green.visible=pedestrianGreen;}
    for(const signal of this.vehicleSignals){light(signal.red,!vehicleMoving,0xff443e);light(signal.amber,false,0xffc94d);light(signal.green,vehicleMoving,0x5de987);}
    this.container.dataset.pedestrianSignal=pedestrianGreen?'green-man':'red';this.container.dataset.vehicleSignal=vehicleMoving?'green':'red';
  }
  tree(x:number,z:number,scale=1){const group=new THREE.Group();this.box(.35,2,.35,0x8b7354,0,1,0,group);this.ball(1.25,palette.green,0,2.8,0,group);this.ball(.9,0x609e72,.7,2.5,.1,group);group.position.set(x,0,z);group.scale.setScalar(scale);this.root.add(group);}
  palm(x:number,z:number,scale=1){const g=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.23,4.8,9),this.mat(0x92806b));trunk.position.y=2.4;trunk.castShadow=true;g.add(trunk);for(let i=0;i<8;i++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.44,3.3,5),this.mat(i%2?0x397b57:0x488960));leaf.position.set(Math.cos(i*Math.PI/4)*1.15,5.1,Math.sin(i*Math.PI/4)*1.15);leaf.rotation.z=Math.cos(i*Math.PI/4)*1.2;leaf.rotation.x=-Math.sin(i*Math.PI/4)*1.2;g.add(leaf);}g.position.set(x,0,z);g.scale.setScalar(scale);this.root.add(g);}
  plazaLines(){const points:number[]=[];for(let z=-13;z<=-1.2;z+=1.2)points.push(-12,.045,z,12,.045,z);for(let x=-12;x<=12;x+=2)points.push(x,.046,-13,x,.046,-1.2);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));const lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x9ba59f,transparent:true,opacity:.47}));this.root.add(lines);}
  buildCampus(){
    this.box(160,.4,75,palette.grass,16,-.35,-5);
    this.box(28,.18,12.8,0xc3c8c2,0,-.07,-7.6);this.plazaLines();this.box(150,.16,6,palette.path,15,-.09,11);this.box(150,.13,5,palette.road,15,-.06,4.5);
    for(let x=-57;x<87;x+=4)this.box(1.7,.015,.1,0xe4dfb9,x,.025,4.5);
    for(let z=2.3;z<7;z+=.7)this.box(2.4,.035,.38,0xfff8e6,6,.04,z);
    this.box(28,.18,.3,0xf8eed9,0,.02,7.4);
    for(const [x,w] of [[-18.25,19.5],[.25,7.5],[10,4]] as const)this.box(w,.18,.3,0xf8eed9,x,.02,-1.2);
    // Four complete, tall perimeter sides meet the inner sidewalk edge. Only the vehicle gate,
    // the main small pedestrian gate, and the Fuxing North side gate are open at ground level.
    for(const [x,z,w,d] of [[-18.25,-1.2,19.5,.34],[.25,-1.2,7.5,.34],[10,-1.2,4,.34],[-28,-18.95,.34,17.1],[-28,-3.4,.34,4.4],[12,-14.35,.34,26.3],[-8,-27.5,40,.34]] as const){
      this.box(w,1.9,d,0xe2d0ad,x,.95,z);
      this.box(w,.23,d+.26,0xd49356,x,1.98,z);
      this.box(w,.26,d+.04,0xb99c7c,x,.18,z);
      const length=Math.max(w,d);for(let offset=-length/2+2;offset<length/2-1;offset+=3.5){
        this.box(w>d?.45:.48,2.16,w>d?.48:.45,0xc9b394,w>d?x+offset:x,1.08,w>d?z:z+offset);
      }
    }
    for(const [x,z] of [[-28,-1.2],[-8.5,-1.2],[-3.5,-1.2],[4,-1.2],[8,-1.2],[12,-1.2],[-28,-10.4],[-28,-5.6],[-28,-27.5],[12,-27.5]] as const){
      this.box(.65,2.35,.65,0xbca383,x,1.18,z);this.box(.82,.16,.82,0x6f9276,x,2.42,z);
    }
    // Open pedestrian portals are built in Three.js so they remain visible even if the GLB is unavailable.
    for(const x of [4,8])this.box(.58,2.7,.72,0x966a53,x,1.35,-1.2);
    this.box(4.6,.34,.78,0x386e59,6,2.88,-1.2);this.label('正門小門・開放通行',6,3.48,-.8,5.2);
    for(const z of [-10.4,-5.6])this.box(.72,2.75,.72,0x966a53,-28,1.38,z);
    this.box(.82,.34,5.25,0x386e59,-28,2.88,-8);this.label('復興北路側門・開放入口',-27.7,3.52,-8,5.8);
    this.box(4.5,.12,12,0x76a96b,6.5,.045,-7);this.box(10,.025,12,0xb9bcb8,-6.5,.035,-7);
    this.box(30,10,4.4,0xd8ccb2,0,5,-20);this.box(30,.45,4.8,0xa4b899,0,10.2,-20);
    for(let floor=0;floor<3;floor++)for(let x=-13;x<=13;x+=2.5){this.box(1.35,1.45,.12,0x5c8390,x,2.25+floor*2.6,-17.72);this.box(1.48,.13,.15,0xf2eee1,x,3.04+floor*2.6,-17.62);}
    for(const x of [-8.7,-1.1,6.5]){this.box(4.8,.5,.2,0x9dbd67,x,8.85,-17.61);this.box(.45,7.4,.2,0xa7bf6c,x-2.4,5.15,-17.61);this.box(.45,7.4,.2,0xa7bf6c,x+2.4,5.15,-17.61);}
    this.box(5.8,.35,4.9,0x975b49,0,10.45,-20);this.box(5.3,1.7,1.1,0x9c604e,0,11.2,-20);
    this.box(7.2,1.9,.7,0x777d78,-11.5,.95,-1.2);this.box(7.5,.24,1,0x596460,-11.5,.13,-1.2);this.label('文欣國民小學',-11.5,1.48,-.76,5.6,this.root,'#63716c','#f4ecd5');
    for(let x=-5.5;x<=5.5;x+=1.3){this.box(.06,1.4,.06,0x89959a,x,.8,-13.93);}for(let x=-5.4;x<5.6;x+=.35){const y=1.85+Math.sin((x+5.4)*.7)*.32;this.box(.38,.06,.08,0xaeb7b5,x,y,-13.93);}
    this.box(3,2.4,2.2,0xe2d7bf,10.1,1.2,-14.5);this.box(3.3,.28,2.5,0xbcb09c,10.1,2.5,-14.5);this.box(2.7,.82,.05,0x65483d,10.1,.48,-13.36);this.box(2.45,.88,.06,0x52666a,10.1,1.52,-13.34);for(const x of [9.3,10.1,10.9])this.box(.045,.9,.08,0xc9c3af,x,1.52,-13.29);this.box(.72,4,.72,0x8c7467,12.2,2,-14.6);const towerFace=new THREE.Mesh(new THREE.CircleGeometry(.28,20),this.mat(0x38443e));towerFace.position.set(12.2,2.9,-14.18);this.root.add(towerFace);const round=new THREE.Mesh(new THREE.TorusGeometry(.34,.13,8,16),this.mat(0xb6a99d));round.position.set(12.2,2.9,-14.16);this.root.add(round);
    for(const x of [7,10])for(const z of [-11,-5])this.tree(x,z,.68+(x-7)*.04);for(const [x,z] of [[8,-12],[10,-3],[11,-10]])this.palm(x,z,.6);
    for(const x of [18,23]){this.box(5,5,5,0xd1dbc4,x,2.5,-7);this.box(5.3,.3,5.3,0xb8c6b0,x,5,-7);this.tree(x,11,1.2);}
    // Side-gate wall faces a parking area, with a separate pedestrian strip at the gate.
    this.box(9.5,.1,11,0x829396,-20.25,.005,-7);
    for(const x of [-25,-22,-19,-15.5])this.box(.08,.025,7,0xf7f1d8,x,.07,-7);
    for(const z of [-12.45,-1.55])this.box(9.5,.025,.08,0xf7f1d8,-20.25,.07,z);
    this.box(.32,.42,10.8,0xe7c46e,-25.25,.2,-7);
    for(const [x,color] of [[-23.5,0x9ac2bc],[-20,0xe0a180]] as const){
      this.box(1.75,.65,3.4,color,x,.45,-7);this.box(1.55,.58,1.85,0xdde8e2,x,1.04,-7.2);
      for(const wheelZ of [-1.2,1.2])for(const wheelX of [-.9,.9])this.ball(.3,0x3b4950,x+wheelX,.3,-7+wheelZ);
    }
    this.label('側門旁停車場・學生走分隔步道',-24,2.2,-8,6);
    this.label('正門向外看：左側樹蔭・學生步道',7,1.6,-5,6);this.label('正門向外看：右側安親班接駁車・示意',-7,2,-11,7);this.label('文昌五街・教學示意',0,2.7,13,5);this.label('校車區・校門外示意',30,2.7,13,5);
    this.label('汽車送學短停・正門西側示意',-16,2.7,13,6);this.label('汽車送學短停・正門東側示意',12,2.7,13,6);
    this.label('機車依序停妥・正門口示意',-1,2.5,15,5);this.label('機車依序停妥・側門口示意',-33,2.5,-15,5);
    this.box(6,.03,2,0xeecb79,30,.02,8.6);this.box(5,.03,2,0xf1ce68,-16,.02,6);this.box(5,.03,2,0xf1ce68,12,.02,6);this.box(3,.05,3,0xc8d8c0,18,.03,11);
    this.box(5,.12,42,0x566675,-38,-.1,-13.5);this.label('復興北路・示意',-38,2,-3,4);this.box(5,.12,42,0x566675,43,-.1,-13.5);this.label('文化一路・示意',43,2,-3,4);this.box(85,.12,5,0x566675,2,-.1,-32);this.label('復興一路・示意',2,2,-32,4);
    this.box(.07,.03,6,palette.yellow,4.4,.04,10.5);this.label('留在人行空間候車',2,1,13.5,3);
    this.box(1.8,.04,2,0xf4d686,2,.08,-5);this.box(1.8,.04,1.8,0xf4d686,6,.08,9);
    for(let z=-13.7;z<=-1.4;z+=1.35){if(z>-6.3&&z<-3.7)continue;this.cone(1,z);}
    this.chain(-13.8,-6.2);this.chain(-3.8,-1.4);
    for(const z of [-13.8,-1.4]){const width=z< -10?11:4;this.box(width,.28,.35,palette.green,1-width/2,.6,z);this.box(width,.28,.35,palette.green,1-width/2,1.05,z);}
    this.label('車行入口・學生止步',-6,1.2,-1.2,4);
    this.gate.position.set(1,0,-5);this.root.add(this.gate);for(let z=-1.2;z<=1.2;z+=.16){const link=new THREE.Mesh(new THREE.TorusGeometry(.11,.025,5,8),this.mat(palette.yellow));link.position.set(0,.95,z);link.rotation.y=Math.PI/2;this.gate.add(link);}this.label('指定登車口',-.4,2.1,-5,3);
    this.addCrossingGuide('main','teacher','正門老師');
    this.addCrossingGuide('main','volunteer','正門志工');
    const mainSignals=signalPlacements.main;this.pedestrianSignal(mainSignals.pedestrian.x,mainSignals.pedestrian.z,mainSignals.pedestrian.facing);this.vehicleSignal(mainSignals.vehicle.x,mainSignals.vehicle.z,mainSignals.vehicle.facing);
    const adult=this.person(0xf1a758);adult.position.set(2.2,0,-6.5);this.root.add(adult);this.label('等成人放行',2.2,2.8,-7,3);
    for(let i=0;i<2;i++){const kid=this.person(i===0?palette.coral:palette.mint);kid.position.set(3,0,-3.1+i*1.3);this.root.add(kid);}
    this.passenger=this.person(palette.coral);this.root.add(this.passenger);
    this.trafficCar=this.makeVehicle('car');this.trafficCar.scale.setScalar(.72);this.root.add(this.trafficCar);
    this.sideTrafficCar=this.makeVehicle('car');this.sideTrafficCar.scale.setScalar(.72);this.root.add(this.sideTrafficCar);
    this.box(1.5,.4,1.7,0xaaac99,8.8,.2,-4);this.label('觀察：通道狹窄',7,2,-7,3);
    this.improvement.visible=false;this.box(3,.12,3,0xf8d67b,0,.1,0,this.improvement);const ramp=this.box(1.8,.15,2,0x60a78f,0,.18,0,this.improvement);ramp.rotation.x=-.12;this.improvement.position.set(6,0,-4);this.root.add(this.improvement);
  }
  buildRoadDetails(){
    // Continuous walkable pavements frame the campus block; actual dimensions remain illustrative.
    for(const [x,w] of [[-28,58],[-8,40],[49.5,73]])this.box(w,.18,3.2,0xe4dbca,x,-.055,.3);
    for(const x of [-43,-33,38,48])this.box(3,.18,42,0xe4dbca,x,-.055,-13.5);
    for(const z of [-38,-26])this.box(92,.18,3,0xe4dbca,2,-.055,z);
    for(const z of [1.82,7.48])this.box(150,.12,.16,0xf6ead4,15,.06,z);
    for(const x of [-40.65,-35.35,40.35,45.65])this.box(.14,.12,42,0xf6ead4,x,.06,-13.5);
    for(const z of [-34.65,-29.35])this.box(85,.12,.16,0xf6ead4,2,.06,z);
    // The two pedestrian approaches are marked and separated from the vehicle lane.
    for(const {x,label} of [crossings[0]]){
      // Green-backed crossing is visible in the new main-gate and side-street photographs.
      this.box(2.8,.025,5.45,0x379e91,x,.045,4.5);
      for(let z=2.3;z<7;z+=.7)this.box(2.4,.038,.38,0xfff8e6,x,.055,z);
      for(const z of [1.25,7.85]){
        this.box(2.7,.045,.78,0xf2ce64,x,.07,z);
        for(const dx of [-.9,-.45,0,.45,.9])for(const dz of [-.22,.22])this.ball(.035,0xd8a947,x+dx,.11,z+dz);
      }
      this.label(label,x,2.5,9.2,3.8);
    }
    // The side entrance faces the separate Fuxing North Road block.
    this.box(5.2,.025,2.8,0x379e91,-38,.045,-8);
    for(let x=-40.2;x< -35.4;x+=.7)this.box(.38,.038,2.4,0xfff8e6,x,.055,-8);
    for(const x of [-41.25,-34.75])this.box(.78,.045,2.7,0xf2ce64,x,.07,-8);
    this.box(9,.06,2.8,0xd4cfb8,-30.5,.04,-8);
    this.label('復興北路側門步道・教學示意',-29,2.3,-8,6);
    this.addCrossingGuide('side','teacher','側門老師');
    this.addCrossingGuide('side','volunteer','側門志工');
    const sideSignals=signalPlacements.side;this.pedestrianSignal(sideSignals.pedestrian.x,sideSignals.pedestrian.z,sideSignals.pedestrian.facing);this.vehicleSignal(sideSignals.vehicle.x,sideSignals.vehicle.z,sideSignals.vehicle.facing);
    // Corner ramps and low-poly street furniture set the two-block walking scale.
    for(const x of [-33.5,38.5])for(const z of [-26,0]){const ramp=this.box(2.2,.1,1.8,0xe2d3b5,x,.02,z);ramp.rotation.x=z===0?.06:-.06;}
    for(const [x,z] of [[30,-17],[-48,-22],[54,-22],[-52,-29],[58,-29]]){this.box(5,3.8,4.8,0xdfd5bf,x,1.9,z);this.box(5.3,.28,5.1,0xb8c8b7,x,3.95,z);for(const wx of [-1.3,1.3])this.box(.9,1,.08,0x8db3bb,x+wx,2.6,z+2.45);}
  }
  loadStreetFurniture(){
    new GLTFLoader().load(`${import.meta.env.BASE_URL}models/street_furniture.glb`,gltf=>{
      const lamp=gltf.scene.getObjectByName('StreetLamp');
      const mainGate=gltf.scene.getObjectByName('MainSlidingGate');
      const sideGate=gltf.scene.getObjectByName('SideWaveGate');
      const waveWall=gltf.scene.getObjectByName('WaveWall');
      if(lamp){
        const positions:[number,number,number][]=[
          ...[-50,-34,-18,0,16,32,48,64,80].map(x=>[x,14.4,Math.PI/2] as [number,number,number]),
          ...[-30,-15,0,18,34].map(x=>[x,-1.5,-Math.PI/2] as [number,number,number]),
          ...[-20,-8].map(z=>[-32.1,z,Math.PI] as [number,number,number]),
          ...[-20,-8].map(z=>[37.1,z,0] as [number,number,number]),
          [-12,-25.1,Math.PI/2],[13,-25.1,Math.PI/2],
        ];
        for(const [x,z,rotation] of positions){const copy=lamp.clone(true);copy.position.set(x,0,z);copy.rotation.y=rotation;copy.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});this.root.add(copy);}
      }
      if(mainGate){const copy=mainGate.clone(true);copy.position.set(-6,0,-1.2);this.root.add(copy);this.label('安親班車行入口・學生止步',-6,3.2,-1.2,5.5);}
      if(sideGate){const copy=sideGate.clone(true);copy.position.set(-28,0,-8);copy.rotation.y=Math.PI/2;this.root.add(copy);}
      if(waveWall){const copy=waveWall.clone(true);copy.position.set(-30,0,-2);this.root.add(copy);}
      this.renderer.shadowMap.needsUpdate=true;this.container.dataset.streetAssets='loaded';
    },undefined,()=>{this.container.dataset.streetAssets='failed';this.label('路燈模型待載入',-6,2,13,3);});
  }
  buildExploreMarkers(){this.root.add(this.exploreMarkers);for(const site of exploreSites){const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(.66,.09,8,24),this.mat(0xf3c55e));ring.rotation.x=-Math.PI/2;ring.position.y=.11;g.add(ring);const pin=new THREE.Mesh(new THREE.ConeGeometry(.16,.38,7),this.mat(0x34705c));pin.position.y=1.1;g.add(pin);this.label(`${site.scenario.icon} ${site.scenario.label}`,0,1.9,0,3.3,g);g.position.set(site.entry.x,0,site.entry.z);g.userData.siteId=site.scenario.id;this.exploreMarkers.add(g);}}
  buildLandmarkVehicles(){this.root.add(this.landmarkVehicles);for(const [kind,x,z] of [['school_bus',30,9],['parent',-16,6],['parent',12,6],['scooter',-1,6.5],['scooter',-38,-14],['after_school_shuttle',-6,-5],['mrt',64,3]] as const){const vehicle=this.makeVehicle(kind);vehicle.position.set(x,0,z);if(kind!=='mrt'&&(z>=7||kind==='parent'||kind==='scooter'&&x===-1))vehicle.rotation.y=x>=0?-Math.PI/2:Math.PI/2;this.landmarkVehicles.add(vehicle);}}
  cone(x:number,z:number){this.box(.58,.1,.58,0xf37f44,x,.1,z);const cone=new THREE.Mesh(new THREE.ConeGeometry(.23,.75,8),this.mat(0xf4874c));cone.position.set(x,.5,z);cone.castShadow=true;this.root.add(cone);this.box(.24,.13,.24,0xfff9e6,x,.54,z);}
  chain(start:number,end:number){for(let z=start;z<end;z+=.15){const mesh=new THREE.Mesh(new THREE.TorusGeometry(.1,.022,4,7),this.mat(0xf2d56e));mesh.rotation.y=Math.PI/2;mesh.rotation.x=Math.round(z/.15)%2?Math.PI/3:0;mesh.position.set(1,.95,z);this.root.add(mesh);}}
  makeTrain(showLabel=true){const g=new THREE.Group();for(const offset of [-8,0,8]){const car=new THREE.Group();this.box(2.55,2.35,7.45,0xb4a0ca,0,1.47,0,car);this.box(2.55,.25,7.45,0x775e9b,0,2.75,0,car);for(const z of [-2.6,-1.5,1.45,2.55])for(const x of [-1.3,1.3])this.box(.04,.85,.8,0x83bfcc,x,2,z,car);this.box(.07,1.85,1.25,0xe8e3d0,-1.32,1.45,.1,car).userData.action='board';for(const z of [-2.4,2.4]){this.box(.4,.48,.65,0x34454e,0,.38,z,car);for(const x of [-1.23,1.23])this.wheel(.34,.2,x,.39,z,car,Math.sign(x));}car.position.z=offset;g.add(car);const wheels=(g.userData.wheels??=[]) as THREE.Group[];wheels.push(...(car.userData.wheels as THREE.Group[]));}if(showLabel)this.label('普通車・3 節車廂・示意',0,3.4,0,5,g);g.traverse(o=>{o.userData.vehicle=true;});return g;}
  makeVehicle(kind:string,showLabel=true){if(kind==='mrt')return this.makeTrain(showLabel);const g=new THREE.Group();if(kind==='scooter'){
      for(const z of [-1.05,1.05])this.wheel(.42,.22,0,.43,z,g);
      this.box(.72,.42,1.9,0x55a7a0,0,.66,0,g);this.box(.65,.22,.85,0x284c50,0,1,-.45,g);this.box(.12,1.05,.12,0x4e6264,0,1.1,.9,g);this.box(1.15,.12,.14,0x4e6264,0,1.6,.9,g);this.box(.55,.9,.12,0xe3e7dd,0,1.05,1.06,g);g.userData.brakeLights=[this.box(.45,.18,.08,0xc9493c,0,.91,-1.04,g)];const rider=this.person(0x547c91);rider.scale.setScalar(.62);rider.position.set(0,.62,.45);g.add(rider);if(showLabel)this.label('機車接送・示意',0,2.5,0,3,g);g.traverse(o=>{o.userData.vehicle=true;});return g;
    }const isCar=kind==='car'||kind==='parent',isShuttle=kind==='after_school_shuttle';const length=isCar?3.5:isShuttle?4.8:7.5;const color=isCar?palette.coral:kind==='school_bus'?palette.yellow:palette.mint;
    this.box(2.5,isCar?1.1:1.8,length,color,0,isCar?.9:1.4,0,g);this.box(2.4,isCar?.9:1,length*.73,0xf7f3de,0,isCar?1.7:2.6,-.2,g);this.box(2.43,.65,length*.64,0x85bdc9,0,isCar?1.7:2.65,-.2,g);this.box(2.5,.18,length*.79,color,0,isCar?2.2:3.2,-.2,g);
    for(const x of [-1.3,1.3])for(const z of [-length*.3,length*.3])this.wheel(.52,.25,x,.52,z,g,Math.sign(x));
    g.userData.brakeLights=[-1,1].map(side=>this.box(.38,.19,.08,0xc74739,side*.88,1.08,-length/2-.05,g));
    if(kind==='parent')for(const [x,z,shirt] of [[-.58,-.35,0x547c91],[.58,.65,0x5b7f83]] as const){const rider=this.person(shirt);rider.scale.setScalar(.48);rider.position.set(x,.9,z);g.add(rider);}
    this.box(.08,1.8,1,0x244e50,-1.3,1.45,1,g).userData.action='board';if(showLabel)this.label(isCar?'短暫停靠・示意':kind==='school_bus'?'校車 01・校門外':isShuttle?'★ 01 安親班':'示意路線 01',0,3.7,0,4,g);
    g.traverse(o=>{o.userData.vehicle=true;});return g;
  }
  private buildRideView(){
    this.rideScene.background=new THREE.Color(0xcbe8dc);
    this.rideScene.add(new THREE.AmbientLight(0xffffff,2));
    const sun=new THREE.DirectionalLight(0xffffff,2.3);sun.position.set(6,10,7);this.rideScene.add(sun);
    this.rideScene.add(this.rideRoad,this.rideTrack);
    this.box(12,.12,42,0x586c76,0,-.11,0,this.rideRoad);
    for(const x of [-5.8,5.8])this.box(.15,.02,42,0xf5e9c5,x,-.03,0,this.rideRoad);
    for(const z of [-15,-9,-3,3,9,15])for(const x of [-3.5,3.5]){const line=this.box(.12,.025,2.3,0xffefd1,x,-.025,z,this.rideRoad);line.userData.baseZ=z;this.rideLines.push(line);}
    this.box(5.2,.14,42,0x879087,0,-.14,0,this.rideTrack);
    for(const z of [-18,-16.5,-15,-13.5,-12,-10.5,-9,-7.5,-6,-4.5,-3,-1.5,0,1.5,3,4.5,6,7.5,9,10.5,12,13.5,15,16.5,18]){const sleeper=this.box(4.2,.12,.32,0x806c57,0,-.045,z,this.rideTrack);sleeper.userData.baseZ=z;this.rideSleepers.push(sleeper);}
    for(const x of [-1.15,1.15])this.box(.12,.16,42,0xd6dedc,x,.13,0,this.rideTrack);
    this.rideTrack.visible=false;
    this.rideCamera.position.set(7,3.6,8);this.rideCamera.lookAt(0,1.05,0);
  }
  private renderRideView(j:Journey|undefined,dt:number){
    const overlay=document.getElementById('ride-view');
    const active=!!j&&j.rideAt!==null&&!j.facts.vehicleStopped&&!['parent','scooter'].includes(j.scenario.mode)&&!!overlay&&!overlay.hidden;
    this.container.dataset.ridePreview=active?'moving':'off';
    if(!active||!j||!overlay)return;
    if(this.rideMode!==j.scenario.mode){
      this.rideScene.remove(this.rideVehicle);
      this.rideVehicle.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(o.material instanceof THREE.Material)o.material.dispose();}});
      this.rideVehicle=this.makeVehicle(j.scenario.mode,false);this.rideScene.add(this.rideVehicle);this.rideMode=j.scenario.mode;this.rideDistance=0;
      this.rideRoad.visible=j.scenario.mode!=='mrt';this.rideTrack.visible=j.scenario.mode==='mrt';
      this.rideCamera.fov=j.scenario.mode==='mrt'?55:46;this.rideCamera.updateProjectionMatrix();
    }
    const distance=dt*(j.scenario.mode==='mrt'?5.2:4.2);this.rideDistance+=distance;
    for(const line of this.rideLines)line.position.z=((Number(line.userData.baseZ)+this.rideDistance+18)%36)-18;
    for(const sleeper of this.rideSleepers)sleeper.position.z=((Number(sleeper.userData.baseZ)+this.rideDistance+19.5)%39)-19.5;
    for(const wheel of (this.rideVehicle.userData.wheels??[]) as THREE.Group[])wheel.rotation.x+=distance/(wheel.userData.radius as number);
    this.rideVehicle.position.y=this.reduced?0:Math.sin(this.rideDistance*2)*.025;
    this.container.dataset.rideWheelAngle=this.wheelAngle(this.rideVehicle);
    const canvas=this.renderer.domElement.getBoundingClientRect(),box=overlay.getBoundingClientRect();
    const x=box.left-canvas.left,y=canvas.bottom-box.bottom,w=box.width,h=box.height;
    this.rideCamera.aspect=w/h;this.rideCamera.updateProjectionMatrix();
    this.renderer.setViewport(x,y,w,h);this.renderer.setScissor(x,y,w,h);this.renderer.setScissorTest(true);
    this.renderer.render(this.rideScene,this.rideCamera);
    this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,canvas.width,canvas.height);
  }
  buildCabin(){
    this.root.add(this.transportCabin,this.scooterCabin);
    this.box(7,.25,9,0xe5d7bb,110,-.1,0,this.transportCabin);this.box(.2,2.4,9,palette.mint,106.5,1.2,0,this.transportCabin);this.box(.2,2.4,9,palette.mint,113.5,1.2,0,this.transportCabin);this.box(7,1.5,.2,palette.mint,110,.8,-4.5,this.transportCabin);
    for(const x of [108.5,111.5])for(const z of [-3,-1,1]){const seat=this.box(1.05,.35,.9,palette.blue,x,.6,z,this.transportCabin);this.box(1.05,1.1,.2,palette.blue,x,1.1,z-.4,this.transportCabin);seat.userData.action='seat';seat.userData.correctSeat=x===108.5&&z===-1;this.label(x===108.5&&z===-1?'02A':'其他座位',x,1.8,z,1.6,this.transportCabin);this.objects.push(seat);}
    this.box(.12,2.7,.12,palette.yellow,110,1.4,0,this.transportCabin).userData.action='rail';this.box(.35,.35,.2,0xf18b65,110,1.4,2,this.transportCabin).userData.action='card';this.label('感應 / 車門',110,2.5,2.8,2.8,this.transportCabin);this.label('車廂教學示意',110,3.3,-3.5,4,this.transportCabin);
    const driver=this.person(0x355b5d);driver.position.set(111.5,0,-3.6);this.transportCabin.add(driver);this.label('司機',111.5,2.3,-3.6,1.5,this.transportCabin);
    this.belt=this.box(1.1,.09,.1,palette.yellow,108.5,1,-.65,this.transportCabin);this.belt.visible=false;
    this.box(7,.2,9,palette.path,120,-.13,0,this.scooterCabin);const trainingScooter=this.makeVehicle('scooter');trainingScooter.position.set(120,0,0);this.scooterCabin.add(trainingScooter);this.label('機車送學・依序停妥再下車',120,3.3,-3.5,6,this.scooterCabin);
    this.root.add(this.parentCabin);
    this.box(4,.2,6,0xe1d6bb,130,-.13,0,this.parentCabin);
    this.box(.15,1.25,6,0xe89977,128,1.05,0,this.parentCabin);this.box(.15,1.25,6,0xe89977,132,1.05,0,this.parentCabin);
    this.box(4,1.15,.16,0xe89977,130,.95,-3,this.parentCabin);for(const x of [128,132])this.box(.12,.15,6,0x96c6ce,x,2.16,0,this.parentCabin);
    this.box(1.05,.35,1.15,palette.blue,130,.65,-1,this.parentCabin);this.box(1.05,.95,.16,palette.blue,130,1.05,-1.55,this.parentCabin);
    this.box(.12,1.1,1.45,0xffefd6,127.9,1.05,-.65,this.parentCabin).userData.action='alight';
    this.parentBelt=this.box(1.05,.09,.1,palette.yellow,130,1,-.65,this.parentCabin);
    const parentDriver=this.person(0x5b7f83);parentDriver.position.set(131,0,-2.3);this.parentCabin.add(parentDriver);
    this.label('家長汽車・停穩後看後方再下車',130,2.8,-2.1,5,this.parentCabin);
  }
  buildStation(){
    this.box(16,.4,26,0xd7dfda,55,-.3,3);this.box(5,.15,26,0x576674,64,-.08,3);this.box(.18,.02,23,palette.yellow,60.6,.04,3);
    for(const x of [49,60])for(const z of [-9,15])this.box(.3,4,.3,palette.green,x,2,z);
    this.box(13,.25,4,palette.green,54.5,4.2,-6);
    // Keep the station open toward the player: a solid building hid the child and fare gate.
    for(const x of [48.2,55.8])this.box(.3,3.5,.3,palette.green,x,1.75,5.2);
    this.stationRoof=this.box(9,.28,7,0x4d876d,52,3.75,8);
    const stationRoofMaterial=this.stationRoof.material as THREE.MeshStandardMaterial;
    stationRoofMaterial.transparent=true;stationRoofMaterial.opacity=.32;stationRoofMaterial.depthWrite=false;
    this.label('捷運站入口・示意',52,4.2,10,4.5);this.box(1.4,1.3,.35,0x477b72,55,1,7).userData.action='card';this.label('刷卡閘門',55,2.2,7,2.5);
    this.box(7,.2,7,0xbfcbbd,56,.1,4);this.label('A8 方向普通車',55,3.2,-5,6);this.label('月台方向為教學示意',55,2.3,-5,6);this.label('先下後上',58,2,3,3);
    for(let z=2;z<6;z+=1)this.box(1,.02,.15,palette.yellow,59,.04,z);
    const officer=this.person(palette.mint);officer.position.set(57,0,3);this.root.add(officer);this.label('站務協助',57,2.3,3,2.5);
  }
  buildDestination(){
    this.box(14,.3,18,palette.path,82,-.2,-1);this.box(5,4,3,palette.cream,80,2,-8);this.box(6,.3,4,palette.coral,80,4.1,-8);this.label('示意目的地・安全交接區',80,3,-5,6);this.label('非真實安親班或住址',80,2,-5,5);this.box(6,.03,9,0xc7dac8,80,.04,0);
    const adult=this.person(0xf1a758);adult.position.set(78,0,-4);this.root.add(adult);
  }
  buildMarker(){const ring=new THREE.Mesh(new THREE.TorusGeometry(.7,.07,7,32),this.mat(palette.yellow));ring.rotation.x=-Math.PI/2;ring.position.y=.08;this.marker.add(ring);const pointer=new THREE.Mesh(new THREE.ConeGeometry(.19,.4,5),this.mat(palette.yellow));pointer.rotation.z=Math.PI;pointer.position.y=2.6;this.marker.add(pointer);this.marker.userData.target=true;}
  private updateLabels(point:Point|undefined){
    const nearby:{sprite:THREE.Sprite;distance:number}[]=[];
    for(const sprite of this.labels){
      const wasVisible=sprite.visible;sprite.visible=false;
      if(!point||this.overview)continue;
      let parent:THREE.Object3D|null=sprite.parent;let parentVisible=true;
      while(parent){if(!parent.visible){parentVisible=false;break;}parent=parent.parent;}
      if(!parentVisible)continue;
      sprite.getWorldPosition(this.labelPosition);
      const distance=Math.hypot(this.labelPosition.x-point.x,this.labelPosition.z-point.z);
      if(distance<=(wasVisible?8:6.5))nearby.push({sprite,distance:distance-(wasVisible?.35:0)});
    }
    nearby.sort((a,b)=>a.distance-b.distance);
    const visible=nearby.slice(0,this.camera.aspect<.7?1:2);
    for(const item of visible)item.sprite.visible=true;
    this.container.dataset.visibleLabels=String(visible.length);
    this.container.dataset.nearbyLabels=visible.map(item=>String(item.sprite.userData.labelText)).join('｜');
  }
  resize(){const {clientWidth:w,clientHeight:h}=this.container;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
  pick(clientX:number,clientY:number):{action?:string;correctSeat?:boolean;target?:boolean;vehicle?:boolean}{const rect=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),this.camera);const hits=this.ray.intersectObjects(this.scene.children,true);for(const hit of hits){let obj:THREE.Object3D|null=hit.object;while(obj){if(obj.userData.action||obj.userData.target||obj.userData.vehicle)return obj.userData;obj=obj.parent;}if(hit.object instanceof THREE.Mesh)break;}return {};}
  waveTeacher(side:boolean){this.teacherWaveUntil[side?'side':'main']=this.clock+2;}
  render(j:Journey|undefined,dt:number,explore?:Point,exploreTarget?:Point){
    this.clock+=dt;
    const playerPosition=j?.position??explore;
    this.stationRoof.visible=!(playerPosition&&playerPosition.x>47&&playerPosition.x<57&&playerPosition.z>4.5&&playerPosition.z<12);
    if(!this.low&&Math.floor(this.clock)!==Math.floor(this.clock-dt))this.renderer.shadowMap.needsUpdate=true;
    this.exploreMarkers.visible=!j;
    this.landmarkVehicles.visible=!j;
    const phase=(j?.elapsed??this.clock)%18;const pedestrianGreen=!!j&&(!!j.facts.green||j.facts.crossing===true)||!j&&phase>=6&&phase<15;
    const baseGuideProgress=guideDirectionProgress(phase,pedestrianGreen);
    for(const guide of this.guides){
      let progress=baseGuideProgress;
      if(guide.role==='teacher'&&j&&!j.reverse&&(j.scenario.id==='walk_side'?'side':'main')===guide.crossing){
        const road=guide.crossing==='side'?otherRoads[0]:frontRoad;
        const fraction=guide.crossing==='side'?(j.position.x-road.minX)/(road.maxX-road.minX):(road.maxZ-j.position.z)/(road.maxZ-road.minZ);
        if(j.facts.crossing===true||j.facts.crossed===true)progress=receivingTeacherProgress(progress,fraction,j.facts.crossed===true);
      }
      guide.group.position.set(guide.route.home.x+(guide.route.direct.x-guide.route.home.x)*progress,progress>0&&progress<1&&!this.reduced?Math.sin(this.clock*12)*.035:0,guide.route.home.z+(guide.route.direct.z-guide.route.home.z)*progress);
      const waving=guide.role==='teacher'&&this.teacherWaveUntil[guide.crossing]>this.clock;
      guide.arm.rotation.z=waving?1.1+Math.sin(this.clock*14)*.2:progress>.8?.9+Math.sin(this.clock*4)*.08:0;
      const stride=progress>0&&progress<1&&!this.reduced?Math.sin(this.clock*11)*.28:0;
      guide.legs[0].rotation.x=stride;guide.legs[1].rotation.x=-stride;
    }
    const mainTeacher=this.guides.find(guide=>guide.crossing==='main'&&guide.role==='teacher')!;
    const mainVolunteer=this.guides.find(guide=>guide.crossing==='main'&&guide.role==='volunteer')!;
    const sideTeacher=this.guides.find(guide=>guide.crossing==='side'&&guide.role==='teacher')!;
    const sideVolunteer=this.guides.find(guide=>guide.crossing==='side'&&guide.role==='volunteer')!;
    this.container.dataset.mainTeacherZ=mainTeacher.group.position.z.toFixed(2);
    this.container.dataset.mainVolunteerZ=mainVolunteer.group.position.z.toFixed(2);
    this.container.dataset.sideTeacherX=sideTeacher.group.position.x.toFixed(2);
    this.container.dataset.sideVolunteerX=sideVolunteer.group.position.x.toFixed(2);
    this.container.dataset.guides=baseGuideProgress>.8?'directing':baseGuideProgress>0?'walking':'sidewalk';
    this.showSignals(pedestrianGreen,!pedestrianGreen);
    const approachRemaining=(1-Math.min(phase/6,1))**2;
    // Leave a visible buffer between stopped traffic, guides, and each crosswalk.
    const mainStopX=12.5,sideStopZ=-2.5;
    const mainCarX=pedestrianGreen?mainStopX:phase<6?mainStopX+8.5*approachRemaining:phase>=15?mainStopX-(phase-15)*8:mainStopX;
    const sideCarZ=pedestrianGreen?sideStopZ:phase<6?sideStopZ+6*approachRemaining:phase>=15?sideStopZ-(phase-15)*7:sideStopZ;
    this.trafficCar.position.set(mainCarX,0,4.5);this.trafficCar.rotation.y=-Math.PI/2;
    this.sideTrafficCar.position.set(-38,0,sideCarZ);this.sideTrafficCar.rotation.y=Math.PI;
    this.container.dataset.mainCarX=mainCarX.toFixed(2);this.container.dataset.sideCarZ=sideCarZ.toFixed(2);
    this.rollVehicle(this.trafficCar,dt);this.rollVehicle(this.sideTrafficCar,dt);
    const intersectionBraking=pedestrianGreen||phase>=4.5&&phase<6;
    this.setBrakes(this.trafficCar,intersectionBraking);this.setBrakes(this.sideTrafficCar,intersectionBraking);
    this.container.dataset.mainCar=pedestrianGreen?'stopped':'moving';this.container.dataset.sideCar=pedestrianGreen?'stopped':'moving';
    this.container.dataset.mainWheelAngle=this.wheelAngle(this.trafficCar);this.container.dataset.sideWheelAngle=this.wheelAngle(this.sideTrafficCar);
    this.container.dataset.mainBrake=String(intersectionBraking);this.container.dataset.sideBrake=String(intersectionBraking);
    if(j){
      const modeChanged=this.lastMode!==j.scenario.mode;
      if(modeChanged){this.root.remove(this.vehicle);this.vehicle.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(o.material instanceof THREE.Material)o.material.dispose();}if(o instanceof THREE.Sprite){this.labels.delete(o);o.material.map?.dispose();o.material.dispose();}});this.vehicle=this.makeVehicle(j.scenario.mode);this.root.add(this.vehicle);this.lastMode=j.scenario.mode;}
      const stop=j.vehiclePosition;this.vehicle.visible=!!stop;if(stop)this.vehicle.position.set(j.position.x>70&&!j.inside?86:stop.x,0,j.position.x>70&&!j.inside?1:stop.z);this.vehicle.rotation.y=stop&&(stop.z>=7||j.scenario.mode==='parent'||j.scenario.id==='scooter_main')?(stop.x>=0?-Math.PI/2:Math.PI/2):0;
      if(stop)this.rollVehicle(this.vehicle,dt);else this.wheelOrigins.delete(this.vehicle);
      const vehicleBraking=!!stop&&j.departAt===null&&(j.facts.vehicleStopped===true||j.rideAt===null&&j.vehicleProgress>.65);
      this.setBrakes(this.vehicle,vehicleBraking);this.container.dataset.vehicleWheelAngle=this.wheelAngle(this.vehicle);this.container.dataset.vehicleBrake=String(vehicleBraking);
      const parentArrival=j.scenario.mode==='parent'&&j.inside&&j.current?.id==='park'&&!!stop;
      this.container.dataset.parentArrivalView=String(parentArrival);
      const scooterInside=j.scenario.mode==='scooter'&&j.inside;
      this.avatar.visible=!parentArrival;
      if(scooterInside&&stop){const main=j.scenario.id==='scooter_main';this.avatar.position.set(stop.x-(main?.5:0),.62,stop.z-(main?0:.5));this.avatar.rotation.y=this.vehicle.rotation.y;this.avatar.scale.setScalar(.62);}
      else{this.avatar.position.set(j.position.x,!this.reduced&&j.stoppedFor===0?Math.sin(this.clock*11)*.045:0,j.position.z);this.avatar.scale.setScalar(1);}
      this.transportCabin.visible=!['parent','scooter'].includes(j.scenario.mode);this.scooterCabin.visible=false;this.parentCabin.visible=j.scenario.mode==='parent'&&!parentArrival;this.belt.visible=j.scenario.mode!=='parent'&&!!j.facts.buckled;this.parentBelt.visible=j.scenario.mode==='parent'&&!!j.facts.buckled;this.helmet.visible=j.scenario.mode==='scooter'&&!!j.facts.helmeted;
      const lead=j.scenario.mode==='scooter'&&j.elapsed<3&&j.departAt===null;
      this.leadScooter.visible=lead;
      if(lead){const stopPoint=j.scenario.stop!;this.leadScooter.position.set(j.scenario.id==='scooter_side'?stopPoint.x:stopPoint.x+j.elapsed*10/3,0,j.scenario.id==='scooter_side'?stopPoint.z-j.elapsed*8/3:stopPoint.z);this.leadScooter.rotation.y=j.scenario.id==='scooter_side'?Math.PI:Math.PI/2;this.rollVehicle(this.leadScooter,dt);}else this.wheelOrigins.delete(this.leadScooter);
      this.container.dataset.scooterQueue=j.scenario.mode==='scooter'?(lead?'lead-departing':j.facts.vehicleStopped?'stopped':'arriving'):'off';
      this.container.dataset.scooterLeadX=lead?this.leadScooter.position.x.toFixed(2):'';
      this.container.dataset.scooterLeadWheelAngle=this.wheelAngle(this.leadScooter);
      this.gate.visible=!j.gateOpen;
      this.passenger.position.set(j.scenario.mode==='after_school_shuttle'?3:j.scenario.start.x+1,0,j.scenario.mode==='after_school_shuttle'?-6.7:j.scenario.mode==='scooter'?j.scenario.start.z:11);this.passenger.visible=j.queueAt!==null&&!j.facts.studentTurn;
      const target=j.current?.target??j.position;this.marker.visible=!j.complete&&!scooterInside&&!parentArrival;this.marker.position.set(target.x,0,target.z);this.marker.rotation.y=this.reduced?0:this.clock*.5;
      this.improvement.visible=j.scenario.mode==='human'&&j.index>=3;
      const desired=new THREE.Vector3(j.position.x-1.5,0,j.position.z*.5-1);
      if(j.scenario.id==='walk_side'&&j.index<3&&j.position.x< -40)desired.set(-36,0,-16);
      if(parentArrival)desired.set(stop!.x,0,stop!.z);
      else if(j.inside)desired.set(scooterInside?(lead?(this.avatar.position.x+this.leadScooter.position.x)/2:this.avatar.position.x):j.scenario.mode==='parent'?130:110,0,scooterInside?(lead?(this.avatar.position.z+this.leadScooter.position.z)/2:this.avatar.position.z):0);
      if(j.position.x>70&&!j.inside)desired.set(81,0,-1);
      if(j.scenario.mode==='mrt'&&j.position.x>45&&j.position.x<70)desired.set(j.position.x,0,j.position.z);
      // Camera follows a scene transition immediately, rather than flying across unrelated scenes.
      this.focus.lerp(desired,this.reduced||modeChanged||this.focus.distanceTo(desired)>18?1:Math.min(dt*4,1));
    }else if(explore){
      this.avatar.visible=true;this.avatar.position.set(explore.x,0,explore.z);this.avatar.scale.setScalar(1);this.helmet.visible=false;this.transportCabin.visible=false;this.scooterCabin.visible=false;this.parentCabin.visible=false;this.vehicle.visible=false;this.leadScooter.visible=false;this.container.dataset.scooterQueue='off';this.container.dataset.parentArrivalView='false';this.passenger.visible=false;this.gate.visible=true;this.marker.visible=!!exploreTarget;if(exploreTarget)this.marker.position.set(exploreTarget.x,0,exploreTarget.z);
      const desired=new THREE.Vector3(explore.x-1.5,0,explore.z*.5-1);if(explore.x< -40&&explore.z<0)desired.set(-36,0,-16);this.focus.lerp(desired,this.focus.distanceTo(desired)>18?1:Math.min(dt*4,1));
    }
    const portrait=this.camera.aspect<.8;
    if(!j&&this.overview){
      this.focus.set(portrait?-10:-8,0,-13);const range=portrait?(this.camera.aspect<.6?90:66):43;
      this.camera.position.set(this.focus.x+range*.34,range*1.38,this.focus.z+range*.95);
    }else{
      const distance=(j?.inside?(j.scenario.mode==='scooter'?25:j.scenario.mode==='parent'&&j.current?.id==='park'?21:17):this.distance)*(portrait?1.28:1);
      this.camera.position.set(this.focus.x+Math.sin(this.yaw)*distance,this.focus.y+distance*.88,this.focus.z+Math.cos(this.yaw)*distance);
    }
    this.updateLabels(j?.scenario.mode==='scooter'&&j.inside?{x:this.avatar.position.x,z:this.avatar.position.z}:j?.position??explore);
    this.scene.fog=!j&&this.overview?null:this.mapFog;
    this.camera.lookAt(this.focus.x,0,this.focus.z);this.renderer.render(this.scene,this.camera);this.renderRideView(j,dt);
  }
  face(from:Point,to:Point){this.avatar.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);}
  quality(low:boolean){this.low=low;this.renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.7));this.renderer.shadowMap.enabled=!low;this.resize();}
}
