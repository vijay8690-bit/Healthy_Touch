import { motion } from 'framer-motion';
import { Search, CalendarCheck, Home, CheckCircle2, Clock, Shield, Heart, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Search & Select',
    subtitle: 'Find Your Perfect Care Provider',
    description: 'Browse through our extensive network of verified healthcare professionals. Whether you need a doctor, nurse, physiotherapist, or caretaker – find the right match based on your specific needs, location, and preferences.',
    features: [
      'Verified professionals with background checks',
      'Detailed profiles with ratings and reviews',
      'Filter by specialty, availability, and location',
    ],
    image: '/search and book.webp',
    gradient: 'from-primary/10 via-primary/5 to-transparent',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    badgeGradient: 'from-primary to-primary/80',
  },
  {
    number: '02',
    icon: CalendarCheck,
    title: 'Book Appointment',
    subtitle: 'Schedule at Your Convenience',
    description: 'Choose a date and time that works best for you. Our intuitive booking system lets you see real-time availability, select your preferred slot, and confirm your appointment in just a few clicks.',
    features: [
      'Real-time availability calendar',
      'Instant confirmation via SMS & email',
      'Easy rescheduling and cancellation options',
    ],
    image: '/book-an-appointment.jpg',
    gradient: 'from-secondary/10 via-secondary/5 to-transparent',
    iconBg: 'bg-secondary/10',
    iconColor: 'text-secondary',
    badgeGradient: 'from-secondary to-secondary/80',
  },
  {
    number: '03',
    icon: Home,
    title: 'Receive Care At Home',
    subtitle: 'Experience Quality Care in Comfort',
    description: 'Your selected healthcare professional arrives at your doorstep, bringing expert care directly to your home. Receive doctor-supervised, compassionate treatment while you and your family stay comfortable.',
    features: [
      'Doctor-supervised care with safety protocols',
      'Secure digital records and visit history',
      'Easy follow-up booking and care continuity',
    ],
    image: '/receive care at home.jpg',
    gradient: 'from-primary/10 via-secondary/10 to-primary/10',
    iconBg: 'bg-gradient-to-br from-primary/10 to-secondary/10',
    iconColor: 'text-primary',
    badgeGradient: 'from-primary via-secondary to-primary',
  },
];

export const HowItWorksSection = () => {
  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900"
      id="how-it-works"
    >
      {/* Enhanced background shapes with animation */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-24 -right-16 w-64 h-64 bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
          className="absolute -bottom-24 -left-10 w-72 h-72 bg-secondary/20 rounded-full blur-3xl"
        />
      </div>

      {/* Decorative grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide uppercase bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 text-primary border border-primary/20 shadow-lg mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Simple • Clear • Guided
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-display text-3xl md:text-4xl font-bold mb-3"
          >
            How It <span className="gradient-text bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-primary">Works</span>
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-muted-foreground mt-4 max-w-3xl mx-auto leading-relaxed"
          >
            Getting quality healthcare at home with Healthy Touch is simple and straightforward. Follow these three easy steps, and our dedicated team will handle everything else to ensure you receive the best care possible.
          </motion.p>
        </motion.div>

        {/* Horizontal Steps Layout */}
        <div className="relative">
          {/* Connecting Lines (Desktop Only) */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 via-secondary/30 to-transparent" />
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  className="group relative"
                >
                  {/* Glow Effect */}
                  <div className={`absolute -inset-0.5 bg-gradient-to-r ${step.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  {/* Card */}
                  <div className="relative h-full rounded-3xl bg-gradient-to-br from-white via-white to-white/50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-border/50 dark:border-slate-700 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                    {/* Step Number Badge */}
                    <div className="absolute top-6 right-6 z-10">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${step.badgeGradient} text-white shadow-lg`}>
                        <span className="text-lg font-bold">{step.number}</span>
                      </div>
                    </div>

                    {/* Image Section */}
                    <div className="relative h-48 md:h-56 overflow-hidden">
                      <img
                        src={step.image}
                        alt={step.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-slate-900" />
                      
                      {/* Icon Overlay */}
                      <div className="absolute top-6 left-6">
                        <div className={`flex items-center justify-center w-14 h-14 rounded-2xl ${step.iconBg} ${step.iconColor} shadow-lg backdrop-blur-sm`}>
                          <Icon className="w-7 h-7" />
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 md:p-7">
                      {/* Title */}
                      <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mb-2">
                        {step.title}
                      </h3>
                      <p className="text-sm md:text-base font-semibold text-primary mb-4">
                        {step.subtitle}
                      </p>

                      {/* Description */}
                      <p className="text-sm md:text-base text-muted-foreground mb-5 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Features List */}
                      <div className="space-y-2.5">
                        {step.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-2.5">
                            <CheckCircle2 className={`w-4 h-4 ${step.iconColor} mt-0.5 flex-shrink-0`} />
                            <span className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Arrow Connector (Desktop Only) */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-24 -right-4 z-20">
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.15 + 0.3 }}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-lg"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
