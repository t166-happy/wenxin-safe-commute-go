import type {Evaluation} from '../safety/evaluator';
import {createSessionId} from './session-id';
export interface SafetyEvent {sessionId:string;sceneId:string;ruleId:string;hazardId:string;severity:string;explanationId:string;correctiveActionId:string;checkpointId:string;eventType:'safe_action'|'unsafe_attempt'|'hint_viewed'|'retry_success';feedbackShown:boolean;timestampMs:number;stageId:string}
const KEY='wenxin-safety-v1';
export class EvidenceCollector {
  events:SafetyEvent[]=[];
  sessionId=createSessionId();
  private start=performance.now();
  constructor(){try{const data:unknown=JSON.parse(localStorage.getItem(KEY)??'[]');if(Array.isArray(data))this.events=data.filter(e=>e&&typeof e.ruleId==='string'&&typeof e.sceneId==='string').slice(-2000);}catch{/* Empty local history when unavailable. */}}
  record(sceneId:string,stageId:string,result:Evaluation,hint=false){
    const prior=this.events.filter(e=>e.sessionId===this.sessionId&&e.sceneId===sceneId&&e.stageId===stageId&&e.ruleId===result.ruleId);
    const retry=prior.some(e=>e.eventType==='unsafe_attempt');
    this.events.push({sessionId:this.sessionId,sceneId,stageId,ruleId:result.ruleId,hazardId:result.hazardId,severity:result.severity,explanationId:result.explanationId,correctiveActionId:result.correctiveActionId,checkpointId:result.checkpointId,eventType:hint?'hint_viewed':result.allowed?(retry?'retry_success':'safe_action'):'unsafe_attempt',feedbackShown:hint||!result.allowed,timestampMs:Math.round(performance.now()-this.start)});
    this.events=this.events.slice(-2000);try{localStorage.setItem(KEY,JSON.stringify(this.events));}catch{/* Gameplay remains usable in private browsing. */}
  }
  clear(){this.events=[];this.sessionId=createSessionId();this.start=performance.now();try{localStorage.removeItem(KEY);}catch{/* Storage is optional. */}}
  export(format:'json'|'csv'){
    const keys: (keyof SafetyEvent)[]=['sessionId','sceneId','stageId','ruleId','hazardId','severity','explanationId','correctiveActionId','checkpointId','eventType','feedbackShown','timestampMs'];
    const body=format==='json'?JSON.stringify({version:'V2.4-prototype',events:this.events},null,2):'\uFEFF'+[keys.join(','),...this.events.map(e=>keys.map(k=>JSON.stringify(String(e[k]))).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob([body],{type:format==='json'?'application/json':'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`wenxin-anonymous.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
}
