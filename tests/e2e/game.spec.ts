import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const sizes=[{width:1366,height:768},{width:768,height:1024},{width:390,height:844}];
for(const size of sizes){
  test(`open map layout and accessible site choice ${size.width}x${size.height}`,async({page})=>{
    await page.setViewportSize(size);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#start').click();
    await expect(page.locator('#explore-hud')).toBeVisible();await expect(page.locator('#app')).toHaveAttribute('data-stage','explore');
    expect(await page.locator('canvas').evaluate(e=>(e as HTMLCanvasElement).width)).toBeGreaterThan(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:`docs/screenshots/map-${size.width}.png`});
    await page.locator('#missions').click();await expect(page.locator('[data-place="guard"]')).toHaveCount(0);await page.locator('[data-place="school_bus_gate_exterior"]').click();
    expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeGreaterThan(20);
    await page.locator('#missions').click();await page.locator('[data-place="parent"]').click();
    expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeLessThan(-15);
    expect(errors).toEqual([]);
  });
}
test('welcome uses the Wenxin game name and free exploration safely walks through the guarded crossing',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await page.goto('/');
  await expect(page.locator('#menu h1')).toContainText('文欣安全通學');
  await expect(page.locator('#menu h1')).toContainText('GO!');
  await page.locator('#start').click();await page.locator('#overview').click();
  await expect(page.locator('#explore-title')).toHaveText('文欣安全通學GO!');
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(300);await page.keyboard.up('ArrowUp');
  await expect(page.locator('#world')).toHaveAttribute('data-pedestrian-signal','green-man',{timeout:20000});
  await expect(page.locator('#world')).toHaveAttribute('data-guides','directing',{timeout:5000});
  await expect(page.locator('#status-banner')).toContainText('可走斑馬線');
  await page.keyboard.down('ArrowUp');
  await expect.poll(async()=>Number(await page.locator('#app').getAttribute('data-z')),{timeout:12000}).toBeLessThan(1.4);
  await page.keyboard.up('ArrowUp');
  await expect(page.locator('#feedback')).not.toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('data-explore-crossing','none');
  await page.screenshot({path:'docs/screenshots/free-explore-crossing-1366.png'});
});
async function press(page:Page,selector:string,touch=false){if(touch)await page.locator(selector).tap();else await page.locator(selector).click();}
async function chooseSite(page:Page,scene:string,reverse=false,touch=false){await press(page,'#missions',touch);if(reverse)await page.locator('#direction').selectOption('fromSchool');await press(page,`[data-place="${scene}"]`,touch);await press(page,'#interact',touch);}
async function start(page:Page,scene='walk',reverse=false,touch=false){await page.goto('/');await press(page,'#start',touch);if(scene!=='walk'||reverse)await chooseSite(page,scene,reverse,touch);else await press(page,'#interact',touch);await expect(page.locator('#hud')).toBeVisible();}
async function stage(page:Page){return page.locator('#app').getAttribute('data-stage');}
test('the former transfer map point is labeled 搭乘公車',async({page})=>{
  await page.goto('/');await page.locator('#start').click();await page.locator('#missions').click();
  await expect(page.locator('[data-place="transfer"]')).toContainText('搭乘公車');
  await expect(page.locator('#map-panel')).not.toContainText('安全轉乘');
  await page.locator('[data-place="transfer"]').click();await page.locator('#interact').click();
  await expect(page.locator('#scene-title')).toHaveText('搭乘公車');
});
test('main and side crossing show a green walking figure only while cars stop',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page);
  await expect(page.locator('#world')).toHaveAttribute('data-pedestrian-signal','red');
  await expect(page.locator('#world')).toHaveAttribute('data-vehicle-signal','green');
  await expect(page.locator('#world')).toHaveAttribute('data-guides','sidewalk');
  expect(Number(await page.locator('#world').getAttribute('data-main-teacher-z'))).toBeCloseTo(.2,1);
  expect(Number(await page.locator('#world').getAttribute('data-side-volunteer-x'))).toBeCloseTo(-42.7,1);
  await expect(page.locator('#status-banner')).toContainText('行人紅燈');
  await expect(page.locator('#world')).toHaveAttribute('data-pedestrian-signal','green-man',{timeout:20000});
  await expect(page.locator('#world')).toHaveAttribute('data-vehicle-signal','red');
  await expect(page.locator('#world')).toHaveAttribute('data-main-car','stopped');
  await expect(page.locator('#world')).toHaveAttribute('data-side-car','stopped');
  expect(Number(await page.locator('#world').getAttribute('data-main-car-x'))).toBeGreaterThan(11);
  expect(Number(await page.locator('#world').getAttribute('data-side-car-z'))).toBeGreaterThan(-3);
  await expect(page.locator('#status-banner')).toContainText('小綠人亮起');
  await expect(page.locator('#world')).toHaveAttribute('data-guides','directing',{timeout:5000});
  await expect.poll(async()=>Number(await page.locator('#world').getAttribute('data-main-teacher-z'))).toBeCloseTo(4.5,1);
  expect(Number(await page.locator('#world').getAttribute('data-main-volunteer-z'))).toBeCloseTo(4.5,1);
  expect(Number(await page.locator('#world').getAttribute('data-side-teacher-x'))).toBeCloseTo(-38,1);
  expect(Number(await page.locator('#world').getAttribute('data-side-volunteer-x'))).toBeCloseTo(-38,1);
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/green-man-crossing-1366.png'});
  await page.screenshot({path:'docs/screenshots/guides-directing-main-1366.png'});
  await expect(page.locator('#world')).toHaveAttribute('data-pedestrian-signal','red',{timeout:13000});
  await expect(page.locator('#world')).toHaveAttribute('data-guides','sidewalk');
  expect(Number(await page.locator('#world').getAttribute('data-main-teacher-z'))).toBeCloseTo(.2,1);
});
test('the guide explains gold rings and auto walk reaches one before the action',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page);
  await page.locator('#guide').click();
  await expect(page.locator('#guide-panel')).toContainText('走進圈內後按任務動作');
  await expect(page.locator('#guide-panel')).toContainText('抵達後仍須自己按動作');
  await page.locator('[data-close="guide-panel"]').click();
  const initial=Number(await page.locator('#app').getAttribute('data-z'));
  await page.locator('#assist').click();
  await expect(page.locator('#interaction-hint')).toContainText('正走向金色圈');
  await expect(page.locator('#app')).toHaveAttribute('data-in-interaction-circle','true',{timeout:40000});
  await expect(page.locator('#interact')).toHaveClass(/ready/);
  await expect(page.locator('#interaction-hint')).toContainText('已到金色圈內');
  expect(Number(await page.locator('#app').getAttribute('data-z'))).not.toBe(initial);
  await expect(page.locator('#app')).toHaveAttribute('data-stage','stop');
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/gold-circle-ready-1366.png'});
  await page.locator('#interact').click();
  await expect(page.locator('#app')).toHaveAttribute('data-stage','left');
});
test('context instructions appear near the side-gate mark and safety feedback stays off the avatar',async({page})=>{
  await page.setViewportSize({width:390,height:844});await start(page,'walk_side');
  await expect(page.locator('#hud')).toHaveClass(/context-distant/);
  await expect(page.locator('#hud .task-card')).toBeVisible();
  await expect(page.locator('#objective')).toContainText('前往紅環');
  await expect(page.locator('#quick-cue')).toContainText('沿安全步道走進紅環');
  await expect(page.locator('#interaction-hint')).toBeHidden();
  await expect(page.locator('#status-banner')).toBeHidden();
  await page.screenshot({path:'docs/screenshots/side-walk-distant-390.png'});
  await page.locator('#hud-toggle').click();
  await expect(page.locator('#hud .task-card')).toBeVisible();
  await expect(page.locator('#tip')).toBeVisible();
  await page.locator('#hud-toggle').click();
  await expect(page.locator('#hud .task-card')).toBeVisible();
  await page.locator('#assist').click();
  await expect(page.locator('#hud .task-card')).toBeVisible({timeout:20000});
  await expect(page.locator('#interaction-hint')).toBeVisible();
  await page.screenshot({path:'docs/screenshots/side-walk-near-390.png'});
  await page.locator('#interact').click();
  if(!await page.locator('#feedback').isVisible())await page.locator('#interact').click();
  await expect(page.locator('#feedback')).toBeVisible({timeout:8000});
  const feedback=await page.locator('#feedback').boundingBox();
  expect(feedback).not.toBeNull();
  expect(feedback!.x).toBeGreaterThan(390*.44);
  expect(feedback!.y+feedback!.height).toBeLessThan(680);
  await page.screenshot({path:'docs/screenshots/side-walk-feedback-390.png'});
});
for(const size of [{width:1366,height:768},{width:768,height:1024}]){
  test(`distant and nearby prompts stay at the edge ${size.width}x${size.height}`,async({page})=>{
    await page.setViewportSize(size);await start(page,'walk_side');
    await expect(page.locator('#hud .task-card')).toBeVisible();
    await expect(page.locator('#objective')).toContainText('前往紅環');
    await expect(page.locator('#status-banner')).toBeHidden();
    await page.screenshot({path:`docs/screenshots/side-walk-distant-${size.width}.png`});
    await page.locator('#assist').click();
    await expect(page.locator('#hud .task-card')).toBeVisible({timeout:20000});
    await page.screenshot({path:`docs/screenshots/side-walk-near-${size.width}.png`});
    const card=await page.locator('#hud .task-card').boundingBox();
    expect(card!.x).toBeGreaterThan(size.width*.55);
  });
}
test('next action has a red pulsing 3D ring and reduced motion keeps it steady',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page,'walk_side');
  await expect(page.locator('#world')).toHaveAttribute('data-next-ring','pulsing');
  const first=Number(await page.locator('#world').getAttribute('data-next-ring-opacity'));
  await expect.poll(async()=>Math.abs(Number(await page.locator('#world').getAttribute('data-next-ring-opacity'))-first),{timeout:3000}).toBeGreaterThan(.12);
  await page.screenshot({path:'docs/screenshots/next-action-ring-1366.png'});
  await page.locator('#settings').click();await page.locator('#reduced').check();await page.locator('[data-close="setting-panel"]').click();
  await expect(page.locator('#world')).toHaveAttribute('data-next-ring','steady');
  await expect(page.locator('#world')).toHaveAttribute('data-next-ring-opacity','0.85');
});
test('3D wheels rotate with road traffic and scooters, then stop with brake lights',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await page.goto('/');await page.locator('#start').click();
  const world=page.locator('#world');
  const movingAngle=Number(await world.getAttribute('data-main-wheel-angle'));
  await expect.poll(async()=>Math.abs(Number(await world.getAttribute('data-main-wheel-angle'))-movingAngle)).toBeGreaterThan(.25);
  await expect(world).toHaveAttribute('data-main-car','stopped',{timeout:15000});
  await expect(world).toHaveAttribute('data-main-brake','true');
  const stoppedAngle=Number(await world.getAttribute('data-main-wheel-angle'));
  await page.waitForTimeout(450);
  expect(Number(await world.getAttribute('data-main-wheel-angle'))).toBeCloseTo(stoppedAngle,2);
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/wheels-stopped-1366.png'});
  await chooseSite(page,'scooter_main');
  const leadAngle=Number(await world.getAttribute('data-scooter-lead-wheel-angle'));
  await expect.poll(async()=>Math.abs(Number(await world.getAttribute('data-scooter-lead-wheel-angle'))-leadAngle)).toBeGreaterThan(.25);
  await expect(world).toHaveAttribute('data-scooter-queue','arriving',{timeout:10000});
  const arrivalAngle=Number(await world.getAttribute('data-vehicle-wheel-angle'));
  await expect.poll(async()=>Math.abs(Number(await world.getAttribute('data-vehicle-wheel-angle'))-arrivalAngle)).toBeGreaterThan(.25);
  await page.screenshot({path:'docs/screenshots/wheels-rolling-1366.png'});
  await expect(world).toHaveAttribute('data-scooter-queue','stopped',{timeout:15000});
  await expect(world).toHaveAttribute('data-vehicle-brake','true');
  const scooterStoppedAngle=Number(await world.getAttribute('data-vehicle-wheel-angle'));
  await page.waitForTimeout(450);
  expect(Number(await world.getAttribute('data-vehicle-wheel-angle'))).toBeCloseTo(scooterStoppedAngle,2);
  await chooseSite(page,'parent');
  await expect(world).toHaveAttribute('data-parent-arrival-view','true');
  const parentAngle=Number(await world.getAttribute('data-vehicle-wheel-angle'));
  await expect.poll(async()=>Math.abs(Number(await world.getAttribute('data-vehicle-wheel-angle'))-parentAngle)).toBeGreaterThan(.25);
  await page.screenshot({path:'docs/screenshots/parent-wheels-rolling-1366.png'});
  await expect(world).toHaveAttribute('data-vehicle-brake','true',{timeout:10000});
  await expect(page.locator('#signal')).toHaveText('👀 後方暫時淨空',{timeout:15000});
  const parentStoppedAngle=Number(await world.getAttribute('data-vehicle-wheel-angle'));
  await page.waitForTimeout(450);
  expect(Number(await world.getAttribute('data-vehicle-wheel-angle'))).toBeCloseTo(parentStoppedAngle,2);
  await page.screenshot({path:'docs/screenshots/parent-wheels-stopped-1366.png'});
  await page.locator('#interact').click();
  await expect(world).toHaveAttribute('data-parent-arrival-view','false');
});
async function moveAndAct(page:Page,touch=false){
  const before=await stage(page);if(before==='completed')return;
  const mode=await page.locator('#app').getAttribute('data-mode');
  for(let attempt=0;attempt<3;attempt++){
    if(before==='cross')await expect(page.locator('#signal')).toHaveText('🚶 綠燈・已停讓',{timeout:60000});
    await press(page,'#assist',touch);
    await expect(page.locator('#assist')).toHaveText('◎ 前往標記',{timeout:40000});
    if(await stage(page)==='completed')return;
    await page.waitForTimeout(450);
    if(before==='compare'&&mode==='human')await expect(page.locator('#world')).toHaveAttribute('data-wheelchair-inside','true',{timeout:12000});
    if(before==='wait')await expect(page.locator('#signal')).toHaveText('🚶 綠燈・已停讓',{timeout:60000});
    if(['parent','scooter'].includes(mode??'')&&['park','arrival','rear','side','alight'].includes(before??''))await expect(page.locator('#signal')).toHaveText('👀 後方暫時淨空',{timeout:25000});
    else if(before==='clearance'||before==='arrival'||before==='side')await expect(page.locator('#signal')).toHaveText('🛑 已停穩',{timeout:10000});
    if(!(await page.locator('#feedback').isVisible()))await press(page,'#interact',touch);
    if(await page.locator('#feedback').isVisible()){
      await expect(page.locator('#feedback-message')).toContainText('先停看，等行人綠燈');
      await press(page,'#retry',touch);
      continue;
    }
    await expect.poll(()=>stage(page)).not.toBe(before);
    return;
  }
  throw new Error(`Repeated crossing signal change at ${before}`);
}
test('shuttle ride shows a 3D outside view with visibly turning wheels',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page,'after_school_shuttle_courtyard');
  let count=0;while(await stage(page)!=='depart'&&count++<10)await moveAndAct(page);
  await expect(page.locator('#app')).toHaveAttribute('data-stage','depart');
  await moveAndAct(page);
  await expect(page.locator('#ride-view')).toBeVisible();
  await expect(page.locator('#world')).toHaveAttribute('data-ride-preview','moving');
  const before=Number(await page.locator('#world').getAttribute('data-ride-wheel-angle'));
  await expect.poll(async()=>Math.abs(Number(await page.locator('#world').getAttribute('data-ride-wheel-angle'))-before),{timeout:3000}).toBeGreaterThan(.5);
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/shuttle-ride-wheels-1366.png'});
  await expect(page.locator('#ride-view')).toBeHidden({timeout:10000});
  await expect(page.locator('#world')).toHaveAttribute('data-ride-preview','off');
});
test('mobile shuttle ride keeps the rolling-wheel view inside the screen',async({page})=>{
  await page.setViewportSize({width:390,height:844});await start(page,'after_school_shuttle_courtyard');
  let count=0;while(await stage(page)!=='depart'&&count++<10)await moveAndAct(page);
  await moveAndAct(page);
  await expect(page.locator('#ride-view')).toBeVisible();
  const box=(await page.locator('#ride-view').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(390);
  const before=Number(await page.locator('#world').getAttribute('data-ride-wheel-angle'));
  await expect.poll(async()=>Math.abs(Number(await page.locator('#world').getAttribute('data-ride-wheel-angle'))-before),{timeout:3000}).toBeGreaterThan(.5);
  await page.screenshot({path:'docs/screenshots/shuttle-ride-wheels-390.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
test('three-car metro ride displays turning train wheels',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page,'mrt');
  let count=0;while(await stage(page)!=='depart'&&count++<12)await moveAndAct(page);
  await expect(page.locator('#app')).toHaveAttribute('data-stage','depart');
  await moveAndAct(page);
  await expect(page.locator('#ride-view')).toBeVisible();
  const before=Number(await page.locator('#world').getAttribute('data-ride-wheel-angle'));
  await expect.poll(async()=>Math.abs(Number(await page.locator('#world').getAttribute('data-ride-wheel-angle'))-before),{timeout:3000}).toBeGreaterThan(.5);
  await page.screenshot({path:'docs/screenshots/metro-ride-wheels-1366.png'});
});
for(const scene of ['school_bus_gate_exterior','bus'])test(`${scene} ride displays rolling wheels`,async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page,scene);
  let count=0;while(await stage(page)!=='depart'&&count++<12)await moveAndAct(page);
  await expect(page.locator('#app')).toHaveAttribute('data-stage','depart');
  await moveAndAct(page);
  await expect(page.locator('#ride-view')).toBeVisible();
  const before=Number(await page.locator('#world').getAttribute('data-ride-wheel-angle'));
  await expect.poll(async()=>Math.abs(Number(await page.locator('#world').getAttribute('data-ride-wheel-angle'))-before),{timeout:3000}).toBeGreaterThan(.5);
  await page.screenshot({path:`docs/screenshots/${scene}-ride-wheels-1366.png`});
});
for(const scene of ['walk','walk_side'])test(`${scene} enters school directly after crossing`,async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page,scene);
  await expect(page.locator('#greeting-reminder')).toBeHidden();
  let count=0;while(await stage(page)!=='cross'&&count++<7){
    if(await stage(page)==='wait'){
      await expect(page.locator('#objective')).toHaveText('確認行人號誌燈號');
      await expect(page.locator('#interact')).toHaveText('🚦 確認行人號誌燈號');
    }
    await moveAndAct(page);
  }
  await expect(page.locator('#app')).toHaveAttribute('data-stage','cross');
  await moveAndAct(page);
  await expect(page.locator('#app')).toHaveAttribute('data-stage','destination');
  await expect(page.locator('#status-banner')).toContainText('沿人行步道直接入校');
  await expect(page.locator('#signal')).toHaveText('🏫 直接入校');
  await expect(page.locator('#greeting-reminder')).toBeVisible();
  await expect(page.locator('#greeting-reminder')).toContainText('記得向老師／志工問好');
  await expect(page.locator('#greet')).toHaveText('👋 向老師／志工問好');
  if(scene==='walk_side'){
    await page.locator('#dismiss-greeting').click();
    await expect(page.locator('#greeting-reminder')).toBeHidden();
    await page.locator('#greet').click();
  }else{
    mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/teacher-reminder-1366.png'});
    await page.locator('#greet-now').click();
  }
  await expect(page.locator('#toast')).toContainText('早安');
  await expect(page.locator('#greet')).toHaveText('✓ 已向老師問好');
  await expect(page.locator('#greeting-reminder')).toBeHidden();
  await expect(page.locator('#app')).toHaveAttribute('data-stage','destination');
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:`docs/screenshots/teacher-greeting-${scene}-1366.png`});
  await press(page,'#assist');
  await expect(page.locator('#result')).toBeVisible({timeout:40000});
  await expect(page.locator('#app')).toHaveAttribute('data-stage','completed');
});
for(const size of sizes){
  test(`walk and shuttle playable ${size.width}x${size.height}`,async({page})=>{
    await page.setViewportSize(size);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
    for(let i=0;i<7;i++){
      if(await stage(page)==='wait'){
        await expect(page.locator('#interact')).toHaveText('🚦 確認行人號誌燈號');
        const button=(await page.locator('#interact').boundingBox())!;
        expect(button.x+button.width).toBeLessThanOrEqual(size.width);
        expect(button.height).toBeGreaterThanOrEqual(44);
        if(size.width===390)await page.screenshot({path:'docs/screenshots/mobile-pedestrian-signal-390.png'});
      }
      if(await stage(page)==='destination'){
        await expect(page.locator('#greeting-reminder')).toBeVisible();
        const reminder=(await page.locator('#greeting-reminder').boundingBox())!;
        expect(reminder.x).toBeGreaterThanOrEqual(0);
        expect(reminder.x+reminder.width).toBeLessThanOrEqual(size.width);
        if(size.width===390){const close=(await page.locator('#dismiss-greeting').boundingBox())!;const greetNow=(await page.locator('#greet-now').boundingBox())!;expect(greetNow.y).toBeGreaterThanOrEqual(close.y+close.height);}
        await expect(page.locator('#greet')).toHaveText('👋 向老師／志工問好');
        const button=(await page.locator('#greet').boundingBox())!;
        expect(button.x+button.width).toBeLessThanOrEqual(size.width);
        if(size.width===390)await page.screenshot({path:'docs/screenshots/mobile-teacher-reminder-390.png'});
        await page.locator('#greet-now').click();
        await expect(page.locator('#toast')).toContainText('早安');
        await expect(page.locator('#greeting-reminder')).toBeHidden();
        if(size.width===390)await page.screenshot({path:'docs/screenshots/mobile-teacher-greeting-390.png'});
      }
      await moveAndAct(page);
    }
    await expect(page.locator('#result')).toBeVisible();
    await page.locator('#choose').click();await chooseSite(page,'after_school_shuttle_courtyard');
    while(await stage(page)!=='seat')await moveAndAct(page);
    await expect(page.locator('#app')).toHaveAttribute('data-stage','seat');
    await moveAndAct(page);await moveAndAct(page);await moveAndAct(page);
    await page.locator('#release-belt').click();await expect(page.locator('#feedback')).toBeVisible();await expect(page.locator('#feedback-message')).toContainText('停穩');await page.locator('#demo').click();await page.locator('#retry').click();
    for(let i=0;i<5;i++)await moveAndAct(page);
    await expect(page.locator('#result')).toBeVisible();expect(errors).toEqual([]);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
    mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:`docs/screenshots/completed-${size.width}.png`});
    await expect(page.locator('#choose')).toContainText('回到本次起點');await page.locator('#choose').click();
    await expect(page.locator('#app')).toHaveAttribute('data-stage','explore');
    expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeCloseTo(5,1);
    expect(Number(await page.locator('#app').getAttribute('data-z'))).toBeCloseTo(-9,1);
    await expect(page.locator('#interact')).toContainText('安親班接駁');
  });
}
for(const size of sizes){test(`leave current practice from map and safety feedback ${size.width}x${size.height}`,async({page})=>{
  await page.setViewportSize(size);await start(page,'after_school_shuttle_courtyard');await expect(page.locator('#leave-practice')).toBeVisible();
  await page.locator('#leave-practice').click();await expect(page.locator('#app')).toHaveAttribute('data-stage','explore');await expect(page.locator('#leave-practice')).toBeHidden();
  expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeCloseTo(5,1);
  await page.locator('#interact').click();await page.keyboard.down('ArrowLeft');await expect(page.locator('#feedback')).toBeVisible({timeout:8000});await page.keyboard.up('ArrowLeft');
  await expect(page.locator('#leave-feedback')).toBeVisible();await page.locator('#leave-feedback').click();await expect(page.locator('#feedback')).toBeHidden();await expect(page.locator('#app')).toHaveAttribute('data-stage','explore');
  expect(Number(await page.locator('#app').getAttribute('data-z'))).toBeCloseTo(-9,1);
});}
test('every practice can restart and leave without losing its safe starting point',async({page})=>{
  test.setTimeout(360000);
  for(const scene of ['walk','walk_side','after_school_shuttle_courtyard','school_bus_gate_exterior','mrt','bus','parent','parent_east','scooter_main','scooter_side','transfer','human']){
    await start(page,scene);
    const firstStage=await stage(page);const firstX=await page.locator('#app').getAttribute('data-x');const firstZ=await page.locator('#app').getAttribute('data-z');
    await expect(page.locator('#restart-practice'),scene).toBeVisible();await expect(page.locator('#leave-practice'),scene).toBeVisible();
    await page.locator('#restart-practice').click();await expect(page.locator('#app')).toHaveAttribute('data-stage',firstStage!);
    await expect(page.locator('#app')).toHaveAttribute('data-x',firstX!);await expect(page.locator('#app')).toHaveAttribute('data-z',firstZ!);
    await page.locator('#leave-practice').click();await expect(page.locator('#app')).toHaveAttribute('data-stage','explore');
    await expect(page.locator('#practice-actions')).toBeHidden();
  }
});
test('pause and safety feedback offer both restart and exit',async({page})=>{
  await start(page,'after_school_shuttle_courtyard');
  await page.locator('#pause').click();await expect(page.locator('#restart-paused')).toBeVisible();await expect(page.locator('#leave-paused')).toBeVisible();
  await page.locator('#restart-paused').click();await expect(page.locator('#pause-panel')).toBeHidden();await expect(page.locator('#app')).toHaveAttribute('data-stage','assembly');
  await page.keyboard.down('ArrowLeft');await expect(page.locator('#feedback')).toBeVisible({timeout:8000});await page.keyboard.up('ArrowLeft');
  await expect(page.locator('#restart-feedback')).toBeVisible();await page.locator('#restart-feedback').click();await expect(page.locator('#feedback')).toBeHidden();
  await expect(page.locator('#app')).toHaveAttribute('data-stage','assembly');expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeCloseTo(5,1);
  await page.locator('#pause').click();await page.locator('#leave-paused').click();await expect(page.locator('#app')).toHaveAttribute('data-stage','explore');
});
test('MRT entrance remains visible while the player walks inside the open station',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page,'mrt');
  await expect(page.locator('#world')).toHaveAttribute('data-vehicle-z','17.20');
  await expect(page.locator('#world')).toHaveAttribute('data-vehicle-x','64.00',{timeout:15000});
  await expect(page.locator('#world')).toHaveAttribute('data-vehicle-brake','true');
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/mrt-arrived-platform-1366.png'});
  await moveAndAct(page);await expect(page.locator('#app')).toHaveAttribute('data-stage','station');
  await page.locator('#assist').click();await expect(page.locator('#assist')).toHaveText('◎ 前往標記',{timeout:40000});
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/mrt-open-station-1366.png'});
  for(let i=0;i<6&&await stage(page)!=='board';i++)await moveAndAct(page);
  await expect(page.locator('#app')).toHaveAttribute('data-stage','board');
  await page.locator('#assist').click();await expect(page.locator('#assist')).toHaveText('◎ 前往標記',{timeout:40000});
  await page.screenshot({path:'docs/screenshots/mrt-platform-1366.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/screenshots/mrt-platform-390.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.setViewportSize({width:1366,height:768});
  await page.locator('#interact').click();await expect(page.locator('#app')).toHaveAttribute('data-stage','rail');
  await page.screenshot({path:'docs/screenshots/mrt-cabin-1366.png'});
  await page.setViewportSize({width:390,height:844});await expect(page.locator('#restart-practice')).toBeVisible();
  await expect(page.locator('#leave-practice')).toBeVisible();await page.screenshot({path:'docs/screenshots/mrt-cabin-390.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.locator('#restart-practice').click();await expect(page.locator('#app')).toHaveAttribute('data-stage','assembly');
  await page.locator('#leave-practice').click();await expect(page.locator('#app')).toHaveAttribute('data-stage','explore');
});
test('keyboard movement, chain collision, demo, retry, teacher export',async({page})=>{
  await start(page,'after_school_shuttle_courtyard');
  // Begin on the tree-side pedestrian path; crossing left into the cone line must fail.
  await page.keyboard.down('ArrowLeft');await expect(page.locator('#feedback')).toBeVisible({timeout:8000});await page.keyboard.up('ArrowLeft');
  const x=Number(await page.locator('#app').getAttribute('data-x'));expect(x).toBeGreaterThan(1.4);await expect(page.locator('#feedback-message')).toContainText('鏈條');await page.locator('#demo').click();await page.locator('#retry').click();
  await page.locator('#settings').click();await page.locator('#reduced').check();await page.locator('[data-close="setting-panel"]').click();await moveAndAct(page);
  await page.locator('#teacher').click();await expect(page.locator('#event-list')).toContainText('unsafe_attempt');await expect(page.locator('#event-list')).toContainText('hint_viewed');const download=page.waitForEvent('download');await page.locator('#json').click();expect((await download).suggestedFilename()).toBe('wenxin-anonymous.json');
});
for(const scene of ['school_bus_gate_exterior','mrt','bus','parent','parent_east','scooter_main','scooter_side','transfer','human']){
  test(`complete spatial journey ${scene}`,async({page})=>{
    if(scene==='bus')test.setTimeout(360000);
    await start(page,scene);let count=0;while(await stage(page)!=='completed'&&count++<32)await moveAndAct(page);
    await expect(page.locator('#result'),scene).toBeVisible();
    if(scene==='school_bus_gate_exterior'){const history=await page.evaluate(()=>localStorage.getItem('wenxin-safety-v1'));expect(history).toContain('school_bus_gate_exterior');}
  });
}
test('human designer places the ramp before a wheelchair reaches the school entrance',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page,'human');
  await expect(page.locator('#world')).toHaveAttribute('data-ramp-visible','false');
  for(let n=0;n<3;n++)await moveAndAct(page);
  await expect(page.locator('#app')).toHaveAttribute('data-stage','compare');
  await expect(page.locator('#world')).toHaveAttribute('data-ramp-visible','true');
  await expect(page.locator('#world')).toHaveAttribute('data-wheelchair-phase','climbing',{timeout:5000});
  await page.screenshot({path:'docs/screenshots/human-ramp-climbing-1366.png'});
  await expect(page.locator('#world')).toHaveAttribute('data-wheelchair-phase','entering',{timeout:8000});
  await expect.poll(async()=>Number(await page.locator('#world').getAttribute('data-entrance-door-open'))).toBeGreaterThan(.9);
  await page.screenshot({path:'docs/screenshots/human-ramp-entering-1366.png'});
  await expect(page.locator('#world')).toHaveAttribute('data-wheelchair-inside','true',{timeout:8000});
  await expect.poll(async()=>Number(await page.locator('#world').getAttribute('data-wheelchair-z'))).toBeLessThan(-19);
  await expect(page.locator('#status-banner')).toContainText('已進入校舍');
  await page.screenshot({path:'docs/screenshots/human-school-ramp-1366.png'});
});
test('return walk follows opposite physical crossing',async({page})=>{
  await start(page,'walk',true);for(let i=0;i<7;i++)await moveAndAct(page);await expect(page.locator('#result')).toBeVisible();
});
test('side gate uses a separate crossing, teacher and Blender street model',async({page})=>{
  await page.setViewportSize({width:1366,height:768});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page,'walk_side');expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeLessThan(-40);expect(Number(await page.locator('#app').getAttribute('data-z'))).toBeLessThan(-20);
  const model=await page.request.get('/models/street_furniture.glb');expect(model.ok()).toBe(true);expect((await model.body()).byteLength).toBeGreaterThan(10000);
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/side-gate-1366.png'});
  for(let i=0;i<8;i++){
    if(await stage(page)==='wait'){
      await expect(page.locator('#world')).toHaveAttribute('data-pedestrian-signal','green-man',{timeout:20000});
      await expect(page.locator('#world')).toHaveAttribute('data-vehicle-signal','red');
      await expect(page.locator('#world')).toHaveAttribute('data-guides','directing',{timeout:20000});
      await page.screenshot({path:'docs/screenshots/guides-directing-side-1366.png'});
    }
    await moveAndAct(page);
  }
  await expect(page.locator('#result')).toBeVisible();expect(errors).toEqual([]);
});
test('side-gate cone chain guides the player around parking to the school building',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page,'walk_side');
  for(let i=0;i<6;i++)await moveAndAct(page);
  await expect(page.locator('#app')).toHaveAttribute('data-stage','destination');
  await page.locator('#assist').click();
  await expect.poll(async()=>Number(await page.locator('#app').getAttribute('data-x')),{timeout:30000}).toBeGreaterThan(-23);
  await page.locator('#assist').click();
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/side-gate-chain-1366.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/screenshots/side-gate-chain-390.png'});
  await page.keyboard.down('ArrowDown');await expect(page.locator('#feedback')).toBeVisible({timeout:7000});await page.keyboard.up('ArrowDown');
  await expect(page.locator('#feedback-message')).toContainText('側門錐鏈分隔停車區');
  await page.locator('#retry').click();await page.locator('#assist').click();
  await expect(page.locator('#result')).toBeVisible({timeout:40000});
  expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeCloseTo(-14,0);
  expect(Number(await page.locator('#app').getAttribute('data-z'))).toBeCloseTo(-17.2,0);
});
test('waiting on vehicle approach path is physically blocked',async({page})=>{
  await start(page,'school_bus_gate_exterior');await page.keyboard.down('ArrowUp');await expect(page.locator('#feedback')).toBeVisible({timeout:6000});await page.keyboard.up('ArrowUp');await expect(page.locator('#feedback-message')).toContainText('候車');expect(Number(await page.locator('#app').getAttribute('data-z'))).toBeGreaterThan(10.6);
});
test('mobile pointer buttons move the actual avatar; canvas renders and controls fit',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();await start(page);
  const before=Number(await page.locator('#app').getAttribute('data-x'));const button=page.getByRole('button',{name:'向右移動'});const b=(await button.boundingBox())!;const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await page.waitForTimeout(500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeGreaterThan(before+.5);
  for(const id of ['assist','interact']){const bounds=(await page.locator(`#${id}`).boundingBox())!;expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);expect(bounds.height).toBeGreaterThanOrEqual(44);}
  expect(await page.locator('canvas').evaluate(e=>(e as HTMLCanvasElement).width)).toBeGreaterThan(0);await context.close();
});
test('touch-only mobile completes walking and shuttle',async({browser})=>{
  test.setTimeout(300000);
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();await start(page,'walk',false,true);
  for(let i=0;i<7;i++)await moveAndAct(page,true);await expect(page.locator('#result')).toBeVisible();
  await press(page,'#choose',true);await chooseSite(page,'after_school_shuttle_courtyard',false,true);
  let count=0;while(await stage(page)!=='completed'&&count++<24){if(await stage(page)==='arrival'){await expect(page.locator('#signal')).toHaveText('🚐 車輛移動中');await press(page,'#help',true);await expect(page.locator('#feedback')).not.toBeVisible();}await moveAndAct(page,true);}await expect(page.locator('#result')).toBeVisible();await context.close();
});
test('browser without randomUUID can play and save anonymous evidence',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(crypto,'randomUUID',{value:undefined,configurable:true}));
  await start(page);await moveAndAct(page);
  const events=await page.evaluate(()=>JSON.parse(localStorage.getItem('wenxin-safety-v1')??'[]') as {sessionId:string}[]);
  expect(events.length).toBeGreaterThan(0);expect(events[0].sessionId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});

test('parent drop-off starts in a car and prevents opening the door while moving',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page,'parent');
  await expect(page.locator('#app')).toHaveAttribute('data-stage','park');
  await expect(page.locator('#app')).toHaveAttribute('data-mode','parent');
  await expect(page.locator('#interaction-hint')).toContainText('車內坐穩');
  await expect(page.locator('#toast')).toContainText('已坐在車上');
  expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeCloseTo(130,1);
  await page.screenshot({path:'docs/screenshots/parent-dropoff-1366.png'});
  await page.locator('#exit-vehicle').click();await expect(page.locator('#feedback')).toBeVisible();
  await expect(page.locator('#feedback-message')).toContainText('車停穩');
  await page.locator('#feedback .dialog-close').click();
  await expect(page.locator('#app')).toHaveAttribute('data-stage','park');
  await expect(page.locator('#signal')).toHaveText('👀 後方暫時淨空',{timeout:15000});
  await page.locator('#interact').click();await expect(page.locator('#app')).toHaveAttribute('data-stage','unbuckle');
});

test('main-gate scooter follows the lead vehicle into its own stopping bay',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page,'scooter_main');
  await expect(page.locator('#interaction-hint')).toContainText('車內坐穩');
  await expect(page.locator('#world')).toHaveAttribute('data-scooter-queue','lead-departing');
  await expect(page.locator('#status-banner')).toContainText('前車駛離中');
  const leadX=Number(await page.locator('#world').getAttribute('data-scooter-lead-x'));
  await page.waitForTimeout(300);
  expect(Number(await page.locator('#world').getAttribute('data-scooter-lead-x'))).toBeGreaterThan(leadX);
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/scooter-main-queue-1366.png'});
  await expect(page.locator('#world')).toHaveAttribute('data-scooter-queue','stopped',{timeout:15000});
  await expect(page.locator('#status-banner')).toContainText('機車已停穩');
});

test('touch scooter arrival waits for its turn before the side-gate drop-off',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
  await start(page,'scooter_side',false,true);await expect(page.locator('#app')).toHaveAttribute('data-stage','arrival');
  await expect(page.locator('#app')).toHaveAttribute('data-mode','scooter');
  await expect(page.locator('#interaction-hint')).toContainText('車內坐穩');
  await expect(page.locator('#toast')).toContainText('已坐在車上');
  await expect(page.locator('#world')).toHaveAttribute('data-scooter-queue','lead-departing');
  await expect(page.locator('#status-banner')).toContainText('前車駛離中');
  const hud=await page.locator('#hud').boundingBox(),banner=await page.locator('#status-banner').boundingBox();
  expect(hud&&banner&&banner.y>=hud.y+hud.height).toBe(true);
  expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeCloseTo(120,1);
  await page.screenshot({path:'docs/screenshots/scooter-dropoff-390.png'});
  await page.locator('#exit-vehicle').tap();await expect(page.locator('#feedback')).toBeVisible();
  await expect(page.locator('#feedback-message')).toContainText('機車停穩');
  await page.locator('#feedback .dialog-close').tap();
  await expect(page.locator('#app')).toHaveAttribute('data-stage','arrival');
  await expect(page.locator('#world')).toHaveAttribute('data-scooter-queue','stopped',{timeout:15000});
  await expect(page.locator('#status-banner')).toContainText('機車已停穩');
  await page.screenshot({path:'docs/screenshots/scooter-stopped-390.png'});
  await context.close();
});
