import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import WorkoutForm from "../components/WorkoutForm";

const STATUS_CONFIG = {
  active: { label: "활성", className: "bg-green-100 text-green-700" },
  expiring: { label: "만료 임박", className: "bg-yellow-100 text-yellow-700" },
  expired: { label: "만료", className: "bg-red-100 text-red-600" },
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function calcVolume(exercises) {
  return (exercises || []).reduce((sum, ex) => {
    const entries = ex.entries?.length
      ? ex.entries
      : [{ weight: ex.weight, sets: ex.sets, reps: ex.reps }];
    return sum + entries.reduce((s, e) =>
      s + (parseFloat(e.weight) || 0) * (parseInt(e.sets) || 0) * (parseInt(e.reps) || 0), 0);
  }, 0);
}

function WorkoutCard({ workout }) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const volume = calcVolume(workout.exercises);
  const isPT = (workout.workout_type || 'pt') === 'pt';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="text-left">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-bold text-gray-800">{formatDate(workout.date)}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isPT ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}>
              {isPT ? "PT" : "개인"}
            </span>
          </div>
          <p className="text-xs text-gray-400">{(workout.exercises || []).length}개 운동</p>
        </div>
        <div className="flex items-center gap-2">
          {volume > 0 && (
            <span className="text-xs font-semibold text-blue-600">{volume.toLocaleString()}kg</span>
          )}
          <span className="text-gray-300 text-xs ml-1">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
          {workout.muscle_groups?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-3">
              {workout.muscle_groups.map((g) => (
                <span key={g} className="text-xs bg-blue-50 text-blue-600 font-medium px-2.5 py-1 rounded-full">{g}</span>
              ))}
            </div>
          )}

          {workout.exercises?.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400">
                    <th className="text-left px-3 py-2 font-medium">운동</th>
                    <th className="px-3 py-2 font-medium text-center">무게</th>
                    <th className="px-3 py-2 font-medium text-center">세트</th>
                    <th className="px-3 py-2 font-medium text-center">횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {workout.exercises.flatMap((ex, i) => {
                    const entries = ex.entries?.length
                      ? ex.entries
                      : [{ id: "legacy", weight: ex.weight, sets: ex.sets, reps: ex.reps }];
                    return entries.map((entry, j) => (
                      <tr key={`${i}-${j}`} className="border-t border-gray-100">
                        {j === 0 && (
                          <td className="px-3 py-2 font-medium text-gray-800" rowSpan={entries.length}>
                            {ex.name}
                          </td>
                        )}
                        <td className="px-3 py-2 text-center text-gray-600">{entry.weight ? `${entry.weight}kg` : "-"}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{entry.sets ? `${entry.sets}세트` : "-"}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{entry.reps ? `${entry.reps}개` : "-"}</td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}

          {workout.photos?.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {workout.photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightbox(p.url)}
                  className="aspect-square rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <img src={p.url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                </button>
              ))}
            </div>
          )}

          {workout.note && (
            <div className="bg-yellow-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-yellow-700 font-medium mb-0.5">메모</p>
              <p className="text-sm text-gray-700">{workout.note}</p>
            </div>
          )}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg" />
          <button className="absolute top-4 right-4 text-white text-3xl leading-none">&times;</button>
        </div>
      )}
    </div>
  );
}

export default function MemberDashboard() {
  const [member, setMember] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem("pt_member");
    if (!stored) { navigate("/member"); return; }
    loadData(JSON.parse(stored));
  }, []);

  async function loadData(stored) {
    setLoading(true);
    const [{ data: memberData }, { data: workoutsData }] = await Promise.all([
      supabase.from("members").select("*").eq("id", stored.id).single(),
      supabase.from("workouts").select("*").eq("member_id", stored.id).order("date", { ascending: false }),
    ]);
    if (!memberData) { navigate("/member"); return; }
    setMember(memberData);
    setWorkouts(workoutsData ?? []);
    setLoading(false);
  }

  const handleAddPersonalWorkout = async (log) => {
    const stored = JSON.parse(sessionStorage.getItem("pt_member"));
    const { data } = await supabase
      .from("workouts")
      .insert({
        member_id: stored.id,
        workout_type: 'personal',
        date: log.date,
        muscle_groups: log.muscleGroups,
        exercises: log.exercises,
        photos: log.photos,
        note: log.note,
        signature: log.signature,
      })
      .select()
      .single();
    if (data) setWorkouts((prev) => [data, ...prev]);
    setShowWorkoutForm(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("pt_member");
    navigate("/member");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">불러오는 중...</p>
      </div>
    );
  }

  const sessionsTotal = Number(member.sessions_total);
  const sessionsUsed = Number(member.sessions_used);
  const remaining = sessionsTotal - sessionsUsed;
  const progress = sessionsTotal > 0 ? Math.round((sessionsUsed / sessionsTotal) * 100) : 0;
  const cfg = STATUS_CONFIG[member.status] || STATUS_CONFIG.active;
  const totalVolume = workouts.reduce((sum, w) => sum + calcVolume(w.exercises), 0);

  const personalWorkouts = workouts.filter((w) => w.workout_type === 'personal');
  const personalInPeriod = personalWorkouts.filter((w) =>
    (!member.start_date || w.date >= member.start_date) &&
    (!member.end_date || w.date <= member.end_date)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">회원 전용</p>
            <h1 className="text-lg font-bold text-gray-900">안녕하세요, {member.name}님!</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* PT 세션 현황 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">PT 세션 현황</h2>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}>{cfg.label}</span>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold text-gray-900">{sessionsUsed}</span>
            <span className="text-gray-400 text-sm mb-1">/ {sessionsTotal}회</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
            <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>완료 {sessionsUsed}회</span>
            <span>잔여 <span className="font-semibold text-gray-600">{remaining}회</span></span>
          </div>
        </div>

        {/* 개인 운동 현황 */}
        <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">개인 운동 현황</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">이번 기간 개인 운동</p>
              <p className="text-2xl font-bold text-green-600">{personalInPeriod.length}<span className="text-sm font-normal text-gray-400 ml-1">회</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">누적 개인 운동</p>
              <p className="text-2xl font-bold text-gray-700">{personalWorkouts.length}<span className="text-sm font-normal text-gray-400 ml-1">회</span></p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">목표</p>
            <p className="text-sm font-semibold text-gray-800">{member.goal || "-"}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">누적 볼륨</p>
            <p className="text-sm font-semibold text-blue-600">
              {totalVolume > 0 ? `${totalVolume.toLocaleString()}kg` : "-"}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">시작일</p>
            <p className="text-sm font-semibold text-gray-800">{formatDate(member.start_date)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">종료일</p>
            <p className="text-sm font-semibold text-gray-800">{formatDate(member.end_date)}</p>
          </div>
        </div>

        {/* Workout History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">운동 기록</h2>
            <span className="text-xs text-gray-400">총 {workouts.length}회</span>
          </div>

          <button
            onClick={() => setShowWorkoutForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-sm font-medium text-white transition-colors mb-3"
          >
            + 개인 운동 기록 추가
          </button>

          {workouts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center text-gray-400">
              <div className="text-4xl mb-3">🏋️</div>
              <p className="text-sm font-medium">아직 운동 기록이 없어요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workouts.map((w) => (
                <WorkoutCard key={w.id} workout={w} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showWorkoutForm && (
        <WorkoutForm
          isPersonal
          onClose={() => setShowWorkoutForm(false)}
          onSave={handleAddPersonalWorkout}
        />
      )}
    </div>
  );
}
