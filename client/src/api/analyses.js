export const getAnalyses = () => fetch('/api/analyses').then(r => r.json());
export const getAnalysis = (id) => fetch(`/api/analyses/${id}`).then(r => r.json());
export const deleteAnalysis = (id) =>
  fetch(`/api/analyses/${id}`, { method: 'DELETE' }).then(r => r.json());

export const runAnalysis = (projectName, categoryIds, specFile) => {
  const fd = new FormData();
  fd.append('projectName', projectName);
  fd.append('categoryIds', JSON.stringify(categoryIds));
  fd.append('specFile', specFile);
  return fetch('/api/analysis', { method: 'POST', body: fd }).then(r => r.json());
};

export const compareSheets = (analysisId, tdsIdA, tdsIdB) =>
  fetch(`/api/analyses/${analysisId}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tdsIdA, tdsIdB }),
  }).then(r => r.json());

export const getReportUrl = (id) => `/api/reports/${id}`;
