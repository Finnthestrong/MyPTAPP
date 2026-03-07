import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function MemberLogin() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");

    const { data, error: dbError } = await supabase
      .from("members")
      .select("id, name, goal, sessions_total, sessions_used, start_date, end_date, status")
      .eq("access_code", code.trim().toUpperCase())
      .single();

    if (dbError || !data) {
      setError("코드를 찾을 수 없습니다. 트레이너에게 다시 확인해 주세요.");
      setLoading(false);
      return;
    }

    sessionStorage.setItem("pt_member", JSON.stringify(data));
    navigate("/member/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-2xl">💪</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">회원 전용</h1>
          <p className="text-sm text-gray-500 mt-1">PT Manager</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">접속 코드 입력</h2>
          <p className="text-xs text-gray-400 mb-5">트레이너에게 받은 코드를 입력하세요</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="예: AB1C2D"
              maxLength={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? "확인 중..." : "입장하기"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          코드가 없으신가요? 담당 트레이너에게 문의해 주세요.
        </p>
      </div>
    </div>
  );
}
