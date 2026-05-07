jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: '{"summary":"needs fire stop","actionItems":["install firestop"]}' }]
      })
    }
  }))
}));

const { summarizeRejection, compareResubmittal, draftComplianceStatement } = require('../services/submittalsAI');

test('summarizeRejection returns summary and actionItems', async () => {
  const result = await summarizeRejection('Missing firestop details', 'test-key');
  expect(result).toHaveProperty('summary');
  expect(Array.isArray(result.actionItems)).toBe(true);
});

test('compareResubmittal returns addressed, outstanding, summary', async () => {
  const Anthropic = require('@anthropic-ai/sdk').default;
  Anthropic.mockImplementation(() => ({
    messages: { create: jest.fn().mockResolvedValue({
      content: [{ text: '{"addressed":["firestop added"],"outstanding":[],"summary":"all resolved"}' }]
    })}
  }));
  const result = await compareResubmittal('old comments', ['file1.pdf'], 'new comments', ['file2.pdf'], 'test-key');
  expect(result).toHaveProperty('addressed');
  expect(result).toHaveProperty('outstanding');
  expect(result).toHaveProperty('summary');
});

test('draftComplianceStatement returns statement', async () => {
  const Anthropic = require('@anthropic-ai/sdk').default;
  Anthropic.mockImplementation(() => ({
    messages: { create: jest.fn().mockResolvedValue({
      content: [{ text: '{"statement":"Product meets section 07 2119"}' }]
    })}
  }));
  const result = await draftComplianceStatement('07 2119', 'spec text', 'AirGuard', 'GCP', 'test-key');
  expect(result).toHaveProperty('statement');
});
