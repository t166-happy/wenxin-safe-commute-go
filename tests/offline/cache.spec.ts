import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
test('built application reloads and moves with network offline',async({page,context})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,{},{timeout:15000});
  const cached=await page.evaluate(async()=>{const cache=await caches.open((await caches.keys()).find(k=>k.startsWith('wenxin-'))!);return (await cache.keys()).map(r=>r.url);});
  expect(cached.some(p=>p.endsWith('.js'))).toBe(true);expect(cached.some(p=>p.endsWith('.css'))).toBe(true);
  expect(cached.some(p=>p.endsWith('.glb'))).toBe(true);
  await context.setOffline(true);await page.reload();await page.locator('#start').click();
  await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('#explore-hud')).toBeVisible();await expect(page.locator('#app')).toHaveAttribute('data-stage','explore');
  const initial=Number(await page.locator('#app').getAttribute('data-x'));await page.keyboard.down('ArrowRight');await page.waitForTimeout(400);await page.keyboard.up('ArrowRight');await expect.poll(async()=>Number(await page.locator('#app').getAttribute('data-x'))).toBeGreaterThan(initial+.5);
  expect(errors).toEqual([]);await context.setOffline(false);
});

test('production preview keeps school map and leave control usable at three sizes',async({page})=>{
  test.setTimeout(90000);
  const sizes=[{width:1366,height:768},{width:768,height:1024},{width:390,height:844}];
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  mkdirSync('docs/screenshots',{recursive:true});
  for(const size of sizes){
    await page.setViewportSize(size);await page.goto('/');await page.locator('#start').click();
    await expect(page.locator('#explore-hud')).toBeVisible();
    await expect(page.locator('#world')).toHaveAttribute('data-street-assets','loaded');
    await expect(page.locator('#app')).toHaveAttribute('data-view','campus-overview');
    expect(await page.locator('canvas').evaluate(e=>(e as HTMLCanvasElement).width)).toBeGreaterThan(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.screenshot({path:`docs/screenshots/preview-${size.width}.png`});
    await page.locator('#interact').click();await expect(page.locator('#leave-practice')).toBeVisible();
    await page.locator('#leave-practice').click();await expect(page.locator('#app')).toHaveAttribute('data-stage','explore');
  }
  expect(errors).toEqual([]);
});

test('overview shows the perimeter and side gate can be visited from its own street',async({page})=>{
  await page.setViewportSize({width:1366,height:768});await page.goto('/');await page.locator('#start').click();
  await expect(page.locator('#world')).toHaveAttribute('data-street-assets','loaded');
  await expect(page.locator('#app')).toHaveAttribute('data-view','campus-overview');
  await page.screenshot({path:'docs/screenshots/campus-overview-1366.png'});
  await page.locator('#overview').click();await expect(page.locator('#app')).toHaveAttribute('data-view','follow');
  await page.waitForTimeout(350);await page.screenshot({path:'docs/screenshots/front-gate-new-1366.png'});
  await page.locator('#missions').click();await page.locator('[data-place="walk_side"]').click();
  expect(Number(await page.locator('#app').getAttribute('data-x'))).toBeLessThan(-40);
  await page.waitForTimeout(400);await page.screenshot({path:'docs/screenshots/side-gate-new-1366.png'});
});

test('nearby labels and closable pause or guide leave the map playable',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await expect(page.locator('dialog .dialog-close')).toHaveCount(8);
  await page.locator('#menu .dialog-close').click();
  await expect(page.locator('#app')).toHaveAttribute('data-view','campus-overview');
  await expect(page.locator('#world')).toHaveAttribute('data-visible-labels','0');
  await page.locator('#overview').click();
  await expect.poll(async()=>Number(await page.locator('#world').getAttribute('data-visible-labels'))).toBeGreaterThan(0);
  expect(Number(await page.locator('#world').getAttribute('data-visible-labels'))).toBeLessThanOrEqual(1);
  const nearStart=await page.locator('#world').getAttribute('data-nearby-labels');
  await page.locator('#guide').click();
  await expect(page.locator('#guide-panel')).toBeVisible();
  expect(await page.locator('.guide-scroll').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  const before=await page.locator('#app').getAttribute('data-x');
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');
  expect(await page.locator('#app').getAttribute('data-x')).toBe(before);
  await page.locator('#guide-panel .dialog-close').click();
  await page.locator('#pause').click();await expect(page.locator('#pause-panel')).toBeVisible();
  await page.locator('#pause-panel .dialog-close').click();
  await page.locator('#missions').click();await page.locator('[data-place="mrt"]').click();
  await expect.poll(async()=>await page.locator('#world').getAttribute('data-nearby-labels')).not.toBe(nearStart);
  expect(Number(await page.locator('#world').getAttribute('data-visible-labels'))).toBeLessThanOrEqual(1);
});
