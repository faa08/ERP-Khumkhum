"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

const navLinks = [
  { href: "#tentang", label: "Tentang" },
  { href: "#varian", label: "Varian Rasa" },
  { href: "#distribusi", label: "Distribusi" },
  { href: "#petani", label: "Mitra Petani" },
  { href: "#kontak", label: "Kontak" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "navbar-scrolled" : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-2">
            <Image
              src="/95856209_353744725599963_5721628317879107584_n.jpg"
              alt="KhumKhum Logo"
              width={40}
              height={40}
              className="rounded-full border-2 border-[var(--chili)] object-cover"
            />
            <span
              className="font-display text-xl font-800 leading-none"
              style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800 }}
            >
              <span style={{ color: "var(--ink)" }}>Khum</span>
              <span style={{ color: "var(--chili)" }}>Khum</span>
            </span>
          </a>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-sm font-semibold transition-colors hover:text-[var(--chili)]"
                  style={{ color: "var(--ink)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <a
            href="/login"
            className="hidden md:flex btn-comic btn-primary px-5 py-2 rounded-lg text-sm"
            id="nav-cta-login"
          >
            Login
          </a>

          {/* Mobile hamburger */}
          <button
            id="nav-hamburger"
            className="md:hidden p-2 rounded-lg"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <div
              className="w-6 h-0.5 mb-1.5 transition-all"
              style={{ background: "var(--ink)", transform: open ? "rotate(45deg) translateY(8px)" : "" }}
            />
            <div
              className="w-6 h-0.5 mb-1.5 transition-all"
              style={{ background: "var(--ink)", opacity: open ? 0 : 1 }}
            />
            <div
              className="w-6 h-0.5 transition-all"
              style={{ background: "var(--ink)", transform: open ? "rotate(-45deg) translateY(-8px)" : "" }}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-4 pb-4 pt-2 border-t-2 border-[var(--ink)]" style={{ background: "var(--cream)" }}>
          <ul className="flex flex-col gap-3">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="block py-2 font-semibold text-sm hover:text-[var(--chili)]"
                  style={{ color: "var(--ink)" }}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="/login"
                className="btn-comic btn-primary px-5 py-2 rounded-lg text-sm w-full text-center"
                onClick={() => setOpen(false)}
              >
                Login
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
