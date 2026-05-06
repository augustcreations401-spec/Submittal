import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog.jsx';

test('renders the message', () => {
  render(<ConfirmDialog message="Delete this item?" onConfirm={() => {}} onCancel={() => {}} />);
  expect(screen.getByTestId('confirm-dialog')).toBeTruthy();
  expect(screen.getByText('Delete this item?')).toBeTruthy();
});

test('calls onConfirm when Delete clicked', () => {
  const onConfirm = vi.fn();
  render(<ConfirmDialog message="Are you sure?" onConfirm={onConfirm} onCancel={() => {}} />);
  fireEvent.click(screen.getByText('Delete'));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test('calls onCancel when Cancel clicked', () => {
  const onCancel = vi.fn();
  render(<ConfirmDialog message="Are you sure?" onConfirm={() => {}} onCancel={onCancel} />);
  fireEvent.click(screen.getByText('Cancel'));
  expect(onCancel).toHaveBeenCalledTimes(1);
});
