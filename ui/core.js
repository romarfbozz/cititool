/* CitiTool Core — стабильная версия совместимости (Setup/Tools ok) */
(function(){
  const $  = (sel, root=document)=>root.querySelector(sel);
  const $$ = (sel, root=document)=>Array.from(root.querySelectorAll(sel));

  const CT_KEYS = {
    TOOLS:'ct_tools_v2',
    CATS :'ct_cats_v1',
    SETUP:'ct_setup_live',
    PROGS:'ct_programs_v1',
    DASH :'ct_dash_v1',
    DOCS :'ct_docs_v3'
  };

  const CT = {
    CT_KEYS,
    /* -------- Storage -------- */
    storage:{
      read:(k, def)=>{ try{ const raw=localStorage.getItem(k); if(raw===null) return def; return JSON.parse(raw); }catch(e){ return def; } },
      write:(k,v)=>localStorage.setItem(k, JSON.stringify(v)),
      clear:(k)=>localStorage.removeItem(k)
    },
    /* -------- Ready -------- */
    ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); },
    /* -------- Utils -------- */
    uid(){ return Math.random().toString(36).slice(2,9); },
    escape(s){ return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); },
    readFileAsDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); },
    exportJSON(filename, data){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); a.download=filename; a.click(); },
    importJSON(){ return new Promise((resolve)=>{ const i=document.createElement('input'); i.type='file'; i.accept='application/json'; i.onchange=()=>{ const f=i.files[0]; const r=new FileReader(); r.onload=()=>resolve(JSON.parse(r.result||'[]')); r.readAsText(f); }; i.click(); }); },
    exportCSV(filename, csv){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=filename; a.click(); },
    /* -------- App UI -------- */
    splash({logo=':ct', ms=600}={}){
      const badge=`<span class="ct-badge lg" style="width:64px;height:64px;border-radius:16px;font-size:24px;display:grid;place-items:center">CT</span>`;
      const logoHTML=(logo && logo!==':ct')?`<img src="${logo}" alt="CitiTool" style="width:64px;height:64px;border-radius:16px;margin:10px auto 8px">`:badge;
      const el=document.createElement('div'); el.className='modal show';
      el.innerHTML=`<div class="overlay" style="backdrop-filter:blur(10px)"></div>
        <div class="card" style="text-align:center;padding:24px">${logoHTML}
          <div style="font-weight:800;font-size:18px">CitiTool</div><div class="muted">lädt…</div></div>`;
      document.body.appendChild(el); document.body.classList.add('noscroll');
      setTimeout(()=>{ el.remove(); document.body.classList.remove('noscroll'); }, ms);
    },
    openModal({title='', html='', okText, cancelText='Schließen', onOk}={}){
      CT.closeModal();
      const el=document.createElement('div'); el.className='modal show';
      el.innerHTML=`
        <div class="overlay" data-close="1"></div>
        <div class="card">
          <div class="hdr" style="display:flex;justify-content:space-between;align-items:center;gap:.5rem">
            <b>${CT.escape(title)}</b>
            <button class="icon-btn" data-close="1"><svg><use href="./ui/icons.svg#close"/></svg></button>
          </div>
          <div class="body">${html}</div>
          <div class="footer">
            ${cancelText?`<button class="btn cancel">${CT.escape(cancelText)}</button>`:''}
            ${okText?`<button class="btn brand ok">${CT.escape(okText)}</button>`:''}
          </div>
        </div>`;
      document.body.appendChild(el); document.body.classList.add('noscroll');
      el.addEventListener('click', e=>{ if(e.target.dataset.close){ CT.closeModal(); } });
      const ok=el.querySelector('.ok'), cancel=el.querySelector('.cancel');
      if(ok) ok.onclick=()=>{ onOk && onOk(); };
      if(cancel) cancel.onclick=()=>CT.closeModal();
      document.addEventListener('keydown', modalEsc);
      function modalEsc(ev){ if(ev.key==='Escape') CT.closeModal(); }
    },
    closeModal(){ const el=document.querySelector('.modal.show'); if(el){ el.remove(); document.body.classList.remove('noscroll'); document.removeEventListener('keydown',()=>{});} },
    openDrawer({title='', items, onSelect, html}={}){
      CT.closeDrawer();
      const el=document.createElement('div'); el.className='drawer show';
      const listHTML = html || `<ul class="list">${(items||[]).map(it=>`<li data-id="${it.id}">
        <div><b>${CT.escape(it.title)}</b><div class="muted">${CT.escape(it.meta||'')}</div></div>
        <button class="btn sm">Wählen</button></li>`).join('')}</ul>`;
      el.innerHTML = `
        <div class="overlay" data-close="1"></div>
        <div class="panel">
          <div class="hdr"><b>${CT.escape(title)}</b><button class="icon-btn" data-close="1"><svg><use href="./ui/icons.svg#close"/></svg></button></div>
          ${listHTML}
        </div>`;
      document.body.appendChild(el); document.body.classList.add('noscroll');
      el.addEventListener('click', e=>{ if(e.target.dataset.close){ CT.closeDrawer(); } });
      if(items && onSelect){ $$('.list li', el).forEach(li=>{ $('button', li).onclick=()=>onSelect(li.dataset.id); }); }
      document.addEventListener('keydown', ev=>{ if(ev.key==='Escape') CT.closeDrawer(); });
    },
    closeDrawer(){ const el=document.querySelector('.drawer.show'); if(el){ el.remove(); document.body.classList.remove('noscroll'); } },
    toast(text, type='info', ms=2000){
      const el=document.createElement('div'); el.className='toast show';
      el.innerHTML = `<div class="inner" data-type="${type}">${CT.escape(text)}</div>`;
      document.body.appendChild(el);
      setTimeout(()=>{ el.remove(); }, ms);
    },
    bindGlobalSearch(onInput){
      const ids=['globalSearch','toolSearch','setupSearch','docSearch','asSearch'];
      const f=ids.map(id=>document.getElementById(id)).find(Boolean);
      if(f) f.addEventListener('input', ()=> onInput((f.value||'').toLowerCase()));
      // кнопка «лупа»
      $$('[data-ct="search-toggle"]').forEach(btn=>{
        btn.onclick=()=>{ const s=$('.searchbar'); if(!s) return; s.classList.toggle('collapsed'); if(!s.classList.contains('collapsed')) $('.field',s)?.focus(); };
      });
    },
    getToolFromSlot(live, side, idx){
      const v=live?.[side]?.[idx]; if(!v) return null; const tools=CT.storage.read(CT_KEYS.TOOLS,[]); return tools.find(t=>t.id===v.toolId)||null;
    }
  };

  /* -------- Seeds -------- */
  function isEmpty(v){ return v==null || (Array.isArray(v)&&v.length===0) || (typeof v==='object' && !Array.isArray(v) && Object.keys(v).length===0); }

  CT.ensureSeeds = function ensureSeeds(){
    // Категории
    if(isEmpty(CT.storage.read(CT_KEYS.CATS, null))){
      CT.storage.write(CT_KEYS.CATS, [
        {id:CT.uid(), title:'Halter'},
        {id:CT.uid(), title:'Platten'},
        {id:CT.uid(), title:'Bohrer'}
      ]);
    }
    // Инструменты
    if(isEmpty(CT.storage.read(CT_KEYS.TOOLS, null))){
      const cats = CT.storage.read(CT_KEYS.CATS, []);
      const idH = cats.find(c=>c.title==='Halter')?.id || cats[0]?.id;
      const idP = cats.find(c=>c.title==='Platten')?.id || cats[1]?.id;
      const idB = cats.find(c=>c.title==='Bohrer')?.id || cats[2]?.id;
      CT.storage.write(CT_KEYS.TOOLS, [
        {id:CT.uid(), name:'VDI30 Halter Rechts', code:'VDI30-R', catId:idH, iso:'', maker:'', note:'', imgData:'', lifePct:100},
        {id:CT.uid(), name:'ER32 Ø8',            code:'ER32-8',  catId:idH, iso:'', maker:'', note:'', imgData:'', lifePct:70},
        {id:CT.uid(), name:'CNMG120408-PM 4325', code:'CNMG120408-PM', catId:idP, iso:'CNMG120408', maker:'Sandvik', note:'Stahl', imgData:'', lifePct:40},
        {id:CT.uid(), name:'Bohrer Ø10',         code:'DR-10',   catId:idB, iso:'', maker:'', note:'', imgData:'', lifePct:90},
      ]);
    }
    // Программы
    if(isEmpty(CT.storage.read(CT_KEYS.PROGS, null))){
      CT.storage.write(CT_KEYS.PROGS, [
        {id:CT.uid(), number:1001, title:'Grundsetup', date:Date.now(), ro:Array(12).fill(null), ru:Array(12).fill(null)}
      ]);
    }
    // Live Setup
    const setup = CT.storage.read(CT_KEYS.SETUP, null);
    if(isEmpty(setup) || !Array.isArray(setup.ro) || !Array.isArray(setup.ru)){
      CT.storage.write(CT_KEYS.SETUP, { ro:Array(12).fill(null), ru:Array(12).fill(null) });
    }
    // Dashboard
    if(isEmpty(CT.storage.read(CT_KEYS.DASH, null))){
      CT.storage.write(CT_KEYS.DASH, {
        produktion: [{id:CT.uid(), title:'Los 123', targetQty:100, madeQty:20, date:Date.now()}],
        checklist:  [{id:CT.uid(), title:'Nullpunkt prüfen', done:false}]
      });
    }
    // Docs
    if(isEmpty(CT.storage.read(CT_KEYS.DOCS, null))){
      CT.storage.write(CT_KEYS.DOCS, [
        {id:CT.uid(), title:'Werkstoff Notiz', category:'Stahl', tags:['ISO-P'], body:'Hinweise zur Kühlung…', favorite:true},
        {id:CT.uid(), title:'Aufspann-Check', category:'Setup', tags:['check'], body:'Schrauben, Anschläge, Reitstock…', favorite:false}
      ]);
    }
  };

  CT.resetSeeds = function resetSeeds(){
    [CT_KEYS.TOOLS, CT_KEYS.CATS, CT_KEYS.SETUP, CT_KEYS.PROGS, CT_KEYS.DASH, CT_KEYS.DOCS].forEach(CT.storage.clear);
    CT.ensureSeeds();
  };

  // Экспорт глобально (важно для старых модулей)
  window.CT = CT;
  window.CT_KEYS = CT_KEYS;
})();