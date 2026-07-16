import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/DB.js';
import LabTest from '../models/LabTest.js';
import Counter from '../models/Counter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, 'lab-tests.sample.json');

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
};

const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', '1', 'required', 'available'].includes(String(value).trim().toLowerCase());
};

const parseCsv = (content) => {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);

  const [headers = [], ...dataRows] = rows;
  return dataRows.map((values) => headers.reduce((record, header, index) => {
    record[header] = values[index] || '';
    return record;
  }, {}));
};

const parseDataset = (inputFilePath) => {
  const raw = fs.readFileSync(inputFilePath, 'utf8');
  if (inputFilePath.toLowerCase().endsWith('.csv')) return parseCsv(raw);
  return JSON.parse(raw);
};

const LAB_TEST_COUNTER_KEY = 'labTestId';
const formatLabTestId = (value) => `HT${String(value).padStart(4, '0')}`;

const extractLabTestSequence = (testId) => {
  const match = String(testId || '').match(/^HT(\d+)$/i);
  return match ? Number(match[1]) : 0;
};

const run = async () => {
  await connectDB();

  if (!fs.existsSync(inputPath)) {
    console.error(`Dataset not found: ${inputPath}`);
    process.exit(1);
  }

  const records = parseDataset(inputPath);

  if (!Array.isArray(records)) {
    console.error('Dataset must be a JSON array');
    process.exit(1);
  }

  const existingTests = await LabTest.find({})
    .select('testCode testId')
    .sort({ createdAt: 1, testCode: 1 })
    .lean();

  const testIdByCode = new Map();
  let maxSequence = 0;
  existingTests.forEach((test) => {
    if (test.testCode && test.testId) {
      testIdByCode.set(test.testCode, test.testId);
      maxSequence = Math.max(maxSequence, extractLabTestSequence(test.testId));
    }
  });

  const recordsWithIds = records.map((item) => {
    const testCode = String(item.testCode).trim().toUpperCase();
    const explicitTestId = String(item.testId || '').trim().toUpperCase();
    const testId = explicitTestId || testIdByCode.get(testCode) || formatLabTestId(maxSequence += 1);
    maxSequence = Math.max(maxSequence, extractLabTestSequence(testId));
    testIdByCode.set(testCode, testId);
    return { ...item, testCode, testId };
  });

  const operations = recordsWithIds.map((item) => ({
    updateOne: {
      filter: { testCode: item.testCode },
      update: {
        $set: {
          testId: item.testId,
          testCode: item.testCode,
          testName: item.testName,
          category: item.category,
          description: item.description || '',
          parameters: normalizeList(item.parameters),
          city: item.city,
          sellingPrice: Number(item.sellingPrice || 0),
          originalPrice: Number(item.originalPrice || item.sellingPrice || 0),
          discount: Number(item.discount || 0),
          reportTime: item.reportTime || '24 hours',
          fastingRequired: normalizeBoolean(item.fastingRequired),
          homeCollection: normalizeBoolean(item.homeCollection),
          recommendedFor: normalizeList(item.recommendedFor),
          status: item.status || 'active',
          isPopular: normalizeBoolean(item.isPopular),
          isRecommendedPackage: normalizeBoolean(item.isRecommendedPackage),
          isFullBodyPackage: normalizeBoolean(item.isFullBodyPackage),
        },
      },
      upsert: true,
    },
  }));

  const result = operations.length ? await LabTest.bulkWrite(operations) : null;
  await Counter.findOneAndUpdate(
    { key: LAB_TEST_COUNTER_KEY },
    { $max: { value: maxSequence } },
    { upsert: true }
  );
  console.log(`Imported ${operations.length} lab tests from ${inputPath}`);
  if (result) {
    console.log(`Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`);
  }
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
