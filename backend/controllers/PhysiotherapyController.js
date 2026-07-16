import PhysiotherapyService from '../models/PhysiotherapyService.js';
import PhysiotherapyAddon from '../models/PhysiotherapyAddon.js';

const toBoolean = (value, fallback = true) => {
  if (value === undefined) return fallback;
  return value === true || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'active';
};

const sanitizePackages = (packages) => {
  if (!Array.isArray(packages)) return [];
  return packages
    .filter((item) => [5, 10, 20].includes(Number(item.sessions)))
    .map((item) => ({
      sessions: Number(item.sessions),
      discountPercentage: Math.max(0, Math.min(100, Number(item.discountPercentage) || 0)),
      ...(item.customPrice !== '' && item.customPrice !== undefined && item.customPrice !== null && Number.isFinite(Number(item.customPrice)) && {
        customPrice: Math.max(0, Number(item.customPrice) || 0),
      }),
      isActive: toBoolean(item.isActive),
    }));
};

const servicePayload = (body) => ({
  name: String(body.name || '').trim(),
  description: String(body.description || '').trim(),
  durationMinutes: Number(body.durationMinutes),
  price: Number(body.price),
  category: String(body.category || 'General').trim(),
  isActive: toBoolean(body.isActive),
  packages: sanitizePackages(body.packages),
});

const addonPayload = (body) => ({
  name: String(body.name || '').trim(),
  description: String(body.description || '').trim(),
  price: Number(body.price),
  isActive: toBoolean(body.isActive),
});

const validateService = (payload) => {
  if (!payload.name) return 'Service name is required';
  if (!Number.isFinite(payload.durationMinutes) || payload.durationMinutes <= 0) return 'Duration must be greater than zero';
  if (!Number.isFinite(payload.price) || payload.price < 0) return 'Price cannot be negative';
  return '';
};

const validateAddon = (payload) => {
  if (!payload.name) return 'Add-on name is required';
  if (!Number.isFinite(payload.price) || payload.price < 0) return 'Price cannot be negative';
  return '';
};

export const getAdminPhysiotherapyServices = async (_req, res) => {
  try {
    const services = await PhysiotherapyService.find().sort({ createdAt: -1 });
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load physiotherapy services', error: error.message });
  }
};

export const createPhysiotherapyService = async (req, res) => {
  try {
    const payload = servicePayload(req.body);
    const validationError = validateService(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const service = await PhysiotherapyService.create(payload);
    res.status(201).json({ success: true, message: 'Physiotherapy service created', service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create physiotherapy service', error: error.message });
  }
};

export const updatePhysiotherapyService = async (req, res) => {
  try {
    const payload = servicePayload(req.body);
    const validationError = validateService(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const service = await PhysiotherapyService.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ success: false, message: 'Physiotherapy service not found' });
    res.json({ success: true, message: 'Physiotherapy service updated', service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update physiotherapy service', error: error.message });
  }
};

export const deactivatePhysiotherapyService = async (req, res) => {
  try {
    const service = await PhysiotherapyService.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!service) return res.status(404).json({ success: false, message: 'Physiotherapy service not found' });
    res.json({ success: true, message: 'Physiotherapy service deactivated', service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate physiotherapy service', error: error.message });
  }
};

export const deletePhysiotherapyService = async (req, res) => {
  try {
    const service = await PhysiotherapyService.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Physiotherapy service not found' });
    res.json({ success: true, message: 'Physiotherapy service deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete physiotherapy service', error: error.message });
  }
};

export const getAdminPhysiotherapyAddons = async (_req, res) => {
  try {
    const addons = await PhysiotherapyAddon.find().sort({ createdAt: -1 });
    res.json({ success: true, addons });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load physiotherapy add-ons', error: error.message });
  }
};

export const createPhysiotherapyAddon = async (req, res) => {
  try {
    const payload = addonPayload(req.body);
    const validationError = validateAddon(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const addon = await PhysiotherapyAddon.create(payload);
    res.status(201).json({ success: true, message: 'Physiotherapy add-on created', addon });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create physiotherapy add-on', error: error.message });
  }
};

export const updatePhysiotherapyAddon = async (req, res) => {
  try {
    const payload = addonPayload(req.body);
    const validationError = validateAddon(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const addon = await PhysiotherapyAddon.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!addon) return res.status(404).json({ success: false, message: 'Physiotherapy add-on not found' });
    res.json({ success: true, message: 'Physiotherapy add-on updated', addon });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update physiotherapy add-on', error: error.message });
  }
};

export const deactivatePhysiotherapyAddon = async (req, res) => {
  try {
    const addon = await PhysiotherapyAddon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!addon) return res.status(404).json({ success: false, message: 'Physiotherapy add-on not found' });
    res.json({ success: true, message: 'Physiotherapy add-on deactivated', addon });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate physiotherapy add-on', error: error.message });
  }
};

export const deletePhysiotherapyAddon = async (req, res) => {
  try {
    const addon = await PhysiotherapyAddon.findByIdAndDelete(req.params.id);
    if (!addon) return res.status(404).json({ success: false, message: 'Physiotherapy add-on not found' });
    res.json({ success: true, message: 'Physiotherapy add-on deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete physiotherapy add-on', error: error.message });
  }
};

export const getActivePhysiotherapyServices = async (_req, res) => {
  try {
    const services = await PhysiotherapyService.find({ isActive: true }).sort({ category: 1, name: 1 });
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load physiotherapy services', error: error.message });
  }
};

export const getActivePhysiotherapyAddons = async (_req, res) => {
  try {
    const addons = await PhysiotherapyAddon.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, addons });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load physiotherapy add-ons', error: error.message });
  }
};
