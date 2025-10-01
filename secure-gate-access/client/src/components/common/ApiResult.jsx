import React from 'react';
import { Card, Badge, Button, Loading } from '../ui';
import QRCodeDisplay from '../QRCodeDisplay';

/**
 * Reusable component for displaying API operation results (success/error states)
 * @param {Object} props - Component props
 * @param {Object} props.result - Result object from API call
 * @param {boolean} props.loading - Loading state
 * @param {string} props.error - Error message
 * @param {Function} props.onRetry - Optional retry callback
 * @param {Function} props.onClose - Optional close callback
 * @param {boolean} props.showRetry - Whether to show retry button
 * @param {boolean} props.showClose - Whether to show close button
 * @param {string} props.variant - Card variant ('success', 'error', 'info')
 * @param {Object} props.cardProps - Additional props for Card component
 */
export const ApiResult = ({
  result,
  loading,
  error,
  onRetry,
  onClose,
  showRetry = true,
  showClose = true,
  variant = 'success',
  cardProps = {},
  ...props
}) => {
  // Determine card styling based on state
  const getCardVariant = () => {
    if (error) return 'error';
    if (result) return 'success';
    return variant;
  };

  const getCardClassName = () => {
    const baseClasses = 'mb-6';
    if (error) return `${baseClasses} border-red-700 bg-red-900/20`;
    if (result) return `${baseClasses} border-green-700 bg-green-900/20`;
    return baseClasses;
  };

  const getTitleColor = () => {
    if (error) return 'text-red-200';
    if (result) return 'text-green-200';
    return 'text-slate-200';
  };

  const getTextColor = () => {
    if (error) return 'text-red-300';
    if (result) return 'text-green-300';
    return 'text-slate-300';
  };

  // Loading state
  if (loading) {
    return (
      <Card className="mb-6 border-slate-700 bg-slate-900/20" {...cardProps}>
        <Card.Content className="flex items-center justify-center py-8">
          <Loading size="md" text="Processing..." />
        </Card.Content>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={getCardClassName()} {...cardProps}>
        <Card.Header>
          <div className="flex items-center gap-3">
            <Badge variant="error">Error</Badge>
            <Card.Title className={getTitleColor()}>Operation Failed</Card.Title>
          </div>
        </Card.Header>
        <Card.Content className="space-y-4">
          <p className={getTextColor()}>{error}</p>
          {(showRetry || showClose) && (
            <div className="flex gap-3">
              {showRetry && onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  Try Again
                </Button>
              )}
              {showClose && onClose && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          )}
        </Card.Content>
      </Card>
    );
  }

  // Success state with result
  if (result) {
    return (
      <Card className={getCardClassName()} {...cardProps}>
        <Card.Header>
          <div className="flex items-center gap-3">
            <Badge variant="success">Success</Badge>
            <Card.Title className={getTitleColor()}>
              {result.title || 'Operation Successful'}
            </Card.Title>
          </div>
        </Card.Header>
        <Card.Content className="space-y-4">
          {result.message && (
            <p className={getTextColor()}>{result.message}</p>
          )}

          {/* Visitor-specific result display */}
          {result.visitor && (
            <VisitorResultDisplay visitor={result.visitor} />
          )}

          {/* Pass-specific result display */}
          {result.pass && (
            <PassResultDisplay pass={result.pass} />
          )}

          {/* Invite link display */}
          {result.inviteLink && (
            <InviteLinkDisplay inviteLink={result.inviteLink} />
          )}

          {/* OTP display */}
          {result.otp && (
            <OtpDisplay otp={result.otp} />
          )}

          {/* QR Code display */}
          {result.qrCode && (
            <QrCodeDisplay qrCode={result.qrCode} otp={result.otp} />
          )}

          {/* Generic data display */}
          {result.data && !result.visitor && !result.pass && (
            <GenericDataDisplay data={result.data} />
          )}

          {/* Action buttons */}
          {(showRetry || showClose) && (
            <div className="flex gap-3">
              {showRetry && onRetry && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  {result.retryText || 'Retry'}
                </Button>
              )}
              {showClose && onClose && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  {result.closeText || 'Close'}
                </Button>
              )}
            </div>
          )}
        </Card.Content>
      </Card>
    );
  }

  return null;
};

/**
 * Component for displaying visitor result details
 */
const VisitorResultDisplay = ({ visitor }) => (
  <div className="space-y-2">
    <h4 className="font-medium text-green-200">Visitor Details:</h4>
    <div className="grid gap-2">
      <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
        <span className="text-sm text-slate-300">Visitor ID:</span>
        <Badge variant="info">{visitor.id}</Badge>
      </div>
      <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
        <span className="text-sm text-slate-300">Status:</span>
        <Badge variant="success">{visitor.status}</Badge>
      </div>
      {visitor.name && (
        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <span className="text-sm text-slate-300">Name:</span>
          <span className="text-sm text-slate-200">{visitor.name}</span>
        </div>
      )}
    </div>
  </div>
);

/**
 * Component for displaying pass result details
 */
const PassResultDisplay = ({ pass }) => (
  <div className="space-y-2">
    <h4 className="font-medium text-green-200">Access Pass Details:</h4>
    <div className="grid gap-2">
      <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
        <span className="text-sm text-slate-300">Pass ID:</span>
        <Badge variant="info">{pass.passId || pass.id}</Badge>
      </div>
      {pass.expiresAt && (
        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <span className="text-sm text-slate-300">Expires:</span>
          <span className="text-sm text-slate-200">
            {new Date(pass.expiresAt).toLocaleDateString()}
          </span>
        </div>
      )}
      {pass.status && (
        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <span className="text-sm text-slate-300">Status:</span>
          <Badge variant="success">{pass.status}</Badge>
        </div>
      )}
    </div>
  </div>
);

/**
 * Component for displaying invite link
 */
const InviteLinkDisplay = ({ inviteLink }) => (
  <div className="space-y-2">
    <h4 className="font-medium text-green-200">Invite Link:</h4>
    <div className="p-3 bg-slate-800 rounded-lg break-all text-sm font-mono">
      {inviteLink}
    </div>
    <Button
      variant="secondary"
      size="sm"
      onClick={() => navigator.clipboard.writeText(inviteLink)}
    >
      Copy Link
    </Button>
  </div>
);

/**
 * Component for displaying OTP
 */
const OtpDisplay = ({ otp }) => (
  <div className="text-center">
    <p className="text-sm text-slate-300 mb-2">One-Time Password:</p>
    <div className="inline-block p-2 bg-slate-800 rounded-lg font-mono text-lg">
      {otp}
    </div>
  </div>
);

/**
 * Component for displaying QR code
 */
const QrCodeDisplay = ({ qrCode, otp }) => (
  <div className="flex justify-center">
    <QRCodeDisplay value={qrCode} size={180} otp={otp} />
  </div>
);

/**
 * Component for displaying generic data
 */
const GenericDataDisplay = ({ data }) => {
  if (typeof data === 'object') {
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-green-200">Details:</h4>
        <pre className="p-3 bg-slate-800 rounded-lg text-sm overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-3 bg-slate-800 rounded-lg">
      <span className="text-sm text-slate-200">{String(data)}</span>
    </div>
  );
};

export default ApiResult;
