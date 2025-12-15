import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActivePlayerHand } from './ActivePlayerHand';
import { describe, it, expect } from 'vitest';

describe('ActivePlayerHand', () => {
  it('renders ONLY LOCKED overlay if both isLocked and hasStayed are true', () => {
    render(<ActivePlayerHand hand={[]} isLocked={true} hasStayed={true} />);

    expect(screen.getByText('LOCKED 🔒')).toBeInTheDocument();
    expect(screen.queryByText('STAYED 🛑')).not.toBeInTheDocument();
  });
});
