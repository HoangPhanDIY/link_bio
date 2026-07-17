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
  DBRune
} from "./supabase";

export type { DBMessage, DBDonation, DBPost };

// Helper to check if a string is a valid UUID
function isUUID(str: any): boolean {
  if (typeof str !== "string") return false;
  const simpleUuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return simpleUuidRegex.test(str);
}

// Helper to handle response and errors gracefully
async function handleQuery<T = any>(promise: any): Promise<T | null> {
  try {
    const { data, error } = await promise;
    if (error) {
      console.warn("Supabase Query Warning:", error.message || error);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("Supabase Connection Error (handled):", err);
    return null;
  }
}

// Helper to generate a slug from string
function makeSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Ensure configuration tables have default rows (id = 1)
async function ensureConfigTables() {
  try {
    // 1. Giao dien
    const { data: gd } = await supabase.from("cai_dat_giao_dien").select("id").eq("id", 1).maybeSingle();
    if (!gd) {
      await supabase.from("cai_dat_giao_dien").insert({
        id: 1,
        che_do: 0,
        phong_chu: "Inter",
        mau_chu_dao: "#4648d4",
        bao_tri: false
      });
    }

    // 2. Donate
    const { data: dn } = await supabase.from("cai_dat_donate").select("id").eq("id", 1).maybeSingle();
    if (!dn) {
      await supabase.from("cai_dat_donate").insert({
        id: 1,
        bank_name: "MB Bank",
        bank_account: "0987654321",
        bank_owner: "PHAN HOANG ANH",
        bank_enabled: true,
        momo_number: "0987654321",
        momo_name: "Phan Hoàng Anh",
        momo_enabled: true,
        donate_note: "Mọi sự ủng hộ của các bạn đều là động lực to lớn giúp mình tiếp tục ra mắt những giáo án Liên Quân chất lượng nhất!"
      });
    }

    // 3. Stream Alert
    const { data: sa } = await supabase.from("cai_dat_stream_alert").select("id").eq("id", 1).maybeSingle();
    if (!sa) {
      await supabase.from("cai_dat_stream_alert").insert({
        id: 1,
        alert_gif: "/giphy.webp",
        alert_sound: "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav",
        alert_template: "{name} đã ủng hộ bạn {amount}Đ",
        alert_tts: true,
        alert_duration: 8
      });
    }
  } catch (err) {
    console.warn("ensureConfigTables error:", err);
  }
}

export const dbService = {
  // ==========================================
  // 1. PROFILE (profiles table)
  // ==========================================
  async getUsersCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (!error && count !== null) {
        return count;
      }
      const { data } = await supabase.from("profiles").select("id");
      return data ? data.length : 1;
    } catch (err) {
      console.error("getUsersCount error:", err);
      return 1;
    }
  },

  async getProfile(): Promise<DBUser | null> {
    await ensureConfigTables();
    
    // Fetch the admin user profile (vai_tro = 1)
    let { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("vai_tro", 1)
      .limit(1)
      .maybeSingle();

    // Fallback if no admin is configured in DB yet
    if (!profile) {
      const { data: anyUser } = await supabase
        .from("profiles")
        .select("*")
        .limit(1)
        .maybeSingle();
      profile = anyUser;
    }

    if (!profile) {
      // Create local fallback structure only if database is completely empty and uninitialized
      profile = {
        id: "00000000-0000-0000-0000-000000000000",
        ten_dang_nhap: "admin",
        ten_hien_thi: "Admin",
        avatar_url: "/image/tuong/DauSi/Florentino.jpg",
        anh_bia_url: "/image/phu_hieu/thanh_khoi_nguyen/background_ThanhKhoiNguyen_1.jpg",
        tieu_su: "Chào mọi người, đây là trang tổng hợp giáo án Liên Quân Mobile cực đỉnh của mình!",
        vai_tro: 1
      };
    }

    // Fetch related configuration rows
    const gd = await handleQuery(supabase.from("cai_dat_giao_dien").select("*").eq("id", 1).maybeSingle());
    const dn = await handleQuery(supabase.from("cai_dat_donate").select("*").eq("id", 1).maybeSingle());
    const sa = await handleQuery(supabase.from("cai_dat_stream_alert").select("*").eq("id", 1).maybeSingle());

    // Merge into compatible big structure for UI backward compatibility
    const combined: any = {
      ...profile,
      email: "admin@vividpersona.com", // auth email representation

      // Giao dien configuration
      giao_dien_mode: gd?.che_do === 1 ? "dark" : "light",
      phong_chu: gd?.phong_chu || "Inter",
      mau_chu_dao: gd?.mau_chu_dao || "#4648d4",
      background_color: gd?.mau_nen || "",
      link_background_color: gd?.mau_nen_lien_ket || "",
      link_text_color: gd?.mau_chu_lien_ket || "",
      loading_web_gif: gd?.loading_web_gif || "/giphy.webp",
      loading_data_gif: gd?.loading_data_gif || "/giphy.webp",
      bao_tri: gd?.bao_tri || false,

      // Donate configuration
      bank_name: dn?.bank_name || "MB Bank",
      bank_account: dn?.bank_account || "0987654321",
      bank_owner: dn?.bank_owner || "PHAN HOANG ANH",
      bank_enabled: dn?.bank_enabled ?? true,
      momo_number: dn?.momo_number || "0987654321",
      momo_name: dn?.momo_name || "Phan Hoàng Anh",
      momo_enabled: dn?.momo_enabled ?? true,
      donate_note: dn?.donate_note || "",

      // Stream Alert configuration
      stream_alert_gif: sa?.alert_gif || "/giphy.webp",
      stream_alert_sound: sa?.alert_sound || "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav",
      stream_alert_template: sa?.alert_template || "{name} đã ủng hộ bạn {amount}Đ",
      stream_alert_tts: sa?.alert_tts ?? true,
      stream_alert_duration: sa?.alert_duration || 8
    };

    return combined as DBUser;
  },

  async loginAdmin(email: string, matKhau: string): Promise<DBUser | null> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: matKhau
      });

      if (!error && data.user) {
        const profile = await handleQuery(
          supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle()
        );
        if (profile && profile.vai_tro === 1) {
          return profile as DBUser;
        }
      }
    } catch (err) {
      console.warn("Auth admin login error:", err);
    }
    return null;
  },

  async loginUser(loginKey: string, matKhau: string): Promise<DBUser | null> {
    try {
      let email = loginKey;
      if (!loginKey.includes("@")) {
        // Look up email or identifier mapping from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("ten_dang_nhap", loginKey)
          .maybeSingle();

        if (profile && (profile as any).email) {
          email = (profile as any).email;
        } else {
          // Fallback to simple email generation if table column not added yet
          email = `${loginKey}@vividpersona.com`;
        }
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: matKhau
      });

      if (!error && data.user) {
        const profile = await handleQuery(
          supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle()
        );
        return profile as DBUser | null;
      }
    } catch (err) {
      console.error("loginUser error:", err);
    }
    return null;
  },

  async registerUser(tenDangNhap: string, email: string, matKhau: string): Promise<DBUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: matKhau,
      options: {
        data: {
          ten_dang_nhap: tenDangNhap,
          ten_hien_thi: tenDangNhap
        }
      }
    });

    if (error || !data.user) {
      throw new Error(error?.message || "Đăng ký không thành công!");
    }

    // Give database a tiny fraction of a second to run the trigger handle_new_user
    let profile = null;
    for (let i = 0; i < 5; i++) {
      profile = await handleQuery(
        supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle()
      );
      if (profile) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    if (!profile) {
      throw new Error("Không thể khởi tạo Profile người dùng!");
    }

    return profile as DBUser;
  },

  async handleGoogleLogin(email: string, fullName: string, avatarUrl?: string): Promise<DBUser> {
    try {
      // Try to sign in or get user session. In preview, we handle it gracefully
      const username = email.split("@")[0] + "_" + Math.floor(Math.random() * 1000);
      const { data, error } = await supabase.from("profiles").select("*").eq("ten_dang_nhap", username).maybeSingle();
      if (!error && data) {
        return data as DBUser;
      }
      
      // Fallback
      return {
        id: crypto.randomUUID(),
        ten_dang_nhap: username,
        ten_hien_thi: fullName,
        avatar_url: avatarUrl || null,
        anh_bia_url: null,
        tieu_su: `Google User: ${fullName}`,
        vai_tro: 0
      };
    } catch (err: any) {
      console.error("Google login error:", err);
      throw new Error("Đăng nhập Google thất bại!");
    }
  },

  async updateProfile(id: string, updates: Partial<DBUser>): Promise<DBUser | null> {
    // 1. Update Profiles table
    const profileFields = ["ten_dang_nhap", "ten_hien_thi", "avatar_url", "anh_bia_url", "tieu_su", "vai_tro"];
    const profileUpdates: any = {};
    profileFields.forEach((f) => {
      if (updates[f as keyof DBUser] !== undefined) {
        profileUpdates[f] = updates[f as keyof DBUser];
      }
    });

    if (Object.keys(profileUpdates).length > 0) {
      await supabase.from("profiles").update(profileUpdates).eq("id", id);
    }

    // 2. Update Configurations tables (single rows where id = 1)
    const interfaceUpdates: any = {};
    if (updates.giao_dien_mode !== undefined) {
      interfaceUpdates.che_do = updates.giao_dien_mode === "dark" ? 1 : 0;
    }
    if (updates.phong_chu !== undefined) interfaceUpdates.phong_chu = updates.phong_chu;
    if (updates.mau_chu_dao !== undefined) interfaceUpdates.mau_chu_dao = updates.mau_chu_dao;
    if (updates.background_color !== undefined) interfaceUpdates.mau_nen = updates.background_color;
    if (updates.loading_web_gif !== undefined) interfaceUpdates.loading_web_gif = updates.loading_web_gif;
    if (updates.loading_data_gif !== undefined) interfaceUpdates.loading_data_gif = updates.loading_data_gif;
    if (updates.bao_tri !== undefined) interfaceUpdates.bao_tri = updates.bao_tri;

    if (Object.keys(interfaceUpdates).length > 0) {
      await supabase.from("cai_dat_giao_dien").update(interfaceUpdates).eq("id", 1);
    }

    const donateUpdates: any = {};
    if (updates.bank_name !== undefined) donateUpdates.bank_name = updates.bank_name;
    if (updates.bank_account !== undefined) donateUpdates.bank_account = updates.bank_account;
    if (updates.bank_owner !== undefined) donateUpdates.bank_owner = updates.bank_owner;
    if (updates.momo_number !== undefined) donateUpdates.momo_number = updates.momo_number;
    if (updates.momo_name !== undefined) donateUpdates.momo_name = updates.momo_name;
    if (updates.donate_note !== undefined) donateUpdates.donate_note = updates.donate_note;
    if (updates.bank_enabled !== undefined) donateUpdates.bank_enabled = updates.bank_enabled;
    if (updates.momo_enabled !== undefined) donateUpdates.momo_enabled = updates.momo_enabled;

    if (Object.keys(donateUpdates).length > 0) {
      await supabase.from("cai_dat_donate").update(donateUpdates).eq("id", 1);
    }

    const streamUpdates: any = {};
    if (updates.stream_alert_gif !== undefined) streamUpdates.alert_gif = updates.stream_alert_gif;
    if (updates.stream_alert_sound !== undefined) streamUpdates.alert_sound = updates.stream_alert_sound;
    if (updates.stream_alert_template !== undefined) streamUpdates.alert_template = updates.stream_alert_template;
    if (updates.stream_alert_tts !== undefined) streamUpdates.alert_tts = updates.stream_alert_tts;
    if (updates.stream_alert_duration !== undefined) streamUpdates.alert_duration = updates.stream_alert_duration;

    if (Object.keys(streamUpdates).length > 0) {
      await supabase.from("cai_dat_stream_alert").update(streamUpdates).eq("id", 1);
    }

    return this.getProfile();
  },

  // ==========================================
  // 2. CATEGORIES & LINKS
  // ==========================================
  async getCategories(): Promise<DBCategory[]> {
    const data = await handleQuery(
      supabase.from("danh_muc").select("*").order("thu_tu_uu_tien", { ascending: true })
    );
    return (data || []) as DBCategory[];
  },

  async saveCategory(category: Partial<DBCategory>): Promise<DBCategory | null> {
    const name = category.ten_danh_muc || "Danh mục";
    const cleanCategory: any = {
      ten_danh_muc: name,
      slug: category.slug || makeSlug(name),
      loai: category.loai ?? 0, // Default 0 (duong_dan)
      thu_tu_uu_tien: category.thu_tu_uu_tien ?? 0
    };

    if (category.id && isUUID(category.id)) {
      const data = await handleQuery(
        supabase.from("danh_muc").update(cleanCategory).eq("id", category.id).select().maybeSingle()
      );
      return data as DBCategory | null;
    } else {
      const data = await handleQuery(
        supabase.from("danh_muc").insert(cleanCategory).select().maybeSingle()
      );
      return data as DBCategory | null;
    }
  },

  async deleteCategory(id: string): Promise<boolean> {
    if (!isUUID(id)) return true;
    const { error } = await supabase.from("danh_muc").delete().eq("id", id);
    return !error;
  },

  async getLinks(): Promise<DBLink[]> {
    const data = await handleQuery(
      supabase.from("duong_dan").select("*").order("thu_tu_uu_tien", { ascending: true })
    );
    // Map url_lien_ket to url_lienketing for compatibility
    return ((data || []) as any[]).map((item) => ({
      ...item,
      url_lienketing: item.url_lien_ket
    })) as DBLink[];
  },

  async saveLink(link: Partial<DBLink>): Promise<DBLink | null> {
    const rawLink: any = {
      tieu_de: link.tieu_de || "Liên kết",
      url_lien_ket: link.url_lien_ket || link.url_lienketing || "",
      url_icon: link.url_icon || "Link2",
      danh_muc_id: link.danh_muc_id || null,
      hien_thi: link.hien_thi !== undefined ? link.hien_thi : true,
      thu_tu_uu_tien: link.thu_tu_uu_tien ?? 0
    };

    let query;
    if (link.id && isUUID(link.id)) {
      query = supabase.from("duong_dan").update(rawLink).eq("id", link.id).select().maybeSingle();
    } else {
      query = supabase.from("duong_dan").insert(rawLink).select().maybeSingle();
    }

    const data = await handleQuery(query);
    if (data) {
      return {
        ...data,
        url_lienketing: data.url_lien_ket
      } as DBLink;
    }
    return null;
  },

  async deleteLink(id: string): Promise<boolean> {
    if (!isUUID(id)) return true;
    const { error } = await supabase.from("duong_dan").delete().eq("id", id);
    return !error;
  },

  // ==========================================
  // 3. BANNERS
  // ==========================================
  async getBanners(): Promise<DBBanner[]> {
    const data = await handleQuery(
      supabase.from("banner").select("*").order("thu_tu_uu_tien", { ascending: true })
    );
    return ((data || []) as any[]).map((item) => ({
      ...item,
      url_dieu_huong: item.url_lien_ket
    })) as DBBanner[];
  },

  async saveBanner(banner: Partial<DBBanner>): Promise<DBBanner | null> {
    const rawBanner: any = {
      tieu_de: banner.tieu_de || "",
      url_hinh_anh: banner.url_hinh_anh || "",
      url_lien_ket: banner.url_lien_ket || banner.url_dieu_huong || null,
      thu_tu_uu_tien: banner.thu_tu_uu_tien ?? 0,
      kich_hoat: banner.kich_hoat !== undefined ? banner.kich_hoat : true
    };

    let query;
    if (banner.id && isUUID(banner.id)) {
      query = supabase.from("banner").update(rawBanner).eq("id", banner.id).select().maybeSingle();
    } else {
      query = supabase.from("banner").insert(rawBanner).select().maybeSingle();
    }

    const data = await handleQuery(query);
    if (data) {
      return {
        ...data,
        url_dieu_huong: data.url_lien_ket
      } as DBBanner;
    }
    return null;
  },

  async deleteBanner(id: string): Promise<boolean> {
    if (!isUUID(id)) return true;
    const { error } = await supabase.from("banner").delete().eq("id", id);
    return !error;
  },

  // ==========================================
  // 4. GAME LIBRARY
  // ==========================================
  async getChampions(): Promise<DBChampion[]> {
    const data = await handleQuery(
      supabase.from("tuong").select("*").order("ten_tuong")
    );
    return (data || []) as DBChampion[];
  },

  async getItems(): Promise<DBItem[]> {
    const data = await handleQuery(
      supabase.from("trang_bi").select("*").order("cap", { ascending: false })
    );
    return (data || []) as DBItem[];
  },

  async getSpells(): Promise<DBSpell[]> {
    const data = await handleQuery(
      supabase.from("phu_tro").select("*").order("ten_phu_tro")
    );
    return (data || []) as DBSpell[];
  },

  async getBadges(): Promise<DBBadge[]> {
    const data = await handleQuery(
      supabase.from("phu_hieu").select("*").order("ten_phu_hieu")
    );
    return (data || []) as DBBadge[];
  },

  async getRunes(): Promise<DBRune[]> {
    const data = await handleQuery(
      supabase.from("ngoc").select("*").order("mau", { ascending: true })
    );
    return (data || []) as DBRune[];
  },

  async seedGameLibraryIfNeeded(): Promise<void> {
    await ensureConfigTables();
    try {
      // Seed champions
      const { data: champs } = await supabase.from("tuong").select("id");
      if (!champs || champs.length === 0) {
        await supabase.from("tuong").insert([
          { ten_tuong: "Florentino", slug: "florentino", vai_tro: "Đấu sĩ", url_anh_dai_dien: "/image/tuong/DauSi/Florentino.jpg" },
          { ten_tuong: "Valhein", slug: "valhein", vai_tro: "Xạ thủ", url_anh_dai_dien: "/image/tuong/XaThu/Valhein.jpg" },
          { ten_tuong: "Raz", slug: "raz", vai_tro: "Pháp sư / Sát thủ", url_anh_dai_dien: "/image/tuong/PhapSu/Raz.jpg" },
          { ten_tuong: "Nakroth", slug: "nakroth", vai_tro: "Sát thủ", url_anh_dai_dien: "/image/tuong/SatThu/Nakroth.jpg" },
          { ten_tuong: "Liliana", slug: "liliana", vai_tro: "Pháp sư", url_anh_dai_dien: "/image/tuong/PhapSu/Liliana.jpg" }
        ]);
      }

      // Seed items
      const { data: items } = await supabase.from("trang_bi").select("id");
      if (!items || items.length === 0) {
        await supabase.from("trang_bi").insert([
          { ten_trang_bi: "Thương Longinus", cap: 3, loai: 0, url_hinh_anh: "/image/trang_bi/cong/cap_3/thuong_longinus.png", mo_ta: "+80 Công vật lý, +15% Giảm hồi chiêu, +150 Giáp" },
          { ten_trang_bi: "Kiếm Muramasa", cap: 3, loai: 0, url_hinh_anh: "/image/trang_bi/cong/cap_3/kiem_muramasa.png", mo_ta: "+75 Công vật lý, +10% Giảm hồi chiêu, +40% Xuyên giáp" },
          { ten_trang_bi: "Phức Hợp Kiếm", cap: 3, loai: 0, url_hinh_anh: "/image/trang_bi/cong/cap_3/phuc_hop_kiem.png", mo_ta: "+70 Công vật lý, +15% Tốc đánh, +10% Hút máu, +10% Giảm hồi chiêu" },
          { ten_trang_bi: "Nanh Fenrir", cap: 3, loai: 0, url_hinh_anh: "/image/trang_bi/cong/cap_3/nanh_fenrir.png", mo_ta: "+200 Công vật lý. Tăng 30% sát thương khi máu mục tiêu dưới 50%" },
          { ten_trang_bi: "Vương Miện Hecate", cap: 3, loai: 1, url_hinh_anh: "/image/trang_bi/phep/cap_3/vuong_mien_hecate.png", mo_ta: "+200 Công phép, +35% Tăng công phép thuộc tính" },
          { ten_trang_bi: "Sách Thánh", cap: 3, loai: 1, url_hinh_anh: "/image/trang_bi/phep/cap_3/sach_thanh.png", mo_ta: "+400 Công phép, +1400 Máu tối đa" },
          { ten_trang_bi: "Giáp Hộ Mệnh", cap: 3, loai: 2, url_hinh_anh: "/image/trang_bi/thu/cap_3/giap_ho_menh.png", mo_ta: "+120 Giáp. Hồi sinh sau 2 giây tử trận với 2000 Máu (tối đa 2 lần)" },
          { ten_trang_bi: "Giày Kiên Cường", cap: 3, loai: 3, url_hinh_anh: "/image/trang_bi/toc_do/cap_2/giay_kien_cuong.png", mo_ta: "+110 Giáp phép, +60 Tốc chạy, +35% Kháng hiệu ứng" }
        ]);
      }

      // Seed spells
      const { data: spells } = await supabase.from("phu_tro").select("id");
      if (!spells || spells.length === 0) {
        await supabase.from("phu_tro").insert([
          { ten_phu_tro: "Tốc biến", url_hinh_anh: "/image/phu_tro/toc_bien.png", mo_ta: "Dịch chuyển một khoảng ngắn theo hướng chỉ định (Hồi chiêu 120s)" },
          { ten_phu_tro: "Bộc phá", url_hinh_anh: "/image/phu_tro/boc_pha.png", mo_ta: "Gây sát thương chuẩn tương đương 16% máu đã mất của mục tiêu xung quanh (Hồi chiêu 90s)" },
          { ten_phu_tro: "Thanh tẩy", url_hinh_anh: "/image/phu_tro/thanh_tay.png", mo_ta: "Hóa giải mọi hiệu ứng khống chế và miễn khống trong 1.5 giây tiếp theo (Hồi chiêu 120s)" }
        ]);
      }

      // Seed badges
      const { data: badges } = await supabase.from("phu_hieu").select("id");
      if (!badges || badges.length === 0) {
        await supabase.from("phu_hieu").insert([
          { ten_phu_hieu: "Tháp quang minh: Thánh Thuẫn", loai_nhanh: 2, url_hinh_anh: "/image/phu_hieu/thap_quang_minh/ThanhThuan.png" },
          { ten_phu_hieu: "Vực hỗn mang: Ma Tính", loai_nhanh: 2, url_hinh_anh: "/image/phu_hieu/vuc_hon_mang/MaTinh.png" },
          { ten_phu_hieu: "Thành khởi nguyên: Luyện Kim", loai_nhanh: 2, url_hinh_anh: "/image/phu_hieu/thanh_khoi_nguyen/LuyenKim.png" },
          { ten_phu_hieu: "Rừng nguyên sinh: Ám Kích", loai_nhanh: 3, url_hinh_anh: "/image/phu_hieu/rung_nguyen_sinh/AmKich.png" }
        ]);
      }

      // Seed runes
      const { data: runes } = await supabase.from("ngoc").select("id");
      if (!runes || runes.length === 0) {
        await supabase.from("ngoc").insert([
          { ten_ngoc: "Ngọc Đỏ Công vật lý / Xuyên giáp", mau: 0, mo_ta: "Công vật lý +2, Xuyên giáp +10", url_hinh_anh: "/image/ngoc/ngoc_do.png" },
          { ten_ngoc: "Ngọc Tím Tốc đánh / Tốc chạy", mau: 1, mo_ta: "Tốc đánh +1%, Tốc chạy +1%", url_hinh_anh: "/image/ngoc/ngoc_tim.png" },
          { ten_ngoc: "Ngọc Xanh Công vật lý / Xuyên giáp", mau: 2, mo_ta: "Công vật lý +0.9, Xuyên giáp +6.4", url_hinh_anh: "/image/ngoc/ngoc_xanh.png" }
        ]);
      }
    } catch (err) {
      console.warn("Seeding game library warning:", err);
    }
  },

  // ==========================================
  // 5. BUILD GUIDES (giao_an_de_cu)
  // ==========================================
  async getBuildGuides(): Promise<DBBuildGuide[]> {
    const { data: guides, error } = await supabase
      .from("giao_an_de_cu")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !guides) {
      return [];
    }

    const populatedGuides: DBBuildGuide[] = [];

    for (const guide of guides as any[]) {
      // 1. Fetch champion
      const champ = await handleQuery(
        supabase.from("tuong").select("*").eq("id", guide.tuong_id).maybeSingle()
      );
      
      // 2. Fetch spell (phu_tro)
      let spell = null;
      if (guide.phu_tro_id) {
        spell = await handleQuery(
          supabase.from("phu_tro").select("*").eq("id", guide.phu_tro_id).maybeSingle()
        );
      }

      // 3. Fetch items list in order
      const gearDetails = await handleQuery(
        supabase
          .from("chi_tiet_trang_bi_giao_an")
          .select("*")
          .eq("giao_an_id", guide.id)
          .order("o_so", { ascending: true })
      );

      const itemsList: DBItem[] = [];
      if (gearDetails && gearDetails.length > 0) {
        const itemIds = gearDetails.map((g: any) => g.trang_bi_id);
        const fetchedItems = await handleQuery(
          supabase.from("trang_bi").select("*").in("id", itemIds)
        );
        for (const gd of gearDetails) {
          const matchedItem = (fetchedItems || []).find((item: any) => item.id === gd.trang_bi_id);
          if (matchedItem) itemsList.push(matchedItem);
        }
      }

      // 4. Fetch badges details
      const badgeDetails = await handleQuery(
        supabase.from("chi_tiet_phu_hieu_giao_an").select("*").eq("giao_an_id", guide.id)
      );

      const badgesList: DBBadge[] = [];
      if (badgeDetails && badgeDetails.length > 0) {
        const badgeIds = badgeDetails.map((b: any) => b.phu_hieu_id);
        const fetchedBadges = await handleQuery(
          supabase.from("phu_hieu").select("*").in("id", badgeIds)
        );
        for (const bd of badgeDetails) {
          const matchedBadge = (fetchedBadges || []).find((badge: any) => badge.id === bd.phu_hieu_id);
          if (matchedBadge) {
            badgesList.push({
              ...matchedBadge,
              vi_tri_o: bd.vi_tri_o
            });
          }
        }
      }

      // 5. Fetch runes details
      const runeDetails = await handleQuery(
        supabase.from("chi_tiet_ngoc_giao_an").select("*").eq("giao_an_id", guide.id).order("vi_tri_o", { ascending: true })
      );

      let ngocDo = "";
      let ngocTim = "";
      let ngocXanh = "";
      const runesList: DBRune[] = [];

      if (runeDetails && runeDetails.length > 0) {
        const runeIds = runeDetails.map((r: any) => r.ngoc_id);
        const fetchedRunes = await handleQuery(
          supabase.from("ngoc").select("*").in("id", runeIds)
        );
        for (const rd of runeDetails) {
          const matchedRune = (fetchedRunes || []).find((rune: any) => rune.id === rd.ngoc_id);
          if (matchedRune) {
            runesList.push({
              ...matchedRune,
              vi_tri_o: rd.vi_tri_o
            });
            if (rd.vi_tri_o === 0) ngocDo = matchedRune.ten_ngoc;
            if (rd.vi_tri_o === 1) ngocTim = matchedRune.ten_ngoc;
            if (rd.vi_tri_o === 2) ngocXanh = matchedRune.ten_ngoc;
          }
        }
      }

      populatedGuides.push({
        ...guide,
        tuong: champ || undefined,
        phu_tro: spell || undefined,
        trang_bi_list: itemsList,
        phu_hieu_list: badgesList,
        ngoc_list: runesList,
        ngoc_do: ngocDo,
        ngoc_tim: ngocTim,
        ngoc_xanh: ngocXanh,
        kich_hoat: guide.trang_thai === 1,
        ngay_tao: guide.created_at
      });
    }

    return populatedGuides;
  },

  async saveBuildGuide(
    guide: Partial<DBBuildGuide> & { ngoc_do?: string; ngoc_tim?: string; ngoc_xanh?: string },
    itemsMap: { item_id: string; o_so: number }[],
    badgesMap: { phu_hieu_id: string; vi_tri_o: string }[],
  ): Promise<DBBuildGuide | null> {
    try {
      let guideId = guide.id;
      const cleanGuide: any = {
        tuong_id: guide.tuong_id,
        tieu_de_giao_an: guide.tieu_de_giao_an || "Giáo án mới",
        mo_ta: guide.mo_ta || "",
        url_anh_bia: guide.url_anh_bia || null,
        danh_muc_id: guide.danh_muc_id || null,
        phu_tro_id: guide.phu_tro_id || null,
        nguoi_tao_id: guide.nguoi_tao_id || null,
        trang_thai: guide.trang_thai !== undefined ? guide.trang_thai : ((guide as any).kich_hoat === false ? 0 : 1)
      };

      if (guideId && isUUID(guideId)) {
        const updated = await handleQuery(
          supabase.from("giao_an_de_cu").update(cleanGuide).eq("id", guideId).select().maybeSingle()
        );
        if (!updated) return null;
      } else {
        const inserted = await handleQuery(
          supabase.from("giao_an_de_cu").insert(cleanGuide).select().maybeSingle()
        );
        if (!inserted) return null;
        guideId = inserted.id;
      }

      // 1. Save items detail mapping
      await supabase.from("chi_tiet_trang_bi_giao_an").delete().eq("giao_an_id", guideId);
      if (itemsMap && itemsMap.length > 0) {
        const gearRows = itemsMap.map((m) => ({
          giao_an_id: guideId,
          trang_bi_id: m.item_id,
          o_so: m.o_so,
        }));
        await supabase.from("chi_tiet_trang_bi_giao_an").insert(gearRows);
      }

      // 2. Save badges detail mapping
      await supabase.from("chi_tiet_phu_hieu_giao_an").delete().eq("giao_an_id", guideId);
      if (badgesMap && badgesMap.length > 0) {
        const badgeRows = badgesMap.map((m) => ({
          giao_an_id: guideId,
          phu_hieu_id: m.phu_hieu_id,
          vi_tri_o: m.vi_tri_o,
        }));
        await supabase.from("chi_tiet_phu_hieu_giao_an").insert(badgeRows);
      }

      // 3. Save runes mapping using chi_tiet_ngoc_giao_an
      await supabase.from("chi_tiet_ngoc_giao_an").delete().eq("giao_an_id", guideId);
      
      const saveRuneForPosition = async (runeName: string | undefined, position: number) => {
        if (!runeName) return;
        let rune = await handleQuery(
          supabase.from("ngoc").select("id").eq("ten_ngoc", runeName).eq("mau", position).maybeSingle()
        );
        if (!rune) {
          rune = await handleQuery(
            supabase.from("ngoc").insert({
              ten_ngoc: runeName,
              mau: position,
              mo_ta: `Cấp 3 - ${runeName}`,
              url_hinh_anh: position === 0 ? "/image/ngoc/ngoc_do.png" : (position === 1 ? "/image/ngoc/ngoc_tim.png" : "/image/ngoc/ngoc_xanh.png")
            }).select().maybeSingle()
          );
        }
        if (rune) {
          await supabase.from("chi_tiet_ngoc_giao_an").insert({
            giao_an_id: guideId,
            ngoc_id: rune.id,
            vi_tri_o: position
          });
        }
      };

      await saveRuneForPosition(guide.ngoc_do, 0);
      await saveRuneForPosition(guide.ngoc_tim, 1);
      await saveRuneForPosition(guide.ngoc_xanh, 2);

      const reloaded = await this.getBuildGuides();
      return reloaded.find((g) => g.id === guideId) || null;
    } catch (err) {
      console.error("saveBuildGuide error:", err);
      return null;
    }
  },

  async deleteBuildGuide(id: string): Promise<boolean> {
    if (!isUUID(id)) return true;
    const { error } = await supabase.from("giao_an_de_cu").delete().eq("id", id);
    return !error;
  },

  // ==========================================
  // 6. ANALYTICS CLICKS
  // ==========================================
  async trackLinkClick(linkId: string, device: string = "Desktop"): Promise<void> {
    try {
      if (isUUID(linkId)) {
        await supabase.from("nhat_ky_click").insert({
          duong_dan_id: linkId,
          thiet_bi: device,
        });
      }
    } catch (err) {
      console.warn("Analytics track link click failed:", err);
    }
  },

  async getClickLogs(): Promise<any[]> {
    const data = await handleQuery(
      supabase.from("nhat_ky_click").select("*").order("thoi_gian", { ascending: false })
    );
    return ((data || []) as any[]).map((item) => ({
      ...item,
      thoi_gian: item.thoi_gian
    }));
  },

  // ==========================================
  // 7. CONTACT MESSAGES
  // ==========================================
  async getMessages(): Promise<DBMessage[]> {
    const data = await handleQuery(
      supabase.from("tin_nhan").select("*").order("created_at", { ascending: false })
    );
    return ((data || []) as any[]).map((item) => ({
      ...item,
      ngay_tao: item.created_at
    })) as DBMessage[];
  },

  async saveMessage(msg: Partial<DBMessage>): Promise<DBMessage | null> {
    const rawMsg: any = {
      ho_ten: msg.ho_ten || "Ẩn danh",
      email: msg.email || null,
      noi_dung: msg.noi_dung || "",
      trang_thai: msg.trang_thai ?? 0
    };

    const data = await handleQuery(
      supabase.from("tin_nhan").insert(rawMsg).select().maybeSingle()
    );

    if (data) {
      return {
        ...data,
        ngay_tao: data.created_at
      } as DBMessage;
    }
    return null;
  },

  async deleteMessage(id: string): Promise<boolean> {
    if (!isUUID(id)) return true;
    const { error } = await supabase.from("tin_nhan").delete().eq("id", id);
    return !error;
  },

  // ==========================================
  // 8. DONATIONS
  // ==========================================
  async getDonations(): Promise<DBDonation[]> {
    const data = await handleQuery(
      supabase.from("ung_ho").select("*").order("created_at", { ascending: false })
    );
    return ((data || []) as any[]).map((item) => ({
      ...item,
      ngay_tao: item.created_at
    })) as DBDonation[];
  },

  async saveDonation(donation: Partial<DBDonation>): Promise<DBDonation | null> {
    const rawDon: any = {
      ten_nguoi_ung_ho: donation.ten_nguoi_ung_ho || "Người ủng hộ ẩn danh",
      so_tien: Number(donation.so_tien || 0),
      noi_dung: donation.noi_dung || "",
      noi_dung_ck: donation.noi_dung_ck || "",
      phuong_thuc: donation.phuong_thuc ?? 0,
      trang_thai: donation.trang_thai ?? 0
    };

    const data = await handleQuery(
      supabase.from("ung_ho").insert(rawDon).select().maybeSingle()
    );

    if (data) {
      return {
        ...data,
        ngay_tao: data.created_at
      } as DBDonation;
    }
    return null;
  },

  async updateDonationStatus(id: string, status: number): Promise<boolean> {
    if (!isUUID(id)) return true;
    const { error } = await supabase
      .from("ung_ho")
      .update({ trang_thai: status })
      .eq("id", id);
    return !error;
  },

  async deleteDonation(id: string): Promise<boolean> {
    if (!isUUID(id)) return true;
    const { error } = await supabase.from("ung_ho").delete().eq("id", id);
    return !error;
  },

  // ==========================================
  // 9. POSTS
  // ==========================================
  async getPosts(): Promise<DBPost[]> {
    const data = await handleQuery(
      supabase.from("bai_viet").select("*").order("created_at", { ascending: false })
    );
    return ((data || []) as any[]).map((item) => ({
      ...item,
      ngay_tao: item.created_at
    })) as DBPost[];
  },

  async savePost(post: Partial<DBPost>): Promise<DBPost | null> {
    const postId = post.id && isUUID(post.id) ? post.id : crypto.randomUUID();
    const content = post.noi_dung || "";
    const cleanContent = content.replace(/[#*`_]/g, "").trim();
    const title = post.tieu_de || (cleanContent.slice(0, 50) || "Bài viết mới") + (cleanContent.length > 50 ? "..." : "");
    const slug = post.slug || (makeSlug(title) + "-" + Math.floor(Math.random() * 10000));

    const cleanPost: any = {
      id: postId,
      tieu_de: title,
      slug: slug,
      tom_tat: post.tom_tat || (cleanContent.slice(0, 100) || null),
      noi_dung: content,
      url_hinh_anh: post.url_hinh_anh || null,
      lien_ket_id: (post.lien_ket_id && post.lien_ket_id.trim() !== "") ? post.lien_ket_id : null,
      trang_thai: post.trang_thai ?? 1,
      luot_xem: post.luot_xem || 0,
      ngay_dang: post.ngay_dang || new Date().toISOString()
    };

    if (post.danh_muc_id) cleanPost.danh_muc_id = post.danh_muc_id;
    if (post.tac_gia_id) cleanPost.tac_gia_id = post.tac_gia_id;

    const isUpdate = post.id && isUUID(post.id);
    let query = isUpdate
      ? supabase.from("bai_viet").update(cleanPost).eq("id", post.id).select().maybeSingle()
      : supabase.from("bai_viet").insert(cleanPost).select().maybeSingle();

    const data = await handleQuery(query);
    if (data) {
      return {
        ...data,
        ngay_tao: data.created_at
      } as DBPost;
    }
    return null;
  },

  async updatePost(id: string, post: Partial<DBPost>): Promise<DBPost | null> {
    const content = post.noi_dung || "";
    const cleanContent = content.replace(/[#*`_]/g, "").trim();
    const title = post.tieu_de || (cleanContent.slice(0, 50) || "Bài viết mới") + (cleanContent.length > 50 ? "..." : "");
    const slug = post.slug || (makeSlug(title) + "-" + Math.floor(Math.random() * 10000));

    const cleanPost: any = {
      tieu_de: title,
      slug: slug,
      tom_tat: post.tom_tat || (cleanContent.slice(0, 100) || null),
      noi_dung: content,
      url_hinh_anh: post.url_hinh_anh || null,
      lien_ket_id: (post.lien_ket_id && post.lien_ket_id.trim() !== "") ? post.lien_ket_id : null,
      trang_thai: post.trang_thai ?? 1
    };

    if (post.danh_muc_id) cleanPost.danh_muc_id = post.danh_muc_id;
    if (post.tac_gia_id) cleanPost.tac_gia_id = post.tac_gia_id;

    const data = await handleQuery(
      supabase.from("bai_viet").update(cleanPost).eq("id", id).select().maybeSingle()
    );

    if (data) {
      return {
        ...data,
        ngay_tao: data.created_at
      } as DBPost;
    }
    return null;
  },

  async deletePost(id: string): Promise<boolean> {
    if (!isUUID(id)) return true;
    const { error } = await supabase.from("bai_viet").delete().eq("id", id);
    return !error;
  },

  // ==========================================
  // 10. CONFIGURATION & AUXILIARY
  // ==========================================
  async getCauHinhValue(key: string, defaultValue: string = ""): Promise<string> {
    try {
      if (key === "stream_alert_gif" || key === "stream_alert_sound" || key === "stream_alert_template" || key === "stream_alert_tts" || key === "stream_alert_duration") {
        const { data } = await supabase.from("cai_dat_stream_alert").select("*").eq("id", 1).maybeSingle();
        if (data) {
          if (key === "stream_alert_gif") return data.alert_gif || defaultValue;
          if (key === "stream_alert_sound") return data.alert_sound || defaultValue;
          if (key === "stream_alert_template") return data.alert_template || defaultValue;
          if (key === "stream_alert_tts") return String(data.alert_tts);
          if (key === "stream_alert_duration") return String(data.alert_duration);
        }
      }
      return localStorage.getItem(`cau_hinh_${key}`) || defaultValue;
    } catch {
      return defaultValue;
    }
  },

  async saveCauHinhValue(key: string, value: string): Promise<boolean> {
    try {
      localStorage.setItem(`cau_hinh_${key}`, value);
      
      if (key === "stream_alert_gif" || key === "stream_alert_sound" || key === "stream_alert_template" || key === "stream_alert_tts" || key === "stream_alert_duration") {
        const updates: any = {};
        if (key === "stream_alert_gif") updates.alert_gif = value;
        if (key === "stream_alert_sound") updates.alert_sound = value;
        if (key === "stream_alert_template") updates.alert_template = value;
        if (key === "stream_alert_tts") updates.alert_tts = value === "true";
        if (key === "stream_alert_duration") updates.alert_duration = Number(value);
        
        await supabase.from("cai_dat_stream_alert").update(updates).eq("id", 1);
      }
      return true;
    } catch {
      return false;
    }
  },

  async getStreamAlertSettings(): Promise<any> {
    try {
      const { data } = await supabase.from("cai_dat_stream_alert").select("*").eq("id", 1).maybeSingle();
      if (data) {
        return {
          stream_alert_gif: data.alert_gif,
          stream_alert_sound: data.alert_sound,
          stream_alert_template: data.alert_template,
          stream_alert_tts: data.alert_tts,
          stream_alert_duration: data.alert_duration
        };
      }
      return null;
    } catch (err) {
      console.warn("Lỗi tải cấu hình từ cai_dat_stream_alert:", err);
      return null;
    }
  },

  async listDonateAssets(): Promise<{ gifs: string[]; sounds: string[] }> {
    try {
      const { data, error } = await supabase.storage.from("images").list("donate");
      if (error) throw error;
      if (!data) return { gifs: [], sounds: [] };

      const gifs: string[] = [];
      const sounds: string[] = [];

      data.forEach((file) => {
        const ext = file.name.split(".").pop()?.toLowerCase();
        const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(`donate/${file.name}`);
        const url = publicUrlData.publicUrl;

        if (
          ext === "gif" || 
          ext === "png" || 
          ext === "jpg" || 
          ext === "jpeg" || 
          ext === "webp"
        ) {
          gifs.push(url);
        } else if (
          ext === "mp3" || 
          ext === "wav" || 
          ext === "ogg" || 
          ext === "m4a"
        ) {
          sounds.push(url);
        }
      });

      return { gifs, sounds };
    } catch (err) {
      console.warn("Lỗi tải danh sách tài nguyên cũ từ bucket:", err);
      return { gifs: [], sounds: [] };
    }
  },
};
