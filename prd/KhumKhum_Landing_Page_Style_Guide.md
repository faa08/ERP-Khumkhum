# Style Guide & Spesifikasi Konten — Landing Page KhumKhum

**Versi:** 1.0
**Tujuan:** Acuan desain & konten untuk implementasi landing page KhumKhum Jamur Crispy di Next.js, diturunkan dari identitas visual logo asli brand.
**Referensi hidup:** `khumkhum-landing.html` (prototipe interaktif, sudah dibuat sebelumnya)

---

## 1. Sumber Identitas Visual

Palet dan gaya desain diambil langsung dari logo resmi KhumKhum: badge lingkaran merah dengan tulisan "Khum Khum" bergaya marker/brush tebal berwarna putih, dan "Jamur Crispy" bergaya handwritten gradasi kuning-oranye.

---

## 2. Design Tokens

### 2.1 Warna

| Token | Hex | Penggunaan |
|---|---|---|
| `--cream` | `#FBF1DC` | Background utama (krem kertas nasi, bukan krem generik) |
| `--cream-card` | `#FFFBF2` | Background card/elemen terangkat |
| `--ink` | `#2A1810` | Warna teks utama, coklat gelap hangat (bukan hitam pekat) |
| `--ink-soft` | `#5A4234` | Teks sekunder/paragraf |
| `--chili` | `#D31F26` | Merah utama — dari lingkaran logo |
| `--chili-deep` | `#8E1216` | Merah gelap — shadow, hover, teks aksen |
| `--chili-bright` | `#EF3E3E` | Merah terang — highlight kata kunci |
| `--turmeric` | `#F2A93C` | Kuning-oranye — dari teks "Jamur Crispy" |
| `--turmeric-deep` | `#C96A16` | Oranye gelap — gradasi, CTA sekunder |
| `--mushroom` | `#8B5E3C` | Coklat earthy — aksen sekunder, badge |

### 2.2 Tipografi

| Peran | Font | Weight | Karakter |
|---|---|---|---|
| Display/Headline | **Baloo 2** | 600–800 | Rounded, chunky — mengikuti energi huruf marker tebal di logo |
| Aksen/Handwritten | **Caveat** | 600–700 | Untuk quote/tagline — mengulang gaya tulisan tangan "Jamur Crispy" |
| Body/Utility | **Plus Jakarta Sans** | 400–700 | Teks baca, form, navigasi, data |

Sumber: Google Fonts — `Baloo+2`, `Caveat`, `Plus+Jakarta+Sans`.

### 2.3 Bentuk & Elemen Signature

- **Sticker badge**: logo asli ditampilkan miring (-7°) dengan border krem tebal dan drop shadow berlapis, seolah stiker yang ditempel — elemen paling ikonik di hero.
- **Mini badge varian**: lingkaran kecil melayang (animasi float halus) merepresentasikan tiap rasa, warna berbeda per varian.
- **Wavy seal divider**: garis pembatas antar-section berbentuk gelombang, meniru lekukan segel kemasan snack (bukan garis lurus).
- **Halftone dots**: pola titik-titik radial di background hero, meniru tekstur cetak kemasan murah — bukan gradient blur generik.
- **Border tebal + offset shadow**: tombol dan card memakai border 2–3px solid + shadow offset (gaya sticker/komik), bukan soft-shadow blur khas UI generik.

### 2.4 Prinsip Motion
- Animasi terbatas pada float halus di sticker/badge (durasi 5–6.5 detik, subtle).
- Hover card: sedikit terangkat + rotasi ringan.
- Menghormati `prefers-reduced-motion` — animasi otomatis nonaktif.

---

## 3. Struktur Halaman & Konten

### 3.1 Navigasi
- Logo mini + nama brand (kata "Khum" hitam, "Khum" kedua merah)
- Menu: Tentang · Varian Rasa · Distribusi · Mitra Petani · Kontak
- CTA: **"Jadi Reseller"**

### 3.2 Hero
- **Eyebrow:** "Oleh-oleh khas Kulon Progo"
- **Headline:** "Kriuk yang bikin **nagih**, dari jamur tiram pilihan petani lokal."
- **Subheadline:** KhumKhum Jamur Crispy diracik dari jamur tiram segar Kulon Progo, digoreng kering tanpa MSG, dan dibumbui sepenuh hati — sudah dipercaya di lebih dari 1.500 toko di 8 provinsi.
- **CTA:** "Lihat Varian Rasa" (primer) · "Gabung Reseller" (sekunder)
- **Trust markers:** Halal LPPOM MUI · P-IRT Terdaftar · Tanpa MSG · Merek Terdaftar
- **Visual:** komposisi sticker logo asli + 3 mini badge varian rasa

### 3.3 Tentang Kami
- **Eyebrow:** "Cerita Kami"
- **Headline:** "Dari kebun jamur Wates, untuk seluruh Nusantara."
- **Narasi:** KhumKhum lahir dari CV Khaira Buana Mas di Desa Bendungan, Wates, Kulon Progo — bermula dari kelebihan panen jamur tiram petani lokal yang belum terserap pasar. Sejak Ramadhan 2020, racikan sederhana itu tumbuh jadi camilan yang menemani ribuan momen ngemil di seluruh Indonesia.
- **Quote card:** *"Setiap gigitan kriuknya, ada doa petani jamur yang terpanjat dalam setiap munajat."* — Tim KhumKhum
- **Statistik:** 1.500+ Titik Penjualan · 8 Provinsi · 5 Varian Rasa

### 3.4 Varian Rasa
- **Headline:** "Lima rasa, satu kriuk yang sama nagihnya."
- **5 kartu varian:**
  | Kode | Nama | Deskripsi |
  |---|---|---|
  | O | Original | Gurih klasik, rasa asli jamur tiram |
  | B | Balado | Pedas segar khas sambal balado |
  | PM | Pedas Manis | Perpaduan manis dan sedikit pedas |
  | SP | Super Pedas | Untuk pencinta sensasi ekstra pedas |
  | BBQ | Barbeque | Smoky gurih ala panggangan |

### 3.5 Jejak Distribusi
- **Headline:** "Dari Kulon Progo, kini ada di rak-rak favoritmu."
- **4 statistik:** 1.500+ Gerai Oleh-oleh & Retail · 8 Provinsi · 6+ Retail Modern Mitra · Berdiri Sejak 2020

### 3.6 Mitra Petani
- **Headline:** "Kami tumbuh bersama petani jamur tiram Kulon Progo."
- **Narasi:** Hasil panen dari belasan petani jamur tiram diserap langsung oleh KhumKhum, memastikan bahan baku segar sekaligus membuka pasar yang lebih pasti bagi petani mitra. Komitmen ini membawa KhumKhum meraih penghargaan UKM Unggulan Inkubator Bisnis DIY 2022 dan Inovator Sosial DIY 2023.
- **Badge sertifikasi:** Halal LPPOM MUI · P-IRT Dinkes · Sertifikat Merek · Inovator Sosial DIY 2023

### 3.7 Kontak
- **Headline:** "Mau jadi reseller atau distributor?"
- **Alamat:** CV Khaira Buana Mas, Klewonan RT 21 RW 09, Triharjo, Wates, Kulon Progo, DI Yogyakarta
- **Form:** Nama lengkap · Nomor WhatsApp · Kota/wilayah usaha · Pesan
- **Sosial:** @khumkhum_jamurcrispy

### 3.8 Footer
- Nama brand + copyright CV Khaira Buana Mas

---

## 4. Catatan Implementasi untuk Tim Dev (Next.js)

- Gunakan `next/font/google` untuk memuat Baloo 2, Caveat, dan Plus Jakarta Sans agar teroptimasi (bukan `<link>` manual seperti di prototipe HTML).
- Logo simpan sebagai asset statis di `/public/logo-khumkhum.jpg`, gunakan `next/image` untuk optimasi otomatis (bukan base64 inline seperti di prototipe).
- Komponen yang layak dipisah: `<StickerBadge>`, `<FlavorCard>`, `<WavyDivider>`, `<StatCard>` — reusable di beberapa section.
- Warna dan font sebaiknya didefinisikan sebagai CSS variables/Tailwind theme extend, bukan hardcoded di tiap komponen, agar konsisten dengan skema warna di atas.
- Prototipe interaktif lengkap (HTML/CSS final) tersedia di file `khumkhum-landing.html` sebagai referensi visual 1:1.

---

*Dokumen ini melengkapi PRD Sistem ERP KhumKhum (`PRD_KhumKhum_ERP_System.md`) — bagian Bab 4 (Fitur Landing Page).*
