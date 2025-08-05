import { render, screen } from '@testing-library/react';
import App from './App';

describe('Job Application Tracker', () => {
  test('renders main heading', () => {
    render(<App />);
    const headingElement = screen.getByText(/Job Application Tracker/i);
    expect(headingElement).toBeInTheDocument();
  });

  test('renders KAIZEN logo', () => {
    render(<App />);
    const logoElement = screen.getByText(/KAIZEN/i);
    expect(logoElement).toBeInTheDocument();
  });

  test('renders stats section', () => {
    render(<App />);
    expect(screen.getByText(/Total Apps/i)).toBeInTheDocument();
    expect(screen.getByText(/This Week/i)).toBeInTheDocument();
    expect(screen.getByText(/Interviews/i)).toBeInTheDocument();
  });

  test('renders footer text', () => {
    render(<App />);
    const footerElement = screen.getByText(/KAIZEN - CONTINUOUS JOB GROWTH/i);
    expect(footerElement).toBeInTheDocument();
  });
});
