-- ================================================================
-- DB Index Optimization Audit
-- Run these queries in psql to verify index usage
-- ================================================================

-- Check unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND NOT indisprimary
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check slow queries (requires pg_stat_statements extension)
-- Run: CREATE EXTENSION pg_stat_statements;
SELECT
  query,
  calls,
  total_exec_time / calls AS avg_ms,
  rows / calls AS avg_rows,
  100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS hit_ratio
FROM pg_stat_statements
WHERE calls > 100
ORDER BY avg_ms DESC
LIMIT 20;

-- Table bloat check
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- Missing index candidates (seq scans on large tables)
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_live_tup,
  ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2) AS seq_ratio
FROM pg_stat_user_tables
WHERE seq_scan + idx_scan > 100
  AND n_live_tup > 10000
  AND seq_scan > idx_scan
ORDER BY seq_tup_read DESC;

-- ================================================================
-- COMPOSITE INDEX STRATEGY
-- ================================================================
-- The following composite indexes are already defined in schema.prisma
-- and will be created by migrations:
--
-- payments:       (userId, status), (provider, status), (fawryReferenceNumber)
-- enrollments:    (userId, courseId) UNIQUE, (userId, status), (courseId, status)
-- users:          (phone) UNIQUE, (email) UNIQUE, (role, status)
-- courses:        (status, isFeatured), (categoryId, status)
-- audit_logs:     (actorId, createdAt), (resource, resourceId)
-- notifications:  (userId, isRead, createdAt)
-- quiz_attempts:  (quizId, userId, status)
-- coupon_usages:  (couponId, userId, courseId) UNIQUE
-- access_codes:   (codeHash) UNIQUE, (batchId, isActive)
--
-- Additional recommended indexes for analytics queries:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_paidAt
  ON payments(paidAt) WHERE status = 'COMPLETED';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_created_course
  ON enrollments(courseId, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lecture_progress_enrollment_completed
  ON lecture_progress(enrollment_id, is_completed) WHERE is_completed = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_created_resource
  ON audit_logs(created_at DESC, resource);

-- ================================================================
-- VACUUMING STRATEGY
-- ================================================================
-- Set in postgresql.conf or via ALTER SYSTEM:
-- autovacuum_vacuum_scale_factor = 0.05
-- autovacuum_analyze_scale_factor = 0.02
-- autovacuum_vacuum_cost_delay = 2ms
