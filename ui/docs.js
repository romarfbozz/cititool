// CitiTool • Docs module (чистая логика + миграция). Работает через CT.load/CT.save и CT.ui.*
;(function(global){
  const K_DOCS = 'CT_DOCS_V1';
  const K_CATS = 'CT_DOC_CATS_V1';

  const now  = () => Date.now();
  const uid  = () => Math.random().toString(36).slice(2,10);
  const trim = s => (s||'').toString().trim();
  const toNum = v => {
    if (typeof v === 'number') return v;
    const t = Date.parse(v); return Number.isFinite(t) ? t : now();
  };
  const uniq = arr => [...new Set(arr)];

  function normalizeDoc(d){
    // tags может быть массивом или строкой
    const tags = Array.isArray(d.tags)
      ? d.tags.map(trim).filter(Boolean)
      : (typeof d.tags === 'string'
          ? trim(d.tags).split(',').map(trim).filter(Boolean)
          : []);
    // поддержка legacy: desc -> text
    const text = d.text ?? d.desc ?? '';
    return {
      id: d.id || uid(),
      title: trim(d.title) || 'Untitled',
      category: trim(d.category) || 'Allgemein',
      tags,
      text,
      imgData: d.imgData || null,
      file: d.file || null,
      favorite: !!d.favorite,
      createdAt: d.createdAt ? toNum(d.createdAt) : now(),
      updatedAt: d.updatedAt ? toNum(d.updatedAt) : now(),
    };
  }

  function migrateIfNeeded(){
    const cur = CT.load(K_DOCS, null);
    if (!cur) return false;
    let changed = false;
    const next = (cur||[]).map(d=>{
      const n = normalizeDoc(d);
      // если что-то изменилось — пометим
      if (JSON.stringify(n) !== JSON.stringify(d)) changed = true;
      return n;
    });
    if (changed) CT.save(K_DOCS, next);
    // категории
    let cats = CT.load(K_CATS, null);
    if (!cats || !Array.isArray(cats) || cats.length===0){
      cats = uniq(next.map(x=> x.category));
      if (!cats.includes('Allgemein')) cats.unshift('Allgemein');
      CT.save(K_CATS, cats);
      changed = true;
    }
    return changed;
  }

  const Docs = {
    // ===== Storage / seeds / migration =====
    ensureSeeds(){
      migrateIfNeeded();
      if (!CT.load(K_CATS, null)) CT.save(K_CATS, ['Allgemein','Setup','Material']);
      if (!CT.load(K_DOCS, null)) {
        const n = now();
        const demo = Array.from({length:5}, (_,i)=> normalizeDoc({
          title: `Demo Doku ${i+1}`,
          category: i%2 ? 'Setup' : 'Material',
          tags: i%2 ? ['check','setup'] : ['material','tip'],
          text: i%2 ? 'Schrauben, Anschläge, Reitstock…' : 'Hinweise zur Kühlung/ISO-P…',
          createdAt: n - i*1000,
          updatedAt: n - i*1000,
        }));
        CT.save(K_DOCS, demo);
      }
    },

    load(){ return CT.load(K_DOCS, []) || []; },
    save(arr){ CT.save(K_DOCS, arr); },
    loadCats(){ return CT.load(K_CATS, ['Allgemein']); },
    saveCats(arr){
      const out = uniq((arr||[]).map(trim).filter(Boolean));
      CT.save(K_CATS, out.length? out : ['Allgemein']);
    },

    // ===== Queries =====
    list(filter={}){
      const docs = this.load();
      const q = (filter.q||'').toLowerCase();
      return docs.filter(d=>{
        if (filter.cat && d.category !== filter.cat) return false;
        if (filter.tag && !(d.tags||[]).includes(filter.tag)) return false;
        if (!q) return true;
        const hay = [d.title||'', d.text||'', d.category||'', (d.tags||[]).join(',')].join(' ').toLowerCase();
        return hay.includes(q);
      }).sort((a,b)=> (b.createdAt||0) - (a.createdAt||0));
    },

    // ===== Mutations =====
    create(input={}){
      const cur = normalizeDoc(input);
      cur.createdAt = now();
      cur.updatedAt = now();
      const docs = this.load();
      this.save([cur, ...docs]); // новое сверху
      const cats = this.loadCats();
      if (!cats.includes(cur.category)) this.saveCats([...cats, cur.category]);
      return cur;
    },

    update(id, patch={}){
      const docs = this.load();
      const i = docs.findIndex(d=>d.id===id);
      if (i<0) throw new Error('Doc not found');
      const next = normalizeDoc({...docs[i], ...patch, updatedAt: now()});
      docs[i] = next;
      this.save(docs);
      const cats = this.loadCats();
      if (!cats.includes(next.category)) this.saveCats([...cats, next.category]);
      return next;
    },

    remove(id){
      this.save(this.load().filter(d=>d.id!==id));
    },

    // ===== Import/Export =====
    import(list, mode='merge'){
      if (!Array.isArray(list)) throw new Error('Bad import format');
      if (mode==='replace'){
        const normalized = list.map(normalizeDoc).sort((a,b)=>b.createdAt-a.createdAt);
        this.save(normalized);
        const cats = uniq(normalized.map(d=> trim(d.category)||'Allgemein'));
        this.saveCats(cats.length? cats : ['Allgemein']);
        return {added: normalized.length, updated: 0};
      }
      const cur = this.load();
      const map = new Map(cur.map(d=>[d.id,d]));
      let added=0, updated=0;
      list.forEach(d=>{
        const n = normalizeDoc(d);
        if (map.has(n.id)) { map.set(n.id, n); updated++; }
        else { map.set(n.id, n); added++; }
      });
      const merged = [...map.values()].sort((a,b)=>b.createdAt-a.createdAt);
      this.save(merged);
      const cats = uniq(merged.map(d=>d.category));
      this.saveCats(cats);
      return {added, updated};
    },

    export(){ return this.load(); },

    // ===== Categories =====
    cats: {
      add(name){
        name = trim(name); if(!name) return;
        const cats = Docs.loadCats();
        if (!cats.includes(name)) Docs.saveCats([...cats, name]);
      },
      rename(from, to){
        from=trim(from); to=trim(to);
        if(!from || !to || from===to) return;
        const docs = Docs.load().map(d=> d.category===from ? {...d, category:to, updatedAt:now()} : d );
        Docs.save(docs);
        const cats = Docs.loadCats().map(c=> c===from? to : c);
        Docs.saveCats(cats);
      },
      remove(name, reassignTo='Allgemein'){
        name=trim(name); reassignTo=trim(reassignTo)||'Allgemein';
        if(!name || name===reassignTo) return;
        const docs = Docs.load().map(d=> d.category===name ? {...d, category:reassignTo, updatedAt:now()} : d );
        Docs.save(docs);
        const cats = Docs.loadCats().filter(c=> c!==name);
        if (!cats.includes(reassignTo)) cats.push(reassignTo);
        Docs.saveCats(cats);
      }
    },

    // ===== Utils =====
    truncate(text='', max=120){
      const s = (text||'').toString();
      if (s.length<=max) return s;
      const cut = s.slice(0,max).replace(/\s+[^\s]*$/, '');
      return cut + '…';
    },

    async resizeImageToDataURL(file, max=512){
      return new Promise((resolve)=>{
        try{
          const fr = new FileReader();
          fr.onload = () => {
            const img = new Image();
            img.onload = ()=>{
              const ratio = Math.max(img.width, img.height) / max;
              const w = ratio>1 ? Math.round(img.width/ratio) : img.width;
              const h = ratio>1 ? Math.round(img.height/ratio) : img.height;
              const c = document.createElement('canvas');
              c.width = w; c.height = h;
              const ctx = c.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              resolve(c.toDataURL('image/jpeg', .85));
            };
            img.onerror = ()=> resolve(null);
            img.src = fr.result;
          };
          fr.onerror = ()=> resolve(null);
          fr.readAsDataURL(file);
        }catch{ resolve(null) }
      });
    }
  };

  global.Docs = Docs; // доступно как window.Docs
})(window);
