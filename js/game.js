/* ============================================================
   GAME — Phaser 3 (Canvas) + Matter.js — Pájaros Matemáticos
============================================================ */

/* ---- Estado global ---- */
var GS={
  modo:'aventura', vidas:3, racha:0, rachaNivelIdx:0, rachaRecord:false,
  rondaActual:0, primerIntento:0, rondaFallada:false,
  retoMundo:0, retoIdx:0, pajaroSel:'rojo',
  estado:{a:0,b:0,op:'+',tipo:'suma',resultado:0},
  cfg:{maxRes:10,pisosMax:1,mats:['wood'],tnt:0,tema:'pradera',modoOp:'mixto'}
};
var phaserGame=null;

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
  GS.cfg={maxRes:mu.maxRes, pisosMax:mu.pisosMax, mats:mu.mats, tnt:mu.tnt, tema:mu.tema, modoOp:'mixto'};
  lanzarJuego();
}
function iniciarRacha(){
  GS.modo='racha'; GS.racha=0; GS.rachaNivelIdx=0; GS.rachaRecord=false; GS.vidas=3;
  var niv=RACHA_NIVELES[0];
  GS.cfg={maxRes:niv.maxRes, pisosMax:niv.pisosMax, mats:niv.mats, tnt:niv.tnt, tema:niv.tema, modoOp:niv.modoOp};
  lanzarJuego();
}

function lanzarJuego(){
  generarOperacion();
  // IMPORTANTE: mostrar el div ANTES de crear Phaser para que tenga dimensiones
  mostrar('juego');
  if(phaserGame){
    phaserGame.scene.getScene('Game').scene.restart();
  } else {
    // Esperar un frame para que el div tenga dimensiones reales
    requestAnimationFrame(function(){
      phaserGame=new Phaser.Game({
        type:Phaser.CANVAS,
        parent:'game-container',
        width:window.innerWidth,
        height:window.innerHeight,
        backgroundColor:'#87ceeb',
        scale:{mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH},
        physics:{default:'matter', matter:{gravity:{y:1.2}, enableSleeping:true, debug:false}},
        scene:[GameScene]
      });
    });
  }
}
function salirJuego(){
  if(phaserGame){ phaserGame.scene.getScene('Game').scene.pause(); }
  refrescarChips();
  if(GS.modo==='aventura'){ renderMapa(); mostrar('sMapa'); } else mostrar('sMenu');
}

/* ============================================================
   PHASER GAME SCENE
============================================================ */
var GameScene=new Phaser.Class({
  Extends:Phaser.Scene,
  initialize:function(){ Phaser.Scene.call(this,{key:'Game'}); },

  create:function(){
    this.w=this.scale.width; this.h=this.scale.height;
    this.groundY=this.h*0.82;
    this.anchorX=this.w*0.15;
    this.anchorY=this.groundY-Math.min(this.w,this.h)*0.28;
    this.maxPull=Math.min(this.w,this.h)*0.30;
    this.launchMul=0.008;
    this.gravSim=0.35; // para preview de trayectoria
    this.isDragging=false; this.launched=false; this.resolved=false; this.powerUsed=false;
    this.blockBodies=[]; this.pigBodies=[];

    this.drawBackground();
    this.createGround();
    this.gfxSling=this.add.graphics().setDepth(8);
    this.gfxTrajectory=this.add.graphics().setDepth(7);
    this.buildForts();
    this.createBird();
    this.setupInput();
    this.setupCollisions();
    this.updateHUD();
    this.drawSlingshot();

    var self=this;
    this.scale.on('resize',function(sz){ self.w=sz.width; self.h=sz.height; });
    initAudio();
    hablar('¿Cuánto es '+GS.estado.a+(GS.estado.tipo==='suma'?' más ':' menos ')+GS.estado.b+'?');
  },

  /* ==================== BACKGROUND ==================== */
  drawBackground:function(){
    var tema=TEMAS[GS.cfg.tema]||TEMAS.pradera;
    // Cielo
    this.add.rectangle(this.w/2, this.groundY/2, this.w*3, this.groundY*2, tema.sky).setDepth(-10);
    // Sol/luna
    if(GS.cfg.tema==='noche'){
      this.add.circle(this.w*0.82, this.h*0.15, Math.min(this.w,this.h)*0.04, 0xf5f3c0).setDepth(-9);
    } else {
      this.add.circle(this.w*0.82, this.h*0.15, Math.min(this.w,this.h)*0.045, 0xfff3a0).setDepth(-9);
    }
    // Nubes
    if(GS.cfg.tema!=='noche'&&GS.cfg.tema!=='volcan'){
      var cg=this.add.graphics().setDepth(-8);
      cg.fillStyle(0xffffff,0.8);
      this.drawCloud(cg,this.w*0.3,this.h*0.14,Math.min(this.w,this.h)*0.035);
      this.drawCloud(cg,this.w*0.6,this.h*0.09,Math.min(this.w,this.h)*0.028);
    }
    // Suelo
    this.add.rectangle(this.w/2, this.groundY+(this.h-this.groundY)/2, this.w*3, (this.h-this.groundY)*2, tema.ground).setDepth(-5);
    this.add.rectangle(this.w/2, this.groundY+2, this.w*3, 5, tema.border).setDepth(-4);
    // Pasto
    if(GS.cfg.tema==='pradera'){
      var pg=this.add.graphics().setDepth(-3);
      pg.lineStyle(2,0x3d8b40,1);
      for(var i=0;i<this.w;i+=22){
        var gh=6+((i*7)%5);
        pg.lineBetween(i,this.groundY+5,i-2,this.groundY+5-gh);
        pg.lineBetween(i,this.groundY+5,i+2,this.groundY+5-gh);
      }
    }
  },
  drawCloud:function(g,x,y,r){
    g.fillCircle(x,y,r); g.fillCircle(x+r*0.9,y+r*0.15,r*0.75);
    g.fillCircle(x-r*0.9,y+r*0.15,r*0.75); g.fillCircle(x+r*0.35,y-r*0.35,r*0.65);
  },

  /* ==================== GROUND ==================== */
  createGround:function(){
    this.matter.add.rectangle(this.w/2, this.groundY+250, this.w*4, 500, {isStatic:true, label:'ground', friction:1, restitution:0.05});
    this.matter.add.rectangle(-100, this.h/2, 200, this.h*3, {isStatic:true, label:'wall'});
    this.matter.add.rectangle(this.w+100, this.h/2, 200, this.h*3, {isStatic:true, label:'wall'});
  },

  /* ==================== BIRD (detallado) ==================== */
  createBird:function(){
    this.birdR=Math.min(this.w,this.h)*0.028;
    if(GS.pajaroSel==='azul') this.birdR*=1.4;
    this.birdGfx=this.add.graphics().setDepth(10);
    this.birdX=this.anchorX; this.birdY=this.anchorY;
    this.drawBird(this.birdX,this.birdY,0);

    var density=GS.pajaroSel==='azul'?0.008:0.004;
    this.birdBody=this.matter.add.circle(this.anchorX, this.anchorY, this.birdR, {
      isStatic:true, label:'bird', restitution:0.3, friction:0.5, density:density, circleRadius:this.birdR
    });
  },
  drawBird:function(x,y,angle){
    var g=this.birdGfx; g.clear();
    var r=this.birdR;
    var col=this.getBirdColor();
    var colDark=Phaser.Display.Color.IntegerToColor(col).darken(30).color;
    var colLight=Phaser.Display.Color.IntegerToColor(col).lighten(20).color;
    // Cola
    g.fillStyle(colDark,1);
    g.fillTriangle(x-r*0.7,y, x-r*1.5,y-r*0.45, x-r*1.35,y);
    g.fillTriangle(x-r*0.7,y, x-r*1.35,y, x-r*1.5,y+r*0.45);
    // Cuerpo
    g.fillStyle(col,1); g.fillCircle(x,y,r);
    // Highlight
    g.fillStyle(colLight,0.4); g.fillCircle(x-r*0.25,y-r*0.25,r*0.45);
    // Contorno
    g.lineStyle(2,colDark,0.6); g.strokeCircle(x,y,r);
    // Panza
    g.fillStyle(0xffe0c2,1); g.fillEllipse(x+r*0.1,y+r*0.35,r*0.9,r*0.65);
    // Cresta
    g.lineStyle(r*0.12,colDark,1);
    g.lineBetween(x-r*0.1,y-r*0.85, x-r*0.25,y-r*1.35);
    g.lineBetween(x+r*0.15,y-r*0.85, x+r*0.06,y-r*1.4);
    // Ojos
    g.fillStyle(0xffffff,1); g.fillCircle(x+r*0.18,y-r*0.25,r*0.27);
    g.fillCircle(x+r*0.55,y-r*0.22,r*0.22);
    g.fillStyle(0x222222,1); g.fillCircle(x+r*0.28,y-r*0.25,r*0.11);
    g.fillCircle(x+r*0.6,y-r*0.22,r*0.09);
    // Cejas
    g.lineStyle(r*0.13,colDark,1);
    g.lineBetween(x-r*0.1,y-r*0.7, x+r*0.45,y-r*0.45);
    g.lineBetween(x+r*0.75,y-r*0.55, x+r*0.4,y-r*0.42);
    // Pico
    g.fillStyle(0xff9500,1);
    g.fillTriangle(x+r*0.8,y-r*0.06, x+r*1.35,y+r*0.06, x+r*0.8,y+r*0.22);
    g.lineStyle(1.5,0xcc6d00,1);
    g.lineBetween(x+r*0.8,y-r*0.06, x+r*1.35,y+r*0.06);
    g.lineBetween(x+r*1.35,y+r*0.06, x+r*0.8,y+r*0.22);
    // Bomba: mecha
    if(GS.pajaroSel==='negro'&&this.launched&&!this.powerUsed){
      g.fillStyle(0xffcf1a,0.9); g.fillCircle(x,y-r*1.2,r*0.22);
      g.fillStyle(0xff5a1f,0.7); g.fillCircle(x,y-r*1.2,r*0.14);
    }
  },
  getBirdColor:function(){
    if(GS.pajaroSel==='rojo'){
      var hex=save.colorPajaro||'#d62828';
      return parseInt(hex.replace('#',''),16);
    }
    for(var i=0;i<PAJAROS.length;i++){ if(PAJAROS[i].id===GS.pajaroSel) return PAJAROS[i].color; }
    return 0xd62828;
  },

  /* ==================== FORTS ==================== */
  buildForts:function(){
    var opciones=generarOpciones();
    var xs=[this.w*0.55, this.w*0.73, this.w*0.90];
    for(var i=0;i<3;i++){
      var pigY=this.buildSingleFort(xs[i]);
      this.createPig(xs[i], pigY, opciones[i], opciones[i]===GS.estado.resultado);
    }
  },
  buildSingleFort:function(px){
    var unit=Math.min(this.w,this.h)*0.038;
    var comp=rnd(1,GS.cfg.pisosMax);
    var wallW=unit*0.55, wallH=unit*1.1, beamW=unit*2.8, beamH=unit*0.45;
    var mats=GS.cfg.mats;
    var baseY=this.groundY;

    // Piso
    this.addBlock(px, baseY-beamH/2, beamW, beamH, mats[0%mats.length]);
    var floorTop=baseY-beamH;

    for(var n=0;n<comp;n++){
      var y=floorTop-n*(wallH+beamH);
      this.addBlock(px-unit*1.1, y-wallH/2, wallW, wallH, mats[(n+1)%mats.length]);
      this.addBlock(px+unit*1.1, y-wallH/2, wallW, wallH, mats[(n+2)%mats.length]);
      this.addBlock(px, y-wallH-beamH/2, beamW, beamH, mats[n%mats.length]);
    }
    if(GS.cfg.tnt>0&&Math.random()<GS.cfg.tnt+0.2){
      this.addBlock(px, floorTop-unit*0.4, unit*0.7, unit*0.7, 'tnt');
    }
    return floorTop-unit*0.5;
  },
  addBlock:function(x,y,w,h,mat){
    var col=MAT_COLORS[mat]||MAT_COLORS.wood;
    var density=mat==='stone'?0.007:mat==='ice'?0.002:0.004;

    var body=this.matter.add.rectangle(x,y,w,h,{
      isStatic:true, label:'block_'+mat, friction:0.9, restitution:0.05, density:density, chamfer:{radius:2}
    });
    body.gameData={mat:mat, w:w, h:h};

    var gfx=this.add.graphics().setDepth(1);
    // Bloque con detalle
    gfx.fillStyle(col.fill,1); gfx.fillRoundedRect(-w/2,-h/2,w,h,3);
    // Highlight
    gfx.fillStyle(0xffffff,0.15); gfx.fillRoundedRect(-w/2,-h/2,w,h*0.4,3);
    // Borde
    gfx.lineStyle(2,col.stroke,1); gfx.strokeRoundedRect(-w/2,-h/2,w,h,3);
    // Detalles por material
    if(mat==='wood'){
      gfx.lineStyle(1,col.stroke,0.4);
      if(w>h){ for(var i=1;i<3;i++) gfx.lineBetween(-w/2+4,-h/2+h*i/3,w/2-4,-h/2+h*i/3); }
      else{ for(var j=1;j<3;j++) gfx.lineBetween(-w/2+w*j/3,-h/2+4,-w/2+w*j/3,h/2-4); }
    } else if(mat==='stone'){
      gfx.lineStyle(1,col.stroke,0.4);
      gfx.lineBetween(-w/2+3,0,w/2-3,0);
      gfx.lineBetween(0,-h/2+3,0,-2);
    } else if(mat==='ice'){
      gfx.lineStyle(1.5,0xffffff,0.5);
      gfx.lineBetween(-w*0.3,-h*0.3,w*0.1,h*0.3);
    }
    gfx.setPosition(x,y);
    body.gameData.gfx=gfx;

    if(mat==='tnt'){
      var txt=this.add.text(x,y,'TNT',{fontSize:Math.floor(h*0.4)+'px',fontFamily:'Comic Sans MS',color:'#fff',fontStyle:'bold'}).setOrigin(0.5).setDepth(2);
      body.gameData.txt=txt;
    }
    this.blockBodies.push(body);
  },

  /* ==================== PIG (detallado) ==================== */
  createPig:function(x,y,num,correcto){
    var r=Math.min(this.w,this.h)*0.025;
    var body=this.matter.add.circle(x,y,r,{
      isStatic:true, label:'pig', friction:0.8, restitution:0.1, density:0.003
    });
    body.gameData={num:num, correcto:correcto, r:r, vivo:true};

    var gfx=this.add.graphics().setDepth(3);
    this.drawPigSprite(gfx,0,0,r);
    gfx.setPosition(x,y);

    // Cartel con numero
    var bw=r*1.8, bh=r*1.3, by=-r*2.2;
    var bg=this.add.graphics().setDepth(4);
    bg.fillStyle(0xffffff,0.95); bg.fillRoundedRect(-bw/2,by-bh/2,bw,bh,8);
    bg.lineStyle(3,0xff9500,1); bg.strokeRoundedRect(-bw/2,by-bh/2,bw,bh,8);
    // Palito del cartel
    bg.lineStyle(r*0.12,0xc98a3c,1); bg.lineBetween(0,by+bh/2,0,-r*0.8);
    bg.setPosition(x,y);

    var txt=this.add.text(x,y+by,String(num),{
      fontSize:Math.floor(r*1.1)+'px', fontFamily:'Comic Sans MS', color:'#073b5c', fontStyle:'bold'
    }).setOrigin(0.5).setDepth(5);

    body.gameData.gfx=gfx; body.gameData.bgGfx=bg; body.gameData.txt=txt;
    this.pigBodies.push(body);
  },
  drawPigSprite:function(g,cx,cy,r){
    // Orejas
    g.fillStyle(0x3f9e43,1);
    g.fillCircle(cx-r*0.55,cy-r*0.7,r*0.28);
    g.fillCircle(cx+r*0.55,cy-r*0.7,r*0.28);
    // Cuerpo
    g.fillStyle(0x4caf50,1); g.fillCircle(cx,cy,r);
    g.fillStyle(0x9ee05a,0.3); g.fillCircle(cx-r*0.3,cy-r*0.3,r*0.5);
    g.lineStyle(2,0x2f7d33,1); g.strokeCircle(cx,cy,r);
    // Hocico
    g.fillStyle(0x7bc943,1); g.fillEllipse(cx,cy+r*0.28,r*0.5,r*0.38);
    g.lineStyle(1.5,0x2f7d33,1); g.strokeEllipse(cx,cy+r*0.28,r*0.5,r*0.38);
    // Fosas nasales
    g.fillStyle(0x2f7d33,1);
    g.fillEllipse(cx-r*0.15,cy+r*0.28,r*0.08,r*0.12);
    g.fillEllipse(cx+r*0.15,cy+r*0.28,r*0.08,r*0.12);
    // Ojos
    g.fillStyle(0xffffff,1);
    g.fillCircle(cx-r*0.3,cy-r*0.15,r*0.25);
    g.fillCircle(cx+r*0.3,cy-r*0.15,r*0.25);
    g.fillStyle(0x222222,1);
    g.fillCircle(cx-r*0.24,cy-r*0.12,r*0.12);
    g.fillCircle(cx+r*0.36,cy-r*0.12,r*0.12);
    // Cejas
    g.lineStyle(r*0.1,0x2f7d33,1);
    g.lineBetween(cx-r*0.55,cy-r*0.5, cx-r*0.1,cy-r*0.38);
    g.lineBetween(cx+r*0.55,cy-r*0.5, cx+r*0.1,cy-r*0.38);
  },

  /* ==================== INPUT ==================== */
  setupInput:function(){
    var self=this;
    this.input.on('pointerdown',function(ptr){
      if(self.launched&&!self.powerUsed&&!self.resolved){ self.usePower(); return; }
      if(self.resolved||self.launched) return;
      var dx=ptr.x-self.birdX, dy=ptr.y-self.birdY;
      if(Math.sqrt(dx*dx+dy*dy)<self.birdR*5){
        self.isDragging=true;
      }
    });
    this.input.on('pointermove',function(ptr){
      if(!self.isDragging) return;
      var dx=ptr.x-self.anchorX, dy=ptr.y-self.anchorY;
      var d=Math.sqrt(dx*dx+dy*dy);
      if(d>self.maxPull){dx=dx/d*self.maxPull;dy=dy/d*self.maxPull;}
      if(dx>0) dx=0;
      var ny=self.anchorY+dy;
      if(ny>self.groundY-self.birdR) ny=self.groundY-self.birdR;
      self.birdX=self.anchorX+dx; self.birdY=ny;
      Phaser.Physics.Matter.Matter.Body.setPosition(self.birdBody,{x:self.birdX,y:self.birdY});
      self.drawBird(self.birdX,self.birdY,0);
      self.drawSlingshot();
      self.drawTrajectory();
    });
    this.input.on('pointerup',function(){
      if(!self.isDragging) return;
      self.isDragging=false;
      self.gfxTrajectory.clear();
      var dx=self.anchorX-self.birdX, dy=self.anchorY-self.birdY;
      if(Math.sqrt(dx*dx+dy*dy)<12){
        self.birdX=self.anchorX; self.birdY=self.anchorY;
        Phaser.Physics.Matter.Matter.Body.setPosition(self.birdBody,{x:self.anchorX,y:self.anchorY});
        self.drawBird(self.anchorX,self.anchorY,0);
        self.drawSlingshot();
        return;
      }
      self.launchBird(dx,dy);
    });
  },

  launchBird:function(dx,dy){
    this.launched=true; this.powerUsed=false;
    var mul=this.launchMul;
    if(GS.pajaroSel==='amarillo') mul*=1.15;
    Phaser.Physics.Matter.Matter.Body.setStatic(this.birdBody,false);
    Phaser.Physics.Matter.Matter.Body.setVelocity(this.birdBody,{x:dx*mul, y:dy*mul});
    this.drawSlingshot();
    sonidoLanzar();
  },

  usePower:function(){
    if(this.powerUsed||this.resolved) return;
    var b=this.birdBody;
    if(GS.pajaroSel==='amarillo'){
      this.powerUsed=true;
      var v=b.velocity;
      Phaser.Physics.Matter.Matter.Body.setVelocity(b,{x:v.x*1.8,y:v.y*0.9});
      sonidoLanzar(); beep(1100,0.12,'square');
    } else if(GS.pajaroSel==='negro'){
      this.powerUsed=true;
      this.triggerExplosion(b.position.x, b.position.y, Math.min(this.w,this.h)*0.15);
    }
  },

  /* ==================== TRAJECTORY ==================== */
  drawTrajectory:function(){
    var g=this.gfxTrajectory; g.clear();
    if(!this.isDragging) return;
    var dx=this.anchorX-this.birdX, dy=this.anchorY-this.birdY;
    var mul=this.launchMul;
    if(GS.pajaroSel==='amarillo') mul*=1.15;
    var vx=dx*mul, vy=dy*mul;
    var px=this.birdX, py=this.birdY;
    for(var i=0;i<50;i++){
      px+=vx; py+=vy; vy+=this.gravSim;
      if(py>this.groundY||px>this.w||px<0) break;
      if(i%2===0){
        var alpha=Math.max(0.15,1-i/40);
        var rr=Math.max(2,6-i*0.1);
        g.fillStyle(0x000000,alpha*0.4); g.fillCircle(px,py,rr+1.5);
        g.fillStyle(0xffffff,alpha*0.95); g.fillCircle(px,py,rr);
      }
    }
  },

  /* ==================== SLINGSHOT ==================== */
  drawSlingshot:function(){
    var g=this.gfxSling; g.clear();
    var ax=this.anchorX, ay=this.anchorY;
    var sz=Math.min(this.w,this.h);
    var fw=sz*0.022;
    var ltx=ax-fw, lty=ay, rtx=ax+fw, rty=ay;
    var splitY=ay+sz*0.06;
    // Goma trasera (detras del pajaro)
    if(!this.launched){
      g.lineStyle(sz*0.012,0x3f2a15,1);
      g.lineBetween(rtx,rty,this.birdX,this.birdY);
    }
    // Base
    g.lineStyle(sz*0.025,0x8b5a2b,1); g.lineBetween(ax,this.groundY,ax,splitY);
    // Highlight base
    g.lineStyle(sz*0.008,0xb8884a,0.4); g.lineBetween(ax-sz*0.004,this.groundY,ax-sz*0.004,splitY);
    // Horquillas
    g.lineStyle(sz*0.018,0x9c6631,1);
    g.lineBetween(ax,splitY,ltx,lty);
    g.lineBetween(ax,splitY,rtx,rty);
    // Puntas
    g.fillStyle(0x7a4a1e,1);
    g.fillCircle(ltx,lty,sz*0.012); g.fillCircle(rtx,rty,sz*0.012);
    // Goma delantera
    if(!this.launched){
      g.lineStyle(sz*0.012,0x6b4423,1);
      g.lineBetween(ltx,lty,this.birdX,this.birdY);
    }
  },

  /* ==================== COLLISIONS ==================== */
  setupCollisions:function(){
    var self=this;
    this.matter.world.on('collisionstart',function(event){
      if(self.resolved) return;
      for(var i=0;i<event.pairs.length;i++){
        var a=event.pairs[i].bodyA, b=event.pairs[i].bodyB;
        self.handleCollision(a,b);
      }
    });
  },
  handleCollision:function(a,b){
    var bird=null, other=null;
    if(a.label==='bird'){bird=a;other=b;}
    else if(b.label==='bird'){bird=b;other=a;}
    if(!bird||!this.launched) return;

    if(other.label==='pig'&&other.gameData&&other.gameData.vivo){
      this.onHitPig(other); return;
    }
    if(other.label&&other.label.indexOf('block_')===0){
      this.wakeBlocks(bird.position.x,bird.position.y);
      if(other.gameData&&other.gameData.mat==='tnt'){
        this.triggerExplosion(other.position.x,other.position.y,Math.min(this.w,this.h)*0.14);
      }
    }
    if(other.label==='ground'&&!this.resolved){
      this.onMiss();
    }
  },
  wakeBlocks:function(x,y){
    var radius=Math.min(this.w,this.h)*0.18;
    for(var i=0;i<this.blockBodies.length;i++){
      var bl=this.blockBodies[i]; if(!bl.isStatic) continue;
      var dx=bl.position.x-x, dy=bl.position.y-y;
      if(Math.sqrt(dx*dx+dy*dy)<radius){
        Phaser.Physics.Matter.Matter.Body.setStatic(bl,false);
        Phaser.Physics.Matter.Matter.Sleeping.set(bl,false);
      }
    }
  },
  triggerExplosion:function(x,y,radius){
    sonidoBoom();
    // Visual
    var c1=this.add.circle(x,y,5,0xffe14d,0.9).setDepth(20);
    this.tweens.add({targets:c1,scaleX:radius/5,scaleY:radius/5,alpha:0,duration:350,onComplete:function(){c1.destroy();}});
    var c2=this.add.circle(x,y,3,0xff5a1f,0.6).setDepth(19);
    this.tweens.add({targets:c2,scaleX:radius/3,scaleY:radius/3,alpha:0,duration:500,onComplete:function(){c2.destroy();}});
    // Fisicas
    var self=this;
    for(var j=0;j<this.blockBodies.length;j++){
      var bl=this.blockBodies[j];
      var dx=bl.position.x-x, dy=bl.position.y-y, d=Math.sqrt(dx*dx+dy*dy);
      if(d<radius*1.5){
        Phaser.Physics.Matter.Matter.Body.setStatic(bl,false);
        Phaser.Physics.Matter.Matter.Sleeping.set(bl,false);
        var force=(1-d/(radius*1.5))*0.06;
        Phaser.Physics.Matter.Matter.Body.applyForce(bl,bl.position,{x:(dx/d||0)*force,y:(dy/d||0)*force-force*0.5});
        if(bl.gameData&&bl.gameData.mat==='tnt'&&d<radius){
          (function(bx,by){ setTimeout(function(){ if(!self.resolved) self.triggerExplosion(bx,by,Math.min(self.w,self.h)*0.12); },200); })(bl.position.x,bl.position.y);
          bl.gameData.mat='used';
        }
      }
    }
    for(var k=0;k<this.pigBodies.length;k++){
      var pig=this.pigBodies[k]; if(!pig.gameData||!pig.gameData.vivo) continue;
      var dpx=pig.position.x-x, dpy=pig.position.y-y;
      if(Math.sqrt(dpx*dpx+dpy*dpy)<radius+pig.gameData.r){
        this.onHitPig(pig); return;
      }
    }
    if(!save.tntUsado){save.tntUsado=true;guardar();toast('¡Explotaste un TNT!');revisarLogros();}
  },

  /* ==================== HIT PIG ==================== */
  onHitPig:function(pigBody){
    if(this.resolved) return;
    this.resolved=true;
    if(pigBody.gameData.correcto){
      this.winRound(pigBody);
    } else {
      pigBody.gameData.vivo=false;
      if(pigBody.gameData.gfx){
        this.tweens.add({targets:pigBody.gameData.gfx,x:'+=4',yoyo:true,repeat:4,duration:40});
      }
      this.loseLife();
    }
  },
  onMiss:function(){
    if(this.resolved) return;
    this.resolved=true;
    var self=this;
    this.time.delayedCall(700,function(){ self.resetBird(); });
  },

  /* ==================== WIN / LOSE ==================== */
  winRound:function(pigBody){
    pigBody.gameData.vivo=false;
    Phaser.Physics.Matter.Matter.Body.setStatic(pigBody,false);
    Phaser.Physics.Matter.Matter.Body.setVelocity(pigBody,{x:rnd(3,8),y:rnd(-12,-6)});
    this.wakeBlocks(pigBody.position.x,pigBody.position.y);
    sonidoVictoria(); lanzarConfeti();
    save.aciertosTotales++;
    if(!GS.rondaFallada&&GS.modo==='aventura') GS.primerIntento++;
    var elogios=['¡Muy bien','¡Excelente','¡Campeón','¡Genial','¡Súper'];
    hablarAcierto(elogios[rnd(0,elogios.length-1)]+', '+(save.nombre||'Alejo')+'! '+GS.estado.a+(GS.estado.tipo==='suma'?' más ':' menos ')+GS.estado.b+' es '+GS.estado.resultado);
    if(GS.modo==='racha'){
      GS.racha++;
      if(GS.racha>save.rachaMax){save.rachaMax=GS.racha;guardar();
        if(!GS.rachaRecord){GS.rachaRecord=true;toast('Nuevo record: '+GS.racha+'!');sonidoTrofeo();lanzarConfeti();}
      }
    }
    guardar();revisarLogros();refrescarChips();this.updateHUD();
    var self=this;
    this.time.delayedCall(1800,function(){ self.nextRound(); });
  },

  loseLife:function(){
    GS.vidas--; GS.rondaFallada=true;
    sonidoMal(); this.updateHUD();
    if(GS.modo==='racha'){GS.racha=0;GS.rachaNivelIdx=0;
      var niv=RACHA_NIVELES[0];
      GS.cfg={maxRes:niv.maxRes,pisosMax:niv.pisosMax,mats:niv.mats,tnt:niv.tnt,tema:niv.tema,modoOp:niv.modoOp};
    }
    if(GS.vidas<=0){
      this.gameOver();
    } else {
      hablar('¡Ese no! Era '+GS.estado.resultado+'. Te quedan '+GS.vidas+' vidas');
      var self=this;
      this.time.delayedCall(900,function(){ self.resetBird(); });
    }
  },

  resetBird:function(){
    this.launched=false; this.resolved=false; this.powerUsed=false;
    Phaser.Physics.Matter.Matter.Body.setStatic(this.birdBody,true);
    Phaser.Physics.Matter.Matter.Body.setVelocity(this.birdBody,{x:0,y:0});
    Phaser.Physics.Matter.Matter.Body.setAngularVelocity(this.birdBody,0);
    Phaser.Physics.Matter.Matter.Body.setPosition(this.birdBody,{x:this.anchorX,y:this.anchorY});
    this.birdX=this.anchorX; this.birdY=this.anchorY;
    this.drawBird(this.anchorX,this.anchorY,0);
    this.drawSlingshot();
  },

  nextRound:function(){
    if(GS.modo==='aventura'){
      GS.rondaActual++; GS.rondaFallada=false;
      if(GS.rondaActual>=RONDAS_POR_RETO){this.finReto();return;}
    } else {
      var ni=0;
      for(var i=RACHA_NIVELES.length-1;i>=0;i--){if(GS.racha>=RACHA_NIVELES[i].desde){ni=i;break;}}
      if(ni!==GS.rachaNivelIdx){
        GS.rachaNivelIdx=ni; var niv=RACHA_NIVELES[ni];
        GS.cfg={maxRes:niv.maxRes,pisosMax:niv.pisosMax,mats:niv.mats,tnt:niv.tnt,tema:niv.tema,modoOp:niv.modoOp};
        toast('Nivel: '+niv.nombre+'!');
      }
    }
    generarOperacion();
    this.scene.restart();
  },

  /* ---- Fin reto aventura ---- */
  finReto:function(){
    var p=GS.primerIntento;
    var trofeo=p>=5?'copa':p>=4?'oro':p>=3?'plata':'bronce';
    var estrellas=p>=5?3:p>=3?2:1;
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
  },

  gameOver:function(){
    document.getElementById('goTitulo').textContent='¡Se acabaron las vidas!';
    document.getElementById('goRacha').textContent=GS.modo==='racha'?GS.racha:GS.primerIntento+'/'+RONDAS_POR_RETO;
    document.getElementById('goMejor').textContent=save.rachaMax;
    document.getElementById('goNivel').textContent=GS.modo==='racha'?RACHA_NIVELES[GS.rachaNivelIdx].nombre:'Reto '+(GS.retoIdx+1);
    document.getElementById('btnGoReintentar').onclick=function(){
      document.getElementById('cartelGameOver').classList.remove('active');
      if(GS.modo==='racha')iniciarRacha();else iniciarReto(GS.retoMundo,GS.retoIdx);
    };
    document.getElementById('btnGoSalir').onclick=function(){
      document.getElementById('cartelGameOver').classList.remove('active');salirJuego();
    };
    document.getElementById('cartelGameOver').classList.add('active');
    hablar('Se acabaron las vidas');
  },

  /* ==================== HUD ==================== */
  updateHUD:function(){
    var el=document.getElementById('hudVidas');
    if(el){var h='';for(var i=0;i<3;i++)h+=(i<GS.vidas?'<span class="racha-vida">&#x2764;</span>':'<span class="racha-vida muerta">&#x2764;</span>');el.innerHTML=h;}
    var prob=document.getElementById('problema');
    if(prob) prob.textContent=GS.estado.a+' '+GS.estado.op+' '+GS.estado.b+' = ?';
    var chip=document.getElementById('chipRonda');
    if(chip){if(GS.modo==='aventura'){chip.style.display='';chip.textContent='Ronda '+(GS.rondaActual+1)+'/'+RONDAS_POR_RETO;}else chip.style.display='none';}
    var est=document.getElementById('chipEstrellas');
    if(est){
      if(GS.modo==='racha'){est.innerHTML='<i data-lucide="flame" style="width:16px;height:16px"></i> '+GS.racha;est.style.display='';}
      else{est.innerHTML='<i data-lucide="star" style="width:16px;height:16px"></i> '+GS.primerIntento;est.style.display='';}
      try{lucide.createIcons();}catch(e){}
    }
  },

  /* ==================== UPDATE LOOP ==================== */
  update:function(){
    if(!this.launched||this.resolved) return;
    var pos=this.birdBody.position;
    this.birdX=pos.x; this.birdY=pos.y;
    this.drawBird(pos.x,pos.y,this.birdBody.angle);
    // Bloques
    for(var i=0;i<this.blockBodies.length;i++){
      var bl=this.blockBodies[i]; if(!bl.gameData||!bl.gameData.gfx) continue;
      bl.gameData.gfx.setPosition(bl.position.x,bl.position.y).setRotation(bl.angle);
      if(bl.gameData.txt) bl.gameData.txt.setPosition(bl.position.x,bl.position.y).setRotation(bl.angle);
    }
    // Cerdos
    for(var j=0;j<this.pigBodies.length;j++){
      var pg=this.pigBodies[j]; if(!pg.gameData) continue;
      pg.gameData.gfx.setPosition(pg.position.x,pg.position.y).setRotation(pg.angle);
      if(pg.gameData.bgGfx) pg.gameData.bgGfx.setPosition(pg.position.x,pg.position.y);
      if(pg.gameData.txt) pg.gameData.txt.setPosition(pg.position.x,pg.position.y-pg.gameData.r*2.2);
    }
    // Fuera de pantalla
    if(pos.x>this.w+100||pos.x<-100||pos.y>this.h+100){ this.onMiss(); }
    // Se detuvo en el suelo
    var spd=Math.sqrt(this.birdBody.velocity.x*this.birdBody.velocity.x+this.birdBody.velocity.y*this.birdBody.velocity.y);
    if(spd<0.2&&pos.y>this.groundY-this.birdR*3){ this.onMiss(); }
  }
});

function volverAlMapa(){document.getElementById('cartelTrofeo').classList.remove('active');renderMapa();mostrar('sMapa');lucide.createIcons();}

/* Panel de conteo (ayuda) — se mantiene igual */
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
