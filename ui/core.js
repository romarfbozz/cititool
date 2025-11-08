/* ========== core.js — единое ядро CT.* для всех страниц ========== */
window.CT = (() => {
  // --- mini event bus
  const bus = {};
  function on(ev, fn){ (bus[ev] ||= []).push(fn) }
  function off(ev, fn){ bus[ev] = (bus[ev]||[]).filter(f=>f!==fn) }
  function emit(ev, payload){ (bus[ev]||[]).forEach(f=>f(payload)) }

  // --- storage + utils
  const now = () => new Date().toISOString();
  const load = (k, def) => { try{ return JSON.parse(localStorage.getItem(k)) ?? def }catch{ return def } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const id = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
  const debounce = (fn,ms=250)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms) } };
  const el = (html) => { const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild }
  const html = (node, s) => (node.innerHTML = s, node);
  async function copy(text){ await navigator.clipboard.writeText(text); toast('Скопировано') }

  // --- categories per domain
  const CAT_KEYS = { docs:'CT_DOC_CATS_V1', tools:'CT_TOOL_CATS_V1', programs:'CT_PROG_CATS_V1' };
  function catList(domain){ return load(CAT_KEYS[domain], ['Allgemein']) }
  function catEnsure(domain, name){
    let arr = catList(domain);
    if(!arr.includes(name)){ arr = [...arr, name]; save(CAT_KEYS[domain], arr); emit(`cats:${domain}`, arr) }
    return arr;
  }
  function catRemove(domain, name, {reassignTo='Allgemein', beforeRemove}={}){
    let arr = catList(domain);
    if(name==='Allgemein') return toast('Нельзя удалить «Allgemein»','warn');
    const usedCount = countUsage(domain, name);
    if(beforeRemove && beforeRemove(usedCount)===false) return;
    arr = arr.filter(x=>x!==name); save(CAT_KEYS[domain], arr); reassignAll(domain, name, reassignTo); emit(`cats:${domain}`, arr);
  }
  function countUsage(domain, name){
    if(domain==='docs'){ return (load('CT_DOCS_V1',[])).filter(d=>d.category===name).length }
    if(domain==='tools'){ return (load('CT_TOOLS_V1',[])).filter(d=>d.category===name).length }
    if(domain==='programs'){ return (load('CT_PROGS_V1',[])).filter(d=>d.category===name).length }
    return 0;
  }
  function reassignAll(domain, from, to){
    const key = domain==='docs'?'CT_DOCS_V1':domain==='tools'?'CT_TOOLS_V1':'CT_PROGS_V1';
    const arr = load(key,[]).map(x=> x.category===from ? {...x, category:to, updatedAt:now()} : x );
    save(key, arr);
  }
  const tags = { split: s => (s||'').split(',').map(x=>x.trim()).filter(Boolean) };

  // --- modal/sheet/toast
  const $modal = el(`<div class="ct-modal"><div class="panel"><div class="content"></div><div class="footer" style="margin-top:12px;display:flex;gap:10px;justify-content:flex-end"></div></div></div>`);
  const $sheet = el(`<div class="ct-sheet"><div class="panel"><div class="content"></div></div></div>`);
  const $toast = el(`<div class="ct-toast"></div>`);
  document.addEventListener('DOMContentLoaded', ()=>{ document.body.append($modal,$sheet,$toast) });

  function modalOpen({title, contentEl, footer=[], wide}){
    const panel = $modal.querySelector('.panel');
    panel.style.maxWidth = wide ? '92vw' : '720px';
    const c = $modal.querySelector('.content');
    c.innerHTML = '';
    c.append(el(`<div style="font-weight:700;font-size:18px;margin-bottom:10px">${title||''}</div>`));
    c.append(contentEl);
    const f = $modal.querySelector('.footer'); f.innerHTML='';
    footer.forEach(b=>{
      const btn = el(`<button class="btn ${b.kind||''}">${b.label}</button>`);
      btn.onclick = ()=> b.onClick && b.onClick(()=>modalClose());
      f.append(btn);
    });
    $modal.classList.add('on');
    $modal.onclick = (e)=>{ if(e.target===$modal) modalClose() };
  }
  function modalClose(){ $modal.classList.remove('on') }
  function sheetOpen({contentEl}){ const c=$sheet.querySelector('.content'); c.innerHTML=''; c.append(contentEl); $sheet.classList.add('on'); $sheet.onclick=(e)=>{ if(e.target===$sheet) $sheet.classList.remove('on') } }
  function toast(msg, kind='ok'){
    $toast.textContent = msg; $toast.style.borderColor = {'ok':'#3bd671','warn':'#ffb020','err':'#ff5964'}[kind]||'var(--hair)';
    $toast.classList.add('on'); setTimeout(()=> $toast.classList.remove('on'), 1600);
  }
  async function confirm({title,msg,ok='OK',cancel='Abbrechen'}){
    return new Promise(res=>{
      modalOpen({
        title, contentEl: el(`<div>${msg||''}</div>`),
        footer:[
          {label:cancel, kind:'ghost', onClick:close=>{ close(); res(false) }},
          {label:ok, kind:'ok', onClick:close=>{ close(); res(true) }},
        ]
      });
    });
  }

  // --- uploader/search/progress
  const uploader = {
    accept({accept, multiple=false, to='dataURL'}){
      return new Promise(res=>{
        const inp = Object.assign(document.createElement('input'), {type:'file', accept, multiple});
        inp.onchange = async () => {
          const files = Array.from(inp.files||[]);
          if(to==='blob') return res(files);
          const out = [];
          for(const f of files){
            out.push({ name:f.name, type:f.type, dataUrl: await new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(f) }) });
          }
          res(out);
        };
        inp.click();
      });
    }
  }
  function attachSearch(inputEl, {onQuery}){ inputEl.addEventListener('input', debounce(()=> onQuery?.(inputEl.value.trim()), 250)) }
  function progress({value=0,max=100,showLabel=true}){ const p=el(`<div class="card"><div style="height:10px;border-radius:8px;background:#1b2430;overflow:hidden"><div style="height:10px;background:linear-gradient(90deg,#5cc8ff,#3bd671);width:${(value/max*100)|0}%"></div></div>${showLabel?`<div class="hint" style="margin-top:6px">${(value/max*100).toFixed(0)}%</div>`:''}</div>`); return p }

  // --- AppBar + Dock (ЕДИНЫЕ для всех страниц)
  function appbar({title, subtitle, actions=[], search}){
    const bar = document.querySelector('.ct-bar');
    bar.innerHTML = '';
    bar.append(el(`<div class="title">${title||''}</div>`));
    if(subtitle) bar.append(el(`<div class="subtitle">${subtitle}</div>`));
    bar.append(el(`<div class="sp"></div>`));
    if(search){
      const s = el(`<div class="search"><span class="ct-kbd">⌕</span><input type="search" placeholder="Search…" /></div>`);
      attachSearch(s.querySelector('input'), {onQuery:search.onQuery});
      bar.append(s);
    }
    actions.forEach(a=>{
      const b = el(`<button class="action">${a.icon||''}<span>${a.label}</span></button>`); b.onclick=a.onClick; bar.append(b);
    });
  }
  function dock(activeId){
    const items = [
      {id:'dash', label:'Dashboard', href:'./index.html'}, 
      {id:'setup', label:'Setup', href:'./setup.html'},
      {id:'tools', label:'Tools', href:'./tools.html'},
      {id:'docs',  label:'Docs',  href:'./docs.html'},
      {id:'import',label:'Import',href:'./prog-import.html'},
    ];
    const d = document.querySelector('.ct-dock'); d.innerHTML = `<div class="dock-inner"></div>`;
    const wrap = d.querySelector('.dock-inner');
    items.forEach(it=>{
      const a = el(`<a href="${it.href}" class="${it.id===activeId?'active':''}"><div>${it.label}</div></a>`);
      wrap.append(a);
    })
  }

  // --- Migration/backup basic stubs
  function migrate(steps=[]){ steps.forEach(s=>{ const cur = load(s.key); if(cur && s.from && s.to && cur.version===s.from){ const next = s.up(cur); next.version=s.to; save(s.key,next) }}) }
  function backup(){
    const keys=[ 'CT_DOCS_V1','CT_DOC_CATS_V1','CT_TOOLS_V1','CT_TOOL_CATS_V1','CT_PROGS_V1','CT_LIVE_V1','CT_PROD_V1','CT_CHECK_V1' ];
    const out={ ts: now(), data:{} }; keys.forEach(k=> out.data[k]=load(k,null));
    const blob = new Blob([JSON.stringify(out,null,2)], {type:'application/json'});
    const a = Object.assign(document.createElement('a'), {href:URL.createObjectURL(blob), download:'citi_backup.json'}); a.click();
    toast('Backup создан');
  }
  async function restore(obj){
    if(!(await confirm({title:'Восстановить из backup?', msg:'Текущие данные будут заменены'}))) return;
    Object.entries(obj.data||{}).forEach(([k,v])=> save(k, v));
    toast('Данные восстановлены'); location.reload();
  }

  // --- Page bootstrap (ЕДИНЫЙ для всех страниц)
  function initPage({title, subtitle, active, search, actions=[]}){
    const shell = document.createElement('div');
    shell.innerHTML = `
      <div class="ct-bar"></div>
      <div class="ct-app"><div class="ct-inner" id="page"></div></div>
      <div class="ct-dock"></div>
    `;
    document.body.prepend(shell.children[0], shell.children[1], shell.children[2]);
    appbar({title, subtitle, search, actions});
    dock(active);
    return document.getElementById('page');
  }

  return {
    // bus
    on, off, emit,
    // storage
    load, save, now,
    migrate, backup, restore,
    // ui
    appbar, dock, modal:{open:modalOpen, close:modalClose}, sheet:{open:sheetOpen}, toast, confirm,
    uploader, search:{attach:attachSearch}, progress,
    // categories/tags
    cats:{ list:catList, ensure:catEnsure, remove:catRemove }, tags,
    // helpers
    id, debounce, el, html, copy,
    // page init
    initPage,
  }
})();