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
refrescarCfgBtns();
lucide.createIcons();

// PWA — registrar service worker + auto-update
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').then(function(reg){
    // Chequear updates cada 60 segundos
    setInterval(function(){ reg.update(); }, 60000);
  }).catch(function(){});

  // Cuando el SW manda UPDATE_AVAILABLE, recargar automaticamente
  navigator.serviceWorker.addEventListener('message', function(e){
    if(e.data && e.data.type==='UPDATE_AVAILABLE'){
      // Solo recargar si no esta en medio de un juego
      if(fase==='aim' || typeof fase==='undefined'){
        toast('Actualizando...');
        setTimeout(function(){ location.reload(); }, 1200);
      } else {
        // Si esta jugando, esperar a que vuelva al menu
        var _checkMenu=setInterval(function(){
          var menu=document.getElementById('sMenu');
          if(menu && menu.classList.contains('active')){
            clearInterval(_checkMenu);
            toast('Actualizando...');
            setTimeout(function(){ location.reload(); }, 1200);
          }
        }, 2000);
      }
    }
  });

  // Si el controller cambia (nuevo SW tomo control), recargar
  navigator.serviceWorker.addEventListener('controllerchange', function(){
    if(!document.hidden && (typeof fase==='undefined' || fase==='aim')){
      location.reload();
    }
  });
}
