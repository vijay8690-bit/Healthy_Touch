import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Stethoscope, Heart, UserCheck, Home, Shield, Clock, Award, ArrowRight, Activity, Baby, Phone, CheckCircle2, Star, MessageCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { mockDoctors, mockNurses, mockCareTakers } from '@/lib/mock-data';
import { useState } from 'react';
import { WhyChooseUsSection } from '@/components/WhyChooseUsSection';
import { FEATURES } from '@/config/features';

const services = [
  ...(FEATURES.DOCTOR_MODULE
    ? [{
    id: 'doctors',
    icon: Stethoscope,
    title: 'Doctor Consultations',
    description: 'Connect with experienced doctors for home visits, teleconsultations, and follow-up care. Our verified doctors cover general medicine, cardiology, pediatrics, orthopedics, dermatology, and more. Get expert medical advice and treatment without leaving your home.',
    detailedDescription: 'Our network includes specialists across 20+ medical fields. Whether you need a routine checkup, specialist consultation, or follow-up care, our doctors provide comprehensive medical services. All consultations include detailed medical reports, prescriptions, and follow-up recommendations.',
    features: ['Home Visits', 'Video Consultations', 'Prescription Services', 'Follow-up Care', 'Health Reports', 'Lab Test Recommendations'],
    providers: mockDoctors,
    color: 'from-primary to-primary/80',
    bgColor: 'bg-gradient-to-br from-blue-50 via-primary/5 to-blue-50 dark:from-blue-950/20 dark:via-primary/10 dark:to-blue-950/20',
    duration: '30-60 minutes',
    specialties: ['General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'Gynecology'],
    href: '/patient/providers?category=doctor',
  }]
    : []),
  {
    id: 'nurses',
    icon: Heart,
    title: 'Nursing Care',
    description: 'Professional nurses for wound care, IV administration, post-surgery care, and patient monitoring. Get expert nursing care in the comfort of your home. Our trained nurses handle complex medical procedures with precision and care.',
    detailedDescription: 'Our nursing team includes ICU-trained nurses, wound care specialists, and general care nurses. They are equipped to handle post-operative care, chronic disease management, medication administration, and vital sign monitoring. All nurses are certified and undergo regular training.',
    features: ['Wound Dressing', 'IV Administration', 'Vital Monitoring', 'Post-Surgery Care', 'Medication Management', 'Health Assessments'],
    providers: mockNurses,
    color: 'from-secondary to-secondary/80',
    bgColor: 'bg-gradient-to-br from-rose-50 via-secondary/5 to-rose-50 dark:from-rose-950/20 dark:via-secondary/10 dark:to-rose-950/20',
    duration: '2-8 hours',
    specialties: ['Home Care', 'ICU Care', 'Wound Care', 'Post-Surgery', 'Chronic Care'],
    href: '/patient/providers?category=nurse',
  },
  {
    id: 'caretakers',
    icon: UserCheck,
    title: 'Care Taker Services',
    description: 'Compassionate care takers for elderly care, daily assistance, and patient support. Our trained care takers ensure your loved ones receive the best care with dignity and respect.',
    detailedDescription: 'Our care takers are trained in elderly care, disability support, and daily living assistance. They help with personal hygiene, meal preparation, medication reminders, mobility support, and companionship. All care takers undergo background checks and specialized training.',
    features: ['Elder Care', 'Daily Assistance', 'Medication Reminders', 'Mobility Support', 'Personal Care', 'Companionship'],
    providers: mockCareTakers,
    color: 'from-primary to-secondary',
    bgColor: 'bg-gradient-to-br from-purple-50 via-primary/5 to-secondary/5 dark:from-purple-950/20 dark:via-primary/10 dark:to-secondary/10',
    duration: '4-12 hours',
    specialties: ['Elder Care', 'Disability Support', 'Post-Surgery Assistance', 'Chronic Illness Care'],
    href: '/patient/providers?category=caretaker',
  },
  {
    id: 'physiotherapy',
    icon: Activity,
    title: 'Physiotherapy at Home',
    description: 'Expert physiotherapists for rehabilitation, pain management, and mobility improvement. Get personalized physiotherapy sessions at home with advanced equipment and techniques.',
    detailedDescription: 'Our physiotherapists specialize in orthopedic rehabilitation, neurological conditions, sports injuries, and geriatric care. They bring portable equipment and create customized treatment plans. Sessions include exercises, manual therapy, and progress tracking.',
    features: ['Pain Management', 'Rehabilitation', 'Mobility Training', 'Exercise Programs', 'Manual Therapy', 'Progress Tracking'],
    providers: mockDoctors,
    color: 'from-secondary to-primary',
    bgColor: 'bg-gradient-to-br from-green-50 via-secondary/5 to-primary/5 dark:from-green-950/20 dark:via-secondary/10 dark:to-primary/10',
    duration: '45-60 minutes',
    specialties: ['Orthopedic', 'Neurological', 'Sports Injury', 'Geriatric', 'Post-Surgery'],
    href: '/patient/providers?category=physiotherapy',
  },
  {
    id: 'mother-baby',
    icon: Baby,
    title: 'Mother & Baby Care',
    description: 'Specialized care for new mothers and babies including lactation support, newborn care, postpartum recovery, and pediatric consultations.',
    detailedDescription: 'Our mother and baby care services include lactation consultants, newborn care specialists, postpartum nurses, and pediatricians. We provide comprehensive support for new mothers including breastfeeding guidance, baby care education, and postpartum recovery assistance.',
    features: ['Lactation Support', 'Newborn Care', 'Postpartum Recovery', 'Baby Care Education', 'Pediatric Consultations', '24/7 Support'],
    providers: mockNurses,
    color: 'from-primary via-secondary to-primary',
    bgColor: 'bg-gradient-to-br from-pink-50 via-primary/5 via-secondary/5 to-pink-50 dark:from-pink-950/20 dark:via-primary/10 dark:via-secondary/10 dark:to-pink-950/20',
    duration: '2-4 hours',
    specialties: ['Lactation', 'Newborn Care', 'Postpartum', 'Pediatric'],
    href: '/patient/providers?category=caretaker',
  },
];

const benefits = [
  {
    icon: Shield,
    title: 'Verified Professionals',
    description: 'All our providers undergo thorough background checks, credential verification, and continuous training to ensure the highest standards.',
    details: 'Multi-layer verification including license checks, criminal background verification, and regular performance audits.',
  },
  {
    icon: Home,
    title: 'Care at Home',
    description: 'Receive quality healthcare in the comfort of your own home, eliminating travel time and hospital visits.',
    details: 'Save time and reduce stress by receiving expert care without leaving your home.',
  },
  {
    icon: Clock,
    title: '24/7 Availability',
    description: 'Round-the-clock support and emergency care services available whenever you need them.',
    details: 'Emergency services, urgent care, and support available 24/7 for critical situations.',
  },
  {
    icon: Award,
    title: 'Quality Assured',
    description: 'High standards of care with regular quality audits and patient feedback systems.',
    details: 'Continuous monitoring, quality checks, and improvement processes ensure consistent excellence.',
  },
  {
    icon: Phone,
    title: 'Easy Booking',
    description: 'Simple online booking system with real-time availability and instant confirmations.',
    details: 'Book appointments in minutes through our user-friendly platform with instant SMS and email confirmations.',
  },
  {
    icon: Heart,
    title: 'Compassionate Care',
    description: 'Healthcare professionals who treat patients with empathy, respect, and genuine care.',
    details: 'Every provider is trained in patient communication and emotional support.',
  },
];

const faqs = [
  {
    question: 'How do I book an appointment?',
    answer: 'You can book an appointment through our website or mobile app. Simply search for the type of service you need, select a provider, choose your preferred date and time, and confirm your booking. You\'ll receive instant confirmation via SMS and email.',
  },
  {
    question: 'Are all healthcare providers verified?',
    answer: 'Yes, all our providers undergo a rigorous verification process including license verification, background checks, credential validation, and skill assessments. We maintain strict quality standards and regularly audit our provider network.',
  },
  {
    question: 'What services are available in my area?',
    answer: 'We currently serve 28 cities across India. You can check availability in your area by entering your location on our platform. Most services including doctor consultations, nursing care, and physiotherapy are available in all covered cities.',
  },
  {
    question: 'Can I reschedule or cancel my appointment?',
    answer: 'Yes, you can easily reschedule or cancel your appointment through your account dashboard or by calling our support team. Cancellations made 24 hours in advance are free, while last-minute cancellations may incur a small fee.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major payment methods including credit/debit cards, UPI, net banking, and digital wallets. Payment can be made online at the time of booking or in cash to the provider.',
  },
  {
    question: 'Is telemedicine available?',
    answer: 'Yes, we offer video consultations with doctors for non-emergency cases. This is especially convenient for follow-up consultations, prescription renewals, and general health advice. Video consultations are available 24/7.',
  },
  {
    question: 'What if I need emergency care?',
    answer: 'For medical emergencies, please call emergency services (108) immediately. For urgent but non-life-threatening situations, you can book an emergency appointment through our platform, and we\'ll try to arrange a provider visit within 2-4 hours.',
  },
  {
    question: 'Do you provide services for chronic conditions?',
    answer: 'Yes, we provide comprehensive care for chronic conditions including diabetes, hypertension, heart disease, and more. Our providers offer regular monitoring, medication management, and lifestyle counseling for chronic disease management.',
  },
];

const testimonials = [
  {
    name: 'Mrs. Kavita Mehta',
    role: 'Patient',
    service: 'Doctor Consultation',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 5,
    text: 'The doctor consultation at home was excellent. Dr. Sharma was thorough, patient, and explained everything clearly. Much better than visiting a crowded hospital!',
  },
  {
    name: 'Mr. Suresh Iyer',
    role: 'Patient',
    service: 'Physiotherapy',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    rating: 5,
    text: 'After my knee surgery, the physiotherapy sessions at home were life-changing. The therapist was professional and the exercises really helped me recover faster.',
  },
  {
    name: 'Mrs. Radha Nair',
    role: 'Family Member',
    service: 'Nursing Care',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    rating: 5,
    text: 'The nursing care for my mother was outstanding. The nurse was skilled, caring, and always punctual. It gave us peace of mind knowing she was in good hands.',
  },
];

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="card-healthcare"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="font-semibold">{faq.question}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-6">
          <p className="text-muted-foreground">{faq.answer}</p>
        </div>
      )}
    </motion.div>
  );
}

export default function ServicesPage() {
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
              backgroundImage: `linear-gradient(to right, rgba(12,18,34,0.75), rgba(12,18,34,0.45)), url('/doctor counsaltancy.jpg')`,
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
              <Stethoscope className="w-4 h-4" />
              Comprehensive Healthcare Solutions
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
            >
              Our <span className="text-secondary">Healthcare Services</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="text-lg md:text-xl text-slate-100/90 mb-4 max-w-3xl mx-auto"
            >
              Comprehensive healthcare solutions delivered by verified professionals at your doorstep. 
              Choose the service that best fits your needs.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <div className="space-y-0">
        {services.map((service, index) => (
          <section
            key={service.id}
            className={`py-16 ${service.bgColor}`}
          >
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`grid lg:grid-cols-2 gap-8 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
              <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-6`}>
                  <service.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="font-display text-3xl font-bold mb-4">{service.title}</h2>
                <p className="text-muted-foreground mb-4">{service.description}</p>
                <p className="text-sm text-muted-foreground mb-6">{service.detailedDescription}</p>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {service.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">{service.duration}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm font-semibold mb-2">Specialties:</p>
                  <div className="flex flex-wrap gap-2">
                    {service.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                <Button asChild>
                  <Link to={service.href}>
                    Book Now
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                {service.providers.slice(0, 2).map((provider) => (
                  <div key={provider.id} className="card-healthcare p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={provider.image}
                        alt={provider.name}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-muted-foreground">{provider.specialization}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm font-medium">{provider.rating}</span>
                        <span className="text-xs text-muted-foreground">({provider.reviews})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </motion.div>
            </div>
          </section>
        ))}
      </div>

      {/* Benefits */}
      {/* <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl font-bold mb-4">
              Why Choose <span className="gradient-text">Healthy Touch</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're committed to providing exceptional healthcare experiences that prioritize your comfort, 
              convenience, and well-being.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card-healthcare p-6 hover:-translate-y-2 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <benefit.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{benefit.description}</p>
                <p className="text-xs text-muted-foreground italic">{benefit.details}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}
     <WhyChooseUsSection/>

      {/* Testimonials */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl font-bold mb-4">
              What Our Patients Say
            </h2>
            <p className="text-muted-foreground">
              Real experiences from patients who have used our services
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card-healthcare p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
                <div className="mb-2">
                  <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                    {testimonial.service}
                  </span>
                </div>
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground italic text-sm">"{testimonial.text}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Find answers to common questions about our services
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem key={index} faq={faq} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="card-healthcare p-8 md:p-12 text-center bg-gradient-to-br from-primary/5 to-secondary/5">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Join thousands of patients who trust Healthy Touch for quality healthcare at home.
            </p>
            <Button size="lg" asChild>
              <Link to="/auth?mode=register">
                Book Your First Appointment
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
