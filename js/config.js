/* ============================================================
   CONFIGURACION — Mundos, pájaros, logros, constantes
============================================================ */

function rnd(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

var MUNDOS=[
  {nombre:'Pradera', emoji:'🌳', tema:'pradera', maxRes:10, pisosMax:1, mats:['wood'],               tnt:0.00},
  {nombre:'Desierto',emoji:'🏜️', tema:'desierto',maxRes:12, pisosMax:2, mats:['wood','stone'],       tnt:0.12},
  {nombre:'Nieve',   emoji:'❄️', tema:'nieve',   maxRes:16, pisosMax:2, mats:['wood','stone','ice'], tnt:0.18},
  {nombre:'Volcán',  emoji:'🌋', tema:'volcan',  maxRes:20, pisosMax:3, mats:['stone','wood'],       tnt:0.28},
  {nombre:'Playa',   emoji:'🌊', tema:'playa',   maxRes:30, pisosMax:2, mats:['wood','ice'],         tnt:0.22},
  {nombre:'Noche',   emoji:'🌙', tema:'noche',   maxRes:40, pisosMax:3, mats:['stone','ice','wood'], tnt:0.32}
];
var RETOS_POR_MUNDO=3;
var RONDAS_POR_RETO=5;

var PAJAROS=[
  {id:'rojo',    nombre:'Rojo',    color:'#d62828', costo:0,  poder:'El clásico'},
  {id:'amarillo',nombre:'Rayo',    color:'#ffd23f', costo:3,  poder:'¡Súper veloz! Tócalo al volar para acelerar'},
  {id:'negro',   nombre:'Bomba',   color:'#333333', costo:6,  poder:'¡Explota y derriba todo alrededor!'},
  {id:'azul',    nombre:'Grandote',color:'#3a7bd5', costo:10, poder:'Grande y pesado, arrasa con todo'}
];

function paramsPajaro(id){
  if(id==='amarillo') return {kMul:1.28, rMul:0.85, gMul:0.92, radio:0.6, dash:true, bomba:false};
  if(id==='negro')    return {kMul:1.0,  rMul:1.05, gMul:1.0,  radio:2.6, dash:false, bomba:true};
  if(id==='azul')     return {kMul:1.02, rMul:1.5,  gMul:1.15, radio:1.5, dash:false, bomba:false};
  return {kMul:1.0, rMul:1.0, gMul:1.0, radio:0.7, dash:false, bomba:false};
}

var LOGROS=[
  {id:'primerReto', em:'🎗️', nom:'¡Empezamos!', desc:'Completa tu primer reto', cond:function(){ return numRetosCompletados()>=1; }},
  {id:'copa1',      em:'🏆', nom:'Primera copa', desc:'Gana un reto perfecto (5/5)', cond:function(){ return save.copasPerfectas>=1; }},
  {id:'copas5',     em:'🥇', nom:'Coleccionista', desc:'Junta 5 copas', cond:function(){ return save.copas>=5; }},
  {id:'racha10',    em:'🔥', nom:'¡En racha!', desc:'10 aciertos seguidos', cond:function(){ return save.rachaMax>=10; }},
  {id:'aciertos50', em:'💯', nom:'Matemático', desc:'50 aciertos en total', cond:function(){ return save.aciertosTotales>=50; }},
  {id:'tnt',        em:'💥', nom:'¡Boom!', desc:'Explota una caja TNT', cond:function(){ return save.tntUsado; }},
  {id:'pajaros',    em:'🦅', nom:'Domador', desc:'Desbloquea los 4 pájaros', cond:function(){ return save.pajaros.length>=4; }},
  {id:'desierto',   em:'🏜️', nom:'Cruza-desiertos', desc:'Termina el mundo Desierto', cond:function(){ return mundoTerminado(1); }},
  {id:'volcan',     em:'🌋', nom:'Amo del volcán', desc:'Termina el mundo Volcán', cond:function(){ return mundoTerminado(3); }},
  {id:'maestro',    em:'👑', nom:'¡Maestro!', desc:'Termina todos los mundos', cond:function(){ return mundoTerminado(5); }}
];

var COLORES_PAJARO=['#d62828','#ff8a00','#ffcf1a','#2fb344','#2f7de0','#8a4fe0','#ff4fa0','#111111'];

var EMOJIS=['🍎','🌟','🎈','🍓','⚽','🍒','🌸','🍪','🐟','🦋'];
