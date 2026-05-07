import { render, screen } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import SubmittalStatusPill from './SubmittalStatusPill.jsx';

test('renders Approved label', () => {
  render(<SubmittalStatusPill status="approved" />);
  expect(screen.getByText('Approved')).toBeTruthy();
});

test('renders Not submitted label', () => {
  render(<SubmittalStatusPill status="not_yet_submitted" />);
  expect(screen.getByText('Not submitted')).toBeTruthy();
});

test('renders unknown status without crashing', () => {
  render(<SubmittalStatusPill status="unknown_value" />);
});
