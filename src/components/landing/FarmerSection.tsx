import Image from "next/image";
import { ShieldCheck, Award, CheckCircle2, HeartHandshake, Sparkles } from "lucide-react";

const certs = [
  { icon: <ShieldCheck size={16} className="text-[var(--chili)]" />, label: "Halal LPPOM MUI" },
  { icon: <CheckCircle2 size={16} className="text-[#4CAF50]" />, label: "P-IRT Dinkes Terdaftar" },
  { icon: <Sparkles size={16} className="text-[var(--turmeric-deep)]" />, label: "Sertifikat Merek Resmi" },
  { icon: <Award size={16} className="text-[var(--turmeric-deep)]" />, label: "Inovator Sosial DIY 2023" },
  { icon: <HeartHandshake size={16} className="text-[var(--chili)]" />, label: "UKM Unggulan Inkubator Bisnis DIY 2022" },
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
            <span className="eyebrow mb-4 block">Kemitraan Petani</span>
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
              Tumbuh dan berdaya bersama{" "}
              <span style={{ color: "var(--chili)" }}>
                petani jamur tiram Kulon Progo.
              </span>
            </h2>
            <p
              className="mb-8 leading-relaxed"
              style={{ color: "var(--ink-soft)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Setiap bungkus KhumKhum lahir dari jamur tiram segar yang dipetik langsung dari kumbung petani mitra di Kulon Progo. Kemitraan ini memberi kepastian harga dan serapan hasil panen yang adil, mengantarkan KhumKhum meraih penghargaan <strong>UKM Unggulan Inkubator Bisnis DIY 2022</strong> dan <strong>Inovator Sosial DIY 2023</strong>.
            </p>

            {/* Cert badges */}
            <div className="flex flex-wrap gap-3">
              {certs.map((c) => (
                <div key={c.label} className="cert-badge flex items-center gap-2 py-2 px-3.5 shadow-sm">
                  <span>{c.icon}</span>
                  <span className="font-semibold text-xs text-[var(--ink)]">{c.label}</span>
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
