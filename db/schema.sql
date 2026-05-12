-- 使用者資料表
CREATE TABLE IF NOT EXISTS users (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT    NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

-- Session 資料表
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT    PRIMARY KEY,
  username   TEXT    NOT NULL,
  expires_at INTEGER NOT NULL
);
