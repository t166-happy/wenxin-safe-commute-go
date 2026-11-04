import {intersects,type Box,type Point} from '../safety/checkpoints';

// Teaching-scale coordinates. The gate locations and exact street geometry await a site survey.
export const crossings=[
  {id:'main',x:6,z:4.5,label:'正門路口'},
  {id:'side',x:-38,z:-8,label:'復興北路側門路口・示意'},
] as const;
export const sidewalkRegions:Box[]=[
  {minX:-57,maxX:86,minZ:7.4,maxZ:14},       // 文昌五街南側
  {minX:-35,maxX:40,minZ:-1.2,maxZ:1.7},   // 圍牆與車道間的連續校側人行道
  {minX:-35,maxX:-32,minZ:-27.5,maxZ:1.7}, // 西側街區內側
  {minX:37,maxX:40,minZ:-27.5,maxZ:1.7},   // 東側街區內側
  {minX:-35,maxX:40,minZ:-27.5,maxZ:-24.5},// 復興一路南側
  {minX:-44,maxX:-41.2,minZ:-29.5,maxZ:7.4}, // 西側街區外側
  {minX:46.2,maxX:49,minZ:-29.5,maxZ:7.4},   // 東側街區外側
  {minX:-43,maxX:49,minZ:-39,maxZ:-35.5},  // 復興一路北側
  {minX:-35,maxX:-26,minZ:-9.4,maxZ:-6.6}, // 復興北路側門專用行人通道
];
export const frontRoad:Box={minX:-57,maxX:86,minZ:2,maxZ:7.3};
export const otherRoads:Box[]=[
  {minX:-40.5,maxX:-35.5,minZ:-35,maxZ:7.3},
  {minX:40.5,maxX:45.5,minZ:-35,maxZ:7.3},
  {minX:-43,maxX:49,minZ:-34.5,maxZ:-29.5},
];
export const campusArea:Box={minX:-28,maxX:12,minZ:-13.2,maxZ:-1.2};
// Teaching-scale school perimeter. Openings align only with the main pedestrian gate,
// the Fuxing North side pedestrian gate, and the controlled vehicle entrance.
export const campusWalls:Box[]=[
  {minX:-28,maxX:-8.5,minZ:-1.35,maxZ:-1.05},
  {minX:-3.5,maxX:4,minZ:-1.35,maxZ:-1.05},
  {minX:8,maxX:12,minZ:-1.35,maxZ:-1.05},
  {minX:-28.2,maxX:-27.8,minZ:-27.5,maxZ:-10.4},
  {minX:-28.2,maxX:-27.8,minZ:-5.6,maxZ:-1.05},
  {minX:11.8,maxX:12.2,minZ:-27.5,maxZ:-1.05},
  {minX:-28,maxX:12,minZ:-27.7,maxZ:-27.3},
];
export const campusVehicleGate:Box={minX:-8.5,maxX:-3.5,minZ:-1.35,maxZ:-1.05};
export const campusParkingArea:Box={minX:-25,maxX:-15.5,minZ:-12.5,maxZ:-1.5};
export function hitsCampusWall(from:Point,to:Point){return campusWalls.some(wall=>intersects(from,to,wall));}
export function crossesVehicleGate(from:Point,to:Point){return intersects(from,to,campusVehicleGate);}
export function inBox(point:Point,box:Box){return point.x>=box.minX&&point.x<=box.maxX&&point.z>=box.minZ&&point.z<=box.maxZ;}
export function onPedestrianSpace(point:Point){return inBox(point,campusArea)||sidewalkRegions.some(box=>inBox(point,box));}
export function crossingAt(x:number){return Math.abs(x-crossings[0].x)<1.2?crossings[0]:undefined;}
export function onMarkedCrosswalk(point:Point){return (Math.abs(point.x-crossings[0].x)<1.2&&point.z>=1.7&&point.z<7.4)||(point.x>=-41.5&&point.x<=-35&&Math.abs(point.z-crossings[1].z)<1.2);}
