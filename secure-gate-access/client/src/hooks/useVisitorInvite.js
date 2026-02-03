import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useVisitorInvite Hook
 * Manages visitor invite data fetching, status polling, and expiry countdown
 * 
 * Enhanced with:
 * - Offline detection and handling
 * - Retry logic with exponential backoff
 * - Better error messages
 * - Cached data support
 */
export const useVisitorInvite = (token) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visitor, setVisitor] = useState(null);
    const [estateInfo, setEstateInfo] = useState(null);
    const [statusPolling, setStatusPolling] = useState(false);
    const [expiryCountdown, setExpiryCountdown] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [retryCount, setRetryCount] = useState(0);

    const pollingIntervalRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const retryTimeoutRef = useRef(null);

    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            // Retry fetching when coming back online
            if (error && token) {
                fetchVisitorDetails();
            }
        };
        const handleOffline = () => setIsOffline(true);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [error, token]);

    // Fetch with retry logic
    const fetchWithRetry = useCallback(async (url, options = {}, maxRetries = 3) => {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (!navigator.onLine) {
                    throw new Error('You are offline. Please check your internet connection.');
                }
                
                const response = await fetch(url, options);
                
                // Handle rate limiting
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After') || 5;
                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                        continue;
                    }
                    throw new Error('Too many requests. Please wait a moment and try again.');
                }
                
                return response;
            } catch (err) {
                lastError = err;
                
                // Don't retry on certain errors
                if (err.message.includes('offline')) {
                    throw err;
                }
                
                // Exponential backoff
                if (attempt < maxRetries) {
                    await new Promise(resolve => 
                        setTimeout(resolve, Math.pow(2, attempt) * 1000)
                    );
                }
            }
        }
        
        throw lastError;
    }, []);

    // Fetch estate information
    const fetchEstateInfo = useCallback(async (estateId) => {
        try {
            if (!estateId) return;

            const response = await fetchWithRetry(`/api/public/estate-info?estateId=${estateId}`);
            const data = await response.json();

            if (data.success) {
                setEstateInfo(data.data);
                // Cache estate info in sessionStorage
                try {
                    sessionStorage.setItem(`estate_${estateId}`, JSON.stringify(data.data));
                } catch (e) {
                    // Ignore storage errors
                }
            } else {
                console.warn('Failed to load estate info:', data.error);
            }
        } catch (err) {
            console.error('Failed to load estate info:', err);
            // Try to load from cache
            try {
                const cached = sessionStorage.getItem(`estate_${estateId}`);
                if (cached) {
                    setEstateInfo(JSON.parse(cached));
                }
            } catch (e) {
                // Ignore
            }
        }
    }, [fetchWithRetry]);

    // Fetch visitor or invite details
    const fetchVisitorDetails = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Determine if this is a specific visitor token (vst_) or a generic invite code (inv_)
            const isBulkInvite = token.startsWith('inv_');
            const endpoint = isBulkInvite
                ? `/api/public/invites/${token}`
                : `/api/public/visitors/by-token/${token}`;

            const response = await fetchWithRetry(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('This invitation could not be found. It may have been cancelled or the link is incorrect.');
                } else if (response.status === 410) {
                    throw new Error('This invitation has expired. Please contact your host for a new invitation.');
                } else if (response.status === 429) {
                    throw new Error('Too many requests. Please wait a moment and try again.');
                } else {
                    throw new Error('Unable to load your invitation. Please try again.');
                }
            }

            const data = await response.json();

            if (data.success || isBulkInvite) {
                const payload = data.data || data;

                if (isBulkInvite) {
                    setVisitor({
                        isBulkInvite: true,
                        eventName: payload.eventName || payload.event_name,
                        dateOfVisit: payload.date,
                        timeOfVisit: payload.time,
                        inviteCode: token,
                        remainingSlots: payload.remainingSlots,
                        expiresAt: payload.expiresAt
                    });
                } else {
                    setVisitor(payload);
                    // Cache visitor data for offline viewing
                    try {
                        sessionStorage.setItem(`visitor_${token}`, JSON.stringify(payload));
                    } catch (e) {
                        // Ignore storage errors
                    }
                    
                    if (payload.estateId) {
                        await fetchEstateInfo(payload.estateId);
                    }
                }
                setRetryCount(0);
            } else {
                throw new Error(data.error || 'Failed to load invitation');
            }
        } catch (err) {
            // Try to load from cache if offline
            if (!navigator.onLine) {
                try {
                    const cached = sessionStorage.getItem(`visitor_${token}`);
                    if (cached) {
                        setVisitor(JSON.parse(cached));
                        setError('You are offline. Showing cached data.');
                        return;
                    }
                } catch (e) {
                    // Ignore
                }
            }
            setError(err.message);
            setRetryCount(prev => prev + 1);
        } finally {
            setLoading(false);
        }
    }, [token, fetchWithRetry, fetchEstateInfo]);

    // Poll for status updates
    const pollStatus = useCallback(async () => {
        if (!token || !visitor || !navigator.onLine) return;

        try {
            const response = await fetch(`/api/public/visitors/${token}/status`);
            const data = await response.json();

            if (data.success && data.data.status !== visitor.status) {
                await fetchVisitorDetails();
            }
        } catch (err) {
            console.error('Status poll failed:', err);
        }
    }, [token, visitor, fetchVisitorDetails]);

    // Calculate expiry countdown
    const calculateCountdown = useCallback(() => {
        if (!visitor) return null;

        let expiryDate;
        if (visitor.tokenExpiresAt) {
            expiryDate = new Date(visitor.tokenExpiresAt);
        } else if (visitor.expiresAt) {
            expiryDate = new Date(visitor.expiresAt);
        } else if (visitor.dateOfVisit) {
            expiryDate = new Date(visitor.dateOfVisit);
            expiryDate.setHours(23, 59, 59, 999);
        } else {
            return null;
        }

        if (Number.isNaN(expiryDate.getTime())) return null;

        const now = new Date();
        const diff = expiryDate.getTime() - now.getTime();

        if (diff <= 0) {
            return { expired: true, text: 'Expired', color: 'red' };
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
            return {
                expired: false,
                text: `${days}d ${hours}h remaining`,
                color: days > 1 ? 'green' : 'orange'
            };
        } else if (hours > 0) {
            return {
                expired: false,
                text: `${hours}h ${minutes}m remaining`,
                color: hours > 6 ? 'green' : 'orange'
            };
        } else {
            return {
                expired: false,
                text: `${minutes}m remaining`,
                color: 'red'
            };
        }
    }, [visitor]);

    // Initial load
    useEffect(() => {
        if (!token) {
            setError('Invalid invite link');
            setLoading(false);
            return;
        }
        fetchVisitorDetails();
    }, [token, fetchVisitorDetails]);

    // Polling effect
    useEffect(() => {
        if (visitor && visitor.status === 'pending_approval' && !statusPolling && navigator.onLine) {
            setStatusPolling(true);
            pollingIntervalRef.current = setInterval(pollStatus, 10000);

            return () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
                setStatusPolling(false);
            };
        } else if (visitor && visitor.status !== 'pending_approval' && statusPolling) {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            setStatusPolling(false);
        }
    }, [visitor?.status, statusPolling, pollStatus]);

    // Countdown effect
    useEffect(() => {
        if (!visitor) return;

        setExpiryCountdown(calculateCountdown());
        countdownIntervalRef.current = setInterval(() => {
            setExpiryCountdown(calculateCountdown());
        }, 60000);

        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [visitor, calculateCountdown]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        };
    }, []);

    return {
        loading,
        error,
        visitor,
        estateInfo,
        expiryCountdown,
        isOffline,
        retryCount,
        fetchVisitorDetails
    };
};
