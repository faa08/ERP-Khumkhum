const stats = [
  {
    value: "1.500+",
    label: "Gerai Oleh-oleh & Retail",
    icon: "",
    desc: "Tersebar dari Sabang sampai sudut Jawa",
  },
  {
    value: "8",
    label: "Provinsi",
    icon: "",
    desc: "Dan terus bertambah setiap tahun",
  },
  {
    value: "6+",
    label: "Retail Modern Mitra",
    icon: "",
    desc: "Minimarket & gerai modern terpilih",
  },
  {
    value: "2020",
    label: "Berdiri Sejak",
    icon: "",
    desc: "Dari Ramadhan hingga ke seluruh nusantara",
  },
];

export default function DistributionSection() {
  return (
    <section
      id="distribusi"
      className="relative py-24 overflow-hidden"
      style={{ background: "#FFFBF2" }}
    >
      {/* Wavy top */}
      <div className="wave-top">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ height: 80, width: "100%" }}>
          <path
            d="M0,40 C240,0 480,80 720,40 C960,0 1200,80 1440,40 L1440,0 L0,0 Z"
            fill="var(--cream)"
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="eyebrow mb-3 block">Jejak Distribusi</span>
          <h2
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              color: "var(--ink)",
            }}
          >
            Dari Kulon Progo,{" "}
            <span style={{ color: "var(--chili)" }}>
              kini ada di rak-rak favoritmu.
            </span>
          </h2>
        </div>

        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {stats.map((s) => (
            <div
              key={s.label}
              className="stat-card rounded-2xl p-6 text-center card-hover"
            >
              <div className="text-4xl mb-3">{s.icon}</div>
              <div
                style={{
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 800,
                  fontSize: "2.25rem",
                  color: "var(--chili)",
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div
                className="font-bold text-sm mt-1 mb-1"
                style={{ color: "var(--ink)" }}
              >
                {s.label}
              </div>
              <div className="text-xs" style={{ color: "var(--ink-soft)" }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Decorative map strip */}
        <div
          className="rounded-2xl border-[3px] border-[var(--ink)] p-8 text-center"
          style={{
            background: "var(--cream)",
            boxShadow: "6px 6px 0 var(--ink)",
          }}
        >
          <p
            style={{
              fontFamily: "'Caveat', cursive",
              fontWeight: 700,
              fontSize: "1.5rem",
              color: "var(--ink)",
            }}
          >
            Jawa  Sumatera  Kalimantan  Sulawesi  Bali  NTB  Papua  Maluku
          </p>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--ink-soft)" }}
          >
            &amp; masih terus berkembang ke seluruh penjuru nusantara
          </p>
        </div>
      </div>
    </section>
  );
}
