import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBanner from './ErrorBanner.jsx';

test('renders the error message', () => {
  render(<ErrorBanner message="Something went wrong" />);
  expect(screen.getByTestId('error-banner')).toBeTruthy();
  expect(screen.getByText('Something went wrong')).toBeTruthy();
});

test('dismisses when X button clicked', () => {
  render(<ErrorBanner message="Error occurred" />);
  const btn = screen.getByRole('button');
  fireEvent.click(btn);
  expect(screen.queryByTestId('error-banner')).toBeNull();
});

test('renders nothing when message is empty', () => {
  render(<ErrorBanner message="" />);
  expect(screen.queryByTestId('error-banner')).toBeNull();
});
