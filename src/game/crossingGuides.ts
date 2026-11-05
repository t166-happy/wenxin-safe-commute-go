import type {Point} from '../safety/checkpoints';

export type CrossingGuideId='main'|'side';
export type CrossingGuideRole='teacher'|'volunteer';
export interface GuideRoute {home:Point;direct:Point;facing:number}

// Teaching-scale guide positions. Staff stay to either side of the marked
// student corridor; actual duty positions require school confirmation.
export const crossingGuideRoutes:Record<CrossingGuideId,Record<CrossingGuideRole,GuideRoute>>={
  main:{
    teacher:{home:{x:4,z:.2},direct:{x:4.55,z:4.5},facing:0},
    volunteer:{home:{x:10,z:8.8},direct:{x:7.45,z:4.5},facing:Math.PI},
  },
  side:{
    teacher:{home:{x:-33,z:-6},direct:{x:-38,z:-6.55},facing:-Math.PI/2},
    volunteer:{home:{x:-42.7,z:-10.5},direct:{x:-38,z:-9.45},facing:Math.PI/2},
  },
};

const clamp=(value:number)=>Math.max(0,Math.min(1,value));

// The adults enter only during the protected green window, then clear the
// crossing before the vehicle signal can change to green at phase 15.
export function guideDirectionProgress(phase:number,pedestrianGreen:boolean){
  if(!pedestrianGreen||phase<6||phase>=15)return 0;
  return clamp(Math.min((phase-6)/1.4,(15-phase)/1.8));
}

// The receiving-side teacher returns to the sidewalk as the student arrives,
// so the existing post-crossing greeting remains a real nearby interaction.
export function receivingTeacherProgress(base:number,crossingFraction:number,crossed:boolean){
  return crossed?0:base*clamp((1-clamp(crossingFraction))/.6);
}
