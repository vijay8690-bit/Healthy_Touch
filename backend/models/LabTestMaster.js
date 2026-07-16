import mongoose from 'mongoose';

const LabTestMasterSchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  oldCode: {
    type: String,
    trim: true,
    uppercase: true,
  },
  testName: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  parameters: {
    type: [String],
    default: [],
  },
  includes: {
    type: [String],
    default: [],
  },
  city: {
    type: String,
    trim: true,
    default: '',
  },
  sellingPrice: {
    type: Number,
    min: 0,
    default: 0,
  },
  mrp: {
    type: Number,
    min: 0,
    default: 0,
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  reportTime: {
    type: String,
    trim: true,
    default: '',
  },
  sample: {
    type: String,
    trim: true,
    default: '',
  },
  fasting: {
    type: Boolean,
    default: false,
  },
  homeCollection: {
    type: Boolean,
    default: true,
  },
  recommendedFor: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
}, { timestamps: true });

LabTestMasterSchema.index({
  testId: 'text',
  testName: 'text',
  oldCode: 'text',
  category: 'text',
  description: 'text',
  parameters: 'text',
  includes: 'text',
  city: 'text',
  sample: 'text',
  recommendedFor: 'text',
});
LabTestMasterSchema.index({ category: 1, status: 1, city: 1 });
const CITY_WISE_UNIQUE_INDEX_NAME = 'labtest_city_price_unique';

LabTestMasterSchema.index(
  { testId: 1, testName: 1, city: 1 },
  { unique: true, name: CITY_WISE_UNIQUE_INDEX_NAME, collation: { locale: 'en', strength: 2 } }
);

const LabTestMaster = mongoose.model('LabTestMaster', LabTestMasterSchema);

export const ensureLabTestMasterIndexes = async () => {
  try {
    const indexes = await LabTestMaster.collection.indexes();
    const legacyUniqueTestIdIndex = indexes.find((index) => (
      index.unique === true
      && index.key
      && Object.keys(index.key).length === 1
      && index.key.testId === 1
    ));

    if (legacyUniqueTestIdIndex) {
      await LabTestMaster.collection.dropIndex(legacyUniqueTestIdIndex.name);
      console.log(`[LabTestMaster] Dropped legacy unique index ${legacyUniqueTestIdIndex.name}`);
    }
  } catch (error) {
    if (error?.codeName !== 'NamespaceNotFound') {
      console.error('[LabTestMaster] Failed to inspect legacy indexes:', error.message);
    }
  }

  try {
    await LabTestMaster.collection.createIndex(
      { testId: 1, testName: 1, city: 1 },
      { unique: true, name: CITY_WISE_UNIQUE_INDEX_NAME, collation: { locale: 'en', strength: 2 } }
    );
  } catch (error) {
    console.error('[LabTestMaster] Failed to ensure city-wise unique index:', error.message);
  }
};

export default LabTestMaster;
