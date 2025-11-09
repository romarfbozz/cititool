// /ui/setup.js — v7.8 (fix Picker.create + compact slot preview)
;(function (global) {
  "use strict";
  const K_GROUPS='CT_PROG_GROUPS_V1', K_OLD='CT_PROGS_V1', K_LIVE='CT_LIVE_V1';
  const SLOTS=12;

  // ---------- CSS ----------
  (function css(){
    const id='ct-setup-v78-css'; if(document.getElementById(id)) return;
    const s=document.createElement('style'); s.id=id; s.textContent=`
.ct-ed{position:fixed;inset:0;z-index:9999;display:grid;grid-template-rows:auto 1fr auto;background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(255,255,255,.96));backdrop-filter:saturate(1.1) blur(8px)}
.ct-ed .bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid #e9eef6;background:#fff}
.ct-ed .bar .ttl{font:900 18px/1.1 Inter,system-ui}
.ct-ed .bar .l,.ct-ed .bar .r{display:flex;gap:8px;align-items:center}
.ct-ed .cnt{overflow:auto;padding:12px;max-width:980px;margin:0 auto;width:100%}
.ct-ed .img{width:100%;border:1px solid #edf1f7;border-radius:12px;object-fit:cover;margin-bottom:8px;background:#f5f8ff}
.ct-ed .grp{display:grid;gap:8px;margin:8px 0}
.ct-ed label{font-weight:800}
.ct-ed input,.ct-ed textarea{border:1px solid #dbe5ff;border-radius:12px;padding:10px 12px;font-weight:700}
.ct-ed input{height:40px}
.ct-ed textarea{min-height:84px;resize:vertical}
.ct-ed .tabs{display:flex;gap:8px;margin:10px 0}
.tab{padding:8px 12px;border:1px solid #dbe5ff;background:#fff;border-radius:12px;font-weight:800}
.tab.active{background:#eef3ff;box-shadow:inset 0 0 0 1px #d6e5ff}
.ct-ed .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
@media (max-width:560px){.ct-ed .grid{grid-template-columns:repeat(2,1fr)}}
.slot{border:1px solid #edf1f7;border-radius:16px;background:#fff;box-shadow:0 10px 30px rgba(13,27,42,.08)}
.slot .ph{height:84px;background:#f5f8ff;display:grid;place-items:center;border-bottom:1px solid #edf1f7}
.slot .ph img{max-width:100%;max-height:84px;object-fit:cover}
.slot .meta{padding:10px}
.slot .meta .t{font-weight:800}
.slot .meta .n{color:#6b7a90;font-size:13px}
.slot.expanded{grid-column:1/-1}
.inl{background:#fbfcff;border-top:1px dashed #e7ecf6}
.inl .wrap{padding:12px;display:grid;gap:8px}
.inl .row{display:grid;gap:6px}
.inl .img{width:100%;max-height:160px;object-fit:contain;background:#f5f8ff;border:1px solid #edf1f7;border-radius:12px}
.ct-ed .ft{display:flex;gap:8px;justify-content:center;padding:8px;border-top:1px solid #e9eef6;background:#fff;color:#6b7a90;font-size:12px}
.btn{height:40px;padding:0 14px;border-radius:14px;border:1px solid #dbe5ff;background:#fff;font-weight:800}
.btn.brand{background:#2d6cdf;border-color:#2d6cdf;color:#fff;box-shadow:0 8px 20px rgba(45,108,223,.25)}
.btn.is-sm{height:32px;border-radius:12px}
.i-btn{width:36px;height:36px;border-radius:12px;border:1px solid #dbe5ff;background:#fff;font-weight:900;display:grid;place-items:center}
.badge-live{display:inline-grid;place-items:center;min-width:42px;height:28px;border-radius:10px;background:#eef3ff;color:#2d6cdf;font-weight:800;padding:0 10px}
.ct-sub{color:#6b7a90;font-size:13px}
.ct-bd{position:fixed;inset:0;z-index:11040;background:rgba(13,27,42,.25);opacity:0;pointer-events:none;transition:opacity .2s}
.ct-bd.show{opacity:1;pointer-events:auto}
.ct-sheet{position:fixed;left:0;right:0;bottom:0;z-index:11050;background:#fff;border-top:1px solid #e9eef6;border-radius:18px 18px 0 0;box-shadow:0 -18px 40px rgba(13,27,42,.12);transform:translateY(100%);transition:transform .25s}
.ct-sheet.show{transform:translateY(0)}
.ct-sheet .hd{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid #eef2f8}
.ct-sheet .hd .tt{font:900 16px/1 Inter,system-ui}
.ct-sheet .hd .x{height:34px;padding:0 12px;border-radius:12px;border:1px solid #dbe5ff;background:#fff;font-weight:800}
.ct-sheet .body{max-height:62vh;overflow:auto;padding:10px 12px;display:grid;gap:10px}
.ct-prev img{width:100%;border:1px solid #edf1f7;border-radius:12px;background:#f5f8ff}
.ct-prev .line{color:#6b7a90}
.handle{height:18px;display:grid;place-items:center}
.handle:before{content:'';width:44px;height:5px;border-radius:3px;background:#dbe5ff}
.ct-p-search{height:40px;border:1px solid #dbe5ff;border-radius:12px;padding:0 12px;font-weight:700;width:100%}
.ct-tool{display:grid;grid-template-columns:56px 1fr auto;gap:10px;align-items:center;border:1px solid #edf1f7;border-radius:14px;padding:8px}
.ct-tool img{width:56px;height:56px;object-fit:cover;border-radius:10px;background:#f5f8ff;border:1px solid #edf1f7}
    `; document.head.appendChild(s);
  })();

  // ---------- utils ----------
  const storage={
    get(k,def){ try{ if(global.CT?.load) return global.CT.load(k,def); const r=localStorage.getItem(k); return r==null?def:JSON.parse(r);}catch{return def} },
    set(k,v){ try{ if(global.CT?.save) return global.CT.save(k,v); localStorage.setItem(k,JSON.stringify(v)); }catch{} }
  };
  const now=()=>Date.now(), uid=()=>Math.random().toString(36).slice(2,10);
  const byCreatedDesc=(a,b)=>(b.createdAt||0)-(a.createdAt||0);
  const emptySide=(name)=>({name, slots:Array.from({length:SLOTS},(_,i)=>({pos:i+1,tnum:null,toolId:null,alias:''}))});
  const ph=()=>'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120"><rect width="100%" height="100%" fill="#f5f8ff"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter,system-ui" font-size="14" fill="#8aa0c4">kein Foto</text></svg>`);

  const Tools = {
    list(){ return storage.get('CT_TOOLS_V1',[])||[]; },
    byId(id){ return this.list().find(t=>t.id===id); },
    createQuick({name,iso,code,photo,category='Allgemein',notes=''}) {
      const t={id:uid(), name:(name||'Tool').trim(), iso:iso||'', code:code||'', photo:photo||null, category, notes, createdAt:now(), updatedAt:now()};
      storage.set('CT_TOOLS_V1',[t, ...this.list()]); return t;
    }
  };

  // ---------- backdrop ----------
  const mkBD=()=>{ const bd=document.createElement('div'); bd.className='ct-bd'; document.body.appendChild(bd); requestAnimationFrame(()=>bd.classList.add('show')); return bd; };
  const rmBD=(bd)=>{ if(!bd) return; bd.classList.remove('show'); setTimeout(()=>bd.remove(),150); };

  // ---------- Picker (fixed) ----------
  const Picker={ el:null, bd:null, esc:null, onPick:null,
    open({title='Werkzeug wählen', mode='pick', onPick}){
      this.close(); this.onPick=onPick; this.bd=mkBD();
      const el=document.createElement('div'); el.className='ct-sheet';
      el.innerHTML=`<div class="handle"></div>
        <div class="hd"><div class="tt">${title}</div><div>${mode==='pick'?'<button class="btn is-sm" data-a="new">+ Neues Werkzeug</button>':''}<button class="x" data-a="close">Schließen</button></div></div>
        <div class="body"></div>`;
      document.body.appendChild(el); this.el=el;

      const close=()=>this.close();
      el.querySelector('[data-a="close"]').onclick=close; this.bd.onclick=close;
      document.addEventListener('keydown', this.esc=(e)=>{ if(e.key==='Escape') close(); });

      let sy=null; const handle=el.querySelector('.handle');
      handle.addEventListener('touchstart',e=>{ sy=e.touches[0].clientY; });
      handle.addEventListener('touchmove',e=>{ if(sy!=null && e.touches[0].clientY - sy > 160) close(); });

      if(mode==='pick') this.list(); else this.create();

      void el.offsetHeight; setTimeout(()=> el.classList.add('show'), 0);
    },
    list(){
      const b=this.el.querySelector('.body'); b.innerHTML='';
      const input=document.createElement('input'); input.placeholder='Suchen…'; input.className='ct-p-search';
      const wrap=document.createElement('div'); wrap.style.display='grid'; wrap.style.gap='8px';
      b.append(input,wrap);
      const render=(q='')=>{
        wrap.innerHTML='';
        const qq=q.trim().toLowerCase();
        const list=Tools.list().filter(t=>!qq || [t.name,t.iso,t.code,t.category].join(' ').toLowerCase().includes(qq));
        if(!list.length){ const e=document.createElement('div'); e.className='ct-sub'; e.textContent='Keine Werkzeuge'; wrap.append(e); }
        list.forEach(t=>{
          const row=document.createElement('div'); row.className='ct-tool';
          const im=document.createElement('img'); im.src=t.photo||ph();
          const info=document.createElement('div'); info.innerHTML=`<div class="nm">${t.name}</div><div class="sub">${t.iso||'-'} • ${t.code||'-'} • ${t.category||'Allgemein'}</div>`;
          const pick=document.createElement('button'); pick.className='btn is-sm'; pick.textContent='Wählen';
          pick.onclick=()=>{ this.onPick&&this.onPick(t); this.close(); };
          row.append(im,info,pick); wrap.append(row);
        });
      };
      input.addEventListener('input',()=>render(input.value)); render('');
      const nb=this.el.querySelector('[data-a="new"]'); if(nb) nb.onclick=()=>this.open({title:'Neues Werkzeug', mode:'new', onPick:this.onPick});
    },
    create(){
      const b=this.el.querySelector('.body'); b.innerHTML='';
      const row=(label,id)=>{ const el=document.createElement('div'); el.className='form-row'; el.innerHTML=`<label>${label}</label><input id="${id}">`; return {el, q:el.querySelector('input')}; };
      const mkBtn=(label,cls='')=>{ const bt=document.createElement('button'); bt.className='btn '+cls; bt.textContent=label; return bt; }; // <-- FIX

      const nm=row('Name','p_name'), iso=row('ISO / Code','p_iso');
      const img=document.createElement('img'); img.src=ph(); img.style.width='100%'; img.style.border='1px solid #edf1f7'; img.style.borderRadius='12px';

      const fin=document.createElement('input'); fin.type='file'; fin.accept='image/*'; fin.style.display='none'; document.body.appendChild(fin);
      fin.onchange=()=>{ const f=fin.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>img.src=r.result; r.readAsDataURL(f); };

      const bar=document.createElement('div'); bar.style.display='flex'; bar.style.gap='8px'; bar.style.justifyContent='flex-end';
      const bPhoto=mkBtn('Foto','is-sm'), bCreate=mkBtn('Anlegen','brand is-sm');

      bPhoto.onclick= async ()=>{
        try{ if(global.CT?.uploader?.accept){ const files=await CT.uploader.accept({accept:'image/*',to:'dataURL'}); if(files?.[0]){ img.src=files[0].dataUrl; return; } } }catch{}
        fin.click();
      };
      bCreate.onclick=()=>{ const t=Tools.createQuick({name:nm.q.value, iso:iso.q.value, photo:img.src.startsWith('data:')?img.src:null}); this.onPick&&this.onPick(t); this.close(); fin.remove(); };

      bar.append(bPhoto,bCreate); b.append(nm.el,iso.el,img,bar);
    },
    close(){ if(this.el){ this.el.classList.remove('show'); const el=this.el; this.el=null; setTimeout(()=>el.remove(),180); } rmBD(this.bd); this.bd=null; if(this.esc){document.removeEventListener('keydown',this.esc); this.esc=null;} }
  };

  // ---------- Preview ----------
  const Preview={ el:null, bd:null, esc:null,
    open(g){
      this.close(); this.bd=mkBD();
      const el=document.createElement('div'); el.className='ct-sheet';
      const live=Setup.live(); const isLive=(live.RO?.id===g.id)||(live.RU?.id===g.id);
      el.innerHTML=`<div class="handle"></div>
        <div class="hd"><div class="tt">${g.title} — ${g.nr}</div><div><button class="x" data-a="close">Schließen</button></div></div>
        <div class="body">
          <div class="ct-prev">
            <img src="${g.drawing||ph()}" alt="">
            <div class="line"><b>Zeichnung:</b> ${g.zeichnungsNr||'—'}</div>
            <div class="line"><b>Material:</b> ${g.material||'—'}</div>
            ${isLive?'<div class="line"><span class="badge-live">Live</span></div>':''}
            <div class="line"><b>Slots RO:</b> ${g.sides.RO.slots.filter(s=>s.tnum).length}/${SLOTS} • <b>RU:</b> ${g.sides.RU.slots.filter(s=>s.tnum).length}/${SLOTS}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              <button class="btn is-sm" data-a="live-ro">In Live (RO)</button>
              <button class="btn is-sm" data-a="live-ru">In Live (RU)</button>
              <button class="btn is-sm" data-a="del">Löschen</button>
              <button class="btn brand is-sm" data-a="edit">Bearbeiten</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(el); this.el=el;
      const close=()=>this.close();
      el.querySelector('[data-a="close"]').onclick=close; this.bd.onclick=close;
      document.addEventListener('keydown', this.esc=(e)=>{ if(e.key==='Escape') close(); });
      let sy=null; const handle=el.querySelector('.handle');
      handle.addEventListener('touchstart',e=>{ sy=e.touches[0].clientY; });
      handle.addEventListener('touchmove',e=>{ if(sy!=null && e.touches[0].clientY-sy>160) close(); });
      el.addEventListener('click',e=>{
        const b=e.target.closest('button[data-a]'); if(!b) return;
        const a=b.dataset.a;
        if(a==='edit'){ this.close(); Editor.open(g); }
        else if(a==='del'){ CT.ui.confirm({title:'Programm löschen?',msg:`${g.title} — ${g.nr}`}).then(ok=>{ if(ok){ Setup.remove(g.id); this.close(); UI.render(); } }); }
        else if(a==='live-ro'){ Setup.applyLive(g.id,'RO'); CT.ui.toast('Live RO gesetzt','ok'); UI.render(); }
        else if(a==='live-ru'){ Setup.applyLive(g.id,'RU'); CT.ui.toast('Live RU gesetzt','ok'); UI.render(); }
      });
      void el.offsetHeight; setTimeout(()=> el.classList.add('show'), 0);
    },
    close(){ if(this.el){ this.el.classList.remove('show'); const el=this.el; this.el=null; setTimeout(()=>el.remove(),180); } rmBD(this.bd); this.bd=null; if(this.esc){document.removeEventListener('keydown',this.esc); this.esc=null;} }
  };

  // ---------- data ----------
  const Setup={
    _hardSeed(){
      const demo=[]; for(let i=0;i<5;i++){ const nr=String(231800+i);
        const g={id:uid(), nr, title:`Programm ${nr}`, zeichnungsNr:`Z${nr}`, material:i%2?'1.4112':'C45', drawing:null, notes:'',
          sides:{RO:emptySide('RO'), RU:emptySide('RU')}, createdAt:now()-(5-i)*10000, updatedAt:now()-(5-i)*10000};
        [1,3,5].forEach(p=>{ g.sides.RO.slots[p-1].tnum=`T${String(p).padStart(2,'0')}${String(p).padStart(2,'0')}`; g.sides.RU.slots[p-1].tnum=`T${String(p+1).padStart(2,'0')}${String(p+1).padStart(2,'0')}`; });
        demo.push(g);
      }
      storage.set(K_GROUPS, demo.sort(byCreatedDesc));
      if(!storage.get(K_LIVE,null)) storage.set(K_LIVE,{RO:null,RU:null});
    },
    _migrateOld(){
      const old=storage.get(K_OLD,[]); if(!Array.isArray(old)||!old.length) return false;
      const map=new Map();
      old.forEach(p=>{
        const key=(p.nr||p.title||'').toString(); if(!key) return;
        if(!map.has(key)) map.set(key,{id:uid(), nr:p.nr||key, title:p.title||`Programm ${key}`, zeichnungsNr:p.meta?.oLine||'', material:'',
          drawing:p.drawing||null, notes:'', sides:{RO:emptySide('RO'), RU:emptySide('RU')}, createdAt:p.createdAt||now(), updatedAt:p.updatedAt||now()});
        const g=map.get(key), side=(p.side==='RU')?'RU':'RO';
        (p.slots||[]).forEach(s=>{ const i=Math.min(Math.max((s.pos||1)-1,0),SLOTS-1); g.sides[side].slots[i]={pos:i+1, tnum:s.tnum||null, toolId:s.toolId||null, alias:s.alias||''}; });
      });
      storage.set(K_GROUPS, [...map.values()].sort(byCreatedDesc)); return true;
    },
    ensure(){ let groups=storage.get(K_GROUPS,null); if(!Array.isArray(groups)||!groups.length){ if(!this._migrateOld()) this._hardSeed(); } if(!storage.get(K_LIVE,null)) storage.set(K_LIVE,{RO:null,RU:null}); },
    list({q='',side=''}={}){ const all=storage.get(K_GROUPS,[])||[]; const qq=q.trim().toLowerCase();
      return all.filter(g=> (!side||g.sides?.[side]) && (!qq || [g.nr,g.title,g.zeichnungsNr,g.material].join(' ').toLowerCase().includes(qq))).sort(byCreatedDesc);
    },
    get(id){ return (storage.get(K_GROUPS,[])||[]).find(g=>g.id===id); },
    upsert(g){ const arr=storage.get(K_GROUPS,[])||[]; const i=arr.findIndex(x=>x.id===g.id); g.updatedAt=now(); if(i>=0) arr[i]=g; else{ g.createdAt=now(); arr.unshift(g); } storage.set(K_GROUPS,arr); return g; },
    create({nr,title,zeichnungsNr,material,drawing=null,notes=''}){ return this.upsert({id:uid(), nr:(nr||'').trim()||String(Math.floor(Math.random()*1e6)), title:(title||'Untitled').trim(), zeichnungsNr:(zeichnungsNr||'').trim(), material:(material||'').trim(), drawing, notes, sides:{RO:emptySide('RO'), RU:emptySide('RU')}, createdAt:now(), updatedAt:now()}); },
    remove(id){ storage.set(K_GROUPS, (storage.get(K_GROUPS,[])||[]).filter(g=>g.id!==id)); },
    live(){ return storage.get(K_LIVE,{RO:null,RU:null}); },
    applyLive(id,side){ const g=this.get(id); if(!g) return null; const minimal={id:g.id,nr:g.nr,side,title:g.title,slots:g.sides[side].slots,at:now()}; const cur=this.live(); cur[side]=minimal; storage.set(K_LIVE,cur); return minimal; }
  };

  // ---------- Editor ----------
  const Editor={ el:null, draft:null, dirty:false, side:'RO', openPos:null,
    open(group){
      if(this.el){ this.render(group); return; }
      const el=document.createElement('div'); el.className='ct-ed';
      el.innerHTML=`
        <div class="bar">
          <div class="l"><button class="btn is-sm" data-a="close">Schließen</button></div>
          <div class="ttl"></div>
          <div class="r">
            <button class="btn is-sm" data-a="live-ro">In Live (RO)</button>
            <button class="btn is-sm" data-a="live-ru">In Live (RU)</button>
            <button class="btn is-sm" data-a="del">Löschen</button>
            <button class="btn brand is-sm" data-a="save">Speichern</button>
          </div>
        </div>
        <div class="cnt"></div>
        <div class="ft">Ein Editor pro Seite • Несохранённые изменения защищены</div>`;
      document.body.appendChild(el); this.el=el;

      const askClose=async()=>{ if(!this.dirty) return true; const ok=await (global.CT?.ui?.confirm? CT.ui.confirm({title:'Schließen ohne Speichern?', msg:'Änderungen gehen verloren.'}) : Promise.resolve(confirm('Schließen ohne Speichern?'))); return !!ok; };
      const doClose=async()=>{ if(await askClose()){ this._detach(); this.el.remove(); this.el=null; this.draft=null; document.documentElement.style.overflow=''; } };
      el.addEventListener('click', async e=>{
        const b=e.target.closest('button[data-a]'); if(!b) return;
        const a=b.dataset.a;
        if(a==='close') await doClose();
        else if(a==='save') this._save();
        else if(a==='del'){ const ok=await (global.CT?.ui?.confirm? CT.ui.confirm({title:'Programm löschen?', msg:this.draft.title+' — '+this.draft.nr}) : Promise.resolve(confirm('Löschen?'))); if(ok){ Setup.remove(this.draft.id); await doClose(); UI.render(); } }
        else if(a==='live-ro'){ Setup.applyLive(this.draft.id,'RO'); CT.ui?.toast?.('Live RO gesetzt','ok'); }
        else if(a==='live-ru'){ Setup.applyLive(this.draft.id,'RU'); CT.ui?.toast?.('Live RU gesetzt','ok'); }
      });
      const onKey=(e)=>{ if(e.key==='Escape') doClose(); };
      document.addEventListener('keydown', onKey); el._kill=()=>document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow='hidden';
      this.render(group);
    },
    _detach(){ this.el?._kill && this.el._kill(); },
    markDirty(){ this.dirty=true; },
    render(group){
      this.draft=JSON.parse(JSON.stringify(group||{})); this.dirty=false; this.side='RO'; this.openPos=null;
      const cnt=this.el.querySelector('.cnt'); const ttl=this.el.querySelector('.ttl');
      ttl.textContent=`${this.draft.title||'Programm'} — ${this.draft.nr||''}`;

      const img=document.createElement('img'); img.className='img'; img.src=this.draft.drawing||ph();
      const row=document.createElement('div'); row.className='grp';
      const bSet=mkBtn('Zeichnung ändern','is-sm'), bClr=mkBtn('Entfernen','is-sm');
      bSet.onclick= async ()=>{ try{ const files=await global.CT?.uploader?.accept?.({accept:'image/*',to:'dataURL'}); if(files?.[0]){ this.draft.drawing=files[0].dataUrl; img.src=this.draft.drawing; this.markDirty(); } }catch{} };
      bClr.onclick=()=>{ this.draft.drawing=null; img.src=ph(); this.markDirty(); };
      row.append(bSet,bClr);

      const f=document.createElement('div'); f.className='grp';
      f.innerHTML=`
        <label>Titel</label><input id="f_title" value="${esc(this.draft.title||'')}">
        <label>Programm-Nr</label><input id="f_nr" value="${esc(this.draft.nr||'')}">
        <label>Zeichnungsnummer</label><input id="f_znr" value="${esc(this.draft.zeichnungsNr||'')}">
        <label>Material</label><input id="f_mat" value="${esc(this.draft.material||'')}">
        <label>Notizen</label><textarea id="f_note">${esc(this.draft.notes||'')}</textarea>`;
      f.querySelectorAll('input,textarea').forEach(el=> el.addEventListener('input', ()=>this.markDirty()));

      const tabs=document.createElement('div'); tabs.className='tabs';
      const bRO=tab('RO',true), bRU=tab('RU',false); tabs.append(bRO,bRU);
      bRO.onclick=()=>{ this.side='RO'; bRO.classList.add('active'); bRU.classList.remove('active'); this.openPos=null; draw(); };
      bRU.onclick=()=>{ this.side='RU'; bRU.classList.add('active'); bRO.classList.remove('active'); this.openPos=null; draw(); };

      const grid=document.createElement('div'); grid.className='grid';

      const draw=()=>{
        grid.innerHTML='';
        const sideObj=this.draft.sides?.[this.side] || (this.draft.sides[this.side]=emptySide(this.side));
        sideObj.slots.forEach(slot=>{
          const art=document.createElement('article'); art.className='slot';
          const phb=document.createElement('div'); phb.className='ph';
          const tool=slot.toolId?Tools.byId(slot.toolId):null;
          if(tool?.photo){ const im=document.createElement('img'); im.src=tool.photo; phb.append(im); }
          else phb.innerHTML='<svg width="54" height="54" viewBox="0 0 24 24" style="opacity:.35"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2z"/></svg>';
          const meta=document.createElement('div'); meta.className='meta';
          meta.innerHTML=`<div class="t">Pos ${slot.pos} • ${slot.tnum||'—'}</div><div class="n">${slot.alias || tool?.name || 'kein Werkzeug'}</div>`;
          const b=mkBtn(this.openPos===slot.pos?'Schließen':'Bearbeiten','is-sm');
          b.onclick=()=>{ this.openPos=this.openPos===slot.pos?null:slot.pos; draw(); if(this.openPos===slot.pos) requestAnimationFrame(()=>art.scrollIntoView({behavior:'smooth',block:'start'})); };
          meta.append(b); art.append(phb,meta);

          if(this.openPos===slot.pos){
            art.classList.add('expanded');
            const inl=document.createElement('div'); inl.className='inl';
            const wrap=document.createElement('div'); wrap.className='wrap';
            const img2=document.createElement('img'); img2.className='img'; img2.src=tool?.photo||ph();
            const r1=rowField('T-Nummer (z.B. T0101)', slot.tnum||''), r2=rowField('Alias / Titel', slot.alias||'');
            const btns=document.createElement('div'); btns.style.display='flex'; btns.style.gap='8px'; btns.style.flexWrap='wrap'; btns.style.justifyContent='flex-end';
            const bPick=mkBtn('Aus Tools wählen'), bNew=mkBtn('Neues Werkzeug'), bDetach=mkBtn('Entfernen','is-sm'), bCancel=mkBtn('Abbrechen'), bSave=mkBtn('Speichern','brand');
            bPick.onclick=()=> Picker.open({title:'Werkzeug wählen', mode:'pick', onPick:(t)=>{ slot.toolId=t.id; img2.src=t.photo||ph(); this.markDirty(); }});
            bNew.onclick =()=> Picker.open({title:'Neues Werkzeug', mode:'new',  onPick:(t)=>{ slot.toolId=t.id; img2.src=t.photo||ph(); this.markDirty(); }});
            bDetach.onclick=()=>{ slot.toolId=null; img2.src=ph(); this.markDirty(); };
            bCancel.onclick=()=>{ this.openPos=null; draw(); };
            bSave.onclick=()=>{ slot.tnum=r1.q.value.trim()||null; slot.alias=r2.q.value.trim(); this.markDirty(); this.openPos=null; draw(); };
            btns.append(bPick,bNew,bDetach,bCancel,bSave);
            wrap.append(img2,r1.el,r2.el,btns); inl.append(wrap); art.append(inl);
          }
          grid.append(art);
        });
      };

      const cntEl=this.el.querySelector('.cnt');
      cntEl.innerHTML=''; cntEl.append(img,row,f,tabs,grid); draw();

      this._save=()=>{
        const v={ title:val('#f_title'), nr:val('#f_nr'), zeichnungsNr:val('#f_znr'), material:val('#f_mat'), notes:val('#f_note') };
        Object.assign(this.draft,v); Setup.upsert(this.draft); this.dirty=false;
        global.CT?.ui?.toast?.('Gespeichert','ok'); this.el.querySelector('.ttl').textContent=`${this.draft.title||'Programm'} — ${this.draft.nr||''}`; UI.render();
      };

      function val(sel){ return (cntEl.querySelector(sel)?.value||'').trim(); }
      function tab(t,act){ const b=document.createElement('button'); b.className='tab'; if(act) b.classList.add('active'); b.textContent=t; return b; }
      function rowField(label,value){ const el=document.createElement('div'); el.className='row'; el.innerHTML=`<label>${label}</label><input value="${esc(value||'')}">`; return {el, q:el.querySelector('input')}; }
      function mkBtn(label, cls=''){ const b=document.createElement('button'); b.className='btn '+cls; b.textContent=label; return b; }
      function esc(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
    }
  };

  // ---------- List UI ----------
  const UI={
    els:{}, state:{q:'',side:''},
    mount({qInput,listWrap,lastWrap,chipsSides,newBtn}){
      Setup.ensure(); this.els={qInput,listWrap,lastWrap,chipsSides,newBtn};
      const deb=global.CT?.debounce || ((fn)=>fn);
      qInput?.addEventListener('input', deb(()=>{ this.state.q=qInput.value; this.render(); },200));
      chipsSides?.addEventListener('click',e=>{
        const b=e.target.closest('button[data-side]'); if(!b) return;
        chipsSides.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
        b.classList.add('active'); this.state.side=b.dataset.side||''; this.render();
      });
      newBtn?.addEventListener('click', ()=> Editor.open( Setup.create({nr:'',title:'Neues Programm'}) ));
      this.render();
    },
    _i(h){ const b=document.createElement('button'); b.className='i-btn'; b.textContent='i'; b.onclick=h; return b; },
    render(){
      const list=Setup.list({q:this.state.q, side:this.state.side});
      const last=this.els.lastWrap; if(last){ last.innerHTML=''; list.slice(0,3).forEach(g=>{ const r=document.createElement('div'); r.style.display='flex'; r.style.gap='10px'; r.style.alignItems='center';
        const im=document.createElement('img'); im.src=g.drawing||ph(); im.style.width='56px'; im.style.height='56px'; im.style.borderRadius='12px'; im.style.objectFit='cover'; im.style.border='1px solid #edf1f7';
        const t=document.createElement('div'); t.innerHTML=`<div style="font-weight:800">${g.title} — ${g.nr}</div><div class="ct-sub">${g.material||'—'} • ${g.zeichnungsNr||'—'}</div>`;
        r.append(im,t,this._i(()=>Preview.open(g))); last.append(r); }); }
      const wrap=this.els.listWrap; if(!wrap) return; wrap.innerHTML='';
      if(!list.length){ const box=document.createElement('div'); box.className='ct-sub'; box.textContent='Noch keine Programme.'; wrap.append(box); return; }
      const live=Setup.live();
      list.forEach(g=>{
        const row=document.createElement('div'); row.className='row';
        row.innerHTML=`<div><div class="title">${g.title} — ${g.nr}</div>
          <div class="ct-sub">${g.material||'—'} • ${g.zeichnungsNr||'—'}${(live.RO?.id===g.id||live.RU?.id===g.id)?' • <span class="badge-live">Live</span>':''}</div></div>`;
        const right=document.createElement('div'); right.append( this._i(()=>Preview.open(g)) );
        row.append(right); wrap.append(row);
      });
    }
  };

  // export
  global.Setup=Setup; global.SetupUI=UI;
})(window);