import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

function StatusExample() { return <main><h1>MaskChat</h1><p>Anonymous peer mentorship</p></main>; }
describe('client test setup', () => {
  it('renders a basic accessible application heading', () => {
    render(<StatusExample />);
    expect(screen.getByRole('heading', { name: 'MaskChat' })).toBeInTheDocument();
  });
});
