import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('qrcode.react', () => ({
  QRCodeSVG: (props) => <svg data-testid="qr-svg" {...props} />
}));

jest.mock('utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

jest.mock('../../components/ui', () => ({
  Button: ({ children, onClick, ...props }) => <button onClick={onClick} {...props}>{children}</button>,
  Toast: ({ message, onClose }) => <div role="alert">{message}<button onClick={onClose}>Close</button></div>,
}));

jest.mock('../../utils/responsive', () => ({
  useCurrentBreakpoint: () => 'md',
  TOUCH_SIZES: { qr: { md: 220 } },
}));

describe('QRCodeDisplay ARIA', () => {
  test('wrapper has role="img" and aria-label', async () => {
    const QRCodeDisplay = (await import('../../components/QRCodeDisplay')).default;
    render(<QRCodeDisplay value="test-qr-data" />);

    const qrWrapper = screen.getByRole('img', { name: /qr code/i });
    expect(qrWrapper).toBeInTheDocument();
  });
});
