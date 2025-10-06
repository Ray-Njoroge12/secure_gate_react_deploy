import React, { useState, memo, useCallback, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Button, Toast } from './ui';
import { useCurrentBreakpoint, TOUCH_SIZES } from '../utils/responsive';

// QRCodeDisplay props:
// - value: string | data-url to encode
// - size: number (px) - will be overridden by responsive sizing
// - otp: optional string to show below
// - altImg: optional fallback data-url image
// - showCopyButton: boolean to show copy OTP button
const QRCodeDisplay = memo(function QRCodeDisplay({ value, size = 220, otp, altImg, showCopyButton = true }) {
  const [showToast, setShowToast] = useState(false);
  const breakpoint = useCurrentBreakpoint();
  const qrRef = useRef(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space or Enter to copy QR code data
      if ((e.key === ' ' || e.key === 'Enter') && e.target === qrRef.current) {
        e.preventDefault();
        if (value) {
          navigator.clipboard.writeText(value);
        }
      }
      // Escape to clear focus
      if (e.key === 'Escape' && qrRef.current) {
        qrRef.current.blur();
      }
      // Ctrl/Cmd + C to copy QR code data
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && qrRef.current) {
        e.preventDefault();
        if (value) {
          navigator.clipboard.writeText(value);
        }
      }
    };

    const qr = qrRef.current;
    if (qr) {
      qr.addEventListener('keydown', handleKeyDown);
      return () => qr.removeEventListener('keydown', handleKeyDown);
    }
  }, [value]);
  
  // Responsive QR code sizing
  const responsiveSize = TOUCH_SIZES.qr[breakpoint] || size;
  
  const wrapperClasses = 'flex flex-col items-center p-4 xs:p-6 sm:p-8 bg-white rounded-lg shadow-md max-w-full';
  const qrContainerClasses = 'bg-white p-3 xs:p-4 sm:p-6 rounded-md border border-gray-200 max-w-full overflow-hidden';

  // If value looks like a Data URL (svg/png) we render an <img> fallback (some libraries return dataURL)
  const isDataUrl = typeof value === 'string' && value.startsWith('data:');

  const handleCopyOTP = useCallback(async () => {
    if (otp && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(otp);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      } catch (error) {
        console.error('Failed to copy OTP:', error);
      }
    }
  }, [otp]);

  return (
    <>
      <div ref={qrRef} className={wrapperClasses} tabIndex={0}>
        <div className={qrContainerClasses}>
          {isDataUrl ? (
            <img 
              src={value} 
              alt="QR code for gate entry" 
              className="block w-full h-auto max-w-full"
              style={{ 
                width: responsiveSize, 
                height: responsiveSize, 
                maxWidth: '100%',
                maxHeight: '80vh'
              }}
            />
          ) : (
            <QRCode 
              value={value || ''} 
              size={responsiveSize} 
              fgColor="#111" 
              bgColor="#fff"
              aria-label="QR code for gate entry"
              style={{ 
                maxWidth: '100%', 
                height: 'auto',
                display: 'block'
              }}
            />
          )}
        </div>
        
        {otp && (
          <div className="mt-4 xs:mt-6 flex flex-col items-center gap-3 w-full max-w-sm">
            <div 
              className="text-sm xs:text-base sm:text-lg font-bold tracking-wider text-slate-800 bg-slate-100 px-3 xs:px-4 py-2 xs:py-3 rounded-md border font-mono text-center w-full break-all"
              aria-label={`One-time password: ${otp}`}
            >
              <span className="block xs:inline">OTP:</span>{' '}
              <span className="text-green-600 font-mono">{otp}</span>
            </div>
            
            {showCopyButton && (
              <Button 
                variant="outline" 
                size={breakpoint === 'xs' ? 'sm' : 'md'}
                onClick={handleCopyOTP}
                className="w-full xs:w-auto min-h-touch"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                }
                aria-label="Copy OTP to clipboard"
              >
                Copy OTP
              </Button>
            )}
          </div>
        )}
        
        <div className="mt-3 text-sm text-slate-600 text-center">
          <p>Present this QR code or OTP at the gate for entry</p>
        </div>
      </div>
      
      {showToast && (
        <Toast
          type="success"
          message="OTP copied to clipboard!"
          onClose={() => setShowToast(false)}
        />
      )}
    </>
  );
});

export default QRCodeDisplay;
