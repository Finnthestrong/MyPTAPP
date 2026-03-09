const SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const HINT = "dmsmom1014@gmail.com";

let tokenClient = null;
let accessToken = null;
let tokenExpiry = 0;
let pendingResolve = null;
let pendingReject = null;

function initTokenClient() {
  if (tokenClient) return;
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    hint: HINT,
    callback: (res) => {
      if (res.error) {
        pendingReject?.(new Error(res.error_description || res.error));
      } else {
        accessToken = res.access_token;
        tokenExpiry = Date.now() + (res.expires_in - 60) * 1000;
        pendingResolve?.(accessToken);
      }
      pendingResolve = null;
      pendingReject = null;
    },
  });
}

function getAccessToken() {
  return new Promise((resolve, reject) => {
    if (accessToken && Date.now() < tokenExpiry) { resolve(accessToken); return; }
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google 로그인 준비 중입니다. 잠시 후 다시 시도해주세요."));
      return;
    }
    initTokenClient();
    pendingResolve = resolve;
    pendingReject = reject;
    tokenClient.requestAccessToken({ prompt: "select_account" });
  });
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
