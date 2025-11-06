// Общие мелочи: поиск-лупа, hero-усадка и ОБРАБОТЧИК "главной" кнопки для модулей.
// Только модуль docs получает особое действие (Neues Dokument).

(() => {
  // Поиск (раскрытие по тапу на блок)
  const box = document.getElementById('searchBox');
  const q   = document.getElementById('q');
  if (box && q) {
    box.addEventListener('click', ()=>{ box.classList.add('active'); q.focus(); });
    q.addEventListener('blur',  ()=>{ if(!q.value) box.classList.remove('active'); });
  }

  // Лёгкая «усадка» hero по скроллу (визуально)
  let last = 0;
  addEventListener('scroll', ()=>{
    const y = scrollY;
    if(Math.abs(y-last)<6) return;
    document.documentElement.style.setProperty('--hero-opa', Math.max(0, 1 - y/220));
    last = y;
  });

  // Главная кнопка действия в AppBar: только для документации
  document.addEventListener('DOMContentLoaded', () => {
    const act = document.getElementById('actionMain');
    const mod = (document.body.getAttribute('data-module') || '').toLowerCase();
    if (!act) return;

    act.onclick = () => {
      if (mod === 'docs') {
        // транслируем событие модулю документов
        window.dispatchEvent(new CustomEvent('ui:new-doc'));
      } else {
        // для остальных модулей ничего не навязываем
        // (страницы сами могут повесить свой обработчик на #actionMain)
      }
    };

    // Если на странице есть дубль-кнопка в hero — синхронизируем
    const actHero = document.getElementById('actionHero');
    if (actHero) {
      actHero.onclick = () => act.click();
    }
  });
})();