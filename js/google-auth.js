function loadSavedUser() {
  const saved = localStorage.getItem('roadtripUser');
  if (!saved) return;

  try {
    appState.user = JSON.parse(saved);
  } catch {
    localStorage.removeItem('roadtripUser');
  }
}

function logoutUser() {
  appState.user = null;
  appState.google.accessToken = null;
  appState.google.driveFileId = null;

  localStorage.clear();
  updateUIForUser();

  showNotification('Logged out', 'info');
}
