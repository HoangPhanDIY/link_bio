import React, { useState } from "react";
import { DBGameAccount, dbService } from "../dbService";
import { BioLink } from "../types";
import LucideIcon from "./LucideIcon";
import ImageCropperModal from "./ImageCropperModal";

interface AccountsAdminTabProps {
  accounts: DBGameAccount[];
  links?: BioLink[];
  onRefresh?: () => Promise<void> | void;
  onUpdateAccounts?: React.Dispatch<React.SetStateAction<DBGameAccount[]>>;
  showNotification: (
    message: string,
    type?: "success" | "error" | "info",
  ) => void;
  accentColor?: string;
}

export default function AccountsAdminTab({
  accounts,
  links = [],
  onRefresh,
  onUpdateAccounts,
  showNotification,
  accentColor = "#bd9867",
}: AccountsAdminTabProps) {
  const refreshAccounts = async () => {
    if (onRefresh) {
      await onRefresh();
    }
    try {
      const fresh = await dbService.getGameAccounts(true);
      if (fresh && onUpdateAccounts) {
        onUpdateAccounts(fresh);
      }
    } catch (e) {
      console.warn("Failed to refresh accounts:", e);
    }
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<DBGameAccount | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "sold" | "hidden"
  >("all");

  // Form states
  const [tenAcc, setTenAcc] = useState("");
  const [gia, setGia] = useState<number>(0);
  const [moTa, setMoTa] = useState("");
  const [urlHinhAnh, setUrlHinhAnh] = useState("");
  const [lienHe, setLienHe] = useState("");
  const [thuTuUuTien, setThuTuUuTien] = useState<number>(0);
  const [hienThi, setHienThi] = useState(true);
  const [daBan, setDaBan] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Image Cropper modal
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);

  const resetForm = () => {
    setEditingAccount(null);
    setTenAcc("");
    setGia(0);
    setMoTa("");
    setUrlHinhAnh("");
    setLienHe("");
    setThuTuUuTien(0);
    setHienThi(true);
    setDaBan(false);
  };

  const openAddModal = () => {
    resetForm();
    const firstActive = links.find((l) => l.enabled);
    if (firstActive) {
      setLienHe(firstActive.url);
    }
    setIsModalOpen(true);
  };

  const openEditModal = (acc: DBGameAccount) => {
    setEditingAccount(acc);
    setTenAcc(acc.ten_acc || "");
    setGia(acc.gia || 0);
    setMoTa(acc.mo_ta || "");
    setUrlHinhAnh(acc.url_hinh_anh || "");
    setLienHe(acc.lien_he || "");
    setThuTuUuTien(acc.thu_tu_uu_tien || 0);
    setHienThi(acc.hien_thi !== false);
    setDaBan(acc.da_ban === true);
    setIsModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropperFile(file);
      setCropperOpen(true);
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setCropperOpen(false);
    setIsUploading(true);
    showNotification("Đang tải ảnh acc lên Supabase storage...", "info");
    try {
      const url = await dbService.uploadAccountImage(croppedFile);
      if (url) {
        setUrlHinhAnh(url);
        showNotification("Đã tải ảnh acc lên thành công!", "success");
      } else {
        showNotification("Không thể tải ảnh, vui lòng thử lại.", "error");
      }
    } catch (err: any) {
      showNotification(`Lỗi tải ảnh: ${err.message || err}`, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenAcc.trim()) {
      showNotification("Vui lòng nhập tên tài khoản!", "error");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<DBGameAccount> = {
        id: editingAccount ? editingAccount.id : undefined,
        ten_acc: tenAcc.trim(),
        gia: Number(gia) || 0,
        mo_ta: moTa.trim(),
        url_hinh_anh: urlHinhAnh.trim(),
        lien_he: lienHe.trim(),
        thu_tu_uu_tien: Number(thuTuUuTien) || 0,
        hien_thi: hienThi,
        da_ban: daBan,
      };

      const result = await dbService.saveGameAccount(payload);
      if (result) {
        showNotification(
          editingAccount
            ? "Đã cập nhật thông tin acc thành công!"
            : "Đã thêm acc mới vào kho thành công!",
          "success",
        );
        setIsModalOpen(false);
        resetForm();
        await refreshAccounts();
      } else {
        showNotification(
          "Không thể lưu vào database. Vui lòng kiểm tra bảng kho_acc!",
          "error",
        );
      }
    } catch (err: any) {
      showNotification(`Lỗi khi lưu acc: ${err.message || err}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa acc "${name}" khỏi kho?`)) {
      return;
    }
    const success = await dbService.deleteGameAccount(id);
    if (success) {
      showNotification("Đã xóa acc khỏi kho thành công!", "success");
      await refreshAccounts();
    } else {
      showNotification("Xóa thất bại!", "error");
    }
  };

  const handleToggleVisibility = async (id: string, currentStatus: boolean) => {
    const success = await dbService.toggleAccountVisibility(id, currentStatus);
    if (success) {
      showNotification(
        currentStatus
          ? "Đã ẩn acc khỏi trang chính"
          : "Đã hiển thị acc ra trang chính",
        "info",
      );
      await refreshAccounts();
    }
  };

  const handleToggleSold = async (id: string, currentSold: boolean) => {
    const success = await dbService.toggleAccountSoldStatus(id, currentSold);
    if (success) {
      showNotification(
        currentSold
          ? "Đã đổi trạng thái sang Còn hàng"
          : "Đã đánh dấu acc là Đã bán",
        "success",
      );
      await refreshAccounts();
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.ten_acc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.mo_ta && acc.mo_ta.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === "active") return acc.hien_thi && !acc.da_ban;
    if (filterStatus === "sold") return acc.da_ban;
    if (filterStatus === "hidden") return !acc.hien_thi;
    return true;
  });

  const totalCount = accounts.length;
  const activeCount = accounts.filter((a) => a.hien_thi && !a.da_ban).length;
  const soldCount = accounts.filter((a) => a.da_ban).length;
  const hiddenCount = accounts.filter((a) => !a.hien_thi).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner and Summary Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-4 sm:p-5 border border-[#bd9867]/40 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <LucideIcon
              name="ShoppingBag"
              size={20}
              className="text-[#fce3bc]"
            />
            <h2 className="text-lg font-black bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent uppercase tracking-wider">
              Quản Lý Kho Acc Rao Bán
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý các tài khoản game rao bán hiển thị công khai trên bio (ảnh
            lưu storage, link lưu db).
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer shrink-0"
        >
          <LucideIcon name="Plus" size={16} className="text-slate-950" />
          <span>Thêm Acc Mới</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 p-3.5 border border-[#bd9867]/20 flex flex-col justify-between">
          <span className="text-slate-400 text-[11px] font-bold uppercase">
            Tổng Acc
          </span>
          <span className="text-xl font-black text-[#fce3bc] mt-1">
            {totalCount}
          </span>
        </div>
        <div className="bg-slate-900/60 p-3.5 border border-[#bd9867]/20 flex flex-col justify-between">
          <span className="text-emerald-400 text-[11px] font-bold uppercase">
            Đang bán
          </span>
          <span className="text-xl font-black text-emerald-400 mt-1">
            {activeCount}
          </span>
        </div>
        <div className="bg-slate-900/60 p-3.5 border border-[#bd9867]/20 flex flex-col justify-between">
          <span className="text-slate-400 text-[11px] font-bold uppercase">
            Đã bán
          </span>
          <span className="text-xl font-black text-slate-300 mt-1">
            {soldCount}
          </span>
        </div>
        <div className="bg-slate-900/60 p-3.5 border border-[#bd9867]/20 flex flex-col justify-between">
          <span className="text-amber-400 text-[11px] font-bold uppercase">
            Đang ẩn
          </span>
          <span className="text-xl font-black text-amber-400 mt-1">
            {hiddenCount}
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 p-3 border border-[#bd9867]/20">
        <div className="relative flex-1">
          <LucideIcon
            name="Search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo tên acc, tướng, skin, rank..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-black/50 border border-[#bd9867]/40 text-xs text-[#fce3bc] placeholder-slate-500 focus:outline-none focus:border-[#fce3bc]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
          {(
            [
              { id: "all", label: "Tất cả" },
              { id: "active", label: "Đang bán" },
              { id: "sold", label: "Đã bán" },
              { id: "hidden", label: "Ẩn" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 font-bold transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-[#bd9867] text-slate-950 shadow-sm"
                  : "bg-black/40 text-slate-400 hover:text-[#fce3bc] border border-[#bd9867]/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Account Cards Grid */}
      {filteredAccounts.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[#bd9867]/30 bg-slate-900/30">
          <LucideIcon
            name="ShoppingBag"
            size={40}
            className="mx-auto text-[#bd9867]/40 mb-3"
          />
          <p className="text-sm font-bold text-slate-400">
            Chưa có tài khoản nào trong kho hoặc không tìm thấy kết quả.
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 px-4 py-2 bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 font-black text-xs uppercase tracking-wider inline-flex items-center gap-2 hover:brightness-110 cursor-pointer"
          >
            <LucideIcon name="Plus" size={14} />
            <span>Thêm Acc Ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAccounts.map((acc) => (
            <div
              key={acc.id}
              className={`relative bg-slate-900/90 border transition-all flex flex-col justify-between overflow-hidden shadow-lg ${
                acc.da_ban
                  ? "border-slate-700/60 opacity-75"
                  : acc.hien_thi
                    ? "border-[#bd9867]/60 hover:border-[#fce3bc]"
                    : "border-amber-700/60 bg-amber-950/20"
              }`}
            >
              {/* Badges on Top */}
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 flex-wrap">
                {acc.da_ban ? (
                  <span className="px-2 py-0.5 bg-red-600/90 text-white text-[10px] font-black uppercase tracking-wider shadow">
                    ĐÃ BÁN
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-emerald-600/90 text-white text-[10px] font-black uppercase tracking-wider shadow">
                    CÒN HÀNG
                  </span>
                )}
                {!acc.hien_thi && (
                  <span className="px-2 py-0.5 bg-amber-600/90 text-white text-[10px] font-black uppercase tracking-wider shadow flex items-center gap-1">
                    <LucideIcon name="EyeOff" size={10} />
                    ẨN
                  </span>
                )}
              </div>

              {/* Priority badge */}
              {acc.thu_tu_uu_tien > 0 && (
                <div className="absolute top-2.5 right-2.5 z-10 bg-black/70 px-2 py-0.5 text-[10px] text-amber-400 font-bold border border-amber-500/40">
                  Ưu tiên: #{acc.thu_tu_uu_tien}
                </div>
              )}

              {/* Acc Image */}
              <div className="w-full h-48 bg-black/60 relative overflow-hidden group">
                {acc.url_hinh_anh ? (
                  <img
                    src={acc.url_hinh_anh}
                    alt={acc.ten_acc}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                    <LucideIcon name="Image" size={32} />
                    <span className="text-[11px] mt-1">Chưa có ảnh</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Content body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-sm text-[#fce3bc] line-clamp-2 leading-snug">
                    {acc.ten_acc}
                  </h3>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-base font-extrabold text-amber-400">
                      {acc.gia > 0
                        ? `${Number(acc.gia).toLocaleString("vi-VN")} đ`
                        : "Thỏa thuận"}
                    </span>
                  </div>

                  {acc.mo_ta && (
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3 bg-black/30 p-2 border border-[#bd9867]/20">
                      {acc.mo_ta}
                    </p>
                  )}

                  {acc.lien_he && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <LucideIcon
                        name="PhoneCall"
                        size={12}
                        className="text-[#bd9867]"
                      />
                      <span className="truncate">Liên hệ: {acc.lien_he}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-[#bd9867]/20 grid grid-cols-4 gap-1.5 text-xs">
                  {/* Toggle Visibility */}
                  <button
                    onClick={() => handleToggleVisibility(acc.id, acc.hien_thi)}
                    title={acc.hien_thi ? "Ẩn acc này" : "Hiện acc này"}
                    className={`p-2 flex items-center justify-center border transition-all cursor-pointer ${
                      acc.hien_thi
                        ? "bg-slate-800 text-slate-300 border-slate-700 hover:text-amber-400"
                        : "bg-amber-950/60 text-amber-400 border-amber-600/60 hover:bg-amber-900/60"
                    }`}
                  >
                    <LucideIcon
                      name={acc.hien_thi ? "Eye" : "EyeOff"}
                      size={15}
                    />
                  </button>

                  {/* Toggle Sold */}
                  <button
                    onClick={() =>
                      handleToggleSold(acc.id, acc.da_ban === true)
                    }
                    title={acc.da_ban ? "Đổi sang Còn hàng" : "Đánh dấu Đã bán"}
                    className={`p-2 flex items-center justify-center border transition-all cursor-pointer ${
                      acc.da_ban
                        ? "bg-red-950/60 text-red-400 border-red-700/60 hover:bg-red-900/60"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:text-emerald-400"
                    }`}
                  >
                    <LucideIcon
                      name={acc.da_ban ? "CheckCircle2" : "Tag"}
                      size={15}
                    />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(acc)}
                    title="Chỉnh sửa acc"
                    className="p-2 flex items-center justify-center bg-[#bd9867]/20 border border-[#bd9867]/40 text-[#fce3bc] hover:bg-[#bd9867]/40 transition-all cursor-pointer"
                  >
                    <LucideIcon name="Edit3" size={15} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(acc.id, acc.ten_acc)}
                    title="Xóa acc khỏi kho"
                    className="p-2 flex items-center justify-center bg-red-950/40 border border-red-800/60 text-red-400 hover:bg-red-900/60 transition-all cursor-pointer"
                  >
                    <LucideIcon name="Trash2" size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-[#bd9867] w-full max-w-xl shadow-2xl relative animate-in zoom-in-95 duration-200 my-8">
            {/* Header */}
            <div className="p-4 border-b border-[#bd9867]/40 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <LucideIcon
                  name={editingAccount ? "Edit3" : "Plus"}
                  size={18}
                  className="text-[#fce3bc]"
                />
                <h3 className="font-black text-sm text-[#fce3bc] uppercase tracking-wider">
                  {editingAccount ? "Chỉnh Sửa Acc" : "Thêm Acc Mới Vào Kho"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <LucideIcon name="X" size={18} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              {/* Tên acc */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tên / Tiêu đề Acc <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Acc Full Tướng, 180 Skin, Rank Chiến Tướng 50 Sao"
                  value={tenAcc}
                  onChange={(e) => setTenAcc(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-[#bd9867]/40 text-xs text-[#fce3bc] placeholder-slate-500 focus:outline-none focus:border-[#fce3bc]"
                />
              </div>

              {/* Giá & Thứ tự */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Giá bán (VNĐ){" "}
                    <span className="text-slate-400 font-normal">
                      (0 = Thỏa thuận)
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Ví dụ: 350000"
                    value={gia || ""}
                    onChange={(e) => setGia(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-black/50 border border-[#bd9867]/40 text-xs text-[#fce3bc] placeholder-slate-500 focus:outline-none focus:border-[#fce3bc]"
                  />
                  {gia > 0 && (
                    <span className="text-[11px] text-amber-400 mt-1 block font-bold">
                      Hiển thị: {gia.toLocaleString("vi-VN")} đ
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Thứ tự ưu tiên{" "}
                    <span className="text-slate-400 font-normal">
                      (Số nhỏ đứng trước)
                    </span>
                  </label>
                  <input
                    type="number"
                    value={thuTuUuTien}
                    onChange={(e) =>
                      setThuTuUuTien(Number(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 bg-black/50 border border-[#bd9867]/40 text-xs text-[#fce3bc] focus:outline-none focus:border-[#fce3bc]"
                  />
                </div>
              </div>

              {/* Upload Ảnh */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Hình ảnh Acc (Lưu Storage Supabase, chỉ link vào DB)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="https://... hoặc tải ảnh từ máy"
                    value={urlHinhAnh}
                    onChange={(e) => setUrlHinhAnh(e.target.value)}
                    className="flex-1 px-3 py-2 bg-black/50 border border-[#bd9867]/40 text-xs text-[#fce3bc] placeholder-slate-500 focus:outline-none focus:border-[#fce3bc]"
                  />
                  <label className="px-4 py-2 bg-[#bd9867]/20 border border-[#bd9867] text-[#fce3bc] text-xs font-bold hover:bg-[#bd9867]/40 flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                    <LucideIcon name="Upload" size={14} />
                    <span>{isUploading ? "Đang tải..." : "Tải ảnh lên"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {urlHinhAnh && (
                  <div className="mt-2.5 relative w-full h-36 bg-black border border-[#bd9867]/30 overflow-hidden group">
                    <img
                      src={urlHinhAnh}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setUrlHinhAnh("")}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      <LucideIcon name="X" size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Mô tả chi tiết */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mô tả chi tiết tài khoản
                </label>
                <textarea
                  rows={4}
                  placeholder={`- Tướng: 118 tướng\n- Trang phục: 180 skin (Nhiều skin SS, Hữu Hạn)\n- Rank hiện tại: Tinh Anh 1, lịch sử Cao Thủ\n- Bảng ngọc: 90 full chuẩn mọi vị trí\n- Tình trạng: Trắng thông tin, đổi SĐT ngay`}
                  value={moTa}
                  onChange={(e) => setMoTa(e.target.value)}
                  className="w-full px-3 py-2 bg-black/50 border border-[#bd9867]/40 text-xs text-[#fce3bc] placeholder-slate-500 focus:outline-none focus:border-[#fce3bc]"
                />
              </div>

              {/* Chọn Liên hệ đang active để gắn cho nút Mua ngay */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300">
                    Kênh liên hệ điều hướng (Gắn cho nút "Mua ngay / Liên hệ mua
                    ngay")
                  </label>
                  {links.filter((l) => l.enabled).length > 0 && (
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {links.filter((l) => l.enabled).length} liên hệ đang
                      active
                    </span>
                  )}
                </div>

                {/* Dropdown chọn liên hệ active */}
                <select
                  value={
                    links.some((l) => l.url === lienHe || l.id === lienHe)
                      ? links.find((l) => l.url === lienHe || l.id === lienHe)
                          ?.url
                      : lienHe
                        ? "custom"
                        : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "custom") {
                      // Keep custom or leave empty for typing
                    } else {
                      setLienHe(val);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-[#bd9867]/40 text-xs text-[#fce3bc] focus:outline-none focus:border-[#fce3bc] cursor-pointer"
                >
                  <option value="">
                    -- Mặc định (Tự động lấy link liên hệ active đầu tiên) --
                  </option>
                  {links
                    .filter((l) => l.enabled)
                    .map((link) => (
                      <option key={link.id} value={link.url}>
                        ✓ {link.title} ({link.url})
                      </option>
                    ))}
                  <option value="custom">
                    ✏️ Nhập liên kết tùy chỉnh khác...
                  </option>
                </select>

                {/* Ô nhập liên kết chi tiết hoặc tùy chỉnh */}
                <div className="relative">
                  <LucideIcon
                    name="Link2"
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bd9867]"
                  />
                  <input
                    type="text"
                    placeholder="URL liên kết (vd: https://zalo.me/... hoặc https://m.me/...)"
                    value={lienHe}
                    onChange={(e) => setLienHe(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-black/50 border border-[#bd9867]/40 text-xs text-[#fce3bc] placeholder-slate-500 focus:outline-none focus:border-[#fce3bc] font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Khi khách bấm nút "Mua ngay" ở kho acc, hệ thống sẽ tự động
                  chuyển hướng khách đến link này (giống bài viết).
                </p>
              </div>

              {/* Checkboxes: Hiển thị & Đã bán */}
              <div className="pt-2 border-t border-[#bd9867]/20 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hienThi}
                    onChange={(e) => setHienThi(e.target.checked)}
                    className="w-4 h-4 accent-[#bd9867]"
                  />
                  <span className="text-xs font-bold text-slate-200">
                    Hiển thị công khai trên web
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={daBan}
                    onChange={(e) => setDaBan(e.target.checked)}
                    className="w-4 h-4 accent-red-500"
                  />
                  <span className="text-xs font-bold text-red-300">
                    Đã bán (Gắn nhãn Đã bán)
                  </span>
                </label>
              </div>

              {/* Form Footer */}
              <div className="pt-4 border-t border-[#bd9867]/40 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSaving
                    ? "Đang lưu..."
                    : editingAccount
                      ? "Lưu Thay Đổi"
                      : "Thêm Vào Kho"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {cropperOpen && cropperFile && (
        <ImageCropperModal
          isOpen={cropperOpen}
          imageFile={cropperFile}
          aspectRatio={16 / 9}
          title="Cắt ảnh tài khoản game (16:9)"
          onConfirm={handleCropComplete}
          onClose={() => setCropperOpen(false)}
        />
      )}
    </div>
  );
}
