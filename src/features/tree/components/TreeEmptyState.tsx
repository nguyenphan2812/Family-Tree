"use client";

import { User } from "firebase/auth";
import { PersonFormModal, PersonFormData } from "./PersonFormModal";

export interface TreeEmptyStateProps {
  peopleLoading: boolean;
  peopleError: Error | null;
  marriagesError: Error | null;
  user: User | null;
  isEditor: boolean;
  isAddingRootTree: boolean;
  onStartAddRootTree: () => void;
  onCancelAddRootTree: () => void;
  onSaveRootTree: (data: PersonFormData) => Promise<void>;
  onSignIn: () => void;
  onLogOut: () => void;
}

export function TreeEmptyState({
  peopleLoading,
  peopleError,
  marriagesError,
  user,
  isEditor,
  isAddingRootTree,
  onStartAddRootTree,
  onCancelAddRootTree,
  onSaveRootTree,
  onSignIn,
  onLogOut,
}: TreeEmptyStateProps) {
  if (peopleError || marriagesError) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-300 p-4">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm bg-slate-900 border border-red-800/80 p-6 rounded-2xl shadow-xl">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-base font-semibold text-red-300">Không thể tải dữ liệu gia phả</h2>
          <p className="text-xs text-slate-400">
            {peopleError?.message || marriagesError?.message || "Đã xảy ra sự cố khi kết nối dữ liệu. Vui lòng kiểm tra kết nối mạng."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 mt-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  if (peopleLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-300 text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải dữ liệu gia phả...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-300 p-4">
      {!user ? (
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
            🌳
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Bắt đầu Cây Gia Phả</h2>
            <p className="text-xs text-slate-400 mt-1">
              Cây gia phả hiện đang trống. Hãy đăng nhập tài khoản Editor để tạo người Thủy Tổ (Cụ Tổ) đầu tiên.
            </p>
          </div>
          <button
            onClick={onSignIn}
            className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-lg cursor-pointer transition flex items-center gap-2"
          >
            🔑 Đăng nhập Google để bắt đầu
          </button>
        </div>
      ) : isEditor ? (
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shadow-inner">
            🌳
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Bắt đầu Cây Gia Phả</h2>
            <p className="text-xs text-slate-400 mt-1">
              Đăng nhập: <span className="text-emerald-400 font-medium">{user.email}</span> (Quyền Editor)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onStartAddRootTree}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg cursor-pointer transition"
            >
              + Tạo Cụ Tổ (Bắt đầu cây)
            </button>
            <button
              onClick={onLogOut}
              className="px-3 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 text-xs cursor-pointer transition"
            >
              Đăng xuất
            </button>
          </div>
          {isAddingRootTree && (
            <PersonFormModal
              title="Bắt đầu Cây Gia Phả (Thủy Tổ)"
              subtitle="Tạo người đứng đầu cây gia phả"
              submitLabel="Tạo Cụ Tổ"
              onSubmit={onSaveRootTree}
              onCancel={onCancelAddRootTree}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <p className="text-slate-300 text-sm">
            Bạn đang đăng nhập là <strong className="text-white">{user.email}</strong>, nhưng tài khoản này chưa có trong danh sách Editor.
          </p>
          <button
            onClick={onLogOut}
            className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs cursor-pointer transition"
          >
            Đăng xuất và đăng nhập tài khoản khác
          </button>
        </div>
      )}
    </div>
  );
}
