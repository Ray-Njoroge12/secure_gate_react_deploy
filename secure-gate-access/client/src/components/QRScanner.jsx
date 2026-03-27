import jsQR from 'jsqr';
import React, { useRef, useEffect, useState } from 'react';
import logger from 'utils/logger';

import { Card, Button } from './ui';
import Icon from './ui/Icon';

const QRScanner = ({ onScan, onError, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const modalRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [flashlightSupported, setFlashlightSupported] = useState(false);
  const streamRef = useRef(null);
  const previousActiveElement = useRef(null);

  /**
   * QR code detection using production-ready jsQR library
   * Provides accurate QR code scanning with proper error handling
   */
  const detectQRCode = (canvas) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Use jsQR library for robust QR code detection
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert', // Try standard QR codes first (faster)
    });

    if (code) {
      logger.info('QR Code detected:', code.data);
      return {
        data: code.data,
        location: code.location
      };
    }

    return null;
  };

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Get available cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);

      if (videoDevices.length === 0) {
        throw new Error('No camera devices found');
      }

      // Use the first available camera or selected device
      const deviceId = selectedDevice || videoDevices[0].deviceId;

      const constraints = {
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment' // Use back camera if available
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Check if flashlight/torch is supported
      const track = stream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = track.getCapabilities();
          if (capabilities && capabilities.torch) {
            setFlashlightSupported(true);
          }
        } catch (e) {
          // Torch not supported
          setFlashlightSupported(false);
        }
      }

      // Start scanning loop
      scanLoop();
    } catch (err) {
      logger.error('Error accessing camera:', err);
      setError(err.message);
      setIsScanning(false);
      onError?.(err.message);
    }
  };

  const scanLoop = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Draw video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Try to detect QR code
    const qrCode = detectQRCode(canvas);

    if (qrCode) {
      onScan?.(qrCode.data);
      stopScanning();
    } else {
      // Continue scanning
      requestAnimationFrame(scanLoop);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    setFlashlightOn(false);
    setFlashlightSupported(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Toggle flashlight/torch
  const toggleFlashlight = async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newState = !flashlightOn;
      await track.applyConstraints({
        advanced: [{ torch: newState }]
      });
      setFlashlightOn(newState);
    } catch (err) {
      logger.error('Error toggling flashlight:', err);
      setFlashlightSupported(false);
    }
  };

  const handleClose = () => {
    stopScanning();
    onClose?.();
  };

  // Focus management
  useEffect(() => {
    // Store the previously focused element
    previousActiveElement.current = document.activeElement;

    // Focus the modal when it opens
    setTimeout(() => {
      modalRef.current?.focus();
    }, 100);

    return () => {
      stopScanning();
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, []);

  // Auto-start camera scanning when modal opens
  useEffect(() => {
    // Automatically start scanning when component mounts
    startScanning();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space to start/stop scanning
      if (e.key === ' ') {
        e.preventDefault();
        if (isScanning) {
          stopScanning();
        } else {
          startScanning();
        }
      }
      // Escape to close
      if (e.key === 'Escape') {
        handleClose();
      }
      // Ctrl/Cmd + S to start scanning
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isScanning) {
          startScanning();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isScanning, handleClose, startScanning, stopScanning]);

  // Note: keyboard navigation (Space, Escape, Ctrl+S) is handled
  // in the single useEffect above (lines 180-206) to avoid duplicate handlers

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
    >
      <Card
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-md mx-4 focus:outline-none"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 id="qr-scanner-title" className="text-lg font-semibold">QR Code Scanner</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300"
            >
              ✕
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="relative mb-4">
            <video
              ref={videoRef}
              className="w-full h-64 bg-gray-200 rounded-lg"
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            {isScanning && (
              <>
                <div className="absolute inset-0 border-2 border-blue-500 rounded-lg">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white rounded"></div>
                </div>

                {/* Flashlight Toggle Button */}
                {flashlightSupported && (
                  <Button
                    onClick={toggleFlashlight}
                    className={`absolute top-3 right-3 p-3 rounded-full transition-all shadow-lg ${flashlightOn
                        ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                        : 'bg-gray-800 bg-opacity-70 text-white hover:bg-opacity-90'
                      }`}
                    title={flashlightOn ? 'Turn off flashlight' : 'Turn on flashlight'}
                    aria-label={flashlightOn ? 'Turn off flashlight' : 'Turn on flashlight'}
                  >
                    {flashlightOn ? (
                      <Icon name="flashlight" className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Icon name="flashlight-off" className="w-5 h-5" aria-hidden="true" />
                    )}
                  </Button>
                )}
              </>
            )}
          </div>

          {devices.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Camera:
              </label>
              <select
                value={selectedDevice || ''}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isScanning}
              >
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            {!isScanning ? (
              <Button
                onClick={startScanning}
                className="flex-1"
                disabled={devices.length === 0}
              >
                Start Scanning
              </Button>
            ) : (
              <Button
                onClick={stopScanning}
                variant="outline"
                className="flex-1"
              >
                Stop Scanning
              </Button>
            )}
            <Button
              onClick={handleClose}
              variant="ghost"
            >
              Cancel
            </Button>
          </div>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-200">
            <p>• Point your camera at a QR code</p>
            <p>• Make sure the QR code is well-lit and in focus</p>
            <p>• The scanner will automatically detect and process the code</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default QRScanner;
