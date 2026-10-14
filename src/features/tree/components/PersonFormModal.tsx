"use client";

import { useState } from "react";
import { AvatarUploadField } from "./person-form/AvatarUploadField";
import { GenderSelector } from "./person-form/GenderSelector";

export interface PersonFormData {
  firstName: string;
  lastName: string;
  birthDate: string;
  deathDate: string;
  gender: "male" | "female" | "other";
  bio: string;
  photoURL?: string;
  spouseLabel?: string;
  birthOrder?: number;
}

interface Props {
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  initialData?: PersonFormData;
  onSubmit: (data: PersonFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function PersonFormModal({
  title,
  subtitle,
  submitLabel,
  initialData,
  onSubmit,
  onCancel,
  onDelete,
}: Props) {
  const [firstName, setFirstName] = useState(initialData?.firstName ?? "");
  const [lastName, setLastName] = useState(initialData?.lastName ?? "");
  const [birthDate, setBirthDate] = useState(initialData?.birthDate ?? "");
  const [deathDate, setDeathDate] = useState(initialData?.deathDate ?? "");
  const [gender, setGender] = useState<"male" | "female" | "other">(initialData?.gender ?? "male");
  const [photoURL, setPhotoURL] = useState(initialData?.photoURL ?? "");
  const [spouseLabel, setSpouseLabel] = useState(initialData?.spouseLabel ?? "");
  const [birthOrder, setBirthOrder] = useState<string>(
    initialData?.birthOrder ? String(initialData.birthOrder) : ""
  );
  const [bio, setBio] = useState(initialData?.bio ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isEdit = Boolean(initialData && !title);
  const displayTitle = title ?? (isEdit ? "Chỉnh sửa thông tin" : "Thêm thành viên");
  const displaySubmitLabel = submitLabel ?? (isEdit ? "Lưu thay đổi" : "Thêm vào gia phả");


  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate,
      deathDate,
      gender,
      bio,
      photoURL: photoURL.trim() || undefined,
      spouseLabel: spouseLabel.trim() || undefined,
      birthOrder: birthOrder ? Number(birthOrder) : undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 w-full max-w-md flex flex-col gap-4 text-slate-100 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <span>{displayTitle.includes("Con") ? "👶" : isEdit ? "✏️" : "👤"}</span>
              <span>{displayTitle}</span>
            </h2>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex items-center justify-center text-sm cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Photo Upload Section */}
        <AvatarUploadField
          photoURL={photoURL}
          onPhotoChange={setPhotoURL}
          gender={gender}
        />

        {/* Gender Selection */}
        <GenderSelector gender={gender} onChange={setGender} />

        {/* Names (Last Name & First Name) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Họ & tên đệm
            </label>
            <input
              placeholder="VD: Nguyễn, Phan..."
              value={lastName}
              autoFocus
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Tên <span className="text-rose-400">*</span>
            </label>
            <input
              placeholder="VD: Văn Nam, Mai..."
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
        </div>

        {/* Birth order & Role label */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Con thứ mấy
            </label>
            <input
              type="number"
              min={1}
              placeholder="VD: 1, 2, 3..."
              value={birthOrder}
              onChange={(e) => setBirthOrder(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Danh xưng / Vai vế
            </label>
            <input
              placeholder="VD: Trưởng nam, Út..."
              value={spouseLabel}
              onChange={(e) => setSpouseLabel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Ngày sinh
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Ngày mất (nếu có)
            </label>
            <input
              type="date"
              value={deathDate}
              onChange={(e) => setDeathDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
        </div>

        {/* Bio / Notes */}
        <div>
          <label className="text-[11px] font-medium text-slate-400 block mb-1">
            Tiểu sử / Ghi chú
          </label>
          <textarea
            placeholder="Nơi sinh, nghề nghiệp, ghi chú thêm..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none transition"
          />
        </div>

        {/* Normal Action Buttons */}
        {!confirmingDelete && (
          <div className="flex gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 cursor-pointer transition font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer shadow-lg shadow-emerald-950/60 transition"
            >
              {displaySubmitLabel}
            </button>
          </div>
        )}

        {/* Delete button (only when editing) */}
        {initialData && onDelete && !confirmingDelete && (
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-[11px] text-red-400 hover:text-red-300 hover:underline cursor-pointer transition"
            >
              🗑️ Xóa người này khỏi cây gia phả
            </button>
          </div>
        )}

        {/* Confirm Delete State */}
        {confirmingDelete && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/80 flex flex-col gap-2.5 text-xs animate-in fade-in duration-150">
            <p className="text-red-200 leading-relaxed text-[11px]">
              ⚠️ Bạn có chắc muốn xóa người này? Toàn bộ liên kết hôn nhân liên quan cũng sẽ được cập nhật. Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs cursor-pointer shadow"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}