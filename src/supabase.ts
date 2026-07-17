import { createClient } from "@supabase/supabase-js";

// User's Supabase credentials
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL;
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Types matching your database tables (Schema V4)
export interface DBUser {
  id: string;
  ten_dang_nhap: string;
  ten_hien_thi: string;
  avatar_url: string | null;
  anh_bia_url: string | null;
  tieu_su: string | null;
  vai_tro: number; // 0=user, 1=admin
  created_at?: string;
  updated_at?: string;

  // Settings fallbacks for frontend compatibility
  giao_dien_mode?: string;
  phong_chu?: string | null;
  mau_chu_dao?: string | null;
  background_color?: string | null;
  link_background_color?: string | null;
  link_text_color?: string | null;
  loading_web_gif?: string | null;
  loading_data_gif?: string | null;
  stream_alert_gif?: string | null;
  stream_alert_sound?: string | null;
  stream_alert_template?: string | null;
  stream_alert_tts?: boolean | null;
  stream_alert_duration?: number | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_owner?: string | null;
  momo_number?: string | null;
  momo_name?: string | null;
  donate_note?: string | null;
  bank_enabled?: boolean | null;
  momo_enabled?: boolean | null;
  bao_tri?: boolean | null;
}

export interface DBCaiDatGiaoDien {
  id: number;
  che_do: number; // 0=light, 1=dark
  phong_chu: string | null;
  mau_chu_dao: string | null;
  mau_nen: string | null;
  mau_nen_lien_ket: string | null;
  mau_chu_lien_ket: string | null;
  loading_web_gif: string | null;
  loading_data_gif: string | null;
  bao_tri: boolean;
  updated_at?: string;
}

export interface DBCaiDatDonate {
  id: number;
  bank_name: string | null;
  bank_account: string | null;
  bank_owner: string | null;
  bank_enabled: boolean;
  momo_number: string | null;
  momo_name: string | null;
  momo_enabled: boolean;
  donate_note: string | null;
  updated_at?: string;
}

export interface DBCaiDatStreamAlert {
  id: number;
  alert_gif: string | null;
  alert_sound: string | null;
  alert_template: string | null;
  alert_tts: boolean;
  alert_duration: number;
  updated_at?: string;
}

export interface DBCategory {
  id: string;
  loai: number; // 0=duong_dan, 1=bai_viet, 2=giao_an
  ten_danh_muc: string;
  slug: string;
  thu_tu_uu_tien: number;
}

export interface DBLink {
  id: string;
  tieu_de: string;
  url_lien_ket: string; // url_lien_ket replaces url_lienketing
  url_lienketing?: string; // fallback in case some code checks for it
  url_icon: string | null;
  danh_muc_id: string | null;
  hien_thi: boolean;
  thu_tu_uu_tien: number;
  created_at?: string;
}

export interface DBBanner {
  id: string;
  tieu_de: string | null;
  url_hinh_anh: string;
  url_lien_ket: string | null; // url_lien_ket replaces url_dieu_huong
  url_dieu_huong?: string | null; // fallback
  thu_tu_uu_tien: number;
  kich_hoat: boolean;
  created_at?: string;
}

export interface DBChampion {
  id: string;
  ten_tuong: string;
  slug: string;
  vai_tro: string | null;
  url_anh_dai_dien: string | null;
}

export interface DBItem {
  id: string;
  ten_trang_bi: string;
  cap: number;
  loai: number; // 0=CONG, 1=PHEP, 2=THU, 3=TOC_CHAY, 4=PHU_KIEN
  url_hinh_anh: string | null;
  mo_ta: string | null;
}

export interface DBSpell {
  id: string;
  ten_phu_tro: string;
  url_hinh_anh: string | null;
  mo_ta: string | null;
}

export interface DBBadge {
  id: string;
  ten_phu_hieu: string;
  loai_nhanh: number; // 0=nhanh_chinh_1, 1=nhanh_chinh_2, 2=nhanh_chinh_3, 3=nhanh_phu_1, 4=nhanh_phu_2
  url_hinh_anh: string | null;
  vi_tri_o?: string; // transient UI property
}

export interface DBRune {
  id: string;
  ten_ngoc: string;
  mau: number; // 0=do, 1=tim, 2=xanh
  mo_ta: string | null;
  url_hinh_anh: string | null;
  vi_tri_o?: number; // transient UI property
}

export interface DBBuildGuide {
  id: string;
  tuong_id: string;
  tieu_de_giao_an: string;
  mo_ta: string | null;
  url_anh_bia: string | null;
  danh_muc_id: string | null;
  phu_tro_id: string | null;
  nguoi_tao_id: string | null;
  trang_thai: number; // 0=nháp, 1=đã đăng
  luot_xem: number;
  created_at?: string;
  updated_at?: string;

  // Joins
  tuong?: DBChampion;
  phu_tro?: DBSpell;
  trang_bi_list?: DBItem[];
  phu_hieu_list?: DBBadge[];
  ngoc_list?: DBRune[];
  creator?: DBUser;

  // Frontend compatibility fields
  ngoc_do?: string;
  ngoc_tim?: string;
  ngoc_xanh?: string;
  kich_hoat?: boolean;
  ngay_tao?: string;
}

export interface DBBuildItemDetail {
  id: string;
  giao_an_id: string;
  trang_bi_id: string;
  o_so: number;
}

export interface DBBuildBadgeDetail {
  id: string;
  giao_an_id: string;
  phu_hieu_id: string;
  vi_tri_o: string;
}

export interface DBBuildRuneDetail {
  id: string;
  giao_an_id: string;
  ngoc_id: string;
  vi_tri_o: number;
}

export interface DBPost {
  id: string;
  tieu_de: string;
  slug: string;
  tom_tat: string | null;
  noi_dung: string;
  url_hinh_anh: string | null;
  danh_muc_id: string | null;
  tac_gia_id: string | null;
  lien_ket_id: string | null;
  trang_thai: number; // 0=nháp, 1=đã đăng
  luot_xem: number;
  ngay_dang: string | null;
  created_at?: string;
  updated_at?: string;
  creator?: DBUser;
}

export interface DBTag {
  id: string;
  ten_the: string;
  slug: string;
}

export interface DBDonation {
  id: string;
  ten_nguoi_ung_ho: string;
  so_tien: number;
  noi_dung: string | null;
  noi_dung_ck: string | null;
  phuong_thuc: number; // 0=bank, 1=momo
  trang_thai: number; // 0=chờ xử lý, 1=đã xác nhận, 2=đã hủy
  xac_nhan_boi: string | null;
  created_at?: string;
}

export interface DBMessage {
  id: string;
  ho_ten: string;
  email: string | null;
  noi_dung: string;
  trang_thai: number; // 0=mới, 1=đã đọc, 2=đã trả lời
  created_at?: string;
}
