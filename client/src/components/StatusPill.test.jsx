import { render, screen } from '@testing-library/react';
import StatusPill from './StatusPill.jsx';

test('renders Excellent rating', () => {
  render(<StatusPill rating="Excellent" />);
  expect(screen.getByTestId('status-pill').textContent).toBe('Excellent');
});

test('renders Good rating', () => {
  render(<StatusPill rating="Good" />);
  expect(screen.getByTestId('status-pill').textContent).toBe('Good');
});

test('renders Partial rating', () => {
  render(<StatusPill rating="Partial" />);
  expect(screen.getByTestId('status-pill').textContent).toBe('Partial');
});

test('renders Does Not Meet rating', () => {
  render(<StatusPill rating="Does Not Meet" />);
  expect(screen.getByTestId('status-pill').textContent).toBe('Does Not Meet');
});
