CREATE TABLE access_people(id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE access_accounts(
 id TEXT PRIMARY KEY, account_key TEXT NOT NULL UNIQUE, data TEXT NOT NULL CHECK(json_valid(data)),
 policy TEXT NOT NULL CHECK(json_valid(policy)), version INTEGER NOT NULL CHECK(version>0),
 secret TEXT, secret_version INTEGER NOT NULL DEFAULT 0 CHECK(secret_version>=0), created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE access_reports(
 id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES access_accounts(id) DEFERRABLE INITIALLY DEFERRED,
 destination_id TEXT, reason TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('open','resolved')),
 created_at TEXT NOT NULL, author TEXT NOT NULL, resolved_at TEXT, resolved_by TEXT
);
CREATE INDEX access_reports_account ON access_reports(account_id,created_at);
CREATE TABLE access_history(id TEXT PRIMARY KEY,account_id TEXT,action TEXT NOT NULL,created_at TEXT NOT NULL,actor TEXT NOT NULL,detail TEXT NOT NULL CHECK(json_valid(detail)));
CREATE INDEX access_history_account ON access_history(account_id,created_at);
CREATE TABLE access_unlocks(token_hash TEXT PRIMARY KEY,session_hash TEXT NOT NULL REFERENCES local_sessions(token_hash) ON DELETE CASCADE,account_id TEXT NOT NULL,version INTEGER NOT NULL,secret_version INTEGER NOT NULL,scope TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE access_vault_state(id TEXT PRIMARY KEY,key_hash TEXT NOT NULL);
INSERT INTO access_people(id,name) SELECT lower(hex(randomblob(16))),name FROM (
 SELECT DISTINCT trim(json_extract(data,'$.owner')) AS name FROM lines
 UNION SELECT DISTINCT trim(json_extract(d.value,'$.owner')) FROM settings s,json_each(s.data,'$.devices') d
) WHERE name IS NOT NULL AND length(name)>0;
CREATE TRIGGER access_account_insert AFTER INSERT ON access_accounts BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;
CREATE TRIGGER access_account_update AFTER UPDATE ON access_accounts BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; DELETE FROM access_unlocks WHERE account_id=NEW.id; END;
CREATE TRIGGER access_account_delete AFTER DELETE ON access_accounts BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; DELETE FROM access_unlocks WHERE account_id=OLD.id; END;
CREATE TRIGGER access_people_insert AFTER INSERT ON access_people BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;
CREATE TRIGGER access_people_update AFTER UPDATE ON access_people BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;
CREATE TRIGGER access_people_delete AFTER DELETE ON access_people BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;
CREATE TRIGGER access_report_insert AFTER INSERT ON access_reports BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;
CREATE TRIGGER access_report_update AFTER UPDATE ON access_reports BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;
CREATE TRIGGER access_report_delete AFTER DELETE ON access_reports BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;
CREATE TRIGGER access_history_insert AFTER INSERT ON access_history BEGIN UPDATE storage_revision SET revision=revision+1 WHERE id='main'; END;
-- A configured authenticator does not move when a SIM moves. Prevent removing its device.
CREATE TRIGGER access_device_references BEFORE UPDATE ON settings WHEN NEW.id='main' BEGIN
 SELECT CASE WHEN EXISTS(
  SELECT 1 FROM access_accounts a,json_each(a.data,'$.methods') m,json_each(m.value,'$.destinations') t
  WHERE json_extract(t.value,'$.deviceId') IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM json_each(NEW.data,'$.devices') d WHERE json_extract(d.value,'$.id')=json_extract(t.value,'$.deviceId')
  )
 ) THEN RAISE(ABORT,'access_device_referenced') END;
END;
