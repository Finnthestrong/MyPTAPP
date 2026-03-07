import { useState, useRef, useEffect } from "react";
import Select from "react-select";
import SignaturePad from "./SignaturePad";
import { supabase } from "../lib/supabase";

const today = new Date().toISOString().split("T")[0];

// 타이핑 중 부모 state를 건드리지 않아 한글 IME 문제를 원천 차단
// onBlur(포커스 이탈) 시에만 부모로 값을 전달한다
function LocalInput({ initValue, onCommit, className, placeholder, autoFocus }) {
  const [val, setVal] = useState(initValue || "");
  // 부위 칩 삭제 등으로 부모가 값을 초기화했을 때만 동기화
  const prev = useRef(initValue);
  if (initValue !== prev.current && initValue === "") {
    prev.current = "";
    if (val !== "") setVal("");
  }
  return (
    <input
      type="text"
      value={val}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={className}
      onChange={(e) => setVal(e.target.value)}
      onBlur={(e) => {
        prev.current = e.target.value;
        onCommit(e.target.value);
      }}
    />
  );
}

const CARDIO_LIST = ["러닝머신", "인클라인", "천국의 계단", "사이클"];
const MUSCLE_GROUPS = ["가슴", "어깨", "팔", "등", "하체", "스트레칭&재활"];

const toOpt = (arr) => arr.map((v) => ({ value: v, label: v }));

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59,130,246,0.2)" : "none",
    minHeight: "40px",
    fontSize: "14px",
    cursor: "pointer",
    "&:hover": { borderColor: "#93c5fd" },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: "14px",
    padding: "10px 12px",
    backgroundColor: state.isSelected ? "#3b82f6" : state.isFocused ? "#eff6ff" : "white",
    color: state.isSelected ? "white" : "#374151",
    cursor: "pointer",
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "14px" }),
  singleValue: (base) => ({ ...base, color: "#374151", fontSize: "14px" }),
  menu: (base) => ({ ...base, zIndex: 200, borderRadius: "0.5rem", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 8px", color: "#9ca3af" }),
};

const emptyEntry = () => ({
  id: Date.now() + Math.random(),
  weight: "", sets: "", reps: "", bodyPart: "", duration: "", intensity: "",
});

const emptyExercise = () => ({
  id: Date.now() + Math.random(),
  name: "",
  type: "general",
  entries: [emptyEntry()],
  drillBodyPart: "",
  drillCustomBodyPart: "",
  drillTool: "",
  drillBrand: "",
  drillExercise: "",
  drillCustom: "",
  exerciseNote: "",
});

function Chip({ label, onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
    >
      <span>{label}</span>
      <span className="opacity-50 ml-0.5">×</span>
    </button>
  );
}

function WeightDrillDown({ ex, catalog, onUpdate }) {
  // 기타 부위 경로의 로컬 state — 타이핑 중 부모 re-render 없음
  const [localBodyPart, setLocalBodyPart] = useState(ex.drillCustomBodyPart || "");
  const [localExercise, setLocalExercise] = useState(ex.drillExercise !== "기타" ? (ex.drillExercise || "") : (ex.drillCustom || ""));

  // 부위 칩 삭제 시 로컬 state 초기화
  useEffect(() => {
    if (ex.drillBodyPart !== "기타 부위") {
      setLocalBodyPart("");
      setLocalExercise("");
    }
  }, [ex.drillBodyPart]);

  const isCustom = ex.drillBodyPart === "기타 부위";

  const bodyPartOpts = [
    ...[...new Set(catalog.map((e) => e.region))].sort().map((v) => ({ value: v, label: v })),
    { value: "기타 부위", label: "기타 부위 (직접 입력)" },
  ];

  const toolOpts = !isCustom && ex.drillBodyPart
    ? toOpt([...new Set(catalog.filter((e) => e.region === ex.drillBodyPart).map((e) => e.equipment_type))])
    : [];

  const brandOpts =
    !isCustom && ex.drillBodyPart && ex.drillTool === "머신"
      ? toOpt([...new Set(catalog.filter((e) => e.region === ex.drillBodyPart && e.equipment_type === "머신" && e.brand).map((e) => e.brand))])
      : [];

  const exerciseList = (() => {
    if (isCustom || !ex.drillBodyPart || !ex.drillTool) return [];
    let list;
    if (ex.drillTool === "머신") {
      if (!ex.drillBrand) return [];
      list = catalog
        .filter((e) => e.region === ex.drillBodyPart && e.equipment_type === "머신" && e.brand === ex.drillBrand)
        .map((e) => e.exercise_name);
    } else {
      list = catalog
        .filter((e) => e.region === ex.drillBodyPart && e.equipment_type === ex.drillTool && !e.brand)
        .map((e) => e.exercise_name);
    }
    return [...list, "기타"];
  })();

  const showExerciseSelect =
    !isCustom &&
    ((ex.drillTool && ex.drillTool !== "머신") ||
      (ex.drillTool === "머신" && ex.drillBrand));

  const resetFrom = (level) => {
    const base = { drillExercise: "", drillCustom: "", name: "" };
    if (level <= "brand") Object.assign(base, { drillBrand: "" });
    if (level <= "tool") Object.assign(base, { drillTool: "", drillBrand: "" });
    if (level <= "bodyPart") Object.assign(base, { drillBodyPart: "", drillCustomBodyPart: "", drillTool: "", drillBrand: "" });
    onUpdate(base);
  };

  return (
    <div className="space-y-2">
      {/* 선택된 항목 칩 */}
      {(ex.drillBodyPart || ex.drillTool || ex.drillBrand) && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {ex.drillBodyPart && (
            <Chip
              label={isCustom && ex.drillCustomBodyPart ? `기타: ${ex.drillCustomBodyPart}` : ex.drillBodyPart}
              onClear={() => resetFrom("bodyPart")}
            />
          )}
          {!isCustom && ex.drillTool && (
            <Chip label={ex.drillTool} onClear={() => resetFrom("tool")} />
          )}
          {!isCustom && ex.drillBrand && (
            <Chip label={ex.drillBrand} onClear={() => resetFrom("brand")} />
          )}
        </div>
      )}

      {/* 1단계: 부위 선택 */}
      {!ex.drillBodyPart && (
        <Select
          options={bodyPartOpts}
          value={null}
          onChange={(opt) => onUpdate({
            drillBodyPart: opt?.value || "",
            drillCustomBodyPart: "", drillTool: "", drillBrand: "",
            drillExercise: "", drillCustom: "", name: "",
          })}
          placeholder="① 부위 선택"
          styles={selectStyles}
          isSearchable={false}
        />
      )}

      {/* 기타 부위 경로: 부위명 직접 입력 */}
      {isCustom && (
        <div className="space-y-2">
          <LocalInput
            initValue={ex.drillCustomBodyPart}
            onCommit={(val) => {
              setLocalBodyPart(val);
              onUpdate({ drillCustomBodyPart: val });
            }}
            placeholder="부위명 직접 입력 (예: 코어, 복근)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            autoFocus={!ex.drillCustomBodyPart}
          />
          {/* 로컬 state 기준으로 표시 — 타이핑 중 부모 re-render 없이 즉시 등장 */}
          {(localBodyPart.trim() || ex.drillCustomBodyPart.trim()) && !ex.name && (
            <LocalInput
              initValue={ex.drillExercise !== "기타" ? ex.drillExercise : ex.drillCustom}
              onCommit={(val) => {
                setLocalExercise(val);
                onUpdate({ drillExercise: val, name: val });
              }}
              placeholder="운동명 직접 입력"
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          )}
        </div>
      )}

      {/* 2단계: 도구 선택 */}
      {!isCustom && ex.drillBodyPart && !ex.drillTool && (
        <Select
          options={toolOpts}
          value={null}
          onChange={(opt) => onUpdate({ drillTool: opt?.value || "", drillBrand: "", drillExercise: "", drillCustom: "", name: "" })}
          placeholder="② 도구 선택"
          styles={selectStyles}
          isSearchable={false}
        />
      )}

      {/* 3단계: 브랜드 (머신만) */}
      {!isCustom && ex.drillTool === "머신" && !ex.drillBrand && (
        <Select
          options={brandOpts}
          value={null}
          onChange={(opt) => onUpdate({ drillBrand: opt?.value || "", drillExercise: "", drillCustom: "", name: "" })}
          placeholder="③ 브랜드 선택"
          styles={selectStyles}
          isSearchable={false}
        />
      )}

      {/* 4단계: 운동 선택 */}
      {showExerciseSelect && !ex.drillExercise && (
        <Select
          options={toOpt(exerciseList)}
          value={null}
          onChange={(opt) => {
            const val = opt?.value || "";
            onUpdate({ drillExercise: val, drillCustom: "", name: val !== "기타" ? val : "" });
          }}
          placeholder="운동 검색 또는 선택"
          styles={selectStyles}
          isSearchable
          noOptionsMessage={() => "검색 결과 없음"}
        />
      )}

      {/* 기타 운동: 직접 입력 */}
      {!isCustom && ex.drillExercise === "기타" && (
        <LocalInput
          initValue={ex.drillCustom}
          onCommit={(val) => onUpdate({ drillCustom: val, name: val })}
          placeholder="운동명 직접 입력"
          className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          autoFocus
        />
      )}

      {/* 최종 선택 결과 */}
      {ex.name && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <div>
            {isCustom && ex.drillCustomBodyPart && (
              <p className="text-xs text-blue-400 mb-0.5">{ex.drillCustomBodyPart}</p>
            )}
            <p className="text-sm font-bold text-blue-700">{ex.name}</p>
          </div>
          <button
            type="button"
            onClick={() => onUpdate({ drillExercise: "", drillCustom: "", name: "" })}
            className="text-xs text-blue-400 hover:text-red-500 transition-colors ml-3"
          >
            변경
          </button>
        </div>
      )}
    </div>
  );
}

export default function WorkoutForm({ onClose, onSave, initialData, isPersonal = false }) {
  const [date, setDate] = useState(initialData?.date ?? today);
  const [muscleGroups, setMuscleGroups] = useState(initialData?.muscleGroups ?? []);
  const [exercises, setExercises] = useState(() => {
    if (!initialData?.exercises?.length) return [emptyExercise()];
    return initialData.exercises.map((ex) => ({
      ...emptyExercise(),
      ...ex,
      type: ex.type || "general",
      entries: ex.entries?.length
        ? ex.entries.map((e) => ({ ...emptyEntry(), ...e }))
        : [{ ...emptyEntry(), weight: ex.weight ?? "", sets: ex.sets ?? "", reps: ex.reps ?? "" }],
      drillBodyPart: ex.drillBodyPart || "",
      drillCustomBodyPart: ex.drillCustomBodyPart || "",
      drillTool: ex.drillTool || "",
      drillBrand: ex.drillBrand || "",
      drillExercise: ex.drillExercise || ex.name || "",
      drillCustom: ex.drillCustom || "",
      exerciseNote: ex.exerciseNote || "",
    }));
  });
  const [photos, setPhotos] = useState(initialData?.photos ?? []);
  const [note, setNote] = useState(initialData?.note ?? "");
  const [signature, setSignature] = useState(initialData?.signature ?? null);
  const [catalog, setCatalog] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    supabase
      .from("exercise_catalog")
      .select("region, equipment_type, brand, exercise_name")
      .order("region")
      .order("equipment_type")
      .order("exercise_name")
      .then(({ data }) => { if (data) setCatalog(data); });
  }, []);

  const toggleMuscleGroup = (group) =>
    setMuscleGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );

  const updateExercise = (id, fields) =>
    setExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, ...fields } : ex)));

  const setExerciseType = (id, type) =>
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === id
          ? {
              ...ex, type, entries: [emptyEntry()],
              drillBodyPart: "", drillCustomBodyPart: "", drillTool: "",
              drillBrand: "", drillExercise: "", drillCustom: "", name: "",
            }
          : ex
      )
    );

  const addExercise = () => setExercises((prev) => [...prev, emptyExercise()]);

  const removeExercise = (id) => {
    if (exercises.length === 1) return;
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const addEntry = (exId) =>
    setExercises((prev) =>
      prev.map((ex) => (ex.id === exId ? { ...ex, entries: [...ex.entries, emptyEntry()] } : ex))
    );

  const removeEntry = (exId, entryId) =>
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId ? { ...ex, entries: ex.entries.filter((e) => e.id !== entryId) } : ex
      )
    );

  const updateEntry = (exId, entryId, field, value) =>
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? { ...ex, entries: ex.entries.map((e) => (e.id === entryId ? { ...e, [field]: value } : e)) }
          : ex
      )
    );

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setPhotos((prev) => [...prev, { id: Date.now() + Math.random(), url: ev.target.result, name: file.name }]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (id) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  const handleSubmit = (e) => {
    e.preventDefault();
    const validExercises = exercises
      .filter((ex) => ex.name?.trim())
      .map((ex) => {
        let filtered;
        if (ex.type === "stretch") filtered = ex.entries.filter((e) => e.bodyPart || e.duration);
        else if (ex.type === "cardio") filtered = ex.entries.filter((e) => e.intensity || e.duration);
        else filtered = ex.entries.filter((e) => e.weight || e.sets || e.reps);
        return { ...ex, entries: filtered.length > 0 ? filtered : [ex.entries[0]] };
      });
    onSave({
      id: initialData?.id ?? Date.now(),
      date,
      muscleGroups,
      exercises: validExercises,
      photos,
      note: note.trim(),
      signature,
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-800">
            {initialData ? "운동 기록 수정" : "운동 기록 추가"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">

            {/* 날짜 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {isPersonal ? "개인 운동 일자" : "PT 진행 날짜"} <span className="text-red-500">*</span>
              </label>
              <input
                type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 운동 부위 태그 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                운동 부위 <span className="text-xs text-gray-400 font-normal">(중복 선택 가능)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MUSCLE_GROUPS.map((group) => {
                  const selected = muscleGroups.includes(group);
                  return (
                    <button
                      key={group} type="button" onClick={() => toggleMuscleGroup(group)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                        selected
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                      {group}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 운동 목록 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">운동 목록</label>
                <button
                  type="button" onClick={addExercise}
                  className="text-xs text-blue-600 font-medium hover:text-blue-700"
                >
                  + 운동 추가
                </button>
              </div>

              <div className="space-y-3">
                {exercises.map((ex, idx) => (
                  <div key={ex.id} className="bg-gray-50 rounded-xl p-3 space-y-3">
                    {/* 카드 헤더 */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">운동 {idx + 1}</span>
                      {exercises.length > 1 && (
                        <button type="button" onClick={() => removeExercise(ex.id)} className="text-xs text-red-400 hover:text-red-600">
                          삭제
                        </button>
                      )}
                    </div>

                    {/* 타입 토글 */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                      {[
                        { value: "general", label: "웨이트", active: "bg-blue-600 text-white" },
                        { value: "cardio", label: "유산소", active: "bg-orange-500 text-white" },
                        { value: "stretch", label: "스트레칭&재활", active: "bg-purple-500 text-white" },
                      ].map((t) => (
                        <button
                          key={t.value} type="button" onClick={() => setExerciseType(ex.id, t.value)}
                          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                            ex.type === t.value ? t.active : "bg-white text-gray-400 hover:bg-gray-50"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* ── 웨이트 ── */}
                    {ex.type === "general" && (
                      <>
                        <WeightDrillDown
                          ex={ex}
                          catalog={catalog}
                          onUpdate={(fields) => updateExercise(ex.id, fields)}
                        />

                        <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                          <div className="grid grid-cols-[20px_1fr_1fr_1fr_20px] items-center gap-1.5 bg-gray-100 px-2 py-1.5 text-xs text-gray-400">
                            <span /><span className="text-center">무게 (kg)</span><span className="text-center">횟수 (reps)</span><span className="text-center">세트</span><span />
                          </div>
                          {ex.entries.map((entry, ei) => (
                            <div key={entry.id} className="grid grid-cols-[20px_1fr_1fr_1fr_20px] items-center gap-1.5 border-t border-gray-100 px-2 py-1.5">
                              <span className="text-xs text-gray-300 text-center">{ei + 1}</span>
                              <input type="number" placeholder="0" value={entry.weight} min="0" step="0.5"
                                onChange={(e) => updateEntry(ex.id, entry.id, "weight", e.target.value)}
                                className="min-w-0 w-full border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              <input type="number" placeholder="0" value={entry.reps} min="0"
                                onChange={(e) => updateEntry(ex.id, entry.id, "reps", e.target.value)}
                                className="min-w-0 w-full border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              <input type="number" placeholder="0" value={entry.sets} min="0"
                                onChange={(e) => updateEntry(ex.id, entry.id, "sets", e.target.value)}
                                className="min-w-0 w-full border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              <button type="button" onClick={() => removeEntry(ex.id, entry.id)}
                                className={`text-base leading-none ${ex.entries.length > 1 ? "text-gray-300 hover:text-red-400" : "invisible"}`}>×</button>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <button type="button" onClick={() => addEntry(ex.id)}
                            className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                            + 무게 추가
                          </button>
                          {(() => {
                            const vol = ex.entries.reduce((s, e) =>
                              s + (parseFloat(e.weight) || 0) * (parseInt(e.sets) || 0) * (parseInt(e.reps) || 0), 0);
                            return vol > 0 ? (
                              <span className="text-xs text-gray-500">총 볼륨: <span className="font-semibold text-blue-600">{vol.toLocaleString()} kg</span></span>
                            ) : null;
                          })()}
                        </div>
                      </>
                    )}

                    {/* ── 유산소 ── */}
                    {ex.type === "cardio" && (
                      <>
                        <Select
                          options={toOpt(CARDIO_LIST)}
                          value={ex.name ? { value: ex.name, label: ex.name } : null}
                          onChange={(opt) => updateExercise(ex.id, { name: opt?.value || "" })}
                          placeholder="유산소 종류 선택"
                          styles={selectStyles}
                          isSearchable={false}
                        />
                        <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                          <div className="grid grid-cols-[20px_1fr_1fr_20px] items-center gap-1.5 bg-orange-50 px-2 py-1.5 text-xs text-gray-400">
                            <span /><span className="text-center">강도</span><span className="text-center">시간 (분)</span><span />
                          </div>
                          {ex.entries.map((entry, ei) => (
                            <div key={entry.id} className="grid grid-cols-[20px_1fr_1fr_20px] items-center gap-1.5 border-t border-gray-100 px-2 py-1.5">
                              <span className="text-xs text-gray-300 text-center">{ei + 1}</span>
                              <input type="number" placeholder="0" value={entry.intensity} min="0"
                                onChange={(e) => updateEntry(ex.id, entry.id, "intensity", e.target.value)}
                                className="min-w-0 w-full border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400" />
                              <input type="number" placeholder="0" value={entry.duration} min="0"
                                onChange={(e) => updateEntry(ex.id, entry.id, "duration", e.target.value)}
                                className="min-w-0 w-full border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400" />
                              <button type="button" onClick={() => removeEntry(ex.id, entry.id)}
                                className={`text-base leading-none ${ex.entries.length > 1 ? "text-gray-300 hover:text-red-400" : "invisible"}`}>×</button>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => addEntry(ex.id)}
                          className="text-xs text-orange-500 hover:text-orange-700 font-medium">
                          + 항목 추가
                        </button>
                      </>
                    )}

                    {/* ── 스트레칭&재활 ── */}
                    {ex.type === "stretch" && (
                      <>
                        <LocalInput
                          initValue={ex.name}
                          onCommit={(val) => updateExercise(ex.id, { name: val })}
                          placeholder="스트레칭 이름 입력"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                        />
                        <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                          <div className="grid grid-cols-[20px_1fr_1fr_20px] items-center gap-1.5 bg-purple-50 px-2 py-1.5 text-xs text-gray-400">
                            <span /><span className="text-center">부위</span><span className="text-center">시간 (분)</span><span />
                          </div>
                          {ex.entries.map((entry, ei) => (
                            <div key={entry.id} className="grid grid-cols-[20px_1fr_1fr_20px] items-center gap-1.5 border-t border-gray-100 px-2 py-1.5">
                              <span className="text-xs text-gray-300 text-center">{ei + 1}</span>
                              <input type="text" placeholder="예: 허리" value={entry.bodyPart}
                                onChange={(e) => updateEntry(ex.id, entry.id, "bodyPart", e.target.value)}
                                className="min-w-0 w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                              <input type="number" placeholder="0" value={entry.duration} min="0"
                                onChange={(e) => updateEntry(ex.id, entry.id, "duration", e.target.value)}
                                className="min-w-0 w-full border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-400" />
                              <button type="button" onClick={() => removeEntry(ex.id, entry.id)}
                                className={`text-base leading-none ${ex.entries.length > 1 ? "text-gray-300 hover:text-red-400" : "invisible"}`}>×</button>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => addEntry(ex.id)}
                          className="text-xs text-purple-500 hover:text-purple-700 font-medium">
                          + 부위 추가
                        </button>
                      </>
                    )}

                    {/* 특이사항 (운동별) */}
                    <div>
                      <LocalInput
                        initValue={ex.exerciseNote}
                        onCommit={(val) => updateExercise(ex.id, { exerciseNote: val })}
                        placeholder="특이사항 (예: 왼쪽 어깨 통증, 그립 변경)"
                        className="w-full border border-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 사진 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">사진</label>
              <button
                type="button" onClick={() => fileInputRef.current.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                + 사진 추가 (여러 장 가능)
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {photos.map((p) => (
                    <div key={p.id} className="relative group aspect-square">
                      <img src={p.url} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                      <button type="button" onClick={() => removePhoto(p.id)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 전체 메모 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">메모</label>
              <textarea
                value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                placeholder="오늘 운동 특이사항, 컨디션 등을 기록하세요"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 서명 */}
            {!isPersonal && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">회원 확인 서명</label>
                <SignaturePad value={signature} onChange={setSignature} />
              </div>
            )}
          </div>

          <div className="flex gap-3 px-6 pb-6 pt-2 shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              취소
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              {initialData ? "수정 완료" : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
