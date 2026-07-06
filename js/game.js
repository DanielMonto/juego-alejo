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
  return d==='facil'?10:d==='normal'?99:999;
}
function getMinRes(){
  var d=save.dificultad||'facil';
  return d==='facil'?2:d==='normal'?10:100;
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
  // Flash visual en el contenedor de vidas
  var containers=[document.getElementById('hudVidas')];
  var hr=document.getElementById('hudRacha'); if(hr) containers.push(hr);
  containers.forEach(function(el){ if(el){el.classList.remove('vida-flash');void el.offsetWidth;el.classList.add('vida-flash');}});
  sonidoMal();
  rondaFallada=true;
  toast('Vida perdida! Quedan '+vidas);
  if(vidas<=0){
    setTimeout(function(){ mostrarGameOver(); }, 800);
  } else {
    hablar('¡Ese no! Inténtalo otra vez. Te quedan '+vidas+' vidas');
    setTimeout(resetBirdMatter, 700);
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
  mostrar('juego'); ocultarHudRacha(); actualizarVidasHud(); ajustarLienzo(); construirPickerPajaro(); window.onresize=function(){ ajustarLienzo(); colocarEscena(); };
  document.getElementById('chipRonda').style.display='';
  nuevaRondaAventura(); if(!raf) bucle(); }

function nuevaRondaAventura(){ rondaFallada=false; document.getElementById('chipRonda').textContent='Ronda '+(rondaActual+1)+'/'+RONDAS_POR_RETO;
  generarOperacion(cfgActual.maxRes, getModoOp()); pintarProblema(); colocarEscena(); fase='aim';
  actualizarVidasHud();
  hablar('¿Cuánto es '+estado.a+(estado.tipo==='suma'?' más ':' menos ')+estado.b+'?'); }

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
  actualizarVidasHud();
  mostrarHudRacha();
  nuevaRondaRacha();
  if(!raf) bucle();
}

function nuevaRondaRacha(){
  var nuevoIdx=getNivelRacha(rachaRacha);
  if(nuevoIdx!==rachaNivelIdx){
    rachaNivelIdx=nuevoIdx;
    toast('Nivel: '+RACHA_NIVELES[nuevoIdx].nombre+'!');
  }
  // Mundo random por ronda (del nivel actual o inferior)
  var niv=RACHA_NIVELES[rachaNivelIdx];
  var mundoIdx=rnd(0, Math.min(rachaNivelIdx, MUNDOS.length-1));
  var mu=MUNDOS[mundoIdx];
  cfgActual={maxRes:Math.max(niv.maxRes,getMaxRes()), pisosMax:niv.pisosMax, mats:mu.mats, tnt:niv.tnt, tema:mu.tema};
  var niv=RACHA_NIVELES[rachaNivelIdx];
  generarOperacion(Math.max(cfgActual.maxRes, getMaxRes()), getModoOp());
  pintarProblema(); colocarEscena(); fase='aim';
  actualizarHudRacha();
  hablar('¿Cuánto es '+estado.a+(estado.tipo==='suma'?' más ':' menos ')+estado.b+'?');
}

function mostrarHudRacha(){
  var hud=document.getElementById('hudRacha');
  if(!hud){ hud=document.createElement('div'); hud.id='hudRacha'; document.getElementById('juego').appendChild(hud); }
  hud.style.display='flex';
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
  var fuego=rachaRacha>=10?' racha-fuego':'';
  var probTxt=estado.a+' '+estado.op+' '+estado.b+' = ?';
  hud.innerHTML=
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
  var minRes=getMinRes();
  var a,b; if(tipo==='suma'){ var t=rnd(Math.max(2,minRes),maxRes); a=rnd(1,t-1); b=t-a; estado.op='+'; estado.resultado=a+b; }
  else { a=rnd(Math.max(3,minRes),maxRes); b=rnd(1,a-1); estado.op='−'; estado.resultado=a-b; }
  estado.a=a; estado.b=b; estado.tipo=tipo; }
function generarOpciones(correcto){ var set={}; set[correcto]=true; var t=0;
  while(Object.keys(set).length<3&&t<60){ t++; var v=correcto+rnd(-3,3); if(v>=0&&v!==correcto) set[v]=true; }
  var arr=Object.keys(set).map(Number); for(var i=arr.length-1;i>0;i--){ var j=rnd(0,i); var x=arr[i]; arr[i]=arr[j]; arr[j]=x; } return arr; }


/* ============================================================
   GENERADOR DE NIVELES — patrones + rutas + obstaculos
============================================================ */
function nuevoBloque(x,y,w,h,type){ return {x:x,y:y,w:w,h:h,type:type,vx:0,vy:0,rot:0,vrot:0,cayendo:false,alpha:1}; }
function mat(k){ var m=cfgActual.mats; return m[((k%m.length)+m.length)%m.length]; }

var PATRONES=[
  {pos:[{x:0.62,y:0.68},{x:0.70,y:0.58},{x:0.78,y:0.68}]},
  {pos:[{x:0.60,y:0.72},{x:0.72,y:0.48},{x:0.84,y:0.72}]},
  {pos:[{x:0.55,y:0.72},{x:0.68,y:0.60},{x:0.81,y:0.48}]},
  {pos:[{x:0.55,y:0.45},{x:0.68,y:0.58},{x:0.81,y:0.72}]},
  {pos:[{x:0.62,y:0.72},{x:0.62,y:0.52},{x:0.80,y:0.52}]},
  {pos:[{x:0.58,y:0.72},{x:0.74,y:0.72},{x:0.72,y:0.42}]},
  {pos:[{x:0.64,y:0.70},{x:0.78,y:0.70},{x:0.82,y:0.54}]},
  {pos:[{x:0.60,y:0.60},{x:0.78,y:0.60},{x:0.72,y:0.74}]},
  {pos:[{x:0.58,y:0.52},{x:0.74,y:0.52},{x:0.70,y:0.76}]},
  {pos:[{x:0.58,y:0.68},{x:0.72,y:0.68},{x:0.86,y:0.50}]}
];

function colocarEscena(){
  var pm=paramsPajaro(pajaroSel);
  bird={x:anchor.x,y:anchor.y,vx:0,vy:0, r:Math.min(W,H)*0.035*pm.rMul, angle:0};
  dashUsado=false; bombaUsada=false; birdBounced=false; rondaResuelta=false;
  pigs=[]; blocks=[]; particulas=[]; explosiones=[]; rastro=[]; obstaculos=[];
  estrellasFondo=[];
  if(cfgActual.tema==='noche'){ for(var s=0;s<40;s++) estrellasFondo.push({x:Math.random()*W,y:Math.random()*groundY*0.9,r:Math.random()*1.8+0.6}); }

  var opciones=generarOpciones(estado.resultado);
  var dif=cfgActual.pisosMax;
  var pr=Math.min(W,H)*0.035, u=pr*0.9, ww=pr*0.45, bh=pr*0.5;

  // 1. Elegir patron y mezclar
  var patron=PATRONES[rnd(0,PATRONES.length-1)];
  var idx=[0,1,2];
  for(var si=2;si>0;si--){var sj=rnd(0,si),st=idx[si];idx[si]=idx[sj];idx[sj]=st;}

  // 2. Colocar cerdos — correcto se marca por VALOR, no por indice
  for(var i=0;i<3;i++){
    var pos=patron.pos[idx[i]];
    var px=W*pos.x, py=groundY*pos.y;
    if(py>groundY-pr) py=groundY-pr;
    if(py<groundY*0.25) py=groundY*0.25;
    pigs.push({x:px,y:py,r:pr*0.7,num:opciones[i],correcto:opciones[i]===estado.resultado,
      vivo:true,vx:0,vy:0,rot:0,shake:0,bob:Math.random()*6});
  }
  var cc=null;
  for(var ci=0;ci<3;ci++){ if(pigs[ci].correcto){ cc=pigs[ci]; break; } }
  if(!cc) cc=pigs[0]; // fallback

  // 3. Plataformas para cerdos elevados
  for(var k=0;k<3;k++){
    var pig=pigs[k];
    if(pig.y<groundY-pr*2){
      blocks.push(nuevoBloque(pig.x, pig.y+pr*0.8, pr*2.2, bh, mat(k)));
      var sy=pig.y+pr*0.8+bh;
      while(sy<groundY-bh){
        blocks.push(nuevoBloque(pig.x-pr*0.7,sy+u*0.4, ww,u*0.8, mat(k)));
        blocks.push(nuevoBloque(pig.x+pr*0.7,sy+u*0.4, ww,u*0.8, mat(k+1)));
        sy+=u;
      }
    }
  }

  // 4. Defensa del cerdo correcto
  var nb=dif<=1?rnd(0,1):dif===2?rnd(1,3):rnd(2,4);
  for(var b=0;b<nb;b++){
    var bx=cc.x+(b%2===0?-1:1)*pr*(1.0+b*0.35);
    var by=cc.y-pr*(0.3+b*0.25);
    if(by<groundY*0.2) by=groundY*0.25;
    blocks.push(nuevoBloque(bx,by, ww,u, mat(b)));
  }
  if(dif>=2&&Math.random()>0.4){
    blocks.push(nuevoBloque(cc.x, cc.y-pr*1.5, pr*2.5, bh, mat(0)));
  }

  // 5. Defensa ligera en incorrectos
  for(var j=0;j<3;j++){
    if(pigs[j].correcto) continue;
    var ip=pigs[j];
    if(Math.random()>0.45) blocks.push(nuevoBloque(ip.x-pr*0.8,ip.y-pr*0.3, ww,u*0.8, mat(j)));
    if(dif>=2&&Math.random()>0.55) blocks.push(nuevoBloque(ip.x+pr*0.8,ip.y-pr*0.3, ww,u*0.8, mat(j+1)));
  }

  // 6. TNT
  if(cfgActual.tnt>0&&Math.random()<cfgActual.tnt+0.2){
    var tntIdx=0; for(var ti=0;ti<3;ti++){if(!pigs[ti].correcto){tntIdx=ti;break;}}
    var tntP=pigs[tntIdx];
    blocks.push(nuevoBloque(tntP.x+pr*(Math.random()>0.5?1.2:-1.2), tntP.y+pr*0.2, pr*0.7, pr*0.7, 'tnt'));
  }

  if(typeof syncMatter==='function') syncMatter();
}

/* ============================================================
   OBSTACULOS DE MUNDO — generacion por tema + dificultad
============================================================ */
var RUTAS_MUNDO={
  pradera:  [],
  desierto: ['viento','lento'],
  nieve:    ['boost','lento','rebote'],
  volcan:   ['impulso','rebote','miniTnt'],
  playa:    ['viento','rebote'],
  noche:    ['niebla','rebote','viento']
};

function colocarObstaculosMundo(cc,dif){
  var tema=cfgActual.tema;
  var rutas=RUTAS_MUNDO[tema];
  if(!rutas||!rutas.length) return;
  var s=Math.min(W,H);

  // Cuantos obstaculos: 1 en facil, 2-3 en dificil
  var nObs=dif<=1?1:dif<=2?rnd(1,2):rnd(2,3);

  // Primero el obstaculo clave (entre resortera y cerdo correcto)
  var primario=rutas[0];
  crearObstaculo(primario,cc,dif,tema,true);

  // Obstaculos secundarios
  for(var i=1;i<nObs&&i<rutas.length;i++){
    crearObstaculo(rutas[i],cc,dif,tema,false);
  }
}

function crearObstaculo(tipo,cc,dif,tema,esClave){
  var s=Math.min(W,H);
  // Punto medio entre resortera y cerdo correcto
  var t=esClave?(0.35+Math.random()*0.15):(0.25+Math.random()*0.3);
  var midX=anchor.x+(cc.x-anchor.x)*t;
  var midY=anchor.y+(cc.y-anchor.y)*t;
  // Secundarios se desplazan para no solapar el clave
  if(!esClave){ midX+=s*(Math.random()-0.5)*0.15; midY+=s*(Math.random()-0.5)*0.1; }
  // Clamp dentro de pantalla
  midX=Math.max(W*0.25,Math.min(W*0.75,midX));
  midY=Math.max(groundY*0.2,Math.min(groundY*0.85,midY));

  var mov=dif>=3&&Math.random()>0.5; // movimiento en dificultad alta

  if(tipo==='viento'){
    var dirX=cc.x>midX?1:-1;
    var dirY=cc.y<midY?-1:0.3;
    var o={x:midX,y:midY,w:s*0.12,h:s*0.16,tipo:'viento',
      fx:dirX*(0.06+dif*0.015), fy:dirY*(0.08+dif*0.01),
      color:tema==='playa'?'#80c0ff':tema==='noche'?'#c0a0ff':'#ffe14d',activo:true};
    if(mov){ o.movY=0.4+Math.random()*0.3; o.limArriba=midY-s*0.08; o.limAbajo=midY+s*0.08; }
    obstaculos.push(o);
  }
  else if(tipo==='lento'){
    var o={x:midX,y:midY,w:s*0.11,h:s*0.09,tipo:'lento',
      fuerza:0.90-dif*0.03,
      color:tema==='nieve'?'#d0e8ff':'#c9a43c',activo:true};
    if(mov){ o.movX=0.3+Math.random()*0.3; o.limIzq=midX-s*0.06; o.limDer=midX+s*0.06; }
    obstaculos.push(o);
  }
  else if(tipo==='boost'){
    var bx=W*0.30+Math.random()*W*0.12;
    var by=groundY-s*0.06-Math.random()*s*0.04;
    obstaculos.push({x:bx,y:by,w:s*0.16,h:s*0.035,tipo:'boost',
      mulX:1.05+dif*0.02, color:'#b8e8f8',activo:true});
  }
  else if(tipo==='impulso'){
    var ix=W*0.35+Math.random()*W*0.12;
    var iy=groundY-s*0.12;
    var o={x:ix,y:iy,w:s*0.055,h:s*0.12,tipo:'impulso',
      impulsoY:-4.5-dif*0.7, color:'#ff5a1f',activo:true};
    if(mov){ o.movX=0.5; o.limIzq=ix-s*0.06; o.limDer=ix+s*0.06; }
    obstaculos.push(o);
  }
  else if(tipo==='rebote'){
    var rx=esClave?midX:W*(0.38+Math.random()*0.2);
    var ry=esClave?midY:groundY*(0.35+Math.random()*0.3);
    var o={x:rx,y:ry,r:s*0.025+dif*s*0.005,tipo:'rebote',
      fuerza:0.75+dif*0.05,
      color:tema==='volcan'?'#6a3030':tema==='noche'?'#f5f3c0':'#8a929c',
      borde:tema==='volcan'?'#ff5a1f':tema==='noche'?'#ffd23f':'#5c636b',activo:true};
    if(mov){ o.movY=0.4; o.limArriba=ry-s*0.06; o.limAbajo=ry+s*0.06; }
    obstaculos.push(o);
  }
  else if(tipo==='miniTnt'){
    // Colocar cerca de un cerdo incorrecto
    var incs=[]; for(var i=0;i<pigs.length;i++) if(!pigs[i].correcto) incs.push(pigs[i]);
    var tgt=incs[rnd(0,incs.length-1)];
    obstaculos.push({x:tgt.x+(Math.random()>0.5?1:-1)*s*0.045,
      y:tgt.y+s*0.015,r:s*0.014,tipo:'miniTnt',
      radio:s*0.07+dif*s*0.015,activo:true});
  }
  else if(tipo==='niebla'){
    // En la ruta de vuelo, nunca sobre los numeros de cerdos
    var nx=W*0.38+Math.random()*W*0.15;
    var ny=groundY*0.3+Math.random()*groundY*0.2;
    obstaculos.push({x:nx,y:ny,r:s*0.07+dif*s*0.015,
      tipo:'niebla',color:'#2a2040',revelado:false,activo:true});
  }
}

/* ---- Selector de pájaro ---- */
function construirPickerPajaro(){ var cont=document.getElementById('pajaroPicker'); cont.innerHTML='';
  for(var i=0;i<PAJAROS.length;i++){ (function(P){ var desbloq=save.pajaros.indexOf(P.id)!==-1;
    var d=document.createElement('div'); d.className='pj-op'+(P.id===pajaroSel?' sel':'')+(desbloq?'':' bloq');
    var cara=P.id==='rojo'?'🐦':P.id==='amarillo'?'🐤':P.id==='negro'?'🐧':'🦅';
    d.innerHTML=cara+(desbloq?'':'<span class="cand"><i data-lucide="lock" style="width:14px;height:14px"></i></span>');
    d.onclick=function(){ if(!desbloq){ toast(P.nombre+': '+P.costo+' copas'); return; } pajaroSel=P.id; construirPickerPajaro();
      if(fase==='aim'){ var pm=paramsPajaro(pajaroSel); bird.r=Math.min(W,H)*0.035*pm.rMul; bird.x=anchor.x; bird.y=anchor.y; if(typeof syncMatter==='function') syncMatter(); }
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
    setTimeout(avanzarRonda, 1500);
  } else if(modo==='racha'){
    rachaAcierto();
  }
  revisarLogros(); refrescarChips();
}
function avanzarRonda(){ rondaActual++; if(rondaActual>=RONDAS_POR_RETO) finReto(); else nuevaRondaAventura(); }

function falloTiro(){
  setTimeout(resetBirdMatter, 700);
}


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

/* ---- Panel de ayuda: construir el segundo numero ---- */
var conteoAgregado=0, conteoEsSuma=true;

function abrirConteo(){
  conteoAgregado=0;
  var zona=document.getElementById('conteoZona'); zona.innerHTML='';
  var titulo=document.getElementById('conteoTitulo');
  var num=document.getElementById('conteoNum');
  var a=estado.a, b=estado.b;
  conteoEsSuma=estado.tipo==='suma';
  var signo=conteoEsSuma?'+':'−';

  titulo.textContent=conteoEsSuma?'Sumale '+b+' a '+a:'Quitale '+b+' a '+a;
  num.textContent=String(a);

  // Operacion visual: "5 + [0]"
  var op=document.createElement('div'); op.className='conteo-operacion';
  op.innerHTML='<span class="conteo-fijo">'+a+'</span>'+
    '<span class="conteo-signo">'+signo+'</span>'+
    '<span class="conteo-construido" id="conteoConstruido">0</span>'+
    '<span class="conteo-signo">=</span>'+
    '<span class="conteo-resultado" id="conteoResultado">'+a+'</span>';
  zona.appendChild(op);

  // Botones
  var btns=document.createElement('div'); btns.className='conteo-btns';
  if(b>=100||a>=100) btns.appendChild(crearBtnConteo(conteoEsSuma?'+100':'-100', conteoEsSuma?100:-100));
  if(b>=10||a>=10) btns.appendChild(crearBtnConteo(conteoEsSuma?'+10':'-10', conteoEsSuma?10:-10));
  btns.appendChild(crearBtnConteo(conteoEsSuma?'+1':'-1', conteoEsSuma?1:-1));
  zona.appendChild(btns);

  document.getElementById('panelConteo').classList.add('active');
}

function crearBtnConteo(label,valor){
  var d=document.createElement('button'); d.className='conteo-btn conteo-btn-'+Math.abs(valor);
  d.textContent=label;
  d.onclick=function(){
    var nuevo=conteoAgregado+Math.abs(valor);
    if(nuevo>estado.b) return; // no pasarse
    conteoAgregado=nuevo;
    var total=conteoEsSuma?estado.a+conteoAgregado:estado.a-conteoAgregado;

    document.getElementById('conteoConstruido').textContent=conteoAgregado;
    document.getElementById('conteoResultado').textContent=total;
    document.getElementById('conteoNum').textContent=total;

    sonidoToque(conteoAgregado%10);
    hablar(conteoAgregado+'. Resultado: '+total);

    if(conteoAgregado===estado.b){
      document.getElementById('conteoTitulo').textContent=estado.a+' '+(conteoEsSuma?'+':'−')+' '+estado.b+' = '+estado.resultado+'!';
      document.getElementById('conteoResultado').classList.add('conteo-correcto');
      hablar(estado.a+(conteoEsSuma?' mas ':' menos ')+estado.b+' es '+estado.resultado);
    }
  };
  return d;
}

function cerrarConteo(){ document.getElementById('panelConteo').classList.remove('active'); }
