import NurseService from '../models/NurseService.js';
import NurseAddon from '../models/NurseAddon.js';

const packageCounts = { '5_visits': 5, '10_visits': 10, monthly: 30 };
const toBoolean = (value, fallback = true) => {
  if (value === undefined) return fallback;
  return value === true || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'active';
};

const sanitizePackages = (packages) => Array.isArray(packages)
  ? packages
    .filter((item) => Object.hasOwn(packageCounts, item.packageType))
    .map((item) => ({
      packageType: item.packageType,
      visitsCount: item.packageType === 'monthly'
        ? Math.max(1, Number(item.visitsCount) || packageCounts.monthly)
        : packageCounts[item.packageType],
      discountPercentage: Math.max(0, Math.min(100, Number(item.discountPercentage) || 0)),
      ...(item.customPrice !== '' && item.customPrice !== undefined && item.customPrice !== null && Number.isFinite(Number(item.customPrice)) && {
        customPrice: Math.max(0, Number(item.customPrice) || 0),
      }),
      isActive: toBoolean(item.isActive),
    }))
  : [];

const servicePayload = (body) => ({
  serviceName: String(body.serviceName || '').trim(),
  description: String(body.description || '').trim(),
  durationMinutes: Number(body.durationMinutes),
  price: Number(body.price),
  category: String(body.category || 'General Nursing').trim(),
  requiredEquipment: String(body.requiredEquipment || '').trim(),
  isActive: toBoolean(body.isActive),
  packages: sanitizePackages(body.packages),
});

const addonPayload = (body) => ({
  addOnName: String(body.addOnName || '').trim(),
  description: String(body.description || '').trim(),
  price: Number(body.price),
  isActive: toBoolean(body.isActive),
});

const validateService = (payload) => {
  if (!payload.serviceName) return 'Service name is required';
  if (!Number.isFinite(payload.durationMinutes) || payload.durationMinutes <= 0) return 'Duration must be greater than zero';
  if (!Number.isFinite(payload.price) || payload.price < 0) return 'Price cannot be negative';
  return '';
};

const validateAddon = (payload) => {
  if (!payload.addOnName) return 'Add-on name is required';
  if (!Number.isFinite(payload.price) || payload.price < 0) return 'Price cannot be negative';
  return '';
};

export const getAdminNurseServices = async (_req, res) => {
  try {
    res.json({ success: true, services: await NurseService.find().sort({ createdAt: -1 }) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load nurse services', error: error.message });
  }
};

export const createNurseService = async (req, res) => {
  try {
    const payload = servicePayload(req.body);
    const validationError = validateService(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const service = await NurseService.create(payload);
    res.status(201).json({ success: true, message: 'Nurse service created', service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create nurse service', error: error.message });
  }
};

export const updateNurseService = async (req, res) => {
  try {
    const payload = servicePayload(req.body);
    const validationError = validateService(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const service = await NurseService.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ success: false, message: 'Nurse service not found' });
    res.json({ success: true, message: 'Nurse service updated', service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update nurse service', error: error.message });
  }
};

export const deactivateNurseService = async (req, res) => {
  try {
    const service = await NurseService.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!service) return res.status(404).json({ success: false, message: 'Nurse service not found' });
    res.json({ success: true, message: 'Nurse service deactivated', service });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate nurse service', error: error.message });
  }
};

export const deleteNurseService = async (req, res) => {
  try {
    const service = await NurseService.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Nurse service not found' });
    res.json({ success: true, message: 'Nurse service deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete nurse service', error: error.message });
  }
};

export const getAdminNurseAddons = async (_req, res) => {
  try {
    res.json({ success: true, addons: await NurseAddon.find().sort({ createdAt: -1 }) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load nurse add-ons', error: error.message });
  }
};

export const createNurseAddon = async (req, res) => {
  try {
    const payload = addonPayload(req.body);
    const validationError = validateAddon(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const addon = await NurseAddon.create(payload);
    res.status(201).json({ success: true, message: 'Nurse add-on created', addon });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create nurse add-on', error: error.message });
  }
};

export const updateNurseAddon = async (req, res) => {
  try {
    const payload = addonPayload(req.body);
    const validationError = validateAddon(payload);
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    const addon = await NurseAddon.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!addon) return res.status(404).json({ success: false, message: 'Nurse add-on not found' });
    res.json({ success: true, message: 'Nurse add-on updated', addon });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update nurse add-on', error: error.message });
  }
};

export const deactivateNurseAddon = async (req, res) => {
  try {
    const addon = await NurseAddon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!addon) return res.status(404).json({ success: false, message: 'Nurse add-on not found' });
    res.json({ success: true, message: 'Nurse add-on deactivated', addon });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate nurse add-on', error: error.message });
  }
};

export const deleteNurseAddon = async (req, res) => {
  try {
    const addon = await NurseAddon.findByIdAndDelete(req.params.id);
    if (!addon) return res.status(404).json({ success: false, message: 'Nurse add-on not found' });
    res.json({ success: true, message: 'Nurse add-on deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete nurse add-on', error: error.message });
  }
};

export const getActiveNurseServices = async (_req, res) => {
  try {
    res.json({ success: true, services: await NurseService.find({ isActive: true }).sort({ category: 1, serviceName: 1 }) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load nurse services', error: error.message });
  }
};

export const getActiveNurseAddons = async (_req, res) => {
  try {
    res.json({ success: true, addons: await NurseAddon.find({ isActive: true }).sort({ addOnName: 1 }) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load nurse add-ons', error: error.message });
  }
};
