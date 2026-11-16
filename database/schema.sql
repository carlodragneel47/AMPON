-- Web-Based Pet Adoption System with Rule-Based Matching
-- MySQL schema. The server runs this automatically on start-up when DB_HOST is set,
-- but you can also open it in MySQL Workbench and execute it manually.

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  passwordHash  VARCHAR(100) NOT NULL,
  role          ENUM('adopter','admin') NOT NULL DEFAULT 'adopter',
  phone         VARCHAR(40)  NULL,
  address       VARCHAR(255) NULL,
  preferences   JSON NULL,               -- saved matching questionnaire answers
  createdAt     DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS pets (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(80)  NOT NULL,
  species           ENUM('dog','cat') NOT NULL,
  breed             VARCHAR(80)  NULL,
  sex               ENUM('male','female') NOT NULL,
  ageMonths         INT NOT NULL DEFAULT 0,
  size              ENUM('small','medium','large') NOT NULL,
  color             VARCHAR(80)  NULL,
  energy            ENUM('low','moderate','high') NOT NULL DEFAULT 'moderate',
  temperament       JSON NULL,           -- e.g. ["friendly","playful"]
  goodWithKids      ENUM('yes','no','unknown') NOT NULL DEFAULT 'unknown',
  goodWithDogs      ENUM('yes','no','unknown') NOT NULL DEFAULT 'unknown',
  goodWithCats      ENUM('yes','no','unknown') NOT NULL DEFAULT 'unknown',
  needsYard         TINYINT(1) NOT NULL DEFAULT 0,
  aloneTolerance    ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  training          ENUM('none','basic','trained') NOT NULL DEFAULT 'none',
  specialNeeds      TINYINT(1) NOT NULL DEFAULT 0,
  specialNeedsNotes VARCHAR(255) NULL,
  healthStatus      ENUM('healthy','recovering','under_treatment','critical') NOT NULL DEFAULT 'under_treatment',
  vaccinated        TINYINT(1) NOT NULL DEFAULT 0,
  dewormed          TINYINT(1) NOT NULL DEFAULT 0,
  neutered          TINYINT(1) NOT NULL DEFAULT 0,
  rehabProgress     INT NOT NULL DEFAULT 0,  -- 0..100
  status            ENUM('rescued','rehabilitation','available','adopted') NOT NULL DEFAULT 'rescued',
  rescueDate        DATE NULL,
  rescueLocation    VARCHAR(160) NULL,
  description       TEXT NULL,
  photo             VARCHAR(255) NULL,
  views             INT NOT NULL DEFAULT 0,
  createdAt         DATETIME NOT NULL,
  updatedAt         DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  userId        INT NOT NULL,
  petId         INT NOT NULL,
  phone         VARCHAR(40)  NOT NULL,
  address       VARCHAR(255) NOT NULL,
  reason        TEXT NOT NULL,
  homeVisitOk   TINYINT(1) NOT NULL DEFAULT 0,
  matchScore    INT NULL,                -- rule-based score at the time of applying
  status        ENUM('pending','approved','rejected','withdrawn') NOT NULL DEFAULT 'pending',
  adminNote     VARCHAR(255) NULL,
  createdAt     DATETIME NOT NULL,
  updatedAt     DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (petId)  REFERENCES pets(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS care_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  petId         INT NOT NULL,
  type          ENUM('checkup','vaccination','deworming','treatment','surgery','grooming','behavior','note') NOT NULL,
  notes         TEXT NOT NULL,
  recordedBy    INT NULL,
  createdAt     DATETIME NOT NULL,
  FOREIGN KEY (petId) REFERENCES pets(id) ON DELETE CASCADE
);

-- System log records (Chapter 3: objective usage data)
CREATE TABLE IF NOT EXISTS logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  userId        INT NULL,
  action        VARCHAR(40) NOT NULL,
  details       VARCHAR(500) NULL,
  createdAt     DATETIME NOT NULL,
  INDEX (action)
);
