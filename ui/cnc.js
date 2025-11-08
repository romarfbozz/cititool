/* ========== cnc.js — парсинг NC (минимальный, устойчивый) ========== */
CT.cnc = (()=>{
  function parse(text){
    const src = text.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean);
    const firstComment = (text.match(/\(([^)]+)\)/)||[])[1] || '';
    const oLine = (text.match(/\bO(\d+)\b/i)||[])[1] || '';
    const side = /\bG55\b/i.test(text) ? 'RU' : 'RO';
    const tools = Array.from(text.matchAll(/\bT(\d+)\b/ig)).map((m,i)=>({ tnum:m[1], slot:i+1 }));
    return {
      progNr: oLine||null,
      side,
      firstComment,
      tools,
      meta:{ oLine, commentFirst:firstComment, lines:src.length }
    }
  }
  return { parse };
})();
