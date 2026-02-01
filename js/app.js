function bootstrap() {
  loadAppState();
  renderTimeline();
  wireEvents();
}

function wireEvents() {
  document.body.addEventListener('click', e => {
    if (e.target.dataset.edit) {
      openEditModal(Number(e.target.dataset.edit));
    }

    if (e.target.dataset.delete) {
      deleteActivityById(Number(e.target.dataset.delete));
      renderTimeline();
    }
  });
}

bootstrap();

function importData() {
  try {
    const raw = JSON.parse(
      document.getElementById('importJSON').value
    );

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
