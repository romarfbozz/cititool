// глобальный CT
window.CT = window.CT || {};
(function(){
  // events
  const bus = {};
  CT.on = (ev, fn)=> (bus[ev] ||= []).push(fn);
  CT.emit = (ev, payload)=> (bus[ev]||[]).forEach(f=>f(payload));

  // storage + utils (минимальные, общие)
  CT.now = () => new Date().toISOString();
  CT.id  = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
  CT.load = (k, def) => { try{ return JSON.parse(localStorage.getItem(k)) ?? def }catch{ return def } };
  CT.save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // neo helpers
  CT.neo = CT.neo || {};

  CT.neo.wireSearch = (box, input)=>{
    box.addEventListener('click', ()=>{ box.classList.add('active'); input.focus(); });
    input.addEventListener('blur', ()=>{ if(!input.value) box.classList.remove('active'); });
    input.addEventListener('input', ()=> CT.emit('search', input.value.trim()));
  };

  CT.neo.mirrorClicks = (a, b, evName)=>{
    const h = ()=> CT.emit(evName);
    a && (a.onclick = h); b && (b.onclick = h);
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
    document.querySelectorAll('.dock a').forEach(a=>{
      a.classList.toggle('active', a.dataset.id === id);
    });
  };

  // Checklist widget (drag, add, edit, delete)
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
          <button class="btn link">Löschen</button>
        `;
        const [handle, cb, inp, del] = [row.children[0], row.children[1], row.children[2], row.children[3]];
        cb.onchange = ()=>{ it.done = cb.checked; it.updatedAt = CT.now(); onChange?.(items) };
        inp.onchange = ()=>{ it.text = inp.value.trim(); it.updatedAt = CT.now(); onChange?.(items) };
        del.onclick   = ()=>{ items = items.filter(x=>x.id!==it.id); onChange?.(items); render(); };

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
})();