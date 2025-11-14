/* Workshop module - keep queue handling safe and stable */
const Workshop = (() => {
  const RECIPES = { /* same as PR: health-potion, energy-potion, energy-crystal, arcane-staff, crystal-wand, obsidian-shield, moonlight-elixir, forbidden-scroll, mining-gear */ };

  let craftingQueue = [];
  let queueInterval = null;

  function init() { loadCraftingQueue(); startCraftingTimer(); console.log('✅ Workshop module initialized'); return true; }

  function getRecipe(id) { return RECIPES[id] || null; }
  function getAllRecipes() { return RECIPES; }
  function getRecipesByCategory(cat) { return Object.values(RECIPES).filter(r => r.category === cat); }

  function canCraft(recipeId) { if (typeof Resources === 'undefined' || typeof Resources.hasResources !== 'function') return false; const recipe = getRecipe(recipeId); if (!recipe) return false; return Resources.hasResources(recipe.requirements); }

  function startCrafting(recipeId) {
    const recipe = getRecipe(recipeId); if (!recipe) { console.error('Unknown recipe', recipeId); return false; }
    if (!canCraft(recipeId)) { if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Not enough resources to craft this item!', 'error'); return false; }

    // Consume resources with possible artisan efficiency
    for (const [resourceId, amount] of Object.entries(recipe.requirements)) {
      let actualAmount = amount;
      if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk && Guilds.hasGuildPerk('artisan', 'resource-efficiency') && Math.random() < 0.1) {
        actualAmount = Math.max(1, amount - 1);
        if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(`Resource efficiency! Saved 1 ${resourceId}`, 'info');
      }
      Resources.removeResource(resourceId, actualAmount);
    }

    let craftTime = recipe.craftTime;
    if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk && Guilds.hasGuildPerk('artisan', 'faster-crafting')) craftTime = Math.floor(craftTime * 0.8);

    const craftingItem = { id: `craft-${Date.now()}`, recipeId: recipe.id, recipeName: recipe.name, startTime: Date.now(), endTime: Date.now() + craftTime, craftTime };

    craftingQueue.push(craftingItem);
    saveCraftingQueue();
    if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(`Started crafting ${recipe.name}. Ready in ${Math.floor(craftTime/60000)}m ${Math.floor((craftTime%60000)/1000)}s`, 'info');
    updateWorkshopUI();
    return true;
  }

  function completeCrafting(craftingId) {
    const index = craftingQueue.findIndex(c => c.id === craftingId);
    if (index === -1) return false;
    const item = craftingQueue[index];
    const recipe = getRecipe(item.recipeId);
    if (!recipe) { craftingQueue.splice(index,1); saveCraftingQueue(); return false; }

    // Remove from queue
    craftingQueue.splice(index,1);
    saveCraftingQueue();

    // Grant crafted item
    if (typeof Player !== 'undefined' && typeof Player.getData === 'function') {
      const playerData = Player.getData();
      const crafted = playerData.craftedItems || {};
      crafted[recipe.id] = (crafted[recipe.id] || 0) + 1;
      const update = { craftedItems: crafted };
      // handle contraband boosted value
      if (recipe.category === 'contraband' && recipe.sellValue) {
        const contrabandValues = playerData.contrabandValues || {};
        let actualValue = recipe.sellValue;
        if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk && Guilds.hasGuildPerk('smuggler', 'contraband-boost')) actualValue = Math.floor(recipe.sellValue * 1.25);
        contrabandValues[recipe.id] = actualValue;
        update.contrabandValues = contrabandValues;
      }
      if (typeof Player.updateData === 'function') Player.updateData(update);
      else if (typeof Player.setData === 'function') Player.setData(Object.assign({}, playerData, update));
      if (typeof Player.addXP === 'function') Player.addXP(recipe.rarity === 'common' ? 10 : recipe.rarity === 'uncommon' ? 25 : recipe.rarity === 'rare' ? 50 : 100);
    }

    if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(`${recipe.name} crafted successfully!`, 'success');
    updateWorkshopUI();
    return true;
  }

  function fastTrackCrafting(craftingId) {
    const item = craftingQueue.find(c => c.id === craftingId); if (!item) return false; const recipe = getRecipe(item.recipeId); if (!recipe) return false;
    const remaining = Math.max(0, item.endTime - Date.now()); const cost = Math.ceil(remaining / 60000);
    if (typeof Player === 'undefined' || typeof Player.getData !== 'function') return false; const playerData = Player.getData(); if ((playerData.gold || 0) < cost) { if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Not enough gold to fast-track crafting!', 'error'); return false; }
    if (typeof Player.removeGold === 'function') Player.removeGold(cost);
    item.endTime = Date.now(); completeCrafting(craftingId); if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(`Fast-tracked ${recipe.name} for ${cost} gold!`, 'success'); return true;
  }

  function startCraftingTimer() { if (queueInterval) clearInterval(queueInterval); queueInterval = setInterval(() => { const now = Date.now(); const toComplete = craftingQueue.filter(c => c.endTime <= now); // copy list
    toComplete.forEach(c => { try { completeCrafting(c.id); } catch (err) { console.error('Error completing craft', err); } }); if (craftingQueue.length > 0) updateWorkshopUI(); }, 1000); }

  function saveCraftingQueue() { try { localStorage.setItem('highWizardry_craftingQueue', JSON.stringify(craftingQueue)); } catch (e) { console.error('Failed to save crafting queue', e); } }
  function loadCraftingQueue() { try { const saved = localStorage.getItem('highWizardry_craftingQueue'); if (saved) { craftingQueue = JSON.parse(saved); const now = Date.now(); const expired = craftingQueue.filter(c => c.endTime <= now); expired.forEach(c => { const recipe = getRecipe(c.recipeId); if (recipe && typeof Player !== 'undefined' && typeof Player.getData === 'function') { const playerData = Player.getData(); const crafted = playerData.craftedItems || {};
      crafted[recipe.id] = (crafted[recipe.id] || 0) + 1;
      const update = { craftedItems: crafted };
      if (recipe.category === 'contraband' && recipe.sellValue) {
        let actualValue = recipe.sellValue;
        if (typeof Guilds !== 'undefined' && Guilds.hasGuildPerk && Guilds.hasGuildPerk('smuggler', 'contraband-boost')) actualValue = Math.floor(recipe.sellValue * 1.25);
        const contrabandValues = playerData.contrabandValues || {};
        contrabandValues[recipe.id] = actualValue;
        update.contrabandValues = contrabandValues;
      }
      if (typeof Player.updateData === 'function') Player.updateData(update);
      else if (typeof Player.setData === 'function') Player.setData(Object.assign({}, playerData, update));
      if (typeof Player.addXP === 'function') Player.addXP(recipe.rarity === 'common' ? 10 : recipe.rarity === 'uncommon' ? 25 : recipe.rarity === 'rare' ? 50 : 100);
      if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(`${recipe.name} crafted while you were away!`, 'success');
    } }); craftingQueue = craftingQueue.filter(c => c.endTime > now); saveCraftingQueue(); } } catch (err) { console.error('Failed to load crafting queue', err); craftingQueue = []; }
  }

  function getCraftingQueue() { return [...craftingQueue]; }
  function updateWorkshopUI() { updateCraftingQueue(); updateRecipeList(); }

  function updateCraftingQueue() { const container = document.getElementById('crafting-queue'); if (!container) return; if (craftingQueue.length === 0) { container.innerHTML = '<p class="text-muted small">No items being crafted</p>'; return; } const now = Date.now(); container.innerHTML = craftingQueue.map(item => { const recipe = getRecipe(item.recipeId); if (!recipe) return ''; const remaining = Math.max(0, item.endTime - now); const minutes = Math.floor(remaining / 60000); const seconds = Math.floor((remaining % 60000) / 1000); const progress = ((item.craftTime - remaining) / item.craftTime) * 100; return `<div class="crafting-item mb-2 p-2 border rounded"><div class="d-flex justify-content-between align-items-center mb-1"><strong><i class="fas ${recipe.icon}"></i> ${recipe.name}</strong><small class="text-info">${minutes}:${String(seconds).padStart(2,'0')}</small></div><div class="progress mb-1" style="height:6px;"><div class="progress-bar bg-info" style="width:${progress}%"></div></div><button class="btn btn-warning btn-sm" onclick="Workshop.fastTrackCrafting('${item.id}')"><i class="fas fa-forward"></i> Fast Track (${Math.ceil(remaining/60000)} gold)</button></div>`; }).join(''); }

  function updateRecipeList() { const container = document.getElementById('recipe-list'); if (!container) return; const categories = { 'battle-items':'Battle Items','weapons':'Weapons','gear':'Gear','contraband':'Contraband' }; let html = ''; for (const [catId, catName] of Object.entries(categories)) { const recipes = getRecipesByCategory(catId); if (recipes.length===0) continue; html += `<h5 class="mt-3 mb-2">${catName}</h5>`; html += recipes.map(recipe => { const canCraftNow = canCraft(recipe.id); const requirementsList = Object.entries(recipe.requirements).map(([rid, amt])=>{ const r = Resources.RESOURCE_TYPES[rid]; const playerRes = Resources.getPlayerResources(); const has = playerRes[rid]||0; return `<small class="${has>=amt?'text-success':'text-danger'}">${r.name}: ${has}/${amt}</small>`;}).join(', '); const craftTimeMin = Math.floor(recipe.craftTime/60000); const craftTimeSec = Math.floor((recipe.craftTime%60000)/1000); return `<div class="recipe-card mb-2 p-2 border rounded ${canCraftNow?'':'opacity-75'}"><div class="d-flex justify-content-between align-items-start"><div><strong><i class="fas ${recipe.icon}"></i> ${recipe.name}</strong><p class="text-muted small mb-1">${recipe.description}</p><div class="small">${requirementsList}</div><small class="text-info">Time: ${craftTimeMin}m ${craftTimeSec}s</small></div><button class="btn btn-primary btn-sm" onclick="Workshop.startCrafting('${recipe.id}')}" ${canCraftNow?'':'disabled'}><i class="fas fa-hammer"></i> Craft</button></div></div>`; }).join(''); } container.innerHTML = html; }

  return { init, getAllRecipes:()=>RECIPES, getRecipe, getRecipesByCategory, canCraft, startCrafting, fastTrackCrafting, getCraftingQueue, updateWorkshopUI, RECIPES };
})();

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', ()=>{ Workshop.init(); });
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') module.exports = Workshop;