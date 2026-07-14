import React, { useState } from "react";
import { DBDonation } from "../supabase";
import LucideIcon from "./LucideIcon";

interface DonationsTabProps {
  donations: DBDonation[];
  onUpdateStatus: (id: string, status: number) => Promise<void>;
  onDeleteDonation: (id: string) => Promise<void>;
  accentColor: string;
}

export default function DonationsTab({
  donations,
  onUpdateStatus,
  onDeleteDonation,
  accentColor,
}: DonationsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredDonations = donations.filter((don) => {
    const term = searchTerm.toLowerCase();
    const name = (don.ten_nguoi_ung_ho || "").toLowerCase();
    const content = (don.noi_dung || "").toLowerCase();
    const memo = (don.noi_dung_ck || "").toLowerCase();
    const amountStr = String(don.so_tien);
    return (
      name.includes(term) ||
      content.includes(term) ||
      memo.includes(term) ||
      amountStr.includes(term)
    );
  });

  const paidAmount = donations
    .filter((d) => d.trang_thai === 1)
    .reduce((sum, d) => sum + d.so_tien, 0);
  const pendingAmount = donations
    .filter((d) => d.trang_thai === 0)
    .reduce((sum, d) => sum + d.so_tien, 0);

  const handleToggleStatus = async (id: string, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    setIsUpdating(id);
    try {
      await onUpdateStatus(id, newStatus);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lượt ủng hộ này?")) return;
    setIsDeleting(id);
    try {
      await onDeleteDonation(id);
    } finally {
      setIsDeleting(null);
    }
  };

  const formatMoney = (amount: number) => {
    return amount.toLocaleString("vi-VN") + " đ";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Không rõ thời gian";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Title and description */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="p-2 rounded-lg bg-pink-50"
              style={{ color: accentColor, backgroundColor: `${accentColor}10` }}
            >
              <LucideIcon name="Heart" size={20} />
            </span>
            <h2 className="font-display text-lg font-bold text-slate-800">
              Quản lý ủng hộ (Donate)
            </h2>
          </div>
          <p className="text-slate-400 text-xs pl-1">
            Theo dõi, kiểm tra trạng thái và duyệt các lượt ủng hộ từ khán giả.
          </p>
        </div>

        {/* Total Amount Metric */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
            Đã duyệt (Đã chuyển)
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-600">
              {formatMoney(paidAmount)}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Từ {donations.filter((d) => d.trang_thai === 1).length} lượt ủng hộ thực tế
            </p>
          </div>
        </div>

        {/* Pending Amount Metric */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
            Chờ duyệt (Chưa ck)
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-500">
              {formatMoney(pendingAmount)}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Từ {donations.filter((d) => d.trang_thai === 0).length} lượt đăng ký chờ duyệt
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <LucideIcon
          name="Search"
          className="absolute left-4 top-3.5 text-slate-400"
          size={18}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm ủng hộ theo tên, nội dung, mã nội dung ck hoặc số tiền..."
          className="w-full bg-white border border-slate-200/80 rounded-2xl pl-12 pr-4 py-3.5 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm text-slate-800 font-medium placeholder:text-slate-400 shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-4 top-3 text-slate-400 hover:text-slate-600 font-bold text-xs"
          >
            Xóa lọc
          </button>
        )}
      </div>

      {/* Donations List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] uppercase font-mono tracking-wider font-bold">
                <th className="py-4 px-6">Người ủng hộ</th>
                <th className="py-4 px-4">Số tiền</th>
                <th className="py-4 px-4">Mã CK (Nội dung CK)</th>
                <th className="py-4 px-4">Lời nhắn stream</th>
                <th className="py-4 px-4">Ngày tạo</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredDonations.map((don) => (
                <tr
                  key={don.id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-4 px-6 font-bold text-slate-800 flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          don.trang_thai === 1 ? "#10b981" : "#f59e0b",
                      }}
                    />
                    {don.ten_nguoi_ung_ho || "Ẩn danh"}
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-slate-800 text-sm">
                    {formatMoney(don.so_tien)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="bg-slate-100 text-slate-600 font-mono font-extrabold px-2 py-1 rounded border text-xs select-all">
                      {don.noi_dung_ck || "N/A"}
                    </span>
                  </td>
                  <td
                    className="py-4 px-4 max-w-xs truncate"
                    title={don.noi_dung || ""}
                  >
                    {don.noi_dung || (
                      <span className="text-slate-400 italic">
                        Không có lời nhắn
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-400 font-medium">
                    {formatDate(don.ngay_tao)}
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleToggleStatus(don.id, don.trang_thai)}
                      disabled={isUpdating === don.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                        don.trang_thai === 1
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      }`}
                    >
                      {isUpdating === don.id ? (
                        <span className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <LucideIcon
                          name={don.trang_thai === 1 ? "CheckCircle" : "Clock"}
                          size={11}
                        />
                      )}
                      <span>
                        {don.trang_thai === 1 ? "Đã duyệt" : "Chờ duyệt"}
                      </span>
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleDelete(don.id)}
                      disabled={isDeleting === don.id}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                    >
                      {isDeleting === don.id ? (
                        <span className="w-3 h-3 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin inline-block" />
                      ) : (
                        <LucideIcon name="Trash2" size={14} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}

              {filteredDonations.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 rounded-full bg-slate-50 text-slate-300">
                        <LucideIcon name="Heart" size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-700 text-sm">
                          Chưa có giao dịch nào
                        </p>
                        <p className="text-xs max-w-xs mx-auto">
                          {searchTerm
                            ? "Không tìm thấy giao dịch nào khớp với từ khóa tìm kiếm."
                            : "Trang của bạn chưa có lượt ủng hộ nào mới."}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
