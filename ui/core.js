<script>
window.CT = window.CT || { ui:{} };

/* ---------- Хранилище ---------- */
CT.store = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch{ return d } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) }
};
CT.KEYS = { DOCS:'ct_docs', CATS:'ct_cats' };

/* ---------- Категории (глобально) ---------- */
CT.cat = {
  list(){ return CT.store.get(CT.KEYS.CATS, ['Allgemein','Check','Tipps']); },
  ensure(name){
    let cats = this.list();
    if(name && !cats.includes(name)){ cats.push(name); CT.store.set(CT.KEYS.CATS, cats); }
    return cats;
  }
};

/* ---------- Утилиты ---------- */
CT.escape = s => String(s ?? '').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- Универсальный чип-фильтр категорий ---------- */
CT.ui.categoryFilter = function({mount, selected='Alle', onSelect}){
  mount.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'ct-chips';
  const cats = ['Alle', ...CT.cat.list()];
  cats.forEach(c=>{
    const b = document.createElement('button');
    b.className = 'chip'+(c===selected?' active':'');
    b.textContent = c;
    b.onclick = ()=>{
      [...wrap.children].forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      onSelect?.(c);
    };
    wrap.appendChild(b);
  });
  mount.appendChild(wrap);
  return wrap;
};

/* ---------- Универсальная модалка предпросмотра/форм ---------- */
CT.ui.previewModal = function({title, body, footer}){
  const m = document.createElement('div');
  m.className = 'ct-modal show';
  m.innerHTML = `
    <div class="overlay"></div>
    <div class="card">
      <div class="hdr">
        <strong class="ttl">${CT.escape(title||'')}</strong>
        <button class="icon-btn" data-x aria-label="Schließen">×</button>
      </div>
      <div class="cnt"></div>
      <div class="ftr"></div>
    </div>`;
  (body  instanceof Node ? m.querySelector('.cnt').append(body)   : m.querySelector('.cnt').innerHTML  = body ?? '');
  (footer instanceof Node ? m.querySelector('.ftr').append(footer): m.querySelector('.ftr').innerHTML = footer ?? '');
  m.addEventListener('click', e=>{ if(e.target.matches('.overlay,[data-x]')) m.remove(); });
  document.body.appendChild(m);
  return m;
};

/* ---------- Документы (CRUD) ---------- */
CT.docs = {
  all(){ return CT.store.get(CT.KEYS.DOCS, []); },
  save(list){ CT.store.set(CT.KEYS.DOCS, list); },
  upsert(doc){
    let arr = this.all();
    if(!doc.id) doc.id = (crypto?.randomUUID?.() || String(Date.now()));
    const i = arr.findIndex(d=>d.id===doc.id);
    if(i>-1) arr[i] = doc; else arr.unshift(doc);
    this.save(arr); return doc;
  },
  remove(id){ this.save(this.all().filter(d=>d.id!==id)); }
};
</script>