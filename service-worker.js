const C='lasercraft-ncr-recut-v4-status';
const A=['./','./index.html','./manifest.webmanifest','./ncr-template.jpg','./schedule-status-fix.js','./schedule-status-fix.css'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(A)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 e.respondWith((async()=>{
  try{
   const r=await fetch(e.request);
   const type=r.headers.get('content-type')||'';
   if(e.request.mode==='navigate'&&type.includes('text/html')){
    let html=await r.text();
    if(!html.includes('schedule-status-fix.js')) html=html.replace('</head>','<link rel="stylesheet" href="./schedule-status-fix.css"></head>').replace('</body>','<script src="./schedule-status-fix.js"></script></body>');
    return new Response(html,{status:r.status,statusText:r.statusText,headers:r.headers});
   }
   const x=r.clone();caches.open(C).then(c=>c.put(e.request,x));return r;
  }catch(_){return caches.match(e.request)}
 })())
});