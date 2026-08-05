import React, { useState, useEffect } from "react";
import { DBUser, DBDonation } from "../supabase";
import { dbService } from "../dbService";
import { supabase } from "../supabase";
import LucideIcon from "./LucideIcon";

interface UserProfileTabProps {
  user: DBUser;
  onUpdateUser: (updatedUser: DBUser) => void;
  showNotification: (msg: string, type?: "success" | "error" | "info") => void;
  setPublicTab: (
    tab: "links" | "guides" | "donate" | "posts" | "profile",
  ) => void;
}

// Preset avatars from /image/Avt directory
const AVATAR_PRESETS = [
  { name: "Ata", url: "/image/Avt/1.jpg" },
  { name: "Florentino", url: "/image/Avt/2.jpg" },
  { name: "Valhein", url: "/image/Avt/3.jpg" },
  { name: "Raz", url: "/image/Avt/4.jpg" },
  { name: "Nakroth", url: "/image/Avt/5.jpg" },
  { name: "Liliana", url: "/image/Avt/6.jpg" },
  { name: "Allain", url: "/image/Avt/7.jpg" },
  { name: "Yena", url: "/image/Avt/8.jpg" },
  { name: "Qi", url: "/image/Avt/9.jpg" },
  { name: "Zuka", url: "/image/Avt/10.jpg" },
];

export default function UserProfileTab({
  user,
  onUpdateUser,
  showNotification,
  setPublicTab,
}: UserProfileTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"info" | "history">("info");

  // Read mode vs Edit mode for personal info
  const [isEditing, setIsEditing] = useState(false);

  // Profile Form state
  const [displayName, setDisplayName] = useState(
    user.ten_hien_thi || user.ten_dang_nhap || "",
  );
  const [avatarUrl, setAvatarUrl] = useState(
    user.avatar_url || "/image/Avt/Ata.jpg",
  );
  const [isSaving, setIsSaving] = useState(false);

  // Change Password Modal/State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Donation history state
  const [myDonations, setMyDonations] = useState<DBDonation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Derived user email
  const userEmail =
    (user as any).email ||
    (user.ten_dang_nhap.includes("@")
      ? user.ten_dang_nhap
      : `${user.ten_dang_nhap}@gmail.com`);

  // Sync state if user prop changes
  useEffect(() => {
    setDisplayName(user.ten_hien_thi || user.ten_dang_nhap || "");
    if (user.avatar_url) setAvatarUrl(user.avatar_url);
  }, [user]);

  // Load donation history for this user
  const fetchMyDonations = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("ung_ho")
        .select("*")
        .or(
          `nguoi_dung_id.eq.${user.id},ten_nguoi_ung_ho.eq.${user.ten_hien_thi},ten_nguoi_ung_ho.eq.${user.ten_dang_nhap}`,
        )
        .order("created_at", { ascending: false });

      if (!error && data) {
        setMyDonations(data as DBDonation[]);
      } else {
        // Fallback filter locally
        const allDons = await dbService.getDonations();
        const userDons = allDons.filter(
          (d) =>
            (d as any).nguoi_dung_id === user.id ||
            d.ten_nguoi_ung_ho === user.ten_hien_thi ||
            d.ten_nguoi_ung_ho === user.ten_dang_nhap,
        );
        setMyDonations(userDons);
      }
    } catch (err) {
      console.warn("Lỗi tải lịch sử ủng hộ:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchMyDonations();
  }, [user.id, user.ten_hien_thi, user.ten_dang_nhap]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showNotification("Tên hiển thị không được để trống!", "error");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await dbService.updateProfile(user.id, {
        ten_hien_thi: displayName.trim(),
        avatar_url: avatarUrl.trim() || null,
      });

      if (updated) {
        onUpdateUser({
          ...user,
          ten_hien_thi: displayName.trim(),
          avatar_url: avatarUrl.trim() || null,
        });
        showNotification("Cập nhật thông tin cá nhân thành công!", "success");
        setIsEditing(false);
      } else {
        // Fallback update
        const { error } = await supabase
          .from("profiles")
          .update({
            ten_hien_thi: displayName.trim(),
            avatar_url: avatarUrl.trim() || null,
          })
          .eq("id", user.id);

        if (!error) {
          onUpdateUser({
            ...user,
            ten_hien_thi: displayName.trim(),
            avatar_url: avatarUrl.trim() || null,
          });
          showNotification("Cập nhật thông tin thành công!", "success");
          setIsEditing(false);
        } else {
          showNotification(
            "Không thể lưu thông tin. Vui lòng thử lại!",
            "error",
          );
        }
      }
    } catch (err) {
      console.error(err);
      showNotification("Có lỗi xảy ra khi lưu thông tin!", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Change Password
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showNotification("Mật khẩu mới phải có ít nhất 6 ký tự!", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification("Xác nhận mật khẩu mới không trùng khớp!", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await dbService.changePassword(newPassword);
      if (res.success) {
        showNotification("Đổi mật khẩu thành công!", "success");
        setIsPasswordModalOpen(false);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showNotification(
          res.error || "Không thể cập nhật mật khẩu. Vui lòng thử lại!",
          "error",
        );
      }
    } catch (err) {
      showNotification("Đã xảy ra lỗi khi đổi mật khẩu!", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Calculate total confirmed donation amount
  const totalDonated = myDonations
    .filter((d) => d.trang_thai === 1)
    .reduce((sum, d) => sum + Number(d.so_tien || 0), 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-12 text-left">
      {/* Hero Profile Card */}
      <div className="relative overflow-hidden">
        <div className="flex flex-row items-center gap-3 sm:gap-4">
          {/* Avatar frame */}
          <div className="relative group shrink-0">
            <div className="w-16 h-16 sm:w-24 sm:h-24 p-[2px] bg-gradient-to-t from-[#bd9867] to-[#fce3bc] shadow-lg shrink-0">
              <img
                src={avatarUrl || "/image/Avt/Ata.jpg"}
                alt={user.ten_dang_nhap}
                className="w-full h-full object-cover bg-slate-900"
                referrerPolicy="no-referrer"
              />
            </div>
            <span
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 border-2 border-slate-950 rounded-full"
              title="Trực tuyến"
            />
          </div>

          {/* User Text Info */}
          <div className="flex-1 text-left space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
              <h2 className="text-base sm:text-2xl font-black bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent truncate max-w-[150px] sm:max-w-none">
                {user.ten_hien_thi || user.ten_dang_nhap}
              </h2>
              <span className="inline-block text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-[#bd9867]/20 text-[#fce3bc] border border-[#bd9867]/50 shadow-xs shrink-0">
                {user.vai_tro === 1 ? "Admin" : "Thành viên"}
              </span>
            </div>

            <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
              Tài khoản:{" "}
              <span className="text-[#fce3bc] font-bold">
                @{user.ten_dang_nhap}
              </span>
            </p>

            {/* Quick stats badges */}
            <div className="flex flex-wrap items-center justify-start gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
              <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500/10 border border-amber-500/30 text-[10px] sm:text-[11px] font-bold text-amber-300 flex items-center gap-1">
                <LucideIcon
                  name="Heart"
                  size={12}
                  className="text-amber-400 fill-amber-400 shrink-0"
                />
                <span className="truncate">
                  Đã ủng hộ: {totalDonated.toLocaleString("vi-VN")} VNĐ
                </span>
              </div>
              <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-500/10 border border-emerald-500/30 text-[10px] sm:text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                <LucideIcon name="CheckCircle" size={12} className="shrink-0" />
                <span className="truncate">
                  {myDonations.length} lượt giao dịch
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-[#bd9867]/40 gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubTab("info")}
          className={`px-4 py-2 text-xs font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-2 border-b-2 -mb-[2px] whitespace-nowrap ${
            activeSubTab === "info"
              ? "border-[#bd9867] bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <LucideIcon
            name="User"
            size={14}
            className={activeSubTab === "info" ? "text-[#bd9867]" : ""}
          />
          <span>THÔNG TIN CÁ NHÂN</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("history")}
          className={`px-4 py-2 text-xs font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-2 border-b-2 -mb-[2px] whitespace-nowrap ${
            activeSubTab === "history"
              ? "border-[#bd9867] bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <LucideIcon
            name="History"
            size={14}
            className={activeSubTab === "history" ? "text-[#bd9867]" : ""}
          />
          <span>LỊCH SỬ ỦNG HỘ ({myDonations.length})</span>
        </button>
      </div>

      {/* Sub-Tab 1: Read-Only Info or Edit Form */}
      {activeSubTab === "info" && (
        <div className="space-y-4">
          {!isEditing ? (
            /* READ-ONLY VIEW */
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#bd9867]/30 pb-3">
                {/* <h3 className="text-sm font-black text-[#fce3bc] uppercase tracking-wider flex items-center gap-2">
                  <span>HỒ SƠ THÀNH VIÊN</span>
                </h3> */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 bg-gradient-to-t from-[#bd9867] to-[#fce3bc] hover:brightness-110 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <LucideIcon name="Edit3" size={14} />
                    <span>CHỈNH SỬA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="px-3 py-1.5 border border-[#bd9867]/60 hover:bg-[#bd9867]/20 text-[#fce3bc] font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <LucideIcon name="Key" size={14} />
                    <span>ĐỔI MẬT KHẨU</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Field 1: Display Name */}
                <div className="p-2 bg-slate-900/20 border border-[#bd9867]/30">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Tên hiển thị
                  </span>
                  <p className="text-sm font-extrabold text-[#fce3bc] truncate">
                    {user.ten_hien_thi || user.ten_dang_nhap}
                  </p>
                </div>

                {/* Field 2: Username */}
                <div className="p-2 bg-slate-900/20 border border-[#bd9867]/30">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Tên đăng nhập
                  </span>
                  <p className="text-sm font-bold text-slate-200 truncate">
                    @{user.ten_dang_nhap}
                  </p>
                </div>

                {/* Field 3: Email (Readonly) */}
                <div className="p-2 bg-slate-900/20 border border-[#bd9867]/30">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Email tài khoản
                  </span>
                  <p className="text-sm font-mono font-bold text-slate-300 truncate">
                    {userEmail}
                  </p>
                </div>

                {/* Field 4: Role */}
                {/* <div className="p-2 bg-slate-900/20 border border-[#bd9867]/30">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Quyền hạn tài khoản
                  </span>
                  <p className="text-sm font-extrabold text-amber-300 truncate">
                    {user.vai_tro === 1
                      ? "Quản trị viên (Admin)"
                      : "Thành viên Kiện Tướng"}
                  </p>
                </div> */}
              </div>
            </div>
          ) : (
            /* EDIT FORM VIEW */
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#bd9867]/30 pb-3">
                <h3 className="text-sm font-black text-[#fce3bc] uppercase tracking-wider flex items-center gap-2">
                  <LucideIcon
                    name="Edit3"
                    size={16}
                    className="text-[#bd9867]"
                  />
                  <span>CHỈNH SỬA THÔNG TIN</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(
                      user.ten_hien_thi || user.ten_dang_nhap || "",
                    );
                    setAvatarUrl(user.avatar_url || "/image/Avt/Ata.jpg");
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-all cursor-pointer"
                >
                  HỦY
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Display Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#fce3bc]">
                    Tên hiển thị mới *
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nhập tên hiển thị mới của bạn..."
                    className="w-full p-3 border border-[#bd9867]/60 bg-slate-900 text-[#fce3bc] placeholder:text-slate-500 outline-none transition-all text-sm font-bold focus:border-[#bd9867]"
                  />
                  <p className="text-[11px] text-slate-400 italic">
                    * Tên này sẽ tự động xuất hiện khi bạn gửi tin nhắn hoặc ủng
                    hộ.
                  </p>
                </div>

                {/* Avatar Selection from /image/Avt */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#fce3bc]">
                    Chọn Ảnh Đại Diện
                  </label>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Nhấp chọn ảnh đại diện mong muốn từ bộ sưu tập có sẵn:
                  </p>

                  <div className="flex flex-wrap justify-between gap-y-2 max-h-64 overflow-y-auto p-2 border border-[#bd9867]/30 bg-black/40">
                    {AVATAR_PRESETS.map((preset) => {
                      const isSelected = avatarUrl === preset.url;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setAvatarUrl(preset.url)}
                          className="relative cursor-pointer transition-transform hover:scale-105 focus:outline-none"
                        >
                          {/* Ảnh Avatar */}
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className={`w-12 h-12 object-cover bg-slate-950 transition-all ${
                              isSelected ? "ring-2 ring-[#bd9867]" : " "
                            }`}
                            referrerPolicy="no-referrer"
                          />

                          {/* Dấu tích vàng góc trên bên phải */}
                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#bd9867] text-slate-950 rounded-full flex items-center justify-center text-[10px] font-black shadow-md z-10">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit / Action Buttons */}
                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-t from-[#bd9867] to-[#fce3bc] hover:brightness-110 text-slate-950 font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-60"
                  >
                    {isSaving ? (
                      <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    ) : (
                      <LucideIcon name="Save" size={16} />
                    )}
                    <span>LƯU THAY ĐỔI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setDisplayName(
                        user.ten_hien_thi || user.ten_dang_nhap || "",
                      );
                      setAvatarUrl(user.avatar_url || "/image/Avt/Ata.jpg");
                    }}
                    className="px-5 py-3 border border-slate-700 hover:bg-white/5 text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    HỦY
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Donation History - TABLE VIEW */}
      {activeSubTab === "history" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-[#fce3bc] uppercase tracking-wider flex items-center gap-2">
              <LucideIcon name="List" size={16} className="text-[#bd9867]" />
              <span>Bảng Lịch Sử Giao Dịch ({myDonations.length})</span>
            </h3>
            <button
              type="button"
              onClick={fetchMyDonations}
              className="px-2.5 py-1 text-xs font-bold text-[#bd9867] border border-[#bd9867]/40 hover:bg-[#bd9867]/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              <LucideIcon name="RefreshCw" size={12} />
              <span>Làm mới</span>
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/60 border border-[#bd9867]/40 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-[#bd9867]/30 border-t-[#bd9867] rounded-full animate-spin" />
              <span>Đang tải danh sách giao dịch...</span>
            </div>
          ) : myDonations.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-slate-950/80 border border-[#bd9867]/60">
              <LucideIcon
                name="Heart"
                size={32}
                className="mx-auto text-amber-400/60"
              />
              <p className="text-sm font-bold text-slate-300">
                Bạn chưa có giao dịch ủng hộ nào.
              </p>
              <p className="text-xs text-slate-400">
                Mọi khoản ủng hộ của bạn sẽ hiển thị tại đây để bạn dễ dàng theo
                dõi trạng thái.
              </p>
              <button
                type="button"
                onClick={() => setPublicTab("donate")}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 font-black text-xs shadow-md hover:brightness-110 cursor-pointer"
              >
                <LucideIcon name="Heart" size={14} className="fill-slate-950" />
                <span>ỦNG HỘ NGAY</span>
              </button>
            </div>
          ) : (
            /* TABLE FORMAT */
            <div className="border border-[#bd9867]/50 bg-slate-950/90 shadow-xl overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#bd9867]/50 bg-slate-900/90 text-[#fce3bc] uppercase text-[10px] font-black tracking-wider">
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3">Mã Chuyển Khoản</th>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Số tiền</th>
                    <th className="p-3">Nội dung</th>
                    <th className="p-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {myDonations.map((item, index) => {
                    const dateStr = item.created_at || (item as any).ngay_tao;
                    const formattedDate = dateStr
                      ? new Date(dateStr).toLocaleString("vi-VN")
                      : "—";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-[#bd9867]/10 transition-colors"
                      >
                        {/* Index */}
                        <td className="p-3 text-center font-extrabold text-slate-400">
                          {index + 1}
                        </td>

                        {/* Code */}
                        <td className="p-3">
                          <span className="font-mono text-amber-300 font-extrabold uppercase px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30">
                            {item.noi_dung_ck || "—"}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="p-3 text-slate-300 font-medium whitespace-nowrap">
                          {formattedDate}
                        </td>

                        {/* Amount */}
                        <td className="p-3 font-black text-emerald-400 whitespace-nowrap text-sm">
                          +{Number(item.so_tien).toLocaleString("vi-VN")} đ
                        </td>

                        {/* Message */}
                        <td className="p-3 text-slate-300 max-w-xs truncate italic">
                          {item.noi_dung
                            ? `"${item.noi_dung}"`
                            : "Không có lời nhắn"}
                        </td>

                        {/* Status */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {item.trang_thai === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-[11px] font-black">
                              <LucideIcon name="CheckCircle2" size={12} />
                              <span>ĐÃ XÁC NHẬN</span>
                            </span>
                          ) : item.trang_thai === 2 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/20 text-red-300 border border-red-500/50 text-[11px] font-black">
                              <LucideIcon name="XCircle" size={12} />
                              <span>ĐÃ HỦY</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[11px] font-black animate-pulse">
                              <LucideIcon name="Clock" size={12} />
                              <span>CHỜ XỬ LÝ</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950 border-2 border-[#bd9867] p-5 sm:p-6 max-w-md w-full shadow-2xl relative text-left space-y-4 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LucideIcon name="X" size={18} />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-2.5 border-b border-[#bd9867]/40 pb-3">
              <div className="p-2 bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 shadow-md">
                <LucideIcon name="Key" size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent uppercase tracking-wider">
                  ĐỔI MẬT KHẨU TÀI KHOẢN
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  Tài khoản: @{user.ten_dang_nhap}
                </p>
              </div>
            </div>

            {/* Password Change Form */}
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#fce3bc]">
                  Mật khẩu mới *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)..."
                  className="w-full p-3 border border-[#bd9867]/60 bg-slate-900 text-[#fce3bc] placeholder:text-slate-500 outline-none text-sm font-bold focus:border-[#bd9867]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#fce3bc]">
                  Nhập lại mật khẩu mới *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Xác nhận lại mật khẩu mới..."
                  className="w-full p-3 border border-[#bd9867]/60 bg-slate-900 text-[#fce3bc] placeholder:text-slate-500 outline-none text-sm font-bold focus:border-[#bd9867]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-700 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 bg-gradient-to-t from-[#bd9867] to-[#fce3bc] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isChangingPassword ? (
                    <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <LucideIcon name="Check" size={14} />
                  )}
                  <span>CẬP NHẬT MẬT KHẨU</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
