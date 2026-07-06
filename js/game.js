/* ============================================================
   GAME — Lógica de rondas, escena, puntuación, conteo
============================================================ */

var cfgActual={maxRes:10,pisosMax:1,mats:['wood'],tnt:0,tema:'pradera'};
var modo='aventura'; // 'aventura' | 'libre' | 'racha'
var retoMundo=0, retoIdx=0, rondaActual=0, primerIntento=0, rondaFallada=false;
var estado={a:0,b:0,op:'+',tipo:'suma',resultado:0};
var rachaActual=0, rondaResuelta=false;
var pajaroSel='rojo', dashUsado=false, bombaUsada=false;
var vidas=3;

/* ---- Config global de dificultad ---- */
function getMaxRes(){
  var d=save.dificultad||'facil';
  return d==='facil'?10:d==='normal'?30:100;
}
function getModoOp(){ return save.tipoOp||'mixto'; }
function setDificultad(d){ save.dificultad=d; guardar(); refrescarCfgBtns(); }
function setTipoOp(t){ save.tipoOp=t; guardar(); refrescarCfgBtns(); }
function refrescarCfgBtns(){
  var ds=['facil','normal','dificil'], ts=['suma','resta','mixto'];
  for(var i=0;i<ds.length;i++){var el=document.getElementById('cfg'+ds[i].charAt(0).toUpperCase()+ds[i].slice(1));if(el)el.className='cfg-btn'+(save.dificultad===ds[i]?' sel':'');}
  for(var j=0;j<ts.length;j++){var el2=document.getElementById('cfg'+ts[j].charAt(0).toUpperCase()+ts[j].slice(1));if(el2)el2.className='cfg-btn'+(save.tipoOp===ts[j]?' sel':'');}
}

/* ---- Vidas (global, ambos modos) ---- */
function perderVida(){
  vidas--;
  actualizarVidasHud();
  sonidoMal();
  rondaFallada=true;
  if(vidas<=0){
    setTimeout(function(){ mostrarGameOver(); }, 800);
  } else {
    hablar('¡Ese no! Era '+estado.resultado+'. Te quedan '+vidas);
    // Resetear pajaro en la MISMA ronda
    setTimeout(function(){
      var pm=paramsPajaro(pajaroSel);
      bird={x:anchor.x,y:anchor.y,vx:0,vy:0,r:Math.min(W,H)*0.035*pm.rMul,angle:0};
      dashUsado=false; bombaUsada=false; fase='aim';
    }, 700);
  }
}
function actualizarVidasHud(){
  var el=document.getElementById('hudVidas'); if(!el) return;
  var h='';
  for(var i=0;i<3;i++) h+=(i<vidas?'<span class="racha-vida">&#x2764;</span>':'<span class="racha-vida muerta">&#x2764;</span>');
  el.innerHTML=h;
}
function mostrarGameOver(){
  fase='resolver';
  if(modo==='racha') ocultarHudRacha();
  document.getElementById('goRacha').textContent=modo==='racha'?rachaRacha:primerIntento+'/'+RONDAS_POR_RETO;
  document.getElementById('goMejor').textContent=save.rachaMax;
  document.getElementById('goNivel').textContent=modo==='racha'?RACHA_NIVELES[rachaNivelIdx].nombre:'Reto '+(retoIdx+1);
  document.getElementById('cartelGameOver').classList.add('active');
  hablar('Se acabaron las vidas');
}

/* ---- Iniciar RETO de aventura ---- */
function iniciarReto(m,r){ modo='aventura'; retoMundo=m; retoIdx=r; rondaActual=0; primerIntento=0; vidas=3;
  var mu=MUNDOS[m]; cfgActual={maxRes:Math.max(mu.maxRes,getMaxRes()), pisosMax:mu.pisosMax, mats:mu.mats, tnt:mu.tnt, tema:mu.tema};
  mostrar('juego'); ajustarLienzo(); construirPickerPajaro(); window.onresize=function(){ ajustarLienzo(); colocarEscena(); };
  document.getElementById('chipRonda').style.display='';
  nuevaRondaAventura(); if(!raf) bucle(); }

function nuevaRondaAventura(){ rondaFallada=false; document.getElementById('chipRonda').textContent='Ronda '+(rondaActual+1)+'/'+RONDAS_POR_RETO;
  generarOperacion(cfgActual.maxRes, getModoOp()); pintarProblema(); colocarEscena(); fase='aim';
  actualizarVidasHud();
  hablar('¿Cuánto es '+estado.a+(estado.tipo==='suma'?' más ':' menos ')+estado.b+'?'); }

/* ---- Juego LIBRE ---- */
function iniciarLibre(m,niv){ modo='libre'; libreConfig.modo=m; libreConfig.nivel=niv;
  var maxRes=niv===1?10:niv===2?20:30, pisos=niv===1?1:2, tnt=niv===3?0.15:0;
  cfgActual={maxRes:maxRes, pisosMax:pisos, mats:niv>=2?['wood','stone']:['wood'], tnt:tnt, tema:'pradera'};
  mostrar('juego'); ajustarLienzo(); construirPickerPajaro(); window.onresize=function(){ ajustarLienzo(); colocarEscena(); };
  document.getElementById('chipRonda').style.display='none';
  nuevaRondaLibre(); if(!raf) bucle(); }
function nuevaRondaLibre(){ generarOperacion(cfgActual.maxRes, libreConfig.modo); pintarProblema(); colocarEscena(); fase='aim';
  hablar('¿Cuánto es '+estado.a+(estado.tipo==='suma'?' más ':' menos ')+estado.b+'?'); }
function siguienteLibre(){ document.getElementById('cartelLibre').classList.remove('active'); cerrarConteo(); nuevaRondaLibre(); }
// wrap iniciarLibre para cerrar el modal
var _iniciarLibre=iniciarLibre; iniciarLibre=function(m,n){ cerrarLibrePicker(); _iniciarLibre(m,n); };

function pintarProblema(){
  document.getElementById('problema').textContent=estado.a+' '+estado.op+' '+estado.b+' = ?';
  if(modo==='racha') actualizarHudRacha();
}
function salirJuego(){ cerrarConteo(); ocultarHudRacha(); refrescarChips(); if(modo==='aventura') { renderMapa(); mostrar('sMapa'); } else mostrar('sMenu'); }

/* ============ MODO RACHA INFINITA ============ */
var rachaRacha=0, rachaNivelIdx=0, rachaRecord=false;

function getNivelRacha(r){
  for(var i=RACHA_NIVELES.length-1;i>=0;i--){ if(r>=RACHA_NIVELES[i].desde) return i; }
  return 0;
}

function iniciarRacha(){
  modo='racha'; vidas=3; rachaRacha=0; rachaActual=0; rachaNivelIdx=0; rachaRecord=false;
  var niv=RACHA_NIVELES[0];
  cfgActual={maxRes:niv.maxRes, pisosMax:niv.pisosMax, mats:niv.mats, tnt:niv.tnt, tema:niv.tema};
  mostrar('juego'); ajustarLienzo(); construirPickerPajaro();
  window.onresize=function(){ ajustarLienzo(); colocarEscena(); };
  document.getElementById('chipRonda').style.display='none';
  mostrarHudRacha();
  nuevaRondaRacha();
  if(!raf) bucle();
}

function nuevaRondaRacha(){
  var nuevoIdx=getNivelRacha(rachaRacha);
  if(nuevoIdx!==rachaNivelIdx){
    rachaNivelIdx=nuevoIdx;
    var niv=RACHA_NIVELES[nuevoIdx];
    cfgActual={maxRes:niv.maxRes, pisosMax:niv.pisosMax, mats:niv.mats, tnt:niv.tnt, tema:niv.tema};
    toast('Nivel: '+niv.nombre+'!');
  }
  var niv=RACHA_NIVELES[rachaNivelIdx];
  generarOperacion(cfgActual.maxRes, niv.modoOp);
  pintarProblema(); colocarEscena(); fase='aim';
  actualizarHudRacha();
  hablar('¿Cuánto es '+estado.a+(estado.tipo==='suma'?' más ':' menos ')+estado.b+'?');
}

function mostrarHudRacha(){
  var hud=document.getElementById('hudRacha');
  if(!hud){ hud=document.createElement('div'); hud.id='hudRacha'; document.getElementById('juego').appendChild(hud); }
  hud.style.display='flex';
  // Ocultar el #problema original — el hudRacha lo integra
  document.getElementById('problema').style.display='none';
  actualizarHudRacha();
}

function actualizarHudRacha(){
  var hud=document.getElementById('hudRacha'); if(!hud) return;
  var niv=RACHA_NIVELES[rachaNivelIdx];
  var progreso=0;
  if(rachaNivelIdx<RACHA_NIVELES.length-1){
    var rango=niv.hasta-niv.desde+1;
    progreso=Math.min(100, ((rachaRacha-niv.desde)/(rango))*100);
  } else { progreso=100; }
  var corazones='';
  for(var i=0;i<3;i++) corazones+=(i<vidas?'<span class="racha-vida">&#x2764;</span>':'<span class="racha-vida muerta">&#x2764;</span>');
  var fuego=rachaRacha>=10?' racha-fuego':'';
  var probTxt=estado.a+' '+estado.op+' '+estado.b+' = ?';
  hud.innerHTML=
    '<div class="racha-vidas">'+corazones+'</div>'+
    '<div class="racha-problema">'+probTxt+'</div>'+
    '<div class="racha-derecha">'+
      '<div class="racha-counter'+fuego+'">'+rachaRacha+'</div>'+
      '<div><div class="racha-nivel">'+niv.nombre+'</div>'+
      '<div class="racha-barra"><div class="racha-barra-fill" style="width:'+progreso+'%"></div></div>'+
      '<div class="racha-record">Mejor: '+save.rachaMax+'</div></div>'+
    '</div>';
}

function ocultarHudRacha(){
  var hud=document.getElementById('hudRacha'); if(hud) hud.style.display='none';
  document.getElementById('problema').style.display='';
}


function rachaAcierto(){
  rachaRacha++;
  save.aciertosTotales++;
  if(rachaRacha>save.rachaMax){
    save.rachaMax=rachaRacha;
    if(!rachaRecord){ rachaRecord=true; toast('Nuevo record: '+rachaRacha+'!'); sonidoTrofeo(); lanzarConfeti(); }
  }
  guardar();
  actualizarHudRacha();
  revisarLogros();
  setTimeout(nuevaRondaRacha, 1500);
}

function reiniciarDesdeGameOver(){
  document.getElementById('cartelGameOver').classList.remove('active');
  if(modo==='racha') iniciarRacha(); else iniciarReto(retoMundo,retoIdx);
}
function salirDesdeGameOver(){
  document.getElementById('cartelGameOver').classList.remove('active');
  if(modo==='racha') ocultarHudRacha();
  refrescarChips();
  if(modo==='aventura'){ renderMapa(); mostrar('sMapa'); } else mostrar('sMenu');
}

/* ---- Operación ---- */
function generarOperacion(maxRes,modoOp){ var tipo=modoOp; if(tipo==='mixto') tipo=Math.random()<0.5?'suma':'resta';
  var a,b; if(tipo==='suma'){ var t=rnd(2,maxRes); a=rnd(1,t-1); b=t-a; estado.op='+'; estado.resultado=a+b; }
  else { a=rnd(3,maxRes); b=rnd(1,a-1); estado.op='−'; estado.resultado=a-b; }
  estado.a=a; estado.b=b; estado.tipo=tipo; }
function generarOpciones(correcto){ var set={}; set[correcto]=true; var t=0;
  while(Object.keys(set).length<3&&t<60){ t++; var v=correcto+rnd(-3,3); if(v>=0&&v!==correcto) set[v]=true; }
  var arr=Object.keys(set).map(Number); for(var i=arr.length-1;i>0;i--){ var j=rnd(0,i); var x=arr[i]; arr[i]=arr[j]; arr[j]=x; } return arr; }

/* ---- Construir escena ---- */
function nuevoBloque(x,y,w,h,type){ return {x:x,y:y,w:w,h:h,type:type,vx:0,vy:0,rot:0,vrot:0,cayendo:false,alpha:1}; }
function colocarEscena(){
  var prBase=Math.min(W,H)*0.045; var pm=paramsPajaro(pajaroSel);
  bird={x:anchor.x,y:anchor.y,vx:0,vy:0, r:Math.min(W,H)*0.035*pm.rMul, angle:0}; dashUsado=false; bombaUsada=false; rondaResuelta=false;
  var opciones=generarOpciones(estado.resultado);
  var xs=[W*0.55,W*0.73,W*0.90]; pigs=[]; blocks=[];
  for(var i=0;i<3;i++){
    var pr=prBase*(0.78+Math.random()*0.55);
    var estilo=rnd(0,3);
    var py=construirFuerte(xs[i], pr, estilo);
    pigs.push({x:xs[i],y:py,r:pr,num:opciones[i],correcto:opciones[i]===estado.resultado,vivo:true,vx:0,vy:0,rot:0,shake:0,bob:Math.random()*6}); }
  particulas=[]; explosiones=[]; rastro=[];
  estrellasFondo=[]; if(cfgActual.tema==='noche'){ for(var s=0;s<40;s++){ estrellasFondo.push({x:Math.random()*W,y:Math.random()*groundY*0.9,r:Math.random()*1.8+0.6}); } }
}
function mat(k){ var m=cfgActual.mats; return m[((k%m.length)+m.length)%m.length]; }
function construirFuerte(px, pr, estilo){
  var comp=rnd(1, cfgActual.pisosMax);
  var unit=pr*0.95, wallW=pr*0.5, beamH=pr*0.55;
  var floorTop=groundY;
  blocks.push(nuevoBloque(px, floorTop-beamH*0.5, pr*3.1, beamH, mat(rnd(0,4))));
  var baseY=floorTop-beamH;
  var py=baseY-pr*0.9;
  var altura=comp + (estilo===1?2:1);
  for(var s=-1;s<=1;s+=2){ var wx=px+s*pr*1.25; var yy=baseY;
    for(var k=0;k<altura;k++){ blocks.push(nuevoBloque(wx, yy-unit*0.5, wallW, unit, mat(k+estilo))); yy-=unit; } }
  var muroTop=baseY-altura*unit;
  if(estilo!==2){
    var techos=(estilo===3?2:1);
    for(var r2=0;r2<techos;r2++){ blocks.push(nuevoBloque(px, muroTop - r2*beamH - beamH*0.5, pr*3.2, beamH, mat(r2))); } }
  if(estilo===0 && comp>=2){
    blocks.push(nuevoBloque(px - pr*1.95, baseY-unit*0.5, wallW, unit, mat(2))); }
  if(estilo===3){
    blocks.push(nuevoBloque(px, muroTop-2*beamH-beamH*0.6, pr*1.4, beamH, mat(1))); }
  if(cfgActual.tnt>0 && Math.random()< Math.min(0.6, cfgActual.tnt+0.25)){
    blocks.push(nuevoBloque(px, baseY-pr*0.5, pr*0.85, pr*0.85, 'tnt')); }
  return py;
}

/* ---- Selector de pájaro ---- */
function construirPickerPajaro(){ var cont=document.getElementById('pajaroPicker'); cont.innerHTML='';
  for(var i=0;i<PAJAROS.length;i++){ (function(P){ var desbloq=save.pajaros.indexOf(P.id)!==-1;
    var d=document.createElement('div'); d.className='pj-op'+(P.id===pajaroSel?' sel':'')+(desbloq?'':' bloq');
    var cara=P.id==='rojo'?'🐦':P.id==='amarillo'?'🐤':P.id==='negro'?'🐧':'🦅';
    d.innerHTML=cara+(desbloq?'':'<span class="cand"><i data-lucide="lock" style="width:14px;height:14px"></i></span>');
    d.onclick=function(){ if(!desbloq){ toast(P.nombre+': '+P.costo+' copas'); return; } pajaroSel=P.id; construirPickerPajaro();
      if(fase==='aim'){ var pm=paramsPajaro(pajaroSel); bird.r=Math.min(W,H)*0.035*pm.rMul; bird.x=anchor.x; bird.y=anchor.y; }
      hablar(P.nombre+'. '+P.poder); };
    cont.appendChild(d); })(PAJAROS[i]); }
  lucide.createIcons(); }

/* ---- Impacto ---- */
function resolverPig(p){ if(rondaResuelta) return;
  if(p.correcto){ fase='resolver'; ganarRonda(p); }
  else { fase='resolver'; p.shake=1; perderVida(); }
}

/* ---- Explosión ---- */
function estallar(x,y,radius,porBird){
  sonidoBoom(); explota(x,y,radius); markTNTused();
  for(var i=0;i<blocks.length;i++){ var b=blocks[i]; if(b.type==='tnt' && b.alpha>0 && dist(x,y,b.x,b.y)<radius+b.w){ b.alpha=0; b.cayendo=true; explota(b.x,b.y,Math.min(W,H)*0.17); } }
  for(var j=0;j<blocks.length;j++){ var o=blocks[j]; if(o.type==='tnt'||o.cayendo||o.alpha<=0) continue; if(dist(x,y,o.x,o.y)<radius+Math.max(o.w,o.h)*0.5) tumbar(o,x); }
  var correcto=null, wrong=false;
  for(var k=0;k<pigs.length;k++){ var p=pigs[k]; if(!p.vivo) continue; if(dist(x,y,p.x,p.y)<radius+p.r){ if(p.correcto) correcto=p; else { wrong=true; p.shake=1; } } }
  if(correcto && !rondaResuelta){ fase='resolver'; ganarRonda(correcto); }
  else if(porBird && !rondaResuelta){ fase='resolver'; perderVida(); }
}
function markTNTused(){ if(!save.tntUsado){ save.tntUsado=true; guardar(); toast('¡Explotaste un TNT!'); revisarLogros(); } }

/* ---- Resultado de ronda ---- */
function ganarRonda(pig){
  if(rondaResuelta) return; rondaResuelta=true; fase='resolver';
  pig.vivo=false; pig.vx=(Math.random()*6+4); pig.vy=-(Math.random()*8+8);
  explota(pig.x,pig.y, Math.min(W,H)*0.13);
  for(var i=0;i<blocks.length;i++){ var b=blocks[i]; if(b.type!=='tnt' && Math.abs(b.x-pig.x)<pig.r*2 && !b.cayendo) tumbar(b,pig.x); }
  sonidoBoom(); sonidoVictoria(); lanzarConfeti();
  rachaActual++; save.aciertosTotales++; if(rachaActual>save.rachaMax) save.rachaMax=rachaActual; guardar();
  var elogios=['¡Muy bien','¡Excelente','¡Campeón','¡Genial','¡Súper','¡Increíble']; var el=elogios[rnd(0,elogios.length-1)]+', '+(save.nombre||'Alejo')+'!';
  hablarAcierto(el+' '+estado.a+(estado.tipo==='suma'?' más ':' menos ')+estado.b+' es '+estado.resultado);
  if(modo==='aventura'){
    if(!rondaFallada) primerIntento++;
    actualizarEstrellasHud();
    setTimeout(avanzarRonda, 1500);
  } else if(modo==='racha'){
    rachaAcierto();
  } else { mostrarCartelLibre(el); }
  revisarLogros(); refrescarChips();
}
function avanzarRonda(){ rondaActual++; if(rondaActual>=RONDAS_POR_RETO) finReto(); else nuevaRondaAventura(); }

function falloTiro(){
  // Suelo o fuera de pantalla — solo resetea pajaro, NO pierde vida
  setTimeout(function(){ var pm=paramsPajaro(pajaroSel); bird={x:anchor.x,y:anchor.y,vx:0,vy:0,r:Math.min(W,H)*0.035*pm.rMul,angle:0}; dashUsado=false; bombaUsada=false; fase='aim'; }, 700);
}

function actualizarEstrellasHud(){ var e=document.getElementById('numEstrellas'); if(e) e.textContent=primerIntento; }

/* ---- Fin de reto ---- */
function finReto(){
  var trofeo = primerIntento>=5?'copa': primerIntento>=4?'oro': primerIntento>=3?'plata':'bronce';
  var estrellas = primerIntento>=5?3: primerIntento>=3?2:1;
  var key=retoKey(retoMundo,retoIdx); var prev=save.retos[key];
  var rank={bronce:1,plata:2,oro:3,copa:4};
  if(!prev || rank[trofeo]>rank[prev.trofeo]){ save.retos[key]={trofeo:trofeo, estrellas:estrellas, completado:true}; }
  var ganaCopas = trofeo==='copa'?2 : trofeo==='oro'?1 : 0;
  if(!prev){ save.copas+=ganaCopas; if(trofeo==='copa') save.copasPerfectas++; }
  else { var prevCopas=prev.trofeo==='copa'?2:prev.trofeo==='oro'?1:0; if(ganaCopas>prevCopas){ save.copas+=(ganaCopas-prevCopas); if(trofeo==='copa'&&prev.trofeo!=='copa') save.copasPerfectas++; } }
  if(mundoTerminado(retoMundo) && save.mundoDesbloqueado<retoMundo+1 && retoMundo+1<MUNDOS.length){ save.mundoDesbloqueado=retoMundo+1; toast('¡Nuevo mundo: '+MUNDOS[retoMundo+1].emoji+' '+MUNDOS[retoMundo+1].nombre+'!'); }
  for(var i=0;i<PAJAROS.length;i++){ var P=PAJAROS[i]; if(save.pajaros.indexOf(P.id)===-1 && save.copas>=P.costo){ save.pajaros.push(P.id); toast('¡Pájaro nuevo: '+P.nombre+'!'); } }
  guardar(); revisarLogros(); refrescarChips();
  document.getElementById('trofeoEmoji').textContent=trofeoEmoji(trofeo);
  document.getElementById('trofeoTxt').textContent = trofeo==='copa'?'¡PERFECTO! 🏆':'¡Reto completado!';
  document.getElementById('trofeoEstrellas').textContent='⭐'.repeat(estrellas)+'☆'.repeat(3-estrellas);
  document.getElementById('trofeoDetalle').textContent=primerIntento+' de '+RONDAS_POR_RETO+' a la primera';
  document.getElementById('cartelTrofeo').classList.add('active');
  sonidoTrofeo(); lanzarConfeti(); setTimeout(lanzarConfeti,400);
  hablar((trofeo==='copa'?'¡Perfecto! Ganaste una copa. ':'¡Reto completado! ')+'Lograste '+primerIntento+' de '+RONDAS_POR_RETO);
}
function volverAlMapa(){ document.getElementById('cartelTrofeo').classList.remove('active'); renderMapa(); mostrar('sMapa'); lucide.createIcons(); }

function mostrarCartelLibre(el){ var signo=estado.tipo==='suma'?'+':'−';
  document.getElementById('cartelOpL').textContent=estado.a+' '+signo+' '+estado.b+' = '+estado.resultado;
  document.getElementById('cartelTxtL').textContent=el;
  var car=['🐦','🥳','🏆','🙌','🎉']; document.getElementById('mFestejaL').textContent=car[rnd(0,car.length-1)];
  document.getElementById('cartelLibre').classList.add('active');
  hablarAcierto(el+' '+estado.a+(estado.tipo==='suma'?' más ':' menos ')+estado.b+' es '+estado.resultado); }

/* ---- Panel de conteo (ayuda) ---- */
var conteoN=0;
function abrirConteo(){ conteoN=0; var zona=document.getElementById('conteoZona'); zona.innerHTML=''; var titulo=document.getElementById('conteoTitulo'); var num=document.getElementById('conteoNum');
  if(estado.tipo==='suma'){ titulo.textContent='Toca y cuenta TODO: '+estado.a+' + '+estado.b; num.textContent='0';
    var e1=EMOJIS[rnd(0,EMOJIS.length-1)], e2=EMOJIS[rnd(0,EMOJIS.length-1)]; if(e2===e1) e2=EMOJIS[(EMOJIS.indexOf(e1)+1)%EMOJIS.length];
    var g1=document.createElement('div'); g1.className='cgrupo'; for(var i=0;i<estado.a;i++) g1.appendChild(crearObj(e1));
    var mas=document.createElement('div'); mas.className='cmas'; mas.textContent='+'; var g2=document.createElement('div'); g2.className='cgrupo g2'; for(var j=0;j<estado.b;j++) g2.appendChild(crearObj(e2));
    zona.appendChild(g1); zona.appendChild(mas); zona.appendChild(g2);
  } else { titulo.textContent='Tienes '+estado.a+'. Quita '+estado.b; num.textContent='0';
    var em=EMOJIS[rnd(0,EMOJIS.length-1)]; var g=document.createElement('div'); g.className='cgrupo'; for(var k=0;k<estado.a;k++) g.appendChild(crearObj(em,true)); zona.appendChild(g); }
  document.getElementById('panelConteo').classList.add('active'); }
function crearObj(emoji,quitar){ var d=document.createElement('div'); d.className='cobj'; d.textContent=emoji;
  d.addEventListener('click',function(){ var titulo=document.getElementById('conteoTitulo'); var num=document.getElementById('conteoNum');
    if(quitar){ if(d.classList.contains('quitado')) return; if(conteoN>=estado.b) return; d.classList.add('quitado'); d.style.opacity=.2; d.style.pointerEvents='none'; d.style.transform='scale(.7) rotate(12deg)';
      conteoN++; sonidoToque(conteoN); num.textContent=conteoN;
      if(conteoN>=estado.b){ var quedan=estado.a-estado.b; titulo.textContent='¡Quitaste '+estado.b+'! Quedan '+quedan; num.textContent=quedan;
        var vivos=document.querySelectorAll('#conteoZona .cobj:not(.quitado)'); for(var i=0;i<vivos.length;i++) vivos[i].classList.add('ok'); setTimeout(function(){ hablar('Quitaste '+estado.b+'. Quedan '+quedan); },300);
      } else { titulo.textContent='Vas '+conteoN+'. Quita '+(estado.b-conteoN)+' más'; hablar(String(conteoN)); }
    } else { if(d.classList.contains('ok')) return; d.classList.add('ok'); conteoN++; sonidoToque(conteoN); num.textContent=conteoN; hablar(String(conteoN));
      if(conteoN>=estado.a+estado.b){ titulo.textContent='¡En total son '+conteoN+'!'; } } });
  return d; }
function cerrarConteo(){ document.getElementById('panelConteo').classList.remove('active'); }
