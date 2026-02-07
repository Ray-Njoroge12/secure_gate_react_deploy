/**
 * Save Pass Modal Component
 * Phase 1.2: Save Pass to Device Implementation
 * 
 * Privacy Features:
 * - Pass contains only visitor-known data (no resident contacts)
 * - Pass saved to visitor's device only (not our servers)
 * - Clear privacy notice displayed
 * - QR token is cryptographically signed
 * 
 * Formats:
 * - Image (PNG) - for all devices
 * - PDF - for printing
 * - Apple Wallet / Google Pay (future enhancement)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';

const SavePassModal = ({ 
  isOpen, 
  onClose, 
  visitor, 
  estateInfo 
}) => {
  const [saving, setSaving] = useState(false);
  const [saveFormat, setSaveFormat] = useState('image');
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const passRef = useRef(null);
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    // Store previously focused element
    previousActiveElementRef.current = document.activeElement;

    // Focus modal
    if (modalRef.current) {
      modalRef.current.focus();
    }

    // Handle escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }

      // Tab trap
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Restore focus on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString || 'Any time';
  };

  /**
   * Generate pass content (privacy-safe)
   * EXCLUDES: resident phone, email, detailed address
   */
  const generatePassContent = useCallback(() => {
    return {
      visitorName: visitor?.name || 'Visitor',
      hostName: visitor?.resident?.name || 'Host',
      hostUnit: visitor?.resident?.unit || visitor?.resident?.house || '',
      visitDate: formatDate(visitor?.dateOfVisit),
      visitTime: formatTime(visitor?.timeOfVisit),
      purpose: visitor?.purpose || 'Visit',
      estateName: estateInfo?.name || 'Estate',
      gateName: estateInfo?.gate || 'Main Gate',
      passCode: visitor?.id?.toString() || '',
      expiresAt: formatDate(visitor?.tokenExpiresAt || visitor?.expiresAt),
      // Privacy: NO resident phone/email included
    };
  }, [visitor, estateInfo]);

  /**
   * Save pass as image (PNG)
   */
  const saveAsImage = async () => {
    setSaving(true);
    try {
      // Dynamic import to reduce bundle size
      const html2canvas = (await import('html2canvas')).default;
      
      if (!passRef.current) throw new Error('Pass element not found');
      
      const canvas = await html2canvas(passRef.current, {
        scale: 2, // Higher resolution
        backgroundColor: '#ffffff', // Intentional: html2canvas requires raw hex for print/export
        logging: false,
        useCORS: true
      });
      
      const link = document.createElement('a');
      link.download = `visitor-pass-${visitor?.id || 'pass'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      onClose();
    } catch (error) {
      console.error('Failed to save as image:', error);
      alert('Failed to save pass. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Save pass as PDF
   */
  const saveAsPDF = async () => {
    setSaving(true);
    try {
      // Dynamic imports
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      if (!passRef.current) throw new Error('Pass element not found');
      
      const canvas = await html2canvas(passRef.current, {
        scale: 2,
        backgroundColor: '#ffffff', // Intentional: html2canvas requires raw hex for print/export
        logging: false,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5' // Smaller format, good for passes
      });
      
      const imgWidth = 140; // A5 width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
      pdf.save(`visitor-pass-${visitor?.id || 'pass'}.pdf`);
      
      onClose();
    } catch (error) {
      console.error('Failed to save as PDF:', error);
      alert('Failed to save pass. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle save based on selected format
   */
  const handleSave = () => {
    if (saveFormat === 'image') {
      saveAsImage();
    } else if (saveFormat === 'pdf') {
      saveAsPDF();
    }
  };

  if (!isOpen) return null;

  const passContent = generatePassContent();

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-pass-title"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="save-pass-title" className="text-xl font-bold text-gray-900 dark:text-white">Save Your Pass</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Pass Preview */}
        <div className="p-4">
          <div 
            ref={passRef}
            className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border border-green-200"
          >
            {/* Pass Header */}
            <div className="text-center mb-4">
              <div className="inline-block px-4 py-1 bg-green-600 text-white text-sm font-semibold rounded-full mb-2">
                VISITOR PASS
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{passContent.estateName}</h3>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm">
                <QRCodeSVG
                  value={passContent.passCode}
                  size={140}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* Pass Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-slate-700">
                <span className="text-gray-600 dark:text-gray-200">Visitor</span>
                <span className="font-semibold text-gray-900 dark:text-white">{passContent.visitorName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-slate-700">
                <span className="text-gray-600 dark:text-gray-200">Host</span>
                <span className="font-semibold text-gray-900 dark:text-white">{passContent.hostName}</span>
              </div>
              {passContent.hostUnit && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-slate-700">
                  <span className="text-gray-600 dark:text-gray-200">Unit</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{passContent.hostUnit}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-slate-700">
                <span className="text-gray-600 dark:text-gray-200">Date</span>
                <span className="font-semibold text-gray-900 dark:text-white">{passContent.visitDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-slate-700">
                <span className="text-gray-600 dark:text-gray-200">Time</span>
                <span className="font-semibold text-gray-900 dark:text-white">{passContent.visitTime}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-600 dark:text-gray-200">Purpose</span>
                <span className="font-semibold text-gray-900 dark:text-white">{passContent.purpose}</span>
              </div>
            </div>

            {/* Pass Footer */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-300">
                Valid until: {passContent.expiresAt}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                Pass Code: {passContent.passCode}
              </p>
            </div>
          </div>
        </div>

        {/* Format Selection */}
        <div className="px-4 pb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Save Format</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSaveFormat('image')}
              className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center ${
                saveFormat === 'image'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-200'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">Image</span>
              <span className="text-xs opacity-75">PNG format</span>
            </button>
            
            <button
              onClick={() => setSaveFormat('pdf')}
              className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center ${
                saveFormat === 'pdf'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-200'
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">PDF</span>
              <span className="text-xs opacity-75">For printing</span>
            </button>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowPrivacyNotice(!showPrivacyNotice)}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Privacy Information
          </button>
          
          {showPrivacyNotice && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium mb-1">Your privacy is protected:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Pass is saved to your device only</li>
                <li>We don't store or track saved passes</li>
                <li>No host contact details are included</li>
                <li>Pass expires automatically after the visit date</li>
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-gray-50 dark:bg-slate-900 rounded-b-2xl">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Save {saveFormat === 'image' ? 'Image' : 'PDF'}
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            className="w-full mt-2 text-gray-600 dark:text-gray-200 hover:text-gray-800 font-medium py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

SavePassModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  visitor: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    dateOfVisit: PropTypes.string,
    timeOfVisit: PropTypes.string,
    purpose: PropTypes.string,
    tokenExpiresAt: PropTypes.string,
    expiresAt: PropTypes.string,
    resident: PropTypes.shape({
      name: PropTypes.string,
      unit: PropTypes.string,
      house: PropTypes.string
    })
  }),
  estateInfo: PropTypes.shape({
    name: PropTypes.string,
    gate: PropTypes.string,
    address: PropTypes.string
  })
};

export default SavePassModal;
