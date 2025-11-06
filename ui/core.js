/* минимальный «ядро» + хиро-логика */
(function(){
  const CT = window.CT = window.CT || {};

  // simple storage helpers
  CT.storage = {
    get:(k,def)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):def}catch(e){return def}},
    set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))
  };

  // раскрывающийся поиск + мягкий параллакс
  function heroInit(){
    const sb   = document.querySelector('#searchbar');
    const btn  = document.querySelector('#btnSearch');
    const input= document.querySelector('#globalSearch');

    if(btn && sb){
      btn.addEventListener('click', ()=>{
        sb.classList.toggle('collapsed');
        if(!sb.classList.contains('collapsed')) setTimeout(()=>input?.focus(), 30);
      });
      const collapse = ()=> sb.classList.add('collapsed');
      document.addEventListener('click', e=>{
        if(!sb.classList.contains('collapsed')){
          const inside = sb.contains(e.target) || btn.contains(e.target);
          if(!inside) collapse();
        }
      }, {passive:true});
      window.addEventListener('scroll', collapse, {passive:true});
    }

    const heroCard = document.querySelector('.hero-card');
    if(heroCard){
      const onScroll = ()=>{
        const y = Math.min(window.scrollY, 220);
        heroCard.style.transform = `translateY(${(-y*0.06).toFixed(1)}px)`;
      };
      onScroll();
      window.addEventListener('scroll', onScroll, {passive:true});
    }
  }

  document.addEventListener('DOMContentLoaded', heroInit);
  CT.heroInit = heroInit;
})();