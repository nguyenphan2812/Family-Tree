"use client";

import { Person, Marriage } from "@/src/types/family";
import { PersonFormModal } from "./PersonFormModal";
import { PersonDetailModal } from "./PersonDetailModal";
import { AddParentModal } from "./AddParentModal";
import { AddSpouseModal } from "./AddSpouseModal";
import { SelectSpouseForChildModal } from "./SelectSpouseForChildModal";
import { ManageEditorsModal } from "@/src/features/auth/components/ManageEditorsModal";
import { UseTreeModalsResult } from "../hooks/useTreeModals";

export interface TreeModalsProps {
  people: Person[];
  marriages: Marriage[];
  modals: UseTreeModalsResult;
}

export function TreeModals({ people, marriages, modals }: TreeModalsProps) {
  const {
    editingPerson,
    viewingPerson,
    viewingPersonGeneration,
    childPersonForAddParent,
    existingParentMarriage,
    parentForAddSpouse,
    parentForSelectSpouse,
    addingChildTargetMarriageId,
    childTargetParentsSummary,
    childTargetDefaultOrder,
    showManageEditors,
    showConfirmReset,
    isResetting,
    setViewingPersonId,
    setEditingPersonId,
    handleEditSave,
    handleEditDelete,
    setAddingParentForChildId,
    handleSaveParent,
    setAddingSpouseForPersonId,
    handleSaveSpouse,
    setSelectingSpouseForChildParentId,
    setAddingChildTargetMarriageId,
    handleSaveChild,
    setShowManageEditors,
    setShowConfirmReset,
    handleResetAllData,
  } = modals;

  return (
    <>
      {/* Modal: View Person Details */}
      {viewingPerson && (
        <PersonDetailModal
          person={viewingPerson}
          generation={viewingPersonGeneration}
          people={people}
          marriages={marriages}
          onClose={() => setViewingPersonId(null)}
        />
      )}

      {/* Modal: Edit Person */}
      {editingPerson && (
        <PersonFormModal
          title={
            editingPerson.isPlaceholder
              ? "Thêm thông tin Phối ngẫu"
              : "Chỉnh sửa thông tin thành viên"
          }
          subtitle={
            editingPerson.isPlaceholder
              ? (editingPerson.spouseLabel || "Cập nhật thông tin phối ngẫu (khuyết danh)")
              : `${editingPerson.firstName} ${editingPerson.lastName}`
          }
          submitLabel={editingPerson.isPlaceholder ? "Thêm phối ngẫu" : "Lưu thay đổi"}
          initialData={{
            firstName: editingPerson.isPlaceholder ? "" : editingPerson.firstName,
            lastName: editingPerson.isPlaceholder ? "" : editingPerson.lastName,
            birthDate: editingPerson.birthDate ?? "",
            deathDate: editingPerson.deathDate ?? "",
            gender: editingPerson.gender ?? "female",
            bio: editingPerson.bio ?? "",
            spouseLabel: editingPerson.spouseLabel,
            birthOrder: editingPerson.birthOrder,
            photoURL: editingPerson.photoURL ?? "",
          }}
          onSubmit={handleEditSave}
          onCancel={() => setEditingPersonId(null)}
          onDelete={handleEditDelete}
          deleteLabel={
            editingPerson.isPlaceholder
              ? "🗑️ Xóa phối ngẫu khuyết danh khỏi cây"
              : "🗑️ Xóa người này khỏi cây gia phả"
          }
          deleteConfirmMessage={
            editingPerson.isPlaceholder
              ? "⚠️ Bạn có chắc muốn xóa phối ngẫu (khuyết danh) này? Liên kết hôn nhân này sẽ bị xóa khỏi cây gia phả."
              : undefined
          }
        />
      )}

      {/* Modal: Upward Expansion (Add Parents) */}
      {childPersonForAddParent && (
        <AddParentModal
          childPerson={childPersonForAddParent}
          existingParentMarriage={existingParentMarriage}
          people={people}
          onSubmit={handleSaveParent}
          onCancel={() => setAddingParentForChildId(null)}
        />
      )}

      {/* Modal: Sideways Expansion (Add Spouse) */}
      {parentForAddSpouse && (
        <AddSpouseModal
          person={parentForAddSpouse}
          existingMarriages={marriages
            .filter((m) => m.spouseIds.includes(parentForAddSpouse.id))
            .sort((a, b) => a.order - b.order)}
          people={people}
          onSubmit={handleSaveSpouse}
          onCancel={() => setAddingSpouseForPersonId(null)}
        />
      )}

      {/* Modal: Select which spouse for child when 2+ spouses exist */}
      {parentForSelectSpouse && (
        <SelectSpouseForChildModal
          parentPerson={parentForSelectSpouse}
          marriages={marriages
            .filter((m) => m.spouseIds.includes(parentForSelectSpouse.id))
            .sort((a, b) => a.order - b.order)}
          people={people}
          onSelectMarriage={(mId) => {
            setSelectingSpouseForChildParentId(null);
            setAddingChildTargetMarriageId(mId);
          }}
          onAddSpouseFirst={() => {
            const pId = parentForSelectSpouse.id;
            setSelectingSpouseForChildParentId(null);
            setAddingSpouseForPersonId(pId);
          }}
          onCancel={() => setSelectingSpouseForChildParentId(null)}
        />
      )}

      {/* Modal: Downward Expansion (Add Child to specific marriage) */}
      {addingChildTargetMarriageId && (
        <PersonFormModal
          title="Thêm Con (Hậu duệ)"
          subtitle={childTargetParentsSummary || "Thêm con vào gia đình"}
          submitLabel="Thêm con"
          initialData={{
            firstName: "",
            lastName: "",
            birthDate: "",
            deathDate: "",
            gender: "male",
            bio: "",
            birthOrder: childTargetDefaultOrder,
          }}
          onSubmit={handleSaveChild}
          onCancel={() => setAddingChildTargetMarriageId(null)}
        />
      )}

      {/* Modal: Manage Editors */}
      {showManageEditors && (
        <ManageEditorsModal onClose={() => setShowManageEditors(false)} />
      )}

      {/* Modal: Confirm Reset All Data */}
      {showConfirmReset && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowConfirmReset(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-red-800/80 rounded-xl p-6 w-full max-w-sm flex flex-col gap-4 text-slate-100 shadow-2xl"
          >
            <div className="flex items-center gap-2.5 text-red-400">
              <span className="text-xl">⚠️</span>
              <h3 className="font-semibold text-base">Xóa toàn bộ dữ liệu cây?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Hành động này sẽ xóa vĩnh viễn <strong className="text-white">{people.length} người</strong> và{" "}
              <strong className="text-white">{marriages.length} cuộc hôn nhân</strong> hiện tại trong cơ sở dữ liệu để bạn có thể test lại từ đầu.
            </p>
            <div className="flex gap-2.5 mt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleResetAllData}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-xs cursor-pointer shadow disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isResetting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
