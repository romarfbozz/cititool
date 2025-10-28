/* Mini AI v2 — с полем ввода и быстрым поиском по ai/index.json */
(function(){
  if(!window.CT){ console.warn('CT missing'); return; }

  let IDX = null; // кэш индекса

  async function loadIndex(){
    if (IDX) return IDX;
    try{
      const res = await fetch('./ai/index.json', {cache:'no-store'});
      IDX = await res.json();
    }catch(e){ IDX = []; }
    return IDX;
  }

  function match(item, q){
    const hay = ((item.title||'')+' '+(item.summary||'')+' '+(item.tags||[]).join(' ')+' '+(item.path||'')).toLowerCase();
    return hay.includes(q);
  }

  function typeTag(t){ return `<span class="badge" style="min-width:44px;text-align:center">${(t||'').toUpperCase()}</span>`; }

  function renderResults(q, hits){
    if(!q) return `<div class="muted">Frag mich что угодно: <i>„G54“, „M-Funktion“, „Verschiebung“, „Werkzeugwechselpunkte“…</i></div>`;
    if(!hits.length) return `<div class="muted">Keine direkten Treffer. Попробуй другой термин.</div>`;
    return `<ul style="padding-left:18px;margin:.5rem 0;display:grid;gap:.5rem">
      ${hits.slice(0,10).map(h=>`
        <li>
          <b>${CT.escape(h.title)}</b> ${typeTag(h.type||'')}
          <div class="muted">${CT.escape(h.summary||'')}</div>
          <div class="row" style="margin-top:.3rem">
            <a class="btn sm" href="${h.path}" target="_blank" rel="noopener">Öffnen</a>
          </div>
        </li>`).join('')}
    </ul>`;
  }

  function panelHTML(){
    return `
      <label class="fld">Deine Frage
        <input id="aiq" placeholder="z.B. Was bedeutet G54? oder VERSCHIEBUNG…" autofocus>
      </label>
      <div class="row">
        <button class="btn sm" data-aiq="Kurzübersicht M-Funktionen">M-Funktionen</button>
        <button class="btn sm" data-aiq="Erkläre VERSCHIEBUNG Unterprogramm">VERSCHIEBUNG</button>
        <button class="btn sm" data-aiq="Wie wähle ich Werkzeugwechselpunkte?">Werkzeugwechselpunkte</button>
      </div>
      <div id="aiOut" style="margin-top:.6rem"></div>
    `;
  }

  async function run(q){
    const idx = await loadIndex();
    const qq = (q||'').toLowerCase().trim();
    const hits = qq ? idx.filter(it=>match(it, qq)) : idx.slice(0,8);
    const out = document.getElementById('aiOut');
    if(out) out.innerHTML = renderResults(q, hits);
  }

  function bindEvents(prefill){
    const inp = document.getElementById('aiq');
    if(!inp) return;
    if(prefill){ inp.value = prefill; }
    run(inp.value);
    inp.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); run(inp.value); }});
    document.querySelectorAll('[data-aiq]').forEach(b=>{
      b.onclick = ()=>{ inp.value = b.getAttribute('data-aiq'); run(inp.value); };
    });
  }

  CT.ai = {
    async open(prefill){
      CT.openModal({title:'AI-Assistent', html: panelHTML(), cancelText:'Schließen'});
      await loadIndex();
      bindEvents(prefill);
    },
    // совместимость со старым вызовом
    async ask(q){ this.open(q); }
  };
})();