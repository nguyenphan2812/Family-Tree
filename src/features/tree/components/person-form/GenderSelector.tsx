"use client";

interface GenderSelectorProps {
  gender: "male" | "female" | "other";
  onChange: (gender: "male" | "female" | "other") => void;
}

export function GenderSelector({ gender, onChange }: GenderSelectorProps) {
  return (
    <div>
      <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
        Giới tính
      </label>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onChange("male")}
          className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
            gender === "male"
              ? "bg-sky-500/20 border-sky-400 text-sky-200 ring-1 ring-sky-400/50 shadow-sm"
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <span>👨</span>
          <span>Nam</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("female")}
          className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
            gender === "female"
              ? "bg-rose-500/20 border-rose-400 text-rose-200 ring-1 ring-rose-400/50 shadow-sm"
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <span>👩</span>
          <span>Nữ</span>
        </button>
        <button
          type="button"
          onClick={() => onChange("other")}
          className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
            gender === "other"
              ? "bg-slate-700 border-slate-500 text-slate-200 ring-1 ring-slate-400/50"
              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          <span>👤</span>
          <span>Khác</span>
        </button>
      </div>
    </div>
  );
}
