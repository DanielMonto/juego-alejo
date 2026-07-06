/* ============================================================
   GAME — Phaser 3 + Matter.js — Pájaros Matemáticos
============================================================ */

/* ---- Estado global del juego ---- */
var GS={
  modo:'aventura', vidas:3, racha:0, rachaNivelIdx:0, rachaRecord:false,
  rondaActual:0, primerIntento:0, rondaFallada:false,
  retoMundo:0, retoIdx:0, pajaroSel:'rojo',
  estado:{a:0,b:0,op:'+',tipo:'suma',resultado:0},
  cfg:{maxRes:10,pisosMax:1,mats:['wood'],tnt:0,tema:'pradera',modoOp:'mixto'}
};

var phaserGame=null;

/* ---- Operaciones matemáticas ---- */
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
  mostrar('juego');
  generarOperacion();
  if(phaserGame){
    phaserGame.scene.getScene('Game').scene.restart();
  } else {
    phaserGame=new Phaser.Game({
      type:Phaser.AUTO, parent:'game-container',
      backgroundColor:'#87ceeb', transparent:false,
      scale:{mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH},
      physics:{default:'matter', matter:{gravity:{y:1.8}, enableSleeping:true, debug:false}},
      scene:[GameScene]
    });
  }
}
function salirJuego(){
  if(phaserGame){ phaserGame.scene.getScene('Game').scene.pause(); }
  refrescarChips();
  if(GS.modo==='aventura'){ renderMapa(); mostrar('sMapa'); }
  else mostrar('sMenu');
}

/* ============================================================
   PHASER GAME SCENE
============================================================ */
var GameScene=new Phaser.Class({
  Extends:Phaser.Scene,
  initialize:function(){ Phaser.Scene.call(this,{key:'Game'}); },

  create:function(){
    var self=this;
    this.w=this.scale.width; this.h=this.scale.height;
    this.groundY=this.h*0.82;
    this.anchorX=this.w*0.15; this.anchorY=this.groundY-Math.min(this.w,this.h)*0.28;
    this.maxPull=Math.min(this.w,this.h)*0.30;
    this.launchMul=0.013;
    this.isDragging=false; this.launched=false; this.resolved=false;
    this.birdBodies=[]; this.pigBodies=[]; this.blockBodies=[]; this.pigData=[];

    this.drawBackground();
    this.createGround();
    this.gfxSling=this.add.graphics(); this.gfxTrajectory=this.add.graphics();
    this.buildForts();
    this.createBird();
    this.setupInput();
    this.setupCollisions();
    this.updateHUD();
    this.drawSlingshot();

    this.scale.on('resize',function(sz){ self.w=sz.width; self.h=sz.height; });

    initAudio();
    hablar('¿Cuánto es '+GS.estado.a+(GS.estado.tipo==='suma'?' más ':' menos ')+GS.estado.b+'?');
  },

  /* ---- Background ---- */
  drawBackground:function(){
    var tema=TEMAS[GS.cfg.tema]||TEMAS.pradera;
    this.add.rectangle(this.w/2, this.groundY/2, this.w*2, this.groundY*2, tema.sky).setDepth(-2);
    this.add.rectangle(this.w/2, this.groundY+(this.h-this.groundY)/2, this.w*2, (this.h-this.groundY)*2, tema.ground).setDepth(-1);
    this.add.rectangle(this.w/2, this.groundY+2, this.w*2, 5, tema.border).setDepth(0);
  },

  /* ---- Ground physics ---- */
  createGround:function(){
    this.matter.add.rectangle(this.w/2, this.groundY+250, this.w*3, 500,{isStatic:true, label:'ground', friction:1, restitution:0.05});
    this.matter.add.rectangle(-50, this.h/2, 100, this.h*2,{isStatic:true, label:'wall'});
    this.matter.add.rectangle(this.w+50, this.h/2, 100, this.h*2,{isStatic:true, label:'wall'});
  },

  /* ---- Bird ---- */
  createBird:function(){
    var r=Math.min(this.w,this.h)*0.025;
    var color=PAJAROS[0].color;
    for(var i=0;i<PAJAROS.length;i++){ if(PAJAROS[i].id===GS.pajaroSel) color=PAJAROS[i].color; }

    this.birdR=r;
    this.birdGfx=this.add.graphics().setDepth(10);
    this.drawBirdSprite(this.anchorX, this.anchorY, r, color);

    this.birdBody=this.matter.add.circle(this.anchorX, this.anchorY, r,{
      isStatic:true, label:'bird', restitution:0.3, friction:0.5, density:0.004
    });
    this.birdX=this.anchorX; this.birdY=this.anchorY;
  },

  drawBirdSprite:function(x,y,r,color){
    var g=this.birdGfx; g.clear();
    // body
    g.fillStyle(color,1); g.fillCircle(x,y,r);
    g.lineStyle(2,0x000000,0.3); g.strokeCircle(x,y,r);
    // belly
    g.fillStyle(0xffe0c2,1); g.fillEllipse(x+r*0.1,y+r*0.35,r*0.9,r*0.7);
    // eyes
    g.fillStyle(0xffffff,1); g.fillCircle(x+r*0.2,y-r*0.25,r*0.28);
    g.fillCircle(x+r*0.55,y-r*0.22,r*0.22);
    g.fillStyle(0x222222,1); g.fillCircle(x+r*0.3,y-r*0.25,r*0.12);
    g.fillCircle(x+r*0.6,y-r*0.22,r*0.1);
    // beak
    g.fillStyle(0xff9500,1);
    g.fillTriangle(x+r*0.7,y-r*0.05, x+r*1.3,y+r*0.08, x+r*0.7,y+r*0.22);
  },

  /* ---- Forts + Pigs ---- */
  buildForts:function(){
    var opciones=generarOpciones();
    var xs=[this.w*0.55, this.w*0.73, this.w*0.90];
    var self=this;

    for(var i=0;i<3;i++){
      var px=xs[i];
      var pigY=this.buildSingleFort(px);
      this.createPig(px, pigY, opciones[i], opciones[i]===GS.estado.resultado);
    }
  },

  buildSingleFort:function(px){
    var unit=Math.min(this.w,this.h)*0.04;
    var comp=rnd(1,GS.cfg.pisosMax);
    var wallW=unit*0.6, wallH=unit*1.2, beamW=unit*3, beamH=unit*0.5;
    var mats=GS.cfg.mats;
    var baseY=this.groundY;

    // floor beam
    this.addBlock(px, baseY-beamH/2, beamW, beamH, mats[0%mats.length]);
    var floorTop=baseY-beamH;

    for(var nivel=0;nivel<comp;nivel++){
      var y=floorTop-nivel*(wallH+beamH);
      // left wall
      this.addBlock(px-unit*1.2, y-wallH/2, wallW, wallH, mats[(nivel+1)%mats.length]);
      // right wall
      this.addBlock(px+unit*1.2, y-wallH/2, wallW, wallH, mats[(nivel+2)%mats.length]);
      // beam on top
      this.addBlock(px, y-wallH-beamH/2, beamW, beamH, mats[nivel%mats.length]);
    }

    // TNT chance
    if(GS.cfg.tnt>0 && Math.random()<GS.cfg.tnt+0.2){
      this.addBlock(px, floorTop-unit*0.4, unit*0.8, unit*0.8, 'tnt');
    }

    return floorTop-unit*0.5; // pig Y position
  },

  addBlock:function(x,y,w,h,mat){
    var density=mat==='stone'?0.006:mat==='ice'?0.002:0.003;
    var col=MAT_COLORS[mat]||MAT_COLORS.wood;

    var body=this.matter.add.rectangle(x,y,w,h,{
      isStatic:true, label:'block_'+mat,
      friction:0.9, restitution:0.05, density:density,
      chamfer:{radius:2}
    });
    body.gameData={mat:mat, w:w, h:h};

    var gfx=this.add.graphics().setDepth(1);
    gfx.fillStyle(col.fill,1); gfx.fillRoundedRect(-w/2,-h/2,w,h,3);
    gfx.lineStyle(2,col.stroke,1); gfx.strokeRoundedRect(-w/2,-h/2,w,h,3);
    if(mat==='tnt'){
      var txt=this.add.text(0,0,'TNT',{fontSize:Math.floor(h*0.45)+'px',fontFamily:'Comic Sans MS',color:'#fff',fontStyle:'bold'}).setOrigin(0.5).setDepth(2);
      txt.setPosition(x,y);
      body.gameData.txt=txt;
    }
    gfx.setPosition(x,y);
    body.gameData.gfx=gfx;
    this.blockBodies.push(body);
  },

  createPig:function(x,y,num,correcto){
    var r=Math.min(this.w,this.h)*0.028;
    var body=this.matter.add.circle(x,y,r,{
      isStatic:true, label:'pig', friction:0.8, restitution:0.1, density:0.003
    });
    body.gameData={num:num, correcto:correcto, r:r, vivo:true};

    // pig sprite
    var gfx=this.add.graphics().setDepth(3);
    gfx.fillStyle(0x4caf50,1); gfx.fillCircle(0,0,r);
    gfx.lineStyle(2,0x2f7d33,1); gfx.strokeCircle(0,0,r);
    gfx.fillStyle(0xffffff,1); gfx.fillCircle(-r*0.3,-r*0.15,r*0.25); gfx.fillCircle(r*0.3,-r*0.15,r*0.25);
    gfx.fillStyle(0x222222,1); gfx.fillCircle(-r*0.22,-r*0.12,r*0.1); gfx.fillCircle(r*0.36,-r*0.12,r*0.1);
    gfx.fillStyle(0x7bc943,1); gfx.fillEllipse(0,r*0.25,r*0.45,r*0.35);
    gfx.setPosition(x,y);

    // number label
    var labelY=y-r*2;
    var bg=this.add.graphics().setDepth(4);
    bg.fillStyle(0xffffff,0.95); bg.fillRoundedRect(-r*1.2,-r*0.7,r*2.4,r*1.4,8);
    bg.lineStyle(3,0xff9500,1); bg.strokeRoundedRect(-r*1.2,-r*0.7,r*2.4,r*1.4,8);
    bg.setPosition(x,labelY);

    var txt=this.add.text(x,labelY,String(num),{
      fontSize:Math.floor(r*1.2)+'px', fontFamily:'Comic Sans MS', color:'#073b5c', fontStyle:'bold'
    }).setOrigin(0.5).setDepth(5);

    body.gameData.gfx=gfx; body.gameData.bgGfx=bg; body.gameData.txt=txt;
    this.pigBodies.push(body);
    this.pigData.push(body.gameData);
  },

  /* ---- Input (drag slingshot) ---- */
  setupInput:function(){
    var self=this;
    this.input.on('pointerdown',function(ptr){
      if(self.launched){
        self.usePower(); return;
      }
      if(self.resolved) return;
      var dx=ptr.x-self.birdX, dy=ptr.y-self.birdY;
      if(Math.sqrt(dx*dx+dy*dy)<self.birdR*4){
        self.isDragging=true;
      }
    });
    this.input.on('pointermove',function(ptr){
      if(!self.isDragging) return;
      var dx=ptr.x-self.anchorX, dy=ptr.y-self.anchorY;
      var d=Math.sqrt(dx*dx+dy*dy);
      if(d>self.maxPull){ dx=dx/d*self.maxPull; dy=dy/d*self.maxPull; }
      if(dx>0) dx=0; // can't pull forward
      var ny=self.anchorY+dy;
      if(ny>self.groundY-self.birdR) ny=self.groundY-self.birdR;
      self.birdX=self.anchorX+dx; self.birdY=ny;
      Phaser.Physics.Matter.Matter.Body.setPosition(self.birdBody,{x:self.birdX,y:self.birdY});
      self.drawBirdSprite(self.birdX,self.birdY,self.birdR,self.getBirdColor());
      self.drawSlingshot();
      self.drawTrajectory();
    });
    this.input.on('pointerup',function(){
      if(!self.isDragging) return;
      self.isDragging=false;
      self.gfxTrajectory.clear();
      var dx=self.anchorX-self.birdX, dy=self.anchorY-self.birdY;
      if(Math.sqrt(dx*dx+dy*dy)<10){
        Phaser.Physics.Matter.Matter.Body.setPosition(self.birdBody,{x:self.anchorX,y:self.anchorY});
        self.birdX=self.anchorX; self.birdY=self.anchorY;
        self.drawBirdSprite(self.birdX,self.birdY,self.birdR,self.getBirdColor());
        self.drawSlingshot();
        return;
      }
      self.launchBird(dx,dy);
    });
  },

  getBirdColor:function(){
    for(var i=0;i<PAJAROS.length;i++){ if(PAJAROS[i].id===GS.pajaroSel) return PAJAROS[i].color; }
    return 0xd62828;
  },

  launchBird:function(dx,dy){
    this.launched=true; this.powerUsed=false;
    Phaser.Physics.Matter.Matter.Body.setStatic(this.birdBody,false);
    Phaser.Physics.Matter.Matter.Body.setVelocity(this.birdBody,{x:dx*this.launchMul, y:dy*this.launchMul});
    this.drawSlingshot();
    sonidoLanzar();
  },

  usePower:function(){
    if(this.powerUsed||this.resolved) return;
    var id=GS.pajaroSel, b=this.birdBody;
    if(id==='amarillo'){
      this.powerUsed=true;
      var v=b.velocity;
      Phaser.Physics.Matter.Matter.Body.setVelocity(b,{x:v.x*1.8,y:v.y*0.9});
      sonidoLanzar(); beep(1100,0.12,'square');
    } else if(id==='negro'){
      this.powerUsed=true;
      this.triggerExplosion(b.position.x, b.position.y, Math.min(this.w,this.h)*0.15);
    }
  },

  /* ---- Trajectory preview ---- */
  drawTrajectory:function(){
    var g=this.gfxTrajectory; g.clear();
    if(!this.isDragging) return;
    var dx=this.anchorX-this.birdX, dy=this.anchorY-this.birdY;
    var vx=dx*this.launchMul, vy=dy*this.launchMul;
    var gravity=1.8*0.001;
    var px=this.birdX, py=this.birdY;
    for(var i=0;i<50;i++){
      px+=vx; py+=vy; vy+=gravity;
      if(py>this.groundY||px>this.w||px<0) break;
      if(i%2===0){
        var alpha=1-i/50;
        g.fillStyle(0xffffff,alpha*0.9);
        g.fillCircle(px,py,Math.max(2,5-i*0.08));
      }
    }
  },

  /* ---- Slingshot visual ---- */
  drawSlingshot:function(){
    var g=this.gfxSling; g.clear();
    var ax=this.anchorX, ay=this.anchorY;
    var fw=Math.min(this.w,this.h)*0.025;
    var ltx=ax-fw, lty=ay, rtx=ax+fw, rty=ay;
    var baseY=this.groundY;
    // base
    g.lineStyle(Math.min(this.w,this.h)*0.02,0x8b5a2b,1);
    g.lineBetween(ax,baseY,ax,ay+Math.min(this.w,this.h)*0.04);
    // prongs
    g.lineStyle(Math.min(this.w,this.h)*0.015,0x9c6631,1);
    g.lineBetween(ax,ay+Math.min(this.w,this.h)*0.04,ltx,lty);
    g.lineBetween(ax,ay+Math.min(this.w,this.h)*0.04,rtx,rty);
    // rubber bands (only when aiming or dragging)
    if(!this.launched){
      g.lineStyle(3,0x3f2a15,1);
      g.lineBetween(ltx,lty,this.birdX,this.birdY);
      g.lineBetween(rtx,rty,this.birdX,this.birdY);
    }
    g.setDepth(this.launched?1:11);
  },

  /* ---- Collisions ---- */
  setupCollisions:function(){
    var self=this;
    this.matter.world.on('collisionstart',function(event){
      if(self.resolved) return;
      for(var i=0;i<event.pairs.length;i++){
        var pair=event.pairs[i];
        var a=pair.bodyA, b=pair.bodyB;
        self.handleCollision(a,b);
      }
    });
  },

  handleCollision:function(a,b){
    var bird=null, other=null;
    if(a.label==='bird'){bird=a;other=b;}
    else if(b.label==='bird'){bird=b;other=a;}
    if(!bird) return;

    // Hit a pig
    if(other.label==='pig'&&other.gameData&&other.gameData.vivo){
      this.onHitPig(other);
      return;
    }
    // Hit a block — wake it up (make dynamic)
    if(other.label&&other.label.indexOf('block_')===0){
      this.wakeBlocks(bird.position.x, bird.position.y);
      // Check if block is TNT
      if(other.gameData&&other.gameData.mat==='tnt'){
        this.triggerExplosion(other.position.x, other.position.y, Math.min(this.w,this.h)*0.15);
      }
    }
    // Hit ground
    if(other.label==='ground'&&this.launched&&!this.resolved){
      this.onMiss();
    }
  },

  wakeBlocks:function(x,y){
    var radius=Math.min(this.w,this.h)*0.2;
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
    // Visual explosion
    var circle=this.add.circle(x,y,10,0xffe14d,0.8).setDepth(20);
    this.tweens.add({targets:circle,radius:radius,alpha:0,duration:400,onComplete:function(){circle.destroy();}});
    // Particles
    for(var i=0;i<12;i++){
      var angle=Math.random()*Math.PI*2;
      var p=this.add.circle(x,y,rnd(3,6),0xff5a1f,1).setDepth(20);
      this.tweens.add({targets:p,x:x+Math.cos(angle)*radius,y:y+Math.sin(angle)*radius,alpha:0,duration:rnd(300,600),onComplete:function(){p.destroy();}});
    }
    // Wake and push all blocks in radius
    for(var j=0;j<this.blockBodies.length;j++){
      var bl=this.blockBodies[j];
      var dx=bl.position.x-x, dy=bl.position.y-y;
      var d=Math.sqrt(dx*dx+dy*dy);
      if(d<radius*1.5){
        Phaser.Physics.Matter.Matter.Body.setStatic(bl,false);
        Phaser.Physics.Matter.Matter.Sleeping.set(bl,false);
        var force=(1-d/(radius*1.5))*0.05;
        Phaser.Physics.Matter.Matter.Body.applyForce(bl,bl.position,{x:dx/d*force,y:dy/d*force-force*0.5});
        // TNT chain
        if(bl.gameData&&bl.gameData.mat==='tnt'&&d<radius){
          var self=this;
          (function(bx,by){ setTimeout(function(){ self.triggerExplosion(bx,by,Math.min(self.w,self.h)*0.12); },150); })(bl.position.x,bl.position.y);
          bl.gameData.mat='wood'; // prevent re-trigger
        }
      }
    }
    // Check pigs in radius
    for(var k=0;k<this.pigBodies.length;k++){
      var pig=this.pigBodies[k]; if(!pig.gameData||!pig.gameData.vivo) continue;
      var dpx=pig.position.x-x, dpy=pig.position.y-y;
      if(Math.sqrt(dpx*dpx+dpy*dpy)<radius+pig.gameData.r){
        this.onHitPig(pig); return;
      }
    }
    if(!save.tntUsado){ save.tntUsado=true; guardar(); toast('¡Explotaste un TNT!'); revisarLogros(); }
  },

  /* ---- Hit pig ---- */
  onHitPig:function(pigBody){
    if(this.resolved) return;
    var data=pigBody.gameData;
    if(data.correcto){
      this.resolved=true;
      this.winRound(pigBody);
    } else {
      this.resolved=true;
      data.vivo=false;
      // shake visual
      if(data.gfx){ this.tweens.add({targets:data.gfx,x:'+=5',yoyo:true,repeat:3,duration:50}); }
      this.loseLife();
    }
  },

  onMiss:function(){
    if(this.resolved) return;
    // Bird hit ground without hitting any pig — just reset, no life lost
    var self=this;
    this.time.delayedCall(600,function(){ self.resetBird(); });
  },

  /* ---- Win round ---- */
  winRound:function(pigBody){
    var data=pigBody.gameData;
    data.vivo=false;
    Phaser.Physics.Matter.Matter.Body.setStatic(pigBody,false);
    Phaser.Physics.Matter.Matter.Body.setVelocity(pigBody,{x:rnd(3,8),y:rnd(-10,-5)});
    this.wakeBlocks(pigBody.position.x, pigBody.position.y);
    sonidoVictoria(); lanzarConfeti();

    save.aciertosTotales++;
    if(!GS.rondaFallada && GS.modo==='aventura') GS.primerIntento++;
    var elogios=['¡Muy bien','¡Excelente','¡Campeón','¡Genial','¡Súper'];
    var el=elogios[rnd(0,elogios.length-1)]+', '+(save.nombre||'Alejo')+'!';
    hablarAcierto(el+' '+GS.estado.a+(GS.estado.tipo==='suma'?' más ':' menos ')+GS.estado.b+' es '+GS.estado.resultado);

    if(GS.modo==='racha'){
      GS.racha++;
      if(GS.racha>save.rachaMax){ save.rachaMax=GS.racha; guardar();
        if(!GS.rachaRecord){ GS.rachaRecord=true; toast('Nuevo record: '+GS.racha+'!'); sonidoTrofeo(); lanzarConfeti(); }
      }
    }
    guardar(); revisarLogros(); refrescarChips();
    this.updateHUD();
    var self=this;
    this.time.delayedCall(1500,function(){ self.nextRound(); });
  },

  /* ---- Lose life ---- */
  loseLife:function(){
    GS.vidas--;
    GS.rondaFallada=true;
    if(GS.modo==='racha'){ GS.racha=0; GS.rachaNivelIdx=0;
      var niv=RACHA_NIVELES[0];
      GS.cfg={maxRes:niv.maxRes,pisosMax:niv.pisosMax,mats:niv.mats,tnt:niv.tnt,tema:niv.tema,modoOp:niv.modoOp};
    }
    sonidoMal();
    this.updateHUD();
    if(GS.vidas<=0){
      this.gameOver();
    } else {
      hablar('¡Ese no! Era '+GS.estado.resultado+'. Te quedan '+GS.vidas+' vidas');
      var self=this;
      this.time.delayedCall(800,function(){ self.resetBird(); });
    }
  },

  /* ---- Reset bird (same round) ---- */
  resetBird:function(){
    this.launched=false; this.resolved=false; this.powerUsed=false;
    Phaser.Physics.Matter.Matter.Body.setStatic(this.birdBody,true);
    Phaser.Physics.Matter.Matter.Body.setVelocity(this.birdBody,{x:0,y:0});
    Phaser.Physics.Matter.Matter.Body.setAngularVelocity(this.birdBody,0);
    Phaser.Physics.Matter.Matter.Body.setPosition(this.birdBody,{x:this.anchorX,y:this.anchorY});
    this.birdX=this.anchorX; this.birdY=this.anchorY;
    this.drawBirdSprite(this.anchorX,this.anchorY,this.birdR,this.getBirdColor());
    this.drawSlingshot();
  },

  /* ---- Next round ---- */
  nextRound:function(){
    if(GS.modo==='aventura'){
      GS.rondaActual++;
      if(GS.rondaActual>=RONDAS_POR_RETO){ this.finReto(); return; }
      GS.rondaFallada=false;
    } else {
      // Racha: check level up
      var nuevoIdx=0;
      for(var i=RACHA_NIVELES.length-1;i>=0;i--){ if(GS.racha>=RACHA_NIVELES[i].desde){nuevoIdx=i;break;} }
      if(nuevoIdx!==GS.rachaNivelIdx){
        GS.rachaNivelIdx=nuevoIdx;
        var niv=RACHA_NIVELES[nuevoIdx];
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
    var key=retoKey(GS.retoMundo,GS.retoIdx), prev=save.retos[key];
    var rank={bronce:1,plata:2,oro:3,copa:4};
    if(!prev||rank[trofeo]>rank[prev.trofeo]) save.retos[key]={trofeo:trofeo,estrellas:estrellas,completado:true};
    var ganaCopas=trofeo==='copa'?2:trofeo==='oro'?1:0;
    if(!prev){save.copas+=ganaCopas;if(trofeo==='copa')save.copasPerfectas++;}
    else{var pc=prev.trofeo==='copa'?2:prev.trofeo==='oro'?1:0;if(ganaCopas>pc){save.copas+=(ganaCopas-pc);if(trofeo==='copa'&&prev.trofeo!=='copa')save.copasPerfectas++;}}
    if(mundoTerminado(GS.retoMundo)&&save.mundoDesbloqueado<GS.retoMundo+1&&GS.retoMundo+1<MUNDOS.length){save.mundoDesbloqueado=GS.retoMundo+1;toast('¡Nuevo mundo: '+MUNDOS[GS.retoMundo+1].nombre+'!');}
    for(var i=0;i<PAJAROS.length;i++){var P=PAJAROS[i];if(save.pajaros.indexOf(P.id)===-1&&save.copas>=P.costo){save.pajaros.push(P.id);toast('¡Pájaro nuevo: '+P.nombre+'!');}}
    guardar(); revisarLogros(); refrescarChips();
    document.getElementById('trofeoEmoji').textContent=trofeoEmoji(trofeo);
    document.getElementById('trofeoTxt').textContent=trofeo==='copa'?'¡PERFECTO! 🏆':'¡Reto completado!';
    document.getElementById('trofeoEstrellas').textContent='⭐'.repeat(estrellas)+'☆'.repeat(3-estrellas);
    document.getElementById('trofeoDetalle').textContent=p+' de '+RONDAS_POR_RETO+' a la primera';
    document.getElementById('cartelTrofeo').classList.add('active');
    sonidoTrofeo(); lanzarConfeti();
    hablar((trofeo==='copa'?'¡Perfecto! ':'¡Reto completado! ')+'Lograste '+p+' de '+RONDAS_POR_RETO);
  },

  /* ---- Game Over ---- */
  gameOver:function(){
    document.getElementById('goTitulo').textContent='¡Se acabaron las vidas!';
    if(GS.modo==='racha'){
      document.getElementById('goRacha').textContent=GS.racha;
      document.getElementById('goNivel').textContent=RACHA_NIVELES[GS.rachaNivelIdx].nombre;
    } else {
      document.getElementById('goRacha').textContent=GS.primerIntento+'/'+RONDAS_POR_RETO;
      document.getElementById('goNivel').textContent='Reto '+(GS.retoIdx+1);
    }
    document.getElementById('goMejor').textContent=save.rachaMax;
    document.getElementById('btnGoReintentar').onclick=function(){
      document.getElementById('cartelGameOver').classList.remove('active');
      if(GS.modo==='racha') iniciarRacha(); else iniciarReto(GS.retoMundo,GS.retoIdx);
    };
    document.getElementById('btnGoSalir').onclick=function(){
      document.getElementById('cartelGameOver').classList.remove('active');
      salirJuego();
    };
    document.getElementById('cartelGameOver').classList.add('active');
    hablar('Se acabaron las vidas');
  },

  /* ---- HUD (DOM) ---- */
  updateHUD:function(){
    // Lives
    var el=document.getElementById('hudVidas'); if(el){
      var h='';
      for(var i=0;i<3;i++) h+=(i<GS.vidas?'<span class="racha-vida">&#x2764;</span>':'<span class="racha-vida muerta">&#x2764;</span>');
      el.innerHTML=h;
    }
    // Problem
    var prob=document.getElementById('problema');
    if(prob) prob.textContent=GS.estado.a+' '+GS.estado.op+' '+GS.estado.b+' = ?';
    // Ronda (aventura)
    var chip=document.getElementById('chipRonda');
    if(chip){
      if(GS.modo==='aventura'){ chip.style.display=''; chip.textContent='Ronda '+(GS.rondaActual+1)+'/'+RONDAS_POR_RETO; }
      else chip.style.display='none';
    }
    // Racha
    var estrellasEl=document.getElementById('chipEstrellas');
    if(estrellasEl){
      if(GS.modo==='racha'){ estrellasEl.innerHTML='<i data-lucide="flame" style="width:16px;height:16px"></i> '+GS.racha; estrellasEl.style.display=''; }
      else if(GS.modo==='aventura'){ estrellasEl.innerHTML='<i data-lucide="star" style="width:16px;height:16px"></i> '+GS.primerIntento; estrellasEl.style.display=''; }
      try{lucide.createIcons();}catch(e){}
    }
  },

  /* ---- Update loop ---- */
  update:function(){
    if(!this.launched||this.resolved) return;
    // Update bird visual to follow physics body
    var pos=this.birdBody.position;
    this.birdX=pos.x; this.birdY=pos.y;
    this.drawBirdSprite(pos.x,pos.y,this.birdR,this.getBirdColor());
    // Update block visuals
    for(var i=0;i<this.blockBodies.length;i++){
      var bl=this.blockBodies[i]; if(!bl.gameData||!bl.gameData.gfx) continue;
      bl.gameData.gfx.setPosition(bl.position.x,bl.position.y);
      bl.gameData.gfx.setRotation(bl.angle);
      if(bl.gameData.txt){ bl.gameData.txt.setPosition(bl.position.x,bl.position.y); bl.gameData.txt.setRotation(bl.angle); }
    }
    // Update pig visuals
    for(var j=0;j<this.pigBodies.length;j++){
      var pg=this.pigBodies[j]; if(!pg.gameData) continue;
      pg.gameData.gfx.setPosition(pg.position.x,pg.position.y);
      pg.gameData.gfx.setRotation(pg.angle);
      if(pg.gameData.bgGfx){ pg.gameData.bgGfx.setPosition(pg.position.x,pg.position.y-pg.gameData.r*2); }
      if(pg.gameData.txt){ pg.gameData.txt.setPosition(pg.position.x,pg.position.y-pg.gameData.r*2); }
    }
    // Check if bird went off screen or stopped
    if(pos.x>this.w+100||pos.x<-100||pos.y>this.h+100){
      this.onMiss();
    }
    var speed=Math.sqrt(this.birdBody.velocity.x*this.birdBody.velocity.x+this.birdBody.velocity.y*this.birdBody.velocity.y);
    if(speed<0.3&&pos.y>this.groundY-this.birdR*2){
      this.onMiss();
    }
  }
});

/* helpers */
function volverAlMapa(){ document.getElementById('cartelTrofeo').classList.remove('active'); renderMapa(); mostrar('sMapa'); lucide.createIcons(); }
