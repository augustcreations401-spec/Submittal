import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';

vi.mock('../api/projects.js', () => ({
  getItem: vi.fn().mockResolvedValue({ id: 'i1', scope_item: 'Air Barrier', spec_section: '07 2719', status: 'submitted', deadline: null, notes: null, revisions: [] }),
  updateItem: vi.fn(), deleteRevision: vi.fn(), getFileUrl: vi.fn(() => '/file'),
}));
vi.mock('../api/ai.js', () => ({ summarizeRejection: vi.fn(), compareResubmittal: vi.fn() }));

import ItemDetail from './ItemDetail.jsx';

test('renders scope item name', async () => {
  render(
    <MemoryRouter initialEntries={['/projects/p1/items/i1']}>
      <Routes><Route path="/projects/:id/items/:itemId" element={<ItemDetail />} /></Routes>
    </MemoryRouter>
  );
  const heading = await screen.findByText('Air Barrier');
  expect(heading).toBeTruthy();
});
