// update-versions.js
import { readFileSync, writeFileSync } from 'fs';

const newVersion = process.argv[2];
if (!newVersion) {
  console.error('Error: No version number.');
  process.exit(1);
}

const packageJsonPath = 'package.json';
try {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = newVersion;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`package.json updated to ${newVersion}`);
} catch (error) {
  console.error('Error updating package.json:', error);
  process.exit(1);
}

const manifestPath = 'manifest.json';
try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.version = newVersion;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t'));
  console.log(`manifest.json updated to ${newVersion}`);
} catch (error) {
  console.error('Error updating manifest.json:', error);
  process.exit(1);
}

const versionsPath = 'versions.json';
try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const minAppVersion = manifest.minAppVersion;
  if (!minAppVersion) {
    throw new Error('Property "minAppVersion" not found in manifest.json');
  }

  const versions = JSON.parse(readFileSync(versionsPath, 'utf8'));
  versions[newVersion] = minAppVersion;
  writeFileSync(versionsPath, JSON.stringify(versions, null, '\t'));
  console.log(`versions.json updated to ${newVersion}`);
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.error('Error updating versions.json:', error);
    process.exit(1);
  } else {
    console.log('versions.json not found, skip updating.');
  }
}
