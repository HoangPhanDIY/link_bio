import { createClient } from '@supabase/supabase-js';

// User's Supabase credentials
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://jvmpyppvuxuzysjivxpo.supabase.co';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_5WETPCRZChGZtbWSmk_HdQ_m33bxfE_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Types matching your database tables
export interface DBUser {
  id: string;
  ten_dang_nhap: string;
  email: string;
  mat_khau?: string | null;
  vai_tro: number;
  avatar_url: string | null;
  anh_bia_url: string | null;
  tieu_su: string | null;
  giao_dien_mode?: string | null;
  phong_chu?: string | null;
  mau_chu_dao?: string | null;
  ngay_tao?: string;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_owner?: string | null;
  momo_number?: string | null;
  momo_name?: string | null;
  donate_note?: string | null;
  bank_enabled?: boolean | null;
  momo_enabled?: boolean | null;
  background_color?: string | null;
  link_background_color?: string | null;
  link_text_color?: string | null;
}

export interface DBCategory {
  id: string;
  ten_danh_muc: string;
  thu_tu_uu_tien: number;
  hien_thi: boolean;
  ngay_tao?: string;
}

export interface DBLink {
  id: string;
  danh_muc_id: string | null;
  tieu_de: string;
  url_lienketing: string;
  url_icon: string | null;
  thu_tu_uu_tien: number;
  hien_thi: boolean;
  ngay_tao?: string;
}

export interface DBBanner {
  id: string;
  tieu_de: string | null;
  url_hinh_anh: string;
  url_dieu_huong: string | null;
  thu_tu_uu_tien: number;
  kich_hoat: boolean;
  ngay_tao?: string;
}

export interface DBChampion {
  id: string;
  ten_tuong: string;
  url_anh_dai_dien: string | null;
  vai_tro: string | null;
}

export interface DBItem {
  id: string;
  ten_trang_bi: string;
  url_hinh_anh: string;
  mo_ta: string | null;
  cap: number;
  loai: 'CONG' | 'PHEP' | 'THU' | 'TOC_CHAY' | 'TRO_THU' | 'RUNG';
}

export interface DBSpell {
  id: string;
  ten_phu_trro: string; // Wait! The table is "ten_phu_tro" but let's check spelling in SQL: 'ten_phu_tro'
  ten_phu_tro: string;
  url_hinh_anh: string;
  mo_ta: string | null;
}

export interface DBBadge {
  id: string;
  ten_phu_hieu: string;
  url_hinh_anh: string;
  loai_nhanh: string | null;
}

export interface DBBuildGuide {
  id: string;
  tuong_id: string;
  tieu_de_giao_an: string;
  phu_tro_id: string | null;
  ngoc_do: string | null;
  ngoc_tim: string | null;
  ngoc_xanh: string | null;
  nguoi_tao_id: string | null;
  kich_hoat: boolean;
  ngay_tao?: string;
  
  // Joined fields
  tuong?: DBChampion;
  phu_tro?: DBSpell;
  trang_bi_list?: DBItem[];
  phu_hieu_list?: DBBadge[];
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

export interface DBMessage {
  id: string;
  ho_ten: string | null;
  email: string | null;
  noi_dung: string | null;
  ngay_tao?: string;
}

export interface DBDonation {
  id: string;
  ten_nguoi_ung_ho: string | null;
  so_tien: number;
  noi_dung: string | null;
  noi_dung_ck: string | null;
  trang_thai: number; // 0: Pending, 1: Completed
  ngay_tao?: string;
}
