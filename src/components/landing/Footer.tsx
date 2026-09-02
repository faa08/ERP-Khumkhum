import Image from "next/image";
import { Check, MapPin, Phone } from "lucide-react";

export default function Footer() {
  const socialLinks = [
    {
      name: "Instagram",
      handle: "@khumkhum_jamurcrispy",
      url: "https://instagram.com/khumkhum_jamurcrispy",
      color: "#E1306C",
      bg: "#FDF2F4",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      name: "TikTok",
      handle: "@khumkhum.official",
      url: "https://tiktok.com/@khumkhum.official",
      color: "#00F2FE",
      bg: "#111827",
      icon: (
        <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43 6.3 6.3 0 0 0 1.93-4.52V8.75a8.16 8.16 0 0 0 4.79 1.52V6.84a4.85 4.85 0 0 1-.99-.15z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      handle: "KhumKhum Jamur Crispy",
      url: "https://facebook.com/khumkhumjamurcrispy",
      color: "#1877F2",
      bg: "#EFF6FF",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "WhatsApp",
      handle: "+62 812-3456-7890",
      url: "https://wa.me/6281234567890?text=Halo%20KhumKhum%2C%20saya%20tertarik%20pesan%20jamur%20crispy",
      color: "#25D366",
      bg: "#F0FDF4",
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      ),
    },
  ];

  const marketplaces = [
    {
      name: "Shopee",
      desc: "Official Store",
      url: "https://shopee.co.id/search?keyword=khumkhum%20jamur%20crispy",
      color: "#EE4D2D",
      imageSrc: "/images/hopee-logo-vector-png_1020x.webp",
    },
    {
      name: "Tokopedia",
      desc: "Official Store",
      url: "https://tokopedia.com/search?q=khumkhum%20jamur%20crispy",
      color: "#03AC0E",
      imageSrc: "/images/tokopedia.webp",
    },
    {
      name: "Blibli",
      desc: "Official Partner",
      url: "https://www.blibli.com/merchant/khumkhum-jamur-crispy",
      color: "#0095DA",
      imageSrc: "/images/logo-blibli.webp",
    },
    {
      name: "PaDi UMKM",
      desc: "B2B Pengadaan",
      url: "https://padiumkm.id/search?k=khumkhum",
      color: "#F37021",
      imageSrc: "/images/padiumkm.webp",
    },
    {
      name: "Bukalapak",
      desc: "KhumKhum Store",
      url: "https://www.bukalapak.com/products?search%5Bkeywords%5D=khumkhum%20jamur%20crispy",
      color: "#E31F52",
      imageSrc: "/images/logo-bukalapak.webp",
    },
  ];

  return (
    <footer
      className="relative pt-16 pb-12 border-t-[3px] border-[var(--ink)]"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          {/* Brand & Story */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/95856209_353744725599963_5721628317879107584_n.jpg"
                alt="KhumKhum Logo"
                width={52}
                height={52}
                className="rounded-full border-2 border-[var(--turmeric)] object-cover shadow-md"
              />
              <div>
                <div
                  style={{
                    fontFamily: "'Baloo 2', sans-serif",
                    fontWeight: 800,
                    fontSize: "1.6rem",
                    lineHeight: 1,
                  }}
                >
                  <span style={{ color: "var(--cream)" }}>Khum</span>
                  <span style={{ color: "var(--chili-bright)" }}>Khum</span>
                </div>
                <div
                  className="text-xs tracking-wider uppercase font-bold mt-0.5"
                  style={{ color: "var(--turmeric)" }}
                >
                  Jamur Crispy Kulon Progo
                </div>
              </div>
            </div>

            <p className="text-sm leading-relaxed opacity-80 mt-1">
              Pelopor camilan jamur tiram renyah dari Desa Bendungan, Wates, Kulon Progo. Diproduksi oleh <strong>CV Khaira Buana Mas</strong> bermitra langsung dengan kelompok tani jamur lokal.
            </p>

            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-white/10 text-white/90 border border-white/20 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                <span>Halal LPPOM MUI</span>
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-white/10 text-white/90 border border-white/20 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                <span>P-IRT Dinkes</span>
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-white/10 text-white/90 border border-white/20 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
                <span>0% MSG Tambahan</span>
              </span>
            </div>
          </div>

          {/* Social Media Column */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div>
              <h4
                style={{
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 800,
                  fontSize: "1.15rem",
                  color: "var(--turmeric)",
                }}
              >
                Media Sosial Resmi
              </h4>
              <p className="text-xs opacity-75 mt-0.5">
                Ikuti info promo, konten seru, dan tips ngemil:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {socialLinks.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/15 transition-all duration-200 group"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {s.icon}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-white group-hover:text-[var(--turmeric)] transition-colors">
                      {s.name}
                    </div>
                    <div className="text-[11px] opacity-70 truncate">
                      {s.handle}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Official Marketplace Column */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div>
              <h4
                style={{
                  fontFamily: "'Baloo 2', sans-serif",
                  fontWeight: 800,
                  fontSize: "1.15rem",
                  color: "var(--turmeric)",
                }}
              >
                Toko Online & Marketplace
              </h4>
              <p className="text-xs opacity-75 mt-0.5">
                Beli satuan atau grosir dengan jaminan produk asli:
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {marketplaces.map((m) => (
                <a
                  key={m.name}
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/15 hover:border-white/30 transition-all duration-200 group"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 p-1 bg-white shadow-sm transition-transform group-hover:scale-110 overflow-hidden"
                  >
                    <Image
                      src={m.imageSrc}
                      alt={`Logo ${m.name}`}
                      width={28}
                      height={28}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white group-hover:text-[var(--turmeric)] transition-colors">
                      {m.name}
                    </span>
                    <span className="text-[10px] opacity-65 leading-tight">
                      {m.desc}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation links & Quick Links */}
        <div className="py-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 text-xs">
          <nav>
            <ul className="flex flex-wrap gap-6 font-semibold opacity-80">
              {["Tentang", "Varian Rasa", "Distribusi", "Mitra Petani", "Kontak"].map((item) => (
                <li key={item}>
                  <a
                    href={`#${item.toLowerCase().replace(" ", "")}`}
                    className="hover:text-[var(--turmeric)] hover:opacity-100 transition-colors"
                    style={{ color: "var(--cream)" }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-4 text-xs opacity-75">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
              <span>Kulon Progo, D.I. Yogyakarta</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-currentColor" aria-hidden="true" />
              <span>0812-3456-7890</span>
            </span>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs opacity-65">
          <p>
            &copy; {new Date().getFullYear()} CV Khaira Buana Mas. Seluruh hak cipta dilindungi undang-undang.
          </p>
          <p
            style={{
              fontFamily: "'Caveat', cursive",
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "var(--turmeric)",
            }}
          >
            Lokal Jamurnya, Nasional Rasanya!
          </p>
        </div>
      </div>
    </footer>
  );
}
