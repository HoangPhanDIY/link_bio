import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase credentials (using the exact credentials from supabase.ts)
const SUPABASE_URL = 'https://jvmpyppvuxuzysjivxpo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5WETPCRZChGZtbWSmk_HdQ_m33bxfE_';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const NAME_MAP: Record<string, string> = {
  // Champions
  "LuBo": "Lữ Bố",
  "TrieuVan": "Triệu Vân",
  "Kilgroth": "Kil'Groth",
  "WonderWoman": "Wonder Woman",
  "Superman": "Superman",
  "Yorn": "Yorn",
  "Volkath": "Volkath",
  
  // Spells
  "boc_pha": "Bộc Phá",
  "cap_cuu": "Cấp Cứu",
  "gam_thet": "Gầm Thét",
  "la_chan_sinh_menh": "Lá Chắn Sinh Mệnh",
  "ngat_ngu": "Ngất Ngư",
  "suy_nhuoc": "Suy Nhược",
  "thanh_tay": "Thanh Tẩy",
  "toc_bien": "Tốc Biến",
  "toc_hanh": "Tốc Hành",
  "trung_tri": "Trừng Trị",
  "vien_binh_lien_hiep": "Viện Binh Liên Hiệp",
  "tu_bao_bon": "Tự Bạo Bồn",
  
  // Badges / Runes
  "AoThu": "Áo Thể",
  "AuongCong": "Cường Công",
  "CoThu": "Cố Thủ",
  "CuongCong": "Cường Công",
  "DauKhi": "Đấu Khí",
  "DuAnh": "Dư Ảnh",
  "HapHuyet": "Hấp Huyết",
  "MaChu": "Ma Chú",
  "MaHoa": "Ma Hỏa",
  "MaTinh": "Ma Tính",
  "AanhGac": "Anh Gác",
  "CanhGac": "Canh Gác",
  "AmKich": "Ám Kích",
  "BomMau": "Bơm Máu",
  "DuHiep": "Du Hiệp",
  "MocGiap": "Mộc Giáp",
  "NhayBen": "Nhạy Bén",
  "SinhTon": "Sinh Tồn",
  "TroiBuoc": "Trói Buộc",
  "ChuyenSinh": "Chuyển Sinh",
  "LuyenKim": "Luyện Kim",
  "MatNgu": "Mật Ngữ",
  "QuaCauBangSuong": "Quả Cầu Băng Sương",
  "SieuHoiMau": "Siêu Hồi Máu",
  "ThoSan": "Thợ Săn",
  "UyAp": "Uy Áp",
  "BiQuyet": "Bí Quyết",
  "SungMan": "Sung Mãn",
  "ThanQuang": "Thần Quang",
  "ThanhChau": "Thành Châu",
  "ThanhThuan": "Thánh Thuẫn",
  "TinhAinh": "Tinh Anh",
  "TinhLinh": "Tinh Linh",
  "TuongPhan": "Tương Phản",
  "XuyenTam": "Xuyên Tâm"
};

function formatName(rawFilename: string): string {
  const nameWithoutExt = rawFilename.substring(0, rawFilename.lastIndexOf('.')) || rawFilename;
  if (NAME_MAP[nameWithoutExt]) {
    return NAME_MAP[nameWithoutExt];
  }
  
  // Parse PascalCase or snake_case
  let withSpaces = nameWithoutExt
    .replace(/([A-Z])/g, ' $1') // insert space before capital letters
    .replace(/[_-]+/g, ' ')     // replace underscores/hyphens with space
    .trim();
    
  // Capitalize each word
  return withSpaces
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Recursive helper to scan directory
function getFilesRecursive(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursive(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

async function syncAll() {
  console.log('--- STARTING DATABASE IMAGE SYNCHRONIZATION ---');
  const baseDir = path.resolve('./public/image');
  if (!fs.existsSync(baseDir)) {
    console.error(`Directory not found: ${baseDir}`);
    process.exit(1);
  }

  // ==========================================
  // 1. SYNCHRONIZE CHAMPIONS (tuong)
  // ==========================================
  console.log('\n[1/4] Syncing Champions...');
  const championDir = path.join(baseDir, 'tuong');
  const roleMap: Record<string, string> = {
    'DauSi': 'Đấu sĩ',
    'DoDon': 'Đỡ đòn',
    'PhapSu': 'Pháp sư',
    'SatThu': 'Sát thủ',
    'TroThu': 'Trợ thủ',
    'XaThu': 'Xạ thủ'
  };

  const existingChampsRes = await supabase.from('tuong').select('*');
  const existingChamps = existingChampsRes.data || [];
  console.log(`Found ${existingChamps.length} existing champions in database.`);

  const champFiles = getFilesRecursive(championDir);
  console.log(`Found ${champFiles.length} local champion image files.`);

  for (const file of champFiles) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.jpg' && ext !== '.png' && ext !== '.jpeg') continue;

    const filename = path.basename(file);
    const relativePath = path.relative(path.resolve('./public'), file);
    const dbUrl = '/' + relativePath.replace(/\\/g, '/');

    // Extract category (folder name right before the file)
    const categoryFolder = path.basename(path.dirname(file));
    const role = roleMap[categoryFolder] || 'Chưa rõ';
    const name = formatName(filename);

    const existing = existingChamps.find(c => c.ten_tuong.toLowerCase() === name.toLowerCase());

    if (existing) {
      console.log(`- Updating champion: ${name} -> ${dbUrl}`);
      await supabase.from('tuong').update({
        url_anh_dai_dien: dbUrl,
        vai_tro: role
      }).eq('id', existing.id);
    } else {
      console.log(`- Inserting new champion: ${name} (${role}) -> ${dbUrl}`);
      await supabase.from('tuong').insert({
        ten_tuong: name,
        vai_tro: role,
        url_anh_dai_dien: dbUrl
      });
    }
  }

  // ==========================================
  // 2. SYNCHRONIZE ITEMS (trang_bi)
  // ==========================================
  console.log('\n[2/4] Syncing Items...');
  const itemDir = path.join(baseDir, 'trang_bi');
  const typeMap: Record<string, string> = {
    'cong': 'CONG',
    'di_rung': 'RUNG',
    'phep': 'PHEP',
    'thu': 'THU',
    'toc_do': 'TOC_CHAY',
    'tro_thu': 'TRO_THU'
  };

  const existingItemsRes = await supabase.from('trang_bi').select('*');
  const existingItems = existingItemsRes.data || [];
  console.log(`Found ${existingItems.length} existing items in database.`);

  const itemFiles = getFilesRecursive(itemDir);
  console.log(`Found ${itemFiles.length} local item image files.`);

  for (const file of itemFiles) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.jpg' && ext !== '.png' && ext !== '.jpeg') continue;

    const filename = path.basename(file);
    const relativePath = path.relative(path.resolve('./public'), file);
    const dbUrl = '/' + relativePath.replace(/\\/g, '/');

    // Parse Cap/Tier from folder structure (e.g. .../cap_3/...)
    let cap = 3;
    const pathParts = file.split(path.sep);
    const capPart = pathParts.find(p => p.startsWith('cap_'));
    if (capPart) {
      cap = parseInt(capPart.replace('cap_', '')) || 3;
    }

    // Parse category from pathParts
    const itemTypeFolder = pathParts.find(p => typeMap[p.toLowerCase()] !== undefined);
    const loai = itemTypeFolder ? typeMap[itemTypeFolder.toLowerCase()] : 'CONG';
    const name = formatName(filename);

    const existing = existingItems.find(i => i.ten_trang_bi.toLowerCase() === name.toLowerCase());

    const defaultDesc = `Trang bị ${loai === 'CONG' ? 'Công vật lý' : loai === 'PHEP' ? 'Pháp thuật' : loai === 'THU' ? 'Phòng thủ' : loai === 'TOC_CHAY' ? 'Tốc chạy' : loai === 'RUNG' ? 'Đi rừng' : 'Trợ thủ'} cấp ${cap}.`;

    if (existing) {
      console.log(`- Updating item: ${name} -> ${dbUrl}`);
      await supabase.from('trang_bi').update({
        url_hinh_anh: dbUrl,
        cap: cap,
        loai: loai
      }).eq('id', existing.id);
    } else {
      console.log(`- Inserting new item: ${name} (Cap ${cap}, ${loai}) -> ${dbUrl}`);
      await supabase.from('trang_bi').insert({
        ten_trang_bi: name,
        cap: cap,
        loai: loai,
        url_hinh_anh: dbUrl,
        mo_ta: defaultDesc
      });
    }
  }

  // ==========================================
  // 3. SYNCHRONIZE SPELLS (phu_tro)
  // ==========================================
  console.log('\n[3/4] Syncing Spells...');
  const spellDir = path.join(baseDir, 'phu_tro');

  const existingSpellsRes = await supabase.from('phu_tro').select('*');
  const existingSpells = existingSpellsRes.data || [];
  console.log(`Found ${existingSpells.length} existing spells in database.`);

  const spellFiles = getFilesRecursive(spellDir);
  console.log(`Found ${spellFiles.length} local spell image files.`);

  for (const file of spellFiles) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.jpg' && ext !== '.png' && ext !== '.jpeg') continue;

    const filename = path.basename(file);
    if (filename.toLowerCase() === 'unamed.png') continue; // Skip placeholder

    const relativePath = path.relative(path.resolve('./public'), file);
    const dbUrl = '/' + relativePath.replace(/\\/g, '/');
    const name = formatName(filename);

    const existing = existingSpells.find(s => s.ten_phu_tro.toLowerCase() === name.toLowerCase());

    if (existing) {
      console.log(`- Updating spell: ${name} -> ${dbUrl}`);
      await supabase.from('phu_tro').update({
        url_hinh_anh: dbUrl
      }).eq('id', existing.id);
    } else {
      console.log(`- Inserting new spell: ${name} -> ${dbUrl}`);
      await supabase.from('phu_tro').insert({
        ten_phu_tro: name,
        url_hinh_anh: dbUrl,
        mo_ta: `Phép bổ trợ khuyên dùng.`
      });
    }
  }

  // ==========================================
  // 4. SYNCHRONIZE BADGES (phu_hieu)
  // ==========================================
  console.log('\n[4/4] Syncing Badges...');
  const badgeDir = path.join(baseDir, 'phu_hieu');
  const badgeCategoryMap: Record<string, string> = {
    'rung_nguyen_sinh': 'Rừng nguyên sinh',
    'thanh_khoi_nguyen': 'Thành khởi nguyên',
    'thap_quang_minh': 'Tháp quang minh',
    'vuc_hon_mang': 'Vực hỗn mang'
  };

  const existingBadgesRes = await supabase.from('phu_hieu').select('*');
  const existingBadges = existingBadgesRes.data || [];
  console.log(`Found ${existingBadges.length} existing badges in database.`);

  const badgeFiles = getFilesRecursive(badgeDir);
  console.log(`Found ${badgeFiles.length} local badge image files.`);

  for (const file of badgeFiles) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.jpg' && ext !== '.png' && ext !== '.jpeg') continue;

    const filename = path.basename(file);
    if (filename.startsWith('background_')) continue; // Skip backgrounds

    const relativePath = path.relative(path.resolve('./public'), file);
    const dbUrl = '/' + relativePath.replace(/\\/g, '/');

    // Parse branch from folder name
    const folderName = path.basename(path.dirname(file));
    const branchName = badgeCategoryMap[folderName] || 'Chưa rõ';
    const name = branchName + ': ' + formatName(filename);

    const existing = existingBadges.find(b => b.ten_phu_hieu.toLowerCase() === name.toLowerCase());

    if (existing) {
      console.log(`- Updating badge: ${name} -> ${dbUrl}`);
      await supabase.from('phu_hieu').update({
        url_hinh_anh: dbUrl,
        loai_nhanh: 'NHANH_CHINH_3' // default branch
      }).eq('id', existing.id);
    } else {
      console.log(`- Inserting new badge: ${name} -> ${dbUrl}`);
      await supabase.from('phu_hieu').insert({
        ten_phu_hieu: name,
        url_hinh_anh: dbUrl,
        loai_nhanh: 'NHANH_CHINH_3'
      });
    }
  }

  console.log('\n--- DATABASE IMAGE SYNCHRONIZATION COMPLETED SUCCESSFULLY ---');
}

syncAll().catch((err) => {
  console.error('Error during synchronization:', err);
  process.exit(1);
});
