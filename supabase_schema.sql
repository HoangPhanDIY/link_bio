-- ====================================================================
-- VIVID PERSONA - LIÊN QUÂN MOBILE
-- SCHEMA V4 - THÊM TÊN ĐĂNG NHẬP, TRẠNG THÁI DÙNG SỐ NGUYÊN
-- ====================================================================
-- !!! BƯỚC BẮT BUỘC LÀM THỦ CÔNG TRÊN DASHBOARD (SQL KHÔNG LÀM ĐƯỢC) !!!
-- Tắt xác minh email:
--   Supabase Dashboard > Authentication > Providers > Email
--   > tắt toggle "Confirm email"
-- Đây là cấu hình cấp Auth service, không nằm trong database, nên
-- không có lệnh SQL nào tắt được. Phải vào Dashboard bấm tay.
-- ====================================================================
--
-- QUY ƯỚC SỐ:
--   profiles.vai_tro            0 = user thường     1 = admin
--   cai_dat_giao_dien.che_do    0 = light            1 = dark
--   danh_muc.loai               0 = duong_dan        1 = bai_viet        2 = giao_an
--   trang_bi.loai               0 = CONG             1 = PHEP            2 = THU
--                                3 = TOC_CHAY         4 = PHU_KIEN
--   phu_hieu.loai_nhanh         0 = nhanh_chinh_1    1 = nhanh_chinh_2   2 = nhanh_chinh_3
--                                3 = nhanh_phu_1      4 = nhanh_phu_2
--   ngoc.mau                    0 = do               1 = tim             2 = xanh
--   giao_an_de_cu.trang_thai    0 = nháp             1 = đã đăng
--   bai_viet.trang_thai         0 = nháp             1 = đã đăng
--   ung_ho.phuong_thuc          0 = bank             1 = momo
--   ung_ho.trang_thai           0 = chờ xử lý        1 = đã xác nhận     2 = đã hủy
--   tin_nhan.trang_thai         0 = mới              1 = đã đọc          2 = đã trả lời
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 0. HÀM DÙNG CHUNG
-- ====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 1. PROFILES (tài khoản, gắn với Supabase Auth) — có tên đăng nhập
-- ====================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    ten_dang_nhap TEXT NOT NULL UNIQUE,
    ten_hien_thi TEXT NOT NULL,
    avatar_url TEXT,
    anh_bia_url TEXT,
    tieu_su TEXT,
    vai_tro SMALLINT NOT NULL DEFAULT 0 CHECK (vai_tro IN (0, 1)), -- 0=user, 1=admin
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND vai_tro = 1
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Tự động tạo profile khi có user mới đăng ký.
-- ten_dang_nhap lấy từ raw_user_meta_data (app phải truyền lên lúc signUp),
-- nếu không có thì tự tạo tạm từ email + phần đầu id để tránh trùng UNIQUE.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    ten_nhap TEXT;
BEGIN
    ten_nhap := NEW.raw_user_meta_data->>'ten_dang_nhap';
    IF ten_nhap IS NULL OR ten_nhap = '' THEN
        ten_nhap := split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 6);
    END IF;

    INSERT INTO public.profiles (id, ten_dang_nhap, ten_hien_thi, vai_tro)
    VALUES (
        NEW.id,
        ten_nhap,
        COALESCE(NEW.raw_user_meta_data->>'ten_hien_thi', split_part(NEW.email, '@', 1)),
        0
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 2. CẤU HÌNH WEBSITE (mỗi bảng chỉ 1 dòng)
-- ====================================================================
CREATE TABLE IF NOT EXISTS cai_dat_giao_dien (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    che_do SMALLINT NOT NULL DEFAULT 0 CHECK (che_do IN (0, 1)),
    phong_chu TEXT DEFAULT 'Inter',
    mau_chu_dao TEXT DEFAULT '#4648d4',
    mau_nen TEXT,
    mau_nen_lien_ket TEXT,
    mau_chu_lien_ket TEXT,
    loading_web_gif TEXT,
    loading_data_gif TEXT,
    bao_tri BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS cai_dat_donate (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    bank_name TEXT,
    bank_account TEXT,
    bank_owner TEXT,
    bank_enabled BOOLEAN NOT NULL DEFAULT true,
    momo_number TEXT,
    momo_name TEXT,
    momo_enabled BOOLEAN NOT NULL DEFAULT true,
    donate_note TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS cai_dat_stream_alert (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    alert_gif TEXT,
    alert_sound TEXT,
    alert_template TEXT DEFAULT '{name} đã ủng hộ bạn {amount}Đ',
    alert_tts BOOLEAN NOT NULL DEFAULT true,
    alert_duration INTEGER NOT NULL DEFAULT 8,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER trg_cai_dat_giao_dien_updated_at
    BEFORE UPDATE ON cai_dat_giao_dien
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cai_dat_donate_updated_at
    BEFORE UPDATE ON cai_dat_donate
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cai_dat_stream_alert_updated_at
    BEFORE UPDATE ON cai_dat_stream_alert
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ====================================================================
-- 3. DANH MỤC DÙNG CHUNG
-- ====================================================================
CREATE TABLE IF NOT EXISTS danh_muc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loai SMALLINT NOT NULL CHECK (loai IN (0, 1, 2)),
    ten_danh_muc TEXT NOT NULL,
    slug TEXT NOT NULL,
    thu_tu_uu_tien INTEGER NOT NULL DEFAULT 0,
    UNIQUE (loai, slug)
);

-- ====================================================================
-- 4. LIÊN KẾT (link-in-bio) & BANNER
-- ====================================================================
CREATE TABLE IF NOT EXISTS duong_dan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tieu_de TEXT NOT NULL,
    url_lien_ket TEXT NOT NULL,
    url_icon TEXT,
    danh_muc_id UUID REFERENCES danh_muc(id) ON DELETE SET NULL,
    hien_thi BOOLEAN NOT NULL DEFAULT true,
    thu_tu_uu_tien INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS banner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tieu_de TEXT,
    url_hinh_anh TEXT NOT NULL,
    url_lien_ket TEXT,
    thu_tu_uu_tien INTEGER NOT NULL DEFAULT 0,
    kich_hoat BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- 5. DỮ LIỆU THAM CHIẾU GAME
-- ====================================================================
CREATE TABLE IF NOT EXISTS tuong (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_tuong TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    vai_tro TEXT,
    url_anh_dai_dien TEXT
);

CREATE TABLE IF NOT EXISTS trang_bi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_trang_bi TEXT NOT NULL,
    cap INTEGER NOT NULL DEFAULT 3,
    loai SMALLINT NOT NULL CHECK (loai IN (0, 1, 2, 3, 4)),
    url_hinh_anh TEXT,
    mo_ta TEXT
);

CREATE TABLE IF NOT EXISTS phu_tro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_phu_tro TEXT NOT NULL UNIQUE,
    url_hinh_anh TEXT,
    mo_ta TEXT
);

CREATE TABLE IF NOT EXISTS phu_hieu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_phu_hieu TEXT NOT NULL,
    loai_nhanh SMALLINT NOT NULL CHECK (loai_nhanh IN (0, 1, 2, 3, 4)),
    url_hinh_anh TEXT
);

CREATE TABLE IF NOT EXISTS ngoc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_ngoc TEXT NOT NULL,
    mau SMALLINT NOT NULL CHECK (mau IN (0, 1, 2)),
    mo_ta TEXT,
    url_hinh_anh TEXT
);

-- ====================================================================
-- 6. GIÁO ÁN ĐỀ CỬ & các bảng chi tiết
-- ====================================================================
CREATE TABLE IF NOT EXISTS giao_an_de_cu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tuong_id UUID NOT NULL REFERENCES tuong(id) ON DELETE CASCADE,
    tieu_de_giao_an TEXT NOT NULL,
    mo_ta TEXT,
    url_anh_bia TEXT,
    danh_muc_id UUID REFERENCES danh_muc(id) ON DELETE SET NULL,
    phu_tro_id UUID REFERENCES phu_tro(id) ON DELETE SET NULL,
    nguoi_tao_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    trang_thai SMALLINT NOT NULL DEFAULT 1 CHECK (trang_thai IN (0, 1)),
    luot_xem INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER trg_giao_an_updated_at
    BEFORE UPDATE ON giao_an_de_cu
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS chi_tiet_trang_bi_giao_an (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giao_an_id UUID NOT NULL REFERENCES giao_an_de_cu(id) ON DELETE CASCADE,
    trang_bi_id UUID NOT NULL REFERENCES trang_bi(id) ON DELETE CASCADE,
    o_so INTEGER NOT NULL,
    UNIQUE (giao_an_id, o_so)
);

CREATE TABLE IF NOT EXISTS chi_tiet_phu_hieu_giao_an (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giao_an_id UUID NOT NULL REFERENCES giao_an_de_cu(id) ON DELETE CASCADE,
    phu_hieu_id UUID NOT NULL REFERENCES phu_hieu(id) ON DELETE CASCADE,
    vi_tri_o TEXT NOT NULL,
    UNIQUE (giao_an_id, vi_tri_o)
);

CREATE TABLE IF NOT EXISTS chi_tiet_ngoc_giao_an (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giao_an_id UUID NOT NULL REFERENCES giao_an_de_cu(id) ON DELETE CASCADE,
    ngoc_id UUID NOT NULL REFERENCES ngoc(id) ON DELETE CASCADE,
    vi_tri_o INTEGER NOT NULL,
    UNIQUE (giao_an_id, vi_tri_o)
);

-- ====================================================================
-- 7. BÀI VIẾT + TAG
-- ====================================================================
CREATE TABLE IF NOT EXISTS bai_viet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tieu_de TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    tom_tat TEXT,
    noi_dung TEXT NOT NULL,
    url_hinh_anh TEXT,
    danh_muc_id UUID REFERENCES danh_muc(id) ON DELETE SET NULL,
    tac_gia_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    lien_ket_id UUID REFERENCES duong_dan(id) ON DELETE SET NULL,
    trang_thai SMALLINT NOT NULL DEFAULT 0 CHECK (trang_thai IN (0, 1)),
    luot_xem INTEGER NOT NULL DEFAULT 0,
    ngay_dang TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER trg_bai_viet_updated_at
    BEFORE UPDATE ON bai_viet
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS the (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_the TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS bai_viet_the (
    bai_viet_id UUID NOT NULL REFERENCES bai_viet(id) ON DELETE CASCADE,
    the_id UUID NOT NULL REFERENCES the(id) ON DELETE CASCADE,
    PRIMARY KEY (bai_viet_id, the_id)
);

-- ====================================================================
-- 8. DONATE, LIÊN HỆ, THỐNG KÊ CLICK
-- ====================================================================
CREATE TABLE IF NOT EXISTS ung_ho (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_nguoi_ung_ho TEXT NOT NULL,
    so_tien INTEGER NOT NULL DEFAULT 0 CHECK (so_tien >= 0),
    noi_dung TEXT,
    noi_dung_ck TEXT,
    phuong_thuc SMALLINT NOT NULL DEFAULT 0 CHECK (phuong_thuc IN (0, 1, 2)),
    trang_thai SMALLINT NOT NULL DEFAULT 0 CHECK (trang_thai IN (0, 1, 2)),
    xac_nhan_boi UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS tin_nhan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ho_ten TEXT NOT NULL,
    email TEXT,
    noi_dung TEXT NOT NULL,
    trang_thai SMALLINT NOT NULL DEFAULT 0 CHECK (trang_thai IN (0, 1, 2)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS nhat_ky_click (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duong_dan_id UUID REFERENCES duong_dan(id) ON DELETE CASCADE,
    thiet_bi TEXT,
    thoi_gian TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- 9. INDEX
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_duong_dan_danh_muc ON duong_dan (danh_muc_id);
CREATE INDEX IF NOT EXISTS idx_giao_an_tuong ON giao_an_de_cu (tuong_id);
CREATE INDEX IF NOT EXISTS idx_giao_an_danh_muc ON giao_an_de_cu (danh_muc_id);
CREATE INDEX IF NOT EXISTS idx_giao_an_nguoi_tao ON giao_an_de_cu (nguoi_tao_id);
CREATE INDEX IF NOT EXISTS idx_giao_an_trang_thai ON giao_an_de_cu (trang_thai);
CREATE INDEX IF NOT EXISTS idx_ctb_giao_an ON chi_tiet_trang_bi_giao_an (giao_an_id);
CREATE INDEX IF NOT EXISTS idx_cph_giao_an ON chi_tiet_phu_hieu_giao_an (giao_an_id);
CREATE INDEX IF NOT EXISTS idx_cng_giao_an ON chi_tiet_ngoc_giao_an (giao_an_id);
CREATE INDEX IF NOT EXISTS idx_bai_viet_danh_muc ON bai_viet (danh_muc_id);
CREATE INDEX IF NOT EXISTS idx_bai_viet_tac_gia ON bai_viet (tac_gia_id);
CREATE INDEX IF NOT EXISTS idx_bai_viet_trang_thai ON bai_viet (trang_thai);
CREATE INDEX IF NOT EXISTS idx_bai_viet_ngay_dang ON bai_viet (ngay_dang DESC);
CREATE INDEX IF NOT EXISTS idx_nhat_ky_click_duong_dan ON nhat_ky_click (duong_dan_id);
CREATE INDEX IF NOT EXISTS idx_ung_ho_created_at ON ung_ho (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ung_ho_trang_thai ON ung_ho (trang_thai);
CREATE INDEX IF NOT EXISTS idx_profiles_ten_dang_nhap ON profiles (ten_dang_nhap);

-- ====================================================================
-- 10. ROW LEVEL SECURITY
-- ====================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cai_dat_giao_dien ENABLE ROW LEVEL SECURITY;
ALTER TABLE cai_dat_donate ENABLE ROW LEVEL SECURITY;
ALTER TABLE cai_dat_stream_alert ENABLE ROW LEVEL SECURITY;
ALTER TABLE danh_muc ENABLE ROW LEVEL SECURITY;
ALTER TABLE duong_dan ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuong ENABLE ROW LEVEL SECURITY;
ALTER TABLE trang_bi ENABLE ROW LEVEL SECURITY;
ALTER TABLE phu_tro ENABLE ROW LEVEL SECURITY;
ALTER TABLE phu_hieu ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngoc ENABLE ROW LEVEL SECURITY;
ALTER TABLE giao_an_de_cu ENABLE ROW LEVEL SECURITY;
ALTER TABLE chi_tiet_trang_bi_giao_an ENABLE ROW LEVEL SECURITY;
ALTER TABLE chi_tiet_phu_hieu_giao_an ENABLE ROW LEVEL SECURITY;
ALTER TABLE chi_tiet_ngoc_giao_an ENABLE ROW LEVEL SECURITY;
ALTER TABLE bai_viet ENABLE ROW LEVEL SECURITY;
ALTER TABLE the ENABLE ROW LEVEL SECURITY;
ALTER TABLE bai_viet_the ENABLE ROW LEVEL SECURITY;
ALTER TABLE ung_ho ENABLE ROW LEVEL SECURITY;
ALTER TABLE tin_nhan ENABLE ROW LEVEL SECURITY;
ALTER TABLE nhat_ky_click ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_xem_cua_minh" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_sua_cua_minh" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_admin_toan_quyen" ON profiles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "cai_dat_giao_dien_xem" ON cai_dat_giao_dien FOR SELECT USING (true);
CREATE POLICY "cai_dat_giao_dien_admin" ON cai_dat_giao_dien FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "cai_dat_donate_xem" ON cai_dat_donate FOR SELECT USING (true);
CREATE POLICY "cai_dat_donate_admin" ON cai_dat_donate FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "cai_dat_stream_alert_xem" ON cai_dat_stream_alert FOR SELECT USING (true);
CREATE POLICY "cai_dat_stream_alert_admin" ON cai_dat_stream_alert FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "danh_muc_xem" ON danh_muc FOR SELECT USING (true);
CREATE POLICY "danh_muc_admin" ON danh_muc FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "duong_dan_xem" ON duong_dan FOR SELECT USING (hien_thi = true OR is_admin());
CREATE POLICY "duong_dan_admin" ON duong_dan FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "banner_xem" ON banner FOR SELECT USING (kich_hoat = true OR is_admin());
CREATE POLICY "banner_admin" ON banner FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "tuong_xem" ON tuong FOR SELECT USING (true);
CREATE POLICY "tuong_admin" ON tuong FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "trang_bi_xem" ON trang_bi FOR SELECT USING (true);
CREATE POLICY "trang_bi_admin" ON trang_bi FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "phu_tro_xem" ON phu_tro FOR SELECT USING (true);
CREATE POLICY "phu_tro_admin" ON phu_tro FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "phu_hieu_xem" ON phu_hieu FOR SELECT USING (true);
CREATE POLICY "phu_hieu_admin" ON phu_hieu FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ngoc_xem" ON ngoc FOR SELECT USING (true);
CREATE POLICY "ngoc_admin" ON ngoc FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "giao_an_xem" ON giao_an_de_cu FOR SELECT USING (trang_thai = 1 OR is_admin());
CREATE POLICY "giao_an_admin" ON giao_an_de_cu FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ctb_giao_an_xem" ON chi_tiet_trang_bi_giao_an FOR SELECT USING (true);
CREATE POLICY "ctb_giao_an_admin" ON chi_tiet_trang_bi_giao_an FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "cph_giao_an_xem" ON chi_tiet_phu_hieu_giao_an FOR SELECT USING (true);
CREATE POLICY "cph_giao_an_admin" ON chi_tiet_phu_hieu_giao_an FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "cng_giao_an_xem" ON chi_tiet_ngoc_giao_an FOR SELECT USING (true);
CREATE POLICY "cng_giao_an_admin" ON chi_tiet_ngoc_giao_an FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "bai_viet_xem" ON bai_viet FOR SELECT USING (trang_thai = 1 OR is_admin());
CREATE POLICY "bai_viet_admin" ON bai_viet FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "the_xem" ON the FOR SELECT USING (true);
CREATE POLICY "the_admin" ON the FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "bai_viet_the_xem" ON bai_viet_the FOR SELECT USING (true);
CREATE POLICY "bai_viet_the_admin" ON bai_viet_the FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "ung_ho_tao" ON ung_ho FOR INSERT WITH CHECK (true);
CREATE POLICY "ung_ho_xem" ON ung_ho FOR SELECT USING (true);
CREATE POLICY "ung_ho_admin_sua" ON ung_ho FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "ung_ho_admin_xoa" ON ung_ho FOR DELETE USING (is_admin());

CREATE POLICY "tin_nhan_tao" ON tin_nhan FOR INSERT WITH CHECK (true);
CREATE POLICY "tin_nhan_admin" ON tin_nhan FOR SELECT USING (is_admin());
CREATE POLICY "tin_nhan_admin_sua" ON tin_nhan FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "tin_nhan_admin_xoa" ON tin_nhan FOR DELETE USING (is_admin());

CREATE POLICY "nhat_ky_click_tao" ON nhat_ky_click FOR INSERT WITH CHECK (true);
CREATE POLICY "nhat_ky_click_admin" ON nhat_ky_click FOR SELECT USING (is_admin());


-- ====================================================================
-- 11f. TẠO TÀI KHOẢN ADMIN (vai_tro = 1, có tên đăng nhập)
-- ====================================================================
DO $$
DECLARE
    new_user_id UUID;
BEGIN
    INSERT INTO auth.users (
        instance_id, id, aud, role, email,
        encrypted_password, email_confirmed_at,
        created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'admin@vividpersona.com',              -- đổi email tại đây
        crypt('MatKhauCuaBan123!', gen_salt('bf')), -- đổi mật khẩu tại đây
        now(),
        now(), now(),
        '{"provider":"email","providers":["email"]}',
        '{"ten_dang_nhap": "admin"}'            -- đổi tên đăng nhập tại đây
    )
    RETURNING id INTO new_user_id;

    -- Trigger on_auth_user_created tự tạo profile (lấy ten_dang_nhap từ meta data ở trên)
    -- Ở đây update lại vai_tro thành 1 (admin)
    UPDATE profiles SET vai_tro = 1 WHERE id = new_user_id;

    RAISE NOTICE 'Đã tạo admin thành công, id: %', new_user_id;
END $$;