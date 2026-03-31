import { verifyDemoDataset, closeDemoDatasetPool } from './common.mjs';

try {
  const result = await verifyDemoDataset();
  console.log(JSON.stringify({
    action: 'demo-dataset-verify',
    ...result,
  }, null, 2));
  await closeDemoDatasetPool();
  if (!result.skipped && !result.passed) process.exit(1);
} catch (error) {
  await closeDemoDatasetPool();
  console.error(error.message || error);
  process.exit(1);
}
