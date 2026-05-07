const base = '/api/projects';
const json = r => r.json();
const opts = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const getProjects = () => fetch(base).then(json);
export const createProject = (data) => fetch(base, opts('POST', data)).then(json);
export const getProject = (id) => fetch(`${base}/${id}`).then(json);
export const updateProject = (id, data) => fetch(`${base}/${id}`, opts('PUT', data)).then(json);
export const deleteProject = (id) => fetch(`${base}/${id}`, { method: 'DELETE' }).then(json);

export const getItems = (projectId) => fetch(`${base}/${projectId}/items`).then(json);
export const createItem = (projectId, data) => fetch(`${base}/${projectId}/items`, opts('POST', data)).then(json);
export const getItem = (projectId, itemId) => fetch(`${base}/${projectId}/items/${itemId}`).then(json);
export const updateItem = (projectId, itemId, data) => fetch(`${base}/${projectId}/items/${itemId}`, opts('PUT', data)).then(json);
export const deleteItem = (projectId, itemId) => fetch(`${base}/${projectId}/items/${itemId}`, { method: 'DELETE' }).then(json);

export const createRevision = (projectId, itemId, formData) =>
  fetch(`${base}/${projectId}/items/${itemId}/revisions`, { method: 'POST', body: formData }).then(json);
export const deleteRevision = (projectId, itemId, revId) =>
  fetch(`${base}/${projectId}/items/${itemId}/revisions/${revId}`, { method: 'DELETE' }).then(json);

export const getFileUrl = (projectId, itemId, revId, filename) =>
  `${base}/${projectId}/items/${itemId}/revisions/${revId}/files/${encodeURIComponent(filename)}`;

export const generatePackage = (projectId, itemId, data) =>
  fetch(`${base}/${projectId}/items/${itemId}/package`, opts('POST', data));
