// [PHANTOM FLEET MANAGER] - Made by Phantom
// Dashboard Frontend v2.0

const API = '';
let ws = null;
let currentView = 'fleet';
let currentBotId = null;
let bots = [];
let features = [];
let selectedMonitorBot = null;
let currentGuildId = null;
let currentSessionId = null;
let messageOffset = 0;
let activeMonitors = new Map();
let botFeatures = [];
let currentChannelId = null;
let channelList = [];
let messageHistory = [];

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
  initNavigation();
  initKeyboardShortcuts();
  loadBots();
  loadFeatures();
});

// ═══════════════════════════════════════════════════════════
// WEBSOCKET
// ═══════════════════════════════════════════════════════════

function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onopen = () => {
    document.querySelector('.ws-status').classList.add('connected');
    document.querySelector('.ws-status span:last-child').textContent = 'Connected';
  };

  ws.onmessage = (event) => {
    const { type, data } = JSON.parse(event.data);
    handleWebSocket(type, data);
  };

  ws.onclose = () => {
    document.querySelector('.ws-status').classList.remove('connected');
    document.querySelector('.ws-status span:last-child').textContent = 'Reconnecting...';
    setTimeout(initWebSocket, 3000);
  };
}

function handleWebSocket(type, data) {
  switch(type) {
    case 'monitor:msg:create':
      prependMessage(data);
      incrementStat('messages');
      break;
    case 'monitor:msg:update':
      updateMessageCard(data);
      incrementStat('edits');
      break;
    case 'monitor:msg:delete':
      markMessageDeleted(data);
      incrementStat('deletes');
      break;
    case 'monitor:status':
      if (data.status === 'connected') {
        activeMonitors.set(data.guildId, data);
      } else {
        activeMonitors.delete(data.guildId);
      }
      updateMonitorCount();
      break;
  }
}

function updateMonitorCount() {
  document.getElementById('monitor-count').textContent = activeMonitors.size;
  document.getElementById('stat-monitors').textContent = activeMonitors.size;
}

// ═══════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════

function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only in message logger stream view
    if (!document.getElementById('step-stream').classList.contains('hidden')) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateChannel('down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateChannel('up');
      } else if (e.key === 'Enter' && document.activeElement !== document.getElementById('msg-input')) {
        e.preventDefault();
        focusMessageInput();
      }
    }
  });
}

function navigateChannel(direction) {
  const channels = document.querySelectorAll('.channel-item');
  if (channels.length === 0) return;

  let currentIndex = -1;
  channels.forEach((ch, i) => {
    if (ch.classList.contains('selected')) currentIndex = i;
  });

  if (direction === 'down') {
    currentIndex = Math.min(currentIndex + 1, channels.length - 1);
  } else {
    currentIndex = Math.max(currentIndex - 1, 0);
  }

  channels.forEach(ch => ch.classList.remove('selected'));
  if (channels[currentIndex]) {
    channels[currentIndex].classList.add('selected');
    selectChannel(channels[currentIndex].dataset.channelId);
  }
}

function focusMessageInput() {
  const input = document.getElementById('msg-input');
  if (input) input.focus();
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      showView(view);
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      showTab(tabName);
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

function showView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  if (view === 'fleet') loadBots();
  if (view === 'message-logger') resetLogger();
}

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'logs') refreshLogs();
  if (tab === 'features') renderFeatures();
}

// ═══════════════════════════════════════════════════════════
// BOT MANAGEMENT
// ═══════════════════════════════════════════════════════════

async function loadBots() {
  try {
    const res = await fetch(`${API}/api/bots`);
    bots = await res.json();
    renderBots();
    updateStats();
  } catch (e) { console.error('Failed to load bots:', e); }
}

function renderBots() {
  const grid = document.getElementById('bots-grid');
  grid.innerHTML = bots.map(bot => `
    <div class="bot-card" onclick="openBotPanel(${bot.id})">
      <div class="bot-card-header">
        <img src="${bot.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="" class="bot-avatar">
        <div class="bot-card-info">
          <h3>${escapeHtml(bot.name)}</h3>
          <div class="bot-card-meta">ID: ${bot.client_id || 'Unknown'}</div>
        </div>
      </div>
      <span class="status-badge ${bot.status || 'offline'}">${bot.status || 'offline'}</span>
      <div class="bot-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-sm btn-success" onclick="startBotById(${bot.id})">Start</button>
        <button class="btn btn-sm btn-danger" onclick="stopBotById(${bot.id})">Stop</button>
      </div>
    </div>
  `).join('');
  document.getElementById('fleet-count').textContent = bots.length;
}

function updateStats() {
  const online = bots.filter(b => b.status === 'online').length;
  document.getElementById('stat-total-bots').textContent = bots.length;
  document.getElementById('stat-online').textContent = online;
}

async function loadFeatures() {
  try {
    const res = await fetch(`${API}/api/features`);
    features = await res.json();
  } catch (e) { console.error('Failed to load features:', e); }
}

// ═══════════════════════════════════════════════════════════
// BOT PANEL
// ═══════════════════════════════════════════════════════════

function openBotPanel(id) {
  currentBotId = id;
  const bot = bots.find(b => b.id === id);
  if (!bot) return;
  document.getElementById('bot-panel-header').querySelector('h1').textContent = escapeHtml(bot.name);
  document.getElementById('bot-panel-status').textContent = bot.status || 'offline';
  document.getElementById('bot-panel-status').className = `status-badge ${bot.status || 'offline'}`;
  document.getElementById('bot-avatar').src = bot.avatar_url || 'https://cdn.discordapp.com/embed/avatars/0.png';
  document.getElementById('bot-name-detail').textContent = escapeHtml(bot.name);
  document.getElementById('bot-client-id').textContent = `ID: ${bot.client_id || 'Unknown'}`;
  document.getElementById('bot-status-detail').textContent = bot.status || 'offline';
  document.getElementById('bot-uptime').textContent = formatUptime(bot.uptime);
  document.getElementById('bot-pid').textContent = bot.pid || '—';
  showView('bot-panel');
  showTab('overview');
}

async function loadBotFeatures() {
  if (!currentBotId) return;
  try {
    const res = await fetch(`${API}/api/bots/${currentBotId}/features`);
    botFeatures = await res.json();
    renderFeatures();
  } catch (e) { console.error('Failed to load bot features:', e); }
}

function renderFeatures() {
  const grid = document.getElementById('features-grid');
  if (!features.length) {
    grid.innerHTML = '<div class="text-muted">Loading features...</div>';
    return;
  }
  grid.innerHTML = features.map(f => {
    const botFeature = botFeatures.find(bf => bf.feature_name === f.name) || { enabled: 0 };
    return `
      <div class="feature-card">
        <div class="feature-card-header">
          <div class="feature-card-title">${escapeHtml(f.displayName)}</div>
          <label class="toggle-switch">
            <input type="checkbox" ${botFeature.enabled ? 'checked' : ''} onchange="toggleFeature('${f.name}', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="feature-card-desc">${escapeHtml(f.description)}</div>
      </div>
    `;
  }).join('');
}

async function toggleFeature(name, enabled) {
  if (!currentBotId) return;
  try {
    await fetch(`${API}/api/bots/${currentBotId}/features/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, config: {} })
    });
  } catch (e) { console.error('Failed to toggle feature:', e); }
}

// ═══════════════════════════════════════════════════════════
// BOT ACTIONS
// ═══════════════════════════════════════════════════════════

async function startBotById(id) {
  try { await fetch(`${API}/api/bots/${id}/start`, { method: 'POST' }); setTimeout(loadBots, 1000); }
  catch (e) { alert('Failed to start bot'); }
}

async function stopBotById(id) {
  try { await fetch(`${API}/api/bots/${id}/stop`, { method: 'POST' }); setTimeout(loadBots, 1000); }
  catch (e) { alert('Failed to stop bot'); }
}

function startBot() { if (currentBotId) startBotById(currentBotId); }
function stopBot() { if (currentBotId) stopBotById(currentBotId); }

async function restartBot() {
  if (!currentBotId) return;
  try { await fetch(`${API}/api/bots/${currentBotId}/restart`, { method: 'POST' }); setTimeout(loadBots, 1500); }
  catch (e) { alert('Failed to restart bot'); }
}

async function refreshLogs() {
  if (!currentBotId) return;
  try {
    const res = await fetch(`${API}/api/bots/${currentBotId}/logs`);
    const data = await res.json();
    const scroll = document.getElementById('logs-scroll');
    if (data.logs.length === 0) {
      scroll.innerHTML = '<div class="logs-empty">No logs yet. Start the bot first.</div>';
      return;
    }
    scroll.innerHTML = data.logs.map(l => {
      const level = l.includes('[WARN]') ? 'warn' : l.includes('[ERROR]') || l.includes('[EXIT]') ? 'error' : 'info';
      const time = l.match(/\[(.*?)\]/)?.[1] || '';
      const msg = l.replace(/\[.*?\] \[.*?\] /, '');
      return `<div class="log-line"><span class="timestamp">${escapeHtml(time)}</span><span class="level-${level}">${escapeHtml(msg)}</span></div>`;
    }).join('');
    scroll.scrollTop = scroll.scrollHeight;
  } catch (e) { console.error('Failed to load logs:', e); }
}

// ═══════════════════════════════════════════════════════════
// ADD BOT MODAL
// ═══════════════════════════════════════════════════════════

function showAddBotModal() { document.getElementById('add-bot-modal').classList.remove('hidden'); }
function hideAddBotModal() {
  document.getElementById('add-bot-modal').classList.add('hidden');
  document.getElementById('new-bot-name').value = '';
  document.getElementById('new-bot-token').value = '';
}

async function addBot() {
  const name = document.getElementById('new-bot-name').value.trim();
  const token = document.getElementById('new-bot-token').value.trim();
  if (!name || !token) { alert('Name and token are required'); return; }
  try {
    const res = await fetch(`${API}/api/bots`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, token })
    });
    if (!res.ok) { const err = await res.json(); alert(err.error || 'Failed to add bot'); return; }
    hideAddBotModal(); loadBots();
  } catch (e) { alert('Failed to add bot: ' + e.message); }
}

// ═══════════════════════════════════════════════════════════
// MESSAGE LOGGER
// ═══════════════════════════════════════════════════════════

function resetLogger() {
  currentGuildId = null; currentSessionId = null; selectedMonitorBot = null;
  messageOffset = 0; currentChannelId = null; channelList = []; messageHistory = [];
  document.getElementById('step-input').classList.remove('hidden');
  document.getElementById('step-detection').classList.add('hidden');
  document.getElementById('step-stream').classList.add('hidden');
  document.getElementById('guild-id-input').value = '';
  document.getElementById('logger-status').classList.remove('active');
  document.getElementById('logger-status').querySelector('span:last-child').textContent = 'Inactive';
}

async function scanGuild() {
  const guildId = document.getElementById('guild-id-input').value.trim();
  if (!guildId) { alert('Please enter a server ID'); return; }
  currentGuildId = guildId;
  document.getElementById('step-input').classList.add('hidden');
  document.getElementById('step-detection').classList.remove('hidden');
  document.getElementById('detection-loading').classList.remove('hidden');
  document.getElementById('detection-error').classList.add('hidden');
  document.getElementById('detection-results').classList.add('hidden');

  try {
    const res = await fetch(`${API}/api/scan-guild`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId })
    });
    const data = await res.json();
    document.getElementById('detection-loading').classList.add('hidden');

    if (data.found_count === 0) {
      document.getElementById('detection-error').classList.remove('hidden');
      document.getElementById('error-text').textContent = 'No fleet bots found in this server.';
      return;
    }

    document.getElementById('detection-results').classList.remove('hidden');
    document.getElementById('results-count').textContent = `Found ${data.found_count} bot${data.found_count > 1 ? 's' : ''}`;
    document.getElementById('results-guild-name').textContent = data.bots[0].guild_name;

    const list = document.getElementById('bot-selection-list');
    if (data.found_count === 1) {
      selectedMonitorBot = data.bots[0].bot_id;
      list.innerHTML = `
        <div class="selection-item selected" onclick="selectMonitorBot(${data.bots[0].bot_id}, this)">
          <input type="radio" name="monitor-bot" checked onchange="selectMonitorBot(${data.bots[0].bot_id}, this.parentElement)">
          <img src="${data.bots[0].bot_avatar}" class="selection-avatar" alt="">
          <div class="selection-info">
            <div class="selection-name">${escapeHtml(data.bots[0].bot_name)}</div>
            <div class="selection-meta">${escapeHtml(data.bots[0].bot_nickname)} &bull; ${data.bots[0].member_count.toLocaleString()} members</div>
          </div>
          <span class="selection-badge recommended">Auto-Selected</span>
        </div>`;
      document.getElementById('confirm-monitor-btn').disabled = false;
    } else {
      list.innerHTML = data.bots.map((bot, i) => `
        <div class="selection-item" onclick="selectMonitorBot(${bot.bot_id}, this)">
          <input type="radio" name="monitor-bot" onchange="selectMonitorBot(${bot.bot_id}, this.parentElement)">
          <img src="${bot.bot_avatar}" class="selection-avatar" alt="">
          <div class="selection-info">
            <div class="selection-name">${escapeHtml(bot.bot_name)}</div>
            <div class="selection-meta">${escapeHtml(bot.bot_nickname)} &bull; ${bot.member_count.toLocaleString()} members</div>
          </div>
          ${bot.is_admin ? '<span class="selection-badge admin">Admin</span>' : ''}
          ${i === 0 ? '<span class="selection-badge recommended">Recommended</span>' : ''}
        </div>
      `).join('');
      document.getElementById('confirm-monitor-btn').disabled = true;
    }
  } catch (e) {
    document.getElementById('detection-loading').classList.add('hidden');
    document.getElementById('detection-error').classList.remove('hidden');
    document.getElementById('error-text').textContent = 'Error: ' + e.message;
  }
}

function selectMonitorBot(botId, element) {
  selectedMonitorBot = botId;
  document.querySelectorAll('.selection-item').forEach(el => el.classList.remove('selected'));
  element.classList.add('selected');
  element.querySelector('input[type="radio"]').checked = true;
  document.getElementById('confirm-monitor-btn').disabled = false;
}

async function confirmMonitor() {
  if (!selectedMonitorBot || !currentGuildId) return;
  try {
    const res = await fetch(`${API}/api/monitor/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: currentGuildId, botId: selectedMonitorBot })
    });
    if (!res.ok) { const err = await res.json(); alert(err.error || 'Failed'); return; }
    const data = await res.json();
    currentSessionId = data.session_id;
    document.getElementById('step-detection').classList.add('hidden');
    document.getElementById('step-stream').classList.remove('hidden');
    document.getElementById('stream-guild-name').textContent = escapeHtml(data.guild_name);
    document.getElementById('stream-bot-name').textContent = escapeHtml(bots.find(b => b.id === selectedMonitorBot)?.name || 'Bot');
    document.getElementById('logger-status').classList.add('active');
    document.getElementById('logger-status').querySelector('span:last-child').textContent = 'Live';
    await loadChannels();
    await loadMessages();
  } catch (e) { alert('Failed: ' + e.message); }
}

async function stopMonitoring() {
  if (!currentGuildId) return;
  try {
    await fetch(`${API}/api/monitor/stop`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: currentGuildId })
    });
    resetLogger();
  } catch (e) { alert('Failed to stop'); }
}

// ═══════════════════════════════════════════════════════════
// CHANNELS
// ═══════════════════════════════════════════════════════════

async function loadChannels() {
  if (!currentGuildId) return;
  try {
    const res = await fetch(`${API}/api/monitor/${currentGuildId}/channels`);
    const data = await res.json();
    channelList = data.channels || [];
    renderChannelList();

    // Populate channel filter
    const filter = document.getElementById('channel-filter');
    filter.innerHTML = '<option value="">All Channels</option>' + 
      channelList.map(c => `<option value="${c.id}">#${escapeHtml(c.name)}</option>`).join('');
  } catch (e) { console.error('Failed to load channels:', e); }
}

function renderChannelList() {
  const container = document.getElementById('channel-sidebar');
  if (!container) return;
  container.innerHTML = channelList.map(c => `
    <div class="channel-item ${c.id === currentChannelId ? 'selected' : ''}" 
         data-channel-id="${c.id}" 
         onclick="selectChannel('${c.id}')">
      <span class="channel-hash">#</span>
      <span class="channel-name">${escapeHtml(c.name)}</span>
    </div>
  `).join('');
}

function selectChannel(channelId) {
  currentChannelId = channelId;
  document.querySelectorAll('.channel-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.channelId === channelId);
  });
  filterMessages();
}

// ═══════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════

async function loadMessages() {
  if (!currentGuildId) return;
  try {
    const res = await fetch(`${API}/api/monitor/${currentGuildId}/messages?limit=50&offset=${messageOffset}`);
    const data = await res.json();
    const container = document.getElementById('messages-container');
    if (messageOffset === 0) container.innerHTML = '';

    if (data.messages.length === 0 && messageOffset === 0) {
      container.innerHTML = '<div class="messages-empty"><div class="pulse-dot"></div><span>Waiting for messages...</span></div>';
    } else {
      data.messages.reverse().forEach(msg => {
        appendMessage(msg, false);
        messageHistory.push(msg);
      });
    }
    document.getElementById('messages-showing').textContent = `Showing ${data.messages.length} of ${data.total}`;
    updateStreamStats(data);
  } catch (e) { console.error('Failed to load messages:', e); }
}

function appendMessage(msg, prepend = true) {
  const container = document.getElementById('messages-container');
  if (container.querySelector('.messages-empty')) container.innerHTML = '';
  const card = createMessageCard(msg);
  if (prepend) {
    container.insertAdjacentHTML('afterbegin', card);
    if (container.scrollTop < 100) container.scrollTop = 0;
  } else {
    container.insertAdjacentHTML('beforeend', card);
  }
}

function createMessageCard(msg) {
  const isEdit = msg.content_edited;
  const isDelete = msg.is_deleted;
  const isBot = msg.author_discriminator === '0' || msg.author_name?.includes('Bot');
  let hasEmbed = false;
  try { hasEmbed = JSON.parse(msg.embeds_json || '[]').length > 0; } catch(e) {}

  let type = 'msg-normal';
  if (isDelete) type = 'msg-delete';
  else if (isEdit) type = 'msg-edit';
  else if (isBot) type = 'msg-bot';
  else if (hasEmbed) type = 'msg-embed';

  let badge = '';
  if (isEdit) badge = '<span class="msg-badge edit">Edited</span>';
  if (isDelete) badge = '<span class="msg-badge delete">Deleted</span>';
  if (isBot) badge = '<span class="msg-badge bot">Bot</span>';

  const time = msg.timestamp ? new Date(msg.timestamp * 1000).toLocaleTimeString() : '';

  let contentHtml = '';
  if (isDelete) contentHtml = `<span class="deleted-text">${escapeHtml(msg.content || '[No content]')}</span>`;
  else if (isEdit) contentHtml = `<span class="old-text">${escapeHtml(msg.content_edited || '')}</span>${escapeHtml(msg.content || '')}`;
  else contentHtml = escapeHtml(msg.content || '');

  let attachmentsHtml = '';
  try {
    const attachments = JSON.parse(msg.attachments_json || '[]');
    if (attachments.length > 0) {
      attachmentsHtml = '<div class="msg-attachments">' + attachments.map(a => {
        if (a.contentType?.startsWith('image/')) return `<img src="${a.url}" class="msg-attachment" alt="${escapeHtml(a.name)}">`;
        return `<div class="msg-attachment-file">📎 ${escapeHtml(a.name)} (${formatBytes(a.size)})</div>`;
      }).join('') + '</div>';
    }
  } catch(e) {}

  let embedsHtml = '';
  try {
    const embeds = JSON.parse(msg.embeds_json || '[]');
    if (embeds.length > 0) {
      embedsHtml = embeds.map(e => `
        <div class="msg-embed">
          ${e.title ? `<div class="msg-embed-title">${escapeHtml(e.title)}</div>` : ''}
          ${e.description ? `<div class="msg-embed-desc">${escapeHtml(e.description)}</div>` : ''}
          ${e.footer ? `<div class="msg-embed-footer">${escapeHtml(e.footer)}</div>` : ''}
        </div>
      `).join('');
    }
  } catch(e) {}

  return `
    <div class="msg-card ${type}" data-msg-id="${msg.discord_msg_id}" data-channel="${msg.channel_id}">
      <img src="${msg.author_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}" class="msg-avatar" alt="">
      <div class="msg-body">
        <div class="msg-header">
          <span class="msg-author">${escapeHtml(msg.author_name)}</span>
          <span class="msg-channel">#${escapeHtml(msg.channel_name || 'unknown')}</span>
          ${badge}
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-content">${contentHtml}</div>
        ${attachmentsHtml}
        ${embedsHtml}
      </div>
    </div>
  `;
}

function updateMessageCard(data) {
  const card = document.querySelector(`[data-msg-id="${data.discord_msg_id}"]`);
  if (!card) return;
  card.classList.remove('msg-normal'); card.classList.add('msg-edit');
  card.querySelector('.msg-content').innerHTML = `<span class="old-text">${escapeHtml(data.old_content)}</span>${escapeHtml(data.new_content)}`;
  const header = card.querySelector('.msg-header');
  if (!header.querySelector('.msg-badge.edit')) header.insertAdjacentHTML('beforeend', '<span class="msg-badge edit">Edited</span>');
}

function markMessageDeleted(data) {
  const card = document.querySelector(`[data-msg-id="${data.discord_msg_id}"]`);
  if (!card) return;
  card.classList.remove('msg-normal', 'msg-edit'); card.classList.add('msg-delete');
  const content = card.querySelector('.msg-content');
  const currentText = content.textContent;
  content.innerHTML = `<span class="deleted-text">${escapeHtml(currentText)}</span>`;
  const header = card.querySelector('.msg-header');
  if (!header.querySelector('.msg-badge.delete')) header.insertAdjacentHTML('beforeend', '<span class="msg-badge delete">Deleted</span>');
}

function updateStreamStats(data) {
  if (data.message_count !== undefined) document.getElementById('stat-messages').textContent = data.message_count;
  if (data.edit_count !== undefined) document.getElementById('stat-edits').textContent = data.edit_count;
  if (data.delete_count !== undefined) document.getElementById('stat-deletes').textContent = data.delete_count;
}

function incrementStat(type) {
  const el = document.getElementById(`stat-${type}`);
  if (el) el.textContent = parseInt(el.textContent) + 1;
}

function loadMoreMessages() { messageOffset += 50; loadMessages(); }

function filterMessages() {
  const channel = document.getElementById('channel-filter').value;
  const type = document.getElementById('type-filter').value;
  document.querySelectorAll('.msg-card').forEach(card => {
    let show = true;
    if (channel && card.dataset.channel !== channel) show = false;
    if (type && !card.classList.contains(`msg-${type}`)) show = false;
    card.style.display = show ? 'flex' : 'none';
  });
}

// ═══════════════════════════════════════════════════════════
// SEND MESSAGE
// ═══════════════════════════════════════════════════════════

async function sendMessage() {
  const input = document.getElementById('msg-input');
  const content = input.value.trim();
  if (!content || !currentGuildId || !currentChannelId) return;

  try {
    const res = await fetch(`${API}/api/monitor/${currentGuildId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: currentChannelId, content })
    });
    if (res.ok) {
      input.value = '';
    } else {
      const err = await res.json();
      alert('Failed to send: ' + err.error);
    }
  } catch (e) {
    alert('Failed to send message');
  }
}

// ═══════════════════════════════════════════════════════════
// IMPORT / EXPORT UI
// ═══════════════════════════════════════════════════════════

async function exportFleet() {
  try {
    const res = await fetch(`${API}/api/export`, { method: 'POST', body: JSON.stringify({ format: 'zip' }) });
    const data = await res.json();
    if (data.path) {
      // Trigger download
      const a = document.createElement('a');
      a.href = data.path;
      a.download = `phantom-fleet-export-${Date.now()}.zip`;
      a.click();
    }
  } catch (e) { alert('Export failed: ' + e.message); }
}

async function importFleet() {
  const source = prompt('Enter fleet file path or URL:');
  if (!source) return;
  try {
    const res = await fetch(`${API}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, strategy: 'switch', name: 'Imported Fleet' })
    });
    const data = await res.json();
    alert(`Import complete: ${JSON.stringify(data.imported, null, 2)}`);
    loadBots();
  } catch (e) { alert('Import failed: ' + e.message); }
}

// ═══════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatUptime(ms) {
  if (!ms) return '0s';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}

document.getElementById('add-bot-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) hideAddBotModal();
});
