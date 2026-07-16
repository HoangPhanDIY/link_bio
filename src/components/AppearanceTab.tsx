import React, { useState } from "react";
import { AppearanceSettings, FontFamilyType, InterfaceMode } from "../types";
import { DBBanner, supabase } from "../supabase";
import LucideIcon from "./LucideIcon";
import ImageCropperModal from "./ImageCropperModal";

interface AppearanceTabProps {
  appearance: AppearanceSettings;
  onUpdateAppearance: (updates: Partial<AppearanceSettings>) => void;

  // Database Banners
  dbBanners: DBBanner[];
  onAddBanner: (title: string, url: string) => Promise<void>;
  onToggleBanner: (id: string, url: string, active: boolean) => Promise<void>;
  onDeleteBanner: (id: string, url: string) => Promise<void>;

  // Custom Section Savers
  onSavePersonalInfo: () => Promise<void>;
  onSaveInterfaceSettings: () => Promise<void>;
  onSaveDonationSettings?: () => Promise<void>;
}

const ACCENT_COLORS = [
  { hex: "#4648d4", label: "Xanh Hoàng Gia (Mặc định)" },
  { hex: "#b90538", label: "Đỏ Nhung" },
  { hex: "#006c49", label: "Xanh Lá Rừng" },
  { hex: "#ffb2b7", label: "Hồng Đào" },
  { hex: "#eab308", label: "Hổ Phách Hoàng Hôn" },
  { hex: "#0f172a", label: "Xám Nửa Đêm" },
  { hex: "#0099ff", label: "Xanh Da Trời" },
  { hex: "#10b981", label: "Xanh Ngọc Lục Bảo" },
];

export default function AppearanceTab({
  appearance,
  onUpdateAppearance,
  dbBanners,
  onAddBanner,
  onToggleBanner,
  onDeleteBanner,
  onSavePersonalInfo,
  onSaveInterfaceSettings,
  onSaveDonationSettings,
}: AppearanceTabProps) {
  const {
    mode,
    fontFamily,
    accentColor,
    bannerUrl,
    avatarUrl,
    name,
    bio,
    newsletterEnabled,
    backgroundColor = "",
    linkBackgroundColor = "",
    linkTextColor = "",
    bankName = "",
    bankAccount = "",
    bankOwner = "",
    momoNumber = "",
    momoName = "",
    donateNote = "",
    bankEnabled = true,
    momoEnabled = true,
    loadingWebGif = "",
    loadingDataGif = "",
  } = appearance;

  // States for banner creation form
  const [newBannerTitle, setNewBannerTitle] = useState("");
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const [isUploadingWebGif, setIsUploadingWebGif] = useState(false);
  const [isUploadingDataGif, setIsUploadingDataGif] = useState(false);

  // Loading indicator states for saves
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingInterface, setIsSavingInterface] = useState(false);
  const [isSavingDonation, setIsSavingDonation] = useState(false);

  // Cropper Modal States
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [cropperAspect, setCropperAspect] = useState<number>(1);
  const [cropperTitle, setCropperTitle] = useState<string>("");
  const [cropperType, setCropperType] = useState<
    "avatar" | "banner" | "customBanner" | null
  >(null);

  const handleModeChange = (selectedMode: InterfaceMode) => {
    onUpdateAppearance({ mode: selectedMode });
  };

  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateAppearance({ fontFamily: e.target.value as FontFamilyType });
  };

  const handleAccentChange = (hex: string) => {
    onUpdateAppearance({ accentColor: hex });
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload to bucket 'images'
      const { data, error } = await supabase.storage
        .from("images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error("Error uploading to Supabase Storage:", err);
      alert(`Không thể tải ảnh lên Supabase Storage: ${err.message || err}`);
      return null;
    }
  };

  const handleWebGifUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "image/gif") {
        alert("Vui lòng tải lên tệp tin định dạng GIF (.gif)!");
        return;
      }
      setIsUploadingWebGif(true);
      const url = await uploadFile(file);
      setIsUploadingWebGif(false);
      if (url) {
        onUpdateAppearance({ loadingWebGif: url });
      }
      e.target.value = "";
    }
  };

  const handleDataGifUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "image/gif") {
        alert("Vui lòng tải lên tệp tin định dạng GIF (.gif)!");
        return;
      }
      setIsUploadingDataGif(true);
      const url = await uploadFile(file);
      setIsUploadingDataGif(false);
      if (url) {
        onUpdateAppearance({ loadingDataGif: url });
      }
      e.target.value = "";
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropperFile(file);
      setCropperAspect(1);
      setCropperTitle("Cắt ảnh đại diện (Tỷ lệ 1:1)");
      setCropperType("avatar");
      setCropperOpen(true);
      e.target.value = "";
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropperFile(file);
      setCropperAspect(3.2);
      setCropperTitle("Cắt ảnh bìa cá nhân (Tỷ lệ 3.2:1)");
      setCropperType("banner");
      setCropperOpen(true);
      e.target.value = "";
    }
  };

  const handleCustomBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropperFile(file);
      setCropperAspect(3.2);
      setCropperTitle("Cắt banner quảng cáo (Tỷ lệ 3.2:1)");
      setCropperType("customBanner");
      setCropperOpen(true);
      e.target.value = "";
    }
  };

  const handleCropperConfirm = async (croppedFile: File) => {
    setCropperOpen(false);
    const type = cropperType;
    setCropperType(null);
    setCropperFile(null);

    if (type === "avatar") {
      setIsSavingProfile(true);
      const url = await uploadFile(croppedFile);
      setIsSavingProfile(false);
      if (url) {
        onUpdateAppearance({ avatarUrl: url });
        window.showNotification?.(
          "Tải lên ảnh đại diện thành công!",
          "success",
        );
      }
    } else if (type === "banner") {
      setIsSavingProfile(true);
      const url = await uploadFile(croppedFile);
      setIsSavingProfile(false);
      if (url) {
        onUpdateAppearance({ bannerUrl: url });
        window.showNotification?.("Tải lên ảnh bìa thành công!", "success");
      }
    } else if (type === "customBanner") {
      setIsUploadingBanner(true);
      const url = await uploadFile(croppedFile);
      if (url) {
        setNewBannerUrl(url);
        if (!newBannerTitle) {
          setNewBannerTitle(croppedFile.name.split(".")[0] || "Ảnh bìa mới");
        }
        window.showNotification?.(
          "Tải lên ảnh banner quảng cáo thành công!",
          "success",
        );
      }
      setIsUploadingBanner(false);
    }
  };

  const handleAddBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerUrl.trim()) {
      alert("Vui lòng tải tệp lên hoặc nhập URL của ảnh bìa!");
      return;
    }
    await onAddBanner(
      newBannerTitle.trim() || "Ảnh bìa mới",
      newBannerUrl.trim(),
    );
    setNewBannerTitle("");
    setNewBannerUrl("");
  };

  const handleSavePersonalInfoClick = async () => {
    setIsSavingProfile(true);
    try {
      await onSavePersonalInfo();
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveInterfaceSettingsClick = async () => {
    setIsSavingInterface(true);
    try {
      await onSaveInterfaceSettings();
    } finally {
      setIsSavingInterface(false);
    }
  };

  const handleSaveDonationSettingsClick = async () => {
    if (!onSaveDonationSettings) return;
    setIsSavingDonation(true);
    try {
      await onSaveDonationSettings();
    } finally {
      setIsSavingDonation(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* SECTION 1: Profile Settings (Name & Bio) */}
      <section className="bg-white p-6 sm:p-8 rounded-md border border-slate-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg bg-indigo-50"
              style={{
                color: accentColor,
                backgroundColor: `${accentColor}10`,
              }}
            >
              <LucideIcon name="User" size={20} />
            </div>
            <h2 className="font-display text-lg font-bold text-slate-800">
              Thông tin cá nhân
            </h2>
          </div>

          <button
            type="button"
            onClick={handleSavePersonalInfoClick}
            disabled={isSavingProfile}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isSavingProfile ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LucideIcon name="Save" size={13} />
            )}
            <span>Lưu thông tin</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Avatar & Banner Upload with Preview */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-6 items-center justify-around w-full border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center text-center">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                Ảnh đại diện
              </label>
              <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-50 shrink-0">
                <img
                  src={avatarUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <LucideIcon name="Upload" className="text-white" size={18} />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Định dạng JPG/PNG. Tối đa 2MB.
              </p>
            </div>

            {/* Profile Banner Upload */}
            <div className="flex flex-col items-center w-full max-w-[200px] sm:max-w-xs text-center">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                Ảnh bìa hồ sơ
              </label>
              <div className="relative group w-full aspect-[16/9] rounded overflow-hidden border-2 border-slate-100 bg-slate-50 shrink-0 shadow-sm">
                <img
                  src={bannerUrl}
                  alt="Ảnh bìa hồ sơ"
                  className="w-full h-full object-cover animate-pulse-subtle"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                  <LucideIcon name="Upload" className="text-white" size={18} />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Ảnh nền trang cá nhân.
              </p>
            </div>
          </div>

          {/* Text fields */}
          <div className="lg:col-span-8 space-y-4 w-full">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Họ và tên
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => onUpdateAppearance({ name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800"
                placeholder="Ví dụ: Alex Rivera"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Tiểu sử ngắn / Mô tả
              </label>
              <textarea
                value={bio}
                rows={3}
                onChange={(e) => onUpdateAppearance({ bio: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800 leading-relaxed resize-none"
                placeholder="Mô tả ngắn về bản thân hoặc công việc của bạn..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Đường dẫn URL Ảnh bìa (Ảnh tĩnh)
              </label>
              <input
                type="text"
                value={bannerUrl}
                onChange={(e) =>
                  onUpdateAppearance({ bannerUrl: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-2.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-xs text-slate-750 font-mono"
                placeholder="Nhập địa chỉ URL của ảnh bìa tĩnh..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Appearance Settings (Theme, Font, Color) */}
      <section className="bg-white p-6 sm:p-8 rounded-md border border-slate-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg bg-indigo-50"
              style={{
                color: accentColor,
                backgroundColor: `${accentColor}10`,
              }}
            >
              <LucideIcon name="Palette" size={20} />
            </div>
            <h2 className="font-display text-lg font-bold text-slate-800">
              Cấu hình giao diện
            </h2>
          </div>

          <button
            type="button"
            onClick={handleSaveInterfaceSettingsClick}
            disabled={isSavingInterface}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isSavingInterface ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LucideIcon name="Save" size={13} />
            )}
            <span>Lưu giao diện</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Theme Interface Mode Toggle */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Chế độ hiển thị
            </label>
            <div className="flex p-1.5 bg-slate-100 rounded w-fit">
              <button
                type="button"
                onClick={() => handleModeChange("light")}
                className={`px-5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  mode === "light"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Giao diện Sáng
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("dark")}
                className={`px-5 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  mode === "dark"
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Giao diện Tối
              </button>
            </div>
          </div>

          {/* Typography Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Phông chữ / Typography
            </label>
            <select
              value={fontFamily}
              onChange={handleFontChange}
              className="w-full bg-slate-50 border border-slate-200 rounded px-4 py-3 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800 font-semibold"
            >
              <option value="Plus Jakarta Sans">
                Plus Jakarta Sans (Hiện đại)
              </option>
              <option value="Inter">Inter (Tối giản / Cân đối)</option>
              <option value="JetBrains Mono">
                JetBrains Mono (Kỹ thuật / Công nghệ)
              </option>
            </select>
          </div>

          {/* Accent Color Picker swatches */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex flex-col gap-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Cấu hình màu sắc chủ đạo
              </label>
              <p className="text-xs text-slate-400">
                Lựa chọn màu sắc nhấn nổi bật cho các nút bấm, biểu tượng và
                liên kết chính của toàn bộ Website.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              {ACCENT_COLORS.map((accent) => (
                <button
                  key={accent.hex}
                  type="button"
                  onClick={() => handleAccentChange(accent.hex)}
                  title={accent.label}
                  className="w-10 h-10 rounded-full transition-all hover:scale-110 active:scale-95 flex items-center justify-center cursor-pointer border shadow-xs"
                  style={{
                    backgroundColor: accent.hex,
                    borderColor:
                      accentColor.toLowerCase() === accent.hex.toLowerCase()
                        ? "#000000"
                        : "rgba(0,0,0,0.06)",
                    boxShadow:
                      accentColor.toLowerCase() === accent.hex.toLowerCase()
                        ? "0 0 0 3px rgba(99, 102, 241, 0.25)"
                        : undefined,
                  }}
                >
                  {accentColor.toLowerCase() === accent.hex.toLowerCase() && (
                    <LucideIcon name="Check" className="text-white" size={14} />
                  )}
                </button>
              ))}

              {/* Custom hex color input box */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => handleAccentChange(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={accentColor.toUpperCase()}
                  onChange={(e) => {
                    if (
                      e.target.value.startsWith("#") &&
                      e.target.value.length <= 7
                    ) {
                      handleAccentChange(e.target.value);
                    }
                  }}
                  className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold outline-none text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Custom Web Page & Link Colors Customization */}
          <div className="space-y-4 md:col-span-2 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Tùy chỉnh màu nâng cao (Nền & Thẻ liên kết)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Web Page Background Color */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-slate-500">
                    Màu nền trang web
                  </label>
                  {backgroundColor && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateAppearance({ backgroundColor: "" })
                      }
                      className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Xóa/Tự động
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      backgroundColor ||
                      (mode === "dark" ? "#0c0d1b" : "#ffffff")
                    }
                    onChange={(e) =>
                      onUpdateAppearance({ backgroundColor: e.target.value })
                    }
                    className="w-10 h-10 rounded cursor-pointer border border-slate-200 p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="Tự động"
                    value={backgroundColor}
                    onChange={(e) =>
                      onUpdateAppearance({ backgroundColor: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono outline-none focus:border-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Link Card Background Color */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-slate-500">
                    Màu nền thẻ liên kết
                  </label>
                  {linkBackgroundColor && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateAppearance({ linkBackgroundColor: "" })
                      }
                      className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Xóa/Tự động
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      linkBackgroundColor ||
                      (mode === "dark" ? "#0f172a" : "#ffffff")
                    }
                    onChange={(e) =>
                      onUpdateAppearance({
                        linkBackgroundColor: e.target.value,
                      })
                    }
                    className="w-10 h-10 rounded cursor-pointer border border-slate-200 p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="Tự động"
                    value={linkBackgroundColor}
                    onChange={(e) =>
                      onUpdateAppearance({
                        linkBackgroundColor: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono outline-none focus:border-indigo-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Link Card Text Color */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-slate-500">
                    Màu chữ thẻ liên kết
                  </label>
                  {linkTextColor && (
                    <button
                      type="button"
                      onClick={() => onUpdateAppearance({ linkTextColor: "" })}
                      className="text-[9px] font-bold text-red-500 hover:underline cursor-pointer"
                    >
                      Xóa/Tự động
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={
                      linkTextColor || (mode === "dark" ? "#ffffff" : "#1e293b")
                    }
                    onChange={(e) =>
                      onUpdateAppearance({ linkTextColor: e.target.value })
                    }
                    className="w-10 h-10 rounded cursor-pointer border border-slate-200 p-0.5 shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="Tự động"
                    value={linkTextColor}
                    onChange={(e) =>
                      onUpdateAppearance({ linkTextColor: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono outline-none focus:border-indigo-500 text-slate-800"
                  />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              * Để trống ("Tự động") để sử dụng màu sắc đồng bộ thông minh theo
              giao diện Sáng/Tối và Màu chủ đạo bạn đã chọn.
            </p>
          </div>

          {/* Custom Loading GIFs */}
          <div className="space-y-4 md:col-span-2 pt-6 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Tùy chỉnh ảnh GIF chờ tải (Loading States)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Web Loading GIF */}
              <div className="space-y-2 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Ảnh GIF chờ tải trang web
                </label>
                <p className="text-[10px] text-slate-400">
                  Hiển thị khi người dùng lần đầu tiên truy cập website (Admin & Trang công khai).
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shadow-xs">
                    <img
                      src={loadingWebGif || "/giphy.webp"}
                      alt="Web GIF"
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-xs transition-colors cursor-pointer text-center">
                      {isUploadingWebGif ? "Đang tải lên..." : "Tải lên tệp .gif"}
                      <input
                        type="file"
                        accept="image/gif"
                        onChange={handleWebGifUpload}
                        disabled={isUploadingWebGif}
                        className="hidden"
                      />
                    </label>
                    {loadingWebGif && loadingWebGif !== "/giphy.webp" && (
                      <button
                        type="button"
                        onClick={() => onUpdateAppearance({ loadingWebGif: "/giphy.webp" })}
                        className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer text-left"
                      >
                        Khôi phục mặc định
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Loading GIF */}
              <div className="space-y-2 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">
                  Ảnh GIF chờ tải dữ liệu trang
                </label>
                <p className="text-[10px] text-slate-400">
                  Hiển thị tại các mục tin nhắn, ủng hộ, giáo án, v.v. khi hệ thống đang xử lý truy vấn.
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shadow-xs">
                    <img
                      src={loadingDataGif || "/giphy.webp"}
                      alt="Data GIF"
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-xs transition-colors cursor-pointer text-center">
                      {isUploadingDataGif ? "Đang tải lên..." : "Tải lên tệp .gif"}
                      <input
                        type="file"
                        accept="image/gif"
                        onChange={handleDataGifUpload}
                        disabled={isUploadingDataGif}
                        className="hidden"
                      />
                    </label>
                    {loadingDataGif && loadingDataGif !== "/giphy.webp" && (
                      <button
                        type="button"
                        onClick={() => onUpdateAppearance({ loadingDataGif: "/giphy.webp" })}
                        className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer text-left"
                      >
                        Khôi phục mặc định
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2.5: Donation & Bank Settings */}
      <section className="bg-white p-6 sm:p-8 rounded-md border border-slate-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg bg-indigo-50"
              style={{
                color: accentColor,
                backgroundColor: `${accentColor}10`,
              }}
            >
              <LucideIcon name="Heart" size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-800">
                Cấu hình ủng hộ & Donate
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Thiết lập tài khoản ngân hàng và ví MoMo hiển thị tại mục Ủng hộ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveDonationSettingsClick}
            disabled={isSavingDonation}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isSavingDonation ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LucideIcon name="Save" size={13} />
            )}
            <span>Lưu cấu hình</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Bank Settings Block */}
          <div className="space-y-4 p-5 rounded-md border border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <LucideIcon
                  name="Landmark"
                  size={16}
                  className="text-indigo-500"
                />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Tài khoản Ngân hàng
                </h3>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bankEnabled}
                  onChange={(e) =>
                    onUpdateAppearance({ bankEnabled: e.target.checked })
                  }
                  className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Hiển thị
                </span>
              </label>
            </div>

            <div
              className={`space-y-3 transition-opacity ${bankEnabled ? "opacity-100" : "opacity-50"}`}
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Tên Ngân hàng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: MB BANK, VCB, Techcombank..."
                  value={bankName}
                  disabled={!bankEnabled}
                  onChange={(e) =>
                    onUpdateAppearance({ bankName: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Số tài khoản (STK)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 0987654321"
                  value={bankAccount}
                  disabled={!bankEnabled}
                  onChange={(e) =>
                    onUpdateAppearance({ bankAccount: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Tên chủ tài khoản (CTK)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: PHAN HOANG ANH"
                  value={bankOwner}
                  disabled={!bankEnabled}
                  onChange={(e) =>
                    onUpdateAppearance({
                      bankOwner: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:border-indigo-500 text-slate-800 font-bold uppercase disabled:bg-slate-100/50"
                />
              </div>
            </div>
          </div>

          {/* MoMo Settings Block */}
          <div className="space-y-4 p-5 rounded-md border border-slate-100 bg-slate-50/50">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <LucideIcon
                  name="Smartphone"
                  size={16}
                  className="text-pink-500"
                />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Ví điện tử MoMo
                </h3>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={momoEnabled}
                  onChange={(e) =>
                    onUpdateAppearance({ momoEnabled: e.target.checked })
                  }
                  className="rounded border-slate-200 text-pink-600 focus:ring-pink-500 w-3.5 h-3.5"
                />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Hiển thị
                </span>
              </label>
            </div>

            <div
              className={`space-y-3 transition-opacity ${momoEnabled ? "opacity-100" : "opacity-50"}`}
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Số điện thoại MoMo
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 0987654321"
                  value={momoNumber}
                  disabled={!momoEnabled}
                  onChange={(e) =>
                    onUpdateAppearance({ momoNumber: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Tên người nhận MoMo
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phan Hoàng Anh"
                  value={momoName}
                  disabled={!momoEnabled}
                  onChange={(e) =>
                    onUpdateAppearance({ momoName: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:border-indigo-500 text-slate-800 disabled:bg-slate-100/50"
                />
              </div>

              <div className="opacity-65 pt-2">
                <p className="text-[10px] text-slate-400 italic">
                  * Hệ thống sẽ tự động tạo mã QR Code (VietQR / MoMo) để người
                  hâm mộ quét và ủng hộ nhanh chóng nhất.
                </p>
              </div>
            </div>
          </div>

          {/* Donation Note (Full width) */}
          <div className="md:col-span-2 space-y-3">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Lời nhắn gửi người ủng hộ (Donate Note)
            </label>
            <textarea
              rows={3}
              placeholder="Nhập lời cảm ơn hoặc thông điệp gửi tới người hâm mộ..."
              value={donateNote}
              onChange={(e) =>
                onUpdateAppearance({ donateNote: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs outline-none focus:border-indigo-500 text-slate-800 leading-relaxed"
            />
          </div>
        </div>
      </section>

      {/* SECTION 3: Banner Slideshow Database Management */}
      <section className="bg-white p-6 sm:p-8 rounded-md border border-slate-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg bg-indigo-50"
              style={{
                color: accentColor,
                backgroundColor: `${accentColor}10`,
              }}
            >
              <LucideIcon name="Image" size={20} />
            </div>
            <h2 className="font-display text-lg font-bold text-slate-800">
              Quản lý ảnh bìa Slideshow
            </h2>
          </div>
          <button
            type="button"
            className="text-xs font-bold underline hover:opacity-80"
            style={{ color: accentColor }}
            onClick={() =>
              alert(
                "Kích hoạt nhiều ảnh bìa cùng lúc để kích hoạt slideshow tự động chuyển đổi sau mỗi 5 giây!",
              )
            }
          >
            Hướng dẫn slideshow
          </button>
        </div>

        {/* Upload Custom Banner to DB */}
        <form
          onSubmit={handleAddBannerSubmit}
          className="bg-slate-50 p-4 rounded border border-slate-100 space-y-4"
        >
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
            Thêm ảnh bìa mới vào Database
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Tên ảnh bìa
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Banner Ngày Tết, Banner Gaming..."
                value={newBannerTitle}
                onChange={(e) => setNewBannerTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Nhập URL hình ảnh
              </label>
              <input
                type="text"
                placeholder="/image/phu_hieu/thanh_khoi_nguyen/background_ThanhKhoiNguyen_1.jpg"
                value={newBannerUrl}
                onChange={(e) => setNewBannerUrl(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer hover:text-slate-800">
              <LucideIcon name="Upload" size={14} className="text-slate-400" />
              <span className="font-semibold underline">
                Hoặc tải tệp từ thiết bị của bạn
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCustomBannerUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {isUploadingBanner && (
                <span className="text-[10px] text-indigo-500 animate-pulse ml-2">
                  (Đang đọc tệp...)
                </span>
              )}
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2 text-white rounded text-xs font-bold transition-all shadow-xs hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: accentColor }}
            >
              <LucideIcon name="Plus" size={14} />
              <span>Tải ảnh & Thêm vào Slideshow</span>
            </button>
          </div>
        </form>

        {/* Preset & Custom Banners List from DB */}
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Kho ảnh bìa trong Database ({dbBanners.length} ảnh)
            </label>
            <p className="text-slate-400 text-[11px]">
              Tích chọn nhiều ảnh bìa bên dưới để hiển thị slideshow. Bạn cũng
              có thể xóa các ảnh bìa tự thêm.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dbBanners.map((banner) => {
              const isSelectedInSlideshow = banner.kich_hoat;

              return (
                <div
                  key={banner.id}
                  className={`relative rounded overflow-hidden border-2 transition-all group aspect-[16/9] ${
                    isSelectedInSlideshow
                      ? "scale-[1.01]"
                      : "border-slate-100 opacity-60 hover:opacity-100"
                  }`}
                  style={{
                    borderColor: isSelectedInSlideshow
                      ? accentColor
                      : "transparent",
                  }}
                >
                  <img
                    src={banner.url_hinh_anh}
                    alt={banner.tieu_de || "Banner"}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-2">
                    <div className="flex justify-between items-center">
                      {/* Checkbox toggle status */}
                      <button
                        type="button"
                        onClick={() =>
                          onToggleBanner(
                            banner.id,
                            banner.url_hinh_anh,
                            !banner.kich_hoat,
                          )
                        }
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-sm transition-all cursor-pointer ${
                          isSelectedInSlideshow
                            ? "bg-emerald-500"
                            : "bg-slate-700/80 hover:bg-slate-600"
                        }`}
                        title={
                          isSelectedInSlideshow
                            ? "Hủy chọn Slideshow"
                            : "Chọn hiển thị Slideshow"
                        }
                      >
                        {isSelectedInSlideshow ? (
                          <LucideIcon name="Check" size={12} />
                        ) : (
                          <LucideIcon name="Plus" size={12} />
                        )}
                      </button>

                      {/* Delete banner from DB */}
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `Bạn có chắc chắn muốn xóa ảnh bìa "${banner.tieu_de || "Không tên"}" khỏi Database?`,
                            )
                          ) {
                            onDeleteBanner(banner.id, banner.url_hinh_anh);
                          }
                        }}
                        className="w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-500 flex items-center justify-center text-white shadow-sm transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Xóa khỏi Database"
                      >
                        <LucideIcon name="Trash2" size={11} />
                      </button>
                    </div>

                    <span className="text-white text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded truncate w-fit max-w-full">
                      {banner.tieu_de || "Không tên"}
                    </span>
                  </div>
                </div>
              );
            })}

            {dbBanners.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs border border-dashed rounded">
                Không có ảnh bìa nào trong Database.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4: Messaging Integrations */}
      <section className="bg-white p-6 sm:p-8 rounded-md border border-slate-100 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg bg-indigo-50"
              style={{
                color: accentColor,
                backgroundColor: `${accentColor}10`,
              }}
            >
              <LucideIcon name="MessageSquare" size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-800">
                Nhận tin nhắn lời chúc từ người dùng truy cập
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Thay thế phần Đăng ký Email cũ bằng biểu mẫu Nhắn tin liên hệ.
                Người truy cập có thể để lại lời nhắn & gửi thẳng lên Database
                của bạn.
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              onUpdateAppearance({ newsletterEnabled: !newsletterEnabled })
            }
            className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 focus:outline-none relative cursor-pointer ${
              newsletterEnabled ? "" : "bg-slate-200"
            }`}
            style={{
              backgroundColor: newsletterEnabled ? accentColor : undefined,
            }}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform duration-300 ${
                newsletterEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropperOpen}
        imageFile={cropperFile}
        aspectRatio={cropperAspect}
        title={cropperTitle}
        onClose={() => {
          setCropperOpen(false);
          setCropperFile(null);
        }}
        onConfirm={handleCropperConfirm}
      />
    </div>
  );
}
