const statusConfig = {
  active: { label: "활성", className: "bg-green-100 text-green-700" },
  expiring: { label: "만료 임박", className: "bg-yellow-100 text-yellow-700" },
  expired: { label: "만료", className: "bg-red-100 text-red-600" },
};

export default function MemberCard({ member, onClick, onDelete }) {
  const { name, phone, goal, sessionsTotal, sessionsUsed, endDate, status } = member;
  const remaining = sessionsTotal - sessionsUsed;
  const progress = Math.round((sessionsUsed / sessionsTotal) * 100);
  const cfg = statusConfig[status] || statusConfig.active;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base">
            {name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{name}</p>
            <p className="text-xs text-gray-400">{phone}</p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}>
          {cfg.label}
        </span>
      </div>

      {goal && (
        <div className="mb-3">
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{goal}</span>
        </div>
      )}

      <div className="mb-1 flex justify-between text-xs text-gray-500">
        <span>세션 진행률</span>
        <span className="font-medium text-gray-700">{sessionsUsed} / {sessionsTotal}회 &nbsp;({remaining}회 남음)</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          종료일: <span className="text-gray-600 font-medium">{endDate}</span>
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(member.id);
          }}
          className="text-xs text-red-400 hover:text-red-600 transition-colors px-0 border-0 bg-transparent shadow-none"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
