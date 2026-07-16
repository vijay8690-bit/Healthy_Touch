  import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Heart, Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin, Stethoscope, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
const supportPhone = (import.meta.env.VITE_SUPPORT_PHONE || '9887894498').trim();
const contactAddress = 'Managed by Infinity vision overseas GROUND FLOOR, Flat No.: 01, MANDAWARA ROAD, MANDAWARA ROAD, Hindaun, Hindaun, Rajasthan 322230';
import { useSettings } from '@/contexts/SettingsContext';
import { MOU_DOCUMENT_SLUGS, getLegalDocumentPath, getPublicLegalDocuments, type LegalDocument } from '@/services/legalDocument.service';
import { FEATURES } from '@/config/features';

const footerLinks = {
  services: [
    ...(FEATURES.DOCTOR_MODULE ? [{ name: 'Find Doctors', href: '/services' }] : []),
    { name: 'Nurse', href: '/patient/providers?category=nurse' },
    { name: 'Takers', href: '/patient/providers?category=caretaker' },
    { name: 'Physiotherapy', href: '/patient/providers?category=physiotherapy' },
    { name: 'Lab Test', href: '/lab-tests' },
  ],
  company: [
    { name: 'About Us', href: '/about' },
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'Testimonials', href: '/#testimonials' },
    { name: 'Contact', href: '/contact' },
  ],
  support: [
    { name: 'Help Center', href: '/contact' },
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms of Service', href: '/terms-and-conditions' },
    { name: 'FAQs', href: '/contact' },
  ],
};

const socialLinks = [Facebook, Twitter, Instagram, Linkedin] as const;

export function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [legalDocs, setLegalDocs] = useState<LegalDocument[]>([]);
  const { settings } = useSettings();

  const siteName = (settings as any)?.siteName || 'Healthy Touch';
  const contactPhone = (settings as any)?.contactPhone || supportPhone;
  const supportEmail = (settings as any)?.supportEmail || 'care@healthytouch.in';
  const facebookUrl = (settings as any)?.facebookUrl || '#';
  const twitterUrl = (settings as any)?.twitterUrl || '#';
  const instagramUrl = (settings as any)?.instagramUrl || '#';
  const linkedinUrl = (settings as any)?.linkedinUrl || '#';

  const telHref = `tel:${String(contactPhone).replace(/[^+\d]/g, '')}`;

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 240);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    getPublicLegalDocuments()
      .then(setLegalDocs)
      .catch(() => setLegalDocs([]));
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    console.log('subscribe', email);
    setSubscribed(true);
    setTimeout(() => setEmail(''), 700);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const footerLegalDocs = MOU_DOCUMENT_SLUGS
    .map((slug) => legalDocs.find((doc) => doc.slug === slug && doc.isActive))
    .filter(Boolean) as LegalDocument[];

  return (
    <footer className="bg-health-ink text-background">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Top area: improved layout and clarity, keeping background */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl sm:p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 flex flex-col justify-between">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-4">
                  <Link to="/" className="flex items-center gap-3">
                    <img src="/healthy-touch-logo.png" className="h-16" alt={siteName} />
                  </Link>
                </div>
                <p className="text-sm text-background/70 max-w-xs">
                  Doctor-led home healthcare - certified professionals, safe visits, and clear pricing. Trusted care at your doorstep.
                </p>
              </div>

              <div className="mt-6 space-y-2 text-sm text-background/70">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <a 
                    href={telHref}
                    className="font-medium hover:text-background hover:underline transition-all duration-200"
                  >
                    {contactPhone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <a 
                    href={`mailto:${supportEmail}`}
                    className="hover:text-background hover:underline transition-all duration-200"
                  >
                    {supportEmail}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{contactAddress}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 md:col-span-5">
              <div>
                <h4 className="font-display font-semibold mb-3">Services</h4>
                <ul className="space-y-2 text-sm text-background/70">
                  {footerLinks.services.map((l) => (
                    <li key={l.name}><Link to={l.href} className="hover:underline">{l.name}</Link></li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-display font-semibold mb-3">Company</h4>
                <ul className="space-y-2 text-sm text-background/70">
                  {footerLinks.company.map((l) => (
                    <li key={l.name}><Link to={l.href} className="hover:underline">{l.name}</Link></li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-display font-semibold mb-3">Support</h4>
                <ul className="space-y-2 text-sm text-background/70">
                  {footerLegalDocs.length > 0
                    ? footerLegalDocs.map((doc) => (
                      <li key={doc.slug}><a href={getLegalDocumentPath(doc.slug)} className="hover:underline">{doc.title}</a></li>
                    ))
                    : footerLinks.support.map((l) => (
                      <li key={l.name}><Link to={l.href} className="hover:underline">{l.name}</Link></li>
                    ))}
                </ul>
              </div>
            </div>

            <div className="md:col-span-3">
              <h4 className="font-display font-semibold mb-3">Quick help</h4>
              <p className="text-sm text-background/70 mb-4">Need help? Call or WhatsApp our support team at {contactPhone}.</p>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/8 p-5 shadow-lg">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-background/70">Registered with iStart</p>
                <div className="rounded-xl bg-white p-4">
                  <img src="/i startlogo.webp" className="h-20 w-auto" alt="iStart" />
                </div>
              </div>

              {/* <div className="flex gap-3">
                <Link to="/contact">
                  <Button size="sm">Ask a Question</Button>
                </Link>
                <Link to="/services">
                  <Button variant="ghost" size="sm">Book a Visit</Button>
                </Link>
              </div> */}

              {/* <div className="mt-6">
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email for tips"
                    className="flex-1 rounded-md px-3 py-2 text-sm outline-none"
                  />
                  <Button type="submit" size="sm">{subscribed ? 'Thanks' : 'Subscribe'}</Button>
                </form>
                <div className="flex items-center gap-2 mt-4">
                  {socialLinks.map((Icon, i) => {
                    const href =
                      Icon === Facebook ? facebookUrl :
                      Icon === Twitter ? twitterUrl :
                      Icon === Instagram ? instagramUrl :
                      linkedinUrl;

                    return (
                      <a key={i} href={href} className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors" aria-label="social-link">
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div> */}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 text-center text-sm text-background/60 md:flex-row md:text-left">
          <div>© {new Date().getFullYear()} {siteName} - Trusted doctor-led home care.</div>
          <div className="flex items-center gap-4">
            {(footerLegalDocs.length ? footerLegalDocs.slice(0, 2) : []).map((doc) => (
              <a key={doc.slug} href={getLegalDocumentPath(doc.slug)} className="hover:underline">{doc.title}</a>
            ))}
          </div>
        </div>
      </div>

      {/* Back to top button */}
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        className={`fixed bottom-20 right-4 z-40 flex h-11 w-11 transform items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 md:bottom-8 md:right-8 md:h-12 md:w-12 ${showTop ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </footer>
  );
}
