-- Up Migration
CREATE SCHEMA app;

-- Down Migration
-- Deliberately no CASCADE: refuse to remove unexpected application data.
DROP SCHEMA app;
