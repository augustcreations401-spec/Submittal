const router = require('express').Router();
const db = require('../db/db');
const { summarizeRejection, compareResubmittal, draftComplianceStatement } = require('../services/submittalsAI');

function getApiKey() {
  const row = db.prepare("SELECT value FROM settings WHERE key='anthropic_api_key'").get();
  return (row && row.value) || process.env.ANTHROPIC_API_KEY;
}

router.post('/summarize-rejection', async (req, res) => {
  const { reviewerComments } = req.body;
  if (!reviewerComments) return res.status(400).json({ error: 'reviewerComments required' });
  try {
    res.json(await summarizeRejection(reviewerComments, getApiKey()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/compare-resubmittal', async (req, res) => {
  const { revisionIdA, revisionIdB } = req.body;
  if (!revisionIdA || !revisionIdB) return res.status(400).json({ error: 'revisionIdA and revisionIdB required' });
  const revA = db.prepare('SELECT * FROM submittal_revisions WHERE id=?').get(revisionIdA);
  const revB = db.prepare('SELECT * FROM submittal_revisions WHERE id=?').get(revisionIdB);
  if (!revA || !revB) return res.status(404).json({ error: 'revision not found' });
  try {
    const filesA = JSON.parse(revA.uploaded_files || '[]');
    const filesB = JSON.parse(revB.uploaded_files || '[]');
    res.json(await compareResubmittal(revA.reviewer_comments, filesA, revB.reviewer_comments, filesB, getApiKey()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/draft-compliance', async (req, res) => {
  const { specSection, specText, productName, manufacturer } = req.body;
  if (!specSection || !productName) return res.status(400).json({ error: 'specSection and productName required' });
  try {
    res.json(await draftComplianceStatement(specSection, specText || '', productName, manufacturer || '', getApiKey()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
