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

export type { DBMessage, DBDonation, DBPost };

// 1. Core Fallback Game Library Assets
const LOCAL_CHAMPIONS: DBChampion[] = [
  {
    id: "c1",
    ten_tuong: "Florentino",
    vai_tro: "Đấu sĩ",
    url_anh_dai_dien: "/image/tuong/DauSi/Florentino.jpg",
  },
  {
    id: "c2",
    ten_tuong: "Valhein",
    vai_tro: "Xạ thủ",
    url_anh_dai_dien: "/image/tuong/XaThu/Valhein.jpg",
  },
  {
    id: "c3",
    ten_tuong: "Raz",
    vai_tro: "Pháp sư / Sát thủ",
    url_anh_dai_dien: "/image/tuong/PhapSu/Raz.jpg",
  },
  {
    id: "c4",
    ten_tuong: "Nakroth",
    vai_tro: "Sát thủ",
    url_anh_dai_dien: "/image/tuong/SatThu/Nakroth.jpg",
  },
  {
    id: "c5",
    ten_tuong: "Liliana",
    vai_tro: "Pháp sư",
    url_anh_dai_dien: "/image/tuong/PhapSu/Liliana.jpg",
  },
];

const LOCAL_ITEMS: DBItem[] = [
  {
    id: "i1",
    ten_trang_bi: "Thương Longinus",
    cap: 3,
    loai: "CONG",
    url_hinh_anh: "/image/trang_bi/cong/cap_3/thuong_longinus.png",
    mo_ta: "+80 Công vật lý, +15% Giảm hồi chiêu, +150 Giáp",
  },
  {
    id: "i2",
    ten_trang_bi: "Kiếm Muramasa",
    cap: 3,
    loai: "CONG",
    url_hinh_anh: "/image/trang_bi/cong/cap_3/kiem_muramasa.png",
    mo_ta: "+75 Công vật lý, +10% Giảm hồi chiêu, +40% Xuyên giáp",
  },
  {
    id: "i3",
    ten_trang_bi: "Phức Hợp Kiếm",
    cap: 3,
    loai: "CONG",
    url_hinh_anh: "/image/trang_bi/cong/cap_3/phuc_hop_kiem.png",
    mo_ta: "+70 Công vật lý, +15% Tốc đánh, +10% Hút máu, +10% Giảm hồi chiêu",
  },
  {
    id: "i4",
    ten_trang_bi: "Nanh Fenrir",
    cap: 3,
    loai: "CONG",
    url_hinh_anh: "/image/trang_bi/cong/cap_3/nanh_fenrir.png",
    mo_ta: "+200 Công vật lý. Tăng 30% sát thương khi máu mục tiêu dưới 50%",
  },
  {
    id: "i5",
    ten_trang_bi: "Vương Miện Hecate",
    cap: 3,
    loai: "PHEP",
    url_hinh_anh: "/image/trang_bi/phep/cap_3/vuong_mien_hecate.png",
    mo_ta: "+200 Công phép, +35% Tăng công phép thuộc tính",
  },
  {
    id: "i6",
    ten_trang_bi: "Sách Thánh",
    cap: 3,
    loai: "PHEP",
    url_hinh_anh: "/image/trang_bi/phep/cap_3/sach_thanh.png",
    mo_ta: "+400 Công phép, +1400 Máu tối đa",
  },
  {
    id: "i7",
    ten_trang_bi: "Giáp Hộ Mệnh",
    cap: 3,
    loai: "THU",
    url_hinh_anh: "/image/trang_bi/thu/cap_3/giap_ho_menh.png",
    mo_ta: "+120 Giáp. Hồi sinh sau 2 giây tử trận với 2000 Máu (tối đa 2 lần)",
  },
  {
    id: "i8",
    ten_trang_bi: "Giày Kiên Cường",
    cap: 2,
    loai: "TOC_CHAY",
    url_hinh_anh: "/image/trang_bi/toc_do/cap_2/giay_kien_cuong.png",
    mo_ta: "+110 Giáp phép, +60 Tốc chạy, +35% Kháng hiệu ứng",
  },
];

const LOCAL_SPELLS: DBSpell[] = [
  {
    id: "s1",
    ten_phu_trro: "Tốc biến",
    ten_phu_tro: "Tốc biến",
    url_hinh_anh: "/image/phu_tro/toc_bien.png",
    mo_ta: "Dịch chuyển một khoảng ngắn theo hướng chỉ định (Hồi chiêu 120s)",
  },
  {
    id: "s2",
    ten_phu_trro: "Bộc phá",
    ten_phu_tro: "Bộc phá",
    url_hinh_anh: "/image/phu_tro/boc_pha.png",
    mo_ta:
      "Gây sát thương chuẩn tương đương 16% máu đã mất của mục tiêu xung quanh (Hồi chiêu 90s)",
  },
  {
    id: "s3",
    ten_phu_trro: "Thanh tẩy",
    ten_phu_tro: "Thanh tẩy",
    url_hinh_anh: "/image/phu_tro/thanh_tay.png",
    mo_ta:
      "Hóa giải mọi hiệu ứng khống chế và miễn khống trong 1.5 giây tiếp theo (Hồi chiêu 120s)",
  },
];

const LOCAL_BADGES: DBBadge[] = [
  {
    id: "b1",
    ten_phu_hieu: "Tháp quang minh: Thánh Thuẫn",
    loai_nhanh: "NHANH_CHINH_3",
    url_hinh_anh: "/image/phu_hieu/thap_quang_minh/ThanhThuan.png",
  },
  {
    id: "b2",
    ten_phu_hieu: "Vực hỗn mang: Ma Tính",
    loai_nhanh: "NHANH_CHINH_3",
    url_hinh_anh: "/image/phu_hieu/vuc_hon_mang/MaTinh.png",
  },
  {
    id: "b3",
    ten_phu_hieu: "Thành khởi nguyên: Luyện Kim",
    loai_nhanh: "NHANH_CHINH_3",
    url_hinh_anh: "/image/phu_hieu/thanh_khoi_nguyen/LuyenKim.png",
  },
  {
    id: "b4",
    ten_phu_hieu: "Rừng nguyên sinh: Ám Kích",
    loai_nhanh: "NHANH_PHU_1",
    url_hinh_anh: "/image/phu_hieu/rung_nguyen_sinh/AmKich.png",
  },
];

const LOCAL_GUIDES: DBBuildGuide[] = [
  {
    id: "g1",
    tuong_id: "c1",
    tieu_de_giao_an: "Florentino Đi Rừng Sát Lực Gánh Team",
    phu_tro_id: "s1",
    ngoc_do: "Công vật lý / Xuyên giáp x10",
    ngoc_tim: "Tốc đánh / Tốc chạy x10",
    ngoc_xanh: "Công vật lý / Xuyên giáp x10",
    nguoi_tao_id: "00000000-0000-0000-0000-000000000000",
    kich_hoat: true,
    tuong: LOCAL_CHAMPIONS[0],
    phu_tro: LOCAL_SPELLS[0],
    trang_bi_list: [
      LOCAL_ITEMS[7],
      LOCAL_ITEMS[0],
      LOCAL_ITEMS[1],
      LOCAL_ITEMS[2],
      LOCAL_ITEMS[3],
      LOCAL_ITEMS[6],
    ],
    phu_hieu_list: [LOCAL_BADGES[1], LOCAL_BADGES[3]],
  },
  {
    id: "g2",
    tuong_id: "c2",
    tieu_de_giao_an: "Valhein Lên Phép One Shot One Kill",
    phu_tro_id: "s2",
    ngoc_do: "Công phép / Xuyên giáp phép x10",
    ngoc_tim: "Tốc đánh / Tốc chạy x10",
    ngoc_xanh: "Tốc đánh / Xuyên giáp phép x10",
    nguoi_tao_id: "00000000-0000-0000-0000-000000000000",
    kich_hoat: true,
    tuong: LOCAL_CHAMPIONS[1],
    phu_tro: LOCAL_SPELLS[1],
    trang_bi_list: [
      LOCAL_ITEMS[7],
      LOCAL_ITEMS[4],
      LOCAL_ITEMS[5],
      LOCAL_ITEMS[6],
    ],
    phu_hieu_list: [LOCAL_BADGES[0]],
  },
];

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

export const dbService = {
  // ==========================================
  // 1. PROFILE (nguoi_dung)
  // ==========================================
  async getUsersCount(): Promise<number> {
    try {
      const { data, error, count } = await supabase
        .from("nguoi_dung")
        .select("id", { count: "exact", head: true });
      if (!error && count !== null) {
        return count;
      }
      // Fallback
      const { data: all } = await supabase.from("nguoi_dung").select("id");
      return all ? all.length : 1;
    } catch (err) {
      console.error("getUsersCount error:", err);
      return 1;
    }
  },

  async getProfile(): Promise<DBUser | null> {
    const data = await handleQuery(
      supabase.from("nguoi_dung").select("*").eq("vai_tro", 1).limit(1).maybeSingle(),
    );

    if (!data) {
      return {
        id: "00000000-0000-0000-0000-000000000000",
        ten_dang_nhap: "admin",
        email: "admin@vividpersona.com",
        mat_khau: "1234567890hH@@",
        vai_tro: 1,
        avatar_url: "/image/tuong/DauSi/Florentino.jpg",
        anh_bia_url:
          "/image/phu_hieu/thanh_khoi_nguyen/background_ThanhKhoiNguyen_1.jpg",
        tieu_su:
          "Chào mọi người, đây là trang tổng hợp giáo án Liên Quân Mobile cực đỉnh của mình!",
        giao_dien_mode: "light",
        phong_chu: "Inter",
        mau_chu_dao: "#4648d4",
        bank_name: "MB Bank",
        bank_account: "0987654321",
        bank_owner: "PHAN HOANG ANH",
        momo_number: "0987654321",
        momo_name: "Phan Hoàng Anh",
        donate_note:
          "Mọi sự ủng hộ của các bạn đều là động lực to lớn giúp mình tiếp tục ra mắt những giáo án Liên Quân chất lượng nhất!",
        bank_enabled: true,
        momo_enabled: true,
      };
    }
    return data as DBUser | null;
  },

  async loginAdmin(email: string, matKhau: string): Promise<DBUser | null> {
    try {
      const { data, error } = await supabase
        .from("nguoi_dung")
        .select("*")
        .eq("email", email)
        .eq("mat_khau", matKhau)
        .maybeSingle();

      if (!error && data) {
        return data as DBUser;
      }
    } catch (err) {
      console.warn("Supabase login failed, trying local fallback:", err);
    }

    const localProfile = await this.getProfile();
    if (
      localProfile &&
      localProfile.email === email &&
      localProfile.mat_khau === matKhau
    ) {
      return localProfile;
    }

    return null;
  },

  async loginUser(loginKey: string, matKhauHashed: string): Promise<DBUser | null> {
    try {
      const isEmail = loginKey.includes("@");
      const query = supabase.from("nguoi_dung").select("*");
      if (isEmail) {
        query.eq("email", loginKey);
      } else {
        query.eq("ten_dang_nhap", loginKey);
      }
      
      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        if (data.mat_khau === matKhauHashed) {
          return data as DBUser;
        }
      }
    } catch (err) {
      console.error("loginUser failed:", err);
    }
    return null;
  },

  async registerUser(tenDangNhap: string, email: string, matKhauHashed: string): Promise<DBUser> {
    const { data: existingEmail } = await supabase
      .from("nguoi_dung")
      .select("id")
      .eq("email", email)
      .maybeSingle();
      
    if (existingEmail) {
      throw new Error("Email này đã được sử dụng bởi tài khoản khác!");
    }

    const { data: existingUser } = await supabase
      .from("nguoi_dung")
      .select("id")
      .eq("ten_dang_nhap", tenDangNhap)
      .maybeSingle();

    if (existingUser) {
      throw new Error("Tên đăng nhập này đã tồn tại!");
    }

    const newUser: DBUser = {
      id: crypto.randomUUID(),
      ten_dang_nhap: tenDangNhap,
      email: email,
      mat_khau: matKhauHashed,
      vai_tro: 0, // 0 = User, 1 = Admin
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(tenDangNhap)}`,
      anh_bia_url: "/image/phu_hieu/thanh_khoi_nguyen/background_ThanhKhoiNguyen_1.jpg",
      tieu_su: "Chào mọi người, mình là thành viên mới!",
      giao_dien_mode: "light",
      phong_chu: "Inter",
      mau_chu_dao: "#4648d4",
      bank_enabled: false,
      momo_enabled: false,
    };

    const { error } = await supabase.from("nguoi_dung").insert(newUser);
    if (error) {
      console.error("Register user error:", error);
      throw new Error("Không thể tạo tài khoản trên hệ thống: " + error.message);
    }

    return newUser;
  },

  async handleGoogleLogin(email: string, fullName: string, avatarUrl?: string): Promise<DBUser> {
    try {
      const { data, error } = await supabase
        .from("nguoi_dung")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (!error && data) {
        return data as DBUser;
      }

      const username = email.split("@")[0] + "_" + Math.floor(Math.random() * 1000);
      const newUser: DBUser = {
        id: crypto.randomUUID(),
        ten_dang_nhap: username,
        email: email,
        mat_khau: null,
        vai_tro: 0,
        avatar_url: avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`,
        anh_bia_url: "/image/phu_hieu/thanh_khoi_nguyen/background_ThanhKhoiNguyen_1.jpg",
        tieu_su: `Chào mọi người, mình là ${fullName}! Đăng nhập bằng Google.`,
        giao_dien_mode: "light",
        phong_chu: "Inter",
        mau_chu_dao: "#4648d4",
        bank_enabled: false,
        momo_enabled: false,
      };

      const { error: insertError } = await supabase.from("nguoi_dung").insert(newUser);
      if (insertError) {
        throw insertError;
      }
      return newUser;
    } catch (err: any) {
      console.error("Google login handling failed:", err);
      throw new Error("Lỗi đăng nhập Google: " + err.message);
    }
  },

  async updateProfile(
    id: string,
    updates: Partial<DBUser>,
  ): Promise<DBUser | null> {
    const data = await handleQuery(
      supabase
        .from("nguoi_dung")
        .update(updates)
        .eq("id", id)
        .select()
        .maybeSingle(),
    );

    if (!data) {
      const current = (await this.getProfile()) || { id };
      const updated = { ...current, ...updates };
      return updated as DBUser;
    }
    return data as DBUser | null;
  },

  // ==========================================
  // 2. CATEGORIES & LINKS (danh_muc & duong_dan)
  // ==========================================
  async getCategories(): Promise<DBCategory[]> {
    const data = await handleQuery(
      supabase
        .from("danh_muc")
        .select("*")
        .order("thu_tu_uu_tien", { ascending: true }),
    );
    return (data || []) as DBCategory[];
  },

  async saveCategory(
    category: Partial<DBCategory>,
  ): Promise<DBCategory | null> {
    if (category.id && isUUID(category.id)) {
      const data = await handleQuery(
        supabase
          .from("danh_muc")
          .update(category)
          .eq("id", category.id)
          .select()
          .maybeSingle(),
      );
      return data as DBCategory | null;
    } else {
      const { id, ...cleanCategory } = category;
      const data = await handleQuery(
        supabase.from("danh_muc").insert(cleanCategory).select().maybeSingle(),
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
      supabase
        .from("duong_dan")
        .select("*")
        .order("thu_tu_uu_tien", { ascending: true }),
    );
    return (data || []) as DBLink[];
  },

  async saveLink(link: Partial<DBLink>): Promise<DBLink | null> {
    const data = await handleQuery(
      link.id && isUUID(link.id)
        ? supabase
            .from("duong_dan")
            .update(link)
            .eq("id", link.id)
            .select()
            .maybeSingle()
        : supabase.from("duong_dan").insert(link).select().maybeSingle(),
    );

    if (!data) {
      const id = link.id || `local-link-${Date.now()}`;
      const newLink: DBLink = {
        id,
        danh_muc_id: link.danh_muc_id || null,
        tieu_de: link.tieu_de || "Link",
        url_lienketing: link.url_lienketing || "",
        url_icon: link.url_icon || "Link2",
        thu_tu_uu_tien:
          link.thu_tu_uu_tien !== undefined ? link.thu_tu_uu_tien : 0,
        hien_thi: link.hien_thi !== undefined ? link.hien_thi : true,
      };
      return newLink;
    }
    return data as DBLink | null;
  },

  async deleteLink(id: string): Promise<boolean> {
    const { error } = await supabase.from("duong_dan").delete().eq("id", id);
    return !error;
  },

  // ==========================================
  // 3. BANNERS (banner)
  // ==========================================
  async getBanners(): Promise<DBBanner[]> {
    const data = await handleQuery(
      supabase
        .from("banner")
        .select("*")
        .order("thu_tu_uu_tien", { ascending: true }),
    );
    return (data || []) as DBBanner[];
  },

  async saveBanner(banner: Partial<DBBanner>): Promise<DBBanner | null> {
    const data = await handleQuery(
      banner.id && isUUID(banner.id)
        ? supabase
            .from("banner")
            .update(banner)
            .eq("id", banner.id)
            .select()
            .maybeSingle()
        : supabase.from("banner").insert(banner).select().maybeSingle(),
    );

    if (!data) {
      const id = banner.id || `local-banner-${Date.now()}`;
      const newBanner: DBBanner = {
        id,
        tieu_de: banner.tieu_de || "Banner",
        url_hinh_anh: banner.url_hinh_anh || "",
        url_dieu_huong: banner.url_dieu_huong || null,
        thu_tu_uu_tien:
          banner.thu_tu_uu_tien !== undefined ? banner.thu_tu_uu_tien : 0,
        kich_hoat: banner.kich_hoat !== undefined ? banner.kich_hoat : true,
      };
      return newBanner;
    }
    return data as DBBanner | null;
  },

  async deleteBanner(id: string): Promise<boolean> {
    const { error } = await supabase.from("banner").delete().eq("id", id);
    return !error;
  },

  // ==========================================
  // 4. GAME LIBRARY SEED & QUERIES
  // ==========================================
  async getChampions(): Promise<DBChampion[]> {
    const data = await handleQuery(
      supabase.from("tuong").select("*").order("ten_tuong"),
    );
    if (!data || data.length === 0) {
      return LOCAL_CHAMPIONS;
    }
    return data as DBChampion[];
  },

  async getItems(): Promise<DBItem[]> {
    const data = await handleQuery(
      supabase.from("trang_bi").select("*").order("cap", { ascending: false }),
    );
    if (!data || data.length === 0) {
      return LOCAL_ITEMS;
    }
    return data as DBItem[];
  },

  async getSpells(): Promise<DBSpell[]> {
    const data = await handleQuery(
      supabase.from("phu_tro").select("*").order("ten_phu_tro"),
    );
    if (!data || data.length === 0) {
      return LOCAL_SPELLS;
    }
    return data as DBSpell[];
  },

  async getBadges(): Promise<DBBadge[]> {
    const data = await handleQuery(
      supabase.from("phu_hieu").select("*").order("ten_phu_hieu"),
    );
    if (!data || data.length === 0) {
      return LOCAL_BADGES;
    }
    return data as DBBadge[];
  },

  // Seed database helper (kept for completeness)
  async seedGameLibraryIfNeeded(): Promise<void> {
    try {
      const champions = await handleQuery(supabase.from("tuong").select("*"));
      if (!champions || champions.length === 0) {
        await supabase
          .from("tuong")
          .insert(LOCAL_CHAMPIONS.map(({ id, ...rest }) => rest));
      }
      const items = await handleQuery(supabase.from("trang_bi").select("*"));
      if (!items || items.length === 0) {
        await supabase
          .from("trang_bi")
          .insert(LOCAL_ITEMS.map(({ id, ...rest }) => rest));
      }
      const spells = await handleQuery(supabase.from("phu_tro").select("*"));
      if (!spells || spells.length === 0) {
        await supabase
          .from("phu_tro")
          .insert(LOCAL_SPELLS.map(({ id, ...rest }) => rest));
      }
      const badges = await handleQuery(supabase.from("phu_hieu").select("*"));
      if (!badges || badges.length === 0) {
        await supabase
          .from("phu_hieu")
          .insert(LOCAL_BADGES.map(({ id, ...rest }) => rest));
      }
    } catch (err) {
      console.warn(
        "Game seeding error (likely tables not fully initialized in Supabase yet):",
        err,
      );
    }
  },

  // ==========================================
  // 5. BUILD GUIDES (giao_an_de_cu & detail maps)
  // ==========================================
  async getBuildGuides(): Promise<DBBuildGuide[]> {
    const guides = await handleQuery(
      supabase
        .from("giao_an_de_cu")
        .select("*")
        .order("ngay_tao", { ascending: false }),
    );
    if (!guides || guides.length === 0) {
      return LOCAL_GUIDES;
    }

    const populatedGuides: DBBuildGuide[] = [];

    for (const guide of guides as any[]) {
      // 1. Fetch champion
      const champ = await handleQuery(
        supabase
          .from("tuong")
          .select("*")
          .eq("id", guide.tuong_id)
          .maybeSingle(),
      );
      // 2. Fetch spell
      let spell = null;
      if (guide.phu_tro_id) {
        spell = await handleQuery(
          supabase
            .from("phu_tro")
            .select("*")
            .eq("id", guide.phu_tro_id)
            .maybeSingle(),
        );
      }

      // 3. Fetch gear details (items list in order)
      const gearDetails = await handleQuery(
        supabase
          .from("chi_tiet_trang_bi_giao_an")
          .select("*")
          .eq("giao_an_id", guide.id)
          .order("o_so", { ascending: true }),
      );

      const itemIds = ((gearDetails as any[]) || []).map((g) => g.trang_bi_id);
      const itemsList: DBItem[] = [];
      if (itemIds.length > 0) {
        const fetchedItems = await handleQuery(
          supabase.from("trang_bi").select("*").in("id", itemIds),
        );
        for (const gd of (gearDetails as any[]) || []) {
          const matchedItem = ((fetchedItems as any[]) || []).find(
            (item) => item.id === gd.trang_bi_id,
          );
          if (matchedItem) itemsList.push(matchedItem);
        }
      }

      // 4. Fetch badges details
      const badgeDetails = await handleQuery(
        supabase
          .from("chi_tiet_phu_hieu_giao_an")
          .select("*")
          .eq("giao_an_id", guide.id),
      );

      const badgeIds = ((badgeDetails as any[]) || []).map(
        (b) => b.phu_hieu_id,
      );
      const badgesList: DBBadge[] = [];
      if (badgeIds.length > 0) {
        const fetchedBadges = await handleQuery(
          supabase.from("phu_hieu").select("*").in("id", badgeIds),
        );
        for (const bd of (badgeDetails as any[]) || []) {
          const matchedBadge = ((fetchedBadges as any[]) || []).find(
            (badge) => badge.id === bd.phu_hieu_id,
          );
          if (matchedBadge) {
            badgesList.push({
              ...matchedBadge,
              vi_tri_o: bd.vi_tri_o,
            } as any);
          }
        }
      }

      populatedGuides.push({
        ...guide,
        tuong: champ || undefined,
        phu_tro: spell || undefined,
        trang_bi_list: itemsList,
        phu_hieu_list: badgesList,
      });
    }

    return populatedGuides;
  },

  async saveBuildGuide(
    guide: Partial<DBBuildGuide>,
    itemsMap: { item_id: string; o_so: number }[],
    badgesMap: { phu_hieu_id: string; vi_tri_o: string }[],
  ): Promise<DBBuildGuide | null> {
    // Try Supabase save
    try {
      const saved = await this._saveBuildGuideSupabase(
        guide,
        itemsMap,
        badgesMap,
      );
      if (saved) return saved;
    } catch (e) {
      console.warn("Supabase save failed:", e);
    }

    const guideId = guide.id || `local-guide-${Date.now()}`;
    const champ =
      LOCAL_CHAMPIONS.find((c) => c.id === guide.tuong_id) ||
      LOCAL_CHAMPIONS[0];
    const spell =
      LOCAL_SPELLS.find((s) => s.id === guide.phu_tro_id) || LOCAL_SPELLS[0];
    const itemsList = itemsMap
      .map((m) => LOCAL_ITEMS.find((i) => i.id === m.item_id))
      .filter(Boolean) as DBItem[];
    const badgesList = badgesMap
      .map((m) => {
        const b = LOCAL_BADGES.find((bd) => bd.id === m.phu_hieu_id);
        return b ? { ...b, vi_tri_o: m.vi_tri_o } : null;
      })
      .filter(Boolean) as DBBadge[];

    const newGuide: DBBuildGuide = {
      id: guideId,
      tuong_id: guide.tuong_id || champ.id,
      tieu_de_giao_an: guide.tieu_de_giao_an || "Giáo án mới",
      phu_tro_id: guide.phu_tro_id || spell.id,
      ngoc_do: guide.ngoc_do || "",
      ngoc_tim: guide.ngoc_tim || "",
      ngoc_xanh: guide.ngoc_xanh || "",
      nguoi_tao_id: "00000000-0000-0000-0000-000000000000",
      kich_hoat: guide.kich_hoat !== undefined ? guide.kich_hoat : true,
      tuong: champ,
      phu_tro: spell,
      trang_bi_list: itemsList,
      phu_hieu_list: badgesList,
    };

    return newGuide;
  },

  async _saveBuildGuideSupabase(
    guide: Partial<DBBuildGuide>,
    itemsMap: { item_id: string; o_so: number }[],
    badgesMap: { phu_hieu_id: string; vi_tri_o: string }[],
  ): Promise<DBBuildGuide | null> {
    let guideId = guide.id;
    const {
      tuong,
      phu_tro,
      trang_bi_list,
      phu_hieu_list,
      id,
      ngay_tao,
      ...cleanGuide
    } = guide;

    if (guideId && isUUID(guideId)) {
      const updated = await handleQuery(
        supabase
          .from("giao_an_de_cu")
          .update(cleanGuide)
          .eq("id", guideId)
          .select()
          .maybeSingle(),
      );
      if (!updated) return null;
    } else {
      const inserted = await handleQuery(
        supabase
          .from("giao_an_de_cu")
          .insert(cleanGuide)
          .select()
          .maybeSingle(),
      );
      if (!inserted) return null;
      guideId = (inserted as DBBuildGuide).id;
    }

    await supabase
      .from("chi_tiet_trang_bi_giao_an")
      .delete()
      .eq("giao_an_id", guideId);
    if (itemsMap.length > 0) {
      const gearRows = itemsMap.map((m) => ({
        giao_an_id: guideId,
        trang_bi_id: m.item_id,
        o_so: m.o_so,
      }));
      await supabase.from("chi_tiet_trang_bi_giao_an").insert(gearRows);
    }

    await supabase
      .from("chi_tiet_phu_hieu_giao_an")
      .delete()
      .eq("giao_an_id", guideId);
    if (badgesMap.length > 0) {
      const badgeRows = badgesMap.map((m) => ({
        giao_an_id: guideId,
        phu_hieu_id: m.phu_hieu_id,
        vi_tri_o: m.vi_tri_o,
      }));
      await supabase.from("chi_tiet_phu_hieu_giao_an").insert(badgeRows);
    }

    const reloaded = await this.getBuildGuides();
    return reloaded.find((g) => g.id === guideId) || null;
  },

  async deleteBuildGuide(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("giao_an_de_cu")
      .delete()
      .eq("id", id);
    return !error;
  },

  // ==========================================
  // 6. ANALYTICS CLICKS (nhat_ky_click)
  // ==========================================
  async trackLinkClick(
    linkId: string,
    device: string = "Desktop",
  ): Promise<void> {
    try {
      await supabase.from("nhat_ky_click").insert({
        duong_dan_id: linkId,
        thiet_bi: device,
      });
    } catch (err) {
      console.warn("Analytics log failed:", err);
    }
  },

  async getClickLogs(): Promise<any[]> {
    const data = await handleQuery(supabase.from("nhat_ky_click").select("*"));
    return (data || []) as any[];
  },

  // ==========================================
  // 7. CONTACT MESSAGES (tin_nhan)
  // ==========================================
  async getMessages(): Promise<DBMessage[]> {
    const data = await handleQuery(
      supabase
        .from("tin_nhan")
        .select("*")
        .order("ngay_tao", { ascending: false }),
    );
    return (data || []) as DBMessage[];
  },

  async saveMessage(msg: Partial<DBMessage>): Promise<DBMessage | null> {
    const data = await handleQuery(
      supabase.from("tin_nhan").insert(msg).select().maybeSingle(),
    );

    if (!data) {
      const newMessage: DBMessage = {
        id: `local-msg-${Date.now()}`,
        ho_ten: msg.ho_ten || null,
        email: msg.email || null,
        noi_dung: msg.noi_dung || null,
        ngay_tao: new Date().toISOString(),
      };
      return newMessage;
    }
    return data as DBMessage | null;
  },

  async deleteMessage(id: string): Promise<boolean> {
    const { error } = await supabase.from("tin_nhan").delete().eq("id", id);
    return !error;
  },

  // ==========================================
  // 8. DONATIONS (ung_ho)
  // ==========================================
  async getDonations(): Promise<DBDonation[]> {
    const data = await handleQuery(
      supabase
        .from("ung_ho")
        .select("*")
        .order("ngay_tao", { ascending: false }),
    );
    return (data || []) as DBDonation[];
  },

  async saveDonation(donation: Partial<DBDonation>): Promise<DBDonation | null> {
    const data = await handleQuery(
      supabase.from("ung_ho").insert(donation).select().maybeSingle(),
    );

    if (!data) {
      const newDonation: DBDonation = {
        id: `local-don-${Date.now()}`,
        ten_nguoi_ung_ho: donation.ten_nguoi_ung_ho || null,
        so_tien: donation.so_tien || 0,
        noi_dung: donation.noi_dung || null,
        noi_dung_ck: donation.noi_dung_ck || null,
        trang_thai: donation.trang_thai ?? 0,
        ngay_tao: new Date().toISOString(),
      };
      return newDonation;
    }
    return data as DBDonation | null;
  },

  async updateDonationStatus(id: string, status: number): Promise<boolean> {
    const { error } = await supabase
      .from("ung_ho")
      .update({ trang_thai: status })
      .eq("id", id);
    return !error;
  },

  async deleteDonation(id: string): Promise<boolean> {
    const { error } = await supabase.from("ung_ho").delete().eq("id", id);
    return !error;
  },

  // ==========================================
  // 9. POSTS (bai_viet)
  // ==========================================
  async getPosts(): Promise<DBPost[]> {
    const data = await handleQuery(
      supabase
        .from("bai_viet")
        .select("*")
        .order("ngay_tao", { ascending: false }),
    );
    return (data || []) as DBPost[];
  },

  async savePost(post: Partial<DBPost>): Promise<DBPost | null> {
    const { data, error } = await supabase
      .from("bai_viet")
      .insert(post)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase Save Post Error:", error);
      
      // If error is due to column "lien_ket_id" not existing on table, retry without it
      if (
        error.code === "42P21" || 
        error.code === "42703" || 
        error.message?.toLowerCase().includes("lien_ket_id") ||
        error.message?.toLowerCase().includes("column")
      ) {
        console.warn("Column lien_ket_id does not exist on 'bai_viet' table. Retrying insert without it.");
        const { lien_ket_id, ...postWithoutLienKet } = post;
        const { data: retryData, error: retryError } = await supabase
          .from("bai_viet")
          .insert(postWithoutLienKet)
          .select()
          .maybeSingle();

        if (retryError) {
          console.error("Supabase Save Post Retry Error:", retryError);
          return null;
        }
        return retryData as DBPost | null;
      }
      return null;
    }
    return data as DBPost | null;
  },

  async deletePost(id: string): Promise<boolean> {
    const { error } = await supabase.from("bai_viet").delete().eq("id", id);
    return !error;
  },

  async updatePost(id: string, post: Partial<DBPost>): Promise<DBPost | null> {
    const { data, error } = await supabase
      .from("bai_viet")
      .update(post)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Supabase Update Post Error:", error);
      if (
        error.code === "42P21" || 
        error.code === "42703" || 
        error.message?.toLowerCase().includes("lien_ket_id") ||
        error.message?.toLowerCase().includes("column")
      ) {
        console.warn("Column lien_ket_id does not exist on 'bai_viet' table. Retrying update without it.");
        const { lien_ket_id, ...postWithoutLienKet } = post;
        const { data: retryData, error: retryError } = await supabase
          .from("bai_viet")
          .update(postWithoutLienKet)
          .eq("id", id)
          .select()
          .maybeSingle();

        if (retryError) {
          console.error("Supabase Update Post Retry Error:", retryError);
          return null;
        }
        return retryData as DBPost | null;
      }
      return null;
    }
    return data as DBPost | null;
  },
};
