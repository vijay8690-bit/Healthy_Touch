import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Shield, Clock, Heart, CalendarCheck, Activity, Gift, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import homeContentService, { defaultHomeContent, type HomeContent } from '@/services/homeContent.service';

export const HeroSection = () => {
  const navigate = useNavigate();
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [content, setContent] = useState<HomeContent>(defaultHomeContent);

  useEffect(() => {
    let mounted = true;

    homeContentService
      .getPublicHomeContent()
      .then((data) => {
        if (mounted) {
          setContent(data);
          setHeroImageIndex(0);
        }
      })
      .catch(() => {
        if (mounted) setContent(defaultHomeContent);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const heroImages = content.heroImages.length ? content.heroImages : defaultHomeContent.heroImages;

  useEffect(() => {
    const id = setInterval(
      () => setHeroImageIndex((prev) => (prev + 1) % heroImages.length),
      6500
    );
    return () => clearInterval(id);
  }, [heroImages.length]);

  const currentHeroImage = heroImages[heroImageIndex] || defaultHomeContent.heroImages[0];
  const heroTitleLines = (content.heroTitle || defaultHomeContent.heroTitle).split('\n');

  const handleCtaClick = () => {
    const link = content.ctaLink || defaultHomeContent.ctaLink;

    if (/^https?:\/\//i.test(link)) {
      window.location.href = link;
      return;
    }

    navigate(link.startsWith('/') ? link : `/${link}`);
  };

  return (
    <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden pt-20 sm:pt-24 md:min-h-[82vh] md:pt-28">
      <div className="absolute inset-0 overflow-hidden ">
        <AnimatePresence initial={false}>
          <motion.div
            key={currentHeroImage}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            style={{
              backgroundImage: `var(--gradient-hero), url('${currentHeroImage}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-background/25 via-transparent to-health-ink/20" />
      </div>

      <div className="container relative z-10 mx-auto flex min-h-[calc(100svh-5rem)] flex-col justify-center px-4 py-8 md:min-h-[80vh] md:py-0">
        <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-10 items-center">
          <div className="lg:col-start-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full bg-white/85 px-3 py-2 text-xs font-semibold text-primary shadow-sm backdrop-blur-md sm:gap-3 sm:px-4 sm:text-sm"
            >
              <Shield className="w-4 h-4" />
              Healthcare Clinics Partnership Organizations
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-balance mb-4 font-display text-3xl font-bold leading-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl lg:text-6xl"
            >
              {heroTitleLines.map((line, index) => (
                <span key={`${line}-${index}`}>
                  {line}
                  {index < heroTitleLines.length - 1 ? <br /> : null}
                </span>
              ))}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="mx-auto mb-7 max-w-xl text-base text-white/90 sm:text-lg lg:mx-0"
            >
              {content.heroSubtitle || defaultHomeContent.heroSubtitle}
            </motion.p>

            {content.offerActive && (content.offerTitle || content.offerDescription) ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.18 }}
                className="mb-6 inline-flex max-w-xl items-center gap-3 rounded-2xl border border-white/15 bg-white/15 p-3 text-left text-white backdrop-blur-md"
              >
                {content.offerImage ? (
                  <img
                    src={content.offerImage}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/25 text-secondary">
                    <Gift className="h-6 w-6" />
                  </div>
                )}
                <div>
                  {content.offerTitle ? <p className="text-sm font-semibold">{content.offerTitle}</p> : null}
                  {content.offerDescription ? (
                    <p className="text-xs text-white/80">{content.offerDescription}</p>
                  ) : null}
                </div>
              </motion.div>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex items-center justify-center lg:justify-start"
            >
              <Button size="lg" variant="hero" onClick={handleCtaClick}>
                {content.ctaText || defaultHomeContent.ctaText}
              </Button>
            </motion.div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-white/90 lg:justify-start">
              <div className="flex items-center gap-2 text-sm sm:p-2 md:p-5">
                <Heart className="w-5 h-5 text-secondary" />
                Verified Providers
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-5 h-5 text-secondary" />
                24/7 Support
              </div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-8 w-full lg:mt-16"
        >
          <div className="grid gap-1 overflow-hidden rounded-2xl border border-white/15 bg-health-ink/45 shadow-xl backdrop-blur-md md:grid-cols-2 lg:grid-cols-4 md:gap-4">
            <Link
              to="/services"
              className="flex items-center gap-3 px-4 py-4 transition-all duration-300 hover:bg-white/10 sm:gap-4 sm:px-6 sm:py-5"
            >
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                <Heart className="w-6 h-6" />
              </div>
              <div className="flex-1 text-white">
                <p className="text-base font-semibold sm:text-lg">Our Service Providers</p>
                <p className="text-sm text-white/80">Find trusted experts</p>
              </div>
              <ArrowRight className="w-6 h-6 text-white" />
            </Link>

            <Link
              to="/patient/dashboard"
              className="flex items-center gap-3 px-4 py-4 transition-all duration-300 hover:bg-white/10 sm:gap-4 sm:px-6 sm:py-5"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 text-white">
                <p className="text-base font-semibold sm:text-lg">Book an Appointment</p>
                <p className="text-sm text-white/80">Schedule in minutes</p>
              </div>
              <ArrowRight className="w-6 h-6 text-white" />
            </Link>

            <Link
              to="/services"
              className="flex items-center gap-3 px-4 py-4 transition-all duration-300 hover:bg-white/10 sm:gap-4 sm:px-6 sm:py-5"
            >
              <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center text-secondary-foreground">
                <Activity className="w-6 h-6" />
              </div>
              <div className="flex-1 text-white">
                <p className="text-base font-semibold sm:text-lg">Health Services</p>
                <p className="text-sm text-white/80">Lab tests, diagnostics & care</p>
                <p className="text-base font-bold text-white mt-1">Explore Now</p>
              </div>
              <ArrowRight className="w-6 h-6 text-white" />
            </Link>

            <Link
              to="/provider/signup"
              className="flex items-center gap-3 px-4 py-4 transition-all duration-300 hover:bg-white/10 sm:gap-4 sm:px-6 sm:py-5"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="flex-1 text-white">
                <p className="text-base font-semibold sm:text-lg">Become Provider</p>
                <p className="text-sm text-white/80">Join as a service partner</p>
              </div>
              <ArrowRight className="w-6 h-6 text-white" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
