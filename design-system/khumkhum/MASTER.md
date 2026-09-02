# 🍄 KhumKhum Design System — Master Guide (MASTER.md)

> **LOGIC:** Dokumen ini adalah *Single Source of Truth* untuk desain visual, token warna, tipografi, komponen UI, dan panduan copywriting merek KhumKhum.
> Setiap pengembangan halaman publik (Landing Page) maupun modul internal ERP harus merujuk pada aturan dalam dokumen ini agar konsistensi desain tidak melenceng.

---

## 1. Identitas & Vibe Desain (Visual Direction)

- **Style:** Warm Comic Pop & Artisan FMCG Snack
- **Mood:** Hangat, renyah, menggugah selera, ramah keluarga, bangga produk lokal nusantara.
- **Karakter Visual:**
  - Border tebal bergaya komik (*comic-border* 2.5px – 3px `#2A1810`)
  - Hard drop shadows (*block shadow* `4px 4px 0 #2A1810` / `6px 6px 0 #2A1810`)
  - Pola titik komik (*halftone background pattern*)
  - Aksen tulisan tangan (*handwritten cursive accent*) untuk penekanan emosional
  - Foto produk asli yang menggugah selera (*appetizing real snack photography*)

---

## 2. Color Palette & Design Tokens

| Token CSS | Hex | Peran / Penggunaan |
|---|---|---|
| `--cream` | `#FBF1DC` | Warna latar utama (Warm Soft Cream) |
| `--cream-card` | `#FFFBF2` | Warna latar kartu konten & kontainer |
| `--ink` | `#2A1810` | Teks utama, border komik, bayangan blok |
| `--ink-soft` | `#5A4234` | Teks sekunder, deskripsi, paragraf |
| `--chili` | `#D31F26` | Warna aksen utama (Merah Cabai), tombol primer |
| `--chili-deep` | `#8E1216` | Hover tombol primer, bayangan stiker |
| `--chili-bright` | `#EF3E3E` | Highlight teks penting, badge diskon/promo |
| `--turmeric` | `#F2A93C` | Aksen Kunyit/Kuning Emas, badge prestasi, tag award |
| `--turmeric-deep` | `#C96A16` | Aksen varian Pedas Manis |
| `--mushroom` | `#8B5E3C` | Aksen Cokelat Jamur / Barbeque |

### Varian Rasa (Flavor Palette)

| Varian Rasa | Border / Accent | Background Card | Foto Thumbnail |
|---|---|---|---|
| **Original** | `#4CAF50` (Hijau Daun) | `#E8F5E9` | `/images/flavors/original.jpg` |
| **Balado** | `#D31F26` (Merah Cabai) | `#FFEBEE` | `/images/flavors/balado.jpg` |
| **Pedas Manis** | `#C96A16` (Karamel Pedas) | `#FFF3E0` | `/images/flavors/pedas_manis.jpg` |
| **Super Pedas** | `#FF5722` (Oranye Api) | `#FBE9E7` | `/images/flavors/super_pedas.jpg` |
| **Barbeque** | `#8B5E3C` (Cokelat Panggang) | `#EFEBE9` | `/images/flavors/barbeque.jpg` |

---

## 3. Tipografi

| Kategori | Font Family | Penggunaan | Karakter |
|---|---|---|---|
| **Display / Judul** | `'Baloo 2', sans-serif` | H1, H2, H3, Nama Varian, Tombol | Tebal (700-800), bulat ceria, ekspresif |
| **Aksen Emosional** | `'Caveat', cursive` | Eyebrow, quote, stamp, tulisan tangan | Spontan, personal, hangat |
| **Body / Paragraf** | `'Plus Jakarta Sans', sans-serif` | Paragraf, form input, tabel, navigasi | Modern, bersih, legibilitas tinggi |

---

## 4. Panduan Copywriting (Anti-AI-Slop Manifesto)

### ❌ DILARANG KERAS (AI Slop & Corporate Clichés):
- *Jangan gunakan kalimat robotik klise:* "Solusi revolusioner mutakhir untuk kebutuhan camilan Anda", "Menghadirkan sinergi holistik kelezatan", "Transformasi gaya hidup ngemil masa depan", "Pengalaman kuliner yang tiada tandingan di era modern".
- *Hindari klaim kosong tanpa konteks lokal:* "Terbaik sedunia", "Kelezatan mutlak".

### ✅ WAJIB DIGUNAKAN (Authentic Brand Voice):
- **Bahasa:** Bahasa Indonesia yang natural, hangat, akrab (*conversational*), dan menggugah selera.
- **Fakta & Cerita Riil:**
  - Diproduksi oleh **CV Khaira Buana Mas** di **Desa Bendungan, Wates, Kulon Progo, D.I. Yogyakarta**.
  - Menggunakan jamur tiram segar hasil panen petani mitra lokal Kulon Progo.
  - Digoreng kering tanpa MSG tambahan, sertifikasi resmi **Halal LPPOM MUI** dan **P-IRT Dinkes**.
  - Telah dipercaya di lebih dari **1.500 gerai oleh-oleh & retail** di **8 provinsi**.
- **Contoh Tone yang Benar:**
  - *"Kriuknya nagih, bumbunya nempel pas, gurihnya alami tanpa bikin enek."*
  - *"Dari kumbung jamur Wates, digoreng renyah untuk menemani santai di seluruh Nusantara."*
  - *"Ngemil enak yang bikin tenang: jamur asli, tanpa MSG, Halal & P-IRT terdaftar."*

---

## 5. Spesifikasi Komponen

### A. Flavor Card (Kartu Pilihan Rasa)
- **Struktur:**
  - Foto produk bulat (`w-14 h-14` / `w-16 h-16`) dengan gambar asli jamur crispy berbumbu, border tebal, dan shadow.
  - Kode varian (O, B, PM, SP, BBQ) dengan huruf tebal huruf kapital.
  - Judul varian rasa dengan font `'Baloo 2'`.
  - Deskripsi rasa singkat, padat, dan menggugah selera (contoh: *"Gurih renyah klasik dengan rasa asli jamur tiram segar"*).

### B. Footer & Social / Marketplace Hub
- **Footer Theme:** Dark Ink `#2A1810` background dengan teks cream `#FBF1DC`.
- **Social Media:**
  - **Instagram:** `@khumkhum_jamurcrispy` (Icon SVG Instagram, Brand Color `#E1306C`)
  - **TikTok:** `@khumkhum.official` (Icon SVG TikTok, Brand Color `#00F2FE` / `#111827`)
  - **Facebook:** `KhumKhum Jamur Crispy` (Icon SVG Facebook, Brand Color `#1877F2`)
  - **WhatsApp Official:** Direct Chat CS / Kemitraan (Icon SVG WhatsApp, Brand Color `#25D366`)
- **Official Marketplaces & Brand Logos:**
  - **Shopee**: File `/images/hopee-logo-vector-png_1020x.webp` dengan badge promo *"Gratis Ongkir"*.
  - **Tokopedia**: File `/images/tokopedia.webp` dengan badge *"Power Merchant"*.
  - **Blibli**: File `/images/logo-blibli.webp` dengan badge *"100% Ori"*.
  - **PaDi UMKM**: File `/images/padiumkm.webp` dengan badge *"B2B Resmi"*.
  - **Bukalapak**: File `/images/logo-bukalapak.webp` dengan badge *"Super Seller"*.
  - Desain tombol: Container badge `w-8 h-8 rounded-lg bg-white p-1`, bayangan halus, teks nama toko bold, sub-deskripsi transparan, dan micro-interaction zoom `scale-110` saat hover.

---

---

## 6. Standar Sistem Ikon (Icon System Guidelines)

Sesuai aturan resmi UI di `AGENTS.md`:

1. **DILARANG memakai emoji sebagai icon**, di mana pun (landing page, dashboard, shell, card headers, tabs, maupun badges).
2. **Library Resmi**: Semua icon wajib memakai `lucide-react`.
3. **Pola Import**: Import per-icon secara eksplisit (DILARANG wildcard `import * as Icons`).
   ```tsx
   import { Package, Check, AlertTriangle, X, Sparkles } from 'lucide-react';
   ```
4. **Aksesibilitas (A11y)**:
   - Icon dekoratif / pendamping teks: wajib ditambahkan atribut `aria-hidden="true"`.
   - Icon mandiri sebagai tombol: wajib memiliki atribut `aria-label="Deskripsi tindakan"`.
5. **Ukuran & Warna**:
   - Ukuran icon memakai class Tailwind (`w-3.5 h-3.5`, `w-4 h-4`, `w-5 h-5`, `w-6 h-6`).
   - Warna icon menggunakan `text-currentColor` atau variabel warna token theme (`var(--color-primary-600)`, dsb).

---

## 7. Checklist Kualitas Sebelum Rilis (Pre-Delivery Checklist)

- [ ] Foto thumbnail produk untuk setiap varian rasa tampil tajam dan proporsional (1:1 aspect ratio).
- [ ] Copywriting bersih dari AI slop, enak dibaca, dan relevan dengan UMKM Kulon Progo.
- [ ] Seluruh icon menggunakan `lucide-react` dengan atribut aksesibilitas yang tepat (bebas emoji icon).
- [ ] Seluruh link WhatsApp, media sosial, dan marketplace terpasang dengan atribut `target="_blank"` dan `rel="noopener noreferrer"`.
- [ ] Kontras warna teks memenuhi standar WCAG (minimal 4.5:1 untuk teks normal).
- [ ] Interaksi tombol dan kartu memiliki hover state responsif (*smooth transitions 150-200ms*).
- [ ] Responsive di layar mobile (375px), tablet (768px), dan desktop (1024px+).
- [ ] Lolos uji kompilasi TypeScript (`npm run type-check` = 0 errors).
