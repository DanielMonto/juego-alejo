/* ============================================================
   GAME — Matter.js (standalone) + Canvas rendering
   Basado en el ejemplo oficial de slingshot de Matter.js:
   https://github.com/liabru/matter-js/blob/master/examples/slingshot.js
============================================================ */

var Engine=Matter.Engine, Render=Matter.Render, Runner=Matter.Runner,
    Composites=Matter.Composites, Common=Matter.Common, Constraint=Matter.Constraint,
    MouseConstraint=Matter.MouseConstraint, Mouse=Matter.Mouse,
    Composite=Matter.Composite, Bodies=Matter.Bodies, Body=Matter.Body,
    Events=Matter.Events;

/* ---- Estado global ---- */
var GS={
  modo:'aventura', vidas:3, racha:0, rachaNivelIdx:0, rachaRecord:false,
  rondaActual:0, primerIntento:0, rondaFallada:false,
  retoMundo:0, retoIdx:0, pajaroSel:'rojo',
  estado:{a:0,b:0,op:'+',tipo:'suma',resultado:0},
  cfg:{maxRes:10,pisosMax:1,mats:['wood'],tnt:0,tema:'pradera',modoOp:'mixto'}
};
var matterEngine=null, matterRunner=null, matterMouse=null, matterMouseConstraint=null;
var elastic=null, rock=null;
var cv, ctx, W, H, groundY, anchorX, anchorY;
var pigBodies=[], blockBodies=[], groundBodies=[];
var gameActive=false, resolved=false, launched=false;
var animFrame=null;

/* ---- Operaciones ---- */
function generarOperacion(){
  var c=GS.cfg, tipo=c.modoOp;
  if(tipo==='mixto') tipo=Math.random()<0.5?'suma':'resta';
  var a,b;
  if(tipo==='suma'){ var t=rnd(2,c.maxRes); a=rnd(1,t-1); b=t-a; GS.estado.op='+'; GS.estado.resultado=a+b; }
  else{ a=rnd(3,c.maxRes); b=rnd(1,a-1); GS.estado.op='−'; GS.estado.resultado=a-b; }
  GS.estado.a=a; GS.estado.b=b; GS.estado.tipo=tipo;
}
function generarOpciones(){
  var c=GS.estado.resultado, set={}; set[c]=true; var t=0;
  while(Object.keys(set).length<3&&t<60){ t++; var v=c+rnd(-3,3); if(v>=0&&v!==c) set[v]=true; }
  var arr=Object.keys(set).map(Number);
  for(var i=arr.length-1;i>0;i--){ var j=rnd(0,i); var x=arr[i]; arr[i]=arr[j]; arr[j]=x; }
  return arr;
}

/* ---- Iniciar modos ---- */
function iniciarReto(m,r){
  GS.modo='aventura'; GS.retoMundo=m; GS.retoIdx=r;
  GS.rondaActual=0; GS.primerIntento=0; GS.vidas=3; GS.rondaFallada=false;
  var mu=MUNDOS[m];
  GS.cfg={maxRes:mu.maxRes,pisosMax:mu.pisosMax,mats:mu.mats,tnt:mu.tnt,tema:mu.tema,modoOp:'mixto'};
  lanzarJuego();
}
function iniciarRacha(){
  GS.modo='racha'; GS.racha=0; GS.rachaNivelIdx=0; GS.rachaRecord=false; GS.vidas=3;
  var niv=RACHA_NIVELES[0];
  GS.cfg={maxRes:niv.maxRes,pisosMax:niv.pisosMax,mats:niv.mats,tnt:niv.tnt,tema:niv.tema,modoOp:niv.modoOp};
  lanzarJuego();
}

function lanzarJuego(){
  generarOperacion();
  mostrar('juego');
  requestAnimationFrame(function(){ setupMatter(); nuevaRonda(); });
}
function salirJuego(){
  stopGame();
  refrescarChips();
  if(GS.modo==='aventura'){ renderMapa(); mostrar('sMapa'); } else mostrar('sMenu');
}
function stopGame(){
  gameActive=false;
  if(animFrame){ cancelAnimationFrame(animFrame); animFrame=null; }
  if(matterRunner){ Runner.stop(matterRunner); }
}

/* ============================================================
   MATTER.JS SETUP — Patron oficial slingshot
============================================================ */
function setupMatter(){
  cv=document.getElementById('lienzo');
  W=cv.parentElement.clientWidth; H=cv.parentElement.clientHeight;
  cv.width=W; cv.height=H;
  ctx=cv.getContext('2d');
  groundY=H*0.82;
  anchorX=W*0.15;
  anchorY=groundY-Math.min(W,H)*0.28;

  // Engine
  if(matterEngine){ Composite.clear(matterEngine.world); Engine.clear(matterEngine); }
  matterEngine=Engine.create();
  matterEngine.gravity.y=1.8;

  // Suelo y paredes
  groundBodies=[];
  groundBodies.push(Bodies.rectangle(W/2, groundY+100, W*3, 200, {isStatic:true, label:'ground', friction:1}));
  groundBodies.push(Bodies.rectangle(-50, H/2, 100, H*2, {isStatic:true, label:'wall'}));
  groundBodies.push(Bodies.rectangle(W+50, H/2, 100, H*2, {isStatic:true, label:'wall'}));
  Composite.add(matterEngine.world, groundBodies);

  // Mouse constraint (para el drag del slingshot)
  if(matterMouse) Mouse.clearSourceEvents(matterMouse);
  matterMouse=Mouse.create(cv);
  matterMouse.pixelRatio=window.devicePixelRatio||1;
  matterMouseConstraint=MouseConstraint.create(matterEngine,{
    mouse:matterMouse,
    constraint:{stiffness:0.2, render:{visible:false}}
  });
  Composite.add(matterEngine.world, matterMouseConstraint);

  // Collision events
  Events.off(matterEngine); // limpiar eventos previos
  Events.on(matterEngine,'collisionStart',function(event){
    if(resolved) return;
    for(var i=0;i<event.pairs.length;i++){
      var a=event.pairs[i].bodyA, b=event.pairs[i].bodyB;
      handleCollision(a,b);
    }
  });

  // afterUpdate: detectar cuando se suelta el rock (patron oficial)
  Events.on(matterEngine,'afterUpdate',function(){
    if(!rock||resolved) return;
    // Si el mouse se solto Y el rock se alejo del anchor => fue lanzado
    if(matterMouseConstraint.mouse.button===-1 && !launched){
      var dx=rock.position.x-anchorX, dy=rock.position.y-anchorY;
      if(Math.abs(dx)>15||Math.abs(dy)>15){
        launched=true;
        sonidoLanzar();
      }
    }
    // Si el rock se detuvo o salio de pantalla => fallo el tiro
    if(launched && !resolved){
      var sp=Body.getSpeed(rock);
      var pos=rock.position;
      if(pos.x>W+100||pos.x<-100||pos.y>H+100){
        onMiss();
      } else if(sp<0.5 && pos.y>groundY-30){
        onMiss();
      }
    }
  });

  // Runner
  if(matterRunner) Runner.stop(matterRunner);
  matterRunner=Runner.create();
  Runner.run(matterRunner, matterEngine);

  gameActive=true;
}

/* ---- Crear ronda (rock + fort + pigs + elastic) ---- */
function nuevaRonda(){
  resolved=false; launched=false;
  GS.rondaFallada=false;
  pigBodies=[]; blockBodies=[];

  // Limpiar bodies de ronda anterior (no tocar ground/walls/mouseConstraint)
  var allBodies=Composite.allBodies(matterEngine.world);
  for(var i=allBodies.length-1;i>=0;i--){
    var b=allBodies[i];
    if(b.label!=='ground'&&b.label!=='wall'&&!b.isSensor){
      Composite.remove(matterEngine.world, b);
    }
  }
  // Limpiar constraints
  var allConstraints=Composite.allConstraints(matterEngine.world);
  for(var j=allConstraints.length-1;j>=0;j--){
    if(allConstraints[j]!==matterMouseConstraint.constraint){
      Composite.remove(matterEngine.world, allConstraints[j]);
    }
  }

  // ROCK (pajaro) — patron oficial
  var rockR=Math.min(W,H)*0.022;
  if(GS.pajaroSel==='azul') rockR*=1.4;
  rock=Bodies.circle(anchorX, anchorY, rockR, {
    density:0.004, label:'bird', restitution:0.3, friction:0.5
  });
  rock.gameData={r:rockR};
  Composite.add(matterEngine.world, rock);

  // ELASTIC — patron oficial del slingshot
  elastic=Constraint.create({
    pointA:{x:anchorX, y:anchorY},
    bodyB:rock,
    length:0.01,
    damping:0.01,
    stiffness:0.05
  });
  Composite.add(matterEngine.world, elastic);

  // FUERTES + CERDOS
  buildForts();

  // HUD
  updateHUD();

  // Iniciar loop de dibujo
  if(!animFrame) drawLoop();

  initAudio();
  hablar('¿Cuánto es '+GS.estado.a+(GS.estado.tipo==='suma'?' más ':' menos ')+GS.estado.b+'?');
}

/* ---- Fuertes ---- */
function buildForts(){
  var opciones=generarOpciones();
  var xs=[W*0.55, W*0.73, W*0.90];
  for(var i=0;i<3;i++){
    var pigY=buildSingleFort(xs[i]);
    createPig(xs[i], pigY, opciones[i], opciones[i]===GS.estado.resultado);
  }
}
function buildSingleFort(px){
  var unit=Math.min(W,H)*0.035;
  var comp=rnd(1,GS.cfg.pisosMax);
  var wallW=unit*0.5, wallH=unit*1.0, beamW=unit*2.6, beamH=unit*0.4;
  var mats=GS.cfg.mats;
  var baseY=groundY;

  addBlock(px, baseY-beamH/2, beamW, beamH, mats[0%mats.length]);
  var floorTop=baseY-beamH;

  for(var n=0;n<comp;n++){
    var y=floorTop-n*(wallH+beamH);
    addBlock(px-unit*1.0, y-wallH/2, wallW, wallH, mats[(n+1)%mats.length]);
    addBlock(px+unit*1.0, y-wallH/2, wallW, wallH, mats[(n+2)%mats.length]);
    addBlock(px, y-wallH-beamH/2, beamW, beamH, mats[n%mats.length]);
  }
  if(GS.cfg.tnt>0&&Math.random()<GS.cfg.tnt+0.2){
    addBlock(px, floorTop-unit*0.35, unit*0.6, unit*0.6, 'tnt');
  }
  return floorTop-unit*0.45;
}
function addBlock(x,y,w,h,mat){
  var density=mat==='stone'?0.005:mat==='ice'?0.001:0.003;
  var b=Bodies.rectangle(x,y,w,h,{
    isStatic:true, label:'block', friction:0.9, restitution:0.05, density:density
  });
  b.gameData={mat:mat, w:w, h:h};
  blockBodies.push(b);
  Composite.add(matterEngine.world, b);
}
function createPig(x,y,num,correcto){
  var r=Math.min(W,H)*0.022;
  var b=Bodies.circle(x,y,r,{isStatic:true, label:'pig', friction:0.8, density:0.003});
  b.gameData={num:num, correcto:correcto, r:r, vivo:true};
  pigBodies.push(b);
  Composite.add(matterEngine.world, b);
}

/* ---- Colisiones ---- */
function handleCollision(a,b){
  var bird=null, other=null;
  if(a.label==='bird'){bird=a;other=b;}
  else if(b.label==='bird'){bird=b;other=a;}
  if(!bird||!launched) return;

  if(other.label==='pig'&&other.gameData&&other.gameData.vivo){
    onHitPig(other); return;
  }
  if(other.label==='block'){
    wakeBlocks(bird.position.x,bird.position.y);
    if(other.gameData&&other.gameData.mat==='tnt'){
      triggerExplosion(other.position.x,other.position.y);
    }
  }
}
function wakeBlocks(x,y){
  var radius=Math.min(W,H)*0.18;
  for(var i=0;i<blockBodies.length;i++){
    var bl=blockBodies[i]; if(!bl.isStatic) continue;
    var dx=bl.position.x-x, dy=bl.position.y-y;
    if(Math.sqrt(dx*dx+dy*dy)<radius){ Body.setStatic(bl,false); }
  }
}
function triggerExplosion(x,y){
  var radius=Math.min(W,H)*0.14;
  sonidoBoom();
  for(var j=0;j<blockBodies.length;j++){
    var bl=blockBodies[j];
    var dx=bl.position.x-x, dy=bl.position.y-y, d=Math.sqrt(dx*dx+dy*dy);
    if(d<radius*1.5){
      Body.setStatic(bl,false);
      var force=(1-d/(radius*1.5))*0.08;
      Body.applyForce(bl,bl.position,{x:(dx/(d||1))*force, y:(dy/(d||1))*force-force*0.5});
      if(bl.gameData&&bl.gameData.mat==='tnt'&&d<radius){
        bl.gameData.mat='used';
        (function(bx,by){setTimeout(function(){triggerExplosion(bx,by);},200);})(bl.position.x,bl.position.y);
      }
    }
  }
  for(var k=0;k<pigBodies.length;k++){
    var pg=pigBodies[k]; if(!pg.gameData||!pg.gameData.vivo) continue;
    var dpx=pg.position.x-x, dpy=pg.position.y-y;
    if(Math.sqrt(dpx*dpx+dpy*dpy)<radius+pg.gameData.r){ onHitPig(pg); return; }
  }
  if(!save.tntUsado){save.tntUsado=true;guardar();toast('¡Explotaste un TNT!');revisarLogros();}
}

/* ---- Hit pig ---- */
function onHitPig(pigBody){
  if(resolved) return;
  resolved=true;
  if(pigBody.gameData.correcto){ winRound(pigBody); }
  else { loseLife(); }
}
function onMiss(){
  if(resolved) return;
  resolved=true;
  setTimeout(function(){ resetRock(); },800);
}

/* ---- Win ---- */
function winRound(pig){
  pig.gameData.vivo=false;
  Body.setStatic(pig,false);
  Body.setVelocity(pig,{x:rnd(3,8),y:rnd(-12,-6)});
  wakeBlocks(pig.position.x,pig.position.y);
  sonidoVictoria(); lanzarConfeti();
  save.aciertosTotales++;
  if(!GS.rondaFallada&&GS.modo==='aventura') GS.primerIntento++;
  var elogios=['¡Muy bien','¡Excelente','¡Campeón','¡Genial','¡Súper'];
  hablarAcierto(elogios[rnd(0,elogios.length-1)]+', '+(save.nombre||'Alejo')+'! '+GS.estado.a+(GS.estado.tipo==='suma'?' más ':' menos ')+GS.estado.b+' es '+GS.estado.resultado);
  if(GS.modo==='racha'){
    GS.racha++;
    if(GS.racha>save.rachaMax){save.rachaMax=GS.racha;guardar();
      if(!GS.rachaRecord){GS.rachaRecord=true;toast('Nuevo record: '+GS.racha+'!');sonidoTrofeo();lanzarConfeti();}}
  }
  guardar();revisarLogros();refrescarChips();updateHUD();
  setTimeout(nextRound,1800);
}

/* ---- Lose life ---- */
function loseLife(){
  GS.vidas--; GS.rondaFallada=true; sonidoMal(); updateHUD();
  if(GS.modo==='racha'){GS.racha=0;GS.rachaNivelIdx=0;
    var niv=RACHA_NIVELES[0];
    GS.cfg={maxRes:niv.maxRes,pisosMax:niv.pisosMax,mats:niv.mats,tnt:niv.tnt,tema:niv.tema,modoOp:niv.modoOp};}
  if(GS.vidas<=0){ gameOver(); }
  else{
    hablar('¡Ese no! Era '+GS.estado.resultado+'. Te quedan '+GS.vidas+' vidas');
    setTimeout(function(){ resetRock(); },900);
  }
}

/* ---- Reset rock (misma ronda) ---- */
function resetRock(){
  resolved=false; launched=false;
  // Reemplazar rock y elastic — patron oficial
  Composite.remove(matterEngine.world, rock);
  Composite.remove(matterEngine.world, elastic);
  var rockR=rock.gameData.r;
  rock=Bodies.circle(anchorX, anchorY, rockR, {
    density:0.004, label:'bird', restitution:0.3, friction:0.5
  });
  rock.gameData={r:rockR};
  Composite.add(matterEngine.world, rock);
  elastic=Constraint.create({pointA:{x:anchorX,y:anchorY},bodyB:rock,length:0.01,damping:0.01,stiffness:0.05});
  Composite.add(matterEngine.world, elastic);
}

/* ---- Next round ---- */
function nextRound(){
  if(GS.modo==='aventura'){
    GS.rondaActual++;
    if(GS.rondaActual>=RONDAS_POR_RETO){finReto();return;}
  } else {
    var ni=0;
    for(var i=RACHA_NIVELES.length-1;i>=0;i--){if(GS.racha>=RACHA_NIVELES[i].desde){ni=i;break;}}
    if(ni!==GS.rachaNivelIdx){
      GS.rachaNivelIdx=ni;var niv=RACHA_NIVELES[ni];
      GS.cfg={maxRes:niv.maxRes,pisosMax:niv.pisosMax,mats:niv.mats,tnt:niv.tnt,tema:niv.tema,modoOp:niv.modoOp};
      toast('Nivel: '+niv.nombre+'!');
    }
  }
  generarOperacion();
  nuevaRonda();
}

/* ---- Fin reto / Game Over ---- */
function finReto(){
  var p=GS.primerIntento,trofeo=p>=5?'copa':p>=4?'oro':p>=3?'plata':'bronce',estrellas=p>=5?3:p>=3?2:1;
  var key=retoKey(GS.retoMundo,GS.retoIdx),prev=save.retos[key];
  var rank={bronce:1,plata:2,oro:3,copa:4};
  if(!prev||rank[trofeo]>rank[prev.trofeo])save.retos[key]={trofeo:trofeo,estrellas:estrellas,completado:true};
  var gc=trofeo==='copa'?2:trofeo==='oro'?1:0;
  if(!prev){save.copas+=gc;if(trofeo==='copa')save.copasPerfectas++;}
  else{var pc=prev.trofeo==='copa'?2:prev.trofeo==='oro'?1:0;if(gc>pc){save.copas+=(gc-pc);if(trofeo==='copa'&&prev.trofeo!=='copa')save.copasPerfectas++;}}
  if(mundoTerminado(GS.retoMundo)&&save.mundoDesbloqueado<GS.retoMundo+1&&GS.retoMundo+1<MUNDOS.length){save.mundoDesbloqueado=GS.retoMundo+1;toast('¡Nuevo mundo: '+MUNDOS[GS.retoMundo+1].nombre+'!');}
  for(var i=0;i<PAJAROS.length;i++){var P=PAJAROS[i];if(save.pajaros.indexOf(P.id)===-1&&save.copas>=P.costo){save.pajaros.push(P.id);toast('¡Pájaro nuevo: '+P.nombre+'!');}}
  guardar();revisarLogros();refrescarChips();
  document.getElementById('trofeoEmoji').textContent=trofeoEmoji(trofeo);
  document.getElementById('trofeoTxt').textContent=trofeo==='copa'?'¡PERFECTO! 🏆':'¡Reto completado!';
  document.getElementById('trofeoEstrellas').textContent='⭐'.repeat(estrellas)+'☆'.repeat(3-estrellas);
  document.getElementById('trofeoDetalle').textContent=p+' de '+RONDAS_POR_RETO+' a la primera';
  document.getElementById('cartelTrofeo').classList.add('active');
  sonidoTrofeo();lanzarConfeti();
  hablar((trofeo==='copa'?'¡Perfecto! ':'¡Reto completado! ')+'Lograste '+p+' de '+RONDAS_POR_RETO);
}
function gameOver(){
  document.getElementById('goTitulo').textContent='¡Se acabaron las vidas!';
  document.getElementById('goRacha').textContent=GS.modo==='racha'?GS.racha:GS.primerIntento+'/'+RONDAS_POR_RETO;
  document.getElementById('goMejor').textContent=save.rachaMax;
  document.getElementById('goNivel').textContent=GS.modo==='racha'?RACHA_NIVELES[GS.rachaNivelIdx].nombre:'Reto '+(GS.retoIdx+1);
  document.getElementById('btnGoReintentar').onclick=function(){
    document.getElementById('cartelGameOver').classList.remove('active');
    if(GS.modo==='racha')iniciarRacha();else iniciarReto(GS.retoMundo,GS.retoIdx);};
  document.getElementById('btnGoSalir').onclick=function(){
    document.getElementById('cartelGameOver').classList.remove('active');salirJuego();};
  document.getElementById('cartelGameOver').classList.add('active');
  hablar('Se acabaron las vidas');
}

/* ---- HUD ---- */
function updateHUD(){
  var el=document.getElementById('hudVidas');
  if(el){var h='';for(var i=0;i<3;i++)h+=(i<GS.vidas?'<span class="racha-vida">&#x2764;</span>':'<span class="racha-vida muerta">&#x2764;</span>');el.innerHTML=h;}
  var prob=document.getElementById('problema');
  if(prob)prob.textContent=GS.estado.a+' '+GS.estado.op+' '+GS.estado.b+' = ?';
  var chip=document.getElementById('chipRonda');
  if(chip){if(GS.modo==='aventura'){chip.style.display='';chip.textContent='Ronda '+(GS.rondaActual+1)+'/'+RONDAS_POR_RETO;}else chip.style.display='none';}
  var est=document.getElementById('chipEstrellas');
  if(est){
    if(GS.modo==='racha'){est.innerHTML='<i data-lucide="flame" style="width:16px;height:16px"></i> '+GS.racha;}
    else{est.innerHTML='<i data-lucide="star" style="width:16px;height:16px"></i> '+GS.primerIntento;}
    try{lucide.createIcons();}catch(e){}
  }
}

/* ============================================================
   CANVAS DRAWING — nuestro rendering custom
============================================================ */
function drawLoop(){
  if(!gameActive){animFrame=null;return;}
  animFrame=requestAnimationFrame(drawLoop);
  if(!ctx) return;
  ctx.clearRect(0,0,W,H);
  drawBackground();
  drawSlingshot();
  drawBlocks();
  drawPigs();
  drawBird();
}

function drawBackground(){
  var tema=TEMAS[GS.cfg.tema]||TEMAS.pradera;
  // Cielo
  ctx.fillStyle=intToHex(tema.sky); ctx.fillRect(0,0,W,groundY);
  // Sol
  ctx.fillStyle=GS.cfg.tema==='noche'?'#f5f3c0':'#fff3a0';
  ctx.beginPath(); ctx.arc(W*0.82,H*0.15,Math.min(W,H)*0.04,0,7); ctx.fill();
  // Nubes
  if(GS.cfg.tema!=='noche'&&GS.cfg.tema!=='volcan'){
    ctx.fillStyle='rgba(255,255,255,0.8)';
    drawCloud(W*0.3,H*0.14,Math.min(W,H)*0.035);
    drawCloud(W*0.6,H*0.09,Math.min(W,H)*0.028);
  }
  // Suelo
  ctx.fillStyle=intToHex(tema.ground); ctx.fillRect(0,groundY,W,H-groundY);
  ctx.fillStyle=intToHex(tema.border); ctx.fillRect(0,groundY,W,4);
  // Pasto
  if(GS.cfg.tema==='pradera'){
    ctx.strokeStyle='#3d8b40'; ctx.lineWidth=2;
    for(var i=0;i<W;i+=22){var gh=5+((i*7)%5);
      ctx.beginPath();ctx.moveTo(i,groundY+4);ctx.lineTo(i-2,groundY+4-gh);ctx.stroke();
      ctx.beginPath();ctx.moveTo(i,groundY+4);ctx.lineTo(i+2,groundY+4-gh);ctx.stroke();}
  }
}
function drawCloud(x,y,r){
  ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.arc(x+r*0.9,y+r*0.15,r*0.75,0,7);
  ctx.arc(x-r*0.9,y+r*0.15,r*0.75,0,7);ctx.arc(x+r*0.35,y-r*0.35,r*0.65,0,7);ctx.fill();
}

function drawSlingshot(){
  if(!rock) return;
  var sz=Math.min(W,H), fw=sz*0.022;
  var ltx=anchorX-fw,lty=anchorY, rtx=anchorX+fw,rty=anchorY;
  var splitY=anchorY+sz*0.06;
  // Goma trasera
  ctx.lineStyle=1;
  ctx.strokeStyle='#3f2a15'; ctx.lineWidth=sz*0.01;
  ctx.beginPath(); ctx.moveTo(rtx,rty); ctx.lineTo(rock.position.x,rock.position.y); ctx.stroke();
  // Base
  ctx.strokeStyle='#8b5a2b'; ctx.lineWidth=sz*0.022; ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(anchorX,groundY);ctx.lineTo(anchorX,splitY);ctx.stroke();
  // Horquillas
  ctx.strokeStyle='#9c6631'; ctx.lineWidth=sz*0.016;
  ctx.beginPath();ctx.moveTo(anchorX,splitY);ctx.lineTo(ltx,lty);ctx.stroke();
  ctx.beginPath();ctx.moveTo(anchorX,splitY);ctx.lineTo(rtx,rty);ctx.stroke();
  // Puntas
  ctx.fillStyle='#7a4a1e';
  ctx.beginPath();ctx.arc(ltx,lty,sz*0.01,0,7);ctx.fill();
  ctx.beginPath();ctx.arc(rtx,rty,sz*0.01,0,7);ctx.fill();
  // Goma delantera
  ctx.strokeStyle='#6b4423'; ctx.lineWidth=sz*0.01;
  ctx.beginPath(); ctx.moveTo(ltx,lty); ctx.lineTo(rock.position.x,rock.position.y); ctx.stroke();
}

function drawBird(){
  if(!rock) return;
  var x=rock.position.x, y=rock.position.y, r=rock.gameData.r;
  var col=getBirdHex();
  var colD=shadeColor(col,-40), colL=shadeColor(col,30);
  ctx.save(); ctx.translate(x,y); ctx.rotate(rock.angle);
  // Cola
  ctx.fillStyle=colD;
  ctx.beginPath();ctx.moveTo(-r*0.7,0);ctx.lineTo(-r*1.5,-r*0.45);ctx.lineTo(-r*1.35,0);ctx.lineTo(-r*1.5,r*0.45);ctx.closePath();ctx.fill();
  // Cuerpo
  ctx.fillStyle=col; ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
  ctx.fillStyle=colL; ctx.globalAlpha=0.3; ctx.beginPath();ctx.arc(-r*0.2,-r*0.2,r*0.45,0,7);ctx.fill(); ctx.globalAlpha=1;
  ctx.strokeStyle=colD; ctx.lineWidth=2; ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.stroke();
  // Panza
  ctx.fillStyle='#ffe0c2'; ctx.beginPath();ctx.ellipse(r*0.1,r*0.35,r*0.45,r*0.35,0,0,7);ctx.fill();
  // Cresta
  ctx.strokeStyle=colD; ctx.lineWidth=r*0.12; ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-r*0.1,-r*0.85);ctx.lineTo(-r*0.25,-r*1.3);ctx.stroke();
  ctx.beginPath();ctx.moveTo(r*0.15,-r*0.85);ctx.lineTo(r*0.06,-r*1.35);ctx.stroke();
  // Ojos
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(r*0.18,-r*0.25,r*0.27,0,7);ctx.fill();ctx.beginPath();ctx.arc(r*0.55,-r*0.22,r*0.22,0,7);ctx.fill();
  ctx.fillStyle='#222';ctx.beginPath();ctx.arc(r*0.28,-r*0.25,r*0.11,0,7);ctx.fill();ctx.beginPath();ctx.arc(r*0.6,-r*0.22,r*0.09,0,7);ctx.fill();
  // Cejas
  ctx.strokeStyle=colD; ctx.lineWidth=r*0.12;
  ctx.beginPath();ctx.moveTo(-r*0.1,-r*0.7);ctx.lineTo(r*0.45,-r*0.45);ctx.stroke();
  ctx.beginPath();ctx.moveTo(r*0.75,-r*0.55);ctx.lineTo(r*0.4,-r*0.42);ctx.stroke();
  // Pico
  ctx.fillStyle='#ff9500';
  ctx.beginPath();ctx.moveTo(r*0.8,-r*0.06);ctx.lineTo(r*1.35,r*0.06);ctx.lineTo(r*0.8,r*0.22);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#cc6d00'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.restore();
}

function drawBlocks(){
  for(var i=0;i<blockBodies.length;i++){
    var b=blockBodies[i]; if(!b.gameData) continue;
    var col=MAT_COLORS[b.gameData.mat]||MAT_COLORS.wood;
    var w=b.gameData.w, h=b.gameData.h;
    ctx.save(); ctx.translate(b.position.x,b.position.y); ctx.rotate(b.angle);
    ctx.fillStyle=intToHex(col.fill);
    ctx.fillRect(-w/2,-h/2,w,h);
    ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(-w/2,-h/2,w,h*0.4);
    ctx.strokeStyle=intToHex(col.stroke); ctx.lineWidth=2; ctx.strokeRect(-w/2,-h/2,w,h);
    if(b.gameData.mat==='tnt'){
      ctx.fillStyle='#fff'; ctx.font='bold '+Math.floor(h*0.4)+'px Comic Sans MS';
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('TNT',0,0);
    }
    ctx.restore();
  }
}

function drawPigs(){
  for(var i=0;i<pigBodies.length;i++){
    var pg=pigBodies[i]; if(!pg.gameData) continue;
    var x=pg.position.x, y=pg.position.y, r=pg.gameData.r;
    ctx.save(); ctx.translate(x,y); ctx.rotate(pg.angle);
    if(pg.gameData.vivo){
      // Orejas
      ctx.fillStyle='#3f9e43';ctx.beginPath();ctx.arc(-r*0.55,-r*0.7,r*0.28,0,7);ctx.fill();ctx.beginPath();ctx.arc(r*0.55,-r*0.7,r*0.28,0,7);ctx.fill();
      // Cuerpo
      ctx.fillStyle='#4caf50';ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();
      ctx.strokeStyle='#2f7d33';ctx.lineWidth=2;ctx.stroke();
      // Hocico
      ctx.fillStyle='#7bc943';ctx.beginPath();ctx.ellipse(0,r*0.28,r*0.45,r*0.35,0,0,7);ctx.fill();
      ctx.fillStyle='#2f7d33';ctx.beginPath();ctx.ellipse(-r*0.15,r*0.28,r*0.07,r*0.11,0,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(r*0.15,r*0.28,r*0.07,r*0.11,0,0,7);ctx.fill();
      // Ojos
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-r*0.3,-r*0.15,r*0.24,0,7);ctx.fill();ctx.beginPath();ctx.arc(r*0.3,-r*0.15,r*0.24,0,7);ctx.fill();
      ctx.fillStyle='#222';ctx.beginPath();ctx.arc(-r*0.24,-r*0.12,r*0.11,0,7);ctx.fill();ctx.beginPath();ctx.arc(r*0.36,-r*0.12,r*0.11,0,7);ctx.fill();
      // Cejas
      ctx.strokeStyle='#2f7d33';ctx.lineWidth=r*0.1;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(-r*0.55,-r*0.5);ctx.lineTo(-r*0.1,-r*0.38);ctx.stroke();
      ctx.beginPath();ctx.moveTo(r*0.55,-r*0.5);ctx.lineTo(r*0.1,-r*0.38);ctx.stroke();
    } else { ctx.font=(r*2)+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('💫',0,0); }
    ctx.restore();
    // Cartel
    if(pg.gameData.vivo){
      var bw=r*1.8, bh=r*1.2, by=y-r*2.2;
      ctx.strokeStyle='#c98a3c';ctx.lineWidth=r*0.12;ctx.beginPath();ctx.moveTo(x,by+bh/2);ctx.lineTo(x,y-r*0.8);ctx.stroke();
      ctx.fillStyle='#fff';ctx.strokeStyle='#ff9500';ctx.lineWidth=3;
      roundRect(ctx,x-bw/2,by-bh/2,bw,bh,8);ctx.fill();ctx.stroke();
      ctx.fillStyle='#073b5c';ctx.font='bold '+Math.floor(r*1.1)+'px Comic Sans MS';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(String(pg.gameData.num),x,by);
    }
  }
}

/* ---- Helpers graficos ---- */
function intToHex(n){return '#'+('000000'+(n||0).toString(16)).slice(-6);}
function getBirdHex(){
  if(GS.pajaroSel==='rojo') return save.colorPajaro||'#d62828';
  for(var i=0;i<PAJAROS.length;i++){if(PAJAROS[i].id===GS.pajaroSel) return intToHex(PAJAROS[i].color);}
  return '#d62828';
}
function shadeColor(hex,amt){try{var c=hex.replace('#','');if(c.length===3)c=c[0]+c[0]+c[1]+c[1]+c[2]+c[2];var r=parseInt(c.substr(0,2),16),g=parseInt(c.substr(2,2),16),b=parseInt(c.substr(4,2),16);
  r=Math.max(0,Math.min(255,r+amt));g=Math.max(0,Math.min(255,g+amt));b=Math.max(0,Math.min(255,b+amt));return'rgb('+r+','+g+','+b+')';}catch(e){return hex;}}
function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}

/* ---- Otros ---- */
function volverAlMapa(){document.getElementById('cartelTrofeo').classList.remove('active');renderMapa();mostrar('sMapa');lucide.createIcons();}

/* ---- Panel de conteo ---- */
var conteoN=0;
function abrirConteo(){conteoN=0;var zona=document.getElementById('conteoZona');zona.innerHTML='';var titulo=document.getElementById('conteoTitulo');var num=document.getElementById('conteoNum');
  if(GS.estado.tipo==='suma'){titulo.textContent='Toca y cuenta TODO: '+GS.estado.a+' + '+GS.estado.b;num.textContent='0';
    var e1=EMOJIS[rnd(0,EMOJIS.length-1)],e2=EMOJIS[rnd(0,EMOJIS.length-1)];if(e2===e1)e2=EMOJIS[(EMOJIS.indexOf(e1)+1)%EMOJIS.length];
    var g1=document.createElement('div');g1.className='cgrupo';for(var i=0;i<GS.estado.a;i++)g1.appendChild(crearObj(e1));
    var mas=document.createElement('div');mas.className='cmas';mas.textContent='+';var g2=document.createElement('div');g2.className='cgrupo g2';for(var j=0;j<GS.estado.b;j++)g2.appendChild(crearObj(e2));
    zona.appendChild(g1);zona.appendChild(mas);zona.appendChild(g2);
  }else{titulo.textContent='Tienes '+GS.estado.a+'. Quita '+GS.estado.b;num.textContent='0';
    var em=EMOJIS[rnd(0,EMOJIS.length-1)];var g=document.createElement('div');g.className='cgrupo';for(var k=0;k<GS.estado.a;k++)g.appendChild(crearObj(em,true));zona.appendChild(g);}
  document.getElementById('panelConteo').classList.add('active');}
function crearObj(emoji,quitar){var d=document.createElement('div');d.className='cobj';d.textContent=emoji;
  d.addEventListener('click',function(){var titulo=document.getElementById('conteoTitulo');var num=document.getElementById('conteoNum');
    if(quitar){if(d.classList.contains('quitado'))return;if(conteoN>=GS.estado.b)return;d.classList.add('quitado');d.style.opacity=.2;d.style.pointerEvents='none';d.style.transform='scale(.7) rotate(12deg)';
      conteoN++;sonidoToque(conteoN);num.textContent=conteoN;
      if(conteoN>=GS.estado.b){var quedan=GS.estado.a-GS.estado.b;titulo.textContent='¡Quitaste '+GS.estado.b+'! Quedan '+quedan;num.textContent=quedan;
        var vivos=document.querySelectorAll('#conteoZona .cobj:not(.quitado)');for(var i=0;i<vivos.length;i++)vivos[i].classList.add('ok');setTimeout(function(){hablar('Quitaste '+GS.estado.b+'. Quedan '+quedan);},300);
      }else{titulo.textContent='Vas '+conteoN+'. Quita '+(GS.estado.b-conteoN)+' más';hablar(String(conteoN));}
    }else{if(d.classList.contains('ok'))return;d.classList.add('ok');conteoN++;sonidoToque(conteoN);num.textContent=conteoN;hablar(String(conteoN));
      if(conteoN>=GS.estado.a+GS.estado.b){titulo.textContent='¡En total son '+conteoN+'!';}}});
  return d;}
function cerrarConteo(){document.getElementById('panelConteo').classList.remove('active');}
