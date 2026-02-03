import { useState, useEffect, useRef } from 'react';

export const useVisitorInvite = (token) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [visitor, setVisitor] = useState(null);
    const [estateInfo, setEstateInfo] = useState(null);
    const [statusPolling, setStatusPolling] = useState(false);
    const [expiryCountdown, setExpiryCountdown] = useState(null);

    const pollingIntervalRef = useRef(null);
    const countdownIntervalRef = useRef(null);

    // Fetch estate information
    const fetchEstateInfo = async (estateId) => {
        try {
            if (!estateId) return;

            const response = await fetch(`/api/public/estate-info?estateId=${estateId}`);
            const data = await response.json();

            if (data.success) {
                setEstateInfo(data.data);
            } else {
                console.warn('Failed to load estate info:', data.error);
            }
        } catch (err) {
            console.error('Failed to load estate info:', err);
        }
    };

    // Fetch visitor or invite details
    const fetchVisitorDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            // Determine if this is a specific visitor token (vst_) or a generic invite code (inv_)
            const isBulkInvite = token.startsWith('inv_');
            const endpoint = isBulkInvite
                ? `/api/public/invites/${token}`
                : `/api/public/visitors/by-token/${token}`;

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Invite not found or has expired');
                } else if (response.status === 410) {
                    throw new Error('This invitation has expired');
                } else if (response.status === 429) {
                    throw new Error('Too many requests. Please wait a moment.');
                } else {
                    throw new Error('Failed to load invite details');
                }
            }

            const data = await response.json();

            if (data.success || isBulkInvite) { // Bulk invite endpoint might return data directly or wrapped
                const payload = data.data || data;

                if (isBulkInvite) {
                    // Normalize bulk invite data to look somewhat like a visitor for basic display
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
                    // Fetch estate info after getting visitor details
                    if (payload.estateId) {
                        await fetchEstateInfo(payload.estateId);
                    }
                }
            } else {
                throw new Error(data.error || 'Failed to load invite');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Poll for status updates
    const pollStatus = async () => {
        if (!token || !visitor) return;

        try {
            const response = await fetch(`/api/public/visitors/${token}/status`);
            const data = await response.json();

            if (data.success && data.data.status !== visitor.status) {
                await fetchVisitorDetails();
            }
        } catch (err) {
            console.error('Status poll failed:', err);
        }
    };

    // Calculate expiry countdown
    const calculateCountdown = () => {
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
    };

    // Initial load
    useEffect(() => {
        if (!token) {
            setError('Invalid invite link');
            setLoading(false);
            return;
        }
        fetchVisitorDetails();
    }, [token]);

    // Polling effect
    useEffect(() => {
        if (visitor && visitor.status === 'pending_approval' && !statusPolling) {
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
    }, [visitor?.status]);

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
    }, [visitor]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, []);

    return {
        loading,
        error,
        visitor,
        estateInfo,
        expiryCountdown,
        fetchVisitorDetails
    };
};
