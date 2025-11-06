/* ===== Core storage + collections ===================================== */
window.CT = window.CT || {};
CT._k = 'CT_V1';
CT.store = {
  get(k, fb){ try{ const all=JSON.parse(localStorage.getItem(CT._k)||'{}'); return (k?all[k]:all) ?? fb; }catch(e){ return fb; } },
  set(k,v){ const all=CT.store.get(); all[k]=v; localStorage.setItem(CT._k, JSON.stringify(all)); return v; },
  patch(k,fn){ const v=CT.store.get(k, null); return CT.store.set(k, fn(v)); },
  export(){ return JSON.stringify(CT.store.get()); },
  import(json){ localStorage.setItem(CT._k, json); }
};
CT._uuid = ()=>'id-'+Math.random().toString(36).slice(2)+Date.now().toString(36);
CT.collection = (name, schema={})=>{
  const key = 'coll_'+name;
  const all = ()=> CT.store.get(key, []);
  const save = (arr)=> CT.store.set(key, arr);
  return {
    all,
    find:(id)=> all().find(x=>x.id===id),
    upsert:(obj)=>{
      let arr = all();
      if(!obj.id) obj.id = CT._uuid();
      const i = arr.findIndex(x=>x.id===obj.id);
      if(i>=0) arr[i]=obj; else arr.push(obj);
      save(arr); return obj;
    },
    remove:(id)=> save(all().filter(x=>x.id!==id)),
    seed:(items)=>{ if(all().length===0) save(items.map(x=>({...x,id:CT._uuid(),_demo:true}))); },
    search:(q,indexer=(x)=>[x.title,x.text,x.tags?.join(' '),x.category].join(' ')){
      q=(q||'').trim().toLowerCase(); if(!q) return all();
      return all().filter(x=> indexer(x).toLowerCase().includes(q));
    }
  }
};
/* Collections */
CT.docs  = CT.collection('docs');
CT.tools = CT.collection('tools');
CT.progs = CT.collection('progs');

/* ===== Categories (scoped) ============================================ */
CT.cats = {
  _k:'cats',
  get(scope){ const map=CT.store.get(this._k,{docs:[],tools:[],progs:[]}); return map[scope]||[]; },
  add(scope,name){ const map=CT.store.get(this._k,{docs:[],tools:[],progs:[]}); if(!map[scope].includes(name)) map[scope].push(name); CT.store.set(this._k,map); return name; },
  remove(scope,name){ const map=CT.store.get(this._k,{docs:[],tools:[],progs:[]}); map[scope]=map[scope].filter(x=>x!==name); CT.store.set(this._k,map); }
};

/* ===== UI helpers ===================================================== */
CT.el = (html)=> { const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; };
CT.on = (el,ev,fn)=> el.addEventListener(ev,fn);

CT.ui = {
  appBar(opts){
    const wrap = document.querySelector('#appbar');
    wrap.innerHTML = `
      <div class="row mw">
        <div class="brandline">
          <div class="ct-badge">CT</div>
          <div>
            <div class="ct-word">${opts.brand||'CITI·TOOL'}</div>
            ${opts.subtitle?`<div class="muted" style="font-size:12px">${opts.subtitle}</div>`:''}
          </div>
        </div>
        <div class="actions" id="app-actions"></div>
      </div>`;
    const act = wrap.querySelector('#app-actions');
    (opts.actions||[]).forEach(a=>{
      if(a.type==='search'){
        const s = CT.el(`<div class="search" id="searchBox">
          <svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 105.29 14.29l4.7 4.7 1.41-1.41-4.7-4.7A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/></svg>
          <input type="search" placeholder="${a.placeholder||'Suchen…'}">
        </div>`);
        CT.on(s,'click',()=>{ s.classList.add('active'); s.querySelector('input').focus(); });
        CT.on(s.querySelector('input'),'blur',()=>{ if(!s.querySelector('input').value) s.classList.remove('active')});
        if(a.onChange) CT.on(s.querySelector('input'),'input',e=>a.onChange(e.target.value));
        act.appendChild(s);
      }else{
        const b = CT.el(`<button class="btn ${a.kind||'brand'}">${a.text}</button>`);
        if(a.onClick) CT.on(b,'click',a.onClick);
        act.appendChild(b);
      }
    });
  },
  modal({title,content,footer}){
    let m = document.querySelector('.modal'); if(m) m.remove();
    m = CT.el(`<div class="modal show">
      <div class="overlay"></div>
      <div class="sheet">
        <div class="hdr"><strong>${title||''}</strong>
          <button class="btn" id="mClose">Schließen</button>
        </div>
        <div class="body"></div>
        <div class="footer"></div>
      </div></div>`);
    m.querySelector('.body').append(content);
    if(footer) m.querySelector('.footer').append(footer);
    document.body.appendChild(m);
    CT.on(m.querySelector('#mClose'),'click',()=>m.remove());
    CT.on(m.querySelector('.overlay'),'click',()=>m.remove());
    return m;
  },
  toast(txt){ const t=CT.el(`<div style="position:fixed;left:50%;bottom:88px;transform:translateX(-50%);background:#111;color:#fff;padding:10px 14px;border-radius:12px;z-index:200">${txt}</div>`); document.body.appendChild(t); setTimeout(()=>t.remove(),1800); },
  list(container, items, render){ const el=(typeof container==='string')?document.querySelector(container):container; el.innerHTML=''; items.forEach((x,i)=>el.appendChild(render(x,i))); },
  categoryFilter({scope,onChange}){
    const cont = CT.el(`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px"></div>`);
    const draw = ()=>{
      cont.innerHTML='';
      const cats = ['Alle',...CT.cats.get(scope)];
      cats.forEach(c=>{
        const b=CT.el(`<button class="btn ${c==='Alle'?'brand':''}" data-val="${c}">${c}</button>`);
        CT.on(b,'click',()=>{ [...cont.children].forEach(x=>x.classList.remove('brand')); b.classList.add('brand'); onChange && onChange(c==='Alle'?null:c); });
        cont.appendChild(b);
      });
      const mgr=CT.el(`<button class="btn">Kategorien</button>`);
      CT.on(mgr,'click',()=>CT.ui.categoryManager({scope,onChanged:()=>{ draw(); onChange && onChange(null); }}));
      cont.appendChild(mgr);
    };
    draw(); return cont;
  },
  categoryManager({scope,onChanged}){
    const body = CT.el(`<div class="grid"><div class="full"><div class="muted">Bereich: <b>${scope}</b></div></div></div>`);
    const list = CT.el(`<div class="full"></div>`); body.appendChild(list);
    const redraw = ()=>{
      list.innerHTML='';
      CT.cats.get(scope).forEach(name=>{
        const row=CT.el(`<div class="card"><div>${name}</div><div><button class="btn warn">Löschen</button></div></div>`);
        CT.on(row.querySelector('.warn'),'click',()=>{ CT.cats.remove(scope,name); redraw(); onChanged&&onChanged(); });
        list.appendChild(row);
      });
    };
    redraw();
    const add = CT.el(`<div class="full fld" style="margin-top:8px">
      <label>Neue Kategorie</label><input placeholder="Name"><div class="footer"><button class="btn brand">Hinzufügen</button></div>
    </div>`);
    CT.on(add.querySelector('.brand'),'click',()=>{
      const v=add.querySelector('input').value.trim(); if(!v) return;
      CT.cats.add(scope,v); add.querySelector('input').value=''; redraw(); onChanged&&onChanged();
    });
    body.appendChild(add);
    CT.ui.modal({title:'Kategorien',content:body});
  },
  editor({schema,value={},onSubmit,title}){
    const form = CT.el(`<form class="grid"></form>`);
    const fields = {};
    schema.forEach(f=>{
      const wrap = CT.el(`<div class="fld ${f.full?'full':''}"></div>`);
      wrap.appendChild(CT.el(`<label>${f.label||f.key}</label>`));
      let input;
      if(f.type==='textarea'){
        input = CT.el(`<textarea rows="${f.rows||6}"></textarea>`);
      }else if(f.type?.startsWith('select')){
        const create = f.type.includes(':create');
        input = CT.el(`<select></select>`);
        const draw = ()=>{
          input.innerHTML='';
          if(f.scope){ CT.cats.get(f.scope).forEach(c=> input.appendChild(CT.el(`<option>${c}</option>`))); }
          input.insertAdjacentHTML('afterbegin','<option value="">(keine)</option>');
        };
        draw();
        if(create){
          const adder = CT.el(`<div class="muted" style="font-size:12px;margin-top:4px">+ Neue Kategorie beim Speichern möglich</div>`);
          wrap.appendChild(adder);
        }
        wrap._rebuild = draw;
      }else if(f.type==='chips'){
        input = CT.el(`<input placeholder="tag1, tag2">`);
      }else if(f.type==='file'){
        input = CT.el(`<input type="file" ${f.accept?`accept="${f.accept}"`:''}>`);
      }else if(f.type==='seg'){
        input = CT.el(`<select></select>`); (f.options||[]).forEach(o=> input.appendChild(CT.el(`<option>${o}</option>`)));
      }else{
        input = CT.el(`<input ${f.type==='number'?'type="number"':''}>`);
      }
      if(value[f.key]!=null && f.type!=='file'){
        if(f.type==='chips') input.value = (value[f.key]||[]).join(', ');
        else input.value = value[f.key];
      }
      wrap.appendChild(input);
      fields[f.key]= {def:f, input, wrap};
      form.appendChild(wrap);
    });
    const footer = CT.el(`<div class="footer">
      <button type="button" class="btn" id="cancel">Abbrechen</button>
      <button class="btn brand">Speichern</button>
    </div>`);
    const modal = CT.ui.modal({title,content:form,footer});
    CT.on(footer.querySelector('#cancel'),'click',()=>modal.remove());
    CT.on(form,'submit',async (e)=>{
      e.preventDefault();
      const out = {...value};
      for(const k in fields){
        const {def,input,wrap} = fields[k];
        if(def.type==='chips') out[k] = input.value.split(',').map(s=>s.trim()).filter(Boolean);
        else if(def.type==='number') out[k] = Number(input.value||0);
        else if(def.type==='file'){
          if(input.files && input.files[0]){
            out[def.key] = await CT.media.fileToDataURL(input.files[0]);
          }
        }else out[k] = input.value;
        if(def.type?.startsWith('select') && def.scope && out[k] && !CT.cats.get(def.scope).includes(out[k])){
          CT.cats.add(def.scope,out[k]); wrap._rebuild && wrap._rebuild();
        }
      }
      onSubmit && onSubmit(out, modal);
    });
    return modal;
  }
};

/* ===== Media utils ==================================================== */
CT.media = {
  fileToDataURL(file){ return new Promise(res=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(file); }); }
};

/* ===== Demo seeding =================================================== */
CT.demo = {
  ensure(){
    // categories
    if(CT.cats.get('docs').length===0){ ['Allgemein','Check','NC','ISO-P'].forEach(c=>CT.cats.add('docs',c)); }
    // docs
    CT.docs.seed([
      {title:'Aufspann-Check',category:'Allgemein',tags:['check','setup'],type:'Notiz',text:'Schrauben, Anschläge, Reitstock…'}
    ]);
  }
};