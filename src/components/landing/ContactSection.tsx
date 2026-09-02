"use client";
import { useState } from "react";
import { MapPin, Instagram, Send, PhoneCall, Check } from "lucide-react";

export default function ContactSection() {
  const [form, setForm] = useState({
    nama: "",
    whatsapp: "",
    kota: "",
    pesan: "",
  });
  const [sent, setSent] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Build WA message
    const msg = encodeURIComponent(
      `Halo KhumKhum!\n\nSaya ingin konsultasi pemesanan / kemitraan reseller:\n\n*Nama:* ${form.nama}\n*Nomor WA:* ${form.whatsapp}\n*Kota/Wilayah:* ${form.kota}\n\n*Pesan/Kebutuhan:*\n${form.pesan || "Mohon info katalog harga grosir dan syarat reseller KhumKhum."}`
    );
    window.open(`https://wa.me/6281234567890?text=${msg}`, "_blank");
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <section
      id="kontak"
      className="relative py-24 overflow-hidden"
      style={{ background: "#FFFBF2" }}
    >
      {/* Wavy top */}
      <div className="wave-top">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ height: 80, width: "100%" }}>
          <path
            d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,0 L0,0 Z"
            fill="var(--cream)"
          />
        </svg>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="eyebrow mb-3 block">Hubungi Kami</span>
          <h2
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              color: "var(--ink)",
            }}
          >
            Tertarik Menjadi{" "}
            <span style={{ color: "var(--chili)" }}>Reseller</span> atau{" "}
            <span style={{ color: "var(--chili)" }}>Distributor</span>?
          </h2>
          <p
            className="mt-3 text-base max-w-xl mx-auto"
            style={{ color: "var(--ink-soft)" }}
          >
            Tinggalkan pesan di bawah untuk mendapatkan harga khusus grosir, sampel tester, dan panduan kemitraan resmi.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <div
            className="rounded-2xl p-7 border-[3px] border-[var(--ink)]"
            style={{
              background: "var(--cream)",
              boxShadow: "7px 7px 0 var(--ink)",
            }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4" id="contact-form">
              <div>
                <label
                  htmlFor="nama"
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: "var(--ink)" }}
                >
                  Nama Lengkap *
                </label>
                <input
                  id="nama"
                  name="nama"
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  className="form-input rounded-lg w-full p-3 border-2 border-[var(--ink)]/20 focus:border-[var(--chili)] outline-none"
                  value={form.nama}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="whatsapp"
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: "var(--ink)" }}
                >
                  Nomor WhatsApp *
                </label>
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  required
                  placeholder="Contoh: 08123456789"
                  className="form-input rounded-lg w-full p-3 border-2 border-[var(--ink)]/20 focus:border-[var(--chili)] outline-none"
                  value={form.whatsapp}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="kota"
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: "var(--ink)" }}
                >
                  Kota / Wilayah Distribusi *
                </label>
                <input
                  id="kota"
                  name="kota"
                  type="text"
                  required
                  placeholder="Contoh: Yogyakarta / Solo / Jakarta"
                  className="form-input rounded-lg w-full p-3 border-2 border-[var(--ink)]/20 focus:border-[var(--chili)] outline-none"
                  value={form.kota}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label
                  htmlFor="pesan"
                  className="block text-sm font-semibold mb-1.5"
                  style={{ color: "var(--ink)" }}
                >
                  Rencana Pemesanan / Catatan
                </label>
                <textarea
                  id="pesan"
                  name="pesan"
                  rows={3}
                  placeholder="Contoh: Rencana buka gerai oleh-oleh, mohon info paket reseller dan katalog rasa..."
                  className="form-input rounded-lg w-full p-3 border-2 border-[var(--ink)]/20 focus:border-[var(--chili)] outline-none"
                  value={form.pesan}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                id="contact-submit"
                className="btn-comic btn-primary px-6 py-3.5 rounded-xl text-base w-full justify-center mt-2 shadow-md flex items-center gap-2"
              >
                {sent ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span>Pesan Terbuka di WhatsApp</span>
                    <Check className="w-4 h-4 text-currentColor" aria-hidden="true" />
                  </span>
                ) : (
                  <>
                    <Send className="w-5 h-5 text-currentColor" aria-hidden="true" />
                    <span>Hubungkan ke WhatsApp CS</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info card */}
          <div className="flex flex-col gap-5">
            {/* Address */}
            <div
              className="rounded-2xl p-6 border-[2.5px] border-[var(--mushroom)]"
              style={{ background: "var(--cream)", boxShadow: "5px 5px 0 var(--mushroom)" }}
            >
              <h3
                className="font-bold mb-3 flex items-center gap-2"
                style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, color: "var(--ink)" }}
              >
                <MapPin className="w-5 h-5 text-[var(--chili)]" aria-hidden="true" />
                <span>Rumah Produksi & Kantor</span>
              </h3>
              <address
                className="not-italic text-sm leading-relaxed"
                style={{ color: "var(--ink-soft)" }}
              >
                <strong>CV Khaira Buana Mas</strong><br />
                Klewonan RT 21 RW 09, Desa Triharjo, Kec. Wates<br />
                Kabupaten Kulon Progo, D.I. Yogyakarta 55651
              </address>
            </div>

            {/* Social */}
            <div
              className="rounded-2xl p-6 border-[2.5px] border-[var(--chili)]"
              style={{ background: "var(--cream)", boxShadow: "5px 5px 0 var(--chili)" }}
            >
              <h3
                className="font-bold mb-3 flex items-center gap-2"
                style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, color: "var(--ink)" }}
              >
                <Instagram className="w-5 h-5 text-[var(--chili)]" aria-hidden="true" />
                <span>Instagram Resmi</span>
              </h3>
              <a
                href="https://instagram.com/khumkhum_jamurcrispy"
                target="_blank"
                rel="noopener noreferrer"
                id="contact-instagram"
                className="flex items-center gap-2 group"
              >
                <span
                  className="font-bold text-sm group-hover:underline"
                  style={{ color: "var(--chili)" }}
                >
                  @khumkhum_jamurcrispy
                </span>
                <span className="text-xs text-[var(--ink-soft)] opacity-75">
                  (Foto produk, testimoni & liputan)
                </span>
              </a>
            </div>

            {/* Quick CTA */}
            <div
              className="rounded-2xl p-6 border-[2.5px] border-[var(--turmeric-deep)]"
              style={{
                background: "var(--turmeric)",
                boxShadow: "5px 5px 0 var(--turmeric-deep)",
              }}
            >
              <p
                className="mb-3 font-bold"
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "var(--ink)",
                }}
              >
                Punya pertanyaan cepat seputar pemesanan?
              </p>
              <a
                href="https://wa.me/6281234567890?text=Halo%20Admin%20KhumKhum%2C%20saya%20mau%20tanya%20produk%20dan%20reseller"
                target="_blank"
                rel="noopener noreferrer"
                id="contact-wa-direct"
                className="btn-comic btn-primary px-5 py-3 rounded-xl text-sm inline-flex w-full justify-center items-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-currentColor" aria-hidden="true" />
                <span>Chat Admin WhatsApp Sekarang</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
