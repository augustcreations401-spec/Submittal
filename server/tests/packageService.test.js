const { generateTransmittal } = require('../services/packageService');

const mockProject = { name: 'Test Project', gc_name: 'GC Corp', project_number: 'P-001' };
const mockItem = { id: 'item-1', scope_item: 'Air Barrier', spec_section: '07 2719', spec_section_title: 'Air Barriers' };
const mockRevision = { revision_number: 2 };
const mockFiles = ['drawing-1.pdf', 'product-data.pdf'];
const mockStatement = 'Product meets all requirements of Section 07 2719.';

test('generateTransmittal returns a readable stream', () => {
  const doc = generateTransmittal(mockItem, mockProject, mockRevision, mockFiles, mockStatement);
  expect(typeof doc.pipe).toBe('function');
  expect(typeof doc.on).toBe('function');
  doc.end();
});

test('generateTransmittal works with empty files array', () => {
  const doc = generateTransmittal(mockItem, mockProject, mockRevision, [], '');
  expect(typeof doc.pipe).toBe('function');
  doc.end();
});
