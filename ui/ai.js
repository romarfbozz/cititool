/* Mini AI (очень лёгкий): ищет по ai/index.json (title/tags/summary/path) и даёт ответ.
   Всё текстом, без тяжёлых встраиваний. */
(function(){
  if(!window.CT){ console.warn('CT missing'); return; }

  async function getIndex(){
    try{
      const res = await fetch('./ai/index.json', {cache:'no-store'});
      return await res.json();
    }catch(e){ return []; }
  }
  function match(item, q){
    const hay = ((item.title||'')+' '+(item.summary||'')+' '+(item.tags||[]).join(' ')+' '+(item.path||'')).toLowerCase();
    return hay.includes(q);
  }
  function answerHTML(q, hits){
    let html = `<div class="muted" style="margin-bottom:.25rem">Frage:</div><b>${CT.escape(q)}</b>`;
    if(hits.length){
      html += `<div class="i-row" style="margin-top:.6rem">Relevante Inhalte:</div>
      <ul style="padding-left:18px;margin:.4rem 0">${hits.slice(0,8).map(h=>
        `<li><b>${CT.escape(h.title)}</b> <span class="muted">(${(h.type||'').toUpperCase()})</span><br><small>${CT.escape(h.summary||'')}</small></li>`
      ).join('')}</ul>`;
    }else{
      html += `<div class="muted" style="margin-top:.6rem">Keine direkten Treffer. Versuche: „G54“, „M-Funktion“, „Verschiebung“, „Werkzeugwechselpunkte“.</div>`;
    }
    html += `<div class="i-row" style="margin-top:.6rem">Schnellfragen:</div>
    <div class="row">
      <button class="btn sm" data-aiq="Erkläre VERSCHIEBUNG Unterprogramm">VERSCHIEBUNG</button>
      <button class="btn sm" data-aiq="Kurzübersicht M-Funktionen">M-Funktionen</button>
      <button class="btn sm" data-aiq="Wie wähle ich Werkzeugwechselpunkte?">Werkzeugwechselpunkte</button>
    </div>`;
    return html;
  }
  function openPanel(html){
    CT.openModal({title:'AI-Assistent', html, cancelText:'Schließen'});
    document.querySelectorAll('[data-aiq]').forEach(b=>{
      b.onclick = ()=> CT.ai.ask(b.getAttribute('data-aiq'));
    });
  }

  CT.ai = {
    async ask(q){
      const idx = await getIndex();
      const qq = (q||'').toLowerCase().trim();
      const hits = qq ? idx.filter(it=>match(it, qq)) : idx.slice(0,8);
      openPanel(answerHTML(q, hits));
    }
  };
})();