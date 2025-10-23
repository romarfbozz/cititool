/* =======================================================
   CitiTool Core Framework v1.2
   Универсальное ядро UI + Storage + Seed
   ======================================================= */

const CT = window.CT = {};

/* ---------- Storage API ---------- */
CT.storage = {
  read(k, def){ try { return JSON.parse(localStorage.getItem(k)) ?? def } catch { return def }},
  write(k, v){ localStorage.setItem(k, JSON.stringify(v)) },
  clear(k){ localStorage.removeItem(k) }
};

/* ---------- Ключи ---------- */
CT.CT_KEYS = {
  TOOLS: 'ct_tools_v2',
  CATS:  'ct_cats_v1',
  PROGS: 'ct_progs_v2',
  SETUP: 'ct_setup_live',
  DOCS:  'ct_docs_v3',
  DASH:  'ct_dash_v1'
};

/* ---------- Splash ---------- */
CT.splash = ({logo=':ct', ms=800}={})=>{
  const badge = `<span class="ct-badge lg">CT</span>`;
  const html = logo && logo!==':ct'
    ? `<img src="${logo}" style="width:72px;height:72px;border-radius:16px;margin:20px auto;">`
    : badge;
  const el = document.createElement('div');
  el.className='modal show';
  el.innerHTML=`<div class="overlay" style="backdrop-filter:blur(10px)"></div>
    <div class="card" style="text-align:center;padding:24px">
      ${html}<div style="font-weight:800;font-size:18px">CitiTool</div>
      <div class="muted">lädt…</div></div>`;
  document.body.append(el);
  document.body.classList.add('noscroll');
  setTimeout(()=>{ el.remove();document.body.classList.remove('noscroll') },ms);
};

/* ---------- Toast ---------- */
CT.toast = (t, type='info', ms=2000)=>{
  const el = document.createElement('div');
  el.className='toast show';
  el.innerHTML=`<div class="inner ${type}">${t}</div>`;
  document.body.append(el);
  setTimeout(()=>el.remove(), ms);
};

/* ---------- Modal ---------- */
CT.openModal = ({title='', html='', okText='OK', cancelText='Abbrechen', onOk}={})=>{
  const m=document.createElement('div');
  m.className='modal show';
  m.innerHTML=`<div class="overlay"></div>
  <div class="card">
    <h3 style="margin:0 0 12px">${title}</h3>
    <div class="body">${html}</div>
    <div class="footer">
      ${cancelText?`<button class="btn ghost cancel">${cancelText}</button>`:''}
      ${okText?`<button class="btn brand ok">${okText}</button>`:''}
    </div>
  </div>`;
  document.body.append(m);
  document.body.classList.add('noscroll');
  const close=()=>{m.remove();document.body.classList.remove('noscroll')};
  m.querySelector('.overlay').onclick=close;
  m.querySelector('.cancel')?.onclick=close;
  m.querySelector('.ok')?.onclick=()=>{onOk?.();close()};
  document.onkeydown=e=>{if(e.key==='Escape')close()};
};

/* ---------- Drawer ---------- */
CT.openDrawer = ({title='', items=[], html='', onSelect}={})=>{
  const d=document.createElement('div');
  d.className='drawer show';
  const listHTML = html || items.map(i=>`
    <li data-id="${i.id}">
      <span>${i.title}</span>
      ${i.meta?`<small class="muted">${i.meta}</small>`:''}
    </li>`).join('');
  d.innerHTML=`<div class="overlay"></div>
    <div class="panel">
      <div class="hdr"><strong>${title}</strong></div>
      <ul class="list">${listHTML}</ul>
    </div>`;
  document.body.append(d);
  document.body.classList.add('noscroll');
  d.querySelector('.overlay').onclick=()=>{d.remove();document.body.classList.remove('noscroll')};
  d.querySelectorAll('li').forEach(li=>li.onclick=()=>{
    onSelect?.(li.dataset.id);
    d.remove();document.body.classList.remove('noscroll');
  });
};

/* ---------- Seed данных ---------- */
CT.seed = {};

CT.seed.tools = ()=>{
  const demo = [
    {id:'t1', name:'VDI30 Halter Rechts', code:'VDI30-R', cat:'Halter', iso:'', note:'', img:''},
    {id:'t2', name:'ER32 Ø8', code:'ER32-8', cat:'Spannzange', iso:'', note:'', img:''},
    {id:'t3', name:'CNMG120408-PM 4325', code:'CNMG120408-PM', cat:'Wendeschneidplatte', iso:'CNMG120408', note:'', img:''},
    {id:'t4', name:'Bohrer Ø10', code:'DRILL-10', cat:'Bohrer', iso:'', note:'', img:''}
  ];
  CT.storage.write(CT.CT_KEYS.TOOLS, demo);
  return demo;
};

CT.seed.programs = ()=>{
  const progs = [
    {id:'p1', title:'Grundsetup', number:'1001', date:Date.now(), ro:Array(12).fill(null), ru:Array(12).fill(null)}
  ];
  CT.storage.write(CT.CT_KEYS.PROGS, progs);
  return progs;
};

CT.seed.setup = ()=>{
  const setup = {ro:Array(12).fill(null), ru:Array(12).fill(null)};
  CT.storage.write(CT.CT_KEYS.SETUP, setup);
  return setup;
};

/* ---------- ensure seeds ---------- */
CT.ensureSeeds = ()=>{
  let tools=CT.storage.read(CT.CT_KEYS.TOOLS);
  if(!tools || !tools.length) CT.seed.tools();

  let progs=CT.storage.read(CT.CT_KEYS.PROGS);
  if(!progs || !progs.length) CT.seed.programs();

  let setup=CT.storage.read(CT.CT_KEYS.SETUP);
  if(!setup || !setup.ro || !setup.ru) CT.seed.setup();
};

/* ---------- Ready init ---------- */
CT.ready = (cb)=>{
  if(document.readyState!='loading') cb();
  else document.addEventListener('DOMContentLoaded', cb);
};