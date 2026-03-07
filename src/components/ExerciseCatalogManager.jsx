import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const EQUIPMENT_TYPES = ["덤벨", "바벨", "머신", "케이블", "프리웨이트&기타"];

function ExerciseForm({ initial = {}, existingRegions, onSave, onCancel }) {
  const [region, setRegion] = useState(initial.region || "");
  const [customRegion, setCustomRegion] = useState("");
  const [equipment, setEquipment] = useState(initial.equipment_type || "");
  const [brand, setBrand] = useState(initial.brand || "");
  const [name, setName] = useState(initial.exercise_name || "");

  const isCustom = region === "__custom__";
  const finalRegion = isCustom ? customRegion.trim() : region;
  const allRegions = [...new Set([...["가슴", "어깨&팔", "등", "하체"], ...existingRegions])];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!finalRegion || !equipment || !name.trim()) return;
    onSave({
      region: finalRegion,
      equipment_type: equipment,
      brand: equipment === "머신" ? (brand.trim() || null) : null,
      exercise_name: name.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">부위</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">선택</option>
            {allRegions.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="__custom__">기타 (직접 입력)</option>
          </select>
          {isCustom && (
            <input
              type="text"
              placeholder="부위명 직접 입력"
              value={customRegion}
              onChange={(e) => setCustomRegion(e.target.value)}
              required
              className="mt-1 w-full border border-blue-300 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">도구</label>
          <select
            value={equipment}
            onChange={(e) => { setEquipment(e.target.value); setBrand(""); }}
            required
            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">선택</option>
            {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {equipment === "머신" && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">브랜드 (선택)</label>
          <input
            type="text"
            placeholder="예: 해머 스트렝스"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">운동명</label>
        <input
          type="text"
          placeholder="운동명 입력"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          저장
        </button>
        <button type="button" onClick={onCancel} className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
          취소
        </button>
      </div>
    </form>
  );
}

export default function ExerciseCatalogManager({ onClose }) {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterRegion, setFilterRegion] = useState("");
  const [filterEquipment, setFilterEquipment] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("exercise_catalog")
      .select("*")
      .order("region")
      .order("equipment_type")
      .order("exercise_name");
    setExercises(data || []);
    setLoading(false);
  }

  const regions = [...new Set(exercises.map((e) => e.region))].sort();
  const equipments = [...new Set(
    exercises
      .filter((e) => !filterRegion || e.region === filterRegion)
      .map((e) => e.equipment_type)
  )].sort();

  const filtered = exercises.filter((e) =>
    (!filterRegion || e.region === filterRegion) &&
    (!filterEquipment || e.equipment_type === filterEquipment)
  );

  async function handleAdd(form) {
    setSaving(true);
    const { data } = await supabase.from("exercise_catalog").insert(form).select().single();
    if (data) {
      setExercises((prev) =>
        [...prev, data].sort((a, b) =>
          a.region.localeCompare(b.region, "ko") ||
          a.equipment_type.localeCompare(b.equipment_type, "ko") ||
          a.exercise_name.localeCompare(b.exercise_name, "ko")
        )
      );
      setShowAddForm(false);
    }
    setSaving(false);
  }

  async function handleEdit(id, form) {
    setSaving(true);
    const { data } = await supabase
      .from("exercise_catalog")
      .update(form)
      .eq("id", id)
      .select()
      .single();
    if (data) {
      setExercises((prev) => prev.map((e) => (e.id === id ? data : e)));
      setEditingId(null);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("이 운동을 삭제하시겠습니까?")) return;
    await supabase.from("exercise_catalog").delete().eq("id", id);
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">

        {/* 헤더 */}
        <div className="shrink-0 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">운동 DB 관리</h2>
            <p className="text-xs text-gray-400 mt-0.5">총 {exercises.length}개 운동</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAddForm((v) => !v); setEditingId(null); }}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              + 운동 추가
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-1">
              &times;
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">

          {/* 추가 폼 */}
          {showAddForm && (
            <ExerciseForm
              existingRegions={regions}
              onSave={handleAdd}
              onCancel={() => setShowAddForm(false)}
            />
          )}

          {/* 필터 */}
          <div className="flex gap-2">
            <select
              value={filterRegion}
              onChange={(e) => { setFilterRegion(e.target.value); setFilterEquipment(""); }}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 부위</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={filterEquipment}
              onChange={(e) => setFilterEquipment(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 도구</option>
              {equipments.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* 목록 */}
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-12">불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">운동이 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((ex) =>
                editingId === ex.id ? (
                  <ExerciseForm
                    key={ex.id}
                    initial={ex}
                    existingRegions={regions}
                    onSave={(form) => handleEdit(ex.id, form)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div
                    key={ex.id}
                    className="flex items-center gap-3 px-3 py-2.5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{ex.region}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{ex.equipment_type}</span>
                        {ex.brand && (
                          <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{ex.brand}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800">{ex.exercise_name}</p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => { setEditingId(ex.id); setShowAddForm(false); }}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(ex.id)}
                        className="text-xs text-red-400 hover:text-red-600 font-medium"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
