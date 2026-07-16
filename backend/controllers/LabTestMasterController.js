import Counter from '../models/Counter.js';
import LabBooking from '../models/LabBooking.js';
import LabTestMaster from '../models/LabTestMaster.js';
import ProviderLabTest from '../models/ProviderLabTest.js';

const LAB_TEST_COUNTER_KEY = 'labTestId';
const formatLabTestId = (value) => `HT${String(value).padStart(4, '0')}`;
const MAX_IMPORT_ROWS = 5000;

const toArray = (value) => {
  if (!value) return [];
  const rawItems = Array.isArray(value) ? value : String(value).split(/[\n,;|]+/);
  return rawItems
    .flatMap((item) => String(item).split(/\s{2,}|\t+/))
    .map((item) => item.trim())
    .filter(Boolean);
};

const getNextLabTestId = async () => {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const counter = await Counter.findOneAndUpdate(
      { key: LAB_TEST_COUNTER_KEY },
      { $inc: { value: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const candidate = formatLabTestId(counter.value);
    const exists = await LabTestMaster.exists({ testId: candidate });
    if (!exists) return candidate;
  }

  const error = new Error('Unable to generate unique lab test ID');
  error.statusCode = 500;
  throw error;
};

const toBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') return defaultValue;
  return value === true || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'yes';
};

const toStatus = (value) => String(value || 'active').trim().toLowerCase();
const normalizeKeyPart = (value) => String(value || '').trim();
const normalizeTestId = (value) => normalizeKeyPart(value).toUpperCase();
const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
const parseNumber = (value) => Number(String(value ?? '').replace(/[^0-9.-]/g, '')) || 0;
const isFiniteNumber = (value) => Number.isFinite(parseNumber(value));
const calculateSellingPrice = (mrp, discount = 0) => {
  const baseMrp = Math.max(0, parseNumber(mrp));
  const discountPercent = Math.min(100, Math.max(0, parseNumber(discount)));
  return Math.max(0, Math.round(baseMrp - ((baseMrp * discountPercent) / 100)));
};
const calculateDiscount = (mrp, sellingPrice = 0) => {
  const baseMrp = Math.max(0, parseNumber(mrp));
  const offer = Math.max(0, parseNumber(sellingPrice));
  if (!baseMrp || offer >= baseMrp) return 0;
  return Math.round(((baseMrp - offer) / baseMrp) * 100);
};

const uniqueTripletQuery = ({ testId, testName, city }, excludeId = null) => {
  const filter = {
    testId: new RegExp(`^${escapeRegExp(normalizeTestId(testId))}$`, 'i'),
    testName: new RegExp(`^${escapeRegExp(normalizeKeyPart(testName))}$`, 'i'),
    city: new RegExp(`^${escapeRegExp(normalizeKeyPart(city))}$`, 'i'),
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return filter;
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validateLabTestPayload = (payload, { partial = false } = {}) => {
  const errors = [];
  const requiredFields = [
    ['testId', 'Test_ID/test code'],
    ['testName', 'Test_Name/test name'],
    ['city', 'City'],
    ['sellingPrice', 'Selling_Price/offer price'],
    ['mrp', 'MRP'],
  ];

  requiredFields.forEach(([key, label]) => {
    if (!partial || Object.prototype.hasOwnProperty.call(payload, key)) {
      if (isBlank(payload[key])) errors.push(`${label} is required`);
    }
  });

  if (!partial || Object.prototype.hasOwnProperty.call(payload, 'category')) {
    if (isBlank(payload.category)) errors.push('Category is required');
  }

  if (payload.sellingPrice !== undefined && (!isFiniteNumber(payload.sellingPrice) || parseNumber(payload.sellingPrice) < 0)) {
    errors.push('Selling_Price must be a valid non-negative number');
  }
  if (payload.mrp !== undefined && (!isFiniteNumber(payload.mrp) || parseNumber(payload.mrp) < 0)) {
    errors.push('MRP must be a valid non-negative number');
  }
  if (payload.discount !== undefined && (!isFiniteNumber(payload.discount) || parseNumber(payload.discount) < 0 || parseNumber(payload.discount) > 100)) {
    errors.push('Discount must be between 0 and 100');
  }

  return errors;
};

const sanitizePayload = (body = {}, existing = null) => {
  const includes = body.includes !== undefined ? toArray(body.includes) : undefined;
  const recommendedFor = body.recommendedFor !== undefined ? toArray(body.recommendedFor) : undefined;
  const mrp = body.mrp !== undefined ? parseNumber(body.mrp) : undefined;
  const explicitSellingPrice = body.sellingPrice !== undefined ? parseNumber(body.sellingPrice) : undefined;
  const discount = body.discount !== undefined
    ? parseNumber(body.discount)
    : explicitSellingPrice !== undefined || mrp !== undefined
      ? calculateDiscount(mrp ?? existing?.mrp, explicitSellingPrice ?? existing?.sellingPrice)
      : undefined;
  const sellingPrice = explicitSellingPrice !== undefined
    ? explicitSellingPrice
    : mrp !== undefined || discount !== undefined
      ? calculateSellingPrice(mrp ?? existing?.mrp, discount ?? existing?.discount)
      : undefined;

  return {
    ...(body.oldCode !== undefined && { oldCode: String(body.oldCode || '').trim().toUpperCase() }),
    ...(body.testId !== undefined && { testId: normalizeTestId(body.testId) }),
    ...(body.testName !== undefined && { testName: String(body.testName || '').trim() }),
    ...(body.category !== undefined && { category: String(body.category || '').trim() }),
    ...(body.description !== undefined && { description: String(body.description || '').trim() }),
    ...(includes !== undefined && { includes, parameters: includes }),
    ...(body.city !== undefined && { city: String(body.city || '').trim() }),
    ...(sellingPrice !== undefined && { sellingPrice }),
    ...(mrp !== undefined && { mrp }),
    ...(discount !== undefined && { discount }),
    ...(body.reportTime !== undefined && { reportTime: String(body.reportTime || '').trim() }),
    ...(body.sample !== undefined && { sample: String(body.sample || '').trim() }),
    ...(body.fasting !== undefined && { fasting: toBoolean(body.fasting, existing?.fasting || false) }),
    ...(body.homeCollection !== undefined && { homeCollection: toBoolean(body.homeCollection, existing?.homeCollection ?? true) }),
    ...(recommendedFor !== undefined && { recommendedFor }),
    ...(body.status !== undefined && { status: toStatus(body.status) }),
  };
};

const buildMasterQuery = (query) => {
  const filter = {};
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.category && query.category !== 'all') filter.category = new RegExp(`^${query.category}$`, 'i');
  if (query.city && query.city !== 'all') filter.city = new RegExp(`^${escapeRegExp(query.city)}$`, 'i');

  const term = String(query.q || query.search || '').trim();
  if (term) {
    filter.$or = [
      { testId: new RegExp(term, 'i') },
      { oldCode: new RegExp(term, 'i') },
      { testName: new RegExp(term, 'i') },
      { category: new RegExp(term, 'i') },
      { description: new RegExp(term, 'i') },
      { includes: new RegExp(term, 'i') },
      { parameters: new RegExp(term, 'i') },
      { sample: new RegExp(term, 'i') },
      { recommendedFor: new RegExp(term, 'i') },
    ];
  }
  return filter;
};

export const getAdminLabTests = async (req, res) => {
  try {
    const filter = buildMasterQuery(req.query);
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [tests, total, active, inactive, cities] = await Promise.all([
      LabTestMaster.find(filter).sort({ testId: 1, testName: 1, city: 1 }).skip(skip).limit(limit),
      LabTestMaster.countDocuments(filter),
      LabTestMaster.countDocuments({ ...filter, status: 'active' }),
      LabTestMaster.countDocuments({ ...filter, status: 'inactive' }),
      LabTestMaster.distinct('city', {}),
    ]);

    res.status(200).json({
      success: true,
      tests,
      total,
      counts: { total, active, inactive },
      cities: cities.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b))),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch master lab tests', error: error.message });
  }
};

export const createAdminLabTest = async (req, res) => {
  try {
    const testId = req.body.testId ? normalizeTestId(req.body.testId) : await getNextLabTestId();
    const payload = { ...sanitizePayload(req.body), testId };
    const validationErrors = validateLabTestPayload(payload);
    if (validationErrors.length) {
      return res.status(400).json({ success: false, message: validationErrors.join(', '), errors: validationErrors });
    }

    const exists = await LabTestMaster.exists(uniqueTripletQuery(payload));
    if (exists) {
      return res.status(409).json({ success: false, message: 'A lab test with the same Test_ID, Test_Name and City already exists' });
    }

    const test = await LabTestMaster.create({
      ...payload,
    });

    res.status(201).json({ success: true, message: 'Lab test created successfully', test });
  } catch (error) {
    res.status(error?.statusCode || (error?.code === 11000 ? 409 : 500)).json({
      success: false,
      message: error?.code === 11000 ? 'A lab test with the same Test_ID, Test_Name and City already exists' : 'Failed to create master lab test',
      error: error.message,
    });
  }
};

export const updateAdminLabTest = async (req, res) => {
  try {
    const current = await LabTestMaster.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Lab test not found' });

    const nextPayload = {
      testId: req.body.testId !== undefined ? normalizeTestId(req.body.testId) : current.testId,
      testName: req.body.testName !== undefined ? String(req.body.testName || '').trim() : current.testName,
      city: req.body.city !== undefined ? String(req.body.city || '').trim() : current.city,
      category: req.body.category !== undefined ? String(req.body.category || '').trim() : current.category,
      mrp: req.body.mrp !== undefined ? parseNumber(req.body.mrp) : current.mrp,
      sellingPrice: req.body.sellingPrice !== undefined ? parseNumber(req.body.sellingPrice) : current.sellingPrice,
    };
    nextPayload.discount = req.body.discount !== undefined
      ? parseNumber(req.body.discount)
      : calculateDiscount(nextPayload.mrp, nextPayload.sellingPrice);

    const validationErrors = validateLabTestPayload(nextPayload);
    if (validationErrors.length) {
      return res.status(400).json({ success: false, message: validationErrors.join(', '), errors: validationErrors });
    }

    const exists = await LabTestMaster.exists(uniqueTripletQuery(nextPayload, current._id));
    if (exists) {
      return res.status(409).json({ success: false, message: 'A lab test with the same Test_ID, Test_Name and City already exists' });
    }

    Object.assign(current, sanitizePayload(req.body, current));
    const test = await current.save();

    const providerPatch = {};
    if (req.body.sellingPrice !== undefined || req.body.mrp !== undefined || req.body.discount !== undefined) {
      providerPatch.price = test.sellingPrice;
      providerPatch.originalPrice = test.mrp;
      providerPatch.discount = test.discount;
    }
    if (req.body.city !== undefined) providerPatch.city = String(req.body.city || '').trim();
    if (req.body.reportTime !== undefined) providerPatch.reportTime = String(req.body.reportTime || '').trim();
    if (req.body.fasting !== undefined) providerPatch.fastingRequired = toBoolean(req.body.fasting);
    if (req.body.homeCollection !== undefined) providerPatch.homeCollection = toBoolean(req.body.homeCollection, true);
    if (req.body.status !== undefined) providerPatch.status = toStatus(req.body.status);

    if (Object.keys(providerPatch).length) {
      try {
        await ProviderLabTest.updateMany({ labTestId: test._id }, providerPatch, { runValidators: true });
      } catch (syncError) {
        console.error('Provider lab test sync failed:', syncError);
      }
    }

    res.status(200).json({ success: true, message: 'Lab test updated successfully', test });
  } catch (error) {
    res.status(error?.code === 11000 ? 409 : 500).json({
      success: false,
      message: error?.code === 11000 ? 'A lab test with the same Test_ID, Test_Name and City already exists' : 'Failed to update lab test',
      error: error.message,
    });
  }
};

export const importAdminLabTests = async (req, res) => {
  try {
    const rows = Array.isArray(req.body.tests) ? req.body.tests : [];
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'No lab tests provided for import' });
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return res.status(400).json({ success: false, message: `Import supports up to ${MAX_IMPORT_ROWS} rows at once` });
    }

    const errors = [];
    let created = 0;
    let updated = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = Number(rows[index]?.rowNumber || index + 2);
      const payload = sanitizePayload(rows[index]);
      payload.testId = normalizeTestId(rows[index].testId || rows[index].testCode);

      const validationErrors = validateLabTestPayload(payload);
      if (validationErrors.length) {
        errors.push({ rowNumber, errors: validationErrors });
        continue;
      }

      try {
        const existing = await LabTestMaster.findOne(uniqueTripletQuery(payload));
        if (existing) {
          Object.assign(existing, payload);
          await existing.save();
          updated += 1;

          await ProviderLabTest.updateMany({ labTestId: existing._id }, {
            price: payload.sellingPrice,
            originalPrice: payload.mrp,
            discount: payload.discount,
            city: payload.city,
            reportTime: payload.reportTime,
            fastingRequired: payload.fasting,
            homeCollection: payload.homeCollection,
            status: payload.status,
          }, { runValidators: true });
        } else {
          await LabTestMaster.create(payload);
          created += 1;
        }
      } catch (error) {
        errors.push({
          rowNumber,
          errors: [error?.code === 11000
            ? 'A lab test with the same Test_ID, Test_Name and City already exists'
            : error.message],
        });
      }
    }

    const statusCode = errors.length ? 400 : 200;
    res.status(statusCode).json({
      success: errors.length === 0,
      message: errors.length ? 'Import completed with validation errors' : 'Lab tests imported successfully',
      created,
      updated,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to import lab tests', error: error.message });
  }
};

export const updateAdminLabTestStatus = async (req, res) => {
  try {
    const status = toStatus(req.body.status);
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or inactive' });
    }

    const test = await LabTestMaster.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!test) return res.status(404).json({ success: false, message: 'Lab test not found' });
    try {
      await ProviderLabTest.updateMany({ labTestId: test._id }, { status }, { runValidators: true });
    } catch (syncError) {
      console.error('Provider lab test status sync failed:', syncError);
    }
    res.status(200).json({ success: true, message: `Lab test ${status === 'active' ? 'activated' : 'deactivated'}`, test });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update lab test status', error: error.message });
  }
};

export const deleteAdminLabTest = async (req, res) => {
  try {
    const test = await LabTestMaster.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Lab test not found' });

    const hasBooking = await LabBooking.exists({
      $or: [
        { 'tests.labTestId': test._id },
        { 'selectedTests.labTestId': test._id },
        { 'tests.testId': test.testId },
        { 'selectedTests.testId': test.testId },
      ],
    });

    if (hasBooking) {
      return res.status(409).json({
        success: false,
        message: 'This lab test has bookings. Deactivate it instead of deleting.',
      });
    }

    await ProviderLabTest.deleteMany({ labTestId: test._id });
    await test.deleteOne();

    res.status(200).json({ success: true, message: 'Lab test deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete lab test', error: error.message });
  }
};
