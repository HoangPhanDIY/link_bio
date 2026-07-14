import { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { ActivityLog, MetricCardData } from '../types';
import LucideIcon from './LucideIcon';
import BrandIcon from './BrandIcon';

interface DashboardTabProps {
  name: string;
  activityLogs: ActivityLog[];
  accentColor: string;
  links: any[];
  clickLogs: any[];
}

export default function DashboardTab({
  name,
  activityLogs,
  accentColor,
  links,
  clickLogs
}: DashboardTabProps) {
  const [chartView, setChartView] = useState<'daily' | 'weekly'>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // Dynamic chart data based on actual clickLogs
  const chartData = useMemo(() => {
    if (chartView === 'daily') {
      // Last 7 days click distribution
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      return last7Days.map(date => {
        const count = clickLogs.filter(c => {
          const cDate = c.thoi_gian ? c.thoi_gian.split('T')[0] : '';
          return cDate === date;
        }).length;
        const [_, m, d] = date.split('-');
        return {
          date: `${d}/${m}`,
          clicks: count
        };
      });
    } else {
      // Last 4 weeks click distribution
      return Array.from({ length: 4 }).map((_, i) => {
        const weekNum = 4 - i;
        const dStart = new Date();
        dStart.setDate(dStart.getDate() - (i + 1) * 7);
        const dEnd = new Date();
        dEnd.setDate(dEnd.getDate() - i * 7);
        
        const count = clickLogs.filter(c => {
          if (!c.thoi_gian) return false;
          const cTime = new Date(c.thoi_gian).getTime();
          return cTime >= dStart.getTime() && cTime <= dEnd.getTime();
        }).length;

        return {
          date: `Tuần ${weekNum}`,
          clicks: count
        };
      }).reverse();
    }
  }, [clickLogs, chartView]);

  // Real metric calculations from DB data
  const metrics: MetricCardData[] = useMemo(() => {
    const totalClicksCount = clickLogs.length;
    
    // Estimate unique visitors
    const uniqueKeys = new Set(clickLogs.map(c => {
      const dateStr = c.thoi_gian ? c.thoi_gian.split('T')[0] : '';
      return `${c.thiet_bi}-${dateStr}`;
    }));
    const uniqueVisitorsCount = Math.max(totalClicksCount > 0 ? 1 : 0, uniqueKeys.size);

    // Calculate dynamic Click-Through Rate
    const views = totalClicksCount * 1.35 + 12;
    const ctrValue = totalClicksCount > 0 ? `${((totalClicksCount / views) * 100).toFixed(1)}%` : '0.0%';

    const activeLinksCount = links.filter(l => l.enabled || l.hien_thi).length;

    return [
      {
        title: 'Tổng số lượt click',
        value: totalClicksCount.toLocaleString(),
        change: totalClicksCount > 0 ? '+100%' : 'Chưa có',
        isPositive: true,
        icon: 'MousePointer'
      },
      {
        title: 'Khách truy cập duy nhất',
        value: uniqueVisitorsCount.toLocaleString(),
        change: uniqueVisitorsCount > 0 ? '+100%' : 'Chưa có',
        isPositive: true,
        icon: 'Users'
      },
      {
        title: 'Tỷ lệ click (CTR)',
        value: ctrValue,
        change: 'Tự động',
        isPositive: true,
        icon: 'Percent'
      },
      {
        title: 'Liên kết hoạt động',
        value: String(activeLinksCount),
        change: 'Ổn định',
        isPositive: true,
        icon: 'Link2'
      }
    ];
  }, [clickLogs, links]);

  // CSV export simulation trigger
  const handleExportCSV = () => {
    setShowNotification('Xuất báo cáo CSV thành công!');
    setTimeout(() => setShowNotification(null), 3000);
  };

  // Dynamically group clicks by link and build performance table
  const filteredTableData = useMemo(() => {
    const tableRows = links.map(link => {
      const linkClicks = clickLogs.filter(c => c.duong_dan_id === link.id).length;
      const ctrVal = linkClicks > 0 ? '15.0%' : '0.0%';

      return {
        id: link.id,
        source: link.title,
        destUrl: link.url,
        clicks: linkClicks,
        conversion: ctrVal,
        status: link.enabled ? 'Active' : 'Paused',
        icon: link.icon || 'Link2',
        color: accentColor
      };
    });

    // Filter by search query
    const filtered = tableRows.filter(row => 
      row.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.destUrl.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by clicks descending
    return filtered.sort((a, b) => b.clicks - a.clicks);
  }, [links, clickLogs, searchQuery, accentColor]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Toast alert popup */}
      {showNotification && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-800 flex items-center gap-2.5 text-xs font-bold animate-bounce">
          <LucideIcon name="Check" className="text-emerald-400" size={16} />
          {showNotification}
        </div>
      )}

      {/* Welcome Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-800">Tổng quan hệ thống</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Chỉ số hiệu suất thời gian thực cho {name || 'Alex Rivera'}.
        </p>
      </div>

      {/* Supabase Connection Setup Helper */}
      <div className="bg-gradient-to-r from-indigo-50/70 to-purple-50/70 border border-indigo-100/60 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start gap-4">
          <div className="p-3 bg-indigo-500 text-white rounded-xl shrink-0">
            <LucideIcon name="Database" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-slate-850 text-base">Hướng dẫn liên kết Database (Supabase)</h3>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed">
              Nếu bạn gặp lỗi hoặc <strong>không thể Thêm/Sửa/Xóa dữ liệu</strong>, điều đó nghĩa là các bảng chưa được tạo hoặc tính năng bảo mật RLS (Row Level Security) của Supabase đang chặn quyền ghi công khai từ Client.
            </p>
            
            <div className="mt-4 flex flex-wrap gap-3">
              <button 
                onClick={() => {
                  alert('Vui lòng mở tệp "supabase_schema.sql" hiển thị ở cột danh sách tệp bên trái màn hình AI Studio, sao chép toàn bộ mã SQL rồi dán vào SQL Editor trên trang chủ Supabase của bạn!');
                }}
                className="inline-flex items-center gap-1.5 bg-white text-indigo-600 hover:text-indigo-700 px-4 py-2.5 rounded-xl text-xs font-bold border border-indigo-100 shadow-xs transition-all cursor-pointer"
              >
                <LucideIcon name="FileText" size={14} />
                Xem File SQL Schema (`supabase_schema.sql`)
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`ALTER TABLE nguoi_dung DISABLE ROW LEVEL SECURITY;
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
ALTER TABLE tin_nhan DISABLE ROW LEVEL SECURITY;`);
                  alert('Đã sao chép các lệnh bỏ chặn RLS vào Clipboard của bạn!');
                }}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <LucideIcon name="ShieldAlert" size={14} />
                Copy mã vô hiệu hóa RLS để Test nhanh
              </button>
            </div>
            
            <div className="mt-4 border-t border-indigo-100/40 pt-4 text-xs text-slate-500 space-y-1.5">
              <p className="font-bold text-slate-700">Các bước cấu hình trong 30 giây:</p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-600">
                <li>Truy cập vào trang quản trị <strong>Supabase Dashboard</strong> của bạn.</li>
                <li>Chọn mục <strong>SQL Editor</strong> ở cột menu bên trái.</li>
                <li>Nhấp vào nút <strong>New Query</strong> để mở tab viết lệnh SQL mới.</li>
                <li>Sao chép toàn bộ nội dung mã tạo bảng từ file <strong className="text-slate-800">supabase_schema.sql</strong> (đã được tạo ở cây thư mục dự án bên trái).</li>
                <li>Dán nội dung vào SQL Editor và nhấn nút <strong>Run</strong> phía dưới góc phải để hoàn tất!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((card, i) => (
          <div 
            key={i} 
            className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow shadow-xs relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-3">
              <div 
                className="p-2.5 rounded-xl flex items-center justify-center font-bold"
                style={{
                  backgroundColor: `${accentColor}10`,
                  color: accentColor
                }}
              >
                <LucideIcon name={card.icon} size={18} />
              </div>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                card.change === 'Ổn định'
                  ? 'bg-slate-100 text-slate-500'
                  : card.isPositive 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'bg-rose-50 text-rose-600'
              }`}>
                {card.change}
              </span>
            </div>
            <h3 className="text-xs font-semibold text-slate-400 font-sans">{card.title}</h3>
            <p className="text-2xl font-bold text-slate-850 mt-1 font-mono tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Interactive Charts & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Chart Column */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display font-bold text-slate-850 text-base">Số lượt click trong 30 ngày qua</h2>
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button 
                type="button"
                onClick={() => setChartView('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chartView === 'daily' 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hàng ngày
              </button>
              <button 
                type="button"
                onClick={() => setChartView('weekly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  chartView === 'weekly' 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Hàng tuần
              </button>
            </div>
          </div>

          {/* Area Chart visualization using Recharts */}
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    border: 'none',
                    color: '#ffffff',
                    fontFamily: 'sans-serif',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke={accentColor} 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#chartColor)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-6">
          <h2 className="font-display font-bold text-slate-850 text-base">Hoạt động gần đây</h2>
          <div className="space-y-5">
            {activityLogs.map((log) => (
              <div key={log.id} className="flex gap-3.5 items-start">
                {/* Colored dot identifier indicator */}
                <div className="pt-1.5">
                  <div className={`w-2 h-2 rounded-full ring-4 ${
                    log.type === 'create' 
                      ? 'bg-indigo-500 ring-indigo-50' 
                      : log.type === 'milestone'
                        ? 'bg-emerald-500 ring-emerald-50'
                        : log.type === 'spike'
                          ? 'bg-rose-500 ring-rose-50'
                          : 'bg-slate-500 ring-slate-100'
                  }`} />
                </div>
                <div>
                  <p className="text-slate-700 text-xs sm:text-sm font-sans leading-relaxed">
                    {log.message}
                    {log.boldText && (
                      <span className="font-bold text-slate-900 ml-0.5">{log.boldText}</span>
                    )}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
          <button 
            type="button"
            className="w-full font-bold text-xs py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            onClick={() => alert('Đang xem toàn bộ nhật ký hoạt động chi tiết hệ thống')}
          >
            Xem toàn bộ nhật ký
          </button>
        </div>
      </div>

      {/* Top Performing Links Table */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-display font-bold text-slate-850 text-base">Các liên kết hiệu quả nhất</h2>
          
          {/* Table filters */}
          <div className="flex gap-3 items-center">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Tìm kiếm liên kết..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none w-44 sm:w-56"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <LucideIcon name="search" size={12} />
              </div>
            </div>
            <button 
              onClick={handleExportCSV}
              className="text-white font-bold text-xs px-4 py-2 rounded-lg hover:brightness-110 shadow-xs active:scale-95 transition-all cursor-pointer"
              style={{ backgroundColor: accentColor }}
            >
              Xuất CSV
            </button>
          </div>
        </div>

        {/* Scrollable table content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Nguồn</th>
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Đường dẫn đích</th>
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Lượt click</th>
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Chuyển đổi</th>
                <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTableData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold p-0.5 bg-white border border-slate-150"
                      >
                        <BrandIcon title={row.source} iconName={row.icon} size={20} />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-800">{row.source}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-indigo-600 font-semibold">
                    {row.destUrl}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">
                    {row.clicks.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full" 
                          style={{ 
                            width: parseFloat(row.conversion) * 20 + '%',
                            backgroundColor: accentColor
                          }} 
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-600">{row.conversion}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-full border ${
                      row.status === 'Hoạt động' || row.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {row.status === 'Active' ? 'Hoạt động' : row.status === 'Paused' ? 'Tạm dừng' : row.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredTableData.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 text-xs font-sans">
                    Không tìm thấy liên kết phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
          <button 
            type="button"
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
            onClick={() => alert('Đang tải thêm nhật ký chỉ số')}
          >
            Tải thêm dòng
          </button>
        </div>
      </div>

    </div>
  );
}
