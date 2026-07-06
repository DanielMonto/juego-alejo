/* ============================================================
   AUDIO — Web Audio API + Speech Synthesis + Personajes de voz
============================================================ */

var audioCtx=null;
function initAudio(){ if(!audioCtx){ try{ audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } }

function beep(freq,dur,tipo,vol){ if(!audioCtx) return; try{ var o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=tipo||'sine'; o.frequency.value=freq; o.connect(g); g.connect(audioCtx.destination);
  g.gain.setValueAtTime(0.0001,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(vol||0.25,audioCtx.currentTime+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+dur); o.start(); o.stop(audioCtx.currentTime+dur); }catch(e){} }

function sonidoToque(n){ initAudio(); beep(400+n*40,0.12,'triangle'); }

function sonidoLanzar(){ initAudio(); if(!audioCtx) return; try{ var o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type='sawtooth'; o.connect(g); g.connect(audioCtx.destination); o.frequency.setValueAtTime(700,audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(180,audioCtx.currentTime+0.35); g.gain.setValueAtTime(0.2,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.35); o.start(); o.stop(audioCtx.currentTime+0.35); }catch(e){} }

function sonidoVictoria(){ initAudio(); var n=[523,659,784,1046,784,1046,1318]; for(var i=0;i<n.length;i++){ (function(f,d){ setTimeout(function(){ beep(f,0.22,'sine'); beep(f/2,0.2,'triangle',0.15); },d); })(n[i],i*110); } }

function sonidoTrofeo(){ initAudio(); var n=[392,523,659,784,1046,1318,1046,1318,1568]; for(var i=0;i<n.length;i++){ (function(f,d){ setTimeout(function(){ beep(f,0.28,'sine'); beep(f*1.5,0.18,'triangle',0.12); },d); })(n[i],i*130); } }

function sonidoBoom(){ initAudio(); if(!audioCtx) return; try{ var o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type='square'; o.connect(g); g.connect(audioCtx.destination); o.frequency.setValueAtTime(160,audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(45,audioCtx.currentTime+0.32); g.gain.setValueAtTime(0.32,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.32); o.start(); o.stop(audioCtx.currentTime+0.32); }catch(e){} }

function sonidoMal(){ initAudio(); beep(200,0.18,'sawtooth'); setTimeout(function(){ beep(150,0.18,'sawtooth'); },120); }

/* ============ PERSONAJES DE VOZ ============ */
var PERSONAJES=[
  {id:'normal',  nombre:'Normal',    emoji:'🗣️', pitch:1.3,  rate:0.92, desc:'Voz normal en español',
    saludo:function(n){ return '¡Hola '+n+'! Vamos a jugar.'; },
    acierto:function(){ return ''; },
    sfx:null},

  {id:'chispita', nombre:'Chispita', emoji:'⚡', pitch:2.0,  rate:1.1,  desc:'Voz aguda y tierna',
    saludo:function(n){ return '¡Chispa chispa! ¡Hola '+n+'!'; },
    acierto:function(){ var f=['¡Chispa!','¡Chispaaaa!','¡Pika... digo, chispa!']; return f[rnd(0,f.length-1)]; },
    sfx:function(){ beep(1800,0.06,'sine',0.3); setTimeout(function(){ beep(2200,0.06,'sine',0.3); },70); setTimeout(function(){ beep(2600,0.08,'sine',0.25); },140); }},

  {id:'grrroto', nombre:'Grrroto',   emoji:'🔥', pitch:0.55, rate:0.85, desc:'Voz grave y poderosa',
    saludo:function(n){ return '¡Grrrrr! ¡'+n+', a quemar!'; },
    acierto:function(){ var f=['¡GRRR!','¡Fuego!','¡Arrrde!']; return f[rnd(0,f.length-1)]; },
    sfx:function(){ beep(120,0.15,'sawtooth',0.3); setTimeout(function(){ beep(80,0.2,'square',0.25); },100); }},

  {id:'burbujita', nombre:'Burbujita', emoji:'💧', pitch:1.4, rate:0.95, desc:'Voz acuática con burbujas',
    saludo:function(n){ return '¡Blub blub! ¡Hola '+n+'!'; },
    acierto:function(){ var f=['¡Blub!','¡Splash!','¡Burbujitas!']; return f[rnd(0,f.length-1)]; },
    sfx:function(){ for(var i=0;i<5;i++){ (function(d){ setTimeout(function(){ beep(800+rnd(0,600),0.05,'sine',0.15); },d); })(i*60); } }},

  {id:'dormilon', nombre:'Dormilón',  emoji:'😴', pitch:0.5,  rate:0.65, desc:'Voz lenta y somnolienta',
    saludo:function(n){ return '¡Aaaah... bostezo... hola '+n+'...!'; },
    acierto:function(){ var f=['Zzzz... bien...','¡Mmm... correcto...!','Otro ratito...']; return f[rnd(0,f.length-1)]; },
    sfx:function(){ beep(200,0.3,'sine',0.12); setTimeout(function(){ beep(160,0.4,'sine',0.08); },250); }},

  {id:'robotin', nombre:'Robotín',   emoji:'🤖', pitch:0.9,  rate:1.2,  desc:'Voz mecánica y precisa',
    saludo:function(n){ return 'Sistema iniciado. Jugador: '+n+'. Procesando diversión.'; },
    acierto:function(){ var f=['Cálculo correcto.','Datos verificados.','Operación exitosa.']; return f[rnd(0,f.length-1)]; },
    sfx:function(){ beep(440,0.04,'square',0.2); setTimeout(function(){ beep(880,0.04,'square',0.2); },50); setTimeout(function(){ beep(440,0.04,'square',0.2); },100); }}
];

var personajeActual='normal';

function getPersonaje(){ for(var i=0;i<PERSONAJES.length;i++){ if(PERSONAJES[i].id===personajeActual) return PERSONAJES[i]; } return PERSONAJES[0]; }

function cambiarPersonaje(id){
  personajeActual=id;
  save.personaje=id;
  guardar();
  renderPanelVoz();
  var p=getPersonaje();
  if(p.sfx){ initAudio(); p.sfx(); }
  hablar(p.saludo(save.nombre||'Alejo'));
}

/* ============ VOZ (Speech Synthesis) ============ */
var vozOn=true, vozElegida=null, listaVoces=[];

function elegirVoz(){ if(!('speechSynthesis' in window)) return; var voces=window.speechSynthesis.getVoices(); if(!voces||!voces.length) return;
  var esp=voces.filter(function(v){ return /es(-|_)|spanish|español/i.test(v.lang+' '+v.name); });
  var otras=voces.filter(function(v){ return esp.indexOf(v)===-1; });
  // Priorizar voces Google (neurales, suenan naturales) sobre voces locales SAPI
  var pref=['google español','google es','google spanish','google us spanish',
    'helena','sabina','laura','paulina','mónica','monica','esperanza','marisol','female'];
  esp.sort(function(a,b){
    function score(v){
      var n=v.name.toLowerCase();
      // Google voices get top priority (score 0-3)
      if(n.indexOf('google')!==-1) return 0;
      // Network/remote voices next
      if(!v.localService) return 4;
      // Then by preference list
      for(var i=0;i<pref.length;i++){ if(n.indexOf(pref[i])!==-1) return 5+i; }
      return 99;
    }
    return score(a)-score(b);
  });
  listaVoces=esp.concat(otras); if(!vozElegida&&listaVoces.length) vozElegida=listaVoces[0]; }

// Chrome a veces tarda en cargar voces de red — reintentar
var _vozRetries=0;
function reintentarVoces(){
  if(_vozRetries>5) return;
  var voces=window.speechSynthesis.getVoices();
  var tieneGoogle=voces.some(function(v){ return /google/i.test(v.name); });
  if(!tieneGoogle && _vozRetries<5){
    _vozRetries++;
    setTimeout(function(){ elegirVoz(); reintentarVoces(); }, 500);
  }
}
if('speechSynthesis' in window){ setTimeout(reintentarVoces, 1000); }

function hablar(t){ if(!vozOn) return; try{ if('speechSynthesis' in window){ window.speechSynthesis.cancel(); if(!vozElegida) elegirVoz();
  var p=getPersonaje();
  // Sonido signature antes de hablar
  if(p.sfx){ initAudio(); p.sfx(); }
  var u=new SpeechSynthesisUtterance(t);
  if(vozElegida){ u.voice=vozElegida; u.lang=vozElegida.lang; } else u.lang='es-ES';
  u.rate=p.rate; u.pitch=p.pitch;
  window.speechSynthesis.speak(u); } }catch(e){} }

function hablarAcierto(textoBase){
  var p=getPersonaje();
  var extra=p.acierto();
  hablar(extra ? extra+' '+textoBase : textoBase);
}

function toggleVoz(){ vozOn=!vozOn;
  var b1=document.getElementById('btnVoz'), b2=document.getElementById('btnVozMenu');
  if(b1) b1.innerHTML=vozOn?'<i data-lucide="volume-2"></i>':'<i data-lucide="volume-x"></i>';
  if(b2) b2.innerHTML=vozOn?'<i data-lucide="volume-2"></i>':'<i data-lucide="volume-x"></i>';
  lucide.createIcons();
  if(vozOn) hablar('Voz activada'); else if('speechSynthesis' in window) window.speechSynthesis.cancel(); }

if('speechSynthesis' in window){ window.speechSynthesis.onvoiceschanged=elegirVoz; elegirVoz(); }

/* ============ PANEL DE VOZ (flotante, todas las vistas) ============ */
function togglePanelVoz(){
  var panel=document.getElementById('panelVoz');
  if(panel.classList.contains('active')){ panel.classList.remove('active'); return; }
  renderPanelVoz();
  panel.classList.add('active');
}

function renderPanelVoz(){
  var lista=document.getElementById('vozLista'); if(!lista) return;
  lista.innerHTML='';
  for(var i=0;i<PERSONAJES.length;i++){
    (function(P){
      var d=document.createElement('div');
      d.className='voz-card'+(P.id===personajeActual?' sel':'');
      d.innerHTML='<div class="voz-emoji">'+P.emoji+'</div>'+
        '<div class="voz-info"><div class="voz-nombre">'+P.nombre+'</div><div class="voz-desc">'+P.desc+'</div></div>';
      d.onclick=function(){ cambiarPersonaje(P.id); };
      lista.appendChild(d);
    })(PERSONAJES[i]);
  }
  // Selector de voz TTS del sistema
  var selCont=document.getElementById('vozTTSCont'); if(!selCont) return;
  selCont.innerHTML='<div class="voz-tts-label">Voz del sistema:</div>';
  var sel=document.createElement('select'); sel.id='selectorVoz'; sel.className='voz-tts-select';
  if(!listaVoces.length){ elegirVoz(); }
  if(!listaVoces.length){ var o=document.createElement('option'); o.textContent='(No hay voces)'; sel.appendChild(o); }
  else { for(var j=0;j<listaVoces.length;j++){ var v=listaVoces[j], opt=document.createElement('option'); opt.value=j;
    var e=/es(-|_)|spanish|español/i.test(v.lang+' '+v.name); opt.textContent=(e?'ES ':'GL ')+v.name;
    if(vozElegida&&v.name===vozElegida.name) opt.selected=true; sel.appendChild(opt); } }
  sel.onchange=function(){ var idx=parseInt(sel.value,10); if(!isNaN(idx)&&listaVoces[idx]){ vozElegida=listaVoces[idx]; hablar('Esta es mi nueva voz'); } };
  selCont.appendChild(sel);
}

/* Cargar personaje guardado */
function cargarPersonajeGuardado(){
  if(save.personaje && PERSONAJES.some(function(p){ return p.id===save.personaje; })){
    personajeActual=save.personaje;
  }
}
