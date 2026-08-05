import React, { useState } from "react";
import { DBNotification, DBUser } from "../supabase";
import { dbService } from "../dbService";
import LucideIcon from "./LucideIcon";

interface NotificationsAdminTabProps {
  notifications: DBNotification[];
  onSendNotification: (notif: Partial<DBNotification>) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  usersCount?: number;
  adminUser?: DBUser | null;
}

export default function NotificationsAdminTab({
  notifications,
  onSendNotification,
  onDeleteNotification,
  usersCount = 2,
  adminUser,
}: NotificationsAdminTabProps) {
  const adminName =
    adminUser?.ten_hien_thi || adminUser?.ten_dang_nhap || "Admin Giáo Án";

  const [title, setTitle] = useState("");
  const [type, setType] = useState<
    "chao_mung" | "hinh_anh" | "qua_tang" | "chung"
  >("chung");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedColor, setSelectedColor] = useState("#fce3bc");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn một tệp hình ảnh!");
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadedUrl = await dbService.uploadNotificationImage(file);
      setImageUrl(uploadedUrl);
      if (window.showNotification) {
        window.showNotification(
          "Đã tải ảnh thông báo lên Bucket thành công!",
          "success",
        );
      }
    } catch (err) {
      console.error("Tải ảnh thất bại:", err);
      alert("Tải ảnh lên thất bại, vui lòng thử lại!");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Rich Text Formatting Helpers for Content textarea
  const insertFormatting = (tagStart: string, tagEnd: string) => {
    const textarea = document.getElementById(
      "rich-content-textarea",
    ) as HTMLTextAreaElement;
    if (!textarea) {
      setContent((prev) => prev + `${tagStart}${tagEnd}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || "Nội dung";
    const replacement = `${tagStart}${selectedText}${tagEnd}`;

    const newContent =
      content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
  };

  const insertColorText = (colorHex: string) => {
    insertFormatting(`<span style="color: ${colorHex}">`, `</span>`);
  };

  const applyTemplate = (templateType: string) => {
    if (templateType === "chao_mung") {
      setTitle("🎉 Chào mừng thành viên mới !!!");
      setType("chao_mung");
      setContent(
        `<p>Xin chào <b><span style="color: #fce3bc">Kiện Tướng</span></b>! Cảm ơn bạn đã <span style="color: #22c55e">Đăng ký thành viên</span>, ghé thăm trang cá nhân và <span style="color: #fce3bc"><b>Học Viện của tôi</b></span>.</p><p>Tại đây bạn có thể tra cứu chi tiết <b><i>bảng ngọc, phù hiệu, trang bị chuẩn</i></b> của các tướng theo Meta mới nhất.</p>`,
      );
    } else if (templateType === "hinh_anh") {
      setTitle("Cập Nhật Meta Tướng Mới");
      setType("hinh_anh");
      setImageUrl("/image/tuong/DauSi/Ata.jpg");
      setContent(
        `<p>Ban quản trị đã cập nhật danh sách <span style="color: #60a5fa"><b>Tướng Đấu Sĩ Tà Thần</b></span> hot nhất phiên bản hiện tại. Hãy kiểm tra ngay hình ảnh chi tiết bộ trang bị & cách combo mượt nhất!</p>`,
      );
    } else if (templateType === "qua_tang") {
      setTitle("🎁 Nhận Mã Quà Tặng Sự Kiện");
      setType("qua_tang");
      setGiftCode("AOVSEASON2026");
      setContent(
        `<p>Phần thưởng sự kiện dành tặng những <b><span style="color: #fce3bc">Kiện Tướng may mắn</span></b>! Hãy sao chép ngay mã quà tặng bên dưới để nhận quà.</p>`,
      );
    } else if (templateType === "bao_tri") {
      setTitle("⚠️ Thông Báo Nâng Cấp Hệ Thống");
      setType("chung");
      setContent(
        `<p><span style="color: #ef4444"><b>Hệ thống sẽ tạm thời bảo trì</b></span>. Tất cả thông số lối lên đồ sẽ được cập nhật chính xác sau khi bảo trì xong.</p>`,
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Vui lòng nhập tiêu đề thông báo!");
      return;
    }
    if (!content.trim()) {
      alert("Vui lòng nhập nội dung thông báo!");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSendNotification({
        tieu_de: title,
        noi_dung: content,
        loai_thong_bao: type,
        url_hinh_anh: imageUrl || null,
        ma_qua_tang: giftCode || null,
        nguoi_gui_ten: adminName,
      });

      // Reset Form
      setTitle("");
      setContent("");
      setImageUrl("");
      setGiftCode("");
      if (window.showNotification) {
        window.showNotification(
          "Đã phát thông báo thành công cho toàn bộ User!",
          "success",
        );
      }
    } catch (err) {
      console.error(err);
      alert("Gửi thông báo thất bại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#bd9867]/30 pb-4">
        <div>
          <h2 className="text-xl font-extrabold uppercase tracking-wide bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent flex items-center gap-2">
            <LucideIcon name="Send" size={22} className="text-[#fce3bc]" />
            Gửi Thông Báo Toàn Bộ User
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Gửi thông báo broadcast tới tất cả người dùng hệ thống. Theo dõi
            trạng thái đã đọc (1) & chưa đọc (0).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded font-bold flex items-center gap-1.5">
            <LucideIcon name="Users" size={14} />
            Hệ thống: {usersCount} User
          </span>
          <span className="text-xs px-3 py-1 bg-[#bd9867]/20 text-[#fce3bc] border border-[#bd9867]/40 rounded font-bold">
            Tổng: {notifications.length} Thông báo
          </span>
        </div>
      </div>

      {/* Grid Compose & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Section (7 Cols) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 space-y-4 bg-slate-900/80 border border-[#bd9867]/40 p-4 sm:p-5 shadow-xl"
        >
          <h3 className="text-sm font-black uppercase text-[#fce3bc] flex items-center gap-2 border-b border-slate-800 pb-2">
            <LucideIcon name="PenTool" size={16} />
            Soạn Nội Dung Thông Báo (Dạng Rich Text Format)
          </h3>

          {/* Quick Preset Templates */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Chèn mẫu soạn sẵn nhanh:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyTemplate("chao_mung")}
                className="text-[11px] font-bold px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded cursor-pointer transition-all active:scale-95"
              >
                🎉 Chào mừng user
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("qua_tang")}
                className="text-[11px] font-bold px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded cursor-pointer transition-all active:scale-95"
              >
                🎁 Mã quà tặng
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("hinh_anh")}
                className="text-[11px] font-bold px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded cursor-pointer transition-all active:scale-95"
              >
                🖼️ Thông báo ảnh
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("bao_tri")}
                className="text-[11px] font-bold px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded cursor-pointer transition-all active:scale-95"
              >
                ⚠️ Bảo trì nâng cấp
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Tiêu đề thông báo <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: 🎉 Chào mừng bạn đến với Giáo Án Liên Quân!"
              className="w-full px-3 py-2 bg-black/60 border border-slate-700 text-slate-100 text-sm focus:border-[#bd9867] focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Type & Sender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Loại thông báo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/60 border border-slate-700 text-slate-100 text-xs focus:border-[#bd9867] focus:outline-none"
              >
                <option value="chung">📢 Thông báo chung</option>
                <option value="chao_mung">🎉 Chào mừng user mới</option>
                <option value="qua_tang">🎁 Mã quà tặng (Giftcode)</option>
                <option value="hinh_anh">🖼️ Thông báo hình ảnh</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tên người gửi
              </label>
              <div className="w-full px-3 py-2 bg-slate-900 border border-slate-700 text-slate-100 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LucideIcon
                    name="UserCheck"
                    size={14}
                    className="text-[#fce3bc]"
                  />
                  <span className="text-[#fce3bc] font-black">{adminName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Image Upload from Device (Supabase Bucket Storage) & Gift Code */}
          <div className="space-y-3 border border-slate-800 p-3 bg-black/40">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <LucideIcon
                    name="Upload"
                    size={14}
                    className="text-[#fce3bc]"
                  />
                  Tải ảnh thông báo từ thiết bị (Tự động lưu vào Bucket):
                </span>
                {imageUrl && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <LucideIcon name="CheckCircle2" size={12} />
                    Đã lưu link Bucket
                  </span>
                )}
              </label>

              {imageUrl ? (
                <div className="space-y-2">
                  <div className="relative rounded overflow-hidden border-2 border-[#bd9867] bg-black group flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt="Banner thông báo"
                      className="w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="px-3 py-1.5 bg-[#bd9867] hover:bg-[#fce3bc] text-slate-950 font-bold text-xs rounded shadow transition-all cursor-pointer flex items-center gap-1">
                        <LucideIcon name="RefreshCw" size={13} />
                        Thay ảnh khác
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={isUploadingImage}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded shadow transition-all cursor-pointer flex items-center gap-1"
                      >
                        <LucideIcon name="Trash2" size={13} />
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] bg-slate-950 p-2 border border-slate-800 rounded">
                    <LucideIcon
                      name="Link"
                      size={12}
                      className="text-[#fce3bc] shrink-0"
                    />
                    <span className="text-slate-400 font-mono truncate select-all flex-1">
                      {imageUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(imageUrl);
                        if (window.showNotification) {
                          window.showNotification(
                            "Đã sao chép link ảnh Bucket!",
                            "info",
                          );
                        }
                      }}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded shrink-0 cursor-pointer"
                    >
                      Coppy
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  className={`border-2 border-dashed rounded p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isUploadingImage
                      ? "border-amber-500 bg-amber-500/10 text-amber-300 animate-pulse"
                      : "border-slate-700 hover:border-[#bd9867] bg-black/60 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                  {isUploadingImage ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <LucideIcon
                        name="Loader2"
                        size={28}
                        className="animate-spin text-amber-400"
                      />
                      <p className="text-xs font-bold text-amber-300">
                        Đang tải ảnh lên...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-[#bd9867]/20 border border-[#bd9867]/60 flex items-center justify-center text-[#fce3bc]">
                        <LucideIcon name="ImagePlus" size={20} />
                      </div>
                      <p className="text-xs font-bold text-slate-200">
                        Nhấn vào đây để tải ảnh từ máy tính hoặc điện thoại
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Hỗ trợ PNG, JPG, WEBP, GIF (Tự động tải vào Supabase
                        Bucket và lưu link)
                      </p>
                    </div>
                  )}
                </label>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Mã Quà Tặng Giftcode (Tùy chọn)
              </label>
              <input
                type="text"
                value={giftCode}
                onChange={(e) => setGiftCode(e.target.value)}
                placeholder="Ví dụ: AOV2026GIFTS"
                className="w-full px-3 py-2 bg-black/60 border border-slate-700 text-amber-300 font-mono text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Rich Content Editor Controls */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Nội dung chi tiết (Định dạng Word: In đậm, nghiêng, màu sắc...)
            </label>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-black/80 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => insertFormatting("<b>", "</b>")}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 font-black text-white rounded cursor-pointer"
                title="In đậm (Bold)"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("<i>", "</i>")}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 italic font-semibold text-white rounded cursor-pointer"
                title="In nghiêng (Italic)"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("<u>", "</u>")}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 underline text-white rounded cursor-pointer"
                title="Gạch chân (Underline)"
              >
                U
              </button>
              <span className="text-slate-600">|</span>

              {/* Color Buttons */}
              <span className="text-[11px] font-bold text-slate-400">Màu:</span>
              {[
                { label: "Vàng Kim", hex: "#fce3bc" },
                { label: "Đỏ", hex: "#ef4444" },
                { label: "Vàng", hex: "#eab308" },
                { label: "Lục", hex: "#22c55e" },
                { label: "Lam", hex: "#3b82f6" },
                { label: "Tím", hex: "#a855f7" },
                { label: "Trắng", hex: "#ffffff" },
              ].map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => insertColorText(c.hex)}
                  className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: c.hex }}
                  title={`Đổi màu ${c.label}`}
                />
              ))}

              <span className="text-slate-600">|</span>

              <button
                type="button"
                onClick={() => insertFormatting("<p>", "</p>")}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 rounded cursor-pointer"
              >
                Đoạn văn
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("<ul><li>", "</li></ul>")}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 rounded cursor-pointer"
              >
                Danh sách
              </button>
            </div>

            <textarea
              id="rich-content-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung thông báo... Có thể dùng các nút hỗ trợ ở trên hoặc gõ mã HTML."
              rows={6}
              className="w-full p-3 bg-black/60 border border-slate-700 text-slate-100 text-xs font-mono focus:border-[#bd9867] focus:outline-none custom-scrollbar"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-[#bd9867] to-[#fce3bc] hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <LucideIcon name="Send" size={18} />
            {isSubmitting
              ? "Đang phát thông báo..."
              : "Phát Thông Báo Tới Toàn Bộ User"}
          </button>
        </form>

        {/* Live Preview Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-black uppercase text-[#fce3bc] flex items-center gap-2">
            <LucideIcon name="Eye" size={16} />
            Xem Trước Giao Diện Mẫu
          </h3>

          <div className="bg-slate-950 border-2 border-[#bd9867] shadow-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-[#bd9867]/20 text-[#fce3bc] border border-[#bd9867]/40">
                {type === "chao_mung"
                  ? "Chào mừng"
                  : type === "qua_tang"
                    ? "Mã quà tặng"
                    : type === "hinh_anh"
                      ? "Thông báo ảnh"
                      : "Thông báo chung"}
              </span>
              <span className="text-[11px] text-slate-400">
                Gửi bởi: <b className="text-[#fce3bc]">{adminName}</b>
              </span>
            </div>

            <h4 className="text-base font-extrabold text-white">
              {title || "Tiêu đề thông báo mẫu sẽ hiển thị ở đây"}
            </h4>

            {imageUrl && (
              <div className="rounded overflow-hidden border border-slate-800 bg-black">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div
              className="text-xs text-slate-300 leading-relaxed space-y-2 border-t border-slate-800/80 pt-2"
              dangerouslySetInnerHTML={{
                __html:
                  content ||
                  "<p className='text-slate-500 italic'>Nội dung thông báo rich text sẽ hiển thị ở đây...</p>",
              }}
            />

            {giftCode && (
              <div className="p-3 bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-500/60 rounded flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase font-bold text-amber-300">
                    Mã quà tặng:
                  </p>
                  <p className="text-sm font-black font-mono text-amber-400 tracking-wider">
                    {giftCode}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold text-[10px] uppercase rounded">
                  Sao chép
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* List of Sent Notifications */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-base font-extrabold uppercase text-[#fce3bc] flex items-center gap-2">
          <LucideIcon name="History" size={18} />
          Danh Sách Thông Báo Đã Gửi ({notifications.length})
        </h3>

        <div className="overflow-x-auto bg-slate-900/80 border border-[#bd9867]/30">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-black/80 border-b border-[#bd9867]/40 text-[#fce3bc] uppercase text-[10px] font-black tracking-wider">
                <th className="p-3">Loại</th>
                <th className="p-3">Tiêu đề thông báo</th>
                <th className="p-3">Người gửi</th>
                <th className="p-3">Mã quà</th>
                <th className="p-3">Thời gian gửi</th>
                <th className="p-3 text-center">Đã đọc / User</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {notifications.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-6 text-center text-slate-500 font-bold"
                  >
                    Chưa có thông báo nào được phát
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr
                    key={n.id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-3 font-bold">
                      <span className="px-2 py-0.5 bg-[#bd9867]/20 text-[#fce3bc] border border-[#bd9867]/40 text-[10px] uppercase">
                        {n.loai_thong_bao}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white max-w-xs truncate">
                      {n.tieu_de}
                    </td>
                    <td className="p-3 text-slate-300 font-semibold">
                      {n.nguoi_gui_ten || "Admin"}
                    </td>
                    <td className="p-3 font-mono text-amber-300 font-bold">
                      {n.ma_qua_tang || "-"}
                    </td>
                    <td className="p-3 text-slate-400">
                      {n.created_at
                        ? new Date(n.created_at).toLocaleString("vi-VN")
                        : "Vừa xong"}
                    </td>
                    <td className="p-3 text-center font-bold">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded">
                        {n.total_readers_count || 0} user đã đọc
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            confirm(
                              `Bạn có chắc muốn xóa thông báo "${n.tieu_de}"?`,
                            )
                          ) {
                            onDeleteNotification(n.id);
                          }
                        }}
                        className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-600/40 transition-all cursor-pointer rounded text-[11px] font-bold"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
