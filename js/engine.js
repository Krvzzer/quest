// Lógica pura: dominio, selección adaptativa, XP, misiones, logros.
import {WORLDS,IT,SIM,TIPS} from './data.js';
import {get,save} from './store.js';
export const rnd=n=>Math.floor(Math.random()*n);
export const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
export const rec=id=>get().items[id]||{s:0,ok:0,ko:0};
// Repaso espaciado: días hasta el próximo repaso según el nivel alcanzado (0 a 5)
const INT=[0,0,0,1,4,10];
export const today=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5);
let t0=0,curMode='';
export const level=x=>1+Math.floor(Math.sqrt(x/40));
export const xpIn=x=>{const L=level(x),a=40*(L-1)**2,b=40*L*L;return (x-a)/(b-a)};

// Estado inicial: hiragana base dominado, が行 conocida.
export function seed(){const S=get();if(!S.seeded)seed0(S);migrate(S)}
// Migración v1→v2: conserva mundos ya abiertos y asigna fecha de repaso a lo ya dominado
function migrate(S){if(S.migrated)return;const td=today();
  Object.values(S.items).forEach(r=>{if(r.d===undefined&&r.s>=4)r.d=td+INT[r.s]});
  WORLDS.forEach(w=>{if(w.id>1&&frac(WORLDS[w.id-2],3)>=.8)S.open[w.id]=1});S.migrated=true;save()}
function seed0(S){
  WORLDS[0].items.filter(i=>i.kind==='kana').forEach(i=>S.items[i.id]={s:4,ok:5,ko:0});
  [...'がぎぐげご'].forEach(k=>S.items[k]={s:3,ok:3,ko:0});S.seeded=true;save()}

export const core=w=>w.items.filter(i=>i.kind==='kana'||w.id>=5);
// 'Dominado' = nivel 4+: exige haber acertado en un día distinto al del aprendizaje inicial
export const frac=(w,min=4)=>{const c=core(w);return c.filter(i=>rec(i.id).s>=min).length/c.length};
// Un mundo abierto nunca se vuelve a cerrar
export const unlocked=w=>{if(w.id===1)return true;const S=get();if(S.open[w.id])return true;if(frac(WORLDS[w.id-2])>=.8){S.open[w.id]=1;save();return true}return false};
export const due=()=>unl().flatMap(w=>core(w)).filter(i=>{const r=rec(i.id);return r.ok+r.ko>0&&(r.d??0)<=today()&&r.s<5});
export const unl=()=>WORLDS.filter(unlocked);
export const allK=()=>unl().flatMap(w=>w.items).filter(i=>i.kind==='kana');
export const sim=id=>{const me=IT[id];return [...new Set(SIM.filter(g=>[...g].includes(id)).flatMap(g=>[...g]))].filter(c=>c!==id&&IT[c]&&IT[c].r[0]!==me.r[0]).map(c=>IT[c])};

// Confusiones registradas "objetivo>elegido"
export function topConf(){const ids=new Set(allK().map(i=>i.id));
  return Object.entries(get().conf).filter(([k,n])=>n>=2&&k.split('>').every(x=>ids.has(x))).sort((a,b)=>b[1]-a[1]).map(([k,n])=>({a:k.split('>')[0],b:k.split('>')[1],n}))}
const cb=id=>Object.entries(get().conf).reduce((t,[k,n])=>k.split('>').includes(id)?t+n:t,0);
// Menos dominio, más errores y más confusiones => aparece más. Lo dominado casi no sale.
// Menos dominio, errores, confusiones y repaso vencido => más peso. Lo dominado y no vencido casi no sale. La lentitud solo suma un poco (nunca define el dominio).
const wt=i=>{const r=rec(i.id),dv=(r.d??0)<=today();return 1+(5-r.s)*1.5+Math.min(cb(i.id),5)*1.5+(r.ok+r.ko===0?2:0)+(r.s>=3&&dv?2:0)-(r.s>=3&&!dv?.8:0)+(r.t>6000?1:0)};
const recent=[];
export function pick(items,avoid=[]){
  let c=items.filter(i=>!recent.includes(i.id)&&!avoid.includes(i.id));if(!c.length)c=items;
  let x=Math.random()*c.reduce((t,i)=>t+wt(i),0),it=c[c.length-1];
  for(const i of c){x-=wt(i);if(x<=0){it=i;break}}
  recent.push(it.id);if(recent.length>5)recent.shift();return it}
// 70% contenido del mundo, 30% repaso de mundos anteriores
export function poolFor(w,kind){
  const main=w==='all'?unl().flatMap(x=>x.items):WORLDS[w-1].items;
  const rev=w==='all'?[]:unl().filter(x=>x.id<w).flatMap(x=>x.items);
  const f=a=>kind?a.filter(i=>i.kind===kind):a;
  const r=f(rev),m=f(main);return (r.length&&Math.random()<.3)?r:(m.length?m:allK())}

const label=x=>x.kind==='word'?x.es:x.r[0];
const script=id=>/^[ぁ-ゟ]/.test(id);
function distract(it,n){
  let d=[];
  if(it.kind==='kana'){d=shuffle(sim(it.id)).slice(0,2);
    d=d.concat(shuffle(allK().filter(x=>x.id!==it.id&&script(x.id)===script(it.id)))).filter(x=>label(x)!==label(it)).filter((x,i,a)=>a.findIndex(y=>label(y)===label(x))===i).slice(0,n-1)}
  else d=shuffle(unl().flatMap(w=>w.items).filter(x=>x.kind===it.kind&&x.id!==it.id&&label(x)!==label(it))).slice(0,n-1);
  return d}
const vr=a=>a.reduce((acc,i)=>acc.flatMap(p=>i.r.map(r=>p+r)),['']);
export const norm=s=>s.toLowerCase().replace(/[\s'\-]/g,'');

const sm=t=>`<span style="display:block;font-size:clamp(1.6rem,6vw,2.6rem)">${t}</span>`;
export function makeQ(mode,w,kind){const q=mk(mode,w,kind);curMode=q.mode;t0=Date.now();return q}
function mk(mode,w,kind){
  if(w===6){if(mode==='mix')mode=Math.random()<.65?'quick':'build';else if(mode==='read'||mode==='combat')mode='quick'}
  if(mode==='mix'){const r=Math.random();mode=topConf().length&&r<.25?'combat':r<.6?'quick':r<.85?'read':'build'}
  if(mode==='combat'){
    const ids=new Set(allK().map(i=>i.id)),tc=topConf();let a,b;
    if(tc.length&&Math.random()<.7){const c=tc[rnd(Math.min(3,tc.length))];a=IT[c.a];b=IT[c.b]}
    else{const base=allK().filter(i=>sim(i.id).some(x=>ids.has(x.id)));if(base.length){a=pick(base);b=shuffle(sim(a.id).filter(x=>ids.has(x.id)))[0]}}
    if(a&&b){const t=Math.random()<.5?a:b;
      return{mode:'combat',it:t,big:t.r[0],sub:'¿Cuál de estos es?',opts:shuffle([a,b]).map(x=>({label:x.jp,id:x.id,ok:x===t,glyph:1}))}}
    mode='quick'}
  if(mode==='build'){const k=w===6?'dlg':'word',ok=i=>i.kind===k&&i.syl.length>1;let ws=poolFor(w,k).filter(ok);if(!ws.length)ws=unl().flatMap(x=>x.items).filter(ok);const it=pick(ws);
    let sh=shuffle(it.syl);if(sh.length>1&&sh.join('')===it.syl.join(''))sh=sh.reverse();
    return{mode:'build',it,big:it.kind==='dlg'?sm(it.es):it.es,sub:(it.kind==='dlg'?'Ordená las palabras · ':'Ordená las sílabas · ')+it.r[0],shuf:sh}}
  if(mode==='read'){const base=poolFor(w,kind),cand=base.filter(i=>i.kind!=='part'),pool=cand.length?cand:allK();
    const it=pick(pool),its=[it];
    if(it.kind==='kana'){const s=rec(it.id).s,L=s>=4?3:s>=3?2:1,ks=pool.filter(i=>i.kind==='kana');for(let k=1;k<L&&ks.length>1;k++)its.push(pick(ks))}
    return{mode:'read',it,its,big:its.map(i=>i.jp).join(''),sub:'Escribí la lectura en romaji',ans:vr(its)}}
  const it=pick(poolFor(w,kind));
  if(it.kind==='dlg'){const o=shuffle(unl().flatMap(x=>x.items).filter(x=>x.kind==='dlg'&&x!==it));
    if(Math.random()<.5)return{mode:'quick',it,big:sm(it.jp),sub:'¿Qué significa?',opts:shuffle([it,...o.slice(0,3)]).map(x=>({label:x.es,ok:x===it}))};
    return{mode:'quick',it,big:sm(it.jp),sub:'¿Qué respondés?',opts:shuffle([it,...o.slice(0,3)]).map(x=>({label:x.reply,ok:x===it}))}}
  if(it.kind==='part'){const ps=shuffle([...'はがをのにでと'].filter(p=>p!==it.ans)).slice(0,3);
    return{mode:'quick',it,big:it.jp,sub:'¿Qué partícula falta?',opts:shuffle([it.ans,...ps]).map(p=>({label:p,ok:p===it.ans}))}}
  return{mode:'quick',it,big:it.jp,sub:it.kind==='word'?'¿Qué significa?':'¿Cómo se lee?',
    opts:shuffle([it,...distract(it,4)]).map(x=>({label:label(x),id:x.id,ok:x===it}))}}

export const day=()=>{const S=get(),t=new Date().toLocaleDateString('sv');if(S.day.d!==t)S.day={d:t,correct:0,sessions:0,streak:0,paid:{}};return S.day};
export const MISSIONS=[{k:'correct',n:20,xp:60,t:'Acertar 20 respuestas'},{k:'sessions',n:2,xp:50,t:'Completar 2 sesiones'},{k:'streak',n:8,xp:40,t:'Lograr una racha de 8'}];
export const ACH=[
 {id:'a1',t:'Primer paso',d:'Responder una vez',f:S=>S.tot>=1},{id:'a2',t:'Racha 10',d:'10 aciertos seguidos',f:S=>S.best>=10},
 {id:'a3',t:'Racha 25',d:'25 aciertos seguidos',f:S=>S.best>=25},{id:'a4',t:'Centenario',d:'100 aciertos',f:S=>S.ok>=100},
 {id:'a5',t:'Medio millar',d:'500 aciertos',f:S=>S.ok>=500},{id:'a6',t:'Maestro del dakuten',d:'80% del Mundo 2',f:()=>frac(WORLDS[1])>=.8},
 {id:'a7',t:'Sonidos dobles',d:'80% del Mundo 3',f:()=>frac(WORLDS[2])>=.8},{id:'a8',t:'Katakana',d:'80% del Mundo 4',f:()=>frac(WORLDS[3])>=.8},
 {id:'a9',t:'Examinado',d:'Examen final ≥ 90%',f:S=>S.bestExam>=90},{id:'a10',t:'Nivel 5',d:'Llegar al nivel 5',f:S=>level(S.xp)>=5},
 {id:'a11',t:'Hablante',d:'Dominar el Mundo 5',f:()=>frac(WORLDS[4])>=.8}];

const PEN={mastery:2,xp:5}; // castigo por error: bajar para suavizar, subir para endurecer
export function grade(its,ok,conf){
  const S=get(),d=day();
  const td=today(),ms=Math.min(15000,Date.now()-t0);
  its.forEach(i=>{const r=S.items[i.id]=S.items[i.id]||{s:0,ok:0,ko:0};
    if(ok){r.ok++;
      // Hasta nivel 3 se sube en la misma sesión; de ahí en adelante solo si el repaso ya venció (consolidación real)
      if(r.s<3||(r.d??0)<=td){r.s=Math.min(5,r.s+1);r.d=td+INT[r.s]}
      if(its.length===1&&(curMode==='quick'||curMode==='combat'))r.t=r.t?Math.round(r.t*.7+ms*.3):ms}
    else{r.ko++;r.s=Math.max(0,r.s-PEN.mastery);r.d=td}
    r.l=td});
  S.tot++;
  if(ok){S.ok++;S.streak++;S.best=Math.max(S.best,S.streak);d.correct++;d.streak=Math.max(d.streak,S.streak)}else S.streak=0;
  if(conf)S.conf[conf]=(S.conf[conf]||0)+1;
  const g=ok?10+Math.min(S.streak,10):-PEN.xp;S.xp=Math.max(0,S.xp+g);save();return g}
export function endSession(s){
  const S=get(),d=day();d.sessions++;let pct=null;
  S.hist=S.hist||[];S.hist.push({d:today(),m:s.mode,n:s.n,ok:s.ok});if(S.hist.length>90)S.hist.shift();
  if(s.mode==='exam'){pct=Math.round(s.ok/Math.max(1,s.n)*100);S.exams++;S.bestExam=Math.max(S.bestExam,pct);if(pct>=90)S.xp+=100}
  const msgs=[];
  MISSIONS.forEach(m=>{if(d[m.k]>=m.n&&!d.paid[m.k]){d.paid[m.k]=1;S.xp+=m.xp;msgs.push(`Misión cumplida: ${m.t} (+${m.xp} XP)`)}});
  ACH.forEach(a=>{if(!S.ach[a.id]&&a.f(S)){S.ach[a.id]=1;msgs.push(`Medalla: ${a.t}`)}});
  save();return{msgs,pct}}
export function explain(q,picked){
  const it=q.it;let t;
  if(q.mode==='build')t=`${it.jp} (${it.r[0]}) = ${it.es}. ${it.note}`;
  else if(it.kind==='part')t=`${it.ans} → ${it.rd}: «${it.es}». ${it.note}`;
  else if(it.kind==='dlg')t=`${it.jp} («${it.r[0]}») = ${it.es}. Respuesta típica: ${it.reply} («${it.replyR}») = ${it.replyEs} ${it.note}`;
  else if(it.kind==='word')t=`${it.jp} se lee «${it.r[0]}»: ${it.es}. ${it.note}`;
  else if(q.its&&q.its.length>1)t=q.its.map(i=>`${i.jp}=${i.r[0]}`).join(' · ')+'.';
  else t=`${it.jp} se lee «${it.r[0]}». ${TIPS[it.id]||''}`;
  const p=IT[picked];if(p&&p.kind==='kana'&&it.kind==='kana'&&p.id!==it.id)t+=` Lo confundiste con ${p.jp} («${p.r[0]}»): fijate en la forma.`;
  return t}
function adv0(){
  const c=topConf()[0];if(c)return `Te cuesta ${c.a} vs ${c.b}. Armé combates para eso: probá «Entrenar».`;
  const nx=WORLDS.find(w=>!unlocked(w));
  return nx?`Dominá el 80% de «${WORLDS[nx.id-2].n}» para abrir «${nx.n}». Sin apuro: primero reconocer, después velocidad.`:'Todos los mundos abiertos. Repasá con el examen final.'}

export function advice(){const n=due().length;return adv0()+(n?` Hoy hay ${n} para repasar: «Entrenar» los prioriza.`:'')}
