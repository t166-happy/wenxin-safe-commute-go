import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const paths=['index.html','favicon.svg',...(await readdir('dist/assets')).map(name=>`assets/${name}`),...(await readdir('dist/models')).map(name=>`models/${name}`)];
const hash=createHash('sha256');for(const path of paths)hash.update(await readFile(`dist/${path}`));
const version=`wenxin-${hash.digest('hex').slice(0,12)}`;
const body=`const CACHE=${JSON.stringify(version)};
const FILES=${JSON.stringify(['./',...paths.map(p=>'./'+p)])};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith('wenxin-')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('./',copy)));}return response;}).catch(()=>caches.match('./index.html',{ignoreVary:true})));return;}
event.respondWith(caches.match(event.request,{ignoreVary:true}).then(cached=>cached||fetch(event.request).catch(()=>Response.error())));});
`;
await writeFile('dist/sw.js',body);console.log(`Offline bundle ${version}: ${paths.length} static files`);
