// client/src/views/ProjectDetail.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';

vi.mock('../api/projects.js', () => ({
  getProject: vi.fn().mockResolvedValue({ id: 'p1', name: 'Test Project', gc_name: 'GC Corp', project_number: 'P-001', contract_date: null, items: [] }),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  createItem: vi.fn(),
  deleteItem: vi.fn(),
}));

import ProjectDetail from './ProjectDetail.jsx';

test('renders project name after load', async () => {
  render(
    <MemoryRouter initialEntries={['/projects/p1']}>
      <Routes><Route path="/projects/:id" element={<ProjectDetail />} /></Routes>
    </MemoryRouter>
  );
  const heading = await screen.findByText('Test Project');
  expect(heading).toBeTruthy();
});
