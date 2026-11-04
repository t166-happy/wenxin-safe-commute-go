import { rules } from './rules';
export type Facts = Record<string, boolean | undefined>;
export interface Evaluation {
  allowed:boolean; ruleId:string; hazardId:string; severity:'critical';
  explanationId:string; correctiveActionId:string; checkpointId:string; message:string;
}
export class SafetyRuleEvaluator {
  evaluate(ruleId:string, facts:Facts, checkpointId='safe-wait'):Evaluation {
    const rule=rules[ruleId];
    return {allowed:!!rule && rule.predicates.every(key=>facts[key]===true),ruleId,hazardId:`hazard-${ruleId}`,severity:'critical',explanationId:rule?.explanationId??'unknown.why',correctiveActionId:rule?.correctiveActionId??'unknown.how',checkpointId,message:rule?.ruleText??'資料不完整，先停在安全區，請依現場老師及交通設施指示。'};
  }
}
