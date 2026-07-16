import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, X } from 'lucide-react';
import { FloatingWhatsApp } from 'react-floating-whatsapp';
import { useLocation } from 'react-router-dom';
import { useSettings } from '@/contexts/SettingsContext';

const normalizePhone = (rawPhone: string) => {
  const trimmed = (rawPhone || '').trim();
  const digitsOnly = trimmed.replace(/[^\d+]/g, '');

  // Prefer E.164 for tel links.
  let e164 = digitsOnly;
  if (!e164) return { display: '', e164: '', whatsappDigits: '' };

  if (!e164.startsWith('+')) {
    // Heuristic: if it's a 10-digit Indian mobile number, assume +91.
    if (/^\d{10}$/.test(e164)) {
      e164 = `+91${e164}`;
    } else if (/^\d+$/.test(e164)) {
      e164 = `+${e164}`;
    }
  }

  const whatsappDigits = e164.replace(/^\+/, '').replace(/\D/g, '');
  const display = trimmed;

  return { display, e164, whatsappDigits };
};

const SupportCallWidget: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const { settings } = useSettings();
  const shouldHide = location.pathname === '/patient/dashboard' || location.pathname.startsWith('/admin');

  const { display, e164, whatsappDigits } = useMemo(() => {
    const rawPhone = (((settings as any)?.contactPhone as string | undefined) || (import.meta.env.VITE_SUPPORT_PHONE as string | undefined) || '9887894498').trim();
    return normalizePhone(rawPhone);
  }, [settings]);

  const telHref = e164 ? `tel:${e164}` : undefined;

  if (shouldHide) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-20 left-6 z-50 flex flex-col gap-3"
      >
        <AnimatePresence>
          {isExpanded && (
            <>
              {telHref && (
                <motion.a
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  href={telHref}
                  aria-label={display ? `Call support at ${display}` : 'Call support'}
                  className="w-14 h-14 rounded-full gradient-bg text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-glow transition-shadow"
                >
                  <Phone className="w-6 h-6" />
                </motion.a>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                exit={{ opacity: 0, y: 20 }}
              >
                <FloatingWhatsApp
                  phoneNumber={whatsappDigits}
                  accountName="Healthy Touch"
                  statusMessage="Typically replies within 1 hour"
                  chatMessage="Hello! How can we help you today?"
                  placeholder="Type a message.."
                  allowEsc
                  allowClickAway
                  darkMode={false}
                  chatboxStyle={{ left: 24, right: 'auto' }}
                  style={{ position: 'static' }}
                  buttonStyle={{ position: 'static' }}
                  buttonClassName="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          aria-label={isExpanded ? 'Close support options' : 'Open support options'}
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isExpanded
              ? 'bg-foreground text-primary-foreground'
              : 'gradient-bg text-primary-foreground hover:shadow-glow'
          }`}
        >
          <motion.div animate={{ rotate: isExpanded ? 45 : 0 }} transition={{ duration: 0.2 }}>
            {isExpanded ? <X className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
          </motion.div>
        </motion.button>
      </motion.div>
    </>
  );
};

export default SupportCallWidget;
