// Поиск (раскрытие), кнопки, эффект hero
(() => {
  const box = document.getElementById('searchBox');
  const q   = document.getElementById('q');
  if (box && q) {
    box.addEventListener('click', ()=>{ box.classList.add('active'); q.focus(); });
    q.addEventListener('blur',  ()=>{ if(!q.value) box.classList.remove('active'); });
  }

  // Хук на «Neues Programm» (верх и в hero)
  const hook = () => alert('Neues Programm… (вставь свой обработчик)');
  const b1 = document.getElementById('newProg');
  const b2 = document.getElementById('newProgTop');
  if (b1) b1.onclick = hook;
  if (b2) b2.onclick = hook;

  // Лёгкая «усадка» hero по скроллу (визуально)
  let last = 0;
  addEventListener('scroll', ()=>{
    const y = scrollY;
    if(Math.abs(y-last)<6) return;
    document.documentElement.style.setProperty('--hero-opa', Math.max(0, 1 - y/220));
    last = y;
  });
})();