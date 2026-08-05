import React, { useState, useEffect, useRef } from "react";
import { toPng } from "html-to-image";
import {
  DBBuildGuide,
  DBChampion,
  DBItem,
  DBKhacChe,
  DBTopTier,
} from "../supabase";
import { dbService } from "../dbService";
import LucideIcon from "./LucideIcon";

function WatermarkOverlay({ text }: { text: string }) {
  if (!text) return null;
  const cleanText = text.trim().toUpperCase();
  const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" transform="rotate(-20 80 40)" fill="#fce3bc" font-size="12" font-weight="900" font-family="sans-serif" letter-spacing="1.5" opacity="0.15">${cleanText}</text></svg>`;
  const encodedSvg = encodeURIComponent(rawSvg);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none z-20 overflow-hidden flex items-center justify-center"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodedSvg}")`,
          backgroundRepeat: "repeat",
        }}
      />
      {/* <div className="absolute inset-0 flex items-center justify-center p-4">
        <img
          src="/logo-light.png"
          alt=""
          className="w-36 h-36 sm:w-56 sm:h-56 max-w-full max-h-full object-contain opacity-15 filter drop-shadow-lg"
          referrerPolicy="no-referrer"
        />
      </div> */}
    </div>
  );
}

const getBadgeBranch = (badge?: any): string => {
  if (!badge) return "KHAC";
  const ln = Number(badge.loai_nhanh);
  if (ln === 1) return "THANH_KHOI_NGUYEN";
  if (ln === 2) return "THAP_QUANG_MINH";
  if (ln === 3) return "VUC_HON_MANG";
  if (ln === 4) return "RUNG_NGUYEN_SINH";

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

const branchNameMap: Record<string, string> = {
  THANH_KHOI_NGUYEN: "Thành Khởi Nguyên",
  THAP_QUANG_MINH: "Tháp Quang Minh",
  VUC_HON_MANG: "Vực Hỗn Mang",
  RUNG_NGUYEN_SINH: "Rừng Nguyên Sinh",
};

const branchImageMap: Record<string, string> = {
  THANH_KHOI_NGUYEN: "/image/phu_hieu/thanh_khoi_nguyen/thanh-khoi-nguyen.png",
  THAP_QUANG_MINH: "/image/phu_hieu/thap_quang_minh/thap-quang-minh.png",
  VUC_HON_MANG: "/image/phu_hieu/vuc_hon_mang/vuc-hon-mang.png",
  RUNG_NGUYEN_SINH: "/image/phu_hieu/rung_nguyen_sinh/rung-nguyen-sinh.png",
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
  champions?: DBChampion[];
  items?: DBItem[];
  isDark: boolean;
  accentColor: string;
  onLikeGuide?: (guideId: string) => void;
}

export default function PublicBuildGuides({
  guides,
  champions = [],
  items = [],
  isDark,
  accentColor,
  onLikeGuide,
}: PublicBuildGuidesProps) {
  const [academyTab, setAcademyTab] = useState<
    "trangbi" | "toptier" | "khacche"
  >("trangbi");
  const [expandedChampId, setExpandedChampId] = useState<string | null>(null);

  // Loaded data state for Khac Che and Top Tier
  const [allChampions, setAllChampions] = useState<DBChampion[]>(champions);
  const [allItems, setAllItems] = useState<DBItem[]>(items);
  const [khacCheList, setKhacCheList] = useState<DBKhacChe[]>([]);
  const [topTierList, setTopTierList] = useState<DBTopTier[]>([]);

  // Selected Champion States for Tabs
  const [selectedTrangBiChampId, setSelectedTrangBiChampId] = useState<
    string | null
  >(null);
  const [selectedKhacCheChampId, setSelectedKhacCheChampId] = useState<
    string | null
  >(null);
  const [trangBiSearchTerm, setTrangBiSearchTerm] = useState<string>("");
  const [kcSearchTerm, setKcSearchTerm] = useState<string>("");
  const [selectedVersion, setSelectedVersion] = useState<string>("");

  // Watermark & Export state
  const [watermarkText, setWatermarkText] = useState<string>("HOÀNG PHAN");
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const topTierBoardRef = useRef<HTMLDivElement>(null);

  // Fetch admin profile for watermark name setting
  useEffect(() => {
    dbService
      .getProfile()
      .then((profile) => {
        if (profile?.ten_hien_thi) {
          setWatermarkText(profile.ten_hien_thi);
        } else if (profile?.ten_dang_nhap) {
          setWatermarkText(profile.ten_dang_nhap);
        }
      })
      .catch((err) => console.warn("Failed to load watermark profile:", err));
  }, []);

  const handleDownloadTopTier = async () => {
    if (!topTierBoardRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(topTierBoardRef.current, {
        cacheBust: true,
        backgroundColor: "#05050a",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      const ver = selectedVersion
        ? selectedVersion.replace(/\s+/g, "_")
        : "Current";
      const lane = selectedTopTierLane ? selectedTopTierLane : "All";
      link.download = `Bang_Top_Tier_${ver}_${lane}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Lỗi khi tải ảnh bảng Top Tier:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const availableVersions = Array.from(
    new Set(topTierList.map((item) => item.phien_ban).filter(Boolean)),
  );

  const laneList = [
    { value: "All", label: "All", isText: true },
    { value: "JUG", label: "Rừng", icon: "SatThu.png" }, // Hoặc đổi tên file tương ứng nếu bạn đặt tên khác
    { value: "DSL", label: "Tà Thần", icon: "DauSi.png" },
    { value: "MID", label: "Pháp Sư", icon: "PhapSu.png" },
    { value: "ADL", label: "Xạ Thủ", icon: "XaThu.png" },
    { value: "TANK", label: "Đỡ Đòn", icon: "DoDon.png" },
    { value: "SUP", label: "Trợ Thủ", icon: "TroThu.png" },
  ];

  // Tự động chọn phiên bản đầu tiên khi load xong topTierList
  useEffect(() => {
    if (availableVersions.length > 0 && !selectedVersion) {
      setSelectedVersion(availableVersions[0] as string);
    }
  }, [topTierList]);

  // Filter state for Top Tier
  const [selectedTopTierLane, setSelectedTopTierLane] =
    useState<string>("Tất cả");

  // Load champions & items fallback if empty
  useEffect(() => {
    if (champions && champions.length > 0) {
      setAllChampions(champions);
    } else {
      dbService.getChampions().then((res) => {
        if (res && res.length > 0) setAllChampions(res);
      });
    }
    if (items && items.length > 0) {
      setAllItems(items);
    } else {
      dbService.getItems().then((res) => {
        if (res && res.length > 0) setAllItems(res);
      });
    }
  }, [champions, items]);

  // Load Khac Che and Top Tier lists
  useEffect(() => {
    dbService.getKhacCheList().then((res) => {
      if (res) setKhacCheList(res);
    });
    dbService.getTopTierList().then((res) => {
      if (res) setTopTierList(res);
    });
  }, []);

  // Track selected build index per champion
  const [selectedBuildIndexByChamp, setSelectedBuildIndexByChamp] = useState<
    Record<string, number>
  >({});

  const toggleExpand = (champId: string) => {
    setExpandedChampId((prev) => (prev === champId ? null : champId));
  };

  const handleTabChange = (tab: "trangbi" | "toptier" | "khacche") => {
    setAcademyTab(tab);
    setSelectedTrangBiChampId(null);
    setSelectedKhacCheChampId(null);
  };

  const activeGuides = guides.filter((g) => g.kich_hoat);

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
    <div className="space-y-2">
      {/* <div className="flex items-center">
        <h2 className="font-extrabold text-xl bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent">
          HỌC VIỆN LIÊN QUÂN
        </h2>
      </div> */}
      <div className="shadow-xl backdrop-blur-md">
        {/* 3 Sub-tab options */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <button
            onClick={() => handleTabChange("trangbi")}
            className={`flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-3 text-xs font-bold transition-all cursor-pointer border ${
              academyTab === "trangbi"
                ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 border-[#bd9867] shadow-md"
                : "border-[#bd9867]/40 bg-black/40 text-[#fce3bc] hover:bg-[#bd9867]/20"
            }`}
          >
            <LucideIcon name="Shield" size={15} />
            <span className="truncate">Trang bị</span>
          </button>

          <button
            onClick={() => handleTabChange("toptier")}
            className={`flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-3 text-xs font-bold transition-all cursor-pointer border ${
              academyTab === "toptier"
                ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 border-[#bd9867] shadow-md"
                : "border-[#bd9867]/40 bg-black/40 text-[#fce3bc] hover:bg-[#bd9867]/20"
            }`}
          >
            <LucideIcon name="Trophy" size={15} />
            <span className="truncate">Top Tier</span>
          </button>

          <button
            onClick={() => handleTabChange("khacche")}
            className={`flex items-center justify-center gap-1.5 py-2 px-1.5 sm:px-3 text-xs font-bold transition-all cursor-pointer border ${
              academyTab === "khacche"
                ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 border-[#bd9867] shadow-md"
                : "border-[#bd9867]/40 bg-black/40 text-[#fce3bc] hover:bg-[#bd9867]/20"
            }`}
          >
            <LucideIcon name="Swords" size={15} />
            <span className="truncate">Khắc chế</span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Trang bị */}
      {academyTab === "trangbi" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {!selectedTrangBiChampId ? (
            /* VIEW 1: Danh sách tướng đã có trang bị */
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm sm:text-base bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent uppercase tracking-wide">
                Tướng Có Trang Bị & Phù Hiệu Đề Cử
              </h3>

              {/* Ô Tìm kiếm DÀNH RIÊNG cho Danh sách Tướng Có Trang Bị */}
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Tìm tướng..."
                  value={trangBiSearchTerm}
                  onChange={(e) => setTrangBiSearchTerm(e.target.value)}
                  className="w-full bg-black/60 border border-[#bd9867]/60 rounded-none pl-8 pr-3 py-1.5 text-xs text-[#fce3bc] placeholder-slate-400 focus:outline-none focus:border-[#fce3bc]"
                />
                <LucideIcon
                  name="Search"
                  size={14}
                  className="absolute left-2.5 top-2.5 text-[#bd9867]"
                />
              </div>

              {(() => {
                // Lọc danh sách champIds theo từ khóa tìm kiếm
                const filteredChampIds = champIds.filter((champId) => {
                  const champ = groupedGuides[champId]?.[0]?.tuong;
                  return champ?.ten_tuong
                    ?.toLowerCase()
                    .includes(trangBiSearchTerm.toLowerCase());
                });

                if (filteredChampIds.length === 0) {
                  return (
                    <div className="p-8 text-center text-[#fce3bc]">
                      <p className="text-xs font-semibold">
                        {trangBiSearchTerm
                          ? `Không tìm thấy tướng trang bị nào khớp với "${trangBiSearchTerm}"`
                          : "Chưa có trang bị đề cử nào được công khai."}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="pt-2 relative overflow-hidden">
                    <WatermarkOverlay text={watermarkText} />
                    <div className="relative z-10 grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1">
                      {filteredChampIds.map((champId) => {
                        const championGuides = groupedGuides[champId];
                        const champ = championGuides[0]?.tuong;

                        return (
                          <button
                            key={champId}
                            onClick={() => setSelectedTrangBiChampId(champId)}
                            className="flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110 group focus:outline-none w-full"
                          >
                            <img
                              src={
                                champ?.url_anh_dai_dien || "/placeholder.jpg"
                              }
                              alt={champ?.ten_tuong}
                              className="w-14 h-14 sm:w-16 sm:h-16 object-cover border border-[#bd9867]/60 group-hover:border-[#fce3bc] shadow-md group-hover:shadow-[#fce3bc]/30 transition-all"
                              referrerPolicy="no-referrer"
                            />
                            <span className="font-extrabold text-[11px] sm:text-xs text-[#fce3bc] group-hover:text-white block truncate w-full text-center">
                              {champ?.ten_tuong}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* VIEW 2: Chi tiết tướng đã chọn (Phù hiệu, Ngọc, Trang bị, Phép bổ trợ) */
            <div className="space-y-4">
              <button
                onClick={() => setSelectedTrangBiChampId(null)}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-[#bd9867]/60 text-[#fce3bc] hover:text-white hover:bg-[#bd9867]/20 text-xs font-bold transition-all cursor-pointer"
              >
                <LucideIcon name="ArrowLeft" size={16} />
                <span>Quay lại chọn tướng khác</span>
              </button>

              {(() => {
                const championGuides =
                  groupedGuides[selectedTrangBiChampId] || [];
                const selectedIndex =
                  selectedBuildIndexByChamp[selectedTrangBiChampId] || 0;
                const safeIndex =
                  selectedIndex >= championGuides.length ? 0 : selectedIndex;
                const currentGuide = championGuides[safeIndex];

                if (!currentGuide) return null;

                const champ = currentGuide.tuong;
                const isExpanded = expandedChampId === selectedTrangBiChampId;

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
                    className="p-3 border transition-all shadow-sm text-[#fce3bc] backdrop-blur-md space-y-3 relative overflow-hidden"
                    style={{
                      borderColor: "#bd9867",
                      background: "rgba(29, 24, 43, 0.7)",
                    }}
                  >
                    <WatermarkOverlay text={watermarkText} />
                    {/* Champion Header */}
                    <div className="flex sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#bd9867]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 overflow-hidden border border-[#bd9867] shadow-sm relative shrink-0">
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
                            <span className="font-extrabold text-base sm:text-lg">
                              {champ?.ten_tuong}
                            </span>
                          </div>

                          {championGuides.length > 1 ? (
                            <span className="text-[12px] text-slate-400 block">
                              Có {championGuides.length} lối lên đồ khác nhau
                            </span>
                          ) : (
                            <p className="text-xs font-bold mt-0.5 flex items-center gap-1 text-indigo-400">
                              <LucideIcon name="Sword" size={11} />
                              {currentGuide.tieu_de_giao_an}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onLikeGuide) {
                              onLikeGuide(currentGuide.id);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 hover:bg-red-100/10 text-red-500 transition-all text-[15px] font-bold cursor-pointer active:scale-95 border border-red-500/30"
                          title="Thích trang bị này"
                        >
                          <span>{currentGuide.luot_xem || 0}</span>
                          <LucideIcon
                            name="Heart"
                            size={18}
                            className="fill-red-500 text-red-500"
                          />
                        </button>
                      </div>
                    </div>

                    {/* Build Tabs (Nếu tướng có nhiều lối lên đồ) */}
                    {championGuides.length > 1 && (
                      <div>
                        <span className="block text-[12px] font-black uppercase tracking-wider mb-1 text-white">
                          Chọn lối lên đồ:
                        </span>
                        <div className="flex flex-wrap border border-[#bd9867] bg-black/40">
                          {championGuides.map((g, idx) => (
                            <button
                              key={g.id}
                              onClick={() =>
                                setSelectedBuildIndexByChamp((prev) => ({
                                  ...prev,
                                  [selectedTrangBiChampId]: idx,
                                }))
                              }
                              className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                safeIndex === idx
                                  ? "bg-[#bd9867] text-white shadow-sm border border-[#bd9867]"
                                  : "text-[#bd9867] hover:bg-[#bd9867]/10 hover:text-[#fce3bc]"
                              }`}
                            >
                              {g.tieu_de_giao_an}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Items & Spell */}
                    <div>
                      <span className="block text-[12px] font-bold uppercase tracking-wider text-white mb-1.5">
                        Trang bị & Phép bổ trợ:
                      </span>

                      <div className="grid grid-cols-7 gap-1.5 sm:gap-3.5 max-w-2xl">
                        {currentGuide.trang_bi_list?.map((item, index) => (
                          <div
                            key={`${item.id}-${index}`}
                            className="flex flex-col items-center gap-1 group relative cursor-help"
                            title={`${item.ten_trang_bi}: ${item.mo_ta || ""}`}
                          >
                            <div className="relative aspect-square w-full overflow-hidden border [border-image:linear-gradient(to_top,#bd9867,#fce3bc)_1] bg-slate-50 transition-all hover:scale-105 hover:shadow-md">
                              <img
                                src={item.url_hinh_anh}
                                className="w-full h-full object-cover"
                                alt={item.ten_trang_bi}
                                referrerPolicy="no-referrer"
                              />
                              <span className="absolute bottom-0 right-0 bg-black/80 text-white text-[8px] font-bold px-1 rounded-tl-md">
                                {index + 1}
                              </span>
                            </div>
                            <span className="text-[8px] sm:text-[9.5px] font-bold text-center truncate w-full text-slate-400 group-hover:text-slate-200 transition-colors">
                              {item.ten_trang_bi}
                            </span>
                          </div>
                        ))}

                        {/* Spell */}
                        {currentGuide.phu_tro && (
                          <div
                            className="flex flex-col items-center gap-1 group relative cursor-help"
                            title={currentGuide.phu_tro.ten_phu_tro}
                          >
                            <div className="relative aspect-square w-full rounded overflow-hidden transition-all hover:scale-105 hover:shadow-md border border-indigo-500/50">
                              <img
                                src={currentGuide.phu_tro.url_hinh_anh}
                                className="w-full h-full object-cover"
                                alt={currentGuide.phu_tro.ten_phu_tro}
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <span className="text-[8px] sm:text-[9.5px] font-extrabold text-center truncate w-full text-indigo-400">
                              {currentGuide.phu_tro.ten_phu_tro}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expandable Panel (Phù hiệu & Bảng Ngọc) */}
                    {isExpanded && (
                      <div className="mt-2 pt-2 space-y-4 animate-in slide-in-from-top duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Badge Column (Phù hiệu) */}
                          {currentGuide.phu_hieu_list &&
                            currentGuide.phu_hieu_list.length > 0 &&
                            (() => {
                              const mainFinalBadge =
                                mainBadgesList[mainBadgesList.length - 1];
                              const mainBranchType =
                                getBadgeBranch(mainFinalBadge);
                              const mainColors =
                                branchColors[mainBranchType] ||
                                branchColors.KHAC;

                              const sub1FinalBadge =
                                sub1BadgesList[sub1BadgesList.length - 1];
                              const sub1BranchType =
                                getBadgeBranch(sub1FinalBadge);
                              const sub1Colors =
                                branchColors[sub1BranchType] ||
                                branchColors.KHAC;

                              const sub2FinalBadge =
                                sub2BadgesList[sub2BadgesList.length - 1];
                              const sub2BranchType =
                                getBadgeBranch(sub2FinalBadge);
                              const sub2Colors =
                                branchColors[sub2BranchType] ||
                                branchColors.KHAC;

                              return (
                                <div className="bg-slate-950 p-3 rounded-md border border-slate-800 shadow-xl flex flex-col gap-3 text-left">
                                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                    <h4 className="text-[12px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                                      <LucideIcon name="Award" size={14} />
                                      PHÙ HIỆU THAM KHẢO
                                    </h4>
                                  </div>

                                  <div>
                                    {/* Main Branch */}
                                    {mainBadgesList.length > 0 && (
                                      <div className="flex py-2 items-center gap-8 md:gap-11 overflow-x-auto scrollbar-none">
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

                                          const displayName = isRoot
                                            ? branchNameMap[
                                                getBadgeBranch(badge)
                                              ] || badge.ten_phu_hieu
                                            : badge.ten_phu_hieu;
                                          const displayImg = isRoot
                                            ? branchImageMap[
                                                getBadgeBranch(badge)
                                              ] || badge.url_hinh_anh
                                            : badge.url_hinh_anh;

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
                                                title={displayName}
                                              >
                                                <img
                                                  src={displayImg}
                                                  className={`${imageSize} object-cover rounded-full`}
                                                  alt=""
                                                  referrerPolicy="no-referrer"
                                                />
                                                {!isRoot && (
                                                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 bg-[#0a0a0f] border border-slate-800 text-[7.5px] md:text-[8.5px] font-black text-slate-300 px-1.5 py-0.5 rounded-full select-none shadow">
                                                    {getRomanNumeral(idx - 1)}
                                                  </span>
                                                )}
                                              </div>
                                              {idx <
                                                mainBadgesList.length - 1 && (
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
                                    )}

                                    {/* Sub Branches Row */}
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                                      {/* Sub Branch 1 */}
                                      {sub1BadgesList.length > 0 && (
                                        <div className="py-1">
                                          <div className="flex items-center gap-8 md:gap-10 py-2 overflow-x-auto scrollbar-none">
                                            {sub1BadgesList.map(
                                              (badge, idx) => {
                                                const isRoot = idx === 0;
                                                const isLarge = isRoot;

                                                const containerSize = isLarge
                                                  ? "w-11 h-11 md:w-13 md:h-13"
                                                  : "w-8 h-8 md:w-9.5 md:h-9.5";
                                                const imageSize = isLarge
                                                  ? "w-9 h-9 md:w-11 md:h-11"
                                                  : "w-6 h-6 md:w-7.5 md:h-7.5";

                                                const displayName = isRoot
                                                  ? branchNameMap[
                                                      getBadgeBranch(badge)
                                                    ] || badge.ten_phu_hieu
                                                  : badge.ten_phu_hieu;
                                                const displayImg = isRoot
                                                  ? branchImageMap[
                                                      getBadgeBranch(badge)
                                                    ] || badge.url_hinh_anh
                                                  : badge.url_hinh_anh;

                                                return (
                                                  <div
                                                    key={`${badge.id || "sub1"}-${idx}`}
                                                    className="relative flex items-center shrink-0"
                                                  >
                                                    <div
                                                      className={`relative z-10 ${containerSize} rounded-full bg-[#050508] border flex items-center justify-center transition-all hover:scale-105 group cursor-help`}
                                                      style={{
                                                        borderColor:
                                                          sub1Colors.main,
                                                        boxShadow: isRoot
                                                          ? `0 0 12px ${sub1Colors.glow}, inset 0 0 6px ${sub1Colors.glow}`
                                                          : `0 0 8px ${sub1Colors.glow}`,
                                                      }}
                                                      title={displayName}
                                                    >
                                                      <img
                                                        src={displayImg}
                                                        className={`${imageSize} object-cover rounded-full`}
                                                        alt=""
                                                        referrerPolicy="no-referrer"
                                                      />
                                                      {!isRoot && (
                                                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 bg-[#0a0a0f] border border-slate-800 text-[7px] font-black text-slate-300 px-1 py-0.5 rounded-full select-none shadow">
                                                          I
                                                        </span>
                                                      )}
                                                    </div>
                                                    {idx <
                                                      sub1BadgesList.length -
                                                        1 && (
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
                                              },
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Sub Branch 2 */}
                                      {sub2BadgesList.length > 0 && (
                                        <div className="py-1">
                                          <div className="flex items-center gap-8 md:gap-10 py-2 overflow-x-auto scrollbar-none">
                                            {sub2BadgesList.map(
                                              (badge, idx) => {
                                                const isRoot = idx === 0;
                                                const isLarge = isRoot;

                                                const containerSize = isLarge
                                                  ? "w-11 h-11 md:w-13 md:h-13"
                                                  : "w-8 h-8 md:w-9.5 md:h-9.5";
                                                const imageSize = isLarge
                                                  ? "w-9 h-9 md:w-11 md:h-11"
                                                  : "w-6 h-6 md:w-7.5 md:h-7.5";

                                                const displayName = isRoot
                                                  ? branchNameMap[
                                                      getBadgeBranch(badge)
                                                    ] || badge.ten_phu_hieu
                                                  : badge.ten_phu_hieu;
                                                const displayImg = isRoot
                                                  ? branchImageMap[
                                                      getBadgeBranch(badge)
                                                    ] || badge.url_hinh_anh
                                                  : badge.url_hinh_anh;

                                                return (
                                                  <div
                                                    key={`${badge.id || "sub2"}-${idx}`}
                                                    className="relative flex items-center shrink-0"
                                                  >
                                                    <div
                                                      className={`relative z-10 ${containerSize} rounded-full bg-[#050508] border flex items-center justify-center transition-all hover:scale-105 group cursor-help`}
                                                      style={{
                                                        borderColor:
                                                          sub2Colors.main,
                                                        boxShadow: isRoot
                                                          ? `0 0 12px ${sub2Colors.glow}, inset 0 0 6px ${sub2Colors.glow}`
                                                          : `0 0 8px ${sub2Colors.glow}`,
                                                      }}
                                                      title={displayName}
                                                    >
                                                      <img
                                                        src={displayImg}
                                                        className={`${imageSize} object-cover rounded-full`}
                                                        alt=""
                                                        referrerPolicy="no-referrer"
                                                      />
                                                      {!isRoot && (
                                                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 bg-[#0a0a0f] border border-slate-800 text-[7px] font-black text-slate-300 px-1 py-0.5 rounded-full select-none shadow">
                                                          II
                                                        </span>
                                                      )}
                                                    </div>
                                                    {idx <
                                                      sub2BadgesList.length -
                                                        1 && (
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
                                              },
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                          {/* Arcana Column (Bảng ngọc) */}
                          <div className="bg-slate-950 p-4 rounded-md border border-slate-800 shadow-xl flex flex-col gap-3 text-left">
                            <h4 className="text-[12px] font-black uppercase tracking-wider text-white flex items-center gap-1.5 text-left">
                              <LucideIcon name="Zap" size={15} />
                              BẢNG NGỌC THAM KHẢO
                            </h4>

                            {(() => {
                              const redLines = (currentGuide.ngoc_do || "N/A")
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const purpleLines = (
                                currentGuide.ngoc_tim || "N/A"
                              )
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const greenLines = (
                                currentGuide.ngoc_xanh || "N/A"
                              )
                                .split("\n")
                                .map((s) => s.trim())
                                .filter(Boolean);

                              return (
                                <div className="flex flex-col sm:flex-row gap-5 items-center">
                                  <div className="hidden sm:flex w-1/2 max-w-[100px] sm:max-w-[120px] justify-center items-center shrink-0 sm:border-r border-slate-800 sm:pr-4">
                                    <img
                                      src="/image/ngoc/bang_ngoc.png"
                                      className="w-full h-auto object-contain hover:scale-105 transition-all duration-250"
                                      alt="Bảng Ngọc"
                                    />
                                  </div>

                                  <div className="flex-1 w-full space-y-2">
                                    {/* Red row */}
                                    <div className="flex items-center gap-3">
                                      <img
                                        src="/image/ngoc/do.png"
                                        className="w-8 h-8 object-contain shrink-0"
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
                                        src="/image/ngoc/tim.png"
                                        className="w-8 h-8 object-contain shrink-0"
                                        alt="Ngọc Tím"
                                      />
                                      <div className="flex flex-col justify-center text-left">
                                        {purpleLines.map((line, lIdx) => (
                                          <span
                                            key={lIdx}
                                            className="text-[11.5px] font-black text-purple-400 block leading-tight"
                                          >
                                            {line}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Green row */}
                                    <div className="flex items-center gap-3">
                                      <img
                                        src="/image/ngoc/xanh.png"
                                        className="w-8 h-8 object-contain shrink-0"
                                        alt="Ngọc Lục"
                                      />
                                      <div className="flex flex-col justify-center text-left">
                                        {greenLines.map((line, lIdx) => (
                                          <span
                                            key={lIdx}
                                            className="text-[11.5px] font-black text-emerald-400 block leading-tight"
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

                    {/* Toggle Detail Button Footer */}
                    <div className="mt-3 pt-3 border-t border-[#bd9867]/30 flex justify-end">
                      <button
                        onClick={() => toggleExpand(selectedTrangBiChampId)}
                        className="px-3.5 py-1.5 text-[10px] font-bold flex items-center gap-1.5 border border-[#bd9867] hover:bg-[#bd9867]/10 hover:text-[#fce3bc] transition-all cursor-pointer text-[#bd9867]"
                      >
                        <span>
                          {isExpanded
                            ? "Thu gọn ngọc & phù hiệu"
                            : "Xem chi tiết ngọc & phù hiệu"}
                        </span>
                        <LucideIcon
                          name={isExpanded ? "ChevronUp" : "ChevronDown"}
                          size={12}
                        />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 2: Top Tier */}
      {academyTab === "toptier" && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <div className="flex flex-row items-center justify-between gap-2 flex-nowrap">
            {/* Phần Tiêu đề bên trái */}
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-sm sm:text-base bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent uppercase tracking-wide truncate">
                BXH TƯỚNG
              </h3>
            </div>

            {/* Dropdown Chọn Phiên bản + Nút Tải BXH bên phải */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1 bg-[#bd9867]/20 border border-[#bd9867]/60 px-2 py-1">
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="bg-transparent text-[11px] sm:text-xs font-bold text-[#fce3bc] focus:outline-none cursor-pointer border-none py-0.5"
                >
                  {availableVersions.length > 0 ? (
                    availableVersions.map((ver) => (
                      <option
                        key={ver}
                        value={ver}
                        className="bg-slate-900 text-[#fce3bc]"
                      >
                        {ver}
                      </option>
                    ))
                  ) : (
                    <option value="" className="bg-slate-900 text-[#fce3bc]">
                      Phiên bản hiện tại
                    </option>
                  )}
                </select>
              </div>

              <button
                onClick={handleDownloadTopTier}
                disabled={isDownloading}
                className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 font-black text-[11px] sm:text-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow border border-[#fce3bc]/80 disabled:opacity-50"
                title="Tải bảng Top Tier về thiết bị"
              >
                <LucideIcon
                  name={isDownloading ? "Loader2" : "Download"}
                  size={13}
                  className={isDownloading ? "animate-spin" : ""}
                />
                <span>{isDownloading ? "Đang tải..." : "Tải BXH"}</span>
              </button>
            </div>
          </div>

          <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 pb-1">
            {laneList.map((lane) => {
              const isActive = selectedTopTierLane === lane.value;

              return (
                <button
                  key={lane.value}
                  onClick={() => setSelectedTopTierLane(lane.value)}
                  title={lane.label}
                  className={`flex-1 flex items-center justify-center h-9 sm:h-10 px-1 sm:px-3 transition-all border cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] border-[#fce3bc] shadow-md scale-[1.02]"
                      : "bg-slate-950/80 border-[#bd9867]/40 hover:bg-[#bd9867]/20 hover:border-[#bd9867]"
                  }`}
                >
                  {/* Nút All: Hiển thị Text */}
                  {lane.isText ? (
                    <span
                      className={`text-xs sm:text-sm font-black transition-colors ${
                        isActive ? "text-slate-950" : "text-[#fce3bc]"
                      }`}
                    >
                      {lane.label}
                    </span>
                  ) : (
                    /* Các nút Đường khác: Hiển thị Icon Ảnh */
                    <img
                      src={`/image/LANE2/${lane.icon}`}
                      alt={lane.label}
                      className={`w-6 h-6 sm:w-7 sm:h-7 object-contain transition-all ${
                        isActive
                          ? "brightness-0 opacity-90" /* Chuyển icon màu xám đen gần như text-slate-950 */
                          : "opacity-80 hover:opacity-100"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {topTierList.length === 0 ? (
            <div className="bg-slate-950/80 border border-[#bd9867]/60 p-8 shadow-xl backdrop-blur-md text-center text-[#fce3bc]">
              <LucideIcon
                name="Trophy"
                size={36}
                className="mx-auto mb-2 opacity-60 text-[#bd9867]"
              />
              <p className="text-sm font-bold text-[#fce3bc] mb-1">
                Chưa có dữ liệu Top Tier
              </p>
            </div>
          ) : (
            <div
              ref={topTierBoardRef}
              id="top-tier-board"
              className="bg-slate-950/90 border border-[#bd9867]/60 shadow-2xl backdrop-blur-md overflow-hidden relative"
            >
              <WatermarkOverlay text={watermarkText} />
              {/* Logo nhỏ nằm ở góc trên bên phải của bảng Top Tier */}
              <div className="absolute top-2 right-2 sm:top-2.5 sm:right-3 z-30 flex items-center gap-1.5 pointer-events-none select-none px-2 py-1 shadow-lg opacity-40">
                <img
                  src="/logo-light.png"
                  alt="Logo"
                  className="w-10 h-10 sm:w-20 sm:h-20 object-contain"
                  referrerPolicy="no-referrer"
                />
                {/* <span className="text-[10px] sm:text-xs font-black text-[#fce3bc] tracking-wider uppercase drop-shadow">
                  {watermarkText}
                </span> */}
              </div>
              <div className="relative z-10 divide-y divide-[#bd9867]/30">
                {[
                  { tier: "S", bgColor: "#ff7f7e" }, // Đỏ hồng
                  { tier: "A", bgColor: "#ffbf7f" }, // Cam nhạt
                  { tier: "B", bgColor: "#ffdf80" }, // Vàng cam
                  { tier: "C", bgColor: "#fdff7f" }, // Vàng chanh
                  { tier: "D", bgColor: "#beff7f" }, // Xanh lá nhạt
                ].map(({ tier, bgColor }) => {
                  const tierEntries = topTierList.filter(
                    (item) =>
                      item.tier === tier &&
                      (!selectedVersion ||
                        item.phien_ban === selectedVersion) &&
                      (selectedTopTierLane === "All" ||
                        selectedTopTierLane === "Tất cả" ||
                        item.phandanh_lane === selectedTopTierLane),
                  );

                  return (
                    <div
                      key={tier}
                      className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] min-h-[10px]"
                    >
                      {/* Cột trái: Màu nền đơn chuẩn mã HEX + Chữ Tier màu Vàng Ánh Kim */}
                      <div
                        style={{ backgroundColor: bgColor }}
                        className="flex items-center justify-center p-2 border-r border-[#bd9867]/40 shrink-0"
                      >
                        <span className="text-3xl sm:text-4xl font-black bg-gradient-to-b from-[#ffe8b2] via-[#fce3bc] to-[#b8860b] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none">
                          {tier}
                        </span>
                      </div>

                      {/* Cột phải: Danh sách tướng */}
                      <div className="p-1 sm:p-3 flex flex-wrap items-center gap-1 sm:gap-3 bg-black/40">
                        {tierEntries.length === 0 ? (
                          <span className="text-xs text-slate-500 italic px-1">
                            Không có tướng ở Tier {tier}
                          </span>
                        ) : (
                          tierEntries.map((entry) => {
                            const champ = allChampions.find(
                              (c) => c.id === entry.tuong_id,
                            );
                            if (!champ) return null;

                            return (
                              <div
                                key={entry.id}
                                title={champ.ten_tuong} // Di chuột vào sẽ hiện tên tướng
                                className="relative cursor-pointer transition-transform hover:scale-110 shrink-0"
                              >
                                <img
                                  src={
                                    champ.url_anh_dai_dien || "/placeholder.jpg"
                                  }
                                  alt={champ.ten_tuong}
                                  className="w-10 h-10 sm:w-12 sm:h-12 object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-tab 3: Khắc chế */}
      {academyTab === "khacche" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {!selectedKhacCheChampId ? (
            /* VIEW 1: Danh sách các Tướng ĐÃ CÓ Khắc Chế - Giữ nguyên */
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm sm:text-base bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent uppercase tracking-wide">
                Danh sách tướng
              </h3>

              {/* Ô Tìm kiếm DÀNH RIÊNG cho Danh sách Tướng Có Trang Bị */}
              <div className="relative w-full w-full ">
                <input
                  type="text"
                  placeholder="Tìm tướng..."
                  value={kcSearchTerm}
                  onChange={(e) => setKcSearchTerm(e.target.value)}
                  className="w-full bg-black/60 border border-[#bd9867]/60 rounded-none pl-8 pr-3 py-1.5 text-xs text-[#fce3bc] placeholder-slate-400 focus:outline-none focus:border-[#fce3bc]"
                />
                <LucideIcon
                  name="Search"
                  size={14}
                  className="absolute left-2.5 top-2.5 text-[#bd9867]"
                />
              </div>

              {(() => {
                const champsWithKcData = allChampions
                  .filter((c) => khacCheList.some((kc) => kc.tuong_id === c.id))
                  .filter((c) =>
                    c.ten_tuong
                      .toLowerCase()
                      .includes(kcSearchTerm.toLowerCase()),
                  );

                if (champsWithKcData.length === 0) {
                  return (
                    <div className="p-8 text-center text-[#fce3bc]">
                      <p className="text-sm">
                        Chưa có tướng nào có dữ liệu khắc chế "{kcSearchTerm}"
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="pt-2 relative overflow-hidden">
                    <WatermarkOverlay text={watermarkText} />
                    <div className="relative z-10 grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1">
                      {champsWithKcData.map((champ) => (
                        <button
                          key={champ.id}
                          onClick={() => setSelectedKhacCheChampId(champ.id)}
                          className="flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110 group focus:outline-none w-full"
                        >
                          <img
                            src={champ.url_anh_dai_dien || "/placeholder.jpg"}
                            alt={champ.ten_tuong}
                            className="w-14 h-14 sm:w-16 sm:h-16 object-cover border border-[#bd9867]/60 group-hover:border-[#fce3bc] shadow-md group-hover:shadow-[#fce3bc]/30 transition-all"
                            referrerPolicy="no-referrer"
                          />
                          <span className="font-extrabold text-[11px] sm:text-xs text-[#fce3bc] group-hover:text-white block truncate w-full text-center">
                            {champ.ten_tuong}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* VIEW 2: Chi tiết khắc chế của tướng đã chọn - ĐÃ CẬP NHẬT UI CHỈ HIỂN THỊ ẢNH */
            <div className="space-y-4">
              <button
                onClick={() => setSelectedKhacCheChampId(null)}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-[#bd9867]/60 text-[#fce3bc] hover:text-white hover:bg-[#bd9867]/20 text-xs font-bold transition-all cursor-pointer"
              >
                <LucideIcon name="ArrowLeft" size={16} />
                <span>Quay lại chọn tướng khác</span>
              </button>

              {(() => {
                const selectedChamp = allChampions.find(
                  (c) => c.id === selectedKhacCheChampId,
                );
                const kcData = khacCheList.find(
                  (x) => x.tuong_id === selectedKhacCheChampId,
                );

                if (!selectedChamp) return null;

                const counterChamps = allChampions.filter((c) =>
                  (kcData?.tuong_khac_che_ids || []).includes(c.id),
                );
                const counterItems = allItems.filter((i) =>
                  (kcData?.trang_bi_khac_che_ids || []).includes(i.id),
                );
                const comboChamps = allChampions.filter((c) =>
                  (kcData?.tuong_phoi_hop_ids || []).includes(c.id),
                );

                return (
                  <div className="space-y-4 relative overflow-hidden border border-[#bd9867]/60 bg-[#1d182b]/70 p-3 sm:p-4 backdrop-blur-md">
                    <WatermarkOverlay text={watermarkText} />
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-950/60 via-slate-950 to-indigo-950/60 border border-[#bd9867] p-3 sm:p-4 shadow-xl flex items-center gap-3 sm:gap-4">
                      <img
                        src={
                          selectedChamp.url_anh_dai_dien || "/placeholder.jpg"
                        }
                        alt={selectedChamp.ten_tuong}
                        className="w-14 h-14 sm:w-16 sm:h-16 object-cover border-2 border-[#fce3bc] shadow-md shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-base sm:text-xl text-[#fce3bc] uppercase tracking-wide">
                            {selectedChamp.ten_tuong}
                          </h4>
                          <span className="text-[10px] font-bold text-amber-300 bg-[#bd9867]/30 border border-[#bd9867]/60 px-2 py-0.5 uppercase">
                            {selectedChamp.vai_tro || "Tướng"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Tướng Khắc Chế */}
                      <div className="bg-slate-950/80 border border-red-900/60 p-3 sm:p-4 shadow-xl space-y-3">
                        <div className="flex items-center gap-2 border-b border-red-800/40 pb-2">
                          <LucideIcon
                            name="ShieldAlert"
                            size={18}
                            className="text-red-400"
                          />
                          <h4 className="font-extrabold text-sm sm:text-base text-red-300 uppercase tracking-wide">
                            Tướng Khắc Chế
                          </h4>
                        </div>

                        {counterChamps.length === 0 ? (
                          <p className="text-xs text-slate-300 italic">
                            Chưa chọn tướng khắc chế.
                          </p>
                        ) : (
                          /* CẬP NHẬT UI: CHỈ HIỂN THỊ ẢNH TƯỚNG */
                          <div className="flex flex-wrap gap-2.5 items-center">
                            {counterChamps.map((c) => (
                              <div
                                key={c.id}
                                title={c.ten_tuong}
                                className="relative cursor-pointer transition-transform hover:scale-110 shrink-0"
                              >
                                <img
                                  src={c.url_anh_dai_dien || "/placeholder.jpg"}
                                  alt={c.ten_tuong}
                                  className="w-11 h-11 sm:w-12 sm:h-12 object-cover border border-red-500/80 shadow-md"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {kcData?.ghi_chu_khac_che && (
                          <div className="bg-red-950/40 border border-red-900/60 p-2.5 rounded text-xs text-red-200 space-y-1">
                            <span className="font-bold flex items-center gap-1 text-[11px] text-red-300">
                              <LucideIcon name="Lightbulb" size={12} /> Mẹo khắc
                              chế:
                            </span>
                            <p className="leading-relaxed font-medium">
                              {kcData.ghi_chu_khac_che}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Trang Bị Khắc Chế */}
                      <div className="bg-slate-950/80 border border-amber-900/60 p-3 sm:p-4 shadow-xl space-y-3">
                        <div className="flex items-center gap-2 border-b border-amber-800/40 pb-2">
                          <LucideIcon
                            name="Shield"
                            size={18}
                            className="text-amber-400"
                          />
                          <h4 className="font-extrabold text-sm sm:text-base text-amber-300 uppercase tracking-wide">
                            Trang Bị Khắc Chế
                          </h4>
                        </div>

                        {counterItems.length === 0 ? (
                          <p className="text-xs text-slate-300 italic">
                            Chưa chọn trang bị khắc chế.
                          </p>
                        ) : (
                          /* CẬP NHẬT UI: CHỈ HIỂN THỊ ẢNH TRANG BỊ */
                          <div className="flex flex-wrap gap-2.5 items-center">
                            {counterItems.map((item) => (
                              <div
                                key={item.id}
                                title={item.ten_trang_bi}
                                className="relative cursor-pointer transition-transform hover:scale-110 shrink-0"
                              >
                                <img
                                  src={item.url_hinh_anh || "/placeholder.jpg"}
                                  alt={item.ten_trang_bi}
                                  className="w-11 h-11 sm:w-12 sm:h-12 object-cover border border-amber-500/80 shadow-md"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tướng Phối Hợp */}
                      <div className="bg-slate-950/80 border border-emerald-900/60 p-3 sm:p-4 shadow-xl space-y-3">
                        <div className="flex items-center gap-2 border-b border-emerald-800/40 pb-2">
                          <LucideIcon
                            name="Users"
                            size={18}
                            className="text-emerald-400"
                          />
                          <h4 className="font-extrabold text-sm sm:text-base text-emerald-300 uppercase tracking-wide">
                            Tướng Phối Hợp
                          </h4>
                        </div>

                        {comboChamps.length === 0 ? (
                          <p className="text-xs text-slate-300 italic">
                            Chưa chọn tướng phối hợp.
                          </p>
                        ) : (
                          /* CẬP NHẬT UI: CHỈ HIỂN THỊ ẢNH TƯỚNG PHỐI HỢP */
                          <div className="flex flex-wrap gap-2.5 items-center">
                            {comboChamps.map((c) => (
                              <div
                                key={c.id}
                                title={c.ten_tuong}
                                className="relative cursor-pointer transition-transform hover:scale-110 shrink-0"
                              >
                                <img
                                  src={c.url_anh_dai_dien || "/placeholder.jpg"}
                                  alt={c.ten_tuong}
                                  className="w-11 h-11 sm:w-12 sm:h-12 object-cover border border-emerald-500/80 shadow-md"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {kcData?.ghi_chu_phoi_hop && (
                          <div className="bg-emerald-950/40 border border-emerald-900/60 p-2.5 rounded text-xs text-emerald-200 space-y-1">
                            <span className="font-bold flex items-center gap-1 text-[11px] text-emerald-300">
                              <LucideIcon name="Sparkles" size={12} /> Bí quyết
                              phối hợp:
                            </span>
                            <p className="leading-relaxed font-medium">
                              {kcData.ghi_chu_phoi_hop}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
