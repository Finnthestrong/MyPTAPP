import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import WorkoutForm from "../components/WorkoutForm";

const STATUS_CONFIG = {
  active: { label: "활성", className: "bg-green-100 text-green-700" },
  expiring: { label: "만료 임박", className: "bg-yellow-100 text-yellow-700" },
  expired: { label: "만료", className: "bg-red-100 text-red-600" },
};

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/);
  return m ? m[1] : null;
}

function VideoPlayer({ url, maxHeight = 220 }) {
  if (!url) return null;
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingTop: "56.25%" }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&showinfo=0&iv_load_policy=3`}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return <video src={url} controls className="w-full rounded-xl bg-black mb-2" style={{ maxHeight }} />;
}

function groupByRegionAndTool(exercises) {
  const groups = {};
  const order = [];
  exercises.forEach((ex) => {
    const region = ex.drillBodyPart === "기타 부위"
      ? (ex.drillCustomBodyPart || "기타")
      : (ex.drillBodyPart || "기타");
    const tool = ex.drillTool || "";
    const key = `${region}|||${tool}`;
    if (!groups[key]) { groups[key] = { region, tool, items: [] }; order.push(key); }
    groups[key].items.push(ex);
  });
  return order.map((k) => groups[k]);
}

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

function WorkoutCard({ workout, onEdit }) {
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
                    <th className="px-3 py-2 font-medium text-center">무게/강도</th>
                    <th className="px-3 py-2 font-medium text-center">횟수/시간</th>
                    <th className="px-3 py-2 font-medium text-center">세트</th>
                  </tr>
                </thead>
                <tbody>
                  {workout.exercises.flatMap((ex, i) => {
                    const isStretch = ex.type === "stretch";
                    const isCardio = ex.type === "cardio";
                    const entries = ex.entries?.length
                      ? ex.entries
                      : [{ id: "legacy", weight: ex.weight, sets: ex.sets, reps: ex.reps }];
                    return entries.map((entry, j) => (
                      <tr key={`${i}-${j}`} className="border-t border-gray-100">
                        {j === 0 && (
                          <td className="px-3 py-2 font-medium text-gray-800" rowSpan={entries.length}>
                            <div>{ex.name}</div>
                            {isStretch && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">스트레칭</span>}
                            {isCardio && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">유산소</span>}
                            {ex.exerciseNote && <div className="text-xs text-gray-400 mt-0.5">{ex.exerciseNote}</div>}
                          </td>
                        )}
                        {isStretch ? (
                          <>
                            <td className="px-3 py-2 text-center text-gray-600">{entry.bodyPart || "-"}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{entry.duration ? `${entry.duration}분` : "-"}</td>
                            <td className="px-3 py-2 text-center text-gray-400">-</td>
                          </>
                        ) : isCardio ? (
                          <>
                            <td className="px-3 py-2 text-center text-gray-600">{entry.intensity ? `강도 ${entry.intensity}` : "-"}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{entry.duration ? `${entry.duration}분` : "-"}</td>
                            <td className="px-3 py-2 text-center text-gray-400">-</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-center text-gray-600">{entry.weight ? `${entry.weight}kg` : "-"}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{entry.reps ? `${entry.reps}개` : "-"}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{entry.sets ? `${entry.sets}세트` : "-"}</td>
                          </>
                        )}
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

          {!isPT && onEdit && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => onEdit(workout)}
                className="text-xs text-green-600 font-medium border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-50 transition-colors"
              >
                수정
              </button>
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

function VolumeChart({ workouts, onClose }) {
  const data = useMemo(() => {
    const byDate = {};
    workouts.forEach((w) => {
      const vol = calcVolume(w.exercises);
      if (vol > 0) byDate[w.date] = (byDate[w.date] || 0) + vol;
    });
    const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    let cumSum = 0;
    return sorted.map(([date, vol], i) => {
      cumSum += vol;
      return { date, avgVol: Math.round(cumSum / (i + 1)) };
    });
  }, [workouts]);

  if (data.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center px-4" onClick={onClose}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-md text-center" onClick={(e) => e.stopPropagation()}>
          <p className="text-gray-400 text-sm mb-4">볼륨 데이터가 없습니다.</p>
          <button onClick={onClose} className="text-sm text-blue-600 font-medium">닫기</button>
        </div>
      </div>
    );
  }

  const W = 320, H = 180, padL = 52, padR = 16, padT = 16, padB = 36;
  const iW = W - padL - padR;
  const iH = H - padT - padB;
  const maxY = Math.max(...data.map((d) => d.avgVol));
  const minY = 0;
  const range = maxY - minY || 1;

  const px = (i) => padL + (i / Math.max(data.length - 1, 1)) * iW;
  const py = (v) => padT + iH - ((v - minY) / range) * iH;

  const points = data.map((d, i) => `${px(i)},${py(d.avgVol)}`).join(" ");

  const yTicks = 4;
  const xLabelStep = Math.max(1, Math.ceil(data.length / 5));

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800">일 평균 볼륨 추이</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const v = minY + (range * i) / yTicks;
            const y = py(v);
            return (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#f0f0f0" strokeWidth="1" />
                <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">
                  {Math.round(v).toLocaleString()}
                </text>
              </g>
            );
          })}

          <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {data.map((d, i) => (
            <circle key={i} cx={px(i)} cy={py(d.avgVol)} r="3" fill="#3b82f6" />
          ))}

          {data.map((d, i) =>
            i % xLabelStep === 0 ? (
              <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#9ca3af">
                {d.date.slice(5)}
              </text>
            ) : null
          )}
        </svg>
        <p className="text-xs text-gray-400 text-center mt-1">날짜별 누적 일 평균 볼륨 (kg)</p>
      </div>
    </div>
  );
}

export default function MemberDashboard() {
  const [member, setMember] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [feedbackTab, setFeedbackTab] = useState("전체");
  const [expandedDates, setExpandedDates] = useState(() => new Set([new Date().toISOString().slice(0, 10)]));
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

  const handleEditPersonalWorkout = async (log) => {
    const { data } = await supabase
      .from("workouts")
      .update({
        date: log.date,
        muscle_groups: log.muscleGroups,
        exercises: log.exercises,
        photos: log.photos,
        note: log.note,
      })
      .eq("id", log.id)
      .select()
      .single();
    if (data) setWorkouts((prev) => prev.map((w) => w.id === data.id ? data : w));
    setEditingWorkout(null);
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
  const workoutDaysWithVolume = new Set(workouts.filter((w) => calcVolume(w.exercises) > 0).map((w) => w.date)).size;
  const avgDailyVolume = workoutDaysWithVolume > 0 ? Math.round(totalVolume / workoutDaysWithVolume) : 0;

  const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const thisMonthPersonal = workouts.filter((w) => w.workout_type === 'personal' && w.date?.startsWith(thisMonth));
  const thisMonthTotal = workouts.filter((w) => w.date?.startsWith(thisMonth));

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
          <h2 className="text-sm font-semibold text-gray-700 mb-3">이번달 운동 현황</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">이번달 개인 운동</p>
              <p className="text-2xl font-bold text-green-600">{thisMonthPersonal.length}<span className="text-sm font-normal text-gray-400 ml-1">회</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">이번달 총 운동</p>
              <p className="text-2xl font-bold text-gray-700">{thisMonthTotal.length}<span className="text-sm font-normal text-gray-400 ml-1">회</span></p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">목표</p>
            <p className="text-sm font-semibold text-gray-800">{member.goal || "-"}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowChart(true)}
            className="bg-white rounded-2xl p-4 border border-gray-100 text-left hover:bg-blue-50 hover:border-blue-200 transition-colors"
          >
            <p className="text-xs text-gray-400 mb-1">일 평균 볼륨 ↗</p>
            <p className="text-sm font-semibold text-blue-600">
              {avgDailyVolume > 0 ? `${avgDailyVolume.toLocaleString()}kg` : "-"}
            </p>
          </button>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">시작일</p>
            <p className="text-sm font-semibold text-gray-800">{formatDate(member.start_date)}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 mb-1">종료일</p>
            <p className="text-sm font-semibold text-gray-800">{formatDate(member.end_date)}</p>
          </div>
        </div>

        {/* 수업 피드백 (전체 누적) */}
        {(() => {
          const todayStr = new Date().toISOString().slice(0, 10);
          const allPT = workouts.filter((w) => w.workout_type === "pt");
          const allExWithDate = allPT.flatMap((w) =>
            (w.exercises || []).map((ex) => ({ ...ex, workoutDate: w.date }))
          );
          if (allExWithDate.length === 0) return null;

          function getCategory(ex) {
            if (ex.type === "stretch") return "스트레칭&재활";
            if (ex.type === "cardio") return "유산소";
            if (ex.drillBodyPart === "기타 부위") return ex.drillCustomBodyPart || "기타";
            return ex.drillBodyPart || "기타";
          }

          const uniqueCats = [...new Set(allExWithDate.map(getCategory))];
          const tabs = ["전체", ...uniqueCats];

          const filtered = feedbackTab === "전체"
            ? allExWithDate
            : allExWithDate.filter((ex) => getCategory(ex) === feedbackTab);

          // 날짜별 그룹 (최신순)
          const byDate = {};
          filtered.forEach((ex) => {
            if (!byDate[ex.workoutDate]) byDate[ex.workoutDate] = [];
            byDate[ex.workoutDate].push(ex);
          });
          const sortedDates = Object.keys(byDate).sort().reverse();

          return (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-gray-700">수업 피드백</h2>
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">PT</span>
              </div>

              {/* 부위별 탭 */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: "none" }}>
                {tabs.map((tab) => (
                  <button key={tab} type="button" onClick={() => setFeedbackTab(tab)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      feedbackTab === tab
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* 날짜별 카드 */}
              <div className="space-y-2">
                {sortedDates.map((date) => {
                  const groups = groupByRegionAndTool(byDate[date]);
                  const isToday = date === todayStr;
                  const isExpanded = expandedDates.has(date);
                  const exCount = byDate[date].length;
                  const hasFeedback = byDate[date].some((ex) => ex.feedbackPros || ex.feedbackCons || ex.videoUrl);

                  return (
                    <div key={date} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      {/* 헤더 — 항상 보임, 클릭으로 토글 */}
                      <button
                        type="button"
                        onClick={() => setExpandedDates((prev) => {
                          const next = new Set(prev);
                          next.has(date) ? next.delete(date) : next.add(date);
                          return next;
                        })}
                        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isToday ? "bg-blue-50 hover:bg-blue-100" : "bg-gray-50 hover:bg-gray-100"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${isToday ? "text-blue-700" : "text-gray-700"}`}>
                            {formatDate(date)}
                          </span>
                          {isToday && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">오늘</span>}
                          {hasFeedback && !isToday && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">피드백 있음</span>}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{exCount}개 운동</span>
                          <span>{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {/* 상세 내용 — 펼쳐졌을 때만 보임 */}
                      {isExpanded && (
                        <div className="p-4 space-y-4 border-t border-gray-100">
                          {groups.map((group, gi) => (
                            <div key={gi} className={gi > 0 ? "pt-3 border-t border-gray-100" : ""}>
                              {feedbackTab === "전체" && (
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="text-xs font-semibold text-gray-500">{group.region}</span>
                                  {group.tool && <span className="text-xs text-gray-400">· {group.tool}</span>}
                                </div>
                              )}
                              <div className="space-y-3">
                                {group.items.map((ex, ei) => (
                                  <div key={ei} className={ei > 0 ? "pt-2 border-t border-gray-50" : ""}>
                                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                      <p className="text-sm font-semibold text-gray-800">{ex.name}</p>
                                      {ex.drillBrand && (
                                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{ex.drillBrand}</span>
                                      )}
                                    </div>
                                    {ex.entries?.some((e) => e.weight || e.reps || e.sets || e.intensity || e.duration || e.bodyPart) && (
                                      <div className="flex flex-wrap gap-1.5 mb-2">
                                        {ex.entries.map((entry, ei2) => {
                                          if (ex.type === "cardio") {
                                            if (!entry.intensity && !entry.duration) return null;
                                            const parts = [];
                                            if (entry.intensity) parts.push(`강도 ${entry.intensity}`);
                                            if (entry.duration) parts.push(`${entry.duration}분`);
                                            return <span key={ei2} className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-lg">{parts.join(" · ")}</span>;
                                          }
                                          if (ex.type === "stretch") {
                                            if (!entry.bodyPart && !entry.duration) return null;
                                            const parts = [];
                                            if (entry.bodyPart) parts.push(entry.bodyPart);
                                            if (entry.duration) parts.push(`${entry.duration}분`);
                                            return <span key={ei2} className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-lg">{parts.join(" · ")}</span>;
                                          }
                                          if (!entry.weight && !entry.reps && !entry.sets) return null;
                                          const parts = [];
                                          if (entry.weight) parts.push(`${entry.weight}kg`);
                                          if (entry.reps) parts.push(`${entry.reps}회`);
                                          if (entry.sets) parts.push(`${entry.sets}세트`);
                                          return <span key={ei2} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{parts.join(" · ")}</span>;
                                        })}
                                      </div>
                                    )}
                                    {ex.videoUrl && <VideoPlayer url={ex.videoUrl} maxHeight={220} />}
                                    {ex.feedbackPros && (
                                      <div className="bg-blue-50 rounded-xl px-3 py-2.5 mb-1.5">
                                        <p className="text-xs font-bold text-blue-500 mb-0.5">✅ 잘한 점</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">{ex.feedbackPros}</p>
                                      </div>
                                    )}
                                    {ex.feedbackCons && (
                                      <div className="bg-orange-50 rounded-xl px-3 py-2.5">
                                        <p className="text-xs font-bold text-orange-500 mb-0.5">⚠️ 보완할 점</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">{ex.feedbackCons}</p>
                                      </div>
                                    )}
                                    {!ex.videoUrl && !ex.feedbackPros && !ex.feedbackCons && (
                                      <p className="text-xs text-gray-300 italic">피드백 준비 중...</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

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
                <WorkoutCard key={w.id} workout={w} onEdit={setEditingWorkout} />
              ))}
            </div>
          )}
        </div>
      </main>

      {showChart && <VolumeChart workouts={workouts} onClose={() => setShowChart(false)} />}

      {showWorkoutForm && (
        <WorkoutForm
          isPersonal
          memberId={member?.id}
          onClose={() => setShowWorkoutForm(false)}
          onSave={handleAddPersonalWorkout}
        />
      )}

      {editingWorkout && (
        <WorkoutForm
          isPersonal
          memberId={member?.id}
          onClose={() => setEditingWorkout(null)}
          onSave={handleEditPersonalWorkout}
          initialData={{
            id: editingWorkout.id,
            date: editingWorkout.date,
            muscleGroups: editingWorkout.muscle_groups ?? [],
            exercises: editingWorkout.exercises ?? [],
            photos: editingWorkout.photos ?? [],
            note: editingWorkout.note ?? "",
          }}
        />
      )}
    </div>
  );
}
