import React, { useState } from "react";
import { DBNotification } from "../supabase";
import LucideIcon from "./LucideIcon";

interface PublicNotificationsTabProps {
  notifications: DBNotification[];
  currentUserId?: string;
  isAuthenticated?: boolean;
  onOpenLogin?: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  isDarkPublic?: boolean;
}

export default function PublicNotificationsTab({
  notifications,
  currentUserId,
  isAuthenticated = false,
  onOpenLogin,
  onMarkAsRead,
  onMarkAllAsRead,
  isDarkPublic = true,
}: PublicNotificationsTabProps) {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [selectedNotif, setSelectedNotif] = useState<DBNotification | null>(
    null,
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // If user is not authenticated, show login requirement screen
  if (!isAuthenticated || !currentUserId) {
    return (
      <div className="w-full space-y-4 animate-in fade-in duration-300">
        <div
          className="relative overflow-hidden border-2 border-[#bd9867] bg-cover bg-center p-6 sm:p-8 shadow-xl rounded-sm text-center"
          style={{ backgroundImage: `url('/image/Decor/bg-header.jpg')` }}
        >
          <div className="relative z-10 max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#bd9867]/20 border-2 border-[#bd9867] flex items-center justify-center text-[#fce3bc] shadow-lg mx-auto">
              <LucideIcon name="Lock" size={32} />
            </div>

            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent uppercase tracking-wide">
              Yêu Cầu Đăng Nhập
            </h2>

            <p className="text-sm text-slate-200 leading-relaxed">
              Bạn cần đăng nhập tài khoản để xem thông báo hệ thống, nhận mã quà
              tặng độc quyền và cập nhật thông tin mới nhất!
            </p>

            {onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                className="px-6 py-3 bg-gradient-to-t from-[#bd9867] to-[#fce3bc] hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl transition-all active:scale-95 cursor-pointer inline-flex items-center gap-2"
              >
                <LucideIcon name="LogIn" size={18} />
                Đăng nhập ngay
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => n.da_doc === 0).length;

  const readCount = notifications.filter((n) => n.da_doc === 1).length;

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "unread") return n.da_doc === 0;
    if (filter === "read") return n.da_doc === 1;
    return true;
  });

  const handleOpenDetail = (notif: DBNotification) => {
    setSelectedNotif(notif);
    if (notif.da_doc === 0) {
      onMarkAsRead(notif.id);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    if (window.showNotification) {
      window.showNotification(`Đã sao chép mã quà tặng: ${code}!`, "success");
    }
    setTimeout(() => {
      setCopiedCode(null);
    }, 3000);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "chao_mung":
        return {
          icon: "PartyPopper",
          color: "text-[#fce3bc]",
          bg: "bg-[#bd9867]/20 border-[#bd9867]",
        };
      case "qua_tang":
        return {
          icon: "Gift",
          color: "text-amber-400",
          bg: "bg-amber-500/20 border-amber-500/40",
        };
      case "hinh_anh":
        return {
          icon: "Image",
          color: "text-sky-400",
          bg: "bg-sky-500/20 border-sky-500/40",
        };
      default:
        return {
          icon: "Bell",
          color: "text-[#bd9867]",
          bg: "bg-[#bd9867]/20 border-[#bd9867]/60",
        };
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "chao_mung":
        return "Thư Chào mừng";
      case "qua_tang":
        return "Mã Quà Tặng";
      case "hinh_anh":
        return "Thông báo";
      default:
        return "Hệ thống";
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Vừa xong";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-300">
      {/* Banner / Page Header */}
      {/* <div
        className="relative overflow-hidden border-2 border-[#bd9867] bg-cover bg-center p-5 sm:p-6 shadow-xl rounded-sm"
        style={{ backgroundImage: `url('/image/Decor/bg-header.jpg')` }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded bg-[#bd9867]/20 border-2 border-[#bd9867] flex items-center justify-center text-[#fce3bc] shadow-lg shrink-0">
              <LucideIcon name="BellRing" size={26} />
            </div>
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent uppercase tracking-wide">
                Thông Báo Hệ Thống
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
                {unreadCount > 0
                  ? `Bạn có ${unreadCount} thông báo chưa đọc`
                  : "Tất cả thông báo đã được đọc"}
              </p>
            </div>
          </div>
        </div>
      </div> */}

      {/* Main Container */}
      <div className="space-y-4">
        {/* Filter Navigation Tabs */}
        <div className="flex border-b border-[#bd9867]/30 pb-3 gap-2 overflow-x-auto custom-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setFilter("all");
              setSelectedNotif(null);
            }}
            className={`px-3.5 py-2 cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
              filter === "all"
                ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc]"
                : "bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800"
            }`}
          >
            <LucideIcon name="List" size={14} />
            Tất cả ({notifications.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setFilter("unread");
              setSelectedNotif(null);
            }}
            className={`px-3.5 py-2 cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
              filter === "unread"
                ? "bg-rose-600 text-white font-black shadow-md"
                : "bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800"
            }`}
          >
            <LucideIcon name="Bell" size={14} />
            Chưa đọc
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setFilter("read");
              setSelectedNotif(null);
            }}
            className={`px-3.5 py-2 cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
              filter === "read"
                ? "bg-emerald-600 text-white font-black shadow-md"
                : "bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800"
            }`}
          >
            <LucideIcon name="Check" size={14} />
            Đã đọc ({readCount})
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="px-3 py-1 bg-gradient-to-t from-[#bd9867] to-[#fce3bc] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <LucideIcon name="CheckCheck" size={16} />
              {/* Đánh dấu tất cả đã đọc */}
            </button>
          )}
        </div>

        {/* Detail View Mode vs List Mode */}
        {selectedNotif ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={() => setSelectedNotif(null)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-[#bd9867]/40 text-[#fce3bc] text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 inline-flex"
            >
              <LucideIcon name="ArrowLeft" size={14} />
              Quay lại danh sách thông báo
            </button>

            <div className="bg-slate-900/90 border-2 border-[#bd9867]/60 p-4 sm:p-6 space-y-4 shadow-xl text-left">
              {/* Notification Detail Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#bd9867]/30 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 border ${
                        getTypeIcon(selectedNotif.loai_thong_bao).bg
                      } ${getTypeIcon(selectedNotif.loai_thong_bao).color}`}
                    >
                      {getTypeLabel(selectedNotif.loai_thong_bao)}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      Người gửi:{" "}
                      <b className="text-[#fce3bc]">
                        {selectedNotif.nguoi_gui_ten || "N/A"}
                      </b>
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                    {selectedNotif.tieu_de}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <LucideIcon name="Clock" size={13} />
                    {formatDate(selectedNotif.created_at)}
                  </p>
                </div>
              </div>

              {/* Banner Image if uploaded */}
              {selectedNotif.url_hinh_anh && (
                <div
                  className="relative overflow-hidden border border-[#bd9867]/60 bg-black cursor-pointer group"
                  onClick={() =>
                    setLightboxImage(selectedNotif.url_hinh_anh || null)
                  }
                >
                  <img
                    src={selectedNotif.url_hinh_anh}
                    alt={selectedNotif.tieu_de}
                    className="w-full h-full object-cover transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {/* <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                    <LucideIcon name="ZoomIn" size={18} />
                    Nhấn để phóng to ảnh
                  </div> */}
                </div>
              )}

              {/* Formatted HTML Content */}

              <div
                className="text-sm text-slate-200 leading-relaxed space-y-2 prose prose-invert max-w-none pt-2"
                dangerouslySetInnerHTML={{ __html: selectedNotif.noi_dung }}
              />

              {/* Gift Code Box if present */}
              {selectedNotif.ma_qua_tang && (
                <div className="flex flex-row items-center justify-between gap-2 sm:gap-4 shadow-xl">
                  <span className="text-[15px] sm:text-xs uppercase font-extrabold text-[#bd9867] tracking-wider shrink-0">
                    CODE:
                  </span>
                  <div className="flex-1 min-w-0 bg-slate-900/80 border border-[#bd9867]/30 px-3 py-2 flex items-center gap-2">
                    <p className="text-base sm:text-xl font-black font-mono tracking-widest select-all truncate bg-gradient-to-r from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent">
                      {selectedNotif.ma_qua_tang}
                    </p>
                  </div>

                  {/* Button Copy */}
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedNotif.ma_qua_tang!)}
                    className="h-10 px-3 sm:px-5 bg-gradient-to-r from-[#bd9867] to-[#fce3bc] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shrink-0"
                    title={
                      copiedCode === selectedNotif.ma_qua_tang
                        ? "Đã sao chép!"
                        : "Sao chép mã"
                    }
                  >
                    <LucideIcon
                      name={
                        copiedCode === selectedNotif.ma_qua_tang
                          ? "Check"
                          : "Copy"
                      }
                      size={16}
                    />
                    <span className="hidden sm:inline">
                      {copiedCode === selectedNotif.ma_qua_tang
                        ? "Đã sao chép!"
                        : "Sao chép mã"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* List Mode */
          <div className="space-y-3">
            {filteredNotifs.length === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-3 bg-slate-900/40 border border-slate-800">
                <LucideIcon
                  name="BellOff"
                  size={44}
                  className="mx-auto text-slate-600"
                />
                <p className="text-sm font-bold text-slate-400">
                  Không tìm thấy thông báo nào trong mục này
                </p>
              </div>
            ) : (
              filteredNotifs.map((notif) => {
                const typeStyle = getTypeIcon(notif.loai_thong_bao);
                const isUnread = notif.da_doc === 0;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleOpenDetail(notif)}
                    className={`p-2 transition-all cursor-pointer border text-left flex items-start gap-2 group relative ${
                      isUnread
                        ? "bg-slate-900/90 border-[#bd9867] shadow-lg hover:border-[#fce3bc]"
                        : "bg-slate-950/60 border-slate-850 hover:border-slate-700 opacity-85"
                    }`}
                  >
                    {/* Unread dot indicator */}
                    {isUnread && (
                      <span className="absolute top-4 right-4 w-3 h-3 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
                    )}

                    {/* Content Summary */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 border ${typeStyle.bg} ${typeStyle.color}`}
                        >
                          {getTypeLabel(notif.loai_thong_bao)}
                        </span>

                        {isUnread ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Chưa đọc
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Đã đọc
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 ml-auto flex items-center gap-1">
                          <LucideIcon name="Clock" size={11} />
                          {formatDate(notif.created_at)}
                        </span>
                      </div>

                      <h4
                        className={`text-sm sm:text-base font-bold truncate group-hover:text-[#fce3bc] transition-colors ${
                          isUnread ? "text-white font-black" : "text-slate-200"
                        }`}
                      >
                        {notif.tieu_de}
                      </h4>

                      <div
                        className="text-xs text-slate-300 line-clamp-2 mt-1"
                        dangerouslySetInnerHTML={{
                          __html: notif.noi_dung.replace(/<[^>]*>?/gm, " "),
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Lightbox Image Preview Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded border-2 border-[#bd9867]">
            <img
              src={lightboxImage}
              alt="Banner thông báo"
              className="w-full h-full object-contain"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 w-9 h-9 bg-black/80 hover:bg-rose-600 text-white rounded-full flex items-center justify-center border border-white/20 transition-colors"
            >
              <LucideIcon name="X" size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
