
const NS='ctdocs_v1', LS={DOCS:NS+'_docs', CATS:NS+'_cats'};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const read=(k,f)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
function uid(){try{return crypto.randomUUID()}catch(e){return Math.random().toString(36).slice(2)}}
function toast(msg,type='info'){ let w=$('#toasts'); if(!w){w=document.createElement('div');w.id='toasts';w.className='toast-wrap';document.body.appendChild(w)}; const t=document.createElement('div'); t.className='toast'+(type==='error'?' error':type==='success'?' success':type==='warn'?' warn':''); t.textContent=msg; w.appendChild(t); setTimeout(()=>{t.style.opacity='0'; t.style.transition='opacity .25s'; setTimeout(()=>t.remove(),260)},1800);}

function seed(){
  if(!localStorage.getItem(LS.CATS)) write(LS.CATS, ['Maschine','Setup','Qualität','Sicherheit']);
  if(!localStorage.getItem(LS.DOCS)) write(LS.DOCS,[
    {id:id(), title:'WT‑250: Start', cat:'Maschine', fav:true, tags:['setup','safety'], text:'**Start‑Check**:\\n- Luft, Strom, Kühlmittel\\n- Referenzfahrt'},
    {id:id(), title:'Werkzeugwechsel', cat:'Setup', fav:false, tags:['tool'], text:'Schritte:\\n1. Maschine stoppen\\n2. Halter lösen\\n3. Neues Werkzeug spannen'}
  ]);
}

function mdLite(s){return (s||'').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/_(.+?)_/g,'<i>$1</i>').replace(/^\-\s(.+)$/gm,'• $1').replace(/`(.+?)`/g,'<code>$1</code>')}

function draw(){
  const q=$('#q').value.trim().toLowerCase();
  const fav=$('#onlyFav').checked;
  const cat=$('#catSel').dataset.value || 'ALLE';
  let arr=read(LS.DOCS,[]);
  if(cat!=='ALLE') arr=arr.filter(d=>(d.cat||'')===cat);
  if(fav) arr=arr.filter(d=>d.fav);
  if(q) arr=arr.filter(d=>(d.title+' '+(d.tags||[]).join(' ')+' '+(d.text||'')).toLowerCase().includes(q));
  const box=$('#list');
  box.innerHTML = arr.map(d=>`
    <details class="item">
      <summary class="card-b">
        <div style="display:flex;gap:.7rem;align-items:center;justify-content:space-between">
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.title}</div>
            <div class="small muted">${d.cat||'—'}${d.fav?' • ★':''}${d.tags && d.tags.length?' • '+d.tags.join(', '):''}</div>
          </div>
          <div class="small muted">Tippen</div>
        </div>
      </summary>
      <div class="card-b">
        <div class="muted" style="white-space:pre-wrap">${mdLite(d.text||'')}</div>
        <div style="display:flex;gap:.4rem;margin-top:.6rem">
          <button class="btn sm" data-edit="${d.id}">Bearbeiten</button>
          <button class="btn sm" data-fav="${d.id}">${d.fav?'★ Entfernen':'☆ Favorit'}</button>
          <button class="btn-danger sm" data-del="${d.id}">Löschen</button>
        </div>
      </div>
    </details>
  `).join('') || '<div class="card-b muted">Keine Seiten</div>';
  box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEditor(b.dataset.edit));
  box.querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>{let a=read(LS.DOCS,[]); const i=a.findIndex(x=>x.id===b.dataset.fav); if(i>-1){a[i].fav=!a[i].fav; write(LS.DOCS,a); draw();}});
  box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{let a=read(LS.DOCS,[]); const i=a.findIndex(x=>x.id===b.dataset.del); if(i>-1){a.splice(i,1); write(LS.DOCS,a); draw(); toast('Gelöscht','warn');}});
}

function openEditor(id){
  const arr=read(LS.DOCS,[]);
  const cur=id?arr.find(x=>x.id===id):{id:id(), title:'', cat:'', fav:false, tags:[], text:''};
  const dlg=$('#dlg'); dlg.setAttribute('open','');
  const fm=$('#fm');
  fm.title.value=cur.title||''; fm.cat.value=cur.cat||''; fm.tags.value=(cur.tags||[]).join(', '); fm.text.value=cur.text||'';
  const prev=$('#preview'); prev.innerHTML=mdLite(cur.text||'');
  $('#togglePrev').onclick=()=>{ prev.parentElement.classList.toggle('hidden') };
  fm.onsubmit=(e)=>{ e.preventDefault();
    const obj={ id:cur.id, title:fm.title.value.trim(), cat:fm.cat.value.trim(), fav:cur.fav,
                tags:fm.tags.value.split(',').map(x=>x.trim()).filter(Boolean), text:fm.text.value };
    let a=read(LS.DOCS,[]); const i=a.findIndex(x=>x.id===obj.id); if(i>-1) a[i]=obj; else a.unshift(obj);
    write(LS.DOCS,a); dlg.removeAttribute('open'); draw(); toast('Gespeichert','success');
  };
}

function openDrawer(){
  const dr=$('#drawer'); dr.setAttribute('open','');
  const cats=read(LS.CATS,[]); const lst=$('#catList'); lst.innerHTML='';
  const mk=(label,val)=>{const b=document.createElement('button'); b.className='btn'; b.textContent=label; b.onclick=()=>{ $('#catSel').textContent=label; $('#catSel').dataset.value=val; dr.removeAttribute('open'); draw(); }; return b;};
  lst.append(mk('Alle Kategorien','ALLE')); cats.forEach(c=>lst.append(mk(c,c)));
  $('#catNew').onclick=()=>{const n=prompt('Neue Kategorie:'); if(!n) return; let a=read(LS.CATS,[]); if(!a.includes(n)){a.push(n); write(LS.CATS,a);} openDrawer();};
  $('#catRename').onclick=()=>{const cur=$('#catSel').dataset.value; if(!cur || cur==='ALLE'){toast('Kategorie wählen','warn'); return;}
    const n=prompt('Neuer Name', cur); if(!n || n===cur) return; let a=read(LS.CATS,[]); const i=a.indexOf(cur); if(i>-1){a[i]=n; write(LS.CATS,a); let d=read(LS.DOCS,[]); d.forEach(x=>{if(x.cat===cur) x.cat=n}); write(LS.DOCS,d); $('#catSel').textContent=n; $('#catSel').dataset.value=n; toast('Umbenannt','success'); openDrawer();}};
  $('#catDel').onclick=()=>{const cur=$('#catSel').dataset.value; if(!cur || cur==='ALLE'){toast('Kategorie wählen','warn'); return;}
    const used=read(LS.DOCS,[]).some(x=>x.cat===cur); if(used){toast('Kategorie wird benutzt','error'); return;}
    let a=read(LS.CATS,[]).filter(x=>x!==cur); write(LS.CATS,a); $('#catSel').textContent='Alle Kategorien'; $('#catSel').dataset.value='ALLE'; dr.removeAttribute('open'); draw();};
}
function exportJSON(){ const blob=new Blob([JSON.stringify({docs:read(LS.DOCS,[]),cats:read(LS.CATS,[])},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='docs-export.json'; a.click(); URL.revokeObjectURL(a.href); }
function importJSON(e){ const f=e.target.files[0]; if(!f) return; const fr=new FileReader(); fr.onload=()=>{ try{const j=JSON.parse(fr.result); if(j.cats) write(LS.CATS,j.cats); if(j.docs) write(LS.DOCS,j.docs); draw(); toast('Import fertig','success'); }catch(err){toast('Import Fehler','error');}}; fr.readAsText(f); }

document.addEventListener('DOMContentLoaded', ()=>{
  seed(); draw();
  $('#btnNew').onclick=()=>openEditor(null);
  $('#btnFilter').onclick=openDrawer;
  $('#q').oninput=draw; $('#onlyFav').onchange=draw;
  $('#btnExport').onclick=exportJSON; $('#fileImport').onchange=importJSON;
  document.querySelectorAll('.dock a')[0].setAttribute('aria-current','page');
  document.getElementById('y').textContent=new Date().getFullYear();
});
