import { Store, MapPin, ShoppingBag, Calendar } from "lucide-react";

const stats = [
  {
    value: "1.500+",
    label: "Gerai Oleh-oleh & Retail",
    icon: <Store className="w-8 h-8 mx-auto text-[var(--chili)]" />,
    desc: "Tersebar di toko oleh-oleh, rest area, dan swalayan",
  },
  {
    value: "8",
    label: "Provinsi di Indonesia",
    icon: <MapPin className="w-8 h-8 mx-auto text-[var(--turmeric-deep)]" />,
    desc: "Menjangkau pulau Jawa, Sumatera, hingga Indonesia Timur",
  },
  {
    value: "6+",
    label: "Jejaring Retail Mitra",
    icon: <ShoppingBag className="w-8 h-8 mx-auto text-[var(--chili)]" />,
    desc: "Pusat oleh-oleh ternama & minimarket modern terpilih",
  },
  {
    value: "2020",
    label: "Tumbuh Bersama Petani",
    icon: <Calendar className="w-8 h-8 mx-auto text-[var(--turmeric-deep)]" />,
    desc: "Konsisten menjaga kerenyahan dan mutu bahan baku",
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
              kini hadir di rak camilan favoritmu.
            </span>
          </h2>
          <p
            className="mt-3 text-base max-w-xl mx-auto"
            style={{ color: "var(--ink-soft)" }}
          >
            Mudah ditemukan di toko oleh-oleh terkemuka, pusat jajanan khas daerah, maupun pemesanan online langsung ke rumahmu.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {stats.map((s) => (
            <div
              key={s.label}
              className="stat-card rounded-2xl p-6 text-center card-hover border-2 border-[var(--ink)]/10"
            >
              <div className="mb-3 flex items-center justify-center">{s.icon}</div>
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
                className="font-bold text-sm mt-2 mb-1"
                style={{ color: "var(--ink)" }}
              >
                {s.label}
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
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
          <div className="text-xs font-bold uppercase tracking-widest text-[var(--chili)] mb-2">
            Wilayah Pengiriman & Penjualan Aktif
          </div>
          <p
            style={{
              fontFamily: "'Caveat', cursive",
              fontWeight: 700,
              fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
              color: "var(--ink)",
            }}
          >
            Jawa • Sumatera • Kalimantan • Sulawesi • Bali • NTB • Papua • Maluku
          </p>
          <p
            className="mt-2 text-sm font-medium"
            style={{ color: "var(--ink-soft)" }}
          >
            Melayani pengiriman ritel reguler & pengadaan grosir ke seluruh pelosok Nusantara
          </p>
        </div>
      </div>
    </section>
  );
}
