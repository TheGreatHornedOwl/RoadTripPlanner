function isDriveConnected() {
  return !!(
    appState.google.accessToken &&
    appState.google.driveFileId
  );
}

async function fetchDriveFile() {
  if (!isDriveConnected()) {
    showNotification('Google Drive not connected', 'error');
    return;
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${appState.google.driveFileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${appState.google.accessToken}`
        }
      }
    );

    if (res.status === 401) {
      throw new Error('Session expired');
    }

    const data = normalizeImportedData(await res.json());

    appState.subtitle = data.subtitle;
    appState.activities = data.activities;

    saveAppState();
    renderTimeline();
    showNotification('Synced from Google Drive', 'success');
  } catch (err) {
    showNotification(err.message, 'error');
  }
}
