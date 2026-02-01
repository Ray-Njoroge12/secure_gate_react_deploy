-- Migration: Collaboration System
-- Created: 2025-01-29
-- Description: Creates tables for cross-role collaboration features including messaging, workflows, and document sharing

-- Up migration

-- Create messages table for in-system messaging
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INT REFERENCES users(id) ON DELETE CASCADE,
    estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
    
    -- Message content
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'direct' CHECK (message_type IN ('direct', 'broadcast', 'workflow', 'system')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Visibility and permissions
    visibility_scope VARCHAR(50) DEFAULT 'private' CHECK (visibility_scope IN ('private', 'role', 'estate', 'public')),
    allowed_roles TEXT[], -- Array of roles that can see this message
    
    -- Message status
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'read', 'archived')),
    read_at TIMESTAMP,
    archived_at TIMESTAMP,
    
    -- Threading
    parent_message_id INT REFERENCES messages(id) ON DELETE CASCADE,
    thread_id INT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create workflow_handoffs table for context preservation
CREATE TABLE IF NOT EXISTS workflow_handoffs (
    id SERIAL PRIMARY KEY,
    estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
    
    -- Handoff participants
    from_user_id INT REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INT REFERENCES users(id) ON DELETE CASCADE,
    from_role VARCHAR(50) NOT NULL,
    to_role VARCHAR(50) NOT NULL,
    
    -- Workflow context
    workflow_type VARCHAR(100) NOT NULL, -- 'visitor_approval', 'incident_escalation', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'visitor', 'incident', 'user', etc.
    entity_id VARCHAR(100) NOT NULL,
    
    -- Context preservation
    context_data JSONB NOT NULL DEFAULT '{}',
    handoff_notes TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'escalated')),
    accepted_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Notifications
    notification_sent BOOLEAN DEFAULT false,
    reminder_count INT DEFAULT 0,
    last_reminder_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create approval_workflows table
CREATE TABLE IF NOT EXISTS approval_workflows (
    id SERIAL PRIMARY KEY,
    estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
    
    -- Workflow definition
    workflow_name VARCHAR(255) NOT NULL,
    workflow_type VARCHAR(100) NOT NULL, -- 'visitor_approval', 'user_registration', etc.
    description TEXT,
    
    -- Approval chain
    approval_steps JSONB NOT NULL DEFAULT '[]', -- Array of step definitions
    current_step INT DEFAULT 0,
    
    -- Entity being approved
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    
    -- Requestor information
    requested_by INT REFERENCES users(id) ON DELETE CASCADE,
    requested_at TIMESTAMP DEFAULT NOW(),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
    approved_by INT REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    rejected_by INT REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create approval_steps table for tracking individual approval steps
CREATE TABLE IF NOT EXISTS approval_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INT REFERENCES approval_workflows(id) ON DELETE CASCADE,
    
    -- Step definition
    step_order INT NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    approver_role VARCHAR(50) NOT NULL,
    approver_id INT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Step requirements
    required BOOLEAN DEFAULT true,
    timeout_hours INT DEFAULT 24,
    
    -- Step status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'skipped', 'expired')),
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    comments TEXT,
    
    -- Notifications
    notification_sent BOOLEAN DEFAULT false,
    reminder_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create shared_documents table for secure document sharing
CREATE TABLE IF NOT EXISTS shared_documents (
    id SERIAL PRIMARY KEY,
    estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
    
    -- Document information
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL, -- 'policy', 'procedure', 'form', 'report', etc.
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    
    -- Sharing permissions
    shared_by INT REFERENCES users(id) ON DELETE CASCADE,
    shared_with_roles TEXT[], -- Array of roles
    shared_with_users INT[], -- Array of user IDs
    
    -- Access control
    access_level VARCHAR(20) DEFAULT 'read' CHECK (access_level IN ('read', 'comment', 'edit', 'admin')),
    download_allowed BOOLEAN DEFAULT true,
    print_allowed BOOLEAN DEFAULT true,
    
    -- Document status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    version VARCHAR(50) DEFAULT '1.0',
    
    -- Metadata
    description TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Expiration
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create document_access_logs table for audit trails
CREATE TABLE IF NOT EXISTS document_access_logs (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES shared_documents(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
    
    -- Access details
    action VARCHAR(50) NOT NULL, -- 'view', 'download', 'edit', 'comment', 'share'
    ip_address INET,
    user_agent TEXT,
    
    -- Context
    session_id VARCHAR(255),
    duration_seconds INT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create conflicts table for conflict resolution
CREATE TABLE IF NOT EXISTS conflicts (
    id SERIAL PRIMARY KEY,
    estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
    
    -- Conflict details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    conflict_type VARCHAR(100) NOT NULL, -- 'interpersonal', 'policy', 'resource', 'procedural'
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Participants
    reporter_id INT REFERENCES users(id) ON DELETE CASCADE,
    involved_parties INT[], -- Array of user IDs
    mediator_id INT REFERENCES users(id) ON DELETE SET NULL,
    requested_mediator_id INT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Status and resolution
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'mediation', 'escalated', 'resolved', 'closed')),
    escalation_level INT DEFAULT 0,
    urgent_resolution BOOLEAN DEFAULT false,
    
    -- Resolution details
    resolution_type VARCHAR(50), -- 'agreement', 'policy_change', 'escalation', 'dismissal'
    resolution_notes TEXT,
    resolved_by INT REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create conflict_escalations table for escalation tracking
CREATE TABLE IF NOT EXISTS conflict_escalations (
    id SERIAL PRIMARY KEY,
    conflict_id INT REFERENCES conflicts(id) ON DELETE CASCADE,
    
    -- Escalation details
    escalated_by INT REFERENCES users(id) ON DELETE CASCADE,
    escalation_level INT NOT NULL,
    reason TEXT NOT NULL,
    
    -- Escalation target
    escalated_to_role VARCHAR(50),
    escalated_to_user INT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
    acknowledged_at TIMESTAMP,
    acknowledged_by INT REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create escalation_rules table for conflict resolution
CREATE TABLE IF NOT EXISTS escalation_rules (
    id SERIAL PRIMARY KEY,
    estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
    
    -- Rule definition
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(100) NOT NULL, -- 'timeout', 'conflict', 'priority', 'manual'
    description TEXT,
    
    -- Trigger conditions
    trigger_conditions JSONB NOT NULL DEFAULT '{}',
    entity_types TEXT[], -- Which entity types this rule applies to
    
    -- Escalation actions
    escalation_steps JSONB NOT NULL DEFAULT '[]',
    
    -- Rule status
    active BOOLEAN DEFAULT true,
    priority INT DEFAULT 1,
    
    -- Metadata
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create shared_calendars table for team coordination
CREATE TABLE IF NOT EXISTS shared_calendars (
    id SERIAL PRIMARY KEY,
    estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
    
    -- Calendar information
    calendar_name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
    
    -- Sharing settings
    owner_id INT REFERENCES users(id) ON DELETE CASCADE,
    shared_with_roles TEXT[],
    shared_with_users INT[],
    
    -- Permissions
    default_permission VARCHAR(20) DEFAULT 'read' CHECK (default_permission IN ('read', 'write', 'admin')),
    
    -- Calendar settings
    timezone VARCHAR(50) DEFAULT 'UTC',
    working_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00"}',
    
    -- Status
    active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    calendar_id INT REFERENCES shared_calendars(id) ON DELETE CASCADE,
    estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
    
    -- Event details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    
    -- Timing
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    all_day BOOLEAN DEFAULT false,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Recurrence
    recurrence_rule TEXT, -- RRULE format
    recurrence_exceptions TIMESTAMP[],
    
    -- Participants
    organizer_id INT REFERENCES users(id) ON DELETE CASCADE,
    attendees JSONB DEFAULT '[]', -- Array of user IDs and external emails
    
    -- Event status
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('tentative', 'confirmed', 'cancelled')),
    
    -- Notifications
    reminders JSONB DEFAULT '[]', -- Array of reminder settings
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_estate_id ON messages(estate_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_workflow_handoffs_estate_id ON workflow_handoffs(estate_id);
CREATE INDEX IF NOT EXISTS idx_workflow_handoffs_from_user ON workflow_handoffs(from_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_handoffs_to_user ON workflow_handoffs(to_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_handoffs_status ON workflow_handoffs(status);
CREATE INDEX IF NOT EXISTS idx_workflow_handoffs_entity ON workflow_handoffs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_estate_id ON approval_workflows(estate_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_status ON approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_entity ON approval_workflows(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_requested_by ON approval_workflows(requested_by);

CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow_id ON approval_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_status ON approval_steps(status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_approver_id ON approval_steps(approver_id);

CREATE INDEX IF NOT EXISTS idx_shared_documents_estate_id ON shared_documents(estate_id);
CREATE INDEX IF NOT EXISTS idx_shared_documents_shared_by ON shared_documents(shared_by);
CREATE INDEX IF NOT EXISTS idx_shared_documents_status ON shared_documents(status);
CREATE INDEX IF NOT EXISTS idx_shared_documents_type ON shared_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_document_access_logs_document_id ON document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_user_id ON document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_created_at ON document_access_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_conflicts_estate_id ON conflicts(estate_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_reporter_id ON conflicts(reporter_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON conflicts(status);
CREATE INDEX IF NOT EXISTS idx_conflicts_severity ON conflicts(severity);
CREATE INDEX IF NOT EXISTS idx_conflicts_mediator_id ON conflicts(mediator_id);

CREATE INDEX IF NOT EXISTS idx_conflict_escalations_conflict_id ON conflict_escalations(conflict_id);
CREATE INDEX IF NOT EXISTS idx_conflict_escalations_escalated_by ON conflict_escalations(escalated_by);
CREATE INDEX IF NOT EXISTS idx_conflict_escalations_status ON conflict_escalations(status);

CREATE INDEX IF NOT EXISTS idx_escalation_rules_estate_id ON escalation_rules(estate_id);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_active ON escalation_rules(active);

CREATE INDEX IF NOT EXISTS idx_shared_calendars_estate_id ON shared_calendars(estate_id);
CREATE INDEX IF NOT EXISTS idx_shared_calendars_owner_id ON shared_calendars(owner_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar_id ON calendar_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer_id ON calendar_events(organizer_id);

-- Create triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_conflicts_updated_at ON conflicts;
CREATE TRIGGER update_conflicts_updated_at BEFORE UPDATE ON conflicts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_escalation_rules_updated_at ON escalation_rules;
CREATE TRIGGER update_escalation_rules_updated_at BEFORE UPDATE ON escalation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflow_handoffs_updated_at ON workflow_handoffs;
CREATE TRIGGER update_workflow_handoffs_updated_at BEFORE UPDATE ON workflow_handoffs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approval_workflows_updated_at ON approval_workflows;
CREATE TRIGGER update_approval_workflows_updated_at BEFORE UPDATE ON approval_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_approval_steps_updated_at ON approval_steps;
CREATE TRIGGER update_approval_steps_updated_at BEFORE UPDATE ON approval_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shared_documents_updated_at ON shared_documents;
CREATE TRIGGER update_shared_documents_updated_at BEFORE UPDATE ON shared_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_escalation_rules_updated_at ON escalation_rules;
CREATE TRIGGER update_escalation_rules_updated_at BEFORE UPDATE ON escalation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shared_calendars_updated_at ON shared_calendars;
CREATE TRIGGER update_shared_calendars_updated_at BEFORE UPDATE ON shared_calendars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Down migration (rollback)
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
DROP TRIGGER IF EXISTS update_shared_calendars_updated_at ON shared_calendars;
DROP TRIGGER IF EXISTS update_escalation_rules_updated_at ON escalation_rules;
DROP TRIGGER IF EXISTS update_conflicts_updated_at ON conflicts;
DROP TRIGGER IF EXISTS update_shared_documents_updated_at ON shared_documents;
DROP TRIGGER IF EXISTS update_approval_steps_updated_at ON approval_steps;
DROP TRIGGER IF EXISTS update_approval_workflows_updated_at ON approval_workflows;
DROP TRIGGER IF EXISTS update_workflow_handoffs_updated_at ON workflow_handoffs;
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;

DROP TABLE IF EXISTS calendar_events;
DROP TABLE IF EXISTS shared_calendars;
DROP TABLE IF EXISTS conflict_escalations;
DROP TABLE IF EXISTS conflicts;
DROP TABLE IF EXISTS escalation_rules;
DROP TABLE IF EXISTS document_access_logs;
DROP TABLE IF EXISTS shared_documents;
DROP TABLE IF EXISTS approval_steps;
DROP TABLE IF EXISTS approval_workflows;
DROP TABLE IF EXISTS workflow_handoffs;
DROP TABLE IF EXISTS messages;