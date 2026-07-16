import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Target, Eye, Users, Award, Shield, ArrowRight, Clock, TrendingUp, Star, MessageCircle, Calendar, MapPin, Phone, Mail, CheckCircle2, Zap, Globe, Building2, Stethoscope, Footprints, Microscope, Ambulance } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import TeamSection from '@/components/ui/team';
import { TestimonialsColumn } from '@/components/ui/testimonials-columns-1';
import OurStorySection from '@/components/ui/our-story-section';
import CoreValuesSection from '@/components/ui/core-values-section';
import MissionVisionSection from '@/components/ui/mission-vision-section';

const milestones = [
  {
    year: '2017',
    title: 'The Pilot',
    description: 'Somwati and Amar ran a pilot home healthcare service in Rajasthan. It failed, but it revealed a painful truth: patients needed care, providers needed patients, and there was no bridge between the two.',
    achievement: 'A lesson that shaped the future',
  },
  {
    year: '2018-23',
    title: 'Years of Research',
    description: 'Instead of giving up, the team spent years understanding the problem deeper. Ground research across tier-2 and tier-3 cities of Rajasthan confirmed that there was no dedicated home healthcare platform serving cities like Hindaun, Bharatpur, Gangapur, and Karauli.',
    achievement: 'Understanding the real gap',
  },
  {
    year: '2024',
    title: 'Building the Platform',
    description: 'HealthyTouch24 was incorporated under Infinity Vision Overseas as a GST-registered proprietorship based at Bhamashah Techno Hub, Jaipur. The technology platform was purpose-built to connect verified service providers with patients.',
    achievement: 'HealthyTouch24 is born',
  },
  {
    year: '2025-26',
    title: 'Launch',
    description: 'HealthyTouch24 went live, starting operations in Hindaun, Bharatpur, Gangapur City, and Karauli, with Jaipur added as a secondary market. The mission was clear: make quality home healthcare accessible, affordable, and reliable for every family in Rajasthan.',
    achievement: 'Rajasthan’s first tier-2 home healthcare platform',
  },
];

// const testimonials = [
//   {
//     name: 'Mrs. Sunita Kapoor',
//     role: 'Patient',
//     image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
//     rating: 5,
//     text: 'HealthyTouch24 makes home healthcare feel simple, reliable, and trustworthy. It finally connects families with the right support when they need it most.',
//   },
//   {
//     name: 'Mr. Ramesh Iyer',
//     role: 'Patient',
//     image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
//     rating: 5,
//     text: 'The platform is thoughtful and well-built for real city-level needs. It saves time, reduces stress, and brings care closer to home.',
//   },
//   {
//     name: 'Dr. Meera Reddy',
//     role: 'Healthcare Provider',
//     image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop',
//     rating: 5,
//     text: 'HealthyTouch24 creates a practical bridge between patients and providers. It gives professionals a structured way to reach people who need care.',
//   },
//   {
//     name: 'Mrs. Priya Malhotra',
//     role: 'Patient',
//     image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
//     rating: 5,
//     text: 'What stands out is the clarity and transparency. It feels like a platform built with families in mind, especially outside big cities.',
//   },
// ];

const achievements = [
  {
    icon: Award,
    title: 'Rajasthan-first focus',
    description: 'Built specifically for tier-2 and tier-3 cities',
  },
  {
    icon: Star,
    title: 'Verified service flow',
    description: 'Structured discovery, booking, and confirmation',
  },
  {
    icon: Users,
    title: 'Patients + providers',
    description: 'A platform designed to connect both sides',
  },
  {
    icon: MapPin,
    title: 'Underserved cities',
    description: 'Focused on Hindaun, Bharatpur, Gangapur, Karauli',
  },
];

const services = [
  {
    icon: Stethoscope,
    title: 'Home Nursing',
    description: 'Injections · IV Drip · Dressing',
  },
  {
    icon: Footprints,
    title: 'Physiotherapy',
    description: 'Session · Package · Rehab',
  },
  {
    icon: Users,
    title: 'GDA / Caretaker',
    description: 'Shift · Daily · Monthly',
  },
  {
    icon: Microscope,
    title: 'Lab Tests',
    description: 'Home sample collection',
  },
  {
    icon: Ambulance,
    title: 'Ambulance',
    description: 'BLS · ALS · Emergency',
  },
];



export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[60vh] overflow-hidden pt-24 md:pt-32 pb-16">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              backgroundImage: `linear-gradient(to right, rgba(12,18,34,0.75), rgba(12,18,34,0.45)), url('/Home-healthcare.webp')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-background/10 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-4xl mx-auto pt-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-3 bg-white/70 backdrop-blur-sm text-primary px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Heart className="w-4 h-4" />
              A journey that started with a problem no one was solving
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
            >
              About <span className="text-secondary">Healthy Touch</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-lg md:text-xl text-slate-100/90 mb-4 max-w-3xl mx-auto"
            >
              From a failed pilot in 2017 to Rajasthan&apos;s first home healthcare platform for tier-2 cities.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <OurStorySection />

      {/* Milestones */}
      <section className="py-16 bg-muted/30 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl font-bold mb-4">Our Journey</h2>
            <p className="text-muted-foreground">
              Milestones that mark our growth from a pilot idea to Rajasthan&apos;s first tier-2 home healthcare platform
            </p>
          </motion.div>

          <div className="relative">
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-primary via-secondary to-primary" />
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex flex-col md:flex-row items-center gap-6 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="card-healthcare p-6">
                      <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="font-bold text-primary">{milestone.year}</span>
                      </div>
                      <h3 className="font-display text-xl font-bold mb-2">{milestone.title}</h3>
                      <p className="text-muted-foreground mb-2">{milestone.description}</p>
                      <p className="text-sm font-semibold text-primary">{milestone.achievement}</p>
                    </div>
                  </div>
                  <div className="hidden md:block w-4 h-4 rounded-full bg-primary border-4 border-background shadow-lg z-10" />
                  <div className="flex-1" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <MissionVisionSection />

      {/* Values */}
      <CoreValuesSection />

      {/* Achievements */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl font-bold mb-4">Recognition & Achievements</h2>
            <p className="text-muted-foreground">
              Our commitment to solving a real healthcare gap in Rajasthan is reflected in the way the platform has been built
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {achievements.map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card-healthcare p-6 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <achievement.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-2">{achievement.title}</h3>
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <TeamSection />

      {/* Services */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-4xl"
          >
            <div className="mb-10">
              <p className="mb-6 inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-600">
                <span className="h-0.5 w-8 bg-emerald-600" />
                Our Services
              </p>
              <h2 className="font-display text-3xl font-bold leading-tight md:text-4xl">
                Five services, one platform
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
                Everything a patient needs at home - nurses, physiotherapists, caretakers, lab tests, and ambulance - all bookable from HealthyTouch24.
              </p>
            </div>
          </motion.div>

          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
              >
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <service.icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold">{service.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Testimonials Section */}
      {/* <section className="py-16 md:py-24 bg-background relative" id="testimonials">
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
              Real experiences from patients, doctors and families trusting HealthyTouch24.
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
      </section> */}


      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Join Our Healthcare Journey
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Whether you're a patient seeking care or a healthcare professional looking to make a difference,
              we'd love to have you with us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/auth?mode=register">
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
