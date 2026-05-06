export const getTds = () => fetch('/api/tds').then(r => r.json());

export const uploadTds = (file, categoryId) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('category_id', categoryId);
  return fetch('/api/tds/upload', { method: 'POST', body: fd }).then(r => r.json());
};

export const deleteTds = (id) =>
  fetch(`/api/tds/${id}`, { method: 'DELETE' }).then(r => r.json());
