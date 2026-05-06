const Anthropic = require('@anthropic-ai/sdk');

const MAX_CHARS = 40000;

const ANALYZE_SYSTEM = `You are a construction product specification analyst specializing in Division 7 building envelope products (air barriers, spray foam, waterproofing, traffic coatings).

Given a construction specification excerpt and a product's technical data sheet (TDS), analyze whether the product meets the specification requirements.

Respond ONLY with valid JSON:
{
  "tdsId": "<string>",
  "match_score": <integer 0-100>,
  "summary": "<1-2 sentence summary>",
  "requirements_met": ["<requirement>"],
  "gaps": ["<gap>"],
  "exceedances": ["<exceeds>"]
}

Scoring: 85-100 Excellent, 65-84 Good, 40-64 Partial, 0-39 Does Not Meet.
Cite actual values (e.g. "perm rating 0.02 meets spec max of 0.10").`;

const COMPARE_SYSTEM = `You are a technical product comparison specialist for Division 7 construction products.

Given two TDS documents, extract all technically meaningful attributes and compare them side by side.

Respond ONLY with valid JSON:
{
  "attributes": [
    { "attribute": "<name>", "sheetA": "<value>", "sheetB": "<value>", "differs": true|false }
  ]
}

Include: perm rating, tensile strength, elongation, VOC content, coverage rate, temperature range, cure time, color options, approvals/listings, shelf life, substrate compatibility, application method.`;

const EXTRACT_SYSTEM = `Extract the product name and manufacturer from this technical data sheet excerpt. Respond ONLY with JSON: { "product_name": "<name>", "manufacturer": "<company>" }`;

function scoreToRating(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 40) return 'Partial';
  return 'Does Not Meet';
}

function parseJson(raw) {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  return JSON.parse(text);
}

async function analyzeSpec(specText, products, apiKey) {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  const truncSpec = specText.slice(0, MAX_CHARS);
  const results = [];

  for (const product of products) {
    const truncTds = (product.tdsText || '').slice(0, MAX_CHARS);
    const userContent = `SPECIFICATION:\n${truncSpec}\n\nPRODUCT TDS (tdsId=${product.tdsId}, name=${product.productName}):\n${truncTds}\n\nReturn JSON analysis. Set tdsId to "${product.tdsId}".`;

    try {
      const response = await client.beta.promptCaching.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: [{ type: 'text', text: ANALYZE_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userContent }],
      });
      const parsed = parseJson(response.content[0].text);
      parsed.tdsId = product.tdsId;
      parsed.productName = product.productName;
      parsed.rating = scoreToRating(parsed.match_score || 0);
      parsed.score = parsed.match_score;
      parsed.meets = parsed.requirements_met;
      parsed.shortfalls = parsed.gaps;
      results.push(parsed);
    } catch (err) {
      console.error(`analyzeSpec failed for ${product.tdsId}:`, err.message);
    }
  }

  results.sort((a, b) => (b.score || 0) - (a.score || 0));
  return { rankedProducts: results };
}

async function compareTwoSheets(tdsTextA, tdsTextB, specText, apiKey) {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  const content = `SPEC CONTEXT:\n${specText.slice(0, 10000)}\n\nSHEET A:\n${tdsTextA.slice(0, MAX_CHARS)}\n\nSHEET B:\n${tdsTextB.slice(0, MAX_CHARS)}\n\nReturn comparison JSON.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: COMPARE_SYSTEM,
    messages: [{ role: 'user', content }],
  });
  return parseJson(response.content[0].text);
}

async function extractProductInfo(tdsText, apiKey) {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: tdsText.slice(0, 2000) }],
    });
    return parseJson(response.content[0].text);
  } catch {
    return { product_name: null, manufacturer: null };
  }
}

module.exports = { analyzeSpec, compareTwoSheets, extractProductInfo, scoreToRating };
