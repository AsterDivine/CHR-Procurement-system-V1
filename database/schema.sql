-- =============================================================================
-- Centralized Procurement Tracking and Financial Monitoring System for CHR-CAR
-- Database Schema Definition (MySQL / MariaDB)
-- Database Name: chr_procurement
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =============================================================================

CREATE DATABASE IF NOT EXISTS chr_procurement
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chr_procurement;

-- Disable foreign key checks during initialization
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in reverse dependency order if resetting
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS transaction_history;
DROP TABLE IF EXISTS transaction_documents;
DROP TABLE IF EXISTS procurement_transactions;
DROP TABLE IF EXISTS budget_sources;
DROP TABLE IF EXISTS bid_documents;
DROP TABLE IF EXISTS bids;
DROP TABLE IF EXISTS opportunity_items;
DROP TABLE IF EXISTS procurement_opportunities;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. USERS TABLE
-- Stores authenticated accounts for only TWO roles: 'bidder' and 'chr'.
-- Conceptual rule: organization_name is required for bidders, optional for CHR.
-- =============================================================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('bidder', 'chr') NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    organization_name VARCHAR(200) NULL,
    contact_number VARCHAR(50) NULL,
    address TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. PROCUREMENT_OPPORTUNITIES TABLE
-- Official bidding notices, RFQs, and Invitations to Bid posted by CHR.
-- Statuses: draft, open, closed, awarded, completed.
-- =============================================================================
CREATE TABLE procurement_opportunities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference_no VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    procurement_type VARCHAR(100) NOT NULL,
    abc DECIMAL(12,2) NOT NULL,
    deadline DATETIME NOT NULL,
    status ENUM('draft', 'open', 'closed', 'awarded', 'completed') NOT NULL DEFAULT 'draft',
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_opportunities_created_by FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_opportunities_status (status),
    INDEX idx_opportunities_deadline (deadline),
    INDEX idx_opportunities_ref (reference_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. OPPORTUNITY_ITEMS TABLE
-- Line items and technical specifications belonging to an opportunity.
-- Safe CASCADE: Deleting a draft opportunity removes its line items.
-- =============================================================================
CREATE TABLE opportunity_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id INT NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    specifications TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    estimated_unit_cost DECIMAL(12,2) NULL,
    CONSTRAINT fk_items_opportunity FOREIGN KEY (opportunity_id)
        REFERENCES procurement_opportunities(id) ON DELETE CASCADE,
    INDEX idx_items_opportunity (opportunity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. BIDS TABLE
-- Quotations submitted by prospective suppliers.
-- UNIQUE constraint enforces: ONE bidder can submit only ONE bid per opportunity.
-- RESTRICT on opportunity and bidder prevents deleting records with active bids.
-- =============================================================================
CREATE TABLE bids (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id INT NOT NULL,
    bidder_id INT NOT NULL,
    bid_amount DECIMAL(12,2) NOT NULL,
    remarks TEXT NULL,
    status ENUM('submitted', 'under_review', 'selected', 'not_selected', 'withdrawn') NOT NULL DEFAULT 'submitted',
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bids_opportunity FOREIGN KEY (opportunity_id)
        REFERENCES procurement_opportunities(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bids_bidder FOREIGN KEY (bidder_id)
        REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_bidder_opportunity UNIQUE (opportunity_id, bidder_id),
    INDEX idx_bids_status (status),
    INDEX idx_bids_amount (bid_amount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. BID_DOCUMENTS TABLE
-- Supporting files (Financial quotation PDF, PhilGEPS cert, Mayor's permit, OSS).
-- CASCADE: If a bid record is purged, attached document metadata is removed.
-- =============================================================================
CREATE TABLE bid_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bid_id INT NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_documents_bid FOREIGN KEY (bid_id)
        REFERENCES bids(id) ON DELETE CASCADE,
    INDEX idx_documents_bid (bid_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. BUDGET_SOURCES TABLE
-- Tracks GAA funding sources and regional fiscal allocations.
-- =============================================================================
CREATE TABLE budget_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    fiscal_year INT NOT NULL,
    allocated_amount DECIMAL(12,2) NOT NULL,
    description TEXT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    INDEX idx_budget_fy (fiscal_year),
    INDEX idx_budget_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. PROCUREMENT_TRANSACTIONS TABLE
-- Internal transaction tracker following the 11 government procurement stages.
-- UNIQUE on opportunity_id ensures exactly one transaction per opportunity.
-- =============================================================================
CREATE TABLE procurement_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id INT NOT NULL UNIQUE,
    selected_bid_id INT NULL,
    control_no VARCHAR(50) NOT NULL UNIQUE,
    budget_source_id INT NULL,
    expense_category VARCHAR(100) NULL,
    abc DECIMAL(12,2) NOT NULL,
    awarded_amount DECIMAL(12,2) NULL,
    savings DECIMAL(12,2) NULL,
    current_stage ENUM(
        'Purchase Request',
        'Request for Quotation',
        'Abstract / Canvass',
        'BAC Resolution',
        'Notice of Award',
        'Purchase Order',
        'Notice to Proceed',
        'Delivery / Implementation',
        'Inspection / Evaluation',
        'Billing / Payment',
        'Completed'
    ) NOT NULL DEFAULT 'Purchase Request',
    payment_status ENUM('not_for_billing', 'for_billing', 'processing', 'paid') NOT NULL DEFAULT 'not_for_billing',
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_transactions_opportunity FOREIGN KEY (opportunity_id)
        REFERENCES procurement_opportunities(id) ON DELETE RESTRICT,
    CONSTRAINT fk_transactions_bid FOREIGN KEY (selected_bid_id)
        REFERENCES bids(id) ON DELETE SET NULL,
    CONSTRAINT fk_transactions_budget FOREIGN KEY (budget_source_id)
        REFERENCES budget_sources(id) ON DELETE SET NULL,
    CONSTRAINT fk_transactions_creator FOREIGN KEY (created_by)
        REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_transactions_stage (current_stage),
    INDEX idx_transactions_payment (payment_status),
    INDEX idx_transactions_control (control_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. TRANSACTION_DOCUMENTS TABLE
-- Compliance checklist files (PR, RFQ, Abstract, BAC Reso, NOA, PO, NTP, IAR, DV).
-- =============================================================================
CREATE TABLE transaction_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    status ENUM('pending', 'complete', 'verified') NOT NULL DEFAULT 'pending',
    uploaded_by INT NOT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transdocs_transaction FOREIGN KEY (transaction_id)
        REFERENCES procurement_transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_transdocs_uploader FOREIGN KEY (uploaded_by)
        REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_transdocs_tx (transaction_id),
    INDEX idx_transdocs_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. TRANSACTION_HISTORY TABLE
-- Stage transition and audit ledger for each procurement transaction.
-- =============================================================================
CREATE TABLE transaction_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    remarks TEXT NULL,
    performed_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_transaction FOREIGN KEY (transaction_id)
        REFERENCES procurement_transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_history_user FOREIGN KEY (performed_by)
        REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_history_tx (transaction_id),
    INDEX idx_history_action (action_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 10. AUDIT_LOGS TABLE
-- Global system security log for defense presentation and accountability.
-- SET NULL on user_id ensures audit logs remain preserved even if a user is purged.
-- =============================================================================
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id INT NULL,
    details TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- DEMO SEED DATA: 3 BUDGET SOURCES (Fake/Demo Values)
-- Note: Passwords are NOT inserted here. Passwords are created using password_hash()
-- via api/setup/create_demo_users.php.
-- =============================================================================
INSERT INTO budget_sources (name, fiscal_year, allocated_amount, description, active) VALUES
('GAA 2024 - MOOE Regular Fund (Demo)', 2024, 1250000.00, 'Demonstration fund allocation for General Administrative & Operations Maintenance', 1),
('GAA 2024 - Capital Outlay IT Fund (Demo)', 2024, 800000.00, 'Demonstration fund allocation for Regional Office IT and Office Equipment', 1),
('CHR Human Rights Protection Special Project Fund (Demo)', 2024, 500000.00, 'Demonstration fund allocation for Regional Human Rights Violations Documentation and Training', 1);
