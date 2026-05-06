export const getSettings = () => fetch('/api/settings').then(r => r.json());
export const updateSetting = (key, value) =>
  fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) }).then(r => r.json());
export const updateSettings = (updates) =>
  fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) }).then(r => r.json());
export const getStats = () => fetch('/api/stats').then(r => r.json());
