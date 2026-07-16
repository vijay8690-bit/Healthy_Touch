import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

const normalizePhone = (rawPhone: string) => {
  const trimmed = (rawPhone || '').trim();
  const digitsOnly = trimmed.replace(/[^\d+]/g, '');

  let e164 = digitsOnly;
  if (!e164) return { display: '', e164: '' };

  if (!e164.startsWith('+')) {
    if (/^\d{10}$/.test(e164)) {
      e164 = `+91${e164}`;
    } else if (/^\d+$/.test(e164)) {
      e164 = `+${e164}`;
    }
  }

  const display = trimmed.startsWith('+') ? trimmed : `+91-${trimmed}`;

  return { display, e164 };
};

const HealthExpertCallPopup: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const dragConstraintsRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { settings } = useSettings();

  const { display, e164 } = useMemo(() => {
    const rawPhone = ((settings as any)?.contactPhone as string | undefined) || import.meta.env.VITE_SUPPORT_PHONE;
    return normalizePhone(rawPhone);
  }, [settings]);

  const role = String((user as any)?.role || '').toLowerCase();
  const isPatientVisible = !role || role === 'patient';

  if (!isVisible || !isPatientVisible) return null;

  return (
    <>
      <div ref={dragConstraintsRef} className="pointer-events-none fixed inset-0 z-[49]" />
      <motion.div
        drag
        dragConstraints={dragConstraintsRef}
        dragMomentum={false}
        initial={{ opacity: 0, x: 32, y: '-50%' }}
        animate={{ opacity: 1, x: 0, y: '-50%' }}
        exit={{ opacity: 0, x: 32, y: '-50%' }}
        className="fixed right-3 top-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-[156px] cursor-grab rounded-xl bg-white px-2.5 py-3 text-center shadow-2xl active:cursor-grabbing sm:right-8 sm:w-[calc(100vw-2rem)] sm:max-w-[260px] sm:rounded-2xl sm:px-4 sm:py-5"
      >
        <button
          type="button"
          aria-label="Close health expert call popup"
          onClick={() => setIsVisible(false)}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-white text-foreground shadow-lg transition-colors hover:bg-muted sm:-right-2 sm:-top-2 sm:h-7 sm:w-7"
        >
          <X className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>

        <h2 className="text-[11px] font-bold leading-tight text-black sm:text-lg">Worried About Your Health?</h2>
        <p className="mt-0.5 text-[10px] font-semibold leading-tight text-neutral-500 sm:mt-1 sm:text-base">Talk to an Expert Now!</p>

        <a
          href={e164 ? `tel:${e164}` : undefined}
          aria-label={display ? `Call health expert at ${display}` : 'Call health expert'}
          className="mt-2 inline-flex min-h-6 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-teal-600 px-2 text-[9px] font-bold leading-none text-white shadow-sm transition-colors hover:bg-teal-700 sm:mt-3 sm:min-h-10 sm:rounded-lg sm:px-3 sm:text-base"
        >
          Call: {display || '+91-999-888-0005'}
        </a>
      </motion.div>
    </>
  );
};

export default HealthExpertCallPopup;
