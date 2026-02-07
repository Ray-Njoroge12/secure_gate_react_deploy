import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, Copy, ExternalLink, QrCode, X, MessageCircle, Share2 } from 'lucide-react';

const SuccessDisplay = ({ 
  success, 
  onClose, 
  className = '' 
}) => {
  const successRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close
      if (e.key === 'Escape' && successRef.current) {
        onClose?.();
      }
      // Space or Enter to close
      if ((e.key === ' ' || e.key === 'Enter') && e.target === successRef.current) {
        e.preventDefault();
        onClose?.();
      }
      // Ctrl/Cmd + C to copy success message
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && successRef.current) {
        e.preventDefault();
        const successText = successRef.current.textContent;
        if (successText) {
          navigator.clipboard.writeText(successText);
        }
      }
    };

    const successElement = successRef.current;
    if (successElement) {
      successElement.addEventListener('keydown', handleKeyDown);
      return () => successElement.removeEventListener('keydown', handleKeyDown);
    }
  }, [onClose]);

  if (!success) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    if (!success.data?.inviteLink) return;
    
    const visitorName = success.data.visitor?.name || 'Guest';
    const visitDate = success.data.visitor?.dateOfVisit 
      ? new Date(success.data.visitor.dateOfVisit).toLocaleDateString('en-KE', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'your scheduled date';
    
    const message = encodeURIComponent(
      `🏠 You're invited!\n\n` +
      `Hi ${visitorName}! You've been invited to visit.\n\n` +
      `📅 Date: ${visitDate}\n\n` +
      `Tap the link below to get your digital pass:\n` +
      `${success.data.inviteLink}\n\n` +
      `Show this pass at the gate for entry. ✅`
    );
    
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setWhatsappSent(true);
    setTimeout(() => setWhatsappSent(false), 3000);
  };

  // Share via WhatsApp to specific phone
  const shareViaWhatsAppDirect = () => {
    if (!success.data?.inviteLink || !success.data?.visitor?.phone) return;
    
    const visitorName = success.data.visitor?.name || 'Guest';
    const visitDate = success.data.visitor?.dateOfVisit 
      ? new Date(success.data.visitor.dateOfVisit).toLocaleDateString('en-KE', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        })
      : 'your scheduled date';
    
    // Format phone number for WhatsApp (remove leading 0, add 254 for Kenya)
    let phoneNumber = success.data.visitor.phone.replace(/\s/g, '');
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '254' + phoneNumber.substring(1);
    } else if (phoneNumber.startsWith('+')) {
      phoneNumber = phoneNumber.substring(1);
    }
    
    const message = encodeURIComponent(
      `🏠 You're invited!\n\n` +
      `Hi ${visitorName}! You've been invited to visit.\n\n` +
      `📅 Date: ${visitDate}\n\n` +
      `Tap the link below to get your digital pass:\n` +
      `${success.data.inviteLink}\n\n` +
      `Show this pass at the gate for entry. ✅`
    );
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setWhatsappSent(true);
    setTimeout(() => setWhatsappSent(false), 3000);
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md ${className}`}>
      <div ref={successRef} className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 shadow-lg" tabIndex={0}>
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-2">
              {success.message || 'Success!'}
            </h4>
            
            {success.data && (
              <div className="space-y-3">
                {success.data.visitor && (
                  <div className="bg-green-100 rounded p-3">
                    <p className="text-sm font-medium">Visitor Created:</p>
                    <p className="text-sm">{success.data.visitor.name}</p>
                    <p className="text-xs text-green-600">
                      Invite Code: {success.data.visitor.inviteCode}
                    </p>
                  </div>
                )}
                
                {success.data.inviteLink && (
                  <div className="bg-green-100 rounded p-3 space-y-3">
                    <p className="text-sm font-medium">Invite Link:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={success.data.inviteLink}
                        readOnly
                        className="flex-1 text-xs bg-white dark:bg-slate-800 border border-green-300 rounded px-2 py-1"
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        onClick={() => copyToClipboard(success.data.inviteLink)}
                        className="p-1 hover:bg-green-200 rounded"
                        title="Copy link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copied && (
                      <p className="text-xs text-green-600">✓ Copied to clipboard!</p>
                    )}
                    
                    {/* WhatsApp Share Buttons */}
                    <div className="border-t border-green-200 pt-3 mt-2 space-y-2">
                      <p className="text-xs font-medium text-green-700">Share via WhatsApp:</p>
                      
                      {success.data.visitor?.phone && (
                        <button
                          onClick={shareViaWhatsAppDirect}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {whatsappSent ? '✓ Opening WhatsApp...' : `Send to ${success.data.visitor.name}`}
                        </button>
                      )}
                      
                      <button
                        onClick={shareViaWhatsApp}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded-lg border border-green-300 transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Share (choose contact)
                      </button>
                    </div>
                  </div>
                )}
                
                {success.data.pass && (
                  <div className="bg-green-100 rounded p-3">
                    <p className="text-sm font-medium mb-2">QR Pass Generated:</p>
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      <span className="text-xs">Pass ID: {success.data.pass.passId}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 ml-3 text-green-400 hover:text-green-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuccessDisplay;
