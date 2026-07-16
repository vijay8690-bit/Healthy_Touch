import mongoose from 'mongoose';

const DEFAULT_HERO_IMAGES = ['/slider-1.jpg', '/slider-2.jpg', '/slider-3.jpg'];

const DEFAULT_OFFERS = [
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

const offerCardSchema = new mongoose.Schema(
  {
    tag: { type: String, trim: true, maxlength: 60, default: '' },
    title: { type: String, trim: true, maxlength: 120, required: true },
    highlight: { type: String, trim: true, maxlength: 100, default: '' },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    badge: { type: String, trim: true, maxlength: 60, default: '' },
    color: {
      type: String,
      trim: true,
      enum: ['primary', 'secondary', 'mixed'],
      default: 'primary',
    },
    price: { type: String, trim: true, maxlength: 40, default: '' },
    original: { type: String, trim: true, maxlength: 40, default: '' },
    note: { type: String, trim: true, maxlength: 100, default: '' },
    ctaText: { type: String, trim: true, maxlength: 40, default: 'Grab Offer' },
    ctaLink: { type: String, trim: true, maxlength: 300, default: '/patient/dashboard' },
    active: { type: Boolean, default: true },
  },
  { _id: true }
);

const homeContentSchema = new mongoose.Schema(
  {
    heroTitle: {
      type: String,
      trim: true,
      maxlength: [160, 'Hero title cannot exceed 160 characters'],
      default: 'Your health\nis our focus',
    },
    heroSubtitle: {
      type: String,
      trim: true,
      maxlength: [500, 'Hero subtitle cannot exceed 500 characters'],
      default:
        'Trusted healthcare partners bringing quality care, guidance, and emergency support right when you need it.',
    },
    heroImages: {
      type: [String],
      default: DEFAULT_HERO_IMAGES,
      validate: {
        validator(images) {
          return Array.isArray(images) && images.length > 0 && images.length <= 10;
        },
        message: 'Hero images must include 1 to 10 image URLs',
      },
    },
    ctaText: {
      type: String,
      trim: true,
      maxlength: [80, 'CTA text cannot exceed 80 characters'],
      default: 'Get Started - Book an Appointment',
    },
    ctaLink: {
      type: String,
      trim: true,
      maxlength: [300, 'CTA link cannot exceed 300 characters'],
      default: '/patient/dashboard',
    },
    offerTitle: {
      type: String,
      trim: true,
      maxlength: [160, 'Offer title cannot exceed 160 characters'],
      default: '',
    },
    offerDescription: {
      type: String,
      trim: true,
      maxlength: [500, 'Offer description cannot exceed 500 characters'],
      default: '',
    },
    offerImage: {
      type: String,
      trim: true,
      maxlength: [500, 'Offer image URL cannot exceed 500 characters'],
      default: '',
    },
    offerActive: {
      type: Boolean,
      default: false,
    },
    offers: {
      type: [offerCardSchema],
      default: DEFAULT_OFFERS,
      validate: {
        validator(offers) {
          return Array.isArray(offers) && offers.length <= 12;
        },
        message: 'Offers cannot exceed 12 cards',
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

homeContentSchema.statics.getDefaults = function getDefaults() {
  return {
    heroTitle: 'Your health\nis our focus',
    heroSubtitle:
      'Trusted healthcare partners bringing quality care, guidance, and emergency support right when you need it.',
    heroImages: DEFAULT_HERO_IMAGES,
    ctaText: 'Get Started - Book an Appointment',
    ctaLink: '/patient/dashboard',
    offerTitle: '',
    offerDescription: '',
    offerImage: '',
    offerActive: false,
    offers: DEFAULT_OFFERS,
  };
};

const HomeContent = mongoose.model('HomeContent', homeContentSchema);

export default HomeContent;
