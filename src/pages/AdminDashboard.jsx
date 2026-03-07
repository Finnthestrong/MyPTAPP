import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import MemberCard from "../components/MemberCard";
import MemberModal from "../components/MemberModal";
import MemberDetail from "../components/MemberDetail";
import ExerciseCatalogManager from "../components/ExerciseCatalogManager";

const STATUS_FILTERS = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "expiring", label: "만료 임박" },
  { value: "expired", label: "만료" },
];

const STATUS_ORDER = { active: 0, expiring: 1, expired: 2 };

function computeStatus(sessionsUsed, sessionsTotal) {
  const used = Number(sessionsUsed);
  const total = Number(sessionsTotal);
  const remaining = total - used;
  if (used >= total) return "expired";
  if (total <= 20 && remaining <= 5) return "expiring";
  return "active";
}

function dbToMember(row) {
  const sessionsTotal = Number(row.sessions_total);
  const sessionsUsed = Number(row.sessions_used);
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    goal: row.goal ?? "",
    sessionsTotal,
    sessionsUsed,
    startDate: row.start_date ?? "",
    endDate: row.end_date ?? "",
    memo: row.memo ?? "",
    accessCode: row.access_code ?? "",
    status: computeStatus(sessionsUsed, sessionsTotal),
  };
}

function dbToWorkout(row) {
  return {
    id: row.id,
    date: row.date,
    workout_type: row.workout_type ?? "pt",
    muscleGroups: row.muscle_groups ?? [],
    exercises: row.exercises ?? [],
    photos: row.photos ?? [],
    note: row.note ?? "",
    signature: row.signature ?? null,
  };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [workouts, setWorkouts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [detailMemberId, setDetailMemberId] = useState(null);
  const [showCatalogManager, setShowCatalogManager] = useState(false);
  const [showPending, setShowPending] = useState(true);

  const detailMember = detailMemberId ? members.find((m) => m.id === detailMemberId) ?? null : null;

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: membersData }, { data: workoutsData }] = await Promise.all([
      supabase.from("members").select("*").order("name"),
      supabase.from("workouts").select("*").order("date", { ascending: false }),
    ]);
    if (membersData) setMembers(membersData.map(dbToMember));
    if (workoutsData) {
      const grouped = {};
      workoutsData.forEach((w) => {
        if (!grouped[w.member_id]) grouped[w.member_id] = [];
        grouped[w.member_id].push(dbToWorkout(w));
      });
      setWorkouts(grouped);
    }
    setLoading(false);
  }

  const filtered = members
    .filter((m) => {
      const matchSearch =
        m.name.includes(search) || m.phone.includes(search) || (m.goal || "").includes(search);
      const matchStatus = statusFilter === "all" || m.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const statusDiff = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name, "ko");
    });

  const pendingFeedback = useMemo(() => {
    const result = [];
    Object.entries(workouts).forEach(([memberId, memberWorkouts]) => {
      const member = members.find((m) => m.id === memberId);
      if (!member) return;
      memberWorkouts.forEach((workout) => {
        if (workout.workout_type !== "pt") return;
        const hasFeedback = workout.exercises?.some(
          (ex) => ex.feedbackPros || ex.feedbackCons || ex.videoUrl
        ) ?? false;
        if (!hasFeedback) result.push({ member, workout });
      });
    });
    return result.sort((a, b) => b.workout.date.localeCompare(a.workout.date));
  }, [members, workouts]);

  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    expiring: members.filter((m) => m.status === "expiring").length,
    expired: members.filter((m) => m.status === "expired").length,
  };

  const handleSave = async (form) => {
    const payload = {
      name: form.name,
      phone: form.phone,
      goal: form.goal,
      sessions_total: Number(form.sessionsTotal),
      sessions_used: Number(form.sessionsUsed),
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      memo: form.memo,
      access_code: form.accessCode || null,
      status: computeStatus(form.sessionsUsed, form.sessionsTotal),
    };
    if (editingMember) {
      const { data } = await supabase
        .from("members")
        .update(payload)
        .eq("id", editingMember.id)
        .select()
        .single();
      if (data) setMembers((prev) => prev.map((m) => (m.id === data.id ? dbToMember(data) : m)));
    } else {
      const { data } = await supabase.from("members").insert(payload).select().single();
      if (data) setMembers((prev) => [...prev, dbToMember(data)]);
    }
    setShowModal(false);
    setEditingMember(null);
  };

  const handleDelete = async (id) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      await supabase.from("members").delete().eq("id", id);
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setWorkouts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setDetailMemberId(null);
    }
  };

  const adjustSession = async (memberId, delta) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    const total = Number(member.sessionsTotal);
    const used = Math.max(0, Math.min(Number(member.sessionsUsed) + delta, total));
    const status = computeStatus(used, total);
    await supabase.from("members").update({ sessions_used: used, status }).eq("id", memberId);
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, sessionsUsed: used, status } : m))
    );
  };

  const handleAddWorkout = async (memberId, log) => {
    const { data } = await supabase
      .from("workouts")
      .insert({
        member_id: memberId,
        workout_type: "pt",
        date: log.date,
        muscle_groups: log.muscleGroups,
        exercises: log.exercises,
        photos: log.photos,
        note: log.note,
        signature: log.signature,
      })
      .select()
      .single();
    if (data) {
      setWorkouts((prev) => ({
        ...prev,
        [memberId]: [dbToWorkout(data), ...(prev[memberId] || [])],
      }));
    }
    await adjustSession(memberId, +1);
  };

  const handleEditWorkout = async (memberId, updatedLog) => {
    const { data } = await supabase
      .from("workouts")
      .update({
        date: updatedLog.date,
        muscle_groups: updatedLog.muscleGroups,
        exercises: updatedLog.exercises,
        photos: updatedLog.photos,
        note: updatedLog.note,
        signature: updatedLog.signature,
      })
      .eq("id", updatedLog.id)
      .select()
      .single();
    if (data) {
      const workout = dbToWorkout(data);
      setWorkouts((prev) => ({
        ...prev,
        [memberId]: (prev[memberId] || []).map((l) => (l.id === workout.id ? workout : l)),
      }));
    }
  };

  const handleDeleteWorkout = async (memberId, logId) => {
    await supabase.from("workouts").delete().eq("id", logId);
    setWorkouts((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || []).filter((l) => l.id !== logId),
    }));
    await adjustSession(memberId, -1);
  };

  const openNew = () => {
    setEditingMember(null);
    setShowModal(true);
  };

  const openEdit = (member) => {
    setEditingMember(member);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">데이터 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">PT 회원 관리</h1>
            <p className="text-xs text-gray-400 mt-0.5">Personal Training Manager</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCatalogManager(true)}
              className="text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2.5 rounded-xl font-medium transition-colors"
            >
              운동 DB
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <span className="text-lg leading-none">+</span>
              신규 회원 등록
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl px-3 py-2.5 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "전체 회원", value: stats.total, color: "text-gray-800", bg: "bg-white" },
            { label: "활성", value: stats.active, color: "text-green-600", bg: "bg-green-50" },
            { label: "만료 임박", value: stats.expiring, color: "text-yellow-600", bg: "bg-yellow-50" },
            { label: "만료", value: stats.expired, color: "text-red-500", bg: "bg-red-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-100`}>
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 피드백 미완료 알림 */}
        {pendingFeedback.length > 0 && (
          <div className="mb-6 border border-amber-200 rounded-2xl overflow-hidden bg-amber-50">
            <button
              type="button"
              onClick={() => setShowPending((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span className="text-sm font-semibold text-amber-800">피드백 미완료 수업</span>
                <span className="text-xs bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">
                  {pendingFeedback.length}건
                </span>
              </div>
              <span className="text-xs text-amber-500">{showPending ? "▲" : "▼"}</span>
            </button>

            {showPending && (
              <div className="border-t border-amber-200 divide-y divide-amber-100">
                {pendingFeedback.map(({ member, workout }) => (
                  <button
                    key={workout.id}
                    type="button"
                    onClick={() => setDetailMemberId(member.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{member.name}</p>
                        <p className="text-xs text-gray-400">{workout.exercises.length}개 운동</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-amber-700">{workout.date}</p>
                      <p className="text-xs text-gray-400 mt-0.5">피드백 없음 →</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="이름, 연락처, 목표로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <div className="flex gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  statusFilter === f.value
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                onClick={() => setDetailMemberId(m.id)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">&#128100;</div>
            <p className="text-base font-medium">등록된 회원이 없습니다.</p>
            <p className="text-sm mt-1">신규 회원을 등록해보세요!</p>
          </div>
        )}
      </main>

      {detailMember && (
        <MemberDetail
          member={detailMember}
          workouts={workouts}
          onClose={() => setDetailMemberId(null)}
          onEdit={() => openEdit(detailMember)}
          onAddWorkout={handleAddWorkout}
          onEditWorkout={handleEditWorkout}
          onDeleteWorkout={handleDeleteWorkout}
        />
      )}

      {showModal && (
        <MemberModal
          member={editingMember}
          onClose={() => {
            setShowModal(false);
            setEditingMember(null);
          }}
          onSave={handleSave}
        />
      )}

      {showCatalogManager && (
        <ExerciseCatalogManager onClose={() => setShowCatalogManager(false)} />
      )}
    </div>
  );
}
