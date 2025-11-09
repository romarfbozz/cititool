// CitiTool • Tools module (логика + миграция). Хранение через CT.load/CT.save.
;(function(global){
  const K_TOOLS = 'CT_TOOLS_V1';
  const K_CATS  = 'CT_TOOL_CATS_V1';

  const now  = () => Date.now();
  const uid  = () => Math.random().toString(36).slice(2,10);
  const trim = s => (s||'').toString().trim();
  const toNum = v => (typeof v==='number' ? v : (Number.isFinite(Date.parse(v)) ? Date.parse(v) : Date.now()));
  const uniq = a => [...new Set(a)];

  function normalize(t){
    const tags = Array.isArray(t.tags)
      ? t.tags.map(trim).filter(Boolean)
      : (typeof t.tags==='string' ? t.tags.split(',').map(trim).filter(Boolean) : []);
    return {
      id: t.id || uid(),
      name: trim(t.name) || 'Untitled',
      iso: trim(t.iso||''),
      code: trim(t.code||''),
      category: trim(t.category)||'Allgemein',
      photo: t.photo || null,              // dataURL
      tags,
      notes: t.notes || '',
      createdAt: t.createdAt ? toNum(t.createdAt) : now(),
      updatedAt: t.updatedAt ? toNum(t.updatedAt) : now(),
    };
  }

  function migrate(){
    const cur = CT.load(K_TOOLS, null);
    if (!cur) return;
    let changed=false;
    const next = (cur||[]).map(x=>{
      const n = normalize(x);
      if (JSON.stringify(n)!==JSON.stringify(x)) changed=true;
      return n;
    });
    if (changed) CT.save(K_TOOLS, next);

    let cats = CT.load(K_CATS, null);
    if (!cats || !Array.isArray(cats) || cats.length===0){
      cats = uniq((next||[]).map(x=>x.category));
      if (!cats.includes('Allgemein')) cats.unshift('Allgemein');
      CT.save(K_CATS, cats);
    }
  }

  const Tools = {
    ensureSeeds(){
      migrate();
      if (!CT.load(K_CATS, null)) CT.save(K_CATS, ['Allgemein','Drehen','Halter','Gewinde']);
      if (!CT.load(K_TOOLS, null)) {
        const n = now();
        const demo = [
          {name:'CNMG120408', iso:'CNMG 120408', code:'ISO-P', category:'Drehen', tags:['wendeschneidplatte','ISO-P'], notes:'Universal P.', createdAt:n-1000, updatedAt:n-1000},
          {name:'DNMG150608', iso:'DNMG 150608', code:'ISO-M', category:'Drehen', tags:['edelstahl'], notes:'Für M.', createdAt:n-2000, updatedAt:n-2000},
          {name:'WNMG080408', iso:'WNMG 080408', code:'ISO-K', category:'Drehen', tags:['guss'], notes:'Guss.', createdAt:n-3000, updatedAt:n-3000},
          {name:'SCLCR1212F09', iso:'Halter 12x12', code:'CCMT09', category:'Halter', tags:['halter'], notes:'Innen L.', createdAt:n-4000, updatedAt:n-4000},
          {name:'ER16', iso:'Gewindplatte ER16', code:'60°', category:'Gewinde', tags:['gewinde'], notes:'Metrisch.', createdAt:n-5000, updatedAt:n-5000},
        ].map(normalize);
        CT.save(K_TOOLS, demo);
      }
    },

    // storage
    load(){ return CT.load(K_TOOLS, [])||[]; },
    save(arr){ CT.save(K_TOOLS, arr); },
    loadCats(){ return CT.load(K_CATS, ['Allgemein']); },
    saveCats(arr){
      const out = uniq((arr||[]).map(trim).filter(Boolean));
      CT.save(K_CATS, out.length? out : ['Allgemein']);
    },

    // query
    list(filter={}){
      const q = (filter.q||'').toLowerCase();
      return this.load().filter(t=>{
        if (filter.cat && t.category!==filter.cat) return false;
        if (filter.tag && !(t.tags||[]).includes(filter.tag)) return false;
        if (!q) return true;
        const hay = [
          t.name||'', t.iso||'', t.code||'', t.category||'',
          t.notes||'', (t.tags||[]).join(',')
        ].join(' ').toLowerCase();
        return hay.includes(q);
      }).sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
    },

    // mutate
    create(input={}){
      const cur = normalize(input);
      cur.createdAt = now(); cur.updatedAt = now();
      this.save([cur, ...this.load()]);
      const cats = this.loadCats();
      if (!cats.includes(cur.category)) this.saveCats([...cats, cur.category]);
      return cur;
    },
    update(id, patch={}){
      const list = this.load();
      const i = list.findIndex(x=>x.id===id);
      if (i<0) throw new Error('Tool not found');
      const next = normalize({...list[i], ...patch, updatedAt: now()});
      list[i]=next; this.save(list);
      const cats = this.loadCats();
      if (!cats.includes(next.category)) this.saveCats([...cats, next.category]);
      return next;
    },
    remove(id){ this.save(this.load().filter(x=>x.id!==id)); },

    // import/export (на будущее)
    import(list, mode='merge'){
      if (!Array.isArray(list)) throw new Error('Bad import');
      if (mode==='replace'){
        const norm = list.map(normalize).sort((a,b)=>b.createdAt-a.createdAt);
        this.save(norm);
        const cats = uniq(norm.map(x=>x.category)); this.saveCats(cats.length?cats:['Allgemein']);
        return {added:norm.length, updated:0};
      }
      const cur = this.load(); const map = new Map(cur.map(x=>[x.id,x]));
      let added=0, updated=0;
      list.forEach(x=>{
        const n = normalize(x);
        if (map.has(n.id)){ map.set(n.id,n); updated++; } else { map.set(n.id,n); added++; }
      });
      const merged=[...map.values()].sort((a,b)=>b.createdAt-a.createdAt);
      this.save(merged);
      this.saveCats(uniq(merged.map(x=>x.category)));
      return {added,updated};
    },
    export(){ return this.load(); },

    cats:{
      add(name){ name=trim(name); if(!name) return;
        const cats = Tools.loadCats(); if(!cats.includes(name)) Tools.saveCats([...cats,name]); },
      rename(from,to){ from=trim(from); to=trim(to); if(!from||!to||from===to) return;
        const list = Tools.load().map(x=> x.category===from? {...x,category:to,updatedAt:now()} : x);
        Tools.save(list);
        Tools.saveCats(Tools.loadCats().map(c=> c===from?to:c));
      },
      remove(name, reassign='Allgemein'){
        name=trim(name); reassign=trim(reassign)||'Allgemein';
        if(!name||name===reassign) return;
        const list = Tools.load().map(x=> x.category===name? {...x,category:reassign,updatedAt:now()} : x);
        Tools.save(list);
        const cats = Tools.loadCats().filter(c=>c!==name);
        if(!cats.includes(reassign)) cats.push(reassign);
        Tools.saveCats(cats);
      }
    },

    async resizeImageToDataURL(file, max=512){
      return new Promise(resolve=>{
        try{
          const fr = new FileReader();
          fr.onload = ()=>{
            const img=new Image();
            img.onload=()=>{
              const ratio = Math.max(img.width,img.height)/max;
              const w = ratio>1? Math.round(img.width/ratio):img.width;
              const h = ratio>1? Math.round(img.height/ratio):img.height;
              const c=document.createElement('canvas'); c.width=w; c.height=h;
              c.getContext('2d').drawImage(img,0,0,w,h);
              resolve(c.toDataURL('image/jpeg', .85));
            };
            img.onerror=()=>resolve(null);
            img.src = fr.result;
          };
          fr.onerror=()=>resolve(null);
          fr.readAsDataURL(file);
        }catch{ resolve(null) }
      });
    }
  };

  global.Tools = Tools;
})(window);
