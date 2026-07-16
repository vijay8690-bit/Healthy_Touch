import HomeContent from '../models/HomeContent.js';

const allowedFields = [
  'heroTitle',
  'heroSubtitle',
  'heroImages',
  'ctaText',
  'ctaLink',
  'offerTitle',
  'offerDescription',
  'offerImage',
  'offerActive',
  'offers',
];

const publicFields = allowedFields.join(' ');

const cleanString = (value) => (typeof value === 'string' ? value.trim() : '');

const cleanOffer = (offer = {}) => ({
  tag: cleanString(offer.tag),
  title: cleanString(offer.title),
  highlight: cleanString(offer.highlight),
  description: cleanString(offer.description),
  badge: cleanString(offer.badge),
  color: ['primary', 'secondary', 'mixed'].includes(cleanString(offer.color))
    ? cleanString(offer.color)
    : 'primary',
  price: cleanString(offer.price),
  original: cleanString(offer.original),
  note: cleanString(offer.note),
  ctaText: cleanString(offer.ctaText) || 'Grab Offer',
  ctaLink: cleanString(offer.ctaLink) || '/patient/dashboard',
  active: offer.active !== false,
});

const normalizePayload = (body) => {
  const payload = {};

  allowedFields.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(body, field)) return;

    if (field === 'heroImages') {
      payload.heroImages = Array.isArray(body.heroImages)
        ? body.heroImages.map(cleanString).filter(Boolean).slice(0, 10)
        : [];
      return;
    }

    if (field === 'offerActive') {
      payload.offerActive = Boolean(body.offerActive);
      return;
    }

    if (field === 'offers') {
      payload.offers = Array.isArray(body.offers)
        ? body.offers.map(cleanOffer).filter((offer) => offer.title).slice(0, 12)
        : [];
      return;
    }

    payload[field] = cleanString(body[field]);
  });

  return payload;
};

const getOrCreateHomeContent = async () => {
  let content = await HomeContent.findOne();

  if (!content) {
    content = await HomeContent.create(HomeContent.getDefaults());
  }

  return content;
};

// @desc    Get public homepage content
// @route   GET /api/home-content/public
// @access  Public
export const getPublicHomeContent = async (req, res) => {
  try {
    const content = await getOrCreateHomeContent();

    return res.status(200).json({
      success: true,
      content: await HomeContent.findById(content._id).select(publicFields).lean(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching home content',
      error: error.message,
    });
  }
};

// @desc    Get admin homepage content
// @route   GET /api/home-content/admin
// @access  Private (Admin)
export const getAdminHomeContent = async (req, res) => {
  try {
    const content = await getOrCreateHomeContent();

    return res.status(200).json({
      success: true,
      content,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching home content',
      error: error.message,
    });
  }
};

// @desc    Update homepage content
// @route   PUT /api/home-content/admin
// @access  Private (Admin)
export const updateAdminHomeContent = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);

    if (Object.prototype.hasOwnProperty.call(payload, 'heroImages') && payload.heroImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one hero image is required',
      });
    }

    const content = await getOrCreateHomeContent();
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        content[field] = payload[field];
      }
    });
    content.updatedBy = req.user?._id;

    await content.save();

    return res.status(200).json({
      success: true,
      message: 'Home content updated successfully',
      content,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while updating home content',
      error: error.message,
    });
  }
};
