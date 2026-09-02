DROP INDEX IF EXISTS idx_users_person_id_unique;
DROP INDEX IF EXISTS idx_users_person_id;
ALTER TABLE users DROP COLUMN IF EXISTS person_id;
ALTER TABLE users DROP COLUMN IF EXISTS user_type;
DROP TYPE IF EXISTS user_type;
