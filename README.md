# Centralized Procurement Tracking and Financial Monitoring System
### Commission on Human Rights – Cordillera Administrative Region (CHR-CAR)
**Undergraduate College Capstone — 50% Working-System Prototype**

---

## 1. Project Overview & Prototype Purpose
This prototype represents the **50% working-system submission** for the capstone project titled **"Centralized Procurement Tracking and Financial Monitoring System for CHR-CAR"**. 

It focuses **exclusively on the core functional modules** necessary to prove the four foundational architectural concepts of the study:
1. **Centralized:** All core procurement information, specifications, bidder quotations, and status history are stored in **ONE MySQL database** (`chr_procurement`).
2. **Connected:** Clear 2-way data flow:
   $$\text{React Interface} \longrightarrow \text{PHP API Endpoint} \longrightarrow \text{MySQL Database} \longrightarrow \text{PHP JSON Response} \longrightarrow \text{React Interface}$$
3. **Real-Time Synchronization:** Creating records, changing status, or submitting quotations immediately updates the screens and triggers recalculation of procurement savings without delay.
4. **Transparent & Auditable:** All stakeholders can track Approved Budgets for Contracts (ABC), winning quotation amounts, realized savings ($$\text{ABC} - \text{Awarded Amount}$$), supplier quotations, and chronological transaction history.

---

## 2. Scope & Authentication Notice
In accordance with the 50% submission guidelines:
- **Authentication & Authorization are temporarily out of scope (scheduled as future features).**
- There is **no login screen**, **no registration form**, **no session handling**, and **no password hashing/management**.
- The interface provides a **simple prototype switcher** at the top allowing evaluators to toggle seamlessly between:
  - **CHR Personnel View** (Administrative, evaluation, workflow, and financial monitoring)
  - **Bidder View** (Public notices, RFQ discovery, quotation submission, and status tracking)

---

## 3. The 10 Core Modules Built

| # | Module Name | Primary User | Purpose & Description |
|---|---|---|---|
| **1** | **CHR Dashboard** | CHR Personnel | High-level summary KPI cards (Total Procurements, Active/Open, Under Evaluation, Awarded, Total ABC, Awarded Amount, Realized Savings), quick action buttons, and recent activity tables. |
| **2** | **Procurement Form** | CHR Personnel | Create and Edit procurement records with Reference Number, Project Title, Description, Mode, ABC, Deadline, and dynamic line-item specifications. |
| **3** | **Procurement Table** | CHR Personnel | Centralized master table displaying all registered projects. Filter by status (`Draft`, `Published / Open`, `Under Evaluation`, `Awarded`, `Completed`), keyword search, and quick status actions. |
| **4** | **Procurement Details** | CHR Personnel | Full breakdown of a single procurement project: specifications, financial transparency card, status tracker, bid table, and transaction history. |
| **5** | **Bidder Opportunities** | Bidder / Supplier | Publicly accessible catalog of active notices published by CHR-CAR. Bidders can review specifications and click *"Submit Quotation"*. |
| **6** | **Bidder Quotation Form** | Bidder / Supplier | Clean quotation submission form where suppliers enter company name, representative, contact details, price proposal, and compliance notes without logging in. |
| **7** | **CHR Bid Table** | CHR Personnel | Tabulated review of all received quotations with price comparisons against ABC. Includes the **"Select Winning Bid"** action which automatically records the contract award and calculates savings. |
| **8** | **Procurement Status Tracker** | CHR Personnel | Visual milestone tracker across 9 statutory stages (Purchase Request &rarr; Request for Quotation &rarr; Abstract &rarr; BAC Resolution &rarr; Notice of Award &rarr; Purchase Order &rarr; Notice to Proceed &rarr; Delivery & Inspection &rarr; Payment & Completion). |
| **9** | **Simple Financial Monitoring** | CHR Personnel | Regional financial ledger tracking total allocated budget, committed contracts, realized procurement savings ($$\text{ABC} - \text{Awarded Amount}$$), and savings rates. |
| **10** | **Transaction History** | CHR Personnel | Immutable chronological audit trail table logging all creation, status transitions, bidder submissions, and award decisions. |

---

## 4. Technology Stack (Strictly Plain / Pure)

- **Frontend:** React (Vite SPA) using JavaScript (JSX), **semantic HTML5** (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<form>`, `<fieldset>`, `<legend>`, `<label>`, `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`), and **plain CSS** (`src/index.css`).
- **Backend:** **Pure / Plain PHP 8.x** with PDO (PHP Data Objects) and prepared statements. (No Laravel, Symfony, Node backend, or Express).
- **Database:** **MySQL 5.7+ / MariaDB 10.4+** (`database/schema.sql`).
- **HTTP Transport:** Native browser `fetch()` API.

---

## 5. Local Setup Instructions

### Step 1: Database Setup
1. Start MySQL using **XAMPP**, **MariaDB**, or native MySQL command line.
2. Import the schema file:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   *(Or open phpMyAdmin at `http://localhost/phpmyadmin`, create/select database `chr_procurement`, and import `database/schema.sql`).*

### Step 2: Run the PHP Backend (No Apache Required)
As specified in the student guidelines, pure PHP can be run directly using PHP's built-in development server:
```bash
# Navigate to the project root and start PHP on port 8000:
php -S localhost:8000
```
*Alternatively, you may place the project in `C:\xampp\htdocs\chr-procurement-system` and run Apache.*

### Step 3: Run the React Frontend
```bash
# In another terminal window:
npm install
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 6. Student Defense Guide: Key Functions & Connections

Every function across PHP and React includes clear docblock comments explaining its purpose, caller, endpoint, and MySQL table.

### Example PHP Connection (`api/config/database.php`):
```php
/**
 * Opens the connection to the CHR procurement MySQL database.
 * Used by: get_procurements.php, create_procurement.php,
 * update_procurement.php, create_bid.php, and update_status.php.
 * Connects to: MySQL Database 'chr_procurement'
 * Database tables affected: procurements, procurement_items, bids, transaction_history.
 */
function connectDatabase() { ... }
```

### Example React Fetch Connection (`src/services/api.js`):
```javascript
/**
 * Loads all procurement records from the PHP backend.
 * Used by: ProcurementTable.jsx, CHRDashboard.jsx, and BidderOpportunities.jsx.
 * Connects to: /api/procurements/get_procurements.php
 * Database table affected: Reads from procurements, bids, and procurement_items.
 */
export async function loadProcurements(status = '') { ... }
```

### The Automatic Savings Calculation Formula:
When CHR Personnel clicks **"Select Winning Bid"** (`api/procurements/select_bid.php`):
$$\text{Procurement Savings} = \text{ABC (Approved Budget for the Contract)} - \text{Awarded Bid Amount}$$
The backend sets `awarded_amount`, computes `savings`, updates `status = 'Awarded'`, advances `current_stage = 'Notice of Award'`, and logs the award into `transaction_history` in a single atomic database transaction.
