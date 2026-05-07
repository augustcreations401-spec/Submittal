import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';

vi.mock('../api/projects.js', () => ({
  getItem: vi.fn().mockResolvedValue({ id: 'i1', scope_item: 'Roof System', spec_section: '07 5216', spec_section_title: '', revisions: [{ id: 'r1', revision_number: 1, uploaded_files: '["drawing.pdf"]' }] }),
  getProject: vi.fn().mockResolvedValue({ id: 'p1', name: 'Test Project', gc_name: 'GC', project_number: 'P-001' }),
  generatePackage: vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob()) }),
  getFileUrl: vi.fn(() => '/file'),
}));
vi.mock('../api/ai.js', () => ({ draftCompliance: vi.fn().mockResolvedValue({ statement: 'Meets spec.' }) }));

import BuildPackage from './BuildPackage.jsx';

test('renders Build Package heading', async () => {
  render(
    <MemoryRouter initialEntries={['/projects/p1/items/i1/package']}>
      <Routes><Route path="/projects/:id/items/:itemId/package" element={<BuildPackage />} /></Routes>
    </MemoryRouter>
  );
  const heading = await screen.findByText('Build package.');
  expect(heading).toBeTruthy();
});
