const form = document.getElementById('searchForm');
const ingredientInput = document.getElementById('ingredientInput');
const resultsGrid = document.getElementById('recipeGrid');
const statusMessage = document.getElementById('statusMessage');

const API_BASE = 'https://www.themealdb.com/api/json/v1/1';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const ingredient = ingredientInput.value.trim();

  if (!ingredient) {
    statusMessage.textContent = 'Please enter at least one ingredient.';
    return;
  }

  statusMessage.textContent = `Searching recipes with ${ingredient}...`;
  resultsGrid.innerHTML = '<p>Loading recipes...</p>';

  try {
    const response = await fetch(`${API_BASE}/filter.php?i=${encodeURIComponent(ingredient)}`);
    const data = await response.json();

    if (!data.meals) {
      statusMessage.textContent = 'No recipes found. Try a different ingredient.';
      resultsGrid.innerHTML = '';
      return;
    }

    const recipeCards = await Promise.all(
      data.meals.slice(0, 8).map(async (meal) => {
        const detailsResponse = await fetch(`${API_BASE}/lookup.php?i=${meal.idMeal}`);
        const detailsData = await detailsResponse.json();
        const recipe = detailsData.meals?.[0];

        if (!recipe) return null;

        return createRecipeCard(recipe);
      })
    );

    resultsGrid.innerHTML = '';
    recipeCards.filter(Boolean).forEach((card) => resultsGrid.appendChild(card));
    statusMessage.textContent = `Showing ${recipeCards.filter(Boolean).length} global recipes based on ${ingredient}.`;
  } catch (error) {
    console.error(error);
    statusMessage.textContent = 'The recipe service is unavailable right now. Please try again shortly.';
    resultsGrid.innerHTML = '';
  }
});

function createRecipeCard(recipe) {
  const card = document.createElement('article');
  card.className = 'recipe-card';

  const estimatedTime = estimateCookingTime(recipe.strInstructions || '');
  const youtubeEmbed = buildYouTubeEmbed(recipe.strYoutube || '');

  card.innerHTML = `
    <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
    <div class="recipe-body">
      <h3>${recipe.strMeal}</h3>
      <div class="badge-row">
        <span class="badge">${recipe.strArea || 'World'}</span>
        <span class="badge">${estimatedTime}</span>
        <span class="badge">${recipe.strCategory || 'Recipe'}</span>
      </div>
      <p>${truncate(recipe.strInstructions || 'A delicious recipe from around the world.', 140)}</p>
      <a href="#" class="cta-btn" data-open="${recipe.idMeal}">View recipe details</a>
      <div class="detail-panel" id="detail-${recipe.idMeal}" hidden>
        <h4>Ingredients</h4>
        <ul>${buildIngredientList(recipe)}</ul>
        <h4>How to cook</h4>
        <p>${recipe.strInstructions || 'Visit the video for the full walkthrough.'}</p>
        ${youtubeEmbed ? `<iframe class="video-frame" src="${youtubeEmbed}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` : ''}
      </div>
    </div>
  `;

  const button = card.querySelector('.cta-btn');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const detailPanel = card.querySelector('.detail-panel');
    detailPanel.hidden = !detailPanel.hidden;
    button.textContent = detailPanel.hidden ? 'View recipe details' : 'Hide recipe details';
  });

  return card;
}

function buildIngredientList(recipe) {
  const entries = [];
  for (let index = 1; index <= 20; index += 1) {
    const ingredient = recipe[`strIngredient${index}`];
    const measure = recipe[`strMeasure${index}`];

    if (!ingredient || ingredient.trim() === '') break;
    entries.push(`<li>${ingredient}${measure ? ` — ${measure}` : ''}</li>`);
  }
  return entries.join('');
}

function estimateCookingTime(instructions) {
  const wordCount = instructions.split(/\s+/).filter(Boolean).length;
  if (wordCount < 80) return 'Quick recipe · 15 min';
  if (wordCount < 140) return 'Balanced recipe · 25 min';
  return 'Comfort recipe · 35 min';
}

function buildYouTubeEmbed(url) {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (!match) return '';
  return `https://www.youtube.com/embed/${match[1]}`;
}

function truncate(text, limit) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}
