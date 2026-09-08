# DOKUMEN REVISI SISTEM — DEVELOPER 1
**Lead Core Architect, Autentikasi, Hak Akses, Settings & WhatsApp Gateway**  
**Sistem ERP KhumKhum Jamur Crispy (CV Khaira Buana Mas)**

---

## 📌 Ringkasan Arahan & Latar Belakang Revisi
Berdasarkan hasil evaluasi operasional lapangan terbaru, terdapat pergeseran strategi penting pada sistem:
1. **Tidak Ada Lagi Forecast Kebun Petani yang Kaku:** Petani mitra KhumKhum di lapangan tidak mengirim format pesan teks baku robot (seperti `SETOR 50` atau `LIBUR`). Kebanyakan petani mengirim info setoran melalui **foto timbangan/nota manual via WhatsApp** atau chat biasa kepada admin.
2. **Penghapusan Notifikasi Otomatis yang Membingungkan:** Notifikasi otomatis WhatsApp hasil sortasi/grading (`Grade A/B/C`, proporsi daun/batang) dihapus karena membingungkan petani dan memicu perdebatan yang tidak perlu.
3. **Struktur Tenaga Kerja Nyata KhumKhum:** Pabrik memiliki **2 karyawan kontrak**, sedangkan sisanya adalah **tenaga kerja freelance/borongan** (Tim Sortir Bu Sur, Tim Produksi Penggorengan, Tim Packing, dan Tim Sales). Sistem tidak lagi menggunakan konsep shift absensi kaku pabrik besar.

---

## 📂 Ruang Lingkup File Milik Developer 1
* `src/app/(auth)/login/page.tsx` (Autentikasi & session)
* `src/app/(shell)/settings/` (Pengaturan global, user, audit log)
* `src/app/api/webhooks/whatsapp/route.ts` (Webhook WhatsApp Fonnte)
* `src/lib/whatsapp.ts` (Helper integrasi WhatsApp)
* `src/lib/auth-guard.ts` & `src/actions/auth.ts`, `admin.ts`, `audit.ts`
* `src/types/auth.ts`, `audit.ts`

---

## 🛠️ Rincian Tugas & Revisi Spesifik Developer 1

### 1. Perombakan WhatsApp Webhook Bot (`src/app/api/webhooks/whatsapp/route.ts`)
* **Kondisi Lama:** Webhook memaksa pola regex `SETOR [KG]` atau `LIBUR` dan otomatis memasukkan data ke tabel estimasi panen besok (`farmer_harvest_estimates`).
* **Instruksi Revisi Baru:**
  * **Nonaktifkan keharusan format teks baku:** Jangan menolak atau error jika petani mengirim pesan biasa atau gambar.
  * Hapus ketergantungan pembuatan antrean forecast panen besok di PPIC. Di lapangan, berapa pun hasil panen petani akan langsung disetor ke pabrik tanpa perlu di-forecast dari kebun.
  * Jika webhook menerima pesan dari nomor petani terdaftar, cukup log pesan ke audit trail atau balas dengan pesan informatif santai:
    > *"Halo Pak/Bu [Nama Petani], chat/info setoran jamur Anda telah kami terima. Tim gudang KhumKhum akan memproses penimbangan saat jamur fisik tiba di pabrik. Terima kasih!"*

---

### 2. Penghapusan Auto-Blast Notifikasi Sortasi Grading (`src/lib/whatsapp.ts`)
* **Kondisi Lama:** Terdapat template pesan otomatis hasil sortasi (`sendSortingResultToFarmer`) yang merinci persentase daun, batang, dan grade mutu ke WhatsApp petani.
* **Instruksi Revisi Baru:**
  * **Hapus / nonaktifkan fungsi pengiriman pesan hasil sortasi ke petani.** Petani tidak membutuhkan rincian grade di WhatsApp.
  * Tetap pertahankan helper dasar `sendWhatsAppMessage` jika sewaktu-waktu dibutuhkan untuk pesan darurat atau notifikasi reminder penting internal tim.

---

### 3. Penyesuaian Role & Karakteristik Tenaga Kerja (`src/types/auth.ts`, `database/schema.sql`)
* **Karakteristik Lapangan:**
  * 2 Karyawan Kontrak (Super Admin, Manajemen/Operasional Inti).
  * Tim Freelance / Harian Lepas:
    * `PETUGAS_PENERIMAAN` & Sortir (Tim Bu Sur)
    * `PETUGAS_PRODUKSI` (Tim Penggorengan Wajan)
    * `PETUGAS_PACKING` (Tim Pembumbuan & Pengemasan)
    * `STAFF_SALES` (Tim Penjualan)
* **Instruksi Revisi:**
  * Pastikan konfigurasi RBAC (`auth-guard.ts`) ramah untuk akun tim lapangan yang digunakan bersama (*shared account* per workstation / terminal kerja).
  * Pastikan sesi login tidak cepat *expired* secara agresif saat operator sedang bertugas di lantai pabrik.

---

### 4. Pengaturan Satuan & Desimal Global (`src/app/(shell)/settings/page.tsx`)
* **Ketentuan Operasional:** Seluruh pencatatan kuantitas bahan baku (terutama jamur) di KhumKhum **WAJIB menggunakan satuan Kilogram (kg)** dengan pemisah desimal titik/koma yang konsisten.
* **Instruksi Revisi:**
  * Tambahkan konfigurasi di tabel `settings` (key: `general_settings`):
    * Satuan standar berat: `kg` (bukan gram, bukan koli).
    * Batas minimal presisi desimal: 2 digit desimal (misal `0.01 kg` untuk mengakomodasi setoran petani mikro sebesar **2 ons / 0,2 kg**).
  * Sediakan helper pemformat angka di `src/lib/formatters.ts` (misal: format angka Indonesia `0,20 kg` atau standar input `0.2`).

---

### 5. Jejak Audit Penyesuaian Data (`src/actions/audit.ts`)
* Karena pembayaran petani dilakukan sebulan sekali berdasarkan rekap setoran timbangan, setiap koreksi data timbangan oleh admin harus tercatat riwayatnya secara ketat.
* Pastikan helper `logAuditEvent` mencatat setiap aksi edit/koreksi pada data penerimaan jamur (`action: 'UPDATE'`, `entityType: 'RECEIVING'`).

---

## 🎯 Checklist Keberhasilan Developer 1
- [ ] Webhook WhatsApp tidak lagi memaksakan format kaku `SETOR [KG]` dan tidak membuat antrean forecast palsu.
- [ ] Fungsi auto-blast pesan hasil sortasi ke WhatsApp petani dinonaktifkan.
- [ ] Helper format angka kilogram presisi desimal (0,01 kg / 2 ons) tersedia di tingkat global.
- [ ] Audit log mencatat setiap perubahan data transaksi penerimaan bahan baku.
- [ ] Role dan otentikasi siap mendukung model kerja tim freelance lapangan.
