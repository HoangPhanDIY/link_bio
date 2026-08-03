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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Amount Metric */}
        <div className="bg-[#1d182b]/90 p-6 border border-[#bd9867]/60 shadow-xl flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-[#fce3bc] font-black">
            Đã nhận
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black bg-gradient-to-t from-[#bd9867] to-[#fce3bc] bg-clip-text text-transparent">
              {formatMoney(paidAmount)}
            </span>
            <p className="text-[10px] text-slate-300 mt-1 font-semibold">
              Từ {donations.filter((d) => d.trang_thai === 1).length} lượt ủng
              hộ thực tế
            </p>
          </div>
        </div>

        {/* Pending Amount Metric */}
        <div className="bg-[#1d182b]/90 p-6 border border-[#bd9867]/60 shadow-xl flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-black">
            Chờ duyệt (Chưa ck)
          </span>
          <div className="mt-2">
            <span className="text-2xl font-black text-amber-300">
              {formatMoney(pendingAmount)}
            </span>
            <p className="text-[10px] text-slate-300 mt-1 font-semibold">
              Từ {donations.filter((d) => d.trang_thai === 0).length} lượt đăng
              ký chờ duyệt
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <LucideIcon
          name="Search"
          className="absolute left-4 top-3.5 text-[#bd9867]"
          size={18}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm kiếm ủng hộ theo tên, nội dung, mã nội dung ck hoặc số tiền..."
          className="w-full bg-[#1d182b]/90 border border-[#bd9867]/60 pl-12 pr-4 py-3.5 focus:border-[#fce3bc] outline-none transition-all text-sm text-white font-medium placeholder:text-slate-500 shadow-md"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-4 top-3.5 text-[#fce3bc] hover:underline font-bold text-xs cursor-pointer"
          >
            Xóa lọc
          </button>
        )}
      </div>

      {/* Donations List */}
      <div className="bg-[#1d182b]/90 border border-[#bd9867]/60 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/60 border-b border-[#bd9867]/40 text-[#fce3bc] text-[10px] uppercase tracking-wider font-extrabold">
                <th className="py-4 px-6">Người ủng hộ</th>
                <th className="py-4 px-4">Số tiền</th>
                <th className="py-4 px-4">Mã CK (Nội dung CK)</th>
                <th className="py-4 px-4">Lời nhắn stream</th>
                <th className="py-4 px-4">Ngày tạo</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bd9867]/20 text-xs text-slate-200">
              {filteredDonations.map((don) => (
                <tr key={don.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 font-bold text-white flex items-center gap-2">
                    <span
                      className="w-2 h-2 shrink-0"
                      style={{
                        backgroundColor:
                          don.trang_thai === 1 ? "#10b981" : "#f59e0b",
                      }}
                    />
                    {don.ten_nguoi_ung_ho || "Ẩn danh"}
                  </td>
                  <td className="py-4 px-4 font-black text-[#fce3bc] text-sm">
                    {formatMoney(don.so_tien)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="bg-black/60 text-[#fce3bc] font-extrabold px-2 py-1 border border-[#bd9867]/40 text-xs select-all">
                      {don.noi_dung_ck || "N/A"}
                    </span>
                  </td>
                  <td
                    className="py-4 px-4 max-w-xs truncate"
                    title={don.noi_dung || ""}
                  >
                    {don.noi_dung || (
                      <span className="text-slate-500 italic">
                        Không có lời nhắn
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-slate-400 font-medium">
                    {formatDate(don.created_at)}
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleToggleStatus(don.id, don.trang_thai)}
                      disabled={isUpdating === don.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black cursor-pointer transition-all border ${
                        don.trang_thai === 1
                          ? "bg-emerald-950/80 border-emerald-500 text-emerald-400 hover:bg-emerald-900"
                          : "bg-amber-950/80 border-amber-500 text-amber-400 hover:bg-amber-900"
                      }`}
                    >
                      {isUpdating === don.id ? (
                        <span className="w-2 h-2 border border-current border-t-transparent animate-spin" />
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
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/40 p-1.5 transition-all cursor-pointer border border-transparent hover:border-red-500/40"
                    >
                      {isDeleting === don.id ? (
                        <span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 animate-spin inline-block" />
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
                      <div className="p-4 border border-[#bd9867] bg-[#bd9867]/20 text-[#fce3bc]">
                        <LucideIcon name="Heart" size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-extrabold text-[#fce3bc] text-sm">
                          Chưa có giao dịch nào
                        </p>
                        <p className="text-xs max-w-xs mx-auto text-slate-300">
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
