// Pantallas y minijuegos. Toda la lógica de decisión vive en engine.js.
import {WORLDS} from './data.js';
import {get,reset,exportData,importMerge} from './store.js';
import * as E from './engine.js';
import * as Sync from './sync.js';

const $=s=>document.querySelector(s),app=$('#app');
const KURU_MARK = '<svg class="kuru-mark" viewBox="0 0 64 64" role="img" aria-label="Kuru"><path d="M10 25 17 5 29 17Q32 15 35 17L47 5 54 26Q58 32 55 41 51 55 32 59 13 55 9 41 6 32 10 25Z" fill="#f5ecda"/><path d="m14 23 5-12 7 12M50 23l-5-12-7 12" fill="#eda9c1"/><path d="M20 34q3-3 6 0M38 34q3-3 6 0" fill="none" stroke="#20213a" stroke-width="2.8" stroke-linecap="round"/><path d="M29 41q3 3 6 0" fill="none" stroke="#20213a" stroke-width="2.4" stroke-linecap="round"/><path d="M48 48q9 1 10-7" fill="none" stroke="#eda9c1" stroke-width="4" stroke-linecap="round"/></svg>';
const bar=p=>`<i class="bar" style="--p:${Math.round(p*100)}%"></i>`;
let S=null,tm=null,cur=1;

const MODES=[
  ['mix','そうごうれんしゅう','Práctica adaptativa'],
  ['quick','よみとり','Elegí la pronunciación'],
  ['read','かきとり','Escribí en romaji'],
  ['combat','たいけつ','Kana parecidos'],
  ['build','ことばづくり','Ordená sílabas'],
  ['survival','サバイバル','3 vidas, tiempo límite'],
  ['memory','きおく','Uní kana y sonido']
];
const MODE_NAME=Object.fromEntries([...MODES.map(m=>[m[0],m[1]]),['exam','Examen final']]);

const LEGEND=[
  ['s0','みしゅう'],
  ['s1','しょきゅう'],
  ['s2','れんしゅうちゅう'],
  ['s3','じょうきゅう'],
  ['s4','あと少し'],
  ['s5','しゅうとく']
];

export function init(){
  // La atmósfera nocturna se resuelve con capas de luz CSS.
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-a]');
    if(!b)return;
    const[a,x,y]=b.dataset.a.split(':');
    ({
      go:()=>x==='stats'?stats():map(),
      world:()=>world(+x),
      play:()=>start(x,y==='all'?'all':+y),
      opt:()=>pickOpt(+x),
      next:nextQ,
      chk:chk,
      syl:()=>syl(+x),
      clr:clr,
      exp:doExport,
      imp:doImport,
      dl:doDownload,
      synclogin:()=>syncAct(()=>Sync.login($('#sbEmail').value,$('#sbPassword').value)),
      synclogout:()=>syncAct(()=>Sync.logout()),
      syncnow:()=>syncAct(()=>Sync.syncNow()),
      reset:()=>{if(confirm('¿Borrar TODO tu progreso? No se puede deshacer.')){reset();E.seed();map()}}
    }[a]||(()=>{}))();
  });
  document.addEventListener('keydown',e=>{
    if(!S||S.mode==='memory')return;
    if(e.key==='Enter'){
      const n=$('[data-a="next"]'),c=$('[data-a="chk"]');
      (n||c)&&(e.preventDefault(),(n||c).click());
    }else if(/^[1-4]$/.test(e.key)&&!S.done){
      const o=$(`[data-a="opt:${e.key-1}"]`);
      o&&o.click();
    }
  });
}

function header(){
  const s=get(),L=E.level(s.xp);
  $('#top').innerHTML=`<button class="brand" data-a="go:map">${KURU_MARK}<b>NIPPON QUEST</b></button><div class="lvl"><span>だんい ${L}</span>${bar(E.xpIn(s.xp))}<small>${s.xp} XP</small></div><nav><button data-a="go:map">せかい</button><button data-a="go:stats">きろく</button></nav>`;
}

const view=h=>{clearInterval(tm);header();app.innerHTML=h;window.scrollTo(0,0)};

export function map(){
  S=null;const d=E.day();
  const ws=WORLDS.map(w=>{
    const u=E.unlocked(w),f=E.frac(w);
    return`<button class="world${u?'':' lock'}" ${u?`data-a="world:${w.id}"`:'disabled'}><span class="wi">${u?w.e:'🔒'}</span><b>${w.n}</b><small>${u?w.d:'Dominá el 80% del mundo anterior'}</small>${bar(f)}<em>${Math.round(f*100)}%</em></button>`;
  }).join('');
  const ms=E.MISSIONS.map(m=>`<li class="${d.paid[m.k]?'done':''}">${m.t}<span>${Math.min(d[m.k],m.n)}/${m.n}</span></li>`).join('');
  view(`<section class="kiko"><div class="fox"><img class="kuru-guide" src="./icons/kuru-guide.svg" alt="Kuru, tu guía"></div><p>${E.advice()}</p></section>
  <h2>せかい</h2><div class="worlds">${ws}</div>
  <div class="two"><section class="panel"><h3>きょうのもくひょう</h3><ul class="missions">${ms}</ul></section>
  <section class="panel"><h3>とくべつなれんしゅう</h3><div class="stack"><button class="btn" data-a="play:exam:all">さいしゅうしけん · 20</button><button class="btn alt" data-a="play:survival:all">サバイバル</button><button class="btn alt" data-a="play:mix:all">きょうのふくしゅう</button></div>
  <p class="muted"><b>Examen:</b> 20 preguntas mezcladas de todos los kana que tenés abiertos; con 90% o más ganás un bonus.<br><b>Supervivencia:</b> 3 vidas y tiempo límite; mide cuánto retenés.<br><b>Repaso:</b> Entrenar con todo lo desbloqueado, priorizando lo que toca repasar.</p></section></div>`);
}

function world(id){
  cur=id;const w=WORLDS[id-1],ms=MODES.filter(m=>id===6?!['read','combat','memory'].includes(m[0]):id<5||!['combat','memory'].includes(m[0]));
  const leg=`<div class="legend">${LEGEND.map(([c,t])=>`<span><i class="chip ${c}"></i>${t}</span>`).join('')}</div>`;
  view(`<button class="back" data-a="go:map">← Mapa</button><h2>${w.e} Mundo ${id} · ${w.n}</h2><p class="muted">Tocá un bloque coloreado para ver su lectura. Más color = más dominado.</p>${leg}${chips(w)}
  <div class="modes">${ms.map(m=>`<button class="mode" data-a="play:${m[0]}:${id}"><b>${m[1]}</b><small>${m[2]}</small></button>`).join('')}</div>`);
}

const chips=w=>`<div class="chips">${w.items.filter(i=>i.kind!=='part').map(i=>{const lv=E.rec(i.id).s;return`<span class="chip s${lv}" title="${i.jp} · ${i.r[0]}">${i.jp}</span>`}).join('')}</div>`;

function start(mode,w){
  clearInterval(tm);
  S={mode,w,n:0,max:mode==='exam'?20:mode==='survival'?999:10,ok:0,xp:0,lives:3,done:false,mist:0};
  mode==='memory'?memory():nextQ();
}

function nextQ(){
  if(S.n>=S.max||S.lives<=0)return end();
  const m=S.mode==='exam'?['quick','quick','read','combat'][E.rnd(4)]:S.mode==='survival'?'quick':S.mode;
  S.q=E.makeQ(m,S.w,S.mode==='exam'?'kana':undefined);
  S.done=false;S.pick=[];draw();
  if(S.mode==='survival')tick();
}

function hud(){
  return`<div class="hud"><span>${S.mode==='survival'?'❤'.repeat(S.lives)+' · '+S.ok+' aciertos':`${S.n+1} / ${S.max}`}</span><span>🔥 ${get().streak}</span></div>${S.mode==='survival'?'<i class="bar time" id="tb" style="--p:100%"></i>':''}`;
}

function draw(){
  const q=S.q;let body='';
  if(q.opts)body=`<div class="opts${q.opts[0].glyph?' two':''}">${q.opts.map((o,i)=>`<button class="opt${o.glyph?' glyph':''}" data-a="opt:${i}"><kbd>${i+1}</kbd><span>${o.label}</span><span></span></button>`).join('')}</div>`;
  else if(q.mode==='read')body=`<div class="row"><input id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="romaji を入力"><button class="btn" data-a="chk">かくにん</button></div>`;
  else body=`<div class="built" id="built"></div><div class="opts syl">${q.shuf.map((s,i)=>`<button class="opt glyph" data-a="syl:${i}">${s}</button>`).join('')}</div><button class="btn alt" data-a="clr">けす</button>`;
  app.innerHTML=`${hud()}<section class="card" id="card"><div class="stamp">${WORLDS[(typeof S.w==='number'?S.w:1)-1].e}</div><div class="big${q.mode==='quick'&&q.it.kind==='part'?' long':''}">${q.big}</div><p class="sub">${q.sub}</p>${body}<div id="fb"></div></section>`;
  const a=$('#ans');a&&a.focus();
}

function tick(){
  const T=Math.max(4,9-Math.floor(get().streak/5)),t0=Date.now();
  tm=setInterval(()=>{
    const p=1-(Date.now()-t0)/(T*1000),b=$('#tb');
    b&&b.style.setProperty('--p',Math.max(0,p*100)+'%');
    if(p<=0)answer(false,{});
  },100);
}

function pickOpt(i){
  if(S.done)return;
  const q=S.q,o=q.opts[i];let conf;
  if(!o.ok&&o.id&&q.it.kind==='kana'&&o.id!==q.it.id&&/^[^wp]:/.test(o.id+':'))conf=q.it.id+'>'+o.id;
  answer(o.ok,{conf,picked:o.id,idx:i});
}

function chk(){
  if(S.done)return;
  const v=E.norm($('#ans').value||'');
  if(!v)return;
  answer(S.q.ans.some(a=>E.norm(a)===v),{});
}

function syl(i){
  if(S.done)return;
  const b=$(`[data-a="syl:${i}"]`);
  if(b.disabled)return;
  b.disabled=true;S.pick.push(S.q.shuf[i]);$('#built').textContent=S.pick.join('');
  if(S.pick.length===S.q.shuf.length)answer(S.pick.join('')===S.q.it.syl.join(''),{});
}

function clr(){
  if(S.done)return;
  S.pick=[];$('#built').textContent='';
  document.querySelectorAll('.syl .opt').forEach(b=>b.disabled=false);
}

function answer(ok,x){
  if(S.done)return;
  S.done=true;clearInterval(tm);
  const g=E.grade(S.q.its||[S.q.it],ok,x.conf);
  S.n++;S.xp+=g;ok?S.ok++:S.mist++;
  if(!ok&&S.mode==='survival')S.lives--;
  document.querySelectorAll('.opt').forEach((b,i)=>{
    b.disabled=true;
    if(S.q.opts){S.q.opts[i].ok&&b.classList.add('right');i===x.idx&&!ok&&b.classList.add('wrong')}
  });
  const c=$('#card');c.classList.add(ok?'pop':'shake');
  $('#fb').innerHTML=`<div class="fb ${ok?'good':'bad'}"><b>${ok?'¡Bien! +'+g+' XP':'Todavía no. '+g+' XP'}</b><p>${E.explain(S.q,x.picked)}</p><button class="btn" data-a="next">つぎへ</button></div>`;
  if(ok){c.insertAdjacentHTML('beforeend',`<span class="gain">+${g}</span>`);if(S.mode==='survival')setTimeout(()=>S&&S.done&&$('[data-a="next"]')&&nextQ(),700)}
  const n=$('[data-a="next"]');n&&n.focus();
}

function memory(){
  const base=E.poolFor(S.w,'kana'),pool=base.length>=6?base:E.allK(),set=[];
  for(let t=0;set.length<6&&t<200;t++){const i=E.pick(pool);if(!set.some(s=>s===i||s.r[0]===i.r[0]))set.push(i)}
  const cards=E.shuffle(set.flatMap(i=>[{i,t:'k',x:i.jp},{i,t:'r',x:i.r[0]}]));
  let fl=[],done=0,lock=false;S.max=6;
  app.innerHTML=`<div class="hud"><span>Memoria visual</span><span id="mm">Errores: 0</span></div><section class="card"><p class="sub">Uní cada kana con su sonido.</p><div class="mem">${cards.map((c,k)=>`<button class="mc" data-k="${k}">?</button>`).join('')}</div></section>`;
  document.querySelectorAll('.mc').forEach(b=>b.onclick=()=>{
    const k=+b.dataset.k,c=cards[k];
    if(lock||b.classList.contains('up')||b.classList.contains('ok'))return;
    b.classList.add('up');b.textContent=c.x;fl.push([b,c]);
    if(fl.length<2)return;
    const[[b1,c1],[b2,c2]]=fl;fl=[];
    if(c1.i===c2.i){
      [b1,b2].forEach(z=>z.classList.replace('up','ok'));
      E.grade([c1.i],true);S.xp+=10;S.ok++;
      if(++done===6){S.n=6+S.mist;setTimeout(end,500)}
    }else{
      lock=true;S.mist++;$('#mm').textContent='Errores: '+S.mist;
      setTimeout(()=>{[b1,b2].forEach(z=>{z.classList.remove('up');z.textContent='?'});lock=false},750);
    }
  });
}

function end(){
  clearInterval(tm);const r=E.endSession(S),pct=Math.round(S.ok/Math.max(1,S.n)*100);
  header();
  const ex=r.pct!==null?(r.pct>=90?'¡Examen aprobado! +100 XP de bonus.':'Todavía no llegás al 90%. Los errores ya se sumaron a tu plan de práctica.'):'';
  app.innerHTML=`<section class="card result"><div class="big">${S.mode==='survival'?S.ok:pct+'%'}</div><p class="sub">${S.mode==='survival'?'aciertos antes de quedarte sin vidas':`${S.ok} de ${S.n} correctas`} · ${S.xp} XP</p><p>${ex}</p>${r.msgs.map(m=>`<p class="medal">🏅 ${m}</p>`).join('')}
  <div class="row"><button class="btn" data-a="play:${S.mode}:${S.w}">もういちど</button><button class="btn alt" data-a="go:map">Mapa</button></div></section>`;
  S=null;
}

// Dominio, repaso pendiente, tiempo medio y evolución (datos de engine.js / store.js)
function insights(){
  const s=get(),its=E.unl().flatMap(w=>E.core(w)),m=its.filter(i=>E.rec(i.id).s>=4).length,due=E.due();
  const ts=its.map(i=>E.rec(i.id).t).filter(Boolean),avg=ts.length?(ts.reduce((a,b)=>a+b,0)/ts.length/1000).toFixed(1)+' s':'—';
  const byDay={};(s.hist||[]).forEach(h=>{const o=byDay[h.d]=byDay[h.d]||{n:0,ok:0};o.n+=h.n;o.ok+=h.ok});
  const td=E.today(),days=Object.keys(byDay).map(Number).sort((a,b)=>b-a).slice(0,7).reverse();
  const evo=days.map(d=>{const o=byDay[d];return`<li>${d===td?'Hoy':'Hace '+(td-d)+' d'}<span>${o.n?Math.round(o.ok/o.n*100):0}% · ${o.n} resp.</span></li>`}).join('')||'<small class="muted">Aún no hay sesiones registradas.</small>';
  const hist=(s.hist||[]).slice(-5).reverse().map(h=>`<li>${MODE_NAME[h.m]||h.m}<span>${h.ok}/${h.n}</span></li>`).join('');
  const dueChips=due.slice(0,16).map(i=>`<span class="chip s${E.rec(i.id).s}" title="${i.r[0]}">${i.jp}</span>`).join('')||'<small class="muted">Nada vencido. ¡Buen trabajo!</small>';
  return`<h3>しゅうとくとふくしゅう</h3><div class="kpis"><div><b>${m}/${its.length}</b>dominados</div><div><b>${due.length}</b>para repasar hoy</div><div><b>${avg}</b>reconocimiento medio</div></div>
  <div class="two"><section class="panel"><h3>きょうのふくしゅう</h3><div class="chips">${dueChips}</div></section><section class="panel"><h3>Precisión por día</h3><ul class="missions">${evo}</ul></section></div>${hist?`<section class="panel"><h3>Últimas sesiones</h3><ul class="missions">${hist}</ul></section>`:''}`;
}

// Sincronización online (Supabase). La lógica está en sync.js
const IN='style="width:100%;margin:6px 0;font:inherit;font-size:16px;padding:10px;border-radius:10px"';
const stMsg=t=>{const m=$('#syncst');m&&(m.textContent=t)};
async function syncAct(f){try{await f();stats()}catch(e){stMsg('Error: '+e.message)}}

function syncPanel(){
  if(!Sync.config()){
    return `<h3>Sincronización online</h3>
      <section class="panel">
        <p class="muted">No se encontró una configuración válida de Supabase. Revisá js/supabase-config.js.</p>
      </section>`;
  }

  return `<h3>Sincronización online</h3>
    <section class="panel">
      <p>Estado: <b id="syncst">${Sync.status()}</b></p>
      <p class="muted">Iniciá sesión con la cuenta que creaste en Supabase. Tu progreso se guarda en una cuenta privada.</p>
      <input id="sbEmail" type="email" autocomplete="username"
        ${IN} placeholder="Correo electrónico">
      <input id="sbPassword" type="password" autocomplete="current-password"
        ${IN} placeholder="Contraseña">
      <div class="row">
        <button class="btn" data-a="synclogin">Iniciar sesión y sincronizar</button>
        <button class="btn alt" data-a="synclogout">Cerrar sesión</button>
      </div>
      <div class="row">
        <button class="btn alt" data-a="syncnow">Sincronizar ahora</button>
      </div>
    </section>`;
}

// Sincronización manual: exportar acá, importar en el otro dispositivo (se combinan, no se pisan)
const syncMsg=t=>{const m=$('#syncmsg');m&&(m.textContent=t)};
function doExport(){
  const t=exportData();
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>syncMsg('Progreso copiado. Pegalo en el otro dispositivo (podés mandártelo por WhatsApp o notas).')).catch(()=>{const a=$('#sync');a.value=t;a.select();syncMsg('No pude copiar solo: el texto quedó en la caja, copialo a mano.')});
}
function doDownload(){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([exportData()],{type:'application/json'}));
  a.download='nippon-quest-progreso.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function doImport(){
  try{const r=importMerge($('#sync').value);stats();syncMsg(`Listo: se combinaron ${r.items} caracteres. Ahora hacelo al revés (exportar acá, importar en el otro) para que los dos queden iguales.`)}
  catch(e){syncMsg('No se pudo importar: '+e.message)}
}

function stats(){
  S=null;const s=get(),acc=s.tot?Math.round(s.ok/s.tot*100):0;
  const errs=Object.entries(s.items).filter(([,r])=>r.ko>0).sort((a,b)=>b[1].ko-a[1].ko).slice(0,8).map(([k,r])=>`<span class="chip s${r.s}" title="${r.ko} errores">${k.replace('w:','')}<sup>${r.ko}</sup></span>`).join('')||'<small class="muted">Sin errores registrados.</small>';
  const cf=Object.entries(s.conf).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,n])=>`<li>${k.split('>').join(' ≠ ')}<span>${n}×</span></li>`).join('')||'<small class="muted">Aún no hay confusiones registradas.</small>';
  view(`<h2>きろく</h2><div class="kpis"><div><b>${acc}%</b>precisión</div><div><b>${s.tot}</b>respuestas</div><div><b>${s.best}</b>mejor racha</div><div><b>${E.level(s.xp)}</b>nivel</div></div>
  ${insights()}
  <div class="two"><section class="panel"><h3>Errores frecuentes</h3><div class="chips">${errs}</div></section><section class="panel"><h3>Confusiones</h3><ul class="missions">${cf}</ul></section></div>
  <h3>Dominados y pendientes</h3>${WORLDS.map(w=>`<section class="panel"><h4>${w.e} ${w.n} · ${Math.round(E.frac(w)*100)}%</h4>${E.unlocked(w)?chips(w):'<small class="muted">Bloqueado</small>'}</section>`).join('')}
  <h3>めだる</h3><div class="medals">${E.ACH.map(a=>`<div class="m ${s.ach[a.id]?'on':''}"><b>${s.ach[a.id]?'🏅':'⚪'} ${a.t}</b><small>${a.d}</small></div>`).join('')}</div>
  ${syncPanel()}<h3>Sincronización manual (respaldo)</h3><section class="panel"><p class="muted">Copiá tu progreso acá y pegalo en el otro dispositivo. Se combinan: por cada carácter gana lo practicado más recientemente, y no se pierde nada de ninguno de los dos.</p>
  <div class="row"><button class="btn" data-a="exp">Copiar mi progreso</button><button class="btn alt" data-a="dl">Descargar copia</button></div>
  <textarea id="sync" rows="3" placeholder="Pegá acá el progreso del otro dispositivo" style="width:100%;margin:10px 0;font:inherit;font-size:16px;padding:10px;border-radius:10px;min-height:72px"></textarea>
  <div class="row"><button class="btn" data-a="imp">Importar y combinar</button></div><p class="muted" id="syncmsg"></p></section>
  <p><button class="btn ghost" data-a="reset">Reiniciar progreso</button></p>`);
}