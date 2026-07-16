import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Provider from '../models/Provider.js';

dotenv.config();

const normalizeCategory = (value) => {
  const lower = String(value || '').trim().toLowerCase();
  if (lower === 'care taker' || lower === 'caretaker') return 'Caretaker';
  if (lower === 'physiotherapist' || lower === 'physiotherapy') return 'Physiotherapist';
  if (lower === 'nurse') return 'Nurse';
  if (lower === 'lab technician' || lower === 'lab') return 'Lab Technician';
  if (lower === 'ambulance') return 'Ambulance';
  if (lower === 'doctor') return 'Doctor';
  return String(value || '').trim();
};

const main = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const providers = await Provider.find({});
    let updatedCount = 0;

    for (const provider of providers) {
      const normalized = normalizeCategory(provider.category);
      if (normalized && normalized !== provider.category) {
        provider.category = normalized;
        await provider.save();
        updatedCount += 1;
      }
    }

    console.log(`Normalized ${updatedCount} provider categories.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to normalize provider categories:', error);
    process.exit(1);
  }
};

main();
