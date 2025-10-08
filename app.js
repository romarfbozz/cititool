
// Splash control and active tab marker
(function(){
  const seenKey='ct_splash_seen';
  document.addEventListener('DOMContentLoaded', () => {
    const s=document.getElementById('splash');
    if(!s) return;
    if(localStorage.getItem(seenKey)){ s.remove(); return; }
    setTimeout(()=>{ s.style.opacity='0'; s.style.transition='opacity .35s'; setTimeout(()=>{ s.remove(); localStorage.setItem(seenKey,'1'); }, 360); }, 950);
  });
})();
