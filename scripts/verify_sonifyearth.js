import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

console.log('--- RUNNING SONIFYEARTH SCIENTIFIC QA TEST SUITE ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

// 1. Check data files exist
const dataFiles = [
  'year_profiles.json',
  'rainfall_bd_yearly.json',
  'bangladesh_rain_data.json',
  'data_passport.json',
  'historical_events.json',
  'risk_rules.json',
  'daily_rainfall_2005_2026.json',
];

for (const file of dataFiles) {
  const p = path.join(root, 'data', file);
  assert(fs.existsSync(p), `Data file exists: ${file}`);
}

// 2. Load year_profiles.json and verify 2007 vs 2024 compare
const profilesData = JSON.parse(fs.readFileSync(path.join(root, 'data', 'year_profiles.json'), 'utf8'));
const p2007 = profilesData.profiles.find((p) => p.year === 2007);
const p2024 = profilesData.profiles.find((p) => p.year === 2024);
const p2026 = profilesData.profiles.find((p) => p.year === 2026);

assert(p2007 !== undefined, 'Year 2007 profile exists');
assert(p2024 !== undefined, 'Year 2024 profile exists');
assert(p2026 !== undefined, 'Year 2026 profile exists');

// Delta = B - A
const delta2007_2024 = p2024.annual_total_mm - p2007.annual_total_mm;
assert(delta2007_2024 < 0, `2007 vs 2024 Delta is negative: ${delta2007_2024.toFixed(2)} mm`);
assert(Math.abs(delta2007_2024 - (-87.97)) < 0.1, `Delta magnitude matches expected -87.97 mm`);

// Inverted Delta
const deltaInvert = p2007.annual_total_mm - p2024.annual_total_mm;
assert(Math.abs(deltaInvert - 87.97) < 0.1, `Inverted 2024 vs 2007 Delta is +87.97 mm`);

// 3. Verify 2026 common period
assert(p2026.coverage.includes('2026-09-24'), '2026 correctly notes coverage ends 2026-09-24');
const cp2024 = profilesData.common_period_profiles_2026.find((cp) => cp.year === 2024);
assert(cp2024 !== undefined, '2024 common period profile exists');
const cpDelta = profilesData['2026_common_period_total_mm'] - cp2024.period_total_mm;
assert(cpDelta < 0, `2026 YTD vs 2024 common period is negative: ${cpDelta.toFixed(2)} mm`);

// 4. Verify BMD risk rules
const riskRules = JSON.parse(fs.readFileSync(path.join(root, 'data', 'risk_rules.json'), 'utf8'));
assert(riskRules.classes.length === 3, 'Risk rules contains 3 BMD classes');
assert(riskRules.classes[0].id === 'light' && riskRules.classes[0].maxMm === 44, 'Light class threshold <= 44 mm');
assert(riskRules.classes[1].id === 'heavy' && riskRules.classes[1].maxMm === 88, 'Heavy class threshold 44-88 mm');
assert(riskRules.classes[2].id === 'very_heavy' && riskRules.classes[2].minMm === 88, 'Very Heavy class threshold > 88 mm');

// 5. Verify city audio files
const cities = ['Barisal', 'Chittagong', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet'];
for (const city of cities) {
  const p = path.join(root, 'audio', 'city', `rainfall_city_${city}.wav`);
  assert(fs.existsSync(p), `City audio file exists: ${city}`);
}

// 6. Verify 22 National audio files
for (let y = 2005; y <= 2026; y++) {
  const p = path.join(root, 'audio', 'national', `rainfall_BD_${y}.wav`);
  assert(fs.existsSync(p), `National audio file exists: ${y}`);
}

console.log(`\n🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% MATHEMATICAL INTEGRITY!`);
