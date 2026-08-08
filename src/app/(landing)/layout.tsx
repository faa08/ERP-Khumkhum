import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: "KhumKhum Jamur Crispy – Oleh-oleh Khas Kulon Progo",
  description:
    "KhumKhum Jamur Crispy, camilan gurih dari jamur tiram pilihan petani lokal Kulon Progo. Hadir dalam 5 varian rasa, tersedia di 1.500+ gerai di 8 provinsi. Halal, tanpa MSG.",
  keywords: [
    "KhumKhum",
    "jamur crispy",
    "oleh-oleh Kulon Progo",
    "camilan halal",
    "snack jamur tiram",
    "reseller jamur crispy",
  ],
  openGraph: {
    title: "KhumKhum Jamur Crispy – Lokal Jamurnya, Nasional Rasanya",
    description:
      "Camilan kriuk dari jamur tiram segar Kulon Progo, digoreng kering tanpa MSG. Sudah dipercaya di 1.500+ toko di 8 provinsi.",
    images: ["/No-Background-KhumKhum-1536x864.webp"],
    type: "website",
  },
};

export default function LandingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
