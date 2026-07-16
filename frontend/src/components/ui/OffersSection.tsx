import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Gift, Heart, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import homeContentService, { defaultOffers, type HomeOffer } from '@/services/homeContent.service';
import { FEATURES } from '@/config/features';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.12 * i },
  }),
};

const getOfferGradient = (color: HomeOffer['color']) => {
  if (color === 'secondary') return 'from-secondary via-primary to-secondary/80';
  if (color === 'mixed') return 'from-primary/90 via-secondary to-primary';
  return 'from-primary via-primary/90 to-secondary';
};

const OffersSection = () => {
  const [offers, setOffers] = useState<HomeOffer[]>(defaultOffers);

  useEffect(() => {
    let mounted = true;

    homeContentService
      .getPublicHomeContent()
      .then((content) => {
        if (mounted) setOffers(content.offers?.length ? content.offers : defaultOffers);
      })
      .catch(() => {
        if (mounted) setOffers(defaultOffers);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const visibleOffers = offers.filter((offer) => {
    if (offer.active === false) return false;
    if (!FEATURES.DOCTOR_MODULE && /category=doctor|search=doctor/i.test(offer.ctaLink || '')) return false;
    return true;
  });

  if (!visibleOffers.length) return null;

  return (
    <section
      id="offers"
      className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900"
    >
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -top-24 -left-16 w-64 h-64 bg-primary/15 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12 md:mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 dark:bg-slate-900/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Exclusive Offers</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-5 mb-3">
            Special <span className="gradient-text">Healthy Touch</span> Offers
          </h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Hand-picked healthcare packages that make quality care pocket-friendly, inspiring users
            to book the right care for their family with confidence.
          </p>
        </motion.div>

        <div className="grid gap-6 md:gap-7 lg:gap-8 md:grid-cols-3">
          {visibleOffers.map((offer, index) => (
            <motion.div
              key={offer._id || offer.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              custom={index}
              className="group relative"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/40 via-primary/5 to-secondary/40 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />

              <div className="relative h-full rounded-3xl border border-border bg-card/90 px-5 py-6 md:px-6 md:py-7 flex flex-col shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-primary">
                    <Gift className="w-3.5 h-3.5" />
                    {offer.tag}
                  </span>
                  {offer.badge ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-secondary to-primary/80 px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
                      <Sparkles className="w-3 h-3" />
                      {offer.badge}
                    </span>
                  ) : null}
                </div>

                <h3 className="font-display text-lg md:text-xl font-semibold text-foreground mb-2">
                  {offer.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground mb-4">{offer.description}</p>

                {offer.highlight ? (
                  <div className="relative mb-5">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${getOfferGradient(
                        offer.color
                      )} px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{offer.highlight}</span>
                    </div>
                  </div>
                ) : null}

                <div className="mt-auto flex items-end justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-2xl md:text-3xl font-bold text-primary">
                        {offer.price}
                      </span>
                      {offer.original ? (
                        <span className="text-xs text-muted-foreground line-through">
                          {offer.original}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{offer.note}</p>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    className="rounded-full bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-cyan-400/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-cyan-300/70"
                  >
                    <Link to={offer.ctaLink || '/patient/dashboard'}>
                      <span className="text-xs font-semibold mr-1.5">{offer.ctaText || 'Grab Offer'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>

                <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-secondary to-transparent" />

                <div className="absolute -top-3 -right-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/90 text-primary-foreground border border-primary/70 shadow-lg">
                  <Heart className="w-4 h-4 fill-primary-foreground/60" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center text-[11px] md:text-xs text-muted-foreground"
        >
          *All offers are valid for a limited period only.{' '}
          <span className="text-primary font-medium">
            Book today to secure quality home healthcare for your family at better prices.
          </span>
        </motion.p>
      </div>
    </section>
  );
};

export default OffersSection;
