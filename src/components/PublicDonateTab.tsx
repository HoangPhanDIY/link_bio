import React, { useState } from "react";
import { AppearanceSettings } from "../types";
import { DBDonation, dbService } from "../dbService";
import LucideIcon from "./LucideIcon";

interface PublicDonateTabProps {
  appearance: AppearanceSettings;
  isDarkPublic: boolean;
  onDonationCreated: (donation: DBDonation) => void;
  hasLoadedDonations: boolean;
}

export default function PublicDonateTab({
  appearance,
  isDarkPublic,
  onDonationCreated,
  hasLoadedDonations,
}: PublicDonateTabProps) {
  const [donateStep, setDonateStep] = useState<"form" | "qr">("form");
  const [donorName, setDonorName] = useState("");
  const [donateAmount, setDonateAmount] = useState("");
  const [donateMessage, setDonateMessage] = useState("");
  const [generatedMemo, setGeneratedMemo] = useState("");
  const [selectedDonateMethod, setSelectedDonateMethod] = useState<"bank" | "momo">("bank");
  const [isDonating, setIsDonating] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [selectedMobileBank, setSelectedMobileBank] = useState("vcb");

  const generateMemoCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handlePublicDonateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorName.trim()) {
      alert("Vui lòng nhập tên người ủng hộ.");
      return;
    }
    const amountNum = Number(donateAmount);
    if (!donateAmount || isNaN(amountNum) || amountNum <= 0) {
      alert("Vui lòng nhập số tiền ủng hộ hợp lệ (lớn hơn 0).");
      return;
    }

    setIsDonating(true);
    try {
      const code = generateMemoCode();
      const newDonation = {
        ten_nguoi_ung_ho: donorName.trim(),
        so_tien: amountNum,
        noi_dung: donateMessage.trim(),
        noi_dung_ck: code,
        trang_thai: 0,
      };

      const saved = await dbService.saveDonation(newDonation);
      if (saved) {
        setGeneratedMemo(code);
        setDonateStep("qr");
        onDonationCreated(saved);
      } else {
        alert("Có lỗi xảy ra khi gửi thông tin ủng hộ. Vui lòng thử lại!");
      }
    } catch (err) {
      console.error(err);
      alert("Đã xảy ra lỗi kết nối. Vui lòng thử lại!");
    } finally {
      setIsDonating(false);
    }
  };

  const handleResetDonateForm = () => {
    setDonateStep("form");
    setDonorName("");
    setDonateAmount("");
    setDonateMessage("");
    setGeneratedMemo("");
  };

  const handleDownloadQR = async () => {
    const url =
      selectedDonateMethod === "momo" && appearance.momoNumber
        ? `https://img.vietqr.io/image/MOMO-${appearance.momoNumber}-compact2.png?amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.momoName || "")}`
        : `https://img.vietqr.io/image/${(appearance.bankName || "MB").replace(/\s+/g, "")}-${appearance.bankAccount}-compact2.png?amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.bankOwner || "")}`;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `QR_Donate_${generatedMemo || "VietQR"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Could not download via fetch, opening in new tab:", err);
      window.open(url, "_blank");
    }
  };

  const handleRedirectToBankApp = () => {
    const appCode = selectedMobileBank;
    let redirectUrl = "";
    if (appCode === "momo") {
      redirectUrl = `https://dl.vietqr.co/pay?app=momo&amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.momoName || "")}`;
    } else {
      redirectUrl = `https://dl.vietqr.co/pay?app=${appCode}&amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.bankOwner || "")}`;
    }
    window.open(redirectUrl, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-4 rounded-full"
          style={{ backgroundColor: appearance.accentColor }}
        ></div>
        <h2
          className={`text-xl font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
        >
          Ủng hộ & Donate
        </h2>
      </div>

      {donateStep === "form" ? (
        <div className="space-y-5">
          <p
            className={`text-xs sm:text-sm leading-relaxed ${isDarkPublic ? "text-slate-400" : "text-slate-600"}`}
          >
            {appearance.donateNote ||
              "Cảm ơn các bạn đã ủng hộ mình để phát triển nhiều giáo án chất lượng hơn nữa!"}
          </p>

          <form
            onSubmit={handlePublicDonateSubmit}
            className="space-y-4 text-left"
          >
            {/* Donor Name */}
            <div className="space-y-1">
              <label
                className={`block text-xs font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
              >
                Tên người ủng hộ *
              </label>
              <input
                type="text"
                required
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Nhập tên hiển thị trên stream..."
                className={`w-full p-3 rounded-xl border outline-none transition-all text-sm font-sans font-medium ${isDarkPublic ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-700" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"}`}
              />
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label
                className={`block text-xs font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
              >
                Số tiền ủng hộ (VNĐ) *
              </label>
              <input
                type="number"
                required
                min="1000"
                step="1000"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                placeholder="Ví dụ: 50000"
                className={`w-full p-3 rounded-xl border outline-none transition-all text-sm font-sans font-medium ${isDarkPublic ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-700" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"}`}
              />

              {/* Quick Amount Choices */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  2000, 5000, 10000, 20000, 50000, 100000, 200000,
                  500000,
                ].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDonateAmount(String(val))}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isDarkPublic
                        ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                        : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {val.toLocaleString("vi-VN")} đ
                  </button>
                ))}
              </div>
            </div>

            {/* Stream Message */}
            <div className="space-y-1">
              <label
                className={`block text-xs font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
              >
                Lời nhắn (Hiển thị trên stream)
              </label>
              <textarea
                value={donateMessage}
                onChange={(e) => setDonateMessage(e.target.value)}
                placeholder="Gửi lời chúc, góp ý hoặc lời nhắn của bạn..."
                rows={3}
                maxLength={200}
                className={`w-full p-3 rounded-xl border outline-none transition-all text-sm font-sans font-medium resize-none ${isDarkPublic ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-700" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"}`}
              />
            </div>

            {/* Select payment method if both bank and momo are configured */}
            {appearance.bankEnabled !== false &&
              appearance.bankAccount &&
              appearance.momoEnabled !== false &&
              appearance.momoNumber && (
                <div className="space-y-1.5 pt-1">
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Phương thức thanh toán
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDonateMethod("bank")}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedDonateMethod === "bank"
                          ? "border-transparent text-white"
                          : isDarkPublic
                            ? "border-slate-800 text-slate-400 hover:bg-slate-850"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      style={
                        selectedDonateMethod === "bank"
                          ? {
                              backgroundColor: appearance.accentColor,
                            }
                          : {}
                      }
                    >
                      <LucideIcon name="CreditCard" size={14} />
                      <span>Ngân hàng</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDonateMethod("momo")}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedDonateMethod === "momo"
                          ? "border-transparent text-white"
                          : isDarkPublic
                            ? "border-slate-800 text-slate-400 hover:bg-slate-850"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                      style={
                        selectedDonateMethod === "momo"
                          ? {
                              backgroundColor: appearance.accentColor,
                            }
                          : {}
                      }
                    >
                      <LucideIcon name="Wallet" size={14} />
                      <span>Ví MoMo</span>
                    </button>
                  </div>
                </div>
              )}

            {/* Submit Button */}
            <div className="pt-2">
              {!(appearance.bankAccount || appearance.momoNumber) ? (
                <div className="text-center text-xs text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-100 dark:border-red-900/30 font-semibold">
                  Chưa cấu hình tài khoản nhận ủng hộ. Admin vui lòng cấu hình tài khoản trong phần Giao diện.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isDonating}
                  className="w-full py-3 px-4 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer hover:opacity-90 active:scale-[0.99]"
                  style={{
                    backgroundColor: appearance.accentColor,
                  }}
                >
                  {isDonating ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <LucideIcon name="ArrowRight" size={16} />
                  )}
                  <span>Tạo mã QR ủng hộ</span>
                </button>
              )}
            </div>
          </form>
        </div>
      ) : (
        /* Step 2: Show QR Code and Instructions */
        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center space-y-1">
            <p
              className={`text-xs font-bold uppercase tracking-widest ${isDarkPublic ? "text-emerald-400" : "text-emerald-600"}`}
            >
              Đăng ký ủng hộ thành công!
            </p>
            <h3
              className={`font-display font-extrabold text-base ${isDarkPublic ? "text-slate-100" : "text-slate-800"}`}
            >
              Quét mã để chuyển khoản tự động
            </h3>
          </div>

          {/* Dynamic QR Display */}
          <div className="flex flex-col items-center space-y-2.5">
            <div className="p-3 bg-white rounded-3xl shadow-md border border-slate-100 dark:border-slate-800 flex items-center justify-center w-52 h-52 aspect-square">
              <img
                src={
                  selectedDonateMethod === "momo" && appearance.momoNumber
                    ? `https://img.vietqr.io/image/MOMO-${appearance.momoNumber}-compact2.png?amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.momoName || "")}`
                    : `https://img.vietqr.io/image/${(appearance.bankName || "MB").replace(/\s+/g, "")}-${appearance.bankAccount}-compact2.png?amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.bankOwner || "")}`
                }
                alt="Donation QR Code"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <button
              type="button"
              onClick={handleDownloadQR}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:opacity-95 cursor-pointer ${
                isDarkPublic
                  ? "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-850"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <LucideIcon name="Download" size={14} />
              <span>Lưu ảnh QR về máy</span>
            </button>
            <span className="text-[10px] text-slate-400 font-semibold">
              Mã QR tích hợp số tiền & nội dung tự động
            </span>
          </div>

          {/* Transfer content highlight */}
          <div
            className={`p-4 rounded-xl border text-left space-y-2.5 ${isDarkPublic ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-150"}`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">
                Số tiền chuyển:
              </span>
              <span
                className={`text-sm font-black ${isDarkPublic ? "text-slate-100" : "text-slate-800"}`}
              >
                {Number(donateAmount).toLocaleString("vi-VN")} VNĐ
              </span>
            </div>

            <div className="border-t border-dashed border-slate-200 dark:border-slate-800 my-1"></div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium block">
                Nội dung chuyển khoản (Bắt buộc đúng):
              </span>
              <div className="flex gap-2">
                <div
                  className={`flex-1 font-mono font-black text-center text-lg py-2.5 px-3 rounded-lg border border-dashed select-all uppercase tracking-wider ${
                    isDarkPublic
                      ? "bg-slate-850 border-slate-700 text-yellow-400"
                      : "bg-yellow-50 border-yellow-200 text-amber-800"
                  }`}
                >
                  {generatedMemo}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedMemo);
                    setCopiedMemo(true);
                    setTimeout(() => setCopiedMemo(false), 2000);
                  }}
                  className="px-3.5 rounded-lg text-white transition-all flex items-center justify-center shrink-0 cursor-pointer text-xs font-bold"
                  style={{
                    backgroundColor: appearance.accentColor,
                  }}
                >
                  {copiedMemo ? (
                    <LucideIcon name="Check" size={16} />
                  ) : (
                    <LucideIcon name="Copy" size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Banking App Redirection Section */}
          <div
            className={`p-4 rounded-xl border text-left space-y-3 ${isDarkPublic ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-150"}`}
          >
            <div className="space-y-1">
              <span
                className={`text-xs font-bold uppercase tracking-wider block ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
              >
                Chọn ứng dụng ngân hàng để thanh toán nhanh:
              </span>
              <div className="flex gap-2">
                <select
                  value={selectedMobileBank}
                  onChange={(e) => setSelectedMobileBank(e.target.value)}
                  className={`flex-1 p-2.5 rounded-xl border outline-none transition-all text-xs font-bold cursor-pointer ${
                    isDarkPublic
                      ? "bg-slate-850 border-slate-700 text-white"
                      : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                  }`}
                >
                  <option value="mb">MB Bank (Ngân hàng Quân đội)</option>
                  <option value="vcb">Vietcombank</option>
                  <option value="tcb">Techcombank</option>
                  <option value="bidv">BIDV</option>
                  <option value="vtb">VietinBank</option>
                  <option value="tpb">TPBank</option>
                  <option value="vpb">VPBank</option>
                  <option value="acb">ACB</option>
                  <option value="momo">Ví MoMo</option>
                </select>
                <button
                  type="button"
                  onClick={handleRedirectToBankApp}
                  className="px-4 py-2.5 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-xs hover:opacity-90 active:scale-[0.98]"
                  style={{
                    backgroundColor: appearance.accentColor,
                  }}
                >
                  <LucideIcon name="ExternalLink" size={14} />
                  <span>Mở App</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Hệ thống sẽ tự động chuyển hướng và điền thông tin chuyển khoản trên ứng dụng ngân hàng của bạn.
              </p>
            </div>
          </div>

          {/* Guide list */}
          <div
            className={`text-left text-xs leading-relaxed space-y-1.5 p-3 rounded-xl ${isDarkPublic ? "text-slate-400" : "text-slate-500"}`}
          >
            <p className="font-bold flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              Bước 1: Lưu ảnh QR ở trên HOẶC chọn ứng dụng ngân hàng của bạn rồi nhấn "Mở App" để chuyển khoản tự động.
            </p>
            <p className="font-bold flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              Bước 2: Kiểm tra số tiền chuyển khoản trùng khớp với yêu cầu ở trên.
            </p>
            <p className="font-bold flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              Bước 3: Nhấn chuyển khoản trên điện thoại. Sau khi chuyển khoản thành công, nhấn "Xác nhận đã chuyển" bên dưới.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setDonateStep("form")}
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all text-xs text-center border cursor-pointer ${
                isDarkPublic
                  ? "border-slate-800 text-slate-400 hover:bg-slate-850"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Quay lại
            </button>
            <button
              type="button"
              onClick={() => {
                handleResetDonateForm();
                alert(
                  "Cảm ơn bạn rất nhiều! Ủng hộ của bạn đã được lưu ở trạng thái chờ duyệt. Admin sẽ sớm phê duyệt giao dịch của bạn để hiển thị trên stream!",
                );
              }}
              className="flex-grow py-3 px-4 rounded-xl text-white font-bold transition-all text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:opacity-95"
              style={{ backgroundColor: appearance.accentColor }}
            >
              <LucideIcon name="CheckCircle" size={14} />
              <span>Xác nhận đã chuyển</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
