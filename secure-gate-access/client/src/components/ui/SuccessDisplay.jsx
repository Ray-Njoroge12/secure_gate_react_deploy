import React from 'react';
import { CheckCircle, Copy, ExternalLink, QrCode, X } from 'lucide-react';

const SuccessDisplay = ({ 
  success, 
  onClose, 
  className = '' 
}) => {
  if (!success) return null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md ${className}`}>
      <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 shadow-lg">
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
                  <div className="bg-green-100 rounded p-3">
                    <p className="text-sm font-medium mb-2">Invite Link:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={success.data.inviteLink}
                        readOnly
                        className="flex-1 text-xs bg-white border border-green-300 rounded px-2 py-1"
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
