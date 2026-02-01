import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collaborationService } from '../../services/collaborationService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './TeamCoordination.css';

const TeamCoordination = ({ className = '' }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'day', 'week', 'month'
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [calendarFilters, setCalendarFilters] = useState({
    calendars: [],
    roles: [],
    eventTypes: []
  });

  // Fetch shared calendars
  const { 
    data: calendarsData, 
    isLoading: calendarsLoading, 
    error: calendarsError 
  } = useQuery({
    queryKey: ['shared-calendars', user.estate_id],
    queryFn: () => collaborationService.getSharedCalendars(user.estate_id),
    refetchInterval: 60000,
    staleTime: 30000
  });

  // Fetch calendar events
  const { 
    data: eventsData, 
    isLoading: eventsLoading, 
    error: eventsError 
  } = useQuery({
    queryKey: ['calendar-events', user.estate_id, selectedDate, viewMode, calendarFilters],
    queryFn: () => collaborationService.getCalendarEvents({
      estateId: user.estate_id,
      startDate: getViewStartDate(selectedDate, viewMode),
      endDate: getViewEndDate(selectedDate, viewMode),
      calendars: calendarFilters.calendars,
      roles: calendarFilters.roles,
      eventTypes: calendarFilters.eventTypes
    }),
    refetchInterval: 30000,
    staleTime: 15000
  });

  // Fetch team availability
  const { 
    data: availabilityData, 
    isLoading: availabilityLoading 
  } = useQuery({
    queryKey: ['team-availability', user.estate_id, selectedDate],
    queryFn: () => collaborationService.getTeamAvailability({
      estateId: user.estate_id,
      date: selectedDate
    }),
    refetchInterval: 300000, // 5 minutes
    staleTime: 60000
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: collaborationService.createCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-events']);
      queryClient.invalidateQueries(['team-availability']);
      showNotification('Event created successfully', 'success');
      setIsCreatingEvent(false);
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to create event', 'error');
    }
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: collaborationService.updateCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-events']);
      queryClient.invalidateQueries(['team-availability']);
      showNotification('Event updated successfully', 'success');
      setSelectedEvent(null);
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to update event', 'error');
    }
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: collaborationService.deleteCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries(['calendar-events']);
      queryClient.invalidateQueries(['team-availability']);
      showNotification('Event deleted successfully', 'success');
      setSelectedEvent(null);
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to delete event', 'error');
    }
  });

  const calendars = calendarsData?.calendars || [];
  const events = eventsData?.events || [];
  const availability = availabilityData?.availability || {};

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedEvent(null);
    setIsCreatingEvent(false);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const handleEventCreate = () => {
    setIsCreatingEvent(true);
    setSelectedEvent(null);
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setIsCreatingEvent(false);
  };

  const handleEventSubmit = (eventData) => {
    if (selectedEvent) {
      updateEventMutation.mutate({ eventId: selectedEvent.id, ...eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleEventDelete = (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(eventId);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setCalendarFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  if (calendarsError || eventsError) {
    return (
      <div className={`team-coordination error ${className}`}>
        <div className="error-message">
          <h3>Unable to load team coordination</h3>
          <p>{calendarsError?.message || eventsError?.message}</p>
          <button 
            onClick={() => {
              queryClient.invalidateQueries(['shared-calendars']);
              queryClient.invalidateQueries(['calendar-events']);
            }}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`team-coordination ${className}`}>
      <div className="coordination-header">
        <h2>Team Coordination</h2>
        <div className="header-actions">
          <button 
            onClick={handleEventCreate}
            className="create-button primary"
            disabled={createEventMutation.isPending}
          >
            <span className="icon">📅</span>
            Schedule Event
          </button>
        </div>
      </div>

      <div className="coordination-tabs">
        <button
          className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => handleTabChange('calendar')}
        >
          <span className="tab-icon">📅</span>
          Shared Calendar
        </button>
        <button
          className={`tab ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => handleTabChange('availability')}
        >
          <span className="tab-icon">👥</span>
          Team Availability
        </button>
        <button
          className={`tab ${activeTab === 'scheduling' ? 'active' : ''}`}
          onClick={() => handleTabChange('scheduling')}
        >
          <span className="tab-icon">⏰</span>
          Smart Scheduling
        </button>
      </div>

      <div className="coordination-content">
        {activeTab === 'calendar' && (
          <CalendarView
            calendars={calendars}
            events={events}
            selectedDate={selectedDate}
            viewMode={viewMode}
            filters={calendarFilters}
            isLoading={calendarsLoading || eventsLoading}
            onDateChange={handleDateChange}
            onViewModeChange={handleViewModeChange}
            onEventSelect={handleEventSelect}
            onFilterChange={handleFilterChange}
          />
        )}

        {activeTab === 'availability' && (
          <AvailabilityView
            availability={availability}
            selectedDate={selectedDate}
            isLoading={availabilityLoading}
            onDateChange={handleDateChange}
          />
        )}

        {activeTab === 'scheduling' && (
          <SmartSchedulingView
            calendars={calendars}
            events={events}
            availability={availability}
            selectedDate={selectedDate}
            onEventCreate={handleEventCreate}
            onDateChange={handleDateChange}
          />
        )}
      </div>

      {(isCreatingEvent || selectedEvent) && (
        <EventModal
          event={selectedEvent}
          calendars={calendars}
          isCreating={isCreatingEvent}
          onSubmit={handleEventSubmit}
          onDelete={handleEventDelete}
          onCancel={() => {
            setIsCreatingEvent(false);
            setSelectedEvent(null);
          }}
          isLoading={createEventMutation.isPending || updateEventMutation.isPending}
        />
      )}
    </div>
  );
};

const CalendarView = ({ 
  calendars, 
  events, 
  selectedDate, 
  viewMode, 
  filters,
  isLoading, 
  onDateChange, 
  onViewModeChange, 
  onEventSelect,
  onFilterChange 
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate);

  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + direction);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction * 7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + direction);
        break;
    }
    
    setCurrentDate(newDate);
    onDateChange(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    onDateChange(today);
  };

  const getDateRangeText = () => {
    const start = getViewStartDate(currentDate, viewMode);
    const end = getViewEndDate(currentDate, viewMode);
    
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (viewMode === 'week') {
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
  };

  return (
    <div className="calendar-view">
      <div className="calendar-controls">
        <div className="date-navigation">
          <button onClick={() => navigateDate(-1)} className="nav-button">
            ‹
          </button>
          <div className="date-range">
            {getDateRangeText()}
          </div>
          <button onClick={() => navigateDate(1)} className="nav-button">
            ›
          </button>
          <button onClick={goToToday} className="today-button">
            Today
          </button>
        </div>

        <div className="view-controls">
          <div className="view-mode-selector">
            {['day', 'week', 'month'].map(mode => (
              <button
                key={mode}
                className={`view-mode ${viewMode === mode ? 'active' : ''}`}
                onClick={() => onViewModeChange(mode)}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="calendar-filters">
        <CalendarFilters
          calendars={calendars}
          filters={filters}
          onChange={onFilterChange}
        />
      </div>

      <div className="calendar-grid">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading calendar...</p>
          </div>
        ) : (
          <CalendarGrid
            viewMode={viewMode}
            currentDate={currentDate}
            events={events}
            calendars={calendars}
            onEventSelect={onEventSelect}
          />
        )}
      </div>
    </div>
  );
};

const CalendarFilters = ({ calendars, filters, onChange }) => {
  const [showFilters, setShowFilters] = useState(false);

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'guard', label: 'Security Guard' },
    { value: 'resident', label: 'Resident' }
  ];

  const eventTypeOptions = [
    { value: 'meeting', label: 'Meeting' },
    { value: 'shift', label: 'Shift' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'event', label: 'Community Event' },
    { value: 'training', label: 'Training' }
  ];

  return (
    <div className="calendar-filters">
      <button 
        className="filter-toggle"
        onClick={() => setShowFilters(!showFilters)}
      >
        <span className="icon">🔍</span>
        Filters
        {(filters.calendars.length > 0 || filters.roles.length > 0 || filters.eventTypes.length > 0) && (
          <span className="filter-count">
            {filters.calendars.length + filters.roles.length + filters.eventTypes.length}
          </span>
        )}
      </button>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <label>Calendars:</label>
            <div className="filter-options">
              {calendars.map(calendar => (
                <label key={calendar.id} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.calendars.includes(calendar.id)}
                    onChange={(e) => {
                      const newCalendars = e.target.checked
                        ? [...filters.calendars, calendar.id]
                        : filters.calendars.filter(id => id !== calendar.id);
                      onChange('calendars', newCalendars);
                    }}
                  />
                  <span 
                    className="calendar-color" 
                    style={{ backgroundColor: calendar.color }}
                  ></span>
                  {calendar.calendar_name}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Roles:</label>
            <div className="filter-options">
              {roleOptions.map(role => (
                <label key={role.value} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.roles.includes(role.value)}
                    onChange={(e) => {
                      const newRoles = e.target.checked
                        ? [...filters.roles, role.value]
                        : filters.roles.filter(r => r !== role.value);
                      onChange('roles', newRoles);
                    }}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Event Types:</label>
            <div className="filter-options">
              {eventTypeOptions.map(type => (
                <label key={type.value} className="filter-option">
                  <input
                    type="checkbox"
                    checked={filters.eventTypes.includes(type.value)}
                    onChange={(e) => {
                      const newTypes = e.target.checked
                        ? [...filters.eventTypes, type.value]
                        : filters.eventTypes.filter(t => t !== type.value);
                      onChange('eventTypes', newTypes);
                    }}
                  />
                  {type.label}
                </label>
              ))}
            </div>
          </div>

          <div className="filter-actions">
            <button 
              onClick={() => onChange('clear', null)}
              className="clear-filters"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CalendarGrid = ({ viewMode, currentDate, events, calendars, onEventSelect }) => {
  const renderDayView = () => {
    const dayEvents = events.filter(event => 
      isSameDay(new Date(event.start_time), currentDate)
    );

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="day-view">
        <div className="time-column">
          {hours.map(hour => (
            <div key={hour} className="time-slot">
              {formatHour(hour)}
            </div>
          ))}
        </div>
        <div className="events-column">
          {hours.map(hour => (
            <div key={hour} className="hour-slot">
              {dayEvents
                .filter(event => new Date(event.start_time).getHours() === hour)
                .map(event => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    calendars={calendars}
                    onClick={() => onEventSelect(event)}
                  />
                ))
              }
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = getViewStartDate(currentDate, 'week');
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      return day;
    });

    return (
      <div className="week-view">
        <div className="week-header">
          <div className="time-header"></div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="day-header">
              <div className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
              <div className="day-number">{day.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="week-body">
          <div className="time-column">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="time-slot">
                {formatHour(i)}
              </div>
            ))}
          </div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="day-column">
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className="hour-slot">
                  {events
                    .filter(event => 
                      isSameDay(new Date(event.start_time), day) &&
                      new Date(event.start_time).getHours() === hour
                    )
                    .map(event => (
                      <EventBlock
                        key={event.id}
                        event={event}
                        calendars={calendars}
                        onClick={() => onEventSelect(event)}
                        compact
                      />
                    ))
                  }
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = getViewStartDate(currentDate, 'month');
    const monthEnd = getViewEndDate(currentDate, 'month');
    const weeks = [];
    let currentWeek = [];
    let currentDay = new Date(monthStart);

    while (currentDay <= monthEnd) {
      currentWeek.push(new Date(currentDay));
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentDay.setDate(currentDay.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return (
      <div className="month-view">
        <div className="month-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="day-header">{day}</div>
          ))}
        </div>
        <div className="month-body">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="week-row">
              {week.map(day => {
                const dayEvents = events.filter(event => 
                  isSameDay(new Date(event.start_time), day)
                );
                
                return (
                  <div 
                    key={day.toISOString()} 
                    className={`day-cell ${
                      day.getMonth() !== currentDate.getMonth() ? 'other-month' : ''
                    } ${isSameDay(day, new Date()) ? 'today' : ''}`}
                  >
                    <div className="day-number">{day.getDate()}</div>
                    <div className="day-events">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className="event-dot"
                          style={{ 
                            backgroundColor: getCalendarColor(event.calendar_id, calendars) 
                          }}
                          onClick={() => onEventSelect(event)}
                          title={event.title}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="more-events">+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  switch (viewMode) {
    case 'day':
      return renderDayView();
    case 'week':
      return renderWeekView();
    case 'month':
      return renderMonthView();
    default:
      return renderWeekView();
  }
};

const EventBlock = ({ event, calendars, onClick, compact = false }) => {
  const calendar = calendars.find(c => c.id === event.calendar_id);
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);
  
  return (
    <div
      className={`event-block ${compact ? 'compact' : ''}`}
      style={{ 
        backgroundColor: calendar?.color || '#3B82F6',
        borderLeft: `4px solid ${calendar?.color || '#3B82F6'}`
      }}
      onClick={onClick}
    >
      <div className="event-title">{event.title}</div>
      {!compact && (
        <>
          <div className="event-time">
            {startTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })} - {endTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true 
            })}
          </div>
          {event.location && (
            <div className="event-location">{event.location}</div>
          )}
          {event.attendees && event.attendees.length > 0 && (
            <div className="event-attendees">
              {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const AvailabilityView = ({ availability, selectedDate, isLoading, onDateChange }) => {
  if (isLoading) {
    return (
      <div className="availability-view loading">
        <div className="loading-spinner"></div>
        <p>Loading team availability...</p>
      </div>
    );
  }

  const roles = Object.keys(availability);

  return (
    <div className="availability-view">
      <div className="availability-header">
        <h3>Team Availability - {selectedDate.toLocaleDateString()}</h3>
        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => onDateChange(new Date(e.target.value))}
          className="date-picker"
        />
      </div>

      <div className="availability-grid">
        {roles.map(role => (
          <div key={role} className="role-section">
            <h4 className="role-title">{role.charAt(0).toUpperCase() + role.slice(1)}s</h4>
            <div className="users-availability">
              {availability[role].map(user => (
                <UserAvailabilityCard
                  key={user.id}
                  user={user}
                  date={selectedDate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserAvailabilityCard = ({ user, date }) => {
  const getAvailabilityStatus = () => {
    if (user.isOnShift) return 'on-shift';
    if (user.hasEvents) return 'busy';
    if (user.isAvailable) return 'available';
    return 'unavailable';
  };

  const status = getAvailabilityStatus();
  const statusLabels = {
    'on-shift': 'On Shift',
    'busy': 'Busy',
    'available': 'Available',
    'unavailable': 'Unavailable'
  };

  const statusIcons = {
    'on-shift': '🛡️',
    'busy': '📅',
    'available': '✅',
    'unavailable': '❌'
  };

  return (
    <div className={`user-availability-card ${status}`}>
      <div className="user-info">
        <div className="user-avatar">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="user-details">
          <div className="user-name">{user.username}</div>
          <div className="user-role">{user.role}</div>
        </div>
      </div>
      
      <div className="availability-status">
        <span className="status-icon">{statusIcons[status]}</span>
        <span className="status-label">{statusLabels[status]}</span>
      </div>

      {user.currentEvent && (
        <div className="current-event">
          <div className="event-title">{user.currentEvent.title}</div>
          <div className="event-time">
            {new Date(user.currentEvent.start_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })} - {new Date(user.currentEvent.end_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      )}

      {user.nextEvent && (
        <div className="next-event">
          <div className="next-label">Next:</div>
          <div className="event-title">{user.nextEvent.title}</div>
          <div className="event-time">
            {new Date(user.nextEvent.start_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const SmartSchedulingView = ({ 
  calendars, 
  events, 
  availability, 
  selectedDate, 
  onEventCreate, 
  onDateChange 
}) => {
  const [suggestedTimes, setSuggestedTimes] = useState([]);
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [meetingDuration, setMeetingDuration] = useState(60);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const findOptimalTimes = async () => {
    if (selectedAttendees.length === 0) {
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Simulate smart scheduling analysis
      const suggestions = await collaborationService.findOptimalMeetingTimes({
        attendees: selectedAttendees,
        date: selectedDate,
        duration: meetingDuration,
        workingHours: { start: '09:00', end: '17:00' }
      });
      
      setSuggestedTimes(suggestions);
    } catch (error) {
      console.error('Failed to find optimal times:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const allUsers = Object.values(availability).flat();

  return (
    <div className="smart-scheduling-view">
      <div className="scheduling-header">
        <h3>Smart Scheduling Assistant</h3>
        <p>Find the best time for team meetings and events</p>
      </div>

      <div className="scheduling-form">
        <div className="form-group">
          <label>Select Date:</label>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => onDateChange(new Date(e.target.value))}
            className="date-picker"
          />
        </div>

        <div className="form-group">
          <label>Meeting Duration (minutes):</label>
          <select
            value={meetingDuration}
            onChange={(e) => setMeetingDuration(parseInt(e.target.value))}
          >
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>

        <div className="form-group">
          <label>Select Attendees:</label>
          <div className="attendees-selection">
            {allUsers.map(user => (
              <label key={user.id} className="attendee-option">
                <input
                  type="checkbox"
                  checked={selectedAttendees.includes(user.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedAttendees(prev => [...prev, user.id]);
                    } else {
                      setSelectedAttendees(prev => prev.filter(id => id !== user.id));
                    }
                  }}
                />
                <span className="user-info">
                  {user.username} ({user.role})
                </span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={findOptimalTimes}
          className="analyze-button primary"
          disabled={isAnalyzing || selectedAttendees.length === 0}
        >
          {isAnalyzing ? 'Analyzing...' : 'Find Optimal Times'}
        </button>
      </div>

      {suggestedTimes.length > 0 && (
        <div className="suggested-times">
          <h4>Suggested Meeting Times</h4>
          <div className="time-suggestions">
            {suggestedTimes.map((suggestion, index) => (
              <TimeSlotSuggestion
                key={index}
                suggestion={suggestion}
                onSchedule={() => {
                  onEventCreate();
                  // Pre-fill event form with suggestion data
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TimeSlotSuggestion = ({ suggestion, onSchedule }) => {
  const { startTime, endTime, score, conflicts, availableAttendees } = suggestion;
  
  const getScoreColor = (score) => {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  };

  return (
    <div className={`time-slot-suggestion ${getScoreColor(score)}`}>
      <div className="suggestion-header">
        <div className="time-range">
          {new Date(startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })} - {new Date(endTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </div>
        <div className={`score-badge ${getScoreColor(score)}`}>
          {score}% match
        </div>
      </div>

      <div className="suggestion-details">
        <div className="available-count">
          {availableAttendees.length} of {availableAttendees.length + conflicts.length} attendees available
        </div>
        
        {conflicts.length > 0 && (
          <div className="conflicts">
            <span className="conflicts-label">Conflicts:</span>
            {conflicts.map((conflict, index) => (
              <span key={index} className="conflict-item">
                {conflict.username} ({conflict.reason})
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onSchedule}
        className="schedule-button primary"
      >
        Schedule Meeting
      </button>
    </div>
  );
};

const EventModal = ({ 
  event, 
  calendars, 
  isCreating, 
  onSubmit, 
  onDelete, 
  onCancel, 
  isLoading 
}) => {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    calendarId: event?.calendar_id || (calendars[0]?.id || ''),
    startTime: event?.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '',
    endTime: event?.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '',
    allDay: event?.all_day || false,
    attendees: event?.attendees || [],
    reminders: event?.reminders || [{ minutes: 15, method: 'notification' }]
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.calendarId) {
      newErrors.calendarId = 'Calendar is required';
    }
    if (!formData.allDay) {
      if (!formData.startTime) {
        newErrors.startTime = 'Start time is required';
      }
      if (!formData.endTime) {
        newErrors.endTime = 'End time is required';
      }
      if (formData.startTime && formData.endTime && 
          new Date(formData.startTime) >= new Date(formData.endTime)) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const eventData = {
      ...formData,
      startTime: formData.allDay 
        ? new Date(formData.startTime).toISOString().split('T')[0] + 'T00:00:00'
        : formData.startTime,
      endTime: formData.allDay 
        ? new Date(formData.endTime).toISOString().split('T')[0] + 'T23:59:59'
        : formData.endTime
    };

    onSubmit(eventData);
  };

  return (
    <div className="event-modal-overlay">
      <div className="event-modal">
        <div className="modal-header">
          <h3>{isCreating ? 'Create Event' : 'Edit Event'}</h3>
          <button onClick={onCancel} className="close-button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label htmlFor="title">Event Title:</label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? 'error' : ''}
              placeholder="Enter event title"
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="calendarId">Calendar:</label>
            <select
              id="calendarId"
              value={formData.calendarId}
              onChange={(e) => handleInputChange('calendarId', e.target.value)}
              className={errors.calendarId ? 'error' : ''}
            >
              <option value="">Select calendar...</option>
              {calendars.map(calendar => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.calendar_name}
                </option>
              ))}
            </select>
            {errors.calendarId && <span className="error-text">{errors.calendarId}</span>}
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.allDay}
                onChange={(e) => handleInputChange('allDay', e.target.checked)}
              />
              All Day Event
            </label>
          </div>

          {!formData.allDay && (
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startTime">Start Time:</label>
                <input
                  type="datetime-local"
                  id="startTime"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className={errors.startTime ? 'error' : ''}
                />
                {errors.startTime && <span className="error-text">{errors.startTime}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="endTime">End Time:</label>
                <input
                  type="datetime-local"
                  id="endTime"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className={errors.endTime ? 'error' : ''}
                />
                {errors.endTime && <span className="error-text">{errors.endTime}</span>}
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="location">Location:</label>
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter location (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter event description (optional)"
              rows={4}
            />
          </div>

          <div className="form-actions">
            <div className="left-actions">
              {!isCreating && (
                <button
                  type="button"
                  onClick={() => onDelete(event.id)}
                  className="delete-button danger"
                  disabled={isLoading}
                >
                  Delete Event
                </button>
              )}
            </div>
            <div className="right-actions">
              <button
                type="button"
                onClick={onCancel}
                className="cancel-button"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button primary"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : isCreating ? 'Create Event' : 'Update Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper functions
const getViewStartDate = (date, viewMode) => {
  const start = new Date(date);
  
  switch (viewMode) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      return start;
    case 'week':
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      return start;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const firstDayOfWeek = start.getDay();
      start.setDate(start.getDate() - firstDayOfWeek);
      return start;
    default:
      return start;
  }
};

const getViewEndDate = (date, viewMode) => {
  const end = new Date(date);
  
  switch (viewMode) {
    case 'day':
      end.setHours(23, 59, 59, 999);
      return end;
    case 'week':
      const dayOfWeek = end.getDay();
      end.setDate(end.getDate() + (6 - dayOfWeek));
      end.setHours(23, 59, 59, 999);
      return end;
    case 'month':
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      const lastDayOfWeek = end.getDay();
      end.setDate(end.getDate() + (6 - lastDayOfWeek));
      return end;
    default:
      return end;
  }
};

const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const formatHour = (hour) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
};

const getCalendarColor = (calendarId, calendars) => {
  const calendar = calendars.find(c => c.id === calendarId);
  return calendar?.color || '#3B82F6';
};

export default TeamCoordination;