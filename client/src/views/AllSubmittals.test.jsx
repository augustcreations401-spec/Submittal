// client/src/views/AllSubmittals.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';

vi.mock('../api/submittals.js', () => ({ getAllSubmittals: vi.fn().mockResolvedValue([]) }));
vi.mock('../api/projects.js', () => ({ getProjects: vi.fn().mockResolvedValue([]) }));

import AllSubmittals from './AllSubmittals.jsx';

test('renders All submittals heading', async () => {
  render(<MemoryRouter><AllSubmittals /></MemoryRouter>);
  expect(screen.getByText('All submittals.')).toBeTruthy();
});
