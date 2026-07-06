/* ============================================================
   ENGINE — Canvas, física, dibujo, puntería
============================================================ */

var cv,ctx,W,H,groundY,anchor,raf=null;
var bird,pigs,blocks,particulas,estrellasFondo=[],explosiones=[],rastro=[];
var fase='aim', aiming=false, tAnim=0, dashActivo=0;
var K=0.26, G, MAXPULL;

function ajustarLienzo(){ cv=document.getElementById('lienzo'); W=cv.clientWidth; H=cv.clientHeight; cv.width=W; cv.height=H;
  ctx=cv.getContext('2d'); groundY=H*0.80; anchor={x:W*0.16, y:groundY-Math.min(W,H)*0.30}; }

/* ---- Helpers de física ---- */
function dist(x1,y1,x2,y2){ var dx=x1-x2,dy=y1-y2; return Math.sqrt(dx*dx+dy*dy); }
function tumbar(b,fromX){ b.cayendo=true; b.vx=(b.x>=fromX?1:-1)*(Math.random()*4+1); b.vy=-Math.random()*4; b.vrot=(Math.random()-0.5)*0.3; }
function sombra(hex,amt){ try{ var c=hex.replace('#',''); if(c.length===3) c=c[0]+c[0]+c[1]+c[1]+c[2]+c[2]; var r=parseInt(c.substr(0,2),16),g=parseInt(c.substr(2,2),16),b=parseInt(c.substr(4,2),16);
  r=Math.max(0,Math.min(255,r+amt)); g=Math.max(0,Math.min(255,g+amt)); b=Math.max(0,Math.min(255,b+amt)); return 'rgb('+r+','+g+','+b+')'; }catch(e){ return hex; } }
function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

function explota(x,y,size){ size=size||Math.min(W,H)*0.12;
  explosiones.push({x:x,y:y,t:0,max:22,size:size});
  var fuego=['#fff3b0','#ffe14d','#ff9a3c','#ff5a1f','#e02a1f'];
  for(var i=0;i<24;i++){ var a=Math.random()*6.283, sp=Math.random()*9+3; particulas.push({x:x,y:y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-2,r:Math.random()*5+3,color:fuego[rnd(0,fuego.length-1)],vida:rnd(16,32),vidaMax:32,g:0.22,fuego:true}); }
  for(var s=0;s<7;s++){ particulas.push({x:x+(Math.random()-0.5)*size*0.4,y:y-Math.random()*size*0.2,vx:(Math.random()-0.5)*2,vy:-Math.random()*2-1,r:Math.random()*7+5,vida:rnd(28,50),vidaMax:50,g:-0.03,humo:true}); } }

/* ---- Bucle principal ---- */
function bucle(){ G=H*0.0011*paramsPajaro(pajaroSel).gMul; MAXPULL=Math.min(W,H)*0.34; tAnim++; actualizar(); dibujar(); raf=requestAnimationFrame(bucle); }

function actualizar(){
  if(fase==='aim'){ bird.angle= aiming ? Math.atan2(anchor.y-bird.y, anchor.x-bird.x) : 0; }
  if(fase==='fly'){ bird.x+=bird.vx; bird.y+=bird.vy; bird.vy+=G; bird.angle=Math.atan2(bird.vy,bird.vx);
    rastro.push({x:bird.x,y:bird.y}); if(rastro.length>16) rastro.shift(); if(dashActivo>0) dashActivo--;
    var pm=paramsPajaro(pajaroSel);
    // BOMBA: explota al primer contacto
    if(pm.bomba && !bombaUsada){ var toco = bird.y>groundY-bird.r*0.3 && bird.vy>0;
      if(!toco){ for(var q=0;q<blocks.length;q++){ var bq=blocks[q]; if(bq.cayendo||bq.alpha<=0) continue; if(Math.abs(bird.x-bq.x)<bq.w*0.5+bird.r*0.7 && Math.abs(bird.y-bq.y)<bq.h*0.5+bird.r*0.7){ toco=true; break; } } }
      if(!toco){ for(var q2=0;q2<pigs.length;q2++){ var pq=pigs[q2]; if(pq.vivo && dist(bird.x,bird.y,pq.x,pq.y)<pq.r+bird.r){ toco=true; break; } } }
      if(toco){ bombaUsada=true; estallar(bird.x,bird.y, Math.min(W,H)*0.16, true); return; } }
    // TNT directo
    for(var t=0;t<blocks.length;t++){ var bl=blocks[t]; if(bl.type==='tnt' && !bl.cayendo && bl.alpha>0){
      if(Math.abs(bird.x-bl.x)<bl.w*0.6+bird.r && Math.abs(bird.y-bl.y)<bl.h*0.6+bird.r){ estallar(bl.x,bl.y, Math.min(W,H)*0.18, true); return; } } }
    // Arrasar bloques
    for(var c=0;c<blocks.length;c++){ var bk=blocks[c]; if(bk.type==='tnt'||bk.cayendo||bk.alpha<=0) continue;
      if(Math.abs(bird.x-bk.x)<bk.w*0.5+bird.r*0.65 && Math.abs(bird.y-bk.y)<bk.h*0.5+bird.r*0.65){
        tumbar(bk,bird.x); var fr=(bk.type==='stone')?0.86:(bk.type==='ice'?0.9:0.92); if(pajaroSel==='azul') fr=0.97; bird.vx*=fr; bird.vy*=fr; } }
    // Cerditos: impacto directo
    for(var i=0;i<pigs.length;i++){ var p=pigs[i]; if(p.vivo){ if(dist(bird.x,bird.y,p.x,p.y) < p.r+bird.r*0.7){ resolverPig(p); return; } } }
    // Suelo / fuera de pantalla
    var tocaSuelo = bird.y>groundY-bird.r*0.3 && (bird.vy>0 || bird.x>anchor.x+bird.r*2);
    if(tocaSuelo){ falloTiro(); return; }
    if(bird.x>W+80 || bird.x<-80){ falloTiro(); return; }
  }
  for(var j=0;j<pigs.length;j++){ var pg=pigs[j]; if(!pg.vivo){ pg.x+=pg.vx; pg.y+=pg.vy; pg.vy+=G*0.6; pg.rot+=0.2; } if(pg.shake>0){ pg.shake-=0.05; if(pg.shake<0) pg.shake=0; } }
  for(var k=0;k<blocks.length;k++){ var b=blocks[k]; if(b.cayendo){ b.x+=b.vx; b.y+=b.vy; b.vy+=G*0.5; b.rot+=b.vrot; if(b.y>groundY+140) b.alpha=Math.max(0,b.alpha-0.02); } }
  for(var m2=particulas.length-1;m2>=0;m2--){ var pt=particulas[m2]; pt.x+=pt.vx; pt.y+=pt.vy; pt.vy+=(pt.g!==undefined?pt.g:0.2); if(pt.humo){ pt.r+=0.5; pt.vx*=0.96; } pt.vida--; if(pt.vida<=0) particulas.splice(m2,1); }
  for(var ex=explosiones.length-1;ex>=0;ex--){ explosiones[ex].t++; if(explosiones[ex].t>explosiones[ex].max) explosiones.splice(ex,1); }
}

/* ============ DIBUJO ============ */
function dibujar(){ ctx.clearRect(0,0,W,H); fondoTema(cfgActual.tema);
  for(var i=0;i<blocks.length;i++){ dibujarBloque(blocks[i]); }
  for(var j=0;j<pigs.length;j++){ dibujarPig(pigs[j]); }
  dibujarResorteraBack(); if(fase==='aim') dibujarTrayectoria(); dibujarRastro(); dibujarPajaro(); dibujarResorteraFront();
  dibujarExplosiones();
  for(var p=0;p<particulas.length;p++){ dibujarParticula(particulas[p]); } }

function fondoTema(tema){
  var c1,c2,s1,s2,borde;
  if(tema==='desierto'){ c1='#bfe3ff';c2='#e9f4ff'; s1='#f2d488';s2='#d6a94e'; borde='#b5863a'; }
  else if(tema==='nieve'){ c1='#dff1ff';c2='#f4fbff'; s1='#ffffff';s2='#dce9f2'; borde='#a9c3d6'; }
  else if(tema==='volcan'){ c1='#5a2b2b';c2='#8a3b3b'; s1='#4a3b3b';s2='#2e2626'; borde='#b5342a'; }
  else if(tema==='playa'){ c1='#8fd0ff';c2='#d6f2ff'; s1='#ffe6a8';s2='#f0c66a'; borde='#c99b3a'; }
  else if(tema==='noche'){ c1='#10163a';c2='#26306a'; s1='#2a2f45';s2='#1a1d2e'; borde='#3a4060'; }
  else { c1='#7ec8ff';c2='#cdeeff'; s1='#7ed957';s2='#4caf50'; borde='#3d8b40'; }
  var g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,c1); g.addColorStop(1,c2); ctx.fillStyle=g; ctx.fillRect(0,0,W,groundY);
  if(tema==='noche'){ ctx.fillStyle='#fff'; for(var i=0;i<estrellasFondo.length;i++){ var e=estrellasFondo[i]; ctx.globalAlpha=0.5+0.5*Math.abs(Math.sin(tAnim*0.03+i)); ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,7); ctx.fill(); } ctx.globalAlpha=1;
    ctx.fillStyle='#f5f3c0'; ctx.beginPath(); ctx.arc(W*0.82,H*0.16,Math.min(W,H)*0.06,0,7); ctx.fill(); }
  else if(tema==='volcan'){ ctx.fillStyle='rgba(255,140,0,.25)'; ctx.fillRect(0,groundY-8,W,8); }
  else { ctx.fillStyle= tema==='desierto'?'#ffdf6b':'#fff3a0'; ctx.beginPath(); ctx.arc(W*0.82,H*0.15,Math.min(W,H)*0.06,0,7); ctx.fill(); }
  if(tema!=='noche' && tema!=='volcan'){ ctx.fillStyle='rgba(255,255,255,.85)'; nube(W*0.35,H*0.16,Math.min(W,H)*0.05); nube(W*0.62,H*0.1,Math.min(W,H)*0.04); }
  var gs=ctx.createLinearGradient(0,groundY,0,H); gs.addColorStop(0,s1); gs.addColorStop(1,s2); ctx.fillStyle=gs; ctx.fillRect(0,groundY,W,H-groundY);
  ctx.fillStyle=borde; ctx.fillRect(0,groundY,W,6);
  if(tema==='pradera'){ decorPasto(); }
  else if(tema==='desierto'){ cactus(W*0.30,groundY); cactus(W*0.44,groundY); }
  else if(tema==='nieve'){ pino(W*0.30,groundY); pino(W*0.42,groundY); }
  else if(tema==='playa'){ ctx.fillStyle='rgba(80,180,255,.5)'; ctx.fillRect(0,groundY+ (H-groundY)*0.5, W, (H-groundY)*0.5); }
}
function nube(x,y,r){ ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.arc(x+r,y+r*0.2,r*0.8,0,7); ctx.arc(x-r,y+r*0.2,r*0.8,0,7); ctx.arc(x+r*0.4,y-r*0.4,r*0.7,0,7); ctx.fill(); }
function decorPasto(){ ctx.strokeStyle='#3d8b40'; ctx.lineWidth=3; for(var i=0;i<W;i+=26){ var h=8+((i*7)%6); ctx.beginPath(); ctx.moveTo(i,groundY+6); ctx.lineTo(i-3,groundY+6-h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i,groundY+6); ctx.lineTo(i+3,groundY+6-h); ctx.stroke(); } }
function cactus(x,g){ var s=Math.min(W,H); ctx.fillStyle='#3fae5a'; ctx.strokeStyle='#2f7d33'; ctx.lineWidth=2;
  roundRect(x-s*0.02,g-s*0.14,s*0.04,s*0.14,6); ctx.fill(); ctx.stroke();
  roundRect(x-s*0.055,g-s*0.10,s*0.03,s*0.06,5); ctx.fill(); ctx.stroke();
  roundRect(x+s*0.025,g-s*0.12,s*0.03,s*0.07,5); ctx.fill(); ctx.stroke(); }
function pino(x,g){ var s=Math.min(W,H); ctx.fillStyle='#2f8f4e'; for(var k=0;k<3;k++){ ctx.beginPath(); var ty=g-s*0.14+k*s*0.045; ctx.moveTo(x,ty); ctx.lineTo(x-s*0.045,ty+s*0.06); ctx.lineTo(x+s*0.045,ty+s*0.06); ctx.closePath(); ctx.fill(); } ctx.fillStyle='#8b5a2b'; ctx.fillRect(x-s*0.012,g-s*0.02,s*0.024,s*0.02); ctx.fillStyle='rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x,g-s*0.13,s*0.012,0,7); ctx.fill(); }

function forkTips(){ var fw=Math.min(W,H)*0.055; return {split:{x:anchor.x,y:anchor.y+Math.min(W,H)*0.07}, lt:{x:anchor.x-fw/2,y:anchor.y}, rt:{x:anchor.x+fw/2,y:anchor.y}}; }
function woodLine(x1,y1,x2,y2,w,color){ ctx.lineCap='round'; ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=w+4; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.strokeStyle=color; ctx.lineWidth=w; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.18)'; ctx.lineWidth=w*0.35; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
function dibujarResorteraBack(){ var f=forkTips(), gw=Math.min(W,H);
  if(fase==='aim') woodLine(f.rt.x,f.rt.y,bird.x,bird.y,gw*0.016,'#3f2a15');
  woodLine(anchor.x,groundY,f.split.x,f.split.y,gw*0.032,'#8b5a2b'); woodLine(f.split.x,f.split.y,f.lt.x,f.lt.y,gw*0.028,'#9c6631'); woodLine(f.split.x,f.split.y,f.rt.x,f.rt.y,gw*0.028,'#9c6631');
  ctx.fillStyle='#7a4a1e'; ctx.beginPath(); ctx.arc(f.lt.x,f.lt.y,gw*0.018,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(f.rt.x,f.rt.y,gw*0.018,0,7); ctx.fill();
  if(fase==='aim'){ ctx.save(); ctx.fillStyle='#4a2f16'; ctx.beginPath(); ctx.ellipse(bird.x-bird.r*0.25,bird.y+bird.r*0.15,bird.r*0.95,bird.r*0.75,0,0,7); ctx.fill(); ctx.restore(); } }
function dibujarResorteraFront(){ if(fase!=='aim') return; var f=forkTips(), gw=Math.min(W,H); woodLine(f.lt.x,f.lt.y,bird.x,bird.y,gw*0.016,'#6b4423'); }

function colorPajaroActual(){ if(pajaroSel==='rojo') return save.colorPajaro; var P=PAJAROS.filter(function(x){return x.id===pajaroSel;})[0]; return P?P.color:'#d62828'; }
function dibujarPajaro(){ var r=bird.r, ang=bird.angle||0; var bob=(fase==='aim')?Math.sin(tAnim*0.06)*2:0; var col=colorPajaroActual();
  ctx.save(); ctx.translate(bird.x,bird.y+bob); ctx.rotate(ang);
  ctx.fillStyle=sombra(col,-40); ctx.beginPath(); ctx.moveTo(-r*0.7,0); ctx.lineTo(-r*1.5,-r*0.45); ctx.lineTo(-r*1.35,0); ctx.lineTo(-r*1.5,r*0.45); ctx.closePath(); ctx.fill();
  var g=ctx.createRadialGradient(-r*0.3,-r*0.3,r*0.2,0,0,r); g.addColorStop(0,sombra(col,40)); g.addColorStop(1,col);
  ctx.fillStyle=g; ctx.strokeStyle=sombra(col,-50); ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,r,0,7); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#ffe0c2'; ctx.beginPath(); ctx.ellipse(r*0.12,r*0.4,r*0.5,r*0.4,0,0,7); ctx.fill();
  var flap=Math.sin(tAnim*0.4)*(fase==='fly'?0.5:0.22); ctx.save(); ctx.rotate(flap); ctx.fillStyle=sombra(col,-25); ctx.strokeStyle=sombra(col,-50); ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(-r*0.1,r*0.15,r*0.5,r*0.28,0.3,0,7); ctx.fill(); ctx.stroke(); ctx.restore();
  ctx.strokeStyle=sombra(col,-50); ctx.lineWidth=r*0.13; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-r*0.1,-r*0.95); ctx.lineTo(-r*0.28,-r*1.4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r*0.18,-r*0.95); ctx.lineTo(r*0.08,-r*1.45); ctx.stroke();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(r*0.18,-r*0.28,r*0.29,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(r*0.6,-r*0.26,r*0.24,0,7); ctx.fill();
  ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(r*0.3,-r*0.28,r*0.12,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(r*0.66,-r*0.26,r*0.11,0,7); ctx.fill();
  ctx.strokeStyle=sombra(col,-60); ctx.lineWidth=r*0.15; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-r*0.12,-r*0.75); ctx.lineTo(r*0.5,-r*0.48); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r*0.82,-r*0.58); ctx.lineTo(r*0.44,-r*0.44); ctx.stroke();
  ctx.fillStyle='#ff9500'; ctx.strokeStyle='#cc6d00'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(r*0.85,-r*0.08); ctx.lineTo(r*1.4,r*0.06); ctx.lineTo(r*0.85,r*0.24); ctx.closePath(); ctx.fill(); ctx.stroke();
  if(dashActivo>0){ ctx.strokeStyle='rgba(255,240,120,.9)'; ctx.lineWidth=r*0.13; ctx.lineCap='round'; for(var L=-1;L<=1;L++){ ctx.beginPath(); ctx.moveTo(-r*1.2, L*r*0.4); ctx.lineTo(-r*2.3-Math.random()*r, L*r*0.4); ctx.stroke(); } }
  if(pajaroSel==='negro' && fase!=='aim' && !bombaUsada){ ctx.shadowBlur=10; ctx.shadowColor='#ff9a3c'; ctx.fillStyle=(tAnim%6<3)?'#ffcf1a':'#ff5a1f'; ctx.beginPath(); ctx.arc(0,-r*1.2, r*0.24*(0.8+Math.random()*0.4),0,7); ctx.fill(); ctx.shadowBlur=0; }
  ctx.restore(); }

function dibujarPig(p){ if(!p.vivo && p.y>H+140) return; var bob=p.vivo?Math.sin(tAnim*0.05+p.bob)*3:0; var r=p.r;
  ctx.save(); ctx.translate(p.x+(p.shake?Math.sin(p.shake*40)*6:0), p.y+bob); ctx.rotate(p.rot);
  if(p.vivo){ ctx.fillStyle='#3f9e43'; ctx.beginPath(); ctx.arc(-r*0.55,-r*0.72,r*0.3,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(r*0.55,-r*0.72,r*0.3,0,7); ctx.fill();
    var g=ctx.createRadialGradient(-r*0.3,-r*0.35,r*0.2,0,0,r); g.addColorStop(0,'#9ee05a'); g.addColorStop(1,'#4caf50'); ctx.fillStyle=g; ctx.strokeStyle='#2f7d33'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,r,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#7bc943'; ctx.strokeStyle='#2f7d33'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.ellipse(0,r*0.3,r*0.5,r*0.38,0,0,7); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#2f7d33'; ctx.beginPath(); ctx.ellipse(-r*0.17,r*0.3,r*0.09,r*0.14,0,0,7); ctx.fill(); ctx.beginPath(); ctx.ellipse(r*0.17,r*0.3,r*0.09,r*0.14,0,0,7); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-r*0.33,-r*0.18,r*0.27,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(r*0.33,-r*0.18,r*0.27,0,7); ctx.fill();
    ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(-r*0.27,-r*0.14,r*0.13,0,7); ctx.fill(); ctx.beginPath(); ctx.arc(r*0.39,-r*0.14,r*0.13,0,7); ctx.fill();
    ctx.strokeStyle='#2f7d33'; ctx.lineWidth=r*0.12; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(-r*0.58,-r*0.52); ctx.lineTo(-r*0.12,-r*0.4); ctx.stroke(); ctx.beginPath(); ctx.moveTo(r*0.58,-r*0.52); ctx.lineTo(r*0.12,-r*0.4); ctx.stroke();
  } else { ctx.font=(r*2)+'px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('💫',0,0); }
  ctx.restore();
  if(p.vivo){ var bw=r*1.8, bh=r*1.25, by=p.y-r*2.0+bob; ctx.strokeStyle='#c98a3c'; ctx.lineWidth=r*0.14; ctx.beginPath(); ctx.moveTo(p.x,by+bh/2); ctx.lineTo(p.x,p.y-r*0.8+bob); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.strokeStyle='#ff9500'; ctx.lineWidth=4; roundRect(p.x-bw/2,by-bh/2,bw,bh,12); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#073b5c'; ctx.font='bold '+(r*1.15)+'px "Comic Sans MS",sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(p.num),p.x,by); } }

function dibujarBloque(b){ if(b.alpha<=0) return; ctx.save(); ctx.globalAlpha=b.alpha; ctx.translate(b.x,b.y); ctx.rotate(b.rot); var horiz=b.w>b.h;
  if(b.type==='tnt'){ var gt=ctx.createLinearGradient(0,-b.h/2,0,b.h/2); gt.addColorStop(0,'#ff6a3c'); gt.addColorStop(1,'#d62828'); ctx.fillStyle=gt; ctx.strokeStyle='#8a1414'; ctx.lineWidth=3; roundRect(-b.w/2,-b.h/2,b.w,b.h,5); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.font='bold '+(b.h*0.55)+'px "Comic Sans MS",sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('TNT',0,0); ctx.restore(); return; }
  if(b.type==='stone'){ var gs=ctx.createLinearGradient(0,-b.h/2,0,b.h/2); gs.addColorStop(0,'#cfd5db'); gs.addColorStop(1,'#8a929c'); ctx.fillStyle=gs; ctx.strokeStyle='#5c636b'; }
  else if(b.type==='ice'){ var gi=ctx.createLinearGradient(0,-b.h/2,0,b.h/2); gi.addColorStop(0,'#dff6ff'); gi.addColorStop(1,'#9fd8f0'); ctx.fillStyle=gi; ctx.strokeStyle='#6fb8d8'; }
  else { var gw=ctx.createLinearGradient(0,-b.h/2,0,b.h/2); gw.addColorStop(0,'#e0a862'); gw.addColorStop(1,'#a86b2e'); ctx.fillStyle=gw; ctx.strokeStyle='#7a4a1e'; }
  ctx.lineWidth=3; roundRect(-b.w/2,-b.h/2,b.w,b.h,6); ctx.fill(); ctx.stroke(); ctx.lineWidth=2;
  if(b.type==='ice'){ ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(-b.w*0.3,-b.h*0.3); ctx.lineTo(b.w*0.1,b.h*0.3); ctx.stroke(); }
  else if(b.type==='stone'){ ctx.strokeStyle='rgba(92,99,107,.55)'; ctx.beginPath(); ctx.moveTo(-b.w/2+4,0); ctx.lineTo(b.w/2-4,0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,-b.h/2+4); ctx.lineTo(0,-2); ctx.stroke(); }
  else { ctx.strokeStyle='rgba(122,74,30,.5)'; if(horiz){ for(var i=1;i<3;i++){ var yy=-b.h/2+b.h*i/3; ctx.beginPath(); ctx.moveTo(-b.w/2+5,yy); ctx.lineTo(b.w/2-5,yy); ctx.stroke(); } } else { for(var j=1;j<3;j++){ var xx=-b.w/2+b.w*j/3; ctx.beginPath(); ctx.moveTo(xx,-b.h/2+5); ctx.lineTo(xx,b.h/2-5); ctx.stroke(); } } }
  ctx.restore(); }

function dibujarTrayectoria(){ if(!aiming) return; var pm=paramsPajaro(pajaroSel); var kk=K*pm.kMul;
  var x=bird.x,y=bird.y, vX=(anchor.x-bird.x)*kk, vY=(anchor.y-bird.y)*kk; var n=0;
  for(var i=0;i<44;i++){ x+=vX*3; y+=vY*3; vY+=G*3; if(y>groundY||x>W||x<0) break; if(i%2!==0) continue; n++;
    var rr=Math.max(3.5, 8.5-n*0.4);
    ctx.beginPath(); ctx.arc(x,y,rr+3,0,7); ctx.fillStyle='rgba(15,15,35,.55)'; ctx.fill();
    ctx.beginPath(); ctx.arc(x,y,rr,0,7); ctx.fillStyle='rgba(255,255,255,.98)'; ctx.fill(); } }

function dibujarParticula(pt){ var a=Math.max(0,pt.vida/pt.vidaMax); ctx.save();
  if(pt.humo){ ctx.globalAlpha=a*0.42; ctx.fillStyle='#8a8a8a'; ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.r,0,7); ctx.fill(); }
  else if(pt.fuego){ ctx.globalAlpha=a; ctx.shadowBlur=12; ctx.shadowColor=pt.color; ctx.fillStyle=pt.color; ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.r*a+1,0,7); ctx.fill(); }
  else { ctx.globalAlpha=a; ctx.fillStyle=pt.color; ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.r,0,7); ctx.fill(); }
  ctx.restore(); }

function dibujarExplosiones(){ for(var i=0;i<explosiones.length;i++){ var ex=explosiones[i]; var p=ex.t/ex.max; var rad=ex.size*(0.35+p*1.15);
  ctx.save();
  ctx.globalAlpha=(1-p); var g=ctx.createRadialGradient(ex.x,ex.y,0,ex.x,ex.y,rad);
  g.addColorStop(0,'#fffde6'); g.addColorStop(0.35,'#ffe14d'); g.addColorStop(0.7,'#ff6a1f'); g.addColorStop(1,'rgba(255,70,20,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ex.x,ex.y,rad,0,7); ctx.fill();
  ctx.globalAlpha=(1-p)*0.7; ctx.strokeStyle='#fff'; ctx.lineWidth=Math.max(1.5,4*(1-p)); ctx.beginPath(); ctx.arc(ex.x,ex.y,ex.size*(0.5+p*1.5),0,7); ctx.stroke();
  ctx.restore(); } }

function dibujarRastro(){ if(fase!=='fly'||rastro.length<2) return; var esAmar=(pajaroSel==='amarillo'); var col=colorPajaroActual();
  for(var i=0;i<rastro.length;i++){ var q=rastro[i]; var a=i/rastro.length; ctx.save(); ctx.globalAlpha=a*(esAmar?0.6:0.38);
    if(esAmar){ ctx.fillStyle=(dashActivo>0?'#fff6b0':'#ffd23f'); ctx.shadowBlur=12; ctx.shadowColor='#ffd23f'; } else ctx.fillStyle=col;
    ctx.beginPath(); ctx.arc(q.x,q.y, bird.r*0.55*a+1,0,7); ctx.fill(); ctx.restore(); } }

/* ============ PUNTERIA + PODERES ============ */
function pointerPos(e){ var rect=cv.getBoundingClientRect(); var t=e.touches?e.touches[0]:e; return {x:t.clientX-rect.left, y:t.clientY-rect.top}; }
function onDown(e){
  if(fase==='fly'){
    var pm=paramsPajaro(pajaroSel);
    if(pm.dash && !dashUsado){ dashUsado=true; dashActivo=12; bird.vx*=1.7; bird.vy*=1.05; sonidoLanzar(); beep(1100,0.12,'square');
      for(var d=0;d<16;d++){ particulas.push({x:bird.x,y:bird.y,vx:-Math.cos(bird.angle)*(Math.random()*7+3)+(Math.random()-0.5)*3,vy:-Math.sin(bird.angle)*(Math.random()*7+3)+(Math.random()-0.5)*3,r:Math.random()*4+2,color:'#ffe14d',vida:14,vidaMax:14,g:0.05,fuego:true}); }
      e.preventDefault(); return; }
    if(pm.bomba && !bombaUsada){ bombaUsada=true; estallar(bird.x,bird.y, Math.min(W,H)*0.16, true); e.preventDefault(); return; }
    return;
  }
  if(fase!=='aim') return; var p=pointerPos(e); var dx=p.x-bird.x, dy=p.y-bird.y;
  if(Math.sqrt(dx*dx+dy*dy) < bird.r*3.5){ aiming=true; initAudio(); e.preventDefault(); } }
function onMove(e){ if(!aiming) return; var p=pointerPos(e); var dx=p.x-anchor.x, dy=p.y-anchor.y; var d=Math.sqrt(dx*dx+dy*dy);
  if(d>MAXPULL){ dx=dx/d*MAXPULL; dy=dy/d*MAXPULL; } if(dx>0) dx=0; bird.x=anchor.x+dx; bird.y=anchor.y+dy;
  var limY=groundY-bird.r*0.8; if(bird.y>limY) bird.y=limY; e.preventDefault(); }
function onUp(e){ if(!aiming) return; aiming=false; var dx=anchor.x-bird.x, dy=anchor.y-bird.y; if(Math.sqrt(dx*dx+dy*dy)<10){ bird.x=anchor.x; bird.y=anchor.y; return; }
  var pm=paramsPajaro(pajaroSel); bird.vx=dx*K*pm.kMul; bird.vy=dy*K*pm.kMul; fase='fly'; sonidoLanzar(); e.preventDefault(); }
function bindPointer(){ var c=document.getElementById('lienzo'); c.addEventListener('mousedown',onDown); window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp);
  c.addEventListener('touchstart',onDown,{passive:false}); window.addEventListener('touchmove',onMove,{passive:false}); window.addEventListener('touchend',onUp); }
bindPointer();
