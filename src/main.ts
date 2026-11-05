import './style.css';
import {World} from './world';
import {Journey} from './game/journey';
import {scenarios,type Scenario} from './data/scenarios';
import {EvidenceCollector} from './game/assessment';
import {feedbackSteps} from './safety/feedback';
import type {Evaluation} from './safety/evaluator';
import type {Point} from './safety/checkpoints';
import {Exploration,exploreSites,nearbySite,nearestSite,atDetachedDestination} from './game/explore';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<div id="world"></div>
<header class="topbar"><a class="brand" href="#" aria-label="返回大地圖"><span class="brand-icon">文</span><span>文欣安全通學 <b>GO!</b><small>WENXIN · SAFE JOURNEYS</small></span></a><span class="version">3D 大地圖 <i>V2.4</i></span><div class="header-actions"><button id="missions" aria-label="打開大地圖">◇ <span>地圖</span></button><button id="guide" aria-label="打開操作說明">ⓘ <span>說明</span></button><button id="pause" aria-label="暫停遊戲">⏸ <span>暫停</span></button><button id="settings" aria-label="操作設定">⚙ <span>設定</span></button><button id="teacher" aria-label="教師紀錄">▤ <span>紀錄</span></button></div></header>
<div class="map-note">◇ 教學示意 <span>｜道路、出口與停靠點待現勘核實</span></div>
<div id="practice-actions" hidden><button id="restart-practice">↻ 復歸練習</button><button id="leave-practice">↩ 離開練習</button></div>
<div id="status-banner" role="status" aria-live="polite" hidden><strong id="status-message"></strong></div>
<aside id="greeting-reminder" role="status" aria-live="polite" aria-label="問好提醒" hidden><button id="dismiss-greeting" aria-label="關閉問好提醒">×</button><strong><span class="greeting-full">👋 記得向老師／志工問好</span><span class="greeting-short">👋 記得說早安！</span></strong><p>已安全過街，遇見老師或志工時說聲早安！</p><button id="greet-now" class="primary">👋 向老師／志工問好</button></aside>
<section id="hud" class="compact" hidden><div class="chapter"><span id="scene-icon"></span><div><small id="scene-kicker">安全通學任務</small><h1 id="scene-title"></h1></div><button id="hud-toggle" aria-expanded="false">展開說明</button></div><section class="task-card"><div class="task-top"><span id="step-counter"></span><span id="signal">✋ 停等</span></div><div class="progress"><i id="progress"></i></div><h2 id="objective"></h2><p id="tip"></p><div class="evidence-row"><span>◎ 安全操作</span><span id="evidence">尚未開始</span></div></section><div id="world-caption" aria-live="polite"></div></section>
<section id="explore-hud" hidden><p class="eyebrow">自由探索 · 教學示意</p><h1 id="explore-title">走進安全通學大地圖</h1><p id="nearby">靠近地上的金色地點，就能開始練習。</p><button id="overview" aria-pressed="false">◉ 看四面圍牆與雙校門</button></section>
<footer id="controls" hidden><div class="movement"><div class="dpad" aria-label="移動方向"><button data-move="0,-1" aria-label="向前移動">↑</button><button data-move="-1,0" aria-label="向左移動">←</button><button data-move="0,1" aria-label="向後移動">↓</button><button data-move="1,0" aria-label="向右移動">→</button></div><span class="keyboard-help">WASD / 方向鍵移動<br>拖曳畫面轉視角 · E 互動</span></div><div class="actions"><button id="assist">◎ 前往標記</button><button id="interact" class="primary">開始互動</button><div class="minor-actions"><button id="greet">👋 揮手致意</button><button id="help">🙋 請求協助</button><button id="exit-vehicle" hidden>🚪 下車</button><button id="release-belt" hidden>🔓 解扣</button></div></div></footer>
<dialog id="menu" class="welcome"><p class="eyebrow">LET'S EXPLORE WENXIN</p><h1>走進同一張<br>安全通學大地圖<span>。</span></h1><p>用方向鍵或觸控在校門、步道與候車區走動；靠近金色地點，再按互動開始實際操作。</p><div class="intro-pills"><span>✋ 不用比快</span><span>🌱 錯誤立即矯正</span><span>🔒 匿名本機</span></div><p class="scope-note">校門外觀參照公開街景與校方照片重新建模；路線、停靠點和改善配置均為教學示意。</p><button id="start" class="primary">進入大地圖 →</button></dialog>
<dialog id="map-panel" class="small-dialog map-panel"><h2>◇ 大地圖</h2><p>這些是同一張 3D 地圖上的練習地點。可以步行探索；「輔助定位」會把角色帶到該地點的安全等候區，無需穿越車道或鏈條。</p><label class="direction-label">步行方向<select id="direction"><option value="toSchool">上學／到校</option><option value="fromSchool">放學／返家</option></select></label><div class="place-list">${exploreSites.map(site=>`<button data-place="${site.scenario.id}"><span>${site.scenario.icon}</span><b>${site.scenario.label}</b><small>${site.area}</small><em>輔助定位</em></button>`).join('')}</div><button class="primary" data-close="map-panel">回到大地圖</button></dialog>
<dialog id="guide-panel" class="small-dialog guide-panel" aria-labelledby="guide-title"><h2 id="guide-title">操作與安全說明</h2><div class="guide-scroll" tabindex="0"><h3>在大地圖行走</h3><p>用方向鍵、WASD 或畫面方向鍵移動。靠近金色地點才會顯示附近名稱；遠離後文字會消失。按「開始練習」進入實際操作。</p><h3>校門與接送</h3><p>正門圍牆在校園與人行道交界。從正門朝外看，左邊是樹蔭學生步道，右邊是安親班接駁車。側門旁是停車場，請走分隔的側門步道；不可穿越車行區或錐鏈。</p><h3>安全操作</h3><p>過馬路先停、看左右、確認行人號誌燈號；小綠人亮起且車輛停讓後，再走斑馬線。安全走到對面後，可向步道旁老師／志工揮手問好，再沿人行步道直接入校；問好不是過街放行條件。校車與安親班車先排隊、核對車輛，停妥後上下車。家長汽車送學時從車內等短暫停妥，解帶、看後方來車，從人行道側下車並關好車門；沿人行道走到斑馬線。機車送學須依序停妥，再觀察後方與行人，從安全側下車；正門與側門機車點不與兩側汽車臨停混用。錯誤會立刻阻擋，關閉提示後從安全位置重試。</p><h3>其他操作</h3><p>按「前往標記」可用單手輔助行走，仍需自己按互動及通過安全檢查；過街後走進校門會自動完成。上方可隨時暫停；開啟說明、地圖或設定時，角色與場景也會暫停。練習畫面可按「復歸練習」從安全起點重來，或按「離開練習」返回大地圖；暫停和錯誤提示中也有相同按鈕。</p></div><button class="primary" data-close="guide-panel">關閉說明・繼續遊戲</button></dialog>
<dialog id="pause-panel" class="small-dialog pause-panel"><h2>⏸ 遊戲已暫停</h2><p>角色與場景都停在目前位置。準備好後再繼續。</p><button id="resume" class="primary">▶ 繼續遊戲</button><div class="dialog-actions" id="pause-practice-actions" hidden><button id="restart-paused">↻ 復歸練習</button><button id="leave-paused">↩ 離開練習</button></div></dialog>
<dialog id="feedback" class="small-dialog"><p class="eyebrow">一起再練習</p><h2>✋ 請先停下</h2><p id="feedback-message"></p><div id="demo-steps"></div><p id="demo-caption" aria-live="polite"></p><div class="dialog-actions"><button id="demo">▶ 看示範</button><button id="retry" class="primary">再試一次 →</button><button id="restart-feedback" hidden>↻ 復歸練習</button><button id="leave-feedback" hidden>↩ 離開練習</button></div></dialog>
<dialog id="setting-panel" class="small-dialog"><h2>讓操作更舒服</h2><label><input type="checkbox" id="voice">開啟語音（裝置可用時）</label><label><input type="checkbox" id="reduced">減少動態效果</label><label><input type="checkbox" id="quality">低畫質省電</label><label><input type="checkbox" id="left-handed">左手互動配置</label><label>文字大小<select id="font-size"><option value="1">標準</option><option value="1.15">放大</option></select></label><label>移動速度<select id="speed"><option value="3.2">穩穩走</option><option value="2">慢慢走</option></select></label><p>可單手使用「前往標記」走路，再點互動。安全檢查完全相同；字幕一直保留。</p><button class="primary" data-close="setting-panel">回到遊戲</button></dialog>
<dialog id="teacher-panel" class="small-dialog"><h2>匿名學習足跡</h2><p>僅保存在這個瀏覽器，不含姓名與住址。首次操作與提示後重試分開記錄。</p><div id="stats"></div><div class="dialog-actions"><button id="json">匯出 JSON</button><button id="csv">匯出 CSV</button><button id="clear">清除本機紀錄</button></div><details><summary>查看最近 30 筆操作證據</summary><ol id="event-list"></ol></details><button class="primary" data-close="teacher-panel">回到遊戲</button></dialog>
<dialog id="result" class="small-dialog"><div class="result-icon">🌱</div><p class="eyebrow">每次練習，向安全更近一步</p><h2>這段練習完成了！</h2><p id="result-message"></p><div class="result-badges"><span>✋ 安全操作完成</span><span>👀 行動留下證據</span></div><button id="again" class="primary">再練習一次</button><button id="choose">回到大地圖 →</button></dialog>
<div id="belt-tools" hidden><div id="buckle-tab" role="button" tabindex="0" draggable="true" aria-label="安全帶插扣">▰ 插扣</div><button id="buckle-slot">▣ 扣環</button><small>拖曳插扣至扣環，或點扣環</small></div>
<div id="design-tools" hidden><button id="ramp" draggable="true">♿ 坡道圖卡</button><small>拖到金色標記，或用互動鍵放置</small></div>
<output id="toast" role="status"></output>`;
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let world:World;
try{world=new World($('world'));}catch(error){$('world').innerHTML='<div class="webgl-error">這個瀏覽器尚未能啟動 3D 顯示。請使用支援 WebGL 的 Chrome 或 Edge，並開啟硬體加速。</div>';throw error;}
const collector=new EvidenceCollector();const exploration=new Exploration();let selected:Scenario=scenarios[0];let journey:Journey|undefined;let entryPosition:Point={...exploration.position};let mapProblem:Evaluation|undefined;let assist=false;let voice=false;let speed=3.2;let last=performance.now();let toastAt=0;let uiAt=0;let greetingDismissed=false;let greetingAnnounced=false;
const keys=new Set<string>();let touch:Point={x:0,z:0};let pointer:{x:number;y:number;lastX:number;drag:boolean}|undefined;
function modalOpen(){return !!document.querySelector('dialog[open]');}
function release(){keys.clear();touch={x:0,z:0};assist=false;}
function setHudCompact(compact:boolean){$('hud').classList.toggle('compact',compact);$('hud-toggle').textContent=compact?'展開說明':'收起說明';$('hud-toggle').setAttribute('aria-expanded',String(!compact));}
function toast(message:string){$('toast').textContent=message;toastAt=performance.now();}
function speak(message:string){if(voice&&'speechSynthesis' in window){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(message);utterance.lang='zh-TW';speechSynthesis.speak(utterance);}}
function onEvaluation(result:Evaluation){
  collector.record(journey?.scenario.id??'map',journey?.current?.id??'explore',result);if(!journey)mapProblem=result;
  if(!result.allowed){release();$('feedback-message').textContent=result.message;$('leave-feedback').hidden=!journey;$('restart-feedback').hidden=!journey;const steps=feedbackSteps(result);$('demo-steps').innerHTML=steps.map((s,i)=>`<div class="demo-step"><b>${i+1}</b>${s}</div>`).join('');$('demo-caption').textContent='安全動作已暫停；回到等待點，還可以再練習。';if(!$<HTMLDialogElement>('feedback').open)$<HTMLDialogElement>('feedback').showModal();speak(result.message);}
}
exploration.onResult=onEvaluation;
function enterMap(){release();$<HTMLDialogElement>('menu').close();$('controls').hidden=false;$('explore-hud').hidden=false;world.overview=true;updateOverviewUI();updateUI();toast('先看校園四面圍牆；按「回到角色」開始走動。');}
function updateOverviewUI(){const active=world.overview;$('explore-hud').classList.toggle('overview',active);$('explore-title').textContent=active?'四面圍牆・正門與側門':'走進安全通學大地圖';$('overview').textContent=active?'◎ 回到角色，沿步道行走':'◉ 看四面圍牆與雙校門';$('overview').setAttribute('aria-pressed',String(active));app.dataset.view=active?'campus-overview':'follow';}
function returnToMap(completed=false){
  release();greetingDismissed=false;greetingAnnounced=false;const detached=!!journey&&completed&&atDetachedDestination(journey.position);if(journey){exploration.position=completed&&!detached?{...journey.position}:{...entryPosition};journey=undefined;}
  for(const d of document.querySelectorAll<HTMLDialogElement>('dialog[open]'))d.close();$('hud').hidden=true;$('explore-hud').hidden=false;$('controls').hidden=false;$('belt-tools').hidden=true;$('design-tools').hidden=true;world.overview=true;updateOverviewUI();updateUI();
  if(detached)toast('已用輔助定位回到本次練習起點。');
}
function startPractice(){
  const site=nearbySite(exploration.position);if(!site){toast('請先走到金色地點旁；也可打開大地圖使用輔助定位。');return;}
  selected=site.scenario;entryPosition={...exploration.position};release();greetingDismissed=false;greetingAnnounced=false;journey=new Journey(selected,$<HTMLSelectElement>('direction').value==='fromSchool'&&selected.mode==='walk');journey.onResult=onEvaluation;world.yaw=.3;world.overview=false;
  for(const d of document.querySelectorAll<HTMLDialogElement>('dialog[open]'))d.close();$('hud').hidden=false;setHudCompact(true);$('controls').hidden=false;
  $('explore-hud').hidden=true;
  $('scene-icon').textContent=selected.icon;$('scene-title').textContent=selected.label;$('scene-kicker').textContent=`${journey.reverse?'放學旅程':'安全通學'} / 教學示意`;
  toast('用方向鍵走到金色標記，或點「前往標記」。');updateUI();
}
function restartPractice(){
  if(!journey)return;
  const reverse=journey.reverse;release();greetingDismissed=false;greetingAnnounced=false;mapProblem=undefined;
  for(const d of document.querySelectorAll<HTMLDialogElement>('dialog[open]'))d.close();
  journey=new Journey(selected,reverse);journey.onResult=onEvaluation;
  world.yaw=.3;world.distance=25;world.overview=false;$('hud').hidden=false;setHudCompact(true);
  $('explore-hud').hidden=true;$('controls').hidden=false;$('belt-tools').hidden=true;$('design-tools').hidden=true;
  updateUI();toast('已復歸本次練習，從安全起點重新開始；先前的匿名學習紀錄仍保留。');
}
function interact(action=journey?.current?.action,extras:Record<string,boolean>={}){
  if(modalOpen())return;if(!journey){startPractice();return;}if(!action)return;
  const before=journey.current;
  const teacherGreeting=action==='greet'&&journey.teacherNearby;
  if(journey.attempt(action,extras)){
    assist=false;if(action==='left')world.yaw=-.65;if(action==='right')world.yaw=.65;
    if(selected.mode==='mrt'&&before?.id==='identify')world.yaw=-.55;
    if(action==='greet'){world.avatar.rotation.y+=.5;if(teacherGreeting){world.waveTeacher(selected.id==='walk_side');toast('👋 老師／志工向你揮手回應：早安！沿步道直接入校。');}else toast('謝謝你的友善揮手！禮貌是鼓勵，安全仍要每一步確認。');}
    else if(action==='help')toast(journey.inside?'保持坐好或扶穩，向隨車成人或可用求助設備求助，不打擾駕駛。':'留在安全區，找老師或隨車人員協助；接送不符時不上陌生車。');
    else toast(`✓ ${before?.label}`);
    if(journey.complete){const detached=atDetachedDestination(journey.position);$('result-message').textContent=selected.mode==='human'?'提案操作已記錄於本機；示意方案：通道狹窄 → 輪椅與推車 → 坡道與保留通行空間。工程仍需專業審查。':detached?'你完成了示意目的地的安全交接。按下方按鈕，將以輔助定位回到本次練習起點。':'你用實際操作完成安全旅程。可以在教師紀錄查看首次嘗試與重試後的進步。';$('choose').textContent=detached?'回到本次起點大地圖 →':'回到大地圖 →';$<HTMLDialogElement>('result').showModal();}
  }
  updateUI();
}
function updateUI(){
  if(!journey){$('practice-actions').hidden=true;$('pause-practice-actions').hidden=true;$('status-banner').hidden=true;$('greeting-reminder').hidden=true;const site=nearbySite(exploration.position),nearest=nearestSite(exploration.position);$('nearby').textContent=site?`${site.scenario.icon} ${site.scenario.label}就在身旁。按「開始練習」。`:`最近地點：${nearest.scenario.label}。沿人行空間前進，或開地圖輔助定位。`;$('interact').textContent=site?`開始${site.scenario.label}`:'靠近地點開始';$('assist').textContent='◇ 查看大地圖';$('greet').textContent='👋 揮手致意';$('exit-vehicle').hidden=true;$('release-belt').hidden=true;app.dataset.x=exploration.position.x.toFixed(3);app.dataset.z=exploration.position.z.toFixed(3);app.dataset.stage='explore';app.dataset.mode='explore';app.dataset.gate='false';app.dataset.complete='false';return;}$('practice-actions').hidden=false;$('pause-practice-actions').hidden=false;const s=journey.current;
  $('step-counter').textContent=`任務 ${Math.min(journey.index+1,journey.steps.length)} / ${journey.steps.length}`;
  $('progress').style.width=`${journey.index/journey.steps.length*100}%`;$('objective').textContent=s?.label??'安全旅程完成';$('tip').textContent=s?.tip??'在自己的步調裡繼續練習。';$('interact').textContent=s?.verb??'✓ 已完成';
  $('greet').textContent=journey.teacherGreeted?'✓ 已向老師問好':journey.teacherNearby?'👋 向老師／志工問好':'👋 揮手致意';
  const remind=journey.teacherNearby&&!journey.teacherGreeted&&!greetingDismissed&&!modalOpen();$('greeting-reminder').hidden=!remind;
  if(remind&&!greetingAnnounced){greetingAnnounced=true;speak('已安全過街，遇見老師或志工，記得說早安。');}
  const road=['approachSide','stop','left','right','wait','cross'].includes(s?.id);
  const afterCrossing=s?.id==='destination'&&journey.steps[journey.index-1]?.id==='cross';
  $('signal').textContent=afterCrossing?(journey.reverse?'🚶 沿步道前進':'🏫 直接入校'):road?(journey.facts.green?(journey.facts.trafficYielded?'🚶 綠燈・已停讓':'👀 綠燈・再確認停讓'):'✋ 紅燈・停等'):(journey.scenario.mode==='scooter'&&!journey.facts.motorcycleTurn?'🛵 等前車駛離':['parent','scooter'].includes(journey.scenario.mode)&&journey.facts.vehicleStopped?(journey.facts.rearTrafficClear?'👀 後方暫時淨空':'✋ 後方有車・先等'):s?.id==='clearance'&&!journey.facts.studentTurn?'👣 等前方同學':journey.facts.vehicleStopped?'🛑 已停穩':`${journey.scenario.mode==='scooter'?'🛵':journey.scenario.mode==='parent'?'🚙':'🚐'} 車輛移動中`);
  const banner=$('status-banner');banner.hidden=journey.complete;
  let bannerKind='wait';let message='';
  if(afterCrossing){message=journey.reverse?'🚶 已通過斑馬線｜沿人行步道前進':journey.teacherGreeted?'🏫 已向老師／志工問好｜沿人行步道直接入校':'🏫 已通過斑馬線｜可向老師／志工問好，沿人行步道直接入校';bannerKind='go';}
  else if(road){if(!journey.facts.green)message='✋ 行人紅燈｜請在路緣停等';else if(!journey.facts.trafficYielded)message='🚦 小綠人亮起｜再確認車輛停讓';else if(!['wait','cross'].includes(s?.id)){message='👀 小綠人亮起｜先完成停步、看左右';bannerKind='observe';}else{message=journey.facts.crossing?'🚶 維持走在斑馬線｜留意轉彎車':s?.id==='wait'?'🚦 確認行人號誌燈號｜小綠人亮起，車已停讓':'🚶 小綠人亮起｜車已停讓，沿斑馬線通行';bannerKind='go';}}
  else if(journey.scenario.mode==='scooter'&&journey.inside){if(!journey.facts.motorcycleTurn)message='🛵 前車駛離中｜依序等待';else if(!journey.facts.vehicleStopped)message='🛵 機車行進中｜坐穩，不能下車';else{message=journey.facts.rearTrafficClear?'🛑 機車已停穩｜看後方再安全下車':'🛑 機車已停穩｜後方有車，先等';bannerKind='stopped';}}
  else if(journey.scenario.mode==='parent'&&journey.inside){if(!journey.facts.vehicleStopped)message='🚙 汽車行進中｜停穩前不能開門';else{message=journey.facts.rearTrafficClear?'🛑 汽車已停穩｜看後方再開安全側車門':'🛑 汽車已停穩｜後方有車，先等';bannerKind='stopped';}}
  else if(journey.inside){message=journey.facts.vehicleStopped?'🛑 車輛已停穩｜依序下車':'🚐 車輛行進中｜坐穩、扶好';bannerKind=journey.facts.vehicleStopped?'stopped':'wait';}
  else if(['clearance','board','arrival','alight'].includes(s?.id)){message=journey.facts.vehicleStopped?'🛑 車輛已停穩｜依序操作':'🚐 車輛行進中｜先在安全區等候';bannerKind=journey.facts.vehicleStopped?'stopped':'wait';}
  banner.dataset.state=bannerKind;$('status-message').textContent=message;banner.hidden=journey.complete||!message;
  $('world-caption').textContent=afterCrossing?(journey.reverse?'已安全走到對面，沿步道往街區前進。':'已安全過街；經過老師／志工可按「問好」，沿步道直接入校。'):road?'駕駛須停讓行人；我們也先看清楚，再安全通行。':journey.scenario.mode==='after_school_shuttle'?(journey.gateOpen?'✓ 成人已放行，請走指定登車口。':'鏈條不穿越・車停妥後仍須成人確認。'):journey.scenario.mode==='school_bus'?'校車只在校門外上下車，沿人行空間進校。':journey.scenario.mode==='parent'?'家長在兩側示意區短暫停妥；看後方、從人行道側下車，關門後讓車儘速駛離。':journey.scenario.mode==='scooter'?'機車依序在正門或側門示意點停妥後下車；不與兩側汽車臨停混流。':'所有道路、候車區與車廂都是教學示意。';
  const ev=collector.events.filter(e=>e.sessionId===collector.sessionId&&e.sceneId===journey!.scenario.id);$('evidence').textContent=`${ev.filter(e=>e.eventType==='safe_action'||e.eventType==='retry_success').length} 筆足跡`;
  $('assist').textContent=assist?'✋ 停止行走':'◎ 前往標記';$('exit-vehicle').hidden=!journey.inside;$('exit-vehicle').textContent=journey.scenario.mode==='scooter'?'🛵 下車':'🚪 下車';$('release-belt').hidden=!journey.inside||['mrt','bus','transfer','scooter'].includes(journey.scenario.mode);
  $('belt-tools').hidden=s?.id!=='buckle';$('design-tools').hidden=s?.id!=='place';
  app.dataset.x=journey.position.x.toFixed(3);app.dataset.z=journey.position.z.toFixed(3);app.dataset.stage=s?.id??'completed';app.dataset.mode=journey.scenario.mode;app.dataset.gate=String(journey.gateOpen);app.dataset.complete=String(journey.complete);
}
document.querySelector('.brand')!.addEventListener('click',e=>{e.preventDefault();returnToMap();});$('missions').onclick=()=>{if(journey)returnToMap();release();$<HTMLDialogElement>('map-panel').showModal();};
$('guide').onclick=()=>{release();$<HTMLDialogElement>('guide-panel').showModal();};
$('pause').onclick=()=>{release();if('speechSynthesis'in window)speechSynthesis.cancel();$<HTMLDialogElement>('pause-panel').showModal();};
$('resume').onclick=()=>$<HTMLDialogElement>('pause-panel').close();
$('hud-toggle').onclick=()=>setHudCompact(!$('hud').classList.contains('compact'));
$('restart-practice').onclick=restartPractice;$('restart-paused').onclick=restartPractice;$('restart-feedback').onclick=restartPractice;
for(const id of ['leave-practice','leave-paused','leave-feedback'])$(id).onclick=()=>{returnToMap();toast('已離開練習，回到本次起點；這段練習尚未完成。');};
for(const el of document.querySelectorAll<HTMLButtonElement>('[data-place]'))el.onclick=()=>{const site=exploreSites.find(s=>s.scenario.id===el.dataset.place)!;returnToMap();exploration.relocate(site);world.overview=false;updateOverviewUI();updateUI();toast(`已到${site.area}的安全位置；靠近金色標記開始練習。`);};
$('overview').onclick=()=>{world.overview=!world.overview;updateOverviewUI();};
$('start').onclick=enterMap;$('interact').onclick=()=>interact();$('assist').onclick=()=>{if(!journey){release();$<HTMLDialogElement>('map-panel').showModal();return;}assist=!assist;keys.clear();touch={x:0,z:0};updateUI();};$('greet').onclick=()=>journey?interact('greet'):toast('向附近的人友善致意；請先確認自己站在安全位置。');$('help').onclick=()=>journey?interact('help'):toast('請留在安全區，向老師或志工求助。');$('exit-vehicle').onclick=()=>interact('alight');$('release-belt').onclick=()=>interact('unbuckle');
$('greet-now').onclick=()=>interact('greet');$('dismiss-greeting').onclick=()=>{greetingDismissed=true;$('greeting-reminder').hidden=true;};
function retryFeedback(){journey?.retry();mapProblem=undefined;$<HTMLDialogElement>('feedback').close();$('demo-steps').classList.remove('demonstrating');updateUI();}
$('retry').onclick=retryFeedback;
$('demo').onclick=()=>{const problem=journey?.blocked??mapProblem;if(!problem)return;collector.record(journey?.scenario.id??'map',journey?.current.id??'explore',problem,true);$('demo-steps').classList.remove('demonstrating');void $('demo-steps').offsetWidth;$('demo-steps').classList.add('demonstrating');$('demo-caption').textContent='示範：先在安全區停下 → 沿指定安全動線前進。';speak(feedbackSteps(problem).join('。'));};
$('settings').onclick=()=>{release();$<HTMLDialogElement>('setting-panel').showModal();};
$<HTMLInputElement>('voice').onchange=e=>{voice=(e.target as HTMLInputElement).checked;if(!voice&&'speechSynthesis'in window)speechSynthesis.cancel();};
$<HTMLInputElement>('reduced').checked=matchMedia('(prefers-reduced-motion: reduce)').matches;world.reduced=$<HTMLInputElement>('reduced').checked;
$<HTMLInputElement>('reduced').onchange=e=>{world.reduced=(e.target as HTMLInputElement).checked;document.body.classList.toggle('reduced',world.reduced);};
$<HTMLInputElement>('quality').onchange=e=>world.quality((e.target as HTMLInputElement).checked);
$<HTMLInputElement>('left-handed').onchange=e=>document.body.classList.toggle('left-handed',(e.target as HTMLInputElement).checked);
$<HTMLSelectElement>('font-size').onchange=e=>document.documentElement.style.setProperty('--text-scale',(e.target as HTMLSelectElement).value);
$<HTMLSelectElement>('speed').onchange=e=>{speed=Number((e.target as HTMLSelectElement).value);};
function closeDialog(dialog:HTMLDialogElement){
  if(dialog.id==='menu')enterMap();
  else if(dialog.id==='feedback')retryFeedback();
  else if(dialog.id==='result')returnToMap(true);
  else dialog.close();
}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-close]'))b.onclick=()=>closeDialog($<HTMLDialogElement>(b.dataset.close!));
$('teacher').onclick=()=>{release();const events=collector.events;const first=new Map<string,boolean>();for(const ev of events){if(ev.eventType==='hint_viewed')continue;const key=`${ev.sessionId}-${ev.sceneId}-${ev.stageId}-${ev.ruleId}`;if(!first.has(key))first.set(key,ev.eventType!=='unsafe_attempt');}const hints=events.filter(e=>e.eventType==='hint_viewed').length;const retries=events.filter(e=>e.eventType==='retry_success').length;$('stats').innerHTML=`<div class="stat"><b>${first.size?Math.round([...first.values()].filter(Boolean).length/first.size*100):'—'}%</b><span>首次操作安全比例</span></div><div class="stat"><b>${hints}</b><span>查看示範次數</span></div><div class="stat"><b>${retries}</b><span>提示後完成操作</span></div>`;$('event-list').replaceChildren(...events.slice(-30).map(e=>{const li=document.createElement('li');li.textContent=`${e.sceneId} / ${e.stageId}：${e.ruleId} · ${e.eventType} (${e.timestampMs}ms)`;return li;}));$<HTMLDialogElement>('teacher-panel').showModal();};
$('json').onclick=()=>collector.export('json');$('csv').onclick=()=>collector.export('csv');$('clear').onclick=()=>{collector.clear();$('stats').textContent='本機學習紀錄已清除。';$('event-list').replaceChildren();};$('again').onclick=restartPractice;$('choose').onclick=()=>returnToMap(true);
for(const d of document.querySelectorAll<HTMLDialogElement>('dialog')){
  const close=document.createElement('button');close.className='dialog-close';close.type='button';close.textContent='×';close.setAttribute('aria-label',`關閉${d.querySelector('h2,h1')?.textContent?.trim()??'視窗'}`);d.prepend(close);
  close.onclick=()=>closeDialog(d);
  d.addEventListener('cancel',e=>{e.preventDefault();closeDialog(d);});
}
window.addEventListener('keydown',e=>{if(modalOpen())return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)){e.preventDefault();keys.add(e.key.toLowerCase());assist=false;}if(e.key.toLowerCase()==='e'&&!e.repeat)interact();});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-move]')){button.onpointerdown=e=>{if(modalOpen())return;e.preventDefault();button.setPointerCapture(e.pointerId);const [x,z]=button.dataset.move!.split(',').map(Number);touch={x,z};assist=false;};button.onpointerup=()=>{touch={x:0,z:0};};button.onpointercancel=()=>{touch={x:0,z:0};};button.onlostpointercapture=()=>{touch={x:0,z:0};};}
const canvas=world.renderer.domElement;
canvas.onpointerdown=e=>{if(modalOpen())return;pointer={x:e.clientX,y:e.clientY,lastX:e.clientX,drag:false};canvas.setPointerCapture(e.pointerId);};
canvas.onpointermove=e=>{if(!pointer)return;const dx=e.clientX-pointer.lastX;if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>6)pointer.drag=true;if(pointer.drag)world.yaw-=dx*.006;pointer.lastX=e.clientX;};
canvas.onpointerup=e=>{if(pointer&&!pointer.drag&&!modalOpen()){const hit=world.pick(e.clientX,e.clientY);if(hit.target)interact();else if(hit.action&&journey)interact(hit.action,typeof hit.correctSeat==='boolean'?{correctSeat:hit.correctSeat}:{});else if(hit.vehicle&&journey)interact('board');else if(!journey&&nearbySite(exploration.position))interact();}pointer=undefined;};canvas.onpointercancel=()=>{pointer=undefined;};
canvas.onwheel=e=>{e.preventDefault();world.distance=Math.max(15,Math.min(36,world.distance+e.deltaY*.01));};
$('buckle-tab').ondragstart=e=>e.dataTransfer?.setData('text/plain','buckle');$('buckle-slot').ondragover=e=>e.preventDefault();$('buckle-slot').ondrop=e=>{e.preventDefault();if(e.dataTransfer?.getData('text/plain')==='buckle')interact('buckle');};$('buckle-slot').onclick=()=>interact('buckle');$('buckle-tab').onkeydown=e=>{if(e.key==='Enter'||e.key===' ')interact('buckle');};
$('ramp').ondragstart=e=>e.dataTransfer?.setData('text/plain','ramp');canvas.ondragover=e=>e.preventDefault();canvas.ondrop=e=>{e.preventDefault();if(e.dataTransfer?.getData('text/plain')!=='ramp')return;const hit=world.pick(e.clientX,e.clientY);interact('place',{accessible:!!hit.target,emergencyClear:!!hit.target,sightClear:!!hit.target});};
function frame(now:number){
  const dt=Math.min((now-last)/1000,.05);last=now;
  if(!journey&&!modalOpen()){
    const dx=touch.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    const dz=touch.z+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
    const length=Math.hypot(dx,dz);if(length>.01){if(world.overview){world.overview=false;updateOverviewUI();}const from={...exploration.position};const factor=speed*dt/Math.max(1,length);exploration.move(dx*factor,dz*factor);world.face(from,exploration.position);}
  }
  if(journey&&!modalOpen()&&!journey.complete){
    let dx=touch.x+(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);let dz=touch.z+(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
    if(assist){const target=journey.assistedTarget;const distance=Math.hypot(target.x-journey.position.x,target.z-journey.position.z);if(distance<.12){assist=false;}else{dx=(target.x-journey.position.x)/distance;dz=(target.z-journey.position.z)/distance;}}
    const length=Math.hypot(dx,dz);journey.update(dt,length>.01);
    if(!journey.inside){const stop=journey.vehiclePosition;const half=journey.scenario.mode==='parent'?1.9:journey.scenario.mode==='after_school_shuttle'?2.5:3.8;journey.obstacles=stop?[stop.z>=7||journey.scenario.mode==='parent'?{minX:stop.x-half,maxX:stop.x+half,minZ:stop.z-1.35,maxZ:stop.z+1.35}:{minX:stop.x-1.35,maxX:stop.x+1.35,minZ:stop.z-half,maxZ:stop.z+half}]:[];}
    if(length>.01){const from={...journey.position};const factor=speed*dt/Math.max(1,length);journey.move(dx*factor,dz*factor);world.face(from,journey.position);}
    const destination=journey.current;
    if(destination?.id==='destination'&&destination.action==='finish'&&journey.steps[journey.index-1]?.id==='cross'&&Math.hypot(journey.position.x-destination.target.x,journey.position.z-destination.target.z)<.45)interact('finish');
  }
  world.render(journey,modalOpen()?0:dt,exploration.position,nearestSite(exploration.position).entry);if(now-uiAt>100){updateUI();uiAt=now;}if(now-toastAt>4500)$('toast').textContent='';requestAnimationFrame(frame);
}
requestAnimationFrame(frame);$<HTMLDialogElement>('menu').showModal();
if('serviceWorker'in navigator&&import.meta.env.PROD){
  let refreshed=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshed&&navigator.serviceWorker.controller){refreshed=true;location.reload();}});
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`,{updateViaCache:'none'}).catch(()=>toast('離線快取目前不可用；遊戲可繼續使用。'));
}
