import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../config/DB.js';
import LabTest from '../models/LabTest.js';
import LabTestMaster from '../models/LabTestMaster.js';
import Provider from '../models/Provider.js';
import ProviderLabTest from '../models/ProviderLabTest.js';

const run = async () => {
  await connectDB();

  const legacyTests = await LabTest.find({}).sort({ testId: 1, testCode: 1 });
  const operations = legacyTests.map((test) => ({
    updateOne: {
      filter: { testId: test.testId },
      update: {
        $set: {
          testId: test.testId,
          testName: test.testName,
          category: test.category,
          description: test.description || '',
          parameters: test.parameters || [],
          recommendedFor: test.recommendedFor || [],
          status: test.status || 'active',
        },
      },
      upsert: true,
    },
  }));

  if (operations.length) await LabTestMaster.bulkWrite(operations);

  const masters = await LabTestMaster.find({});
  const masterByTestId = new Map(masters.map((test) => [test.testId, test]));
  const labProviders = await Provider.find({ category: /lab/i, status: 'approved' });

  const providerOps = [];
  labProviders.forEach((provider) => {
    legacyTests.forEach((legacy) => {
      const master = masterByTestId.get(legacy.testId);
      if (!master) return;
      providerOps.push({
        updateOne: {
          filter: { providerId: provider._id, labTestId: master._id },
          update: {
            $setOnInsert: {
              providerId: provider._id,
              labTestId: master._id,
              price: legacy.sellingPrice,
              originalPrice: legacy.originalPrice,
              discount: legacy.discount,
              city: legacy.city || provider.address?.city || provider.labServiceArea || 'Hindaun city',
              reportTime: legacy.reportTime,
              fastingRequired: legacy.fastingRequired,
              homeCollection: legacy.homeCollection,
              status: legacy.status || 'active',
            },
          },
          upsert: true,
        },
      });
    });
  });

  if (providerOps.length) await ProviderLabTest.bulkWrite(providerOps);

  console.log(`Master tests synced: ${operations.length}`);
  console.log(`Approved lab providers found: ${labProviders.length}`);
  console.log(`Provider lab offerings created/skipped: ${providerOps.length}`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
