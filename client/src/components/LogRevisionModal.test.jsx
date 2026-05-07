import { render, screen, fireEvent } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import LogRevisionModal from './LogRevisionModal.jsx';

vi.mock('../api/projects.js', () => ({ createRevision: vi.fn().mockResolvedValue({ id: 'r1', revision_number: 1 }) }));
vi.mock('../api/ai.js', () => ({ summarizeRejection: vi.fn() }));

const defaultProps = {
  projectId: 'p1', itemId: 'i1', nextRevNumber: 1,
  defaultSubmittedBy: 'Thomas',
  onSave: vi.fn(), onClose: vi.fn(),
};

test('renders modal with Log Revision heading', () => {
  render(<LogRevisionModal {...defaultProps} />);
  expect(screen.getByText(/Log Revision/)).toBeTruthy();
});

test('calls onClose when Cancel clicked', () => {
  render(<LogRevisionModal {...defaultProps} />);
  fireEvent.click(screen.getByText('Cancel'));
  expect(defaultProps.onClose).toHaveBeenCalled();
});
