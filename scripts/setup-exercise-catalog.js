/**
 * exercise_catalog 테이블 생성 + 초기 데이터 삽입
 * 실행: node scripts/setup-exercise-catalog.js <SUPABASE_PAT>
 * PAT 발급: https://supabase.com/dashboard/account/tokens
 */
const PAT = process.argv[2];
if (!PAT) { console.error("PAT 토큰을 인자로 전달해주세요.\n예) node scripts/setup-exercise-catalog.js sbp_..."); process.exit(1); }

const PROJECT_REF = "yabjpwcjfgdljabmzjgf";
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function sql(query) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Authorization": `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(json));
  return json;
}

const EXERCISE_DB = {
  "가슴": {
    "덤벨": ["벤치 프레스","인클라인 프레스","디클라인 덤벨 프레스","덤벨 플라이","풀오버"],
    "바벨": ["벤치 프레스","인클라인 바벨 프레스","디클라인 바벨 프레스","클로즈 그립 벤치 프레스"],
    "머신": {
      "해머 스트렝스": ["iso-lateral 호리존탈 벤치 프레스","iso-lateral 슈퍼 인클라인 프레스","iso-lateral 인클라인 프레스","iso-lateral 디클라인 프레스","체스트 프레스 SE+","MTS 체스트 프레스","플라이 리어 델트"],
      "IKK": ["스댕 체스트 프레스"],
      "무브먼트": ["팩덱플라이-리어델트","오버해드 익스텐션 & 딥스"],
      "아스널 스트랭스": ["트라이셉스 & 딥스"],
    },
    "케이블": ["케이블 크로스 오버","로우 투 하이 케이블 플라이","하이 투 로우 케이블 플라이","케이블 체스트 프레스"],
    "프리웨이트&기타": ["푸쉬업","딥스"],
  },
  "어깨&팔": {
    "덤벨": ["숄더 프레스","오버헤드 프레스","사이드 레터럴 레이즈","프론트 레이즈","덤벨 컬","해머 컬","덤벨 킥백(삼두 컬)"],
    "바벨": ["오버헤드 프레스","업라이트 로우","바벨 컬","라잉 트라이셉스 익스텐션"],
    "머신": {
      "해머 스트렝스": ["숄더 프레스","플라이 리얼 델토이드","MTS 숄드 프레스"],
      "IKK": ["스댕 숄더 프레스","스탠딩 오버헤드프레스"],
      "무브먼트": ["팩덱플라이-리어델트","시티드 레터럴 레이즈","암컬"],
      "파나타": ["F/W 백 델토이드"],
    },
    "케이블": ["케이블 사이드 레터럴 레이즈","페이스 풀","케이블 이두 컬","케이블 트라이셉스 푸쉬다운"],
    "프리웨이트&기타": ["푸쉬업","플란체"],
  },
  "등": {
    "덤벨": ["원 암 덤벨 로우","덤벨 벤트 오버 로우","덤벨 슈러그"],
    "바벨": ["컨벤셔널 데드리프트","루마니안 데드리프트","스모 데드리프트","바벨 벤트 오버 로우","펜들레이 로우","바벨로우"],
    "머신": {
      "해머 스트렝스": ["iso lateral 프론트 렛풀다운","iso lateral 하이로우","iso lateral D.Y 로우","iso lateral 로우로우","iso lateral 로잉","시티드로우"],
      "IKK": ["티바 로우","스탠딩 친딥 어시스트"],
      "파나타": ["슈퍼 랫풀다운 써큘러","슈퍼 하이 로우","슈퍼 돌시 바"],
      "무브먼트": ["랫 풀 다운","멀티 리니어 로우","어드져스터블 로우플리"],
    },
    "케이블": ["랫 풀 다운","시티드 케이블 로우","암 풀 다운"],
    "프리웨이트&기타": ["풀업","친업","인버티드 로우"],
  },
  "하체": {
    "덤벨": ["불가리안 스플릿 스쿼트","덤벨 런지","덤벨 고블릿 스쿼트"],
    "바벨": ["컨벤셔널 데드 리프트","백 스쿼트","프론트 스쿼트","바벨 힙 쓰러스트"],
    "머신": {
      "파나타": ["슈퍼 레그 프레스-45도","듀얼 시스템","슈퍼 스쿼트 머신"],
      "해머 스트렝스": ["리니어 레그프레스","팬듈럼 스쿼트","Ground Base 스쿼트/런지","시티드 레그 컬","레그 익스텐션"],
      "IKK": ["3D 힙쓰러스트"],
      "무브먼트": ["시티드 레그프레스","라잉 레그컬","핵 스쿼트","핵 프레스","이너&아웃타이 콤보","링크 아웃타이(3D)","파워레그프레스"],
    },
    "케이블": ["케이블 풀 스루","케이블 킥백"],
    "프리웨이트&기타": ["스쿼트","런지","스텝업"],
  },
};

function buildRows() {
  const rows = [];
  for (const [region, tools] of Object.entries(EXERCISE_DB)) {
    for (const [equipment, value] of Object.entries(tools)) {
      if (typeof value === "object" && !Array.isArray(value)) {
        for (const [brand, exercises] of Object.entries(value)) {
          for (const name of exercises) {
            rows.push({ region, equipment_type: equipment, brand, exercise_name: name });
          }
        }
      } else {
        for (const name of value) {
          rows.push({ region, equipment_type: equipment, brand: null, exercise_name: name });
        }
      }
    }
  }
  return rows;
}

function escSql(s) { return s ? s.replace(/'/g, "''") : "NULL"; }

async function main() {
  console.log("1) exercise_catalog 테이블 생성 중...");
  await sql(`
    CREATE TABLE IF NOT EXISTS exercise_catalog (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      region text NOT NULL,
      equipment_type text NOT NULL,
      brand text,
      exercise_name text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE exercise_catalog DISABLE ROW LEVEL SECURITY;
  `);
  console.log("   테이블 생성 완료");

  console.log("2) 기존 데이터 초기화 중...");
  await sql("DELETE FROM exercise_catalog;");

  const rows = buildRows();
  console.log(`3) ${rows.length}개 운동 삽입 중...`);

  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = chunk.map(r =>
      `('${escSql(r.region)}', '${escSql(r.equipment_type)}', ${r.brand ? `'${escSql(r.brand)}'` : "NULL"}, '${escSql(r.exercise_name)}')`
    ).join(",\n");
    await sql(`INSERT INTO exercise_catalog (region, equipment_type, brand, exercise_name) VALUES ${values};`);
    process.stdout.write(`   ${Math.min(i + chunkSize, rows.length)} / ${rows.length}\r`);
  }

  console.log("\n완료! exercise_catalog 테이블 설정이 끝났습니다.");
}

main().catch((e) => { console.error(e); process.exit(1); });
