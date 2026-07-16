import LabTestMaster from '../models/LabTestMaster.js';
import Provider from '../models/Provider.js';
import ProviderLabTest from '../models/ProviderLabTest.js';

const isLabProvider = (provider) => /lab/i.test(String(provider?.category || ''));

const getApprovedLabProvider = async (userId) => {
  const provider = await Provider.findOne({ userId });
  if (!provider) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    throw error;
  }
  if (!isLabProvider(provider)) {
    const error = new Error('Only lab providers can manage lab tests');
    error.statusCode = 403;
    throw error;
  }
  if (provider.status !== 'approved') {
    const error = new Error('Provider must be approved to manage lab tests');
    error.statusCode = 403;
    throw error;
  }
  return provider;
};

export const getProviderMasterLabTests = async (req, res) => {
  try {
    await getApprovedLabProvider(req.user.id);
    const tests = await LabTestMaster.find({ status: 'active' }).sort({ testName: 1 });
    res.status(200).json({ success: true, tests });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const getMyProviderLabTests = async (req, res) => {
  try {
    const provider = await getApprovedLabProvider(req.user.id);
    const tests = await ProviderLabTest.find({ providerId: provider._id })
      .populate('labTestId')
      .sort({ updatedAt: -1 });
    res.status(200).json({ success: true, tests });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const addProviderLabTest = async (req, res) => {
  try {
    const provider = await getApprovedLabProvider(req.user.id);
    const master = await LabTestMaster.findById(req.body.labTestId);
    if (!master || master.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Active master lab test not found' });
    }

    const originalPrice = Number(req.body.originalPrice || req.body.price || 0);
    const price = Number(req.body.price || 0);
    const discount = req.body.discount !== undefined
      ? Number(req.body.discount)
      : originalPrice > 0 ? Math.max(Math.round(((originalPrice - price) / originalPrice) * 100), 0) : 0;

    const test = await ProviderLabTest.findOneAndUpdate(
      { providerId: provider._id, labTestId: master._id },
      {
        providerId: provider._id,
        labTestId: master._id,
        price: price || master.sellingPrice || 0,
        originalPrice: originalPrice || master.mrp || master.sellingPrice || 0,
        discount,
        city: req.body.city || master.city || provider.address?.city || provider.labServiceArea || 'Hindaun city',
        reportTime: req.body.reportTime || master.reportTime || provider.reportDeliveryTime || '24 hrs',
        fastingRequired: req.body.fastingRequired !== undefined ? req.body.fastingRequired === true || req.body.fastingRequired === 'true' : !!master.fasting,
        homeCollection: req.body.homeCollection !== undefined ? req.body.homeCollection !== false && req.body.homeCollection !== 'false' : master.homeCollection !== false,
        status: req.body.status || 'active',
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate('labTestId');

    res.status(201).json({ success: true, message: 'Provider lab test saved', test });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

export const updateProviderLabTest = async (req, res) => {
  try {
    const provider = await getApprovedLabProvider(req.user.id);
    const current = await ProviderLabTest.findOne({ _id: req.params.id, providerId: provider._id });
    if (!current) return res.status(404).json({ success: false, message: 'Provider lab test not found' });

    const patch = {};
    ['price', 'originalPrice', 'discount'].forEach((key) => {
      if (req.body[key] !== undefined) patch[key] = Number(req.body[key]);
    });
    ['city', 'reportTime', 'status'].forEach((key) => {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    });
    if (req.body.fastingRequired !== undefined) patch.fastingRequired = req.body.fastingRequired === true || req.body.fastingRequired === 'true';
    if (req.body.homeCollection !== undefined) patch.homeCollection = req.body.homeCollection === true || req.body.homeCollection === 'true';

    const test = await ProviderLabTest.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true })
      .populate('labTestId');

    res.status(200).json({ success: true, message: 'Provider lab test updated', test });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};
