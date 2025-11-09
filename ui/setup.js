// CitiTool • Setup (RO/RU) — v4 safe CT checks + hard seeding
;(function (global) {
  "use strict";

  console.log('[Setup] boot');

  const K_GROUPS = 'CT_PROG_GROUPS_V1';
  const K_OLD    = 'CT_PROGS_V1';
  const K_LIVE   = 'CT_LIVE_V1';
  const SLOTS = 12;

  // --- safe storage (безопасно, если CT отсутствует) ---
  const storage = {
    get(k, def){
      try{
        if (global.CT && typeof global.CT.load === 'function') return global.CT.load(k, def);
        const raw = localStorage.getItem(k);
        if (raw===null || raw==='') return def;
        return JSON.parse(raw);
      }catch{ return def; }
    },
    set(k,v){
      try{
        if (global.CT && typeof global.CT.save === 'function') global.CT.save(k, v);
        else localStorage.setItem(k, JSON.stringify(v));
      }catch{}
    }
  };

  const now = ()=>Date.now();
  const uid = ()=>Math.random().toString(36).slice(2,10);
  const byCreatedDesc = (a,b)=>(b.createdAt||0)-(a.createdAt||0);
  const emptySide = (name)=>({name, slots:Array.from({length:SLOTS},(_,i)=>({pos:i+1,tnum:null,toolId:null,alias:''}))});
  const ph = ()=>'data:image/svg+xml;utf8,'+encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120">
       <rect width="100%" height="100%" fill="#f5f8ff"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             font-family="Inter,system-ui" font-size="14" fill="#8aa0c4">kein Foto</text>
     </svg>`);

  // --- Tools (минимум) ---
  const Tools = {
    list(){ return storage.get('CT_TOOLS_V1', [])||[]; },
    byId(id){ return this.list().find(t=>t.id===id); },
    createQuick(v){
      const t={id:uid(), name:(v.name||'Tool').trim(), iso:v.iso||'', code:v.code||'',
               category:v.category||'Allgemein', photo:v.photo||null, notes:v.notes||'',
               createdAt:now(), updatedAt:now()};
      storage.set('CT_TOOLS_V1',[t,...this.list()]); return t;
    }
  };

  // --- Core ---
  const Setup = {
    _hardSeed(){
      const demo=[];
      for(let i=0;i<5;i++){
        const nr=String(231800+i);
        const g={ id:uid(), nr, title:`Programm ${nr}`, zeichnungsNr:`Z${nr}`, material:i%2?'1.4112':'C45',
          drawing:null, notes:'', sides:{RO:emptySide('RO'), RU:emptySide('RU')},
          createdAt: now()-(5-i)*10000, updatedAt: now()-(5-i)*10000 };
        [1,3,5].forEach(p=>{
          g.sides.RO.slots[p-1].tnum=`T${String(p).padStart(2,'0')}${String(p).padStart(2,'0')}`;
          g.sides.RU.slots[p-1].tnum=`T${String(p+1).padStart(2,'0')}${String(p+1).padStart(2,'0')}`;
        });
        demo.push(g);
      }
      storage.set(K_GROUPS, demo.sort(byCreatedDesc));
      if (!storage.get(K_LIVE,null)) storage.set(K_LIVE,{RO:null,RU:null});
      console.log('[Setup] hard-seeded demo groups:', demo.length);
    },

    _migrateOld(){
      const old = storage.get(K_OLD, []);
      if(!Array.isArray(old) || !old.length) return false;
      const map = new Map();
      old.forEach(p=>{
        const key=(p.nr||p.title||'').toString(); if(!key) return;
        if(!map.has(key)){
          map.set(key,{ id:uid(), nr:p.nr||key, title:p.title||`Programm ${key}`,
            zeichnungsNr:p.meta?.oLine||'', material:'',
            drawing:p.drawing||null, notes:'',
            sides:{RO:emptySide('RO'), RU:emptySide('RU')}, createdAt:p.createdAt||now(), updatedAt:p.updatedAt||now() });
        }
        const g=map.get(key); const side=(p.side==='RU')?'RU':'RO';
        (Array.isArray(p.slots)?p.slots:[]).forEach(s=>{
          const i=Math.min(Math.max((s.pos||1)-1,0), SLOTS-1);
          g.sides[side].slots[i]={pos:i+1, tnum:s.tnum||null, toolId:s.toolId||null, alias:s.alias||''};
        });
      });
      const arr=[...map.values()].sort(byCreatedDesc);
      storage.set(K_GROUPS, arr);
      console.log('[Setup] migrated from old:', arr.length);
      return true;
    },

    ensure(){
      let groups = storage.get(K_GROUPS, null);
      if(!Array.isArray(groups) || !groups.length){
        if(!this._migrateOld()){
          this._hardSeed();
        }
      }
      if(!storage.get(K_LIVE,null)) storage.set(K_LIVE,{RO:null,RU:null});
    },

    list({q='', side=''}={}){
      const primary = storage.get(K_GROUPS, []);
      const fallback = (!primary || !primary.length) ? storage.get(K_OLD, []) : null;
      let groups = primary;

      if(!groups.length && Array.isArray(fallback) && fallback.length){
        const m = new Map();
        fallback.forEach(p=>{
          const key=(p.nr||p.title||'').toString(); if(!key) return;
          if(!m.has(key)) m.set(key,{id:uid(), nr:key, title:p.title||`Programm ${key}`,
            zeichnungsNr:p.meta?.oLine||'', material:'', drawing:p.drawing||null,
            sides:{RO:emptySide('RO'), RU:emptySide('RU')}, createdAt:now(), updatedAt:now()});
        });
        groups=[...m.values()];
      }

      const qq=(q||'').trim().toLowerCase();
      return groups.filter(g=>{
        if(side && !g.sides?.[side]) return false;
        if(!qq) return true;
        const hay=[g.nr,g.title,g.zeichnungsNr,g.material].join(' ').toLowerCase();
        return hay.includes(qq);
      }).sort(byCreatedDesc);
    },

    get(id){ return (storage.get(K_GROUPS,[])||[]).find(g=>g.id===id); },
    upsert(g){
      const arr=storage.get(K_GROUPS,[])||[];
      const i=arr.findIndex(x=>x.id===g.id);
      g.updatedAt=now(); if(i>=0) arr[i]=g; else { g.createdAt=now(); arr.unshift(g); }
      storage.set(K_GROUPS,arr); return g;
    },
    create({nr,title, zeichnungsNr, material, drawing=null, notes=''}){
      return this.upsert({ id:uid(), nr:(nr||'').trim()||String(Math.floor(Math.random()*1e6)),
        title:(title||'Untitled').trim(), zeichnungsNr:(zeichnungsNr||'').trim(), material:(material||'').trim(),
        drawing, notes, sides:{RO:emptySide('RO'), RU:emptySide('RU')}, createdAt:now(), updatedAt:now() });
    },
    remove(id){ storage.set(K_GROUPS,(storage.get(K_GROUPS,[])||[]).filter(g=>g.id!==id)); },
    live(){ return storage.get(K_LIVE,{RO:null,RU:null}); },
    applyLive(id,side){
      const g=this.get(id); if(!g) return null;
      const minimal={ id:g.id, nr:g.nr, side, title:g.title, slots:g.sides[side].slots, at:now() };
      const cur=this.live(); cur[side]=minimal; storage.set(K_LIVE,cur); return minimal;
    }
  };

  // --- UI список (сжатая версия; редактор как раньше при необходимости) ---
  const UI = {
    els:{}, state:{q:'',side:''},

    mount({qInput,listWrap,lastWrap,chipsSides,newBtn}){
      this.els={qInput,listWrap,lastWrap,chipsSides,newBtn};
      try{ Setup.ensure(); }catch(e){ console.warn('[Setup] ensure error', e); }

      qInput && qInput.addEventListener('input', (global.CT && CT.debounce? CT.debounce(()=>{ this.state.q=qInput.value; this.render(); },200) : ()=>{ this.state.q=qInput.value; this.render(); }));
      chipsSides && chipsSides.addEventListener('click', e=>{
        const b=e.target.closest('button[data-side]'); if(!b) return;
        chipsSides.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
        b.classList.add('active'); this.state.side=b.dataset.side||''; this.render();
      });
      newBtn && newBtn.addEventListener('click', ()=> this.openInfo( Setup.create({nr:'',title:'Neues Programm'}) ));
      this.render();
    },

    render(){
      let list=[];
      try{ list=Setup.list({q:this.state.q, side:this.state.side}); }catch(e){ console.warn('[Setup] list error', e); }
      if(!list.length){ try{ Setup._hardSeed(); list=Setup.list({}); }catch{} }

      const lastWrap=this.els.lastWrap;
      if (lastWrap){ lastWrap.innerHTML='';
        list.slice(0,3).forEach(g=>{
          const row=document.createElement('div'); row.className='kp';
          const img=document.createElement('img'); img.src=g.drawing||ph();
          const txt=document.createElement('div'); txt.className='txt';
          txt.innerHTML=`<div class="t">${g.title} — ${g.nr}</div><div class="m">${g.material||'—'} • ${g.zeichnungsNr||'—'}</div>`;
          const b=document.createElement('button'); b.className='btn btn--outline is-sm'; b.textContent='Öffnen'; b.onclick=()=>this.openInfo(g);
          row.append(img,txt,b); lastWrap.append(row);
        });
      }

      const wrap=this.els.listWrap; if(!wrap) return;
      wrap.innerHTML='';
      if(!list.length){
        const box=document.createElement('div'); box.className='empty';
        box.innerHTML='<div class="muted">Noch keine Programme.</div>';
        const btn=document.createElement('button'); btn.className='btn'; btn.textContent='+ Erste Gruppe anlegen';
        btn.onclick=()=> this.openInfo( Setup.create({nr:'',title:'Neues Programm'}) );
        box.append(btn); wrap.append(box); return;
      }

      const live=Setup.live();
      list.forEach(g=>{
        const row=document.createElement('div'); row.className='row';
        row.innerHTML=`<div><div class="title">${g.title} — ${g.nr}</div>
          <div class="meta">${g.material||'—'} • ${g.zeichnungsNr||'—'}${(live.RO?.id===g.id||live.RU?.id===g.id)?' • <span class="badge-live">Live</span>':''}</div></div>`;
        const right=document.createElement('div');
        const bOpen=document.createElement('button'); bOpen.className='btn'; bOpen.textContent='Öffnen';
        bOpen.onclick=()=>this.openInfo(g);
        right.append(bOpen); row.append(right); wrap.append(row);
      });
    },

    openInfo(g){
      // простой просмотр (без зависимостей от CT.ui.form), чтобы точно не падало
      const box=document.createElement('div');
      const img=document.createElement('img'); img.src=g.drawing||ph(); img.style.width='100%'; img.style.border='1px solid #edf1f7'; img.style.borderRadius='12px'; img.style.marginBottom='10px';
      const meta=document.createElement('div'); meta.className='list';
      const mk=(t,v)=>{ const r=document.createElement('div'); r.className='row'; r.innerHTML=`<div class="title">${t}</div><div class="badge">${v||'—'}</div>`; return r; };
      meta.append(mk('Nr',g.nr), mk('Zeichnungsnummer', g.zeichnungsNr), mk('Material', g.material));
      box.append(img, meta);

      if (global.CT && CT.ui && CT.ui.modal){
        CT.ui.modal.open({title:`${g.title} — ${g.nr}`, contentEl:box, footer:[{label:'Schließen', onClick:()=>CT.ui.modal.close()}], wide:true});
      } else {
        // fallback без модалки
        const w = window.open('', '_blank');
        w.document.write(`<pre>${JSON.stringify(g,null,2)}</pre>`);
      }
    }
  };

  global.Setup = Setup;
  global.SetupUI = UI;

})(window);