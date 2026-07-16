import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Calendar, Home, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Search & Browse',
    description: 'Browse through our extensive network of verified healthcare professionals. Filter by specialization, location, availability, and ratings to find the perfect match.',
    details: ['Filter by Doctor, Nurse, or Care Taker', 'View profiles, qualifications, and reviews', 'Check real-time availability', 'Compare fees and services'],
  },
  {
    number: '02',
    icon: Calendar,
    title: 'Book Appointment',
    description: 'Select a convenient date and time slot. Our easy booking process ensures you get the care you need when you need it.',
    details: ['Choose your preferred date and time', 'Describe your health concern', 'Confirm booking instantly', 'Receive confirmation via SMS/Email'],
  },
  {
    number: '03',
    icon: Home,
    title: 'Receive Care at Home',
    description: 'Our verified healthcare professional arrives at your doorstep to provide quality care in the comfort of your home.',
    details: ['Professional arrives at scheduled time', 'Quality care delivered at home', 'Detailed consultation and diagnosis', 'Prescription and follow-up advice'],
  },
  {
    number: '04',
    icon: CheckCircle,
    title: 'Follow-up & Records',
    description: 'Access your medical records, book follow-up appointments, and stay connected with your healthcare provider.',
    details: ['Digital medical records access', 'Easy follow-up booking', 'Secure payment options', '24/7 support for any queries'],
  },
];

export default function HowItWorksPage() {
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
              backgroundImage: `linear-gradient(to right, rgba(12,18,34,0.75), rgba(12,18,34,0.45)), url('/search and book.webp')`,
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
              <Search className="w-4 h-4" />
              Simple 4-Step Process
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
            >
              How <span className="text-secondary">Healthy Touch</span> Works
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-lg md:text-xl text-slate-100/90 max-w-3xl mx-auto"
            >
              Getting quality healthcare at home has never been easier. Follow our simple 4-step process 
              to connect with verified healthcare professionals.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="space-y-12">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`grid lg:grid-cols-2 gap-8 items-center ${
                  index % 2 === 1 ? '' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="font-display text-5xl font-bold text-primary/20">{step.number}</span>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <step.icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                  </div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">{step.title}</h2>
                  <p className="text-muted-foreground mb-6">{step.description}</p>
                  
                  <ul className="space-y-3">
                    {step.details.map((detail, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-secondary" />
                        </div>
                        <span className="text-sm">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`relative ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div className="card-healthcare p-8 text-center">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mx-auto mb-4">
                      <step.icon className="w-12 h-12 text-primary" />
                    </div>
                    <p className="font-display text-lg font-semibold text-muted-foreground">Step {step.number}</p>
                  </div>
                  
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute -bottom-12 left-1/2 transform -translate-x-1/2">
                      <div className="w-0.5 h-12 bg-gradient-to-b from-primary/50 to-transparent" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Video/Demo Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="font-display text-3xl font-bold mb-4">
              See It In Action
            </h2>
            <p className="text-muted-foreground mb-8">
              Watch how easy it is to book healthcare services with Healthy Touch.
            </p>
            
            <div className="card-healthcare p-4 aspect-video flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-primary border-b-8 border-b-transparent ml-1" 
                       style={{ borderLeftWidth: '16px' }} />
                </div>
                <p className="text-muted-foreground">Demo Video Coming Soon</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="font-display text-3xl font-bold mb-8 text-center">
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              {[
                { q: 'How are healthcare providers verified?', a: 'All providers undergo thorough background checks, credential verification, and training assessments before joining our platform.' },
                { q: 'What areas do you cover?', a: 'We currently operate in 28 cities across India. Check our app or contact us to see if we serve your area.' },
                { q: 'How do I pay for services?', a: 'We accept all major payment methods including UPI, cards, net banking, and cash. Payment is secure and transparent.' },
                { q: 'Can I cancel or reschedule?', a: 'Yes, you can cancel or reschedule appointments up to 4 hours before the scheduled time without any charges.' },
              ].map((faq, index) => (
                <div key={index} className="card-healthcare p-5">
                  <h3 className="font-display font-semibold mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-primary to-secondary">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
              Ready to Experience Quality Healthcare?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Join thousands of patients who trust Healthy Touch for their healthcare needs at home.
            </p>
            <Button size="xl" variant="hero-outline" asChild>
              <Link to="/auth?mode=register">
                Get Started Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
