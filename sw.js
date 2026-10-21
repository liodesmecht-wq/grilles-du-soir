// Grilles du soir — service worker
// L'appli s'ouvre toujours depuis la copie enregistrée sur le téléphone.
// Quand le site répond correctement, la copie est mise à jour en arrière-plan
// (la nouvelle version apparaît à l'ouverture suivante). Si le site est coupé
// ou renvoie une erreur (404…), la copie enregistrée n'est jamais remplacée.
const CACHE='grilles-v7';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png','favicon.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});

async function refresh(req,key){
  try{
    const res=await fetch(req,{cache:'no-store'});
    if(res.ok){const c=await caches.open(CACHE);await c.put(key,res.clone())}
    return res.ok?res:null;
  }catch(err){return null}
}

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;

  if(r.mode==='navigate'){
    e.respondWith((async()=>{
      const saved=await caches.match('index.html');
      const fresh=refresh(r,'index.html');
      if(saved){e.waitUntil(fresh);return saved}
      return (await fresh)||new Response('<h1>Hors ligne</h1><p>Ouvre l\'appli une première fois avec une connexion.</p>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
    })());
    return;
  }

  e.respondWith((async()=>{
    const hit=await caches.match(r);
    if(hit)return hit;
    try{
      const res=await fetch(r);
      if(res.ok||res.type==='opaque'){const c=await caches.open(CACHE);c.put(r,res.clone())}
      return res;
    }catch(err){return Response.error()}
  })());
});
