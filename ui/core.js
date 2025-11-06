/* CitiTool Core — hero + раскрывающийся поиск + параллакс */
window.CT = (()=>{

  const qs = sel => document.querySelector(sel);

  function heroInit(){
    // свернуть поиск при скролле
    const sb = qs('#searchbar'); const btn = qs('#btnSearch'); const input = qs('#globalSearch');
    if(!sb||!btn) return;
    btn.addEventListener('click',()=>{
      sb.classList.toggle('collapsed');
      if(!sb.classList.contains('collapsed')) setTimeout(()=>input && input.focus(),10);
    });
    document.addEventListener('click',(e)=>{
      if(!sb.classList.contains('collapsed')){
        const ok = sb.contains(e.target) || btn.contains(e.target);
        if(!ok) sb.classList.add('collapsed');
      }
    });
    window.addEventListener('scroll',()=>{ if(!sb.classList.contains('collapsed')) sb.classList.add('collapsed'); });

    // лёгкий параллакс: тянем геро-карту чуть медленнее
    const heroCard = qs('.hero-card');
    if(heroCard){
      const onScroll = ()=>{
        const y = window.scrollY;
        heroCard.style.transform = `translateY(${Math.min(0, -y*0.08)}px)`;
      };
      onScroll(); window.addEventListener('scroll', onScroll, {passive:true});
    }
  }

  return { heroInit };
})();

document.addEventListener('DOMContentLoaded', CT.heroInit);