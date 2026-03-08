import { useState } from "react";
import WorkoutForm from "./WorkoutForm";

const statusConfig = {
  active: { label: "활성", className: "bg-green-100 text-green-700" },
  expiring: { label: "만료 임박", className: "bg-yellow-100 text-yellow-700" },
  expired: { label: "만료", className: "bg-red-100 text-red-600" },
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
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

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/);
  return m ? m[1] : null;
}

function VideoPlayer({ url, maxHeight = 200 }) {
  if (!url) return null;
  const ytId = getYouTubeId(url);
  if (ytId) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingTop: "56.25%" }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return <video src={url} controls className="w-full rounded-lg bg-black" style={{ maxHeight }} />;
}

function WorkoutCard({ log, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  const totalVolume = log.exercises.reduce((sum, ex) => {
    const entries = ex.entries?.length
      ? ex.entries
      : [{ weight: ex.weight, sets: ex.sets, reps: ex.reps }];
    return sum + entries.reduce((s, e) => {
      return s + (parseFloat(e.weight) || 0) * (parseInt(e.sets) || 0) * (parseInt(e.reps) || 0);
    }, 0);
  }, 0);

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
      {/* Date header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">{formatDate(log.date)}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(log.workout_type || 'pt') === 'pt' ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}>
            {(log.workout_type || 'pt') === 'pt' ? 'PT' : '개인'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{log.exercises.length}개 운동</span>
          {totalVolume > 0 && (
            <span className="text-xs font-semibold text-blue-600">{totalVolume.toLocaleString()}kg</span>
          )}
          {log.signature && (
            <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">서명 완료</span>
          )}
          <span className="text-gray-400 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3">
          {/* Muscle groups */}
          {log.muscleGroups && log.muscleGroups.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {log.muscleGroups.map((g) => (
                <span key={g} className="text-xs bg-blue-50 text-blue-600 font-medium px-2.5 py-1 rounded-full">
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Exercise table */}
          {log.exercises.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400">
                    <th className="text-left px-3 py-2 font-medium">운동</th>
                    <th className="px-3 py-2 font-medium text-center">무게/강도</th>
                    <th className="px-3 py-2 font-medium text-center">횟수/시간</th>
                    <th className="px-3 py-2 font-medium text-center">세트</th>
                    <th className="px-3 py-2 font-medium text-center">볼륨</th>
                  </tr>
                </thead>
                <tbody>
                  {log.exercises.flatMap((ex, i) => {
                    const isStretch = ex.type === "stretch";
                    const isCardio = ex.type === "cardio";
                    const entries = ex.entries?.length
                      ? ex.entries
                      : [{ id: "legacy", weight: ex.weight, sets: ex.sets, reps: ex.reps }];
                    const totalVolume = (!isStretch && !isCardio) ? entries.reduce((sum, e) => {
                      return sum + (parseFloat(e.weight) || 0) * (parseInt(e.sets) || 0) * (parseInt(e.reps) || 0);
                    }, 0) : 0;
                    return entries.map((entry, j) => (
                      <tr key={`${ex.id || i}-${j}`} className="border-t border-gray-100">
                        {j === 0 ? (
                          <td className="px-3 py-2 font-medium text-gray-800" rowSpan={entries.length}>
                            <div>{ex.name}</div>
                            {isStretch && <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">스트레칭</span>}
                            {isCardio && <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">유산소</span>}
                            {ex.exerciseNote && <div className="text-xs text-gray-400 mt-0.5">{ex.exerciseNote}</div>}
                          </td>
                        ) : null}
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
                        {j === 0 ? (
                          <td className="px-3 py-2 text-center font-semibold text-blue-600" rowSpan={entries.length}>
                            {totalVolume > 0 ? `${totalVolume.toLocaleString()}kg` : "-"}
                          </td>
                        ) : null}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Photos */}
          {log.photos && log.photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {log.photos.map((p) => (
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

          {/* Note */}
          {log.note && (
            <div className="bg-yellow-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-yellow-700 font-medium mb-0.5">메모</p>
              <p className="text-sm text-gray-700">{log.note}</p>
            </div>
          )}

          {/* Signature */}
          {log.signature && (
            <div className="border border-gray-100 rounded-xl p-3">
              <p className="text-xs text-gray-400 font-medium mb-2">회원 확인 서명</p>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <img
                  src={log.signature}
                  alt="회원 서명"
                  className="w-full h-24 object-contain"
                />
              </div>
            </div>
          )}

          {/* 수업 피드백 */}
          {(() => {
            const fbExercises = log.exercises.filter((ex) => ex.feedbackPros || ex.feedbackCons || ex.videoUrl);
            if (fbExercises.length === 0) return null;
            const groups = groupByRegionAndTool(fbExercises);
            return (
              <div className="border-t border-dashed border-blue-100 pt-3">
                <p className="text-xs font-bold text-blue-600 mb-2">수업 피드백</p>
                <div className="space-y-3">
                  {groups.map((group, gi) => (
                    <div key={gi}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs font-semibold text-gray-600">{group.region}</span>
                        {group.tool && <span className="text-xs text-gray-400">· {group.tool}</span>}
                      </div>
                      <div className="space-y-2">
                        {group.items.map((ex, ei) => (
                          <div key={ei} className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <p className="text-sm font-semibold text-gray-800">{ex.name}</p>
                            {ex.videoUrl && <VideoPlayer url={ex.videoUrl} maxHeight={200} />}
                            {ex.feedbackPros && (
                              <div className="bg-blue-50 rounded-lg px-3 py-2">
                                <p className="text-xs font-bold text-blue-500 mb-0.5">✅ 잘한 점</p>
                                <p className="text-sm text-gray-700">{ex.feedbackPros}</p>
                              </div>
                            )}
                            {ex.feedbackCons && (
                              <div className="bg-orange-50 rounded-lg px-3 py-2">
                                <p className="text-xs font-bold text-orange-500 mb-0.5">⚠️ 보완할 점</p>
                                <p className="text-sm text-gray-700">{ex.feedbackCons}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-1">
            <button
              type="button"
              onClick={() => onEdit(log)}
              className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
            >
              수정
            </button>
            <button
              type="button"
              onClick={() => onDelete(log.id)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              삭제
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
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

export default function MemberDetail({ member, workouts, onClose, onEdit, onAddWorkout, onDeleteWorkout, onEditWorkout }) {
  const [tab, setTab] = useState("info");
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  if (!member) return null;

  const { name, phone, goal, sessionsTotal, sessionsUsed, startDate, endDate, status, memo, accessCode } = member;
  const remaining = sessionsTotal - sessionsUsed;
  const progress = Math.round((sessionsUsed / sessionsTotal) * 100);
  const cfg = statusConfig[status] || statusConfig.active;

  const memberWorkouts = [...(workouts[member.id] || [])]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthPersonal = memberWorkouts.filter((w) => w.workout_type === 'personal' && w.date?.startsWith(thisMonth));
  const thisMonthTotal = memberWorkouts.filter((w) => w.date?.startsWith(thisMonth));

  const handleSaveWorkout = (log) => {
    if (editingLog) {
      onEditWorkout(member.id, log);
    } else {
      onAddWorkout(member.id, log);
    }
    setShowWorkoutForm(false);
    setEditingLog(null);
  };

  const openEdit = (log) => {
    setEditingLog(log);
    setShowWorkoutForm(true);
  };

  const closeForm = () => {
    setShowWorkoutForm(false);
    setEditingLog(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        <div className="relative ml-auto w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
          <div className="shrink-0 px-5 pt-5 pb-0">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← 목록으로
              </button>
              <button
                onClick={onEdit}
                className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors"
              >
                정보 수정
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
                {name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-xl font-bold text-gray-900">{name}</h2>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.className}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{phone}</p>
              </div>
            </div>

            <div className="flex border-b border-gray-100">
              {[
                { id: "info", label: "회원 정보" },
                { id: "workout", label: `운동 기록 ${memberWorkouts.length > 0 ? `(${memberWorkouts.length})` : ""}` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t.id
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {tab === "info" && (
              <div className="space-y-4">
                {goal && (
                  <span className="inline-block text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                    목표: {goal}
                  </span>
                )}

                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">세션 진행률</span>
                    <span className="font-semibold text-gray-700">{sessionsUsed} / {sessionsTotal}회</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">
                    남은 세션: <span className="font-medium text-gray-600">{remaining}회</span>
                  </p>
                </div>

                <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                  <p className="text-xs font-semibold text-gray-600 mb-3">이번달 운동 현황</p>
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 mb-1">시작일</p>
                    <p className="text-sm font-semibold text-gray-700">{startDate}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 mb-1">종료일</p>
                    <p className="text-sm font-semibold text-gray-700">{endDate}</p>
                  </div>
                </div>

                {memo && (
                  <div className="bg-yellow-50 rounded-2xl p-4">
                    <p className="text-xs font-medium text-yellow-700 mb-1">특이사항 / 메모</p>
                    <p className="text-sm text-gray-700">{memo}</p>
                  </div>
                )}

                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-medium text-gray-400 mb-2">회원 접속 코드</p>
                  {accessCode ? (
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold tracking-widest text-gray-800 font-mono">{accessCode}</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(accessCode)}
                        className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 rounded-lg px-2.5 py-1 transition-colors"
                      >
                        복사
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">코드 없음 — 정보 수정에서 재발급하세요.</p>
                  )}
                </div>
              </div>
            )}

            {tab === "workout" && (
              <div className="space-y-3">
                <button
                  onClick={() => { setEditingLog(null); setShowWorkoutForm(true); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  + 오늘 운동 기록 추가
                </button>

                {memberWorkouts.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <div className="text-4xl mb-3">&#127947;</div>
                    <p className="text-sm font-medium">아직 운동 기록이 없어요.</p>
                    <p className="text-xs mt-1">위 버튼으로 첫 기록을 남겨보세요!</p>
                  </div>
                ) : (
                  memberWorkouts.map((log) => (
                    <WorkoutCard
                      key={log.id}
                      log={log}
                      onDelete={(id) => onDeleteWorkout(member.id, id)}
                      onEdit={openEdit}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showWorkoutForm && (
        <WorkoutForm
          initialData={editingLog}
          onClose={closeForm}
          onSave={handleSaveWorkout}
          memberId={member.id}
        />
      )}
    </>
  );
}
