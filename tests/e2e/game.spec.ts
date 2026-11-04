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
    await page.locator('#missions').click();await page.locator('[data-place="school_bus_gate_exterior"]').click();
    expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeGreaterThan(20);
    await page.locator('#missions').click();await page.locator('[data-place="parent"]').click();
    expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeLessThan(-15);
    expect(errors).toEqual([]);
  });
}
async function press(page:Page,selector:string,touch=false){if(touch)await page.locator(selector).tap();else await page.locator(selector).click();}
async function chooseSite(page:Page,scene:string,reverse=false,touch=false){await press(page,'#missions',touch);if(reverse)await page.locator('#direction').selectOption('fromSchool');await press(page,`[data-place="${scene}"]`,touch);await press(page,'#interact',touch);}
async function start(page:Page,scene='walk',reverse=false,touch=false){await page.goto('/');await press(page,'#start',touch);if(scene!=='walk'||reverse)await chooseSite(page,scene,reverse,touch);else await press(page,'#interact',touch);await expect(page.locator('#hud')).toBeVisible();}
async function stage(page:Page){return page.locator('#app').getAttribute('data-stage');}
test('main and side crossing show a green walking figure only while cars stop',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await start(page);
  await expect(page.locator('#world')).toHaveAttribute('data-pedestrian-signal','red');
  await expect(page.locator('#world')).toHaveAttribute('data-vehicle-signal','green');
  await expect(page.locator('#status-banner')).toContainText('行人紅燈');
  await expect(page.locator('#world')).toHaveAttribute('data-pedestrian-signal','green-man',{timeout:20000});
  await expect(page.locator('#world')).toHaveAttribute('data-vehicle-signal','red');
  await expect(page.locator('#world')).toHaveAttribute('data-main-car','stopped');
  await expect(page.locator('#world')).toHaveAttribute('data-side-car','stopped');
  await expect(page.locator('#status-banner')).toContainText('小綠人亮起');
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/green-man-crossing-1366.png'});
});
async function moveAndAct(page:Page,touch=false){
  const before=await stage(page);if(before==='completed')return;
  const mode=await page.locator('#app').getAttribute('data-mode');
  for(let attempt=0;attempt<3;attempt++){
    if(before==='cross')await expect(page.locator('#signal')).toHaveText('🚶 綠燈・已停讓',{timeout:60000});
    await press(page,'#assist',touch);
    await expect(page.locator('#assist')).toHaveText('◎ 前往標記',{timeout:40000});
    await page.waitForTimeout(450);
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
for(const size of sizes){
  test(`walk and shuttle playable ${size.width}x${size.height}`,async({page})=>{
    await page.setViewportSize(size);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
    for(let i=0;i<7;i++)await moveAndAct(page);
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
  for(const scene of ['walk','walk_side','guard','after_school_shuttle_courtyard','school_bus_gate_exterior','mrt','bus','parent','parent_east','scooter_main','scooter_side','transfer','human']){
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
  await moveAndAct(page);await expect(page.locator('#app')).toHaveAttribute('data-stage','station');
  await page.locator('#assist').click();await expect(page.locator('#assist')).toHaveText('◎ 前往標記',{timeout:40000});
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/mrt-open-station-1366.png'});
  for(let i=0;i<6&&await stage(page)!=='board';i++)await moveAndAct(page);
  await expect(page.locator('#app')).toHaveAttribute('data-stage','board');
  await page.locator('#assist').click();await expect(page.locator('#assist')).toHaveText('◎ 前往標記',{timeout:40000});
  await page.screenshot({path:'docs/screenshots/mrt-platform-1366.png'});
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
for(const scene of ['school_bus_gate_exterior','mrt','bus','parent','parent_east','scooter_main','scooter_side','transfer','human','guard']){
  test(`complete spatial journey ${scene}`,async({page})=>{
    if(scene==='bus')test.setTimeout(360000);
    await start(page,scene);let count=0;while(await stage(page)!=='completed'&&count++<32)await moveAndAct(page);
    await expect(page.locator('#result'),scene).toBeVisible();
    if(scene==='school_bus_gate_exterior'){const history=await page.evaluate(()=>localStorage.getItem('wenxin-safety-v1'));expect(history).toContain('school_bus_gate_exterior');}
  });
}
test('return walk follows opposite physical crossing',async({page})=>{
  await start(page,'walk',true);for(let i=0;i<7;i++)await moveAndAct(page);await expect(page.locator('#result')).toBeVisible();
});
test('side gate uses a separate crossing, guard and Blender street model',async({page})=>{
  await page.setViewportSize({width:1366,height:768});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page,'walk_side');expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeLessThan(-40);expect(Number(await page.locator('#app').getAttribute('data-z'))).toBeLessThan(-20);
  const model=await page.request.get('/models/street_furniture.glb');expect(model.ok()).toBe(true);expect((await model.body()).byteLength).toBeGreaterThan(10000);
  mkdirSync('docs/screenshots',{recursive:true});await page.screenshot({path:'docs/screenshots/side-gate-1366.png'});
  for(let i=0;i<8;i++)await moveAndAct(page);await expect(page.locator('#result')).toBeVisible();expect(errors).toEqual([]);
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
