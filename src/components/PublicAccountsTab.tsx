import React, { useState, useMemo } from "react";
import { DBGameAccount } from "../supabase";
import { BioLink } from "../types";
import { formatExternalUrl } from "../utils";
import LucideIcon from "./LucideIcon";

interface PublicAccountsTabProps {
  accounts: DBGameAccount[];
  links?: BioLink[];
  contactLink?: string;
  showNotification?: (
    message: string,
    type?: "success" | "error" | "info",
  ) => void;
}

export default function PublicAccountsTab({
  accounts,
  links = [],
  contactLink = "",
  showNotification,
}: PublicAccountsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "available" | "sold"
  >("available");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">(
    "newest",
  );
  const [selectedAccount, setSelectedAccount] = useState<DBGameAccount | null>(
    null,
  );

  // Helper to parse description lines and remove any leading bullets/dashes
  const parseDescriptionLines = (text?: string): string[] => {
    if (!text) return [];
    return text
      .split("\n")
      .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
      .filter((line) => line.length > 0);
  };

  // Format currency
  const formatPrice = (price: number) => {
    if (!price || price <= 0) return "Liên hệ";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  // Filter public visible accounts
  const visibleAccounts = useMemo(() => {
    return accounts.filter((acc) => acc.hien_thi !== false);
  }, [accounts]);

  // Apply filters and sorting
  const filteredAccounts = useMemo(() => {
    return visibleAccounts
      .filter((acc) => {
        if (statusFilter === "available" && acc.da_ban) return false;
        if (statusFilter === "sold" && !acc.da_ban) return false;
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchName = acc.ten_acc.toLowerCase().includes(term);
          const matchDesc = (acc.mo_ta || "").toLowerCase().includes(term);
          return matchName || matchDesc;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price_asc") {
          return a.gia - b.gia;
        }
        if (sortBy === "price_desc") {
          return b.gia - a.gia;
        }
        // Default newest
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [visibleAccounts, statusFilter, searchTerm, sortBy]);

  const availableCount = useMemo(
    () => visibleAccounts.filter((a) => !a.da_ban).length,
    [visibleAccounts],
  );
  const soldCount = useMemo(
    () => visibleAccounts.filter((a) => a.da_ban).length,
    [visibleAccounts],
  );

  const handleContact = (account: DBGameAccount) => {
    let targetLink = account.lien_he;

    // If account.lien_he matches an ID of links, resolve its URL
    if (targetLink && links.length > 0) {
      const match = links.find(
        (l) => l.id === targetLink || l.url === targetLink,
      );
      if (match) {
        targetLink = match.url;
      }
    }

    // If no specific link for this acc, fallback to first active link or contactLink
    if (!targetLink) {
      const activeLink = links.find((l) => l.enabled);
      if (activeLink) {
        targetLink = activeLink.url;
      } else if (contactLink) {
        targetLink = contactLink;
      }
    }

    if (targetLink) {
      const formatted = formatExternalUrl(targetLink);
      window.open(formatted, "_blank", "noopener,noreferrer");
      if (showNotification) {
        showNotification(
          "Đang chuyển hướng đến kênh liên hệ mua tài khoản...",
          "info",
        );
      }
    } else {
      setSelectedAccount(account);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Search & filter toolbar */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <LucideIcon
              name="Search"
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bd9867]"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo tên acc, tướng, trang phục, rank..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900/80 border border-[#bd9867]/30 text-slate-100 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#bd9867] focus:ring-1 focus:ring-[#bd9867] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <LucideIcon name="X" size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setStatusFilter("available")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "available"
                ? "bg-[#bd9867] text-slate-950 font-bold shadow-md shadow-[#bd9867]/20"
                : "bg-slate-900/60 border border-[#bd9867]/20 text-slate-300 hover:border-[#bd9867]/50"
            }`}
          >
            Đang bán ({availableCount})
          </button>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-[#bd9867] text-slate-950 font-bold shadow-md shadow-[#bd9867]/20"
                : "bg-slate-900/60 border border-[#bd9867]/20 text-slate-300 hover:border-[#bd9867]/50"
            }`}
          >
            Tất cả ({visibleAccounts.length})
          </button>
          {soldCount > 0 && (
            <button
              onClick={() => setStatusFilter("sold")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "sold"
                  ? "bg-[#bd9867] text-slate-950 font-bold shadow-md shadow-[#bd9867]/20"
                  : "bg-slate-900/60 border border-[#bd9867]/20 text-slate-300 hover:border-[#bd9867]/50"
              }`}
            >
              Đã bán ({soldCount})
            </button>
          )}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-slate-900/80 border border-[#bd9867]/30 text-slate-200 text-xs focus:outline-none focus:border-[#bd9867] cursor-pointer"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá: Thấp đến cao</option>
                <option value="price_desc">Giá: Cao đến thấp</option>
              </select>
              <LucideIcon
                name="ChevronDown"
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#bd9867] pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Account listings grid */}
      {filteredAccounts.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-[#bd9867]/20 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#bd9867]/10 flex items-center justify-center text-[#bd9867]">
            <LucideIcon name="PackageOpen" size={28} />
          </div>
          <p className="text-slate-300 font-semibold text-sm">
            Chưa có tài khoản nào phù hợp
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {searchTerm
              ? "Thử thay đổi từ khóa tìm kiếm"
              : "Các tài khoản mới sẽ được cập nhật sớm nhất!"}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="mt-3 px-3 py-1.5 rounded-lg bg-[#bd9867]/20 text-[#fce3bc] text-xs hover:bg-[#bd9867]/30"
            >
              Xóa tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredAccounts.map((account) => {
            const isSold = account.da_ban;
            return (
              <div
                key={account.id}
                className={`group relative flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 ${
                  isSold
                    ? "border-slate-800 bg-slate-950/70 opacity-75"
                    : "border-[#bd9867]/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 hover:border-[#bd9867] hover:shadow-[0_4px_20px_rgba(189,152,103,0.15)] hover:-translate-y-0.5"
                }`}
              >
                {/* Image container */}
                <div
                  onClick={() => setSelectedAccount(account)}
                  className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-pointer"
                >
                  {account.url_hinh_anh ? (
                    <img
                      src={account.url_hinh_anh}
                      alt={account.ten_acc}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                        isSold ? "grayscale-[40%]" : ""
                      }`}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/image/pick/ban-pick.png";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-slate-500">
                      <LucideIcon
                        name="Gamepad2"
                        size={36}
                        className="text-[#bd9867]/40 mb-1"
                      />
                      <span className="text-[11px] text-slate-400">
                        Ảnh tài khoản
                      </span>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    {isSold ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-600/90 text-white shadow">
                        ĐÃ BÁN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/90 text-slate-950 shadow">
                        CÒN HÀNG
                      </span>
                    )}
                  </div>

                  {/* Quick view button overlay */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAccount(account);
                      }}
                      className="p-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-[#fce3bc] hover:bg-[#bd9867] hover:text-slate-950 transition-colors"
                      title="Xem ảnh lớn"
                    >
                      <LucideIcon name="Maximize2" size={14} />
                    </button>
                  </div>

                  {/* Price overlay at bottom of image */}
                  <div className="absolute bottom-2 left-3 right-3 flex items-baseline justify-between">
                    <span className="text-2xl sm:text-lg font-black tracking-tight text-[#fce3bc] drop-shadow-md">
                      {formatPrice(account.gia)}
                    </span>
                    {account.created_at && (
                      <span className="text-[10px] text-slate-400">
                        {new Date(account.created_at).toLocaleDateString(
                          "vi-VN",
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Account details */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3
                      onClick={() => setSelectedAccount(account)}
                      className="font-bold text-sm text-slate-100 hover:text-[#fce3bc] transition-colors cursor-pointer line-clamp-1"
                      title={account.ten_acc}
                    >
                      {account.ten_acc}
                    </h3>

                    {account.mo_ta && (
                      <div className="mt-2 space-y-1">
                        {parseDescriptionLines(account.mo_ta)
                          .slice(0, 3)
                          .map((line, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-1.5 text-xs text-slate-300"
                            >
                              <LucideIcon
                                name="Check"
                                size={13}
                                className="text-emerald-400 shrink-0 mt-0.5"
                              />
                              <span className="line-clamp-1 leading-snug">
                                {line}
                              </span>
                            </div>
                          ))}
                        {parseDescriptionLines(account.mo_ta).length > 3 && (
                          <span className="text-[10px] text-[#bd9867] font-semibold pl-4">
                            +{parseDescriptionLines(account.mo_ta).length - 3}{" "}
                            chi tiết khác...
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAccount(account)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl border border-[#bd9867]/40 bg-slate-900/70 hover:bg-[#bd9867]/20 text-[#fce3bc] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LucideIcon name="Eye" size={13} />
                      Chi tiết
                    </button>

                    {!isSold ? (
                      <button
                        onClick={() => handleContact(account)}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-[#bd9867] to-[#e6c28f] hover:brightness-110 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#bd9867]/20 transition-all cursor-pointer"
                      >
                        <LucideIcon name="MessageCircle" size={13} />
                        Mua ngay
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-800 text-slate-500 text-xs font-medium flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <LucideIcon name="CheckCircle" size={13} />
                        Hết hàng
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Account detail / modal */}
      {selectedAccount && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedAccount(null)}
        >
          <div
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-[#bd9867]/60 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedAccount(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LucideIcon name="X" size={18} />
            </button>

            {/* Modal Image */}
            <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
              {selectedAccount.url_hinh_anh ? (
                <img
                  src={selectedAccount.url_hinh_anh}
                  alt={selectedAccount.ten_acc}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "/image/pick/ban-pick.png";
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <LucideIcon
                    name="Gamepad2"
                    size={48}
                    className="text-[#bd9867]/40 mb-2"
                  />
                  <span>Không có ảnh</span>
                </div>
              )}
              {selectedAccount.da_ban && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                  <span className="px-4 py-1.5 rounded-xl bg-red-600/90 text-white font-black text-sm tracking-widest border border-white/20 shadow-xl">
                    ĐÃ BÁN
                  </span>
                </div>
              )}
            </div>

            {/* Content info */}
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#fce3bc]">
                    {selectedAccount.ten_acc}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedAccount.da_ban ? (
                      <span className="text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                        Trạng thái: Đã bán
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Trạng thái: Còn hàng
                      </span>
                    )}
                    {selectedAccount.created_at && (
                      <span className="text-[11px] text-slate-400">
                        Đăng ngày:{" "}
                        {new Date(
                          selectedAccount.created_at,
                        ).toLocaleDateString("vi-VN")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent">
                    {formatPrice(selectedAccount.gia)}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-[#bd9867] font-bold mb-1.5 flex items-center gap-1.5">
                  <LucideIcon name="FileText" size={14} />
                  Mô tả chi tiết tài khoản
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs sm:text-sm text-slate-200 max-h-60 overflow-y-auto space-y-2">
                  {parseDescriptionLines(selectedAccount.mo_ta ?? undefined)
                    .length > 0 ? (
                    parseDescriptionLines(
                      selectedAccount.mo_ta ?? undefined,
                    ).map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5 flex items-center justify-center">
                          <LucideIcon
                            name="Check"
                            size={12}
                            className="text-emerald-400"
                          />
                        </span>
                        <span className="leading-relaxed">{line}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Chưa có mô tả chi tiết cho tài khoản này.
                    </p>
                  )}
                </div>
              </div>

              {/* Security notice */}
              <div className="p-3 rounded-xl bg-[#bd9867]/10 border border-[#bd9867]/30 text-xs text-[#fce3bc]/90 flex items-start gap-2.5">
                <LucideIcon
                  name="ShieldCheck"
                  size={18}
                  className="text-[#bd9867] shrink-0 mt-0.5"
                />
                <div>
                  <p className="font-semibold text-[#fce3bc]">
                    Cam kết giao dịch an toàn & uy tín
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Hỗ trợ đổi thông tin chính chủ, bảo hành tài khoản đầy đủ.
                    Liên hệ trực tiếp qua Zalo / Facebook để hoàn tất giao dịch
                    nhanh chóng.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Đóng
                </button>

                {!selectedAccount.da_ban ? (
                  <button
                    onClick={() => handleContact(selectedAccount)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#bd9867] via-[#fce3bc] to-[#bd9867] text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-[#bd9867]/30 hover:brightness-110 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <LucideIcon name="MessageCircle" size={16} />
                    Liên hệ mua ngay ({formatPrice(selectedAccount.gia)})
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 text-slate-500 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    Tài khoản này đã bán
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
