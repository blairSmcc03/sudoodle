CREATE TABLE IF NOT EXISTS results (
  date TEXT NOT NULL,
  player TEXT NOT NULL CHECK (player IN ('her', 'him')),
  seconds INTEGER NOT NULL CHECK (seconds >= 0),
  lives_lost INTEGER NOT NULL CHECK (lives_lost >= 0),
  PRIMARY KEY (date, player)
);
