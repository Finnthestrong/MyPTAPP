/**
 * workout_media Supabase Storage 버킷 생성
 * 실행: node scripts/setup-storage.js <SUPABASE_PAT>
 */
const PAT = process.argv[2];
if (!PAT) { console.error("PAT 토큰을 인자로 전달해주세요.\n예) node scripts/setup-storage.js sbp_..."); process.exit(1); }

const PROJECT_REF = "yabjpwcjfgdljabmzjgf";

async function main() {
  console.log("workout_media 버킷 생성 중...");

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/storage/buckets`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "workout_media",
      name: "workout_media",
      public: true,
      fileSizeLimit: 209715200, // 200MB
      allowedMimeTypes: ["video/mp4", "video/quicktime", "video/webm", "video/*"],
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    if (json?.error?.includes("already exists") || json?.message?.includes("already exists")) {
      console.log("이미 존재하는 버킷입니다. 완료.");
    } else {
      throw new Error(JSON.stringify(json));
    }
  } else {
    console.log("버킷 생성 완료:", json.name || "workout_media");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
