import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import FlavorSection from "@/components/landing/FlavorSection";
import DistributionSection from "@/components/landing/DistributionSection";
import FarmerSection from "@/components/landing/FarmerSection";
import ContactSection from "@/components/landing/ContactSection";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <FlavorSection />
      <DistributionSection />
      <FarmerSection />
      <ContactSection />
      <Footer />
    </main>
  );
}
