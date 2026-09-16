const C='lasercraft-ncr-recut-v6-details';
const A=['./index.html','./manifest.webmanifest','./ncr-template.jpg','./schedule-status-fix.js','./schedule-status-fix.css'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(A)))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==C)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith((async()=>{
  try{
   const r=await fetch(e.request,{cache:'no-store'});
   if(e.request.mode==='navigate'){
    let html=await r.text();
    if(!html.includes('schedule-status-fix.css'))html=html.replace('</head>','<link rel="stylesheet" href="./schedule-status-fix.css?v=6"></head>');
    if(!html.includes('schedule-status-fix.js'))html=html.replace('</body>','<script src="./schedule-status-fix.js?v=6"></script></body>');
    const h=new Headers(r.headers);h.delete('content-length');h.set('cache-control','no-cache, no-store, must-revalidate');
    return new Response(html,{status:r.status,statusText:r.statusText,headers:h});
   }
   const x=r.clone();caches.open(C).then(c=>c.put(e.request,x));return r;
  }catch(_){return (await caches.match(e.request))||Response.error()}
 })())
});