import { applyDemoDataset, closeDemoDatasetPool } from './common.mjs';

try {
  const result = await applyDemoDataset();
  console.log(JSON.stringify({
    action: 'demo-dataset-finalize',
    ...result,
  }, null, 2));
  await closeDemoDatasetPool();
} catch (error) {
  await closeDemoDatasetPool();
  console.error(error.message || error);
  process.exit(1);
}
