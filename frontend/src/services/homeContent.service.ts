import apiClient from './api.client';

export type HomeOffer = {
  _id?: string;
  tag: string;
  title: string;
  highlight: string;
  description: string;
  badge: string;
  color: 'primary' | 'secondary' | 'mixed';
  price: string;
  original: string;
  note: string;
  ctaText: string;
  ctaLink: string;
  active: boolean;
};

export type HomeContent = {
  _id?: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImages: string[];
  ctaText: string;
  ctaLink: string;
  offerTitle: string;
  offerDescription: string;
  offerImage: string;
  offerActive: boolean;
  offers: HomeOffer[];
};

export const defaultOffers: HomeOffer[] = [
  {
    tag: 'Limited Time',
    title: 'Doctor Home Visit Starter Pack',
    highlight: 'Flat 30% OFF',
    description:
      'First-time consultation at home with our senior doctors, including vitals check and basic assessment.',
    badge: 'Most Loved',
    color: 'primary',
    price: '₹799',
    original: '₹1,149',
    note: 'for your first visit',
    ctaText: 'Grab Offer',
    ctaLink: '/patient/providers?category=doctor',
    active: true,
  },
  {
    tag: 'Family Saver',
    title: 'Elderly Care Month Plan',
    highlight: 'Save up to ₹4,000',
    description:
      'Dedicated caretaker / nurse visits for your elders with flexible slots through the month.',
    badge: 'Family Favourite',
    color: 'secondary',
    price: '₹7,999',
    original: '₹11,999',
    note: 'monthly care plan',
    ctaText: 'Grab Offer',
    ctaLink: '/patient/providers?category=caretaker',
    active: true,
  },
  {
    tag: 'New Mom Offer',
    title: 'Mother & Baby Care Combo',
    highlight: 'Free Follow-up Visit',
    description:
      'Expert nursing support for new mothers and newborns - guidance, checkups and gentle care at home.',
    badge: 'Limited Seats',
    color: 'mixed',
    price: '₹3,499',
    original: '₹4,999',
    note: 'combo session',
    ctaText: 'Grab Offer',
    ctaLink: '/patient/providers?search=Mother%20Baby%20Care',
    active: true,
  },
];

export const defaultHomeContent: HomeContent = {
  heroTitle: 'Your health\nis our focus',
  heroSubtitle:
    'Trusted healthcare partners bringing quality care, guidance, and emergency support right when you need it.',
  heroImages: ['/slider-1.jpg', '/slider-2.jpg', '/slider-3.jpg'],
  ctaText: 'Get Started - Book an Appointment',
  ctaLink: '/patient/dashboard',
  offerTitle: '',
  offerDescription: '',
  offerImage: '',
  offerActive: false,
  offers: defaultOffers,
};

const mergeWithDefaults = (content?: Partial<HomeContent>): HomeContent => ({
  ...defaultHomeContent,
  ...content,
  heroImages: content?.heroImages?.filter(Boolean).length
    ? content.heroImages.filter(Boolean)
    : defaultHomeContent.heroImages,
  offers: content?.offers?.length ? content.offers : defaultOffers,
});

export const getPublicHomeContent = async () => {
  const response = await apiClient.get('/home-content/public');
  return mergeWithDefaults(response.data?.content);
};

export const getAdminHomeContent = async () => {
  const response = await apiClient.get('/home-content/admin');
  return mergeWithDefaults(response.data?.content);
};

export const updateAdminHomeContent = async (content: HomeContent) => {
  const response = await apiClient.put('/home-content/admin', content);
  return mergeWithDefaults(response.data?.content);
};

export default {
  getPublicHomeContent,
  getAdminHomeContent,
  updateAdminHomeContent,
};
