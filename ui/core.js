===== FILE: /ui/core.js =====
/* CitiTool Core — единый API */
window.CT = (function(){
  const $ = (sel, root=document)=>root.querySelector(sel);
  const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));
  const CT_KEYS = {
    TOOLS:'ct_tools_v2', CATS:'ct_cats_v1', SETUP:'ct_setup_live',
    PROGS:'ct_programs_v1', DASH:'ct_dash_v1', DOCS:'ct_docs_v3'
  };
  const state = { toastTimer:null };

  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function uid(){ return Math.random().toString(36).slice(2,9); }
  function escapeHTML(s){ return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

  // Storage
  const storage = {
    read:(k, def)=>{ try{ const v=JSON.parse(localStorage.getItem(k)); return (v===null||v===undefined)?def:v; }catch(e){ return def; } },
    write:(k,v)=>localStorage.setItem(k, JSON.stringify(v)),
    clear:(k)=>localStorage.removeItem(k)
  };

  // Seeds
  function ensureSeeds(){
    if(!storage.read(CT_KEYS.CATS)){ storage.write(CT_KEYS.CATS, [{id:uid(), title:'Halter'},{id:uid(), title:'Platten'},{id:uid(), title:'Bohrer'}]); }
    if(!storage.read(CT_KEYS.TOOLS)){
      const cats = storage.read(CT_KEYS.CATS, []);
      const idH = cats.find(c=>c.title==='Halter')?.id || cats[0]?.id;
      const idP = cats.find(c=>c.title==='Platten')?.id || cats[1]?.id;
      const idB = cats.find(c=>c.title==='Bohrer')?.id || cats[2]?.id;
      storage.write(CT_KEYS.TOOLS, [
        {id:uid(), name:'VDI30 Halter Rechts', code:'VDI30-R', catId:idH, iso:'', maker:'', note:'', imgData:'', lifePct:100},
        {id:uid(), name:'ER32 Ø8', code:'ER32-8', catId:idH, iso:'', maker:'', note:'', imgData:'', lifePct:70},
        {id:uid(), name:'CNMG120408-PM 4325', code:'CNMG120408-PM', catId:idP, iso:'CNMG120408', maker:'Sandvik', note:'Stahl', imgData:'', lifePct:40},
        {id:uid(), name:'Bohrer Ø10', code:'DR-10', catId:idB, iso:'', maker:'', note:'', imgData:'', lifePct:90},
      ]);
    }
    if(!storage.read(CT_KEYS.PROGS)){
      const tools = storage.read(CT_KEYS.TOOLS, []);
      const t1=tools[0]?.id, t2=tools[2]?.id;
      storage.write(CT_KEYS.PROGS, [
        {id:uid(), number:1001, title:'Grundsetup', date:Date.now(), ro:Array(12).fill(null).map((_,i)=> i===0?{toolId:t1}:null), ru:Array(12).fill(null)},
        {id:uid(), number:1002, title:'Serie A', date:Date.now(), ro:Array(12).fill(null), ru:Array(12).fill(null).map((_,i)=> i===1?{toolId:t2}:null)},
      ]);
    }
    if(!storage.read(CT_KEYS.SETUP)){
      storage.write(CT_KEYS.SETUP, {ro:Array(12).fill(null), ru:Array(12).fill(null)});
    }
    if(!storage.read(CT_KEYS.DASH)){
      storage.write(CT_KEYS.DASH, {
        produktion: [{id:uid(), title:'Los 123', targetQty:100, madeQty:20, date:Date.now()}],
        checklist:  [{id:uid(), title:'Nullpunkt prüfen', done:false}]
      });
    }
    if(!storage.read(CT_KEYS.DOCS)){
      storage.write(CT_KEYS.DOCS, [
        {id:uid(), title:'Werkstoff Notiz', category:'Stahl', tags:['ISO-P'], body:'Hinweise zur Kühlung…', favorite:true},
        {id:uid(), title:'Aufspann-Check', category:'Setup', tags:['check'], body:'Schrauben, Anschläge, Reitstock…', favorite:false}
      ]);
    }
  }

  // Splash
  function splash({logo, ms=700}){
    const el=document.createElement('div'); el.className='modal show'; el.innerHTML=`<div class="overlay" style="backdrop-filter:blur(10px)"></div><div class="card" style="text-align:center;padding:24px"><img src="${logo}" alt="" style="width:64px;height:64px;border-radius:16px;margin:10px auto 8px"><div style="font-weight:800;font-size:18px">CitiTool</div><div class="muted">lädt…</div></div>`;
    document.body.appendChild(el); document.body.classList.add('noscroll'); setTimeout(()=>{ el.remove(); document.body.classList.remove('noscroll'); }, ms);
  }

  // Modal
  function openModal({title='', html='', okText, cancelText='Schließen', onOk}){
    closeModal();
    const el=document.createElement('div'); el.className='modal show';
    el.innerHTML=`
      <div class="overlay" data-close="1"></div>
      <div class="card">
        <div class="hdr" style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
          <b>${escapeHTML(title)}</b>
          <button class="icon-btn" data-close="1"><svg><use href="./ui/icons.svg#close"/></svg></button>
        </div>
        <div class="body">${html}</div>
        <div class="footer">
          ${cancelText?`<button class="btn cancel">${escapeHTML(cancelText)}</button>`:''}
          ${okText?`<button class="btn brand ok">${escapeHTML(okText)}</button>`:''}
        </div>
      </div>`;
    document.body.appendChild(el); document.body.classList.add('noscroll');
    el.addEventListener('click', (e)=>{ if(e.target.dataset.close){ closeModal(); } });
    const okBtn = $('.ok', el), cancelBtn=$('.cancel', el);
    if(okBtn) okBtn.onclick=()=>{ if(onOk) onOk(); };
    if(cancelBtn) cancelBtn.onclick=()=>closeModal();
    document.addEventListener('keydown', modalEsc); // esc
  }
  function closeModal(){ const el=$('.modal.show'); if(el){ el.remove(); document.body.classList.remove('noscroll'); document.removeEventListener('keydown', modalEsc);} }
  function modalEsc(e){ if(e.key==='Escape') closeModal(); }

  // Drawer
  function openDrawer({title='', items, onSelect, html}){
    closeDrawer();
    const el=document.createElement('div'); el.className='drawer show';
    const listHTML = html || `<ul class="list">${(items||[]).map(it=>`<li data-id="${it.id}"><div><b>${escapeHTML(it.title)}</b><div class="muted">${escapeHTML(it.meta||'')}</div></div><button class="btn sm">Wählen</button></li>`).join('')}</ul>`;
    el.innerHTML = `
      <div class="overlay" data-close="1"></div>
      <div class="panel">
        <div class="hdr"><b>${escapeHTML(title)}</b><button class="icon-btn" data-close="1"><svg><use href="./ui/icons.svg#close"/></svg></button></div>
        ${listHTML}
      </div>`;
    document.body.appendChild(el); document.body.classList.add('noscroll');
    el.addEventListener('click', (e)=>{ if(e.target.dataset.close){ closeDrawer(); } });
    if(items && onSelect){
      $$('.list li', el).forEach(li=>{
        $('button', li).onclick=()=>{ onSelect(li.dataset.id); };
      });
    }
    document.addEventListener('keydown', drawerEsc);
  }
  function closeDrawer(){ const el=$('.drawer.show'); if(el){ el.remove(); document.body.classList.remove('noscroll'); document.removeEventListener('keydown', drawerEsc);} }
  function drawerEsc(e){ if(e.key==='Escape') closeDrawer(); }

  // Toast
  function toast(text, type='info', ms=2000){
    const el=document.createElement('div'); el.className='toast show';
    el.innerHTML = `<div class="inner" data-type="${type}">${escapeHTML(text)}</div>`;
    document.body.appendChild(el);
    clearTimeout(state.toastTimer); state.toastTimer=setTimeout(()=>{ el.remove(); }, ms);
  }

  // AppBar search toggle + binding
  ready(()=>{
    $$('[data-ct="search-toggle"]').forEach(btn=>{
      btn.onclick=()=>{ const s=$('.searchbar'); if(!s) return; s.classList.toggle('collapsed'); if(!s.classList.contains('collapsed')) $('.field',s)?.focus(); };
    });
  });
  function bindGlobalSearch(onInput){
    const f=$('#globalSearch')||$('#toolSearch')||$('#setupSearch')||$('#docSearch')||$('#asSearch');
    if(f) f.addEventListener('input', ()=> onInput((f.value||'').toLowerCase()));
  }

  // Utils
  function readFileAsDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
  function exportJSON(filename, data){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); a.download=filename; a.click(); }
  function importJSON(){ return new Promise((resolve)=>{ const i=document.createElement('input'); i.type='file'; i.accept='application/json'; i.onchange=()=>{ const f=i.files[0]; const r=new FileReader(); r.onload=()=>resolve(JSON.parse(r.result||'[]')); r.readAsText(f); }; i.click(); }); }
  function getToolFromSlot(live, side, idx){ const v=live[side][idx]; if(!v) return null; const tools=storage.read(CT_KEYS.TOOLS,[]); return tools.find(t=>t.id===v.toolId)||null; }

  return {
    ready, uid, escape:escapeHTML,
    storage, splash, openModal, closeModal, openDrawer, closeDrawer, toast,
    readFileAsDataURL, exportJSON, importJSON,
    bindGlobalSearch, ensureSeeds, getToolFromSlot,
  };
})();
window.CT_KEYS = CT.CT_KEYS || { TOOLS:'ct_tools_v2', CATS:'ct_cats_v1', SETUP:'ct_setup_live', PROGS:'ct_programs_v1', DASH:'ct_dash_v1', DOCS:'ct_docs_v3' };
===== END FILE =====
