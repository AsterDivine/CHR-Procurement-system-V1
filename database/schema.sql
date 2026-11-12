-- =============================================================================
-- Centralized Procurement Tracking and Financial Monitoring System for CHR-CAR
-- Database Schema for 50% Working-System Prototype
-- Target DBMS: MySQL 5.7+ / MariaDB 10.4+
-- Database Name: chr_procurement
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================
-- NOTE FOR CAPSTONE DEFENSE:
-- This database schema models the centralized data storage for the CHR-CAR
-- procurement unit. In this 50% prototype, authentication tables (users/passwords)
-- and sessions are omitted per prototype scope.
-- All procurements, line items, bidder quotations, and transaction audit trails
-- are linked through relational primary and foreign keys.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS chr_procurement
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chr_procurement;

-- Disable foreign key checks during schema re-creation
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS transaction_history;
DROP TABLE IF EXISTS bids;
DROP TABLE IF EXISTS procurement_items;
DROP TABLE IF EXISTS procurements;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. PROCUREMENTS TABLE
-- Centralized master table storing procurement projects posted by CHR-CAR.
-- Stores the Approved Budget for the Contract (ABC), awarded contract price,
-- computed procurement savings (ABC - Awarded Amount), and statutory workflow stage.
-- =============================================================================
CREATE TABLE procurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    procurement_mode VARCHAR(100) NOT NULL DEFAULT 'NP-53.9 Small Value Procurement',
    abc DECIMAL(12,2) NOT NULL,
    deadline DATETIME NOT NULL,
    status ENUM(
        'Draft',
        'Published / Open',
        'Under Evaluation',
        'Awarded',
        'Completed',
        'Cancelled'
    ) NOT NULL DEFAULT 'Draft',
    current_stage ENUM(
        'Purchase Request',
        'Request for Quotation',
        'Abstract of Canvass',
        'BAC Resolution',
        'Notice of Award',
        'Purchase Order',
        'Notice to Proceed',
        'Delivery & Inspection',
        'Payment & Completion'
    ) NOT NULL DEFAULT 'Purchase Request',
    awarded_bid_id INT NULL,
    awarded_amount DECIMAL(12,2) NULL,
    savings DECIMAL(12,2) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_procurements_status (status),
    INDEX idx_procurements_ref (reference_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. PROCUREMENT_ITEMS TABLE
-- Stores technical line-item specifications belonging to a procurement project.
-- Foreign Key: procurement_id references procurements(id).
-- ON DELETE CASCADE ensures line items are removed if a draft procurement is deleted.
-- =============================================================================
CREATE TABLE procurement_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    procurement_id INT NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    specifications TEXT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    estimated_unit_cost DECIMAL(12,2) NULL,
    CONSTRAINT fk_items_procurement FOREIGN KEY (procurement_id)
        REFERENCES procurements(id) ON DELETE CASCADE,
    INDEX idx_items_procurement (procurement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. BIDS TABLE (BIDDER QUOTATIONS)
-- Stores official price quotations submitted by prospective suppliers/bidders.
-- In this 50% prototype, bidders submit quotations directly with their company
-- name and contact details without requiring account registration or login.
-- Foreign Key: procurement_id references procurements(id).
-- =============================================================================
CREATE TABLE bids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    procurement_id INT NOT NULL,
    bidder_name VARCHAR(200) NOT NULL,
    representative_name VARCHAR(150) NOT NULL,
    contact_number VARCHAR(50) NOT NULL,
    email VARCHAR(150) NOT NULL,
    bid_amount DECIMAL(12,2) NOT NULL,
    remarks TEXT NULL,
    status ENUM(
        'Submitted',
        'Under Review',
        'Selected / Awarded',
        'Disqualified / Rejected'
    ) NOT NULL DEFAULT 'Submitted',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bids_procurement FOREIGN KEY (procurement_id)
        REFERENCES procurements(id) ON DELETE CASCADE,
    INDEX idx_bids_procurement (procurement_id),
    INDEX idx_bids_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraint from procurements.awarded_bid_id to bids.id
ALTER TABLE procurements
    ADD CONSTRAINT fk_procurements_awarded_bid FOREIGN KEY (awarded_bid_id)
    REFERENCES bids(id) ON DELETE SET NULL;

-- =============================================================================
-- 4. TRANSACTION_HISTORY TABLE (AUDIT TRAIL)
-- Provides full transparency and accountability by logging every status change,
-- stage transition, bid submission, and winning bid award.
-- Foreign Key: procurement_id references procurements(id).
-- =============================================================================
CREATE TABLE transaction_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    procurement_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    previous_status VARCHAR(100) NULL,
    new_status VARCHAR(100) NULL,
    remarks TEXT NULL,
    performed_by VARCHAR(100) NOT NULL DEFAULT 'CHR Procurement Officer',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_procurement FOREIGN KEY (procurement_id)
        REFERENCES procurements(id) ON DELETE CASCADE,
    INDEX idx_history_procurement (procurement_id),
    INDEX idx_history_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- INITIAL SEED DATA FOR CHR-CAR CAPSTONE DEMO
-- Pre-populates realistic regional procurement scenarios:
-- 1. Office Supplies (Awarded - with savings)
-- 2. IT Equipment & Laptops (Published / Open for bidding)
-- 3. Vehicle Preventive Maintenance (Under Evaluation)
-- 4. Human Rights Training Catering & Venue (Draft)
-- =============================================================================

-- Scenario 1: Office Supplies (Awarded with competitive bid and realized savings)
INSERT INTO procurements (id, reference_number, title, description, procurement_mode, abc, deadline, status, current_stage, awarded_amount, savings)
VALUES (
    1,
    'CHR-CAR-2024-001',
    'Procurement of General Office Supplies for Q3-Q4 2024',
    'Procurement of paper supplies, toner cartridges, archival folders, and consumable stationery for CHR-CAR Regional Office operations in Baguio City.',
    'NP-53.9 Small Value Procurement',
    150000.00,
    '2024-11-20 17:00:00',
    'Awarded',
    'Notice of Award',
    142500.00,
    7500.00
);

INSERT INTO procurement_items (procurement_id, item_name, specifications, quantity, unit, estimated_unit_cost) VALUES
(1, 'A4 Copy Paper (80gsm)', 'Substance 20/80gsm, 500 sheets/ream, white, high opacity', 300.00, 'reams', 250.00),
(1, 'Black Laser Toner Cartridge', 'Compatible with HP LaserJet Pro M404 series, OEM equivalent', 10.00, 'cartridges', 4500.00),
(1, 'Archival Storage Boxes', 'Heavy duty corrugated board with lid, legal size', 100.00, 'pieces', 300.00);

INSERT INTO bids (id, procurement_id, bidder_name, representative_name, contact_number, email, bid_amount, remarks, status) VALUES
(1, 1, 'Highland Paper & Office Depot', 'Roberto Flores', '0917-555-0192', 'sales@highlandpaper.ph', 142500.00, 'Complies with all technical specs; delivery within 7 working days from PO receipt.', 'Selected / Awarded'),
(2, 1, 'Pines General Merchandise Inc.', 'Maria Teresa Reyes', '0918-555-4321', 'pinesgenmerch@gmail.com', 148000.00, 'Quotation valid for 30 calendar days; free delivery to Baguio regional office.', 'Under Review');

UPDATE procurements SET awarded_bid_id = 1 WHERE id = 1;

INSERT INTO transaction_history (procurement_id, action, previous_status, new_status, remarks, performed_by) VALUES
(1, 'Procurement Created', NULL, 'Draft', 'Purchase Request initiated by CHR Administrative Unit.', 'CHR BAC Secretariat'),
(1, 'Status Updated', 'Draft', 'Published / Open', 'Published on bulletin board and public agency portal.', 'CHR BAC Secretariat'),
(1, 'Bid Submitted', 'Published / Open', 'Published / Open', 'Bid submitted by Highland Paper & Office Depot (PHP 142,500.00).', 'Highland Paper & Office Depot'),
(1, 'Bid Submitted', 'Published / Open', 'Published / Open', 'Bid submitted by Pines General Merchandise Inc. (PHP 148,000.00).', 'Pines General Merchandise Inc.'),
(1, 'Bid Awarded', 'Published / Open', 'Awarded', 'Highland Paper & Office Depot selected as Lowest Calculated and Responsive Quotation. Realized savings: PHP 7,500.00.', 'CHR BAC Committee');

-- Scenario 2: IT Equipment (Published / Open - ready for demo quotation submission)
INSERT INTO procurements (id, reference_number, title, description, procurement_mode, abc, deadline, status, current_stage)
VALUES (
    2,
    'CHR-CAR-2024-002',
    'Supply and Delivery of Field Monitoring Laptops and Portable Scanners',
    'Procurement of high-performance ruggedized laptops and duplex document scanners for field human rights investigators deployed across Cordillera provinces.',
    'NP-53.9 Small Value Procurement',
    450000.00,
    DATE_ADD(NOW(), INTERVAL 14 DAY),
    'Published / Open',
    'Request for Quotation'
);

INSERT INTO procurement_items (procurement_id, item_name, specifications, quantity, unit, estimated_unit_cost) VALUES
(2, 'Field Investigator Laptop', 'Intel Core i7 13th Gen, 16GB RAM, 512GB NVMe SSD, 14-inch FHD Anti-Glare, Windows 11 Pro', 5.00, 'units', 70000.00),
(2, 'Portable Duplex Document Scanner', 'USB-powered, 25ppm/50ipm scan speed, 20-sheet ADF, PDF searchable output', 4.00, 'units', 25000.00);

INSERT INTO transaction_history (procurement_id, action, previous_status, new_status, remarks, performed_by) VALUES
(2, 'Procurement Created', NULL, 'Draft', 'Approved Purchase Request received from Human Rights Protection Division.', 'CHR BAC Secretariat'),
(2, 'Status Updated', 'Draft', 'Published / Open', 'Request for Quotation posted publicly. Open for supplier quotations.', 'CHR BAC Secretariat');

-- Scenario 3: Service Vehicle Maintenance (Under Evaluation)
INSERT INTO procurements (id, reference_number, title, description, procurement_mode, abc, deadline, status, current_stage)
VALUES (
    3,
    'CHR-CAR-2024-003',
    'Preventive Maintenance, Parts Replacement, and Servicing for Official Vehicles',
    'Comprehensive 40,000-km PMS, brake pad replacement, synthetic oil replacement, and wheel alignment for Toyota Innova and Isuzu D-Max assigned to CHR-CAR.',
    'NP-53.9 Small Value Procurement',
    60000.00,
    '2024-11-10 17:00:00',
    'Under Evaluation',
    'Abstract of Canvass'
);

INSERT INTO procurement_items (procurement_id, item_name, specifications, quantity, unit, estimated_unit_cost) VALUES
(3, '40,000-km Periodic Maintenance Service', 'Full synthetic engine oil change, oil filter, air filter, brake caliper overhaul', 2.00, 'vehicles', 22000.00),
(3, 'Heavy-Duty All-Terrain Tires', 'Size 245/70 R16, load index 111, mounted, balanced with new rubber valves', 4.00, 'pieces', 4000.00);

INSERT INTO bids (id, procurement_id, bidder_name, representative_name, contact_number, email, bid_amount, remarks, status) VALUES
(3, 3, 'Cordillera Auto Care & Diagnostic Center', 'Danilo Baguio', '0920-555-8811', 'service@cordilleraautocare.com', 56400.00, 'Includes 6-month warranty on labor and parts. Genuine OEM parts only.', 'Under Review'),
(4, 3, 'Baguio Precision Motors Works', 'Engr. Arthur Gomez', '0919-555-9922', 'arthur@precisionmotors.ph', 58500.00, 'Turnaround time: 3 business days upon vehicle turnover.', 'Under Review');

INSERT INTO transaction_history (procurement_id, action, previous_status, new_status, remarks, performed_by) VALUES
(3, 'Procurement Created', NULL, 'Draft', 'Purchase Request logged by Administrative and General Services Section.', 'CHR BAC Secretariat'),
(3, 'Status Updated', 'Draft', 'Published / Open', 'Notice to prospective auto service centers issued.', 'CHR BAC Secretariat'),
(3, 'Bid Submitted', 'Published / Open', 'Published / Open', 'Quotation received from Cordillera Auto Care (PHP 56,400.00).', 'Cordillera Auto Care'),
(3, 'Bid Submitted', 'Published / Open', 'Published / Open', 'Quotation received from Baguio Precision Motors Works (PHP 58,500.00).', 'Baguio Precision Motors Works'),
(3, 'Status Updated', 'Published / Open', 'Under Evaluation', 'Deadline closed. Canvass abstract prepared for BAC committee evaluation.', 'CHR BAC Committee');

-- Scenario 4: Human Rights Summit Venue & Catering (Draft)
INSERT INTO procurements (id, reference_number, title, description, procurement_mode, abc, deadline, status, current_stage)
VALUES (
    4,
    'CHR-CAR-2024-004',
    'Meals, Refreshments, and Venue Rental for Cordillera Human Rights Summit 2024',
    'Provision of plenary conference hall with audio-visual equipment, morning snacks, buffet lunch, and afternoon snacks for 120 regional civil society participants.',
    'NP-53.9 Small Value Procurement',
    95000.00,
    DATE_ADD(NOW(), INTERVAL 20 DAY),
    'Draft',
    'Purchase Request'
);

INSERT INTO procurement_items (procurement_id, item_name, specifications, quantity, unit, estimated_unit_cost) VALUES
(4, 'Buffet Lunch & Snacks Package', 'AM snack, full buffet lunch with 3 viands + dessert, PM snack, free-flowing coffee', 120.00, 'pax', 650.00),
(4, 'Function Hall Rental with Tech Support', 'Fully air-conditioned/ventilated hall for 8 hours, 3 wireless mics, projector, basic sound system', 1.00, 'day', 17000.00);

INSERT INTO transaction_history (procurement_id, action, previous_status, new_status, remarks, performed_by) VALUES
(4, 'Procurement Created', NULL, 'Draft', 'Drafting specifications for annual regional human rights stakeholders summit.', 'CHR Promotion Division');
