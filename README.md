# 🍄 KhumKhum ERP — Agro-Industrial Manufacturing & Traceability System

[![Next.js](https://img.shields.io/badge/Next.js-14%2B%20App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5%20Strict-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Design%20System-Tailwind%20%26%20CSS%20Tokens-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![AI Forecasting](https://img.shields.io/badge/AI%20Analytics-Holt--Winters%20%26%20Gemini-orange?style=for-the-badge&logo=google-gemini)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-Proprietary%20%2F%20Portfolio-purple?style=for-the-badge)](LICENSE)

> **Enterprise Resource Planning (ERP) & Manufacturing Execution System (MES)** engineered specifically for agro-industrial crispy mushroom food processing. Developed by **Triaksa Teknologi Nusantara** for client **CV Khaira Buana Mandiri (KhumKhum)**, this system digitizes the entire **Seed-to-Shelf** production pipeline—from farmer harvest weigh-in, multi-stage frying with buffer containers, dynamic Bill of Materials (BOM Level 3) auto-deduction, to organoleptic Quality Control, B2B invoicing, and full backward traceability.

---

## 📌 Executive Summary & Case Study

### The Problem
Traditional artisanal food processing plants suffer from significant operational inefficiencies:
- **Uncontrolled Yield & Waste:** Inconsistent moisture loss and batter absorption lead to unpredictable batch yields and invisible ingredient shrinkage.
- **Recipe Imprecision:** Seasoning powders applied by estimation cause regulatory non-compliance with net-weight and labeling standards.
- **Traceability Black Holes:** When consumer complaints occur, tracing a packaged snack back to the specific batch, fryer operator, and harvesting farmer is nearly impossible with paper logs.
- **Inventory Discrepancies:** Raw materials and packaging materials deplete without automated alerts, stalling production lines.

### The Engineering Solution
**KhumKhum ERP** resolves these challenges through a unified, event-driven web architecture:
1. **Decoupled 2-Stage Manufacturing with Buffer:** Separates mass frying from downstream flavor packing using physical intermediate storage containers (*Wadah Longsong Buffer*), balancing kitchen throughput with market demand.
2. **Packaging BOM Level 3 Calculation Engine:** Automatically calculates exact seasoning powder and fried mushroom grammage per retail pouch, enforcing zero negative-stock locks.
3. **Seed-to-Shelf Backward Traceability:** Instant tree traversal connecting finished retail packages to their exact customer invoice, packing session, fryer batch, sorting grade, and farmer harvest batch.
4. **Holt-Winters Statistical AI Forecasting:** Triple exponential smoothing that projects 4-week material requirements and issues proactive procurement alerts.

---

## 🚀 Key Modules & System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SEED-TO-SHELF PRODUCTION & DATA FLOW                           │
└────────────────────────────────────────────────────────────────────────────────────────┘

  [ FARMER HARVEST ]
          │
          ▼  Gross & Tare Weigh-In (Automatic WhatsApp Nota Timbang)
   1. INBOUND RECEIVING  (/receiving)
          │
          ▼  Grade A (Crispy), Grade B (Secondary), Waste/Stem
   2. SORTING & GRADING  (/sorting)
          │
          ├──► STAGE 1: PREMIX MIXING (/production/premix)
          │    Flour Formulation & Premix Stock Inbound
          │
          ▼
   3. STAGE 2: MASS FRYING & SPK (/production - Tab Frying)
          │    - Time-Study Stopwatch Timer per Fryer (160°C - 180°C)
          │    - 5-Minute Spinner De-oiling Cycle
          │    - Real-time Yield Tracking (Target >= 80%)
          ▼
   [ WADAH LONGSONG BUFFER ] ──► (Status: AVAILABLE / PARTIAL / EMPTY)
          │
          ▼
   4. STAGE 3: PACKING & SEASONING (/production - Tab Packing)
          │    - Level 3 BOM Engine: Netto = Fried Mushroom (g) + Seasoning (g)
          │    - Auto-deduct: Packaging Foil/Jar + Seasoning + Longsong Weight
          ▼
   5. QUALITY CONTROL & COA (/quality-control)
          │    - 4 Organoleptic Metrics: Crispiness, Color/Flavor, Oiliness, Seal
          │    - Decision: RELEASED (Auto-Inbound FG) | REWORK | REJECTED
          │    - Official Laboratory Certificate of Analysis (CoA) PDF
          ▼
   6. WAREHOUSE & INVENTORY (/warehouse & /inventory)
          │    - Unified Stock Ledger (IN, OUT, ADJUSTMENT, TRANSFER)
          │    - Weekly Physical Stock Opname & Variance Calibration
          ▼
   7. SALES & FULFILLMENT (/sales)
          │    - Multi-Channel B2B Sales Orders (Pending -> Processing -> Shipped)
          │    - Automatic Finished Goods Deduction on Shipment
          │    - Official KhumKhum Invoice with Multi-Bank Account Routing
          ▼
   8. BACKWARD TRACEABILITY (/traceability)
          Full audit trail from Customer Barcode back to Farmer Harvest
```

---

## 💡 Core Technical Highlights

### 1. Packaging Bill of Materials (BOM Level 3) Engine
Located at `src/lib/packaging-bom.ts`, this engine guarantees food labeling compliance:
$$\text{Net Weight (g)} = \text{Clean Fried Mushroom (g)} + \text{Seasoning Powder (g)}$$

- **Original Flavor Rule:** Seasoning is strictly set to `0g` (100% pure fried mushroom weight).
- **Flavored Standard:** Dynamic lookup map (e.g., 75g Pouch = 71g mushroom + 4g Balado seasoning) with a standard fallback ratio of ~5.33%.
- **Negative Stock Prevention:** The packing submission modal validates real-time warehouse stock for both seasoning and packaging materials, locking the commit button if supplies are insufficient.

### 2. Batch Product Generator Modal
Allows factory administrators to generate hundreds of standardized SKUs instantaneously via `src/components/master/BatchProductGeneratorModal.tsx`:
- **Naming Pattern:** `[PREFIX]-[CONTAINER]-[FLAVOR]-[WEIGHT]` (e.g., `FG-PCH-BLD-75G`).
- Automatically injects normalized metadata tags: `[BOM: Jamur 71g, Bumbu 4g]`.

### 3. Decoupled Two-Stage Production & Longsong Buffer
Prevents production line bottlenecks by decoupling frying from packaging:
- **SPK Frying:** Outputs unflavored crispy mushrooms into certified buffer bins (`production_longsong_containers`).
- **Container Lifecycle:** Tracks container weight across statuses: `AVAILABLE` $\rightarrow$ `PARTIAL` $\rightarrow$ `EMPTY`.
- **Dual Execution Modes:** Supports precision stopwatch timer tracking per fryer batch, or high-speed cumulative *Rekap Langsung*.

### 4. Official Document & Certificate Generation
- **Certificate of Analysis (CoA):** Built via `KhumKhumQCCertificateModal.tsx`, rendering laboratory-grade food compliance certificates for audited batches.
- **Commercial Tax Invoice:** Built via `KhumKhumInvoiceModal.tsx`, featuring customizable bank account routing (BCA, Mandiri, BRI), automated subtotal calculations, and print/PDF output.
- **WhatsApp Notification Integration:** Direct webhook/API dispatch to farmers upon inbound weighing, providing immediate gross, tare, and net weight confirmation slips.

### 5. AI Demand Forecasting (Holt-Winters)
Implemented in `src/actions/forecast.ts`, this module analyzes historical sales orders using **Triple Exponential Smoothing**:
- Evaluates Level, Trend, and Seasonality indices.
- Outputs 4-week raw mushroom, premix flour, and cooking oil demand forecasts.
- Issues proactive procurement alerts to prevent stockouts during demand spikes.

---

## 👥 Enterprise Role-Based Access Control (RBAC)

The system implements 10 specialized operational roles adhering to the principle of least privilege:

| Role Code | Role Label | Scope of Responsibility |
|---|---|---|
| `SUPER_ADMIN` | Super Administrator | Full unrestricted system access (`*`), user management, audit logs, and configuration. |
| `MANAGEMENT` | Executive & Investor | Read-only business oversight, Executive Dashboard, financial KPIs, and yield analysis. |
| `WAREHOUSE` | Warehouse & Logistics | Material stock levels, inbound non-mushroom materials, stock movements, and ROP alerts. |
| `PRODUCTION` | Production Supervisor | Frying work orders (SPK), batch timers, Longsong buffer assignment, and packaging runs. |
| `PREMIX` | Premix Station Operator | Flour mixing formulation station (`/production/premix`), raw ingredient consumption. |
| `QC` | Quality Assurance / QC | 4-point organoleptic testing, release/rework/reject decisions, CoA certificate issuance. |
| `SORTING` | Sorting Post Operator | Fresh mushroom sorting, grading (Grade A, Grade B, Waste), and sorting efficiency calculation. |
| `SALES` | Sales & Order Fulfillment | B2B sales order lifecycle, customer accounts, invoice dispatch, and shipping confirmation. |
| `IT_MAINTENANCE`| Technical Operations | Diagnostic maintenance, integration testing, and system monitoring (`*`). |
| `FARMER` | Partner Farmer | External partner interaction via WhatsApp notification dispatch (no web login required). |

---

## 🛠️ Technology Stack & Engineering Standards

| Layer | Technology | Purpose / Notes |
|---|---|---|
| **Frontend Framework** | **Next.js 14+ (App Router)** | Hybrid Server & Client Components, React 18, streaming SSR. |
| **Language** | **TypeScript 5 (Strict Mode)** | Complete end-to-end type safety across database models and server actions. |
| **Database & Auth** | **Supabase (PostgreSQL)** | Relational schema, Row Level Security (RLS), ACID transactions, and auth sessions. |
| **Server Logic** | **Next.js Server Actions** | Type-safe RPC-style mutations with server-side authorization guards. |
| **Data Tables** | **@tanstack/react-table** | High-performance virtualized sorting, pagination, and multi-filter tables. |
| **Charts & Analytics** | **Recharts** | Interactive KPI graphs, yield trend lines, and defect rate tolerance bars. |
| **Document Engines** | **jsPDF, autoTable, ExcelJS** | Client & server generation of official invoices, CoA certificates, and Excel spreadsheets. |
| **Styling & UI** | **Tailwind CSS & CSS Tokens** | Strict enterprise design tokens, zero external component-library bloat. |
| **Icons** | **Lucide React** | Consistent, accessible enterprise iconography (`aria-hidden` and `aria-label` enforced). |
| **Validation** | **Zod & React Hook Form** | Strict schema validation for production and inventory inputs. |

---

## 📁 Repository Directory Structure

```plaintext
ERP-Khumkhum/
├── docs/                      # Standard Operating Procedures (SOP) & documentation
├── src/
│   ├── actions/               # Next.js Server Actions (Backend Mutations & Queries)
│   │   ├── auth.ts            # Authentication & session verification
│   │   ├── forecast.ts        # Holt-Winters statistical demand forecasting
│   │   ├── inventory.ts       # Stock movement, ledger, and opname actions
│   │   ├── master.ts          # CRUD for products, materials, farmers, and warehouses
│   │   ├── production.ts      # SPK Frying, Longsong buffer, and Packing runs
│   │   ├── qc.ts              # Quality Control inspection and release actions
│   │   ├── reports.ts         # Consolidated multi-module report generators
│   │   └── sales.ts           # Sales order lifecycle and invoice actions
│   ├── app/
│   │   ├── (auth)/login/      # User authentication portal
│   │   └── (shell)/           # Authenticated application shell
│   │       ├── dashboard/     # Executive Overview & Daily Operations tabs
│   │       ├── master/        # Master Data Hub, BOM Standards, Batch Generator
│   │       ├── receiving/     # Inbound mushroom weigh-in and WhatsApp dispatch
│   │       ├── sorting/       # Mushroom grading and waste management
│   │       ├── production/    # Two-stage manufacturing & premix formulation
│   │       ├── quality-control/ # QC inspection and CoA certificate modal
│   │       ├── warehouse/     # Raw material and packaging inventory
│   │       ├── inventory/     # Finished goods inventory and consignment
│   │       ├── sales/         # B2B sales orders and KhumKhum Invoice modal
│   │       ├── ppic/          # Capacity scheduling and MRP calculator
│   │       ├── ai-forecast/   # Holt-Winters demand analytics
│   │       ├── reports/       # 6 Official tabular reports (Excel & PDF export)
│   │       └── traceability/  # Backward seed-to-shelf batch visualizer
│   ├── components/            # Reusable enterprise UI components & modals
│   ├── lib/                   # Utility helpers (packaging-bom engine, supabase client)
│   └── types/                 # TypeScript interfaces, database schemas, and RBAC types
├── .env.example               # Sanitized environment template
└── package.json
```

---

## ⚡ Getting Started Locally

### Prerequisites
- **Node.js:** `v18.17.0` or newer
- **Package Manager:** `npm` (or `pnpm` / `yarn`)
- **Database:** Supabase project or PostgreSQL instance

### 1. Clone & Install
```bash
git clone https://github.com/faa08/ERP-Khumkhum.git
cd ERP-Khumkhum
npm install
```

### 2. Configure Environment Variables
Copy the sanitized environment template:
```bash
cp .env.example .env.local
```
Fill in your configuration keys:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="KhumKhum ERP"

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# AI & Notifications (Optional)
GEMINI_API_KEY=your_gemini_api_key
FONNTE_API_TOKEN=your_whatsapp_gateway_token
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build & Type Verification
```bash
# Run strict TypeScript verification
npm run type-check

# Production build
npm run build
npm run start
```

---

## 🏆 Key Achievements & Portfolio Highlights

- **Zero Data Redundancy:** Replaced 6 manual paper logbooks with automated, single-source relational data pipelines.
- **Zero Negative Stock Incidents:** Implemented database-level and UI validation locks ensuring production cannot consume unrecorded inventory.
- **Enterprise Food Safety Readiness:** Satisfies Indonesian BPOM/P-IRT traceability standards with one-click audit generation and Certificate of Analysis issuance.
- **Sub-Second Report Generation:** Exports multi-thousand record Excel files and formatted PDF reports in under 500ms using virtualized table processing.

---

## 📄 License & Intellectual Property

This codebase was engineered by **Triaksa Teknologi Nusantara** as an enterprise digital transformation solution for its client, **CV Khaira Buana Mandiri (KhumKhum)**. Source code is maintained for portfolio demonstration, architectural evaluation, and authorized deployment.

**Engineering Team:** Triaksa Teknologi Nusantara  
**Client / Partner:** CV Khaira Buana Mandiri (KhumKhum)  
**Lead Developer:** Fachry  
**Engineering Contributors:** Darmawan, Desia  
**Copyright © 2026 CV Khaira Buana Mandiri & Triaksa Teknologi Nusantara. All rights reserved.**
