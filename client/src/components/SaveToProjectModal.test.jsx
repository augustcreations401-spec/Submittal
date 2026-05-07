import { render, screen, fireEvent } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import SaveToProjectModal from './SaveToProjectModal.jsx';

vi.mock('../api/projects.js', () => ({
  getProjects: vi.fn().mockResolvedValue([{ id: 'p1', name: 'Project Alpha' }]),
  createProject: vi.fn().mockResolvedValue({ id: 'p2', name: 'New Project' }),
  createItem: vi.fn().mockResolvedValue({ id: 'i1' }),
}));

test('renders modal heading', async () => {
  render(<SaveToProjectModal analysisId="a1" analysisName="Roof System" onSave={vi.fn()} onSkip={vi.fn()} onClose={vi.fn()} />);
  expect(screen.getByText(/Save this match/)).toBeTruthy();
});

test('calls onSkip when skip link clicked', async () => {
  const onSkip = vi.fn();
  render(<SaveToProjectModal analysisId="a1" analysisName="Roof System" onSave={vi.fn()} onSkip={onSkip} onClose={vi.fn()} />);
  const skipBtn = screen.getByText(/Skip/);
  fireEvent.click(skipBtn);
  expect(onSkip).toHaveBeenCalled();
});
