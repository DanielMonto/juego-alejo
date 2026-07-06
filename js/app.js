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

cargarPersonajeGuardado();
refrescarChips();
lucide.createIcons();

// PWA — registrar service worker + auto-update
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').then(function(reg){
    setInterval(function(){ reg.update(); }, 60000);
  }).catch(function(){});

  navigator.serviceWorker.addEventListener('message', function(e){
    if(e.data && e.data.type==='UPDATE_AVAILABLE'){
      toast('Actualizando...');
      setTimeout(function(){ location.reload(); }, 1200);
    }
  });
}
