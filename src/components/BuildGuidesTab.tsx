import React, { useState, useEffect } from "react";
import {
  DBChampion,
  DBItem,
  DBSpell,
  DBBadge,
  DBBuildGuide,
  DBKhacChe,
  DBTopTier,
} from "../supabase";
import { dbService } from "../dbService";
import LucideIcon from "./LucideIcon";

const getBadgeBranch = (badge: DBBadge): string => {
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
  if (url.includes("rung_nguyen_sinh") || name.includes("rừng nguyên sinh")) {
    return "RUNG_NGUYEN_SINH";
  }
  return "KHAC";
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
    if (loai === 5) return "RUNG";
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

  // Admin Sub-Tab Navigation
  const [adminSection, setAdminSection] = useState<
    "giao_an" | "khac_che" | "top_tier"
  >("giao_an");

  // State for Khac Che Admin
  const [khacCheList, setKhacCheList] = useState<DBKhacChe[]>([]);
  const [kcTargetChampId, setKcTargetChampId] = useState<string>(
    champions[0]?.id || "",
  );
  const [kcCounterChampIds, setKcCounterChampIds] = useState<string[]>([]);
  const [kcCounterItemIds, setKcCounterItemIds] = useState<string[]>([]);
  const [kcSynergyChampIds, setKcSynergyChampIds] = useState<string[]>([]);
  const [kcGhiChuKhacChe, setKcGhiChuKhacChe] = useState<string>("");
  const [kcGhiChuPhoiHop, setKcGhiChuPhoiHop] = useState<string>("");
  const [kcSaving, setKcSaving] = useState<boolean>(false);
  const [kcMsg, setKcMsg] = useState<string>("");
  const [kcSearchFilter, setKcSearchFilter] = useState<string>("");
  const [kcTargetSearch, setKcTargetSearch] = useState<string>("");
  const [kcTargetRoleFilter, setKcTargetRoleFilter] = useState<string>("ALL");
  const [kcCounterSearch, setKcCounterSearch] = useState<string>("");
  const [kcItemSearch, setKcItemSearch] = useState<string>("");
  const [kcSynergySearch, setKcSynergySearch] = useState<string>("");
  const [showKcForm, setShowKcForm] = useState<boolean>(false);

  // State for Top Tier Admin
  const [topTierList, setTopTierList] = useState<DBTopTier[]>([]);
  const [ttVersion, setTtVersion] = useState<string>(
    "Mùa 2026 - Phiên bản mới",
  );
  const [ttLane, setTtLane] = useState<string>("Rừng");
  const [ttTier, setTtTier] = useState<string>("S");
  const [ttGhiChu, setTtGhiChu] = useState<string>("");
  const [ttChampSearch, setTtChampSearch] = useState<string>("");
  const [ttChampRoleFilter, setTtChampRoleFilter] = useState<string>("ALL");
  const [ttSaving, setTtSaving] = useState<boolean>(false);
  const [ttMsg, setTtMsg] = useState<string>("");
  const [showTtForm, setShowTtForm] = useState<boolean>(false);
  const [tierDrafts, setTierDrafts] = useState<Record<string, string[]>>({});
  const [adminTopTierLane, setAdminTopTierLane] = useState<string>("Tất cả");
  const [selectedVersion, setSelectedVersion] = useState<string>("");

  const availableVersions = Array.from(
    new Set(topTierList.map((item) => item.phien_ban).filter(Boolean)),
  );

  // Load Khac Che and Top Tier data on mount
  useEffect(() => {
    loadKhacCheData();
    loadTopTierData();
  }, []);

  // Sync Khac Che form state whenever target champion changes
  useEffect(() => {
    if (!kcTargetChampId) return;
    const existing = khacCheList.find((kc) => kc.tuong_id === kcTargetChampId);
    if (existing) {
      setKcCounterChampIds(existing.tuong_khac_che_ids || []);
      setKcCounterItemIds(existing.trang_bi_khac_che_ids || []);
      setKcSynergyChampIds(existing.tuong_phoi_hop_ids || []);
      setKcGhiChuKhacChe(existing.ghi_chu_khac_che || "");
      setKcGhiChuPhoiHop(existing.ghi_chu_phoi_hop || "");
    } else {
      setKcCounterChampIds([]);
      setKcCounterItemIds([]);
      setKcSynergyChampIds([]);
      setKcGhiChuKhacChe("");
      setKcGhiChuPhoiHop("");
    }
  }, [kcTargetChampId, khacCheList]);

  const loadKhacCheData = async () => {
    const list = await dbService.getKhacCheList();
    if (list) setKhacCheList(list);
  };

  const loadTopTierData = async () => {
    const list = await dbService.getTopTierList();
    if (list) {
      setTopTierList(list);
      if (list.length > 0 && list[0].phien_ban) {
        setTtVersion(list[0].phien_ban);
      }
      // Populate draft selections map from DB list
      const initialDrafts: Record<string, string[]> = {};
      for (const item of list) {
        const key = `${item.phandanh_lane}_${item.tier}`;
        if (!initialDrafts[key]) initialDrafts[key] = [];
        if (!initialDrafts[key].includes(item.tuong_id)) {
          initialDrafts[key].push(item.tuong_id);
        }
      }
      setTierDrafts(initialDrafts);
    }
  };

  // Helper to find assigned location for a champion in tierDrafts
  const getAssignedLocation = (
    champId: string,
  ): { lane: string; tier: string; key: string } | null => {
    for (const [key, ids] of Object.entries(tierDrafts)) {
      if (ids && ids.includes(champId)) {
        const parts = key.split("_");
        if (parts.length >= 2) {
          return { lane: parts[0], tier: parts[1], key };
        }
      }
    }
    return null;
  };

  // Toggle champion selection in Tier Drafts
  const toggleChampInTier = (champId: string) => {
    const activeKey = `${ttLane}_${ttTier}`;
    const currentList = tierDrafts[activeKey] || [];
    const isChecked = currentList.includes(champId);

    if (isChecked) {
      setTierDrafts((prev) => ({
        ...prev,
        [activeKey]: currentList.filter((id) => id !== champId),
      }));
    } else {
      const location = getAssignedLocation(champId);
      if (location && (location.lane !== ttLane || location.tier !== ttTier)) {
        setTtMsg(
          `Tướng này đã được xếp ở Đường ${location.lane} - Tier ${location.tier}. Không thể chọn lại!`,
        );
        setTimeout(() => setTtMsg(""), 4000);
        return;
      }
      setTierDrafts((prev) => ({
        ...prev,
        [activeKey]: [...currentList, champId],
      }));
    }
  };

  const selectAllInActiveTier = (candidateIds: string[]) => {
    const activeKey = `${ttLane}_${ttTier}`;
    const currentList = tierDrafts[activeKey] || [];
    const validIds = candidateIds.filter((id) => {
      const loc = getAssignedLocation(id);
      return !loc || (loc.lane === ttLane && loc.tier === ttTier);
    });
    const combined = Array.from(new Set([...currentList, ...validIds]));
    setTierDrafts((prev) => ({
      ...prev,
      [activeKey]: combined,
    }));
  };

  const deselectAllInActiveTier = () => {
    const activeKey = `${ttLane}_${ttTier}`;
    setTierDrafts((prev) => ({
      ...prev,
      [activeKey]: [],
    }));
  };

  // Handle Save Khac Che
  const handleSaveKhacChe = async () => {
    if (!kcTargetChampId) return;
    setKcSaving(true);
    setKcMsg("");
    try {
      const res = await dbService.saveKhacChe({
        tuong_id: kcTargetChampId,
        tuong_khac_che_ids: kcCounterChampIds,
        trang_bi_khac_che_ids: kcCounterItemIds,
        tuong_phoi_hop_ids: kcSynergyChampIds,
        ghi_chu_khac_che: kcGhiChuKhacChe,
        ghi_chu_phoi_hop: kcGhiChuPhoiHop,
      });
      if (res) {
        setKcMsg("Lưu cấu hình Khắc chế thành công!");
        await loadKhacCheData();
      }
    } catch (e) {
      setKcMsg("Lỗi khi lưu dữ liệu Khắc chế.");
    } finally {
      setKcSaving(false);
      setTimeout(() => setKcMsg(""), 3000);
    }
  };

  const handleDeleteKhacChe = async (id: string, tuongId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa cấu hình khắc chế này?")) return;
    await dbService.deleteKhacChe(id, tuongId);
    await loadKhacCheData();
  };

  // Handle Save Top Tier (Batch save all modified tiers across lanes)
  const handleSaveTopTier = async () => {
    setTtSaving(true);
    setTtMsg("");
    try {
      const targetVersion =
        ttVersion || selectedVersion || "Phiên bản hiện tại";
      const versionItems = topTierList.filter(
        (x) => (x.phien_ban || "Phiên bản hiện tại") === targetVersion,
      );

      const allKeys = new Set([
        ...Object.keys(tierDrafts),
        ...versionItems.map((x) => `${x.phandanh_lane}_${x.tier}`),
      ]);

      for (const key of allKeys) {
        const [lane, tier] = key.split("_");
        if (!lane || !tier) continue;

        const draftIds = tierDrafts[key] || [];
        const existingInKey = versionItems.filter(
          (x) => x.phandanh_lane === lane && x.tier === tier,
        );

        // Remove DB items no longer in draft
        const toRemove = existingInKey.filter(
          (x) => !draftIds.includes(x.tuong_id),
        );
        for (const item of toRemove) {
          await dbService.deleteTopTierItem(item.id, item.tuong_id, lane);
        }

        // Add newly checked draft items to DB
        const existingChampIds = existingInKey.map((x) => x.tuong_id);
        const toAdd = draftIds.filter((id) => !existingChampIds.includes(id));
        for (const champId of toAdd) {
          await dbService.saveTopTierItem({
            tuong_id: champId,
            phien_ban: targetVersion,
            phandanh_lane: lane,
            tier: tier,
            ghi_chu: ttGhiChu || "",
          });
        }
      }

      setTtMsg(
        `Đã lưu tất cả phân loại Top Tier cho phiên bản "${targetVersion}" thành công!`,
      );
      await loadTopTierData();
    } catch (e) {
      console.error(e);
      setTtMsg("Lỗi khi lưu Top Tier.");
    } finally {
      setTtSaving(false);
      setTimeout(() => setTtMsg(""), 4000);
    }
  };

  // Handle Delete Top Tier Item
  const handleDeleteTopTier = async (
    id: string,
    tuongId: string,
    lane: string,
  ) => {
    if (!confirm("Bạn có chắc muốn xóa tướng này khỏi Top Tier?")) return;
    await dbService.deleteTopTierItem(id, tuongId, lane);
    await loadTopTierData();
  };

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
    setIsActive(g.kich_hoat ?? false);

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

  const handleDuplicate = (g: DBBuildGuide) => {
    setEditingGuide(null); // Set to null so saving creates a new record
    setSelectedChampId(g.tuong_id);
    setTitle(`${g.tieu_de_giao_an} (Bản sao)`);
    setSelectedSpellId(g.phu_tro_id || "");
    setNgocDo(g.ngoc_do || "");
    setNgocTim(g.ngoc_tim || "");
    setNgocXanh(g.ngoc_xanh || "");
    setIsActive(g.kich_hoat ?? true);

    // Reconstruct item slots
    const remappedItems = Array(6).fill("");
    if (g.trang_bi_list) {
      g.trang_bi_list.forEach((item, index) => {
        if (index < 6) remappedItems[index] = item.id;
      });
    }
    setSelectedItems(remappedItems);

    // Reconstruct badges
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
    <div className="space-y-2">
      {/* Top Admin Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1">
        {[
          { id: "giao_an", label: "Trang Bị", icon: "Shield" },
          { id: "khac_che", label: "Khắc Chế", icon: "Swords" },
          { id: "top_tier", label: "Top Tier", icon: "Trophy" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setAdminSection(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
              adminSection === tab.id
                ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 border-[#fce3bc] font-black shadow-md"
                : "bg-slate-900 text-[#fce3bc] border-[#fce3bc]/30 hover:bg-slate-800"
            }`}
          >
            <LucideIcon name={tab.icon} size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Admin Section 1: Giáo Án Trang Bị */}
      {adminSection === "giao_an" && (
        <div className="space-y-2">
          {/* Tab Header */}
          <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900/50 p-3 border border-[#fce3bc]/50 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-[#fce3bc] tracking-tight flex items-center gap-2">
                <LucideIcon
                  name="Shield"
                  className="text-indigo-500"
                  size={20}
                />
                {isEditing
                  ? editingGuide
                    ? `Sửa: ${editingGuide.tieu_de_giao_an || ""}`
                    : "Tạo Giáo Án Mới"
                  : "Trang bị"}
              </h2>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Sao chép từ: Select directly in main header when editing */}
              {isEditing && guides.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-[#fce3bc] hidden sm:inline-block">
                    Sao chép từ:
                  </label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (selectedId) {
                        const targetG = guides.find((g) => g.id === selectedId);
                        if (targetG) {
                          handleDuplicate(targetG);
                        }
                        e.target.value = "";
                      }
                    }}
                    className="bg-slate-900 border border-[#fce3bc]/60 rounded px-2.5 py-1 text-xs text-[#fce3bc] font-semibold focus:outline-none focus:border-indigo-400 cursor-pointer"
                  >
                    <option value="" disabled>
                      -- Chọn lối lên đồ mẫu --
                    </option>
                    {guides.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.tuong?.ten_tuong ? `[${g.tuong.ten_tuong}] ` : ""}
                        {g.tieu_de_giao_an}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Toggle Button: 'Tạo Giáo Án Mới' or 'Hủy' */}
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    handleStartNew();
                  }
                }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 ${
                  isEditing
                    ? "bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/50"
                    : "text-white hover:brightness-115"
                }`}
                style={
                  !isEditing ? { backgroundColor: accentColor } : undefined
                }
              >
                {isEditing ? (
                  <>
                    <LucideIcon name="X" size={14} />
                    Hủy
                  </>
                ) : (
                  <>
                    <LucideIcon name="Plus" size={14} />
                    Tạo Giáo Án Mới
                  </>
                )}
              </button>
            </div>
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
              className="space-y-3 animate-in fade-in duration-200"
            >
              {/* Core Grid Layout (Mobile: Thư Viện Liên Quân top (order-1), Left Selection Info bottom (order-2)) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                {/* Left Selection Information Column (2/3 width on desktop: order-2 on mobile, order-1 on desktop) */}
                <div className="lg:col-span-8 order-2 lg:order-1 bg-slate-900/50 p-2 border border-[#fce3bc]/50 shadow-sm space-y-6">
                  {/* Build Title */}
                  <div className="space-y-1.5">
                    <label className="block text-[15px] font-black text-white uppercase  tracking-wider">
                      Tiêu đề lối lên đồ *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ví dụ: Full Chống Chịu..."
                      className="w-full bg-slate-900/50 border border-slate-250/70 rounded px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-[#fce3bc]/50 font-bold placeholder:font-normal placeholder:text-[#fce3bc]"
                      required
                    />
                  </div>

                  {/* Champion Indicator */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    {/* ===== BÊN TRÁI: TƯỚNG ĐỀ XUẤT ===== */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="block text-xs sm:text-[15px] font-black text-white uppercase tracking-wider truncate">
                        Tướng đề xuất
                      </label>
                      <div
                        onClick={() => activateSelector("champion")}
                        className={`relative p-2 sm:p-4 border transition-all cursor-pointer min-h-[70px] sm:min-h-[100px] flex items-center ${
                          activeSelector.type === "champion"
                            ? "border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/50"
                            : "border-[#fce3bc]/50 bg-slate-900/60"
                        }`}
                      >
                        {selectedChampId ? (
                          (() => {
                            const champ = champions.find(
                              (c) => c.id === selectedChampId,
                            );
                            return (
                              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full">
                                <div className="w-10 h-10 sm:w-14 sm:h-14 overflow-hidden border-2 border-[#fce3bc]/50/40 shadow-md shrink-0 relative bg-slate-800">
                                  <img
                                    src={champ?.url_anh_dai_dien || ""}
                                    alt={champ?.ten_tuong || "Champion"}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>

                                {/* Text: Ẩn hoàn toàn trên Mobile (hidden), chỉ hiện từ Màn hình Small trở lên (sm:block) */}
                                <div className="hidden sm:block flex-1 min-w-0 text-left">
                                  <h4 className="font-extrabold text-sm text-[#fce3bc] truncate">
                                    {champ?.ten_tuong || "Chưa chọn"}
                                  </h4>
                                  <p className="text-[10px] text-[#fce3bc]/70 mt-1 line-clamp-1">
                                    Nhấn để đổi ở bảng danh mục bên phải
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleClearSlot(e, "champion")
                                  }
                                  className="p-1 sm:p-1.5 hover:bg-red-500/20 text-[#fce3bc]/70 hover:text-red-400 transition-colors shrink-0"
                                  title="Xóa tướng"
                                >
                                  <LucideIcon name="X" size={16} />
                                </button>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="flex flex-col items-center justify-center py-1 sm:py-2 w-full text-center">
                            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-slate-800/80 flex items-center justify-center text-[#fce3bc] mb-1 border border-[#fce3bc]/50/20">
                              <LucideIcon
                                name="UserPlus"
                                size={16}
                                className="sm:w-[18px] sm:h-[18px]"
                              />
                            </div>
                            <p className="text-[10px] sm:text-xs font-bold text-[#fce3bc] leading-tight">
                              Chưa chọn
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ===== BÊN PHẢI: PHÉP PHỤ TRỢ ===== */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <label className="block text-xs sm:text-[15px] font-black text-white uppercase tracking-wider truncate">
                        Phép phụ trợ
                      </label>
                      <div
                        onClick={() => activateSelector("spell")}
                        className={`relative p-2 sm:p-4 border transition-all cursor-pointer min-h-[70px] sm:min-h-[100px] flex items-center ${
                          activeSelector.type === "spell"
                            ? "border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/50"
                            : "border-[#fce3bc]/50 bg-slate-900/60"
                        }`}
                      >
                        {selectedSpellId ? (
                          (() => {
                            const spell = spells.find(
                              (s) => s.id === selectedSpellId,
                            );
                            return (
                              <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3.5 w-full">
                                <div className="w-10 h-10 sm:w-14 sm:h-14 overflow-hidden border-2 border-[#fce3bc]/50/40 shadow-md shrink-0 relative bg-slate-800 p-0.5 sm:p-1 flex items-center justify-center">
                                  <img
                                    src={spell?.url_hinh_anh ?? undefined}
                                    className="w-full h-full object-cover"
                                    alt={spell?.ten_phu_tro || "Spell"}
                                    referrerPolicy="no-referrer"
                                  />
                                </div>

                                {/* Text: Ẩn hoàn toàn trên Mobile (hidden), chỉ hiện từ Màn hình Small trở lên (sm:block) */}
                                <div className="hidden sm:block flex-1 min-w-0 text-left">
                                  <h4 className="font-extrabold text-sm text-[#fce3bc] truncate">
                                    {spell?.ten_phu_tro}
                                  </h4>
                                  <p className="text-[10px] text-[#fce3bc]/70 mt-1 line-clamp-2">
                                    Phép phụ trợ khuyên dùng cho trận đấu.
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => handleClearSlot(e, "spell")}
                                  className="p-1 sm:p-1.5 hover:bg-red-500/20 text-[#fce3bc]/70 hover:text-red-400 transition-colors shrink-0"
                                  title="Xóa phép"
                                >
                                  <LucideIcon name="X" size={16} />
                                </button>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="flex flex-col items-center justify-center py-1 sm:py-2 w-full text-center">
                            <div className="w-7 h-7 sm:w-10 sm:h-10 bg-slate-800/80 flex items-center justify-center text-[#fce3bc] mb-1 border border-[#fce3bc]/50/20">
                              <LucideIcon
                                name="Plus"
                                size={16}
                                className="sm:w-[18px] sm:h-[18px]"
                              />
                            </div>
                            <p className="text-[10px] sm:text-xs font-bold text-[#fce3bc] leading-tight">
                              Chưa chọn
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 6 Equipment Slots */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs sm:text-[15px] font-black text-white uppercase tracking-wider">
                        Lối lên đồ
                      </label>
                    </div>

                    {/* Grid 6 ô luôn thẳng hàng kể cả Mobile */}
                    <div className="grid grid-cols-6 gap-1 sm:gap-2.5">
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
                            className={`relative aspect-square border transition-all cursor-pointer flex items-center justify-center overflow-hidden p-0 ${
                              isActive
                                ? "border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/50 shadow-lg"
                                : "border-[#fce3bc]/30 hover:border-[#fce3bc] bg-slate-900/60"
                            }`}
                          >
                            {item ? (
                              <div className="relative w-full h-full">
                                {/* Ảnh trang bị tràn viền slot */}
                                <img
                                  src={item.url_hinh_anh ?? undefined}
                                  alt={item.ten_trang_bi}
                                  className="w-full h-full object-cover block"
                                  referrerPolicy="no-referrer"
                                />

                                {/* Dấu X đè góc trên bên phải ảnh */}
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    handleClearSlot(e, "item", idx)
                                  }
                                  className="absolute top-0.5 right-0.5 p-0.5 bg-rose-600/90 text-white hover:bg-rose-700 transition-colors z-10 cursor-pointer"
                                  title="Xóa trang bị"
                                >
                                  <LucideIcon
                                    name="X"
                                    size={10}
                                    className="sm:w-3 sm:h-3"
                                  />
                                </button>
                              </div>
                            ) : (
                              /* Chưa có: Icon vuông nằm giữa kèm border bao quanh */
                              <div className="w-5 h-5 sm:w-9 sm:h-9 bg-slate-800 flex items-center justify-center text-[#fce3bc]/80 border border-[#fce3bc]/40">
                                <LucideIcon
                                  name="Shield"
                                  size={12}
                                  className="sm:w-5 sm:h-5"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Badges Layout Selection (4 Main, 2 Sub, 2 Sub) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs sm:text-[15px] font-black text-white uppercase tracking-wider">
                        Thiết lập hệ thống Phù hiệu
                      </label>
                    </div>

                    {/* ===== NHÁNH CHÍNH (4 Slots thẳng hàng cả trên Mobile) ===== */}
                    <div className="bg-slate-900/60 p-2 sm:p-3 border border-[#fce3bc]/30 space-y-2">
                      <span className="text-[10px] sm:text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-3 bg-indigo-500"></span>
                        Nhánh Chính
                      </span>

                      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
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

                          const isBranch = idx === 0;
                          const displayImg =
                            badge && isBranch
                              ? branchImageMap[getBadgeBranch(badge)] ||
                                badge.url_hinh_anh
                              : badge?.url_hinh_anh || null;

                          return (
                            <div
                              key={key}
                              onClick={() =>
                                activateSelector("badge", undefined, key)
                              }
                              className={`relative aspect-square border transition-all cursor-pointer flex items-center justify-center overflow-hidden p-0 ${
                                isActive
                                  ? "border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/50 shadow-lg"
                                  : "border-[#fce3bc]/30 hover:border-[#fce3bc] bg-slate-900/60"
                              }`}
                            >
                              {badge ? (
                                <div className="relative w-full h-full">
                                  <img
                                    src={displayImg ?? undefined}
                                    className="w-full h-full object-cover block"
                                    alt="Badge"
                                    referrerPolicy="no-referrer"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleClearSlot(
                                        e,
                                        "badge",
                                        undefined,
                                        key,
                                      )
                                    }
                                    className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 p-0.5 sm:p-1 bg-rose-600/90 text-white hover:bg-rose-700 transition-colors z-10 cursor-pointer"
                                    title="Xóa phù hiệu"
                                  >
                                    <LucideIcon
                                      name="X"
                                      size={10}
                                      className="sm:w-3.5 sm:h-3.5"
                                    />
                                  </button>
                                </div>
                              ) : (
                                <div className="w-6 h-6 sm:w-10 sm:h-10 bg-slate-800 flex items-center justify-center text-[#fce3bc]/80 border border-[#fce3bc]/40">
                                  <LucideIcon
                                    name="Plus"
                                    size={12}
                                    className="sm:w-5 sm:h-5"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ===== NHÁNH PHỤ 1 & 2 (Đã sửa grid-cols-2 cho Mobile) ===== */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      {/* NHÁNH PHỤ 1 */}
                      <div className="bg-slate-900/60 p-1.5 sm:p-3 border border-[#fce3bc]/30 space-y-2">
                        <span className="text-[9px] sm:text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1 sm:gap-1.5 truncate">
                          <span className="w-1.5 h-3 bg-amber-500 shrink-0"></span>
                          <span className="truncate">Nhánh Phụ 1</span>
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                          {["NHANH_PHU_1_1", "NHANH_PHU_1_2"].map(
                            (key, idx) => {
                              const badgeId = selectedBadges[key];
                              const badge = badges.find(
                                (b) => b.id === badgeId,
                              );
                              const isActive =
                                activeSelector.type === "badge" &&
                                activeSelector.key === key;

                              const isBranch = idx === 0;
                              const displayImg =
                                badge && isBranch
                                  ? branchImageMap[getBadgeBranch(badge)] ||
                                    badge.url_hinh_anh
                                  : badge?.url_hinh_anh || null;

                              return (
                                <div
                                  key={key}
                                  onClick={() =>
                                    activateSelector("badge", undefined, key)
                                  }
                                  className={`relative aspect-square border transition-all cursor-pointer flex items-center justify-center overflow-hidden p-0 ${
                                    isActive
                                      ? "border-amber-500 bg-amber-950/40 ring-2 ring-amber-500/50 shadow-lg"
                                      : "border-[#fce3bc]/30 hover:border-[#fce3bc] bg-slate-900/60"
                                  }`}
                                >
                                  {badge ? (
                                    <div className="relative w-full h-full">
                                      <img
                                        src={displayImg ?? undefined}
                                        className="w-full h-full object-cover block"
                                        alt="Badge"
                                        referrerPolicy="no-referrer"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) =>
                                          handleClearSlot(
                                            e,
                                            "badge",
                                            undefined,
                                            key,
                                          )
                                        }
                                        className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 p-0.5 sm:p-1 bg-rose-600/90 text-white hover:bg-rose-700 transition-colors z-10 cursor-pointer"
                                        title="Xóa phù hiệu"
                                      >
                                        <LucideIcon
                                          name="X"
                                          size={10}
                                          className="sm:w-3.5 sm:h-3.5"
                                        />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 sm:w-10 sm:h-10 bg-slate-800 flex items-center justify-center text-[#fce3bc]/80 border border-[#fce3bc]/40">
                                      <LucideIcon
                                        name="Plus"
                                        size={10}
                                        className="sm:w-5 sm:h-5"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>

                      {/* NHÁNH PHỤ 2 */}
                      <div className="bg-slate-900/60 p-1.5 sm:p-3 border border-[#fce3bc]/30 space-y-2">
                        <span className="text-[9px] sm:text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1 sm:gap-1.5 truncate">
                          <span className="w-1.5 h-3 bg-emerald-500 shrink-0"></span>
                          <span className="truncate">Nhánh Phụ 2</span>
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
                          {["NHANH_PHU_2_1", "NHANH_PHU_2_2"].map(
                            (key, idx) => {
                              const badgeId = selectedBadges[key];
                              const badge = badges.find(
                                (b) => b.id === badgeId,
                              );
                              const isActive =
                                activeSelector.type === "badge" &&
                                activeSelector.key === key;

                              const isBranch = idx === 0;
                              const displayImg =
                                badge && isBranch
                                  ? branchImageMap[getBadgeBranch(badge)] ||
                                    badge.url_hinh_anh
                                  : badge?.url_hinh_anh || null;

                              return (
                                <div
                                  key={key}
                                  onClick={() =>
                                    activateSelector("badge", undefined, key)
                                  }
                                  className={`relative aspect-square border transition-all cursor-pointer flex items-center justify-center overflow-hidden p-0 ${
                                    isActive
                                      ? "border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500/50 shadow-lg"
                                      : "border-[#fce3bc]/30 hover:border-[#fce3bc] bg-slate-900/60"
                                  }`}
                                >
                                  {badge ? (
                                    <div className="relative w-full h-full">
                                      <img
                                        src={displayImg ?? undefined}
                                        className="w-full h-full object-cover block"
                                        alt="Badge"
                                        referrerPolicy="no-referrer"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) =>
                                          handleClearSlot(
                                            e,
                                            "badge",
                                            undefined,
                                            key,
                                          )
                                        }
                                        className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 p-0.5 sm:p-1 bg-rose-600/90 text-white hover:bg-rose-700 transition-colors z-10 cursor-pointer"
                                        title="Xóa phù hiệu"
                                      >
                                        <LucideIcon
                                          name="X"
                                          size={10}
                                          className="sm:w-3.5 sm:h-3.5"
                                        />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 sm:w-10 sm:h-10 bg-slate-800 flex items-center justify-center text-[#fce3bc]/80 border border-[#fce3bc]/40">
                                      <LucideIcon
                                        name="Plus"
                                        size={10}
                                        className="sm:w-5 sm:h-5"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Arcana inputs */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-[10px] font-black text-[#fce3bc] uppercase  tracking-wider">
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
                          className="w-full bg-slate-900/50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-rose-500 text-[#fce3bc] font-medium resize-none"
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
                          className="w-full bg-slate-900/50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-purple-500 text-[#fce3bc] font-medium resize-none"
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
                          className="w-full bg-slate-900/50 border border-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 text-[#fce3bc] font-medium resize-none"
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
                      className="text-xs font-bold text-[#fce3bc] select-none cursor-pointer"
                    >
                      Kích hoạt hiển thị công khai lối lên đồ này
                    </label>
                  </div>

                  {/* Form Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-[#fce3bc]/50">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2.5 rounded border border-slate-200 hover:bg-slate-900/50 text-xs font-extrabold text-[#fce3bc] transition-colors cursor-pointer"
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

                {/* Right Resource Panel Column (1/3 width on desktop: order-1 on mobile so it pins at the top) */}
                <div className="lg:col-span-4 order-1 lg:order-2 bg-slate-900/50 p-3 sm:p-5 border border-[#fce3bc]/50 shadow-sm space-y-4 lg:sticky lg:top-6">
                  <div className="pb-2 border-b border-[#fce3bc]/50">
                    <h3 className="font-black text-[#fce3bc] text-xs uppercase tracking-wider flex items-center gap-2">
                      Thư Viện Liên Quân
                    </h3>
                  </div>

                  {/* Right panel search bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm kiếm..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-900/50 border border-[#fce3bc]/50 rounded pl-8 pr-4 py-2 text-xs focus:outline-none focus:border-[#fce3bc] text-[#fce3bc] placeholder-[#fce3bc]/60"
                    />
                    <LucideIcon
                      name="Search"
                      className="absolute left-2.5 top-2.5 text-[#fce3bc]"
                      size={13}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2.5 top-2.5 text-[#fce3bc] hover:opacity-80"
                      >
                        <LucideIcon name="X" size={12} />
                      </button>
                    )}
                  </div>

                  {/* Resource Tabs Header */}
                  <div className="grid grid-cols-4 gap-1 bg-slate-900/50 p-1 rounded border border-[#fce3bc]/30">
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
                        className={`py-1.5 text-[9px] font-black rounded transition-all ${
                          rightTab === tab.id
                            ? "bg-gradient-to-r from-[#ffe8b3] via-[#fce3bc] to-[#e6b800] text-slate-950 shadow-md border border-[#fce3bc]"
                            : "text-[#fce3bc] hover:bg-slate-800/80"
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
                      <div className="max-h-[350px] overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-4 gap-1.5 sm:gap-3 scrollbar-thin">
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
                                className="cursor-pointer transition-all flex flex-col items-center justify-center text-center relative group p-0.5 sm:p-1 rounded"
                                title={`${c.ten_tuong} (${c.vai_tro || "Chưa rõ"})`}
                              >
                                <div className="relative w-full max-w-[48px] sm:max-w-none aspect-square mx-auto">
                                  <img
                                    src={c.url_anh_dai_dien || ""}
                                    className={`w-full h-full object-cover border-2 transition-all ${
                                      isSelected
                                        ? "border-[#fce3bc] ring-2 ring-[#fce3bc] shadow-[0_0_10px_rgba(252,227,188,0.6)]"
                                        : "border-[#fce3bc]/50 opacity-85 hover:opacity-100"
                                    }`}
                                    alt={c.ten_tuong}
                                    referrerPolicy="no-referrer"
                                  />
                                  {isSelected && (
                                    <span className="absolute top-0 right-0 bg-amber-400 text-slate-950 text-[7px] p-0.5 shadow font-bold">
                                      <LucideIcon name="Check" size={8} />
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`block text-[8px] sm:text-[9.5px] truncate w-full text-center mt-1 px-1 py-0.5 rounded transition-all ${
                                    isSelected
                                      ? "bg-gradient-to-r from-[#ffe8b3] via-[#fce3bc] to-[#e6b800] text-slate-950 font-black"
                                      : "text-[#fce3bc] font-bold"
                                  }`}
                                >
                                  {c.ten_tuong}
                                </span>
                              </div>
                            );
                          })}
                      </div>

                      {/* Select filters below */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#fce3bc]/30">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-[#fce3bc] block">
                            Vai trò
                          </label>
                          <select
                            value={champRole}
                            onChange={(e) => setChampRole(e.target.value)}
                            className="w-full bg-slate-900/50 border border-[#fce3bc]/50 px-2 py-1 text-[10px] focus:outline-none focus:border-[#fce3bc] text-[#fce3bc] font-semibold"
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
                          <label className="text-[9px] font-bold text-[#fce3bc] block">
                            Đường đi (Lane)
                          </label>
                          <select
                            value={champLane}
                            onChange={(e) => setChampLane(e.target.value)}
                            className="w-full bg-slate-900/50 border border-[#fce3bc]/50 px-2 py-1 text-[10px] focus:outline-none focus:border-[#fce3bc] text-[#fce3bc] font-semibold"
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
                      <div className="flex flex-wrap gap-1 pb-1 border-b border-[#fce3bc]/30">
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
                            className={`px-1.5 py-1 text-[8.5px] font-black transition-all rounded ${
                              itemCategory === cat.code
                                ? "bg-gradient-to-r from-[#ffe8b3] via-[#fce3bc] to-[#e6b800] text-slate-950 border border-[#fce3bc]"
                                : "bg-slate-900/50 text-[#fce3bc] hover:bg-slate-800/80 border border-transparent"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      <div className="max-h-[300px] overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-4 gap-1.5 sm:gap-3 scrollbar-thin">
                        {items
                          .filter((item) => {
                            const matchesSearch = item.ten_trang_bi
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase());
                            const normalizedLoai = normalizeItemCategory(
                              item.loai,
                            );
                            const matchesCat =
                              itemCategory === "ALL" ||
                              normalizedLoai === itemCategory;
                            return matchesSearch && matchesCat;
                          })
                          .map((item) => {
                            const isEquippedInActive =
                              activeSelector.type === "item" &&
                              selectedItems[activeSelector.index ?? 0] ===
                                item.id;
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
                                className="cursor-pointer transition-all flex flex-col items-center justify-center text-center relative group p-0.5 sm:p-1 rounded"
                                title={item.mo_ta || ""}
                              >
                                <div className="relative w-full max-w-[48px] sm:max-w-none aspect-square mx-auto">
                                  <img
                                    src={item.url_hinh_anh ?? undefined}
                                    className={`w-full h-full object-cover border-2 transition-all ${
                                      isEquippedInActive
                                        ? "border-[#fce3bc] ring-2 ring-[#fce3bc] shadow-[0_0_10px_rgba(252,227,188,0.6)]"
                                        : isAnywhere
                                          ? "border-[#fce3bc]/30 opacity-50"
                                          : "border-[#fce3bc]/50 opacity-85 hover:opacity-100"
                                    }`}
                                    alt={item.ten_trang_bi}
                                    referrerPolicy="no-referrer"
                                  />
                                  {isEquippedInActive && (
                                    <span className="absolute top-0 right-0 bg-amber-400 text-slate-950 text-[7px] p-0.5 shadow font-bold">
                                      <LucideIcon name="Check" size={8} />
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`block text-[8px] sm:text-[9px] truncate w-full text-center mt-1 px-1 py-0.5 rounded transition-all ${
                                    isEquippedInActive
                                      ? "bg-gradient-to-r from-[#ffe8b3] via-[#fce3bc] to-[#e6b800] text-slate-950 font-black"
                                      : "text-[#fce3bc] font-bold"
                                  }`}
                                >
                                  {item.ten_trang_bi}
                                </span>
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
                        const branchLabels: Record<string, string> = {
                          THANH_KHOI_NGUYEN: "Thành Khởi Nguyên",
                          THAP_QUANG_MINH: "Tháp Quang Minh",
                          VUC_HON_MANG: "Vực Hỗn Mang",
                          RUNG_NGUYEN_SINH: "Rừng Nguyên Sinh",
                        };

                        const branchBackgrounds: Record<string, string> = {
                          THANH_KHOI_NGUYEN:
                            "/image/phu_hieu/thanh_khoi_nguyen/thanh-khoi-nguyen.png",
                          THAP_QUANG_MINH:
                            "/image/phu_hieu/thap_quang_minh/thap-quang-minh.png",
                          VUC_HON_MANG:
                            "/image/phu_hieu/vuc_hon_mang/vuc-hon-mang.png",
                          RUNG_NGUYEN_SINH:
                            "/image/phu_hieu/rung_nguyen_sinh/rung-nguyen-sinh.png",
                        };

                        const branchesKeys = [
                          "THANH_KHOI_NGUYEN",
                          "THAP_QUANG_MINH",
                          "VUC_HON_MANG",
                          "RUNG_NGUYEN_SINH",
                        ];
                        const branchBadges = branchesKeys
                          .map((bKey) => {
                            const firstRealBadge = badges.find(
                              (b) => getBadgeBranch(b) === bKey,
                            );
                            if (!firstRealBadge) return null;
                            return {
                              id: firstRealBadge.id,
                              ten_phu_hieu: branchLabels[bKey],
                              url_hinh_anh:
                                branchBackgrounds[bKey] ||
                                firstRealBadge.url_hinh_anh,
                              branchKey: bKey,
                            };
                          })
                          .filter(Boolean) as {
                          id: string;
                          ten_phu_hieu: string;
                          url_hinh_anh: string | null;
                          branchKey: string;
                        }[];

                        return (
                          <div className="space-y-3">
                            <div className="text-left py-1">
                              <span className="text-[10px] font-black uppercase text-[#fce3bc] tracking-wider">
                                Chọn Loại Phân Nhánh:
                              </span>
                              <p className="text-[10px] text-[#fce3bc]/80 mt-0.5">
                                Chọn 1 trong 4 phân nhánh phù hiệu chính dưới
                                đây:
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                              {branchBadges.map((b) => {
                                const equippedId = activeKey
                                  ? selectedBadges[activeKey]
                                  : null;
                                const equippedBadge = badges.find(
                                  (bg) => bg.id === equippedId,
                                );
                                const isEquippedInActive =
                                  equippedBadge &&
                                  getBadgeBranch(equippedBadge) === b.branchKey;
                                return (
                                  <div
                                    key={b.id}
                                    onClick={() =>
                                      handleSelectFromRightList(
                                        b.id,
                                        b.ten_phu_hieu,
                                      )
                                    }
                                    className="cursor-pointer transition-all flex flex-col items-center justify-center text-center relative group p-0.5 sm:p-1 rounded"
                                  >
                                    <div className="relative w-full max-w-[64px] sm:max-w-none aspect-square mx-auto">
                                      <img
                                        src={b.url_hinh_anh ?? undefined}
                                        className={`w-full h-full object-cover border-2 transition-all ${
                                          isEquippedInActive
                                            ? "border-[#fce3bc] ring-2 ring-[#fce3bc] shadow-[0_0_10px_rgba(252,227,188,0.6)]"
                                            : "border-[#fce3bc]/50 opacity-85 hover:opacity-100"
                                        }`}
                                        alt={b.ten_phu_hieu}
                                        referrerPolicy="no-referrer"
                                      />
                                      {isEquippedInActive && (
                                        <span className="absolute top-0 right-0 bg-amber-400 text-slate-950 text-[7px] p-0.5 shadow font-bold">
                                          <LucideIcon name="Check" size={8} />
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`block text-[8.5px] sm:text-[9.5px] truncate w-full text-center mt-1 px-1 py-0.5 rounded transition-all ${
                                        isEquippedInActive
                                          ? "bg-gradient-to-r from-[#ffe8b3] via-[#fce3bc] to-[#e6b800] text-slate-950 font-black"
                                          : "text-[#fce3bc] font-bold"
                                      }`}
                                    >
                                      {b.ten_phu_hieu}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Functional badge slots (I, II, III)
                      const parentKeyMap: Record<string, string> = {
                        NHANH_CHINH_2: "NHANH_CHINH_1",
                        NHANH_CHINH_3: "NHANH_CHINH_1",
                        NHANH_CHINH_4: "NHANH_CHINH_1",
                        NHANH_PHU_1_2: "NHANH_PHU_1_1",
                        NHANH_PHU_2_2: "NHANH_PHU_2_1",
                      };
                      const parentKey = activeKey
                        ? parentKeyMap[activeKey]
                        : null;
                      const parentId = parentKey
                        ? selectedBadges[parentKey]
                        : null;

                      if (!parentId) {
                        return (
                          <div className="p-6 sm:p-8 text-center text-[#fce3bc] text-xs font-semibold space-y-3 bg-slate-900/50 border border-[#fce3bc]/50">
                            <LucideIcon
                              name="AlertCircle"
                              className="mx-auto text-[#fce3bc]"
                              size={32}
                            />
                            <p className="font-extrabold text-[#fce3bc]">
                              Chưa chọn loại nhánh
                            </p>
                            <p className="text-[10px] text-[#fce3bc]/80 font-medium">
                              Vui lòng nhấp chọn ô "Chọn Nhánh" đầu tiên để
                              thiết lập loại nhánh cho nhánh này trước.
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
                        const matchesSearch = b.ten_phu_hieu
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase());
                        return isSameBranch && matchesSearch;
                      });

                      return (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center bg-slate-900/80 p-2 border border-[#fce3bc]/50 text-left">
                            <div>
                              <span className="block text-[8px] font-black uppercase text-[#fce3bc]/80 tracking-wider">
                                Đang xem nhánh:
                              </span>
                              <span className="block font-black text-[11px] text-[#fce3bc]">
                                {branchLabelMap[parentBranch] || parentBranch}
                              </span>
                            </div>
                            <span className="text-[9px] font-black text-slate-950 bg-gradient-to-r from-[#ffe8b3] via-[#fce3bc] to-[#e6b800] px-2 py-0.5 rounded border border-[#fce3bc]">
                              {filteredBadges.length} phù hiệu
                            </span>
                          </div>

                          <div className="max-h-[350px] overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-4 gap-1.5 sm:gap-3 scrollbar-thin">
                            {filteredBadges.length === 0 ? (
                              <div className="p-6 text-center text-[#fce3bc] text-xs col-span-full">
                                Không tìm thấy phù hiệu nào phù hợp.
                              </div>
                            ) : (
                              filteredBadges.map((b) => {
                                const isEquippedInActive =
                                  activeKey &&
                                  selectedBadges[activeKey] === b.id;
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
                                    className="cursor-pointer transition-all flex flex-col items-center justify-center text-center relative group p-0.5 sm:p-1 rounded"
                                    title={b.ten_phu_hieu}
                                  >
                                    <div className="relative w-full max-w-[48px] sm:max-w-none aspect-square mx-auto">
                                      <img
                                        src={b.url_hinh_anh ?? undefined}
                                        className={`w-full h-full object-cover border-2 transition-all ${
                                          isEquippedInActive
                                            ? "border-[#fce3bc] ring-2 ring-[#fce3bc] shadow-[0_0_10px_rgba(252,227,188,0.6)]"
                                            : isAnywhere
                                              ? "border-[#fce3bc]/30 opacity-50"
                                              : "border-[#fce3bc]/50 opacity-85 hover:opacity-100"
                                        }`}
                                        alt={b.ten_phu_hieu}
                                        referrerPolicy="no-referrer"
                                      />
                                      {isEquippedInActive && (
                                        <span className="absolute top-0 right-0 bg-amber-400 text-slate-950 text-[7px] p-0.5 shadow font-bold">
                                          <LucideIcon name="Check" size={8} />
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={`block text-[8px] sm:text-[9px] truncate w-full text-center mt-1 px-1 py-0.5 rounded transition-all ${
                                        isEquippedInActive
                                          ? "bg-gradient-to-r from-[#ffe8b3] via-[#fce3bc] to-[#e6b800] text-slate-950 font-black"
                                          : "text-[#fce3bc] font-bold"
                                      }`}
                                    >
                                      {b.ten_phu_hieu}
                                    </span>
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
                      <div className="max-h-[350px] overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-4 gap-1.5 sm:gap-3 scrollbar-thin">
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
                                className="cursor-pointer transition-all flex flex-col items-center justify-center text-center relative group p-0.5 sm:p-1 rounded"
                                title={s.mo_ta || ""}
                              >
                                <div className="relative w-full max-w-[48px] sm:max-w-none aspect-square mx-auto">
                                  <img
                                    src={s.url_hinh_anh ?? undefined}
                                    className={`w-full h-full object-cover border-2 transition-all ${
                                      isSelected
                                        ? "border-[#fce3bc] ring-2 ring-[#fce3bc] shadow-[0_0_10px_rgba(252,227,188,0.6)]"
                                        : "border-[#fce3bc]/50 opacity-85 hover:opacity-100"
                                    }`}
                                    alt={s.ten_phu_tro}
                                    referrerPolicy="no-referrer"
                                  />
                                  {isSelected && (
                                    <span className="absolute top-0 right-0 bg-amber-400 text-slate-950 text-[7px] p-0.5 shadow font-bold">
                                      <LucideIcon name="Check" size={8} />
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`block text-[8px] sm:text-[9px] truncate w-full text-center mt-1 px-1 py-0.5 rounded transition-all ${
                                    isSelected
                                      ? "bg-gradient-to-r from-[#ffe8b3] via-[#fce3bc] to-[#e6b800] text-slate-950 font-black"
                                      : "text-[#fce3bc] font-bold"
                                  }`}
                                >
                                  {s.ten_phu_tro}
                                </span>
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
                  className="bg-slate-900/50 p-5  border border-[#fce3bc]/50 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200"
                >
                  <div className="flex items-center gap-4">
                    {/* Champion Avatar */}
                    <div className="w-12 h-12 rounded-full overflow-hidden border-1 border-[#fce3bc]/50 shadow-inner shrink-0 relative">
                      {g.tuong?.url_anh_dai_dien ? (
                        <img
                          src={g.tuong.url_anh_dai_dien}
                          className="w-full h-full object-cover"
                          alt="Hero avatar"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[#fce3bc]">
                          <LucideIcon name="User" size={18} />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#fce3bc]">
                          {g.tuong?.ten_tuong || "Tướng ẩn"}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-[#fce3bc]">
                          {g.tuong?.vai_tro}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${g.kich_hoat ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}
                        >
                          {g.kich_hoat ? "Công khai" : "Ẩn"}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-1">
                          <LucideIcon
                            name="Heart"
                            size={11}
                            className="fill-rose-500 text-rose-500"
                          />
                          <span>{g.luot_xem || 0} lượt thích</span>
                        </span>
                      </div>
                      <h3 className="font-extrabold text-[#fce3bc] text-xs mt-1.5 flex items-center gap-1">
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
                              src={item.url_hinh_anh ?? undefined}
                              className="w-7 h-7 object-cover  border border-slate-200"
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
                      type="button"
                      onClick={() => handleDuplicate(g)}
                      className="p-2 bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 hover:text-white rounded border border-indigo-500/50 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                      title="Sao chép bộ giáo án này"
                    >
                      <LucideIcon name="Copy" size={13} />
                      Sao chép
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(g)}
                      className="p-2 bg-slate-900/50 hover:bg-slate-100 text-[#fce3bc] hover:text-indigo-600 rounded transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold border border-[#fce3bc]/50/30"
                    >
                      <LucideIcon name="Edit" size={13} />
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm("Bạn có chắc chắn muốn xóa bộ giáo án này?")
                        ) {
                          onDeleteGuide(g.id);
                        }
                      }}
                      className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 rounded border border-rose-500/50 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                    >
                      <LucideIcon name="Trash2" size={13} />
                      Xóa
                    </button>
                  </div>
                </div>
              ))}

              {guides.length === 0 && (
                <div className="text-center p-12 border border-dashed border-slate-200  font-sans text-sm text-[#fce3bc] bg-slate-900/50">
                  Chưa có giáo án Liên Quân nào được tạo. Nhấp "Tạo Giáo Án Mới"
                  để thiết lập bộ giáo án đầu tiên của bạn!
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Admin Section 2: Quản Lý Khắc Chế */}
      {adminSection === "khac_che" && (
        <div className="space-y-2 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#fce3bc]/30 pb-3">
            <div>
              <h3 className="text-base font-black text-[#fce3bc] flex items-center gap-2 uppercase tracking-wide">
                Thiết Lập Khắc Chế & Phối Hợp Cho Tướng
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowKcForm(!showKcForm);
                  if (!showKcForm) {
                    setKcTargetChampId(champions[0]?.id || "");
                  }
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <LucideIcon name={showKcForm ? "X" : "Plus"} size={15} />
                {showKcForm ? "Đóng Form" : "+ Thêm Cấu Hình Khắc Chế Mới"}
              </button>
            </div>
          </div>

          {kcMsg && (
            <div className="bg-emerald-950/80 border border-emerald-500 p-2.5 text-xs text-emerald-300 font-bold flex items-center gap-2">
              <LucideIcon name="CheckCircle" size={16} />
              {kcMsg}
            </div>
          )}

          {/* Form Editor (Only shown when showKcForm is true) */}
          {showKcForm && (
            <div
              id="kc-editor-form"
              className="space-y-4 bg-slate-950 p-4 border border-amber-500/50 shadow-inner"
            >
              <div className="flex items-center justify-between border-b border-[#fce3bc]/30 pb-2">
                <span className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
                  Biểu Mẫu Cấu Hình Khắc Chế Tướng
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveKhacChe}
                    disabled={kcSaving}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <LucideIcon name="Save" size={13} />
                    {kcSaving ? "Đang lưu..." : "Lưu Thiết Lập Khắc Chế"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowKcForm(false)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Hủy / Đóng
                  </button>
                </div>
              </div>

              {/* Target Champion Selection */}
              {(() => {
                const filteredTargetChamps = champions.filter((c) => {
                  const matchSearch =
                    !kcTargetSearch ||
                    c.ten_tuong
                      .toLowerCase()
                      .includes(kcTargetSearch.toLowerCase());
                  const matchRole =
                    kcTargetRoleFilter === "ALL" ||
                    (c.vai_tro &&
                      c.vai_tro
                        .toLowerCase()
                        .includes(kcTargetRoleFilter.toLowerCase()));
                  return matchSearch && matchRole;
                });
                const selectedTargetChamp = champions.find(
                  (c) => c.id === kcTargetChampId,
                );

                return (
                  <div className="bg-slate-900 p-3 sm:p-4 border border-[#fce3bc]/40 space-y-3">
                    {/* Header & Selected Target Display & Search/Filter */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#fce3bc]/30 pb-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="text-xs font-black text-[#fce3bc] uppercase block shrink-0">
                          1. Chọn tướng mục tiêu cần cài đặt:
                        </label>
                        {selectedTargetChamp && (
                          <div className="flex items-center gap-2 bg-slate-950 border border-amber-400 px-3 py-1 rounded shadow">
                            <img
                              src={
                                selectedTargetChamp.url_anh_dai_dien ||
                                "/placeholder.jpg"
                              }
                              alt={selectedTargetChamp.ten_tuong}
                              className="w-7 h-7 object-cover border border-amber-400 rounded-sm"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="text-xs font-black text-amber-300">
                                {selectedTargetChamp.ten_tuong}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {selectedTargetChamp.vai_tro ||
                                  "Chưa phân vai trò"}
                              </div>
                            </div>
                            <span className="ml-1 text-[9px] font-black uppercase bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-xs">
                              Đang chọn
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Search & Role Filter controls */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={kcTargetSearch}
                            onChange={(e) => setKcTargetSearch(e.target.value)}
                            placeholder="Tìm tướng mục tiêu..."
                            className="bg-slate-950 border border-[#fce3bc]/50 pl-7 pr-6 py-1 text-xs text-[#fce3bc] placeholder-slate-500 focus:outline-none focus:border-amber-400 w-40 sm:w-52"
                          />
                          <LucideIcon
                            name="Search"
                            size={13}
                            className="absolute left-2 top-2 text-slate-400 pointer-events-none"
                          />
                          {kcTargetSearch && (
                            <button
                              type="button"
                              onClick={() => setKcTargetSearch("")}
                              className="absolute right-1.5 top-1.5 text-slate-400 hover:text-white text-[10px] font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <select
                          value={kcTargetRoleFilter}
                          onChange={(e) =>
                            setKcTargetRoleFilter(e.target.value)
                          }
                          className="bg-slate-950 border border-[#fce3bc]/50 px-2 py-1 text-xs text-[#fce3bc] font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="ALL">-- Tất cả vị trí --</option>
                          <option value="Sát Thủ">Sát Thủ</option>
                          <option value="Đấu Sĩ">Đấu Sĩ</option>
                          <option value="Pháp Sư">Pháp Sư</option>
                          <option value="Xạ Thủ">Xạ Thủ</option>
                          <option value="Trợ Thủ">Trợ Thủ</option>
                          <option value="Đỡ Đòn">Đỡ Đòn</option>
                          <option value="Rừng">Rừng</option>
                        </select>
                      </div>
                    </div>

                    {/* Champion Avatars Grid */}
                    <div className="max-h-48 overflow-y-auto pr-1 grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 scrollbar-thin">
                      {filteredTargetChamps.map((c) => {
                        const isSelected = kcTargetChampId === c.id;
                        const hasConfigured = khacCheList.some(
                          (kc) => kc.tuong_id === c.id,
                        );

                        return (
                          <button
                            key={c.id}
                            type="button"
                            title={`${c.ten_tuong} (${c.vai_tro || "Chưa rõ"})${hasConfigured ? " - Đã có cài đặt" : ""}`}
                            onClick={() => setKcTargetChampId(c.id)}
                            className={`relative aspect-square transition-all cursor-pointer overflow-hidden rounded-sm group ${
                              isSelected
                                ? "ring-2 ring-amber-400 scale-105 z-10 shadow-lg shadow-amber-500/50"
                                : "hover:scale-105 hover:ring-1 hover:ring-amber-400/60 opacity-85 hover:opacity-100"
                            }`}
                          >
                            {isSelected && (
                              <span className="absolute top-0.5 right-0.5 bg-amber-400 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center z-20 shadow">
                                ✓
                              </span>
                            )}
                            {!isSelected && hasConfigured && (
                              <span className="absolute top-0.5 right-0.5 bg-emerald-600/90 text-white text-[7px] font-extrabold px-1 rounded z-20 shadow">
                                Đã set
                              </span>
                            )}
                            <img
                              src={c.url_anh_dai_dien || "/placeholder.jpg"}
                              alt={c.ten_tuong}
                              className={`w-full h-full object-cover transition-all ${
                                isSelected
                                  ? "brightness-105"
                                  : "brightness-90 grayscale-[10%] group-hover:grayscale-0 group-hover:brightness-100"
                              }`}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-slate-950/85 text-[9px] font-extrabold text-[#fce3bc] text-center truncate px-0.5 py-0.5 group-hover:bg-slate-900">
                              {c.ten_tuong}
                            </div>
                          </button>
                        );
                      })}
                      {filteredTargetChamps.length === 0 && (
                        <div className="col-span-full text-center py-4 text-xs text-slate-400 italic">
                          Không tìm thấy tướng phù hợp.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* 3 Pickers Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Picker 1: Tướng Khắc Chế */}
                <div className="bg-slate-900 p-3 border border-red-900/60 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 border-b border-red-800/40 pb-1.5">
                    <span className="text-xs font-black text-red-300 uppercase flex items-center gap-1.5">
                      <LucideIcon name="ShieldAlert" size={14} />
                      Tướng Khắc Chế ({kcCounterChampIds.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setKcCounterChampIds([])}
                      className="text-[10px] text-red-400 hover:underline font-bold cursor-pointer"
                    >
                      Xóa chọn
                    </button>
                  </div>

                  {/* Search box counter champ */}
                  <input
                    type="text"
                    value={kcCounterSearch}
                    onChange={(e) => setKcCounterSearch(e.target.value)}
                    placeholder="Lọc tướng khắc chế..."
                    className="w-full bg-slate-950 border border-red-900/40 px-2 py-0.5 text-xs text-red-200 placeholder-slate-500 focus:outline-none"
                  />

                  {/* Lưới chỉ hiển thị ảnh tướng */}
                  <div className="max-h-56 overflow-y-auto pr-1 grid grid-cols-5 sm:grid-cols-6 gap-2 scrollbar-thin">
                    {champions
                      .filter(
                        (c) =>
                          !kcCounterSearch ||
                          c.ten_tuong
                            .toLowerCase()
                            .includes(kcCounterSearch.toLowerCase()),
                      )
                      .map((c) => {
                        const isChecked = kcCounterChampIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            title={c.ten_tuong}
                            onClick={() => {
                              if (isChecked) {
                                setKcCounterChampIds(
                                  kcCounterChampIds.filter((id) => id !== c.id),
                                );
                              } else {
                                setKcCounterChampIds([
                                  ...kcCounterChampIds,
                                  c.id,
                                ]);
                              }
                            }}
                            className={`relative aspect-square transition-all cursor-pointer overflow-hidden rounded-sm ${
                              isChecked
                                ? "ring-2 ring-red-500 scale-105 z-10 shadow-lg shadow-red-950/50"
                                : "hover:scale-105 hover:ring-1 hover:ring-red-400/60"
                            }`}
                          >
                            {/* Badge tích chọn góc trên */}
                            {isChecked && (
                              <span className="absolute top-0.5 right-0.5 bg-red-600 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center z-20 shadow">
                                ✓
                              </span>
                            )}
                            <img
                              src={c.url_anh_dai_dien || "/placeholder.jpg"}
                              alt={c.ten_tuong}
                              className={`w-full h-full object-cover transition-all ${
                                isChecked
                                  ? "brightness-100"
                                  : "brightness-90 grayscale-[20%] hover:grayscale-0 hover:brightness-100"
                              }`}
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Picker 2: Trang Bị Khắc Chế */}
                <div className="bg-slate-900 p-3 border border-amber-900/60 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 border-b border-amber-800/40 pb-1.5">
                    <span className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
                      <LucideIcon name="Shield" size={14} />
                      Trang Bị Khắc Chế ({kcCounterItemIds.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setKcCounterItemIds([])}
                      className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
                    >
                      Xóa chọn
                    </button>
                  </div>

                  {/* Search box item */}
                  <input
                    type="text"
                    value={kcItemSearch}
                    onChange={(e) => setKcItemSearch(e.target.value)}
                    placeholder="Lọc trang bị..."
                    className="w-full bg-slate-950 border border-amber-900/40 px-2 py-0.5 text-xs text-amber-200 placeholder-slate-500 focus:outline-none"
                  />

                  {/* Lưới chỉ hiển thị ảnh trang bị */}
                  <div className="max-h-56 overflow-y-auto pr-1 grid grid-cols-5 sm:grid-cols-6 gap-2 scrollbar-thin">
                    {items
                      .filter(
                        (item) =>
                          !kcItemSearch ||
                          item.ten_trang_bi
                            .toLowerCase()
                            .includes(kcItemSearch.toLowerCase()),
                      )
                      .map((item) => {
                        const isChecked = kcCounterItemIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            title={item.ten_trang_bi}
                            onClick={() => {
                              if (isChecked) {
                                setKcCounterItemIds(
                                  kcCounterItemIds.filter(
                                    (id) => id !== item.id,
                                  ),
                                );
                              } else {
                                setKcCounterItemIds([
                                  ...kcCounterItemIds,
                                  item.id,
                                ]);
                              }
                            }}
                            className={`relative aspect-square transition-all cursor-pointer overflow-hidden rounded-sm ${
                              isChecked
                                ? "ring-2 ring-amber-500 scale-105 z-10 shadow-lg shadow-amber-950/50"
                                : "hover:scale-105 hover:ring-1 hover:ring-amber-400/60"
                            }`}
                          >
                            {/* Badge tích chọn góc trên */}
                            {isChecked && (
                              <span className="absolute top-0.5 right-0.5 bg-amber-500 text-slate-950 text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center z-20 shadow">
                                ✓
                              </span>
                            )}
                            <img
                              src={item.url_hinh_anh || "/placeholder.jpg"}
                              alt={item.ten_trang_bi}
                              className={`w-full h-full object-cover transition-all ${
                                isChecked
                                  ? "brightness-100"
                                  : "brightness-90 grayscale-[20%] hover:grayscale-0 hover:brightness-100"
                              }`}
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Picker 3: Tướng Phối Hợp */}
                <div className="bg-slate-900 p-3 border border-emerald-900/60 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 border-b border-emerald-800/40 pb-1.5">
                    <span className="text-xs font-black text-emerald-300 uppercase flex items-center gap-1.5">
                      <LucideIcon name="Users" size={14} />
                      Tướng Phối Hợp ({kcSynergyChampIds.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setKcSynergyChampIds([])}
                      className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      Xóa chọn
                    </button>
                  </div>

                  {/* Search box synergy champ */}
                  <input
                    type="text"
                    value={kcSynergySearch}
                    onChange={(e) => setKcSynergySearch(e.target.value)}
                    placeholder="Lọc tướng phối hợp..."
                    className="w-full bg-slate-950 border border-emerald-900/40 px-2 py-0.5 text-xs text-emerald-200 placeholder-slate-500 focus:outline-none"
                  />

                  {/* Lưới chỉ hiển thị ảnh tướng */}
                  <div className="max-h-56 overflow-y-auto pr-1 grid grid-cols-5 sm:grid-cols-6 gap-2 scrollbar-thin">
                    {champions
                      .filter(
                        (c) =>
                          !kcSynergySearch ||
                          c.ten_tuong
                            .toLowerCase()
                            .includes(kcSynergySearch.toLowerCase()),
                      )
                      .map((c) => {
                        const isChecked = kcSynergyChampIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            title={c.ten_tuong}
                            onClick={() => {
                              if (isChecked) {
                                setKcSynergyChampIds(
                                  kcSynergyChampIds.filter((id) => id !== c.id),
                                );
                              } else {
                                setKcSynergyChampIds([
                                  ...kcSynergyChampIds,
                                  c.id,
                                ]);
                              }
                            }}
                            className={`relative aspect-square transition-all cursor-pointer overflow-hidden rounded-sm ${
                              isChecked
                                ? "ring-2 ring-emerald-500 scale-105 z-10 shadow-lg shadow-emerald-950/50"
                                : "hover:scale-105 hover:ring-1 hover:ring-emerald-400/60"
                            }`}
                          >
                            {/* Badge tích chọn góc trên */}
                            {isChecked && (
                              <span className="absolute top-0.5 right-0.5 bg-emerald-500 text-slate-950 text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center z-20 shadow">
                                ✓
                              </span>
                            )}
                            <img
                              src={c.url_anh_dai_dien || "/placeholder.jpg"}
                              alt={c.ten_tuong}
                              className={`w-full h-full object-cover transition-all ${
                                isChecked
                                  ? "brightness-100"
                                  : "brightness-90 grayscale-[20%] hover:grayscale-0 hover:brightness-100"
                              }`}
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-red-300 block mb-1">
                    Ghi chú / Mẹo khắc chế tướng:
                  </label>
                  <textarea
                    value={kcGhiChuKhacChe}
                    onChange={(e) => setKcGhiChuKhacChe(e.target.value)}
                    placeholder="Nhập mẹo đè đường, hóa giải chiêu thức..."
                    rows={3}
                    className="w-full bg-slate-900 border border-red-900/60 p-2 text-xs text-[#fce3bc] placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-emerald-300 block mb-1">
                    Ghi chú / Mẹo phối hợp đội hình:
                  </label>
                  <textarea
                    value={kcGhiChuPhoiHop}
                    onChange={(e) => setKcGhiChuPhoiHop(e.target.value)}
                    placeholder="Nhập mẹo combo chiêu thức, bọc lót giao tranh..."
                    rows={3}
                    className="w-full bg-slate-900 border border-emerald-900/60 p-2 text-xs text-[#fce3bc] placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* List of Configured Khac Che (Always displayed) */}
          <div className="p-3 space-y-3">
            <h4 className="text-sm sm:text-base font-black text-[#fce3bc] uppercase flex items-center gap-2">
              <LucideIcon name="List" size={20} />
              Danh sách tướng đã cấu hình Khắc chế: {khacCheList.length}
            </h4>

            {khacCheList.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 text-center">
                Chưa có tướng nào được thiết lập khắc chế.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#fce3bc]/30 text-[#fce3bc] bg-slate-900/60">
                      <th className="p-2">Tướng Mục Tiêu</th>
                      <th className="p-2">Tướng Khắc Chế</th>
                      <th className="p-2">Trang Bị Khắc Chế</th>
                      <th className="p-2">Tướng Phối Hợp</th>
                      <th className="p-2 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {khacCheList.map((kc) => {
                      const targetChamp = champions.find(
                        (c) => c.id === kc.tuong_id,
                      );
                      return (
                        <tr
                          key={kc.id}
                          className="border-b border-slate-800 hover:bg-slate-900/40"
                        >
                          <td className="p-2 font-bold text-[#fce3bc]">
                            <div className="flex items-center gap-2">
                              <img
                                src={
                                  targetChamp?.url_anh_dai_dien ||
                                  "/placeholder.jpg"
                                }
                                alt={targetChamp?.ten_tuong || "Tướng"}
                                className="w-8 h-8 sm:w-20 sm:h-20 object-cover border border-[#fce3bc]"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="text-xs font-bold">
                                  {targetChamp?.ten_tuong || "Tướng"}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {targetChamp?.vai_tro || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(kc.tuong_khac_che_ids || []).map((id) => {
                                const c = champions.find((x) => x.id === id);
                                return (
                                  <img
                                    key={id}
                                    src={
                                      c?.url_anh_dai_dien || "/placeholder.jpg"
                                    }
                                    alt={c?.ten_tuong || "Tướng"}
                                    title={c?.ten_tuong}
                                    className="w-6 h-6 sm:w-20 sm:h-20 object-cover border border-red-500/60"
                                    referrerPolicy="no-referrer"
                                  />
                                );
                              })}
                              {(!kc.tuong_khac_che_ids ||
                                kc.tuong_khac_che_ids.length === 0) && (
                                <span className="text-slate-500 italic text-[10px]">
                                  Chưa chọn
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(kc.trang_bi_khac_che_ids || []).map((id) => {
                                const it = items.find((x) => x.id === id);
                                return (
                                  <img
                                    key={id}
                                    src={it?.url_hinh_anh || "/placeholder.jpg"}
                                    alt={it?.ten_trang_bi || "Trang bị"}
                                    title={it?.ten_trang_bi}
                                    className="w-6 h-6 sm:w-20 sm:h-20 object-cover border border-amber-500/60"
                                    referrerPolicy="no-referrer"
                                  />
                                );
                              })}
                              {(!kc.trang_bi_khac_che_ids ||
                                kc.trang_bi_khac_che_ids.length === 0) && (
                                <span className="text-slate-500 italic text-[10px]">
                                  Chưa chọn
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {(kc.tuong_phoi_hop_ids || []).map((id) => {
                                const c = champions.find((x) => x.id === id);
                                return (
                                  <img
                                    key={id}
                                    src={
                                      c?.url_anh_dai_dien || "/placeholder.jpg"
                                    }
                                    alt={c?.ten_tuong || "Tướng"}
                                    title={c?.ten_tuong}
                                    className="w-6 h-6 sm:w-20 sm:h-20 object-cover border border-emerald-500/60"
                                    referrerPolicy="no-referrer"
                                  />
                                );
                              })}
                              {(!kc.tuong_phoi_hop_ids ||
                                kc.tuong_phoi_hop_ids.length === 0) && (
                                <span className="text-slate-500 italic text-[10px]">
                                  Chưa chọn
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setKcTargetChampId(kc.tuong_id);
                                  setShowKcForm(true);
                                  setTimeout(() => {
                                    document
                                      .getElementById("kc-editor-form")
                                      ?.scrollIntoView({ behavior: "smooth" });
                                  }, 50);
                                }}
                                className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-600 rounded text-[10px] font-bold cursor-pointer"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteKhacChe(kc.id, kc.tuong_id)
                                }
                                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-600 rounded text-[10px] font-bold cursor-pointer"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Section 3: Quản Lý Top Tier */}
      {adminSection === "top_tier" && (
        <div className="space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#fce3bc]/30 pb-3">
            <div>
              <h3 className="text-base font-black text-[#fce3bc] flex items-center gap-2 uppercase tracking-wide">
                Phân Loại Tướng Theo Thứ Hạng Tier List
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowTtForm(!showTtForm);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 cursor-pointer"
            >
              <LucideIcon name={showTtForm ? "X" : "Plus"} size={15} />
              {showTtForm ? "Hủy" : "Thêm"}
            </button>
          </div>

          {ttMsg && (
            <div className="bg-emerald-950/80 border border-emerald-500 p-2.5 text-xs text-emerald-300 font-bold flex items-center gap-2">
              <LucideIcon name="CheckCircle" size={16} />
              {ttMsg}
            </div>
          )}

          {/* Form Editor (Shown when showTtForm is true) */}
          {showTtForm && (
            <div id="tt-editor-form" className="space-y-4 shadow-inner">
              <div className="flex items-center justify-between border-b border-[#fce3bc]/30 pb-2">
                <span className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
                  Tier List (Đường {ttLane} - Tier {ttTier})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveTopTier}
                    disabled={ttSaving}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <LucideIcon name="Save" size={13} />
                    {ttSaving ? "Đang lưu..." : `Lưu`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTtForm(false)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              </div>

              {/* STEP 1: Select Version, Lane & Tier */}
              <div className="bg-slate-900 p-3 sm:p-4 border border-[#fce3bc]/40 space-y-4">
                <div className="flex flex-wrap items-center gap-3 border-b border-[#fce3bc]/20 pb-3">
                  <label className="text-xs font-extrabold text-[#fce3bc] uppercase">
                    Phiên bản:
                  </label>
                  <input
                    type="text"
                    value={ttVersion}
                    onChange={(e) => setTtVersion(e.target.value)}
                    placeholder="VD: Mùa 2026 - Phiên bản mới"
                    className="bg-slate-950 border border-[#fce3bc]/60 px-3 py-1 text-xs text-[#fce3bc] font-bold focus:outline-none focus:border-amber-400 w-full sm:w-64"
                  />
                </div>

                {/* Lane Selection Buttons */}
                <div>
                  <label className="text-xs font-black text-[#fce3bc] uppercase block mb-2">
                    1. Chọn Đường / Vị Trí:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Rừng",
                      "Pháp Sư",
                      "Đấu Sĩ",
                      "Xạ Thủ",
                      "Đỡ Đòn",
                      "Trợ Thủ",
                    ].map((lane) => (
                      <button
                        key={lane}
                        type="button"
                        onClick={() => setTtLane(lane)}
                        className={`px-3.5 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                          ttLane === lane
                            ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 font-black shadow-md scale-105"
                            : "bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-500/50"
                        }`}
                      >
                        Đường {lane}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tier Selection Buttons */}
                <div>
                  <label className="text-xs font-black text-[#fce3bc] uppercase block mb-2">
                    2. Chọn Thứ Hạng Tier:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        tier: "S",
                        label: "Tier S",
                        color: "border-red-500 text-red-400 bg-red-950/40",
                      },
                      {
                        tier: "A",
                        label: "Tier A",
                        color:
                          "border-amber-500 text-amber-400 bg-amber-950/40",
                      },
                      {
                        tier: "B",
                        label: "Tier B",
                        color:
                          "border-emerald-500 text-emerald-400 bg-emerald-950/40",
                      },
                      {
                        tier: "C",
                        label: "Tier C",
                        color: "border-sky-500 text-sky-400 bg-sky-950/40",
                      },
                      {
                        tier: "D",
                        label: "Tier D",
                        color:
                          "border-slate-500 text-slate-400 bg-slate-950/40",
                      },
                    ].map((t) => (
                      <button
                        key={t.tier}
                        type="button"
                        onClick={() => setTtTier(t.tier)}
                        className={`px-3.5 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                          ttTier === t.tier
                            ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 border-amber-300 font-black shadow-lg ring-2 ring-amber-400 scale-105"
                            : `${t.color} hover:opacity-100 opacity-70`
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#fce3bc] block mb-1">
                    Ghi chú ngắn cho Tier {ttTier} - Đường {ttLane} (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={ttGhiChu}
                    onChange={(e) => setTtGhiChu(e.target.value)}
                    placeholder="VD: Sát thương đột biến, khả năng mở gank sớm cực kỳ hiệu quả..."
                    className="w-full bg-slate-950 border border-[#fce3bc]/60 p-2 text-xs text-[#fce3bc] focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* STEP 2: Batch Select Champions into Selected Lane + Tier */}
              <div className="bg-slate-900 p-3 sm:p-4 border border-[#fce3bc]/40 space-y-3">
                {/* Header Admin Form */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#fce3bc]/30 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#fce3bc] uppercase">
                      3. Chọn danh sách tướng thuộc Tier {ttTier} - Đường{" "}
                      {ttLane}:
                    </span>
                    <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-extrabold text-[10px]">
                      Đã chọn:{" "}
                      {(tierDrafts[`${ttLane}_${ttTier}`] || []).length} tướng
                    </span>
                  </div>

                  {/* Role filter select & Search box */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={ttChampRoleFilter}
                      onChange={(e) => setTtChampRoleFilter(e.target.value)}
                      className="bg-slate-950 border border-[#fce3bc]/50 px-2 py-1 text-xs text-[#fce3bc] font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">-- Tất cả vị trí --</option>
                      <option value="Sát Thủ">Sát Thủ</option>
                      <option value="Đấu Sĩ">Đấu Sĩ</option>
                      <option value="Pháp Sư">Pháp Sư</option>
                      <option value="Xạ Thủ">Xạ Thủ</option>
                      <option value="Trợ Thủ">Trợ Thủ</option>
                      <option value="Đỡ Đòn">Đỡ Đòn</option>
                    </select>

                    <input
                      type="text"
                      value={ttChampSearch}
                      onChange={(e) => setTtChampSearch(e.target.value)}
                      placeholder="Tìm tên tướng..."
                      className="bg-slate-950 border border-[#fce3bc]/40 px-2 py-1 text-xs text-[#fce3bc] focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const activeList =
                          tierDrafts[`${ttLane}_${ttTier}`] || [];
                        const filteredIds = champions
                          .filter((c) => {
                            const matchSearch =
                              !ttChampSearch ||
                              c.ten_tuong
                                .toLowerCase()
                                .includes(ttChampSearch.toLowerCase());
                            const matchRole =
                              ttChampRoleFilter === "ALL" ||
                              (c.vai_tro &&
                                c.vai_tro
                                  .toLowerCase()
                                  .includes(ttChampRoleFilter.toLowerCase()));
                            return matchSearch && matchRole;
                          })
                          .map((c) => c.id);
                        const combined = Array.from(
                          new Set([...activeList, ...filteredIds]),
                        );
                        selectAllInActiveTier(combined);
                      }}
                      className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllInActiveTier}
                      className="text-[10px] text-red-400 hover:underline font-bold cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                </div>

                {/* Champions Image-Only Grid */}
                <div className="max-h-72 overflow-y-auto pr-1 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 scrollbar-thin">
                  {champions
                    .filter((c) => {
                      const matchSearch =
                        !ttChampSearch ||
                        c.ten_tuong
                          .toLowerCase()
                          .includes(ttChampSearch.toLowerCase());
                      const matchRole =
                        ttChampRoleFilter === "ALL" ||
                        (c.vai_tro &&
                          c.vai_tro
                            .toLowerCase()
                            .includes(ttChampRoleFilter.toLowerCase()));
                      return matchSearch && matchRole;
                    })
                    .map((c) => {
                      const activeSelected =
                        tierDrafts[`${ttLane}_${ttTier}`] || [];
                      const isChecked = activeSelected.includes(c.id);
                      const location = getAssignedLocation(c.id);
                      const isPickedElsewhere =
                        location &&
                        (location.lane !== ttLane || location.tier !== ttTier);

                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={!!isPickedElsewhere}
                          title={
                            isPickedElsewhere
                              ? `${c.ten_tuong} (Đã chọn ở Đường ${location.lane} - Tier ${location.tier})`
                              : c.ten_tuong
                          }
                          onClick={() => toggleChampInTier(c.id)}
                          className={`p-0.5 border transition-all relative aspect-square flex items-center justify-center overflow-hidden ${
                            isChecked
                              ? "bg-amber-950/80 border-amber-400 shadow-lg ring-2 ring-amber-400/80 scale-[1.03] z-10 cursor-pointer"
                              : isPickedElsewhere
                                ? "bg-slate-900/90 border-red-900/60 opacity-40 cursor-not-allowed grayscale"
                                : "bg-black/60 border-slate-700 hover:border-amber-400/60 hover:scale-105 cursor-pointer"
                          }`}
                        >
                          {/* Badge tích chọn góc trên */}
                          {isChecked && (
                            <span className="absolute top-0.5 right-0.5 bg-amber-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center z-20 shadow-md">
                              ✓
                            </span>
                          )}

                          {/* Badge báo vị trí đã chọn ở lane/tier khác */}
                          {isPickedElsewhere && (
                            <span className="absolute inset-x-0 bottom-0 bg-red-950/95 text-red-300 text-[7px] font-extrabold py-0.5 text-center truncate z-20 border-t border-red-700/60 px-0.5">
                              {location.lane}-{location.tier}
                            </span>
                          )}

                          {/* Ảnh đại diện tướng */}
                          <img
                            src={c.url_anh_dai_dien || "/placeholder.jpg"}
                            alt={c.ten_tuong}
                            className={`w-full h-full object-cover transition-all ${
                              isChecked
                                ? "brightness-100"
                                : isPickedElsewhere
                                  ? "brightness-50"
                                  : "brightness-90 grayscale-[25%] hover:grayscale-0 hover:brightness-100"
                            }`}
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Grouped Top Tier Display by Version & Lane (Matching Pub View 2-column Table style) */}
          <div className="bg-slate-950 p-4 border border-[#bd9867]/60 space-y-4 shadow-2xl backdrop-blur-md">
            {/* Header Admin View: Title + Chọn Phiên Bản + Tổng số lượt */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#bd9867]/30 pb-3">
              <div>
                <h4 className="text-sm font-black text-[#fce3bc] uppercase flex items-center gap-2">
                  <LucideIcon
                    name="Layers"
                    size={18}
                    className="text-[#bd9867]"
                  />
                  Danh sách Tướng Top Tier
                </h4>
                <p className="text-xs text-slate-300 font-medium mt-0.5">
                  Đang quản lý phiên bản:{" "}
                  <span className="text-[#fce3bc] font-bold">
                    {selectedVersion || "Phiên bản hiện tại"}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Dropdown Chọn Phiên bản/Mùa để Admin chỉnh sửa */}
                <div className="flex items-center gap-1.5 bg-[#bd9867]/20 border border-[#bd9867]/60 px-2.5 py-1">
                  <LucideIcon
                    name="Sparkles"
                    size={13}
                    className="text-[#fce3bc] shrink-0"
                  />
                  <select
                    value={selectedVersion}
                    onChange={(e) => setSelectedVersion(e.target.value)}
                    className="bg-transparent text-xs font-bold text-[#fce3bc] focus:outline-none cursor-pointer border-none py-0.5"
                  >
                    {availableVersions && availableVersions.length > 0 ? (
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

                <span className="text-xs font-bold text-slate-300 bg-black/60 border border-[#bd9867]/40 px-3 py-1">
                  Tổng: {topTierList.length} lượt
                </span>
              </div>
            </div>

            {/* Lane Filter Buttons for Admin View */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {["Tất cả", "JUG", "MID", "DSL", "ADL", "TANK", "SUP"].map(
                (lane) => (
                  <button
                    key={lane}
                    type="button"
                    onClick={() => setAdminTopTierLane(lane)}
                    className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                      adminTopTierLane === lane
                        ? "bg-gradient-to-t from-[#bd9867] to-[#fce3bc] text-slate-950 border-[#fce3bc] font-black shadow-md scale-[1.02]"
                        : "bg-slate-900 text-[#fce3bc] border-[#bd9867]/40 hover:bg-[#bd9867]/20 hover:border-[#bd9867]"
                    }`}
                  >
                    {lane === "Tất cả" ? "Tất Cả Đường" : `Đường ${lane}`}
                  </button>
                ),
              )}
            </div>

            {topTierList.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-6 text-center bg-slate-900/50 border border-slate-800">
                Chưa có tướng nào được phân loại trong Top Tier. Bấm "+ Thêm /
                Cấu Hình Top Tier" ở trên để bắt đầu!
              </p>
            ) : (
              /* 2-Column Table for Admin View */
              <div className="bg-slate-950/90 border border-[#bd9867]/60 shadow-2xl backdrop-blur-md overflow-hidden">
                <div className="divide-y divide-[#bd9867]/30">
                  {[
                    { tier: "S", bgColor: "#ff7f7e" }, // Đỏ hồng
                    { tier: "A", bgColor: "#ffbf7f" }, // Cam nhạt
                    { tier: "B", bgColor: "#ffdf80" }, // Vàng cam
                    { tier: "C", bgColor: "#fdff7f" }, // Vàng chanh
                    { tier: "D", bgColor: "#beff7f" }, // Xanh lá nhạt
                  ].map(({ tier, bgColor }) => {
                    /* Bổ sung điều kiện lọc theo selectedVersion */
                    const tierEntries = topTierList.filter(
                      (item) =>
                        item.tier === tier &&
                        (!selectedVersion ||
                          item.phien_ban === selectedVersion) &&
                        (adminTopTierLane === "Tất cả" ||
                          item.phandanh_lane === adminTopTierLane),
                    );

                    return (
                      <div
                        key={tier}
                        className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr] min-h-[60px]"
                      >
                        {/* Cột trái: Nền HEX chuẩn User + Chữ Vàng Ánh Kim + Nút Sửa Tier */}
                        <div
                          style={{ backgroundColor: bgColor }}
                          className="flex flex-col items-center justify-center p-1.5 border-r border-[#bd9867]/40 shrink-0 gap-1"
                        >
                          <span className="text-2xl sm:text-3xl font-black bg-gradient-to-b from-[#ffe8b2] via-[#fce3bc] to-[#b8860b] bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none leading-none">
                            {tier}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (adminTopTierLane !== "Tất cả") {
                                setTtLane(adminTopTierLane);
                              }
                              if (selectedVersion) {
                                setTtVersion(selectedVersion); // Đặt phiên bản mặc định cho form sửa
                              }
                              setTtTier(tier);
                              setShowTtForm(true);
                              setTimeout(() => {
                                document
                                  .getElementById("tt-editor-form")
                                  ?.scrollIntoView({ behavior: "smooth" });
                              }, 50);
                            }}
                            className="px-1.5 py-0.5 bg-black/80 hover:bg-[#bd9867] text-[#fce3bc] hover:text-black border border-[#bd9867]/80 rounded text-[8.5px] font-bold cursor-pointer transition-all active:scale-95 shadow-md"
                          >
                            Sửa Tier
                          </button>
                        </div>

                        {/* Cột phải: Chỉ hiển thị Ảnh đại diện tướng */}
                        <div className="p-1 sm:p-3 flex flex-wrap items-center gap-1.5 sm:gap-3 bg-black/40">
                          {tierEntries.length === 0 ? (
                            <span className="text-xs text-slate-500 italic px-1">
                              Không có tướng ở Tier {tier}{" "}
                              {selectedVersion ? `(${selectedVersion})` : ""}
                            </span>
                          ) : (
                            tierEntries.map((item) => {
                              const champ = champions.find(
                                (c) => c.id === item.tuong_id,
                              );
                              if (!champ) return null;

                              return (
                                <div
                                  key={item.id}
                                  title={`${champ.ten_tuong} (${item.phandanh_lane}) - ${item.phien_ban || ""}`}
                                  className="group relative cursor-pointer transition-transform hover:scale-105 shrink-0"
                                >
                                  <img
                                    src={
                                      champ.url_anh_dai_dien ||
                                      "/placeholder.jpg"
                                    }
                                    alt={champ.ten_tuong}
                                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover border border-[#bd9867]/60 rounded-sm shadow-md"
                                    referrerPolicy="no-referrer"
                                  />

                                  {/* Nút xóa ✕ hiển thị khi Hover vào ảnh */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTopTier(
                                        item.id,
                                        item.tuong_id,
                                        item.phandanh_lane,
                                      );
                                    }}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 sm:w-5 sm:h-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
                                    title="Xóa tướng"
                                  >
                                    ✕
                                  </button>
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
        </div>
      )}
    </div>
  );
}
