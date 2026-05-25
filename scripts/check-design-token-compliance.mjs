import { readFileSync } from 'node:fs';

const targetFiles = [
  'src/app/page.tsx',
  'src/app/(auth)/layout.tsx',
  'src/app/(auth)/login/page.tsx',
  'src/app/(auth)/signup/page.tsx',
  'src/components/onboarding/ChatOnboardingFlow.tsx',
];

const allowlistedHex = new Set([
  '#0D4A34', '#2F7F5A', '#5DA0A2', '#F5F5ED', '#FBFBF8', '#1A1A1A', '#D9A441', '#0A0A0A',
  '#050706', '#0F1713', '#EEF2ED', '#F4F6F3', '#99A79F', '#2A3A30', '#75847B', '#6F8277', '#C7D2C8',
  '#D8E2DB', '#D6DFD8', '#EEF4EF', '#E4B8B0', '#F3E3E1', '#BE3F31', '#101915', '#C9D7CF', '#E7EFE9',
  '#6F7A73', '#F1F5F0', '#96A39C'
]);

const hexRegex = /#[0-9a-fA-F]{6}\b/g;
const violations = [];

for (const file of targetFiles) {
  const content = readFileSync(file, 'utf8');
  const matches = content.match(hexRegex) || [];
  for (const match of matches) {
    const normalized = match.toUpperCase();
    if (!allowlistedHex.has(normalized)) {
      violations.push(`${file}: disallowed hex ${match}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Design token compliance failed:\n' + violations.join('\n'));
  process.exit(1);
}

console.log(`Design token compliance passed for ${targetFiles.length} targeted UI files.`);
