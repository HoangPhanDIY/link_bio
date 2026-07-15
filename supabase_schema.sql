-- ====================================================================
-- SYSTEM SCHEMA & INITIAL DATA SETUP FOR VIVID PERSONA - LIÊN QUÂN MOBILE
-- Execute this script in your Supabase SQL Editor to initialize tables and allow public writes.
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table nguoi_dung (Profiles)
CREATE TABLE IF NOT EXISTS nguoi_dung (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_dang_nhap TEXT,
    email TEXT UNIQUE,
    mat_khau TEXT,
    vai_tro INTEGER DEFAULT 1,
    avatar_url TEXT,
    anh_bia_url TEXT,
    tieu_su TEXT,
    giao_dien_mode TEXT DEFAULT 'light',
    phong_chu TEXT DEFAULT 'Inter',
    mau_chu_dao TEXT DEFAULT '#4648d4',
    bank_name TEXT,
    bank_account TEXT,
    bank_owner TEXT,
    momo_number TEXT,
    momo_name TEXT,
    donate_note TEXT,
    bank_enabled BOOLEAN DEFAULT true,
    momo_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Table danh_muc (Categories)
CREATE TABLE IF NOT EXISTS danh_muc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_danh_muc TEXT,
    thu_tu_uu_tien INTEGER DEFAULT 0
);

-- 3. Table duong_dan (Links)
CREATE TABLE IF NOT EXISTS duong_dan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tieu_de TEXT,
    url_lienketing TEXT,
    url_icon TEXT,
    hien_thi BOOLEAN DEFAULT true,
    thu_tu_uu_tien INTEGER DEFAULT 0,
    danh_muc_id UUID REFERENCES danh_muc(id) ON DELETE SET NULL
);

-- 4. Table banner (Slideshow Banners)
CREATE TABLE IF NOT EXISTS banner (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tieu_de TEXT,
    url_hinh_anh TEXT,
    thu_tu_uu_tien INTEGER DEFAULT 0,
    kich_hoat BOOLEAN DEFAULT true
);

-- 5. Table tuong (Champions)
CREATE TABLE IF NOT EXISTS tuong (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_tuong TEXT,
    vai_tro TEXT,
    url_anh_dai_dien TEXT
);

-- 6. Table trang_bi (Items)
CREATE TABLE IF NOT EXISTS trang_bi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_trang_bi TEXT,
    cap INTEGER DEFAULT 3,
    loai TEXT,
    url_hinh_anh TEXT,
    mo_ta TEXT
);

-- 7. Table phu_tro (Spells)
CREATE TABLE IF NOT EXISTS phu_tro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_phu_tro TEXT,
    url_hinh_anh TEXT,
    mo_ta TEXT
);

-- 8. Table phu_hieu (Badges)
CREATE TABLE IF NOT EXISTS phu_hieu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_phu_hieu TEXT,
    url_hinh_anh TEXT,
    loai_nhanh TEXT
);

-- 9. Table giao_an_de_cu (Build Guides)
CREATE TABLE IF NOT EXISTS giao_an_de_cu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tuong_id UUID REFERENCES tuong(id) ON DELETE CASCADE,
    tieu_de_giao_an TEXT,
    phu_tro_id UUID REFERENCES phu_tro(id) ON DELETE SET NULL,
    ngoc_do TEXT,
    ngoc_tim TEXT,
    ngoc_xanh TEXT,
    nguoi_tao_id UUID REFERENCES nguoi_dung(id) ON DELETE SET NULL,
    kich_hoat BOOLEAN DEFAULT true,
    ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Table chi_tiet_trang_bi_giao_an (Build Guide Items Map)
CREATE TABLE IF NOT EXISTS chi_tiet_trang_bi_giao_an (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giao_an_id UUID REFERENCES giao_an_de_cu(id) ON DELETE CASCADE,
    trang_bi_id UUID REFERENCES trang_bi(id) ON DELETE CASCADE,
    o_so INTEGER
);

-- 11. Table chi_tiet_phu_hieu_giao_an (Build Guide Badges Map)
CREATE TABLE IF NOT EXISTS chi_tiet_phu_hieu_giao_an (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    giao_an_id UUID REFERENCES giao_an_de_cu(id) ON DELETE CASCADE,
    phu_hieu_id UUID REFERENCES phu_hieu(id) ON DELETE CASCADE,
    vi_tri_o TEXT
);

-- 12. Table nhat_ky_click (Analytics Click Logs)
CREATE TABLE IF NOT EXISTS nhat_ky_click (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    duong_dan_id UUID REFERENCES duong_dan(id) ON DELETE CASCADE,
    thiet_bi TEXT,
    thoi_gian TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 13. Table tin_nhan (Contact Messages)
CREATE TABLE IF NOT EXISTS tin_nhan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ho_ten TEXT,
    email TEXT,
    noi_dung TEXT,
    ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 14. Table ung_ho (Donations)
CREATE TABLE IF NOT EXISTS ung_ho (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ten_nguoi_ung_ho TEXT,
    so_tien INTEGER DEFAULT 0,
    noi_dung TEXT,
    noi_dung_ck TEXT,
    trang_thai INTEGER DEFAULT 0, -- 0: Chua chuyen khoan, 1: Da chuyen khoan
    ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 15. Table bai_viet (Posts / Statuses)
CREATE TABLE IF NOT EXISTS bai_viet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    noi_dung TEXT NOT NULL,
    url_hinh_anh TEXT,
    ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- DISABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
-- (Allows instant add, edit, and delete operations from the preview app)
-- ====================================================================
ALTER TABLE nguoi_dung DISABLE ROW LEVEL SECURITY;
ALTER TABLE danh_muc DISABLE ROW LEVEL SECURITY;
ALTER TABLE duong_dan DISABLE ROW LEVEL SECURITY;
ALTER TABLE banner DISABLE ROW LEVEL SECURITY;
ALTER TABLE tuong DISABLE ROW LEVEL SECURITY;
ALTER TABLE trang_bi DISABLE ROW LEVEL SECURITY;
ALTER TABLE phu_tro DISABLE ROW LEVEL SECURITY;
ALTER TABLE phu_hieu DISABLE ROW LEVEL SECURITY;
ALTER TABLE giao_an_de_cu DISABLE ROW LEVEL SECURITY;
ALTER TABLE chi_tiet_trang_bi_giao_an DISABLE ROW LEVEL SECURITY;
ALTER TABLE chi_tiet_phu_hieu_giao_an DISABLE ROW LEVEL SECURITY;
ALTER TABLE nhat_ky_click DISABLE ROW LEVEL SECURITY;
ALTER TABLE tin_nhan DISABLE ROW LEVEL SECURITY;
ALTER TABLE ung_ho DISABLE ROW LEVEL SECURITY;
ALTER TABLE bai_viet DISABLE ROW LEVEL SECURITY;

-- ====================================================================
-- SEED DATA (IF EMPTY)
-- ====================================================================

-- 1. Seed nguoi_dung
INSERT INTO nguoi_dung (ten_dang_nhap, email, mat_khau, vai_tro, avatar_url, anh_bia_url, tieu_su)
VALUES (
    'admin',
    'admin@vividpersona.com',
    '1234567890hH@@',
    1,
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
    'Chào mọi người, đây là trang tổng hợp giáo án Liên Quân Mobile cực đỉnh của mình!'
) ON CONFLICT DO NOTHING;

-- 2. Seed Champions
INSERT INTO tuong (ten_tuong, vai_tro, url_anh_dai_dien) VALUES
('Florentino', 'Đấu sĩ', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=300'),
('Valhein', 'Xạ thủ', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=300'),
('Raz', 'Pháp sư / Sát thủ', 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&q=80&w=300'),
('Nakroth', 'Sát thủ', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=300'),
('Liliana', 'Pháp sư', 'https://images.unsplash.com/photo-1553481187-be93c21490a9?auto=format&fit=crop&q=80&w=300')
ON CONFLICT DO NOTHING;

-- 3. Seed Items
INSERT INTO trang_bi (ten_trang_bi, cap, loai, url_hinh_anh, mo_ta) VALUES
('Thương Longinus', 3, 'CONG', 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&q=80&w=150', '+80 Công vật lý, +15% Giảm hồi chiêu, +150 Giáp'),
('Kiếm Muramasa', 3, 'CONG', 'https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&q=80&w=150', '+75 Công vật lý, +10% Giảm hồi chiêu, +40% Xuyên giáp'),
('Phức Hợp Kiếm', 3, 'CONG', 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&q=80&w=150', '+70 Công vật lý, +15% Tốc đánh, +10% Hút máu, +10% Giảm hồi chiêu'),
('Nanh Fenrir', 3, 'CONG', 'https://images.unsplash.com/photo-1534067783941-51c9c23eccfd?auto=format&fit=crop&q=80&w=150', '+200 Công vật lý. Tăng 30% sát thương khi máu mục tiêu dưới 50%'),
('Vương Miện Hecate', 3, 'PHEP', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=150', '+200 Công phép, +35% Tăng công phép thuộc tính'),
('Sách Thánh', 3, 'PHEP', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=150', '+400 Công phép, +1400 Máu tối đa'),
('Giáp Hộ Mệnh', 3, 'THU', 'https://images.unsplash.com/photo-1584441401012-4275924a4bd6?auto=format&fit=crop&q=80&w=150', '+120 Giáp. Hồi sinh sau 2 giây tử trận với 2000 Máu (tối đa 2 lần)'),
('Giày Kiên Cường', 3, 'TOC_CHAY', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=150', '+110 Giáp phép, +60 Tốc chạy, +35% Kháng hiệu ứng')
ON CONFLICT DO NOTHING;

-- 4. Seed Spells
INSERT INTO phu_tro (ten_phu_tro, url_hinh_anh, mo_ta) VALUES
('Tốc biến', 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&q=80&w=100', 'Dịch chuyển một khoảng ngắn theo hướng chỉ định (Hồi chiêu 120s)'),
('Bộc phá', 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=100', 'Gây sát thương chuẩn tương đương 16% máu đã mất của mục tiêu xung quanh (Hồi chiêu 90s)'),
('Thanh tẩy', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=100', 'Hóa giải mọi hiệu ứng khống chế và miễn khống trong 1.5 giây tiếp theo (Hồi chiêu 120s)')
ON CONFLICT DO NOTHING;

-- 5. Seed Badges
INSERT INTO phu_hieu (ten_phu_hieu, loai_nhanh, url_hinh_anh) VALUES
('Tháp quang minh: Thánh Thuẫn', 'NHANH_CHINH_3', 'https://images.unsplash.com/photo-1519074069444-1ba4e6663104?auto=format&fit=crop&q=80&w=100'),
('Vực hỗn mang: Ma Tính', 'NHANH_CHINH_3', 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=100'),
('Thành khởi nguyên: Luyện Kim', 'NHANH_CHINH_3', 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?auto=format&fit=crop&q=80&w=100'),
('Ám khí', 'NHANH_PHU_1', 'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?auto=format&fit=crop&q=80&w=100')
ON CONFLICT DO NOTHING;
