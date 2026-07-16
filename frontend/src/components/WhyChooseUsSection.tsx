import { motion } from 'framer-motion';
import { ArrowRight, Stethoscope, UserCheck, Heart } from 'lucide-react';

const whyChoose = [
  {
    icon: Stethoscope,
    title: 'Doctor-led Care',
    description: 'All visits and clinical decisions are supervised by certified doctors to ensure quality outcomes.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: UserCheck,
    title: 'Verified Professionals',
    description: 'Every provider is background-checked and verified for your safety and peace of mind.',
    color: 'bg-secondary/10 text-secondary',
  },
  {
    icon: Heart,
    title: 'Compassionate Support',
    description: 'Care that treats patients like family — gentle, respectful and timely.',
    color: 'bg-primary/10 text-primary',
  },
];

export const WhyChooseUsSection = () => {
  return (
    <section className="py-16 md:py-24 bg-background" id="why-choose-us">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-[1.2fr,1fr] gap-10 lg:gap-14 items-center">
          {/* Left content column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs md:text-sm font-semibold tracking-[0.3em] uppercase text-primary mb-2">
              Why
            </p>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Choose <span className="gradient-text">Healthy Touch</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mb-6">
              We combine doctor-led guidance, verified professionals and warm, human support
              so that your family receives safe and reliable healthcare at home.
            </p>

            {/* Arrow line similar to reference */}
            <div className="flex items-center gap-3 mb-8 text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-10 mb-10">
              <div>
                <p className="font-display text-4xl md:text-5xl font-bold text-primary mb-1">
                  95%
                </p>
                <p className="text-sm text-muted-foreground max-w-[180px]">
                  Patients say they would recommend Healthy Touch to friends and family.
                </p>
              </div>
              <div>
                <p className="font-display text-4xl md:text-5xl font-bold text-secondary mb-1">
                  10K+
                </p>
                <p className="text-sm text-muted-foreground max-w-[180px]">
                  Successful home visits and tele-consultations completed across cities.
                </p>
              </div>
            </div>

            {/* Bottom pill cards (using whyChoose items) */}
            <div className="grid sm:grid-cols-3 gap-4">
              {whyChoose.slice(0, 3).map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * idx }}
                  className={
                    idx === 0
                      ? 'rounded-3xl px-5 py-4 bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg'
                      : idx === 1
                      ? 'rounded-3xl px-5 py-4 bg-gradient-to-r from-secondary to-primary/70 text-primary-foreground shadow-lg'
                      : 'rounded-3xl px-5 py-4 bg-card text-foreground shadow-md'
                  }
                >
                  <p className="font-display font-semibold text-sm md:text-base mb-1">
                    {item.title}
                  </p>
                  <p className="text-xs md:text-sm opacity-90">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right image column with curved side + gradient overlay */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative h-[320px] md:h-[380px] lg:h-[420px]"
          >
            <div className="absolute inset-y-0 right-0 w-full md:w-[90%] lg:w-[85%] rounded-l-full overflow-hidden shadow-2xl">
              <img
                src="/slider-2.jpg"
                alt="Happy patient with healthcare professional"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tl from-primary/80 via-primary/40 to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

