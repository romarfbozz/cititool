===== FILE: /ui/dock.js =====
(function(){
  const root=document.getElementById('dock'); if(!root) return;
  root.innerHTML = `
    <div class="wrap">
      <a href="./index.html" data-k="dash"><svg><use href="./ui/icons.svg#home"/></svg><small>Dash</small></a>
      <a href="./setup.html" data-k="setup"><svg><use href="./ui/icons.svg#setup"/></svg><small>Setup</small></a>
      <a href="./tools.html" data-k="tools"><svg><use href="./ui/icons.svg#tools"/></svg><small>Tools</small></a>
      <a href="./setup.html" data-k="programme"><svg><use href="./ui/icons.svg#program"/></svg><small>Programme</small></a>
      <a href="./docs.html" data-k="docs"><svg><use href="./ui/icons.svg#docs"/></svg><small>Docs</small></a>
    </div>`;
  const active = document.body.getAttribute('data-active')||'dash';
  Array.from(root.querySelectorAll('a')).forEach(a=>{ if(a.dataset.k===active) a.classList.add('active'); });
})();
===== END FILE =====
