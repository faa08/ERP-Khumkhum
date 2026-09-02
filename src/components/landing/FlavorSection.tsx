import Image from "next/image";

const flavors = [
  {
    code: "O",
    name: "Original",
    desc: "Gurih renyah klasik dengan cita rasa asli jamur tiram segar alami.",
    image: "/images/flavors/original.jpg",
    color: "#4CAF50",
    light: "#E8F5E9",
    cls: "flavor-original",
    tag: "Favorit Semua Usia",
  },
  {
    code: "B",
    name: "Balado",
    desc: "Pedas manis gurih berbalut bumbu balado khas yang segar dan menggoda.",
    image: "/images/flavors/balado.jpg",
    color: "#D31F26",
    light: "#FFEBEE",
    cls: "flavor-balado",
    tag: "Best Seller",
  },
  {
    code: "PM",
    name: "Pedas Manis",
    desc: "Perpaduan manis karamel gurih dengan sengatan pedas pas yang bikin nagih.",
    image: "/images/flavors/pedas_manis.jpg",
    color: "#C96A16",
    light: "#FFF3E0",
    cls: "flavor-pedasmanis",
    tag: "Paling Pas di Lidah",
  },
  {
    code: "SP",
    name: "Super Pedas",
    desc: "Sensasi pedas membakar dengan cabai rawit melimpah untuk penantang pedas sejati.",
    image: "/images/flavors/super_pedas.jpg",
    color: "#FF5722",
    light: "#FBE9E7",
    cls: "flavor-superpedas",
    tag: "Ekstra Nampol",
  },
  {
    code: "BBQ",
    name: "Barbeque",
    desc: "Aroma smoky gurih ala panggangan kayu dengan bumbu rempah bakar yang memikat.",
    image: "/images/flavors/barbeque.jpg",
    color: "#8B5E3C",
    light: "#EFEBE9",
    cls: "flavor-bbq",
    tag: "Aroma Panggang Spesial",
  },
];

type Flavor = (typeof flavors)[0];

function FlavorCard({ f }: { f: Flavor }) {
  return (
    <div
      className={`card-hover rounded-2xl border-[3px] ${f.cls} p-6 flex flex-col justify-between gap-4 relative overflow-hidden`}
      style={{
        background: f.light,
        boxShadow: `5px 5px 0 ${f.color}50`,
      }}
    >
      <div>
        <div className="flex items-center gap-4 mb-3">
          {/* Round product photo */}
          <div
            className="w-16 h-16 rounded-full overflow-hidden border-[3px] flex-shrink-0 relative shadow-md"
            style={{
              borderColor: f.color,
              boxShadow: `0 3px 6px rgba(0,0,0,0.18)`,
            }}
          >
            <Image
              src={f.image}
              alt={`Jamur Crispy Rasa ${f.name}`}
              width={64}
              height={64}
              className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-300"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-xs font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full text-white inline-block"
                style={{ background: f.color }}
              >
                {f.code}
              </span>
              <span
                className="text-[11px] font-semibold opacity-75"
                style={{ color: f.color }}
              >
                {f.tag}
              </span>
            </div>
            <h3
              className="mt-1"
              style={{
                fontFamily: "'Baloo 2', sans-serif",
                fontWeight: 800,
                fontSize: "1.35rem",
                color: "var(--ink)",
                lineHeight: 1.2,
              }}
            >
              {f.name}
            </h3>
          </div>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          {f.desc}
        </p>
      </div>

      <div className="pt-2 border-t border-black/10 flex items-center justify-between text-xs font-semibold" style={{ color: f.color }}>
        <span>100% Jamur Tiram Asli</span>
        <span>Tanpa MSG</span>
      </div>
    </div>
  );
}

export default function FlavorSection() {
  return (
    <section
      id="varian"
      className="relative py-24"
      style={{ background: "var(--cream)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="eyebrow mb-3 block">Pilihan Rasa</span>
          <h2
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              color: "var(--ink)",
            }}
          >
            Lima rasa pilihan, satu kriuk yang{" "}
            <span style={{ color: "var(--chili)" }}>selalu bikin kangen</span>.
          </h2>
          <p
            className="mt-3 text-base max-w-xl mx-auto"
            style={{ color: "var(--ink-soft)" }}
          >
            Diracik dengan bumbu rempah pilihan tanpa MSG berlebih, dibalut kerenyahan jamur tiram segar hasil panen petani Kulon Progo.
          </p>
        </div>

        {/* Top 3 cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {flavors.slice(0, 3).map((f) => (
            <FlavorCard key={f.code} f={f} />
          ))}
        </div>

        {/* Bottom 2 cards centered */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 max-w-2xl mx-auto">
          {flavors.slice(3).map((f) => (
            <FlavorCard key={f.code} f={f} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="#kontak"
            id="flavor-cta-order"
            className="btn-comic btn-primary px-8 py-3.5 rounded-xl text-base inline-flex shadow-lg"
          >
            Pesan & Coba Semua Rasa
          </a>
        </div>
      </div>
    </section>
  );
}
