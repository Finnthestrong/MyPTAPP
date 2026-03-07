import { useState, useRef } from "react";
import SignaturePad from "./SignaturePad";

const today = new Date().toISOString().split("T")[0];

const EXERCISE_LIST = ["Bench press", "Side lateral raise", "Over head press"];
const MUSCLE_GROUPS = ["가슴", "어깨", "팔", "등", "하체", "스트레칭&재활"];

const emptyEntry = () => ({ id: Date.now() + Math.random(), weight: "", sets: "", reps: "" });
const emptyExercise = () => ({ id: Date.now() + Math.random(), name: "", entries: [emptyEntry()] });

export default function WorkoutForm({ onClose, onSave, initialData, isPersonal = false }) {
  const [date, setDate] = useState(initialData?.date ?? today);
  const [muscleGroups, setMuscleGroups] = useState(initialData?.muscleGroups ?? []);
  const [exercises, setExercises] = useState(() => {
    if (!initialData?.exercises?.length) return [emptyExercise()];
    return initialData.exercises.map((ex) => ({
      ...ex,
      entries: ex.entries?.length ? ex.entries : [{ id: Date.now() + Math.random(), weight: ex.weight ?? "", sets: ex.sets ?? "", reps: ex.reps ?? "" }],
    }));
  });
  const [photos, setPhotos] = useState(initialData?.photos ?? []);
  const [note, setNote] = useState(initialData?.note ?? "");
  const [signature, setSignature] = useState(initialData?.signature ?? null);
  const fileInputRef = useRef(null);

  const toggleMuscleGroup = (group) => {
    setMuscleGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const updateExerciseName = (id, name) => {
    setExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, name } : ex)));
  };

  const addExercise = () => setExercises((prev) => [...prev, emptyExercise()]);

  const removeExercise = (id) => {
    if (exercises.length === 1) return;
    setExercises((prev) => prev.filter((ex) => ex.id !== id));
  };

  const addEntry = (exId) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === exId ? { ...ex, entries: [...ex.entries, emptyEntry()] } : ex))
    );
  };

  const removeEntry = (exId, entryId) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId ? { ...ex, entries: ex.entries.filter((e) => e.id !== entryId) } : ex
      )
    );
  };

  const updateEntry = (exId, entryId, field, value) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exId
          ? { ...ex, entries: ex.entries.map((e) => (e.id === entryId ? { ...e, [field]: value } : e)) }
          : ex
      )
    );
  };

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos((prev) => [
          ...prev,
          { id: Date.now() + Math.random(), url: ev.target.result, name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (id) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  const handleSubmit = (e) => {
    e.preventDefault();
    const validExercises = exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({ ...ex, entries: ex.entries.filter((e) => e.weight || e.sets || e.reps) || [ex.entries[0]] }));
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-gray-800">
            {initialData ? "운동 기록 수정" : "운동 기록 추가"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {isPersonal ? "개인 운동 일자" : "PT 진행 날짜"} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Muscle Groups */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                운동 부위 <span className="text-xs text-gray-400 font-normal">(중복 선택 가능)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MUSCLE_GROUPS.map((group) => {
                  const selected = muscleGroups.includes(group);
                  return (
                    <button
                      key={group}
                      type="button"
                      onClick={() => toggleMuscleGroup(group)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all border-2 ${
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

            {/* Exercises */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">운동 목록</label>
                <button
                  type="button"
                  onClick={addExercise}
                  className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
                >
                  + 운동 추가
                </button>
              </div>

              <div className="space-y-3">
                {exercises.map((ex, idx) => (
                  <div key={ex.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">운동 {idx + 1}</span>
                      {exercises.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeExercise(ex.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <select
                      value={ex.name}
                      onChange={(e) => updateExerciseName(ex.id, e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                    >
                      <option value="">운동 선택</option>
                      {EXERCISE_LIST.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>

                    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                      <div className="grid grid-cols-[20px_1fr_1fr_1fr_20px] items-center gap-1.5 bg-gray-100 px-2 py-1.5 text-xs text-gray-400">
                        <span />
                        <span className="text-center">무게 (kg)</span>
                        <span className="text-center">세트</span>
                        <span className="text-center">횟수 (reps)</span>
                        <span />
                      </div>
                      {ex.entries.map((entry, entryIdx) => (
                        <div key={entry.id} className="grid grid-cols-[20px_1fr_1fr_1fr_20px] items-center gap-1.5 border-t border-gray-100 px-2 py-1.5">
                          <span className="text-xs text-gray-300 text-center">{entryIdx + 1}</span>
                          <input
                            type="number"
                            placeholder="0"
                            value={entry.weight}
                            onChange={(e) => updateEntry(ex.id, entry.id, "weight", e.target.value)}
                            min="0"
                            step="0.5"
                            className="min-w-0 w-full border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="number"
                            placeholder="0"
                            value={entry.sets}
                            onChange={(e) => updateEntry(ex.id, entry.id, "sets", e.target.value)}
                            min="0"
                            className="min-w-0 w-full border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="number"
                            placeholder="0"
                            value={entry.reps}
                            onChange={(e) => updateEntry(ex.id, entry.id, "reps", e.target.value)}
                            min="0"
                            className="min-w-0 w-full border border-gray-200 rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeEntry(ex.id, entry.id)}
                            className={`text-base leading-none transition-colors ${ex.entries.length > 1 ? "text-gray-300 hover:text-red-400" : "invisible"}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <button
                        type="button"
                        onClick={() => addEntry(ex.id)}
                        className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                      >
                        + 무게 추가
                      </button>
                      {(() => {
                        const volume = ex.entries.reduce((sum, e) => {
                          const w = parseFloat(e.weight) || 0;
                          const s = parseInt(e.sets) || 0;
                          const r = parseInt(e.reps) || 0;
                          return sum + w * s * r;
                        }, 0);
                        return volume > 0 ? (
                          <span className="text-xs text-gray-500">
                            총 볼륨: <span className="font-semibold text-blue-600">{volume.toLocaleString()} kg</span>
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">사진</label>
              <button
                type="button"
                onClick={() => fileInputRef.current.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                + 사진 추가 (여러 장 가능)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotos}
                className="hidden"
              />
              {photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {photos.map((p) => (
                    <div key={p.id} className="relative group aspect-square">
                      <img
                        src={p.url}
                        alt={p.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(p.id)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">메모</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="오늘 운동 특이사항, 컨디션 등을 기록하세요"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Signature */}
            {!isPersonal && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  회원 확인 서명
                </label>
                <SignaturePad value={signature} onChange={setSignature} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6 pt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              {initialData ? "수정 완료" : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
