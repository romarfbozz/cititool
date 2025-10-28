/* Mini AI v3 — Q/A + полнотекстовый поиск по .txt-выжимкам */
(function(){
  if(!window.CT){ console.warn('CT missing'); return; }

  let IDX=null, KB=null, TXT={}; // кэш

  async function loadJSON(path){
    const res = await fetch(path, {cache:'no-store'});
    if(!res.ok) throw new Error(path);
    return await res.json();
  }

  async function ensureIndex(){
    if(!IDX) {
      try{ IDX = await loadJSON('./ai/index.json'); } catch(e){ IDX=[]; }
    }
    if(!KB){
      try{ KB = await loadJSON('./ai/kb.json'); } catch(e){ KB={}; }
    }
    return {IDX,KB};
  }

  // Загружаем .txt для тех элементов, у кого указан text (путь)
  async function ensureTexts(){
    const need = (IDX||[]).filter(d=>d.text && !TXT[d.text]);
    await Promise.all(need.map(async d=>{
      try{
        const r = await fetch(d.text, {cache:'no-store'});
        TXT[d.text] = (await r.text()).replace(/\s+/g,' ').trim();
      }catch(_){ TXT[d.text]=''; }
    }));
  }

  function highlight(snippet, query){
    const q = query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return snippet.replace(new RegExp(q,'ig'), m=>`<mark>${m}</mark>`);
  }

  // простенькое разбиение и скоринг
  function searchInTexts(query){
    const q = (query||'').toLowerCase().trim();
    if(!q) return [];
    const res = [];
    (IDX||[]).forEach(d=>{
      if(!d.text || !TXT[d.text]) return;
      const text = TXT[d.text].toLowerCase();
      let pos = text.indexOf(q);
      let hitCount=0;
      const snippets=[];
      while(pos!==-1 && hitCount<3){
        const from = Math.max(0, pos-120);
        const to   = Math.min(TXT[d.text].length, pos+120);
        snippets.push(TXT[d.text].slice(from,to));
        hitCount++;
        pos = text.indexOf(q, pos+q.length);
      }
      if(snippets.length){
        res.push({doc:d, snippets});
      }
    });
    return res;
  }

  function kbLookup(query){
    if(!KB) return null;
    const q = (query||'').trim().toLowerCase();
    // 1) точное ключевое слово
    const exact = KB[q];
    if(exact) return exact;
    // 2) искать по ключам, содержащим фразу
    const key = Object.keys(KB).find(k => k.includes(q));
    return key ? KB[key] : null;
  }

  function panelHTML(){
    return `
      <label class="fld">Deine Frage
        <input id="aiq" placeholder="z.B. Was ist RG720? oder G54 / Verschiebung…" autofocus>
      </label>
      <div id="aiAns" class="card" style="margin-top:.6rem">
        <div class="muted">Gib eine Frage ein und drücke Enter.</div>
      </div>
      <div class="row" style="margin-top:.6rem">
        <button class="btn sm" data-aiq="RG720">RG720</button>
        <button class="btn sm" data-aiq="Kurzübersicht M-Funktionen">M-Funktionen</button>
        <button class="btn sm" data-aiq="VERSCHIEBUNG Unterprogramm">Verschiebung</button>
        <button class="btn sm" data-aiq="Werkzeugwechselpunkte">Werkzeugwechselpunkte</button>
      </div>
    `;
  }

  function renderAnswer(query, kb, hits){
    const wrap = document.getElementById('aiAns');
    if(!wrap) return;

    if(kb){
      wrap.innerHTML = `
        <div class="muted">Antwort:</div>
        <div style="margin:.25rem 0"><b>${CT.escape(kb.title||query)}</b></div>
        <div>${kb.html || CT.escape(kb.text||'')}</div>
        ${kb.see? `<div class="i-row"><small class="muted">Siehe auch: ${kb.see.map(s=>`<code>${CT.escape(s)}</code>`).join(' ')}</small></div>`:''}
      `;
      return;
    }

    if(!hits.length){
      wrap.innerHTML = `<div class="muted">Nichts gefunden. Versuche andere Begriffe oder öffne Materialien oben.</div>`;
      return;
    }

    const parts = hits.slice(0,4).map(h=>{
      const doc = h.doc;
      const items = h.snippets.map(s=>`<div class="card" style="margin:.35rem 0">${highlight(CT.escape(s), query)} …</div>`).join('');
      return `
        <div style="margin:.6rem 0">
          <div><b>${CT.escape(doc.title)}</b> <span class="muted">(${(doc.type||'').toUpperCase()})</span></div>
          <div class="muted">${CT.escape(doc.summary||'')}</div>
          ${items}
          <div class="row"><a class="btn sm" href="${doc.path}" target="_blank" rel="noopener">Öffnen</a></div>
        </div>`;
    }).join('');

    wrap.innerHTML = `
      <div class="muted">Treffer zu:</div>
      <div style="margin:.25rem 0"><b>${CT.escape(query)}</b></div>
      ${parts}
    `;
  }

  async function runQA(query){
    await ensureIndex();
    await ensureTexts();
    const kb = kbLookup(query);
    const hits = kb ? [] : searchInTexts(query);
    renderAnswer(query, kb, hits);
  }

  function bindEvents(prefill){
    const inp = document.getElementById('aiq');
    if(!inp) return;
    if(prefill) inp.value = prefill;
    inp.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); runQA(inp.value); }});
    document.querySelectorAll('[data-aiq]').forEach(b=>{
      b.onclick = ()=>{ inp.value = b.getAttribute('data-aiq'); runQA(inp.value); };
    });
    if(prefill) runQA(prefill);
  }

  CT.ai = {
    async open(prefill){
      await ensureIndex();
      CT.openModal({title:'AI-Assistent', html: panelHTML(), cancelText:'Schließen'});
      bindEvents(prefill);
    },
    async ask(q){ this.open(q); }
  };
})();