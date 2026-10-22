import { useCallback, useState } from "react";
import AboutSection from "@/components/AboutSection";
import BookingForm from "@/components/BookingForm";
import FilmsSection from "@/components/FilmsSection";
import Footer from "@/components/Footer";
import GallerySection from "@/components/GallerySection";
import HeroSection from "@/components/HeroSection";
import LoadingIntro from "@/components/LoadingIntro";
import Navbar from "@/components/Navbar";
import ProcessTimeline from "@/components/ProcessTimeline";
import ServicesSection from "@/components/ServicesSection";

export default function Home() {
  const [introVisible, setIntroVisible] = useState(true);
  const [selectedService, setSelectedService] = useState("");
  const finishIntro = useCallback(() => setIntroVisible(false), []);
  const enquire = useCallback((service: string) => {
    setSelectedService(service);
    document.getElementById("contact")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);

  return (
    <>
      <LoadingIntro onComplete={finishIntro} />
      <div className={`site-shell${introVisible ? " site-shell--intro" : ""}`}>
        <Navbar />
        <main>
          <HeroSection />
          <AboutSection />
          <GallerySection />
          <FilmsSection />
          <ServicesSection onEnquire={enquire} />
          <ProcessTimeline />
          <BookingForm initialService={selectedService} />
        </main>
        <Footer />
      </div>
    </>
  );
}
