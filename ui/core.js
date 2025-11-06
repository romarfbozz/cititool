(function(){
  const CT = window.CT = window.CT || {};
  CT.storage = {
    get:(k,def)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):def}catch(e){return def}},
    set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))
  };

  /* поиск (лупа) */
  function initSearch(){
    const sb = document.querySelector('#searchbar');
    const btn= document.querySelector('#btnSearch');
    const input=document.querySelector('#globalSearch');
    if(!sb||!btn) return;
    const collapse=()=>sb.classList.add('collapsed');
    btn.addEventListener('click',()=>{sb.classList.toggle('collapsed'); if(!sb.classList.contains('collapsed')) setTimeout(()=>input?.focus(),30);});
    document.addEventListener('click',e=>{
      if(!sb.classList.contains('collapsed')){
        const inside = sb.contains(e.target)||btn.contains(e.target);
        if(!inside) collapse();
      }
    },{passive:true});
    window.addEventListener('scroll',collapse,{passive:true});
  }

  /* ===== Produktion demo ===== */
  function initProd(){
    const wrap = document.querySelector('#prodList');
    const btnNew= document.querySelector('#btnNewJob');
    if(!wrap||!btnNew) return;

    let jobs = CT.storage.get('CT_DEMO_JOBS',[
      {id:'los-123', name:'Los 123', total:100, done:20, date:'05.11.2025'}
    ]);

    function render(){
      wrap.innerHTML = '';
      jobs.forEach(j=>{
        const p = Math.round((j.done/j.total)*100);
        const card = document.createElement('div');
        card.className='card'; card.style.marginBottom='10px';
        card.innerHTML = `
          <div class="row" style="justify-content:space-between;align-items:center">
            <div><b>${j.name}</b></div>
            <button class="icon-btn" title="Info">
              <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm1 14h-2v-6h2v6Zm-1-8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/></svg>
            </button>
          </div>
          <div class="bar" style="margin:10px 0 8px">
            <div style="width:${p}%"></div>
            <div class="lbl">${p}%</div>
          </div>
          <div class="muted">${j.done} / ${j.total} • ${j.date}</div>
          <div class="row" style="margin-top:10px">
            <button class="btn" data-action="minus">-10</button>
            <button class="btn brand" data-action="plus">+10</button>
          </div>`;
        card.querySelector('[data-action="plus"]').onclick=()=>{j.done=Math.min(j.total,j.done+10);save()};
        card.querySelector('[data-action="minus"]').onclick=()=>{j.done=Math.max(0,j.done-10);save()};
        wrap.appendChild(card);
      });
    }
    function save(){CT.storage.set('CT_DEMO_JOBS',jobs);render()}
    btnNew.addEventListener('click',()=>{
      const n = jobs.length+1;
      jobs.unshift({id:'los-'+(100+n), name:'Los '+(100+n), total:100, done:0, date:new Date().toLocaleDateString()});
      save();
    });
    render();
  }

  /* ===== Checklist: add + drag ===== */
  function initChecklist(){
    const list = document.querySelector('#clist');
    const addBtn = document.querySelector('#btnAddCheck');
    const clrBtn = document.querySelector('#btnClearChecked');
    if(!list||!addBtn||!clrBtn) return;

    let items = CT.storage.get('CT_DEMO_CHECK',[
      {id:1, text:'Aufspann-Check', done:false},
      {id:2, text:'Werkzeug prüfen', done:false},
    ]);
    let dragId=null;

    function liTemplate(it){
      const li=document.createElement('li'); li.draggable=true; li.dataset.id=it.id;
      li.innerHTML=`
        <span class="handle">≡</span>
        <input type="checkbox"${it.done?' checked':''} aria-label="done">
        <input type="text" value="${it.text}">
        <button class="icon-btn" title="Löschen" aria-label="delete">
          <svg viewBox="0 0 24 24"><path d="M6 7h12v2H6V7Zm2 3h8l-1 9H9l-1-9Zm2-6h4l1 2H9l1-2Z"/></svg>
        </button>`;
      li.querySelector('input[type="checkbox"]').onchange=e=>{it.done=e.target.checked;save()};
      li.querySelector('input[type="text"]').oninput=e=>{it.text=e.target.value;save()};
      li.querySelector('button').onclick=()=>{items=items.filter(x=>x.id!==it.id);save()};
      li.addEventListener('dragstart',()=>{dragId=it.id; li.style.opacity=.5});
      li.addEventListener('dragend',()=>{dragId=null; li.style.opacity=1});
      li.addEventListener('dragover',e=>{
        e.preventDefault();
        const tgtId = Number(li.dataset.id);
        if(dragId===tgtId) return;
        const from = items.findIndex(x=>x.id===dragId);
        const to   = items.findIndex(x=>x.id===tgtId);
        items.splice(to,0,items.splice(from,1)[0]); render(); CT.storage.set('CT_DEMO_CHECK',items);
      });
      // touch-drag (простое): перехват на handle
      li.querySelector('.handle').addEventListener('touchstart',()=>{li.draggable=true},{passive:true});
      li.querySelector('.handle').addEventListener('touchend',()=>{li.draggable=false},{passive:true});
      return li;
    }

    function render(){
      list.innerHTML=''; items.forEach(it=>list.appendChild(liTemplate(it)));
    }
    function save(){CT.storage.set('CT_DEMO_CHECK',items);render()}

    addBtn.onclick=()=>{items.push({id:Date.now(),text:'Neuer Punkt',done:false});save()};
    clrBtn.onclick=()=>{items=items.filter(x=>!x.done);save()};
    render();
  }

  document.addEventListener('DOMContentLoaded',()=>{
    initSearch();
    initProd();
    initChecklist();
  });
})();