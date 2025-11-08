// мини-ядро событий (общие для модулей)
window.CT = window.CT || {};
(function(){
  const bus = {};
  CT.on = (ev, fn)=> (bus[ev] ||= []).push(fn);
  CT.emit = (ev, payload)=> (bus[ev]||[]).forEach(f=>f(payload));
})();

// общие хуки Neo
CT.neo = (function(){
  function wireSearch(box, input){
    box.addEventListener('click', ()=>{ box.classList.add('active'); input.focus(); });
    input.addEventListener('blur', ()=>{ if(!input.value) box.classList.remove('active'); });
    input.addEventListener('input', ()=> CT.emit('search', input.value.trim()));
  }

  function mirrorClicks(a, b, evName){
    const h = ()=> CT.emit(evName);
    a && (a.onclick = h);
    b && (b.onclick = h);
  }

  // визуальная микродинамика героя
  function shrinkOnScroll(){
    let last = 0;
    addEventListener('scroll', ()=>{
      const y = scrollY;
      if(Math.abs(y-last)<6) return;
      document.documentElement.style.setProperty('--hero-opa', Math.max(0, 1 - y/220));
      last = y;
    });
  }

  function setActiveDock(id){
    document.querySelectorAll('.dock a').forEach(a=>{
      const active = a.dataset.id === id;
      a.classList.toggle('active', active);
    });
  }

  return { wireSearch, mirrorClicks, shrinkOnScroll, setActiveDock };
})();
