import { supabase } from "./supabase"; // supabase 설정 파일 경로를 확인하세요

const SCOPE = "https://www.googleapis.com/auth/youtube.upload";

// 1. 구글 인증 여부 확인 (기존 함수 유지)
export function isGoogleAuthed() {
  // 세션에 provider_token이 있는지 확인하는 방식으로 변경하는 것이 가장 정확합니다.
  return false; // 매번 업로드 시 권한을 확인하도록 안전하게 설정
}

// 2. [핵심 교정] 구글 권한 요청 (모바일 하얀 화면 방지)
export async function preAuthGoogle() {
  console.log("모바일 호환 리디렉션 방식으로 구글 연결을 시작합니다...");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // [처방 1] 유튜브 업로드 권한을 명시적으로 요청
      scopes: SCOPE,
      // [처방 2] 모바일에서 하얀 화면이 되지 않도록 화면 자체를 이동시킴
      skipBrowserRedirect: false, 
      // [처방 3] 인증 완료 후 다시 돌아올 주소 (관리자 대시보드)
      redirectTo: window.location.origin + '/admin'
    }
  });

  if (error) throw error;
}

// 3. 유튜브 실제 업로드 함수
export async function uploadToYouTube(file, title) {
  // [처방 4] Supabase 세션에서 구글 토큰을 가져옵니다.
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.provider_token;

  if (!token) {
    throw new Error("구글 인증 토큰이 없습니다. 먼저 'Google 연결'을 해주세요.");
  }

  console.log("유튜브 업로드를 시작합니다...");

  // 1단계: 업로드 세션 생성
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": file.type || "video/mp4",
        "X-Upload-Content-Length": file.size,
      },
      body: JSON.stringify({
        snippet: { title, description: "PT 수업 운동 피드백 영상", categoryId: "17" },
        status: { privacyStatus: "unlisted", selfDeclaredMadeForKids: false },
      }),
    }
  );

  if (!initRes.ok) {
    if (initRes.status === 401) throw new Error("인증이 만료되었습니다. 다시 연결해 주세요.");
    throw new Error(`YouTube API 오류: ${initRes.status}`);
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) throw new Error("업로드 URL을 받지 못했습니다.");

  // 2단계: 실제 영상 데이터 전송
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "video/mp4" },
    body: file,
  });

  if (!uploadRes.ok) throw new Error(`업로드 실패: ${uploadRes.status}`);

  const data = await uploadRes.json();
  return `https://youtu.be/${data.id}`;
}