// 유튜브 업로드 함수 (서버사이드 토큰 사용 - 사용자 Google 로그인 불필요)
export async function uploadToYouTube(file, title) {
  // 서버에서 access token 발급
  const tokenRes = await fetch("/api/get-yt-token");
  if (!tokenRes.ok) {
    throw new Error("유튜브 토큰 발급 실패. 관리자에게 문의하세요.");
  }
  const { access_token } = await tokenRes.json();

  console.log("유튜브 업로드를 시작합니다...");

  // 1단계: 업로드 세션 생성
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": file.type || "video/mp4",
        "X-Upload-Content-Length": file.size,
      },
      body: JSON.stringify({
        snippet: { title, description: "PT 수업 운동 피드백 영상" },
        status: { privacyStatus: "unlisted", selfDeclaredMadeForKids: false },
      }),
    }
  );

  if (!initRes.ok) {
    const errBody = await initRes.text();
    if (initRes.status === 401) throw new Error("유튜브 인증이 만료되었습니다. 관리자에게 문의하세요.");
    throw new Error(`YouTube API 오류: ${initRes.status} / ${errBody}`);
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
