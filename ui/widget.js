/* ========== widgets.js — общие виджеты (минимум) ========== */
CT.widgets = (()=>{
  function checklist(items, {onToggle, onAdd, onRemove, onReorder}={}){
    const root = CT.el(`<div class="card"><div class="grid" style="gap:8px"></div><button class="btn" style="margin-top:10px">+ Добавить</button></div>`);
    const list = root.querySelector('.grid');
    function render(){
      CT.html(list,'');
      items.sort((a,b)=> a.sort-b.sort).forEach(it=>{
        const row = CT.el(`<div class="card" style="display:flex;align-items:center;gap:10px;padding:10px"><input type="checkbox"><div style="flex:1"></div><button class="btn ghost">×</button></div>`);
        row.querySelector('input').checked = !!it.done;
        row.querySelector('input').onchange = ()=>{ it.done = !it.done; it.updatedAt=CT.now(); onToggle?.(it) }
        row.children[1].textContent = it.text;
        row.querySelector('button').onclick = ()=>{ onRemove?.(it) }
        row.draggable = true;
        row.ondragstart = e=> e.dataTransfer.setData('text/plain', it.id);
        row.ondragover = e=> e.preventDefault();
        row.ondrop = e=>{ e.preventDefault(); const fromId=e.dataTransfer.getData('text/plain'); if(fromId!==it.id){ onReorder?.(fromId,it.id) } }
        list.append(row);
      });
    }
    root.querySelector('button').onclick = ()=> onAdd?.();
    render();
    return {el:root, rerender:render};
  }

  return { checklist };
})();
