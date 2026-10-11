"use client";

import { useState } from "react";
import { Person, Marriage } from "@/src/types/family";
import { PersonFormData } from "./PersonFormModal";

interface Props {
  person: Person;
  existingMarriages: Marriage[];
  people: Person[];
  direction?: "left" | "right";
  onSubmit: (data: {
    spouseData: PersonFormData;
    order: number;
    orderLabel: string;
  }) => void;
  onCancel: () => void;
}

export function AddSpouseModal({
  person,
  existingMarriages,
  people,
  direction = "right",
  onSubmit,
  onCancel,
}: Props) {
  const currentCount = existingMarriages.length;
  const defaultOrder = currentCount + 1;

  // Opposite gender default
  const defaultGender = person.gender === "female" ? "male" : "female";

  // Suggest title based on order
  const getSuggestedLabel = (order: number, gender: "male" | "female" | "other") => {
    if (gender === "female") {
      if (order === 1) return "Bà Cả (Chính thất)";
      if (order === 2) return "Bà Hai (Kế thất)";
      if (order === 3) return "Bà Ba";
      if (order === 4) return "Bà Tư";
      if (order === 5) return "Bà Năm";
      return `Bà thứ ${order}`;
    } else {
      if (order === 1) return "Chồng (Chính phu)";
      return `Chồng thứ ${order}`;
    }
  };

  const [order, setOrder] = useState(defaultOrder);
  const [gender, setGender] = useState<"male" | "female" | "other">(defaultGender);
  const [orderLabel, setOrderLabel] = useState(getSuggestedLabel(defaultOrder, defaultGender));
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [bio, setBio] = useState("");

  function handleOrderChange(newOrder: number) {
    setOrder(newOrder);
    setOrderLabel(getSuggestedLabel(newOrder, gender));
  }

  function handleGenderChange(newGender: "male" | "female" | "other") {
    setGender(newGender);
    setOrderLabel(getSuggestedLabel(order, newGender));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;

    onSubmit({
      spouseData: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate,
        deathDate,
        gender,
        bio,
      },
      order,
      orderLabel: orderLabel.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md flex flex-col gap-4 text-slate-100 shadow-xl"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Thêm Phối ngẫu (Vợ / Chồng)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cho {person.firstName} {person.lastName}
          </p>
        </div>

        {/* Existing Spouses summary */}
        {existingMarriages.length > 0 && (
          <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700 text-xs">
            <span className="text-slate-400 block mb-1">Các phối ngẫu đã có ({existingMarriages.length}):</span>
            <div className="flex flex-wrap gap-1.5">
              {existingMarriages.map((m) => {
                const spId = m.spouseIds.find((id) => id !== person.id);
                const sp = people.find((p) => p.id === spId);
                return (
                  <span
                    key={m.id}
                    className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 text-[11px]"
                  >
                    #{m.order} {sp ? `${sp.firstName} ${sp.lastName}` : "Chưa rõ"}{" "}
                    {m.orderLabel ? `(${m.orderLabel})` : ""}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Marriage Order & Label */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Thứ tự phối ngẫu (Order)</label>
            <input
              type="number"
              min={1}
              value={order}
              onChange={(e) => handleOrderChange(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Danh xưng / Vai vế</label>
            <input
              type="text"
              placeholder="VD: Bà Cả, Bà Hai..."
              value={orderLabel}
              onChange={(e) => setOrderLabel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            />
          </div>
        </div>

        {/* Spouse Personal Info */}
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Họ (Last name)"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          />
          <input
            placeholder="Tên (First name)"
            value={firstName}
            autoFocus
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] text-slate-400 block mb-0.5">Giới tính</label>
            <select
              value={gender}
              onChange={(e) => handleGenderChange(e.target.value as "male" | "female" | "other")}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
            >
              <option value="female">Nữ (Vợ)</option>
              <option value="male">Nam (Chồng)</option>
              <option value="other">Khác</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-0.5">Ngày sinh</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
            />
          </div>
        </div>

        <textarea
          placeholder="Ghi chú / Tiểu sử (Bio)"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={2}
          className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 resize-none"
        />

        <div className="flex gap-2.5 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer shadow"
          >
            Thêm phối ngẫu
          </button>
        </div>
      </form>
    </div>
  );
}
