let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch("/api/get-yt-token");
  if (!res.ok) throw new Error("액세스 토큰 요청 실패");

  const { access_token, expires_in } = await res.json();
  cachedToken = access_token;
  tokenExpiry = Date.now() + (expires_in - 60) * 1000;
  return cachedToken;
}

export async function uploadToYouTube(file, title) {
  const token = await getAccessToken();

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

  if (!initRes.ok) throw new Error(`YouTube API 오류: ${initRes.status}`);

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) throw new Error("업로드 URL을 받지 못했습니다");

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "video/mp4" },
    body: file,
  });

  if (!uploadRes.ok) throw new Error(`업로드 실패: ${uploadRes.status}`);

  const data = await uploadRes.json();
  if (!data.id) throw new Error("YouTube 응답에 영상 ID가 없습니다");

  return `https://youtu.be/${data.id}`;
}
