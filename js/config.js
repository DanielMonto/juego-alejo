/* ============================================================
   CONFIG — Mundos, pájaros, logros, dificultad
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
  {id:'rojo',    nombre:'Rojo',    color:0xd62828, costo:0,  poder:'El clásico'},
  {id:'amarillo',nombre:'Rayo',    color:0xffd23f, costo:3,  poder:'Toca la pantalla en vuelo para acelerar'},
  {id:'negro',   nombre:'Bomba',   color:0x333333, costo:6,  poder:'Toca en vuelo para explotar'},
  {id:'azul',    nombre:'Grandote',color:0x3a7bd5, costo:10, poder:'Grande y pesado, arrasa con todo'}
];

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

/* Dificultad para modo racha */
var RACHA_NIVELES=[
  {desde:0,  hasta:5,  nombre:'Principiante', maxRes:10, pisosMax:1, mats:['wood'],               tnt:0,    tema:'pradera',  modoOp:'suma'},
  {desde:6,  hasta:10, nombre:'Aprendiz',     maxRes:15, pisosMax:1, mats:['wood','stone'],        tnt:0,    tema:'pradera',  modoOp:'mixto'},
  {desde:11, hasta:20, nombre:'Guerrero',     maxRes:20, pisosMax:2, mats:['wood','stone'],        tnt:0.12, tema:'desierto', modoOp:'mixto'},
  {desde:21, hasta:30, nombre:'Experto',      maxRes:25, pisosMax:2, mats:['wood','stone','ice'],  tnt:0.18, tema:'nieve',    modoOp:'mixto'},
  {desde:31, hasta:45, nombre:'Maestro',      maxRes:35, pisosMax:3, mats:['stone','wood'],        tnt:0.28, tema:'volcan',   modoOp:'mixto'},
  {desde:46, hasta:70, nombre:'Leyenda',      maxRes:45, pisosMax:3, mats:['wood','ice'],          tnt:0.22, tema:'playa',    modoOp:'mixto'},
  {desde:71, hasta:999,nombre:'Inmortal',     maxRes:50, pisosMax:3, mats:['stone','ice','wood'],  tnt:0.35, tema:'noche',    modoOp:'mixto'}
];

/* Colores por tema */
var TEMAS={
  pradera: {sky:0x7ec8ff, ground:0x7ed957, groundDark:0x4caf50, border:0x3d8b40},
  desierto:{sky:0xbfe3ff, ground:0xf2d488, groundDark:0xd6a94e, border:0xb5863a},
  nieve:   {sky:0xdff1ff, ground:0xffffff, groundDark:0xdce9f2, border:0xa9c3d6},
  volcan:  {sky:0x5a2b2b, ground:0x4a3b3b, groundDark:0x2e2626, border:0xb5342a},
  playa:   {sky:0x8fd0ff, ground:0xffe6a8, groundDark:0xf0c66a, border:0xc99b3a},
  noche:   {sky:0x10163a, ground:0x2a2f45, groundDark:0x1a1d2e, border:0x3a4060}
};

/* Colores de materiales */
var MAT_COLORS={
  wood: {fill:0xc8842a, stroke:0x7a4a1e},
  stone:{fill:0x9aa5b0, stroke:0x5c636b},
  ice:  {fill:0xb8e8f8, stroke:0x6fb8d8},
  tnt:  {fill:0xd62828, stroke:0x8a1414}
};
