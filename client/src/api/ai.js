const json = r => r.json();
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(json);

export const summarizeRejection = (reviewerComments) => post('/api/ai/summarize-rejection', { reviewerComments });
export const compareResubmittal = (revisionIdA, revisionIdB) => post('/api/ai/compare-resubmittal', { revisionIdA, revisionIdB });
export const draftCompliance = (specSection, specText, productName, manufacturer) =>
  post('/api/ai/draft-compliance', { specSection, specText, productName, manufacturer });
