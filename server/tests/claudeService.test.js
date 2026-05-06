const { scoreToRating } = require('../services/claudeService');

test('scoreToRating returns Excellent for 85+', () => {
  expect(scoreToRating(85)).toBe('Excellent');
  expect(scoreToRating(100)).toBe('Excellent');
});

test('scoreToRating returns Good for 65-84', () => {
  expect(scoreToRating(65)).toBe('Good');
  expect(scoreToRating(84)).toBe('Good');
});

test('scoreToRating returns Partial for 40-64', () => {
  expect(scoreToRating(40)).toBe('Partial');
  expect(scoreToRating(64)).toBe('Partial');
});

test('scoreToRating returns Does Not Meet for <40', () => {
  expect(scoreToRating(0)).toBe('Does Not Meet');
  expect(scoreToRating(39)).toBe('Does Not Meet');
});

test('module exports all required functions', () => {
  const svc = require('../services/claudeService');
  expect(typeof svc.analyzeSpec).toBe('function');
  expect(typeof svc.compareTwoSheets).toBe('function');
  expect(typeof svc.extractProductInfo).toBe('function');
  expect(typeof svc.scoreToRating).toBe('function');
});
