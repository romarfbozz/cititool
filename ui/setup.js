// CitiTool • Setup (ProgramGroup mit RO/RU)
;(function (global) {
  "use strict";

  const K_GROUPS = 'CT_PROG_GROUPS_V1';
  const K_LIVE   = 'CT_LIVE_V1';
  const SLOTS_COUNT = 12;

  const storage = {
    get: (k, def=undefined) => (CT.load ? CT.load(k, def) : (JSON.parse(localStorage.getItem(k)||'null') ?? def)),
    set: (k, v) => (CT.save ? CT.save(k, v) : localStorage.setItem(k, JSON.stringify(v)))
  };
  const now = () => Date.now();
  const uid = () => Math.random().toString(36).slice(2, 10);
  const byCreatedDesc = (a,b)=> (b.createdAt||0)-(a.createdAt||0);

  const Tools = {
    list(){ return storage.get('CT_TOOLS_V1', []) || []; },
    byId(id){ return this.list().find(t=>t.id===id); },
    createQuick({name, iso, code, photo, category='Allgemein', notes=''}) {
      const t={ id:uid(), name, iso:iso||'', code:code||'', category, photo:photo||null, notes, createdAt:now(), updatedAt:now() };
      const arr=this.list(); storage.set('CT_TOOLS_V1', [t, ...arr]); return t;
    }
  };

  function emptySide(name){ return { name, slots: Array.from({length:SLOTS_COUNT}, (_,i)=>({pos:i+1, tnum:null, toolId:null, alias:''})) }; }

  const Setup = {
    ensureSeeds(){
      const have = storage.get(K_GROUPS, null);
      if (!Array.isArray(have) || have.length===0){
        const demo=[];
        for(let i=0;i<5;i++){
          const nr = String(231800+i);
          const g = {
            id:uid(), nr, title:`Programm ${nr}`,
            zeichnungsNr:`Z${nr}`, material: i%2? '1.4112':'C45',
            drawing:null, notes:'',
            sides:{ RO:emptySide('RO'), RU:emptySide('RU') },
            createdAt: now() - (5-i)*10000, updatedAt: now() - (5-i)*10000
          };
          // пара заполненных слотов
          [1,3,5].forEach((p)=>{
            g.sides.RO.slots[p-1].tnum = `T${String(p).padStart(2,'0')}${String(p).padStart(2,'0')}`;
            g.sides.RU.slots[p-1].tnum = `T${String(p+1).padStart(2,'0')}${String(p+1).padStart(2,'0')}`;
          });
          demo.push(g);
        }
        storage.set(K_GROUPS, demo.sort(byCreatedDesc));
      }
      if(!storage.get(K_LIVE, null)) storage.set(K_LIVE, {RO:null, RU:null});
    },

    list({q='', side='' }={}){
      const all = storage.get(K_GROUPS, []) || [];
      const qq = (q||'').trim().toLowerCase();
      return all.filter(g=>{
        if (side && !g.sides?.[side]) return false;
        if (!qq) return true;
        const hay=[g.nr,g.title,g.zeichnungsNr,g.material].join(' ').toLowerCase();
        return hay.includes(qq);
      }).sort(byCreatedDesc);
    },

    get(id){ return (storage.get(K_GROUPS, [])||[]).find(g=>g.id===id); },
    saveAll(arr){ storage.set(K_GROUPS, arr); },
    upsert(group){
      const arr = storage.get(K_GROUPS, [])||[];
      const i = arr.findIndex(g=>g.id===group.id);
      group.updatedAt = now();
      if (i>=0) arr[i]=group; else { group.createdAt=now(); arr.unshift(group); }
      storage.set(K_GROUPS, arr); return group;
    },
    remove(id){ storage.set(K_GROUPS, (storage.get(K_GROUPS, [])||[]).filter(g=>g.id!==id)); },
    create({nr,title, zeichnungsNr, material, drawing=null, notes=''}) {
      return this.upsert({
        id:uid(), nr:(nr||'').trim()||String(Math.floor(Math.random()*1e6)),
        title:(title||'Untitled').trim(), zeichnungsNr:(zeichnungsNr||'').trim(),
        material:(material||'').trim(), drawing, notes,
        sides:{RO:emptySide('RO'), RU:emptySide('RU')}, createdAt:now(), updatedAt:now()
      });
    },
    live(){ return storage.get(K_LIVE, {RO:null,RU:null}); },
    applyLive(id, side){
      const g=this.get(id); if(!g) return null;
      const minimal={ id:g.id, nr:g.nr, side, title:g.title, slots:g.sides[side].slots, at:now() };
      const cur=this.live(); cur[side]=minimal; storage.set(K_LIVE, cur); return minimal;
    }
  };

  const SetupUI = {
    state:{ q:'', side:'', list:[] },
    els:{},

    mount({qInput, listWrap, lastWrap, chipsSides, newBtn}){
      this.els={ qInput, listWrap, lastWrap, chipsSides, newBtn };

      // гарантированная инициализация
      try{ Setup.ensureSeeds(); }catch(e){ console?.error?.(e); }

      qInput.addEventListener('input', CT.debounce(()=>{ this.state.q=qInput.value; this.render(); },200));
      chipsSides.addEventListener('click',(e)=>{
        const b=e.target.closest('button[data-side]'); if(!b) return;
        chipsSides.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
        b.classList.add('active'); this.state.side=b.dataset.side||''; this.render();
      });
      newBtn.addEventListener('click', ()=> this.openEditor( Setup.create({nr:'',title:'Neues Programm'}) ));
      this.render();
    },

    ph(){
      return 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120"><rect width="100%" height="100%" fill="#f5f8ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter,system-ui" font-size="14" fill="#8aa0c4">kein Foto</text></svg>`);
    },

    render(){
      const list = Setup.list({q:this.state.q, side:this.state.side});
      this.state.list = list;

      // Hero
      this.els.lastWrap.innerHTML='';
      list.slice(0,3).forEach(g=>{
        const row=document.createElement('div'); row.className='kp';
        const img=document.createElement('img'); img.src=g.drawing||this.ph();
        const txt=document.createElement('div'); txt.className='txt';
        txt.innerHTML=`<div class="t">${g.title} — ${g.nr}</div><div class="m">${g.material||'—'} • ${g.zeichnungsNr||'—'}</div>`;
        const b=document.createElement('button'); b.className='btn btn--outline is-sm'; b.textContent='Öffnen'; b.onclick=()=>this.openEditor(g);
        row.append(img,txt,b); this.els.lastWrap.append(row);
      });

      // Список
      this.els.listWrap.innerHTML='';
      if(!list.length){
        const box=document.createElement('div'); box.className='empty';
        box.innerHTML=`<div class="muted">Noch keine Programme.</div>`;
        const b=document.createElement('button'); b.className='btn'; b.textContent='+ Erste Gruppe anlegen';
        b.onclick=()=> this.openEditor( Setup.create({nr:'',title:'Neues Programm'}) );
        box.append(b); this.els.listWrap.append(box); return;
      }

      const live=Setup.live();
      list.forEach(g=>{
        const row=document.createElement('div'); row.className='row';
        row.innerHTML=`<div><div class="title">${g.title} — ${g.nr}</div>
          <div class="meta">${g.material||'—'} • ${g.zeichnungsNr||'—'}${(live.RO?.id===g.id||live.RU?.id===g.id)?' • <span class="badge-live">Live</span>':''}</div></div>`;
        const right=document.createElement('div');
        const bOpen=document.createElement('button'); bOpen.className='btn'; bOpen.textContent='Öffnen';
        const bInfo=document.createElement('button'); bInfo.className='btn btn--outline is-sm'; bInfo.textContent='i';
        const bDel=document.createElement('button'); bDel.className='btn btn--outline is-sm'; bDel.textContent='Löschen';
        bOpen.onclick=()=>this.openEditor(g);
        bInfo.onclick=()=>this.openInfo(g);
        bDel.onclick =()=>CT.ui.confirm({title:'Löschen?',msg:`${g.title} — ${g.nr}`}).then(ok=>{ if(ok){ Setup.remove(g.id); this.render(); }});
        right.append(bOpen,bInfo,bDel); row.append(right); this.els.listWrap.append(row);
      });
    },

    openInfo(g){
      const box=document.createElement('div');
      const img=document.createElement('img'); img.src=g.drawing||this.ph(); img.style.width='100%'; img.style.borderRadius='12px'; img.style.border='1px solid #edf1f7';
      const list=document.createElement('div'); list.className='list'; list.style.marginTop='10px';
      const mk=(t,v)=>{ const r=document.createElement('div'); r.className='row'; r.innerHTML=`<div class="title">${t}</div><div class="badge">${v||'—'}</div>`; return r; };
      list.append(mk('Nr',g.nr), mk('Zeichnungsnummer',g.zeichnungsNr), mk('Material',g.material));
      box.append(img,list);
      CT.ui.modal.open({title:`${g.title} — ${g.nr}`, contentEl:box, footer:[{label:'Schließen', onClick:()=>CT.ui.modal.close()}], wide:true});
    },

    openEditor(groupInit){
      let draft = JSON.parse(JSON.stringify(groupInit||{}));
      const box=document.createElement('div');

      // Фото
      const img=document.createElement('img'); img.src=draft.drawing||this.ph(); img.style.width='100%'; img.style.border='1px solid #edf1f7'; img.style.borderRadius='12px'; img.style.marginBottom='10px';
      const bSet=document.createElement('button'); bSet.className='btn btn--outline is-sm'; bSet.textContent='Zeichnung ändern';
      const bClr=document.createElement('button'); bClr.className='btn btn--outline is-sm'; bClr.textContent='Entfernen';
      const imgBtns=document.createElement('div'); imgBtns.style.display='flex'; imgBtns.style.gap='8px'; imgBtns.style.margin='6px 0 12px';
      bSet.onclick= async ()=>{ const files=await CT.uploader.accept({accept:'image/*', to:'dataURL'}); if(files?.[0]){ draft.drawing=files[0].dataUrl; img.src=draft.drawing; } };
      bClr.onclick=()=>{ draft.drawing=null; img.src=this.ph(); };
      imgBtns.append(bSet,bClr);

      // Форма общих полей
      const form=CT.ui.form.create({
        values:{ title:draft.title||'', nr:draft.nr||'', zeichnungsNr:draft.zeichnungsNr||'', material:draft.material||'', notes:draft.notes||'' },
        fields:[
          {type:'text', key:'title', label:'Titel'},
          {type:'text', key:'nr', label:'Programm-Nr'},
          {type:'text', key:'zeichnungsNr', label:'Zeichnungsnummer'},
          {type:'text', key:'material', label:'Material'},
          {type:'textarea', key:'notes', label:'Notizen', rows:3}
        ]
      });

      // Tabs RO/RU
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
          const ph=document.createElement('div'); ph.className='ph';
          const tool = slot.toolId ? Tools.byId(slot.toolId) : null;
          if(tool?.photo){ const im=document.createElement('img'); im.src=tool.photo; ph.append(im); }
          else { ph.innerHTML='<svg width="54" height="54" viewBox="0 0 24 24" style="opacity:.35"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2z"/></svg>'; }
          const meta=document.createElement('div'); meta.className='meta';
          meta.innerHTML=`<div class="t">Pos ${slot.pos} • ${slot.tnum||'—'}</div><div class="n">${slot.alias || tool?.name || 'kein Werkzeug'}</div>`;
          const b=document.createElement('button'); b.className='btn btn--outline is-sm'; b.textContent='Bearbeiten';
          b.onclick=()=>this.openSlotModal({draft, side, slot, onSave:(next)=>{ Object.assign(slot,next); Setup.upsert(draft); renderSlots(); CT.ui.toast('Slot gespeichert','ok'); }});
          meta.append(b); art.append(ph,meta); slotsWrap.append(art);
        });
      };
      function switchSide(s){ side=s; bRO.classList.toggle('active',s==='RO'); bRU.classList.toggle('active',s==='RU'); renderSlots(); }

      // Сборка
      box.append(img, imgBtns, form.el, tabs, slotsWrap);
      switchSide('RO');

      const footer=[
        {label:'In Live anwenden (RO)', onClick:()=>{ Setup.applyLive(draft.id,'RO'); CT.ui.toast('Live RO gesetzt','ok'); }},
        {label:'In Live anwenden (RU)', onClick:()=>{ Setup.applyLive(draft.id,'RU'); CT.ui.toast('Live RU gesetzt','ok'); }},
        {label:'Löschen', onClick:()=>{ CT.ui.confirm({title:'Programm löschen?',msg:`${draft.title} — ${draft.nr}`}).then(ok=>{ if(ok){ Setup.remove(draft.id); CT.ui.modal.close(); SetupUI.render(); } }) }},
        {label:'Abbrechen', onClick:()=>CT.ui.modal.close()},
        {label:'Speichern', kind:'primary', onClick:()=>{ const v=form.getValues(); Object.assign(draft,{title:v.title,nr:v.nr,zeichnungsNr:v.zeichnungsNr,material:v.material,notes:v.notes}); Setup.upsert(draft); CT.ui.modal.close(); SetupUI.render(); CT.ui.toast('Gespeichert','ok'); }}
      ];
      CT.ui.modal.open({ title:`${draft.title||'Programm'} — ${draft.nr||''}`, contentEl:box, footer, wide:true });
    },

    openSlotModal({draft, side, slot, onSave}){
      const tool = slot.toolId ? Tools.byId(slot.toolId) : null;
      const form = CT.ui.form.create({
        values:{ tnum:slot.tnum||'', alias:slot.alias||'' },
        fields:[ {type:'text', key:'tnum', label:'T-Nummer (z.B. T0101)'}, {type:'text', key:'alias', label:'Alias / Titel (optional)'} ]
      });

      const wrap=document.createElement('div');
      const img=document.createElement('img'); img.src=tool?.photo || this.ph(); img.style.width='100%'; img.style.border='1px solid #edf1f7'; img.style.borderRadius='12px'; img.style.marginBottom='10px';
      wrap.append(img, form.el);

      const actions=document.createElement('div'); actions.style.display='flex'; actions.style.gap='8px'; actions.style.flexWrap='wrap'; actions.style.marginTop='8px';
      const bPick=document.createElement('button'); bPick.className='btn'; bPick.textContent='Aus Tools wählen';
      const bNew=document.createElement('button'); bNew.className='btn btn--outline'; bNew.textContent='Neues Werkzeug';
      const bDetach=document.createElement('button'); bDetach.className='btn btn--outline is-sm'; bDetach.textContent='Entfernen';

      bPick.onclick=()=>{ CT.selector.tools({ onPick:(t)=>{ slot.toolId=t.id; img.src=t.photo||this.ph(); }, allowNew:true }); };
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
            {label:'Speichern', kind:'primary', onClick:()=>{ const v=cf.getValues(); const t=Tools.createQuick({name:v.name, iso:v.iso, code:v.code, category:v.category, photo:v.photo, notes:v.notes}); slot.toolId=t.id; img.src=t.photo||this.ph(); CT.ui.modal.close(); CT.ui.toast('Werkzeug gespeichert','ok'); }}
          ],
          wide:true
        });
      };
      bDetach.onclick=()=>{ slot.toolId=null; img.src=this.ph(); };

      actions.append(bPick,bNew,bDetach); wrap.append(actions);

      CT.ui.modal.open({
        title:`Slot ${slot.pos} • ${side}`,
        contentEl:wrap,
        footer:[
          {label:'Abbrechen', onClick:()=>CT.ui.modal.close()},
          {label:'Speichern', kind:'primary', onClick:()=>{ const v=form.getValues(); onSave({ pos:slot.pos, tnum:(v.tnum||'').trim()||null, alias:(v.alias||'').trim(), toolId: slot.toolId||null }); CT.ui.modal.close(); }}
        ],
        wide:true
      });
    }
  };

  global.Setup = Setup;
  global.SetupUI = SetupUI;

})(window);