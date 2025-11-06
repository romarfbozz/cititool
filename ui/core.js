/* ========= CitiTool Core ========= */
;(()=>{

const CT = window.CT = {
  ver:'1.0',
  KEYS:{
    TOOLS:'CT_TOOLS',
    CATS:'CT_CATS',
    PROGS:'CT_PROGS',
    SLOTS:'CT_SLOTS',
    DOCS:'CT_DOCS',
    DOC_INDEX:'CT_DOC_INDEX',
    PREFS:'CT_PREFS'
  },
  bus: (()=>{ // простой pub/sub
    const ev={}; 
    return {
      on:(t,f)=>(ev[t]=(ev[t]||[])).push(f),
      emit:(t,p)=>(ev[t]||[]).forEach(f=>f(p))
    }
  })(),
  id:(p='id')=> p+'_'+Math.random().toString(36).slice(2,9)+Date.now().toString(36),
  json:(k,v)=> v===undefined ? JSON.parse(localStorage.getItem(k)||'[]') 
                              : localStorage.setItem(k,JSON.stringify(v)),
  toast:(msg)=>{ const t=document.createElement('div'); t.className='ct-toast'; t.textContent=msg;
                 document.body.appendChild(t); setTimeout(()=>t.remove(),2000)},
  /* ---------- UI mount ---------- */
  ui:{
    mountAppBar(target,{title='CitiTool',subtitle='',actions=[],onSearch}={}){
      const el = typeof target==='string'?document.querySelector(target):target;
      el.innerHTML =
`<div class="ct-appbar"><div class="ct-bar">
  <div class="ct-logo">
    <div class="ct-badge">CT</div>
    <div>
      <div class="ct-title">${title}</div>
      ${subtitle?`<div class="muted">${subtitle}</div>`:''}
    </div>
  </div>
  <div class="ct-actions">
    ${actions.map(a=>`<button class="ct-btn ${a.type||''}" data-act="${a.id||a.label}">${a.label}</button>`).join('')}
    <div class="ct-search" id="ctSearch">
      <svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 105.29 14.29l4.7 4.7 1.41-1.41-4.7-4.7A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/></svg>
      <input type="search" placeholder="Suche…" id="ctSearchInput">
    </div>
  </div>
</div></div>`;
      // actions
      el.querySelectorAll('[data-act]').forEach(b=>{
        b.addEventListener('click',()=>actions.find(a=>(a.id||a.label)===b.dataset.act).onClick?.());
      });
      // search expand
      const box = el.querySelector('#ctSearch'), q = el.querySelector('#ctSearchInput');
      box.addEventListener('click', ()=>{ box.classList.add('active'); q.focus(); });
      q.addEventListener('blur', ()=>{ if(!q.value) box.classList.remove('active'); });
      q.addEventListener('input', ()=> onSearch && onSearch(q.value));
    },
    mountDock(target,{active='dash'}={}){
      const el = typeof target==='string'?document.querySelector(target):target;
      el.innerHTML =
`<nav class="ct-dock"><div class="wrap">
  <a href="index.html" class="${active==='dash'?'active':''}"><svg class="icon" viewBox="0 0 24 24"><path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z"/></svg><small>Dash</small></a>
  <a href="setup.html" class="${active==='setup'?'active':''}"><svg class="icon" viewBox="0 0 24 24"><path d="M19.14 12.94a7 7 0 10-7.08 7.06 7 7 0 007.08-7.06zM11 6h2v6h-2V6zm0 8h2v2h-2v-2z"/></svg><small>Setup</small></a>
  <a href="tools.html" class="${active==='tools'?'active':''}"><svg class="icon" viewBox="0 0 24 24"><path d="M22 19l-8-8 2-2 8 8-2 2zM14.3 7.7l-1-1L9 11v2h2l4.3-4.3zM3 14h6v8H3z"/></svg><small>Tools</small></a>
  <a href="programme.html" class="${active==='progs'?'active':''}"><svg class="icon" viewBox="0 0 24 24"><path d="M3 4h18v2H3V4zm0 4h12v2H3V8zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg><small>Programme</small></a>
  <a href="docs.html" class="${active==='docs'?'active':''}"><svg class="icon" viewBox="0 0 24 24"><path d="M6 2h9l5 5v15a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm8 1.5V8h4.5"/></svg><small>Docs</small></a>
</div></nav>`;
    },
    /* -------- Modal/Toast -------- */
    modal({title,body,footer}){
      const ov=document.createElement('div'); ov.className='ct-overlay';
      const md=document.createElement('div'); md.className='ct-modal';
      md.innerHTML=`<div class="head"><b>${title||''}</b><button class="ct-btn" id="x">✕</button></div>
                    <div class="body"></div><div class="foot"></div>`;
      md.querySelector('.body').append(body instanceof Node?body:html(body||''));
      if(footer){ md.querySelector('.foot').append(footer instanceof Node?footer:html(footer)); }
      ov.append(md); document.body.append(ov);
      const close=()=>ov.remove(); md.querySelector('#x').onclick=close; ov.onclick=e=>{if(e.target===ov) close();}
      return {close, root:md};
    },
  },
  /* ---------- Storage helpers ---------- */
  store:{
    get(k){return CT.json(k)},
    set(k,v){CT.json(k,v); return v},
    push(k,item){const a=CT.json(k); a.push(item); CT.json(k,a); return item},
    update(k,id,patch){const a=CT.json(k); const i=a.findIndex(x=>x.id===id); if(i>-1){a[i]={...a[i],...patch}; CT.json(k,a); return a[i]}},
    remove(k,id){const a=CT.json(k).filter(x=>x.id!==id); CT.json(k,a)}
  }
};

/* ========= Entities ========= */
const K = CT.KEYS;

/* Categories (общие) */
CT.cat = {
  list(){ return CT.store.get(K.CATS) },
  ensure(name){ const a=this.list(); if(!a.find(c=>c.name===name)){a.push({id:CT.id('cat'),name}); CT.store.set(K.CATS,a)}},
  create(name){ this.ensure(name); CT.bus.emit('cats:changed') },
  rename(id,name){ const a=this.list(); const c=a.find(x=>x.id===id); if(c){c.name=name; CT.store.set(K.CATS,a); CT.bus.emit('cats:changed')}},
  remove(id){ CT.store.set(K.CATS,this.list().filter(c=>c.id!==id)); CT.bus.emit('cats:changed')}
};

/* Tools */
CT.tool = {
  list(){ return CT.store.get(K.TOOLS) },
  get(id){ return this.list().find(t=>t.id===id) },
  create(data){ const t={ id:CT.id('tool'), name:'Neues Werkzeug', iso:'', code:'', cats:[], thumb:'', note:'', created:Date.now(), ...data };
    CT.store.push(K.TOOLS,t); CT.bus.emit('tools:changed'); return t },
  update(id,patch){ const t=CT.store.update(K.TOOLS,id,{...patch,updated:Date.now()}); CT.bus.emit('tools:changed'); return t },
  remove(id){ CT.store.remove(K.TOOLS,id); CT.bus.emit('tools:changed') },
  search(q=''){ q=q.trim().toLowerCase(); const a=this.list(); if(!q) return a;
    return a.filter(t=>[t.name,t.iso,t.code,(t.cats||[]).join(' ')].join(' ').toLowerCase().includes(q)); }
};

/* Programmes */
CT.prog = {
  list(){ return CT.store.get(K.PROGS) },
  get(id){ return this.list().find(p=>p.id===id) },
  create(data){ const p={ id:CT.id('prog'), title:'Grundsetup', number:'', side:'RO', drawing:'', slots:[], ...data };
    CT.store.push(K.PROGS,p); CT.bus.emit('prog:changed'); return p },
  update(id,patch){ const p=CT.store.update(K.PROGS,id,{...patch,updated:Date.now()}); CT.bus.emit('prog:changed'); return p },
  remove(id){ CT.store.remove(K.PROGS,id); CT.bus.emit('prog:changed') }
};
/* Slots (внутри программы) */
CT.slot = {
  listByProg(progId){ return CT.store.get(K.SLOTS).filter(s=>s.progId===progId).sort((a,b)=>a.pos-b.pos) },
  assign({progId,pos,toolId,tcode}){ const a=CT.store.get(K.SLOTS); let s=a.find(x=>x.progId===progId&&x.pos===pos);
    if(!s){ s={id:CT.id('slot'),progId,pos,toolId:'',tcode:''}; a.push(s) }
    s.toolId=toolId; s.tcode=tcode||s.tcode; CT.store.set(K.SLOTS,a); CT.bus.emit('slot:changed',progId); return s },
  remove(id){ const a=CT.store.get(K.SLOTS).filter(s=>s.id!==id); CT.store.set(K.SLOTS,a); CT.bus.emit('slot:changed') }
};

/* Docs */
CT.doc = {
  list(){ return CT.store.get(K.DOCS) },
  get(id){ return this.list().find(d=>d.id===id) },
  create(data){ const d={ id:CT.id('doc'), title:'Neue Notiz', kind:'note', cats:[], tags:[], body:'', preview:'', ...data };
    CT.store.push(K.DOCS,d); CT.bus.emit('docs:changed'); return d },
  update(id,patch){ const d=CT.store.update(K.DOCS,id,{...patch,updated:Date.now()}); CT.bus.emit('docs:changed'); return d },
  remove(id){ CT.store.remove(K.DOCS,id); CT.bus.emit('docs:changed') },
  search(q=''){ q=q.trim().toLowerCase(); const a=this.list(); if(!q) return a;
    return a.filter(d=>[d.title,(d.tags||[]).join(' '),(d.cats||[]).join(' '),(d.body||'')].join(' ').toLowerCase().includes(q)); }
};

/* ========= Reusable Editors ========= */

/* Category manager (inline) */
CT.ui.categoryManager = function({value=[], onChange}={}){
  const wrap = html(`<div class="fld"><label>Kategorien</label><div class="chips"></div><div class="grid2"><input id="newcat" placeholder="Neue Kategorie"><button class="ct-btn">Hinzufügen</button></div></div>`);
  const box = wrap.querySelector('.chips'); const input = wrap.querySelector('#newcat');
  function redraw(){
    const all = CT.cat.list();
    box.innerHTML=''; 
    all.forEach(c=>{
      const chip = html(`<span class="chip ${value.includes(c.name)?'act':''}">${c.name}</span>`);
      chip.onclick=()=>{ 
        if(value.includes(c.name)) value=value.filter(x=>x!==c.name); else value.push(c.name);
        onChange?.(value); redraw();
      };
      box.append(chip);
    });
  }
  wrap.querySelector('button').onclick=()=>{ const n=input.value.trim(); if(n){CT.cat.create(n); value.includes(n)||value.push(n); onChange?.(value); input.value=''; redraw();}};
  redraw(); return wrap;
};

/* Tool editor */
CT.ui.toolEditor = function({toolId}={}){
  const tool = toolId? CT.tool.get(toolId): null;
  const modal = CT.ui.modal({title: tool?'Werkzeug bearbeiten':'Neues Werkzeug'});
  const body = html(`<div>
    <div class="fld"><label>Name</label><input id="name" value="${tool?esc(tool.name):''}"></div>
    <div class="grid2">
      <div class="fld"><label>ISO</label><input id="iso" value="${tool?esc(tool.iso):''}"></div>
      <div class="fld"><label>Code</label><input id="code" value="${tool?esc(tool.code):''}" placeholder="T0101"></div>
    </div>
    <div id="cats"></div>
    <div class="fld"><label>Notiz</label><textarea id="note">${tool?esc(tool.note||''):''}</textarea></div>
  </div>`);
  modal.root.querySelector('.body').append(body);
  const cats = CT.ui.categoryManager({ value: tool? [...(tool.cats||[])]:[], onChange:v=>cats._val=v }); cats._val = tool? [...(tool.cats||[])]:[];
  body.querySelector('#cats').append(cats);
  const foot = html(`<div class="foot">
    ${tool?`<button class="ct-btn warn" id="del">Entfernen</button>`:''}
    <button class="ct-btn brand" id="ok">${tool?'Speichern':'Anlegen'}</button>
  </div>`); modal.root.append(foot);
  foot.querySelector('#ok').onclick=()=>{
    const data={
      name: val('#name'), iso: val('#iso'), code: val('#code'), cats: cats._val||[], note: val('#note')
    };
    tool? CT.tool.update(tool.id,data) : CT.tool.create(data);
    modal.close(); CT.toast('Gespeichert');
  };
  if(tool) foot.querySelector('#del').onclick=()=>{ CT.tool.remove(tool.id); modal.close(); CT.toast('Gelöscht'); };
};

/* Doc editor */
CT.ui.docEditor = function({docId}={}){
  const doc = docId? CT.doc.get(docId): null;
  const modal = CT.ui.modal({title: doc?'Dokument bearbeiten':'Neues Dokument'});
  const body = html(`<div>
    <div class="fld"><label>Titel</label><input id="title" value="${doc?esc(doc.title):''}" placeholder="Titel…"></div>
    <div id="cats"></div>
    <div class="fld"><label>Tags (Komma)</label><input id="tags" value="${doc?(doc.tags||[]).join(', '):''}"></div>
    <div class="fld"><label>Notiz/Link</label><textarea id="note" placeholder="Text oder URL…">${doc?esc(doc.body||''):''}</textarea></div>
  </div>`);
  modal.root.querySelector('.body').append(body);
  const cats = CT.ui.categoryManager({ value: doc? [...(doc.cats||[])]:[], onChange:v=>cats._val=v }); cats._val = doc? [...(doc.cats||[])]:[];
  body.querySelector('#cats').append(cats);
  const foot = html(`<div class="foot">
    ${doc?`<button class="ct-btn warn" id="del">Entfernen</button>`:''}
    <button class="ct-btn brand" id="ok">${doc?'Speichern':'Anlegen'}</button>
  </div>`); modal.root.append(foot);
  foot.querySelector('#ok').onclick=()=>{
    const data={ title: val('#title'), cats: cats._val||[], tags: val('#tags').split(',').map(s=>s.trim()).filter(Boolean), body: val('#note') };
    doc? CT.doc.update(doc.id,data) : CT.doc.create(data);
    modal.close(); CT.toast('Gespeichert');
  };
  if(doc) foot.querySelector('#del').onclick=()=>{ CT.doc.remove(doc.id); modal.close(); CT.toast('Gelöscht'); };
};

/* ========= Small helpers ========= */
function html(s){ const d=document.createElement('div'); d.innerHTML=s.trim(); return d.firstChild }
function val(sel,root=document){ return root.querySelector(sel).value.trim() }
function esc(s){return String(s).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]))}

/* ========= Demo seed (first run) ========= */
(function seed(){
  if(localStorage.getItem('__CT_SEEDED__')) return;
  CT.store.set(K.CATS,[{id:CT.id('cat'),name:'Allgemein'},{id:CT.id('cat'),name:'Fräsen'},{id:CT.id('cat'),name:'Drehen'}]);
  CT.tool.create({name:'CNMG120408-PM 4325', iso:'CNMG120408', code:'T0101', cats:['Drehen']});
  CT.doc.create({title:'Aufspann-Check', cats:['Allgemein'], tags:['check'], body:'Schrauben, Anschläge…'});
  const p=CT.prog.create({title:'Grundsetup', number:'1001', side:'RO'});
  CT.slot.assign({progId:p.id,pos:1,toolId:CT.tool.list()[0].id,tcode:'T0101'});
  localStorage.setItem('__CT_SEEDED__','1');
})();

})();