"use client";

import { Person, Marriage } from "@/src/types/family";

interface Props {
  parentPerson: Person;
  marriages: Marriage[];
  people: Person[];
  onSelectMarriage: (marriageId: string) => void;
  onAddSpouseFirst: () => void;
  onCancel: () => void;
}

export function SelectSpouseForChildModal({
  parentPerson,
  marriages,
  people,
  onSelectMarriage,
  onAddSpouseFirst,
  onCancel,
}: Props) {
  const personMap = new Map(people.map((p) => [p.id, p]));

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4 text-slate-100 shadow-xl"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Chọn Mẹ / Cha cho người con
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Người con này là con của {parentPerson.firstName} {parentPerson.lastName} với ai?
          </p>
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {marriages.map((m) => {
            const spouseId = m.spouseIds.find((id) => id !== parentPerson.id);
            const spouse = spouseId ? personMap.get(spouseId) : undefined;
            const spouseName = spouse
              ? `${spouse.firstName} ${spouse.lastName}`
              : "Chưa rõ danh tính (Khuyết danh)";
            const title = m.orderLabel || (m.order ? `Phối ngẫu #${m.order}` : "Hôn nhân");
            const childCount = m.childrenIds.length;

            return (
              <button
                key={m.id}
                onClick={() => onSelectMarriage(m.id)}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-sky-500 text-left transition-all cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200 group-hover:text-sky-300 flex items-center gap-1.5">
                    <span>{spouse?.gender === "female" ? "👰" : "🤵"}</span>
                    <span>{spouseName}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {title} • <span className="text-amber-300 font-medium">{childCount} người con</span>
                  </div>
                </div>
                <span className="text-xs text-slate-400 group-hover:text-sky-400 font-bold">
                  ➔
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAddSpouseFirst}
            className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium transition cursor-pointer"
          >
            ➕ Thêm phối ngẫu mới trước...
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-1.5 text-center text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
