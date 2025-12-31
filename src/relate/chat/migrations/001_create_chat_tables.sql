-- Migration: Create Chat Tables for Enhanced Chat Service
-- Phase 4: PKA-Relate Backend
-- Date: 2025-12-30

-- =============================================
-- Chat Conversations
-- =============================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  tags TEXT[],
  related_systems UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_updated ON chat_conversations(updated_at DESC);
CREATE INDEX idx_chat_conversations_tags ON chat_conversations USING GIN(tags);

COMMENT ON TABLE chat_conversations IS 'Stores chat conversation metadata';
COMMENT ON COLUMN chat_conversations.message_count IS 'Auto-updated by trigger';
COMMENT ON COLUMN chat_conversations.related_systems IS 'Array of SubSystem IDs referenced in conversation';

-- =============================================
-- Chat Messages
-- =============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB,
  provenance JSONB,
  is_tough_love BOOLEAN DEFAULT FALSE,
  tough_love_reasons TEXT[],
  confidence DECIMAL(3,2),
  synthesized_from INTEGER DEFAULT 0,
  includes_external BOOLEAN DEFAULT FALSE,
  feedback TEXT CHECK (feedback IN ('positive', 'negative')),
  feedback_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_feedback ON chat_messages(feedback) WHERE feedback IS NOT NULL;
CREATE INDEX idx_chat_messages_tough_love ON chat_messages(is_tough_love) WHERE is_tough_love = TRUE;
CREATE INDEX idx_chat_messages_sources ON chat_messages USING GIN(sources);

COMMENT ON TABLE chat_messages IS 'Stores user and assistant messages with context';
COMMENT ON COLUMN chat_messages.sources IS 'JSON array of ChatSource objects';
COMMENT ON COLUMN chat_messages.provenance IS 'JSON ProvenanceChain showing how answer was derived';
COMMENT ON COLUMN chat_messages.is_tough_love IS 'Whether tough love mode was activated for this response';
COMMENT ON COLUMN chat_messages.confidence IS 'Confidence score 0-1 based on source quality';

-- =============================================
-- External Source Cache
-- =============================================
CREATE TABLE IF NOT EXISTS external_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  content TEXT,
  publication_date TIMESTAMPTZ,
  topics TEXT[],
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  last_verified TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 0
);

CREATE INDEX idx_external_sources_author ON external_sources(author);
CREATE INDEX idx_external_sources_topics ON external_sources USING GIN(topics);
CREATE INDEX idx_external_sources_cached ON external_sources(cached_at DESC);
CREATE INDEX idx_external_sources_url ON external_sources(url);

COMMENT ON TABLE external_sources IS 'Cached external content from thought leaders';
COMMENT ON COLUMN external_sources.access_count IS 'Number of times this source has been referenced';

-- =============================================
-- Chat Quality Metrics
-- =============================================
CREATE TABLE IF NOT EXISTS chat_quality_metrics (
  message_id UUID PRIMARY KEY REFERENCES chat_messages(id) ON DELETE CASCADE,
  source_relevance DECIMAL(3,2),
  source_diversity DECIMAL(3,2),
  external_usage DECIMAL(3,2),
  citation_density DECIMAL(5,2),
  time_to_response INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_quality_metrics_relevance ON chat_quality_metrics(source_relevance);
CREATE INDEX idx_chat_quality_metrics_latency ON chat_quality_metrics(time_to_response);

COMMENT ON TABLE chat_quality_metrics IS 'Quality metrics for each assistant response';
COMMENT ON COLUMN chat_quality_metrics.source_relevance IS 'Average relevance score of sources used (0-1)';
COMMENT ON COLUMN chat_quality_metrics.source_diversity IS 'Diversity across SubSystems (0-1)';
COMMENT ON COLUMN chat_quality_metrics.citation_density IS 'Citations per 100 words';
COMMENT ON COLUMN chat_quality_metrics.time_to_response IS 'Response time in milliseconds';

-- =============================================
-- User Settings for Chat
-- =============================================
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tough_love_mode_enabled BOOLEAN DEFAULT FALSE,
  default_mentor_id UUID REFERENCES mentors(id) ON DELETE SET NULL,
  streaming_enabled BOOLEAN DEFAULT TRUE,
  max_history_messages INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE user_settings IS 'User preferences for chat service';
COMMENT ON COLUMN user_settings.tough_love_mode_enabled IS 'Allow automatic tough love mode activation';
COMMENT ON COLUMN user_settings.default_mentor_id IS 'Default mentor persona for responses';

-- =============================================
-- Triggers
-- =============================================

-- Update conversation metadata when message is inserted
CREATE OR REPLACE FUNCTION update_conversation_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_conversations
  SET
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chat_message_inserted ON chat_messages;
CREATE TRIGGER chat_message_inserted
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_metadata();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON chat_conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Materialized View for Searchable Content
-- =============================================

-- Create materialized view for efficient full-text search
CREATE MATERIALIZED VIEW IF NOT EXISTS user_searchable_content AS
SELECT
  ci.id,
  ci.user_id,
  ci.system_id,
  ci.title,
  ss.name AS system_name,
  CONCAT_WS(
    ' ',
    ci.title,
    ci.content,
    ARRAY_TO_STRING(ci.highlights, ' '),
    ci.personal_notes
  ) AS full_text,
  ci.type,
  ci.tags,
  ci.created_at
FROM content_items ci
JOIN sub_systems ss ON ci.system_id = ss.id;

CREATE INDEX idx_user_searchable_user ON user_searchable_content(user_id);
CREATE INDEX idx_user_searchable_system ON user_searchable_content(system_id);
CREATE INDEX idx_user_searchable_fts ON user_searchable_content USING GIN(to_tsvector('english', full_text));

COMMENT ON MATERIALIZED VIEW user_searchable_content IS 'Denormalized searchable content for efficient queries';

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_searchable_content()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_searchable_content;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_searchable_content() IS 'Refresh searchable content view (call periodically)';

-- =============================================
-- Analytics Views
-- =============================================

-- Chat usage by user
CREATE OR REPLACE VIEW chat_usage_stats AS
SELECT
  c.user_id,
  COUNT(DISTINCT c.id) AS total_conversations,
  COUNT(m.id) AS total_messages,
  COUNT(DISTINCT DATE(m.created_at)) AS active_days,
  AVG(c.message_count) AS avg_messages_per_conversation,
  COUNT(m.id) FILTER (WHERE m.is_tough_love = TRUE) AS tough_love_messages,
  COUNT(m.id) FILTER (WHERE m.feedback = 'positive') AS positive_feedback_count,
  COUNT(m.id) FILTER (WHERE m.feedback = 'negative') AS negative_feedback_count
FROM chat_conversations c
LEFT JOIN chat_messages m ON c.id = m.conversation_id
GROUP BY c.user_id;

COMMENT ON VIEW chat_usage_stats IS 'Aggregate chat usage statistics per user';

-- Quality metrics summary
CREATE OR REPLACE VIEW chat_quality_summary AS
SELECT
  m.user_id,
  AVG(q.source_relevance) AS avg_source_relevance,
  AVG(q.source_diversity) AS avg_source_diversity,
  AVG(q.external_usage) AS avg_external_usage,
  AVG(q.citation_density) AS avg_citation_density,
  AVG(q.time_to_response) AS avg_response_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY q.time_to_response) AS p95_response_time_ms
FROM chat_messages m
JOIN chat_quality_metrics q ON m.id = q.message_id
WHERE m.type = 'assistant'
GROUP BY m.user_id;

COMMENT ON VIEW chat_quality_summary IS 'Quality metrics summary per user';

-- =============================================
-- Initial Data
-- =============================================

-- Insert default user settings for existing users
INSERT INTO user_settings (user_id, tough_love_mode_enabled, streaming_enabled)
SELECT id, FALSE, TRUE
FROM users
ON CONFLICT (user_id) DO NOTHING;

-- =============================================
-- Permissions (adjust for your auth system)
-- =============================================

-- Grant permissions (example - adjust for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON chat_conversations TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;
-- GRANT SELECT ON external_sources TO authenticated;
-- GRANT SELECT ON chat_quality_metrics TO authenticated;
-- GRANT SELECT, UPDATE ON user_settings TO authenticated;

-- =============================================
-- Indexes for Performance
-- =============================================

-- Additional composite indexes for common queries
CREATE INDEX idx_messages_user_conv_date ON chat_messages(user_id, conversation_id, created_at DESC);
CREATE INDEX idx_conversations_user_updated ON chat_conversations(user_id, updated_at DESC);

-- Partial indexes for active conversations
CREATE INDEX idx_active_conversations ON chat_conversations(user_id, updated_at DESC)
WHERE last_message_at > NOW() - INTERVAL '30 days';

-- =============================================
-- Cleanup Functions
-- =============================================

-- Function to clean up old external sources
CREATE OR REPLACE FUNCTION cleanup_old_external_sources()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM external_sources
  WHERE cached_at < NOW() - INTERVAL '90 days'
    AND access_count = 0;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_external_sources() IS 'Remove unused external sources older than 90 days';

-- Function to archive old conversations
CREATE OR REPLACE FUNCTION archive_old_conversations(days_old INTEGER DEFAULT 180)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- This is a placeholder - implement actual archival logic
  -- Could move to archive table or mark as archived
  UPDATE chat_conversations
  SET tags = ARRAY_APPEND(tags, 'archived')
  WHERE last_message_at < NOW() - (days_old || ' days')::INTERVAL
    AND NOT 'archived' = ANY(tags);

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_old_conversations(INTEGER) IS 'Archive conversations older than specified days';

-- =============================================
-- Migration Complete
-- =============================================

-- Verify all tables exist
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'chat_conversations',
      'chat_messages',
      'external_sources',
      'chat_quality_metrics',
      'user_settings'
    );

  IF table_count = 5 THEN
    RAISE NOTICE 'Migration successful: All 5 chat tables created';
  ELSE
    RAISE WARNING 'Migration incomplete: Expected 5 tables, found %', table_count;
  END IF;
END $$;
