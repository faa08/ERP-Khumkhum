import Image from "next/image";

export default function AboutSection() {
  const stats = [
    { value: "1.500+", label: "Titik Penjualan" },
    { value: "8", label: "Provinsi" },
    { value: "5", label: "Varian Rasa" },
    { value: "2020", label: "Berdiri Sejak" },
  ];

  return (
    <section id="tentang" className="relative py-24 overflow-hidden" style={{ background: "#FFFBF2" }}>
      {/* Wavy top */}
      <div className="wave-top">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ height: 80, width: "100%" }}>
          <path
            d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,0 L0,0 Z"
            fill="#FBF1DC"
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <div
              className="rounded-2xl overflow-hidden border-[3px] border-[var(--ink)]"
              style={{ boxShadow: "8px 8px 0 var(--ink)" }}
            >
              <Image
                src="/1-scaled-qhdut4uehjal2hr3lxs0e1p301g678ixionw6k6zwg.jpg"
                alt="Produk KhumKhum Jamur Crispy dari berbagai sudut"
                width={700}
                height={700}
                className="w-full h-72 sm:h-96 object-cover"
              />
            </div>
            {/* Floating accent */}
            <div
              className="absolute -bottom-5 -right-4 sm:-bottom-6 sm:-right-6 w-28 h-28 rounded-full flex flex-col items-center justify-center text-center border-[3px] border-[var(--ink)] float-1"
              style={{ background: "var(--chili)", boxShadow: "4px 4px 0 var(--ink)" }}
            >
              <span
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontWeight: 700,
                  fontSize: "1rem",
                  color: "#fff",
                  lineHeight: 1.2,
                }}
              >
                Lokal<br />Banget!
              </span>
            </div>
          </div>

          {/* Content */}
          <div>
            <span className="eyebrow mb-4 block">Cerita Kami</span>
            <h2
              className="mb-5"
              style={{
                fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(1.7rem, 3.5vw, 2.5rem)",
                color: "var(--ink)",
                lineHeight: 1.25,
              }}
            >
              Dari kebun jamur Wates,<br />
              <span style={{ color: "var(--chili)" }}>untuk seluruh Nusantara.</span>
            </h2>
            <p
              className="mb-6 leading-relaxed"
              style={{ color: "var(--ink-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              KhumKhum dirintis oleh CV Khaira Buana Mas di Desa Bendungan, Wates,
              Kulon Progo. Berawal dari niat menyerap kelebihan panen jamur tiram petani mitra lokal
              yang melimpah sejak Ramadhan 2020, kini racikan renyah ini telah tumbuh menjadi
              camilan favorit yang menemani momen santai keluarga di seluruh Indonesia.
            </p>

            {/* Quote card */}
            <blockquote
              className="relative p-5 mb-8 rounded-xl border-l-4 border-[var(--chili)]"
              style={{
                background: "var(--cream)",
                borderTopRightRadius: "0.75rem",
                borderBottomRightRadius: "0.75rem",
              }}
            >
              <span
                className="block mb-1"
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  color: "var(--ink)",
                  lineHeight: 1.4,
                }}
              >
                &ldquo;Setiap gigitan kriuknya, ada doa petani jamur yang
                terpanjat dalam setiap munajat.&rdquo;
              </span>
              <cite
                className="not-italic text-sm font-semibold"
                style={{ color: "var(--chili)" }}
              >
                 Tim KhumKhum
              </cite>
            </blockquote>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="stat-card rounded-xl p-4 text-center"
                >
                  <div
                    style={{
                      fontFamily: "'Baloo 2', sans-serif",
                      fontWeight: 800,
                      fontSize: "1.6rem",
                      color: "var(--chili)",
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    className="text-xs font-semibold mt-0.5"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
