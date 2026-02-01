function saveAppState() {
  localStorage.setItem(
    'roadtripData',
    JSON.stringify({
      subtitle: appState.subtitle,
      activities: appState.activities
    })
  );
}

function loadAppState() {
  const saved = localStorage.getItem('roadtripData');
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    appState.subtitle = data.subtitle || appState.subtitle;
    appState.activities = data.activities || [];
  } catch {
    console.warn('Invalid saved data');
  }
}
