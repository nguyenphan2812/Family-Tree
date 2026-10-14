"use client";

import { useState, useRef } from "react";
import NextImage from "next/image";

interface AvatarUploadFieldProps {
  photoURL: string;
  onPhotoChange: (url: string) => void;
  gender: "male" | "female" | "other";
}

/**
 * Compresses an image in the browser using HTML5 Canvas to a lightweight WebP/JPEG base64.
 * Keeps output under 15KB so it stores directly in Firestore for 100% free with no storage fees.
 */
function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 240;
        const width = img.width;
        const height = img.height;
        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;

        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, MAX_SIZE, MAX_SIZE);

        try {
          const dataUrl = canvas.toDataURL("image/webp", 0.75);
          resolve(dataUrl);
        } catch {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          resolve(dataUrl);
        }
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AvatarUploadField({
  photoURL,
  onPhotoChange,
  gender,
}: AvatarUploadFieldProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressing(true);
      const dataUrl = await compressImageToDataUrl(file);
      onPhotoChange(dataUrl);
    } catch (err) {
      console.error("Failed to compress image:", err);
      alert("Không thể đọc tệp ảnh. Vui lòng chọn ảnh khác.");
    } finally {
      setIsCompressing(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700 shrink-0 bg-slate-900 flex items-center justify-center shadow-inner">
          {photoURL ? (
            <NextImage
              src={photoURL}
              alt="Preview"
              width={64}
              height={64}
              unoptimized
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl select-none">
              {gender === "male" ? "👨" : gender === "female" ? "👩" : "👤"}
            </span>
          )}
          {isCompressing && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] text-white font-medium">
              Đang xử lý...
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer transition shadow flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>📷</span>
              <span>{photoURL ? "Đổi ảnh" : "Tải ảnh từ máy"}</span>
            </button>
            {photoURL && (
              <button
                type="button"
                onClick={() => onPhotoChange("")}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-rose-300 text-xs cursor-pointer transition"
              >
                Xóa ảnh
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>Tự nén ảnh nhẹ, miễn phí 100%</span>
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-sky-400 hover:underline cursor-pointer"
            >
              {showUrlInput ? "Ẩn URL" : "Hoặc nhập link ảnh"}
            </button>
          </div>
        </div>
      </div>

      {/* Optional URL input if user wants to paste external link */}
      {showUrlInput && (
        <div className="animate-in fade-in duration-150">
          <input
            placeholder="Dán link ảnh online (https://...)"
            value={photoURL}
            onChange={(e) => onPhotoChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
          />
        </div>
      )}
    </>
  );
}
