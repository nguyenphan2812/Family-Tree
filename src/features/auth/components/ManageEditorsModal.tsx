"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useAuth } from "../hooks/useAuth";

interface Props {
  onClose: () => void;
}

export function ManageEditorsModal({ onClose }: Props) {
  const { user } = useAuth();
  const [editorEmails, setEditorEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const familyId = process.env.NEXT_PUBLIC_FAMILY_ID || "phan-family";

  useEffect(() => {
    const familyRef = doc(db, "families", familyId);
    const unsubscribe = onSnapshot(
      familyRef,
      (snapshot) => {
        const data = snapshot.data();
        const emails: string[] = data?.editorEmails ?? [];
        setEditorEmails(emails);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load editors:", err);
        setStatusMessage({ type: "error", text: "Không thể tải danh sách Editor từ Firestore." });
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [familyId]);

  async function handleAddEditor(e: React.FormEvent) {
    e.preventDefault();
    const emailToClean = newEmail.toLowerCase().trim();
    if (!emailToClean) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToClean)) {
      setStatusMessage({ type: "error", text: "Địa chỉ email không đúng định dạng." });
      return;
    }

    if (editorEmails.some((e) => e.toLowerCase().trim() === emailToClean)) {
      setStatusMessage({ type: "error", text: "Email này đã có trong danh sách Editor." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const familyRef = doc(db, "families", familyId);
      try {
        await updateDoc(familyRef, {
          editorEmails: arrayUnion(emailToClean),
        });
      } catch (updateErr: unknown) {
        const firebaseErr = updateErr as { code?: string };
        if (firebaseErr?.code === "not-found") {
          await setDoc(
            familyRef,
            {
              editorEmails: [emailToClean],
            },
            { merge: true }
          );
        } else {
          throw updateErr;
        }
      }
      setNewEmail("");
      setStatusMessage({ type: "success", text: `Đã cấp quyền Editor cho ${emailToClean}!` });
    } catch (err: unknown) {
      console.error("Failed to add editor:", err);
      const firebaseErr = err as { code?: string; message?: string };
      const isPermissionDenied =
        firebaseErr?.code === "permission-denied" ||
        Boolean(firebaseErr?.message?.includes("insufficient permissions"));
      setStatusMessage({
        type: "error",
        text: isPermissionDenied
          ? "Firestore từ chối quyền (permission-denied). Vui lòng cập nhật Rules trên Firebase Console theo file firestore.rules."
          : `Lỗi: ${firebaseErr?.message || "Không thể cấp quyền."}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveEditor(emailToRemove: string) {
    if (editorEmails.length <= 1) {
      setStatusMessage({
        type: "error",
        text: "Không thể xóa. Cần giữ lại ít nhất 1 Editor cho cây gia phả.",
      });
      return;
    }

    const isCurrent = user?.email && user.email.toLowerCase().trim() === emailToRemove.toLowerCase().trim();
    if (isCurrent) {
      const confirmSelf = confirm(
        "Bạn đang xóa quyền Editor của chính mình. Sau khi xóa, bạn sẽ không thể chỉnh sửa nữa. Bạn có chắc không?"
      );
      if (!confirmSelf) return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const familyRef = doc(db, "families", familyId);
      await updateDoc(familyRef, {
        editorEmails: arrayRemove(emailToRemove),
      });
      setStatusMessage({ type: "success", text: `Đã thu hồi quyền Editor của ${emailToRemove}.` });
    } catch (err: unknown) {
      console.error("Failed to remove editor:", err);
      const firebaseErr = err as { code?: string; message?: string };
      const isPermissionDenied =
        firebaseErr?.code === "permission-denied" ||
        Boolean(firebaseErr?.message?.includes("insufficient permissions"));
      setStatusMessage({
        type: "error",
        text: isPermissionDenied
          ? "Firestore từ chối quyền (permission-denied). Vui lòng cập nhật Rules trên Firebase Console."
          : `Lỗi: ${firebaseErr?.message || "Lỗi khi thu hồi quyền Editor."}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 text-slate-100 shadow-2xl animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>👥</span>
              <span>Quản lý quyền Editor</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Những tài khoản có trong danh sách được phép chỉnh sửa cây gia phả
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex items-center justify-center text-sm cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Status message */}
        {statusMessage && (
          <div
            className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between animate-in fade-in duration-150 ${
              statusMessage.type === "success"
                ? "bg-emerald-950/60 border border-emerald-800/80 text-emerald-300"
                : "bg-rose-950/60 border border-rose-800/80 text-rose-300"
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Add Editor Form */}
        <form onSubmit={handleAddEditor} className="flex flex-col gap-2">
          <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
            Thêm Editor mới (Email Google)
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="VD: nguyenvana@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={isSubmitting}
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newEmail.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs cursor-pointer shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
            >
              <span>+</span>
              <span>Thêm</span>
            </button>
          </div>
        </form>

        {/* Current Editors List */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Danh sách Editor hiện tại ({editorEmails.length})</span>
            {loading && <span className="text-[10px] text-slate-500">Đang tải...</span>}
          </div>

          <div className="max-h-52 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {editorEmails.length === 0 && !loading ? (
              <div className="p-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center text-xs text-slate-500 italic">
                Chưa có email nào trong danh sách.
              </div>
            ) : (
              editorEmails.map((email) => {
                const isCurrentUser =
                  user?.email && user.email.toLowerCase().trim() === email.toLowerCase().trim();
                return (
                  <div
                    key={email}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-750 transition text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-sm">👤</span>
                      <span className="text-slate-200 truncate">{email}</span>
                      {isCurrentUser && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 shrink-0">
                          Bạn
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveEditor(email)}
                      disabled={isSubmitting}
                      title="Thu hồi quyền Editor"
                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800/80 cursor-pointer transition text-xs shrink-0"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
