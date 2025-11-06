/* ---------- Core namespace ---------- */
window.CT = window.CT || {};

/* Storage helpers */
CT._lsGet = (k,def)=>{ try{ return JSON.parse(localStorage.getItem(k)) ?? def }catch(e){ return def } }
CT._lsSet = (k,v)=>localStorage.setItem(k, JSON.stringify(v));
CT.uid = (p='id') => p + Math.random().toString(36).slice(2,9);

/* Simple events */
CT.on = (el,ev,fn)=>el.addEventListener(ev,fn);

/* AppBar search activate */
CT.initSearch = (id='searchBox')=>{
  const box = document.getElementById(id); if(!box) return;
  const input = box.querySelector('input');
  CT.on(box,'click',()=>{ box.classList.add('active'); input.focus(); });
  CT.on(input,'blur',()=>{ if(!input.value) box.classList.remove('active'); });
  return input;
};

/* Modal (glass) */
CT.openModal = (html)=>{
  const m = document.createElement('div');
  m.className='modal show';
  m.innerHTML = `<div class="overlay" data-close></div><div class="card">${html}</div>`;
  document.body.appendChild(m);
  CT.on(m,'click',e=>{ if(e.target.dataset.close!==undefined) m.remove(); });
  return m;
};
CT.closeModal = (m)=> m && m.remove();

/* Chips component (tags) */
CT.renderChips = (wrap, tags, onRemove)=>{
  wrap.innerHTML = '';
  (tags||[]).forEach((t,i)=>{
    const s = document.createElement('span');
    s.className='chip';
    s.innerHTML = `${t}<span class="x" title="Entfernen">✕</span>`;
    s.querySelector('.x').onclick = ()=> onRemove(i);
    wrap.appendChild(s);
  });
};

/* Icon by file-type */
CT.fileIconSVG = (type='')=>{
  const t = type.toLowerCase();
  let path = 'M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z M14 2v6h6';
  if(t.includes('pdf')) path = 'M4 2h10l6 6v14H4z M14 2v6h6 M6 14h12 M6 18h8';
  if(t.includes('image')) path = 'M4 3h16v18H4z M6 15l4-4 3 3 5-5v9H6z M9 8a1.8 1.8 0 110 .01';
  if(t.includes('word')||t.endsWith('doc')||t.endsWith('docx')) path = 'M4 2h10l6 6v14H4z M14 2v6h6 M7 12h10 M7 16h8 M7 8h6';
  if(t.includes('ppt')||t.includes('presentation')) path = 'M3 4h18v2H3z M5 8h14v12H5z M9 10h6a3 3 0 010 6H9z';
  return `<svg class="ico" viewBox="0 0 24 24"><path d="${path}" fill="none" stroke="#2d6cdf" stroke-width="1.5"/></svg>`;
};

/* ---------- DOCS MODULE LOGIC ---------- */
CT.DOCS_KEY = 'CT_DOCS_V2';
CT.docs = CT._lsGet(CT.DOCS_KEY, []);

CT.saveDocs = ()=> CT._lsSet(CT.DOCS_KEY, CT.docs);

/* Create / Edit modal */
CT.editDoc = (doc)=>{
  const isNew = !doc;
  doc = doc ? {...doc} : { id:CT.uid('doc_'), title:'', category:'', desc:'', tags:[], file:null, tsCreated:Date.now(), tsUpdated:Date.now() };

  const modal = CT.openModal(`
    <h3>${isNew?'Neues Dokument':'Dokument bearbeiten'}</h3>
    <div class="grid">
      <div class="fld">
        <label>Titel *</label>
        <input id="f_title" value="${doc.title||''}" placeholder="z.B. M-Funktionsliste">
      </div>
      <div class="fld">
        <label>Kategorie</label>
        <input id="f_cat" value="${doc.category||''}" placeholder="z.B. Tipp, Zeichnung, Norm">
      </div>
      <div class="fld full">
        <label>Beschreibung</label>
        <textarea id="f_desc" placeholder="Kurzbeschreibung…">${doc.desc||''}</textarea>
      </div>
      <div class="fld">
        <label>Tags</label>
        <div class="row" id="tagsWrap"></div>
        <input id="f_tag" placeholder="Neuer Tag…">
      </div>
      <div class="fld">
        <label>Datei / Zeichnung</label>
        <div class="preview">
          <div class="thumb" id="prevThumb">
            ${doc.file?.thumb ? `<img src="${doc.file.thumb}">` : (doc.file ? CT.fileIconSVG(doc.file.type) : '<span class="muted">kein Datei</span>')}
          </div>
          <div class="row" style="justify-content:center;margin-top:.5rem">
            <button class="btn sm" id="btnPick">Datei wählen</button>
            ${doc.file ? `<button class="btn sm" id="btnDelF">Entfernen</button>`:''}
          </div>
          <div class="note">PDF/DOC/PPT/JPG/PNG</div>
        </div>
        <input type="file" id="f_file" hidden>
      </div>
    </div>
    <div class="footer">
      ${!isNew?'<button class="btn" id="btnDup">Duplizieren</button>':''}
      <button class="btn" data-close>Abbrechen</button>
      <button class="btn brand" id="btnSave">Speichern</button>
    </div>
  `);

  const $ = (id)=> modal.querySelector(id);

  const renderTags = ()=> CT.renderChips($('#tagsWrap'), doc.tags, (i)=>{ doc.tags.splice(i,1); renderTags(); });
  renderTags();

  $('#f_tag').addEventListener('keydown',(e)=>{
    if(e.key==='Enter' && e.target.value.trim()){
      doc.tags.push(e.target.value.trim()); e.target.value=''; renderTags();
    }
  });

  $('#btnPick').onclick = ()=> $('#f_file').click();
  $('#f_file').onchange = async (ev)=>{
    const f = ev.target.files[0]; if(!f) return;
    const entry = {name:f.name, type:f.type, size:f.size};
    if(f.type.startsWith('image/')){
      const fr = new FileReader();
      fr.onload = e=>{
        entry.thumb = e.target.result; // dataURL маленькой картинкой
        doc.file = entry;
        $('#prevThumb').innerHTML = `<img src="${entry.thumb}">`;
      };
      fr.readAsDataURL(f);
    } else {
      doc.file = entry;
      $('#prevThumb').innerHTML = CT.fileIconSVG(entry.type||entry.name);
    }
  };
  const save = ()=>{
    doc.title = $('#f_title').value.trim();
    if(!doc.title){ alert('Titel ist erforderlich.'); return; }
    doc.category = $('#f_cat').value.trim();
    doc.desc = $('#f_desc').value.trim();
    doc.tsUpdated = Date.now();

    const idx = CT.docs.findIndex(x=>x.id===doc.id);
    if(idx>=0) CT.docs[idx]=doc; else CT.docs.unshift(doc);
    CT.saveDocs(); CT.renderDocs(); CT.closeModal(modal);
  };
  $('#btnSave').onclick = save;

  if($('#btnDelF')) $('#btnDelF').onclick = ()=>{ doc.file=null; $('#prevThumb').innerHTML='<span class="muted">kein Datei</span>'; };

  if($('#btnDup')) $('#btnDup').onclick = ()=>{
    const copy = {...doc, id:CT.uid('doc_'), title: doc.title+' (Kopie)', tsCreated:Date.now(), tsUpdated:Date.now()};
    CT.docs.unshift(copy); CT.saveDocs(); CT.renderDocs(); CT.closeModal(modal);
  };
};

/* Render list + search/filter */
CT.renderDocs = ()=>{
  const wrap = document.getElementById('docsWrap'); if(!wrap) return;
  const q = (document.getElementById('searchDocs')?.value||'').toLowerCase().trim();
  const filter = CT._activeFilter || null;

  let list = [...CT.docs].sort((a,b)=>b.tsUpdated-a.tsUpdated);
  if(q){
    list = list.filter(d=>{
      const base = [d.title,d.category,d.desc,(d.tags||[]).join(' ')].join(' ').toLowerCase();
      return base.includes(q);
    });
  }
  if(filter){ list = list.filter(d=> (d.tags||[]).includes(filter) || (d.category||'')===filter ); }

  wrap.innerHTML = list.map(d=>{
    const thumb = d.file?.thumb ? `<img src="${d.file.thumb}">`
      : (d.file ? CT.fileIconSVG(d.file.type||d.file.name) : '<span class="muted">No</span>');
    const tagline = (d.category?`${d.category}`:'') + (d.tags?.length? ' • '+d.tags.slice(0,3).join(', '):'');
    const desc = (d.desc||'').length>96 ? d.desc.slice(0,96)+'…' : (d.desc||'');
    return `
      <li class="doc" data-id="${d.id}">
        <div class="thumb">${thumb}</div>
        <div class="meta">
          <div class="title">${d.title}</div>
          <div class="line">${tagline||'—'}</div>
          <div class="line">${desc}</div>
        </div>
        <div class="row">
          <button class="btn sm ghost" data-open>Öffnen</button>
          <button class="btn sm" data-edit>Bearbeiten</button>
          <button class="btn sm" data-del>Löschen</button>
        </div>
      </li>`;
  }).join('') || `<div class="muted" style="padding:10px">Keine Dokumente. Klicke „Neues Dokument“.</div>`;

  // delegate actions
  wrap.querySelectorAll('.doc').forEach(item=>{
    const id = item.dataset.id;
    item.querySelector('[data-edit]').onclick = ()=> CT.editDoc( CT.docs.find(d=>d.id===id) );
    item.querySelector('[data-del]').onclick = ()=>{
      const m = CT.openModal(`<h3>Dokument löschen?</h3>
        <div class="note" style="padding:8px 6px">„${CT.docs.find(d=>d.id===id)?.title}“ wird entfernt.</div>
        <div class="footer"><button class="btn" data-close>Abbrechen</button><button class="btn brand" id="ok">Löschen</button></div>`);
      m.querySelector('#ok').onclick=()=>{ CT.docs = CT.docs.filter(d=>d.id!==id); CT.saveDocs(); CT.renderDocs(); CT.closeModal(m); };
    };
    item.querySelector('[data-open]').onclick = ()=>{
      const d = CT.docs.find(x=>x.id===id);
      if(d?.file?.thumb && (d.file.type||'').startsWith('image/')){
        // быстрый просмотр
        const m = CT.openModal(`<h3>${d.title}</h3>
          <div class="preview"><img src="${d.file.thumb}" style="max-height:60vh;border-radius:12px"></div>
          <div class="footer"><button class="btn" data-close>Schließen</button></div>`);
        return;
      }
      // иконки/доки — предложить загрузить ещё раз (без бинарника)
      alert('Kein eingebetteter Dateiinhalt. Bitte Datei in der Bearbeitung erneut wählen/öffnen.');
    };
  });

  // обновить фильтр-чипсы
  const allCats = new Set(), allTags = new Set();
  CT.docs.forEach(d=>{ if(d.category) allCats.add(d.category); (d.tags||[]).forEach(t=>allTags.add(t)); });
  const chips = document.getElementById('docsFilters');
  if(chips){
    const renderFilter = (val,label)=>`<span class="chip${CT._activeFilter===val?' active':''}" data-val="${val}">${label||val}</span>`;
    const html = (CT._activeFilter?`<span class="chip" data-val="">Alle</span>`:'')
      + [...allCats].map(c=>renderFilter(c)).join('')
      + [...allTags].map(t=>renderFilter(t)).join('');
    chips.innerHTML = html || '';
    chips.querySelectorAll('.chip').forEach(ch=>{
      ch.onclick = ()=>{ CT._activeFilter = ch.dataset.val || null; CT.renderDocs(); };
    });
  }
};

/* Module bootstrap for Docs */
CT.initDocsModule = ()=>{
  // AppBar search
  const s = CT.initSearch('searchBox');
  if(s){ s.id='searchDocs'; s.oninput = ()=> CT.renderDocs(); }
  // Top buttons
  const newBtn = document.getElementById('btnNewDoc');
  if(newBtn) newBtn.onclick = ()=> CT.editDoc();
  // Initial render
  CT.renderDocs();
};