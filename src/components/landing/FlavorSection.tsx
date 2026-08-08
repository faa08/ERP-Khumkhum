const flavors = [
  {
    code: "O",
    name: "Original",
    desc: "Gurih klasik, rasa asli jamur tiram",
    emoji: "",
    color: "#4CAF50",
    light: "#E8F5E9",
    cls: "flavor-original",
  },
  {
    code: "B",
    name: "Balado",
    desc: "Pedas segar khas sambal balado",
    emoji: "",
    color: "#D31F26",
    light: "#FFEBEE",
    cls: "flavor-balado",
  },
  {
    code: "PM",
    name: "Pedas Manis",
    desc: "Perpaduan manis dan sedikit pedas",
    emoji: "",
    color: "#C96A16",
    light: "#FFF3E0",
    cls: "flavor-pedasmanis",
  },
  {
    code: "SP",
    name: "Super Pedas",
    desc: "Untuk pencinta sensasi ekstra pedas",
    emoji: "",
    color: "#FF5722",
    light: "#FBE9E7",
    cls: "flavor-superpedas",
  },
  {
    code: "BBQ",
    name: "Barbeque",
    desc: "Smoky gurih ala panggangan",
    emoji: "",
    color: "#8B5E3C",
    light: "#EFEBE9",
    cls: "flavor-bbq",
  },
];

type Flavor = (typeof flavors)[0];

function FlavorCard({ f }: { f: Flavor }) {
  return (
    <div
      className={`card-hover rounded-2xl border-[3px] ${f.cls} p-6 flex flex-col gap-3`}
      style={{
        background: f.light,
        boxShadow: `4px 4px 0 ${f.color}40`,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center border-[3px] flex-shrink-0"
          style={{
            background: f.color,
            borderColor: "var(--cream-card)",
            boxShadow: "3px 3px 0 rgba(0,0,0,0.15)",
          }}
        >
          <span className="text-2xl">{f.emoji}</span>
        </div>
        <div>
          <span
            className="text-xs font-bold tracking-widest uppercase mb-0.5 block"
            style={{ color: f.color }}
          >
            {f.code}
          </span>
          <h3
            style={{
              fontFamily: "'Baloo 2', sans-serif",
              fontWeight: 800,
              fontSize: "1.25rem",
              color: "var(--ink)",
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
            Lima rasa, satu kriuk yang{" "}
            <span style={{ color: "var(--chili)" }}>sama nagihnya</span>.
          </h2>
        </div>

        {/* Top 3 cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {flavors.slice(0, 3).map((f) => (
            <FlavorCard key={f.code} f={f} />
          ))}
        </div>

        {/* Bottom 2 cards  centered */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5 max-w-2xl mx-auto">
          {flavors.slice(3).map((f) => (
            <FlavorCard key={f.code} f={f} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="#kontak"
            id="flavor-cta-order"
            className="btn-comic btn-primary px-8 py-3.5 rounded-xl text-base inline-flex"
          >
            Pesan Sekarang
          </a>
        </div>
      </div>
    </section>
  );
}
