function addActivity(activity) {
  appState.activities.push(activity);
  sortActivities();
  saveAppState();
}

function updateActivity(updated) {
  const index = appState.activities.findIndex(a => a.id === updated.id);
  if (index !== -1) {
    appState.activities[index] = updated;
    sortActivities();
    saveAppState();
  }
}

function deleteActivityById(id) {
  appState.activities = appState.activities.filter(a => a.id !== id);
  saveAppState();
}

function sortActivities() {
  appState.activities.sort(
    (a, b) => new Date(a.startDateTime) - new Date(b.startDateTime)
  );
}

function groupActivitiesByDay(activities) {
  return activities.reduce((acc, activity) => {
    const day = activity.startDateTime.split('T')[0];
    acc[day] ??= [];
    acc[day].push(activity);
    return acc;
  }, {});
}
