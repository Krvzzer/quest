// Pantallas y minijuegos. Toda la lógica de decisión vive en engine.js.
import {WORLDS} from './data.js';
import {get,reset} from './store.js';
import * as E from './engine.js';

const $=s=>document.querySelector(s),app=$('#app');
const bar=p=>`<i class="bar" style="--p:${Math.round(p*100)}%"></i>`;
let S=null,tm=null,cur=1;

const MODES=[
  ['mix','Entrenar','Mezcla adaptativa'],
  ['quick','Reconocimiento rápido','Elegí la pronunciación'],
  ['read','Lectura libre','Escribí en romaji'],
  ['combat','Combate','Kana parecidos'],
  ['build','Construir palabras','Ordená sílabas'],
  ['survival','Supervivencia','3 vidas, tiempo límite'],
  ['memory','Memoria visual','Uní kana y sonido']
];

const LEGEND=[
  ['s0','Sin práctica'],
  ['s1','Inicial'],
  ['s2','En camino'],
  ['s3','Avanzado'],
  ['s4','Casi listo'],
  ['s5','Dominado']
];

export function init(){
  const p=$('.petals');
  for(let i=0;i<8;i++){
    const s=document.createElement('span');
    s.textContent='🌸';
    s.style.cssText=`left:${i*13+3}%;animation-delay:${-i*2.3}s;animation-duration:${16+i%3*4}s`;
    p.append(s);
  }
  initRadio();
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
      reset:()=>{if(confirm('¿Borrar TODO tu progreso? No se puede deshacer.')){reset();E.seed();map()}},
      radioreset:resetRadio
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
  $('#top').innerHTML=`<button class="brand" data-a="go:map">🦊 <b>Nippon Quest</b></button><div class="lvl">Nv ${L}${bar(E.xpIn(s.xp))}<small>${s.xp} XP</small></div><nav><button data-a="go:map">Mapa</button><button data-a="go:stats">Progreso</button></nav>`;
}

const view=h=>{clearInterval(tm);header();app.innerHTML=h;window.scrollTo(0,0)};

export function map(){
  S=null;const d=E.day();
  const ws=WORLDS.map(w=>{
    const u=E.unlocked(w),f=E.frac(w);
    return`<button class="world${u?'':' lock'}" ${u?`data-a="world:${w.id}"`:'disabled'}><span class="wi">${u?w.e:'🔒'}</span><b>${w.n}</b><small>${u?w.d:'Dominá el 80% del mundo anterior'}</small>${bar(f)}<em>${Math.round(f*100)}%</em></button>`;
  }).join('');
  const ms=E.MISSIONS.map(m=>`<li class="${d.paid[m.k]?'done':''}">${m.t}<span>${Math.min(d[m.k],m.n)}/${m.n}</span></li>`).join('');
  view(`<section class="kiko"><div class="fox">🦊</div><p>${E.advice()}</p></section>
  <h2>Mundos</h2><div class="worlds">${ws}</div>
  <div class="two"><section class="panel"><h3>Misiones de hoy</h3><ul class="missions">${ms}</ul></section>
  <section class="panel"><h3>Desafíos generales</h3><div class="stack"><button class="btn" data-a="play:exam:all">Examen final (20)</button><button class="btn alt" data-a="play:survival:all">Supervivencia</button></div></section></div>`);
}

function world(id){
  cur=id;const w=WORLDS[id-1],ms=MODES.filter(m=>id<5||!['combat','memory'].includes(m[0]));
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
  else if(q.mode==='read')body=`<div class="row"><input id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="romaji"><button class="btn" data-a="chk">Comprobar</button></div>`;
  else body=`<div class="built" id="built"></div><div class="opts syl">${q.shuf.map((s,i)=>`<button class="opt glyph" data-a="syl:${i}">${s}</button>`).join('')}</div><button class="btn alt" data-a="clr">Borrar</button>`;
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
  $('#fb').innerHTML=`<div class="fb ${ok?'good':'bad'}"><b>${ok?'¡Bien! +'+g+' XP':'Todavía no. '+g+' XP'}</b><p>${E.explain(S.q,x.picked)}</p><button class="btn" data-a="next">Seguir</button></div>`;
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
  <div class="row"><button class="btn" data-a="play:${S.mode}:${S.w}">Otra vez</button><button class="btn alt" data-a="go:map">Mapa</button></div></section>`;
  S=null;
}

function stats(){
  S=null;const s=get(),acc=s.tot?Math.round(s.ok/s.tot*100):0;
  const errs=Object.entries(s.items).filter(([,r])=>r.ko>0).sort((a,b)=>b[1].ko-a[1].ko).slice(0,8).map(([k,r])=>`<span class="chip s${r.s}" title="${r.ko} errores">${k.replace('w:','')}<sup>${r.ko}</sup></span>`).join('')||'<small class="muted">Sin errores registrados.</small>';
  const cf=Object.entries(s.conf).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,n])=>`<li>${k.split('>').join(' ≠ ')}<span>${n}×</span></li>`).join('')||'<small class="muted">Aún no hay confusiones registradas.</small>';
  view(`<h2>Progreso</h2><div class="kpis"><div><b>${acc}%</b>precisión</div><div><b>${s.tot}</b>respuestas</div><div><b>${s.best}</b>mejor racha</div><div><b>${E.level(s.xp)}</b>nivel</div></div>
  <div class="two"><section class="panel"><h3>Errores frecuentes</h3><div class="chips">${errs}</div></section><section class="panel"><h3>Confusiones</h3><ul class="missions">${cf}</ul></section></div>
  <h3>Dominados y pendientes</h3>${WORLDS.map(w=>`<section class="panel"><h4>${w.e} ${w.n} · ${Math.round(E.frac(w)*100)}%</h4>${E.unlocked(w)?chips(w):'<small class="muted">Bloqueado</small>'}</section>`).join('')}
  <h3>Medallas</h3><div class="medals">${E.ACH.map(a=>`<div class="m ${s.ach[a.id]?'on':''}"><b>${s.ach[a.id]?'🏅':'⚪'} ${a.t}</b><small>${a.d}</small></div>`).join('')}</div>
  <p><button class="btn ghost" data-a="reset">Reiniciar progreso</button></p>`);
}

// Nippon Radio: reproductor persistente e independiente de las pantallas.
const DEFAULT_RADIO = 'https://www.youtube.com/watch?v=1Tl2FtV06qo';
const RADIO_KEY = 'nipponQuestRadioUrl';

function radioVideoId(value) {
  try {
    const url = new URL(value.trim());
    let id = '';

    if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) {
      id = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (url.hostname.includes('youtube.com')) {
      id = url.searchParams.get('v') || '';
      if (!id) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live'].includes(parts[0])) {
          id = parts[1] || '';
        }
      }
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function setRadio(value) {
  const id = radioVideoId(value);
  const frame = $('#radioFrame');
  const input = $('#radioUrl');
  const status = $('#radioStatus');
  const link = $('#radioFallback');

  if (!id) {
    if (status) status.textContent = 'Ese enlace no parece ser un video válido de YouTube.';
    return;
  }

  const cleanUrl = `https://www.youtube.com/watch?v=${id}`;

  if (frame) {
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?controls=1&playsinline=1&rel=0`;
  }

  if (input) input.value = cleanUrl;
  if (link) link.href = cleanUrl;
  if (status) status.textContent = 'Radio lista. Tocá reproducir para escuchar.';

  try {
    localStorage.setItem(RADIO_KEY, cleanUrl);
  } catch (error) {
    console.warn('[Nippon Radio] No se pudo guardar la preferencia:', error);
  }
}

function resetRadio() {
  setRadio(DEFAULT_RADIO);
}

function initRadio() {
  const root = $('#radio');
  if (!root) return;

  root.innerHTML = `
    <details class="radio">
      <summary>
        <span class="radio-icon">♫</span>
        <span><b>Nippon Radio</b><small>Un espacio para estudiar</small></span>
        <span class="radio-arrow">⌄</span>
      </summary>

      <div class="radio-content">
        <div class="radio-player">
          <iframe
            id="radioFrame"
            title="Nippon Radio - YouTube"
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen>
          </iframe>
        </div>

        <form id="radioForm" class="radio-settings">
          <label for="radioUrl">Enlace de YouTube</label>
          <input
            id="radioUrl"
            name="url"
            type="url"
            placeholder="Pegá un enlace de YouTube"
            autocomplete="url"
            required>
          <div class="radio-actions">
            <button class="radio-save" type="submit">Guardar enlace</button>
            <button class="radio-reset" type="button" data-a="radioreset">
              Restaurar original
            </button>
          </div>
          <p id="radioStatus" role="status">Radio lista.</p>
          <a id="radioFallback"
             href="https://www.youtube.com/watch?v=1Tl2FtV06qo"
             target="_blank"
             rel="noopener noreferrer">
            Abrir video en YouTube ↗
          </a>
        </form>
      </div>
    </details>
  `;

  const form = $('#radioForm');
  form.addEventListener('submit', event => {
    event.preventDefault();
    setRadio($('#radioUrl').value);
  });

  let saved = DEFAULT_RADIO;

  try {
    saved = localStorage.getItem(RADIO_KEY) || DEFAULT_RADIO;
  } catch (error) {
    console.warn('[Nippon Radio] No se pudo leer la preferencia:', error);
  }

  setRadio(saved);
}