"use client";

import { useState, useRef, useEffect } from "react";
import { Person } from "@/src/types/family";

interface Props {
  people: Person[];
  personGenerations: Map<string, number>;
  onSelectPerson: (personId: string) => void;
}

export function TreeSearchBar({ people, personGenerations, onSelectPerson }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? people.filter((p) => {
        const full = `${p.firstName} ${p.lastName}`.toLowerCase();
        return full.includes(query.toLowerCase().trim());
      })
    : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative z-40">
      <div className="flex items-center bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 shadow-lg backdrop-blur-md w-60 sm:w-72">
        <span className="text-slate-400 text-xs mr-2">🔍</span>
        <input
          type="text"
          placeholder="Tìm người trong cây..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="bg-transparent border-none outline-hidden text-xs text-slate-200 placeholder-slate-500 w-full"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="text-slate-500 hover:text-slate-300 text-xs ml-1 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto py-1">
          {filtered.slice(0, 8).map((p) => {
            const gen = personGenerations.get(p.id) ?? 1;
            const parsedYear = p.birthDate ? new Date(p.birthDate).getFullYear() : null;
            const year = parsedYear && !isNaN(parsedYear) ? parsedYear : null;

            return (
              <button
                key={p.id}
                onClick={() => {
                  onSelectPerson(p.id);
                  setOpen(false);
                  setQuery(`${p.firstName} ${p.lastName}`);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center justify-between text-xs text-slate-200 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>{p.gender === "female" ? "👩" : "👨"}</span>
                  <span className="font-medium truncate">
                    {p.firstName} {p.lastName}
                  </span>
                  {p.spouseLabel && (
                    <span className="text-[10px] text-amber-300">({p.spouseLabel})</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                    Đời {gen}
                  </span>
                  {year && <span>{year}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {open && query.trim() && filtered.length === 0 && (
        <div className="absolute top-full left-0 mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-3 text-center text-xs text-slate-400">
          Không tìm thấy thành viên phù hợp
        </div>
      )}
    </div>
  );
}
