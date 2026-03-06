import { useState, useEffect } from "react";
import { sampleMembers } from "./data/sampleData";
import MemberCard from "./components/MemberCard";
import MemberModal from "./components/MemberModal";
import MemberDetail from "./components/MemberDetail";

const STATUS_FILTERS = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "expiring", label: "만료 임박" },
  { value: "expired", label: "만료" },
];

const STATUS_ORDER = { active: 0, expiring: 1, expired: 2 };

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function computeStatus(sessionsUsed, sessionsTotal) {
  const used = Number(sessionsUsed);
  const total = Number(sessionsTotal);
  const remaining = total - used;
  if (used >= total) return "expired";
  if (total <= 20 && remaining <= 5) return "expiring";
  return "active";
}

function normalizeMember(m) {
  const sessionsTotal = Number(m.sessionsTotal);
  const sessionsUsed = Number(m.sessionsUsed);
  return {
    ...m,
    sessionsTotal,
    sessionsUsed,
    status: computeStatus(sessionsUsed, sessionsTotal),
  };
}

const savedMembers = loadStorage("pt_members", sampleMembers).map(normalizeMember);
let nextId = Math.max(...savedMembers.map((m) => m.id), 0) + 1;

export default function App() {
  const [members, setMembers] = useState(savedMembers);
  const [workouts, setWorkouts] = useState(() => loadStorage("pt_workouts", {}));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [detailMemberId, setDetailMemberId] = useState(null);

  const detailMember = detailMemberId ? members.find((m) => m.id === detailMemberId) ?? null : null;

  useEffect(() => {
    localStorage.setItem("pt_members", JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem("pt_workouts", JSON.stringify(workouts));
  }, [workouts]);

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

  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    expiring: members.filter((m) => m.status === "expiring").length,
    expired: members.filter((m) => m.status === "expired").length,
  };

  const adjustSession = (memberId, delta) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        const total = Number(m.sessionsTotal);
        const used = Math.max(0, Math.min(Number(m.sessionsUsed) + delta, total));
        return { ...m, sessionsUsed: used, status: computeStatus(used, total) };
      })
    );
  };

  const handleSave = (form) => {
    const normalized = normalizeMember(form);
    if (editingMember) {
      setMembers((prev) =>
        prev.map((m) => (m.id === editingMember.id ? { ...normalized, id: m.id } : m))
      );
    } else {
      setMembers((prev) => [...prev, { ...normalized, id: nextId++ }]);
    }
    setShowModal(false);
    setEditingMember(null);
  };

  const handleDelete = (id) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
      setWorkouts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setDetailMemberId(null);
    }
  };

  const handleAddWorkout = (memberId, log) => {
    setWorkouts((prev) => ({
      ...prev,
      [memberId]: [...(prev[memberId] || []), log],
    }));
    adjustSession(memberId, +1);
  };

  const handleEditWorkout = (memberId, updatedLog) => {
    setWorkouts((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || []).map((l) => (l.id === updatedLog.id ? updatedLog : l)),
    }));
  };

  const handleDeleteWorkout = (memberId, logId) => {
    setWorkouts((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] || []).filter((l) => l.id !== logId),
    }));
    adjustSession(memberId, -1);
  };

  const openNew = () => {
    setEditingMember(null);
    setShowModal(true);
  };

  const openEdit = (member) => {
    setEditingMember(member);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">PT 회원 관리</h1>
            <p className="text-xs text-gray-400 mt-0.5">Personal Training Manager</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <span className="text-lg leading-none">+</span>
            신규 회원 등록
          </button>
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
    </div>
  );
}
