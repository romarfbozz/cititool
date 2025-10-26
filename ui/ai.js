/* Mini AI-Assistent (клиентский, без сервера)
   — ищет по локальному индексу ct_lern_index (title/tags/path)
   — формирует подсказки/ответы и быстрые действия
*/
(function(){
  if(!window.CT){ console.warn('CT not found'); return; }

  function searchIndex(q){
    const idx = CT.storage.read('ct_lern_index', []);
    const qq = (q||'').toLowerCase();
    return idx.filter(it => (it.title+' '+(it.tags||[]).join(' ')+' '+(it.path||'')).toLowerCase().includes(qq)).slice(0,8);
  }

  function templateAnswer(q, ctx){
    let out = `<div><div class="muted" style="margin-bottom:.5rem">Frage:</div><b>${CT.escape(q)}</b></div>`;
    const hits = searchIndex(q).concat(ctx?.path ? searchIndex(ctx.path.split('/').pop()) : []);
    if(hits.length){
      out += `<div class="i-row" style="margin-top:.6rem">Relevante Inhalte:</div><ul style="padding-left:18px;margin:.4rem 0">${hits.map(h=>`<li>${CT.escape(h.title)} <span class="muted">(${CT.escape((h.type||'').toUpperCase())})</span></li>`).join('')}</ul>`;
    }else{
      out += `<div class="muted" style="margin-top:.6rem">Keine direkten Treffer im lokalen Lernindex. Versuche einen anderen Begriff (z.B. „G54“, „M-Funktion“, „Verschiebung“).</div>`;
    }

    // Vorschläge
    out += `<div class="i-row" style="margin-top:.6rem">Vorschläge:</div>
      <div class="row">
        <button class="btn sm" data-aiq="Erkläre M-Funktionen kurz">M-Funktionen</button>
        <button class="btn sm" data-aiq="Was ist VERSCHIEBUNG Unterprogramm?">VERSCHIEBUNG</button>
        <button class="btn sm" data-aiq="Wie wähle ich Werkzeugwechselpunkte?">Werkzeugwechselpunkte</button>
      </div>`;
    return out;
  }

  function openPanel(html){
    CT.openModal({
      title:'AI-Assistent',
      html: `<div class="ai-panel">${html}</div>`,
      cancelText:'Schließen'
    });
    // кнопки быстрых вопросов
    Array.from(document.querySelectorAll('[data-aiq]')).forEach(b=>{
      b.onclick = ()=> CT.ai.ask(b.getAttribute('data-aiq'));
    });
  }

  CT.ai = {
    ask(q, ctx={}){
      const html = templateAnswer(q, ctx);
      openPanel(html);
    }
  };
})();
