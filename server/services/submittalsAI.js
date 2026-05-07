const Anthropic = require('@anthropic-ai/sdk').default;

function parseJson(raw) {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`AI returned non-JSON: ${text.slice(0, 200)}`);
  }
}

async function summarizeRejection(reviewerComments, apiKey) {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a construction submittal specialist. A GC has responded to a submittal with the following reviewer comments. Extract a brief summary and a list of specific action items the subcontractor must address before resubmitting. Respond in JSON only: {"summary": "...", "actionItems": ["..."]}\n\nReviewer comments:\n${reviewerComments}`
    }]
  });
  const text = msg.content?.[0]?.text;
  if (!text) throw new Error('AI returned empty response');
  return parseJson(text);
}

async function compareResubmittal(revAComments, revAFiles, revBComments, revBFiles, apiKey) {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a construction submittal specialist. Compare two revision submissions and identify what was addressed and what remains outstanding. Respond in JSON only: {"addressed": ["..."], "outstanding": ["..."], "summary": "..."}\n\nRevision A (older):\nComments: ${revAComments || 'none'}\nFiles: ${(revAFiles || []).join(', ') || 'none'}\n\nRevision B (newer):\nComments: ${revBComments || 'none'}\nFiles: ${(revBFiles || []).join(', ') || 'none'}`
    }]
  });
  const text = msg.content?.[0]?.text;
  if (!text) throw new Error('AI returned empty response');
  return parseJson(text);
}

async function draftComplianceStatement(specSection, specText, productName, manufacturer, apiKey) {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a construction submittal specialist. Draft a professional compliance statement asserting that the product meets the specification section. Respond in JSON only: {"statement": "..."}\n\nSpec Section: ${specSection}\nSpec Text: ${specText}\nProduct: ${productName}\nManufacturer: ${manufacturer}`
    }]
  });
  const text = msg.content?.[0]?.text;
  if (!text) throw new Error('AI returned empty response');
  return parseJson(text);
}

module.exports = { summarizeRejection, compareResubmittal, draftComplianceStatement };
