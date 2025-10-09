import React, { useState, useEffect } from 'react';
import { Card, Button } from '../../components/ui';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';

const ManualCheck = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const { handleError, handleApiError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Enter to search
      if (e.key === 'Enter' && e.target.type === 'text') {
        e.preventDefault();
        handleSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      handleError('Please enter a search term', { context: 'Manual Check Search' });
      return;
    }

    try {
      setLoading('manualCheck', true, { message: 'Searching visitors...' });
      clearAllErrors();
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/visitors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const visitors = data.data || [];
        
        // Filter visitors by search term (name, phone, or invite code)
        const filtered = visitors.filter(visitor => 
          visitor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visitor.phone?.includes(searchTerm) ||
          visitor.invite_code?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        setSearchResults(filtered);
      } else {
        const error = new Error('Failed to fetch visitors');
        error.response = { status: response.status };
        throw error;
      }
    } catch (err) {
      handleApiError(err, 'Manual Check Search');
    } finally {
      setLoading('manualCheck', false);
    }
  };

  const handleCheckIn = async (visitorId) => {
    try {
      setLoading('checkIn', true, { message: 'Checking in visitor...' });
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/visitors/${visitorId}/check-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSearchResults(prev => 
          prev.map(v => 
            v.id === visitorId 
              ? { ...v, status: 'CHECKED_IN', check_in: new Date().toISOString() }
              : v
          )
        );
      } else {
        const error = new Error('Check-in failed');
        error.response = { status: response.status, data: await response.json() };
        throw error;
      }
    } catch (err) {
      handleApiError(err, 'Visitor Check-in');
    } finally {
      setLoading('checkIn', false);
    }
  };

  const handleCheckOut = async (visitorId) => {
    try {
      setLoading('checkOut', true, { message: 'Checking out visitor...' });
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/visitors/${visitorId}/check-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSearchResults(prev => 
          prev.map(v => 
            v.id === visitorId 
              ? { ...v, status: 'CHECKED_OUT', check_out: new Date().toISOString() }
              : v
          )
        );
      } else {
        const error = new Error('Check-out failed');
        error.response = { status: response.status, data: await response.json() };
        throw error;
      }
    } catch (err) {
      handleApiError(err, 'Visitor Check-out');
    } finally {
      setLoading('checkOut', false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'VERIFIED': return 'bg-blue-100 text-blue-800';
      case 'CHECKED_IN': return 'bg-green-100 text-green-800';
      case 'CHECKED_OUT': return 'bg-gray-100 text-gray-800';
      case 'REVOKED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manual Check</h1>
          <p className="text-gray-600 mt-1">Search and verify visitors manually</p>
        </div>
        <Button
          onClick={() => window.location.href = '/dashboard/guard/scan-qr'}
          variant="outline"
        >
          QR Scanner
        </Button>
      </div>

      <Card>
        <Card.Header>
          <Card.Title>Search Visitors</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name, phone, or invite code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <Button onClick={handleSearch} disabled={isLoading('manualCheck')}>
                {isLoading('manualCheck') ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {searchResults.length > 0 && (
        <Card>
          <Card.Header>
            <Card.Title>Search Results ({searchResults.length})</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              {searchResults.map(visitor => (
                <div key={visitor.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{visitor.name}</h3>
                      <p className="text-sm text-gray-600">Phone: {visitor.phone || 'N/A'}</p>
                      <p className="text-sm text-gray-600">Invite Code: {visitor.invite_code}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(visitor.status)}`}>
                      {visitor.status}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    {visitor.status === 'VERIFIED' && (
                      <Button
                        size="sm"
                        onClick={() => handleCheckIn(visitor.id)}
                        disabled={isLoading('checkIn')}
                      >
                        {isLoading('checkIn') ? 'Checking In...' : 'Check In'}
                      </Button>
                    )}
                    {visitor.status === 'CHECKED_IN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckOut(visitor.id)}
                        disabled={isLoading('checkOut')}
                      >
                        {isLoading('checkOut') ? 'Checking Out...' : 'Check Out'}
                      </Button>
                    )}
                    {visitor.status === 'PENDING' && (
                      <span className="text-sm text-gray-500">Visitor needs to complete registration first</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {searchResults.length === 0 && !isLoading('manualCheck') && searchTerm && (
        <Card>
          <Card.Content className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500 mt-2">No visitors found matching "{searchTerm}"</p>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default ManualCheck;