const recipesEl = document.getElementById('recipes');
const searchEl = document.getElementById('search');
const categoryEl = document.getElementById('category');
const sortEl = document.getElementById('sort');
const modal = document.getElementById('recipe-modal');
const modalTitle = document.getElementById('modal-title');
const modalIngredients = document.getElementById('modal-ingredients');
const modalSteps = document.getElementById('modal-steps');
const favBtn = document.getElementById('fav-btn');
const closeModal = document.getElementById('close-modal');
let recipes = [];
let currentRecipe = null;

async function loadRecipes(){
  try{
    const res = await fetch('data/recipes.json');
    recipes = await res.json();
    render();
  }catch(e){
    recipesEl.innerHTML = '<p>Could not load recipes.</p>';
    console.error(e);
  }
}

function render(){
  const q = searchEl.value.trim().toLowerCase();
  const cat = categoryEl.value;
  let out = recipes.filter(r => {
    if(cat && r.category !== cat) return false;
    if(!q) return true;
    return r.title.toLowerCase().includes(q) || r.ingredients.join(' ').toLowerCase().includes(q);
  });

  const sort = sortEl.value;
  if(sort === 'alpha') out.sort((a,b)=>a.title.localeCompare(b.title));
  else if(sort === 'newest') out.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  // popular uses default order

  recipesEl.innerHTML = out.map(r => cardHtml(r)).join('');
  document.querySelectorAll('.card .open').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = btn.dataset.id;
      openModal(recipes.find(x=>x.id===id));
    });
  });
  document.querySelectorAll('.card .fav').forEach(btn=>{
    btn.addEventListener('click', e=>{
      const id = btn.dataset.id;
      toggleFavorite(id);
      render(); // update state
    });
  });
}

function cardHtml(r){
  const favorites = JSON.parse(localStorage.getItem('zambia-favs')||'[]');
  const isFav = favorites.includes(r.id);
  return `
    <article class="card" aria-labelledby="t-${r.id}">
      <h3 id="t-${r.id}">${escapeHtml(r.title)}</h3>
      <p class="meta"><span>${r.category}</span><span>${r.prep_time || ''}</span></p>
      <p>${escapeHtml(r.description || '')}</p>
      <div class="meta">
        <button class="button open" data-id="${r.id}">View</button>
        <button class="fav" data-id="${r.id}">${isFav? '★' : '☆'} Favorite</button>
      </div>
    </article>
  `;
}

function openModal(r){
  if(!r) return;
  currentRecipe = r;
  modalTitle.textContent = r.title;
  document.querySelector('.meta').textContent = `By ${r.author || 'Community'} · ${r.category}`;
  modalIngredients.innerHTML = r.ingredients.map(i=>`<li>${escapeHtml(i)}</li>`).join('');
  modalSteps.innerHTML = r.steps.map(s=>`<li>${escapeHtml(s)}</li>`).join('');
  const favs = JSON.parse(localStorage.getItem('zambia-favs')||'[]');
  favBtn.textContent = favs.includes(r.id) ? 'Remove from favorites' : 'Add to favorites';
  modal.showModal();
}

favBtn.addEventListener('click', () => {
  if(!currentRecipe) return;
  toggleFavorite(currentRecipe.id);
  openModal(currentRecipe);
});

closeModal.addEventListener('click', () => modal.close());

function toggleFavorite(id){
  const key = 'zambia-favs';
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  const idx = arr.indexOf(id);
  if(idx === -1) arr.push(id);
  else arr.splice(idx,1);
  localStorage.setItem(key, JSON.stringify(arr));
}

function escapeHtml(str=''){ return str.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

searchEl.addEventListener('input', render);
categoryEl.addEventListener('change', render);
sortEl.addEventListener('change', render);

// submission form (client-side only)
document.getElementById('submit-recipe').addEventListener('submit', e=>{
  e.preventDefault();
  const fd = new FormData(e.target);
  const newRecipe = {
    id: 'r' + Date.now(),
    title: fd.get('title'),
    author: fd.get('author') || 'Anonymous',
    category: fd.get('category'),
    ingredients: fd.get('ingredients').split(',').map(s=>s.trim()).filter(Boolean),
    steps: fd.get('steps').split('\n').map(s=>s.trim()).filter(Boolean),
    created_at: new Date().toISOString(),
    description: fd.get('title') + ' — user-submitted'
  };
  // store in localStorage as pending submissions
  const pending = JSON.parse(localStorage.getItem('zambia-submissions')||'[]');
  pending.push(newRecipe);
  localStorage.setItem('zambia-submissions', JSON.stringify(pending));
  alert('Thanks! Your recipe is saved locally. To publish it for everyone, add a simple backend or open a PR with the recipe JSON.');
  e.target.reset();
});

// hydrate recipes with local submissions so newly-submitted recipes appear immediately
function mergeSubmissions(){
  const pending = JSON.parse(localStorage.getItem('zambia-submissions')||'[]');
  if(pending.length) recipes = [...pending, ...recipes];
}

loadRecipes().then(()=>{ mergeSubmissions(); render(); });