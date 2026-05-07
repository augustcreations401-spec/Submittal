// client/src/views/AuditTrail.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, test, expect, vi } from 'vitest';

vi.mock('../api/submittals.js', () => ({ getAuditLog: vi.fn().mockResolvedValue([]) }));
vi.mock('../api/projects.js', () => ({ getProjects: vi.fn().mockResolvedValue([]) }));

import AuditTrail from './AuditTrail.jsx';

test('renders Audit trail heading', async () => {
  render(<MemoryRouter><AuditTrail /></MemoryRouter>);
  expect(screen.getByText('Audit trail.')).toBeTruthy();
});
