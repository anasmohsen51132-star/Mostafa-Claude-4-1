-- ================================================================
-- PostgreSQL initialization script
-- Runs once on first container startup
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Performance tuning (applied at session level; tune postgresql.conf for globals)
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;   -- Log queries > 1s
ALTER SYSTEM SET idle_in_transaction_session_timeout = '30s';
ALTER SYSTEM SET statement_timeout = '30s';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE mustafa_academy TO academy_user;
