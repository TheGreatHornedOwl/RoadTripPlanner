function validateActivity(a) {
  if (!a.id || !a.type || !a.name || !a.address) return false;
  if (!a.startDateTime || !a.endDateTime) return false;
  if (typeof a.duration !== 'number' || a.duration <= 0) return false;

  if (isNaN(new Date(a.startDateTime))) return false;
  if (isNaN(new Date(a.endDateTime))) return false;

  return true;
}

function normalizeImportedData(data) {
  if (!Array.isArray(data.activities)) {
    throw new Error('Missing activities array');
  }

  const cleaned = data.activities.filter(validateActivity);

  if (!cleaned.length) {
    throw new Error('No valid activities found');
  }

  return {
    subtitle: data.subtitle || 'Plan Your Perfect Journey',
    activities: cleaned
  };
}
