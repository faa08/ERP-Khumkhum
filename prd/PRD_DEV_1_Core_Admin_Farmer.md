# PRD DEVELOPER 1 — Core Architect, Auth, Super Admin & WhatsApp Gateway
**Sistem ERP KhumKhum Jamur Crispy (CV Khaira Buana Mas)**

---

## 1. Profil & Tanggung Jawab Developer 1
* **Peran:** Lead Core Architect & System Integration
* **Role Sistem yang Dipegang:** 
  * `SUPER_ADMIN` (Kelola Pengguna, Hak Akses, Audit Log, Pengaturan Global)
  * `ROLE_FARMER` (WhatsApp Gateway Fonnte & Webhook Bot Interaktif)
* **Tanggung Jawab Utama Fondasi:** 
  Menyediakan client database Supabase, helper otentikasi/RBAC Guard, session management, dan middleware untuk digunakan oleh Developer 2 & 3.

---

## 2. Area Kerja & Isolasi File (Zero-Conflict)

### File & Folder Milik Developer 1 (Bebas Edit):
```text
src/
├── app/
│   ├── (auth)/login/page.tsx               <-- Login Form & Validasi
│   ├── (shell)/settings/
│   │   ├── page.tsx                        <-- Global System Settings
│   │   ├── users/page.tsx                  <-- User & RBAC Management
│   │   └── audit-log/page.tsx              <-- System Audit Trail
│   └── api/
│       ├── auth/                           <-- API Auth (Login/Logout/Session)
│       └── webhooks/
│           └── whatsapp/route.ts           <-- Webhook Bot Fonnte
├── actions/
│   ├── auth.ts                             <-- Server Actions: Login, Logout, Session
│   ├── admin.ts                            <-- Server Actions: User CRUD, Role assignment
│   └── audit.ts                            <-- Server Actions: Log Reader & Exporter
├── lib/
│   ├── supabase.ts                         <-- Supabase Client (Browser & Server)
│   ├── auth-guard.ts                       <-- Helper Proteksi Role (requireAuth)
│   └── whatsapp.ts                         <-- Helper Fonnte API (Send WA)
└── types/
    ├── auth.ts                             <-- Tipe User, Session, RBAC
    └── audit.ts                            <-- Tipe Audit Logs
```

> [!WARNING]
> **Larangan:** Developer 1 **DILARANG** mengedit folder `src/app/(shell)/master/`, `src/app/(shell)/receiving/`, `src/app/(shell)/production/`, atau `src/app/(shell)/quality-control/` untuk menghindari *git merge conflict*.

---

## 3. Tabel Database yang Dikelola (Schema SQL)
Sesuai `database/schema.sql`:
1. `users` (`id`, `email`, `password`, `name`, `role`, `is_active`, `created_at`, `updated_at`)
2. `audit_logs` (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `created_at`)
3. `settings` (`key`, `value`, `updated_by`, `updated_at`)
4. Enum `user_role`: `SUPER_ADMIN`, `ADMIN_OPERASIONAL`, `PETUGAS_PENERIMAAN`, `PETUGAS_PRODUKSI`, `PETUGAS_QC`, `STAFF_GUDANG_PPIC`, `STAFF_SALES`, `MANAGEMENT`.

---

## 4. Rincian Tugas & Spesifikasi Fitur

### 4.1 Fondasi Supabase Client & Helper Role Guard
* **Tujuan:** Membuat koneksi database terpusat yang aman untuk Next.js App Router (Server Actions & Client Components).
* **Spesifikasi Helper `src/lib/auth-guard.ts`:**
  ```typescript
  import { createServerClient } from '@/lib/supabase';

  export async function requireAuth(allowedRoles?: string[]) {
    // 1. Validasi session user aktif
    // 2. Cek apakah user berstatus is_active === true
    // 3. Cek apakah role user ada di dalam allowedRoles
    // 4. Return user & profile data jika lolos, atau throw Error('UNAUTHORIZED' / 'FORBIDDEN')
  }
  ```

### 4.2 Otentikasi & Manajemen Pengguna (Users & Roles)
* **Fitur Login:**
  * Validasi Zod: Email valid & password minimal 6 karakter.
  * Verifikasi password hash (bcrypt) atau Supabase Auth.
  * Catat timestamp `last_login` dan entri di `audit_logs` (`action: 'LOGIN'`).
* **Fitur CRUD User:**
  * Tambah user baru (Email unik, Nama, Role, Default password ter-hash).
  * Edit user (Ubah Role, Nama, Nonaktifkan akun / `is_active: false`).
  * Reset password pengguna.

### 4.3 Jejak Audit (Audit Logs) & Pengaturan Sistem
* **Audit Trail:**
  * Sediakan helper `createAuditLog(userId, action, entityType, entityId, details)` yang dapat dipanggil oleh Dev 2 & 3.
  * Tampilkan tabel jejak audit dengan filter: rentang tanggal, jenis aksi (`LOGIN`, `CREATE`, `UPDATE`, `DELETE`), dan pencarian user.
* **Global Settings:**
  * Simpan pengaturan perusahaan (Nama IKM, No Telp, Alamat, API Key Fonnte) dalam bentuk JSONB di tabel `settings`.

### 4.4 WhatsApp Gateway Fonnte & Webhook Bot
* **Kirim Nota Penerimaan Otomatis (`src/lib/whatsapp.ts`):**
  * Fungsi `sendWhatsAppMessage(targetPhone, message)` menggunakan Fonnte API (`https://api.fonnte.com/send`).
  * Dipanggil oleh modul Dev 2 saat bahan baku jamur berhasil ditimbang.
* **Webhook Bot Panen (`src/app/api/webhooks/whatsapp/route.ts`):**
  * Menerima pesan masuk dari nomor petani via webhook Fonnte.
  * Parsing pesan format: `PANEN#NAMA PETANI#ESTIMASI_KG#TANGGAL`.
  * Balas pesan secara instan: *"Halo Petani [Nama], estimasi panen [X] kg telah dicatat di jadwal PPIC KhumKhum. Terima kasih."*

---

## 5. Checklist Pengerjaan Developer 1
- [ ] Setup file koneksi `src/lib/supabase.ts` dan `.env.local`
- [ ] Buat helper proteksi `src/lib/auth-guard.ts`
- [ ] Implementasikan Server Action `src/actions/auth.ts` (Login, Logout, GetSession)
- [ ] Hubungkan form `src/app/(auth)/login/page.tsx` ke Server Action
- [ ] Implementasikan Server Action `src/actions/admin.ts` (CRUD User & Role Switch)
- [ ] Hubungkan UI `src/app/(shell)/settings/users/` ke database nyata
- [ ] Implementasikan helper `createAuditLog` dan hubungkan `src/app/(shell)/settings/audit-log/`
- [ ] Buat helper WhatsApp Fonnte di `src/lib/whatsapp.ts`
- [ ] Buat endpoint route `src/app/api/webhooks/whatsapp/route.ts`
