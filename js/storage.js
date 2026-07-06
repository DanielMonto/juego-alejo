/* ============================================================
   STORAGE — localStorage persistence
============================================================ */

var CLAVE='pajarosAventura_v1';
var saveDefault={
  nombre:'ALEJO', colorPajaro:'#d62828',
  copas:0, copasPerfectas:0, aciertosTotales:0, rachaMax:0,
  mundoDesbloqueado:0, retos:{}, pajaros:['rojo'], logros:[], tntUsado:false, mundosFin:[],
  personaje:'normal', vozNombre:null,
  dificultad:'facil', tipoOp:'mixto'
};
var save=cargar();

function cargar(){
  try{ var s=JSON.parse(localStorage.getItem(CLAVE)); if(s){ for(var k in saveDefault){ if(!(k in s)) s[k]=saveDefault[k]; } return s; } }catch(e){}
  return JSON.parse(JSON.stringify(saveDefault));
}
function guardar(){ try{ localStorage.setItem(CLAVE, JSON.stringify(save)); }catch(e){} }

function retoKey(m,r){ return m+'-'+r; }
function retoData(m,r){ return save.retos[retoKey(m,r)]; }
function retoCompletado(m,r){ return !!retoData(m,r); }
function numRetosCompletados(){ return Object.keys(save.retos).length; }
function mundoTerminado(m){ for(var r=0;r<RETOS_POR_MUNDO;r++){ if(!retoCompletado(m,r)) return false; } return true; }
function retoDesbloqueado(m,r){ if(m>save.mundoDesbloqueado) return false; if(r===0) return true; return retoCompletado(m,r-1); }
