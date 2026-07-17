import React, { useState } from "react";
import { DBBuildGuide } from "../supabase";
import LucideIcon from "./LucideIcon";

const getBadgeBranch = (badge?: any): string => {
  if (!badge) return "KHAC";
  const url = (badge.url_hinh_anh || "").toLowerCase();
  const name = (badge.ten_phu_hieu || "").toLowerCase();

  if (url.includes("thap_quang_minh") || name.includes("tháp quang minh")) {
    return "THAP_QUANG_MINH";
  }
  if (url.includes("vuc_hon_mang") || name.includes("vực hỗn mang")) {
    return "VUC_HON_MANG";
  }
  if (url.includes("thanh_khoi_nguyen") || name.includes("thành khởi nguyên")) {
    return "THANH_KHOI_NGUYEN";
  }
  if (
    url.includes("rung_nguyen_sink") ||
    url.includes("rung_nguyen_sinh") ||
    name.includes("rừng nguyên sinh")
  ) {
    return "RUNG_NGUYEN_SINH";
  }
  return "KHAC";
};

const getRomanNumeral = (index: number): string => {
  const numerals = ["I", "II", "III", "IV", "V"];
  return numerals[index] || "";
};

const branchColors: Record<
  string,
  { main: string; glow: string; text: string }
> = {
  VUC_HON_MANG: {
    main: "#ef4444",
    glow: "rgba(239, 68, 68, 0.4)",
    text: "text-red-400",
  },
  THAP_QUANG_MINH: {
    main: "#fbbf24",
    glow: "rgba(251, 191, 36, 0.4)",
    text: "text-amber-400",
  },
  THANH_KHOI_NGUYEN: {
    main: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.4)",
    text: "text-blue-400",
  },
  RUNG_NGUYEN_SINH: {
    main: "#22c55e",
    glow: "rgba(34, 197, 94, 0.4)",
    text: "text-emerald-400",
  },
  KHAC: {
    main: "#64748b",
    glow: "rgba(100, 116, 139, 0.4)",
    text: "text-slate-400",
  },
};

const getBranchBaseSVG = (branch: string) => {
  if (branch === "VUC_HON_MANG") {
    return (
      <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-10 sm:h-10">
        <defs>
          <radialGradient id="vuc-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="60%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </radialGradient>
        </defs>
        <path d="M50,15 L65,45 L50,85 L35,45 Z" fill="url(#vuc-gradient)" />
        <path d="M50,15 L55,45 L50,85 Z" fill="#fecaca" opacity="0.4" />
        <path
          d="M32,32 L50,55 L40,80 L25,50 Z"
          fill="url(#vuc-gradient)"
          opacity="0.8"
        />
        <path
          d="M68,32 L75,50 L60,80 L50,55 Z"
          fill="url(#vuc-gradient)"
          opacity="0.8"
        />
      </svg>
    );
  }
  if (branch === "THAP_QUANG_MINH") {
    return (
      <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-10 sm:h-10">
        <defs>
          <radialGradient id="quang-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="60%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#713f12" />
          </radialGradient>
        </defs>
        <path d="M50,12 L65,35 L50,88 L35,35 Z" fill="url(#quang-gradient)" />
        <path d="M50,12 L54,35 L50,88 Z" fill="#fef08a" opacity="0.5" />
        <path
          d="M28,40 L45,50 L38,75 L22,60 Z"
          fill="url(#quang-gradient)"
          opacity="0.8"
        />
        <path
          d="M72,40 L78,60 L62,75 L55,50 Z"
          fill="url(#quang-gradient)"
          opacity="0.8"
        />
      </svg>
    );
  }
  if (branch === "THANH_KHOI_NGUYEN") {
    return (
      <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-10 sm:h-10">
        <defs>
          <radialGradient id="khoi-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>
        </defs>
        <rect
          x="35"
          y="20"
          width="30"
          height="60"
          rx="6"
          fill="url(#khoi-gradient)"
          transform="rotate(45 50 50)"
        />
        <rect
          x="42"
          y="27"
          width="16"
          height="46"
          rx="4"
          fill="#dbeafe"
          opacity="0.4"
          transform="rotate(45 50 50)"
        />
      </svg>
    );
  }
  if (branch === "RUNG_NGUYEN_SINH") {
    return (
      <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-10 sm:h-10">
        <defs>
          <radialGradient id="rung-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="60%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#064e3b" />
          </radialGradient>
        </defs>
        <path
          d="M50,12 C68,32 68,68 50,88 C32,68 32,32 50,12 Z"
          fill="url(#rung-gradient)"
        />
        <path
          d="M50,12 L50,88"
          stroke="#bbf7d0"
          strokeWidth="3"
          opacity="0.5"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-8 h-8 sm:w-10 sm:h-10"
      fill="currentColor"
    >
      <circle cx="50" cy="50" r="30" />
    </svg>
  );
};

interface PublicBuildGuidesProps {
  guides: DBBuildGuide[];
  isDark: boolean;
  accentColor: string;
}

export default function PublicBuildGuides({
  guides,
  isDark,
  accentColor,
}: PublicBuildGuidesProps) {
  const [expandedChampId, setExpandedChampId] = useState<string | null>(null);

  // Track selected build index per champion
  const [selectedBuildIndexByChamp, setSelectedBuildIndexByChamp] = useState<
    Record<string, number>
  >({});

  const toggleExpand = (champId: string) => {
    setExpandedChampId((prev) => (prev === champId ? null : champId));
  };

  const activeGuides = guides.filter((g) => g.kich_hoat);

  if (activeGuides.length === 0) return null;

  // Group active guides by Champion ID
  const groupedGuides: Record<string, DBBuildGuide[]> = {};
  activeGuides.forEach((g) => {
    if (g.tuong_id) {
      if (!groupedGuides[g.tuong_id]) {
        groupedGuides[g.tuong_id] = [];
      }
      groupedGuides[g.tuong_id].push(g);
    }
  });

  const champIds = Object.keys(groupedGuides);

  return (
    <div className="space-y-4 pt-6">
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-4 rounded-full"
          style={{ backgroundColor: accentColor }}
        ></div>
        <h2
          className={`text-xL font-bold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}
        >
          TRANG BỊ ĐỀ CỬ CÁ NHÂN
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {champIds.map((champId) => {
          const championGuides = groupedGuides[champId];
          const selectedIndex = selectedBuildIndexByChamp[champId] || 0;
          // Ensure index is within range
          const safeIndex =
            selectedIndex >= championGuides.length ? 0 : selectedIndex;
          const currentGuide = championGuides[safeIndex];
          const isExpanded = expandedChampId === champId;

          if (!currentGuide) return null;

          const champ = currentGuide.tuong;

          // Map badges to their positions
          const badgesByPosition: Record<string, any> = {};
          currentGuide.phu_hieu_list?.forEach((b) => {
            const pos = (b as any).vi_tri_o;
            if (pos) {
              if (pos === "NHANH_PHU_1") {
                badgesByPosition["NHANH_PHU_1_1"] = b;
              } else if (pos === "NHANH_PHU_2") {
                badgesByPosition["NHANH_PHU_2_1"] = b;
              } else {
                badgesByPosition[pos] = b;
              }
            }
          });

          const mainBadgesList = [
            "NHANH_CHINH_1",
            "NHANH_CHINH_2",
            "NHANH_CHINH_3",
            "NHANH_CHINH_4",
          ]
            .map((k) => badgesByPosition[k])
            .filter(Boolean);

          const sub1BadgesList = ["NHANH_PHU_1_1", "NHANH_PHU_1_2"]
            .map((k) => badgesByPosition[k])
            .filter(Boolean);

          const sub2BadgesList = ["NHANH_PHU_2_1", "NHANH_PHU_2_2"]
            .map((k) => badgesByPosition[k])
            .filter(Boolean);

          return (
            <div
              key={champId}
              className={`border rounded-md p-5 transition-all shadow-sm ${
                isDark
                  ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-100"
                  : "bg-white border-slate-150/80 hover:border-slate-200 text-slate-800"
              }`}
            >
              {/* Champion & Title Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-dashed border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-3">
                  {/* Champ avatar */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-sm relative shrink-0">
                    {champ?.url_anh_dai_dien ? (
                      <img
                        src={champ.url_anh_dai_dien}
                        className="w-full h-full object-cover"
                        alt={champ.ten_tuong}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        <LucideIcon name="User" size={16} />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base">
                        {champ?.ten_tuong || "Tướng ẩn"}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {champ?.vai_tro || "Đấu sĩ"}
                      </span>
                    </div>

                    {championGuides.length > 1 ? (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                        Có {championGuides.length} lối lên đồ khuyên dùng khác
                        nhau
                      </span>
                    ) : (
                      <p
                        className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}
                      >
                        <LucideIcon name="Sword" size={11} />
                        {currentGuide.tieu_de_giao_an}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Build Guides Tabs (If champion has multiple builds) */}
              {championGuides.length > 1 && (
                <div className="mt-4">
                  <span
                    className={`block text-[9px] font-black uppercase tracking-wider mb-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    Chọn lối lên đồ:
                  </span>
                  <div className="flex flex-wrap gap-1.5 p-1 rounded border border-slate-300 dark:border-slate-850">
                    {championGuides.map((g, idx) => (
                      <button
                        key={g.id}
                        onClick={() =>
                          setSelectedBuildIndexByChamp((prev) => ({
                            ...prev,
                            [champId]: idx,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          safeIndex === idx
                            ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-150 dark:border-slate-700"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                        }`}
                      >
                        {g.tieu_de_giao_an}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Items Trail */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2.5">
                  <span
                    className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}
                  >
                    Trang bị & Phép bổ trợ:
                  </span>
                  {championGuides.length > 1 && (
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <LucideIcon name="Layers" size={11} />
                      {currentGuide.tieu_de_giao_an}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-3.5 max-w-2xl">
                  {/* Left: 6 Items */}
                  {currentGuide.trang_bi_list?.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="flex flex-col items-center gap-1 group relative cursor-help"
                      title={`${item.ten_trang_bi}: ${item.mo_ta || ""}`}
                    >
                      <div className="relative aspect-square w-full rounded overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 transition-all hover:scale-105 hover:shadow-md">
                        <img
                          src={item.url_hinh_anh}
                          className="w-full h-full object-cover"
                          alt={item.ten_trang_bi}
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[8px] font-bold px-1 rounded-tl-md">
                          {index + 1}
                        </span>
                      </div>
                      <span className="text-[8px] sm:text-[9.5px] font-bold text-center truncate w-full text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                        {item.ten_trang_bi}
                      </span>
                    </div>
                  ))}

                  {/* Right: Spell */}
                  {currentGuide.phu_tro && (
                    <div
                      className="flex flex-col items-center gap-1 group relative cursor-help"
                      title={currentGuide.phu_tro.ten_phu_tro}
                    >
                      <div className="relative aspect-square w-full rounded overflow-hidden transition-all hover:scale-105 hover:shadow-md">
                        <img
                          src={currentGuide.phu_tro.url_hinh_anh}
                          className="w-full h-full object-cover"
                          alt={currentGuide.phu_tro.ten_phu_tro}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <span className="text-[8px] sm:text-[9.5px] font-extrabold text-center truncate w-full text-indigo-600 dark:text-indigo-400">
                        {currentGuide.phu_tro.ten_phu_tro}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable Panel */}
              {isExpanded && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4 animate-in slide-in-from-top duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Badge Column (Phù hiệu) */}
                    {currentGuide.phu_hieu_list &&
                      currentGuide.phu_hieu_list.length > 0 &&
                      (() => {
                        const mainFinalBadge =
                          mainBadgesList[mainBadgesList.length - 1];
                        const mainBranchType = getBadgeBranch(mainFinalBadge);
                        const mainColors =
                          branchColors[mainBranchType] || branchColors.KHAC;

                        const sub1FinalBadge =
                          sub1BadgesList[sub1BadgesList.length - 1];
                        const sub1BranchType = getBadgeBranch(sub1FinalBadge);
                        const sub1Colors =
                          branchColors[sub1BranchType] || branchColors.KHAC;

                        const sub2FinalBadge =
                          sub2BadgesList[sub2BadgesList.length - 1];
                        const sub2BranchType = getBadgeBranch(sub2FinalBadge);
                        const sub2Colors =
                          branchColors[sub2BranchType] || branchColors.KHAC;

                        return (
                          <div className="bg-slate-950 p-4 rounded-md border border-slate-900 shadow-xl flex flex-col gap-3 text-left">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                              <h4 className="text-[15px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                <LucideIcon name="Award" size={14} />
                                PHÙ HIỆU THAM KHẢO
                              </h4>
                            </div>

                            <div className="">
                              {/* Main Branch */}
                              {mainBadgesList.length > 0 && (
                                <div className="">
                                  <div className="flex items-center gap-8 md:gap-11 overflow-x-auto scrollbar-none">
                                    {mainBadgesList.map((badge, idx) => {
                                      const isRoot = idx === 0;
                                      const isTier3 = idx === 3;
                                      const isLarge = isRoot || isTier3;

                                      const containerSize = isLarge
                                        ? "w-11 h-11 md:w-13 md:h-13"
                                        : "w-8 h-8 md:w-9.5 md:h-9.5";
                                      const imageSize = isLarge
                                        ? "w-9 h-9 md:w-11 md:h-11"
                                        : "w-6 h-6 md:w-7.5 md:h-7.5";

                                      return (
                                        <div
                                          key={`${badge.id || "main"}-${idx}`}
                                          className="relative flex items-center shrink-0"
                                        >
                                          <div
                                            className={`relative z-10 ${containerSize} rounded-full bg-[#050508] border flex items-center justify-center transition-all hover:scale-105 group cursor-help`}
                                            style={{
                                              borderColor: mainColors.main,
                                              boxShadow: isRoot
                                                ? `0 0 12px ${mainColors.glow}, inset 0 0 6px ${mainColors.glow}`
                                                : `0 0 8px ${mainColors.glow}`,
                                            }}
                                            title={badge.ten_phu_hieu}
                                          >
                                            <img
                                              src={badge.url_hinh_anh}
                                              className={`${imageSize} object-cover rounded-full`}
                                              alt=""
                                              referrerPolicy="no-referrer"
                                            />
                                            {!isRoot && (
                                              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 bg-[#0a0a0f] border border-slate-800 text-[7.5px] md:text-[8.5px] font-black text-slate-300 px-1.5 py-0.5 rounded-full select-none shadow ">
                                                {getRomanNumeral(idx - 1)}
                                              </span>
                                            )}
                                          </div>
                                          {idx < mainBadgesList.length - 1 && (
                                            <div
                                              className="absolute left-full h-[3px] z-0 pointer-events-none w-8 md:w-11"
                                              style={{
                                                backgroundColor:
                                                  mainColors.main,
                                                boxShadow: `0 0 10px ${mainColors.main}`,
                                              }}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Sub Branches Row */}
                              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-900/60">
                                {/* Sub Branch 1 */}
                                {sub1BadgesList.length > 0 && (
                                  <div className="py-1">
                                    <div className="flex items-center gap-8 md:gap-10 py-2 overflow-x-auto scrollbar-none">
                                      {sub1BadgesList.map((badge, idx) => {
                                        const isRoot = idx === 0;
                                        const isLarge = isRoot;

                                        const containerSize = isLarge
                                          ? "w-11 h-11 md:w-13 md:h-13"
                                          : "w-8 h-8 md:w-9.5 md:h-9.5";
                                        const imageSize = isLarge
                                          ? "w-9 h-9 md:w-11 md:h-11"
                                          : "w-6 h-6 md:w-7.5 md:h-7.5";

                                        return (
                                          <div
                                            key={`${badge.id || "sub1"}-${idx}`}
                                            className="relative flex items-center shrink-0"
                                          >
                                            <div
                                              className={`relative z-10 ${containerSize} rounded-full bg-[#050508] border flex items-center justify-center transition-all hover:scale-105 group cursor-help`}
                                              style={{
                                                borderColor: sub1Colors.main,
                                                boxShadow: isRoot
                                                  ? `0 0 12px ${sub1Colors.glow}, inset 0 0 6px ${sub1Colors.glow}`
                                                  : `0 0 8px ${sub1Colors.glow}`,
                                              }}
                                              title={badge.ten_phu_hieu}
                                            >
                                              <img
                                                src={badge.url_hinh_anh}
                                                className={`${imageSize} object-cover rounded-full`}
                                                alt=""
                                                referrerPolicy="no-referrer"
                                              />
                                              {!isRoot && (
                                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 bg-[#0a0a0f] border border-slate-800 text-[7px] font-black text-slate-300 px-1 py-0.5 rounded-full select-none shadow ">
                                                  I
                                                </span>
                                              )}
                                            </div>
                                            {idx <
                                              sub1BadgesList.length - 1 && (
                                              <div
                                                className="absolute left-full h-[3px] z-0 pointer-events-none w-8 md:w-10"
                                                style={{
                                                  backgroundColor:
                                                    sub1Colors.main,
                                                  boxShadow: `0 0 8px ${sub1Colors.main}`,
                                                }}
                                              />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Sub Branch 2 */}
                                {sub2BadgesList.length > 0 && (
                                  <div className="py-1">
                                    <div className="flex items-center gap-8 md:gap-10 py-2 overflow-x-auto scrollbar-none">
                                      {sub2BadgesList.map((badge, idx) => {
                                        const isRoot = idx === 0;
                                        const isLarge = isRoot;

                                        const containerSize = isLarge
                                          ? "w-11 h-11 md:w-13 md:h-13"
                                          : "w-8 h-8 md:w-9.5 md:h-9.5";
                                        const imageSize = isLarge
                                          ? "w-9 h-9 md:w-11 md:h-11"
                                          : "w-6 h-6 md:w-7.5 md:h-7.5";

                                        return (
                                          <div
                                            key={`${badge.id || "sub2"}-${idx}`}
                                            className="relative flex items-center shrink-0"
                                          >
                                            <div
                                              className={`relative z-10 ${containerSize} rounded-full bg-[#050508] border flex items-center justify-center transition-all hover:scale-105 group cursor-help`}
                                              style={{
                                                borderColor: sub2Colors.main,
                                                boxShadow: isRoot
                                                  ? `0 0 12px ${sub2Colors.glow}, inset 0 0 6px ${sub2Colors.glow}`
                                                  : `0 0 8px ${sub2Colors.glow}`,
                                              }}
                                              title={badge.ten_phu_hieu}
                                            >
                                              <img
                                                src={badge.url_hinh_anh}
                                                className={`${imageSize} object-cover rounded-full`}
                                                alt=""
                                                referrerPolicy="no-referrer"
                                              />
                                              {!isRoot && (
                                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 bg-[#0a0a0f] border border-slate-800 text-[7px] font-black text-slate-300 px-1 py-0.5 rounded-full select-none shadow ">
                                                  II
                                                </span>
                                              )}
                                            </div>
                                            {idx <
                                              sub2BadgesList.length - 1 && (
                                              <div
                                                className="absolute left-full h-[3px] z-0 pointer-events-none w-8 md:w-10"
                                                style={{
                                                  backgroundColor:
                                                    sub2Colors.main,
                                                  boxShadow: `0 0 8px ${sub2Colors.main}`,
                                                }}
                                              />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                    {/* Arcana Column (Bảng ngọc) */}
                    <div className="bg-slate-950 p-4 rounded-md border border-slate-900 shadow-xl flex flex-col gap-3   text-left">
                      <h4 className="text-[15px] font-black uppercase tracking-wider text-white flex items-center gap-1.5 text-left">
                        <LucideIcon name="Zap" size={15} />
                        Bảng Ngọc tham khảo
                      </h4>

                      {(() => {
                        const redLines = (currentGuide.ngoc_do || "N/A")
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const purpleLines = (currentGuide.ngoc_tim || "N/A")
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const greenLines = (currentGuide.ngoc_xanh || "N/A")
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean);

                        return (
                          <div className="flex flex-col sm:flex-row gap-5 items-center">
                            {/* Left side: bang_ngoc.png - ĐÃ ĐƯỢC ẨN TRÊN MOBILE */}
                            <div className="hidden sm:flex w-1/2 max-w-[100px] sm:max-w-[120px] justify-center items-center shrink-0 sm:border-r border-slate-200 dark:border-slate-800 sm:pr-4">
                              <img
                                src="/image/ngoc/bang_ngoc.png"
                                className="w-full h-auto object-contain hover:scale-105 transition-all duration-250"
                                alt="Bảng Ngọc"
                              />
                            </div>

                            {/* Right side: 3 rows of Arcana types */}
                            <div className="flex-1 w-full">
                              {/* Red row */}
                              <div className="flex items-center gap-3">
                                <img
                                  src="/image/ngoc/ngoc_do.png"
                                  className="w-9 h-9 object-contain shrink-0"
                                  alt="Ngọc Đỏ"
                                />
                                <div className="flex flex-col justify-center text-left">
                                  {redLines.map((line, lIdx) => (
                                    <span
                                      key={lIdx}
                                      className="text-[11.5px] font-black text-rose-500 block leading-tight"
                                    >
                                      {line}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Purple row */}
                              <div className="flex items-center gap-3">
                                <img
                                  src="/image/ngoc/ngoc_tim.png"
                                  className="w-9 h-9 object-contain shrink-0"
                                  alt="Ngọc Tím"
                                />
                                <div className="flex flex-col justify-center text-left">
                                  {purpleLines.map((line, lIdx) => (
                                    <span
                                      key={lIdx}
                                      className="text-[11.5px] font-black text-purple-500 block leading-tight"
                                    >
                                      {line}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Green row */}
                              <div className="flex items-center gap-3">
                                <img
                                  src="/image/ngoc/ngoc_xanh.png"
                                  className="w-9 h-9 object-contain shrink-0"
                                  alt="Ngọc Lục"
                                />
                                <div className="flex flex-col justify-center text-left">
                                  {greenLines.map((line, lIdx) => (
                                    <span
                                      key={lIdx}
                                      className="text-[11.5px] font-black text-emerald-500 block leading-tight"
                                    >
                                      {line}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* View details button footer */}
              <div className="mt-3 pt-3 border-t border-slate-100/60 dark:border-slate-800/40 flex justify-end">
                <button
                  onClick={() => toggleExpand(champId)}
                  className="px-3.5 py-1.5 text-[10px] font-bold rounded flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer text-slate-500 dark:text-slate-400"
                >
                  <span>{isExpanded ? "Thu gọn" : "Xem chi tiết"}</span>
                  <LucideIcon
                    name={isExpanded ? "ChevronUp" : "ChevronDown"}
                    size={12}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
