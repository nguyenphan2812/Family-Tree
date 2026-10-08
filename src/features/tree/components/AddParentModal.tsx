"use client";

import { useState } from "react";
import { Person, Marriage } from "@/src/types/family";
import { PersonFormData } from "./PersonFormModal";

interface Props {
  childPerson: Person;
  existingParentMarriage?: Marriage;
  people: Person[];
  onSubmit: (data: {
    fatherData?: PersonFormData;
    motherData?: PersonFormData;
    existingMarriageId?: string;
  }) => void;
  onCancel: () => void;
}

export function AddParentModal({
  childPerson,
  existingParentMarriage,
  people,
  onSubmit,
  onCancel,
}: Props) {
  // If there's already a single parent, check who is missing
  const existingFather = existingParentMarriage
    ? people.find(
        (p) =>
          existingParentMarriage.spouseIds.includes(p.id) && p.gender === "male"
      )
    : undefined;
  const existingMother = existingParentMarriage
    ? people.find(
        (p) =>
          existingParentMarriage.spouseIds.includes(p.id) && p.gender === "female"
      )
    : undefined;

  const [addFather, setAddFather] = useState(!existingFather);
  const [addMother, setAddMother] = useState(!existingMother);

  const [fatherFirstName, setFatherFirstName] = useState("");
  const [fatherLastName, setFatherLastName] = useState(childPerson.lastName || "");
  const [fatherBirthDate, setFatherBirthDate] = useState("");

  const [motherFirstName, setMotherFirstName] = useState("");
  const [motherLastName, setMotherLastName] = useState("");
  const [motherBirthDate, setMotherBirthDate] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let fatherData: PersonFormData | undefined = undefined;
    if (addFather && fatherFirstName.trim()) {
      fatherData = {
        firstName: fatherFirstName.trim(),
        lastName: fatherLastName.trim(),
        birthDate: fatherBirthDate,
        deathDate: "",
        gender: "male",
        bio: "",
      };
    }

    let motherData: PersonFormData | undefined = undefined;
    if (addMother && motherFirstName.trim()) {
      motherData = {
        firstName: motherFirstName.trim(),
        lastName: motherLastName.trim(),
        birthDate: motherBirthDate,
        deathDate: "",
        gender: "female",
        bio: "",
      };
    }

    if (!fatherData && !motherData) return;

    onSubmit({
      fatherData,
      motherData,
      existingMarriageId: existingParentMarriage?.id,
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
            Thêm Cha / Mẹ (Tiền nhân)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cho {childPerson.firstName} {childPerson.lastName}
          </p>
        </div>

        {/* Father Section */}
        {existingFather ? (
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-xs">
            <span className="text-slate-400">Đã có Cha: </span>
            <span className="font-medium text-sky-300">
              {existingFather.firstName} {existingFather.lastName}
            </span>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-lg p-3 bg-slate-800/40 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-sky-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addFather}
                  onChange={(e) => setAddFather(e.target.checked)}
                  className="rounded accent-sky-500"
                />
                👨 Thêm Cha (Người phối ngẫu nam)
              </label>
            </div>
            {addFather && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  placeholder="Họ (Last name)"
                  value={fatherLastName}
                  onChange={(e) => setFatherLastName(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
                <input
                  placeholder="Tên (First name)"
                  value={fatherFirstName}
                  onChange={(e) => setFatherFirstName(e.target.value)}
                  required={addFather}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
                <div className="col-span-2">
                  <input
                    type="date"
                    value={fatherBirthDate}
                    onChange={(e) => setFatherBirthDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-400"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mother Section */}
        {existingMother ? (
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-xs">
            <span className="text-slate-400">Đã có Mẹ: </span>
            <span className="font-medium text-rose-300">
              {existingMother.firstName} {existingMother.lastName}
            </span>
          </div>
        ) : (
          <div className="border border-slate-800 rounded-lg p-3 bg-slate-800/40 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-rose-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addMother}
                  onChange={(e) => setAddMother(e.target.checked)}
                  className="rounded accent-rose-500"
                />
                👩 Thêm Mẹ (Người phối ngẫu nữ)
              </label>
            </div>
            {addMother && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  placeholder="Họ (Last name)"
                  value={motherLastName}
                  onChange={(e) => setMotherLastName(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
                <input
                  placeholder="Tên (First name)"
                  value={motherFirstName}
                  onChange={(e) => setMotherFirstName(e.target.value)}
                  required={addMother}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                />
                <div className="col-span-2">
                  <input
                    type="date"
                    value={motherBirthDate}
                    onChange={(e) => setMotherBirthDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-400"
                  />
                </div>
              </div>
            )}
          </div>
        )}

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
            className="flex-1 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs cursor-pointer shadow"
          >
            Lưu Cha Mẹ
          </button>
        </div>
      </form>
    </div>
  );
}
