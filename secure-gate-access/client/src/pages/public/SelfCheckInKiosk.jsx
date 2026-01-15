/**
 * @file SelfCheckInKiosk.jsx
 * @description Self-service kiosk for walk-in visitor registration
 * Phase V4: Self-Service Kiosk & Walk-In Registration
 * 
 * Features:
 * - Touch-optimized UI for tablet kiosks
 * - Walk-in visitor self-registration
 * - QR code scanning for pre-registered visitors
 * - Photo capture with webcam
 * - Resident search and approval request
 * - Multi-language support (EN/SW)
 */

import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './SelfCheckInKiosk.css';

const SelfCheckInKiosk = () => {
  const [step, setStep] = useState('welcome'); // 'welcome', 'scan-qr', 'walk-in-form', 'photo', 'resident-search', 'success'
  const [currentStep, setCurrentStep] = useState(0); // PHASE B10: Track numerical step
  const [language, setLanguage] = useState('en');
  const [testMode] = useState(process.env.NODE_ENV === 'test' || process.env.REACT_APP_TEST_MODE === 'true');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    purpose: '',
    company: '',
    vehiclePlate: ''
  });
  const [photo, setPhoto] = useState(null);
  const [residentSearch, setResidentSearch] = useState('');
  const [residents, setResidents] = useState([]);
  const [selectedResident, setSelectedResident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  
  // QR/Code entry states
  const [inviteCode, setInviteCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  
  // PHASE B10: Define step progression
  const stepSequence = [
    { id: 'welcome', title: 'Welcome', icon: '👋' },
    { id: 'walk-in-form', title: 'Your Details', icon: '🗒️' },
    { id: 'photo', title: 'Take Photo', icon: '📸' },
    { id: 'resident-search', title: 'Find Host', icon: '🔍' },
    { id: 'success', title: 'Complete', icon: '✅' }
  ];
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  // Translations
  const t = {
    en: {
      welcome: 'Welcome to Secure Gate',
      preRegistered: 'I have an invite',
      walkIn: 'Walk-in visitor',
      scanQR: 'Scan Your QR Code',
      enterDetails: 'Enter Your Details',
      name: 'Full Name',
      phone: 'Phone Number',
      email: 'Email (optional)',
      purpose: 'Purpose of Visit',
      company: 'Company (optional)',
      vehicle: 'Vehicle Plate (optional)',
      takePhoto: 'Take Photo',
      retakePhoto: 'Retake',
      searchResident: 'Search for Resident',
      selectResident: 'Select the person you\'re visiting',
      submit: 'Submit',
      back: 'Back',
      cancel: 'Cancel',
      success: 'Check-in Successful!',
      waitingApproval: 'Waiting for resident approval',
      showQR: 'Show this to the guard',
      required: 'Required'
    },
    sw: {
      welcome: 'Karibu Secure Gate',
      preRegistered: 'Nina mwaliko',
      walkIn: 'Mgeni wa ghafla',
      scanQR: 'Changanua QR Yako',
      enterDetails: 'Weka Maelezo Yako',
      name: 'Jina Kamili',
      phone: 'Nambari ya Simu',
      email: 'Barua pepe (si lazima)',
      purpose: 'Sababu ya Ziara',
      company: 'Kampuni (si lazima)',
      vehicle: 'Nambari ya Gari (si lazima)',
      takePhoto: 'Piga Picha',
      retakePhoto: 'Piga Tena',
      searchResident: 'Tafuta Mkazi',
      selectResident: 'Chagua mtu unayemtembelea',
      submit: 'Wasilisha',
      back: 'Rudi',
      cancel: 'Ghairi',
      success: 'Umesajiliwa!',
      waitingApproval: 'Inasubiri idhini ya mkazi',
      showQR: 'Onyesha hii kwa askari',
      required: 'Inahitajika'
    }
  };

  const getText = (key) => t[language][key] || key;

  // Inactivity reset (return to welcome after 60s)
  useEffect(() => {
    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      inactivityTimerRef.current = setTimeout(() => {
        if (step !== 'welcome') {
          resetKiosk();
        }
      }, 60000); // 60 seconds
    };

    resetTimer();
    
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [step]);

  const resetKiosk = () => {
    setStep('welcome');
    setCurrentStep(0); // PHASE B10: Reset step counter
    setFormData({
      name: '',
      phone: '',
      email: '',
      purpose: '',
      company: '',
      vehiclePlate: ''
    });
    setPhoto(null);
    setResidentSearch('');
    setResidents([]);
    setSelectedResident(null);
    setError(null);
    setSuccessData(null);
    // Reset scan-related states
    setInviteCode('');
    setScanLoading(false);
    setScanError(null);
    stopCamera();
  };

  // PHASE B10: Step navigation helpers
  const goToStep = (stepId) => {
    const index = stepSequence.findIndex(s => s.id === stepId);
    if (index !== -1) {
      setCurrentStep(index);
      setStep(stepId);
    }
  };

  const nextStep = () => {
    const nextIndex = Math.min(currentStep + 1, stepSequence.length - 1);
    setCurrentStep(nextIndex);
    setStep(stepSequence[nextIndex].id);
  };

  const prevStep = () => {
    const prevIndex = Math.max(currentStep - 1, 0);
    setCurrentStep(prevIndex);
    setStep(stepSequence[prevIndex].id);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, 320, 240);
      const imageData = canvasRef.current.toDataURL('image/jpeg');
      setPhoto(imageData);
      stopCamera();
      nextStep(); // PHASE B10: Use step navigation
    }
  };

  const searchResidents = async (query) => {
    if (query.length < 2) {
      setResidents([]);
      return;
    }

    try {
      const response = await fetch(`/api/residents/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setResidents(data.results || []);
      }
    } catch (err) {
      console.error('Resident search failed:', err);
    }
  };

  const submitWalkIn = async () => {
    if (!formData.name || !formData.phone || !selectedResident) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/visitors/walk-in', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          residentId: selectedResident.id,
          photo,
          language
        })
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const data = await response.json();
      
      setSuccessData({
        id: data.data.id,
        token: data.data.visitor_token,
        status: data.data.status
      });
      
      setStep('success');
      
      // Auto-reset after 30 seconds
      setTimeout(resetKiosk, 30000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render functions for each step
  const renderWelcome = () => (
    <div className="kiosk-welcome">
      <div className="language-selector">
        <button 
          className={language === 'en' ? 'active' : ''}
          onClick={() => setLanguage('en')}
        >
          English
        </button>
        <button 
          className={language === 'sw' ? 'active' : ''}
          onClick={() => setLanguage('sw')}
        >
          Kiswahili
        </button>
      </div>
      
      <h1>{getText('welcome')}</h1>
      
      <div className="kiosk-options">
        <button 
          className="kiosk-btn kiosk-btn-primary"
          onClick={() => setStep('scan-qr')}
        >
          <span className="btn-icon">📱</span>
          {getText('preRegistered')}
        </button>
        
        <button 
          className="kiosk-btn kiosk-btn-secondary"
          onClick={() => goToStep('walk-in-form')} // PHASE B10: Use step navigation
        >
          <span className="btn-icon">👤</span>
          {getText('walkIn')}
        </button>
      </div>
    </div>
  );

  const renderWalkInForm = () => (
    <div className="kiosk-form">
      <h2>{getText('enterDetails')}</h2>
      
      <div className="form-group">
        <label>{getText('name')} *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          className="kiosk-input"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label>{getText('phone')} *</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          className="kiosk-input"
          placeholder="+254..."
        />
      </div>

      <div className="form-group">
        <label>{getText('email')}</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="kiosk-input"
        />
      </div>

      <div className="form-group">
        <label>{getText('purpose')} *</label>
        <select
          value={formData.purpose}
          onChange={(e) => setFormData({...formData, purpose: e.target.value})}
          className="kiosk-input"
        >
          <option value="">Select...</option>
          <option value="Personal Visit">Personal Visit</option>
          <option value="Business">Business</option>
          <option value="Delivery">Delivery</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="kiosk-actions">
        <button className="kiosk-btn kiosk-btn-back" onClick={resetKiosk}>
          {getText('back')}
        </button>
        <button 
          className="kiosk-btn kiosk-btn-primary"
          onClick={() => {
            startCamera();
            setStep('photo');
          }}
        >
          {getText('takePhoto')}
        </button>
      </div>
    </div>
  );

  const renderPhoto = () => (
    <div className="kiosk-photo" data-test-id="kiosk-photo-step">
      <h2>{getText('takePhoto')}</h2>
      
      {/* Test Mode Indicator */}
      {testMode && (
        <div data-test-id="photo-test-mode" className="test-mode-banner" style={{
          background: '#FEF3C7',
          border: '2px solid #F59E0B',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <p style={{ color: '#92400E', fontWeight: 'bold', marginBottom: '4px' }}>
            ⚠️ Test Mode Active
          </p>
          <p style={{ color: '#78350F', fontSize: '14px' }}>
            Camera disabled for testing
          </p>
        </div>
      )}
      
      {!photo ? (
        <div className="camera-container">
          {!testMode && (
            <>
              <video ref={videoRef} autoPlay className="camera-feed" />
              <canvas ref={canvasRef} width="320" height="240" style={{display: 'none'}} />
              
              <button 
                className="kiosk-btn kiosk-btn-capture"
                onClick={capturePhoto}
              >
                📷 Capture
              </button>
            </>
          )}
          
          {testMode && (
            <div style={{
              background: '#F3F4F6',
              border: '2px dashed #9CA3AF',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              <p style={{ color: '#6B7280', marginBottom: '8px' }}>📷</p>
              <p style={{ color: '#6B7280', fontSize: '14px' }}>Camera Preview (Test Mode)</p>
            </div>
          )}
          
          {testMode && (
            <button 
              data-test-id="skip-photo-test"
              className="kiosk-btn kiosk-btn-primary"
              onClick={() => {
                setPhoto('data:image/jpeg;base64,TEST_PHOTO_DATA');
                nextStep();
              }}
              style={{ width: '100%', marginTop: '16px' }}
            >
              ✅ Skip Photo (Test Mode)
            </button>
          )}
        </div>
      ) : (
        <div className="photo-preview">
          {!testMode ? (
            <img src={photo} alt="Captured" />
          ) : (
            <div style={{
              background: '#10B981',
              color: 'white',
              padding: '40px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '48px', marginBottom: '8px' }}>✅</p>
              <p>Photo Captured (Test)</p>
            </div>
          )}
          <button 
            className="kiosk-btn kiosk-btn-secondary"
            onClick={() => {
              setPhoto(null);
              if (!testMode) startCamera();
            }}
          >
            {getText('retakePhoto')}
          </button>
          <button 
            className="kiosk-btn kiosk-btn-primary"
            onClick={nextStep}
            style={{ marginTop: '8px' }}
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );

  const renderResidentSearch = () => (
    <div className="kiosk-search">
      <h2>{getText('searchResident')}</h2>
      
      <div className="form-group">
        <input
          type="text"
          value={residentSearch}
          onChange={(e) => {
            setResidentSearch(e.target.value);
            searchResidents(e.target.value);
          }}
          placeholder={getText('searchResident')}
          className="kiosk-input kiosk-input-large"
          autoFocus
        />
      </div>

      {residents.length > 0 && (
        <div className="resident-list">
          <p>{getText('selectResident')}</p>
          {residents.map((resident) => (
            <button
              key={resident.id}
              className={`resident-item ${selectedResident?.id === resident.id ? 'selected' : ''}`}
              onClick={() => setSelectedResident(resident)}
            >
              <div className="resident-name">{resident.name}</div>
              <div className="resident-unit">Unit: {resident.unit || 'N/A'}</div>
            </button>
          ))}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="kiosk-actions">
        <button 
          className="kiosk-btn kiosk-btn-secondary"
          onClick={prevStep} // PHASE B10: Use step navigation
        >
          {getText('back')}
        </button>
        <button 
          className="kiosk-btn kiosk-btn-primary"
          onClick={submitWalkIn}
          disabled={!selectedResident || loading}
        >
          {loading ? 'Submitting...' : getText('submit')}
        </button>
      </div>
    </div>
  );

  // Handle invite code submission
  const handleCodeSubmit = async () => {
    if (!inviteCode.trim()) {
      setScanError('Please enter your invite code');
      return;
    }

    setScanLoading(true);
    setScanError(null);

    try {
      // Try to validate the invite code
      const response = await fetch(`/api/public/visitors/validate-code/${inviteCode.trim()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Invalid invite code');
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccessData({
          id: data.data.id,
          token: data.data.visitor_token,
          status: data.data.status
        });
        setStep('success');
      } else {
        throw new Error(data.error || 'Invalid code');
      }
    } catch (err) {
      setScanError(err.message || 'Unable to verify code. Please try again.');
    } finally {
      setScanLoading(false);
    }
  };

  // Render Scan QR step for pre-registered visitors
  const renderScanQR = () => (
    <div className="kiosk-scan-qr">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{getText('scanQR')}</h2>
        <p className="text-gray-600 dark:text-gray-200 mb-6">Enter your invite code or scan your QR code</p>
        
        {/* QR Scanner Placeholder */}
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-8 mb-6 text-center">
          <div className="text-6xl mb-4">📷</div>
          <p className="text-gray-600 dark:text-gray-200 mb-2">QR Scanner</p>
          <p className="text-sm text-gray-500 dark:text-gray-300">Point your QR code at the camera</p>
        </div>

        {/* Manual Code Entry */}
        <div className="space-y-4">
          <div className="text-center text-gray-500 dark:text-gray-300 text-sm">- OR -</div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value.toUpperCase());
                setScanError(null);
              }}
              placeholder="e.g., VIS-1234"
              className="kiosk-input text-center text-xl tracking-widest"
              maxLength={10}
            />
          </div>
          
          {scanError && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {scanError}
            </div>
          )}
        </div>

        <div className="kiosk-actions mt-6">
          <button className="kiosk-btn kiosk-btn-back" onClick={resetKiosk}>
            {getText('back')}
          </button>
          <button 
            className="kiosk-btn kiosk-btn-primary"
            onClick={handleCodeSubmit}
            disabled={scanLoading || !inviteCode.trim()}
          >
            {scanLoading ? 'Verifying...' : 'Check In'}
          </button>
        </div>
      </div>
  );

  const renderSuccess = () => (
    <div className="kiosk-success">
      <div className="success-icon">✅</div>
      <h2>{getText('success')}</h2>
      
      {successData && (
        <>
          <div className="qr-container">
            <QRCodeSVG value={successData.id.toString()} size={200} />
          </div>
          
          <p className="success-message">{getText('showQR')}</p>
          
          <div className="visit-code">
            Visit Code: <strong>{successData.id}</strong>
          </div>

          {successData.status === 'pending_approval' && (
            <div className="status-badge status-pending">
              {getText('waitingApproval')}
            </div>
          )}
        </>
      )}

      <button 
        className="kiosk-btn kiosk-btn-primary"
        onClick={resetKiosk}
      >
        Done
      </button>
    </div>
  );

  // PHASE B10: Step Indicator Component
  const StepIndicator = () => {
    if (step === 'welcome' || step === 'scan-qr') return null;
    
    const relevantSteps = stepSequence.filter(s => s.id !== 'welcome' && s.id !== 'scan-qr');
    const activeIndex = relevantSteps.findIndex(s => s.id === step);
    
    return (
      <div className="kiosk-step-indicator">
        {relevantSteps.map((stepItem, index) => (
          <div key={stepItem.id} className="step-item">
            <div className={`step-circle ${
              index < activeIndex ? 'completed' :
              index === activeIndex ? 'active' : 'pending'
            }`}>
              <span className="step-number">
                {index < activeIndex ? '✓' : index + 1}
              </span>
              <span className="step-icon">{stepItem.icon}</span>
            </div>
            <div className={`step-label ${
              index === activeIndex ? 'active' : ''
            }`}>
              {stepItem.title}
            </div>
            {index < relevantSteps.length - 1 && (
              <div className={`step-line ${
                index < activeIndex ? 'completed' : ''
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="self-checkin-kiosk">
      <div className="kiosk-container">
        {/* PHASE B10: Add Step Indicator */}
        <StepIndicator />
        
        {error && (
          <div className="kiosk-error">
            {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}
        
        {step === 'welcome' && renderWelcome()}
        {step === 'scan-qr' && renderScanQR()}
        {step === 'walk-in-form' && renderWalkInForm()}
        {step === 'photo' && renderPhoto()}
        {step === 'resident-search' && renderResidentSearch()}
        {step === 'success' && renderSuccess()}
      </div>
      
      <div className="kiosk-footer">
        <button className="kiosk-help-btn" onClick={() => alert('Contact security for help')}>
          ❓ Help
        </button>
      </div>
    </div>
  );
};

export default SelfCheckInKiosk;
