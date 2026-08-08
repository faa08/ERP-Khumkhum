import Image from "next/image";

export default function HeroSection() {
  const flavorBadges = [
    { label: "Original", color: "#4CAF50", delay: "0s" },
    { label: "Balado", color: "#D31F26", delay: "0.8s" },
    { label: "Pedas Manis", color: "#F2A93C", delay: "1.5s" },
    { label: "Super Pedas", color: "#FF5722", delay: "0.3s" },
    { label: "BBQ", color: "#8B5E3C", delay: "1.1s" },
  ];

  return (
    <section
      id="hero"
      className="halftone-bg relative min-h-screen flex items-center overflow-hidden pt-16"
    >
      {/* Bottom wave */}
      <div className="wave-bottom">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ height: 80, width: "100%" }}>
          <path
            d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z"
            fill="#FFFBF2"
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        {/* Text side */}
        <div className="order-2 lg:order-1">
          {/* Eyebrow */}
          <div className="mb-4">
            <span className="eyebrow">Oleh-oleh khas Kulon Progo</span>
          </div>

          {/* Headline */}
          <h1
            className="mb-5 leading-tight"
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              color: "var(--ink)",
            }}
          >
            Kriuk yang bikin{" "}
            <span style={{ color: "var(--chili)" }}>nagih</span>, dari jamur
            tiram pilihan petani lokal.
          </h1>

          {/* Sub */}
          <p
            className="mb-8 text-lg leading-relaxed max-w-lg"
            style={{ color: "var(--ink-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            KhumKhum Jamur Crispy diracik dari jamur tiram segar Kulon Progo,
            digoreng kering tanpa MSG, dan dibumbui sepenuh hati  sudah
            dipercaya di lebih dari{" "}
            <strong style={{ color: "var(--ink)" }}>1.500 toko</strong> di{" "}
            <strong style={{ color: "var(--ink)" }}>8 provinsi</strong>.
          </p>

          {/* CTA */}
          <div className="flex flex-wrap gap-4 mb-10">
            <a
              href="#varian"
              id="hero-cta-varian"
              className="btn-comic btn-primary px-7 py-3.5 rounded-xl text-base"
            >
              Lihat Varian Rasa
            </a>
            <a
              href="#kontak"
              id="hero-cta-reseller"
              className="btn-comic btn-secondary px-7 py-3.5 rounded-xl text-base"
            >
              Gabung Reseller 
            </a>
          </div>

          {/* Trust markers */}
          <div className="flex flex-wrap gap-2">
            {[
              "Halal LPPOM MUI",
              "P-IRT Terdaftar",
              "Tanpa MSG",
              "Merek Terdaftar",
            ].map((t) => (
              <span
                key={t}
                className="cert-badge"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Visual side */}
        <div className="order-1 lg:order-2 relative flex items-center justify-center">
          {/* Sticker badge (main product) */}
          <div className="sticker-badge relative z-10">
            <Image
              src="/No-Background-KhumKhum-1536x864.webp"
              alt="KhumKhum Jamur Crispy 5 Varian Rasa"
              width={520}
              height={293}
              priority
              className="w-full max-w-sm sm:max-w-md"
            />
          </div>

          {/* Floating flavor mini-badges */}
          {flavorBadges.map((b, i) => {
            const positions = [
              "top-2 left-2 sm:top-6 sm:-left-6",
              "top-10 right-0 sm:top-14 sm:-right-8",
              "bottom-24 -left-4 sm:bottom-28 sm:-left-10",
              "bottom-4 right-2 sm:bottom-8 sm:-right-4",
              "top-1/2 -translate-y-1/2 -right-2 sm:-right-12",
            ];
            const floatClass = `float-${i + 1}`;
            return (
              <div
                key={b.label}
                className={`absolute ${positions[i]} ${floatClass} z-20`}
              >
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-center p-1.5 border-[3px] border-[var(--cream)] shadow-lg"
                  style={{ background: b.color }}
                >
                  <span
                    className="text-white leading-tight"
                    style={{
                      fontFamily: "'Baloo 2', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.55rem",
                    }}
                  >
                    {b.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
