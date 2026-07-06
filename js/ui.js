/* ============================================================
   UI — Navegación, menús, mapa, medallero, personalizar
============================================================ */

/* ---- Navegación ---- */
function mostrar(id){
  var s=document.querySelectorAll('.screen'); for(var i=0;i<s.length;i++) s[i].classList.remove('active');
  document.getElementById('juego').classList.remove('active');
  if(id==='juego') document.getElementById('juego').classList.add('active');
  else document.getElementById(id).classList.add('active');
}
function refrescarChips(){ var v=save.copas;
  var a=document.getElementById('chipCopas'); if(a) a.textContent=v;
  var b=document.getElementById('chipCopas2'); if(b) b.textContent=v;
  var t=document.getElementById('tituloMenu'); if(t) t.textContent='Aventura de '+(save.nombre||'Alejo');
  var r=document.getElementById('chipRecord'); if(r) r.textContent=save.rachaMax||0;
}

/* ---- Toast ---- */
var toastCola=[], toastActivo=false;
function toast(msg){ toastCola.push(msg); if(!toastActivo) siguienteToast(); }
function siguienteToast(){ if(!toastCola.length){ toastActivo=false; return; } toastActivo=true;
  var el=document.getElementById('toast'); el.innerHTML=toastCola.shift(); el.classList.add('show');
  setTimeout(function(){ el.classList.remove('show'); setTimeout(siguienteToast,500); }, 2600); }

/* ---- Menú ---- */
function abrirMapa(){ initAudio(); mundoVista=Math.min(save.mundoDesbloqueado, MUNDOS.length-1); refrescarChips(); renderMapa(); mostrar('sMapa'); hablar('Elige un reto'); }
function abrirLibre(){ initAudio(); mostrarSelectorLibre(); }
function abrirMedallero(){ refrescarChips(); renderMedallero(); mostrar('sMedallero'); }
function abrirPersonalizar(){ renderPersonalizar(); mostrar('sPersonalizar'); }

var libreConfig={modo:'mixto', nivel:1, abierto:false};
function mostrarSelectorLibre(){ libreConfig.abierto=true; renderLibrePicker(); }

/* ---- Mapa ---- */
var mundoVista=0;
function cambiarMundo(d){ var n=mundoVista+d; if(n<0||n>=MUNDOS.length) return; if(n>save.mundoDesbloqueado){ toast('Termina el mundo anterior'); return; } mundoVista=n; renderMapa(); }
function renderMapa(){
  var m=MUNDOS[mundoVista];
  document.getElementById('tituloMundo').textContent=m.emoji+' '+m.nombre;
  document.getElementById('btnMundoPrev').style.visibility = mundoVista>0?'visible':'hidden';
  document.getElementById('btnMundoNext').style.visibility = (mundoVista<MUNDOS.length-1 && mundoVista<save.mundoDesbloqueado)?'visible':'hidden';
  var caja=document.getElementById('retosCaja'); caja.innerHTML='';
  for(var r=0;r<RETOS_POR_MUNDO;r++){ caja.appendChild(nodoReto(mundoVista,r)); }
  aplicarTemaFondo('sMapa', m.tema);
}
function nodoReto(m,r){
  var d=document.createElement('div'); d.className='reto-nodo';
  var data=retoData(m,r), desbloq=retoDesbloqueado(m,r);
  if(!desbloq){ d.className+=' bloq'; d.innerHTML='<div class="rn-num">Reto '+(r+1)+'</div><div class="rn-cand"><i data-lucide="lock"></i></div>'; lucide.createIcons({nameAttr:'data-lucide',attrs:{width:36,height:36}}); return d; }
  var tro=data?trofeoEmoji(data.trofeo):'--';
  var est=data?('<i data-lucide="star" class="star-filled"></i>'.repeat(data.estrellas)+'<i data-lucide="star" class="star-empty"></i>'.repeat(3-data.estrellas)):('<i data-lucide="star" class="star-empty"></i>'.repeat(3));
  d.innerHTML='<div class="rn-num">Reto '+(r+1)+'</div><div class="rn-tro">'+tro+'</div><div class="rn-estrellas">'+est+'</div>';
  d.onclick=function(){ iniciarReto(m,r); };
  return d;
}
function trofeoEmoji(t){ return t==='copa'?'🏆':t==='oro'?'🥇':t==='plata'?'🥈':t==='bronce'?'🥉':'--'; }
function aplicarTemaFondo(screenId, tema){
  var map={ pradera:'linear-gradient(160deg,#7ec8ff,#b6f36b)', desierto:'linear-gradient(160deg,#bfe3ff,#f2d488)',
    nieve:'linear-gradient(160deg,#dff1ff,#dce9f2)', volcan:'linear-gradient(160deg,#5a2b2b,#8a3b3b)',
    playa:'linear-gradient(160deg,#8fd0ff,#ffe6a8)', noche:'linear-gradient(160deg,#10163a,#26306a)' };
  var el=document.getElementById(screenId); if(el) el.style.background=map[tema]||map.pradera;
}

/* ---- Medallero ---- */
function renderMedallero(){
  var caja=document.getElementById('medallasCaja'); caja.innerHTML='';
  var ganados=0;
  for(var i=0;i<LOGROS.length;i++){ var L=LOGROS[i]; var ok=save.logros.indexOf(L.id)!==-1 || L.cond();
    if(ok && save.logros.indexOf(L.id)===-1){ save.logros.push(L.id); }
    if(ok) ganados++;
    var d=document.createElement('div'); d.className='medalla'+(ok?'':' bloq');
    d.innerHTML='<div class="m-em">'+(ok?L.em:'<i data-lucide="lock"></i>')+'</div><div class="m-nom">'+L.nom+'</div><div class="m-desc">'+L.desc+'</div>';
    caja.appendChild(d); }
  guardar();
  document.getElementById('subMedallero').textContent='Llevas '+ganados+' de '+LOGROS.length+' logros — '+save.copas+' copas';
  lucide.createIcons();
}
function revisarLogros(){ for(var i=0;i<LOGROS.length;i++){ var L=LOGROS[i]; if(save.logros.indexOf(L.id)===-1 && L.cond()){ save.logros.push(L.id); toast(L.em+' ¡Logro! '+L.nom); } } guardar(); }

/* ---- Personalizar ---- */
function renderPersonalizar(){
  document.getElementById('inpNombre').value=save.nombre||'';
  var caja=document.getElementById('coloresCaja'); caja.innerHTML='';
  for(var i=0;i<COLORES_PAJARO.length;i++){ (function(c){ var d=document.createElement('div'); d.className='color-op'+(c===save.colorPajaro?' sel':'');
    d.style.background=c; d.onclick=function(){ save.colorPajaro=c; guardar(); renderPersonalizar(); hablar('¡Qué lindo color!'); }; caja.appendChild(d); })(COLORES_PAJARO[i]); }
  dibujarPreview();
}
function dibujarPreview(){ var cvp=document.getElementById('previewCanvas'); if(!cvp) return; var c=cvp.getContext('2d');
  var W2=cvp.width,H2=cvp.height; c.clearRect(0,0,W2,H2); var col=save.colorPajaro; var cx=W2*0.46, cy=H2*0.55, r=W2*0.28;
  c.fillStyle=sombra(col,-40); c.beginPath(); c.moveTo(cx-r*0.7,cy); c.lineTo(cx-r*1.5,cy-r*0.45); c.lineTo(cx-r*1.35,cy); c.lineTo(cx-r*1.5,cy+r*0.45); c.closePath(); c.fill();
  var g=c.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.2,cx,cy,r); g.addColorStop(0,sombra(col,40)); g.addColorStop(1,col); c.fillStyle=g; c.strokeStyle=sombra(col,-50); c.lineWidth=3; c.beginPath(); c.arc(cx,cy,r,0,7); c.fill(); c.stroke();
  c.fillStyle='#ffe0c2'; c.beginPath(); c.ellipse(cx+r*0.12,cy+r*0.4,r*0.5,r*0.4,0,0,7); c.fill();
  c.strokeStyle=sombra(col,-50); c.lineWidth=r*0.13; c.lineCap='round'; c.beginPath(); c.moveTo(cx-r*0.1,cy-r*0.95); c.lineTo(cx-r*0.28,cy-r*1.4); c.stroke(); c.beginPath(); c.moveTo(cx+r*0.18,cy-r*0.95); c.lineTo(cx+r*0.08,cy-r*1.45); c.stroke();
  c.fillStyle='#fff'; c.beginPath(); c.arc(cx+r*0.18,cy-r*0.28,r*0.29,0,7); c.fill(); c.beginPath(); c.arc(cx+r*0.6,cy-r*0.26,r*0.24,0,7); c.fill();
  c.fillStyle='#222'; c.beginPath(); c.arc(cx+r*0.3,cy-r*0.28,r*0.12,0,7); c.fill(); c.beginPath(); c.arc(cx+r*0.66,cy-r*0.26,r*0.11,0,7); c.fill();
  c.strokeStyle=sombra(col,-60); c.lineWidth=r*0.15; c.beginPath(); c.moveTo(cx-r*0.12,cy-r*0.75); c.lineTo(cx+r*0.5,cy-r*0.48); c.stroke(); c.beginPath(); c.moveTo(cx+r*0.82,cy-r*0.58); c.lineTo(cx+r*0.44,cy-r*0.44); c.stroke();
  c.fillStyle='#ff9500'; c.strokeStyle='#cc6d00'; c.lineWidth=2; c.beginPath(); c.moveTo(cx+r*0.85,cy-r*0.08); c.lineTo(cx+r*1.4,cy+r*0.06); c.lineTo(cx+r*0.85,cy+r*0.24); c.closePath(); c.fill(); c.stroke();
}
function guardarNombre(){ var v=document.getElementById('inpNombre').value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/g,''); save.nombre=v||'ALEJO'; guardar(); refrescarChips(); }

/* ---- Confeti ---- */
function lanzarConfeti(){ var cont=document.getElementById('confeti'); var cols=['#ff2e79','#ffd23f','#3ddc84','#3ec7ff','#7c5cff','#ff9a3c'];
  for(var i=0;i<60;i++){ var c=document.createElement('div'); c.className='conf'; c.style.left=rnd(0,100)+'vw'; c.style.background=cols[rnd(0,cols.length-1)];
    c.style.animationDuration=(rnd(18,34)/10)+'s'; c.style.animationDelay=(rnd(0,8)/10)+'s'; cont.appendChild(c);
    (function(n){ setTimeout(function(){ if(n.parentNode) n.parentNode.removeChild(n); },4200); })(c); } }

/* ---- Selector juego libre ---- */
function renderLibrePicker(){
  var modal=document.getElementById('modalLibre'); if(!modal){ modal=document.createElement('div'); modal.id='modalLibre'; modal.className='cartel'; modal.innerHTML=
    '<div class="cartelBox"><h2 style="color:#073b5c;text-shadow:none"><i data-lucide="target"></i> Juego libre</h2>'+
    '<div style="color:#073b5c;font-weight:bold;margin:6px">¿Qué practicas?</div>'+
    '<div class="btn-row"><button class="btn" style="background:linear-gradient(#ff9a3c,#ff6a00)" onclick="setLibreModo(\'suma\')"><i data-lucide="plus"></i> Sumar</button>'+
    '<button class="btn" style="background:linear-gradient(#7c5cff,#5a2ee0)" onclick="setLibreModo(\'resta\')"><i data-lucide="minus"></i> Restar</button>'+
    '<button class="btn" style="background:linear-gradient(#ff5fa2,#ff2e79)" onclick="setLibreModo(\'mixto\')"><i data-lucide="shuffle"></i> Los dos</button></div>'+
    '<div id="libreModoSel" style="color:#16a34a;font-weight:bold;margin:6px"></div>'+
    '<div style="color:#073b5c;font-weight:bold;margin:6px">Nivel</div>'+
    '<div class="btn-row"><button class="btn" style="background:linear-gradient(#3ec7ff,#1e8fe0)" onclick="iniciarLibre(libreConfig.modo,1)">Fácil</button>'+
    '<button class="btn" style="background:linear-gradient(#3ec7ff,#1e8fe0)" onclick="iniciarLibre(libreConfig.modo,2)">Medio</button>'+
    '<button class="btn" style="background:linear-gradient(#3ec7ff,#1e8fe0)" onclick="iniciarLibre(libreConfig.modo,3)">Fuerte</button></div>'+
    '<button class="btn small" onclick="cerrarLibrePicker()">Cerrar</button></div>';
    document.getElementById('app').appendChild(modal); }
  document.getElementById('libreModoSel').textContent='Modo: '+(libreConfig.modo==='suma'?'Sumar':libreConfig.modo==='resta'?'Restar':'Los dos');
  modal.classList.add('active');
  lucide.createIcons();
}
function setLibreModo(m){ libreConfig.modo=m; document.getElementById('libreModoSel').textContent='Modo: '+(m==='suma'?'Sumar':m==='resta'?'Restar':'Los dos'); }
function cerrarLibrePicker(){ var m=document.getElementById('modalLibre'); if(m) m.classList.remove('active'); }
