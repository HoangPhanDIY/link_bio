# Hướng Dẫn Cấu Hình Database Thật & Chạy Dự Án Local

Tài liệu này hướng dẫn bạn từng bước để tải dự án về máy, kết nối với cơ sở dữ liệu (Supabase) thật của riêng bạn, đồng bộ hóa thư viện hình ảnh tướng/trang bị/phù hiệu/phép bổ trợ và khởi chạy ứng dụng trực tiếp.

---

## Bước 1: Chuẩn bị Cơ sở dữ liệu Supabase thật
1. Truy cập vào [Supabase](https://supabase.com/) và đăng ký/đăng nhập tài khoản.
2. Tạo một dự án mới (New Project). Lưu lại thông tin:
   - **Project URL** (ví dụ: `https://xxxx.supabase.co`)
   - **Anon Key** / **Public API Key** (chuỗi ký tự dài bắt đầu bằng `eyJ...`)
3. Vào mục **SQL Editor** trong giao diện quản trị Supabase của bạn.
4. Mở tệp `supabase_schema.sql` có sẵn ở thư mục gốc của dự án này, copy toàn bộ nội dung SQL và paste vào bảng SQL Editor của Supabase rồi nhấn **Run** để khởi tạo cấu trúc bảng (Table structure) và tắt bảo mật RLS để sẵn sàng chạy thử nghiệm.

---

## Bước 2: Tải dự án về máy và cài đặt thư viện
1. Xuất dự án từ Google AI Studio bằng cách vào **Settings** -> **Export to ZIP** hoặc đẩy lên GitHub.
2. Giải nén thư mục dự án trên máy tính của bạn.
3. Mở Terminal (Command Prompt hoặc Git Bash) tại thư mục dự án.
4. Tiến hành cài đặt các thư viện cần thiết bằng lệnh:
   ```bash
   npm install
   ```

---

## Bước 3: Cấu hình biến môi trường kết nối Database của bạn
1. Tạo một tệp tên là `.env` ở thư mục gốc của dự án (bên cạnh tệp `.env.example`).
2. Copy các biến từ `.env.example` vào hoặc thêm trực tiếp hai dòng sau với thông tin cơ sở dữ liệu thật của bạn:
   ```env
   VITE_SUPABASE_URL=https://CUA_BAN_CUC_KỲ_CHINH_XAC.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJ_MA_ANON_KEY_THAT_CUA_BAN...
   ```
   *Lưu ý: Ứng dụng React chạy trên Vite sẽ tự động đọc cấu hình này qua mã nguồn `import.meta.env.VITE_SUPABASE_URL`.*

---

## Bước 4: Đồng bộ hóa toàn bộ ảnh Liên Quân vào DB của bạn
Để tránh việc nhập thủ công hàng trăm tướng, trang bị, phù hiệu và phép bổ trợ, chúng tôi đã xây dựng sẵn một script tự động quét thư mục ảnh `/public/image` và đồng bộ trực tiếp lên Database Supabase của bạn.

Mở Terminal và chạy lệnh sau:
```bash
npx tsx src/scripts/sync-images.ts
```

**Script này sẽ tự động:**
- Quét toàn bộ thư mục `/public/image/tuong/` và nạp danh sách tướng lên bảng `tuong`.
- Quét `/public/image/trang_bi/` và nạp toàn bộ trang bị (chia theo cấp 1-2-3 và các hệ Công, Phép, Thủ, Tốc, Rừng, Trợ thủ) lên bảng `trang_bi`.
- Quét các phép bổ trợ `/public/image/phu_tro/` và nạp lên bảng `phu_tro`.
- Quét tất cả phù hiệu `/public/image/phu_hieu/` và nạp lên bảng `phu_hieu`.
- Tự động Việt hóa tên hiển thị có dấu cực kỳ đẹp mắt và gán đường dẫn ảnh local chuẩn chỉnh.

---

## Bước 5: Chạy dự án trực tiếp (Local)
Sau khi đồng bộ hóa cơ sở dữ liệu thành công, bạn chạy lệnh sau để mở giao diện web local:
```bash
npm run dev
```
Mở trình duyệt truy cập vào đường dẫn hiển thị trên màn hình (thông thường là `http://localhost:3000` hoặc `http://localhost:5173`) để trải nghiệm ứng dụng với database thật, đầy đủ hình ảnh gốc cực kỳ mượt mà!

---

## Thông tin tài khoản Admin mặc định để quản lý Giáo án:
- **Email:** `admin@vividpersona.com`
- **Mật khẩu:** `1234567890hH@@`
*(Bạn có thể thay đổi thông tin này trong bảng `nguoi_dung` trên Supabase hoặc thông qua phần chỉnh sửa hồ sơ trên giao diện Admin).*
