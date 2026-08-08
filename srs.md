# Software Requirements Specification (SRS)

# KhumKhum ERP
Enterprise Resource Planning System

Version: 1.0

Status: Draft

---

# 1. Project Overview

## 1.1 Background

KhumKhum merupakan perusahaan manufaktur makanan yang memproduksi jamur crispy. Proses bisnis perusahaan meliputi penerimaan bahan baku, sortasi, produksi, quality control, inventory, penjualan, hingga pelaporan.

Sebagian proses operasional masih dilakukan secara manual sehingga diperlukan sistem ERP yang mampu mengintegrasikan seluruh proses bisnis ke dalam satu platform.

---

## 1.2 Purpose

ERP ini bertujuan untuk:

- Digitalisasi proses operasional
- Meningkatkan efisiensi kerja
- Mengurangi human error
- Menyediakan data real-time
- Mendukung pengambilan keputusan
- Menyediakan traceability produk
- Mendukung forecasting berbasis AI

---

## 1.3 Scope

Sistem mencakup:

- Authentication
- User Management
- Dashboard
- Master Data
- Raw Material Receiving
- Sorting & Grading
- Production
- Quality Control
- Inventory
- PPIC
- Sales Order
- Traceability
- Reports
- Audit Log
- Settings

---

# 2. User Roles

## Super Admin

Memiliki akses penuh terhadap seluruh sistem.

---

## Admin Operasional

Mengelola master data dan konfigurasi.

---

## Petugas Penerimaan

Mengelola proses penerimaan bahan baku.

---

## Petugas Produksi

Mengelola proses produksi.

---

## Petugas QC

Mengelola quality control.

---

## Staff Gudang / PPIC

Mengelola inventory dan perencanaan produksi.

---

## Staff Sales

Mengelola sales order.

---

## Management

Hanya memiliki akses monitoring.

---

# 3. Functional Requirements

## Authentication

Features:

- Login
- Logout
- Forgot Password
- Reset Password

Business Rules:

- Tidak ada registrasi publik.
- Akun dibuat hanya oleh Super Admin.

---

## User Management

Features:

- Create User
- Update User
- Delete User
- Assign Role
- Reset Password
- Activate / Deactivate User

---

## Master Data

Modules:

- Farmers
- Products
- Raw Materials
- Customers
- Warehouses
- Production Standards
- QC Standards
- Sorting Standards

---

## Raw Material Receiving

Features:

- Receiving
- Batch Number
- Weight
- Supplier
- Notes
- Receiving History

---

## Sorting & Grading

Features:

- Grade
- Accepted Quantity
- Rejected Quantity
- Waste
- History

---

## Production

Features:

- Production Order
- Batch
- Material Consumption
- Finished Goods
- Yield (Rendemen)
- WIP
- Timeline

---

## Quality Control

Features:

- QC Inspection
- QC Result
- Pass
- Fail
- Defect
- Notes

---

## Inventory

Features:

- Stock
- Stock Movement
- Adjustment
- Warehouse Transfer
- Batch Tracking

---

## PPIC

Features:

- Production Planning
- Material Planning
- Schedule
- Material Requirement

---

## Sales Order

Features:

- Sales Order
- Customer
- Product
- Quantity
- Status

---

## Traceability

Support tracking:

Farmer

↓

Receiving

↓

Sorting

↓

Production

↓

QC

↓

Inventory

↓

Sales Order

---

## Reports

Support:

- Search
- Filter
- Export CSV
- Export Excel
- Print

---

## Dashboard

Dashboard terdiri dari:

Executive Dashboard

Operational Dashboard

Warehouse Dashboard

Production Dashboard

---

## AI Forecast

AI hanya digunakan untuk:

- Demand Forecast
- Production Recommendation
- Inventory Recommendation
- Material Recommendation

AI bukan chatbot.

---

## Audit Log

Mencatat:

- Login
- Logout
- Create
- Update
- Delete
- Approval

---

## Settings

Modules:

- Company Profile
- General Settings
- Production Settings
- QC Settings
- Warehouse Settings

---

# 4. Non Functional Requirements

## Performance

- Fast response
- Efficient queries
- Responsive interface

---

## Security

- JWT Authentication
- RBAC
- Protected Routes
- Password Hashing

---

## Scalability

Sistem harus mudah dikembangkan untuk penambahan modul di masa depan.

---

## Maintainability

Menggunakan arsitektur modular.

---

## Availability

Sistem dapat diakses melalui browser modern.

---

# 5. Technology Stack

Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend

- NestJS
- TypeScript
- Prisma ORM

Database

- PostgreSQL (Supabase)

AI

- External AI API

Deployment

Frontend → Vercel

Backend → Railway / VPS

Database → Supabase

---

# 6. UI Principles

- Clean
- Professional
- Enterprise
- Functional
- Consistent
- Responsive

Avoid:

- Glassmorphism
- Fancy gradients
- Decorative animations
- AI-style dashboard
- Startup landing page aesthetics

---

# 7. Business Workflow

Receiving

↓

Sorting

↓

Production

↓

Quality Control

↓

Inventory

↓

Sales Order

↓

Reports

---

# 8. Future Scope

- Mobile Application
- Supplier Portal
- Farmer Portal
- IoT Integration
- Barcode / QR Tracking
- Multi Warehouse
- Multi Branch
- Predictive Analytics

---

# 9. Success Criteria

The ERP is considered complete when:

- All modules are functional.
- Every workflow is integrated.
- Authentication and RBAC work correctly.
- Reports can be exported.
- Traceability functions correctly.
- Dashboard displays operational KPIs.
- AI Forecast provides operational recommendations.
- The application is production-ready.