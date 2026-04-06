import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateDemoDatasetSql } from './common.mjs';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(currentDir, 'generated');

const referenceDate = process.env.DEMO_REFERENCE_DATE
  ? new Date(process.env.DEMO_REFERENCE_DATE)
  : new Date();

if (Number.isNaN(referenceDate.getTime())) {
  console.error('Invalid DEMO_REFERENCE_DATE. Use an ISO-8601 timestamp or date.');
  process.exit(1);
}

try {
  const result = await generateDemoDatasetSql({ referenceDate });
  if (result.skipped) {
    console.log(JSON.stringify({
      action: 'demo-dataset-generate-sql',
      ...result,
    }, null, 2));
    process.exit(0);
  }

  await mkdir(outputDir, { recursive: true });

  const resetPath = path.join(outputDir, 'demo-dataset.reset.sql');
  const seedPath = path.join(outputDir, 'demo-dataset.seed.sql');
  const applyPath = path.join(outputDir, 'demo-dataset.apply.sql');
  const metadataPath = path.join(outputDir, 'demo-dataset.meta.json');

  await writeFile(resetPath, result.files.resetSql, 'utf8');
  await writeFile(seedPath, result.files.seedSql, 'utf8');
  await writeFile(applyPath, result.files.applySql, 'utf8');
  await writeFile(metadataPath, JSON.stringify({
    tenantId: result.tenantId,
    referenceDate: result.referenceDate,
    applied: result.applied,
    files: {
      reset: path.relative(process.cwd(), resetPath),
      seed: path.relative(process.cwd(), seedPath),
      apply: path.relative(process.cwd(), applyPath),
    },
  }, null, 2) + '\n', 'utf8');

  console.log(JSON.stringify({
    action: 'demo-dataset-generate-sql',
    tenantId: result.tenantId,
    referenceDate: result.referenceDate,
    applied: result.applied,
    files: {
      reset: resetPath,
      seed: seedPath,
      apply: applyPath,
      metadata: metadataPath,
    },
  }, null, 2));
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
