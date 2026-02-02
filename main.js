// Main JS for RoadTripPlanner (moved from inline script)
let activities = [];
let editingId = null;
let filterDate = null;
let subtitle = 'Plan Your Perfect Journey';
let currentUser = null;
let googleClientId = '548418558127-oq09sbqgdslma396aukj2alh672qaona.apps.googleusercontent.com';
let googleDriveFileId = null;
let googleAccessToken = null;

// Simple JWT decoder (client-side only)
function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Initialize Google Sign-In
function initGoogleSignIn() {
  let attempts = 0;
  const maxAttempts = 10;
  const checkGoogleLoaded = setInterval(() => {
    attempts++;
    if (typeof google !== 'undefined' && google.accounts) {
      clearInterval(checkGoogleLoaded);
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      renderGoogleButton();
    } else if (attempts >= maxAttempts) {
      clearInterval(checkGoogleLoaded);
      console.warn('Google Identity Services not loaded after multiple attempts.');
      showFallbackMessage();
    }
  }, 300);
}

function renderGoogleButton() {
  const buttonContainer = document.getElementById('googleButtonContainer');
  if (buttonContainer && typeof google !== 'undefined') {
    google.accounts.id.renderButton(buttonContainer, {
      theme: 'outline',
      size: 'large',
      width: 350,
      text: 'signin_with',
      shape: 'rectangular'
    });
  }
}

function showFallbackMessage() {
  const loggedOutView = document.getElementById('loggedOutView');
  if (loggedOutView && !currentUser) {
    loggedOutView.innerHTML = `
      <h3 class="account-heading">Account</h3>
      <div class="alert-warning">
        ⚠️ Google Sign-In is blocked by Content Security Policy in this environment.
      </div>
      <div class="alert-info">
        <strong>💡 Workaround:</strong> Download this HTML file and open it in your browser, or host it on your own domain to enable Google Sign-In.
      </div>
    `;
  }
}

function handleGoogleResponse(response) {
  const userData = decodeJWT(response.credential);
  if (userData) {
    currentUser = {
      id: userData.sub,
      name: userData.name,
      email: userData.email,
      picture: userData.picture,
      token: response.credential
    };
    localStorage.setItem('roadtripUser', JSON.stringify(currentUser));
    updateUIForUser();
    showNotification(`Welcome, ${currentUser.name}!`, 'success');
    setTimeout(() => requestGoogleDriveAccess(), 500);
  }
}

function requestGoogleDriveAccess() {
  const sec = document.getElementById('gdriveSyncSection');
  if (sec) sec.classList.remove('hidden');
  if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
      callback: (tokenResponse) => {
        if (tokenResponse && tokenResponse.access_token) {
          googleAccessToken = tokenResponse.access_token;
          localStorage.setItem('googleAccessToken', googleAccessToken);
          showNotification('Google Drive access granted!', 'success');
        } else if (tokenResponse && tokenResponse.error) {
          showNotification('Drive access denied. You can still use local storage.', 'info');
        }
      },
    });
    tokenClient.requestAccessToken();
  } else {
    showNotification('Google Drive sync available - connect to enable', 'info');
  }
}

function signInWithGoogle() {
  if (typeof google !== 'undefined' && google.accounts) {
    google.accounts.id.prompt();
  } else {
    showNotification('Google Sign-In is not available in this environment', 'error');
  }
}

function logout() {
  currentUser = null;
  googleAccessToken = null;
  googleDriveFileId = null;
  localStorage.removeItem('roadtripUser');
  localStorage.removeItem('googleAccessToken');
  localStorage.removeItem('googleDriveFileId');
  updateUIForUser();
  showNotification('Logged out successfully', 'success');
  toggleMenu(false);
}

function connectGoogleDrive() {
  const fileId = document.getElementById('gdriveFileId').value.trim();
  if (!fileId) { showNotification('Please enter a File ID', 'error'); return; }
  if (!googleAccessToken) { showNotification('Please sign in with Google first', 'error'); requestGoogleDriveAccess(); return; }
  googleDriveFileId = fileId;
  localStorage.setItem('googleDriveFileId', fileId);
  document.getElementById('gdriveSetup').classList.add('hidden');
  document.getElementById('gdriveActions').classList.remove('hidden');
  document.getElementById('gdriveStatus').innerHTML = '<span class="gdrive-status connected">✓ Connected</span>';
  showNotification('Connected to Google Drive', 'success');
  syncFromGoogleDrive();
}

function disconnectGoogleDrive() {
  googleDriveFileId = null;
  localStorage.removeItem('googleDriveFileId');
  document.getElementById('gdriveSetup').classList.remove('hidden');
  document.getElementById('gdriveActions').classList.add('hidden');
}

async function syncFromGoogleDrive() {
  if (!googleDriveFileId || !googleAccessToken) { showNotification('Not connected to Drive', 'error'); return; }
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${googleDriveFileId}?alt=media`, { headers: { Authorization: `Bearer ${googleAccessToken}` } });
    if (!res.ok) throw new Error('Failed to fetch file');
    const data = await res.json();
    if (data && data.activities) {
      activities = data.activities;
      localStorage.setItem('roadtripData', JSON.stringify(data));
      renderTimeline();
      showNotification('Data synced from Google Drive', 'success');
    }
  } catch (err) {
    console.error(err);
    showNotification('Error syncing from Drive', 'error');
  }
}

async function saveToGoogleDrive() {
  if (!googleDriveFileId || !googleAccessToken) { showNotification('Not connected to Drive', 'error'); return; }
  try {
    const data = JSON.stringify({ subtitle, activities });
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${googleDriveFileId}?uploadType=media`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' }, body: data
    });
    if (!res.ok) throw new Error('Failed to save');
    showNotification('Saved to Google Drive', 'success');
  } catch (err) { console.error(err); showNotification('Error saving to Drive', 'error'); }
}

function updateUIForUser() {
  const loggedInView = document.getElementById('loggedInView');
  const loggedOutView = document.getElementById('loggedOutView');
  const userIndicator = document.getElementById('userIndicator');
  if (currentUser) {
    loggedOutView.classList.add('hidden');
    loggedInView.classList.remove('hidden');
    document.getElementById('menuUserAvatar').src = currentUser.picture || '';
    document.getElementById('menuUserName').textContent = currentUser.name || '';
    document.getElementById('menuUserEmail').textContent = currentUser.email || '';
    userIndicator.classList.remove('hidden');
    document.getElementById('userAvatar').src = currentUser.picture || '';
    document.getElementById('userName').textContent = currentUser.name || '';
    document.getElementById('gdriveSyncSection').classList.remove('hidden');
    if (googleDriveFileId) {
      document.getElementById('gdriveSetup').classList.add('hidden');
      document.getElementById('gdriveActions').classList.remove('hidden');
      document.getElementById('gdriveStatus').innerHTML = '<span class="gdrive-status connected">✓ Connected</span>';
    }
  } else {
    loggedOutView.classList.remove('hidden');
    loggedInView.classList.add('hidden');
    userIndicator.classList.add('hidden');
    document.getElementById('gdriveSyncSection').classList.add('hidden');
  }
}

function showNotification(message, type='info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
}

function toggleMenu(open) {
  const panel = document.querySelector('.menu-panel');
  const overlay = document.getElementById('menuOverlay');
  const body = document.body;
  const isOpen = typeof open === 'boolean' ? open : panel.classList.toggle('open');
  if (isOpen === true || panel.classList.contains('open')) {
    panel.classList.add('open'); overlay.classList.add('active'); body.classList.add('menu-open');
  } else {
    panel.classList.remove('open'); overlay.classList.remove('active'); body.classList.remove('menu-open');
  }
}

function openMapView() { showNotification('Map view not implemented in this demo', 'info'); }

function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add Activity';
  document.getElementById('activityForm').reset;
  document.getElementById('activityModal').classList.add('active');
}

function closeModal() { document.getElementById('activityModal').classList.remove('active'); }

function openEditModal(id) {
  const activity = activities.find(a => a.id === id);
  if (!activity) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Activity';
  document.getElementById('activityType').value = activity.type;
  document.getElementById('activityName').value = activity.name;
  document.getElementById('address').value = activity.address;
  document.getElementById('startDateTime').value = activity.startDateTime;
  document.getElementById('duration').value = activity.duration;
  document.getElementById('notes').value = activity.notes || '';
  document.getElementById('activityModal').classList.add('active');
}

function deleteActivity(id) {
  activities = activities.filter(a => a.id !== id);
  localStorage.setItem('roadtripData', JSON.stringify({ subtitle, activities }));
  renderTimeline();
}

function renderTimeline() {
  const timeline = document.getElementById('timeline');
  if (!timeline) return;
  const activitiesToRender = filterDate ? activities.filter(a => a.startDateTime.startsWith(filterDate)) : activities;
  const groupedActivities = activitiesToRender.reduce((acc, a) => {
    const date = a.startDateTime.split('T')[0];
    (acc[date] = acc[date] || []).push(a);
    return acc;
  }, {});
  let html = '';
  Object.keys(groupedActivities).sort().forEach((date, dayIndex) => {
    const dayActivities = groupedActivities[date];
    html += `
      <div class="day-section">
        <div class="day-header">${formatDate(date)}</div>
    `;
    dayActivities.forEach((activity, actIndex) => {
      const typeEmoji = { driving: '🚗', eating: '🍽️', sleeping: '🛏️', other: '🎯' };
      html += `
        <div class="activity-card ${activity.type}">
          <div class="activity-header">
            <div class="activity-title">${typeEmoji[activity.type]} ${activity.name}</div>
            <div class="activity-type ${activity.type}">${activity.type}</div>
          </div>
          <div class="activity-time">
            ${formatTime(activity.startDateTime)} <span class="time-arrow">→</span> ${formatTime(activity.endDateTime)}
            <span class="activity-duration">(${activity.duration} hrs)</span>
          </div>
          <div class="activity-details">
            <a href="${getDirectionsUrl(activity.address)}" target="_blank" class="address-link">📍 ${activity.address}</a>
            ${activity.notes ? `<p class="activity-notes"><strong>Notes:</strong> ${activity.notes}</p>` : ''}
          </div>
          <div class="activity-actions">
            <button class="btn-secondary btn-small edit-btn" data-id="${activity.id}">Edit</button>
            <button class="btn-danger btn-small delete-btn" data-id="${activity.id}">Delete</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
  });
  timeline.innerHTML = html;
  // add delay classes for animation (cap at 19 for predefined classes)
  const daySections = timeline.querySelectorAll('.day-section');
  daySections.forEach((ds, i) => {
    ds.classList.add(`delay-day-${Math.min(i,19)}`);
    const cards = ds.querySelectorAll('.activity-card');
    cards.forEach((card, j) => card.classList.add(`delay-item-${Math.min(j,19)}`));
  });
}

function filterActivities() { filterDate = document.getElementById('filterDate').value; renderTimeline(); }
function clearFilter() { filterDate = null; document.getElementById('filterDate').value = ''; renderTimeline(); }

function exportData() { const data = JSON.stringify({ subtitle, activities }, null, 2); document.getElementById('exportJSON').value = data; document.getElementById('exportModal').classList.add('active'); }
function closeExportModal() { document.getElementById('exportModal').classList.remove('active'); }

function copyToClipboard() {
  const textarea = document.getElementById('exportJSON');
  textarea.select();
  document.execCommand('copy');
  const btn = document.getElementById('copyExportBtn');
  const originalText = btn.textContent;
  btn.textContent = '✓ Copied!';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = originalText; btn.classList.remove('copied'); }, 2000);
}

function downloadJSON() {
  const data = document.getElementById('exportJSON').value;
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roadtrip-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function openImportModal() { document.getElementById('importJSON').value = ''; document.getElementById('importModal').classList.add('active'); }
function closeImportModal() { document.getElementById('importModal').classList.remove('active'); }

function importData() {
  try {
    const data = JSON.parse(document.getElementById('importJSON').value);
    if (data.activities) {
      activities = data.activities;
      localStorage.setItem('roadtripData', JSON.stringify({ subtitle, activities }));
      renderTimeline();
      closeImportModal();
      showNotification('Imported data successfully', 'success');
    } else {
      showNotification('Invalid import format', 'error');
    }
  } catch (err) {
    showNotification('Error parsing JSON', 'error');
  }
}

function saveActivity() {
  const type = document.getElementById('activityType').value;
  const name = document.getElementById('activityName').value;
  const address = document.getElementById('address').value;
  const start = document.getElementById('startDateTime').value;
  const duration = parseFloat(document.getElementById('duration').value) || 0;
  const notes = document.getElementById('notes').value;
  if (!name || !address || !start || !duration) { showNotification('Please fill required fields', 'error'); return; }
  const newActivity = {
    id: editingId || Date.now(),
    type, name, address, startDateTime: start, duration, notes,
    endDateTime: calculateEndTime(start, duration)
  };
  if (editingId) {
    activities = activities.map(a => a.id === editingId ? newActivity : a);
    editingId = null;
  } else {
    activities.push(newActivity);
  }
  localStorage.setItem('roadtripData', JSON.stringify({ subtitle, activities }));
  closeModal(); renderTimeline();
}

function calculateEndTime(startISO, hours) {
  const d = new Date(startISO);
  d.setMinutes(d.getMinutes() + Math.round(hours * 60));
  return d.toISOString();
}

function formatDate(dateStr) { const d = new Date(dateStr); return d.toDateString(); }
function formatTime(iso) { const d = new Date(iso); return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function getDirectionsUrl(address) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`; }

// Event delegation for timeline edit/delete buttons
function timelineClickHandler(e) {
  const editBtn = e.target.closest('.edit-btn');
  const delBtn = e.target.closest('.delete-btn');
  if (editBtn) { openEditModal(Number(editBtn.dataset.id)); }
  if (delBtn) { deleteActivity(Number(delBtn.dataset.id)); }
}

// Initialize app state
function initAppState() {
  // Migrate old storage key 'roadtripActivities' to new 'roadtripData' if present
  const legacy = localStorage.getItem('roadtripActivities');
  const saved = localStorage.getItem('roadtripData') || (legacy ? (function(){ try{ const parsed=JSON.parse(legacy); const data = { subtitle: parsed.subtitle||'Plan Your Perfect Journey', activities: Array.isArray(parsed) ? parsed : (parsed.activities||[]) }; localStorage.setItem('roadtripData', JSON.stringify(data)); localStorage.removeItem('roadtripActivities'); return JSON.stringify(data); } catch(e){ return null; } })() : null);
  const savedUser = localStorage.getItem('roadtripUser');
  const savedToken = localStorage.getItem('googleAccessToken');
  const savedDriveId = localStorage.getItem('googleDriveFileId');
  if (saved) {
    try { const parsed = JSON.parse(saved); subtitle = parsed.subtitle || subtitle; activities = parsed.activities || []; } catch (e) {}
  }
  if (savedUser) { try { currentUser = JSON.parse(savedUser); } catch (e) {} }
  if (savedToken) googleAccessToken = savedToken;
  if (savedDriveId) googleDriveFileId = savedDriveId;
  updateUIForUser();
  renderTimeline();
}

// Wire up event listeners after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initAppState();
  try {
    initGoogleSignIn();
  } catch (e) {
    console.warn('Google Sign-In initialization failed:', e);
    showFallbackMessage();
  }

  document.getElementById('subtitle').addEventListener('click', editSubtitle);
  document.getElementById('mapBtn').addEventListener('click', openMapView);
  document.getElementById('hamburgerBtn').addEventListener('click', () => toggleMenu(true));
  document.getElementById('menuOverlay').addEventListener('click', () => toggleMenu(false));

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('newActivityBtn').addEventListener('click', () => { openAddModal(); toggleMenu(false); });
  document.getElementById('clearFilterBtn').addEventListener('click', clearFilter);

  document.getElementById('connectGDriveBtn').addEventListener('click', connectGoogleDrive);
  document.getElementById('syncGDriveBtn').addEventListener('click', syncFromGoogleDrive);
  document.getElementById('saveGDriveBtn').addEventListener('click', saveToGoogleDrive);
  document.getElementById('disconnectGDriveBtn').addEventListener('click', disconnectGoogleDrive);

  document.getElementById('exportBtn').addEventListener('click', () => { exportData(); toggleMenu(false); });
  document.getElementById('importBtn').addEventListener('click', () => { openImportModal(); toggleMenu(false); });
  document.getElementById('clearAllBtn').addEventListener('click', () => { if (confirm('Clear all activities?')) { activities = []; localStorage.removeItem('roadtripData'); renderTimeline(); } });

  document.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', () => { document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); }));

  document.getElementById('saveActivityBtn').addEventListener('click', saveActivity);
  document.getElementById('cancelActivityBtn').addEventListener('click', closeModal);

  document.getElementById('importDataBtn').addEventListener('click', importData);
  document.getElementById('cancelImportBtn').addEventListener('click', closeImportModal);

  document.getElementById('copyExportBtn').addEventListener('click', copyToClipboard);
  document.getElementById('downloadExportBtn').addEventListener('click', downloadJSON);
  document.getElementById('closeExportBtn').addEventListener('click', closeExportModal);

  document.getElementById('filterDate').addEventListener('change', filterActivities);

  document.getElementById('timeline').addEventListener('click', timelineClickHandler);

  // Some small helpers
  document.getElementById('googleButtonContainer')?.addEventListener('click', () => { /* delegate to gsi */ });
});

// Enhanced subtitle editor (DOM-based, no inline styles)
function editSubtitle() {
  const subtitleEl = document.getElementById('subtitle');
  if (!subtitleEl) return;
  const currentText = subtitleEl.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  input.className = 'subtitle-editor';

  function commit() {
    const newText = input.value.trim() || 'Plan Your Perfect Journey';
    subtitle = newText;
    const newEl = document.createElement('div');
    newEl.id = 'subtitle';
    newEl.className = 'tagline';
    newEl.title = 'Click to edit';
    newEl.textContent = subtitle;
    input.replaceWith(newEl);
    localStorage.setItem('roadtripData', JSON.stringify({ subtitle, activities }));
    newEl.addEventListener('click', editSubtitle);
  }

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') {
      const newEl = document.createElement('div');
      newEl.id = 'subtitle';
      newEl.className = 'tagline';
      newEl.title = 'Click to edit';
      newEl.textContent = currentText;
      input.replaceWith(newEl);
      newEl.addEventListener('click', editSubtitle);
    }
  });

  subtitleEl.replaceWith(input);
  input.focus();
  input.select();
}
