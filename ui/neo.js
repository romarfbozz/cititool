// Global CT namespace
window.CT = window.CT || (function(){
  const CT = {};

  // ---- events ----
  const bus = {};
  CT.on   = (ev, fn)=> (bus[ev] ||= []).push(fn);
  CT.emit = (ev, payload)=> (bus[ev]||[]).forEach(f=>f(payload));

  // ---- storage + utils ----
  CT.now  = () => new Date().toISOString();
  CT.id   = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
  CT.load = (k, def) => { try{ return JSON.parse(localStorage.getItem(k)) ?? def }catch{ return def } };
  CT.save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // ---- neo helpers ----
  CT.neo = {};
  CT.neo.wireSearch = (box, input)=>{
    box.addEventListener('click', ()=>{ box.classList.add('active'); input.focus(); });
    input.addEventListener('blur', ()=>{ if(!input.value) box.classList.remove('active'); });
    input.addEventListener('input', ()=> CT.emit('search', input.value.trim()));
  };
  CT.neo.shrinkOnScroll = ()=>{
    let last = 0;
    addEventListener('scroll', ()=>{
      const y = scrollY; if(Math.abs(y-last)<6) return;
      document.documentElement.style.setProperty('--hero-opa', Math.max(0, 1 - y/220));
      last = y;
    });
  };
  CT.neo.setActiveDock = (id)=>{
    document.querySelectorAll('.dock a').forEach(a=> a.classList.toggle('active', a.dataset.id === id));
  };

CT.i = {
  bind() {
    document.querySelectorAll('.ct-i[data-id]').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = btn.dataset.id;
        CT.emit && CT.emit('info:open', { id });
      });
    });
  }
};

  // ---- checklist widget ----
  CT.neo.checklist = (root, items, {onChange}={})=>{
    const render = ()=>{
      root.innerHTML = '';
      const wrap = document.createElement('div'); wrap.className='cl';
      items.sort((a,b)=> a.sort - b.sort);
      items.forEach(it=>{
        const row = document.createElement('div');
        row.className = 'cl-item'; row.draggable = true; row.dataset.id = it.id;
        row.innerHTML = `
          <span class="cl-handle">☰</span>
          <input type="checkbox" ${it.done?'checked':''} />
          <input type="text" value="${it.text||''}" />
          <button class="btn btn--outline is-sm">Löschen</button>
        `;
        const [, cb, inp, del] = row.children;
        cb.onchange = ()=>{ it.done = cb.checked; it.updatedAt = CT.now(); onChange?.(items) };
        inp.onchange = ()=>{ it.text = inp.value.trim(); it.updatedAt = CT.now(); onChange?.(items) };
        del.onclick  = ()=>{ items = items.filter(x=>x.id!==it.id); onChange?.(items); render(); };

        row.addEventListener('dragstart', e=>{ row.classList.add('drag'); e.dataTransfer.setData('text/plain', it.id) });
        row.addEventListener('dragend', ()=> row.classList.remove('drag'));
        row.addEventListener('dragover', e=> e.preventDefault());
        row.addEventListener('drop', e=>{
          e.preventDefault();
          const fromId = e.dataTransfer.getData('text/plain');
          if(fromId===it.id) return;
          const from = items.find(x=>x.id===fromId);
          const to   = it;
          const tmp = from.sort; from.sort = to.sort; to.sort = tmp;
          onChange?.(items); render();
        });
        wrap.append(row);
      });

      const add = document.createElement('button');
      add.className='btn'; add.textContent='+ Hinzufügen';
      add.onclick = ()=>{
        items.push({ id:CT.id(), text:'', done:false, sort: (items.at(-1)?.sort ?? 0)+1, createdAt:CT.now(), updatedAt:CT.now() });
        onChange?.(items); render();
      };
      root.append(wrap, add);
    };
    render();
  };

  // ---- UI: modal / confirm / form ----
  CT.ui = {};

  CT.ui.modal = {
    open({title, contentEl, footer=[], wide=false}){
      this.close();
      const ov=document.createElement('div'); ov.className='modal-overlay';
      const p=document.createElement('div'); p.className='modal-panel';
      if(wide) p.style.width='min(94vw,600px)';
      const head=document.createElement('div'); head.className='modal-head'; head.textContent=title||'';
      const body=document.createElement('div'); body.className='modal-body'; if(contentEl) body.append(contentEl);
      const foot=document.createElement('div'); foot.className='modal-foot';
      footer.forEach(btn=>{
        const b=document.createElement('button');
        b.className='btn'+(btn.kind?` btn--${btn.kind}`:''); b.textContent=btn.label;
        b.onclick=()=>btn.onClick?.(); foot.append(b);
      });
      p.append(head,body,foot); ov.append(p);
      ov.onclick=e=>{ if(e.target===ov) CT.ui.modal.close(); };
      document.body.append(ov);
    },
    close(){ document.querySelectorAll('.modal-overlay').forEach(x=>x.remove()); }
  };

  CT.ui.confirm = ({title,msg,ok='OK',cancel='Abbrechen',kind='danger'})=>{
    return new Promise(res=>{
      const body=document.createElement('div'); body.innerHTML=`<p style="margin:0 0 14px">${msg}</p>`;
      CT.ui.modal.open({
        title, contentEl:body,
        footer:[
          {label:cancel,onClick:()=>{CT.ui.modal.close();res(false)}},
          {label:ok,kind, onClick:()=>{CT.ui.modal.close();res(true)}}
        ]
      });
    });
  };

  CT.ui.form = {
    create({values={},fields=[],validate}){
      const wrap=document.createElement('form');
      const state=structuredClone(values);
      const inputs={};
      fields.forEach(f=>{
        const fs=document.createElement('div'); fs.className='form-field';
        const lab=document.createElement('label'); lab.textContent=f.label||f.key; fs.append(lab);
        let el;
        if(f.type==='select'){
          el=document.createElement('select');
          (f.options||[]).forEach(o=>{
            const opt=document.createElement('option'); opt.value=o; opt.textContent=o; el.append(opt);
          });
        }else if(f.type==='textarea'){ el=document.createElement('textarea'); el.rows=f.rows||3; }
        else if(f.type==='number'){ el=document.createElement('input'); el.type='number'; if(f.min!=null) el.min=f.min; if(f.step!=null) el.step=f.step; }
        else if(f.type==='file'){ el=document.createElement('input'); el.type='file'; if(f.accept) el.accept=f.accept; }
        else { el=document.createElement('input'); el.type='text'; if(f.placeholder) el.placeholder=f.placeholder; }
        el.name=f.key; if(el.type!=='file') el.value=state[f.key]??'';
        el.oninput=()=>{ state[f.key]=el.type==='number'? +el.value : el.value };
        const err=document.createElement('small'); err.className='error';
        fs.append(el,err); wrap.append(fs);
        inputs[f.key]={fs,el,err,meta:f};
      });
      const api={
        el:wrap,
        getValues:()=>structuredClone(state),
        setValues:(v)=>{Object.assign(state,v);for(const k in v){if(inputs[k] && inputs[k].el.type!=='file')inputs[k].el.value=v[k]}},
        setErrors:(errs)=>{for(const k in inputs){inputs[k].err.textContent=errs?.[k]||''}}
      };
      return api;
    }
  };

  return CT;
})();

