const $ = id => document.getElementById(id);
const key = 'pw-craft-workshop-v1';
let edits = {};
let current = 0;
let storageOK = true;
try {
  const state = JSON.parse(localStorage.getItem(key) || '{}');
  for (const [cell, n] of Object.entries(state.edits || {})) {
    if (/^[A-P]\d+$/.test(cell) && Number.isFinite(n) && n >= 0) edits[cell] = n;
  }
  if (Number.isInteger(state.current) && recipes[state.current]) current = state.current;
} catch { storageOK = false; }
function save() {
  try { localStorage.setItem(key, JSON.stringify({edits,current})); storageOK = true; }
  catch { storageOK = false; }
  status();
}
function status(){
  $('save').textContent = storageOK ? 'Сохраняется в этом браузере' : 'Сохранение недоступно в этом браузере';
}
function value(cell) {
  if (formulas[cell]) return Math.max(0, formulas[cell](value));
  return edits[cell] ?? cells[cell] ?? 0;
}
const fmt = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3});
const format = n => Number.isFinite(n) ? fmt.format(n) : 'Проверьте значения';
const esc = str => String(str ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const symbols={
 shield:'M12 2 21 6v6c0 5-5 8-9 10-4-2-9-5-9-10V6z M12 5v13',
 sword:'M4 20 16 8m-8 5 4 4M10 12l8-9h3v3l-9 9M3 18l3 3',
 ring:'M8 7 6 4l3-2h6l3 2-2 3-4 3z M7 9a8 8 0 1 0 10 0',
 book:'M3 4q5-2 9 1 4-3 9-1v15q-5-2-9 1-4-3-9-1z M12 5v15',
 crown:'M3 6l5 5 4-8 4 8 5-5-2 12H5z M6 21h12',
 gem:'M2 9l5-6h10l5 6-10 13z M2 9h20M8 9l4 13 4-13-4-6z'
};
function icon(name){return '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+symbols[name]+'"/></svg>';}
const resourceRows = Array.from({length:29},(_,i)=>i+23);
const normalize = s => String(s||'').trim().toLowerCase().replaceAll('ё','е');
function nameplate(name, row){
  const r = row ?? resourceRows.find(r => normalize(cells['A'+r])===normalize(name));
  const img = icons[r] ? '<img width="30" height="30" alt="" src="'+icons[r]+'">' : icon('gem');
  return '<span class="material"><span class="item-icon">'+img+'</span>'+esc(name)+'</span>';
}
function output(cell){return '<span data-output="'+cell+'">'+format(value(cell))+'</span>';}
function field(cell,label){
  if(!cell) return '—';
  if(typeof cell==='object')return '<span data-need="'+cell.need+'" data-have="'+cell.have+'">'+format(Math.max(0,value(cell.need)-value(cell.have)))+'</span>';
  if(formulas[cell])return output(cell);
  const min = cell==='B239'?1:0;
  return '<input class="number" type="number" min="'+min+'" max="9007199254740991" step="any" aria-label="'+esc(label)+'" data-cell="'+cell+'" value="'+value(cell)+'">';
}
function drawTable(table){
 return '<section class="panel"><h3>'+esc(table.title)+'</h3><div class="scroll"><table><thead><tr>'+table.headings.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+table.rows.map(([label,...refs])=>'<tr><th scope="row">'+nameplate(label)+'</th>'+refs.map((ref,i)=>'<td>'+field(ref,label+' — '+table.headings[i+1])+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></section>';
}
function craft(){
 const r=recipes[current];
 const categories=groups.map(([name,ic],i)=>'<button data-group="'+i+'" aria-pressed="'+(i===r.group)+'">'+icon(ic)+'<span>'+name+'</span><small>'+recipes.filter(x=>x.group===i).length+'</small></button>').join('');
 const options=recipes.map((item,i)=>item.group===r.group?'<option value="'+i+'" '+(i===current?'selected':'')+'>'+esc(item.title+' · '+item.route)+'</option>':'').join('');
 const totals=r.totals.map(([label,cell,unit],i)=>'<div class="sum '+(i===0?'primary':'')+'"><span>'+esc(label)+'</span><strong>'+output(cell)+' <small>'+esc(unit||'юаней')+'</small></strong></div>').join('');
 $('workspace').innerHTML='<div class="layout"><aside><h2>Каталог рецептов</h2><div class="categories">'+categories+'</div><a class="price-link" href="#prices">'+icon('gem')+'Цены ресурсов ↗</a></aside><div class="detail"><label class="picker">Выберите рецепт<select id="recipe">'+options+'</select></label><div class="recipe-head"><div><p>'+esc(r.route)+'</p><h2>'+esc(r.title)+'</h2></div>'+icon(groups[r.group][1])+'</div>'+ (totals?'<div class="totals">'+totals+'</div>':'')+r.tables.map(drawTable).join('')+(r.note?'<p class="note">'+esc(r.note)+'</p>':'')+'</div></div>';
 $('recipe').onchange=e=>{current=Number(e.target.value);save();craft();$('recipe').focus();};
}
function prices(){
 $('workspace').innerHTML='<section class="panel market"><div class="market-head"><h2>Справочник ресурсов</h2><input id="search" type="search" aria-label="Поиск ресурса" placeholder="Найти ресурс…"></div><div class="scroll"><table><thead><tr><th>Ресурс</th><th>Цена за шт., юани</th><th>Где добывается</th><th>Крафт</th></tr></thead><tbody id="price-list"></tbody></table></div></section>';
 function filter(){
   const query=normalize($('search').value);
   $('price-list').innerHTML=resourceRows.filter(r=>normalize(cells['A'+r]).includes(query)).map(r=>{const name=cells['A'+r],ref='C'+r;
     return '<tr><th>'+nameplate(name,r)+'</th><td>'+((ref in cells || ref in formulas)?field(ref,name+' — цена'):'—')+'</td><td>'+esc(cells['E'+r]||'—')+'</td><td>'+esc(cells['D'+r]||'—')+'</td></tr>';
   }).join('') || '<tr><td colspan="4">Такого ресурса нет. Попробуйте другое название.</td></tr>';
 }
 $('search').oninput=filter;filter();
}
function render(){
 const market=location.hash==='#prices';
 $('title').textContent=market?'Цены ресурсов':'Калькулятор крафта';
 $('intro').textContent=market?'Укажите цены вашего сервера. Все рецепты пересчитаются автоматически.':'Выберите рецепт, укажите запасы и узнайте стоимость крафта в Perfect World.';
 $('craft-tab').setAttribute('aria-pressed',!market);$('prices-tab').setAttribute('aria-pressed',market);
 if(market)prices();else craft();status();
}
$('craft-tab').onclick=()=>location.hash='craft';
$('prices-tab').onclick=()=>location.hash='prices';
$('workspace').addEventListener('click',e=>{
 const b=e.target.closest('[data-group]');if(!b)return;
 current=recipes.findIndex(r=>r.group===Number(b.dataset.group));save();craft();
 document.querySelector('[data-group="'+recipes[current].group+'"]').focus();
});
$('workspace').addEventListener('input',e=>{
 const input=e.target;if(!input.dataset.cell)return;
 if(!input.value || !input.validity.valid) return;
 const n=input.valueAsNumber;if(!Number.isFinite(n))return;
 edits[input.dataset.cell]=n;save();
 document.querySelectorAll('[data-output]').forEach(el=>el.textContent=format(value(el.dataset.output)));
 document.querySelectorAll('[data-need]').forEach(el=>el.textContent=format(Math.max(0,value(el.dataset.need)-value(el.dataset.have))));
 document.querySelectorAll('input[data-cell="'+input.dataset.cell+'"]').forEach(el=>{if(el!==input)el.value=n;});
});
$('workspace').addEventListener('focusout',e=>{
 const input=e.target;if(input.dataset.cell && (!input.value || !input.validity.valid)) input.value=value(input.dataset.cell);
});
window.addEventListener('hashchange',render);
render();
