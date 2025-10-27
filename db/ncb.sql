-- ===========================================
-- Organization Management Database Schema
-- ===========================================

-- Create Database
CREATE DATABASE IF NOT EXISTS ncb_db;
USE ncb_db;

-- ==============================
-- 1. Members Table
-- ==============================
CREATE TABLE members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100),
    -- last_name VARCHAR(100),
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20),
    address VARCHAR(255),
    designation VARCHAR(100),
    membership_type ENUM('Executive','Founder','Associate','General') DEFAULT 'General',
    joined_date DATE,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    profile_image VARCHAR(255)
);

-- ==============================
-- 2. Committee Roles
-- ==============================
CREATE TABLE committee_roles (
    committee_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT,
    role_title VARCHAR(100),
    committee_type ENUM('Executive','Founder','Associate'),
    start_date DATE,
    end_date DATE,
    status ENUM('Active','Former') DEFAULT 'Active',
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE CASCADE
);

-- ==============================
-- 3. Users Table
-- ==============================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    email VARCHAR(150) UNIQUE,
    role ENUM('User','Admin','Super Admin') DEFAULT 'User',
    member_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    status ENUM('Active','Suspended','Deactivated') DEFAULT 'Active',
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE SET NULL
);

-- ==============================
-- 4. Notices Table
-- ==============================
CREATE TABLE notices (
    notice_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    status ENUM('Published','Draft','Archived') DEFAULT 'Published',
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ==============================
-- 5. Events Table
-- ==============================
CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    start_date DATETIME,
    end_date DATETIME,
    organized_by INT,
    image VARCHAR(255),
    status ENUM('Upcoming','Ongoing','Completed','Cancelled') DEFAULT 'Upcoming',
    FOREIGN KEY (organized_by) REFERENCES members(member_id) ON DELETE SET NULL
);

-- ==============================
-- 6. Image Gallery
-- ==============================
CREATE TABLE image_gallery (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    image_path VARCHAR(255),
    uploaded_by INT,
    related_event INT NULL,
    related_member INT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (related_event) REFERENCES events(event_id) ON DELETE SET NULL,
    FOREIGN KEY (related_member) REFERENCES members(member_id) ON DELETE SET NULL
);

-- ==============================
-- 7. Activity Logs (Optional)
-- ==============================
CREATE TABLE activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ===========================================
-- SAMPLE DATA INSERTION
-- ===========================================

-- Insert Members
INSERT INTO members ( full_name,  email, phone, address, designation, membership_type, joined_date, status)
VALUES
('Dhirendra Kathayat', 'dhirendra@example.com', '9800000000', 'Seoul, South Korea', 'President', 'Founder', '2020-01-01', 'Active'),
('Suman Thapa', 'suman@example.com', '9800000001', 'Kathmandu, Nepal', 'Secretary', 'Executive', '2021-03-15', 'Active'),
('Anjali Bista', 'anjali@example.com', '9800000002', 'Pokhara, Nepal', 'Member', 'Associate', '2022-07-10', 'Active');

-- Insert Committee Roles
INSERT INTO committee_roles (member_id, role_title, committee_type, start_date, status)
VALUES
(1, 'President', 'Founder', '2020-01-01', 'Active'),
(2, 'Secretary', 'Executive', '2021-03-15', 'Active'),
(3, 'Treasurer', 'Associate', '2022-07-10', 'Active');

-- Insert Users
INSERT INTO users (username, password, email, role, member_id)
VALUES
('superadmin', SHA2('super123',256), 'admin@org.com', 'Super Admin', 1),
('admin1', SHA2('admin123',256), 'admin1@org.com', 'Admin', 2),
('user1', SHA2('user123',256), 'user1@org.com', 'User', 3);

-- Insert Notices
INSERT INTO notices (title, content, created_by, status)
VALUES
('Annual General Meeting', 'The AGM will be held on 15th December at the main hall.', 1, 'Published'),
('Membership Renewal', 'All members are requested to renew their membership before 31st March.', 2, 'Published');

-- Insert Events
INSERT INTO events (title, description, location, start_date, end_date, organized_by, image, status)
VALUES
('Charity Marathon', 'Fundraising marathon for education projects.', 'Kathmandu', '2024-03-01 08:00:00', '2024-03-01 12:00:00', 1, 'marathon.jpg', 'Completed'),
('Cultural Night', 'An event showcasing Nepali culture and traditions.', 'Seoul', '2025-05-10 18:00:00', '2025-05-10 22:00:00', 2, 'cultural_night.jpg', 'Upcoming');

-- Insert Gallery Images
INSERT INTO image_gallery (title, description, image_path, uploaded_by, related_event, related_member)
VALUES
('Marathon Group Photo', 'Group photo of participants after the marathon.', 'images/marathon_group.jpg', 1, 1, NULL),
('Cultural Dance', 'Traditional Nepali dance performance.', 'images/cultural_dance.jpg', 2, 2, 2);

-- Insert Activity Logs
INSERT INTO activity_logs (user_id, action)
VALUES
(1, 'Created Annual General Meeting notice'),
(2, 'Added new member Anjali Bista'),
(3, 'Viewed event details for Cultural Night');

-- ===========================================
-- END OF SCRIPT
-- ===========================================
