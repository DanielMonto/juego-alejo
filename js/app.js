/* ============================================================
   APP — Inicialización y PWA
============================================================ */

document.getElementById('mascotaMenu').addEventListener('click',function(){
  this.classList.remove('happy'); void this.offsetWidth; this.classList.add('happy');
  initAudio(); beep(600,0.15,'sine');
  hablar('¡Pío pío! Soy el pájaro de '+(save.nombre||'Alejo'));
});

document.body.addEventListener('touchstart',initAudio,{once:true});
document.body.addEventListener('click',initAudio,{once:true});

refrescarChips();
lucide.createIcons();

// PWA — registrar service worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(function(){});
}
