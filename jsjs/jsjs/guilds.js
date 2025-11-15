/**
 * Guilds Module
 * Handles guild membership, perks, and benefits
 */

const Guilds = (() => {
  const GUILD_TYPES = {
    'artisan': {
      id: 'artisan',
      name: 'Artisan Guild',
      description: 'Masters of crafting and creation',
      icon: 'fa-hammer',
      joinCost: 1000,
      perks: {
        'faster-crafting': { name: 'Faster Crafting', description: 'Reduces crafting time for rare items by 20%', level: 1 },
        'better-quality':  { name: 'Better Quality', description: 'Increased chance of crafting higher quality items', level: 3 },
        'resource-efficiency': { name: 'Resource Efficiency', description: '10% chance to save resources when crafting', level: 5 }
      }
    },
    'smuggler': {
      id: 'smuggler',
      name: 'Smugglers Guild',
      description: 'Traders of contraband and forbidden goods',
      icon: 'fa-mask',
      joinCost: 1500,
      perks: {
        'contraband-boost': { name: 'Contraband Boost', description: 'Increases contraband sell value by 25%', level: 1 },
        'vendor-discount': { name: 'Vendor Discount', description: 'Reduces Lunar Powder vendor price by 15%', level: 2 },
        'stealth-bonus': { name: 'Stealth Bonus', description: 'Reduces chance of getting caught with contraband', level: 4 }
      }
    },
    'explorer': {
      id: 'explorer',
      name: "Explorer's Guild",
      description: 'Adventurers who chart unknown territories',
      icon: 'fa-compass',
      joinCost: 1200,
      perks: {
        'bonus-resources': { name: 'Bonus Resources', description: 'Unlock additional resources in mines and forests', level: 1 },
        'faster-gathering': { name: 'Faster Gathering', description: 'Reduce energy cost for gathering by 25%', level: 2 },
        'rare-finds': { name: 'Rare Finds', description: 'Increased chance of finding rare resources', level: 4 }
      }
    }
  };

  function init() {
    if (typeof Player !== 'undefined') {
      const playerData = Player.getData();
      if (!playerData.guilds) {
        Player.updateData({ guilds: { memberships: [], reputation: {} } });
      }
    }
    console.log('✅ Guilds module initialized');
    return true;
  }

  function getGuildInfo(guildId) { return GUILD_TYPES[guildId] || null; }
  function getAllGuilds() { return GUILD_TYPES; }

  function isMember(guildId) {
    if (typeof Player === 'undefined') return false;
    const playerData = Player.getData();
    const guilds = playerData.guilds || { memberships: [] };
    return guilds.memberships.includes(guildId);
  }

  function joinGuild(guildId) {
    const guild = GUILD_TYPES[guildId];
    if (!guild) { console.error(`Unknown guild: ${guildId}`); return false; }
    if (isMember(guildId)) { if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('You are already a member of this guild!', 'info'); return false; }
    if (typeof Player === 'undefined') return false;
    const playerData = Player.getData();
    if (playerData.gold < guild.joinCost) { if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification('Not enough gold to join this guild!', 'error'); return false; }
    Player.removeGold(guild.joinCost);
    const guilds = playerData.guilds || { memberships: [], reputation: {} };
    guilds.memberships.push(guildId);
    guilds.reputation[guildId] = 0;
    Player.updateData({ guilds });
    if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(`Joined ${guild.name}!`, 'success');
    updateGuildUI();
    return true;
  }

  function leaveGuild(guildId) {
    if (!isMember(guildId)) return false;
    if (typeof Player === 'undefined') return false;
    const playerData = Player.getData();
    const guilds = playerData.guilds || { memberships: [], reputation: {} };
    guilds.memberships = guilds.memberships.filter(g => g !== guildId);
    delete guilds.reputation[guildId];
    Player.updateData({ guilds });
    const guild = GUILD_TYPES[guildId];
    if (typeof UI !== 'undefined' && UI.showNotification) UI.showNotification(`Left ${guild.name}`, 'info');
    updateGuildUI();
    return true;
  }

  function getReputation(guildId) {
    if (typeof Player === 'undefined') return 0;
    const playerData = Player.getData();
    const guilds = playerData.guilds || { memberships: [], reputation: {} };
    return guilds.reputation[guildId] || 0;
  }

  function addReputation(guildId, amount) {
    if (!isMember(guildId)) return false;
    if (typeof Player === 'undefined') return false;
    const playerData = Player.getData();
    const guilds = playerData.guilds || { memberships: [], reputation: {} };
    guilds.reputation[guildId] = (guilds.reputation[guildId] || 0) + amount;
    Player.updateData({ guilds });
    updateGuildUI();
    return true;
  }

  function getGuildLevel(guildId) {
    const reputation = getReputation(guildId);
    return Math.floor(reputation / 100) + 1;
  }

  function hasGuildPerk(guildId, perkId) {
    if (!isMember(guildId)) return false;
    const guild = GUILD_TYPES[guildId];
    if (!guild || !guild.perks[perkId]) return false;
    const perk = guild.perks[perkId];
    const playerLevel = getGuildLevel(guildId);
    return playerLevel >= perk.level;
  }

  function getAvailablePerks(guildId) {
    const guild = GUILD_TYPES[guildId];
    if (!guild) return [];
    const playerLevel = getGuildLevel(guildId);
    return Object.entries(guild.perks).filter(([_, perk]) => playerLevel >= perk.level).map(([id, perk]) => ({ id, ...perk }));
  }

  function updateGuildUI() {
    const container = document.getElementById('guild-list');
    if (!container) return;
    const html = Object.values(GUILD_TYPES).map(guild => {
      const member = isMember(guild.id);
      const reputation = getReputation(guild.id);
      const level = getGuildLevel(guild.id);
      let content = `
        <div class="guild-card mb-3 p-3 border rounded">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h5><i class="fas ${guild.icon}"></i> ${guild.name}</h5>
              <p class="text-muted small mb-1">${guild.description}</p>
            </div>
            ${member ? `<span class="badge bg-success">Member</span>` : `<button class="btn btn-primary btn-sm" onclick="Guilds.joinGuild('${guild.id}')">Join (${guild.joinCost} gold)</button>`}
          </div>
      `;
      if (member) {
        content += `
          <div class="mb-2">
            <small class="text-info">Level ${level} | Reputation: ${reputation}</small>
            <div class="progress" style="height: 6px;">
              <div class="progress-bar bg-info" style="width: ${(reputation % 100)}%"></div>
            </div>
          </div>
          <div class="guild-perks">
            <strong class="small">Perks:</strong>
            ${Object.entries(guild.perks).map(([perkId, perk]) => {
              const unlocked = level >= perk.level;
              return `<div class="perk-item small ${unlocked ? 'text-success' : 'text-muted'}"><i class="fas ${unlocked ? 'fa-check' : 'fa-lock'}"></i> ${perk.name} ${!unlocked ? `(Level ${perk.level})` : ''}</div>`;
            }).join('')}
          </div>
          <button class="btn btn-danger btn-sm mt-2" onclick="Guilds.leaveGuild('${guild.id}')">Leave Guild</button>
        `;
      }
      content += '</div>';
      return content;
    }).join('');
    container.innerHTML = html;
  }

  return {
    init, getGuildInfo, getAllGuilds, isMember, joinGuild, leaveGuild,
    getReputation, addReputation, getGuildLevel, hasGuildPerk, getAvailablePerks, updateGuildUI
  };
})();
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => { Guilds.init(); });
}
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') { module.exports = Guilds; }
