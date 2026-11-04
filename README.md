# Centralized Procurement Tracking and Financial Monitoring System
### Commission on Human Rights – Cordillera Administrative Region (CHR-CAR)
**Undergraduate College Capstone Project — Minimum Viable Product (MVP)**

---

## 1. Project Description
The **Centralized Procurement Tracking and Financial Monitoring System** is a purpose-built web application designed for the **Commission on Human Rights – Cordillera Administrative Region (CHR-CAR)**. Developed in adherence to Philippine Republic Act No. 9184 (Government Procurement Reform Act) and Commission internal audit standards, the system consolidates procurement notices, supplier quotation submissions, documentary compliance verification, and 11-stage workflow tracking into a transparent, unified digital portal.

The solution addresses core operational challenges faced by regional government offices:
- **Dispersed Paper Trails:** Replaces manual ledgers and fragmented physical folders with an organized, auditable repository for statutory documents (Purchase Requests, Abstracts of Canvass, BAC Resolutions, Notices of Award, Purchase Orders, and Inspection Reports).
- **Milestone Transparency:** Tracks procurement items across 11 mandatory statutory stages from initial requisition through payment and project completion.
- **Budgetary Accountability:** Provides real-time regional financial monitoring, linking each procurement transaction to General Appropriations Act (GAA) funding sources, automatically calculating procurement savings (ABC vs. Awarded Amount), and monitoring disbursement status.
- **Public & Supplier Access:** Gives prospective suppliers and bidders a portal to review published opportunities, download specifications, submit competitive bids with supporting eligibility documents, and track their quotation status in real time.

---

## 2. Final System Roles
The MVP strictly implements **two authenticated roles** with absolute separation of duties:

| Role Key | Name in System | Scope & Description |
| :--- | :--- | :--- |
| `chr` | **CHR Personnel** | Regional Procurement Officers, Bids and Awards Committee (BAC) Secretariat, and Regional Budget Officers. Full administrative access to publish opportunities, review quotations, update 11 statutory workflow stages, upload official procurement documents, link GAA funding sources, monitor expenditure commitments, stream CSV audit reports, and inspect security audit trails. |
| `bidder` | **Bidder / Prospective Supplier** | External suppliers, vendors, and contractors. Authenticated portal allowing suppliers to browse active procurement opportunities, view line-item specifications, submit quotations with 1–5 supporting eligibility documents (PDF/images), track status (Submitted, Under Review, Selected, Not Selected), and view their own submissions in complete isolation. |

*Note: In accordance with capstone MVP requirements, there is no third role or separate Super Admin role. System audit logs and administrative monitoring are accessible directly to authorized CHR Personnel.*

---

## 3. Features Included in the MVP
### A. Authentication & User Management
- Secure session-based authentication using PHP PDO, password hashing (`password_hash` with `PASSWORD_DEFAULT`), and session regeneration (`session_regenerate_id(true)`).
- Role-based access control guards on both backend endpoints (`requireRole('chr')`, `requireRole('bidder')`) and client-side React routes (`ProtectedRoute`).
- Supplier self-registration strictly locked to `role = 'bidder'` with mandatory company/organization details and duplicate email detection.
- Protected internal CHR account provisioning (no public registration for agency staff).

### B. Procurement Opportunity Management
- Multi-field opportunity creation: Reference Number, Project Title, Detailed Description, Mode of Procurement (e.g., NP-53.9 Small Value Procurement, Competitive Bidding), Approved Budget for the Contract (ABC), and Submission Deadline.
- Dynamic line-item specifications builder (item name, technical specifications, quantity, unit of measurement, estimated unit cost).
- Controlled status lifecycle: `draft` ➔ `open` ➔ `closed` ➔ `awarded` ➔ `completed`.
- Safety rule: Opportunities marked `awarded` or `completed` are locked against edits to preserve public bidding audit integrity.
- Client-side search and status filtering for fast record lookup.

### C. Bid Quotation Submission & Supplier Isolation
- Electronic submission form for open opportunities prior to deadline expiration.
- Single quotation rule: Exactly one active bid permitted per bidder per opportunity (`uq_bidder_opportunity` database constraint).
- Supporting document uploader supporting 1 to 5 files per bid with server-side extension validation (`.pdf`, `.jpg`, `.jpeg`, `.png`), MIME inspection (`finfo`), and maximum size enforcement (5 MB each).
- Cryptographically randomized stored filenames (preventing path traversal and filename guessing).
- **Tenant/User Isolation:** Bidders are strictly prevented from viewing other suppliers' bid amounts, remarks, or uploaded attachments.

### D. CHR Bid Evaluation & Manual Selection
- Ranked bid abstracts sorted by quoted amount for transparent canvass evaluation.
- Individual bid inspection with instant document preview and download.
- Manual status updating: `submitted` ➔ `under_review` ➔ `selected` / `not_selected`.
- **Anti-Slop Governance:** Explicit decision-making; the system never makes automated awards. Winning supplier selection remains an accountable, logged human officer action.

### E. 11-Stage Procurement Transaction Tracker
- Seamless transition from opportunity to active procurement transaction with unique Control Number generation (`CTRL-YYYY-XXXX`).
- Automatic calculation of procurement savings: `Savings = ABC - Awarded Amount`. Validation rejects any awarded amount that exceeds ABC (preventing negative savings).
- Sequential progression across all 11 statutory stages without skipping:
  1. *Purchase Request (PR)*
  2. *Request for Quotation (RFQ)*
  3. *Abstract of Canvass*
  4. *BAC Resolution*
  5. *Notice of Award (NOA)*
  6. *Purchase Order (PO) / Contract*
  7. *Notice to Proceed (NTP)*
  8. *Delivery / Implementation*
  9. *Inspection & Acceptance (IAR)*
  10. *Billing / Disbursement Voucher*
  11. *Completed*
- Comprehensive stage transition ledger recording timestamp, previous stage, new stage, remarks, and acting officer.
- Compliance checklist attachment uploader supporting official agency documents.

### F. Budget Monitoring & Financial Summaries
- Tracking of regional funding sources (e.g., GAA MOOE Regular, Capital Outlay IT Fund, Human Rights Special Project Fund).
- Real-time financial metrics:
  - `Allocated Amount`: Total appropriated ceiling.
  - `Committed Amount`: Sum of awarded contracts tied to the funding source.
  - `Paid Amount`: Total disbursed for transactions marked `payment_status = 'paid'`.
  - `Available Balance`: `Allocated Amount - Committed Amount`.
  - `Realized Savings`: Cumulative savings generated through competitive supplier pricing.

### G. Reports, CSV Export & Print Layouts
- Filterable procurement accomplishment matrix (filter by date range, opportunity status, workflow stage, funding source).
- Native PHP streaming CSV export (`api/reports/export_csv.php`) with Excel UTF-8 BOM encoding.
- Offline/mock CSV fallback export directly within React when running in demo standalone mode.
- Government-standard print layout with formal agency letterhead (`@media print` styling that suppresses navigation bars, buttons, and headers).

### H. Global Search & Audit Logs
- Real-time global search across Reference Numbers, Control Numbers, Project Titles, and Supplier Names.
- Centralized security audit trail (`audit_logs`) tracking logins, opportunity creation, status changes, bid submissions, awards, and document uploads.

---

## 4. Features Intentionally Deferred
To maintain a realistic, defensible scope for an undergraduate capstone MVP, the following advanced enterprise capabilities were intentionally deferred:
1. **Automated AI Document Verification / OCR:** Compliance verification of business permits and tax clearances remains an explicit human task performed by the BAC Secretariat.
2. **Payment Gateway Integration:** The system tracks payment stages (`not_for_billing`, `for_billing`, `processing`, `paid`) without direct API links to Land Bank of the Philippines or external fintech gateways.
3. **Automated Lowest-Bid Award Algorithms:** Philippine procurement law (R.A. 9184) requires post-qualification of the Lowest Calculated and Responsive Bid (LCRB); automated machine awarding is legally non-compliant and therefore omitted.
4. **Hardware Biometric Authentication:** Traditional secure password hashing is implemented in place of fingerprint or smart card authentication.
5. **Government-Wide Accounting Journalization (eCOA/GAM):** The budget module is designed for administrative commitment monitoring, not full accrual government accounting.
6. **Multi-Region Cloud Federation:** Built specifically for the CHR Cordillera Administrative Region (CAR) office.

---

## 5. System Requirements
- **Web Server:** Apache (via XAMPP 8.1+ recommended)
- **Programming Language:** PHP 8.1 or higher (with `pdo`, `pdo_mysql`, `fileinfo`, `session`, and `json` extensions enabled)
- **Database Engine:** MySQL 5.7+ or MariaDB 10.4+
- **Frontend Runtime:** Node.js 18.x or 20.x with npm 9.x+
- **Web Browser:** Google Chrome, Microsoft Edge, or Mozilla Firefox (modern Chromium or Gecko)

---

## 6. Fresh Setup Instructions
Follow these steps to set up the system on a fresh workstation:

### Step 1: Clone or Copy Project Files
Place the project inside your XAMPP web root directory:
```bash
# Target path on Windows:
C:\xampp\htdocs\chr-procurement-system\
```

### Step 2: Verify PHP Extensions in XAMPP
Open `C:\xampp\php\php.ini` and verify that the following extensions are uncommented:
```ini
extension=pdo_mysql
extension=fileinfo
extension=curl
```

### Step 3: Install Frontend Dependencies
Open a command prompt in the project root:
```bash
cd C:\xampp\htdocs\chr-procurement-system
npm install
```

---

## 7. Database Import Steps

### Method A: Via phpMyAdmin (Recommended for Defense)
1. Start **Apache** and **MySQL** in the XAMPP Control Panel.
2. Open your browser and navigate to: `http://localhost/phpmyadmin`
3. Click the **Import** tab in the top navigation bar.
4. Click **Choose File** and select:
   `C:\xampp\htdocs\chr-procurement-system\database\schema.sql`
5. Ensure the character set is set to **utf-8** and click **Import** (or **Go**) at the bottom.
6. The database `chr_procurement` will be created with all 10 relational tables and default demo funding sources.

### Method B: Via MySQL Command Line
```bash
cd C:\xampp\mysql\bin
mysql -u root -p < "C:\xampp\htdocs\chr-procurement-system\database\schema.sql"
```
*(Press Enter when prompted for password if using default empty XAMPP password).*

---

## 8. How to Create Demo Users
The database schema does not store plain-text passwords. To create or reset the official demo accounts with valid bcrypt hashes:

1. Ensure Apache and MySQL are running.
2. Open your web browser and navigate to:
   ```
   http://localhost/chr-procurement-system/api/setup/create_demo_users.php
   ```
3. The setup script will execute prepared statements, insert/update the demo accounts, and display a confirmation banner with credentials.

---

## 9. How to Run Apache & MySQL
1. Launch the **XAMPP Control Panel** (`xampp-control.exe`).
2. Click **Start** next to **Apache**. Verify that the status turns green and port 80/443 is displayed.
3. Click **Start** next to **MySQL**. Verify that the status turns green and port 3306 is displayed.

---

## 10. How to Run the React Frontend
1. Open a terminal inside the project directory:
   ```bash
   npm run dev
   ```
2. The Vite development server will start at:
   ```
   http://localhost:3000
   ```
3. Open `http://localhost:3000` in your web browser.

*Note on Full-Stack Mode:* The frontend automatically communicates with `http://localhost/chr-procurement-system/api` when XAMPP is running. If XAMPP is offline during a UI walkthrough, the frontend gracefully activates realistic demo state fallbacks so reviewers can experience all workflows without crashing.

---

## 11. Demo Login Accounts

| Role | Email Address | Plain Password | Organization / Position |
| :--- | :--- | :--- | :--- |
| **CHR Personnel** | `chr.demo@example.test` | `Demo1234!` | Commission on Human Rights – CAR Regional Office |
| **Bidder / Supplier** | `bidder.demo@example.test` | `Demo1234!` | Highland IT & General Merchandise Corp. |

---

## 12. Upload Folder Notes & Permissions
The backend securely stores uploaded bid quotations and transaction compliance documents in separate subdirectories:
- Bid Documents: `api/uploads/bids/`
- Transaction Documents: `api/uploads/transactions/`

### Permissions & Security Features:
1. **Automatic Directory Creation:** `api/bids/submit.php` and `api/transactions/upload_document.php` will automatically create these folders with `0755` permissions if they do not exist.
2. **Folder Protection:** A `.htaccess` file inside `api/uploads/` prevents direct script execution (`.php` files cannot be executed inside uploads).
3. **Randomized File Storage:** Uploaded files are renamed using `bin2hex(random_bytes(8))` preventing filename enumeration attacks.
4. **MIME Verification:** Every file is verified using PHP `finfo` byte inspection rather than trusting the user-supplied browser extension.

---

## 13. Known Prototype Limitations
1. **Manual BAC Evaluation:** In accordance with R.A. 9184, bid selection requires manual review; the system does not automatically disqualify or choose winning bids.
2. **Single-Region Scope:** Configured specifically for CHR Cordillera Administrative Region (CAR); multi-branch consolidation is not in scope.
3. **Local Filesystem Storage:** Document files are stored on the local Apache server rather than an external cloud bucket (AWS S3 / Google Cloud Storage).
4. **Simplified Budget Commitments:** Budget calculations demonstrate commitment and available balances for management oversight rather than full double-entry accounting journals.

---

## 14. Suggested Future Improvements
1. **PhilGEPS Electronic Notice API Integration:** Synchronize RFQs and bidding notices directly with the Philippine Government Electronic Procurement System.
2. **Digital Signatures (PKI / PhilSys):** Integrate Department of Information and Communications Technology (DICT) Philippine National PKI (PNPKI) for digital signing of Purchase Orders and Notices of Award.
3. **SMS and Email Notification Dispatcher:** Automated alerts to bidders when opportunities are published or quotations move to "Selected" status.
4. **Barcode / QR Code Tracking:** Affix QR codes on printed Purchase Requests and vouchers to allow physical routing verification via mobile scanning.

---

# Complete End-to-End Test Script for Capstone Defense

Follow these **10 numbered steps** to demonstrate the complete procurement and financial monitoring lifecycle during panel presentation:

### Step 1: CHR Personnel Login
1. Open `http://localhost:3000/login`.
2. Enter CHR credentials:
   - Email: `chr.demo@example.test`
   - Password: `Demo1234!`
3. Click **Sign In**.
4. **Verification:** System redirects to `/chr/dashboard`. Observe the summary cards (Open Opportunities, Submitted Bids, Active Transactions, Total ABC), recent opportunities list, and recent transactions table.

### Step 2: Create a Procurement Opportunity
1. Click **Opportunities** in the sidebar, then click **+ New Opportunity**.
2. Fill out the procurement details:
   - Reference Number: `CHR-CAR-2024-RFQ-099`
   - Project Title: `Procurement of IT Equipment & Mobile Scanners for Human Rights Monitoring`
   - Procurement Mode: `NP-53.9 Small Value Procurement`
   - Approved Budget for the Contract (ABC): `250000.00`
   - Submission Deadline: Select a future date (e.g., 7 days from today at 17:00).
   - Project Description: `Procurement of portable document scanners and ruggedized tablets for field documentation of human rights cases across CAR provinces.`
3. Add Line Items:
   - Item 1: `Heavy-Duty Portable Scanner` | Specs: `Duplex 40ppm USB 3.0` | Qty: `5` | Unit: `units` | Est. Cost: `25000.00`
   - Click **+ Add Another Item**
   - Item 2: `Field Monitoring Tablet` | Specs: `10.5-inch 128GB LTE Rugged Case` | Qty: `5` | Unit: `units` | Est. Cost: `25000.00`
4. Click **Save Draft Opportunity**.
5. **Verification:** Success notification appears. Opportunity is listed under `/chr/opportunities` with a `draft` badge.

### Step 3: Publish Opportunity for Public Bidding
1. In the Opportunities table, click **Publish Notice** next to `CHR-CAR-2024-RFQ-099`.
2. Confirm the prompt to transition status from `draft` to `open`.
3. **Verification:** Status badge changes to green `open`. The opportunity is now visible to prospective bidders.

### Step 4: Bidder Login & Opportunity Discovery
1. Click the profile menu in the header and click **Sign Out**.
2. Log in with Bidder credentials:
   - Email: `bidder.demo@example.test`
   - Password: `Demo1234!`
3. Click **Sign In**.
4. **Verification:** System redirects to `/bidder/dashboard`.
5. Click **Opportunities** in the sidebar.
6. Type `Scanners` or `099` in the search box to find the newly published opportunity.
7. Click **View Details & Submit Quotation**.

### Step 5: Bidder Submits Quotation & Documents
1. Review the project details, ABC (`₱250,000.00`), and technical specifications table.
2. In the **Submit Quotation & Supporting Documents** card:
   - Bid Quotation Amount (PHP): Enter `235000.00` *(below ABC to create positive savings)*.
   - Quotation Remarks: `All units in stock; brand-new with 2-year manufacturer warranty and local service center.`
   - Supporting Documents: Attach a sample file (PDF or image up to 5 MB) representing the company's financial quotation and Mayor's Permit.
3. Click **Submit Official Quotation**.
4. **Verification:** Success notification confirms submission. The page displays an alert confirming the bidder's submitted quotation (`₱235,000.00`), status `submitted`, and blocks duplicate submissions.

### Step 6: CHR Evaluates Bids & Selects Supplier
1. Sign out of the Bidder portal.
2. Log back in as **CHR Personnel** (`chr.demo@example.test` / `Demo1234!`).
3. Navigate to **Opportunities** and locate `CHR-CAR-2024-RFQ-099`.
4. Click **View Submissions**.
5. Observe the Abstract of Quotations table showing:
   - Bidder Name: `Juan Dela Cruz (Demo Bidder Rep)`
   - Company: `Highland IT & General Merchandise Corp.`
   - Amount: `₱235,000.00`
   - Document links: Click the document link to verify that the file opens or downloads correctly.
6. In the status dropdown for this bid, select **Selected** and click **Update Status**.
7. Close bidding: Click **Close Opportunity** to advance the opportunity status from `open` to `closed`.

### Step 7: Create Procurement Transaction Tracker
1. Click **Create Transaction Tracker** (or navigate to **Transactions** ➔ **New Transaction**).
2. Select Opportunity: `CHR-CAR-2024-RFQ-099`.
3. Control Number: Confirm or edit `CTRL-2024-0099`.
4. Budget Funding Source: Select `GAA 2024 - Capital Outlay IT Fund (Demo)`.
5. Expense Category: Select `Capital Outlay - Equipment`.
6. Confirm Awarded Amount: `₱235,000.00`.
7. Observe calculated savings: `₱15,000.00` (`₱250,000.00 - ₱235,000.00`).
8. Click **Initialize Transaction Tracker**.
9. **Verification:** Transaction detail page loads at stage `1. Purchase Request`.

### Step 8: Advance Workflow Stages & Upload Compliance Document
1. On the Transaction Detail page, view the **11 Statutory Workflow Stages** progress bar.
2. Under **Advance Stage**, enter transition remarks: `Approved by Regional Executive Director; proceed to RFQ.`
3. Click **Advance to Stage 2: Request for Quotation**.
4. Repeat to advance to **Stage 3: Abstract / Canvass**, then **Stage 4: BAC Resolution**, and **Stage 5: Notice of Award**.
5. Switch to the **Documents** tab.
6. Under **Upload Compliance Document**:
   - Document Type: `Notice of Award (NOA)`
   - Status: `Complete`
   - Attach a sample PDF document.
   - Click **Upload & Attach Document**.
7. Switch to the **History & Audit** tab to verify that every stage advance and document upload has been logged with timestamps and officer names.

### Step 9: Update Financial Status & Verify Budget Monitoring
1. In the Transaction Detail page, switch to the **Financials & Payment** tab.
2. Change Payment Status from `not_for_billing` to `paid`.
3. Click **Save Financial Changes**.
4. In the sidebar, navigate to **Budget Monitoring** (`/chr/budgets`).
5. Verify the metrics for `GAA 2024 - Capital Outlay IT Fund (Demo)`:
   - Committed Amount reflects the awarded transaction (`₱235,000.00`).
   - Paid Amount reflects the disbursed transaction.
   - Available Balance has been correctly decremented.
   - Procurement Savings card displays `₱15,000.00`.

### Step 10: Generate Report, Export CSV & Inspect Audit Trail
1. In the sidebar, click **Reports** (`/chr/reports`).
2. Filter by Budget Source: `GAA 2024 - Capital Outlay IT Fund (Demo)`.
3. Review the on-screen report table displaying control numbers, ABC, awarded amount, and realized savings.
4. Click **Export to CSV**. Verify that a `.csv` file downloads immediately with UTF-8 encoding and can be opened cleanly in Microsoft Excel or LibreOffice.
5. Click **Print Report**. Verify that the print preview renders a formal CHR-CAR letterhead with all navigation elements cleanly hidden.
6. In the sidebar, click **Audit Trail** (`/chr/audit-logs`).
7. Verify that all actions from this test run (`LOGIN`, `CREATE_OPPORTUNITY`, `SUBMIT_BID`, `UPDATE_BID_STATUS`, `UPDATE_STAGE`, `UPDATE_FINANCIALS`) are chronologically recorded.
