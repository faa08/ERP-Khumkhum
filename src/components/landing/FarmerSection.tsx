import Image from "next/image";

const certs = [
  { icon: "", label: "Halal LPPOM MUI" },
  { icon: "", label: "P-IRT Dinkes" },
  { icon: "", label: "Sertifikat Merek" },
  { icon: "", label: "Inovator Sosial DIY 2023" },
  { icon: "", label: "UKM Unggulan Inkubator Bisnis DIY 2022" },
];

export default function FarmerSection() {
  return (
    <section
      id="petani"
      className="relative py-24"
      style={{ background: "var(--cream)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <span className="eyebrow mb-4 block">Mitra Petani</span>
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
              Kami tumbuh bersama{" "}
              <span style={{ color: "var(--chili)" }}>
                petani jamur tiram Kulon Progo.
              </span>
            </h2>
            <p
              className="mb-8 leading-relaxed"
              style={{ color: "var(--ink-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Hasil panen dari belasan petani jamur tiram diserap langsung oleh
              KhumKhum, memastikan bahan baku segar sekaligus membuka pasar yang
              lebih pasti bagi petani mitra. Komitmen ini membawa KhumKhum meraih
              penghargaan UKM Unggulan Inkubator Bisnis DIY 2022 dan Inovator
              Sosial DIY 2023.
            </p>

            {/* Cert badges */}
            <div className="flex flex-wrap gap-3">
              {certs.map((c) => (
                <div key={c.label} className="cert-badge">
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div
              className="rounded-2xl overflow-hidden border-[3px] border-[var(--ink)]"
              style={{ boxShadow: "8px 8px 0 var(--ink)" }}
            >
              <Image
                src="/2-scaled-pv5pp6riaig396sjix76oc0wd3bvz44zgos9fummv4.jpg"
                alt="Produk KhumKhum Jamur Crispy yang sedang dituang"
                width={700}
                height={700}
                className="w-full h-72 sm:h-96 object-cover"
              />
            </div>
            {/* Award tag */}
            <div
              className="absolute -top-4 -left-4 sm:-top-5 sm:-left-5 px-4 py-3 rounded-xl border-[3px] border-[var(--ink)] float-2"
              style={{
                background: "var(--turmeric)",
                boxShadow: "4px 4px 0 var(--ink)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: "var(--ink)",
                  lineHeight: 1.3,
                }}
              >
                UKM Unggulan<br />
                Inkubator DIY 2022
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
