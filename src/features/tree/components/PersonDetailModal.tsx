"use client";

import Image from "next/image";
import { Person, Marriage } from "@/src/types/family";

interface Props {
  person: Person;
  generation?: number;
  people: Person[];
  marriages: Marriage[];
  onClose: () => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "Chưa rõ";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
  }
  return dateStr;
}

function getAgeInfo(birthDate?: string, deathDate?: string): string | null {
  if (!birthDate) return null;
  const birthYear = new Date(birthDate).getFullYear();
  if (isNaN(birthYear)) return null;

  if (deathDate) {
    const deathYear = new Date(deathDate).getFullYear();
    if (!isNaN(deathYear)) {
      const ageAtDeath = deathYear - birthYear;
      return ageAtDeath >= 0 ? `Hưởng thọ: ${ageAtDeath} tuổi` : null;
    }
  } else {
    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - birthYear;
    return currentAge >= 0 && currentAge <= 125 ? `Hiện tại: ${currentAge} tuổi` : null;
  }
  return null;
}

export function PersonDetailModal({
  person,
  generation,
  people,
  marriages,
  onClose,
}: Props) {
  const isMale = person.gender === "male";
  const isFemale = person.gender === "female";
  const isPlaceholder = Boolean(person.isPlaceholder);

  const displayName = isPlaceholder
    ? `${person.firstName} ${person.lastName}`.trim() || "Khuyết danh"
    : person.lastName
    ? `${person.lastName} ${person.firstName}`
    : person.firstName;

  const ageText = getAgeInfo(person.birthDate, person.deathDate);

  // Parents
  const parentMarriage = marriages.find((m) => m.childrenIds.includes(person.id));
  const parents = parentMarriage
    ? parentMarriage.spouseIds
        .map((pId) => people.find((p) => p.id === pId))
        .filter((p): p is Person => Boolean(p))
    : [];

  // Marriages and Spouses
  const myMarriages = marriages
    .filter((m) => m.spouseIds.includes(person.id))
    .sort((a, b) => a.order - b.order);

  const genderBadgeClass = isMale
    ? "bg-sky-950/80 text-sky-300 border-sky-800"
    : isFemale
    ? "bg-rose-950/80 text-rose-300 border-rose-800"
    : "bg-slate-800 text-slate-300 border-slate-700";

  const avatarBorderClass = isMale
    ? "border-sky-500 shadow-sky-900/30"
    : isFemale
    ? "border-rose-400 shadow-rose-900/30"
    : "border-slate-500 shadow-slate-900/30";

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 w-full max-w-lg flex flex-col gap-5 text-slate-100 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Thông tin thành viên</h2>
              <p className="text-xs text-slate-400">Xem thông tin chi tiết trong gia phả</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex items-center justify-center text-sm cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Profile Card / Main Focus Photo */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 flex items-center justify-center bg-slate-900 shadow-lg shrink-0 ${avatarBorderClass}`}
          >
            {person.photoURL ? (
              <Image
                src={person.photoURL}
                alt={displayName}
                width={112}
                height={112}
                unoptimized
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-5xl select-none">
                {isPlaceholder ? "👤" : isMale ? "👨" : isFemale ? "👩" : "👤"}
              </span>
            )}
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              {generation && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Đời thứ {generation}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${genderBadgeClass}`}>
                {isMale ? "Nam" : isFemale ? "Nữ" : "Khác"}
              </span>
              {person.spouseLabel && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                  {person.spouseLabel}
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-slate-100 tracking-tight break-words">
              {displayName}
            </h3>

            {ageText && (
              <div className="text-xs text-amber-400/90 font-medium">{ageText}</div>
            )}
          </div>
        </div>

        {/* Key Information Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-1">
            <span className="text-slate-400 text-[11px]">Ngày / Năm sinh</span>
            <span className="font-medium text-slate-200">
              {formatDate(person.birthDate)}
            </span>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 flex flex-col gap-1">
            <span className="text-slate-400 text-[11px]">Ngày / Năm mất</span>
            <span className="font-medium text-slate-200">
              {person.deathDate ? formatDate(person.deathDate) : "Còn sống (hoặc chưa rõ)"}
            </span>
          </div>
        </div>

        {/* Bio / Biography */}
        {person.bio && person.bio.trim() && (
          <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-1.5">
            <span className="text-slate-400 text-[11px] font-medium">Tiểu sử & Ghi chú</span>
            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
              {person.bio}
            </p>
          </div>
        )}

        {/* Lineage & Family Members */}
        <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80 flex flex-col gap-3 text-xs">
          <span className="text-slate-300 font-semibold border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
            <span>🌳</span>
            <span>Quan hệ gia đình</span>
          </span>

          {/* Parents */}
          <div className="flex flex-col gap-1">
            <span className="text-slate-400 text-[11px]">Cha / Mẹ:</span>
            {parents.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {parents.map((parent) => (
                  <span
                    key={parent.id}
                    className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs"
                  >
                    {parent.lastName ? `${parent.lastName} ${parent.firstName}` : parent.firstName}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-500 italic">Chưa có thông tin cha mẹ</span>
            )}
          </div>

          {/* Spouses & Children */}
          {myMarriages.length > 0 ? (
            <div className="flex flex-col gap-2 mt-1">
              <span className="text-slate-400 text-[11px]">Hôn nhân & Con cái:</span>
              <div className="flex flex-col gap-2">
                {myMarriages.map((m) => {
                  const spouseId = m.spouseIds.find((id) => id !== person.id);
                  const spouse = spouseId ? people.find((p) => p.id === spouseId) : null;
                  const children = m.childrenIds
                    .map((cId) => people.find((p) => p.id === cId))
                    .filter((p): p is Person => Boolean(p));

                  const spouseName = spouse
                    ? spouse.lastName
                      ? `${spouse.lastName} ${spouse.firstName}`
                      : spouse.firstName
                    : "Khuyết danh";

                  return (
                    <div
                      key={m.id}
                      className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                        <span>💍</span>
                        <span>{spouseName}</span>
                        {m.orderLabel && (
                          <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-900 px-1.5 py-0.2 rounded">
                            {m.orderLabel}
                          </span>
                        )}
                      </div>

                      {children.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 pl-4 text-[11px] text-slate-300">
                          <span className="text-slate-500">Con ({children.length}):</span>
                          {children.map((c) => (
                            <span
                              key={c.id}
                              className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300"
                            >
                              {c.lastName ? `${c.lastName} ${c.firstName}` : c.firstName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="pl-4 text-[11px] text-slate-500 italic">
                          Chưa có con ghi nhận
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-slate-400 text-[11px]">Hôn nhân:</span>
              <span className="text-slate-500 italic">Chưa có thông tin hôn nhân</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
