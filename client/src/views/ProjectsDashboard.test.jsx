import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';

vi.mock('../api/projects.js', () => ({ getProjects: vi.fn().mockResolvedValue([]) }));
vi.mock('../api/settings.js', () => ({ getStats: vi.fn().mockResolvedValue({ projectsCount: 0, openSubmittalsCount: 0 }) }));

import ProjectsDashboard from './ProjectsDashboard.jsx';

test('renders heading', async () => {
  render(<MemoryRouter><ProjectsDashboard /></MemoryRouter>);
  expect(await screen.findByText('Your projects.')).toBeTruthy();
});
