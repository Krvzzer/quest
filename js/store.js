const KEY='nippon:v1';
export const defaults=()=>({v:2,open:{},hist:[],xp:0,tot:0,ok:0,streak:0,best:0,items:{},conf:{},ach:{},day:{},exams:0,bestExam:0,seeded:false});
let st,timer;
export function load(){
  try{const raw=localStorage.getItem(KEY);
    if(raw){const o=JSON.parse(raw);
      if(o&&(o.v===1||o.v===2)&&o.items&&typeof o.items==='object'&&o.conf&&typeof o.conf==='object'&&Number.isFinite(o.xp)){if(o.v===1)try{localStorage.setItem(KEY+':v1backup',raw)}catch(e){} // respaldo antes de migrar
        return st={...defaults(),...o,v:2}}
      localStorage.setItem(KEY+':corrupt',raw); // respaldo de datos inválidos
    }}catch(e){}
  return st=defaults();
}
export const get=()=>st;
let afterSave=null;
export const setAfterSave=f=>{afterSave=f};
export function flush(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}afterSave&&afterSave()}
export function save(){clearTimeout(timer);timer=setTimeout(flush,300)}
export function reset(){try{localStorage.removeItem(KEY)}catch(e){}st=defaults()}
addEventListener('pagehide',flush);

// ---- Sincronización manual entre dispositivos ----
export const exportData=()=>JSON.stringify({app:'nippon-quest',v:2,at:Date.now(),data:st});
const num=Number.isFinite;
// Combina un progreso exportado con el local: por carácter gana el más reciente (l), sin perder los contadores.
export function importMerge(text,backup=true){
  let p;try{p=JSON.parse(String(text).trim())}catch(e){throw new Error('el texto no es un progreso válido')}
  const o=p&&p.app==='nippon-quest'?p.data:null;
  if(!o||!(o.v===1||o.v===2)||!o.items||typeof o.items!=='object'||!o.conf||typeof o.conf!=='object'||!num(o.xp))throw new Error('formato no reconocido');
  if(backup)try{localStorage.setItem(KEY+':prebackup',JSON.stringify(st))}catch(e){} // respaldo por si algo sale mal
  let n=0;
  for(const[id,r]of Object.entries(o.items)){
    if(!r||!num(r.s)||!num(r.ok)||!num(r.ko))continue;
    const m=st.items[id];
    if(!m){st.items[id]={...r};n++;continue}
    const rw=(r.l||0)>(m.l||0)||((r.l||0)===(m.l||0)&&r.ok+r.ko>m.ok+m.ko),w=rw?{...r}:{...m};
    w.ok=Math.max(r.ok,m.ok);w.ko=Math.max(r.ko,m.ko);st.items[id]=w;if(rw)n++;
  }
  for(const[k,v]of Object.entries(o.conf))if(num(v))st.conf[k]=Math.max(st.conf[k]||0,v);
  for(const k of['xp','tot','ok','best','exams','bestExam'])if(num(o[k]))st[k]=Math.max(st[k]||0,o[k]);
  Object.assign(st.ach,o.ach||{});Object.assign(st.open,o.open||{});
  const seen=new Set(st.hist.map(h=>[h.d,h.m,h.n,h.ok].join()));
  (o.hist||[]).forEach(h=>{if(h&&num(h.d)&&!seen.has([h.d,h.m,h.n,h.ok].join()))st.hist.push(h)});
  st.hist.sort((a,b)=>a.d-b.d);st.hist=st.hist.slice(-90);
  const a=st.day,b=o.day;
  if(b&&b.d){if(!a.d||b.d>a.d)st.day=b;else if(b.d===a.d){for(const k of['correct','sessions','streak'])a[k]=Math.max(a[k]||0,b[k]||0);a.paid={...(a.paid||{}),...(b.paid||{})}}}
  flush();return{items:n};
}
