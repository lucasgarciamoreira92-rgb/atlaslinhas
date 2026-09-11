CREATE TABLE local_credentials (
 user_id TEXT PRIMARY KEY REFERENCES members(user_id),
 password_hash TEXT NOT NULL
);
CREATE TABLE local_sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES local_credentials(user_id),
 expires_at INTEGER NOT NULL
);
CREATE INDEX local_sessions_user ON local_sessions(user_id);
CREATE TABLE local_login_attempts (
 key TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL,
 reset_at INTEGER NOT NULL
);
