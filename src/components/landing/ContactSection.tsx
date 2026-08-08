"use client";
import { useState } from "react";

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
      `Halo KhumKhum!\n\nSaya ingin menjadi reseller:\n\n*Nama:* ${form.nama}\n*Kota/Wilayah:* ${form.kota}\n\n*Pesan:*\n${form.pesan}`
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
          <span className="eyebrow mb-3 block">Kontak</span>
          <h2
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              color: "var(--ink)",
            }}
          >
            Mau jadi{" "}
            <span style={{ color: "var(--chili)" }}>reseller</span> atau{" "}
            <span style={{ color: "var(--chili)" }}>distributor</span>?
          </h2>
          <p
            className="mt-3 text-base max-w-xl mx-auto"
            style={{ color: "var(--ink-soft)" }}
          >
            Isi form di bawah, kami akan langsung menghubungi kamu via WhatsApp.
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
                  className="form-input rounded-lg"
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
                  placeholder="08xxxxxxxxxx"
                  className="form-input rounded-lg"
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
                  Kota / Wilayah Usaha *
                </label>
                <input
                  id="kota"
                  name="kota"
                  type="text"
                  required
                  placeholder="Contoh: Yogyakarta"
                  className="form-input rounded-lg"
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
                  Pesan
                </label>
                <textarea
                  id="pesan"
                  name="pesan"
                  placeholder="Ceritakan rencana bisnis atau pertanyaan kamu..."
                  className="form-input rounded-lg"
                  value={form.pesan}
                  onChange={handleChange}
                />
              </div>

              <button
                type="submit"
                id="contact-submit"
                className="btn-comic btn-primary px-6 py-3.5 rounded-xl text-base w-full justify-center"
              >
                {sent ? "Terkirim! Cek WhatsApp kamu" : "Kirim via WhatsApp"}
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
                Alamat
              </h3>
              <address
                className="not-italic text-sm leading-relaxed"
                style={{ color: "var(--ink-soft)" }}
              >
                CV Khaira Buana Mas<br />
                Klewonan RT 21 RW 09<br />
                Triharjo, Wates<br />
                Kulon Progo, DI Yogyakarta
              </address>
            </div>

            {/* Social */}
            <div
              className="rounded-2xl p-6 border-[2.5px] border-[var(--chili)]"
              style={{ background: "var(--cream)", boxShadow: "5px 5px 0 var(--chili)" }}
            >
              <h3
                className="font-bold mb-3"
                style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 700, color: "var(--ink)" }}
              >
                Sosial Media
              </h3>
              <a
                href="https://instagram.com/khumkhum_jamurcrispy"
                target="_blank"
                rel="noopener noreferrer"
                id="contact-instagram"
                className="flex items-center gap-3 group"
              >
                <span className="text-2xl"></span>
                <span
                  className="font-semibold group-hover:underline"
                  style={{ color: "var(--chili)" }}
                >
                  @khumkhum_jamurcrispy
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
                  fontSize: "1.2rem",
                  color: "var(--ink)",
                }}
              >
                Atau langsung chat kami!
              </p>
              <a
                href="https://wa.me/6281234567890"
                target="_blank"
                rel="noopener noreferrer"
                id="contact-wa-direct"
                className="btn-comic btn-primary px-5 py-3 rounded-xl text-sm inline-flex w-full justify-center"
              >
                Chat WhatsApp Sekarang
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
