import { useState, useEffect } from "react";

const generateCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const initialForm = {
  name: "",
  phone: "",
  goal: "",
  sessionsTotal: 20,
  sessionsUsed: 0,
  startDate: "",
  endDate: "",
  memo: "",
  accessCode: "",
};

export default function MemberModal({ member, onClose, onSave }) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (member) {
      setForm({ ...initialForm, ...member });
    } else {
      const today = new Date().toISOString().split("T")[0];
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      setForm({
        ...initialForm,
        startDate: today,
        endDate: threeMonths.toISOString().split("T")[0],
        accessCode: generateCode(),
      });
    }
  }, [member]);

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "phone" ? formatPhone(value) : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      sessionsTotal: Number(form.sessionsTotal),
      sessionsUsed: Number(form.sessionsUsed),
    });
  };

  const goals = ["체중 감량", "근육 증가", "체력 향상", "재활 운동", "유지", "기타"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {member ? "회원 정보 수정" : "신규 회원 등록"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="홍길동"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="010-0000-0000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">목표</label>
            <select
              name="goal"
              value={form.goal}
              onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택하세요</option>
              {goals.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">총 세션 수</label>
              <input
                type="number"
                name="sessionsTotal"
                value={form.sessionsTotal}
                onChange={handleChange}
                min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">사용 세션 수</label>
              <input
                type="number"
                name="sessionsUsed"
                value={form.sessionsUsed}
                onChange={handleChange}
                min="0"
                max={form.sessionsTotal}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea
              name="memo"
              value={form.memo}
              onChange={handleChange}
              rows={3}
              placeholder="특이사항, 부상 이력 등을 기록하세요"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">회원 접속 코드</label>
            <div className="flex gap-2">
              <input
                type="text"
                name="accessCode"
                value={form.accessCode}
                onChange={handleChange}
                placeholder="자동 생성됩니다"
                maxLength={8}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, accessCode: generateCode() }))}
                className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                재발급
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">회원이 /member 페이지에서 이 코드로 접속합니다.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              {member ? "수정 완료" : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
