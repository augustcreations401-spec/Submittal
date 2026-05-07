const json = r => r.json();

export const getAllSubmittals = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetch(`/api/submittals${q ? '?' + q : ''}`).then(json);
};

export const getAuditLog = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetch(`/api/audit${q ? '?' + q : ''}`).then(json);
};
