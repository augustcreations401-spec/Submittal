export const getCategories = () => fetch('/api/categories').then(r => r.json());
export const createCategory = (name) =>
  fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then(r => r.json());
export const deleteCategory = (id) =>
  fetch(`/api/categories/${id}`, { method: 'DELETE' }).then(r => r.json());
