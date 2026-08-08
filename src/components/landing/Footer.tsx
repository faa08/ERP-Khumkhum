import Image from "next/image";

export default function Footer() {
  return (
    <footer
      className="relative py-10 border-t-[3px] border-[var(--ink)]"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Image
              src="/95856209_353744725599963_5721628317879107584_n.jpg"
              alt="KhumKhum Logo"
              width={44}
              height={44}
              className="rounded-full border-2 border-[var(--turmeric)] object-cover"
            />
            <div>
              <div
                style={{
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 800,
                  fontSize: "1.3rem",
                  lineHeight: 1,
                }}
              >
                <span style={{ color: "var(--cream)" }}>Khum</span>
                <span style={{ color: "var(--chili-bright)" }}>Khum</span>
              </div>
              <div
                className="text-xs mt-0.5"
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontWeight: 600,
                  color: "var(--turmeric)",
                }}
              >
                Jamur Crispy
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav>
            <ul className="flex flex-wrap justify-center gap-5 text-sm font-semibold">
              {["Tentang", "Varian Rasa", "Distribusi", "Mitra Petani", "Kontak"].map((item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase().replace(" ", "")}`}
                    className="opacity-70 hover:opacity-100 transition-opacity"
                    style={{ color: "var(--cream)" }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Social */}
          <a
            href="https://instagram.com/khumkhum_jamurcrispy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-semibold opacity-80 hover:opacity-100 transition-opacity"
            style={{ color: "var(--turmeric)" }}
          >
            <span></span>
            <span>@khumkhum_jamurcrispy</span>
          </a>
        </div>

        {/* Divider */}
        <div
          className="my-6"
          style={{ height: "1px", background: "rgba(251,241,220,0.15)" }}
        />

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs opacity-60">
          <p>&copy; {new Date().getFullYear()} CV Khaira Buana Mas. Hak cipta dilindungi undang-undang.</p>
          <p
            style={{ fontFamily: "'Caveat', cursive", fontWeight: 600, fontSize: "0.9rem" }}
          >
            Lokal Jamurnya, Nasional Rasanya
          </p>
        </div>
      </div>
    </footer>
  );
}
