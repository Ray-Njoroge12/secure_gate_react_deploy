import React, { useEffect, useRef, useState } from 'react';

import Icon from './Icon';

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
      <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            <div 
              className="w-16 h-16 bg-gradient-to-tr from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200 animate-in zoom-in duration-300"
            >
              <Icon name="CheckCircle" className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              {typeof success === 'string' ? 'Success!' : (success.title || 'Success!')}
            </h3>
            
            <div 
              ref={successRef}
              className="text-gray-600 dark:text-slate-300 mb-6 max-w-sm mx-auto"
              tabIndex={0}
            >
              {typeof success === 'string' ? success : (success.message || 'Operation completed successfully.')}
            </div>

            {/* Action Buttons */}
            {success.data?.inviteLink && (
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => copyToClipboard(success.data.inviteLink)}
                    className="flex items-center px-4 py-2 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors border border-gray-200 dark:border-slate-600"
                  >
                    <Icon name={copied ? "CheckCircle" : "Copy"} className="w-4 h-4 mr-2" />
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  
                  <button
                    onClick={shareViaWhatsApp}
                    className="flex items-center px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors shadow-sm"
                  >
                    <Icon name="MessageCircle" className="w-4 h-4 mr-2" />
                    {whatsappSent ? 'Opening...' : 'WhatsApp'}
                  </button>
                  
                   <button
                    onClick={shareViaWhatsAppDirect}
                    className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                    title="Share directly via WhatsApp"
                  >
                    <Icon name="Share2" className="w-4 h-4 mr-2" />
                    Direct
                  </button>
                </div>
                
                {/* QR Code Option */}
                {success.data.passCode && (
                   <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                      <div className="flex items-center justify-center text-sm text-gray-500 dark:text-slate-400 mb-2">
                         <Icon name="QrCode" className="w-4 h-4 mr-2" />
                         <span>Pass Code: <span className="font-mono font-bold text-gray-900 dark:text-slate-100">{success.data.passCode}</span></span>
                      </div>
                   </div>
                )}
              </div>
            )}

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close success message"
            >
              <Icon name="X" className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessDisplay;
