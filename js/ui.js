function renderTimeline() {
  const timeline = document.getElementById('timeline');

  let activities = appState.activities;
  if (appState.filterDate) {
    activities = activities.filter(a =>
      a.startDateTime.startsWith(appState.filterDate)
    );
  }

  if (!activities.length) {
    timeline.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🗺️</div>
        <h3>No Activities Yet</h3>
        <p>Add your first activity to start planning!</p>
      </div>`;
    return;
  }

  const grouped = groupActivitiesByDay(activities);
  timeline.innerHTML = Object.keys(grouped)
    .sort()
    .map(renderDay)
    .join('');
}

function renderDay(date) {
  const activities = groupActivitiesByDay(appState.activities)[date];
  return `
    <div class="day-section">
      <div class="day-header">${formatDate(date)}</div>
      ${activities.map(renderActivityCard).join('')}
    </div>
  `;
}

function renderActivityCard(activity) {
  return `
    <div class="activity-card ${activity.type}">
      <div class="activity-header">
        <div class="activity-title">${activity.name}</div>
        <div class="activity-type ${activity.type}">${activity.type}</div>
      </div>

      <div class="activity-time">
        ${formatTime(activity.startDateTime)} → ${formatTime(activity.endDateTime)}
      </div>

      <div class="activity-actions">
        <button data-edit="${activity.id}" class="btn-secondary btn-small">Edit</button>
        <button data-delete="${activity.id}" class="btn-danger btn-small">Delete</button>
      </div>
    </div>
  `;
}
