function bootstrap() {
  loadAppState();
  loadSavedUser?.();
  renderTimeline();
  wireMenuEvents();
}

function wireMenuEvents() {
  document.addEventListener('click', e => {
    if (e.target.closest('.js-menu-toggle')) {
      toggleMenu();
    }

    if (e.target.closest('.js-menu-close')) {
      closeMenu();
    }
  });
}

function importData() {
  try {
    const textarea = document.getElementById('importJSON');
    if (!textarea) throw new Error('Import field not found');

    const raw = JSON.parse(textarea.value);
    const normalized = normalizeImportedData(raw);

    appState.subtitle = normalized.subtitle;
    appState.activities = normalized.activities;

    saveAppState();
    renderTimeline();
    closeModal('importModal');

    showNotification('Trip imported successfully!', 'success');
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

function toggleMenu() {
  document.body.classList.toggle('menu-open');
}

function closeMenu() {
  document.body.classList.remove('menu-open');
}

bootstrap();
