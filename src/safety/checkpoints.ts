export interface Point {x:number;z:number}
export interface Box {minX:number;maxX:number;minZ:number;maxZ:number}
export const RADIUS=0.32;
// Swept segment against expanded AABB: diagonal movement and large deltas cannot tunnel.
export function intersects(from:Point,to:Point,box:Box,radius=RADIUS):boolean {
  let low=0,high=1;
  for(const axis of ['x','z'] as const){
    const min=(axis==='x'?box.minX:box.minZ)-radius;
    const max=(axis==='x'?box.maxX:box.maxZ)+radius;
    const delta=to[axis]-from[axis];
    if(Math.abs(delta)<1e-9){if(from[axis]<min||from[axis]>max)return false;}
    else {const a=(min-from[axis])/delta,b=(max-from[axis])/delta;low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));if(low>high)return false;}
  }
  return true;
}
export const chainWalls:Box[]=[
  {minX:0.8,maxX:1.2,minZ:-14,maxZ:-6.2},
  {minX:0.8,maxX:1.2,minZ:-3.8,maxZ:-1.2},
  {minX:-12,maxX:1,minZ:-14,maxZ:-13.6},
  {minX:-3,maxX:1,minZ:-1.6,maxZ:-1.2},
];
export const gateWall:Box={minX:0.8,maxX:1.2,minZ:-6.2,maxZ:-3.8};
export function chainCollision(from:Point,to:Point,gateOpen:boolean):boolean {
  return [...chainWalls,...(gateOpen?[]:[gateWall])].some(box=>intersects(from,to,box));
}
