;(function(window){
  "use strict";

  /* ---------- storage utils ---------- */
  const storage = {
    get(k, def){ try{
      if(window.CT?.load) return CT.load(k, def);
      const s = localStorage.getItem(k);
      return s==null ? def : JSON.parse(s);
    }catch(e){ return def; } },
    set(k, v){ try{
      if(window.CT?.save) return CT.save(k, v);
      localStorage.setItem(k, JSON.stringify(v));
    }catch(e){} }
  };
  const now = ()=>Date.now();
  const uid = ()=>Math.random().toString(36).slice(2,10);
  const ph  = ()=>'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="100%" height="100%" fill="#f5f8ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter,system-ui" font-size="14" fill="#8aa0c4">kein Foto</text></svg>`);

  /* ---------- keys/models ---------- */
  const K_PROG_V2 = 'CT_PROG_V2';
  const K_LIVE_V2 = 'CT_PROG_LIVE_V2';
  const K_TOOLS   = 'CT_TOOLS_V1';
  const SLOTS = 12;

  const Tools = {
    list(){ return storage.get(K_TOOLS,[])||[]; },
    byId(id){ return this.list().find(t=>t.id===id); },
    createQuick({name, iso, code, photo, category='Allgemein', notes=''}) {
      const t = {id:uid(), name:(name||'Tool').trim(), iso:iso||'', code:code||'', photo:photo||null, category, notes,
        createdAt:now(), updatedAt:now()};
      const cur = this.list(); storage.set(K_TOOLS, [t, ...cur]); return t;
    }
  };

  function emptySide(name){ return {name, slots: Array.from({length:SLOTS},(_,i)=>({pos:i+1, tnum:null, alias:'', toolId:null}))}; }
  function normalizeGroup(g){
    const d = {
      id: g.id || uid(),
      nr: String(g.nr||'').trim() || String(Math.floor(Math.random()*1e6)),
      title: String(g.title||'Untitled').trim(),
      zeichnungsNr: String(g.zeichnungsNr||'').trim(),
      material: String(g.material||'').trim(),
      drawing: g.drawing||null,
      notes: g.notes||'',
      sides: g.sides || {RO: emptySide('RO'), RU: emptySide('RU')},
      meta: g.meta || {createdAt: now(), updatedAt: now()}
    };
    ['RO','RU'].forEach(side=>{
      const s = d.sides[side];
      if(!s || !Array.isArray(s.slots)) d.sides[side] = emptySide(side);
      else if(s.slots.length!==SLOTS){
        const arr = Array.from({length:SLOTS},(_,i)=> s.slots[i] ? {...s.slots[i], pos:i+1} : {pos:i+1, tnum:null, alias:'', toolId:null});
        d.sides[side] = {name:side, slots:arr};
      } else {
        d.sides[side] = {name:side, slots: s.slots.map((x,i)=>({...x, pos:i+1}))};
      }
    });
    return d;
  }

  /* ---------- core API ---------- */
  const Setup2 = {
    ensureSeeds(){
      let arr = storage.get(K_PROG_V2, null);
      if(!Array.isArray(arr) || !arr.length){
        const demo = [];
        for(let i=0;i<3;i++){
          const nr = String(231850+i);
          const g = normalizeGroup({
            id: uid(),
            nr, title:`Programm ${nr}`, zeichnungsNr:`Z${nr}`, material: i%2? '1.4112':'C45',
            sides: {RO:emptySide('RO'), RU:emptySide('RU')},
            meta: {createdAt: now()-(5-i)*10000, updatedAt: now()-(5-i)*10000}
          });
          [1,3,5].forEach(p=>{
            g.sides.RO.slots[p-1].tnum = `T${String(p).padStart(2,'0')}${String(p).padStart(2,'0')}`;
            g.sides.RU.slots[p-1].tnum = `T${String(p+1).padStart(2,'0')}${String(p+1).padStart(2,'0')}`;
          });
          demo.push(g);
        }
        storage.set(K_PROG_V2, demo);
      }
      if(!storage.get(K_LIVE_V2, null)) storage.set(K_LIVE_V2, {RO:null, RU:null});
    },
    list({q='', side=''}={}){
      const arr = storage.get(K_PROG_V2,[])||[];
      const qq = q.trim().toLowerCase();
      return arr.filter(g=>{
        if(side && !g.sides?.[side]) return false;
        if(!qq) return true;
        const hay = [g.nr,g.title,g.zeichnungsNr,g.material].join(' ').toLowerCase();
        return hay.includes(qq);
      }).sort((a,b)=> (b.meta?.updatedAt||0)-(a.meta?.updatedAt||0));
    },
    get(id){ return (storage.get(K_PROG_V2,[])||[]).find(x=>x.id===id); },
    upsert(group){
      const arr = storage.get(K_PROG_V2,[])||[];
      const g = normalizeGroup(group); g.meta.updatedAt = now();
      const i = arr.findIndex(x=>x.id===g.id);
      if(i>=0) arr[i]=g; else { g.meta.createdAt = now(); arr.unshift(g); }
      storage.set(K_PROG_V2, arr); return g;
    },
    create(init={}){ return this.upsert(normalizeGroup(init)); },
    remove(id){ storage.set(K_PROG_V2, (storage.get(K_PROG_V2,[])||[]).filter(x=>x.id!==id)); },
    live:{
      get(){ return storage.get(K_LIVE_V2,{RO:null,RU:null}); },
      set(id, side){ const cur = storage.get(K_LIVE_V2,{RO:null,RU:null}); cur[side] = id ? {id, at: now()} : null; storage.set(K_LIVE_V2, cur); }
    },
    slot:{
      setT(id, side, pos, t){ const g=Setup2.get(id); if(!g) return; const s=g.sides[side].slots[pos-1]; s.tnum = (t||'').trim() || null; Setup2.upsert(g); },
      setAlias(id, side, pos, a){ const g=Setup2.get(id); if(!g) return; const s=g.sides[side].slots[pos-1]; s.alias = (a||'').trim(); Setup2.upsert(g); },
      attachTool(id, side, pos, toolId){ const g=Setup2.get(id); if(!g) return; const s=g.sides[side].slots[pos-1]; s.toolId = toolId; Setup2.upsert(g); },
      detachTool(id, side, pos){ const g=Setup2.get(id); if(!g) return; const s=g.sides[side].slots[pos-1]; s.toolId = null; Setup2.upsert(g); },
      swap(id, side, a, b){ const g=Setup2.get(id); if(!g) return; const arr=g.sides[side].slots; const ai=a-1, bi=b-1; [arr[ai],arr[bi]]=[arr[bi],arr[ai]]; arr.forEach((x,i)=>x.pos=i+1); Setup2.upsert(g); },
      copyFromOtherSide(id, from, to){ const g=Setup2.get(id); if(!g) return; g.sides[to].slots = g.sides[from].slots.map(s=>({pos:s.pos, tnum:s.tnum||null, alias:s.alias||'', toolId:s.toolId||null})); Setup2.upsert(g); },
      clearAll(id, side){ const g=Setup2.get(id); if(!g) return; g.sides[side].slots.forEach(s=>{ s.tnum=null; s.alias=''; s.toolId=null; }); Setup2.upsert(g); },
      autonumber(id, side, pattern='T{pp}{pp}'){ const g=Setup2.get(id); if(!g) return; g.sides[side].slots.forEach(s=>{ const pp=String(s.pos).padStart(2,'0'); s.tnum = pattern.replaceAll('{pp}',pp); }); Setup2.upsert(g); },
    }
  };

  /* ---------- UI ---------- */
  const Setup2UI = {
    els:{}, 
    state:{q:'', listQ:'', listCollapsed:false, activeId:null, side:'RO', openSlot:null, gridCollapsed:false},

    mount(opts){
      Setup2.ensureSeeds();
      this.els = opts;

      // spacer height = sticky actions + dock + небольшой запас
      const calcSpacer = ()=>{
        const actionsH = opts.bottom.actions?.offsetHeight || 0;
        const dockH    = opts.dockEl?.offsetHeight || 0;
        const h = actionsH + dockH + 8;
        if(opts.bottom.spacer) opts.bottom.spacer.style.height = h + 'px';
      };
      window.addEventListener('resize', calcSpacer);
      new ResizeObserver(calcSpacer).observe(opts.bottom.actions);
      if (opts.dockEl) new ResizeObserver(calcSpacer).observe(opts.dockEl);

      // sidebar: search + toggle
      const deb = (fn,ms)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms||220);} };
      if(opts.listSearch){
        opts.listSearch.addEventListener('input', deb(()=>{
          this.state.listQ = opts.listSearch.value;
          this.renderList();
        }));
      }
      opts.listSearchClear?.addEventListener('click', ()=>{
        this.state.listQ=''; opts.listSearch.value=''; this.renderList();
      });
      opts.listToggleBtn?.addEventListener('click', ()=>{
        this.state.listCollapsed = !this.state.listCollapsed;
        this.renderList();
        opts.listToggleBtn.textContent = this.state.listCollapsed ? 'Einblenden' : 'Ausblenden';
      });

      // global search in AppBar (оставляем — фильтрует тоже)
      opts.searchInput?.addEventListener('input', deb(()=>{
        this.state.q = opts.searchInput.value;
        this.renderList();
      }));

      // create
      opts.newBtn?.addEventListener('click', ()=>{
        const g = Setup2.create({title:'Neues Programm'});
        this.state.activeId = g.id; this.state.openSlot = null; this.renderAll();
      });

      // tabs
      const t = opts.tabs;
      t.RO.onclick = ()=>{ this.state.side='RO'; this.state.openSlot=null; this.applyTabs(); this.renderGrid(); };
      t.RU.onclick = ()=>{ this.state.side='RU'; this.state.openSlot=null; this.applyTabs(); this.renderGrid(); };
      t.SBS.onclick= ()=>{ this.state.side='SBS'; this.state.openSlot=null; this.applyTabs(); this.renderGrid(); };

      // actions bar
      opts.bar.clearAll.onclick = ()=>{ const id=this.state.activeId; const side=this.sideOne(); if(!id||!side) return; Setup2.slot.clearAll(id, side); this.markDraft(); this.renderGrid(); };
      opts.bar.autoNum.onclick  = ()=>{ const id=this.state.activeId; const side=this.sideOne(); if(!id||!side) return; Setup2.slot.autonumber(id, side); this.markDraft(); this.renderGrid(); };
      opts.bar.clone.onclick    = ()=>{ const id=this.state.activeId; if(!id) return;
        const from = this.sideOne(); const to = from==='RO'?'RU':'RO'; Setup2.slot.copyFromOtherSide(id, from, to); this.markDraft(); this.renderGrid(); };
      opts.bar.toggleGrid.onclick = ()=>{
        this.state.gridCollapsed = !this.state.gridCollapsed;
        opts.bar.toggleGrid.textContent = this.state.gridCollapsed?'Slots einblenden':'Slots ausblenden';
        this.renderGrid();
      };

      // drawing pick
      opts.drawingPickBtn.onclick = ()=> opts.drawingInput.click();
      opts.drawingInput.onchange = ()=>{
        const f = opts.drawingInput.files?.[0]; if(!f) return;
        const r = new FileReader(); r.onload=()=>{
          const g = Setup2.get(this.state.activeId); if(!g) return;
          g.drawing = r.result; Setup2.upsert(g); this.markDraft(); this.renderHero();
        }; r.readAsDataURL(f);
      };
      opts.drawingClearBtn.onclick = ()=>{
        const g = Setup2.get(this.state.activeId); if(!g) return; g.drawing = null; Setup2.upsert(g); this.markDraft(); this.renderHero();
      };

      // fields
      const fs = opts.fields;
      const bind = (el, key)=> el.addEventListener('input', ()=>{
        const g = Setup2.get(this.state.activeId); if(!g) return;
        g[key] = el.value; Setup2.upsert(g); this.markDraft();
      });
      bind(fs.title,'title'); bind(fs.nr,'nr'); bind(fs.znr,'zeichnungsNr'); bind(fs.mat,'material');

      // bottom actions
      opts.bottom.cancel.onclick = ()=>{ this.renderAll(); this.clearDraft(); };
      opts.bottom.save.onclick   = ()=>{ this.clearDraft(); this.toast('Gespeichert'); };

      // initial
      const first = Setup2.list({})[0]; this.state.activeId = first?.id || null;
      this.renderAll(); calcSpacer();
    },

    sideOne(){ return (this.state.side==='SBS')? 'RO' : this.state.side; },
    toast(msg){ console.log('[CT]', msg); },
    markDraft(){ this.els.bottom.draftDot.style.display='inline'; },
    clearDraft(){ this.els.bottom.draftDot.style.display='none'; },

    renderAll(){ this.renderList(); this.renderHero(); this.applyTabs(); this.renderGrid(); this.renderLiveBadges(); },
    renderList(){
      const wrap = this.els.listWrap; if(!wrap) return; wrap.innerHTML='';
      if(this.state.listCollapsed){
        const e=document.createElement('div'); e.className='muted'; e.style.padding='6px 4px';
        const total = Setup2.list({q:this.state.q}).length;
        e.textContent = `Versteckt • ${total} Programme`;
        wrap.append(e); return;
      }
      const list = Setup2.list({q:(this.state.q||'') + ' ' + (this.state.listQ||'')});
      if(!list.length){ const e=document.createElement('div'); e.className='muted'; e.textContent='Keine Treffer.'; wrap.append(e); return; }
      const live = Setup2.live.get();
      list.forEach(g=>{
        const row=document.createElement('div'); row.className='row';
        const left=document.createElement('div');
        left.innerHTML=`<div class="title">${g.title} — ${g.nr}</div>
                        <div class="meta">${g.material||'—'} • ${g.zeichnungsNr||'—'} ${(live.RO?.id===g.id||live.RU?.id===g.id)?'• <span style="font-weight:900;color:#2d6cdf">Live</span>':''}</div>`;
        const right=document.createElement('div');
        const ib=document.createElement('button'); ib.className='i-btn'; ib.textContent='i';
        ib.onclick=()=>{ this.state.activeId=g.id; this.state.openSlot=null; this.renderAll(); };
        right.append(ib);
        row.append(left,right);
        row.style.borderColor = (g.id===this.state.activeId)?'#d6e5ff':'#edf1f7';
        wrap.append(row);
      });
    },
    renderHero(){
      const g = Setup2.get(this.state.activeId);
      const img=this.els.drawingImg; img.src=g?.drawing || ph();
      this.els.fields.title.value = g?.title||'';
      this.els.fields.nr.value    = g?.nr||'';
      this.els.fields.znr.value   = g?.zeichnungsNr||'';
      this.els.fields.mat.value   = g?.material||'';
    },
    applyTabs(){
      const t=this.els.tabs;
      t.RO.classList.toggle('active', this.state.side==='RO');
      t.RU.classList.toggle('active', this.state.side==='RU');
      t.SBS.classList.toggle('active', this.state.side==='SBS');
    },
    renderLiveBadges(){
      const live = Setup2.live.get();
      const g = Setup2.get(this.state.activeId);
      const isRO = live.RO?.id===g?.id, isRU = live.RU?.id===g?.id;
      this.els.liveBadges.RO.style.opacity = isRO?1:.45;
      this.els.liveBadges.RU.style.opacity = isRU?1:.45;
      this.els.liveBadges.RO.onclick = ()=>{ if(!g) return; Setup2.live.set(g.id,'RO'); this.renderLiveBadges(); this.toast('Live RO gesetzt'); };
      this.els.liveBadges.RU.onclick = ()=>{ if(!g) return; Setup2.live.set(g.id,'RU'); this.renderLiveBadges(); this.toast('Live RU gesetzt'); };
    },
    renderGrid(){
      const grid=this.els.grid; grid.innerHTML='';
      if(this.state.gridCollapsed){
        const b=document.createElement('div'); b.className='muted';
        b.style.margin='10px 4px'; b.textContent='Slots versteckt';
        grid.append(b); return;
      }
      const g = Setup2.get(this.state.activeId); if(!g){ grid.innerHTML='<div class="muted">Kein Programm gewählt</div>'; return; }

      const sides = this.state.side==='SBS' ? ['RO','RU'] : [this.state.side];
      sides.forEach((side)=>{
        if(this.state.side==='SBS'){
          const h=document.createElement('div'); h.style.fontWeight='900'; h.style.margin='10px 2px 6px'; h.textContent=side;
          grid.append(h);
        }
        const SG=document.createElement('div'); SG.className='slot-grid'; grid.append(SG);
        g.sides[side].slots.forEach(slot=>{
          SG.append( this.renderSlotCard(g, side, slot) );
        });
      });
    },
    renderSlotCard(g, side, slot){
      const tool = slot.toolId ? Tools.byId(slot.toolId) : null;
      const art = document.createElement('article'); art.className='slot';
      const phb = document.createElement('div'); phb.className='ph';
      if(tool?.photo){ const im=document.createElement('img'); im.src=tool.photo; phb.append(im); }
      else phb.innerHTML='<svg width="54" height="54" viewBox="0 0 24 24" style="opacity:.35"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2z"/></svg>';

      const meta=document.createElement('div'); meta.className='meta';
      meta.innerHTML=`<div class="t">Pos ${slot.pos} • ${slot.tnum||'—'}</div><div class="n">${slot.alias || tool?.name || 'kein Werkzeug'}</div>`;
      const btn=document.createElement('button'); btn.className='btn is-sm'; btn.textContent = (this.state.openSlot===`${side}:${slot.pos}`)?'Schließen':'Bearbeiten';
      btn.onclick = ()=>{
        this.state.openSlot = (this.state.openSlot===`${side}:${slot.pos}`)? null : `${side}:${slot.pos}`;
        const parent = art.parentElement;
        const fresh = this.renderSlotCard(Setup2.get(this.state.activeId), side, slot);
        parent.replaceChild(fresh, art);
        if(this.state.openSlot) requestAnimationFrame(()=> fresh.scrollIntoView({behavior:'smooth', block:'start'}));
      };
      meta.append(btn);

      art.append(phb, meta);

      const opened = (this.state.openSlot===`${side}:${slot.pos}`);
      if(opened){
        art.classList.add('open');
        const inl = document.createElement('div'); inl.className='sl-edit';
        const wrap= document.createElement('div'); wrap.className='wrap';

        const r1 = field('T-Nummer (z.B. T0101)', slot.tnum||'');
        const r2 = field('Alias / Titel', slot.alias||'');

        const picker = document.createElement('div'); picker.className='sl-tool-picker';
        picker.innerHTML = `<div class="muted">Werkzeug wählen oder neu anlegen</div>`;
        const q = document.createElement('input'); q.placeholder='Suchen…';
        const toolsBox = document.createElement('div'); toolsBox.className='tools';
        const renderList = (qq='')=>{
          toolsBox.innerHTML='';
          const list = Tools.list().filter(t=>!qq || [t.name,t.iso,t.code,t.category].join(' ').toLowerCase().includes(qq.toLowerCase()));
          if(!list.length){ const e=document.createElement('div'); e.className='muted'; e.textContent='Keine Werkzeuge'; toolsBox.append(e); }
          list.forEach(t=>{
            const row=document.createElement('div'); row.className='tool-item';
            const im=document.createElement('img'); im.src=t.photo||ph();
            const info=document.createElement('div'); info.innerHTML=`<div style="font-weight:800">${t.name}</div><div class="muted">${t.iso||'-'} • ${t.code||'-'} • ${t.category||'Allgemein'}</div>`;
            const pick=document.createElement('button'); pick.className='btn is-sm'; pick.textContent='Wählen';
            pick.onclick=()=>{ Setup2.slot.attachTool(g.id, side, slot.pos, t.id); this.markDraft();
              this.state.openSlot=null; this.renderGrid();
            };
            row.append(im,info,pick); toolsBox.append(row);
          });
        };
        renderList('');
        q.addEventListener('input', ()=>renderList(q.value));

        // quick-create with photo
        const newRow=document.createElement('div'); newRow.style.display='grid';
        newRow.style.gridTemplateColumns='1fr 1fr auto auto'; newRow.style.gap='6px';
        const nm=document.createElement('input'); nm.placeholder='Neues Werkzeug — Name';
        const iso=document.createElement('input'); iso.placeholder='ISO / Code';
        const create=document.createElement('button'); create.className='btn is-sm'; create.textContent='Anlegen';
        const photoBtn=document.createElement('button'); photoBtn.className='btn is-sm'; photoBtn.textContent='Foto';
        const fin=document.createElement('input'); fin.type='file'; fin.accept='image/*'; fin.style.display='none';
        let imgData=null;
        photoBtn.onclick=()=>fin.click();
        fin.onchange=()=>{ const f=fin.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ imgData = r.result; this.toast('Foto geladen'); }; r.readAsDataURL(f); };
        create.onclick=()=>{
          const t = Tools.createQuick({name:nm.value, iso:iso.value, photo:imgData});
          Setup2.slot.attachTool(g.id, side, slot.pos, t.id); this.markDraft();
          this.state.openSlot=null; this.renderGrid();
        };
        newRow.append(nm, iso, create, photoBtn, fin);

        picker.append(q, toolsBox, newRow);

        const ops=document.createElement('div'); ops.style.display='flex'; ops.style.gap='8px'; ops.style.flexWrap='wrap'; ops.style.justifyContent='flex-end';
        const bSwap=document.createElement('button'); bSwap.className='btn is-sm'; bSwap.textContent='Swap…';
        const bCopy=document.createElement('button'); bCopy.className='btn is-sm'; bCopy.textContent='Von anderer Seite';
        const bDetach=document.createElement('button'); bDetach.className='btn is-sm'; bDetach.textContent='Werkzeug entfernen';
        const bCancel=document.createElement('button'); bCancel.className='btn is-sm'; bCancel.textContent='Abbrechen';
        const bSave=document.createElement('button'); bSave.className='btn brand is-sm'; bSave.textContent='Speichern';

        bSwap.onclick=()=>{ const other = prompt('Mit welcher Position tauschen? (1..12)','1'); const p=Number(other||0);
          if(p>=1 && p<=12){ Setup2.slot.swap(g.id, side, slot.pos, p); this.markDraft(); this.renderGrid(); }
        };
        bCopy.onclick=()=>{ const from = side==='RO'?'RU':'RO'; Setup2.slot.copyFromOtherSide(g.id, from, side); this.markDraft(); this.renderGrid(); };
        bDetach.onclick=()=>{ Setup2.slot.detachTool(g.id, side, slot.pos); this.markDraft(); this.renderGrid(); };
        bCancel.onclick=()=>{ this.state.openSlot=null; this.renderGrid(); };
        bSave.onclick=()=>{
          const T = r1.q.value.trim();
          Setup2.slot.setT(g.id, side, slot.pos, T||null);
          Setup2.slot.setAlias(g.id, side, slot.pos, r2.q.value.trim());
          this.markDraft(); this.state.openSlot=null; this.renderGrid();
        };
        ops.append(bSwap,bCopy,bDetach,bCancel,bSave);

        wrap.append(r1.el, r2.el, picker, ops);
        inl.append(wrap);
        art.append(inl);
      }

      return art;

      function field(label, value){
        const el=document.createElement('div'); el.className='row';
        el.innerHTML = `<label>${label}</label><input value="${esc(value||'')}">`;
        return {el, q: el.querySelector('input')};
      }
      function esc(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
    },
  };

  window.Setup2 = Setup2;
  window.Setup2UI = Setup2UI;

})(window);