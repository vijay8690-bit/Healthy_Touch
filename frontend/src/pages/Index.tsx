import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Award,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Heart,
  Home,
  PhoneCall,
  Star,
  Stethoscope,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TestimonialsColumn } from '@/components/ui/testimonials-columns-1';
import TeamSection from '@/components/ui/team';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import OffersSection from '@/components/ui/OffersSection';
import HomeLocationModal from '@/components/HomeLocationModal';
import { mockStats, mockTestimonials, mockDoctors } from '@/lib/mock-data';
import { HowItWorksSection } from '@/components/HowItWorksSection';
import { HeroSection } from '@/components/HeroSection';
import { WhyChooseUsSection } from '@/components/WhyChooseUsSection';
import { FEATURES } from '@/config/features';

const services = [
  {
    icon: Heart,
    title: 'Nursing Care',
    description: 'Professional nurses for wound care, IV administration, and patient monitoring.',
    color: 'bg-secondary/10 text-secondary',
    image:
      '/nursing-care.jpg',
    href: '/patient/providers?category=nurse',
    note: 'per visit*',
    reviews: 28,
  },
  {
    icon: UserCheck,
    title: 'Care Takers',
    description: 'Compassionate care takers for elderly care and post-surgery assistance.',
    color: 'bg-primary/10 text-primary',
    image:
      '/careTakcer.jpg',
    href: '/patient/providers?category=caretaker',
    note: 'per day*',
    reviews: 31,
  },
  {
    icon: Home,
    title: 'Home Healthcare',
    description: 'Complete healthcare services delivered to your doorstep with care.',
    color: 'bg-secondary/10 text-secondary',
    image:
      '/home_health_care.jpg',
    href: '/patient/providers?search=Home%20Visit',
    note: 'package starting*',
    reviews: 19,
  },
  {
    icon: Stethoscope,
    title: 'Physiotherapy at Home',
    description: 'Recovery-focused physiotherapy sessions for pain relief and mobility improvement.',
    color: 'bg-primary/10 text-primary',
    image:
      '/physiotherapy at home.png',
    href: '/patient/providers?category=physiotherapy',
    note: 'per session*',
    reviews: 24,
  },
  {
    icon: Heart,
    title: 'Mother & Baby Care',
    description: 'Dedicated support for new mothers and newborns with expert nursing guidance.',
    color: 'bg-secondary/10 text-secondary',
    image:
      '/MOTHER-BABY-CARE.png',
    href: '/patient/providers?search=Mother%20Baby%20Care',
    note: 'per visit*',
    reviews: 17,
  },
  ...(FEATURES.DOCTOR_MODULE
    ? [{
    icon: Stethoscope,
    title: 'Doctor Consultations',
    description: 'Connect with experienced doctors for home visits and teleconsultations.',
    color: 'bg-primary/10 text-primary',
    image:
      '/doctor counsaltancy.jpg',
    href: '/patient/providers?category=doctor',
    note: 'per consultation*',
    reviews: 42,
  }]
    : []),
];

const howItWorks = [
  {
    step: '01',
    title: 'Search & Select',
    description: 'Browse through verified healthcare providers based on your needs.',
  },
  {
    step: '02',
    title: 'Book Appointment',
    description: 'Choose a convenient time slot and book your appointment instantly.',
  },
  {
    step: '03',
    title: 'Receive Care',
    description: 'Get quality healthcare at your home from trusted professionals.',
  },
];

const faqs = [
  {
    id: 1,
    q: 'How do I book a doctor for a home visit?',
    a: 'Go to Services, select the type of visit you need, pick a convenient slot and confirm payment. We send a confirmation and provider details via SMS and email.',
  },
  {
    id: 2,
    q: 'Are the doctors and nurses verified?',
    a: 'Yes — all providers go through identity checks, certifications verification and experience screening before they join our platform.',
  },
  {
    id: 3,
    q: 'What areas do you serve?',
    a: 'We currently operate in multiple cities; check the Cities Covered stat on the homepage or search services with your pincode to see availability.',
  },
  {
    id: 4,
    q: 'Can I reschedule or cancel an appointment?',
    a: 'Yes — open your appointment from Dashboard and choose Reschedule or Cancel. Cancellation policies may apply depending on timing.',
  },
  {
    id: 5,
    q: 'How secure is my health data?',
    a: 'We follow standard data protection practices; personal and medical details are encrypted and only shared with authorised care providers.',
  },
];

const stats = [
  { value: 45000, label: 'Happy Patients', suffix: 'K+' },
  { value: 800, label: 'Verified Providers', suffix: '+' },
  { value: 45000, label: 'Appointments', suffix: 'K+' },
  { value: 28, label: 'Cities Covered', suffix: '+' },
];

const trustHighlights = [
  {
    icon: Award,
    label: 'CAP & NABL Accredited Labs',
  },
  {
    icon: Clock3,
    label: 'On Time Sample Collection',
  },
  {
    icon: ClipboardCheck,
    label: 'Smart Reports in 6 Hours',
  },
  {
    icon: PhoneCall,
    label: 'Free Report Consultation',
  },
];

// Map existing mock testimonials into the column format and duplicate
// them to create a smoother infinite scroll.
const scrollingTestimonials = [
  ...mockTestimonials.map((t) => ({
    text: t.content,
    image: t.image,
    name: t.name,
    role: t.role,
  })),
  ...mockTestimonials.map((t) => ({
    text: t.content,
    image: t.image,
    name: t.name,
    role: t.role,
  })),
  ...mockTestimonials.map((t) => ({
    text: t.content,
    image: t.image,
    name: t.name,
    role: t.role,
  })),
];

const firstTestimonialsColumn = scrollingTestimonials.slice(0, 3);
const secondTestimonialsColumn = scrollingTestimonials.slice(3, 6);
const thirdTestimonialsColumn = scrollingTestimonials.slice(6, 9);


// Simple CountUp component that animates from 0 to `target` over `duration` seconds.
// It formats large values into K (e.g. 15000 -> 15K+) when suffix 'K+' is provided.
type CountUpProps = {
  target: number;
  suffix?: string;
  duration?: number; // seconds
  className?: string;
};

const CountUp = ({ target, suffix = '', duration = 1.5, className = '' }: CountUpProps) => {
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const ms = duration * 1000;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = Math.min(now - start, ms);
      const progress = ms === 0 ? 1 : elapsed / ms;
      const eased = easeOutCubic(progress);
      const current = Math.round(eased * target);
      setValue(current);

      if (elapsed < ms) {
        raf = requestAnimationFrame(tick);
      } else {
        // finish exactly at target and trigger celebration
        setValue(target);
        setDone(true);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  const formatted = (() => {
    // If suffix indicates 'K+' or target >= 1000, show thousands without decimals when possible
    if (suffix && suffix.includes('K')) {
      const k = Math.floor(value / 1000);
      return `${k}${suffix}`;
    }
    return `${value}${suffix}`;
  })();

  return (
    <motion.p
      className={className}
      initial={{ scale: 1 }}
      animate={done ? { scale: [1, 1.08, 1], rotate: [0, 2, 0] } : {}}
      transition={{ duration: 0.9 }}
    >
      {formatted}
    </motion.p>
  );
};

const Index = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (i: number) => setOpenFaq(openFaq === i ? null : i);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <HeroSection />

      {/* Stats Section */}
      <section className="relative py-16 md:py-20 bg-background overflow-hidden">
        {/* Big background word */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center">
          <p className="font-display text-[80px] md:text-[120px] lg:text-[160px] font-bold tracking-[0.1em] text-foreground/5 select-none uppercase">
            Healthy&nbsp;Touch
          </p>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-wrap justify-center gap-10 md:gap-16 lg:gap-24">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                  <CountUp
                    target={stat.value}
                    suffix={stat.suffix}
                    duration={1.5}
                    className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold gradient-text"
                  />
                <p className="mt-2 text-xs md:text-sm font-medium tracking-wide uppercase text-muted-foreground">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Highlights Strip */}
      <section className="bg-background pb-10 md:pb-14">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl bg-cyan-50/70 px-5 py-6 shadow-sm ring-1 ring-cyan-100 md:px-8 md:py-7"
          >
            <div className="grid gap-6 md:grid-cols-[1.35fr_repeat(4,1fr)] md:items-center lg:gap-8">
              <div className="md:border-r md:border-cyan-200 md:pr-7">
                <h2 className="font-display text-2xl font-bold leading-tight text-foreground md:text-3xl">
                  Why <span className="text-cyan-600">4.5 Million</span> Indians
                  <br className="hidden sm:block" /> Trust Healthy Touch Labs
                </h2>
              </div>

              {trustHighlights.map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <item.icon className="h-9 w-9 shrink-0 text-foreground/75 md:h-10 md:w-10" strokeWidth={1.6} />
                  <p className="text-base font-semibold leading-snug text-foreground/75 md:text-lg">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 md:py-24 bg-muted/30" id="services">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Medical Services <span className="gradient-text">Offered At Home</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Healthy Touch offers a variety of healthcare services in the comfort of your home,
              delivered by trusted and verified professionals.
            </p>
          </motion.div>

          <div className="grid gap-7 md:gap-8 md:grid-cols-2">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group rounded-3xl bg-background shadow-sm border border-border/60 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 md:max-w-[520px] mx-auto"
              >
                <div className="flex flex-col md:flex-row items-stretch">
                  <div className="flex-1 px-5 sm:px-6 py-6 sm:py-7 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl ${service.color}`}
                        >
                          <service.icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-display text-lg md:text-xl font-semibold">
                          {service.title}
                        </h3>
                      </div>

                      <p className="text-muted-foreground text-sm md:text-base max-w-md">
                        {service.description}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex -mx-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className="w-4 h-4 mx-0.5 text-secondary fill-secondary"
                              />
                            ))}
                          </div>
                          <span className="ml-2 text-xs md:text-sm text-muted-foreground">
                            {service.reviews} reviews
                          </span>
                        </div>
                      </div>

                      <Button
                        asChild
                        size="sm"
                        className="w-full sm:w-auto rounded-full px-5 bg-primary/90 hover:bg-primary text-primary-foreground font-semibold shadow-sm"
                      >
                        <Link to={service.href}>Book Now</Link>
                      </Button>
                    </div>
                  </div>

                  <div className="md:w-[36%] relative min-h-[160px]">
                    <div className="absolute inset-0 overflow-hidden">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-l from-background/10 via-background/0 to-background/20" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-10 flex justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 py-6 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
            >
              <Link to="/services">
                Explore All Services
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      


      <HowItWorksSection />

      {/* Why Choose Us Section */}
      <WhyChooseUsSection />

      {/* Our Team Section */}
      <TeamSection />

      {/* Testimonials Section */}
      <section className="py-16 md:py-24 bg-background relative" id="testimonials">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-center max-w-[540px] mx-auto text-center"
          >
            <p className="inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-white/70 text-primary shadow-sm mb-4">
            Testimonials
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
            What Our <span className="gradient-text">Users Say</span>
            </h2>
            
            <p className="text-muted-foreground mt-4">
              Real experiences from patients, doctors and families trusting Healthy Touch.
            </p>
          </motion.div>

          <div className="flex justify-center gap-4 sm:gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[700px] overflow-hidden">
            <TestimonialsColumn testimonials={firstTestimonialsColumn} duration={15} />
            <TestimonialsColumn
              testimonials={secondTestimonialsColumn}
              className="hidden md:block"
              duration={19}
            />
            <TestimonialsColumn
              testimonials={thirdTestimonialsColumn}
              className="hidden lg:block"
              duration={17}
            />
          </div>
        </div>
      </section>

{/* Shandar Offers Section - temporarily hidden */}
{/* <OffersSection /> */}


 {/* FAQ Section */}
      <section
        className="relative py-16 md:py-24 overflow-hidden "
        id="faq"
      >
        {/* Background image related to healthcare */}
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(15,23,42,0.88), rgba(15,23,42,0.7), rgba(15,23,42,0.4)), url('https://images.unsplash.com/photo-1584466977773-e625c37cdd50?auto=format&fit=crop&w=1600&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/10 to-background/70" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-10 items-start">
            {/* Left: FAQ list */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-8"
              >
                <p className="inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-primary/10 text-primary shadow-sm mb-4">
                  FAQs
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
                  Frequently Asked <span className="gradient-text">Questions</span>
                </h2>
                <p className="text-muted-foreground max-w-2xl">
                  Quick answers about bookings, providers, safety and how home healthcare with Healthy Touch works.
                </p>
              </motion.div>

              <div className="space-y-3">
                {faqs.map((f, i) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="overflow-hidden rounded-xl bg-background/95 border border-border/60 shadow-lg"
                  >
                    <button
                      onClick={() => toggleFaq(i)}
                      aria-expanded={openFaq === i}
                      className="w-full flex items-center justify-between px-4 md:px-5 py-3 md:py-4 text-left text-foreground"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary-foreground">
                          {i + 1}
                        </span>
                        <span className="font-medium">{f.q}</span>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-muted-foreground transition-transform ${
                          openFaq === i ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    <div
                      className={`px-4 md:px-5 pb-4 pt-0 text-sm text-muted-foreground transition-all ${
                        openFaq === i ? "block" : "hidden"
                      }`}
                    >
                      {f.a}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right: supportive image & card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative mt-8 lg:mt-0"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl max-w-md ml-auto">
                <img
                  src="/slider-1.jpg"
                  alt="Doctor consulting patient at home"
                  className="w-full h-64 md:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
              </div>

              <div className="absolute -bottom-6 left-4 right-4">
                <div className="p-5 rounded-2xl bg-background/95 border border-primary/20 shadow-xl">
                  <h3 className="font-display font-semibold text-lg mb-1">
                    Still have a question?
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Our care team is happy to guide you personally and help you choose the right service.
                  </p>
                  <Button asChild size="sm">
                    <Link to="/contact">Contact Support</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary to-secondary p-8 md:p-16 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Experience Quality Healthcare?
              </h2>
              <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
                Join thousands of satisfied patients who trust Healthy Touch for their healthcare needs at home.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" variant="hero-outline" asChild>
                  <Link to="/auth?mode=register">
                    Get Started Now
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="xl" variant="hero-outline" asChild>
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <HomeLocationModal />
    </div>
  );
};

export default Index;
