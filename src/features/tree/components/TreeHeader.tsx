"use client";

import { Person } from "@/src/types/family";
import { TreeSearchBar } from "./TreeSearchBar";
import { User } from "firebase/auth";

export interface TreeHeaderProps {
  people: Person[];
  personGenerations: Map<string, number>;
  maxGeneration: number;
  hasCollapsedBranches: boolean;
  isEditor: boolean;
  user: User | null;
  onSelectPerson: (personId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onOpenManageEditors: () => void;
  onOpenReset: () => void;
  onSignIn: () => void;
  onLogOut: () => void;
}

export function TreeHeader({
  people,
  personGenerations,
  maxGeneration,
  hasCollapsedBranches,
  isEditor,
  user,
  onSelectPerson,
  onExpandAll,
  onCollapseAll,
  onOpenManageEditors,
  onOpenReset,
  onSignIn,
  onLogOut,
}: TreeHeaderProps) {
  return (
    <div className="absolute top-4 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
      {/* Left: Search Bar */}
      <div className="pointer-events-auto flex items-center gap-2">
        <TreeSearchBar
          people={people}
          personGenerations={personGenerations}
          onSelectPerson={onSelectPerson}
        />
      </div>

      {/* Right: Stats, Reset & Auth */}
      <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/95 border border-slate-700 rounded-lg px-3 py-1.5 shadow-xl backdrop-blur-md text-xs text-slate-300">
        <span className="font-medium text-slate-100">{people.length}</span> người
        <span className="text-slate-600">•</span>
        <span className="font-medium text-amber-300">{maxGeneration}</span> thế hệ
        <span className="text-slate-600">•</span>
        {hasCollapsedBranches ? (
          <button
            onClick={onExpandAll}
            className="text-sky-400 hover:text-sky-300 text-[11px] underline cursor-pointer"
          >
            Mở rộng tất cả
          </button>
        ) : (
          <button
            onClick={onCollapseAll}
            className="text-slate-400 hover:text-slate-200 text-[11px] underline cursor-pointer"
          >
            Thu gọn các nhánh
          </button>
        )}

        {/* Editor Actions (Editors only) */}
        {isEditor && (
          <>
            <span className="text-slate-600">•</span>
            <button
              onClick={onOpenManageEditors}
              className="px-2.5 py-1 rounded bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 hover:text-indigo-100 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition shadow"
              title="Thêm và quản lý người dùng có quyền Editor"
            >
              👥 Thêm Editor
            </button>
            <button
              onClick={onOpenReset}
              className="px-2.5 py-1 rounded bg-red-950/90 hover:bg-red-900 border border-red-700/80 text-red-300 hover:text-red-100 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition shadow"
              title="Xóa toàn bộ dữ liệu để test lại từ đầu (Chỉ Editor)"
            >
              🗑️ Xóa dữ liệu (Reset)
            </button>
          </>
        )}

        <span className="text-slate-600">•</span>
        {/* User status & Login */}
        {!user ? (
          <button
            onClick={onSignIn}
            className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer shadow transition"
          >
            🔑 Đăng nhập Google
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.5 rounded">
              {user.email}
            </span>
            <button
              onClick={onLogOut}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer ml-0.5"
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
