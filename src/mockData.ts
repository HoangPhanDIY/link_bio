import { BioLink, AppearanceSettings, ActivityLog } from './types';

export const BANNER_OPTIONS = [
  {
    id: 'banner-1',
    name: 'Thành Khởi Nguyên',
    url: '/image/phu_hieu/thanh_khoi_nguyen/background_ThanhKhoiNguyen_1.jpg',
    description: 'Bản đồ Thành Khởi Nguyên với ánh sáng xanh kì ảo'
  },
  {
    id: 'banner-2',
    name: 'Tháp Quang Minh',
    url: '/image/phu_hieu/thap_quang_minh/background_ThapQuangMinh_1.jpg',
    description: 'Đỉnh Tháp Quang Minh tráng lệ rực rỡ'
  },
  {
    id: 'banner-3',
    name: 'Vực Hỗn Mang',
    url: '/image/phu_hieu/vuc_hon_mang/background_VucHonMang_1.jpg',
    description: 'Vực Hỗn Mang u tối đầy huyền bí'
  },
  {
    id: 'banner-4',
    name: 'Cấm Chọn Liên Quân',
    url: '/image/pick/ban-pick.png',
    description: 'Giao diện cấm chọn giải đấu Liên Quân Mobile chuyên nghiệp'
  }
];

export const INITIAL_LINKS: BioLink[] = [
  {
    id: 'link-1',
    title: 'Facebook cá nhân',
    url: 'facebook.com/alexrivera.design',
    icon: 'Facebook',
    enabled: true,
    clicks: 45201,
    conversions: 3.8,
    status: 'Active'
  },
  {
    id: 'link-2',
    title: 'Instagram cá nhân',
    url: 'instagram.com/rivera_shots',
    icon: 'Camera',
    enabled: true,
    clicks: 32940,
    conversions: 2.4,
    status: 'Active'
  },
  {
    id: 'link-3',
    title: 'Kênh TikTok',
    url: 'tiktok.com/@alexrivera',
    icon: 'Music',
    enabled: true,
    clicks: 18500,
    conversions: 1.1,
    status: 'Active'
  },
  {
    id: 'link-4',
    title: 'Kênh YouTube',
    url: 'youtube.com/c/alexriveradesign',
    icon: 'PlayCircle',
    enabled: true,
    clicks: 95400,
    conversions: 4.2,
    status: 'Active'
  },
  {
    id: 'link-5',
    title: 'Zalo cá nhân',
    url: 'zalo.me/alexrivera',
    icon: 'MessageSquare',
    enabled: true,
    clicks: 31200,
    conversions: 2.9,
    status: 'Active'
  }
];

export const INITIAL_APPEARANCE: AppearanceSettings = {
  mode: 'light',
  fontFamily: 'Plus Jakarta Sans',
  accentColor: '#4648d4', // Indigo blue
  bannerUrl: BANNER_OPTIONS[0].url,
  avatarUrl: '/image/tuong/DauSi/Florentino.jpg',
  name: 'Alex Rivera',
  bio: 'Nhà hoạch định chiến lược sáng tạo & Nhà sáng tạo nội dung số. Thiết kế tương lai của nhận diện thương hiệu.',
  newsletterEnabled: false,
  featuredBannerEnabled: true,
  selectedBanners: [BANNER_OPTIONS[0].url, BANNER_OPTIONS[1].url, BANNER_OPTIONS[2].url],
  bankName: 'MB Bank',
  bankAccount: '0987654321',
  bankOwner: 'PHAN HOANG ANH',
  momoNumber: '0987654321',
  momoName: 'Phan Hoàng Anh',
  donateNote: 'Mọi sự ủng hộ của các bạn đều là động lực to lớn giúp mình tiếp tục ra mắt những giáo án Liên Quân chất lượng nhất!',
  bankEnabled: true,
  momoEnabled: true,
  backgroundColor: '',
  linkBackgroundColor: '',
  linkTextColor: '',
  loadingWebGif: '/giphy.webp',
  loadingDataGif: '/giphy.webp',
  streamAlertGif: '/giphy.webp',
  streamAlertSound: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav',
  streamAlertTemplate: '{name} đã ủng hộ bạn {amount}Đ',
  streamAlertTts: true,
  streamAlertDuration: 8
};

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'act-1',
    type: 'create',
    message: 'Đã tạo liên kết mới: ',
    boldText: '"Trang đích khuyến mãi mùa đông"',
    time: '2 phút trước'
  },
  {
    id: 'act-2',
    type: 'milestone',
    message: 'Đạt cột mốc CTR trên ',
    boldText: 'Tiểu sử Instagram',
    time: '1 giờ trước'
  },
  {
    id: 'act-3',
    type: 'spike',
    message: 'Phát hiện lượng truy cập tăng vọt từ ',
    boldText: 'Nguồn giới thiệu: Zalo',
    time: '4 giờ trước'
  },
  {
    id: 'act-4',
    type: 'cleanup',
    message: 'Dọn dẹp lưu trữ: Đã xóa 12 liên kết không hoạt động',
    time: 'Hôm qua'
  }
];

// 30 days of clicks for Recharts chart
export const CLICKS_CHART_DATA = [
  { date: '01 Th10', clicks: 12000 },
  { date: '02 Th10', clicks: 14000 },
  { date: '03 Th10', clicks: 13000 },
  { date: '04 Th10', clicks: 15500 },
  { date: '05 Th10', clicks: 18000 },
  { date: '06 Th10', clicks: 21000 },
  { date: '07 Th10', clicks: 19500 },
  { date: '08 Th10', clicks: 17000 },
  { date: '09 Th10', clicks: 18500 },
  { date: '10 Th10', clicks: 22000 },
  { date: '11 Th10', clicks: 25000 },
  { date: '12 Th10', clicks: 24000 },
  { date: '13 Th10', clicks: 28000 },
  { date: '14 Th10', clicks: 31000 },
  { date: '15 Th10', clicks: 35000 },
  { date: '16 Th10', clicks: 38000 },
  { date: '17 Th10', clicks: 42102 },
  { date: '18 Th10', clicks: 40000 },
  { date: '19 Th10', clicks: 36000 },
  { date: '20 Th10', clicks: 32000 },
  { date: '21 Th10', clicks: 28000 },
  { date: '22 Th10', clicks: 25000 },
  { date: '23 Th10', clicks: 21000 },
  { date: '24 Th10', clicks: 18000 },
  { date: '25 Th10', clicks: 17000 },
  { date: '26 Th10', clicks: 18500 },
  { date: '27 Th10', clicks: 19000 },
  { date: '28 Th10', clicks: 22000 },
  { date: '29 Th10', clicks: 26000 },
  { date: '30 Th10', clicks: 30000 }
];

export const TOP_PERFORMING_LINKS_DATA = [
  {
    id: 'tpl-1',
    source: 'Quảng cáo Facebook',
    destUrl: 'vivid.link/fb-campaign-q4',
    clicks: 45201,
    conversion: '3.8%',
    status: 'Hoạt động',
    icon: 'Facebook',
    color: '#1877F2'
  },
  {
    id: 'tpl-2',
    source: 'Zalo Marketing',
    destUrl: 'vivid.link/zalo-community',
    clicks: 32940,
    conversion: '2.4%',
    status: 'Hoạt động',
    icon: 'MessageSquare',
    color: '#0068FF'
  },
  {
    id: 'tpl-3',
    source: 'Tiểu sử Instagram',
    destUrl: 'vivid.link/main-bio',
    clicks: 18500,
    conversion: '1.1%',
    status: 'Tạm dừng',
    icon: 'Camera',
    color: '#E4405F'
  }
];
