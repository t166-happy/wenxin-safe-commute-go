# 遊戲資料結構與程式契約

## 建議 TypeScript 核心型別
```ts
type VerificationStatus = 'verified' | 'school-confirmed' | 'illustrative';
type CommuteMode = 'walk' | 'mrt' | 'bus' | 'schoolBus' | 'shuttle' | 'parent' | 'transfer';
type SchoolDirection = 'toSchool' | 'fromSchool';
type EventKind = 'move'|'look'|'wait'|'queue'|'board'|'selectSeat'|'buckle'|'unbuckle'|'holdRail'|'requestStop'|'alight'|'greet'|'askHelp'|'spotHazard'|'placeFacility'|'cross';
interface VerifiedPlace { id: string; label: string; location?: {lat: number; lon: number}; status: VerificationStatus; sourceNote: string; lastVerifiedAt?: string; }
interface ScenarioDef { id: string; mode: CommuteMode; direction: SchoolDirection; from: string; to: string; placeIds: string[]; stages: string[]; difficulty: 1|2|3; }
interface GameEvent { sessionId: string; scenarioId: string; stageId: string; kind: EventKind; tMs: number; outcome: 'pass'|'retry'|'hint'; }
interface AssessmentSummary { scenarioId: string; safetyActions: number; riskObservations: number; orderlyActions: number; transitSkills: number; socialInteractions: number; improvementProposals: number; retries: number; }
interface HumanCenteredProposal { scenarioId: string; hazardIds: string[]; stakeholderIds: string[]; facilityIds: string[]; evidenceIconIds: string[]; optionalComment?: string; }
```

## 狀態機
- WALK: start -> approachCrossing -> stop -> scan -> signalCheck -> cross -> optionalTeacherGreeting -> school -> feedback.
- MRT: stationEntry -> gate -> chooseDirection -> platformQueue -> trainStopped -> allowAlighting -> board -> ride -> trainStoppedAtA8 -> alight -> stationExit -> walk -> school.
- BUS: approachStop -> routeCheck -> queue -> busStopped -> board -> ride -> pressBell -> busStoppedAtDestination -> alight -> safeWalk.
- SCHOOL/SHUTTLE: waitingArea -> queue -> vehicleStopped -> attendantOK -> board -> seatAssigned -> buckled -> ride -> stopped -> unbuckle -> orderlyAlight -> thank -> destination.
- PARENT 上學汽車送學：車內已繫帶 -> 指定示意區短暫停妥 -> 解帶 -> 觀察後方車流 -> 安全側下車 -> 關好車門並走至人行道 -> 斑馬線停看等走 -> 入校。放學接送異動另建情境。
- SCOOTER 上學機車送學：車上戴帽坐穩 -> 前車離開後依序停妥 -> 觀察後方與行人 -> 成人確認安全側 -> 下車走回人行道 -> 正門或側門入校；正側門停靠點與汽車短停點分離。

## 資料來源與分層
`data/places.json`：地理錨點與驗證狀態；`data/routes.json`：路線、站序、轉乘；`data/scenarios.json`：教學關卡、事件與觸發條件；`data/curriculum.json`：年段與目標；`data/feedback.json`：繁中圖卡、旁白、短句。
引擎不寫死公車路線或接送站名；即使未載入官方資料也能使用示意場景遊玩。

## 模擬資料
設置 1–3 個示意公車站、2 個示意校車停靠點與 1 個示意補習班候車點；禁止使用可識別真實學生之資料、真實車牌或可推知固定家庭地址之完整路線。

## 測試關鍵
- 行車中不允許解除安全帶、不允許下車、未停妥不得上車。
- 過街須確認行人號誌與車輛停讓；老師／志工問好發生在過街後，不作通行條件。
- 老師／志工的引導動畫只在小綠人與車輛停讓的保護時段進入行穿線中段；車輛恢復通行前必須返回兩端安全處，且不得擋住學生中央通道。
- 禮貌互動不應造成安全規則被略過。
- 重試不會把先前錯誤加總成負面人格標籤；匿名事件可匯出、重置、清除。
