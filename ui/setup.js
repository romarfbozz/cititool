// CitiTool • Setup (RO/RU) — v5 editor + slots + safe init
;(function (global) {
  "use strict";
  console.log('[Setup] v5 boot');

  const K_GROUPS='CT_PROG_GROUPS_V1', K_OLD='CT_PROGS_V1', K_LIVE='CT_LIVE_V1';
  const SLOTS = 12;

  // ---- style injection (минимум для слотов) ----
  (function inject(){
    const css = `
.grid-slots{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.slot{border:1px solid #edf1f7;border-radius:16px;background:#fff;box-shadow:var(--shadow,0 10px 30px rgba(13,27,42,.08));overflow:hidden}
.slot .ph{height:84px;background:#f5f8ff;display:grid;place-items:center;border-bottom:1px solid #edf1f7}
.slot .ph img{max-width:100%;max-height:84px;object-fit:cover}
.slot .meta{padding:10px}
.slot .meta .t{font-weight:800}
.slot .meta .n{color:#6b7a90;font-size:13px}
.ro-ru{display:flex;gap:8px;margin:6px 0 12px}
.ro-ru .tab{padding:8px 12px;border:1px solid #dbe5ff;background:#fff;border-radius:12px;font-weight:800;cursor:pointer}
.ro-ru .tab.active{background:#eef3ff;box-shadow:inset 0 0 0 1px #d6e5ff}
.badge-live{display:inline-grid;place-items:center;min-width:42px;height:28px;border-radius:10px;background:#eef3ff;color:#2d6cdf;font-weight:800;padding:0 10px}
.kp{display:flex;align-items:center;gap:10px}
.kp img{width:56px;height:56px;border-radius:12px;object-fit:cover;border:1px solid #edf1f7;background:#fff}
.kp .txt{display:grid}
.kp .txt .t{font-weight:800}
.kp .txt .m{color:#6b7a90;font-size:13px}
@media (max-width:560px){ .grid-slots{grid-template-columns:repeat(2,1fr)} }
    `;
    const id='ct-setup-v5-css';
    if (!document.getElementById(id)) {
      const s=document.createElement('style'); s.id=id; s.textContent=css; document.head.appendChild(s);
    }
  })();

  // ---- safe storage ----
  const storage = {
    get(k, def){
      try{
        if (global.CT && typeof global.CT.load==='function') return global.CT.load(k, def);
        const raw=localStorage.getItem(k); if(raw==null||raw==='') return def; return JSON.parse(raw);
      }catch{ return def; }
    },
    set(k,v){
      try{
        if (global.CT && typeof global.CT.save==='function') global.CT.save(k,v);
        else localStorage.setItem(k, JSON.stringify(v));
      }catch{}
    }
  };
  const now=()=>Date.now();
  const uid=()=>Math.random().toString(36).slice(2,10);
  const byCreatedDesc=(a,b)=>(b.createdAt||0)-(a.createdAt||0);
  const emptySide=(name)=>({name, slots:Array.from({length:SLOTS},(_,i)=>({pos:i+1,tnum:null,toolId:null,alias:''}))});
  const ph=()=>'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120"><rect width="100%" height="100%" fill="#f5f8ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter,system-ui" font-size="14" fill="#8aa0c4">kein Foto</text></svg>`);

  // ---- Tools mini ----
  const Tools = {
    list(){ return storage.get('CT_TOOLS_V1',[])||[]; },
    byId(id){ return this.list().find(t=>t.id===id); },
    createQuick({name,iso,code,photo,category='Allgemein',notes=''}) {
      const t={id:uid(), name:(name||'Tool').trim(), iso:iso||'', code:code||'', photo:photo||null, category, notes, createdAt:now(), updatedAt:now()};
      storage.set('CT_TOOLS_V1',[t, ...this.list()]); return t;
    },
    pick(cb){
      if (global.CT && CT.selector && CT.selector.tools){ CT.selector.tools({onPick:cb, allowNew:true}); return; }
      // fallback простой список
      const box=document.createElement('div');
      const list=this.list(); if(!list.length){ box.textContent='Noch keine Tools.'; }
      list.forEach(t=>{
        const r=document.createElement('div'); r.className='row'; r.innerHTML=`<div class="title">${t.name}</div><div class="badge">${t.iso||t.code||'—'}</div>`;
        r.onclick=()=>{ cb(t); CT.ui.modal.close(); }; box.append(r);
      });
      CT.ui.modal.open({title:'Werkzeug wählen', contentEl:box, footer:[{label:'Abbrechen', onClick:()=>CT.ui.modal.close()}]});
    }
  };

  // ---- Core ----
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
      console.log('[Setup] seeded:', demo.length);
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
      console.log('[Setup] migrated');
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

  // ---- UI ----
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
      newBtn && newBtn.addEventListener('click', ()=> this.openEditor( Setup.create({nr:'',title:'Neues Programm'}) ));
      this.render();
    },

    render(){
      const list = Setup.list({q:this.state.q, side:this.state.side});
      // Hero
      const lastWrap=this.els.lastWrap; if(lastWrap){ lastWrap.innerHTML='';
        list.slice(0,3).forEach(g=>{
          const row=document.createElement('div'); row.className='kp';
          const img=document.createElement('img'); img.src=g.drawing||ph();
          const txt=document.createElement('div'); txt.className='txt';
          txt.innerHTML=`<div class="t">${g.title} — ${g.nr}</div><div class="m">${g.material||'—'} • ${g.zeichnungsNr||'—'}</div>`;
          const b=document.createElement('button'); b.className='btn btn--outline is-sm'; b.textContent='Öffnen'; b.onclick=()=>this.openEditor(g);
          row.append(img,txt,b); lastWrap.append(row);
        });
      }

      // Список
      const wrap=this.els.listWrap; if(!wrap) return;
      wrap.innerHTML='';
      if(!list.length){
        const box=document.createElement('div'); box.className='empty';
        box.innerHTML='<div class="muted">Noch keine Programme.</div>';
        const btn=document.createElement('button'); btn.className='btn'; btn.textContent='+ Erste Gruppe anlegen';
        btn.onclick=()=> this.openEditor( Setup.create({nr:'',title:'Neues Programm'}) );
        box.append(btn); wrap.append(box); return;
      }
      const live=Setup.live();
      list.forEach(g=>{
        const row=document.createElement('div'); row.className='row';
        row.innerHTML=`<div><div class="title">${g.title} — ${g.nr}</div>
          <div class="meta">${g.material||'—'} • ${g.zeichnungsNr||'—'}${(live.RO?.id===g.id||live.RU?.id===g.id)?' • <span class="badge-live">Live</span>':''}</div></div>`;
        const right=document.createElement('div');
        const bOpen=document.createElement('button'); bOpen.className='btn'; bOpen.textContent='Öffnen';
        const bDel=document.createElement('button'); bDel.className='btn btn--outline is-sm'; bDel.textContent='Löschen';
        bOpen.onclick=()=>this.openEditor(g);
        bDel.onclick=()=>CT.ui.confirm({title:'Löschen?',msg:`${g.title} — ${g.nr}`}).then(ok=>{ if(ok){ Setup.remove(g.id); this.render(); }});
        right.append(bOpen,bDel); row.append(right); wrap.append(row);
      });
    },

    openEditor(groupInit){
      let draft = JSON.parse(JSON.stringify(groupInit||{}));
      const box=document.createElement('div');

      // top image + buttons
      const img=document.createElement('img'); img.src=draft.drawing||ph(); img.style.width='100%'; img.style.border='1px solid #edf1f7'; img.style.borderRadius='12px'; img.style.marginBottom='10px';
      const bSet=document.createElement('button'); bSet.className='btn btn--outline is-sm'; bSet.textContent='Zeichnung ändern';
      const bClr=document.createElement('button'); bClr.className='btn btn--outline is-sm'; bClr.textContent='Entfernen';
      const imgBtns=document.createElement('div'); imgBtns.style.display='flex'; imgBtns.style.gap='8px'; imgBtns.style.margin='6px 0 12px';
      bSet.onclick= async ()=>{ const files=await CT.uploader.accept({accept:'image/*', to:'dataURL'}); if(files?.[0]){ draft.drawing=files[0].dataUrl; img.src=draft.drawing; } };
      bClr.onclick=()=>{ draft.drawing=null; img.src=ph(); };
      imgBtns.append(bSet,bClr);

      // meta form
      const form=(global.CT && CT.ui && CT.ui.form ? CT.ui.form.create({
        values:{ title:draft.title||'', nr:draft.nr||'', zeichnungsNr:draft.zeichnungsNr||'', material:draft.material||'', notes:draft.notes||'' },
        fields:[
          {type:'text', key:'title', label:'Titel'},
          {type:'text', key:'nr', label:'Programm-Nr'},
          {type:'text', key:'zeichnungsNr', label:'Zeichnungsnummer'},
          {type:'text', key:'material', label:'Material'},
          {type:'textarea', key:'notes', label:'Notizen', rows:3}
        ]
      }) : null);

      // tabs + slots
      let side='RO';
      const tabs=document.createElement('div'); tabs.className='ro-ru';
      const bRO=document.createElement('button'); bRO.className='tab active'; bRO.textContent='RO';
      const bRU=document.createElement('button'); bRU.className='tab'; bRU.textContent='RU';
      tabs.append(bRO,bRU);
      bRO.onclick=()=>switchSide('RO'); bRU.onclick=()=>switchSide('RU');
      const slotsWrap=document.createElement('div'); slotsWrap.className='grid-slots';

      const renderSlots=()=>{
        slotsWrap.innerHTML='';
        const sideObj=draft.sides?.[side] || (draft.sides[side]=emptySide(side));
        sideObj.slots.forEach(slot=>{
          const art=document.createElement('article'); art.className='slot';
          const phBox=document.createElement('div'); phBox.className='ph';
          const tool = slot.toolId ? Tools.byId(slot.toolId) : null;
          if(tool?.photo){ const im=document.createElement('img'); im.src=tool.photo; phBox.append(im); }
          else { phBox.innerHTML='<svg width="54" height="54" viewBox="0 0 24 24" style="opacity:.35"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2z"/></svg>'; }
          const meta=document.createElement('div'); meta.className='meta';
          meta.innerHTML=`<div class="t">Pos ${slot.pos} • ${slot.tnum||'—'}</div><div class="n">${slot.alias || tool?.name || 'kein Werkzeug'}</div>`;
          const b=document.createElement('button'); b.className='btn btn--outline is-sm'; b.textContent='Bearbeiten';
          b.onclick=()=>this.openSlotModal({draft, side, slot, onSave:(next)=>{ Object.assign(slot,next); Setup.upsert(draft); renderSlots(); CT.ui.toast('Slot gespeichert','ok'); }});
          meta.append(b); art.append(phBox,meta); slotsWrap.append(art);
        });
      };
      function switchSide(s){ side=s; bRO.classList.toggle('active',s==='RO'); bRU.classList.toggle('active',s==='RU'); renderSlots(); }

      box.append(img, imgBtns);
      if (form) box.append(form.el);
      box.append(tabs, slotsWrap);
      switchSide('RO');

      const footer=[
        {label:'In Live anwenden (RO)', onClick:()=>{ Setup.applyLive(draft.id,'RO'); CT.ui.toast('Live RO gesetzt','ok'); }},
        {label:'In Live anwenden (RU)', onClick:()=>{ Setup.applyLive(draft.id,'RU'); CT.ui.toast('Live RU gesetzt','ok'); }},
        {label:'Löschen', onClick:()=>{ CT.ui.confirm({title:'Programm löschen?',msg:`${draft.title} — ${draft.nr}`}).then(ok=>{ if(ok){ Setup.remove(draft.id); CT.ui.modal.close(); UI.render(); } }) }},
        {label:'Abbrechen', onClick:()=>CT.ui.modal.close()},
        {label:'Speichern', kind:'primary', onClick:()=>{ if(form){ const v=form.getValues(); Object.assign(draft,{title:v.title,nr:v.nr,zeichnungsNr:v.zeichnungsNr,material:v.material,notes:v.notes}); } Setup.upsert(draft); CT.ui.modal.close(); UI.render(); CT.ui.toast('Gespeichert','ok'); }}
      ];
      CT.ui.modal.open({ title:`${draft.title||'Programm'} — ${draft.nr||''}`, contentEl:box, footer, wide:true });
    },

    openSlotModal({draft, side, slot, onSave}){
      const tool = slot.toolId ? Tools.byId(slot.toolId) : null;
      const form = (global.CT && CT.ui && CT.ui.form ? CT.ui.form.create({
        values:{ tnum:slot.tnum||'', alias:slot.alias||'' },
        fields:[ {type:'text', key:'tnum', label:'T-Nummer (z.B. T0101)'}, {type:'text', key:'alias', label:'Alias / Titel (optional)'} ]
      }) : null);

      const wrap=document.createElement('div');
      const img=document.createElement('img'); img.src=tool?.photo || ph(); img.style.width='100%'; img.style.border='1px solid #edf1f7'; img.style.borderRadius='12px'; img.style.marginBottom='10px';
      wrap.append(img); if(form) wrap.append(form.el);

      const actions=document.createElement('div'); actions.style.display='flex'; actions.style.gap='8px'; actions.style.flexWrap='wrap'; actions.style.marginTop='8px';
      const bPick=document.createElement('button'); bPick.className='btn'; bPick.textContent='Aus Tools wählen';
      const bNew=document.createElement('button'); bNew.className='btn btn--outline'; bNew.textContent='Neues Werkzeug';
      const bDetach=document.createElement('button'); bDetach.className='btn btn--outline is-sm'; bDetach.textContent='Entfernen';

      bPick.onclick=()=>{ Tools.pick((t)=>{ slot.toolId=t.id; img.src=t.photo||ph(); }); };
      bNew.onclick =()=> {
        const cf=CT.ui.form.create({
          values:{ name:'', iso:'', code:'', photo:null, category:'Allgemein', notes:'' },
          fields:[ {type:'text',key:'name',label:'Name'}, {type:'text',key:'iso',label:'ISO'}, {type:'text',key:'code',label:'Code'}, {type:'text',key:'category',label:'Kategorie'}, {type:'textarea',key:'notes',label:'Notizen',rows:3} ]
        });
        const up=document.createElement('button'); up.className='btn btn--outline is-sm'; up.textContent='Foto hochladen';
        const prev=document.createElement('img'); prev.style.maxWidth='100%'; prev.style.border='1px solid #edf1f7'; prev.style.borderRadius='10px'; prev.style.display='none';
        up.onclick= async ()=>{ const files=await CT.uploader.accept({accept:'image/*', to:'dataURL'}); if(files?.[0]){ cf.setValues({photo:files[0].dataUrl}); prev.src=files[0].dataUrl; prev.style.display='block'; } };
        const box=document.createElement('div'); box.append(cf.el, up, prev);
        CT.ui.modal.open({
          title:'Neues Werkzeug',
          contentEl:box,
          footer:[
            {label:'Abbrechen', onClick:()=>CT.ui.modal.close()},
            {label:'Speichern', kind:'primary', onClick:()=>{ const v=cf.getValues(); const t=Tools.createQuick({name:v.name, iso:v.iso, code:v.code, category:v.category, photo:v.photo, notes:v.notes}); slot.toolId=t.id; img.src=t.photo||ph(); CT.ui.modal.close(); CT.ui.toast('Werkzeug gespeichert','ok'); }}
          ],
          wide:true
        });
      };
      bDetach.onclick=()=>{ slot.toolId=null; img.src=ph(); };

      actions.append(bPick,bNew,bDetach); wrap.append(actions);

      CT.ui.modal.open({
        title:`Slot ${slot.pos} • ${side}`,
        contentEl:wrap,
        footer:[
          {label:'Abbrechen', onClick:()=>CT.ui.modal.close()},
          {label:'Speichern', kind:'primary', onClick:()=>{ const v=form?form.getValues():{tnum:slot.tnum, alias:slot.alias}; onSave({ pos:slot.pos, tnum:(v.tnum||'').trim()||null, alias:(v.alias||'').trim(), toolId: slot.toolId||null }); CT.ui.modal.close(); }}
        ],
        wide:true
      });
    }
  };

  global.Setup = Setup;
  global.SetupUI = UI;

})(window);