import React, { useState, useEffect } from "react";
import { BioLink, AppearanceSettings, ActivityLog } from "./types";
import {
  INITIAL_LINKS,
  INITIAL_APPEARANCE,
  INITIAL_ACTIVITY_LOGS,
  BANNER_OPTIONS,
} from "./mockData";
import DashboardTab from "./components/DashboardTab";
import ManageLinksTab from "./components/ManageLinksTab";
import AppearanceTab from "./components/AppearanceTab";
import BuildGuidesTab from "./components/BuildGuidesTab";
import PublicBuildGuides from "./components/PublicBuildGuides";
import PhonePreview from "./components/PhonePreview";
import BannerSlideshow from "./components/BannerSlideshow";
import LucideIcon from "./components/LucideIcon";
import BrandIcon from "./components/BrandIcon";
import AdminLogin from "./components/AdminLogin";
import MessagesTab from "./components/MessagesTab";
import DonationsTab from "./components/DonationsTab";
import { dbService } from "./dbService";
import {
  DBUser,
  DBCategory,
  DBLink,
  DBBanner,
  DBChampion,
  DBItem,
  DBSpell,
  DBBadge,
  DBBuildGuide,
  DBMessage,
  DBDonation,
} from "./supabase";

const STORAGE_KEY_LINKS = "vivid_persona_links";
const STORAGE_KEY_APPEARANCE = "vivid_persona_appearance";
const STORAGE_KEY_LOGS = "vivid_persona_logs";

type TabType =
  | "dashboard"
  | "links"
  | "appearance"
  | "guides"
  | "messages"
  | "donations";

declare global {
  interface Window {
    showNotification?: (message: string, type?: "success" | "error" | "info") => void;
  }
}

const isCustomIcon = (icon: string) => {
  return (
    icon &&
    (icon.startsWith("/uploads/") ||
      icon.startsWith("http://") ||
      icon.startsWith("https://") ||
      icon.startsWith("data:"))
  );
};

export default function App() {
  // --- Persistent States from LocalStorage / Supabase Fallbacks ---
  const [links, setLinks] = useState<BioLink[]>(INITIAL_LINKS);
  const [appearance, setAppearance] =
    useState<AppearanceSettings>(INITIAL_APPEARANCE);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(
    INITIAL_ACTIVITY_LOGS,
  );

  // --- Game Library & Guide States ---
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [champions, setChampions] = useState<DBChampion[]>([]);
  const [items, setItems] = useState<DBItem[]>([]);
  const [spells, setSpells] = useState<DBSpell[]>([]);
  const [badges, setBadges] = useState<DBBadge[]>([]);
  const [guides, setGuides] = useState<DBBuildGuide[]>([]);
  const [banners, setBanners] = useState<DBBanner[]>([]);
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [clickLogs, setClickLogs] = useState<any[]>([]);
  const [donations, setDonations] = useState<DBDonation[]>([]);

  // Lazy load flags & status indicators
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true);
  const [isGuidesLoading, setIsGuidesLoading] = useState<boolean>(false);
  const [hasLoadedGuides, setHasLoadedGuides] = useState<boolean>(false);
  const [isClickLogsLoading, setIsClickLogsLoading] = useState<boolean>(false);
  const [hasLoadedClickLogs, setHasLoadedClickLogs] = useState<boolean>(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState<boolean>(false);
  const [hasLoadedMessages, setHasLoadedMessages] = useState<boolean>(false);
  const [isDonationsLoading, setIsDonationsLoading] = useState<boolean>(false);
  const [hasLoadedDonations, setHasLoadedDonations] = useState<boolean>(false);

  // States for donation process
  const [donateStep, setDonateStep] = useState<"form" | "qr">("form");
  const [donorName, setDonorName] = useState("");
  const [donateAmount, setDonateAmount] = useState("");
  const [donateMessage, setDonateMessage] = useState("");
  const [generatedMemo, setGeneratedMemo] = useState("");
  const [selectedDonateMethod, setSelectedDonateMethod] = useState<"bank" | "momo">("bank");
  const [isDonating, setIsDonating] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [selectedMobileBank, setSelectedMobileBank] = useState("vcb");

  // Admin Mode & Auth States
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Navigation tab state: 'dashboard' | 'links' | 'appearance' | 'guides' | 'messages'
  const [activeTab, setActiveTab] = useState<TabType>("links");

  // Contact Form input states for the public view
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorContent, setVisitorContent] = useState("");
  const [subscribedMessage, setSubscribedMessage] = useState<string | null>(
    null,
  );
  const [publicTab, setPublicTab] = useState<"links" | "guides" | "donate">(
    "links",
  );
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // --- Notifications State (multi-toast queue) ---
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: "success" | "error" | "info" }[]>([]);

  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  };

  useEffect(() => {
    window.showNotification = showNotification;
    return () => {
      delete window.showNotification;
    };
  }, []);

  // --- Synchronize & Load Database (Critical elements for Public view & Admin shell) ---
  useEffect(() => {
    async function initAndLoadDb() {
      try {
        // 1. Seed default data if tables are empty
        await dbService.seedGameLibraryIfNeeded();

        // 2. Fetch admin user profile and sync theme configurations
        const profile = await dbService.getProfile();
        if (profile) {
          setDbUser(profile);
        }

        // 3. Fetch links and sync
        const dbLinks = await dbService.getLinks();
        if (dbLinks.length > 0) {
          const mappedLinks: BioLink[] = dbLinks.map((dbl) => {
            const matchedSaved = links.find(
              (l) => l.id === dbl.id || l.title === dbl.tieu_de,
            );
            return {
              id: dbl.id,
              title: dbl.tieu_de,
              url: dbl.url_lienketing,
              icon: dbl.url_icon || "Link2",
              enabled: dbl.hien_thi,
              clicks: matchedSaved?.clicks || 0,
              conversions: matchedSaved?.conversions || 0,
              status: dbl.hien_thi ? "Active" : "Paused",
            };
          });
          setLinks(mappedLinks);
        } else {
          // DB links are empty but we have initial links -> seed into DB
          for (const l of links) {
            await dbService.saveLink({
              tieu_de: l.title,
              url_lienketing: l.url,
              url_icon: l.icon,
              hien_thi: l.enabled,
              thu_tu_uu_tien: 0,
            });
          }
        }

        // 4. Fetch slideshow banners
        let dbBanners = await dbService.getBanners();
        if (dbBanners.length === 0) {
          // Seed initial banners to Supabase
          for (let i = 0; i < BANNER_OPTIONS.length; i++) {
            const b = BANNER_OPTIONS[i];
            await dbService.saveBanner({
              tieu_de: b.name,
              url_hinh_anh: b.url,
              thu_tu_uu_tien: i,
              kich_hoat: true,
            });
          }
          dbBanners = await dbService.getBanners();
        }
        setBanners(dbBanners);
        const activeBanners = dbBanners
          .filter((b) => b.kich_hoat)
          .map((b) => b.url_hinh_anh);

        // Now set appearance only ONCE using both fetched profile and active slideshow banners
        setAppearance((prev) => {
          const finalBannerUrl =
            (profile && profile.anh_bia_url) ||
            prev.bannerUrl ||
            (activeBanners.length > 0
              ? activeBanners[0]
              : BANNER_OPTIONS[0].url);

          return {
            ...prev,
            name: profile ? profile.ten_dang_nhap || prev.name : prev.name,
            bio: profile ? profile.tieu_su || prev.bio : prev.bio,
            avatarUrl: profile
              ? profile.avatar_url || prev.avatarUrl
              : prev.avatarUrl,
            bannerUrl: finalBannerUrl,
            mode: profile
              ? (profile.giao_dien_mode as any) || prev.mode
              : prev.mode,
            fontFamily: profile
              ? (profile.phong_chu as any) || prev.fontFamily
              : prev.fontFamily,
            accentColor: profile
              ? profile.mau_chu_dao || prev.accentColor
              : prev.accentColor,
            selectedBanners:
              activeBanners.length > 0 ? activeBanners : prev.selectedBanners,
            bankName: profile
              ? profile.bank_name || prev.bankName
              : prev.bankName,
            bankAccount: profile
              ? profile.bank_account || prev.bankAccount
              : prev.bankAccount,
            bankOwner: profile
              ? profile.bank_owner || prev.bankOwner
              : prev.bankOwner,
            momoNumber: profile
              ? profile.momo_number || prev.momoNumber
              : prev.momoNumber,
            momoName: profile
              ? profile.momo_name || prev.momoName
              : prev.momoName,
            donateNote: profile
              ? profile.donate_note || prev.donateNote
              : prev.donateNote,
            bankEnabled: profile
              ? profile.bank_enabled !== false
              : prev.bankEnabled,
            momoEnabled: profile
              ? profile.momo_enabled !== false
              : prev.momoEnabled,
            backgroundColor: profile
              ? profile.background_color || prev.backgroundColor
              : prev.backgroundColor,
            linkBackgroundColor: profile
              ? profile.link_background_color || prev.linkBackgroundColor
              : prev.linkBackgroundColor,
            linkTextColor: profile
              ? profile.link_text_color || prev.linkTextColor
              : prev.linkTextColor,
          };
        });
      } catch (err) {
        console.error("Error during initial DB load:", err);
      } finally {
        setIsAppLoading(false);
      }
    }

    initAndLoadDb();
  }, []);

  // Lazy load Click Logs when entering dashboard tab
  useEffect(() => {
    if (activeTab === "dashboard" && !hasLoadedClickLogs) {
      async function fetchClickLogs() {
        setIsClickLogsLoading(true);
        try {
          const dbClicks = await dbService.getClickLogs();
          if (dbClicks) {
            setClickLogs(dbClicks);
          }
        } catch (err) {
          console.warn("Could not fetch click logs from DB:", err);
        } finally {
          setIsClickLogsLoading(false);
          setHasLoadedClickLogs(true);
        }
      }
      fetchClickLogs();
    }
  }, [activeTab, hasLoadedClickLogs]);

  // Lazy load Messages when entering messages tab
  useEffect(() => {
    if (activeTab === "messages" && !hasLoadedMessages) {
      async function fetchMessages() {
        setIsMessagesLoading(true);
        try {
          const dbMessages = await dbService.getMessages();
          if (dbMessages) {
            setMessages(dbMessages);
          }
        } catch (err) {
          console.warn("Could not fetch messages from DB:", err);
        } finally {
          setIsMessagesLoading(false);
          setHasLoadedMessages(true);
        }
      }
      fetchMessages();
    }
  }, [activeTab, hasLoadedMessages]);

  // Lazy load Donations when entering donations tab
  useEffect(() => {
    if (activeTab === "donations" && !hasLoadedDonations) {
      async function fetchDonations() {
        setIsDonationsLoading(true);
        try {
          const dbDonations = await dbService.getDonations();
          if (dbDonations) {
            setDonations(dbDonations);
          }
        } catch (err) {
          console.warn("Could not fetch donations from DB:", err);
        } finally {
          setIsDonationsLoading(false);
          setHasLoadedDonations(true);
        }
      }
      fetchDonations();
    }
  }, [activeTab, hasLoadedDonations]);

  // Lazy load Guides & Game Library when entering guides tab in Admin, or guides in Public View
  useEffect(() => {
    const isGuidesTabActive =
      (isAdminMode && activeTab === "guides") ||
      (!isAdminMode && publicTab === "guides");
    if (isGuidesTabActive && !hasLoadedGuides) {
      async function fetchGuidesAndLibrary() {
        setIsGuidesLoading(true);
        try {
          const [champsData, itemsData, spellsData, badgesData, guidesData] =
            await Promise.all([
              dbService.getChampions(),
              dbService.getItems(),
              dbService.getSpells(),
              dbService.getBadges(),
              dbService.getBuildGuides(),
            ]);

          if (champsData) setChampions(champsData);
          if (itemsData) setItems(itemsData);
          if (spellsData) setSpells(spellsData);
          if (badgesData) setBadges(badgesData);
          if (guidesData) setGuides(guidesData);
        } catch (err) {
          console.warn("Could not fetch guides & library from DB:", err);
        } finally {
          setIsGuidesLoading(false);
          setHasLoadedGuides(true);
        }
      }
      fetchGuidesAndLibrary();
    }
  }, [activeTab, publicTab, isAdminMode, hasLoadedGuides]);

  // --- Handlers for App state modifications ---

  // Click simulation: triggers when clicking a link inside the interactive phone preview
  const handleLinkClick = async (linkId: string) => {
    // 1. Track click in DB
    dbService
      .trackLinkClick(linkId)
      .catch((err) => console.warn("Could not track click in DB", err));

    // Update clickLogs state immediately to reflect in real-time
    setClickLogs((prev) => [
      ...prev,
      {
        id: `click-${Date.now()}-${Math.random()}`,
        duong_dan_id: linkId,
        thiet_bi: "Desktop",
        thoi_gian: new Date().toISOString(),
      },
    ]);

    // 2. Local state update
    setLinks((prev) =>
      prev.map((link) => {
        if (link.id === linkId) {
          const updatedClicks = link.clicks + 1;
          // Compute realistic conversion rate with micro fluctuation
          const updatedConversion = Math.min(
            10,
            parseFloat(
              (link.conversions + (Math.random() * 0.1 - 0.03)).toFixed(1),
            ),
          );

          // Dynamic logs insertion for click spike simulation
          if (updatedClicks % 5 === 0) {
            const timestamp = "Vừa xong";
            const newLog: ActivityLog = {
              id: `act-click-${Date.now()}`,
              type: "spike",
              message: `Cột mốc ${updatedClicks} lượt click đạt được tại `,
              boldText: `"${link.title}"`,
              time: timestamp,
            };
            setActivityLogs((logs) => [newLog, ...logs.slice(0, 9)]);
          }

          return {
            ...link,
            clicks: updatedClicks,
            conversions: updatedConversion > 0 ? updatedConversion : 1.1,
          };
        }
        return link;
      }),
    );
  };

  // Add new custom link
  const handleAddLink = async (title: string, url: string, icon: string) => {
    const tempId = `link-${Date.now()}`;
    const newLink: BioLink = {
      id: tempId,
      title,
      url,
      icon,
      enabled: true,
      clicks: 0,
      conversions: 0,
      status: "Active",
    };

    setLinks((prev) => [newLink, ...prev]);

    // Save to database
    try {
      const saved = await dbService.saveLink({
        tieu_de: title,
        url_lienketing: url,
        url_icon: icon,
        hien_thi: true,
        thu_tu_uu_tien: 0,
      });
      if (saved) {
        setLinks((prev) =>
          prev.map((l) => (l.id === tempId ? { ...l, id: saved.id } : l)),
        );
      }
    } catch (err) {
      console.warn("Failed to save new link to DB:", err);
    }

    // Insert to log
    const timestamp = "Vừa xong";
    const newLog: ActivityLog = {
      id: `act-add-${Date.now()}`,
      type: "create",
      message: "Đã tạo liên kết mới: ",
      boldText: `"${title}"`,
      time: timestamp,
    };
    setActivityLogs((logs) => [newLog, ...logs.slice(0, 9)]);
  };

  // Update existing custom link
  const handleUpdateLink = async (
    id: string,
    title: string,
    url: string,
    icon: string,
  ) => {
    setLinks((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          return {
            ...l,
            title,
            url,
            icon,
          };
        }
        return l;
      }),
    );

    try {
      await dbService.saveLink({
        id,
        tieu_de: title,
        url_lienketing: url,
        url_icon: icon,
      });
    } catch (err) {
      console.warn("Failed to update link in DB:", err);
    }

    const timestamp = "Vừa xong";
    const newLog: ActivityLog = {
      id: `act-update-${Date.now()}`,
      type: "create",
      message: "Đã cập nhật liên kết: ",
      boldText: `"${title}"`,
      time: timestamp,
    };
    setActivityLogs((logs) => [newLog, ...logs.slice(0, 9)]);
  };

  // Delete a link
  const handleDeleteLink = async (id: string) => {
    const linkToDelete = links.find((l) => l.id === id);
    setLinks((prev) => prev.filter((l) => l.id !== id));

    try {
      await dbService.deleteLink(id);
    } catch (err) {
      console.warn("Failed to delete link from DB:", err);
    }

    if (linkToDelete) {
      const timestamp = "Vừa xong";
      const newLog: ActivityLog = {
        id: `act-del-${Date.now()}`,
        type: "cleanup",
        message: `Đã xóa liên kết tiểu sử: `,
        boldText: `"${linkToDelete.title}"`,
        time: timestamp,
      };
      setActivityLogs((logs) => [newLog, ...logs.slice(0, 9)]);
    }
  };

  // Toggle link activation switch
  const handleToggleLink = async (id: string, enabled: boolean) => {
    setLinks((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          return {
            ...l,
            enabled,
            status: enabled ? "Active" : "Paused",
          };
        }
        return l;
      }),
    );

    try {
      await dbService.saveLink({
        id,
        hien_thi: enabled,
      });
    } catch (err) {
      console.warn("Failed to toggle link in DB:", err);
    }
  };

  const handleReorderLinks = (reordered: BioLink[]) => {
    setLinks(reordered);
    // Write priorities back asynchronously
    reordered.forEach(async (l, idx) => {
      try {
        await dbService.saveLink({
          id: l.id,
          thu_tu_uu_tien: idx,
        });
      } catch (e) {
        console.warn("Reordering update failed in DB", e);
      }
    });
  };

  const handleUpdateAppearance = (updates: Partial<AppearanceSettings>) => {
    setAppearance((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  // --- Explicit Database Savers for Appearance sections ---
  const handleSavePersonalInfo = async () => {
    if (dbUser?.id) {
      try {
        const updated = await dbService.updateProfile(dbUser.id, {
          ten_dang_nhap: appearance.name,
          tieu_su: appearance.bio,
          avatar_url: appearance.avatarUrl,
          anh_bia_url: appearance.bannerUrl,
        });
        if (updated) {
          setDbUser(updated);
          showNotification("Đã lưu thông tin cá nhân và ảnh bìa thành công!", "success");
        }
      } catch (err) {
        console.warn("DB update failed", err);
        showNotification("Lỗi kết nối khi cập nhật thông tin cá nhân.", "error");
        throw err;
      }
    } else {
      showNotification("Đã cập nhật cục bộ (Không tìm thấy kết nối Database).", "info");
    }
  };

  const handleSaveInterfaceSettings = async () => {
    if (dbUser?.id) {
      try {
        const updated = await dbService.updateProfile(dbUser.id, {
          giao_dien_mode: appearance.mode,
          phong_chu: appearance.fontFamily,
          mau_chu_dao: appearance.accentColor,
          background_color: appearance.backgroundColor || null,
          link_background_color: appearance.linkBackgroundColor || null,
          link_text_color: appearance.linkTextColor || null,
        });
        if (updated) {
          setDbUser(updated);
          showNotification("Đã lưu cấu hình màu sắc & giao diện vào Database thành công!", "success");
        }
      } catch (err) {
        console.warn("DB update failed", err);
        showNotification("Lỗi kết nối khi cập nhật cấu hình giao diện.", "error");
        throw err;
      }
    } else {
      showNotification("Đã cập nhật cục bộ (Không tìm thấy kết nối Database).", "info");
    }
  };

  const handleSaveDonationSettings = async () => {
    const targetId = dbUser?.id || "00000000-0000-0000-0000-000000000000";
    try {
      const updated = await dbService.updateProfile(targetId, {
        bank_name: appearance.bankName || "",
        bank_account: appearance.bankAccount || "",
        bank_owner: appearance.bankOwner || "",
        momo_number: appearance.momoNumber || "",
        momo_name: appearance.momoName || "",
        donate_note: appearance.donateNote || "",
        bank_enabled: appearance.bankEnabled !== false,
        momo_enabled: appearance.momoEnabled !== false,
      });
      if (updated) {
        setDbUser(updated);
        if (dbUser?.id) {
          showNotification("Đã lưu thông tin tài khoản ủng hộ & donate thành công!", "success");
        } else {
          showNotification("Đã cập nhật cục bộ thông tin tài khoản ủng hộ thành công!", "info");
        }
      }
    } catch (err) {
      console.warn("DB update failed", err);
      showNotification("Lỗi kết nối khi cập nhật cấu hình ủng hộ.", "error");
      throw err;
    }
  };

  // --- Slideshow Banner Database Management ---
  const handleAddBanner = async (title: string, url: string) => {
    try {
      const saved = await dbService.saveBanner({
        tieu_de: title,
        url_hinh_anh: url,
        kich_hoat: true,
        thu_tu_uu_tien: banners.length,
      });
      if (saved) {
        const updatedBanners = [...banners, saved];
        setBanners(updatedBanners);
        const activeBanners = updatedBanners
          .filter((b) => b.kich_hoat)
          .map((b) => b.url_hinh_anh);
        setAppearance((prev) => ({
          ...prev,
          selectedBanners: activeBanners,
          bannerUrl:
            prev.bannerUrl || activeBanners[0] || BANNER_OPTIONS[0].url,
        }));
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi lưu ảnh bìa mới vào Database.");
    }
  };

  const handleToggleBanner = async (
    id: string,
    url: string,
    active: boolean,
  ) => {
    try {
      await dbService.saveBanner({ id, kich_hoat: active });
      const updatedBanners = banners.map((b) =>
        b.id === id ? { ...b, kich_hoat: active } : b,
      );

      const hasActive = updatedBanners.some((b) => b.kich_hoat);
      if (!hasActive) {
        alert(
          "Bạn phải chọn ít nhất 1 ảnh bìa hoạt động để hiển thị Slideshow!",
        );
        return;
      }

      setBanners(updatedBanners);
      const activeBanners = updatedBanners
        .filter((b) => b.kich_hoat)
        .map((b) => b.url_hinh_anh);
      setAppearance((prev) => ({
        ...prev,
        selectedBanners: activeBanners,
        bannerUrl: prev.bannerUrl || activeBanners[0] || BANNER_OPTIONS[0].url,
      }));
    } catch (e) {
      console.error(e);
      alert("Lỗi khi cập nhật trạng thái ảnh bìa.");
    }
  };

  const handleDeleteBanner = async (id: string, url: string) => {
    try {
      const activeBannersCount = banners.filter((b) => b.kich_hoat).length;
      const isBannerActive = banners.find((b) => b.id === id)?.kich_hoat;
      if (isBannerActive && activeBannersCount <= 1) {
        alert(
          "Không thể xóa ảnh bìa này vì đây là ảnh bìa hoạt động duy nhất của Slideshow. Hãy bật ảnh bìa khác trước!",
        );
        return;
      }

      const ok = await dbService.deleteBanner(id);
      if (ok) {
        const updatedBanners = banners.filter((b) => b.id !== id);
        setBanners(updatedBanners);
        const activeBanners = updatedBanners
          .filter((b) => b.kich_hoat)
          .map((b) => b.url_hinh_anh);
        setAppearance((prev) => ({
          ...prev,
          selectedBanners: activeBanners,
          bannerUrl:
            prev.bannerUrl || activeBanners[0] || BANNER_OPTIONS[0].url,
        }));
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi xóa ảnh bìa khỏi Database.");
    }
  };

  // --- Visitor Messaging Board Database ---
  const handleSendMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorEmail.trim() || !visitorContent.trim()) {
      alert("Vui lòng điền đầy đủ các trường thông tin!");
      return;
    }

    try {
      const saved = await dbService.saveMessage({
        ho_ten: visitorName.trim(),
        email: visitorEmail.trim(),
        noi_dung: visitorContent.trim(),
      });
      if (saved) {
        setMessages((prev) => [saved, ...prev]);
        setSubscribedMessage("Gửi tin nhắn lời nhắn thành công!");
        setVisitorName("");
        setVisitorEmail("");
        setVisitorContent("");
        setTimeout(() => setSubscribedMessage(null), 4000);
      } else {
        alert("Gửi lời nhắn thất bại. Vui lòng kiểm tra lại cấu hình DB.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối hệ thống khi gửi tin nhắn.");
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const ok = await dbService.deleteMessage(id);
      if (ok) {
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa tin nhắn.");
    }
  };

  const handleUpdateDonationStatus = async (id: string, status: number) => {
    try {
      const ok = await dbService.updateDonationStatus(id, status);
      if (ok) {
        setDonations((prev) =>
          prev.map((d) => (d.id === id ? { ...d, trang_thai: status } : d)),
        );
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật trạng thái ủng hộ.");
    }
  };

  const handleDeleteDonation = async (id: string) => {
    try {
      const ok = await dbService.deleteDonation(id);
      if (ok) {
        setDonations((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa lượt ủng hộ.");
    }
  };

  const generateMemoCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handlePublicDonateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim()) {
      alert("Vui lòng nhập tên người ủng hộ.");
      return;
    }
    const amountNum = Number(donateAmount);
    if (!donateAmount || isNaN(amountNum) || amountNum <= 0) {
      alert("Vui lòng nhập số tiền ủng hộ hợp lệ (lớn hơn 0).");
      return;
    }

    setIsDonating(true);
    try {
      const code = generateMemoCode();
      const newDonation = {
        ten_nguoi_ung_ho: donorName.trim(),
        so_tien: amountNum,
        noi_dung: donateMessage.trim(),
        noi_dung_ck: code,
        trang_thai: 0,
      };

      const saved = await dbService.saveDonation(newDonation);
      if (saved) {
        setGeneratedMemo(code);
        setDonateStep("qr");
        if (hasLoadedDonations) {
          setDonations((prev) => [saved, ...prev]);
        }
      } else {
        alert("Có lỗi xảy ra khi gửi thông tin ủng hộ. Vui lòng thử lại!");
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi kết nối. Vui lòng thử lại!");
    } finally {
      setIsDonating(false);
    }
  };

  const handleResetDonateForm = () => {
    setDonateStep("form");
    setDonorName("");
    setDonateAmount("");
    setDonateMessage("");
    setGeneratedMemo("");
  };

  const handleDownloadQR = async () => {
    const url = selectedDonateMethod === "momo" && appearance.momoNumber
      ? `https://img.vietqr.io/image/MOMO-${appearance.momoNumber}-compact2.png?amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.momoName || "")}`
      : `https://img.vietqr.io/image/${(appearance.bankName || "MB").replace(/\s+/g, "")}-${appearance.bankAccount}-compact2.png?amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.bankOwner || "")}`;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `QR_Donate_${generatedMemo || "VietQR"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Could not download via fetch, opening in new tab:", err);
      window.open(url, "_blank");
    }
  };

  const handleRedirectToBankApp = () => {
    const appCode = selectedMobileBank;
    let redirectUrl = "";
    if (appCode === "momo") {
      redirectUrl = `https://dl.vietqr.co/pay?app=momo&amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.momoName || "")}`;
    } else {
      redirectUrl = `https://dl.vietqr.co/pay?app=${appCode}&amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.bankOwner || "")}`;
    }
    window.open(redirectUrl, "_blank");
  };

  // Reset to default seed mockup state (clears localstorage changes)
  const handleResetData = async () => {
    if (
      confirm(
        "Bạn có chắc chắn muốn khôi phục lại cấu hình mặc định ban đầu không? Mọi chỉnh sửa cục bộ và DB của bạn sẽ bị xóa.",
      )
    ) {
      setLinks(INITIAL_LINKS);
      setAppearance(INITIAL_APPEARANCE);
      setActivityLogs(INITIAL_ACTIVITY_LOGS);

      // Clean DB entries if possible
      try {
        const currentLinks = await dbService.getLinks();
        for (const l of currentLinks) {
          await dbService.deleteLink(l.id);
        }
        for (const l of INITIAL_LINKS) {
          await dbService.saveLink({
            tieu_de: l.title,
            url_lienketing: l.url,
            url_icon: l.icon,
            hien_thi: l.enabled,
          });
        }
      } catch (err) {
        console.warn("DB partial reset warning", err);
      }
    }
  };

  // --- Handlers for Game Build Guides ---
  const handleSaveBuildGuide = async (
    guide: Partial<DBBuildGuide>,
    itemsMap: { item_id: string; o_so: number }[],
    badgesMap: { phu_hieu_id: string; vi_tri_o: string }[],
  ) => {
    try {
      const saved = await dbService.saveBuildGuide(guide, itemsMap, badgesMap);
      if (saved) {
        setGuides((prev) => {
          const index = prev.findIndex((g) => g.id === saved.id);
          if (index !== -1) {
            const next = [...prev];
            next[index] = saved;
            return next;
          } else {
            return [saved, ...prev];
          }
        });
      }
    } catch (err) {
      console.error("Failed to save build guide in App state", err);
    }
  };

  const handleDeleteBuildGuide = async (id: string) => {
    try {
      const ok = await dbService.deleteBuildGuide(id);
      if (ok) {
        setGuides((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete build guide in App state", err);
    }
  };

  const activeLinksCount = links.filter((l) => l.enabled).length;

  const isDarkPublic = appearance.mode === "dark";

  // Font class resolver for the public page to dynamically apply selected theme font
  const getFontFamilyClass = () => {
    if (appearance.fontFamily === "Plus Jakarta Sans") return "font-display";
    if (appearance.fontFamily === "JetBrains Mono") return "font-mono";
    return "font-sans";
  };

  if (isAppLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/giphy.webp"
            alt="Loading..."
            className="w-32 h-32 object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="text-slate-400 font-bold tracking-wider text-xs uppercase animate-pulse">
            Đang tải dữ liệu...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen font-sans flex flex-col transition-all duration-500 ${
        isAdminMode
          ? "bg-[#f7f9fb] text-slate-800"
          : isDarkPublic
            ? "text-slate-100"
            : "text-slate-800"
      }`}
      style={
        !isAdminMode
          ? {
              backgroundColor: appearance.backgroundColor
                ? appearance.backgroundColor
                : isDarkPublic
                  ? "#0c0d1b"
                  : `${appearance.accentColor}0a`,
            }
          : undefined
      }
    >
      {/* Toast Alert subscription popup */}
      {subscribedMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold font-sans animate-bounce">
          <LucideIcon name="Check" className="text-emerald-400" size={16} />
          {subscribedMessage}
        </div>
      )}

      {/* Dynamic Upper-Right Notifications */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`pointer-events-auto px-4 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold font-sans transition-all duration-300 transform translate-y-0 ${
              notif.type === "success"
                ? "bg-emerald-600 text-white"
                : notif.type === "error"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-900 text-white"
            }`}
          >
            <LucideIcon
              name={
                notif.type === "success"
                  ? "Check"
                  : notif.type === "error"
                    ? "AlertTriangle"
                    : "Info"
              }
              size={16}
              className="shrink-0"
            />
            <div className="flex-1">{notif.message}</div>
          </div>
        ))}
      </div>

      {/* Glass Navigation Header - ONLY visible when in Admin panel */}
      {isAdminMode ? (
        <header className="sticky top-0 z-40 bg-[#f7f9fb]/90 backdrop-blur-md border-b border-slate-100/80 transition-colors duration-300">
          <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
            {/* Logo Brand Title */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setActiveTab("links")}
            >
              <span
                className="font-display text-xl font-extrabold tracking-tight"
                style={{ color: appearance.accentColor }}
              >
                Vivid Persona
              </span>
              <span className="hidden sm:inline bg-slate-100 text-slate-500 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold">
                Admin
              </span>
            </div>

            {/* Center Tabs Navigation */}
            <nav className="flex items-center gap-1.5 sm:gap-4">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-slate-100 text-slate-800"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LucideIcon name="Activity" size={14} />
                <span className="hidden sm:inline">Bảng điều khiển</span>
              </button>
              <button
                onClick={() => setActiveTab("links")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "links"
                    ? "bg-slate-100 text-slate-800"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LucideIcon name="Link2" size={14} />
                <span className="hidden sm:inline">Liên kết</span>
              </button>
              <button
                onClick={() => setActiveTab("appearance")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "appearance"
                    ? "bg-slate-100 text-slate-800"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LucideIcon name="Palette" size={14} />
                <span className="hidden sm:inline">Giao diện</span>
              </button>
              <button
                onClick={() => setActiveTab("messages")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === "messages"
                    ? "bg-slate-100 text-slate-800"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LucideIcon name="MessageSquare" size={14} />
                <span className="hidden sm:inline">Tin nhắn</span>
                {messages.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                    {messages.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("donations")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === "donations"
                    ? "bg-slate-100 text-slate-800"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LucideIcon name="Heart" size={14} />
                <span className="hidden sm:inline">Ủng hộ (Donate)</span>
                {donations.filter((d) => d.trang_thai === 0).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold animate-pulse">
                    {donations.filter((d) => d.trang_thai === 0).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("guides")}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "guides"
                    ? "bg-slate-100 text-slate-800"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LucideIcon name="Shield" size={14} />
                <span className="hidden sm:inline">Giáo án & Đồ Game</span>
              </button>
            </nav>

            {/* Right side View Public Profile exit button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetData}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors hidden md:block"
                title="Khôi phục cài đặt gốc"
              >
                <LucideIcon name="Undo" size={16} />
              </button>

              <button
                onClick={() => setIsAdminMode(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 bg-white shadow-sm"
              >
                <LucideIcon
                  name="Globe"
                  size={14}
                  className="text-indigo-500 animate-pulse"
                />
                <span className="hidden sm:inline">Xem trang trực tiếp</span>
                <span className="inline sm:hidden">Xem</span>
              </button>

              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  setIsAdminMode(false);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all flex items-center gap-1.5 cursor-pointer border border-red-200 bg-white shadow-sm"
                title="Đăng xuất khỏi bảng quản trị"
              >
                <LucideIcon name="LogOut" size={14} />
                <span className="hidden md:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>
      ) : null}

      {/* --- Main Contents --- */}
      <main
        className={`flex-grow w-full mx-auto transition-all duration-300 ${isAdminMode ? "max-w-7xl px-4 sm:px-6 py-6" : "max-w-5xl px-4 sm:px-6 py-6 sm:py-12 flex flex-col"}`}
      >
        {isAdminMode ? (
          /* EDITING MODE: Two-column grid layout (left: tab content, right: live sticky phone mockup) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
            {/* Left Column: Management tab control cards */}
            <div
              className={`${activeTab === "links" || activeTab === "appearance" ? "lg:col-span-7" : "lg:col-span-12"} space-y-6`}
            >
              {activeTab === "dashboard" &&
                (isClickLogsLoading ? (
                  <div className="space-y-6 animate-pulse">
                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3"></div>
                    <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                      <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                      <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                      <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                      <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                    </div>
                  </div>
                ) : (
                  <DashboardTab
                    name={appearance.name}
                    activityLogs={activityLogs}
                    accentColor={appearance.accentColor}
                    links={links}
                    clickLogs={clickLogs}
                  />
                ))}

              {activeTab === "links" && (
                <ManageLinksTab
                  links={links}
                  onAddLink={handleAddLink}
                  onUpdateLink={handleUpdateLink}
                  onDeleteLink={handleDeleteLink}
                  onToggleLink={handleToggleLink}
                  onReorderLinks={handleReorderLinks}
                  accentColor={appearance.accentColor}
                />
              )}

              {activeTab === "appearance" && (
                <AppearanceTab
                  appearance={appearance}
                  onUpdateAppearance={handleUpdateAppearance}
                  dbBanners={banners}
                  onAddBanner={handleAddBanner}
                  onToggleBanner={handleToggleBanner}
                  onDeleteBanner={handleDeleteBanner}
                  onSavePersonalInfo={handleSavePersonalInfo}
                  onSaveInterfaceSettings={handleSaveInterfaceSettings}
                  onSaveDonationSettings={handleSaveDonationSettings}
                />
              )}

              {activeTab === "messages" &&
                (isMessagesLoading ? (
                  <div className="space-y-6 animate-pulse">
                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4"></div>
                    <div className="space-y-4">
                      <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                      <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                      <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                    </div>
                  </div>
                ) : (
                  <MessagesTab
                    messages={messages}
                    onDeleteMessage={handleDeleteMessage}
                    accentColor={appearance.accentColor}
                  />
                ))}

              {activeTab === "donations" &&
                (isDonationsLoading ? (
                  <div className="space-y-6 animate-pulse">
                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4"></div>
                    <div className="space-y-4">
                      <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                      <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                      <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                    </div>
                  </div>
                ) : (
                  <DonationsTab
                    donations={donations}
                    onUpdateStatus={handleUpdateDonationStatus}
                    onDeleteDonation={handleDeleteDonation}
                    accentColor={appearance.accentColor}
                  />
                ))}

              {activeTab === "guides" &&
                (isGuidesLoading ? (
                  <div className="space-y-6 animate-pulse">
                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                    </div>
                  </div>
                ) : (
                  <BuildGuidesTab
                    champions={champions}
                    items={items}
                    spells={spells}
                    badges={badges}
                    guides={guides}
                    onSaveGuide={handleSaveBuildGuide}
                    onDeleteGuide={handleDeleteBuildGuide}
                    accentColor={appearance.accentColor}
                  />
                ))}
            </div>

            {/* Right Column: Live Sticky Mockup Preview (Only visible in Links & Appearance) */}
            {(activeTab === "links" || activeTab === "appearance") && (
              <div className="lg:col-span-5 flex flex-col items-center lg:sticky lg:top-24 mt-6 lg:mt-0">
                {/* <div className="mb-4 bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 max-w-xs text-center justify-center shadow-sm">
                  <LucideIcon
                    name="Info"
                    size={12}
                    className="shrink-0 text-amber-500"
                  />
                  <span>
                    Nhấp vào các liên kết trong mô hình điện thoại để cập nhật
                    số lượt click!
                  </span>
                </div> */}

                <PhonePreview
                  links={links}
                  appearance={appearance}
                  onLinkClick={handleLinkClick}
                />
              </div>
            )}
          </div>
        ) : (
          /* PUBLIC RESPONSIVE VIEW: A beautiful fully-fledged widescreen portfolio website adapting from desktop to mobile fluidly without narrow mockup frames */
          <div
            className={`w-full max-w-4xl mx-auto animate-in fade-in duration-500 pb-12 transition-all duration-300 ${getFontFamilyClass()} ${
              isDarkPublic ? "text-slate-100" : "text-slate-800"
            }`}
          >
            {/* 1. Cover Banner (Ảnh bìa tĩnh) at the very top */}
            <div className="w-full relative overflow-hidden rounded-md bg-slate-950 shadow-md h-40 sm:h-56 md:h-64 transition-all duration-300">
              <img
                src={appearance.bannerUrl}
                alt="Cover banner"
                className="w-full h-full object-cover opacity-95"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"></div>
            </div>

            {/* 2. Avatar overlaps the banner slightly and the text aligns to its lower quarter consistently */}
            <div className="relative px-4 sm:px-8 z-10 md:-mt-12 -mt-6 mb-8">
              <div className="flex items-end gap-4">
                {/* Overlapping Avatar */}
                <div className="shrink-0 -mt-2">
                  <div
                    className={`md:w-36 md:h-36 w-24 h-24 sm:w-18 sm:h-18 rounded-full border-4 shadow-xl overflow-hidden transition-all duration-300 ${
                      isDarkPublic
                        ? "border-slate-900 bg-slate-950"
                        : "border-white bg-white"
                    }`}
                  >
                    <img
                      src={appearance.avatarUrl}
                      alt={appearance.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                {/* Identity details */}
                <div className="flex-1 min-w-0 text-left self-end pb-2">
                  <h1
                    className={`text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-tight ${isDarkPublic ? "text-white" : "text-slate-800"}`}
                  >
                    {appearance.name || "Alex Rivera"}
                  </h1>
                  <p
                    className={`text-xs sm:text-sm font-medium mt-1 leading-relaxed max-w-2xl ${isDarkPublic ? "text-slate-400" : "text-slate-600"}`}
                  >
                    {appearance.bio ||
                      "Building the future of visual identity."}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Sliding Banner (Banner chạy slide) */}
            <div className="w-full relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-md mt-6">
              <BannerSlideshow
                images={
                  appearance.selectedBanners &&
                  appearance.selectedBanners.length > 0
                    ? appearance.selectedBanners
                    : [appearance.bannerUrl]
                }
                autoplayInterval={5000}
                className="h-40 sm:h-56 md:h-64 w-full"
              />
            </div>

            {/* 4. Beautiful, High-End Navigation Menu Bar located below the sliding banner */}
            <div className="mt-6 flex justify-center sm:justify-start">
              <div
                className={`grid grid-cols-3 p-0.5 w-full rounded-md shadow-sm border transition-colors ${
                  isDarkPublic
                    ? "bg-slate-900 border-slate-800/80"
                    : "bg-white border-slate-150"
                }`}
              >
                {/* Button 1: Liên hệ */}
                <button
                  onClick={() => setPublicTab("links")}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                    publicTab === "links"
                      ? "text-white shadow-xs"
                      : isDarkPublic
                        ? "text-slate-400 hover:text-slate-200"
                        : "text-slate-600 hover:text-slate-800"
                  }`}
                  style={
                    publicTab === "links"
                      ? { backgroundColor: appearance.accentColor }
                      : undefined
                  }
                >
                  <LucideIcon name="Link2" size={15} />
                  <span>LIÊN HỆ</span>
                </button>

                {/* Button 2: Trang bị */}
                <button
                  onClick={() => setPublicTab("guides")}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                    publicTab === "guides"
                      ? "text-white shadow-xs"
                      : isDarkPublic
                        ? "text-slate-400 hover:text-slate-200"
                        : "text-slate-600 hover:text-slate-800"
                  }`}
                  style={
                    publicTab === "guides"
                      ? { backgroundColor: appearance.accentColor }
                      : undefined
                  }
                >
                  <LucideIcon name="BookOpen" size={15} />
                  <span>TRANG BỊ</span>
                </button>

                {/* Button 3: Ủng hộ */}
                <button
                  onClick={() => setPublicTab("donate")}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                    publicTab === "donate"
                      ? "text-white shadow-xs"
                      : isDarkPublic
                        ? "text-slate-400 hover:text-slate-200"
                        : "text-slate-600 hover:text-slate-800"
                  }`}
                  style={
                    publicTab === "donate"
                      ? { backgroundColor: appearance.accentColor }
                      : undefined
                  }
                >
                  <LucideIcon name="Heart" size={15} />
                  <span>ỦNG HỘ</span>
                </button>
              </div>
            </div>

            {/* 5. Main public content area */}
            <div className="w-full mt-6 space-y-6">
              {publicTab === "links" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Section Title */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-4 rounded-full"
                      style={{ backgroundColor: appearance.accentColor }}
                    ></div>
                    <h2
                      className={`text-xL font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-500" : "text-slate-400"}`}
                    >
                      Liên kết cá nhân
                    </h2>
                  </div>

                  {/* Public Links list */}
                  <div className="w-full grid grid-cols-1 gap-4">
                    {links
                      .filter((l) => l.enabled)
                      .map((link) => {
                        return (
                          <a
                            key={link.id}
                            href={`https://${link.url}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => handleLinkClick(link.id)}
                            className={`flex items-center p-3.5 px-4.5 border-2 rounded-2xl hover:shadow-md transition-all hover:-translate-y-0.5 group active:scale-[0.99] ${
                              isDarkPublic
                                ? "bg-slate-900/60 hover:bg-slate-850"
                                : "bg-white shadow-xs hover:bg-slate-50/50"
                            }`}
                            style={{
                              backgroundColor:
                                appearance.linkBackgroundColor || undefined,
                              borderColor: appearance.linkBackgroundColor
                                ? "transparent"
                                : `${appearance.accentColor}30`, // semi-transparent primary color border
                              borderLeft: `5px solid ${appearance.accentColor}`, // solid main primary color thick left accent
                            }}
                          >
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center mr-4 shrink-0 transition-all ${
                                isCustomIcon(link.icon)
                                  ? "p-0 bg-transparent border-0"
                                  : "p-1 bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              <BrandIcon
                                title={link.title}
                                iconName={link.icon}
                                size={isCustomIcon(link.icon) ? 44 : 22}
                              />
                            </div>

                            <div className="flex-1 min-w-0 pr-3">
                              <p
                                className="font-extrabold text-sm sm:text-base transition-colors"
                                style={{
                                  color:
                                    appearance.linkTextColor ||
                                    (isDarkPublic ? "#ffffff" : "#1e293b"),
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color =
                                    appearance.accentColor;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color =
                                    appearance.linkTextColor ||
                                    (isDarkPublic ? "#ffffff" : "#1e293b");
                                }}
                              >
                                {link.title}
                              </p>
                            </div>

                            <LucideIcon
                              name="chevron_right"
                              className="transition-transform group-hover:translate-x-1"
                              style={{
                                color:
                                  appearance.linkTextColor ||
                                  appearance.accentColor,
                              }}
                              size={18}
                            />
                          </a>
                        );
                      })}

                    {links.filter((l) => l.enabled).length === 0 && (
                      <div
                        className={`text-center p-12 border border-dashed rounded-2xl font-sans text-sm ${
                          isDarkPublic
                            ? "border-slate-800 text-slate-500 bg-slate-900/50"
                            : "border-slate-200 text-slate-400 bg-slate-50/50"
                        }`}
                      >
                        Hồ sơ này chưa có liên kết hoạt động nào.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {publicTab === "guides" && (
                <div className="animate-in fade-in duration-300">
                  {isGuidesLoading ? (
                    <div className="space-y-6 animate-pulse">
                      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4"></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                        <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                        <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                      </div>
                    </div>
                  ) : (
                    <PublicBuildGuides
                      guides={guides}
                      isDark={isDarkPublic}
                      accentColor={appearance.accentColor}
                    />
                  )}
                </div>
              )}

              {publicTab === "donate" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-4 rounded-full"
                      style={{ backgroundColor: appearance.accentColor }}
                    ></div>
                    <h2
                      className={`text-xl font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
                    >
                      Ủng hộ & Donate
                    </h2>
                  </div>

                  {donateStep === "form" ? (
                    <div className="space-y-5">
                      <p
                        className={`text-xs sm:text-sm leading-relaxed ${isDarkPublic ? "text-slate-400" : "text-slate-600"}`}
                      >
                        {appearance.donateNote ||
                          "Cảm ơn các bạn đã ủng hộ mình để phát triển nhiều giáo án chất lượng hơn nữa!"}
                      </p>

                      <form onSubmit={handlePublicDonateSubmit} className="space-y-4 text-left">
                        {/* Donor Name */}
                        <div className="space-y-1">
                          <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}>
                            Tên người ủng hộ *
                          </label>
                          <input
                            type="text"
                            required
                            value={donorName}
                            onChange={(e) => setDonorName(e.target.value)}
                            placeholder="Nhập tên hiển thị trên stream..."
                            className={`w-full p-3 rounded-xl border outline-none transition-all text-sm font-sans font-medium ${isDarkPublic ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-700" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"}`}
                          />
                        </div>

                        {/* Amount */}
                        <div className="space-y-1">
                          <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}>
                            Số tiền ủng hộ (VNĐ) *
                          </label>
                          <input
                            type="number"
                            required
                            min="1000"
                            step="1000"
                            value={donateAmount}
                            onChange={(e) => setDonateAmount(e.target.value)}
                            placeholder="Ví dụ: 50000"
                            className={`w-full p-3 rounded-xl border outline-none transition-all text-sm font-sans font-medium ${isDarkPublic ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-700" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"}`}
                          />

                          {/* Quick Amount Choices */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {[2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setDonateAmount(String(val))}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                  isDarkPublic
                                    ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                                    : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {val.toLocaleString("vi-VN")} đ
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Stream Message */}
                        <div className="space-y-1">
                          <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}>
                            Lời nhắn (Hiển thị trên stream)
                          </label>
                          <textarea
                            value={donateMessage}
                            onChange={(e) => setDonateMessage(e.target.value)}
                            placeholder="Gửi lời chúc, góp ý hoặc lời nhắn của bạn..."
                            rows={3}
                            maxLength={200}
                            className={`w-full p-3 rounded-xl border outline-none transition-all text-sm font-sans font-medium resize-none ${isDarkPublic ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-700" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"}`}
                          />
                        </div>

                        {/* Select payment method if both bank and momo are configured */}
                        {appearance.bankEnabled !== false &&
                          appearance.bankAccount &&
                          appearance.momoEnabled !== false &&
                          appearance.momoNumber && (
                            <div className="space-y-1.5 pt-1">
                              <label className={`block text-xs font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}>
                                Phương thức thanh toán
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDonateMethod("bank")}
                                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    selectedDonateMethod === "bank"
                                      ? "border-transparent text-white"
                                      : isDarkPublic
                                        ? "border-slate-800 text-slate-400 hover:bg-slate-850"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                  style={
                                    selectedDonateMethod === "bank"
                                      ? { backgroundColor: appearance.accentColor }
                                      : {}
                                  }
                                >
                                  <LucideIcon name="CreditCard" size={14} />
                                  <span>Ngân hàng</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDonateMethod("momo")}
                                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    selectedDonateMethod === "momo"
                                      ? "border-transparent text-white"
                                      : isDarkPublic
                                        ? "border-slate-800 text-slate-400 hover:bg-slate-850"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                  style={
                                    selectedDonateMethod === "momo"
                                      ? { backgroundColor: appearance.accentColor }
                                      : {}
                                  }
                                >
                                  <LucideIcon name="Wallet" size={14} />
                                  <span>Ví MoMo</span>
                                </button>
                              </div>
                            </div>
                          )}

                        {/* Submit Button */}
                        <div className="pt-2">
                          {!(appearance.bankAccount || appearance.momoNumber) ? (
                            <div className="text-center text-xs text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-100 dark:border-red-900/30 font-semibold">
                              Chưa cấu hình tài khoản nhận ủng hộ. Admin vui lòng cấu hình tài khoản trong phần Giao diện.
                            </div>
                          ) : (
                            <button
                              type="submit"
                              disabled={isDonating}
                              className="w-full py-3 px-4 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer hover:opacity-90 active:scale-[0.99]"
                              style={{ backgroundColor: appearance.accentColor }}
                            >
                              {isDonating ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <LucideIcon name="ArrowRight" size={16} />
                              )}
                              <span>Tạo mã QR ủng hộ</span>
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  ) : (
                    /* Step 2: Show QR Code and Instructions */
                    <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                      <div className="text-center space-y-1">
                        <p className={`text-xs font-bold uppercase tracking-widest ${isDarkPublic ? "text-emerald-400" : "text-emerald-600"}`}>
                          Đăng ký ủng hộ thành công!
                        </p>
                        <h3 className={`font-display font-extrabold text-base ${isDarkPublic ? "text-slate-100" : "text-slate-800"}`}>
                          Quét mã để chuyển khoản tự động
                        </h3>
                      </div>

                      {/* Dynamic QR Display */}
                      <div className="flex flex-col items-center space-y-2.5">
                        <div className="p-3 bg-white rounded-3xl shadow-md border border-slate-100 dark:border-slate-800 flex items-center justify-center w-52 h-52 aspect-square">
                          <img
                            src={
                              selectedDonateMethod === "momo" && appearance.momoNumber
                                ? `https://img.vietqr.io/image/MOMO-${appearance.momoNumber}-compact2.png?amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.momoName || "")}`
                                : `https://img.vietqr.io/image/${(appearance.bankName || "MB").replace(/\s+/g, "")}-${appearance.bankAccount}-compact2.png?amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.bankOwner || "")}`
                            }
                            alt="Donation QR Code"
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadQR}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:opacity-95 cursor-pointer ${
                            isDarkPublic
                              ? "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-850"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <LucideIcon name="Download" size={14} />
                          <span>Lưu ảnh QR về máy</span>
                        </button>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Mã QR tích hợp số tiền & nội dung tự động
                        </span>
                      </div>

                      {/* Transfer content highlight */}
                      <div className={`p-4 rounded-xl border text-left space-y-2.5 ${isDarkPublic ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-150"}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400 font-medium">Số tiền chuyển:</span>
                          <span className={`text-sm font-black ${isDarkPublic ? "text-slate-100" : "text-slate-800"}`}>
                            {Number(donateAmount).toLocaleString("vi-VN")} VNĐ
                          </span>
                        </div>

                        <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-1"></div>

                        <div className="space-y-1">
                          <span className="text-xs text-slate-400 font-medium block">Nội dung chuyển khoản (Bắt buộc đúng):</span>
                          <div className="flex gap-2">
                            <div className={`flex-1 font-mono font-black text-center text-lg py-2.5 px-3 rounded-lg border border-dashed select-all uppercase tracking-wider ${
                              isDarkPublic
                                ? "bg-slate-850 border-slate-700 text-yellow-400"
                                : "bg-yellow-50 border-yellow-200 text-amber-800"
                            }`}>
                              {generatedMemo}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(generatedMemo);
                                setCopiedMemo(true);
                                setTimeout(() => setCopiedMemo(false), 2000);
                              }}
                              className="px-3.5 rounded-lg text-white transition-all flex items-center justify-center shrink-0 cursor-pointer text-xs font-bold"
                              style={{ backgroundColor: appearance.accentColor }}
                            >
                              {copiedMemo ? (
                                <LucideIcon name="Check" size={16} />
                              ) : (
                                <LucideIcon name="Copy" size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Banking App Redirection Section */}
                      <div className={`p-4 rounded-xl border text-left space-y-3 ${isDarkPublic ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-150"}`}>
                        <div className="space-y-1">
                          <span className={`text-xs font-bold uppercase tracking-wider block ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}>
                            Chọn ứng dụng ngân hàng để thanh toán nhanh:
                          </span>
                          <div className="flex gap-2">
                            <select
                              value={selectedMobileBank}
                              onChange={(e) => setSelectedMobileBank(e.target.value)}
                              className={`flex-1 p-2.5 rounded-xl border outline-none transition-all text-xs font-bold cursor-pointer ${
                                isDarkPublic
                                  ? "bg-slate-850 border-slate-700 text-white"
                                  : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                              }`}
                            >
                              <option value="mb">MB Bank (Ngân hàng Quân đội)</option>
                              <option value="vcb">Vietcombank</option>
                              <option value="tcb">Techcombank</option>
                              <option value="bidv">BIDV</option>
                              <option value="vtb">VietinBank</option>
                              <option value="tpb">TPBank</option>
                              <option value="vpb">VPBank</option>
                              <option value="acb">ACB</option>
                              <option value="momo">Ví MoMo</option>
                            </select>
                            <button
                              type="button"
                              onClick={handleRedirectToBankApp}
                              className="px-4 py-2.5 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-xs hover:opacity-90 active:scale-[0.98]"
                              style={{ backgroundColor: appearance.accentColor }}
                            >
                              <LucideIcon name="ExternalLink" size={14} />
                              <span>Mở App</span>
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Hệ thống sẽ tự động chuyển hướng và điền thông tin chuyển khoản trên ứng dụng ngân hàng của bạn.
                          </p>
                        </div>
                      </div>

                      {/* Guide list */}
                      <div className={`text-left text-xs leading-relaxed space-y-1.5 p-3 rounded-xl ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}>
                        <p className="font-bold flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          Bước 1: Lưu ảnh QR ở trên HOẶC chọn ứng dụng ngân hàng của bạn rồi nhấn "Mở App" để chuyển khoản tự động.
                        </p>
                        <p className="font-bold flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          Bước 2: Kiểm tra số tiền chuyển khoản trùng khớp với yêu cầu ở trên.
                        </p>
                        <p className="font-bold flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          Bước 3: Nhấn chuyển khoản trên điện thoại. Sau khi chuyển khoản thành công, nhấn "Xác nhận đã chuyển" bên dưới.
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => setDonateStep("form")}
                          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all text-xs text-center border cursor-pointer ${
                            isDarkPublic
                              ? "border-slate-800 text-slate-400 hover:bg-slate-850"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Quay lại
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleResetDonateForm();
                            alert(
                              "Cảm ơn bạn rất nhiều! Ủng hộ của bạn đã được lưu ở trạng thái chờ duyệt. Admin sẽ sớm phê duyệt giao dịch của bạn để hiển thị trên stream!",
                            );
                          }}
                          className="flex-grow py-3 px-4 rounded-xl text-white font-bold transition-all text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:opacity-95"
                          style={{ backgroundColor: appearance.accentColor }}
                        >
                          <LucideIcon name="CheckCircle" size={14} />
                          <span>Xác nhận đã chuyển</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contact message board instead of newsletter subscription */}
              {appearance.newsletterEnabled && (
                <div
                  className={`w-full p-6 sm:p-8 rounded-2xl border text-left transition-colors duration-300 mt-8 ${
                    isDarkPublic
                      ? "bg-slate-900 border-slate-800"
                      : "bg-white border-slate-150 shadow-sm"
                  }`}
                >
                  <h3 className="font-bold text-sm sm:text-base mb-1 flex items-center gap-2">
                    <LucideIcon
                      name="MessageSquare"
                      size={16}
                      style={{ color: appearance.accentColor }}
                    />
                    Nhắn tin cho tôi
                  </h3>
                  <p
                    className={`text-xs sm:text-sm mb-6 leading-relaxed ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Gửi lời chúc, góp ý hoặc tin nhắn liên hệ trực tiếp cho quản
                    trị viên.
                  </p>
                  <form
                    onSubmit={handleSendMessageSubmit}
                    className="flex flex-col gap-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label
                          className={`text-[10px] font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
                        >
                          Họ và tên
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Họ và tên của bạn"
                          value={visitorName}
                          onChange={(e) => setVisitorName(e.target.value)}
                          className={`w-full rounded-xl px-4 py-3 outline-none transition-all text-xs sm:text-sm border ${
                            isDarkPublic
                              ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500"
                              : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label
                          className={`text-[10px] font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
                        >
                          Địa chỉ Email
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="Địa chỉ Email"
                          value={visitorEmail}
                          onChange={(e) => setVisitorEmail(e.target.value)}
                          className={`w-full rounded-xl px-4 py-3 outline-none transition-all text-xs sm:text-sm border ${
                            isDarkPublic
                              ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500"
                              : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                          }`}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label
                        className={`text-[10px] font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
                      >
                        Nội dung lời nhắn
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Nội dung lời nhắn..."
                        value={visitorContent}
                        onChange={(e) => setVisitorContent(e.target.value)}
                        className={`w-full rounded-xl px-4 py-3 outline-none transition-all text-xs sm:text-sm border resize-none ${
                          isDarkPublic
                            ? "bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500"
                            : "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500"
                        }`}
                      />
                    </div>
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        className="text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all text-xs sm:text-sm cursor-pointer shadow-md w-full sm:w-auto"
                        style={{ backgroundColor: appearance.accentColor }}
                      >
                        Gửi tin nhắn
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Footer and branding navigation inline */}
              <div className="pt-8 border-t border-slate-100/50 dark:border-slate-900/50 flex flex-col items-center sm:flex-row sm:justify-between gap-4">
                <div className="flex gap-6 text-slate-400 dark:text-slate-500 text-xs font-medium">
                  <a
                    href="#privacy"
                    className="hover:text-indigo-500 transition-colors"
                  >
                    Bảo mật
                  </a>
                  <a
                    href="#terms"
                    className="hover:text-indigo-500 transition-colors"
                  >
                    Điều khoản
                  </a>
                  <a
                    href="#support"
                    className="hover:text-indigo-500 transition-colors"
                  >
                    Hỗ trợ
                  </a>
                </div>

                <div className="flex flex-col items-center sm:items-end">
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-indigo-500 animate-pulse">
                    Hoang DEV
                  </span>
                  <p className="text-[15px] text-slate-400 dark:text-slate-500 mt-1">
                    © 2026 {appearance.name}. Design by HoangDEV.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Toggle Admin panel button */}
      {!isAdminMode && (
        <button
          onClick={() => {
            if (isAuthenticated) {
              setIsAdminMode(true);
              setActiveTab("links");
            } else {
              setIsLoggingIn(true);
            }
          }}
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white hover:bg-slate-800 px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-[0.97] cursor-pointer text-xs font-semibold"
          style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}
        >
          <LucideIcon
            name="Settings"
            size={14}
            className="animate-spin-slow text-indigo-400"
          />
          <span>Bảng Quản Trị</span>
        </button>
      )} 

      {/* Admin Login Dialog Overlay */}
      {isLoggingIn && (
        <AdminLogin
          accentColor={appearance.accentColor}
          onLoginSuccess={(user) => {
            setDbUser(user);
            setIsAuthenticated(true);
            setIsLoggingIn(false);
            setIsAdminMode(true);
            setActiveTab("links");
          }}
          onCancel={() => {
            setIsLoggingIn(false);
          }}
        />
      )}

      {/* Global Application Footer - ONLY shown in Admin panel to keep public profile absolute pure distraction-free */}
      {isAdminMode ? (
        <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-100/60 mt-8 bg-white transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 space-y-1">
            <p className="font-display font-extrabold text-slate-500 text-[10px] tracking-wider uppercase">
              Vivid Persona Applet
            </p>
            <p className="text-[10px]">
              © 2026 {appearance.name || "Alex Rivera"}. Các cấu hình không gian
              làm việc Admin được lưu trữ cục bộ.
            </p>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
