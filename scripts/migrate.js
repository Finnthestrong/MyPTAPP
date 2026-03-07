import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
}

const ACCESS_TOKEN = process.argv[2] || env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

if (!ACCESS_TOKEN) {
  console.error('사용법: node scripts/migrate.js <access-token>');
  process.exit(1);
}

const SQL = `
ALTER TABLE members ADD COLUMN IF NOT EXISTS access_code text UNIQUE;
`;

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SQL }),
  }
);

if (res.ok) {
  console.log('✅ access_code 컬럼 추가 완료');
} else {
  console.error('❌ 오류:', await res.text());
  process.exit(1);
}
