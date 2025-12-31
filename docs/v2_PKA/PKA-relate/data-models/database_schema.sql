-- ============================================================================
-- PKA-Relate Database Schema (PostgreSQL + pgvector)
-- ============================================================================
-- Version: 1.0.0
-- Date: 2025-12-30
-- Compatible with: PostgreSQL 14+, pgvector extension
--
-- This schema supports:
-- - Vector similarity search (pgvector)
-- - Full-text search (tsvector)
-- - Graph relationships (foreign keys + adjacency)
-- - JSONB for flexible metadata
-- - Optimized indexes for mobile queries
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- CORE USER ENTITIES
-- ============================================================================

-- Users table (single user per database instance)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sync_enabled BOOLEAN DEFAULT false,
    sync_token TEXT, -- Encrypted sync token
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);

-- User sessions (for multi-device support)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_device ON user_sessions(device_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Psychological profiles
CREATE TABLE psychological_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attachment_style VARCHAR(50) NOT NULL CHECK (
        attachment_style IN ('Secure', 'Anxious', 'Avoidant', 'Disorganized')
    ),
    attachment_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    communication_style VARCHAR(50) NOT NULL CHECK (
        communication_style IN ('Direct', 'Indirect', 'Assertive', 'Passive')
    ),
    communication_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    conflict_pattern TEXT,
    conflict_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    traits JSONB DEFAULT '{}'::jsonb,
    completeness_score NUMERIC(3, 2) DEFAULT 0.0 CHECK (
        completeness_score >= 0 AND completeness_score <= 1
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- User settings
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    push_notifications_enabled BOOLEAN DEFAULT true,
    data_privacy_strict BOOLEAN DEFAULT false,
    reflection_reminder_enabled BOOLEAN DEFAULT true,
    reflection_reminder_time TIME DEFAULT '21:00:00',
    app_lock_enabled BOOLEAN DEFAULT false,
    tough_love_mode_enabled BOOLEAN DEFAULT false,
    theme VARCHAR(20) DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'en',
    notifications JSONB DEFAULT '{
        "interaction_reminders": true,
        "focus_area_milestones": true,
        "relationship_insights": true,
        "weekly_summary": true
    }'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CORE VALUES (Mission/Vision)
-- ============================================================================

CREATE TABLE core_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (
        category IN ('Primary', 'Secondary', 'Aspirational')
    ),
    value VARCHAR(255) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    embedding vector(1536), -- OpenAI text-embedding-3-small
    reference_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_value UNIQUE(user_id, value)
);

CREATE INDEX idx_values_user ON core_values(user_id);
CREATE INDEX idx_values_category ON core_values(user_id, category);
CREATE INDEX idx_values_embedding ON core_values USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- ============================================================================
-- MENTORS
-- ============================================================================

CREATE TABLE mentors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    embedding vector(1536),
    reference_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_mentor UNIQUE(user_id, name)
);

CREATE INDEX idx_mentors_user ON mentors(user_id);
CREATE INDEX idx_mentors_embedding ON mentors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- ============================================================================
-- FOCUS AREAS (Personal Growth Goals)
-- ============================================================================

CREATE TABLE focus_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    streak INTEGER DEFAULT 0,
    weekly_change NUMERIC(5, 2) DEFAULT 0.0,
    target_date TIMESTAMP WITH TIME ZONE,
    linked_value_ids UUID[] DEFAULT ARRAY[]::UUID[],
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_focus_areas_user ON focus_areas(user_id);
CREATE INDEX idx_focus_areas_progress ON focus_areas(user_id, progress DESC);
CREATE INDEX idx_focus_areas_embedding ON focus_areas USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- Focus area progress checkpoints
CREATE TABLE focus_area_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    focus_area_id UUID NOT NULL REFERENCES focus_areas(id) ON DELETE CASCADE,
    progress_score INTEGER NOT NULL CHECK (progress_score >= 0 AND progress_score <= 100),
    notes TEXT,
    interaction_ids UUID[] DEFAULT ARRAY[]::UUID[],
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_progress_focus_area ON focus_area_progress(focus_area_id, recorded_at DESC);

-- ============================================================================
-- SUB-SYSTEMS (Knowledge Graph Nodes)
-- ============================================================================

CREATE TABLE sub_systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL CHECK (
        icon IN ('grid', 'heart', 'shield', 'flower', 'users', 'star', 'book', 'target')
    ),
    color VARCHAR(50) NOT NULL, -- HSL color string
    item_count INTEGER DEFAULT 0,
    linked_system_ids UUID[] DEFAULT ARRAY[]::UUID[],
    embedding vector(1536),
    graph_position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_system UNIQUE(user_id, name)
);

CREATE INDEX idx_systems_user ON sub_systems(user_id);
CREATE INDEX idx_systems_default ON sub_systems(user_id, is_default);
CREATE INDEX idx_systems_embedding ON sub_systems USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- System links (knowledge graph edges)
CREATE TABLE system_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system_id UUID NOT NULL REFERENCES sub_systems(id) ON DELETE CASCADE,
    target_system_id UUID NOT NULL REFERENCES sub_systems(id) ON DELETE CASCADE,
    strength NUMERIC(3, 2) DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
    description TEXT,
    shared_items_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT no_self_link CHECK (source_system_id != target_system_id),
    CONSTRAINT unique_link UNIQUE(source_system_id, target_system_id)
);

CREATE INDEX idx_links_source ON system_links(source_system_id);
CREATE INDEX idx_links_target ON system_links(target_system_id);
CREATE INDEX idx_links_strength ON system_links(strength DESC);

-- ============================================================================
-- CONTENT ITEMS (Knowledge Base)
-- ============================================================================

CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    system_id UUID NOT NULL REFERENCES sub_systems(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('note', 'article', 'book', 'video', 'podcast')
    ),
    title VARCHAR(500) NOT NULL,
    content TEXT,
    url TEXT,
    highlights TEXT[] DEFAULT ARRAY[]::TEXT[],
    personal_notes TEXT,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    linked_system_ids UUID[] DEFAULT ARRAY[]::UUID[],
    embedding vector(1536),
    source_metadata JSONB DEFAULT '{}'::jsonb,
    reference_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content_search tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(personal_notes, ''))
    ) STORED
);

CREATE INDEX idx_content_user ON content_items(user_id);
CREATE INDEX idx_content_system ON content_items(system_id);
CREATE INDEX idx_content_type ON content_items(user_id, type);
CREATE INDEX idx_content_tags ON content_items USING gin(tags);
CREATE INDEX idx_content_search ON content_items USING gin(content_search);
CREATE INDEX idx_content_embedding ON content_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- INTERACTIONS (Relationship Tracking)
-- ============================================================================

CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('conversation', 'date', 'conflict', 'milestone', 'observation')
    ),
    person VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    outcome VARCHAR(50) NOT NULL CHECK (
        outcome IN ('positive', 'neutral', 'negative', 'mixed')
    ),
    emotions TEXT[] DEFAULT ARRAY[]::TEXT[],
    learnings TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    linked_focus_area_ids UUID[] DEFAULT ARRAY[]::UUID[],
    linked_value_ids UUID[] DEFAULT ARRAY[]::UUID[],
    related_content_ids UUID[] DEFAULT ARRAY[]::UUID[],
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_interactions_user ON interactions(user_id);
CREATE INDEX idx_interactions_person ON interactions(user_id, person);
CREATE INDEX idx_interactions_date ON interactions(user_id, date DESC);
CREATE INDEX idx_interactions_outcome ON interactions(user_id, outcome);
CREATE INDEX idx_interactions_embedding ON interactions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Relationship quality metrics
CREATE TABLE relationship_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    person VARCHAR(255) NOT NULL,
    quality_score NUMERIC(3, 2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 1),
    previous_score NUMERIC(3, 2),
    trend VARCHAR(20) NOT NULL CHECK (trend IN ('improving', 'declining', 'stable')),
    components JSONB NOT NULL,
    interaction_ids UUID[] DEFAULT ARRAY[]::UUID[],
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_components CHECK (
        components ? 'positive_frequency' AND
        components ? 'emotional_connection' AND
        components ? 'communication_quality' AND
        components ? 'value_alignment'
    )
);

CREATE INDEX idx_metrics_user ON relationship_metrics(user_id);
CREATE INDEX idx_metrics_person ON relationship_metrics(user_id, person);
CREATE INDEX idx_metrics_calculated ON relationship_metrics(calculated_at DESC);

-- Relationship insights
CREATE TABLE relationship_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    person VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('drift', 'opportunity', 'pattern', 'milestone')),
    description TEXT NOT NULL,
    recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
    acknowledged BOOLEAN DEFAULT false,
    interaction_ids UUID[] DEFAULT ARRAY[]::UUID[],
    metrics_id UUID REFERENCES relationship_metrics(id) ON DELETE SET NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_insights_user ON relationship_insights(user_id);
CREATE INDEX idx_insights_person ON relationship_insights(user_id, person);
CREATE INDEX idx_insights_severity ON relationship_insights(severity);
CREATE INDEX idx_insights_acknowledged ON relationship_insights(user_id, acknowledged);

-- ============================================================================
-- CHAT & AI ASSISTANT
-- ============================================================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    archived BOOLEAN DEFAULT false,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_last_message ON conversations(user_id, last_message_at DESC);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]'::jsonb,
    is_tough_love BOOLEAN DEFAULT false,
    feedback VARCHAR(20) CHECK (feedback IN ('positive', 'negative')),
    related_interaction_ids UUID[] DEFAULT ARRAY[]::UUID[],
    related_content_ids UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id, created_at);
CREATE INDEX idx_messages_user ON chat_messages(user_id);

-- ============================================================================
-- EVENTS & CALENDAR
-- ============================================================================

CREATE TABLE upcoming_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    person VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    preparation_notes TEXT,
    talking_points TEXT[] DEFAULT ARRAY[]::TEXT[],
    linked_focus_area_ids UUID[] DEFAULT ARRAY[]::UUID[],
    related_content_ids UUID[] DEFAULT ARRAY[]::UUID[],
    reminder_sent BOOLEAN DEFAULT false,
    completed BOOLEAN DEFAULT false,
    interaction_id UUID REFERENCES interactions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_user ON upcoming_events(user_id);
CREATE INDEX idx_events_datetime ON upcoming_events(user_id, datetime);
CREATE INDEX idx_events_completed ON upcoming_events(user_id, completed, datetime);

-- ============================================================================
-- ANALYTICS & GROWTH TRACKING
-- ============================================================================

CREATE TABLE weekly_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    interactions_logged INTEGER DEFAULT 0,
    insights_gained INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    week_over_week_change JSONB DEFAULT '{}'::jsonb,
    top_focus_areas JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_week CHECK (week_end > week_start),
    CONSTRAINT unique_user_week UNIQUE(user_id, week_start)
);

CREATE INDEX idx_summaries_user ON weekly_summaries(user_id, week_start DESC);

CREATE TABLE accountability_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('reminder', 'milestone', 'drift', 'encouragement')
    ),
    message TEXT NOT NULL,
    suggested_action TEXT,
    acknowledged BOOLEAN DEFAULT false,
    focus_area_id UUID REFERENCES focus_areas(id) ON DELETE SET NULL,
    person VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON accountability_alerts(user_id);
CREATE INDEX idx_alerts_acknowledged ON accountability_alerts(user_id, acknowledged);

-- ============================================================================
-- VALUE ALIGNMENT TRACKING
-- ============================================================================

CREATE TABLE value_alignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
    value_id UUID NOT NULL REFERENCES core_values(id) ON DELETE CASCADE,
    alignment_score NUMERIC(3, 2) NOT NULL CHECK (
        alignment_score >= 0 AND alignment_score <= 1
    ),
    description TEXT,
    is_positive BOOLEAN DEFAULT true,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alignments_user ON value_alignments(user_id);
CREATE INDEX idx_alignments_interaction ON value_alignments(interaction_id);
CREATE INDEX idx_alignments_value ON value_alignments(value_id);
CREATE INDEX idx_alignments_score ON value_alignments(user_id, alignment_score DESC);

-- ============================================================================
-- GRAPH & MEMORY
-- ============================================================================

CREATE TABLE graph_nodes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('system', 'value', 'focus_area', 'content', 'person', 'interaction')
    ),
    label VARCHAR(500) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536),
    position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_nodes_user ON graph_nodes(user_id);
CREATE INDEX idx_nodes_type ON graph_nodes(user_id, type);

CREATE TABLE graph_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    weight NUMERIC(3, 2) DEFAULT 0.5 CHECK (weight >= 0 AND weight <= 1),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT no_self_edge CHECK (source_id != target_id)
);

CREATE INDEX idx_edges_user ON graph_edges(user_id);
CREATE INDEX idx_edges_source ON graph_edges(source_id);
CREATE INDEX idx_edges_target ON graph_edges(target_id);

CREATE TABLE memory_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (
        content_type IN ('interaction', 'note', 'insight', 'reflection')
    ),
    embedding vector(1536) NOT NULL,
    entity_id UUID,
    entity_type VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_memory_user ON memory_entries(user_id);
CREATE INDEX idx_memory_type ON memory_entries(user_id, content_type);
CREATE INDEX idx_memory_timestamp ON memory_entries(user_id, timestamp DESC);
CREATE INDEX idx_memory_embedding ON memory_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- DATA EXPORT
-- ============================================================================

CREATE TABLE data_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    format VARCHAR(20) NOT NULL CHECK (format IN ('json', 'csv', 'pdf')),
    include_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('pending', 'processing', 'ready', 'error')
    ) DEFAULT 'pending',
    download_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_exports_user ON data_export_requests(user_id);
CREATE INDEX idx_exports_status ON data_export_requests(status);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_psychological_profiles_updated_at BEFORE UPDATE ON psychological_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_core_values_updated_at BEFORE UPDATE ON core_values
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_focus_areas_updated_at BEFORE UPDATE ON focus_areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sub_systems_updated_at BEFORE UPDATE ON sub_systems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_content_items_updated_at BEFORE UPDATE ON content_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_interactions_updated_at BEFORE UPDATE ON interactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_upcoming_events_updated_at BEFORE UPDATE ON upcoming_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update item_count on sub_systems
CREATE OR REPLACE FUNCTION update_system_item_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE sub_systems SET item_count = item_count + 1 WHERE id = NEW.system_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE sub_systems SET item_count = item_count - 1 WHERE id = OLD.system_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.system_id != NEW.system_id THEN
        UPDATE sub_systems SET item_count = item_count - 1 WHERE id = OLD.system_id;
        UPDATE sub_systems SET item_count = item_count + 1 WHERE id = NEW.system_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_item_count AFTER INSERT OR UPDATE OR DELETE ON content_items
    FOR EACH ROW EXECUTE FUNCTION update_system_item_count();

-- Update message_count on conversations
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversations
        SET message_count = message_count + 1,
            last_message_at = NEW.created_at
        WHERE id = NEW.conversation_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversations SET message_count = message_count - 1 WHERE id = OLD.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_count AFTER INSERT OR DELETE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_message_count();

-- ============================================================================
-- DEFAULT DATA SEED
-- ============================================================================

-- Function to seed default sub-systems for new users
CREATE OR REPLACE FUNCTION seed_default_subsystems(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO sub_systems (user_id, name, description, icon, color, is_default) VALUES
    (p_user_id, 'General', 'General relationship knowledge and insights', 'grid', 'hsl(221, 83%, 53%)', true),
    (p_user_id, 'Dating', 'Dating strategies, first dates, and romantic connections', 'heart', 'hsl(0, 84%, 60%)', true),
    (p_user_id, 'Masculinity', 'Masculine energy, leadership, and strength', 'shield', 'hsl(262, 83%, 58%)', true),
    (p_user_id, 'Femininity', 'Feminine energy, receptivity, and grace', 'flower', 'hsl(340, 82%, 52%)', true),
    (p_user_id, 'Management', 'Leadership, team dynamics, and professional relationships', 'users', 'hsl(166, 76%, 41%)', true);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Recent interactions with relationship metrics
CREATE VIEW recent_interactions_with_metrics AS
SELECT
    i.*,
    rm.quality_score,
    rm.trend
FROM interactions i
LEFT JOIN LATERAL (
    SELECT quality_score, trend
    FROM relationship_metrics
    WHERE person = i.person AND user_id = i.user_id
    ORDER BY calculated_at DESC
    LIMIT 1
) rm ON true
ORDER BY i.date DESC;

-- Focus areas with recent progress
CREATE VIEW focus_areas_with_progress AS
SELECT
    fa.*,
    COUNT(fap.id) as checkpoint_count,
    MAX(fap.recorded_at) as last_checkpoint
FROM focus_areas fa
LEFT JOIN focus_area_progress fap ON fa.id = fap.focus_area_id
GROUP BY fa.id;

-- Sub-systems with content count and links
CREATE VIEW systems_with_stats AS
SELECT
    s.*,
    COUNT(DISTINCT ci.id) as actual_item_count,
    COUNT(DISTINCT sl.id) as link_count
FROM sub_systems s
LEFT JOIN content_items ci ON s.id = ci.system_id
LEFT JOIN system_links sl ON s.id = sl.source_system_id OR s.id = sl.target_system_id
GROUP BY s.id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Core user accounts (single user per database instance)';
COMMENT ON TABLE psychological_profiles IS 'User psychological traits and patterns';
COMMENT ON TABLE core_values IS 'User core values (adapted from Pyramid Mission/Vision)';
COMMENT ON TABLE sub_systems IS 'Knowledge domains (adapted from Pyramid hierarchy)';
COMMENT ON TABLE content_items IS 'Knowledge base items (adapted from DocumentChunk)';
COMMENT ON TABLE interactions IS 'Relationship interaction records';
COMMENT ON TABLE relationship_metrics IS 'Relationship quality scores (adapted from AlignmentScore)';
COMMENT ON TABLE relationship_insights IS 'AI-generated relationship insights (adapted from DriftAlert)';
COMMENT ON TABLE value_alignments IS 'Interaction-value alignment tracking (adapted from ProvenanceChain)';

-- ============================================================================
-- INITIAL SETUP NOTES
-- ============================================================================

-- To initialize a new user:
-- 1. INSERT INTO users (name, email) VALUES ('User Name', 'user@example.com') RETURNING id;
-- 2. SELECT seed_default_subsystems(user_id);
-- 3. INSERT INTO user_settings (user_id) VALUES (user_id);
-- 4. INSERT INTO psychological_profiles (user_id, ...) VALUES (user_id, ...);
