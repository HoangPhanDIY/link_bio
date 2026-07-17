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
--   ung_ho.phuong_thuc          0 = bank             1 = momo            2 = khác
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
    loai SMALLINT NOT NULL CHECK (loai IN (0, 1, 2, 3, 4, 5)),
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

ALTER TABLE auth.users DISABLE TRIGGER ALL;
DELETE FROM auth.users WHERE email = 'admin@vividpersona.com';
ALTER TABLE auth.users ENABLE TRIGGER ALL;

-- Xóa chính sách cũ bị chặn select đối với người dùng chưa đăng nhập
DROP POLICY IF EXISTS "profiles_xem_cua_minh" ON public.profiles;

-- Tạo chính sách mới cho phép mọi khách truy cập đều có thể xem thông tin hồ sơ của bạn
CREATE POLICY "profiles_xem_cong_khai" ON public.profiles FOR SELECT USING (true);

INSERT INTO phu_hieu (ten_phu_hieu, loai_nhanh, url_hinh_anh) VALUES
-- Nhóm: Thành khởi nguyên (loai_nhanh = 1)
('Quả cầu băng sương', 1, 'image/phu_hieu/thanh_khoi_nguyen/QuaCauBangSuong.png'),
('Siêu hồi máu', 1, 'image/phu_hieu/thanh_khoi_nguyen/SieuHoiMau.png'),
('Mật ngữ', 1, 'image/phu_hieu/thanh_khoi_nguyen/MatNgu.png'),
('Uy áp', 1, 'image/phu_hieu/thanh_khoi_nguyen/UyAp.png'),
('Thợ săn', 1, 'image/phu_hieu/thanh_khoi_nguyen/ThoSan.png'),
('Chuyển sinh', 1, 'image/phu_hieu/thanh_khoi_nguyen/ChuyenSinh.png'),
('Luyện kim', 1, 'image/phu_hieu/thanh_khoi_nguyen/LuyenKim.png'),

-- Nhóm: Tháp quang minh (loai_nhanh = 2)
('Tương phản', 2, 'image/phu_hieu/thap_quang_minh/TuongPhan.png'),
('Sung mãn', 2, 'image/phu_hieu/thap_quang_minh/SungMan.png'),
('Thánh châu', 2, 'image/phu_hieu/thap_quang_minh/ThanhChau.png'),
('Xuyên tâm', 2, 'image/phu_hieu/thap_quang_minh/XuyenTam.png'),
('Bí quyết', 2, 'image/phu_hieu/thap_quang_minh/BiQuyet.png'),
('Thánh thuẫn', 2, 'image/phu_hieu/thap_quang_minh/ThanhThuan.png'),
('Thần quang', 2, 'image/phu_hieu/thap_quang_minh/ThanQuang.png'),
('Tinh linh', 2, 'image/phu_hieu/thap_quang_minh/TinhLinh.png'),

-- Nhóm: Vực hỗn mang (loai_nhanh = 3)
('Ma hỏa', 3, 'image/phu_hieu/vuc_hon_mang/MaHoa.png'),
('Dư ảnh', 3, 'image/phu_hieu/vuc_hon_mang/DuAnh.png'),
('Hấp huyết', 3, 'image/phu_hieu/vuc_hon_mang/HapHuyet.png'),
('Cố thủ', 3, 'image/phu_hieu/vuc_hon_mang/CoThu.png'),
('Cường công', 3, 'image/phu_hieu/vuc_hon_mang/CuongCong.png'),
('Ma tính', 3, 'image/phu_hieu/vuc_hon_mang/MaTinh.png'),
('Ma chú', 3, 'image/phu_hieu/vuc_hon_mang/MaChu.png'),
('Đấu khí', 3, 'image/phu_hieu/vuc_hon_mang/DauKhi.png'),

-- Nhóm: Rừng nguyên sinh (loai_nhanh = 4)
('Canh gác', 4, 'image/phu_hieu/rung_nguyen_sinh/CanhGac.png'),
('Ám kích', 4, 'image/phu_hieu/rung_nguyen_sinh/AmKich.png'),
('Nhạy bén', 4, 'image/phu_hieu/rung_nguyen_sinh/NhayBen.png'),
('Sinh tồn', 4, 'image/phu_hieu/rung_nguyen_sinh/SinhTon.png'),
('Bơm máu', 4, 'image/phu_hieu/rung_nguyen_sinh/BomMau.png'),
('Du hiệp', 4, 'image/phu_hieu/rung_nguyen_sinh/DuHiep.png'),
('Mộc giáp', 4, 'image/phu_hieu/rung_nguyen_sinh/MocGiap.png'),
('Trói buộc', 4, 'image/phu_hieu/rung_nguyen_sinh/TroiBuoc.png');

INSERT INTO phu_tro (ten_phu_tro, url_hinh_anh, mo_ta) VALUES
(
  'Tốc biến', 
  '/image/phu_tro/toc_bien.png', 
  'Dịch chuyển một khoảng ngắn theo hướng chỉ định.'
),
(
  'Bộc phá', 
  '/image/phu_tro/boc_pha.png', 
  'Gây sát thương chuẩn tương đương 16% máu đã mất của kẻ địch lân cận.'
),
(
  'Trừng trị', 
  '/image/phu_tro/trung_tri.png', 
  'Gây sát thương chuẩn lên quái rừng hoặc lính lân cận và làm choáng chúng trong 1 giây.'
),
(
  'Gầm thét', 
  '/image/phu_tro/gam_thet.png', 
  'Tăng 60% tốc độ đánh và 10% công vật lý trong 5 giây.'
),
(
  'Cấp cứu', 
  '/image/phu_tro/cap_cuu.png', 
  'Hồi 15% máu cho bản thân và đồng đội lân cận, đồng thời tăng 15% tốc chạy trong 2 giây.'
),
(
  'Ngất ngư', 
  '/image/phu_tro/ngat_ngu.png', 
  'Làm choáng kẻ địch xung quanh trong 0.75 giây và giảm giáp của chúng.'
),
(
  'Thanh tẩy', 
  '/image/phu_tro/thanh_tay.png', 
  'Hóa giải mọi hiệu ứng khống chế hiện tại và miễn dịch với khống chế trong 1.5 giây kế tiếp.'
),
(
  'Suy nhược', 
  '/image/phu_tro/suy_nhuoc.png', 
  'Giảm 20% sát thương gây ra của kẻ địch lân cận và tăng 20% miễn thương của bản thân trong 4 giây.'
),
(
  'Tốc hành', 
  '/image/phu_tro/toc_hanh.png', 
  'Tăng 30% tốc chạy giảm dần trong 10 giây, đồng thời loại bỏ trạng thái làm chậm khi kích hoạt.'
)
ON CONFLICT (ten_phu_tro) DO NOTHING;

INSERT INTO trang_bi (ten_trang_bi, cap, loai, url_hinh_anh, mo_ta) VALUES
-- TRANG BỊ CÔNG (loai = 0)
('Kiếm dài', 1, 0, '/image/trang_bi/cong/cap_1/kiem_dai.png', '+80 Công vật lý'),
('Chùy xích', 1, 0, '/image/trang_bi/cong/cap_1/chuy_xich.png', '+40 Công vật lý'),
('Chùy máu', 1, 0, '/image/trang_bi/cong/cap_1/chuy_mau.png', '+10 Công vật lý, +8% Hút máu'),
('Găng tay', 1, 0, '/image/trang_bi/cong/cap_1/gang_tay.png', '+8% Tỷ lệ chí mạng'),
('Dao găm', 1, 0, '/image/trang_bi/cong/cap_1/dao_gam.png', '+10% Tốc đánh'),
('Kiếm ngắn', 1, 0, '/image/trang_bi/cong/cap_1/kiem_ngan.png', '+20 Công vật lý'),
('Huyết ảnh đao', 2, 0, '/image/trang_bi/cong/cap_2/huyet_anh_dao.png', '+30 Công vật lý, +10% Hút máu. Nội tại – Huyết yến: Khi bản thân thấp hơn 30% máu, trong 5 giây tích lũy hồi 400 – 610 máu tối đa.'),
('Huyết cung', 2, 0, '/image/trang_bi/cong/cap_2/huyet_cung.png', '+ 40 Công vật lý, +10% Tốc đánh. Xuyên thấu: Tăng 10% xuyên giáp (gấp đôi với tướng đánh xa) – Nội tại duy nhất'),
('Đao Truy Hồn', 2, 0, '/image/trang_bi/cong/cap_2/dao_truy_hon.png', '+80 Công vật lý, + 800 Máu tối đa, + 10% Giảm hồi chiêu. Tróc nã: Đòn đánh thường/ tung chiêu gây sát thương sẽ khiến mục tiêu bị giảm 40% hiệu quả hồi máu, kéo dài 3 giây – Nội tại duy nhất'),
('Liềm Đoạt Mệnh', 2, 0, '/image/trang_bi/cong/cap_2/liem_doat_menh.png', '+75 Công vật lý, +15% Tốc đánh, +500 Máu tối đa. Nội tại duy nhất – Thần linh can thiệp: Miễn nhiễm sát thương chí tử và vô địch 0.75s đồng thời tăng 25% tốc chạy & 25% tốc đánh.'),
('Gươm Uriel', 2, 0, '/image/trang_bi/cong/cap_2/guom_uriel.png', '+80 Công vật lý, +25% Tốc đánh, +200 Giáp phép. Nội tại duy nhất – Bảo hộ ma pháp: Khi máu tướng xuống dưới 40%, tạo lá chắn phép. Nội tại duy nhất – Cuồng bạo: Đòn đánh thường tăng 10% tốc chạy.'),
('Phi tiêu', 2, 0, '/image/trang_bi/cong/cap_2/phi_tieu.png', '+20% Tốc đánh. Điểm yếu: Đòn đánh thường sẽ được tăng sát thương vật lý thêm 21 – 35 với tướng đánh gần hoặc 42 – 70 với tướng đánh xa – Nội tại duy nhất.'),
('Thương đấu sĩ', 2, 0, '/image/trang_bi/cong/cap_2/thuong_dau_si.png', '+50 Công vật lý. Phá giáp: +60 Xuyên giáp – Nội tại duy nhất'),
('Song đao', 2, 0, '/image/trang_bi/cong/cap_2/song_dao.png', '+25% Tốc đánh, +5% Tốc chạy'),
('Chùy cổ', 2, 0, '/image/trang_bi/cong/cap_2/chuy_co.png', '+25 Công vật lý, +15% Tốc đánh. Cuồng bạo: Đòn đánh thường tăng 10% Tốc chạy – Nội tại duy nhất'),
('Chùy băng sương', 3, 0, '/image/trang_bi/cong/cap_3/chuy_bang_suong.png', '+60 Công vật lý, +30% Tốc đánh, +900 Máu tối đa. Đông Băng: Làm chậm 5% – 10%. Hàn Khí: Đánh thường/tung chiêu gây thêm 140 – 280 sát thương vật lý.'),
('Diệt thần cung', 3, 0, '/image/trang_bi/cong/cap_3/diet_than_cung.png', '+ 50 Công vật lý, + 30% Tốc đánh, + 10% Tỷ lệ chí mạng. Phá thần: Đòn đánh thường kèm 50 sát thương vật lý. Xuyên thấu: Tăng 20% xuyên giáp.'),
('Xạ Nhật Cung', 3, 0, '/image/trang_bi/cong/cap_3/xa_nhat_cung.png', '+30% Tốc đánh, +10% Tỷ lệ chí mạng, + 5% Tốc chạy. Ngắm Chuẩn: Thêm 50 sát thương vật lý. Xạ Nhật (Kích hoạt): Tăng tầm bắn và tốc chạy.'),
('Thương Xuyên Phá', 3, 0, '/image/trang_bi/cong/cap_3/thuong_xuyen_pha.png', '+110 Công vật lý. Khinh công: Rời giao tranh tăng 10% Tốc chạy. Nghiền ép: Tăng 40 – 180 chỉ số xuyên giáp.'),
('Vuốt Hung Tàn', 3, 0, '/image/trang_bi/cong/cap_3/vuot_hung_tan.png', '+30% Tốc đánh, +20% Tỷ lệ chí mạng, +5% Tốc chạy. Hung bạo: Các đòn đánh thường trúng đích giúp tăng cộng dồn tốc đánh.'),
('Cung tà ma', 3, 0, '/image/trang_bi/cong/cap_3/cung_ta_ma.png', '+90 Công vật lý, +10% Hút máu, +10% Tỷ lệ chí mạng. Hấp huyết (Kích hoạt): tăng 60% hút máu trong 3 giây.'),
('Thương khung kiếm', 3, 0, '/image/trang_bi/cong/cap_3/thuong_khung_kiem.png', '+100 Công vật lý, +10% Giảm hồi chiêu, + 500 Máu tối đa. Bất khuất (Kích hoạt): Nhận 40% miễn thương. Trì trệ: Làm chậm và giảm sát thương mục tiêu.'),
('Nanh Fenrir', 3, 0, '/image/trang_bi/cong/cap_3/nanh_fenrir.png', '+180 công vật lý, +5% giảm hồi chiêu. Chinh Phạt: Khi máu mục tiêu dưới 50% sẽ chịu thêm 30% sát thương.'),
('Song đao bão táp', 3, 0, '/image/trang_bi/cong/cap_3/song_dao_bao_tap.png', '+35% Tốc đánh, +25% Tỷ lệ chí mạng, +7% Tốc chạy. Cuồng phong: Tăng 35% Kháng hiệu ứng sau khi đánh chí mạng.'),
('Gươm sấm sét', 3, 0, '/image/trang_bi/cong/cap_3/guom_sam_set.png', '+35% Tốc đánh, +8% Tốc chạy. Chớp giật: Đòn đánh thường gây thêm ST phép và phóng sét lan truyền.'),
('Phức hợp kiếm', 3, 0, '/image/trang_bi/cong/cap_3/phuc_hop_kiem.png', '+70 Công vật lý, +15% Tốc đánh, +10% Giảm hồi chiêu, +600 Máu tối đa. Sức mạnh nguyên tố: Đòn đánh sau chiêu gây thêm 100% STVL.'),
('Quỷ Kiếm', 3, 0, '/image/trang_bi/cong/cap_3/quy_kiem.png', '+100 Công vật lý, +25% Hút máu, +600 Máu tối đa. Huyết yến: Khi máu dưới 30%, tự động hồi phục máu trong 5 giây.'),
('Kiếm Muramasa', 3, 0, '/image/trang_bi/cong/cap_3/kiem_muramasa.png', '+80 Công vật lý, +10% Giảm hồi chiêu, +500 Máu tối đa. Xuyên thấu: +35% xuyên giáp.'),
('Thánh kiếm', 3, 0, '/image/trang_bi/cong/cap_3/thanh_kiem.png', '+100 Công vật lý, +25% Tỷ lệ chí mạng. Thánh kiếm: Đánh chí mạng tăng tốc chạy, sát thương chí mạng tăng 40%.'),
('Kiếm Fafnir', 3, 0, '/image/trang_bi/cong/cap_3/kiem_fafnir.png', '+60 Công vật lý, +30% Tốc đánh, +10% Hút máu. Hơi thở rồng: Đòn đánh thường gây thêm STVL theo 8% Máu hiện tại của mục tiêu.'),
('Thương Longinus', 3, 0, '/image/trang_bi/cong/cap_3/thuong_longinus.png', '+80 Công vật lý, +15% Giảm hồi chiêu, +500 Máu tối đa, +60 Xuyên giáp. Toái giáp: Gây sát thương trừ giáp nạn nhân, cộng dồn 4 lần.'),

-- TRANG BỊ PHÉP (loai = 1)
('Nhẫn ma pháp', 1, 1, '/image/trang_bi/phep/cap_1/nhan_ma_phap.png', '+5% giảm hồi chiêu – Nội tại duy nhất'),
('Sách cổ', 1, 1, '/image/trang_bi/phep/cap_1/sach_co.png', '+80 Công phép'),
('Dây chuyền ma thuật', 1, 1, '/image/trang_bi/phep/cap_1/day_chuyen_ma_thuat.png', '+10 Hồi năng lượng/5s'),
('Nhẫn Lapis', 1, 1, '/image/trang_bi/phep/cap_1/nhan_lapis.png', '+300 Năng lượng tối đa'),
('Sách phép', 1, 1, '/image/trang_bi/phep/cap_1/sach_phep.png', '+40 Công phép'),
('Cầu chiêm tinh', 2, 1, '/image/trang_bi/phep/cap_2/cau_chiem_tinh.png', '+ 80 Công phép. Vang vọng: Tung chiêu bùng nổ gây 180 sát thương phép diện rộng.'),
('Sách Truy Hồn', 2, 1, '/image/trang_bi/phep/cap_2/sach_truy_hon.png', '+140 Công phép, +600 Máu tối đa, + 10% Giảm hồi chiêu. Tróc nã: Gây sát thương giảm 40% hiệu quả hồi máu của mục tiêu.'),
('Dây chuyền lục bảo', 2, 1, '/image/trang_bi/phep/cap_2/day_chuyen_luc_bao.png', '+160 Công phép, +15% Giảm hồi chiêu, + 25 Hồi năng lượng/5s. Hiền giả: Mỗi giây hồi 1% năng lượng.'),
('Trượng hỗn mang', 2, 1, '/image/trang_bi/phep/cap_2/truong_hon_mang.png', '+180 Công phép, +10% Giảm hồi chiêu, +40% Xuyên giáp phép.'),
('Huyết trượng', 2, 1, '/image/trang_bi/phep/cap_2/huyet_truong.png', '+80 Công phép, +12% Hút máu phép'),
('Vòng đức hạnh', 2, 1, '/image/trang_bi/phep/cap_2/vong_duc_hanh.png', '+60 Công phép, +20 Hồi năng lượng/5s, +5% Giảm hồi chiêu'),
('Phượng hoàng lệ', 2, 1, '/image/trang_bi/phep/cap_2/phuong_hoang_le.png', '+50 Công phép. Tưởng thưởng anh hùng: Khi lên cấp, hồi phục 20% Máu và 10% Năng lượng trong 3 giây.'),
('Mặt nạ ma quái', 2, 1, '/image/trang_bi/phep/cap_2/mat_na_ma_quai.png', '+100 Công phép, +75 Xuyên giáp phép.'),
('Gươm nguyên tố', 2, 1, '/image/trang_bi/phep/cap_2/guom_nguyen_to.png', '+ 40 Công phép, +10% Giảm hồi chiêu. Sức mạnh nguyên tố: Đòn đánh sau chiêu gây thêm sát thương phép.'),
('Sớ ma thuật', 2, 1, '/image/trang_bi/phep/cap_2/so_ma_thuat.png', '+120 Công phép'),
('Thệ ước Carano', 3, 1, '/image/trang_bi/phep/cap_3/the_uoc_carano.png', '+180 Công phép, +12% Hút máu phép, +5% Tốc chạy. Bảo hộ khẩn cấp: Thấp máu hóa giải khống chế, nhận lá chắn và tốc chạy.'),
('Ma pháp trường bào', 3, 1, '/image/trang_bi/phep/cap_3/ma_phap_truong_bao.png', '+120 Công phép +900 Máu tối đa. Linh thể: Nhận thêm công phép theo máu. Phá phép: Nhận thêm xuyên giáp phép theo máu.'),
('Xuyên tâm lệnh', 3, 1, '/image/trang_bi/phep/cap_3/xuyen_tam_lenh.png', '+140 Công phép, +500 Máu tối đa. Oán chú: Tung chiêu giảm công phép và giáp phép của mục tiêu.'),
('Băng nhẫn Skadi', 3, 1, '/image/trang_bi/phep/cap_3/bang_nhan_skadi.png', '+140 Công phép, + 600 Máu tối đa, +5% Giảm Hồi chiêu. Giáp băng: Nhận thêm giáp và giáp phép theo công phép.'),
('Quả cầu băng sương', 3, 1, '/image/trang_bi/phep/cap_3/qua_cau_bang_suong.png', '+220 Công phép, + 12% Hút máu phép. Phong ấn (Kích hoạt): Bất khả xâm phạm trong 1.5 giây, sau đó nhận lá chắn.'),
('Mặt nạ Berith', 3, 1, '/image/trang_bi/phep/cap_3/mat_na_berith.png', '+140 Công phép, +10% Giảm hồi chiêu, +600 Máu tối đa. Thống khổ: Chiêu thức gây thiêu đốt sát thương phép theo % máu hiện tại mục tiêu.'),
('Trượng băng', 3, 1, '/image/trang_bi/phep/cap_3/truong_bang.png', '+140 Công phép, +850 Máu tối đa, +5% Tốc chạy. Giá băng: Chiêu thức làm chậm 20% Tốc chạy của đối thủ.'),
('Thập Tự Kiếm', 3, 1, '/image/trang_bi/phep/cap_3/thap_tu_kiem.png', '+180 Công phép, +20% Tốc đánh, +5% Tốc chạy. Cấp nhận: Tăng tốc đánh. Thánh quang: Đánh thường thêm sát thương phép.'),
('Quyền trượng Rhea', 3, 1, '/image/trang_bi/phep/cap_3/quyen_truong_rhea.png', '+160 Công phép, +800 Máu tối đa, +25% Hút máu phép. Chuyển hóa: Mỗi 2% hút máu phép chuyển thành 1% giảm hồi chiêu.'),
('Ngọc đại pháp sư', 3, 1, '/image/trang_bi/phep/cap_3/ngoc_dai_phap_su.png', '+140 Công phép, +10% Giảm hồi chiêu. Trường tồn: Tăng tiến công phép và máu theo thời gian. Tưởng thưởng anh hùng khi lên cấp.'),
('Vương miện Hecate', 3, 1, '/image/trang_bi/phep/cap_3/vuong_mien_hecate.png', '+240 Công phép. Thuật sư: +35% Công phép.'),
('Trượng bùng nổ', 3, 1, '/image/trang_bi/phep/cap_3/truong_bung_no.png', '+200 Công phép, +5% Tốc chạy. Vang vọng: Tạo vụ nổ nhỏ gây sát thương phép diện rộng xung quanh mục tiêu.'),
('Sách thánh', 3, 1, '/image/trang_bi/phep/cap_3/sach_thanh.png', '+350 Công phép, +10% Giảm hồi chiêu. Pháp thể: Mỗi 100 công phép tăng % sát thương gây ra và % miễn thương.'),
('Gươm hiền triết', 3, 1, '/image/trang_bi/phep/cap_3/guom_hien_triet.png', '+140 Công phép, +600 Máu tối đa, +10% Giảm hồi chiêu. Diệt thần: Đánh thường/chiêu cộng dồn chỉ số xuyên giáp phép.'),
('Gươm tận thế', 3, 1, '/image/trang_bi/phep/cap_3/guom_tan_the.png', '+180 Công phép, +10% Giảm hồi chiêu, +5% tốc chạy. Sức mạnh nguyên tố: Đòn đánh sau chiêu gây thêm sát thương phép lớn.'),

-- TRANG BỊ THỦ (loai = 2)
('Dây chuyền hồng ngọc', 1, 2, '/image/trang_bi/thu/cap_1/day_chuyen_hong_ngoc.png', '+600 Máu tối đa'),
('Bùa sức mạnh', 1, 2, '/image/trang_bi/thu/cap_1/bua_suc_manh.png', '+30 Hồi máu/5s'),
('Găng giác đấu', 1, 2, '/image/trang_bi/thu/cap_1/gang_giac_dau.png', '+90 Giáp phép'),
('Giáp nhẹ', 1, 2, '/image/trang_bi/thu/cap_1/giap_nhe.png', '+ 90 Giáp'),
('Nhẫn hồng ngọc', 1, 2, '/image/trang_bi/thu/cap_1/nhan_hong_ngoc.png', '+300 Máu tối đa'),
('Giáp cuồng nộ', 2, 2, '/image/trang_bi/thu/cap_2/giap_cuong_no.png', '+225 Giáp, +1200 Máu tối đa, +5% Tốc chạy. Điên cuồng: Gánh chịu sát thương giúp tăng tốc chạy và sát thương gây ra.'),
('Hercule thịnh nộ', 2, 2, '/image/trang_bi/thu/cap_2/hercule_thinh_no.png', '+80 Công vật lý, +240 Giáp. Cuồng Nộ: Khi máu xuống dưới 40%, tăng hút máu cận chiến và tạo lớp lá chắn hấp thụ sát thương.'),
('Giáp thống khổ', 2, 2, '/image/trang_bi/thu/cap_2/giap_thong_kho.png', '+300 Giáp, +1200 Máu tối đa. Phản pháo: Phản lại 15% sát thương vật lý đã gánh chịu thành sát thương phép.'),
('Giáp hiệp sĩ', 2, 2, '/image/trang_bi/thu/cap_2/giap_hiep_si.png', '+210 Giáp. Lính gác: Nếu chịu sát thương, giảm 15% tốc đánh của đối thủ ra đòn.'),
('Găng bạch kim', 2, 2, '/image/trang_bi/thu/cap_2/gang_bach_kim.png', '+10% giảm hồi chiêu, +110 Giáp'),
('Đai kháng phép', 2, 2, '/image/trang_bi/thu/cap_2/dai_khang_phep.png', '+700 Máu tối đa, +110 Giáp phép. Hồi phục: Chịu sát thương giúp hồi phục lại 4% máu tối đa.'),
('Tim Incubus', 2, 2, '/image/trang_bi/thu/cap_2/tim_incubus.png', '+150 Giáp. Hỏa diệm: Gây sát thương phép mỗi giây lên những kẻ địch cạnh bên (tăng thêm lên quái và lính).'),
('Giáp chân', 2, 2, '/image/trang_bi/thu/cap_2/giap_chan.png', '+1000 Máu tối đa'),
('Nham thuẫn', 3, 2, '/image/trang_bi/thu/cap_3/nham_thuan.png', '+1200 Máu tối đa, +240 Giáp. Tích tụ (Kích hoạt): Nhận lá chắn dựa trên máu tối đa và máu đã mất, giảm sát thương gây ra.'),
('Phù chú trường sinh', 3, 2, '/image/trang_bi/thu/cap_3/phu_chu_truong_sinh.png', '+150 giáp, +100 giáp phép, +1500 máu tối đa. Trường Sinh: Tự động hồi phục máu tối đa, tăng mạnh khi rời giao tranh.'),
('Áo choàng băng giá', 3, 2, '/image/trang_bi/thu/cap_3/ao_choang_bang_gia.png', '+10% Giảm hồi chiêu, +200 Giáp, +800 Máu tối đa. Sức mạnh nguyên tố: Đòn đánh sau chiêu gây STVL lan và làm chậm.'),
('Giáp hộ mệnh', 3, 2, '/image/trang_bi/thu/cap_3/giap_ho_menh.png', '+120 Giáp. Chiến khí: Tăng 10% sát thương. Phục sinh: Sống lại tại chỗ sau khi hạ gục (tối đa 2 lần/trận).'),
('Huân chương Troy', 3, 2, '/image/trang_bi/thu/cap_3/huan_chuong_troy.png', '+200 Giáp phép, +1000 Máu tối đa, +10% Giảm hồi chiêu. Hộ thân: Nhận lá chắn phép khi rời giao tranh. Nội lực: Tăng giáp phép theo cấp.'),
('Giáp Gaia', 3, 2, '/image/trang_bi/thu/cap_3/giap_gaia.png', '+200 Giáp phép, +1200 Máu tối đa. Hồi phục: Chịu sát thương hồi máu. Huyết Thống: Mất càng nhiều máu hồi phục càng tăng.'),
('Khiên huyền thoại', 3, 2, '/image/trang_bi/thu/cap_3/khien_huyen_thoai.png', '+360 Giáp, +400 Năng lượng, +20% Giảm hồi chiêu. Trói Buộc Tinh Thần: Giảm 30% tốc đánh của kẻ địch lân cận.'),
('Khiên thất truyền', 3, 2, '/image/trang_bi/thu/cap_3/khien_that_truyen.png', '+275 Giáp, +1200 Máu tối đa. Lính gác: Chịu sát thương giảm tốc đánh và tốc chạy của đối thủ ra đòn.'),
('Áo choàng thần Ra', 3, 2, '/image/trang_bi/thu/cap_3/ao_choang_than_ra.png', '+1000 Máu tối đa, +225 Giáp, +60 Hồi máu/5s. Hỏa diệm: Đốt phép diện rộng theo % máu tối đa, đi kèm Tróc nã giảm hồi máu địch.'),

-- TRANG BỊ TỐC ĐỘ (loai = 3)
('Giày thép', 1, 3, '/image/trang_bi/toc_do/cap_1/giay_thep.png', '+30 Tốc chạy – Nội tại duy nhất: Gia tốc'),
('Giày Hermes', 2, 3, '/image/trang_bi/toc_do/cap_2/giay_hermes.png', '+300 Máu tối đa, +70 Tốc chạy. Nhanh nhạy: Tăng mạnh tốc chạy khi thoát trạng thái giao tranh.'),
('Giày du mục', 2, 3, '/image/trang_bi/toc_do/cap_2/giay_du_muc.png', '+20% Tốc đánh, +60 Tốc chạy. Đánh thường hồi 20 máu.'),
('Giày phù thủy', 2, 3, '/image/trang_bi/toc_do/cap_2/giay_phu_thuy.png', '+60 tốc chạy, +100 Xuyên giáp phép.'),
('Giày thuật sĩ', 2, 3, '/image/trang_bi/toc_do/cap_2/giay_thuat_si.png', '+15% Giảm hồi chiêu, +60 Tốc chạy. Giảm hồi chiêu kỹ năng phụ trợ.'),
('Giày kiên cường', 2, 3, '/image/trang_bi/toc_do/cap_2/giay_kien_cuong.png', '+90 Giáp phép, +60 Tốc chạy, +35% Kháng hiệu ứng khống chế.'),
('Giày hộ vệ', 2, 3, '/image/trang_bi/toc_do/cap_2/giay_ho_ve.png', '+110 Giáp, +60 Tốc chạy. Giảm 10% sát thương vật lý phải chịu.'),

-- TRANG BỊ TRỢ THỦ (loai = 4)
('Nguyên tố bảo thạch', 1, 4, '/image/trang_bi/tro_thu/cap_1/nguyen_to_bao_thach.png', '+ 5% Tốc chạy. Hậu cần: Thêm vàng/EXP cho đồng đội thấp nhất. Khiêm nhường: Nhường vàng lính và quái.'),
('Đại địa thần tốc', 2, 4, '/image/trang_bi/tro_thu/cap_2/dai_dia_than_toc.png', '+1200 Máu tối đa, +8% Tốc chạy. Kích hoạt – Thần tốc: Tăng tốc chạy diện rộng đồng minh. Nguyên lực: Tăng song giáp lân cận.'),
('Hoả hệ bảo thạch', 2, 4, '/image/trang_bi/tro_thu/cap_2/hoa_he_bao_thach.png', '+600 Máu tối đâ, +5% Tốc chạy. Cực ảnh: Tăng tốc đánh và giảm hồi chiêu cho bản thân và đồng đội.'),
('Thổ hệ bảo thạch', 2, 4, '/image/trang_bi/tro_thu/cap_2/tho_he_bao_thach.png', '+600 Máu tối đâ, +5% Tốc chạy. Nguyên lực: Tăng song giáp cho bản thân và đồng đội lân cận.'),
('Liệt hoả thần tốc', 3, 4, '/image/trang_bi/tro_thu/cap_3/liet_hoa_than_toc.png', '+ 1200 Máu tối đa, +8% Tốc chạy. Kích hoạt – Thần tốc. Cực ảnh: Tăng tốc đánh và giảm hồi chiêu.'),
('Liệt hoả mở trói', 3, 4, '/image/trang_bi/tro_thu/cap_3/liet_hoa_mo_troi.png', '+ 1200 Máu tối đa, +8% Tốc chạy. Kích hoạt – Mở trói: Hóa giải khống chế diện rộng, miễn khống trong 0.5s.'),
('Liệt hoả hồi huyết', 3, 4, '/image/trang_bi/tro_thu/cap_3/liet_hoa_hoi_huyet.png', '+ 1200 Máu tối đa, +8% Tốc chạy. Kích hoạt – Hồi huyết: Liên kết hồi phục lượng lớn máu và năng lượng cho đồng minh.'),
('Liệt hoả ma nhãn', 3, 4, '/image/trang_bi/tro_thu/cap_3/liet_hoa_ma_nhan.png', '+ 1200 Máu tối đa, +8% Tốc chạy. Kích hoạt – Ma nhãn: Soi tầm nhìn chuẩn, gây sát thương phép và làm chậm.'),
('Liệt hoả thần khiên', 3, 4, '/image/trang_bi/tro_thu/cap_3/liet_hoa_than_khien.png', '+ 1200 Máu tối đa, +8% Tốc chạy. Kích hoạt – Thần khiên: Lập tức tạo lá chắn hấp thu sát thương diện rộng.'),
('Đại địa hồi huyết', 3, 4, '/image/trang_bi/tro_thu/cap_3/dai_dia_hoi_huyet.png', '+1200 Máu tối đa, +8% Tốc chạy. Kích hoạt – Hồi huyết. Nguyên lực: Tăng song giáp, Tưởng thưởng tăng thuộc tính chủ đạo.'),
('Đại địa ma nhãn', 3, 4, '/image/trang_bi/tro_thu/cap_3/dai_dia_ma_nhan.png', '+1200 Máu tối đa, +8% Tốc chạy. Kích hoạt – Ma nhãn. Nguyên lực: Tăng song giáp lân cận.'),
('Đại địa thần khiên', 3, 4, '/image/trang_bi/tro_thu/cap_3/dai_dia_than_khien.png', '+1200 Máu tối đa, +8% Tốc chạy. Kích hoạt – Thần khiên. Nguyên lực: Tăng song giáp lân cận.'),
('Đại địa Mở trói', 3, 4, '/image/trang_bi/tro_thu/cap_3/dai_dia_mo_troi.png', '+1200 Máu tối đa, +8% Tốc chạy. Kích hoạt – Mở trói. Nguyên lực: Tăng song giáp lân cận.'),

-- TRANG BỊ ĐI RỪNG (loai = 5)
('Rựa thợ săn', 1, 5, '/image/trang_bi/di_rung/cap_1/rua_tho_san.png', 'Nâng cấp Trừng trị thành Tê Cóng. Khiêm nhường: Điều chỉnh vàng lính đầu game. Thợ săn: Tăng EXP quái rừng, thêm ST chuẩn lên quái.'),
('Cung Gió Lốc', 2, 5, '/image/trang_bi/di_rung/cap_2/cung_gio_loc.png', '+12% Tốc đánh. Hiệu ứng tê tái. Lùng diệt: Diệt quái tích lũy tốc đánh và hút máu. Săn bắt tăng EXP quái rừng.'),
('Đao truy kích', 2, 5, '/image/trang_bi/di_rung/cap_2/dao_truy_kich.png', '+25 Công vật lý. Hiệu ứng tê tái. Lùng diệt: Diệt quái tích lũy công vật lý và giảm hồi chiêu.'),
('Rìu Gnoll', 2, 5, '/image/trang_bi/di_rung/cap_2/riu_gnoll.png', '+400 Máu tối đa. Hỏa diệm xung quanh. Lùng diệt: Diệt quái tích lũy máu tối đa và giảm hồi chiêu.'),
('Gươm hiến tế', 2, 5, '/image/trang_bi/di_rung/cap_2/guom_hien_te.png', '+40 Công phép. Hiệu ứng tê tái. Lùng diệt: Diệt quái tích lũy công phép và giảm hồi chiêu.'),
('Cung Bão Tố', 3, 5, '/image/trang_bi/di_rung/cap_3/cung_bao_to.png', '+30% Tốc đánh, +15% Hút máu, +7% Tốc chạy. Lốc xoáy: Đánh thường tích điểm gây thêm ST phép. Lùng diệt cộng dồn.'),
('Kiếm truy hồn', 3, 5, '/image/trang_bi/di_rung/cap_3/kiem_truy_hon.png', '+90 Công vật lý, +5% Giảm hồi chiêu, +8% Tốc chạy. Xuyến chắn: +60 xuyên giáp. Lùng diệt tích lũy công vật lý.'),
('Rìu Leviathan', 3, 5, '/image/trang_bi/di_rung/cap_3/riu_leviathan.png', '+1200 Máu tối đa, +5% Giảm hồi chiêu, +6% Tốc cháy. Hỏa diệm thiêu đốt phép diện rộng theo % máu tối đa. Lùng diệt tích lũy.'),
('Gươm Loki', 3, 5, '/image/trang_bi/di_rung/cap_3/guom_loki.png', '+150 Công phép, +5% Giảm hồi chiêu, +7% Tốc chạy. Sức mạnh nguyên tố: Đòn đánh sau chiêu gây thêm sát thương phép. Lùng diệt tích lũy.');

INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Flowborn PS', 'FlowbornPs', 'Pháp sư', '/image/tuong/PhapSu/FlowbornPs.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Flowborn', 'Flowborn', 'Xạ thủ', '/image/tuong/XaThu/Flowborn.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Dyadia', 'Dyadia', 'Trợ thủ', '/image/tuong/TroThu/Dyadia.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Edras', 'Edras', 'Đấu sĩ', '/image/tuong/DauSi/Edras.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Goverra', 'Goverra', 'Pháp sư', '/image/tuong/PhapSu/Goverra.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Heino', 'Heino', 'Pháp sư', '/image/tuong/PhapSu/Heino.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Billow', 'Billow', 'Sát thủ', '/image/tuong/SatThu/Billow.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Bolt Baron', 'BoltBaron', 'Pháp sư', '/image/tuong/PhapSu/BoltBaron.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Biron', 'Biron', 'Đấu sĩ', '/image/tuong/DauSi/Biron.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Dolia', 'Dolia', 'Trợ thủ', '/image/tuong/TroThu/Dolia.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Charlotte', 'Charlotte', 'Đấu sĩ', '/image/tuong/DauSi/Charlotte.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Tachi', 'Tachi', 'Đấu sĩ', '/image/tuong/DauSi/Tachi.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Dirak', 'Dirak', 'Pháp sư', '/image/tuong/PhapSu/Dirak.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Qi', 'Qi', 'Đấu sĩ', '/image/tuong/DauSi/Qi.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Erin', 'Erin', 'Xạ thủ', '/image/tuong/XaThu/Erin.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Ming', 'Ming', 'Trợ thủ', '/image/tuong/TroThu/Ming.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Bijan', 'Bijan', 'Đấu sĩ', '/image/tuong/DauSi/Bijan.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Bonnie', 'Bonnie', 'Pháp sư', '/image/tuong/PhapSu/Bonnie.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Teeri', 'Teeri', 'Xạ thủ', '/image/tuong/XaThu/Teeri.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Yue', 'Yue', 'Pháp sư', '/image/tuong/PhapSu/Yue.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Yan', 'Yan', 'Đấu sĩ', '/image/tuong/DauSi/Yan.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Aya', 'Aya', 'Trợ thủ', '/image/tuong/TroThu/Aya.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Aoi', 'Aoi', 'Sát thủ', '/image/tuong/SatThu/Aoi.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Iggy', 'Iggy', 'Pháp sư', '/image/tuong/PhapSu/Iggy.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Bright', 'Bright', 'Xạ thủ', '/image/tuong/XaThu/Bright.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Lorion', 'Lorion', 'Pháp sư', '/image/tuong/PhapSu/Lorion.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Dextra', 'Dextra', 'Đấu sĩ', '/image/tuong/DauSi/Dextra.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Sinestrea', 'Sinestrea', 'Sát thủ', '/image/tuong/SatThu/Sinestrea.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Thorne', 'Thorne', 'Xạ thủ', '/image/tuong/XaThu/Thorne.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Allain', 'Allain', 'Đấu sĩ', '/image/tuong/DauSi/Allain.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Zata', 'Zata', 'Pháp sư', '/image/tuong/PhapSu/Zata.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Rouie', 'Rouie', 'Trợ thủ', '/image/tuong/TroThu/Rouie.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Laville', 'Laville', 'Xạ thủ', '/image/tuong/XaThu/Laville.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Paine', 'Paine', 'Sát thủ', '/image/tuong/SatThu/Paine.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Ata', 'Ata', 'Đấu sĩ', '/image/tuong/DauSi/Ata.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Keera', 'Keera', 'Sát thủ', '/image/tuong/SatThu/Keera.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Ishar', 'Ishar', 'Pháp sư', '/image/tuong/PhapSu/Ishar.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Eland’orr', 'Elandorr', 'Xạ thủ', '/image/tuong/XaThu/Elandorr.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Krizzix', 'Krizzix', 'Trợ thủ', '/image/tuong/TroThu/Krizzix.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Volkath', 'Volkath', 'Đấu sĩ', '/image/tuong/DauSi/Volkath.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Celica', 'Celica', 'Xạ thủ', '/image/tuong/XaThu/Celica.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Zip', 'Zip', 'Trợ thủ', '/image/tuong/TroThu/Zip.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Enzo', 'Enzo', 'Sát thủ', '/image/tuong/SatThu/Enzo.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Yena', 'Yena', 'Đấu sĩ', '/image/tuong/DauSi/Yena.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Errol', 'Errol', 'Đấu sĩ', '/image/tuong/DauSi/Errol.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Capheny', 'Capheny', 'Xạ thủ', '/image/tuong/XaThu/Capheny.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Hayate', 'Hayate', 'Xạ thủ', '/image/tuong/XaThu/Hayate.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('D’Arcy', 'Darcy', 'Pháp sư', '/image/tuong/PhapSu/Darcy.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Veres', 'Veres', 'Đấu sĩ', '/image/tuong/DauSi/Veres.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Florentino', 'Florentino', 'Đấu sĩ', '/image/tuong/DauSi/Florentino.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Sephera', 'Sephera', 'Trợ thủ', '/image/tuong/TroThu/Sephera.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Quillen', 'Quillen', 'Sát thủ', '/image/tuong/SatThu/Quillen.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Wiro', 'Wiro', 'Đỡ đòn', '/image/tuong/DoDon/Wiro.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Richter', 'Richter', 'Đấu sĩ', '/image/tuong/DauSi/Richter.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Elsu', 'Elsu', 'Xạ thủ', '/image/tuong/XaThu/Elsu.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Y’bneth', 'Ybneth', 'Đỡ đòn', '/image/tuong/DoDon/Ybneth.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Amily', 'Amily', 'Đấu sĩ', '/image/tuong/DauSi/Amily.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Annette', 'Annette', 'Trợ thủ', '/image/tuong/TroThu/Annette.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Baldum', 'Baldum', 'Đỡ đòn', '/image/tuong/DoDon/Baldum.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Roxie', 'Roxie', 'Đấu sĩ', '/image/tuong/DauSi/Roxie.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Marja', 'Marja', 'Pháp sư', '/image/tuong/PhapSu/Marja.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Rourke', 'Rourke', 'Đấu sĩ', '/image/tuong/DauSi/Rourke.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Arum', 'Arum', 'Đỡ đòn', '/image/tuong/DoDon/Arum.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Wisp', 'Wisp', 'Xạ thủ', '/image/tuong/XaThu/Wisp.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('The Flash', 'TheFlash', 'Pháp sư', '/image/tuong/PhapSu/TheFlash.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Max', 'Max', 'Đỡ đòn', '/image/tuong/DoDon/Max.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Liliana', 'Liliana', 'Pháp sư', '/image/tuong/PhapSu/Liliana.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Tulen', 'Tulen', 'Pháp sư', '/image/tuong/PhapSu/Tulen.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Omen', 'Omen', 'Đấu sĩ', '/image/tuong/DauSi/Omen.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Lindis', 'Lindis', 'Xạ thủ', '/image/tuong/XaThu/Lindis.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('TeeMee', 'Teemee', 'Trợ thủ', '/image/tuong/TroThu/Teemee.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Moren', 'Moren', 'Xạ thủ', '/image/tuong/XaThu/Moren.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Kil’Groth', 'Kilgroth', 'Đấu sĩ', '/image/tuong/DauSi/Kilgroth.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Xeniel', 'Xeniel', 'Trợ thủ', '/image/tuong/TroThu/Xeniel.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Wonder Woman', 'WonderWoman', 'Đấu sĩ', '/image/tuong/DauSi/WonderWoman.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Superman', 'Superman', 'Đấu sĩ', '/image/tuong/DauSi/Superman.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Tel’Annas', 'Telannas', 'Xạ thủ', '/image/tuong/XaThu/Telannas.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Astrid', 'Astrid', 'Đấu sĩ', '/image/tuong/DauSi/Astrid.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Ryoma', 'Ryoma', 'Đấu sĩ', '/image/tuong/DauSi/Ryoma.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Stuart', 'Stuart', 'Xạ thủ', '/image/tuong/XaThu/Stuart.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Arduin', 'Arduin', 'Đấu sĩ', '/image/tuong/DauSi/Arduin.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Zill', 'Zill', 'Pháp sư', '/image/tuong/PhapSu/Zill.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Murad', 'Murad', 'Sát thủ', '/image/tuong/SatThu/Murad.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Ignis', 'Ignis', 'Pháp sư', '/image/tuong/PhapSu/Ignis.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Zuka', 'Zuka', 'Đấu sĩ', '/image/tuong/DauSi/Zuka.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Airi', 'Airi', 'Sát thủ', '/image/tuong/SatThu/Airi.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Kaine', 'Kaine', 'Sát thủ', '/image/tuong/SatThu/Kaine.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Lauriel', 'Lauriel', 'Pháp sư', '/image/tuong/PhapSu/Lauriel.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Raz', 'Raz', 'Pháp sư', '/image/tuong/PhapSu/Raz.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Skud', 'Skud', 'Đấu sĩ', '/image/tuong/DauSi/Skud.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Preyta', 'Preyta', 'Pháp sư', '/image/tuong/PhapSu/Preyta.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Ilumia', 'Ilumia', 'Pháp sư', '/image/tuong/PhapSu/Ilumia.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Slimz', 'Slimz', 'Xạ thủ', '/image/tuong/XaThu/Slimz.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Arthur', 'Arthur', 'Đấu sĩ', '/image/tuong/DauSi/Arthur.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Kriknak', 'Kriknak', 'Sát thủ', '/image/tuong/SatThu/Kriknak.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Ngộ Không', 'NgoKhong', 'Sát thủ', '/image/tuong/SatThu/NgoKhong.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Maloch', 'Maloch', 'Đấu sĩ', '/image/tuong/DauSi/Maloch.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Helen', 'Helen', 'Trợ thủ', '/image/tuong/TroThu/Helen.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Jinna', 'Jinna', 'Pháp sư', '/image/tuong/PhapSu/Jinna.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Cresht', 'Cresht', 'Đỡ đòn', '/image/tuong/DoDon/Cresht.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Natalya', 'Natalya', 'Pháp sư', '/image/tuong/PhapSu/Natalya.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Lumburr', 'Lumburr', 'Đỡ đòn', '/image/tuong/DoDon/Lumburr.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Fennik', 'Fennik', 'Xạ thủ', '/image/tuong/XaThu/Fennik.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Aleister', 'Aleister', 'Pháp sư', '/image/tuong/PhapSu/Aleister.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Grakk', 'Grakk', 'Đỡ đòn', '/image/tuong/DoDon/Grakk.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Nakroth', 'Nakroth', 'Sát thủ', '/image/tuong/SatThu/Nakroth.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Taara', 'Taara', 'Đỡ đòn', '/image/tuong/DoDon/Taara.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Toro', 'Toro', 'Đỡ đòn', '/image/tuong/DoDon/Toro.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Yorn', 'Yorn', 'Xạ thủ', '/image/tuong/XaThu/Yorn.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Gildur', 'Gildur', 'Pháp sư', '/image/tuong/PhapSu/Gildur.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Alice', 'Alice', 'Trợ thủ', '/image/tuong/TroThu/Alice.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Azzen’Ka', 'Azzenka', 'Pháp sư', '/image/tuong/PhapSu/Azzenka.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Ormarr', 'Ormarr', 'Đấu sĩ', '/image/tuong/DauSi/Ormarr.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Butterfly', 'Butterfly', 'Sát thủ', '/image/tuong/SatThu/Butterfly.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Violet', 'Violet', 'Xạ thủ', '/image/tuong/XaThu/Violet.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Chaugnar', 'Chaugnar', 'Trợ thủ', '/image/tuong/TroThu/Chaugnar.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Điêu Thuyền', 'DieuThuyen', 'Pháp sư', '/image/tuong/PhapSu/DieuThuyen.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Zephys', 'Zephys', 'Đấu sĩ', '/image/tuong/DauSi/Zephys.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Kahlii', 'Kahlii', 'Pháp sư', '/image/tuong/PhapSu/Kahlii.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Omega', 'Omega', 'Đỡ đòn', '/image/tuong/DoDon/Omega.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Triệu Vân', 'TrieuVan', 'Đấu sĩ', '/image/tuong/DauSi/TrieuVan.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Mganga', 'Mganga', 'Pháp sư', '/image/tuong/PhapSu/Mganga.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Krixi', 'Krixi', 'Pháp sư', '/image/tuong/PhapSu/Krixi.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Mina', 'Mina', 'Đỡ đòn', '/image/tuong/DoDon/Mina.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Lữ Bố', 'LuBo', 'Đấu sĩ', '/image/tuong/DauSi/LuBo.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Veera', 'Veera', 'Pháp sư', '/image/tuong/PhapSu/Veera.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Thane', 'Thane', 'Đỡ đòn', '/image/tuong/DoDon/Thane.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
INSERT INTO tuong (ten_tuong, slug, vai_tro, url_anh_dai_dien) VALUES ('Valhein', 'Valhein', 'Xạ thủ', '/image/tuong/XaThu/Valhein.jpg') ON CONFLICT (ten_tuong) DO UPDATE SET slug = EXCLUDED.slug, vai_tro = EXCLUDED.vai_tro, url_anh_dai_dien = EXCLUDED.url_anh_dai_dien;
