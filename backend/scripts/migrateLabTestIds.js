import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../config/DB.js';
import Counter from '../models/Counter.js';
import LabBooking from '../models/LabBooking.js';
import LabTest from '../models/LabTest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LAB_TEST_COUNTER_KEY = 'labTestId';
const formatLabTestId = (value) => `HT${String(value).padStart(4, '0')}`;

const getDatasetOrder = () => {
  const datasetPath = path.resolve(__dirname, 'lab-tests.json');
  if (!fs.existsSync(datasetPath)) return new Map();

  const rows = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  return new Map(rows.map((row, index) => [
    String(row.testCode || '').trim().toUpperCase(),
    index + 1,
  ]));
};

const run = async () => {
  await connectDB();

  const datasetOrder = getDatasetOrder();
  const tests = await LabTest.find({});
  const sortedTests = tests.sort((a, b) => {
    const aOrder = datasetOrder.get(a.testCode) || Number.MAX_SAFE_INTEGER;
    const bOrder = datasetOrder.get(b.testCode) || Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a.testCode).localeCompare(String(b.testCode));
  });

  const testIdByCode = new Map();

  await Promise.all(sortedTests.map((test) => (
    LabTest.updateOne(
      { _id: test._id },
      { $set: { testId: `MIGRATING_${test._id}` } },
      { runValidators: false }
    )
  )));

  let sequence = 0;
  for (const test of sortedTests) {
    sequence += 1;
    test.testId = formatLabTestId(sequence);
    await test.save();
    testIdByCode.set(test.testCode, test.testId);
  }

  const bookings = await LabBooking.find({ 'tests.testId': { $exists: false } });
  for (const booking of bookings) {
    let changed = false;
    booking.tests.forEach((item) => {
      if (!item.testId && item.testCode && testIdByCode.has(item.testCode)) {
        item.testId = testIdByCode.get(item.testCode);
        changed = true;
      }
    });
    if (changed) await booking.save();
  }

  await Counter.findOneAndUpdate(
    { key: LAB_TEST_COUNTER_KEY },
    { $max: { value: sequence } },
    { upsert: true }
  );

  console.log(`Migrated ${tests.length} lab tests to Health Touch IDs.`);
  console.log(`Updated counter ${LAB_TEST_COUNTER_KEY} to ${sequence}.`);
  console.log(`Checked ${bookings.length} existing lab bookings.`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
