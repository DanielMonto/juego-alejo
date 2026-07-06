/* ============================================================
   AUDIO — Web Audio API + Speech Synthesis
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

/* --- Voz --- */
var vozOn=true, vozElegida=null, listaVoces=[];

function elegirVoz(){ if(!('speechSynthesis' in window)) return; var voces=window.speechSynthesis.getVoices(); if(!voces||!voces.length) return;
  var esp=voces.filter(function(v){ return /es(-|_)|spanish|español/i.test(v.lang+' '+v.name); });
  var otras=voces.filter(function(v){ return esp.indexOf(v)===-1; });
  var pref=['helena','sabina','laura','paulina','mónica','monica','google español','esperanza','marisol','female'];
  esp.sort(function(a,b){ function p(v){ var n=v.name.toLowerCase(); for(var i=0;i<pref.length;i++){ if(n.indexOf(pref[i])!==-1) return i; } return 99; } return p(a)-p(b); });
  listaVoces=esp.concat(otras); if(!vozElegida&&listaVoces.length) vozElegida=listaVoces[0]; poblarSelectorVoz(); }

function poblarSelectorVoz(){ var sel=document.getElementById('selectorVoz'); if(!sel) return; sel.innerHTML='';
  if(!listaVoces.length){ var o=document.createElement('option'); o.textContent='(No hay voces)'; sel.appendChild(o); return; }
  for(var i=0;i<listaVoces.length;i++){ var v=listaVoces[i],opt=document.createElement('option'); opt.value=i;
    var e=/es(-|_)|spanish|español/i.test(v.lang+' '+v.name); opt.textContent=(e?'ES ':'GL ')+v.name;
    if(vozElegida&&v.name===vozElegida.name) opt.selected=true; sel.appendChild(opt); } }

function cambiarVoz(){ var s=document.getElementById('selectorVoz'); var i=parseInt(s.value,10); if(!isNaN(i)&&listaVoces[i]){ vozElegida=listaVoces[i]; probarVoz(); } }
function probarVoz(){ initAudio(); hablar('¡Hola '+(save.nombre||'Alejo')+'! Vamos a jugar.'); }

function hablar(t){ if(!vozOn) return; try{ if('speechSynthesis' in window){ window.speechSynthesis.cancel(); if(!vozElegida) elegirVoz();
  var u=new SpeechSynthesisUtterance(t); if(vozElegida){ u.voice=vozElegida; u.lang=vozElegida.lang; } else u.lang='es-ES';
  u.rate=0.92; u.pitch=1.3; window.speechSynthesis.speak(u); } }catch(e){} }

function toggleVoz(){ vozOn=!vozOn; var b1=document.getElementById('btnVoz'), b2=document.getElementById('btnVozMenu');
  if(b1) b1.innerHTML=vozOn?'<i data-lucide="volume-2"></i>':'<i data-lucide="volume-x"></i>';
  if(b2) b2.innerHTML=vozOn?'<i data-lucide="volume-2"></i>':'<i data-lucide="volume-x"></i>';
  lucide.createIcons();
  if(vozOn) hablar('Voz activada'); else if('speechSynthesis' in window) window.speechSynthesis.cancel(); }

if('speechSynthesis' in window){ window.speechSynthesis.onvoiceschanged=elegirVoz; elegirVoz(); }
