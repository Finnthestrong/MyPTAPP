import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env 파일 파싱
const envContent = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
}

const ACCESS_TOKEN = process.argv[2] || env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];

if (!ACCESS_TOKEN) {
  console.error('❌ Supabase Access Token이 필요합니다.');
  console.error('   발급: https://supabase.com/dashboard/account/tokens');
  console.error('   사용: node scripts/setup-db.js <your-access-token>');
  process.exit(1);
}

if (!PROJECT_REF) {
  console.error('❌ .env에 VITE_SUPABASE_URL이 없습니다.');
  process.exit(1);
}

const SQL = `
CREATE TABLE IF NOT EXISTS members (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  phone text DEFAULT '',
  goal text DEFAULT '',
  sessions_total integer DEFAULT 0,
  sessions_used integer DEFAULT 0,
  start_date date,
  end_date date,
  status text DEFAULT 'active',
  memo text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workouts (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  member_id bigint NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date date NOT NULL,
  muscle_groups jsonb DEFAULT '[]',
  exercises jsonb DEFAULT '[]',
  photos jsonb DEFAULT '[]',
  note text DEFAULT '',
  signature text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workouts DISABLE ROW LEVEL SECURITY;
`;

console.log(`프로젝트: ${PROJECT_REF}`);
console.log('테이블 생성 중...');

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL }),
  }
);

if (res.ok) {
  console.log('✅ members, workouts 테이블 생성 완료!');
  console.log('   이제 npm run dev 로 앱을 시작하세요.');
} else {
  const err = await res.text();
  console.error('❌ 오류:', err);
  process.exit(1);
}
