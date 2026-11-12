-- =============================================================================
-- Centralized Procurement Tracking and Financial Monitoring System for CHR-CAR
-- Database Schema for 50% Working-System Prototype
-- Target DBMS: MySQL 5.7+ / MariaDB 10.4+
-- Database Name: chr_procurement
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

CREATE DATABASE IF NOT EXISTS chr_procurement
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chr_procurement;

-- Disable foreign key checks during clean re-creation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS transaction_history;
DROP TABLE IF EXISTS bids;
DROP TABLE IF EXISTS procurements;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- TABLE 1: procurements
-- =============================================================================
-- WHAT THIS TABLE REPRESENTS:
-- This is the central master table of the entire system. It records every
-- official procurement opportunity / project posted by the Commission on
-- Human Rights - Cordillera Administrative Region (CHR-CAR).
--
-- Each row represents one procurement project (such as purchasing office supplies,
-- procuring field monitoring laptops, or vehicle preventive maintenance).
-- It stores:
--   - The unique reference tracking number (reference_no)
--   - The project title and description
--   - The mode / method of procurement (procurement_type)
--   - The Approved Budget for the Contract (abc)
--   - The funding / budget source (budget_source)
--   - The submission deadline (deadline)
--   - The current procurement status (Open, For Evaluation, Awarded, In Progress, Completed)
--   - The final winning bid price (awarded_amount)
--   - The realized government savings (savings = abc - awarded_amount)
-- =============================================================================

CREATE TABLE procurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference_no VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    procurement_type VARCHAR(100) NULL,
    abc DECIMAL(12,2) NOT NULL,
    budget_source VARCHAR(150) NULL,
    deadline DATE NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    awarded_amount DECIMAL(12,2) NULL,
    savings DECIMAL(12,2) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_procurements_status (status),
    INDEX idx_procurements_ref (reference_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- TABLE 2: bids
-- =============================================================================
-- WHAT THIS TABLE REPRESENTS:
-- This table records all price quotations submitted by prospective suppliers
-- and bidders interested in fulfilling a published procurement opportunity.
--
-- HOW BIDS CONNECTS TO PROCUREMENTS:
-- Each bid belongs to exactly one procurement project.
-- The column `procurement_id` is a FOREIGN KEY that points to `procurements.id`.
-- This establishes a "One-to-Many" relationship:
--   One procurement project can receive MANY bids from different bidders.
--
-- ON DELETE CASCADE RULE:
-- If an administrator deletes a procurement record, all associated supplier
-- bids for that specific project are automatically removed by MySQL to maintain
-- referential integrity without leaving orphan rows.
-- =============================================================================

CREATE TABLE bids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    procurement_id INT NOT NULL,
    bidder_name VARCHAR(150) NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    bid_amount DECIMAL(12,2) NOT NULL,
    remarks TEXT NULL,
    status VARCHAR(50) DEFAULT 'Submitted',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bids_procurement FOREIGN KEY (procurement_id)
        REFERENCES procurements(id) ON DELETE CASCADE,
    INDEX idx_bids_procurement (procurement_id),
    INDEX idx_bids_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- TABLE 3: transaction_history
-- =============================================================================
-- WHAT THIS TABLE REPRESENTS:
-- This table acts as the transparent audit trail and event ledger for CHR-CAR.
-- It records every major operational action and status milestone transition that
-- occurs throughout a procurement project's lifecycle.
--
-- HOW TRANSACTION_HISTORY CONNECTS TO PROCUREMENTS:
-- The column `procurement_id` is a FOREIGN KEY that points to `procurements.id`.
-- This establishes a "One-to-Many" relationship:
--   One procurement project has MANY audit log entries recorded in chronological order.
--
-- ON DELETE CASCADE RULE:
-- If a procurement record is deleted, its corresponding historical logs are
-- automatically cleaned up to prevent orphaned log entries.
-- =============================================================================

CREATE TABLE transaction_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    procurement_id INT NOT NULL,
    action VARCHAR(150) NOT NULL,
    old_value VARCHAR(255) NULL,
    new_value VARCHAR(255) NULL,
    remarks TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_procurement FOREIGN KEY (procurement_id)
        REFERENCES procurements(id) ON DELETE CASCADE,
    INDEX idx_history_procurement (procurement_id),
    INDEX idx_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- DEMO SEED DATA (3 Core CHR-CAR Procurement Scenarios)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Scenario 1: General Office Supplies (Awarded with Savings)
-- Status: 'Awarded'
-- Demonstrates: Bid selection, awarded amount, and positive government savings.
-- ABC = 150,000.00 | Winning Bid = 142,500.00 | Savings = 7,500.00
-- -----------------------------------------------------------------------------
INSERT INTO procurements (
    id,
    reference_no,
    title,
    description,
    procurement_type,
    abc,
    budget_source,
    deadline,
    status,
    awarded_amount,
    savings,
    created_at
) VALUES (
    1,
    'CHR-CAR-2024-001',
    'Procurement of General Office Supplies for Q3-Q4 2024',
    'Procurement of paper supplies, toner cartridges, archival folders, and consumable stationery for CHR-CAR Regional Office operations in Baguio City.',
    'NP-53.9 Small Value Procurement',
    150000.00,
    'GAA 2024 - General Administration and Support (GAS)',
    '2024-11-20',
    'Awarded',
    142500.00,
    7500.00,
    '2024-10-15 09:30:00'
);

-- Bids received for Project 1
INSERT INTO bids (
    id,
    procurement_id,
    bidder_name,
    company_name,
    bid_amount,
    remarks,
    status,
    submitted_at
) VALUES 
(
    1,
    1,
    'Roberto Flores',
    'Highland Paper & Office Depot',
    142500.00,
    'Complies with all technical specs; delivery within 7 working days from PO receipt.',
    'Selected',
    '2024-10-25 11:20:00'
),
(
    2,
    1,
    'Maria Teresa Reyes',
    'Pines General Merchandise Inc.',
    148000.00,
    'Quotation valid for 30 calendar days; free delivery to Baguio regional office.',
    'Not Selected',
    '2024-10-26 14:45:00'
);

-- Transaction history for Project 1
INSERT INTO transaction_history (
    procurement_id,
    action,
    old_value,
    new_value,
    remarks,
    created_at
) VALUES 
(
    1,
    'Procurement Created',
    NULL,
    'Open',
    'Purchase Request logged and approved by CHR-CAR Procurement Unit.',
    '2024-10-15 09:30:00'
),
(
    1,
    'Bid Submitted',
    NULL,
    '142500.00',
    'Quotation submitted by Highland Paper & Office Depot.',
    '2024-10-25 11:20:00'
),
(
    1,
    'Bid Submitted',
    NULL,
    '148000.00',
    'Quotation submitted by Pines General Merchandise Inc.',
    '2024-10-26 14:45:00'
),
(
    1,
    'Status Changed',
    'Open',
    'For Evaluation',
    'Submission deadline closed. Quotations forwarded to BAC for evaluation.',
    '2024-10-28 17:00:00'
),
(
    1,
    'Contract Awarded',
    'For Evaluation',
    'Awarded',
    'Awarded to Highland Paper & Office Depot. Realized savings: PHP 7,500.00.',
    '2024-11-02 14:15:00'
);


-- -----------------------------------------------------------------------------
-- Scenario 2: Field Monitoring Laptops and Scanners (Open for Bidding)
-- Status: 'Open'
-- Demonstrates: Public opportunity open for prospective bidder quotation submissions.
-- ABC = 450,000.00 | Awarded = NULL | Savings = NULL
-- -----------------------------------------------------------------------------
INSERT INTO procurements (
    id,
    reference_no,
    title,
    description,
    procurement_type,
    abc,
    budget_source,
    deadline,
    status,
    awarded_amount,
    savings,
    created_at
) VALUES (
    2,
    'CHR-CAR-2024-002',
    'Supply and Delivery of Field Monitoring Laptops and Portable Scanners',
    'Procurement of high-performance ruggedized laptops and duplex document scanners for field human rights investigators deployed across Cordillera provinces.',
    'NP-53.9 Small Value Procurement',
    450000.00,
    'GAA 2024 - Human Rights Protection Program',
    DATE_ADD(CURDATE(), INTERVAL 14 DAY),
    'Open',
    NULL,
    NULL,
    '2024-10-20 11:00:00'
);

-- Transaction history for Project 2
INSERT INTO transaction_history (
    procurement_id,
    action,
    old_value,
    new_value,
    remarks,
    created_at
) VALUES 
(
    2,
    'Procurement Created',
    NULL,
    'Open',
    'Approved Purchase Request received from Human Rights Protection Division; posted publicly.',
    '2024-10-20 11:00:00'
);


-- -----------------------------------------------------------------------------
-- Scenario 3: Preventive Maintenance and Servicing for Official Vehicles
-- Status: 'For Evaluation'
-- Demonstrates: Project whose quotation submission period has closed and is
--               currently being evaluated by the Bids and Awards Committee (BAC).
-- ABC = 60,000.00 | Awarded = NULL | Savings = NULL
-- -----------------------------------------------------------------------------
INSERT INTO procurements (
    id,
    reference_no,
    title,
    description,
    procurement_type,
    abc,
    budget_source,
    deadline,
    status,
    awarded_amount,
    savings,
    created_at
) VALUES (
    3,
    'CHR-CAR-2024-003',
    'Preventive Maintenance, Parts Replacement, and Servicing for Official Vehicles',
    'Comprehensive 40,000-km PMS, brake pad replacement, synthetic oil replacement, and wheel alignment for Toyota Innova and Isuzu D-Max assigned to CHR-CAR.',
    'NP-53.9 Small Value Procurement',
    60000.00,
    'GAA 2024 - General Administrative and Support (GAS)',
    '2024-11-10',
    'For Evaluation',
    NULL,
    NULL,
    '2024-10-18 14:00:00'
);

-- Bids received for Project 3
INSERT INTO bids (
    id,
    procurement_id,
    bidder_name,
    company_name,
    bid_amount,
    remarks,
    status,
    submitted_at
) VALUES 
(
    3,
    3,
    'Danilo Baguio',
    'Cordillera Auto Care & Diagnostic Center',
    56400.00,
    'Includes 6-month warranty on labor and parts. Genuine OEM parts only.',
    'Under Review',
    '2024-10-28 10:15:00'
),
(
    4,
    3,
    'Engr. Arthur Gomez',
    'Baguio Precision Motors Works',
    58500.00,
    'Turnaround time: 3 business days upon vehicle turnover.',
    'Under Review',
    '2024-10-29 15:30:00'
);

-- Transaction history for Project 3
INSERT INTO transaction_history (
    procurement_id,
    action,
    old_value,
    new_value,
    remarks,
    created_at
) VALUES 
(
    3,
    'Procurement Created',
    NULL,
    'Open',
    'Purchase Request logged by Administrative and General Services Section.',
    '2024-10-18 14:00:00'
),
(
    3,
    'Bid Submitted',
    NULL,
    '56400.00',
    'Quotation received from Cordillera Auto Care & Diagnostic Center.',
    '2024-10-28 10:15:00'
),
(
    3,
    'Bid Submitted',
    NULL,
    '58500.00',
    'Quotation received from Baguio Precision Motors Works.',
    '2024-10-29 15:30:00'
),
(
    3,
    'Status Changed',
    'Open',
    'For Evaluation',
    'Quotation deadline reached. Canvass abstract prepared for BAC committee evaluation.',
    '2024-11-10 17:00:00'
);


-- =============================================================================
-- BEGINNER-FRIENDLY DATABASE RELATIONSHIP EXPLANATION
-- =============================================================================
--
-- Think of this database like a physical government filing cabinet with 3 folders:
--
-- 1. Folder 1: "PROCUREMENTS" (The Main Project File)
--    - Each piece of paper here is ONE project that CHR-CAR wants to buy or hire.
--    - It has an ID number (Primary Key), a budget (ABC), a deadline, and a status.
--
-- 2. Folder 2: "BIDS" (The Supplier Quotations)
--    - Prospective suppliers submit price quotations.
--    - Every bid paper has a note saying: "This bid is for Project ID #X" (Foreign Key: procurement_id).
--    - Relationship: One procurement project can have MANY supplier bids (One-to-Many).
--
-- 3. Folder 3: "TRANSACTION_HISTORY" (The Activity Log Sheet)
--    - Every time something happens to a project (such as when it was created,
--      when a bid arrived, when status changed, or when a winner was awarded),
--      a new line is stamped here with the project's ID (Foreign Key: procurement_id).
--    - Relationship: One procurement project can have MANY historical log entries (One-to-Many).
--
-- What does "ON DELETE CASCADE" mean?
-- If an official project is deleted from the `procurements` table, MySQL automatically
-- deletes all the bids and all history logs attached to that project. This prevents
-- "ghost" or orphaned bids from lingering in the database without a parent project.
-- =============================================================================
