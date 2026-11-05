import type {Evaluation} from './evaluator';
export const corrective:Record<string,[string,string]>={
  cross:['✋ 在路緣停下','👀 左右觀察 → 等綠燈與停讓'],
  barrier:['🚶 留在左側步道','🚪 沿鏈條走到成人管理的登車口'],
  sideBarrier:['✋ 停在側門學生步道','🚶 沿錐鏈內側繞過停車區走向校舍'],
  gate:['🔎 核對車號、依序排隊','🧑 等停妥、無車流、成人放行'],
  board:['✋ 退回候車區','🧑 等開門與引導，再依序上車'],
  parentPark:['🛑 坐好並等家長短暫停妥','🚶 停靠處不得占住人行通道'],
  parentRear:['👀 先看車門後方的來車與自行車','✋ 有車接近時先等'],
  parentSide:['🚪 選靠人行道的安全側車門','👀 再確認後方淨空'],
  parentAlight:['🛑 停妥、解帶並觀察後方','🚶 從人行道側下車'],
  parentClear:['🚪 在安全處關好車門','🚶 走到人行道，讓車儘速駛離'],
  scooterArrival:['🛵 前車離開後依序停靠','🛑 完全停妥才準備下車'],
  scooterRear:['👀 看後方車輛與行人','✋ 有車接近時先等'],
  scooterAlight:['🛑 坐穩等停妥與成人確認','🚶 從人行道側下車'],
  scooterClear:['🚶 離開機車停靠點','🛵 機車依序駛離、不與汽車混流'],
  platform:['✋ 站在安全線後','🚈 先下後上；關門時等下一班'],
  improve:['♿ 保留通道','🔎 移到不遮視線的位置'],
};
export function feedbackSteps(result:Evaluation):[string,string]{return corrective[result.ruleId]??['✋ 回到安全等待點',`✓ ${result.message}`];}
