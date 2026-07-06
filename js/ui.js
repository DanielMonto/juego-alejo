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
function abrirMedallero(){ refrescarChips(); renderMedallero(); mostrar('sMedallero'); }
function abrirPersonalizar(){ renderPersonalizar(); mostrar('sPersonalizar'); }

/* ---- Mapa (grid de mundos expandibles) ---- */
var mundoExpandido=-1;
function renderMapa(){
  var grid=document.getElementById('mundosGrid'); grid.innerHTML='';
  for(var m=0;m<MUNDOS.length;m++){
    var mu=MUNDOS[m];
    var desbloq=m<=save.mundoDesbloqueado;
    var terminado=mundoTerminado(m);
    var expandido=mundoExpandido===m;

    var card=document.createElement('div');
    card.className='mundo-card'+(desbloq?'':' bloq')+(expandido?' expandido':'')+(terminado?' completado':'');
    card.style.background=temaGradient(mu.tema);

    // Cabecera del mundo
    var header=document.createElement('div'); header.className='mundo-header';
    var progreso=0;
    if(desbloq){ for(var r=0;r<RETOS_POR_MUNDO;r++){ if(retoCompletado(m,r)) progreso++; } }
    header.innerHTML='<span class="mundo-emoji">'+mu.emoji+'</span>'+
      '<span class="mundo-nombre">'+mu.nombre+'</span>'+
      (desbloq?'<span class="mundo-prog">'+progreso+'/'+RETOS_POR_MUNDO+'</span>':'<i data-lucide="lock" style="width:18px;height:18px;color:rgba(255,255,255,.7)"></i>');
    card.appendChild(header);

    // Retos (visibles solo si expandido)
    if(expandido&&desbloq){
      var retos=document.createElement('div'); retos.className='mundo-retos';
      for(var r2=0;r2<RETOS_POR_MUNDO;r2++) retos.appendChild(nodoReto(m,r2));
      card.appendChild(retos);
    }

    // Click para expandir/colapsar
    (function(idx,desb){
      card.onclick=function(){
        if(!desb){ toast('Termina el mundo anterior'); return; }
        mundoExpandido=mundoExpandido===idx?-1:idx;
        renderMapa();
      };
    })(m,desbloq);

    grid.appendChild(card);
  }
  lucide.createIcons();
}
function nodoReto(m,r){
  var d=document.createElement('div'); d.className='reto-nodo';
  var data=retoData(m,r), desbloq=retoDesbloqueado(m,r);
  if(!desbloq){ d.className+=' bloq'; d.innerHTML='<div class="rn-num">Reto '+(r+1)+'</div><div class="rn-cand"><i data-lucide="lock" style="width:20px;height:20px"></i></div>'; return d; }
  var tro=data?trofeoEmoji(data.trofeo):'--';
  var est=data?('<i data-lucide="star" class="star-filled"></i>'.repeat(data.estrellas)+'<i data-lucide="star" class="star-empty"></i>'.repeat(3-data.estrellas)):('<i data-lucide="star" class="star-empty"></i>'.repeat(3));
  d.innerHTML='<div class="rn-num">Reto '+(r+1)+'</div><div class="rn-tro">'+tro+'</div><div class="rn-estrellas">'+est+'</div>';
  d.onclick=function(e){ e.stopPropagation(); iniciarReto(m,r); };
  return d;
}
function trofeoEmoji(t){ return t==='copa'?'🏆':t==='oro'?'🥇':t==='plata'?'🥈':t==='bronce'?'🥉':'--'; }
function temaGradient(tema){
  var map={ pradera:'linear-gradient(135deg,#7ec8ff,#b6f36b)', desierto:'linear-gradient(135deg,#e9d5a0,#f2d488)',
    nieve:'linear-gradient(135deg,#dff1ff,#b8d8e8)', volcan:'linear-gradient(135deg,#8a3b3b,#5a2b2b)',
    playa:'linear-gradient(135deg,#8fd0ff,#ffe6a8)', noche:'linear-gradient(135deg,#26306a,#10163a)' };
  return map[tema]||map.pradera;
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
    var nombres={
      '#d62828':'Rojo','#ff8a00':'Naranja','#ffcf1a':'Amarillo','#2fb344':'Verde',
      '#2f7de0':'Azul','#8a4fe0':'Morado','#ff4fa0':'Rosado','#111111':'Negro'};
    d.style.background=c; d.onclick=function(){ save.colorPajaro=c; guardar(); renderPersonalizar(); hablar(nombres[c]||'Color elegido'); }; caja.appendChild(d); })(COLORES_PAJARO[i]); }
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

