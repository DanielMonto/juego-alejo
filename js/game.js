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
    setTimeout(function(){
      var pm=paramsPajaro(pajaroSel);
      bird={x:anchor.x,y:anchor.y,vx:0,vy:0,r:Math.min(W,H)*0.035*pm.rMul,angle:0};
      dashUsado=false; bombaUsada=false; birdBounced=false; fase='aim';
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
    var niv=RACHA_NIVELES[nuevoIdx];
    cfgActual={maxRes:niv.maxRes, pisosMax:niv.pisosMax, mats:niv.mats, tnt:niv.tnt, tema:niv.tema};
    toast('Nivel: '+niv.nombre+'!');
  }
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

/* ---- Construir escena ---- */
function nuevoBloque(x,y,w,h,type){ return {x:x,y:y,w:w,h:h,type:type,vx:0,vy:0,rot:0,vrot:0,cayendo:false,alpha:1}; }
function mat(k){ var m=cfgActual.mats; return m[((k%m.length)+m.length)%m.length]; }
function addTNT(px,y,pr){
  if(cfgActual.tnt>0&&Math.random()<Math.min(0.6,cfgActual.tnt+0.25))
    blocks.push(nuevoBloque(px,y,pr*0.8,pr*0.8,'tnt'));
}
function addBloque(x,y,w,h,m){ blocks.push(nuevoBloque(x,y,w,h,m)); }

function colocarEscena(){
  var pm=paramsPajaro(pajaroSel);
  bird={x:anchor.x,y:anchor.y,vx:0,vy:0, r:Math.min(W,H)*0.035*pm.rMul, angle:0};
  dashUsado=false; bombaUsada=false; birdBounced=false; rondaResuelta=false;
  var opciones=generarOpciones(estado.resultado);
  pigs=[]; blocks=[];
  particulas=[]; explosiones=[]; rastro=[];
  estrellasFondo=[];
  if(cfgActual.tema==='noche'){ for(var s=0;s<40;s++) estrellasFondo.push({x:Math.random()*W,y:Math.random()*groundY*0.9,r:Math.random()*1.8+0.6}); }

  // Elegir template de nivel aleatorio
  var template=rnd(0,5);
  var pr=Math.min(W,H)*0.035;
  var u=pr*0.9, ww=pr*0.45, bh=pr*0.5;

  if(template===0) nivelTresColumnas(opciones,pr,u,ww,bh);
  else if(template===1) nivelFuerteGrande(opciones,pr,u,ww,bh);
  else if(template===2) nivelPlataformas(opciones,pr,u,ww,bh);
  else if(template===3) nivelMuralla(opciones,pr,u,ww,bh);
  else if(template===4) nivelMixto(opciones,pr,u,ww,bh);
  else nivelTrinchera(opciones,pr,u,ww,bh);
}

function addPig(x,y,num,correcto,pr){
  var r=pr*0.7;
  pigs.push({x:x,y:y,r:r,num:num,correcto:correcto,vivo:true,vx:0,vy:0,rot:0,shake:0,bob:Math.random()*6});
}

/* --- Template 0: Tres columnas (clasico mejorado) --- */
function nivelTresColumnas(opc,pr,u,ww,bh){
  var xs=[W*0.52,W*0.72,W*0.90];
  // Cada columna con estilo aleatorio
  for(var i=0;i<3;i++){
    var px=xs[i], pisos=rnd(1,cfgActual.pisosMax);
    var tieneForte=Math.random()>0.15; // 15% sin fuerte (expuesto)
    var pigY;
    if(tieneForte){
      var y=groundY;
      for(var p=0;p<pisos;p++){
        addBloque(px,y-bh/2, pr*2.6,bh, mat(p)); y-=bh;
        addBloque(px-pr*1.0,y-u/2, ww,u, mat(p+1));
        addBloque(px+pr*1.0,y-u/2, ww,u, mat(p+2)); y-=u;
      }
      addBloque(px,y-bh/2, pr*2.6,bh, mat(pisos));
      addTNT(px,groundY-bh-u*0.4,pr);
      pigY=groundY-bh-pr*0.5;
    } else { pigY=groundY-pr*0.7; }
    addPig(px,pigY,opc[i],opc[i]===estado.resultado,pr);
  }
}

/* --- Template 1: Un fuerte grande con 3 cerdos adentro --- */
function nivelFuerteGrande(opc,pr,u,ww,bh){
  var cx=W*0.72, ancho=W*0.28;
  var pisos=Math.max(2,rnd(1,cfgActual.pisosMax)+1);
  // Base
  addBloque(cx,groundY-bh/2, ancho,bh, mat(0));
  var y=groundY-bh;
  // Muros exteriores
  for(var p=0;p<pisos;p++){
    addBloque(cx-ancho*0.45,y-u/2, ww,u, mat(p));
    addBloque(cx+ancho*0.45,y-u/2, ww,u, mat(p+1));
    // Divisores internos
    if(p===0){
      addBloque(cx-ancho*0.15,y-u/2, ww,u, mat(p+2));
      addBloque(cx+ancho*0.15,y-u/2, ww,u, mat(p));
    }
    y-=u;
    addBloque(cx,y-bh/2, ancho,bh, mat(p+1));
    y-=bh;
  }
  addTNT(cx,groundY-bh-u*0.4,pr);
  // Cerdo izq (abajo)
  addPig(cx-ancho*0.3, groundY-bh-pr*0.5, opc[0],opc[0]===estado.resultado,pr);
  // Cerdo centro (abajo)
  addPig(cx, groundY-bh-pr*0.5, opc[1],opc[1]===estado.resultado,pr);
  // Cerdo derecha (arriba)
  addPig(cx+ancho*0.3, groundY-bh-(u+bh)-pr*0.5, opc[2],opc[2]===estado.resultado,pr);
}

/* --- Template 2: Plataformas a distintas alturas --- */
function nivelPlataformas(opc,pr,u,ww,bh){
  var alturas=[0, rnd(1,2), rnd(2,3)];
  // Mezclar para que la correcta no siempre este en la misma posicion
  for(var s=alturas.length-1;s>0;s--){ var j=rnd(0,s),tmp=alturas[s];alturas[s]=alturas[j];alturas[j]=tmp; }
  var xs=[W*0.52, W*0.72, W*0.88];
  for(var i=0;i<3;i++){
    var px=xs[i], niveles=alturas[i];
    var y=groundY;
    // Columna de soporte
    for(var p=0;p<niveles;p++){
      addBloque(px-pr*0.6,y-u/2, ww,u, mat(p));
      addBloque(px+pr*0.6,y-u/2, ww,u, mat(p+1));
      y-=u;
      addBloque(px,y-bh/2, pr*1.8,bh, mat(p));
      y-=bh;
    }
    // Plataforma final con muros
    addBloque(px,y-bh/2, pr*2.4,bh, mat(i));
    y-=bh;
    addBloque(px-pr*0.9,y-u/2, ww,u, mat(i+1));
    addBloque(px+pr*0.9,y-u/2, ww,u, mat(i+2));
    y-=u;
    addBloque(px,y-bh/2, pr*2.4,bh, mat(i));
    addTNT(px,y+u*0.3,pr);
    addPig(px, y+u*0.5+pr*0.2, opc[i],opc[i]===estado.resultado,pr);
  }
}

/* --- Template 3: Muralla con cerdos detras --- */
function nivelMuralla(opc,pr,u,ww,bh){
  var wallX=W*0.58;
  var pisos=Math.max(2,rnd(1,cfgActual.pisosMax)+1);
  // Muralla vertical
  for(var p=0;p<pisos;p++){
    addBloque(wallX, groundY-p*u-u/2, ww*1.5, u, mat(p));
  }
  // Techo de la muralla
  addBloque(wallX, groundY-pisos*u-bh/2, pr*2, bh, mat(0));
  addTNT(wallX, groundY-u*0.4, pr);

  // Cerdos detras de la muralla a diferentes posiciones
  var pigXs=[W*0.68, W*0.78, W*0.90];
  var pigYs=[groundY-pr*0.7, groundY-pr*0.7, groundY-pr*0.7];
  // Un cerdo en altura
  var elevado=rnd(0,2);
  // Plataforma elevada para ese cerdo
  addBloque(pigXs[elevado], groundY-u-bh/2, pr*2, bh, mat(1));
  addBloque(pigXs[elevado]-pr*0.7, groundY-u/2, ww, u, mat(2));
  addBloque(pigXs[elevado]+pr*0.7, groundY-u/2, ww, u, mat(0));
  pigYs[elevado]=groundY-u-bh-pr*0.5;
  // Fuertecito para otro cerdo
  var protegido=(elevado+1)%3;
  addBloque(pigXs[protegido]-pr*1.0, groundY-u/2, ww, u, mat(1));
  addBloque(pigXs[protegido]+pr*1.0, groundY-u/2, ww, u, mat(2));
  addBloque(pigXs[protegido], groundY-u-bh/2, pr*2.4, bh, mat(0));

  for(var i=0;i<3;i++) addPig(pigXs[i],pigYs[i],opc[i],opc[i]===estado.resultado,pr);
}

/* --- Template 4: Mixto (1 expuesto, 1 protegido, 1 elevado) --- */
function nivelMixto(opc,pr,u,ww,bh){
  var order=[0,1,2];
  for(var s=2;s>0;s--){var j=rnd(0,s),tmp=order[s];order[s]=order[j];order[j]=tmp;}

  // Expuesto (sin fuerte)
  var ex=order[0], exX=W*(0.5+ex*0.18);
  addPig(exX, groundY-pr*0.7, opc[ex],opc[ex]===estado.resultado,pr);

  // Protegido (bunker)
  var pt=order[1], ptX=W*(0.5+pt*0.18);
  addBloque(ptX, groundY-bh/2, pr*3.2, bh, mat(0));
  addBloque(ptX-pr*1.3, groundY-bh-u/2, ww, u, mat(1));
  addBloque(ptX+pr*1.3, groundY-bh-u/2, ww, u, mat(2));
  addBloque(ptX-pr*1.8, groundY-bh-u/2, ww, u, mat(0)); // muro frontal
  addBloque(ptX, groundY-bh-u-bh/2, pr*3.2, bh, mat(1));
  addTNT(ptX, groundY-bh-u*0.4, pr);
  addPig(ptX, groundY-bh-pr*0.5, opc[pt],opc[pt]===estado.resultado,pr);

  // Elevado (torre)
  var el=order[2], elX=W*(0.5+el*0.18);
  var pisos=rnd(2,Math.max(2,cfgActual.pisosMax));
  var y=groundY;
  for(var p=0;p<pisos;p++){
    addBloque(elX, y-bh/2, pr*2, bh, mat(p));
    y-=bh;
    addBloque(elX-pr*0.7, y-u/2, ww, u, mat(p+1));
    addBloque(elX+pr*0.7, y-u/2, ww, u, mat(p+2));
    y-=u;
  }
  addBloque(elX, y-bh/2, pr*2, bh, mat(0));
  addPig(elX, y+u*0.3, opc[el],opc[el]===estado.resultado,pr);
}

/* --- Template 5: Trinchera (cerdos en hoyos entre bloques) --- */
function nivelTrinchera(opc,pr,u,ww,bh){
  var startX=W*0.48, spacing=W*0.17;
  for(var i=0;i<3;i++){
    var px=startX+i*spacing;
    // Muros laterales formando trinchera
    addBloque(px-pr*1.2, groundY-u/2, ww, u, mat(i));
    addBloque(px+pr*1.2, groundY-u/2, ww, u, mat(i+1));
    // Piso de trinchera
    addBloque(px, groundY-bh/2, pr*2.0, bh, mat(i+2));
    // Techo aleatorio (a veces abierto)
    if(Math.random()>0.35){
      addBloque(px, groundY-u-bh/2, pr*2.8, bh, mat(i));
      // Segundo nivel aleatorio
      if(rnd(0,cfgActual.pisosMax)>1){
        addBloque(px-pr*0.8, groundY-u-bh-u/2, ww, u, mat(i+1));
        addBloque(px+pr*0.8, groundY-u-bh-u/2, ww, u, mat(i+2));
        addBloque(px, groundY-u-bh-u-bh/2, pr*2.2, bh, mat(i));
      }
    }
    addTNT(px, groundY-bh-pr*0.3, pr);
    addPig(px, groundY-bh-pr*0.5, opc[i],opc[i]===estado.resultado,pr);
  }
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
    setTimeout(avanzarRonda, 1500);
  } else if(modo==='racha'){
    rachaAcierto();
  }
  revisarLogros(); refrescarChips();
}
function avanzarRonda(){ rondaActual++; if(rondaActual>=RONDAS_POR_RETO) finReto(); else nuevaRondaAventura(); }

function falloTiro(){
  // Suelo o fuera de pantalla — solo resetea pajaro, NO pierde vida
  setTimeout(function(){ var pm=paramsPajaro(pajaroSel); bird={x:anchor.x,y:anchor.y,vx:0,vy:0,r:Math.min(W,H)*0.035*pm.rMul,angle:0}; dashUsado=false; bombaUsada=false; fase='aim'; }, 700);
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

  titulo.textContent=conteoEsSuma?'Sumale a '+a:'Quitale a '+a;
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
    hablar(String(total));

    if(conteoAgregado===estado.b){
      document.getElementById('conteoTitulo').textContent=estado.a+' '+(conteoEsSuma?'+':'−')+' '+estado.b+' = '+estado.resultado+'!';
      document.getElementById('conteoResultado').classList.add('conteo-correcto');
      hablar('La respuesta es '+estado.resultado);
    }
  };
  return d;
}

function cerrarConteo(){ document.getElementById('panelConteo').classList.remove('active'); }
