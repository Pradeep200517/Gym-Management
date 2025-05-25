-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS protein_plans;
DROP TABLE IF EXISTS workout_plans;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS members;

-- Create members table with authentication fields
CREATE TABLE members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(20) NOT NULL,
  contact VARCHAR(20) NOT NULL,
  goal VARCHAR(50) NOT NULL,
  months INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  reset_token VARCHAR(255) NULL,
  reset_token_expires TIMESTAMP NULL
);

-- Create attendance table
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'Present',
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Create payments table
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'Completed',
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Create workout plans table
CREATE TABLE workout_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT,
  goal VARCHAR(50) NOT NULL,
  plan_details TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Create protein plans table
CREATE TABLE protein_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT,
  goal VARCHAR(50) NOT NULL,
  intake VARCHAR(50) NOT NULL,
  meal_details TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Create login_attempts table to track failed login attempts
CREATE TABLE login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT FALSE
);

-- Create sessions table to track active sessions
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT,
  token VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Insert sample admin user (password: admin123)
INSERT INTO members (name, email, password, age, gender, contact, goal, months)
VALUES ('Admin', 'admin@fitlife.com', '$2b$10$X7UrY9pR8P1w8X8X8X8X8O8X8X8X8X8X8X8X8X8X8X8X8X8X8X', 30, 'male', '1234567890', 'fit', 12);

-- Create indexes for better performance
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_sessions_token ON sessions(token); 