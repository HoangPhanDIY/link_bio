import React, { useState, useEffect } from "react";
import { BioLink, AppearanceSettings, ActivityLog } from "./types";

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
import PostsTab from "./components/PostsTab";
import ShareModal from "./components/ShareModal";
// import StreamTab from "./components/StreamTab";
// import StreamOverlay from "./components/StreamOverlay";
import { dbService } from "./dbService";
import {
  supabase,
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
  DBPost,
} from "./supabase";
import { isCustomIcon, getVisitorInfo } from "./utils";
import PublicHeader from "./components/PublicHeader";
import PublicLinksTab from "./components/PublicLinksTab";
import PublicDonateTab from "./components/PublicDonateTab";
import PublicPostsTab from "./components/PublicPostsTab";
import PublicContactBoard from "./components/PublicContactBoard";
import PublicBottomNav from "./components/PublicBottomNav";

const STORAGE_KEY_LINKS = "vivid_persona_links";
const STORAGE_KEY_APPEARANCE = "vivid_persona_appearance";
const STORAGE_KEY_LOGS = "vivid_persona_logs";

type TabType =
  | "dashboard"
  | "links"
  | "appearance"
  | "guides"
  | "messages"
  | "donations"
  | "posts"
  | "stream";

declare global {
  interface Window {
    showNotification?: (
      message: string,
      type?: "success" | "error" | "info",
    ) => void;
  }
}

export default function App() {
  // --- Persistent States from LocalStorage / Supabase Fallbacks ---
  const [links, setLinks] = useState<BioLink[]>([]);
  const [appearance, setAppearance] = useState<AppearanceSettings>({
    mode: "light",
    fontFamily: "Inter",
    accentColor: "#4648d4",
    bannerUrl: "",
    avatarUrl: "/image/tuong/DauSi/Florentino.jpg",
    name: "HoangDEV",
    bio: "",
    newsletterEnabled: false,
    featuredBannerEnabled: true,
    selectedBanners: [],
    bankName: "",
    bankAccount: "",
    bankOwner: "",
    momoNumber: "",
    momoName: "",
    donateNote: "",
    bankEnabled: false,
    momoEnabled: false,
    backgroundColor: "",
    linkBackgroundColor: "",
    linkTextColor: "",
    loadingWebGif: "/giphy.webp",
    loadingDataGif: "/giphy.webp",
    streamAlertGif: "/giphy.webp",
    streamAlertSound:
      "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav",
    streamAlertTemplate: "{name} đã ủng hộ bạn {amount}Đ",
    streamAlertTts: true,
    streamAlertDuration: 8,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // --- Game Library & Guide States ---
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<DBUser | null>(null);
  const [champions, setChampions] = useState<DBChampion[]>([]);
  const [items, setItems] = useState<DBItem[]>([]);
  const [spells, setSpells] = useState<DBSpell[]>([]);
  const [badges, setBadges] = useState<DBBadge[]>([]);
  const [guides, setGuides] = useState<DBBuildGuide[]>([]);
  const [banners, setBanners] = useState<DBBanner[]>([]);
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [clickLogs, setClickLogs] = useState<any[]>([]);
  const [donations, setDonations] = useState<DBDonation[]>([]);
  const [posts, setPosts] = useState<DBPost[]>([]);
  const [usersCount, setUsersCount] = useState<number>(1);
  const [currentView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") || "";
  });

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
  const [isPostsLoading, setIsPostsLoading] = useState<boolean>(false);
  const [hasLoadedPosts, setHasLoadedPosts] = useState<boolean>(false);

  // Admin Mode & Auth States
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const [colorMode, setColorMode] = useState<"light" | "dark" | "system">(
    () => {
      const saved = localStorage.getItem("vivid_persona_color_mode");
      return (saved as "light" | "dark" | "system") || "system";
    },
  );

  useEffect(() => {
    localStorage.setItem("vivid_persona_color_mode", colorMode);
  }, [colorMode]);

  // Navigation tab state: 'dashboard' | 'links' | 'appearance' | 'guides' | 'messages'
  const [activeTab, setActiveTab] = useState<TabType>("links");
  const [isAdminNavOpen, setIsAdminNavOpen] = useState<boolean>(false);

  const [publicTab, setPublicTab] = useState<
    "links" | "guides" | "donate" | "posts"
  >("links");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // --- Notifications State (multi-toast queue) ---
  const [notifications, setNotifications] = useState<
    { id: string; message: string; type: "success" | "error" | "info" }[]
  >([]);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
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
        // 1. Fetch admin user profile immediately so custom loading GIFs and theme apply first
        const profile = await dbService.getProfile();
        const streamSettings = await dbService.getStreamAlertSettings();
        if (profile) {
          setDbUser(profile);
          setAppearance((prev) => ({
            ...prev,
            loadingWebGif: profile.loading_web_gif || prev.loadingWebGif,
            loadingDataGif: profile.loading_data_gif || prev.loadingDataGif,
            streamAlertGif:
              (streamSettings && streamSettings.stream_alert_gif) ||
              profile.stream_alert_gif ||
              prev.streamAlertGif,
            streamAlertSound:
              (streamSettings && streamSettings.stream_alert_sound) ||
              profile.stream_alert_sound ||
              prev.streamAlertSound,
            streamAlertTemplate:
              (streamSettings && streamSettings.stream_alert_template) ||
              profile.stream_alert_template ||
              prev.streamAlertTemplate,
            streamAlertTts: streamSettings
              ? streamSettings.stream_alert_tts !== false
              : profile.stream_alert_tts !== false,
            streamAlertDuration:
              (streamSettings && streamSettings.stream_alert_duration) ||
              profile.stream_alert_duration ||
              prev.streamAlertDuration,
            streamAlertVoiceGender:
              (streamSettings && streamSettings.stream_alert_voice_gender) ||
              "default",
            streamAlertVoiceName:
              (streamSettings && streamSettings.stream_alert_voice_name) || "",
            mode: (profile.giao_dien_mode as any) || prev.mode,
            fontFamily: (profile.phong_chu as any) || prev.fontFamily,
            accentColor: profile.mau_chu_dao || prev.accentColor,
            backgroundColor: profile.background_color || prev.backgroundColor,
            bao_tri: profile.bao_tri ?? prev.bao_tri,
          }));
        }

        // 2. Seed default data if tables are empty
        await dbService.seedGameLibraryIfNeeded();

        // Restore login session if present
        const savedSessionStr = localStorage.getItem("vivid_persona_session");
        if (savedSessionStr) {
          try {
            const savedUser = JSON.parse(savedSessionStr) as DBUser;
            // Fetch fresh profile from database to get the latest role (e.g., if vai_tro was updated to 1)
            const { data: freshProfile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", savedUser.id)
              .maybeSingle();

            if (freshProfile) {
              const updatedUser = freshProfile as DBUser;
              setLoggedInUser(updatedUser);
              setIsAuthenticated(true);
              localStorage.setItem(
                "vivid_persona_session",
                JSON.stringify(updatedUser),
              );
              if (updatedUser.vai_tro === 1) {
                setIsAdminMode(true);
                localStorage.setItem("vivid_persona_admin_mode", "true");
              } else {
                setIsAdminMode(false);
                localStorage.setItem("vivid_persona_admin_mode", "false");
              }
            } else {
              // Fallback to saved session
              setLoggedInUser(savedUser);
              setIsAuthenticated(true);
              const savedAdminMode = localStorage.getItem(
                "vivid_persona_admin_mode",
              );
              if (savedAdminMode === "true" && savedUser.vai_tro === 1) {
                setIsAdminMode(true);
              }
            }
          } catch (e) {
            console.error("Failed to restore session:", e);
          }
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
            name: profile
              ? profile.ten_hien_thi || profile.ten_dang_nhap || prev.name
              : prev.name,
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
            loadingWebGif: profile
              ? profile.loading_web_gif || prev.loadingWebGif
              : prev.loadingWebGif,
            loadingDataGif: profile
              ? profile.loading_data_gif || prev.loadingDataGif
              : prev.loadingDataGif,
            streamAlertGif: profile
              ? profile.stream_alert_gif || prev.streamAlertGif
              : prev.streamAlertGif,
            streamAlertSound: profile
              ? profile.stream_alert_sound || prev.streamAlertSound
              : prev.streamAlertSound,
            streamAlertTemplate: profile
              ? profile.stream_alert_template || prev.streamAlertTemplate
              : prev.streamAlertTemplate,
            streamAlertTts: profile
              ? profile.stream_alert_tts !== false
              : prev.streamAlertTts,
            streamAlertDuration: profile
              ? profile.stream_alert_duration || prev.streamAlertDuration
              : prev.streamAlertDuration,
            bao_tri: profile ? (profile.bao_tri ?? prev.bao_tri) : prev.bao_tri,
          };
        });
      } catch (err) {
        console.error("Error during initial DB load:", err);
      } finally {
        setIsAppLoading(false);
      }
    }

    initAndLoadDb();
    // Warm up the geoIP resolver immediately on startup
    getVisitorInfo().catch((err) =>
      console.warn("Failed to pre-resolve visitor info on mount:", err),
    );
  }, []);

  // Lazy load Dashboard data (Click Logs, Messages, Donations, Posts) when entering dashboard tab
  useEffect(() => {
    if (activeTab === "dashboard") {
      async function fetchDashboardData() {
        setIsClickLogsLoading(true);
        try {
          const promises: Promise<any>[] = [];

          if (!hasLoadedClickLogs) {
            promises.push(
              dbService
                .getClickLogs()
                .then((data) => {
                  setClickLogs(data || []);
                  setHasLoadedClickLogs(true);
                })
                .catch((e) => console.warn("Fetch clicks failed", e)),
            );
          }

          if (!hasLoadedMessages) {
            promises.push(
              dbService
                .getMessages()
                .then((data) => {
                  setMessages(data || []);
                  setHasLoadedMessages(true);
                })
                .catch((e) => console.warn("Fetch messages failed", e)),
            );
          }

          if (!hasLoadedDonations) {
            promises.push(
              dbService
                .getDonations()
                .then((data) => {
                  setDonations(data || []);
                  setHasLoadedDonations(true);
                })
                .catch((e) => console.warn("Fetch donations failed", e)),
            );
          }

          if (!hasLoadedPosts) {
            promises.push(
              dbService
                .getPosts()
                .then((data) => {
                  setPosts(data || []);
                  setHasLoadedPosts(true);
                })
                .catch((e) => console.warn("Fetch posts failed", e)),
            );
          }

          promises.push(
            dbService
              .getUsersCount()
              .then((count) => {
                setUsersCount(count);
              })
              .catch((e) => console.warn("Fetch users count failed", e)),
          );

          if (promises.length > 0) {
            await Promise.all(promises);
          }
        } catch (err) {
          console.warn("Could not fetch full dashboard data from DB:", err);
        } finally {
          setIsClickLogsLoading(false);
        }
      }
      fetchDashboardData();
    }
  }, [
    activeTab,
    hasLoadedClickLogs,
    hasLoadedMessages,
    hasLoadedDonations,
    hasLoadedPosts,
  ]);

  // Lazy load Posts when entering posts tab in Admin or Public view
  useEffect(() => {
    const isPostsTabActive =
      (isAdminMode && activeTab === "posts") ||
      (!isAdminMode && publicTab === "posts");

    if (isPostsTabActive && !hasLoadedPosts) {
      async function fetchPosts() {
        setIsPostsLoading(true);
        try {
          const dbPosts = await dbService.getPosts();
          if (dbPosts) {
            setPosts(dbPosts);
          }
        } catch (err) {
          console.warn("Could not fetch posts from DB:", err);
        } finally {
          setIsPostsLoading(false);
          setHasLoadedPosts(true);
        }
      }
      fetchPosts();
    }
  }, [activeTab, publicTab, isAdminMode, hasLoadedPosts]);

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
    let visitorInfo = "Desktop";
    const userAgent = navigator.userAgent || "";
    if (/mobile/i.test(userAgent)) {
      visitorInfo = "Mobile";
    } else if (/tablet|ipad/i.test(userAgent)) {
      visitorInfo = "Tablet";
    }

    try {
      visitorInfo = await getVisitorInfo();
    } catch (e) {
      console.warn("Error getting visitor info:", e);
    }

    // 1. Track click in DB
    dbService
      .trackLinkClick(linkId, visitorInfo)
      .catch((err) => console.warn("Could not track click in DB", err));

    // Update clickLogs state immediately to reflect in real-time
    setClickLogs((prev) => [
      ...prev,
      {
        id: `click-${Date.now()}-${Math.random()}`,
        duong_dan_id: linkId,
        thiet_bi: visitorInfo,
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

  const handleAddPost = async (
    content: string,
    imageUrl: string | null,
    lienKetId: string | null,
  ) => {
    try {
      const newPost = await dbService.savePost({
        noi_dung: content,
        url_hinh_anh: imageUrl,
        lien_ket_id: lienKetId,
      });
      if (newPost) {
        setPosts((prev) => [newPost, ...prev]);
        showNotification("Đăng status thành công!", "success");
      } else {
        showNotification(
          "Đăng status thất bại! Lỗi kết nối hoặc RLS chưa được tắt trong Supabase.",
          "error",
        );
      }
    } catch (err) {
      console.error("Failed to save post:", err);
      showNotification("Đăng status thất bại!", "error");
    }
  };

  const handleUpdatePost = async (
    id: string,
    content: string,
    imageUrl: string | null,
    lienKetId: string | null,
  ) => {
    try {
      const updatedPost = await dbService.updatePost(id, {
        noi_dung: content,
        url_hinh_anh: imageUrl,
        lien_ket_id: lienKetId,
      });
      if (updatedPost) {
        setPosts((prev) => prev.map((p) => (p.id === id ? updatedPost : p)));
        showNotification("Cập nhật status thành công!", "success");
      } else {
        showNotification("Cập nhật status thất bại!", "error");
      }
    } catch (err) {
      console.error("Failed to update post:", err);
      showNotification("Cập nhật status thất bại!", "error");
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const success = await dbService.deletePost(id);
      if (success) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        showNotification("Xóa status thành công!", "success");
      } else {
        showNotification("Xóa status thất bại!", "error");
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
      showNotification("Xóa status thất bại!", "error");
    }
  };
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
          ten_dang_nhap: dbUser.ten_dang_nhap,
          ten_hien_thi: appearance.name,
          tieu_su: appearance.bio,
          avatar_url: appearance.avatarUrl,
          anh_bia_url: appearance.bannerUrl,
        });
        if (updated) {
          setDbUser(updated);
          showNotification(
            "Đã lưu thông tin cá nhân và ảnh bìa thành công!",
            "success",
          );
        }
      } catch (err) {
        console.warn("DB update failed", err);
        showNotification(
          "Lỗi kết nối khi cập nhật thông tin cá nhân.",
          "error",
        );
        throw err;
      }
    } else {
      showNotification(
        "Đã cập nhật cục bộ (Không tìm thấy kết nối Database).",
        "info",
      );
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
          loading_web_gif: appearance.loadingWebGif || null,
          loading_data_gif: appearance.loadingDataGif || null,
          bao_tri: appearance.bao_tri ?? false,
        });
        if (updated) {
          setDbUser(updated);
          showNotification(
            "Đã lưu cấu hình màu sắc & giao diện vào Database thành công!",
            "success",
          );
        }
      } catch (err) {
        console.warn("DB update failed", err);
        showNotification(
          "Lỗi kết nối khi cập nhật cấu hình giao diện.",
          "error",
        );
        throw err;
      }
    } else {
      showNotification(
        "Đã cập nhật cục bộ (Không tìm thấy kết nối Database).",
        "info",
      );
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
          showNotification(
            "Đã lưu thông tin tài khoản ủng hộ & donate thành công!",
            "success",
          );
        } else {
          showNotification(
            "Đã cập nhật cục bộ thông tin tài khoản ủng hộ thành công!",
            "info",
          );
        }
      }
    } catch (err) {
      console.warn("DB update failed", err);
      showNotification("Lỗi kết nối khi cập nhật cấu hình ủng hộ.", "error");
      throw err;
    }
  };

  const handleSaveStreamSettings = async () => {
    const targetId = dbUser?.id || "00000000-0000-0000-0000-000000000000";
    try {
      // 1. Save to nguoi_dung table as fallback/compatibility
      const updated = await dbService.updateProfile(targetId, {
        stream_alert_gif: appearance.streamAlertGif || "",
        stream_alert_sound: appearance.streamAlertSound || "",
        stream_alert_template: appearance.streamAlertTemplate || "",
        stream_alert_tts: appearance.streamAlertTts !== false,
        stream_alert_duration: appearance.streamAlertDuration || 8,
      });
      if (updated) {
        setDbUser(updated);
      }

      // 2. Save each stream property to cau_hinh table
      await Promise.all([
        dbService.saveCauHinhValue(
          "stream_alert_gif",
          appearance.streamAlertGif || "",
        ),
        dbService.saveCauHinhValue(
          "stream_alert_sound",
          appearance.streamAlertSound || "",
        ),
        dbService.saveCauHinhValue(
          "stream_alert_template",
          appearance.streamAlertTemplate || "",
        ),
        dbService.saveCauHinhValue(
          "stream_alert_tts",
          appearance.streamAlertTts !== false ? "true" : "false",
        ),
        dbService.saveCauHinhValue(
          "stream_alert_duration",
          String(appearance.streamAlertDuration || 8),
        ),
        dbService.saveCauHinhValue(
          "stream_alert_voice_gender",
          appearance.streamAlertVoiceGender || "default",
        ),
        dbService.saveCauHinhValue(
          "stream_alert_voice_name",
          appearance.streamAlertVoiceName || "",
        ),
      ]);

      showNotification(
        "Đã lưu tất cả cấu hình Live Stream vào bảng database (cau_hinh) thành công!",
        "success",
      );
    } catch (err) {
      console.warn("DB stream settings update failed", err);
      showNotification(
        "Có lỗi xảy ra khi lưu cấu hình lên database. Đã lưu tạm cục bộ.",
        "error",
      );
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

  const handleDeleteMessage = async (id: string) => {
    try {
      const ok = await dbService.deleteMessage(id);
      if (ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        showNotification("Đã xóa tin nhắn thành công", "success");
      }
    } catch (e) {
      console.error(e);
      showNotification("Lỗi khi xóa tin nhắn", "error");
    }
  };

  const handleUpdateDonationStatus = async (id: string, status: number) => {
    try {
      const updated = await dbService.saveDonation({ id, trang_thai: status });
      if (updated) {
        setDonations((prev) =>
          prev.map((d) => (d.id === id ? { ...d, trang_thai: status } : d)),
        );
        showNotification(
          status === 1
            ? "Đã duyệt giao dịch ủng hộ thành công!"
            : "Đã chuyển giao dịch về trạng thái chờ duyệt",
          "success",
        );
      }
    } catch (e) {
      console.error(e);
      showNotification("Lỗi khi cập nhật trạng thái ủng hộ", "error");
    }
  };

  const handleDeleteDonation = async (id: string) => {
    try {
      const ok = await dbService.deleteDonation(id);
      if (ok) {
        setDonations((prev) => prev.filter((d) => d.id !== id));
        showNotification("Đã xóa giao dịch ủng hộ thành công", "success");
      }
    } catch (e) {
      console.error(e);
      showNotification("Lỗi khi xóa giao dịch", "error");
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

  const isDarkPublic =
    colorMode === "dark" ||
    (colorMode === "system" && appearance.mode === "dark");

  // Font class resolver for the public page to dynamically apply selected theme font
  const getFontFamilyClass = () => {
    if (appearance.fontFamily === "Plus Jakarta Sans") return "font-display";
    if (appearance.fontFamily === "JetBrains Mono") return "";
    return "font-sans";
  };

  const renderDataLoading = (
    message: string = "Đang tải dữ liệu...",
    isDark: boolean = false,
  ) => (
    <div
      className={`flex flex-col items-center justify-center py-12 px-6 border rounded-2xl shadow-xs animate-in fade-in duration-300 ${isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-100 bg-white"}`}
    >
      <img
        src={appearance.loadingDataGif || "/giphy.webp"}
        alt="Loading Data..."
        className="w-24 h-24 object-contain mb-4"
        referrerPolicy="no-referrer"
      />
      <p className="text-slate-400 font-bold text-xs uppercase tracking-wider animate-pulse">
        {message}
      </p>
    </div>
  );

  if (currentView === "stream-overlay") {
    return <StreamOverlay />;
  }

  if (isAppLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <img
            src={"/giphy.webp"}
            alt="Loading..."
            className="w-32 h-32 object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="text-slate-400 font-bold tracking-wider text-xs uppercase animate-pulse">
            Chờ chút xíu...
          </span>
        </div>
      </div>
    );
  }

  if (!isAdminMode && appearance.bao_tri && loggedInUser?.vai_tro !== 1) {
    return (
      <div
        className="min-h-screen flex flex-col justify-between items-center p-6 bg-slate-950 text-slate-100 relative overflow-hidden"
        style={{
          fontFamily:
            appearance.fontFamily === "Plus Jakarta Sans"
              ? "Plus Jakarta Sans"
              : appearance.fontFamily === "JetBrains Mono"
                ? "JetBrains Mono"
                : "Inter",
        }}
      >
        {/* Decorative background gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

        {/* Dynamic Upper-Right Notifications */}
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`pointer-events-auto px-4 py-3.5 rounded-md shadow-xl flex items-center gap-3 text-xs font-semibold font-sans transition-all duration-300 transform translate-y-0 ${
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

        {/* Subtle top bar */}
        <div className="w-full max-w-5xl flex justify-between items-center py-4 z-10">
          <div className="flex items-center gap-2">
            <span
              className="font-display text-lg font-black tracking-tight"
              style={{ color: appearance.accentColor || "#3b82f6" }}
            >
              {appearance.name || "N/A"}
            </span>
          </div>
        </div>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-md text-center space-y-6 px-4 z-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
            <div className="relative p-6 rounded-2xl border border-amber-500/20 bg-slate-900 text-amber-400 flex items-center justify-center shadow-lg">
              <LucideIcon name="Construction" size={48} />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-display text-2xl font-black tracking-tight text-white">
              Hệ Thống Đang Bảo Trì
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Trang web đang được nâng cấp hoặc bảo trì định kỳ để mang lại trải
              nghiệm tốt nhất. Chúng tôi sẽ trở lại sớm nhất có thể.
            </p>
          </div>

          {/* Progress state */}
          <div className="w-full p-4 rounded-xl border border-slate-900 bg-slate-900/50 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider">
                Trạng thái
              </span>
              <span className="text-amber-400 font-bold">
                Đang cấu hình lại...
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 animate-pulse"
                style={{ width: "65%" }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full max-w-5xl text-center py-6 border-t border-slate-900 text-slate-500 text-[11px] z-10">
          <p>
            © 2026 {appearance.name || "Alex Rivera"}. Tất cả quyền được bảo
            lưu.
          </p>
        </div>

        {/* Render login dialog on maintenance screen if clicked */}
        {isLoggingIn && (
          <AdminLogin
            accentColor={appearance.accentColor}
            onLoginSuccess={(user) => {
              setLoggedInUser(user);
              setIsAuthenticated(true);
              setIsLoggingIn(false);
              localStorage.setItem(
                "vivid_persona_session",
                JSON.stringify(user),
              );
              if (user.vai_tro === 1) {
                setIsAdminMode(true);
                setActiveTab("links");
                localStorage.setItem("vivid_persona_admin_mode", "true");
              } else {
                setIsAdminMode(false);
                localStorage.setItem("vivid_persona_admin_mode", "false");
                showNotification(
                  `Đăng nhập thành công! Chào mừng ${user.ten_dang_nhap}.`,
                  "success",
                );
              }
            }}
            onCancel={() => {
              setIsLoggingIn(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen font-sans flex flex-col transition-all duration-500 ${
        isAdminMode
          ? "bg-[#f7f9fb] text-slate-800 lg:pl-64"
          : isDarkPublic
            ? "text-slate-100"
            : "text-slate-800"
      }`}
      style={
        !isAdminMode
          ? {
              backgroundColor:
                colorMode === "system" && appearance.backgroundColor
                  ? appearance.backgroundColor
                  : isDarkPublic
                    ? "#0c0d1b"
                    : `${appearance.accentColor}0a`,
            }
          : undefined
      }
    >
      {/* Dynamic Upper-Right Notifications */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`pointer-events-auto px-4 py-3.5 rounded-md shadow-xl flex items-center gap-3 text-xs font-semibold font-sans transition-all duration-300 transform translate-y-0 ${
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

      {/* Public Navigation Header - Visible when NOT in Admin panel */}
      {!isAdminMode && (
        <header
          className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 "bg-white/85 border-slate-100 text-slate-800"}`}
        >
          <div className="flex justify-between items-center w-full px-3 py-3 max-w-7xl mx-auto">
            {/* Logo Brand Title */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setPublicTab("links")}
            >
              <span
                className="font-display text-lg font-black tracking-tight"
                style={{ color: appearance.accentColor }}
              >
                {appearance.name || "Alex Rivera"}
              </span>
            </div>

            {/* Right side Profile & Login buttons */}
            <div className="flex items-center gap-3">
              {isAuthenticated && loggedInUser ? (
                <div className="flex items-center gap-3">
                  {/* User Avatar & Info */}
                  <div className="flex items-center gap-2">
                    <img
                      src={
                        loggedInUser.avatar_url ||
                        "/image/tuong/DauSi/Florentino.jpg"
                      }
                      alt={loggedInUser.ten_dang_nhap}
                      className="w-8 h-8 rounded-full border border-slate-200/50 object-cover shadow-sm bg-white"
                      referrerPolicy="no-referrer"
                    />
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-black leading-tight">
                        {loggedInUser.ten_dang_nhap}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {loggedInUser.vai_tro === 1
                          ? "Quản trị viên"
                          : "Thành viên"}
                      </p>
                    </div>
                  </div>

                  {/* If Admin, show a button to go to Management Dashboard */}
                  {loggedInUser.vai_tro === 1 && (
                    <button
                      onClick={() => {
                        setIsAdminMode(true);
                        setActiveTab("links");
                        localStorage.setItem(
                          "vivid_persona_admin_mode",
                          "true",
                        );
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer hover:opacity-90 shadow-sm active:scale-95"
                      style={{ backgroundColor: appearance.accentColor }}
                    >
                      <LucideIcon name="Settings" size={13} />
                      <span className="hidden sm:inline">Bảng Quản Trị</span>
                    </button>
                  )}

                  {/* Sign Out Button */}
                  <button
                    onClick={() => {
                      setIsAuthenticated(false);
                      setLoggedInUser(null);
                      setIsAdminMode(false);
                      localStorage.removeItem("vivid_persona_session");
                      localStorage.removeItem("vivid_persona_admin_mode");
                      showNotification("Đăng xuất thành công!", "info");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${isDarkPublic ? "border-slate-800 text-slate-300 hover:bg-slate-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    title="Đăng xuất"
                  >
                    <LucideIcon name="LogOut" size={13} />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsLoggingIn(true)}
                  className="px-4 py-1.5 rounded-md text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer hover:opacity-90 shadow-sm active:scale-95"
                  style={{ backgroundColor: appearance.accentColor }}
                >
                  <LucideIcon name="LogIn" size={13} />
                  <span>Đăng nhập</span>
                </button>
              )}

              {/* Share Website Button with 'Link' icon - Next to login button on the right */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className={`px-2 py-1.5 rounded-md text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer hover:opacity-90 shadow-sm active:scale-95`}
                style={{ backgroundColor: appearance.accentColor }}
                title="Chia sẻ trang web"
              >
                <LucideIcon name="Link" size={14} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Mobile Top Header - ONLY visible when in Admin panel on mobile/tablet */}
      {isAdminMode ? (
        <header className="lg:hidden sticky top-0 z-40 bg-[#f7f9fb]/90 backdrop-blur-md border-b border-slate-100/80 transition-colors duration-300">
          <div className="flex justify-between items-center w-full px-6 py-4">
            {/* Left side: Admin label and Mobile 3-gạch Menu trigger */}
            <div className="flex items-center gap-3">
              {/* Mobile 3-gạch Menu button */}
              <div className="relative">
                <button
                  onClick={() => setIsAdminNavOpen(!isAdminNavOpen)}
                  className="p-2 border border-slate-200 rounded-xl bg-white shadow-xs text-xs font-black cursor-pointer text-slate-700 hover:bg-slate-50 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  title="Menu điều hướng"
                >
                  <LucideIcon name="Menu" size={18} />
                </button>

                {isAdminNavOpen && (
                  <>
                    {/* Overlay click-out blocker */}
                    <div
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={() => setIsAdminNavOpen(false)}
                    />

                    {/* Dropdown popup */}
                    <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-150 rounded-xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <button
                        onClick={() => {
                          setActiveTab("dashboard");
                          setIsAdminNavOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-slate-700 cursor-pointer ${
                          activeTab === "dashboard"
                            ? "bg-slate-50 text-indigo-600 font-extrabold"
                            : ""
                        }`}
                      >
                        <LucideIcon
                          name="Activity"
                          size={14}
                          className="text-indigo-500"
                        />
                        <span>Dashboard</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("links");
                          setIsAdminNavOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-slate-700 cursor-pointer ${
                          activeTab === "links"
                            ? "bg-slate-50 text-emerald-600 font-extrabold"
                            : ""
                        }`}
                      >
                        <LucideIcon
                          name="Link2"
                          size={14}
                          className="text-emerald-500"
                        />
                        <span>Links</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("appearance");
                          setIsAdminNavOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-slate-700 cursor-pointer ${
                          activeTab === "appearance"
                            ? "bg-slate-50 text-amber-600 font-extrabold"
                            : ""
                        }`}
                      >
                        <LucideIcon
                          name="Palette"
                          size={14}
                          className="text-amber-500"
                        />
                        <span>Giao diện</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("posts");
                          setIsAdminNavOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-slate-700 cursor-pointer ${
                          activeTab === "posts"
                            ? "bg-slate-50 text-sky-600 font-extrabold"
                            : ""
                        }`}
                      >
                        <LucideIcon
                          name="FileText"
                          size={14}
                          className="text-sky-500"
                        />
                        <span>Bài viết</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("messages");
                          setIsAdminNavOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-between text-slate-700 cursor-pointer ${
                          activeTab === "messages"
                            ? "bg-slate-50 text-rose-600 font-extrabold"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <LucideIcon
                            name="MessageSquare"
                            size={14}
                            className="text-rose-500"
                          />
                          <span>Tin nhắn</span>
                        </div>
                        {messages.length > 0 && (
                          <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                            {messages.length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("donations");
                          setIsAdminNavOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-between text-slate-700 cursor-pointer ${
                          activeTab === "donations"
                            ? "bg-slate-50 text-pink-600 font-extrabold"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <LucideIcon
                            name="Heart"
                            size={14}
                            className="text-red-500"
                          />
                          <span>Donate</span>
                        </div>
                        {donations.filter((d) => d.trang_thai === 0).length >
                          0 && (
                          <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                            {donations.filter((d) => d.trang_thai === 0).length}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("guides");
                          setIsAdminNavOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-slate-700 cursor-pointer ${
                          activeTab === "guides"
                            ? "bg-slate-50 text-teal-600 font-extrabold"
                            : ""
                        }`}
                      >
                        <LucideIcon
                          name="Shield"
                          size={14}
                          className="text-teal-500"
                        />
                        <span>Trang bị</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("stream");
                          setIsAdminNavOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-slate-700 cursor-pointer ${
                          activeTab === "stream"
                            ? "bg-slate-50 text-indigo-600 font-extrabold"
                            : ""
                        }`}
                      >
                        <LucideIcon
                          name="Tv"
                          size={14}
                          className="text-indigo-500"
                        />
                        <span>Stream Live</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              <span className="text-xs font-black text-slate-800 tracking-wider">
                BẢNG QUẢN TRỊ
              </span>
            </div>

            {/* Right side View Public Profile exit button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAdminMode(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-600 transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 bg-white shadow-sm"
              >
                <LucideIcon
                  name="Globe"
                  size={14}
                  className="text-indigo-500 animate-pulse"
                />
                <span className="hidden sm:inline">Xem trang</span>
              </button>

              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  setLoggedInUser(null);
                  setIsAdminMode(false);
                  localStorage.removeItem("vivid_persona_session");
                  localStorage.removeItem("vivid_persona_admin_mode");
                  showNotification("Đăng xuất thành công!", "info");
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all flex items-center gap-1.5 cursor-pointer border border-red-200 bg-white shadow-sm"
                title="Đăng xuất"
              >
                <LucideIcon name="LogOut" size={14} />
              </button>
            </div>
          </div>
        </header>
      ) : null}

      {/* Desktop Left Sidebar - ONLY visible when in Admin panel on desktop */}
      {isAdminMode && (
        <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 text-slate-200 border-r border-slate-800 z-30 shadow-xl transition-all duration-300">
          {/* Sidebar Header: Brand / Logo */}
          <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-600/25">
              <LucideIcon name="Settings" size={18} />
            </div>
            <div>
              <h2 className="text-xs font-black text-white tracking-wider">
                BẢNG QUẢN TRỊ
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase">
                Vivid Link Bio
              </p>
            </div>
          </div>

          {/* User Info */}
          {loggedInUser && (
            <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-950/25 flex items-center gap-3">
              <img
                src={
                  loggedInUser.avatar_url || "/image/tuong/DauSi/Florentino.jpg"
                }
                alt={loggedInUser.ten_dang_nhap}
                className="w-9 h-9 rounded-full border border-slate-700 object-cover shadow-sm bg-white shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="truncate">
                <p className="text-xs font-black text-white truncate leading-tight">
                  {loggedInUser.ten_dang_nhap}
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">
                  {loggedInUser.vai_tro === 1 ? "Quản trị viên" : "Thành viên"}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15 font-black"
                  : "text-slate-400 hover:bg-slate-850 hover:text-white"
              }`}
            >
              <LucideIcon
                name="Activity"
                size={16}
                className={
                  activeTab === "dashboard" ? "text-white" : "text-indigo-400"
                }
              />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("links")}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === "links"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15 font-black"
                  : "text-slate-400 hover:bg-slate-850 hover:text-white"
              }`}
            >
              <LucideIcon
                name="Link2"
                size={16}
                className={
                  activeTab === "links" ? "text-white" : "text-indigo-400"
                }
              />
              <span>Links</span>
            </button>

            <button
              onClick={() => setActiveTab("appearance")}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === "appearance"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15 font-black"
                  : "text-slate-400 hover:bg-slate-850 hover:text-white"
              }`}
            >
              <LucideIcon
                name="Palette"
                size={16}
                className={
                  activeTab === "appearance" ? "text-white" : "text-indigo-400"
                }
              />
              <span>Giao diện</span>
            </button>

            <button
              onClick={() => setActiveTab("posts")}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === "posts"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15 font-black"
                  : "text-slate-400 hover:bg-slate-850 hover:text-white"
              }`}
            >
              <LucideIcon
                name="FileText"
                size={16}
                className={
                  activeTab === "posts" ? "text-white" : "text-indigo-400"
                }
              />
              <span>Bài viết</span>
            </button>

            <button
              onClick={() => setActiveTab("messages")}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                activeTab === "messages"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15 font-black"
                  : "text-slate-400 hover:bg-slate-850 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <LucideIcon
                  name="MessageSquare"
                  size={16}
                  className={
                    activeTab === "messages" ? "text-white" : "text-indigo-400"
                  }
                />
                <span>Tin nhắn</span>
              </div>
              {messages.length > 0 && (
                <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                  {messages.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("donations")}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                activeTab === "donations"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15 font-black"
                  : "text-slate-400 hover:bg-slate-850 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <LucideIcon
                  name="Heart"
                  size={16}
                  className={
                    activeTab === "donations" ? "text-white" : "text-indigo-400"
                  }
                />
                <span>Donate</span>
              </div>
              {donations.filter((d) => d.trang_thai === 0).length > 0 && (
                <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                  {donations.filter((d) => d.trang_thai === 0).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("guides")}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === "guides"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15 font-black"
                  : "text-slate-400 hover:bg-slate-850 hover:text-white"
              }`}
            >
              <LucideIcon
                name="Shield"
                size={16}
                className={
                  activeTab === "guides" ? "text-white" : "text-indigo-400"
                }
              />
              <span>Trang bị</span>
            </button>

            <button
              onClick={() => setActiveTab("stream")}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === "stream"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15 font-black"
                  : "text-slate-400 hover:bg-slate-850 hover:text-white"
              }`}
            >
              <LucideIcon
                name="Tv"
                size={16}
                className={
                  activeTab === "stream" ? "text-white" : "text-indigo-400"
                }
              />
              <span>Stream Live</span>
            </button>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-800 space-y-3">
            {/* Theme switcher for Admin */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                Giao diện chính
              </span>
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setColorMode("light")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    colorMode === "light"
                      ? "bg-slate-800 text-white shadow-xs font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LucideIcon name="Sun" size={11} />
                  <span>Sáng</span>
                </button>
                <button
                  onClick={() => setColorMode("dark")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    colorMode === "dark"
                      ? "bg-slate-800 text-white shadow-xs font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LucideIcon name="Moon" size={11} />
                  <span>Tối</span>
                </button>
                <button
                  onClick={() => setColorMode("system")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    colorMode === "system"
                      ? "bg-indigo-600 text-white shadow-xs font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LucideIcon name="Palette" size={11} />
                  <span>Hệ thống</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsAdminMode(false)}
              className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LucideIcon name="Globe" size={14} className="text-indigo-400" />
              <span>Xem trang chính</span>
            </button>

            <button
              onClick={() => {
                setIsAuthenticated(false);
                setLoggedInUser(null);
                setIsAdminMode(false);
                localStorage.removeItem("vivid_persona_session");
                localStorage.removeItem("vivid_persona_admin_mode");
                showNotification("Đăng xuất thành công!", "info");
              }}
              className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-900/40 bg-transparent shadow-sm"
            >
              <LucideIcon name="LogOut" size={14} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>
      )}

      {/* --- Main Contents --- */}
      <main
        className={`flex-grow w-full mx-auto transition-all duration-300 ${
          isAdminMode
            ? "max-w-7xl px-4 sm:px-6 py-6 pb-16 sm:pb-24" // Khoảng đệm khi là Admin
            : "max-w-5xl px-4 sm:px-6 py-6 sm:py-12 pt-0 pb-16 sm:pb-24 flex flex-col" // Khoảng đệm khi là User
        }`}
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
                  renderDataLoading("Đang tải dữ liệu bảng điều khiển...")
                ) : (
                  <DashboardTab
                    name={appearance.name}
                    activityLogs={activityLogs}
                    accentColor={appearance.accentColor}
                    links={links}
                    clickLogs={clickLogs}
                    messages={messages}
                    donations={donations}
                    posts={posts}
                  />
                ))}

              {activeTab === "posts" && (
                <PostsTab
                  posts={posts}
                  links={links}
                  onAddPost={handleAddPost}
                  onUpdatePost={handleUpdatePost}
                  onDeletePost={handleDeletePost}
                  accentColor={appearance.accentColor}
                />
              )}

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
                  renderDataLoading("Đang tải danh sách tin nhắn...")
                ) : (
                  <MessagesTab
                    messages={messages}
                    onDeleteMessage={handleDeleteMessage}
                    accentColor={appearance.accentColor}
                  />
                ))}

              {activeTab === "donations" &&
                (isDonationsLoading ? (
                  renderDataLoading("Đang tải thông tin ủng hộ...")
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
                  renderDataLoading("Đang tải kho trang bị & giáo án...")
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

              {activeTab === "stream" && (
                <StreamTab
                  appearance={appearance}
                  onUpdateAppearance={handleUpdateAppearance}
                  onSaveStreamSettings={handleSaveStreamSettings}
                  dbUser={dbUser}
                />
              )}
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
                  colorMode={colorMode}
                />
              </div>
            )}
          </div>
        ) : (
          /* PUBLIC RESPONSIVE VIEW: A beautiful fully-fledged widescreen portfolio website adapting from desktop to mobile fluidly without narrow mockup frames */
          <div
            className={`w-full max-w-4xl mx-auto animate-in fade-in duration-500 transition-all duration-300 ${getFontFamilyClass()} ${
              isDarkPublic ? "text-slate-100" : "text-slate-800"
            }`}
          >
            <PublicHeader appearance={appearance} isDarkPublic={isDarkPublic} />

            {/* 5. Main public content area */}
            <div className="w-full mt-2 space-y-3">
              {publicTab === "links" && (
                <PublicLinksTab
                  links={links}
                  appearance={appearance}
                  isDarkPublic={isDarkPublic}
                  onLinkClick={handleLinkClick}
                  colorMode={colorMode}
                />
              )}

              {publicTab === "guides" && (
                <div className="animate-in fade-in duration-300">
                  {isGuidesLoading ? (
                    renderDataLoading(
                      "Đang tải danh sách giáo án...",
                      isDarkPublic,
                    )
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
                <PublicDonateTab
                  appearance={appearance}
                  isDarkPublic={isDarkPublic}
                  onDonationCreated={(saved) => {
                    setDonations((prev) => [saved, ...prev]);
                  }}
                  hasLoadedDonations={hasLoadedDonations}
                  onSuccessRedirect={() => setPublicTab("links")}
                />
              )}

              {publicTab === "posts" && (
                <PublicPostsTab
                  posts={posts}
                  links={links}
                  appearance={appearance}
                  isDarkPublic={isDarkPublic}
                  showNotification={showNotification}
                />
              )}

              {/* Contact message board instead of newsletter subscription */}
              {appearance.newsletterEnabled && (
                <PublicContactBoard
                  appearance={appearance}
                  isDarkPublic={isDarkPublic}
                  onSendMessage={(saved) => {
                    setMessages((prev) => [saved, ...prev]);
                    showNotification("Gửi tin nhắn thành công!", "success");
                  }}
                />
              )}

              {/* Footer and branding navigation inline */}
              <div className="pt-4 pb-0 border-t border-slate-100/50 flex flex-col items-center sm:flex-row sm:justify-between gap-4">
                <div className="flex gap-6 text-slate-400 text-xs font-medium">
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
                  <p className="text-[15px] text-slate-400 mt-1">
                    © 2026 {appearance.name}. Design by HoangDEV.
                  </p>
                </div>
              </div>
            </div>
            {/* 4. Beautiful, High-End Mobile-Style Fixed Bottom Navigation Bar */}
            {!isAdminMode && (
              <PublicBottomNav
                publicTab={publicTab}
                setPublicTab={setPublicTab}
                appearance={appearance}
                postsCount={posts.length}
              />
            )}
          </div>
        )}
      </main>

      {/* Admin Login Dialog Overlay */}
      {isLoggingIn && (
        <AdminLogin
          accentColor={appearance.accentColor}
          onLoginSuccess={(user) => {
            setLoggedInUser(user);
            setIsAuthenticated(true);
            setIsLoggingIn(false);
            localStorage.setItem("vivid_persona_session", JSON.stringify(user));
            if (user.vai_tro === 1) {
              setIsAdminMode(true);
              setActiveTab("links");
              localStorage.setItem("vivid_persona_admin_mode", "true");
            } else {
              setIsAdminMode(false);
              localStorage.setItem("vivid_persona_admin_mode", "false");
              showNotification(
                `Đăng nhập thành công! Chào mừng ${user.ten_dang_nhap}.`,
                "success",
              );
            }
          }}
          onCancel={() => {
            setIsLoggingIn(false);
          }}
        />
      )}

      {/* Share Website Modal Dialog */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        accentColor={appearance.accentColor}
      />

      {/* Global Application Footer - ONLY shown in Admin panel to keep public profile absolute pure distraction-free */}
      {isAdminMode ? (
        <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-100/60 mt-8 bg-white transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6 space-y-1">
            <p className="font-display font-extrabold text-slate-500 text-[10px] tracking-wider uppercase">
              Hoàng DEV
            </p>
            <p className="text-[10px]">
              © 2026 {appearance.name || "HoangDEV"}. Các cấu hình không gian
              làm việc Admin được lưu trữ cục bộ.
            </p>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
