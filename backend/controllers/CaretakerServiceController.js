import CaretakerService from '../models/CaretakerService.js';
import CaretakerAddon from '../models/CaretakerAddon.js';

const packageHours = { hourly: 1, '12_hours': 12, '24_hours': 24, weekly: 168, monthly: 720 };
const packageLabels = { hourly: 'Short', '12_hours': 'Day', '24_hours': 'Full', weekly: 'Weekly', monthly: 'Monthly' };
const packageShortLabels = { hourly: '2-4 hr', '12_hours': '8-12 hr', '24_hours': '24 hr', weekly: '7 days', monthly: '30 days' };
const parseStringArray = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
};
const toBoolean = (value, fallback = true) => value === undefined ? fallback : value === true || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'active';
const packagesPayload = (items) => Array.isArray(items) ? items.filter((item) => Object.hasOwn(packageHours, item.packageType)).map((item) => ({
  packageType: item.packageType,
  label: String(item.label || packageLabels[item.packageType] || item.packageType).trim(),
  shortLabel: String(item.shortLabel || packageShortLabels[item.packageType] || '').trim(),
  description: String(item.description || '').trim(),
  durationHours: Math.max(1, Number(item.durationHours) || packageHours[item.packageType]),
  price: Math.max(0, Number(item.price) || 0),
  priceUnit: String(item.priceUnit || (item.packageType === 'monthly' ? 'month' : item.packageType === '24_hours' ? 'day' : 'shift')).trim(),
  isPopular: toBoolean(item.isPopular, false),
  isActive: toBoolean(item.isActive),
})) : [];
const servicePayload = (body) => ({
  serviceName: String(body.serviceName || '').trim(),
  description: String(body.description || '').trim(),
  category: String(body.category || '').trim(),
  handlesText: String(body.handlesText || '').trim(),
  tags: parseStringArray(body.tags),
  defaultGenderPreference: ['Female', 'Male', 'Any'].includes(body.defaultGenderPreference) ? body.defaultGenderPreference : 'Any',
  shiftType: String(body.shiftType || '').trim(),
  durationHours: Number(body.durationHours),
  basePrice: Number(body.basePrice),
  basePriceUnit: String(body.basePriceUnit || 'shift').trim(),
  isActive: toBoolean(body.isActive),
  packages: packagesPayload(body.packages),
});
const addonPayload = (body) => ({ addOnName: String(body.addOnName || '').trim(), description: String(body.description || '').trim(), price: Number(body.price), isActive: toBoolean(body.isActive) });
const invalidService = (payload) => !payload.serviceName || !payload.category || !payload.shiftType || !(payload.durationHours > 0) || !(payload.basePrice >= 0);

export const getAdminCaretakerServices = async (_req, res) => res.json({ success: true, services: await CaretakerService.find().sort({ createdAt: -1 }) });
export const getActiveCaretakerServices = async (_req, res) => res.json({ success: true, services: await CaretakerService.find({ isActive: true }).sort({ category: 1, serviceName: 1 }) });
export const createCaretakerService = async (req, res) => {
  try {
    const payload = servicePayload(req.body);
    if (invalidService(payload)) return res.status(400).json({ success: false, message: 'Enter valid service, category, shift, duration and price' });
    res.status(201).json({ success: true, service: await CaretakerService.create(payload) });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to create caretaker service', error: error.message }); }
};
export const updateCaretakerService = async (req, res) => {
  try {
    const payload = servicePayload(req.body);
    if (invalidService(payload)) return res.status(400).json({ success: false, message: 'Enter valid service, category, shift, duration and price' });
    const service = await CaretakerService.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ success: false, message: 'Caretaker service not found' });
    res.json({ success: true, service });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to update caretaker service', error: error.message }); }
};
export const deactivateCaretakerService = async (req, res) => {
  const service = await CaretakerService.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!service) return res.status(404).json({ success: false, message: 'Caretaker service not found' });
  res.json({ success: true, service });
};
export const deleteCaretakerService = async (req, res) => {
  const service = await CaretakerService.findByIdAndDelete(req.params.id);
  if (!service) return res.status(404).json({ success: false, message: 'Caretaker service not found' });
  res.json({ success: true, message: 'Caretaker service deleted' });
};
export const getAdminCaretakerAddons = async (_req, res) => res.json({ success: true, addons: await CaretakerAddon.find().sort({ createdAt: -1 }) });
export const getActiveCaretakerAddons = async (_req, res) => res.json({ success: true, addons: await CaretakerAddon.find({ isActive: true }).sort({ addOnName: 1 }) });
export const createCaretakerAddon = async (req, res) => {
  const payload = addonPayload(req.body);
  if (!payload.addOnName || !(payload.price >= 0)) return res.status(400).json({ success: false, message: 'Enter valid add-on name and price' });
  res.status(201).json({ success: true, addon: await CaretakerAddon.create(payload) });
};
export const updateCaretakerAddon = async (req, res) => {
  const payload = addonPayload(req.body);
  if (!payload.addOnName || !(payload.price >= 0)) return res.status(400).json({ success: false, message: 'Enter valid add-on name and price' });
  const addon = await CaretakerAddon.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!addon) return res.status(404).json({ success: false, message: 'Caretaker add-on not found' });
  res.json({ success: true, addon });
};
export const deactivateCaretakerAddon = async (req, res) => {
  const addon = await CaretakerAddon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!addon) return res.status(404).json({ success: false, message: 'Caretaker add-on not found' });
  res.json({ success: true, addon });
};
export const deleteCaretakerAddon = async (req, res) => {
  const addon = await CaretakerAddon.findByIdAndDelete(req.params.id);
  if (!addon) return res.status(404).json({ success: false, message: 'Caretaker add-on not found' });
  res.json({ success: true, message: 'Caretaker add-on deleted' });
};
