import React, { useState } from "react";
import {
  DBChampion,
  DBItem,
  DBSpell,
  DBBadge,
  DBBuildGuide,
} from "../supabase";
import LucideIcon from "./LucideIcon";

const getBadgeBranch = (badge: DBBadge): string => {
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
  if (url.includes("rung_nguyen_sinh") || name.includes("rừng nguyên sinh")) {
    return "RUNG_NGUYEN_SINH";
  }
  return "KHAC";
};

const branchRepresentativeIds = [
  "e1111111-1111-1111-1111-111111111111", // Vực hỗn mang
  "e2222222-2222-2222-2222-222222222222", // Tháp quang minh
  "e3333333-3333-3333-3333-333333333333", // Thành khởi nguyên
  "e4444444-4444-4444-4444-444444444444", // Rừng nguyên sinh
];

const matchChampLane = (champ: DBChampion, lane: string): boolean => {
  if (lane === "ALL") return true;
  const role = (champ.vai_tro || "").toLowerCase();
  const name = champ.ten_tuong.toLowerCase();

  if (lane === "Caesar") {
    return (
      role.includes("đấu sĩ") ||
      role.includes("đỡ đòn") ||
      role.includes("caesar")
    );
  }
  if (lane === "Rừng") {
    return (
      role.includes("sát thủ") ||
      role.includes("rừng") ||
      name === "florentino" ||
      name === "nakroth"
    );
  }
  if (lane === "Giữa") {
    return role.includes("pháp sư") || role.includes("giữa");
  }
  if (lane === "Rồng") {
    return role.includes("xạ thủ") || role.includes("rồng");
  }
  if (lane === "Trợ thủ") {
    return (
      role.includes("trợ thủ") ||
      role.includes("đỡ đòn") ||
      role.includes("hỗ trợ")
    );
  }
  return true;
};

const normalizeItemCategory = (loai: number | string | null): string => {
  if (loai === null || loai === undefined) return "CONG";
  if (typeof loai === "number") {
    if (loai === 0) return "CONG";
    if (loai === 1) return "PHEP";
    if (loai === 2) return "THU";
    if (loai === 3) return "TOC_CHAY";
    if (loai === 4) return "TRO_THU";
    return "CONG";
  }
  const normalized = loai.toUpperCase().trim();
  if (normalized === "CONG" || normalized === "CÔNG") return "CONG";
  if (normalized === "PHEP" || normalized === "PHÉP") return "PHEP";
  if (normalized === "THU" || normalized === "THỦ") return "THU";
  if (
    normalized === "TOC_CHAY" ||
    normalized === "TỐC ĐỘ" ||
    normalized === "TOC_DO" ||
    normalized === "TỐC"
  )
    return "TOC_CHAY";
  if (
    normalized === "RUNG" ||
    normalized === "ĐI RỪNG" ||
    normalized === "DI_RUNG"
  )
    return "RUNG";
  if (
    normalized === "TRO_THU" ||
    normalized === "TRỢ THỦ" ||
    normalized === "TRỢ"
  )
    return "TRO_THU";
  return normalized;
};

interface BuildGuidesTabProps {
  champions: DBChampion[];
  items: DBItem[];
  spells: DBSpell[];
  badges: DBBadge[];
  guides: DBBuildGuide[];
  onSaveGuide: (
    guide: Partial<DBBuildGuide>,
    itemsMap: { item_id: string; o_so: number }[],
    badgesMap: { phu_hieu_id: string; vi_tri_o: string }[],
  ) => Promise<void>;
  onDeleteGuide: (id: string) => Promise<void>;
  accentColor: string;
}

export default function BuildGuidesTab({
  champions,
  items,
  spells,
  badges,
  guides,
  onSaveGuide,
  onDeleteGuide,
  accentColor,
}: BuildGuidesTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingGuide, setEditingGuide] =
    useState<Partial<DBBuildGuide> | null>(null);

  // Form State
  const [selectedChampId, setSelectedChampId] = useState("");
  const [title, setTitle] = useState("");
  const [selectedSpellId, setSelectedSpellId] = useState("");
  const [ngocDo, setNgocDo] = useState("");
  const [ngocTim, setNgocTim] = useState("");
  const [ngocXanh, setNgocXanh] = useState("");
  const [isActive, setIsActive] = useState(true);

  // 6 Equipment Slots
  const [selectedItems, setSelectedItems] = useState<string[]>(
    Array(6).fill(""),
  );

  // Badges: Main branch (4 slots) and Sub-branches (2 slots each = 4 slots)
  const [selectedBadges, setSelectedBadges] = useState<Record<string, string>>({
    NHANH_CHINH_1: "",
    NHANH_CHINH_2: "",
    NHANH_CHINH_3: "",
    NHANH_CHINH_4: "",
    NHANH_PHU_1_1: "",
    NHANH_PHU_1_2: "",
    NHANH_PHU_2_1: "",
    NHANH_PHU_2_2: "",
  });

  // UI Interactive States
  const [activeSelector, setActiveSelector] = useState<{
    type: "champion" | "item" | "spell" | "badge";
    index?: number; // for item
    key?: string; // for badge
  }>({ type: "champion" });

  const [rightTab, setRightTab] = useState<
    "champion" | "item" | "badge" | "spell"
  >("champion");
  const [searchTerm, setSearchTerm] = useState("");
  const [itemCategory, setItemCategory] = useState<string>("ALL");
  const [champRole, setChampRole] = useState<string>("ALL");
  const [champLane, setChampLane] = useState<string>("ALL");
  const [badgeBranch, setBadgeBranch] = useState<string>("ALL");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const activateSelector = (
    type: "champion" | "item" | "spell" | "badge",
    index?: number,
    key?: string,
  ) => {
    setActiveSelector({ type, index, key });
    setRightTab(type);
    setSearchTerm("");
  };

  const handleStartNew = () => {
    setEditingGuide(null);
    setSelectedChampId(champions[0]?.id || "");
    setTitle("");
    setSelectedSpellId(spells[0]?.id || "");
    setNgocDo("Công vật lý / Xuyên giáp x10");
    setNgocTim("Tốc đánh / Tốc chạy x10");
    setNgocXanh("Công vật lý / Xuyên giáp x10");
    setIsActive(true);
    setSelectedItems(Array(6).fill(""));
    setSelectedBadges({
      NHANH_CHINH_1: "",
      NHANH_CHINH_2: "",
      NHANH_CHINH_3: "",
      NHANH_CHINH_4: "",
      NHANH_PHU_1_1: "",
      NHANH_PHU_1_2: "",
      NHANH_PHU_2_1: "",
      NHANH_PHU_2_2: "",
    });
    setIsEditing(true);
    setErrorMsg("");
    activateSelector("champion");
  };

  const handleStartEdit = (g: DBBuildGuide) => {
    setEditingGuide(g);
    setSelectedChampId(g.tuong_id);
    setTitle(g.tieu_de_giao_an);
    setSelectedSpellId(g.phu_tro_id || "");
    setNgocDo(g.ngoc_do || "");
    setNgocTim(g.ngoc_tim || "");
    setNgocXanh(g.ngoc_xanh || "");
    setIsActive(g.kich_hoat);

    // Reconstruct item slots
    const remappedItems = Array(6).fill("");
    if (g.trang_bi_list) {
      g.trang_bi_list.forEach((item, index) => {
        if (index < 6) remappedItems[index] = item.id;
      });
    }
    setSelectedItems(remappedItems);

    // Reconstruct badges (with support for old format backward compatibility)
    const remappedBadges: Record<string, string> = {
      NHANH_CHINH_1: "",
      NHANH_CHINH_2: "",
      NHANH_CHINH_3: "",
      NHANH_CHINH_4: "",
      NHANH_PHU_1_1: "",
      NHANH_PHU_1_2: "",
      NHANH_PHU_2_1: "",
      NHANH_PHU_2_2: "",
    };
    if (g.phu_hieu_list) {
      g.phu_hieu_list.forEach((badge) => {
        const pos = (badge as any).vi_tri_o;
        if (pos) {
          if (pos === "NHANH_PHU_1") {
            remappedBadges["NHANH_PHU_1_1"] = badge.id;
          } else if (pos === "NHANH_PHU_2") {
            remappedBadges["NHANH_PHU_2_1"] = badge.id;
          } else if (pos in remappedBadges) {
            remappedBadges[pos] = badge.id;
          }
        }
      });
    }
    setSelectedBadges(remappedBadges);

    setIsEditing(true);
    setErrorMsg("");
    activateSelector("champion");
  };

  const handleSelectFromRightList = (id: string, name: string) => {
    if (activeSelector.type === "champion") {
      setSelectedChampId(id);
      // Auto advance to first equipment slot
      activateSelector("item", 0);
    } else if (activeSelector.type === "item") {
      const idx = activeSelector.index ?? 0;
      const updated = [...selectedItems];
      updated[idx] = id;
      setSelectedItems(updated);

      // Auto move to the next empty item slot
      const nextEmptyIdx = updated.findIndex(
        (val, index) => index > idx && !val,
      );
      if (nextEmptyIdx !== -1) {
        activateSelector("item", nextEmptyIdx);
      } else {
        // If all items are filled, check if spell is empty
        if (!selectedSpellId) {
          activateSelector("spell");
        } else {
          // Switch to first empty badge slot
          const firstEmptyBadgeKey = Object.keys(selectedBadges).find(
            (k) => !selectedBadges[k],
          );
          if (firstEmptyBadgeKey) {
            activateSelector("badge", undefined, firstEmptyBadgeKey);
          }
        }
      }
    } else if (activeSelector.type === "spell") {
      setSelectedSpellId(id);
      // Auto move to first empty badge slot
      const firstEmptyBadgeKey = Object.keys(selectedBadges).find(
        (k) => !selectedBadges[k],
      );
      if (firstEmptyBadgeKey) {
        activateSelector("badge", undefined, firstEmptyBadgeKey);
      }
    } else if (activeSelector.type === "badge") {
      const key = activeSelector.key;
      if (key) {
        setSelectedBadges((prev) => {
          const updated = { ...prev, [key]: id };
          if (key === "NHANH_CHINH_1" && prev[key] !== id) {
            updated["NHANH_CHINH_2"] = "";
            updated["NHANH_CHINH_3"] = "";
            updated["NHANH_CHINH_4"] = "";
          } else if (key === "NHANH_PHU_1_1" && prev[key] !== id) {
            updated["NHANH_PHU_1_2"] = "";
          } else if (key === "NHANH_PHU_2_1" && prev[key] !== id) {
            updated["NHANH_PHU_2_2"] = "";
          }
          return updated;
        });
        // Auto move to the next empty badge slot
        const badgeKeys = Object.keys(selectedBadges);
        const currentKeyIdx = badgeKeys.indexOf(key);
        const nextEmptyKey = badgeKeys
          .slice(currentKeyIdx + 1)
          .find((k) => !selectedBadges[k]);
        if (nextEmptyKey) {
          activateSelector("badge", undefined, nextEmptyKey);
        }
      }
    }
  };

  const handleClearSlot = (
    e: React.MouseEvent,
    type: "champion" | "item" | "spell" | "badge",
    index?: number,
    key?: string,
  ) => {
    e.stopPropagation(); // Avoid activating the slot
    if (type === "champion") {
      setSelectedChampId("");
      activateSelector("champion");
    } else if (type === "item" && index !== undefined) {
      const updated = [...selectedItems];
      updated[index] = "";
      setSelectedItems(updated);
      activateSelector("item", index);
    } else if (type === "spell") {
      setSelectedSpellId("");
      activateSelector("spell");
    } else if (type === "badge" && key !== undefined) {
      setSelectedBadges((prev) => {
        const updated = { ...prev, [key]: "" };
        if (key === "NHANH_CHINH_1") {
          updated["NHANH_CHINH_2"] = "";
          updated["NHANH_CHINH_3"] = "";
          updated["NHANH_CHINH_4"] = "";
        } else if (key === "NHANH_PHU_1_1") {
          updated["NHANH_PHU_1_2"] = "";
        } else if (key === "NHANH_PHU_2_1") {
          updated["NHANH_PHU_2_2"] = "";
        }
        return updated;
      });
      activateSelector("badge", undefined, key);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChampId) {
      setErrorMsg("Vui lòng chọn tướng!");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Vui lòng điền tiêu đề giáo án!");
      return;
    }

    // Verify gear is fully selected
    const incompleteGear = selectedItems.some((id) => !id);
    if (incompleteGear) {
      setErrorMsg("Vui lòng chọn đầy đủ 6 ô trang bị!");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const guideData: Partial<DBBuildGuide> = {
        id: editingGuide?.id,
        tuong_id: selectedChampId,
        tieu_de_giao_an: title,
        phu_tro_id: selectedSpellId || null,
        ngoc_do: ngocDo,
        ngoc_tim: ngocTim,
        ngoc_xanh: ngocXanh,
        kich_hoat: isActive,
      };

      const gearMap = selectedItems.map((id, idx) => ({
        item_id: id,
        o_so: idx + 1,
      }));

      const badgesMap = Object.entries(selectedBadges)
        .filter(([_, badgeId]) => !!badgeId)
        .map(([pos, badgeId]) => ({
          phu_hieu_id: badgeId as string,
          vi_tri_o: pos,
        }));

      await onSaveGuide(guideData, gearMap, badgesMap);
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi lưu giáo án.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex justify-between items-center bg-white p-5 rounded-md border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
            <LucideIcon name="Shield" className="text-indigo-500" size={20} />
            Hệ thống Giáo án & Đồ Game
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Quản lý các bộ khuyến nghị trang bị (1 tướng có thể có nhiều lối lên
            đồ khác nhau), bảng ngọc và phù hiệu.
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={handleStartNew}
            className="px-4 py-2 text-xs font-bold text-white rounded flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:brightness-115 active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            <LucideIcon name="Plus" size={14} />
            Tạo Giáo Án Mới
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 border border-rose-100 p-4 rounded text-xs flex items-center gap-2 font-semibold">
          <LucideIcon
            name="AlertTriangle"
            size={14}
            className="text-rose-500 shrink-0"
          />
          <span>{errorMsg}</span>
        </div>
      )}

      {isEditing ? (
        <form
          onSubmit={handleSave}
          className="space-y-6 animate-in fade-in duration-200"
        >
          <div className="flex justify-between items-center bg-white p-4 rounded-md border border-slate-100 shadow-sm">
            <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {editingGuide
                ? `Chỉnh sửa: ${editingGuide.tieu_de_giao_an || ""}`
                : "Thiết lập Giáo án mới"}
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
              <LucideIcon name="X" size={16} />
            </button>
          </div>

          {/* Core Grid Layout (2/3 Left Selection Info, 1/3 Right Resource Panel) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Selection Information Column (2/3 width) */}
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              {/* Build Title */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase  tracking-wider">
                  Tiêu đề lối lên đồ *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Đấu Sĩ Solo Đường, Sát Thủ Rừng Siêu Chí Mạng, Full Chống Chịu..."
                  className="w-full bg-slate-50/50 border border-slate-250/70 rounded px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-slate-800 font-bold placeholder:font-normal placeholder:text-slate-400"
                  required
                />
              </div>

              {/* Champion Indicator */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase  tracking-wider">
                  Tướng đề xuất
                </label>
                <div
                  onClick={() => activateSelector("champion")}
                  className={`relative border-2 rounded-md p-4 flex items-center gap-4 cursor-pointer transition-all ${
                    activeSelector.type === "champion"
                      ? "border-indigo-500 bg-indigo-50/20 shadow-md ring-2 ring-indigo-50"
                      : "border-slate-100 hover:border-slate-200 bg-slate-50/40"
                  }`}
                >
                  {selectedChampId ? (
                    (() => {
                      const champ = champions.find(
                        (c) => c.id === selectedChampId,
                      );
                      return (
                        <div className="flex items-center gap-4 w-full">
                          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 shadow-md shrink-0 relative">
                            <img
                              src={champ?.url_anh_dai_dien || ""}
                              alt="Champ"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="font-extrabold text-base text-slate-800">
                              {champ?.ten_tuong}
                            </h4>
                            <span className="inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                              {champ?.vai_tro || "Chưa rõ"}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Đang chọn tướng này. Nhấn vào để đổi ở bảng bên
                              phải.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleClearSlot(e, "champion")}
                            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            title="Xóa tướng"
                          >
                            <LucideIcon name="X" size={16} />
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-5 w-full text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2 border border-slate-150">
                        <LucideIcon name="UserPlus" size={20} />
                      </div>
                      <p className="text-xs font-bold text-slate-600">
                        Chưa chọn Tướng đề xuất
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Chọn tướng từ danh mục bên phải để tiếp tục
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 6 Equipment Slots */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-slate-400 uppercase  tracking-wider">
                    Lối lên đồ (6 ô trang bị) *
                  </label>
                  <span className="text-[9.5px] text-slate-400 font-medium">
                    Nhấp chọn ô để kích hoạt chọn nhanh
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3.5">
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const itemId = selectedItems[idx];
                    const item = items.find((i) => i.id === itemId);
                    const isActive =
                      activeSelector.type === "item" &&
                      activeSelector.index === idx;

                    return (
                      <div
                        key={idx}
                        onClick={() => activateSelector("item", idx)}
                        className={`relative aspect-square rounded-md border-2 flex flex-col items-center justify-center cursor-pointer transition-all p-2 ${
                          isActive
                            ? "border-indigo-500 bg-indigo-50/20 ring-4 ring-indigo-100 shadow-md scale-102"
                            : "border-slate-100 hover:border-slate-200 bg-slate-50/30"
                        }`}
                      >
                        <span className="absolute top-1.5 left-2 text-[8px] font-black text-slate-400 ">
                          Ô {idx + 1}
                        </span>

                        {item ? (
                          <div className="flex flex-col items-center justify-center w-full h-full mt-2">
                            <img
                              src={item.url_hinh_anh}
                              alt={item.ten_trang_bi}
                              className="w-11 h-11 object-cover rounded border border-slate-200 shadow-md"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[8.5px] font-black text-slate-600 mt-1.5 truncate w-full text-center">
                              {item.ten_trang_bi}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleClearSlot(e, "item", idx)}
                              className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full hover:scale-110 active:scale-95 shadow-md hover:bg-rose-600 transition-all cursor-pointer z-10"
                              title="Xóa trang bị"
                            >
                              <LucideIcon name="X" size={10} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 mt-2">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-350 border border-slate-150">
                              <LucideIcon name="Shield" size={14} />
                            </div>
                            <span className="text-[8.5px] font-bold text-slate-400 mt-1">
                              Nhấp chọn
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Spell Section */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase  tracking-wider">
                  Phép phụ trợ
                </label>
                <div
                  onClick={() => activateSelector("spell")}
                  className={`relative border-2 rounded-md p-3 flex items-center justify-between cursor-pointer transition-all max-w-sm ${
                    activeSelector.type === "spell"
                      ? "border-indigo-500 bg-indigo-50/20 shadow-md ring-2 ring-indigo-50"
                      : "border-slate-100 hover:border-slate-200 bg-slate-50/30"
                  }`}
                >
                  {selectedSpellId ? (
                    (() => {
                      const spell = spells.find(
                        (s) => s.id === selectedSpellId,
                      );
                      return (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <img
                              src={spell?.url_hinh_anh}
                              className="w-10 h-10 object-cover rounded-full border border-slate-200 shadow"
                              alt="Spell"
                              referrerPolicy="no-referrer"
                            />
                            <div className="text-left">
                              <span className="font-extrabold text-xs text-slate-800">
                                {spell?.ten_phu_tro}
                              </span>
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                Chọn phép phụ trợ khuyên dùng.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleClearSlot(e, "spell")}
                            className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            title="Xóa phép"
                          >
                            <LucideIcon name="X" size={14} />
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex items-center gap-2.5 text-slate-400 w-full justify-center py-1.5">
                      <LucideIcon name="Plus" size={14} />
                      <span className="text-xs font-bold text-slate-500">
                        Chưa chọn phép phụ trợ
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Badges Layout Selection (4 Main, 2 Sub, 2 Sub) */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black text-slate-400 uppercase  tracking-wider">
                    Thiết lập hệ thống Phù hiệu
                  </label>
                  <span className="text-[9.5px] text-slate-400 font-medium">
                    Chọn lần lượt từng vị trí phù hiệu
                  </span>
                </div>

                {/* Main Branch - 4 Slots */}
                <div className="bg-slate-50/50 p-4 rounded-md border border-slate-100 space-y-3">
                  <span className="text-[10px] font-black uppercase text-indigo-600  tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-3 rounded-full bg-indigo-600"></span>
                    Nhánh Chính (1 ô chọn nhánh + 3 ô phù hiệu)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      "NHANH_CHINH_1",
                      "NHANH_CHINH_2",
                      "NHANH_CHINH_3",
                      "NHANH_CHINH_4",
                    ].map((key, idx) => {
                      const badgeId = selectedBadges[key];
                      const badge = badges.find((b) => b.id === badgeId);
                      const isActive =
                        activeSelector.type === "badge" &&
                        activeSelector.key === key;

                      return (
                        <div
                          key={key}
                          onClick={() =>
                            activateSelector("badge", undefined, key)
                          }
                          className={`relative p-3.5 rounded border flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all ${
                            isActive
                              ? "border-indigo-500 bg-indigo-50/20 ring-4 ring-indigo-100 shadow-md scale-102"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <span className="text-[8px] font-black text-slate-400  uppercase tracking-wider">
                            {idx === 0
                              ? "Chọn Nhánh"
                              : `Phù hiệu ${idx === 1 ? "I" : idx === 2 ? "II" : "III"}`}
                          </span>
                          {badge ? (
                            <div className="flex flex-col items-center justify-center w-full mt-1.5">
                              <img
                                src={badge.url_hinh_anh}
                                className="w-10 h-10 object-cover rounded-full border border-slate-200 shadow-sm"
                                alt="Badge"
                                referrerPolicy="no-referrer"
                              />
                              <span className="text-[8.5px] font-black text-slate-600 mt-1.5 truncate w-full">
                                {badge.ten_phu_hieu}
                              </span>
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleClearSlot(e, "badge", undefined, key)
                                }
                                className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full hover:scale-110 shadow hover:bg-rose-600 transition-all"
                              >
                                <LucideIcon name="X" size={8} />
                              </button>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-50 border border-dashed border-slate-250 flex items-center justify-center text-slate-350 mt-1.5">
                              <LucideIcon name="Plus" size={14} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-branches (2 slots each) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nhánh Phụ 1 - 2 slots */}
                  <div className="bg-slate-50/50 p-4 rounded-md border border-slate-100 space-y-3">
                    <span className="text-[10px] font-black uppercase text-amber-600  tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-3 rounded-full bg-amber-500"></span>
                      Nhánh Phụ 1 (1 ô chọn nhánh + 1 ô phù hiệu)
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {["NHANH_PHU_1_1", "NHANH_PHU_1_2"].map((key, idx) => {
                        const badgeId = selectedBadges[key];
                        const badge = badges.find((b) => b.id === badgeId);
                        const isActive =
                          activeSelector.type === "badge" &&
                          activeSelector.key === key;

                        return (
                          <div
                            key={key}
                            onClick={() =>
                              activateSelector("badge", undefined, key)
                            }
                            className={`relative p-3.5 rounded border flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all ${
                              isActive
                                ? "border-amber-500 bg-amber-50/20 ring-4 ring-amber-100 shadow-md scale-102"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <span className="text-[8px] font-black text-slate-400  uppercase tracking-wider">
                              {idx === 0 ? "Chọn Nhánh" : "Phù hiệu"}
                            </span>
                            {badge ? (
                              <div className="flex flex-col items-center justify-center w-full mt-1.5">
                                <img
                                  src={badge.url_hinh_anh}
                                  className="w-10 h-10 object-cover rounded-full border border-slate-200 shadow-sm"
                                  alt="Badge"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[8.5px] font-black text-slate-600 mt-1.5 truncate w-full">
                                  {badge.ten_phu_hieu}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleClearSlot(e, "badge", undefined, key)
                                  }
                                  className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full hover:scale-110 shadow hover:bg-rose-600 transition-all"
                                >
                                  <LucideIcon name="X" size={8} />
                                </button>
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-50 border border-dashed border-slate-250 flex items-center justify-center text-slate-350 mt-1.5">
                                <LucideIcon name="Plus" size={14} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nhánh Phụ 2 - 2 slots */}
                  <div className="bg-slate-50/50 p-4 rounded-md border border-slate-100 space-y-3">
                    <span className="text-[10px] font-black uppercase text-emerald-600  tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-3 rounded-full bg-emerald-500"></span>
                      Nhánh Phụ 2 (1 ô chọn nhánh + 1 ô phù hiệu)
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {["NHANH_PHU_2_1", "NHANH_PHU_2_2"].map((key, idx) => {
                        const badgeId = selectedBadges[key];
                        const badge = badges.find((b) => b.id === badgeId);
                        const isActive =
                          activeSelector.type === "badge" &&
                          activeSelector.key === key;

                        return (
                          <div
                            key={key}
                            onClick={() =>
                              activateSelector("badge", undefined, key)
                            }
                            className={`relative p-3.5 rounded border flex flex-col items-center justify-center text-center gap-1 cursor-pointer transition-all ${
                              isActive
                                ? "border-emerald-500 bg-emerald-50/20 ring-4 ring-emerald-100 shadow-md scale-102"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <span className="text-[8px] font-black text-slate-400  uppercase tracking-wider">
                              {idx === 0 ? "Chọn Nhánh" : "Phù hiệu"}
                            </span>
                            {badge ? (
                              <div className="flex flex-col items-center justify-center w-full mt-1.5">
                                <img
                                  src={badge.url_hinh_anh}
                                  className="w-10 h-10 object-cover rounded-full border border-slate-200 shadow-sm"
                                  alt="Badge"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="text-[8.5px] font-black text-slate-600 mt-1.5 truncate w-full">
                                  {badge.ten_phu_hieu}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleClearSlot(e, "badge", undefined, key)
                                  }
                                  className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 text-white rounded-full hover:scale-110 shadow hover:bg-rose-600 transition-all"
                                >
                                  <LucideIcon name="X" size={8} />
                                </button>
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-50 border border-dashed border-slate-250 flex items-center justify-center text-slate-350 mt-1.5">
                                <LucideIcon name="Plus" size={14} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Arcana inputs */}
              <div className="space-y-3 pt-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase  tracking-wider">
                  Bảng Ngọc đề xuất (Nhập văn bản, nhấn Enter để xuống dòng)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                      Ngọc Đỏ x10
                    </span>
                    <textarea
                      rows={3}
                      value={ngocDo}
                      onChange={(e) => setNgocDo(e.target.value)}
                      placeholder="Ví dụ:&#10;Công vật lý / Xuyên giáp&#10;Tốc đánh"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-rose-500 text-slate-700 font-medium resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-purple-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                      Ngọc Tím x10
                    </span>
                    <textarea
                      rows={3}
                      value={ngocTim}
                      onChange={(e) => setNgocTim(e.target.value)}
                      placeholder="Ví dụ:&#10;Tốc đánh&#10;Tốc chạy"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-purple-500 text-slate-700 font-medium resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Ngọc Lục x10
                    </span>
                    <textarea
                      rows={3}
                      value={ngocXanh}
                      onChange={(e) => setNgocXanh(e.target.value)}
                      placeholder="Ví dụ:&#10;Công phép&#10;Giảm hồi chiêu"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-700 font-medium resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Is Active Display */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="g_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-350 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label
                  htmlFor="g_active"
                  className="text-xs font-bold text-slate-500 select-none cursor-pointer"
                >
                  Kích hoạt hiển thị công khai lối lên đồ này
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded border border-slate-200 hover:bg-slate-50 text-xs font-extrabold text-slate-500 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded text-xs font-extrabold text-white transition-all hover:brightness-110 active:scale-95 flex items-center gap-1.5 shadow-md cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                >
                  {loading && (
                    <LucideIcon
                      name="RefreshCw"
                      size={12}
                      className="animate-spin"
                    />
                  )}
                  Lưu Giáo Án
                </button>
              </div>
            </div>

            {/* Right Resource Panel Column (1/3 width) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4 lg:sticky lg:top-6">
              <div className="pb-2 border-b border-slate-100">
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <LucideIcon
                    name="Compass"
                    className="text-indigo-500"
                    size={14}
                  />
                  Thư Viện Liên Quân
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">
                  Chọn từ danh sách dưới để gán nhanh vào vị trí đang active bên
                  trái.
                </p>
              </div>

              {/* Right panel search bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded pl-8 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
                />
                <LucideIcon
                  name="Search"
                  className="absolute left-2.5 top-2.5 text-slate-400"
                  size={13}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <LucideIcon name="X" size={12} />
                  </button>
                )}
              </div>

              {/* Resource Tabs Header */}
              <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1 rounded">
                {[
                  { id: "champion", label: "Tướng" },
                  { id: "item", label: "Trang bị" },
                  { id: "badge", label: "Phù hiệu" },
                  { id: "spell", label: "Phụ trợ" },
                ].map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setRightTab(tab.id as any)}
                    className={`py-1.5 rounded-lg text-[9px] font-black transition-all ${
                      rightTab === tab.id
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}

              {/* Champion list */}
              {rightTab === "champion" && (
                <div className="space-y-3">
                  <div className="max-h-[350px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                    {champions
                      .filter((c) => {
                        const matchesSearch =
                          c.ten_tuong
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          (c.vai_tro &&
                            c.vai_tro
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()));
                        const matchesRole =
                          champRole === "ALL" ||
                          (c.vai_tro && c.vai_tro.includes(champRole));
                        const matchesLane = matchChampLane(c, champLane);
                        return matchesSearch && matchesRole && matchesLane;
                      })
                      .map((c) => {
                        const isSelected = selectedChampId === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() =>
                              handleSelectFromRightList(c.id, c.ten_tuong)
                            }
                            className={`flex items-center gap-2.5 p-2 rounded border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-indigo-50 border-indigo-200 text-indigo-800 shadow-sm"
                                : "border-slate-100 hover:bg-slate-50 bg-white hover:border-slate-200"
                            }`}
                          >
                            <img
                              src={c.url_anh_dai_dien || ""}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <span className="block font-bold text-xs truncate">
                                {c.ten_tuong}
                              </span>
                              <span className="block text-[8.5px] text-slate-400 truncate">
                                {c.vai_tro || "Chưa rõ"}
                              </span>
                            </div>
                            {isSelected && (
                              <LucideIcon
                                name="Check"
                                size={12}
                                className="text-indigo-600 shrink-0"
                              />
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Select filters below */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-50">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 block">
                        Vai trò
                      </label>
                      <select
                        value={champRole}
                        onChange={(e) => setChampRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-indigo-500 text-slate-700 font-semibold"
                      >
                        <option value="ALL">Tất cả vai trò</option>
                        <option value="Đấu sĩ">Đấu sĩ</option>
                        <option value="Sát thủ">Sát thủ</option>
                        <option value="Pháp sư">Pháp sư</option>
                        <option value="Xạ thủ">Xạ thủ</option>
                        <option value="Đỡ đòn">Đỡ đòn</option>
                        <option value="Trợ thủ">Trợ thủ</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 block">
                        Đường đi (Lane)
                      </label>
                      <select
                        value={champLane}
                        onChange={(e) => setChampLane(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:border-indigo-500 text-slate-700 font-semibold"
                      >
                        <option value="ALL">Tất cả các đường</option>
                        <option value="Caesar">Đường Tà Thần</option>
                        <option value="Rừng">Đường Rừng</option>
                        <option value="Giữa">Đường Giữa</option>
                        <option value="Rồng">Đường Rồng</option>
                        <option value="Trợ thủ">Trợ thủ (Roam)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Items list with categorization filters */}
              {rightTab === "item" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1 pb-1 border-b border-slate-50">
                    {[
                      { code: "ALL", label: "Tất cả" },
                      { code: "CONG", label: "Công" },
                      { code: "PHEP", label: "Phép" },
                      { code: "THU", label: "Thủ" },
                      { code: "TOC_CHAY", label: "Tốc" },
                      { code: "RUNG", label: "Rừng" },
                      { code: "TRO_THU", label: "Trợ" },
                    ].map((cat) => (
                      <button
                        type="button"
                        key={cat.code}
                        onClick={() => setItemCategory(cat.code)}
                        className={`px-1.5 py-1 rounded-lg text-[8.5px] font-black transition-all ${
                          itemCategory === cat.code
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto pr-1 grid grid-cols-2 gap-2 scrollbar-thin">
                    {items
                      .filter((item) => {
                        const matchesSearch = item.ten_trang_bi
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase());
                        const normalizedLoai = normalizeItemCategory(item.loai);
                        const matchesCat =
                          itemCategory === "ALL" ||
                          normalizedLoai === itemCategory;
                        return matchesSearch && matchesCat;
                      })
                      .map((item) => {
                        const isEquippedInActive =
                          activeSelector.type === "item" &&
                          selectedItems[activeSelector.index ?? 0] === item.id;
                        const isAnywhere = selectedItems.includes(item.id);

                        return (
                          <div
                            key={item.id}
                            onClick={() =>
                              handleSelectFromRightList(
                                item.id,
                                item.ten_trang_bi,
                              )
                            }
                            className={`p-2 rounded border cursor-pointer transition-all flex flex-col items-center text-center gap-1.5 relative ${
                              isEquippedInActive
                                ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50 shadow-sm"
                                : isAnywhere
                                  ? "bg-slate-50 border-slate-200 opacity-75"
                                  : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-250"
                            }`}
                            title={item.mo_ta || ""}
                          >
                            <img
                              src={item.url_hinh_anh}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[8.5px] font-black text-slate-700 truncate w-full">
                              {item.ten_trang_bi}
                            </span>
                            {isEquippedInActive && (
                              <span className="absolute top-1 right-1 bg-indigo-600 text-white text-[7px] rounded-full p-0.5">
                                <LucideIcon name="Check" size={6} />
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Badges list */}
              {rightTab === "badge" &&
                (() => {
                  const activeKey = activeSelector.key;
                  const isBranchSlot =
                    activeKey === "NHANH_CHINH_1" ||
                    activeKey === "NHANH_PHU_1_1" ||
                    activeKey === "NHANH_PHU_2_1";

                  if (isBranchSlot) {
                    const branchBadges = badges.filter((b) =>
                      branchRepresentativeIds.includes(b.id),
                    );
                    return (
                      <div className="space-y-3">
                        <div className="text-left py-1">
                          <span className="text-[10px] font-black uppercase text-indigo-600  tracking-wider">
                            Chọn Loại Phân Nhánh:
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Chọn 1 trong 4 phân nhánh phù hiệu chính dưới đây:
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                          {branchBadges.map((b) => {
                            const isEquippedInActive =
                              activeKey && selectedBadges[activeKey] === b.id;
                            return (
                              <div
                                key={b.id}
                                onClick={() =>
                                  handleSelectFromRightList(
                                    b.id,
                                    b.ten_phu_hieu,
                                  )
                                }
                                className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-all ${
                                  isEquippedInActive
                                    ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-50 text-indigo-800"
                                    : "border-slate-100 hover:bg-slate-50 bg-white hover:border-slate-200 shadow-sm"
                                }`}
                              >
                                <img
                                  src={b.url_hinh_anh}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                                  alt=""
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex-1 min-w-0 text-left">
                                  <span className="block font-black text-xs text-slate-800">
                                    {b.ten_phu_hieu}
                                  </span>
                                  <span className="block text-[10px] text-slate-400 font-medium">
                                    Click để chọn nhánh này
                                  </span>
                                </div>
                                {isEquippedInActive && (
                                  <LucideIcon
                                    name="Check"
                                    size={16}
                                    className="text-indigo-600 shrink-0"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  // If it is a functional badge slot (I, II, III)
                  const parentKeyMap: Record<string, string> = {
                    NHANH_CHINH_2: "NHANH_CHINH_1",
                    NHANH_CHINH_3: "NHANH_CHINH_1",
                    NHANH_CHINH_4: "NHANH_CHINH_1",
                    NHANH_PHU_1_2: "NHANH_PHU_1_1",
                    NHANH_PHU_2_2: "NHANH_PHU_2_1",
                  };
                  const parentKey = activeKey ? parentKeyMap[activeKey] : null;
                  const parentId = parentKey ? selectedBadges[parentKey] : null;

                  if (!parentId) {
                    return (
                      <div className="p-8 text-center text-slate-500 text-xs font-semibold space-y-3 bg-slate-50 rounded-md border border-slate-100">
                        <LucideIcon
                          name="AlertCircle"
                          className="mx-auto text-amber-500"
                          size={32}
                        />
                        <p className="font-extrabold text-slate-700">
                          Chưa chọn loại nhánh
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          Vui lòng nhấp chọn ô "Chọn Nhánh" đầu tiên để thiết
                          lập loại nhánh cho nhánh này trước.
                        </p>
                      </div>
                    );
                  }

                  const parentBadge = badges.find((b) => b.id === parentId);
                  const parentBranch = parentBadge
                    ? getBadgeBranch(parentBadge)
                    : "KHAC";
                  const branchLabelMap: Record<string, string> = {
                    VUC_HON_MANG: "Vực Hỗn Mang",
                    THAP_QUANG_MINH: "Tháp Quang Minh",
                    THANH_KHOI_NGUYEN: "Thành Khởi Nguyên",
                    RUNG_NGUYEN_SINH: "Rừng Nguyên Sinh",
                  };

                  const filteredBadges = badges.filter((b) => {
                    const bBranch = getBadgeBranch(b);
                    const isSameBranch = bBranch === parentBranch;
                    const isNotRep = !branchRepresentativeIds.includes(b.id);
                    const matchesSearch = b.ten_phu_hieu
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase());
                    return isSameBranch && isNotRep && matchesSearch;
                  });

                  return (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-indigo-50/50 p-2 rounded border border-indigo-100/40 text-left">
                        <div>
                          <span className="block text-[8px] font-black uppercase text-indigo-700 tracking-wider">
                            Đang xem nhánh:
                          </span>
                          <span className="block font-black text-[11px] text-slate-800">
                            {branchLabelMap[parentBranch] || parentBranch}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                          {filteredBadges.length} phù hiệu
                        </span>
                      </div>

                      <div className="max-h-[350px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                        {filteredBadges.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            Không tìm thấy phù hiệu nào phù hợp.
                          </div>
                        ) : (
                          filteredBadges.map((b) => {
                            const isEquippedInActive =
                              activeKey && selectedBadges[activeKey] === b.id;
                            const isAnywhere = Object.values(
                              selectedBadges,
                            ).includes(b.id);

                            return (
                              <div
                                key={b.id}
                                onClick={() =>
                                  handleSelectFromRightList(
                                    b.id,
                                    b.ten_phu_hieu,
                                  )
                                }
                                className={`flex items-center gap-2.5 p-2 rounded border cursor-pointer transition-all ${
                                  isEquippedInActive
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                                    : isAnywhere
                                      ? "bg-slate-50 border-slate-200 opacity-80"
                                      : "border-slate-100 hover:bg-slate-50 bg-white hover:border-slate-200"
                                }`}
                              >
                                <img
                                  src={b.url_hinh_anh}
                                  className="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-sm shrink-0"
                                  alt=""
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex-1 min-w-0 text-left">
                                  <span className="block font-bold text-xs truncate">
                                    {b.ten_phu_hieu}
                                  </span>
                                </div>
                                {isEquippedInActive && (
                                  <LucideIcon
                                    name="Check"
                                    size={12}
                                    className="text-indigo-600 shrink-0"
                                  />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}

              {/* Spells list */}
              {rightTab === "spell" && (
                <div className="space-y-3">
                  <div className="max-h-[350px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                    {spells
                      .filter((s) =>
                        s.ten_phu_tro
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()),
                      )
                      .map((s) => {
                        const isSelected = selectedSpellId === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() =>
                              handleSelectFromRightList(s.id, s.ten_phu_tro)
                            }
                            className={`flex items-center gap-2.5 p-2.5 rounded border cursor-pointer transition-all ${
                              isSelected
                                ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                                : "border-slate-100 hover:bg-slate-50 bg-white hover:border-slate-200"
                            }`}
                            title={s.mo_ta || ""}
                          >
                            <img
                              src={s.url_hinh_anh}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-sm"
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <span className="block font-bold text-xs truncate">
                                {s.ten_phu_tro}
                              </span>
                            </div>
                            {isSelected && (
                              <LucideIcon
                                name="Check"
                                size={12}
                                className="text-indigo-600 shrink-0"
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
        </form>
      ) : (
        /* Guides list view */
        <div className="grid grid-cols-1 gap-4.5">
          {guides.map((g) => (
            <div
              key={g.id}
              className="bg-white p-5 rounded-md border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-4">
                {/* Champion Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-100 shadow-inner shrink-0 relative">
                  {g.tuong?.url_anh_dai_dien ? (
                    <img
                      src={g.tuong.url_anh_dai_dien}
                      className="w-full h-full object-cover"
                      alt="Hero avatar"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                      <LucideIcon name="User" size={18} />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800">
                      {g.tuong?.ten_tuong || "Tướng ẩn"}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      {g.tuong?.vai_tro}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${g.kich_hoat ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}
                    >
                      {g.kich_hoat ? "Công khai" : "Ẩn"}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-700 text-xs mt-1.5 flex items-center gap-1">
                    <LucideIcon
                      name="Sword"
                      size={12}
                      className="text-rose-500"
                    />
                    {g.tieu_de_giao_an}
                  </h3>

                  {/* Render 6 Equipment images inline */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    {g.trang_bi_list?.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative group/item"
                        title={item.ten_trang_bi}
                      >
                        <img
                          src={item.url_hinh_anh}
                          className="w-7 h-7 object-cover rounded-md border border-slate-200"
                          alt="Equip icon"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons on the right */}
              <div className="flex items-center gap-2.5 self-end md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-50">
                <button
                  onClick={() => handleStartEdit(g)}
                  className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                >
                  <LucideIcon name="Edit" size={13} />
                  Sửa
                </button>
                <button
                  onClick={() => {
                    if (confirm("Bạn có chắc chắn muốn xóa bộ giáo án này?")) {
                      onDeleteGuide(g.id);
                    }
                  }}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 rounded transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                >
                  <LucideIcon name="Trash2" size={13} />
                  Xóa
                </button>
              </div>
            </div>
          ))}

          {guides.length === 0 && (
            <div className="text-center p-12 border border-dashed border-slate-200 rounded-md font-sans text-sm text-slate-400 bg-slate-50/50">
              Chưa có giáo án Liên Quân nào được tạo. Nhấp "Tạo Giáo Án Mới" để
              thiết lập bộ giáo án đầu tiên của bạn!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
