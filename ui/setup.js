// CitiTool • Setup (RO/RU) — v7 SINGLE OVERLAY + INLINE SLOT EDITOR
;(function (global) {
  "use strict";
  console.log('[Setup] v7 boot');

  const K_GROUPS='CT_PROG_GROUPS_V1', K_OLD='CT_PROGS_V1', K_LIVE='CT_LIVE_V1';
  const SLOTS = 12;

  // ---------- CSS ----------
  (function injectCSS(){
    const id='ct-setup-v7-css';
    if (document.getElementById(id)) return;
    const css = `
.ct-editor{position:fixed;inset:0;z-index:9999;display:grid;grid-template-rows:auto 1fr auto;
  background:linear-gradient(180deg,rgba(255,255,255,.85),rgba(255,255,255,.9));
  backdrop-filter:saturate(1.1) blur(10px); border-top:1px solid #e9eef6}
.ct-editor .bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid #e9eef6;background:#fff}
.ct-editor .bar .ttl{font:900 18px/1.1 Inter,system-ui}
.ct-editor .cnt{overflow:auto;padding:14px;max-width:980px;margin:0 auto;width:100%}
.ct-editor .img{width:100%;border:1px solid #edf1f7;border-radius:12px;object-fit:cover;margin-bottom:8px;background:#f5f8ff}
.ct-editor .rowbtns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.ct-editor .tabs{display:flex;gap:8px;margin:8px 0 12px}
.tab{padding:8px 12px;border:1px solid #dbe5ff;background:#fff;border-radius:12px;font-weight:800}
.tab.active{background:#eef3ff;box-shadow:inset 0 0 0 1px #d6e5ff}
.ct-editor .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media (max-width:560px){.ct-editor .grid{grid-template-columns:repeat(2,1fr)}}
.slot{border:1px solid #edf1f7;border-radius:16px;background:#fff;box-shadow:var(--shadow,0 10px 30px rgba(13,27,42,.08));overflow:hidden}
.slot .ph{height:84px;background:#f5f8ff;display:grid;place-items:center;border-bottom:1px solid #edf1f7}
.slot .ph img{max-width:100%;max-height:84px;object-fit:cover}
.slot .meta{padding:10px}
.slot .meta .t{font-weight:800}
.slot .meta .n{color:#6b7a90;font-size:13px}
.inl{border-top:1px dashed #e7ecf6;background:#fbfcff}
.inl .wrap{padding:10px;display:grid;gap:8px}
.inl .row{display:grid;gap:6px}
.inl label{font-weight:800}
.inl input{height:40px;border-radius:12px;border:1px solid #dbe5ff;padding:0 12px;font-weight:700}
.inl .img{width:100%;border:1px solid #edf1f7;border-radius:12px}
.inl .btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.ct-editor .ft{display:flex;gap:8px;justify-content:flex-end;padding:12px;border-top:1px solid #e9eef6;background:#fff}
.btn{height:40px;padding:0 14px;border-radius:14px;border:1px solid #dbe5ff;background:#fff;font-weight:800}
.btn--ghost{background:transparent}
.btn.brand{background:#2d6cdf;border-color:#2d6cdf;color:#fff;box-shadow:0 8px 20px rgba(45,108,223,.25)}
.btn.is-sm{height:32px;border-radius:12px;font-weight:800}
.badge-live{display:inline-grid;place-items:center;min-width:42px;height:28px;border-radius:10px;background:#eef3ff;color:#2d6cdf;font-weight:800;padding:0 10px}
.ct-sub{color:#6b7a90;font-size:13px}
.kp{display:flex;align-items:center;gap:10px}
.kp img{width:56px;height:56px;border-radius:12px;object-fit:cover;border:1px solid #edf1f7;background:#fff}
.kp .txt{display:grid}
.kp .txt .t{font-weight:800}
.kp .txt .m{color:#6b7a90;font-size:13px}
    `;
    const s=document.createElement('style'); s.id=id; s.textContent=css; document.head.appendChild(s);
  })();

  // ---------- utils ----------
  const storage = {
    get(k, def){
      try{
        if (global.CT && typeof global.CT.load==='function') return global.CT.load(k, def);
        const raw=localStorage.getItem(k); if(raw==null||raw==='') return def; return JSON.parse(raw);
      }catch{ return def; }
    },
    set(k,v){
      try{
        if (global.CT && typeof global.CT.save==='function') return global.CT.save(k, v);
        localStorage.setItem(k, JSON.stringify(v));
      }catch{}
    }
  };
  const now=()=>Date.now();
  const uid=()=>Math.random().toString(36).slice(2,10);
  const byCreatedDesc=(a,b)=>(b.createdAt||0)-(a.createdAt||0);
  const emptySide=(name)=>({name, slots:Array.from({length:SLOTS},(_,i)=>({pos:i+1,tnum:null,toolId:null,alias:''}))});
  const ph=()=>'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120"><rect width="100%" height="100%" fill="#f5f8ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter,system-ui" font-size="14" fill="#8aa0c4">kein Foto</text></svg>`);

  // ----- Tools mini -----
  const Tools = {
    list(){ return storage.get('CT_TOOLS_V1',[])||[]; },
    byId(id){ return this.list().find(t=>t.id===id); },
    createQuick({name,iso,code,photo,category='Allgemein',notes=''}) {
      const t={id:uid(), name:(name||'Tool').trim(), iso:iso||'', code:code||'', photo:photo||null, category, notes, createdAt:now(), updatedAt:now()};
      storage.set('CT_TOOLS_V1',[t, ...this.list()]); return t;
    }
  };

  // ---------- core data ----------
  const Setup = {
    _hardSeed(){
      const demo=[];
      for(let i=0;i<5;i++){
        const nr=String(231800+i);
        const g={ id:uid(), nr, title:`Programm ${nr}`, zeichnungsNr:`Z${nr}`, material:i%2?'1.4112':'C45',
          drawing:null, notes:'', sides:{RO:emptySide('RO'), RU:emptySide('RU')}, createdAt:now()-(5-i)*10000, updatedAt:now()-(5-i)*10000 };
        [1,3,5].forEach(p=>{
          g.sides.RO.slots[p-1].tnum=`T${String(p).padStart(2,'0')}${String(p).padStart(2,'0')}`;
          g.sides.RU.slots[p-1].tnum=`T${String(p+1).padStart(2,'0')}${String(p+1).padStart(2,'0')}`;
        });
        demo.push(g);
      }
      storage.set(K_GROUPS, demo.sort(byCreatedDesc));
      if(!storage.get(K_LIVE,null)) storage.set(K_LIVE,{RO:null,RU:null});
    },
    _migrateOld(){
      const old=storage.get(K_OLD,[]);
      if(!Array.isArray(old)||!old.length) return false;
      const map=new Map();
      old.forEach(p=>{
        const key=(p.nr||p.title||'').toString(); if(!key) return;
        if(!map.has(key)){
          map.set(key,{id:uid(), nr:p.nr||key, title:p.title||`Programm ${key}`, zeichnungsNr:p.meta?.oLine||'', material:'',
            drawing:p.drawing||null, notes:'', sides:{RO:emptySide('RO'), RU:emptySide('RU')}, createdAt:p.createdAt||now(), updatedAt:p.updatedAt||now()});
        }
        const g=map.get(key); const side=(p.side==='RU')?'RU':'RO';
        (Array.isArray(p.slots)?p.slots:[]).forEach(s=>{
          const i=Math.min(Math.max((s.pos||1)-1,0), SLOTS-1);
          g.sides[side].slots[i]={pos:i+1, tnum:s.tnum||null, toolId:s.toolId||null, alias:s.alias||''};
        });
      });
      storage.set(K_GROUPS, [...map.values()].sort(byCreatedDesc));
      return true;
    },
    ensure(){
      let groups=storage.get(K_GROUPS,null);
      if(!Array.isArray(groups)||!groups.length){ if(!this._migrateOld()) this._hardSeed(); }
      if(!storage.get(K_LIVE,null)) storage.set(K_LIVE,{RO:null,RU:null});
    },

    list({q='',side=''}={}) {
      const all=storage.get(K_GROUPS,[])||[];
      const qq=(q||'').trim().toLowerCase();
      return all.filter(g=>{
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
    create({nr,title,zeichnungsNr,material,drawing=null,notes=''}){
      return this.upsert({id:uid(), nr:(nr||'').trim()||String(Math.floor(Math.random()*1e6)),
        title:(title||'Untitled').trim(), zeichnungsNr:(zeichnungsNr||'').trim(), material:(material||'').trim(),
        drawing, notes, sides:{RO:emptySide('RO'), RU:emptySide('RU')}, createdAt:now(), updatedAt:now()});
    },
    remove(id){ storage.set(K_GROUPS, (storage.get(K_GROUPS,[])||[]).filter(g=>g.id!==id)); },
    live(){ return storage.get(K_LIVE,{RO:null,RU:null}); },
    applyLive(id,side){
      const g=this.get(id); if(!g) return null;
      const minimal={id:g.id,nr:g.nr,side,title:g.title,slots:g.sides[side].slots,at:now()};
      const cur=this.live(); cur[side]=minimal; storage.set(K_LIVE,cur); return minimal;
    }
  };

  // ---------- SINGLE overlay editor ----------
  const Editor = {
    open(group){
      if (this.el) { this.render(group); return; }
      this.el = document.createElement('div');
      this.el.className = 'ct-editor';
      this.el.innerHTML = `
        <div class="bar">
          <div class="ttl"></div>
          <div class="r">
            <button class="btn is-sm" data-act="live-ro">In Live (RO)</button>
            <button class="btn is-sm" data-act="live-ru">In Live (RU)</button>
            <button class="btn is-sm" data-act="del">Löschen</button>
            <button class="btn is-sm btn--ghost" data-act="cancel">Abbrechen</button>
            <button class="btn brand is-sm" data-act="save">Speichern</button>
          </div>
        </div>
        <div class="cnt"></div>
        <div class="ft ct-sub">Ein Editor pro Seite • «Abbrechen» schließt редактор</div>
      `;
      document.body.appendChild(this.el);
      this.el.addEventListener('click',(e)=>{
        const b=e.target.closest('button[data-act]'); if(!b) return;
        const act=b.dataset.act;
        if(act==='cancel'){ this.close(); }
        else if(act==='save'){ this._save(); }
        else if(act==='del'){ CT.ui.confirm({title:'Programm löschen?', msg:`${this.draft.title} — ${this.draft.nr}`}).then(ok=>{ if(ok){ Setup.remove(this.draft.id); this.close(); UI.render(); } }); }
        else if(act==='live-ro'){ Setup.applyLive(this.draft.id,'RO'); CT.ui.toast('Live RO gesetzt','ok'); }
        else if(act==='live-ru'){ Setup.applyLive(this.draft.id,'RU'); CT.ui.toast('Live RU gesetzt','ok'); }
      });
      document.documentElement.style.overflow='hidden';
      this.render(group);
    },
    close(){ if(!this.el) return; this.el.remove(); this.el=null; this.draft=null; document.documentElement.style.overflow=''; },

    render(group){
      this.draft = JSON.parse(JSON.stringify(group||{}));
      const cnt = this.el.querySelector('.cnt');
      const ttl = this.el.querySelector('.ttl');
      ttl.textContent = `${this.draft.title||'Programm'} — ${this.draft.nr||''}`;

      const img = document.createElement('img'); img.className='img'; img.src=this.draft.drawing||ph();
      const row = document.createElement('div'); row.className='rowbtns';
      const bSet = btn('Zeichnung ändern','is-sm'); bSet.onclick= async ()=>{
        const files=await CT.uploader.accept({accept:'image/*', to:'dataURL'}); if(files?.[0]){ this.draft.drawing=files[0].dataUrl; img.src=this.draft.drawing; }
      };
      const bClr = btn('Entfernen','is-sm'); bClr.onclick=()=>{ this.draft.drawing=null; img.src=ph(); };

      const form = (global.CT && CT.ui && CT.ui.form ? CT.ui.form.create({
        values:{ title:this.draft.title||'', nr:this.draft.nr||'', zeichnungsNr:this.draft.zeichnungsNr||'', material:this.draft.material||'', notes:this.draft.notes||'' },
        fields:[ {type:'text',key:'title',label:'Titel'}, {type:'text',key:'nr',label:'Programm-Nr'},
                 {type:'text',key:'zeichnungsNr',label:'Zeichnungsnummer'}, {type:'text',key:'material',label:'Material'},
                 {type:'textarea',key:'notes',label:'Notizen',rows:3} ]
      }) : null);

      let side='RO', openPos=null; // открыт ли инлайн-редактор
      const tabs=document.createElement('div'); tabs.className='tabs';
      const bRO=btn('RO','tab'); bRO.classList.add('active');
      const bRU=btn('RU','tab');
      tabs.append(bRO,bRU);
      bRO.onclick=()=>switchSide('RO');
      bRU.onclick=()=>switchSide('RU');

      const grid=document.createElement('div'); grid.className='grid';

      const drawSlots=()=>{
        grid.innerHTML='';
        const sideObj=this.draft.sides?.[side] || (this.draft.sides[side]=emptySide(side));
        sideObj.slots.forEach(slot=>{
          const art=document.createElement('article'); art.className='slot';
          const phb=document.createElement('div'); phb.className='ph';
          const tool = slot.toolId ? Tools.byId(slot.toolId) : null;
          if(tool?.photo){ const im=document.createElement('img'); im.src=tool.photo; phb.append(im); }
          else { phb.innerHTML='<svg width="54" height="54" viewBox="0 0 24 24" style="opacity:.35"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2z"/></svg>'; }
          const meta=document.createElement('div'); meta.className='meta';
          meta.innerHTML=`<div class="t">Pos ${slot.pos} • ${slot.tnum||'—'}</div><div class="n">${slot.alias || tool?.name || 'kein Werkzeug'}</div>`;
          const b=btn(openPos===slot.pos?'Schließen':'Bearbeiten','is-sm');
          b.onclick=()=>{
            openPos = (openPos===slot.pos ? null : slot.pos);
            drawSlots();
          };
          meta.append(b); art.append(phb,meta);

          // --- INLINE EDITOR ---
          if (openPos===slot.pos){
            const inl=document.createElement('div'); inl.className='inl';
            const wrap=document.createElement('div'); wrap.className='wrap';

            const img2=document.createElement('img'); img2.className='img'; img2.src=tool?.photo || ph();
            const row1=field('T-Nummer (z.B. T0101)','tn', slot.tnum||'');
            const row2=field('Alias / Titel','al', slot.alias||'');

            const btns=document.createElement('div'); btns.className='btns';
            const bPick=btn('Aus Tools wählen'); const bNew=btn('Neues Werkzeug',''); const bDetach=btn('Entfernen','is-sm');
            const bCancel=btn('Abbrechen',''); const bSave=btn('Speichern','brand');

            bPick.onclick=()=>{
              const list=Tools.list();
              if(!list.length){ CT.ui.toast('Keine Tools vorhanden','warn'); return; }
              const names=list.map((x,i)=>`${i+1}. ${x.name}`).join('\n');
              const n=prompt('Werkzeug Nr wählen:\n'+names+'\n\nGib die Nummer ein:');
              const idx=Number(n)-1; if(list[idx]){ slot.toolId=list[idx].id; img2.src=list[idx].photo||ph(); }
            };
            bNew.onclick= async ()=>{
              const name=prompt('Name des Werkzeugs:')||'Tool';
              let photo=null; try{ const files=await CT.uploader.accept({accept:'image/*', to:'dataURL'}); if(files?.[0]) photo=files[0].dataUrl; }catch{}
              const t=Tools.createQuick({name, photo}); slot.toolId=t.id; img2.src=t.photo||ph();
            };
            bDetach.onclick=()=>{ slot.toolId=null; img2.src=ph(); };
            bCancel.onclick=()=>{ openPos=null; drawSlots(); };
            bSave.onclick=()=>{
              slot.tnum = row1.querySelector('input').value.trim()||null;
              slot.alias = row2.querySelector('input').value.trim();
              Setup.upsert(this.draft);
              CT.ui.toast('Slot gespeichert','ok');
              openPos=null; drawSlots();
            };

            btns.append(bPick,bNew,bDetach,bCancel,bSave);
            wrap.append(img2,row1,row2,btns);
            inl.append(wrap); art.append(inl);
          }

          grid.append(art);
        });
      };
      const switchSide = (s)=>{ side=s; bRO.classList.toggle('active',s==='RO'); bRU.classList.toggle('active',s==='RU'); openPos=null; drawSlots(); };

      // сборка
      row.append(bSet,bClr);
      cnt.innerHTML=''; cnt.append(img,row);
      if (form) cnt.append(form.el);
      cnt.append(tabs, grid);
      switchSide('RO');

      this._save = ()=> {
        if(form){ const v=form.getValues(); Object.assign(this.draft,{title:v.title,nr:v.nr,zeichnungsNr:v.zeichnungsNr,material:v.material,notes:v.notes}); }
        Setup.upsert(this.draft);
        CT.ui.toast('Gespeichert','ok');
        ttl.textContent = `${this.draft.title||'Programm'} — ${this.draft.nr||''}`;
        UI.render();
      };
    }
  };

  function btn(label, extraClass=''){ const b=document.createElement('button'); b.className='btn ' + (extraClass||''); b.textContent=label; return b; }
  function field(label, key, val){ const d=document.createElement('div'); d.className='row'; d.innerHTML=`<label>${label}</label><input data-k="${key}" value="${val||''}">`; return d; }

  // ---------- list UI ----------
  const UI = {
    els:{}, state:{q:'',side:''},

    mount({qInput,listWrap,lastWrap,chipsSides,newBtn}){
      this.els={qInput,listWrap,lastWrap,chipsSides,newBtn};
      try{ Setup.ensure(); }catch(e){ console.warn(e); }
      const deb = (global.CT && CT.debounce) ? CT.debounce : (fn)=>fn;
      qInput && qInput.addEventListener('input', deb(()=>{ this.state.q=qInput.value; this.render(); },200));
      chipsSides && chipsSides.addEventListener('click', e=>{
        const b=e.target.closest('button[data-side]'); if(!b) return;
        chipsSides.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
        b.classList.add('active'); this.state.side=b.dataset.side||''; this.render();
      });
      newBtn && newBtn.addEventListener('click', ()=> Editor.open( Setup.create({nr:'',title:'Neues Programm'}) ));
      this.render();
    },

    render(){
      const list = Setup.list({q:this.state.q, side:this.state.side});
      const lastWrap=this.els.lastWrap; if(lastWrap){ lastWrap.innerHTML='';
        list.slice(0,3).forEach(g=>{
          const row=document.createElement('div'); row.className='kp';
          const img=document.createElement('img'); img.src=g.drawing||ph();
          const txt=document.createElement('div'); txt.className='txt';
          txt.innerHTML=`<div class="t">${g.title} — ${g.nr}</div><div class="m">${g.material||'—'} • ${g.zeichnungsNr||'—'}</div>`;
          const b=document.createElement('button'); b.className='btn is-sm'; b.textContent='Öffnen'; b.onclick=()=>Editor.open(g);
          row.append(img,txt,b); lastWrap.append(row);
        });
      }
      const wrap=this.els.listWrap; if(!wrap) return; wrap.innerHTML='';
      if(!list.length){
        const box=document.createElement('div'); box.className='empty'; box.innerHTML='<div class="ct-sub">Noch keine Programme.</div>';
        const btn=document.createElement('button'); btn.className='btn'; btn.textContent='+ Erste Gruppe anlegen';
        btn.onclick=()=> Editor.open( Setup.create({nr:'',title:'Neues Programm'}) );
        box.append(btn); wrap.append(box); return;
      }
      const live=Setup.live();
      list.forEach(g=>{
        const row=document.createElement('div'); row.className='row';
        row.innerHTML=`<div><div class="title">${g.title} — ${g.nr}</div>
          <div class="ct-sub">${g.material||'—'} • ${g.zeichnungsNr||'—'}${(live.RO?.id===g.id||live.RU?.id===g.id)?' • <span class="badge-live">Live</span>':''}</div></div>`;
        const right=document.createElement('div');
        const bOpen=document.createElement('button'); bOpen.className='btn'; bOpen.textContent='Öffnen';
        const bDel=document.createElement('button'); bDel.className='btn is-sm'; bDel.textContent='Löschen';
        bOpen.onclick=()=>Editor.open(g);
        bDel.onclick=()=>CT.ui.confirm({title:'Löschen?',msg:`${g.title} — ${g.nr}`}).then(ok=>{ if(ok){ Setup.remove(g.id); this.render(); }});
        right.append(bOpen,bDel); row.append(right); wrap.append(row);
      });
    }
  };

  // экспорт
  global.Setup = Setup;
  global.SetupUI = UI;

  try{ Setup.ensure(); }catch(e){ console.warn(e); }
})(window);