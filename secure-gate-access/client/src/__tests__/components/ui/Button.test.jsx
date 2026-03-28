import React from 'react';
import { render, screen } from '@testing-library/react';

import Button from '../../../components/ui/Button';

describe('Button', () => {
  test('merges conflicting tailwind spacing classes with custom className overrides', () => {
    render(
      <Button size="sm" className="px-8 py-4">
        Click
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Click' });
    expect(button.className).toContain('px-8');
    expect(button.className).toContain('py-4');
    expect(button.className).not.toContain('px-3');
    expect(button.className).not.toContain('py-1.5');
  });
});
