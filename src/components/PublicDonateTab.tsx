import React, { useState, useEffect } from "react";
import { AppearanceSettings } from "../types";
import { DBDonation, dbService } from "../dbService";
import { supabase } from "../supabase";
import LucideIcon from "./LucideIcon";

interface PublicDonateTabProps {
  appearance: AppearanceSettings;
  isDarkPublic: boolean;
  onDonationCreated: (donation: DBDonation) => void;
  hasLoadedDonations: boolean;
  onSuccessRedirect?: () => void;
}

export default function PublicDonateTab({
  appearance,
  isDarkPublic,
  onDonationCreated,
  hasLoadedDonations,
  onSuccessRedirect,
}: PublicDonateTabProps) {
  const [mainTab, setMainTab] = useState<"donate" | "bank">("donate");
  const [donateStep, setDonateStep] = useState<"form" | "qr" | "success">(
    "form",
  );
  const [donorName, setDonorName] = useState("");
  const [donateAmount, setDonateAmount] = useState("");
  const [donateMessage, setDonateMessage] = useState("");
  const [generatedMemo, setGeneratedMemo] = useState("");
  const [selectedDonateMethod, setSelectedDonateMethod] = useState<
    "bank" | "momo"
  >("bank");
  const [bankMethod, setBankMethod] = useState<"bank" | "momo">("bank");
  const [isDonating, setIsDonating] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [copiedBankAcc, setCopiedBankAcc] = useState(false);
  const [selectedMobileBank, setSelectedMobileBank] = useState("vcb");

  // Hook 1: Listen to Supabase Realtime for status changes on the specific donation (trang_thai === 1)
  useEffect(() => {
    if (donateStep !== "qr" || !generatedMemo) return;

    let active = true;

    // 1. Initial quick check in case it's already approved/confirmed
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("ung_ho")
          .select("trang_thai")
          .eq("noi_dung_ck", generatedMemo)
          .maybeSingle();

        if (error) {
          console.warn(
            "Lỗi kiểm tra trạng thái ủng hộ tự động ban đầu:",
            error,
          );
          return;
        }

        if (data && data.trang_thai === 1 && active) {
          setDonateStep("success");
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra ban đầu:", err);
      }
    };

    checkStatus();

    // 2. Set up Supabase Realtime subscription to receive updates instantly without polling overhead
    const channel = supabase
      .channel(`donation-status-${generatedMemo}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ung_ho",
          filter: `noi_dung_ck=eq.${generatedMemo}`,
        },
        (payload: any) => {
          console.log("Realtime payload received for donation:", payload);
          if (payload.new && payload.new.trang_thai === 1) {
            if (active) {
              setDonateStep("success");
            }
          }
        },
      )
      .subscribe((status) => {
        console.log(
          `Supabase Realtime subscription status for ${generatedMemo}:`,
          status,
        );
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [donateStep, generatedMemo]);

  // Hook 2: Trigger redirect and reset when successful
  useEffect(() => {
    if (donateStep !== "success") return;

    const timeout = setTimeout(() => {
      handleResetDonateForm();
      if (onSuccessRedirect) {
        onSuccessRedirect();
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [donateStep, onSuccessRedirect]);

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

  const handleDownloadStaticQR = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Bank_QR_${bankMethod === "momo" ? "MoMo" : appearance.bankName || "VietQR"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Could not download via fetch, opening in new tab:", err);
      window.open(url, "_blank");
    }
  };

  const staticBankQrUrl =
    bankMethod === "momo" && appearance.momoNumber
      ? `https://img.vietqr.io/image/MOMO-${appearance.momoNumber}-compact2.png?accountName=${encodeURIComponent(appearance.momoName || "")}`
      : `https://img.vietqr.io/image/${(appearance.bankName || "MB").replace(/\s+/g, "")}-${appearance.bankAccount}-compact2.png?accountName=${encodeURIComponent(appearance.bankOwner || "")}`;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header & Sub-tab navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0 sm:pb-3 border-b-0 sm:border-b sm:border-slate-200/80">
        <h2
          className={`text-xl font-black uppercase tracking-wider ${
            isDarkPublic ? "text-white" : "text-slate-900"
          }`}
        >
          ỦNG HỘ
        </h2>

        {/* 2 Sub-tab Options: Donate vs Bank */}
        <div
          className={`flex w-full sm:w-auto p-1 rounded-xl border-0 sm:border ${
            isDarkPublic
              ? "bg-slate-900 sm:border-slate-800"
              : "bg-slate-100 sm:border-slate-200"
          }`}
        >
          <button
            type="button"
            onClick={() => setMainTab("donate")}
            className={`flex-1 sm:flex-initial justify-center px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              mainTab === "donate"
                ? isDarkPublic
                  ? "bg-slate-800 text-amber-400 sm:bg-white sm:text-indigo-600 shadow-xs"
                  : "bg-white text-indigo-600 shadow-xs"
                : isDarkPublic
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LucideIcon
              name="Heart"
              size={14}
              className={mainTab === "donate" ? "fill-current" : ""}
            />
            <span>Donate</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab("bank")}
            className={`flex-1 sm:flex-initial justify-center px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              mainTab === "bank"
                ? isDarkPublic
                  ? "bg-slate-800 text-amber-400 sm:bg-white sm:text-indigo-600 shadow-xs"
                  : "bg-white text-indigo-600 shadow-xs"
                : isDarkPublic
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LucideIcon name="Building2" size={14} />
            <span>QR BANK</span>
          </button>
        </div>
      </div>

      {mainTab === "bank" ? (
        /* BANK VIEW: Hiển thị thông tin & QR ngân hàng của admin */
        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200 w-full max-w-4xl mx-auto">
          {!(appearance.bankAccount || appearance.momoNumber) ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <LucideIcon
                name="Building2"
                size={32}
                className="mx-auto text-slate-400"
              />
              <p className="font-bold">Chưa cấu hình tài khoản nhận ủng hộ.</p>
              <p className="text-[11px] text-slate-400">
                Admin chưa cài đặt tài khoản ngân hàng hoặc ví điện tử trong cài
                đặt Giao diện.
              </p>
            </div>
          ) : (
            <div
              className={`p-4 rounded-xl border w-full space-y-4 ${
                isDarkPublic
                  ? "bg-slate-900 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              {/* Header Box Bank */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2.5 border-b border-dashed border-slate-200">
                <div className="text-center sm:text-left">
                  <h3
                    className={`font-display font-extrabold text-sm sm:text-base ${
                      isDarkPublic ? "text-white" : "text-slate-800"
                    }`}
                  >
                    TẶNG QUÀ CHO {appearance.name?.toUpperCase()}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Quét mã QR hoặc chuyển khoản theo số tài khoản bên dưới
                  </p>
                </div>

                {/* Switch Bank vs MoMo if both enabled */}
                {appearance.bankEnabled !== false &&
                  appearance.bankAccount &&
                  appearance.momoEnabled !== false &&
                  appearance.momoNumber && (
                    <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setBankMethod("bank")}
                        className={`px-3 py-1 rounded-md text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                          bankMethod === "bank"
                            ? "bg-white text-indigo-600 shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                        }`}
                      >
                        <LucideIcon name="CreditCard" size={12} />
                        <span>Ngân Hàng</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBankMethod("momo")}
                        className={`px-3 py-1 rounded-md text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                          bankMethod === "momo"
                            ? "bg-pink-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                        }`}
                      >
                        <LucideIcon name="Wallet" size={12} />
                        <span>MoMo</span>
                      </button>
                    </div>
                  )}
              </div>

              {/* CENTER LAYOUT: QR Code nằm ở chính giữa */}
              <div className="flex flex-col items-center justify-center w-full max-w-xs mx-auto space-y-3 pt-1">
                <div className="w-full aspect-square overflow-hidden border border-slate-200 rounded-xl bg-white flex items-center justify-center p-2 shadow-xs">
                  <img
                    src={staticBankQrUrl}
                    alt="Bank QR Code"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadStaticQR(staticBankQrUrl)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold border rounded-lg transition-all hover:opacity-95 cursor-pointer w-full text-center bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs"
                >
                  <LucideIcon name="Download" size={14} />
                  <span>Lưu ảnh QR</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : donateStep === "form" ? (
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
                className={`block text-xs font-bold uppercase tracking-wider text-black`}
              >
                Tên người ủng hộ *
              </label>
              <input
                type="text"
                required
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Nhập tên hiển thị trên stream..."
                className={`w-full p-3 border outline-none transition-all text-sm font-sans font-medium ${isDarkPublic ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-700" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"}`}
              />
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label
                className={`block text-xs font-bold uppercase tracking-wider text-black`}
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
                className={`w-full p-3 border outline-none transition-all text-sm font-sans font-medium ${isDarkPublic ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-700" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"}`}
              />

              {/* Quick Amount Choices */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000].map(
                  (val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDonateAmount(String(val))}
                      className={`text-[11px] font-bold px-2.5 py-1 border transition-all cursor-pointer ${
                        isDarkPublic
                          ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                          : "bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {val.toLocaleString("vi-VN")} đ
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Stream Message */}
            <div className="space-y-1">
              <label
                className={`block text-xs font-bold uppercase tracking-wider text-black`}
              >
                Lời nhắn
              </label>
              <textarea
                value={donateMessage}
                onChange={(e) => setDonateMessage(e.target.value)}
                placeholder="Gửi lời chúc, góp ý hoặc lời nhắn của bạn..."
                rows={3}
                maxLength={200}
                className={`w-full p-3 border outline-none transition-all text-sm font-sans font-medium resize-none ${isDarkPublic ? "bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-slate-700" : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-100 focus:border-indigo-500"}`}
              />
            </div>

            {/* Select payment method if both bank and momo are configured */}
            {appearance.bankEnabled !== false &&
              appearance.bankAccount &&
              appearance.momoEnabled !== false &&
              appearance.momoNumber && (
                <div className="space-y-1.5 pt-1">
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider text-black`}
                  >
                    Phương thức thanh toán
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDonateMethod("bank")}
                      className={`py-2.5 px-3 border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                      className={`py-2.5 px-3 border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
            <div className="">
              {!(appearance.bankAccount || appearance.momoNumber) ? (
                <div className="text-center text-xs text-red-500 bg-red-50 p-3 border border-red-100font-semibold">
                  Chưa cấu hình tài khoản nhận ủng hộ.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isDonating}
                  className="w-full py-3 px-4 rounded-md text-white font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer hover:opacity-90 active:scale-[0.99]"
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
      ) : donateStep === "success" ? (
        /* Step 3: Success Screen with a beautiful green check/tick */
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-200 animate-bounce">
            <LucideIcon name="Check" size={48} className="stroke-[3px]" />
          </div>
          <h3
            className={`text-xl font-black ${isDarkPublic ? "text-slate-100" : "text-slate-800"}`}
          >
            Ủng Hộ Thành Công!
          </h3>
          <p
            className={`text-sm max-w-md leading-relaxed ${isDarkPublic ? "text-slate-400" : "text-slate-600"}`}
          >
            Cảm ơn <strong>{donorName}</strong> rất nhiều! Giao dịch của bạn có
            mã nội dung{" "}
            <strong className="text-yellow-500 uppercase">
              {generatedMemo}
            </strong>{" "}
            với số tiền{" "}
            <strong>{Number(donateAmount).toLocaleString("vi-VN")} đ</strong> đã
            được hệ thống ghi nhận thành công và đang phát thông báo trên
            livestream.
          </p>
          <div className="pt-4 flex items-center gap-2 text-xs text-indigo-500 font-bold justify-center">
            <span className="w-3.5 h-3.5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <span>Đang tự động chuyển về trang chủ...</span>
          </div>
        </div>
      ) : (
        /* Step 2: Show QR Code and Instructions */
        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300 w-full max-w-4xl mx-auto">
          {/* BOX CHUNG: Chứa QR bên trái và Thông tin chuyển khoản bên phải */}
          <div className="p-4 rounded-md border w-full space-y-3 bg-slate-50 border-slate-150">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2 border-b border-dashed border-slate-200">
              <h3 className="font-display font-extrabold text-sm sm:text-base text-slate-800">
                QUÉT QR ỦNG HỘ TÔI
              </h3>

              {/* Payment Method Selector in QR step if both available */}
              {appearance.bankEnabled !== false &&
                appearance.bankAccount &&
                appearance.momoEnabled !== false &&
                appearance.momoNumber && (
                  <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setSelectedDonateMethod("bank")}
                      className={`px-3 py-1 rounded-md text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                        selectedDonateMethod === "bank"
                          ? "bg-white text-indigo-600 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <LucideIcon name="CreditCard" size={12} />
                      <span>VietQR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDonateMethod("momo")}
                      className={`px-3 py-1 rounded-md text-[11px] font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
                        selectedDonateMethod === "momo"
                          ? "bg-pink-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <LucideIcon name="Wallet" size={12} />
                      <span>MoMo</span>
                    </button>
                  </div>
                )}
            </div>

            {/* PHẦN NỘI DUNG CHIA 2 CỘT (50/50) */}
            <div className="flex gap-3 items-stretch w-full">
              {/* BÊN TRÁI: QR Code hình vuông (chiếm chính xác 1/2 chiều rộng), cắt phần chân ảnh dư */}
              <div className="w-1/2 flex flex-col items-center justify-between space-y-2 shrink-0">
                <div className="w-full aspect-square  overflow-hidden border border-slate-100 flex items-center justify-center">
                  <img
                    src={
                      selectedDonateMethod === "momo" && appearance.momoNumber
                        ? `https://img.vietqr.io/image/MOMO-${appearance.momoNumber}-compact2.png?amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.momoName || "")}`
                        : `https://img.vietqr.io/image/${(appearance.bankName || "MB").replace(/\s+/g, "")}-${appearance.bankAccount}-compact2.png?amount=${donateAmount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(appearance.bankOwner || "")}`
                    }
                    alt="Donation QR Code"
                    className="w-full aspect-square object-cover object-top"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] sm:text-xs font-bold border transition-all hover:opacity-95 cursor-pointer w-full text-center bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  <LucideIcon name="Download" size={12} />
                  <span className="truncate">Lưu ảnh QR</span>
                </button>
              </div>

              {/* VẠCH PHÂN CÁCH DỌC DẠNG DẤU VÀNG HOẶC XÁM (|) */}
              <div className="w-[1px] self-stretch border-r border-dashed border-slate-200" />

              {/* BÊN PHẢI: Nội dung chuyển khoản (chiếm 1/2 chiều rộng còn lại) */}
              <div className="w-1/2 flex flex-col justify-between py-0.5 min-w-0 pl-1">
                <div className="space-y-1.5 text-[11px] sm:text-xs text-left">
                  {/* Ngân hàng */}
                  <div>
                    <span className="text-slate-400 block font-medium">
                      Ngân hàng:
                    </span>
                    <span className="font-bold block truncate text-slate-800">
                      {selectedDonateMethod === "momo"
                        ? "Ví MoMo"
                        : appearance.bankName || "MB"}
                    </span>
                  </div>

                  {/* Số tài khoản */}
                  <div>
                    <span className="text-slate-400 block font-medium">
                      STK:
                    </span>
                    <span className="font-mono font-bold tracking-wider select-all block truncate text-slate-800">
                      {selectedDonateMethod === "momo"
                        ? appearance.momoNumber
                        : appearance.bankAccount}
                    </span>
                  </div>

                  {/* Chủ tài khoản */}
                  <div>
                    <span className="text-slate-400 block font-medium">
                      Chủ TK:
                    </span>
                    <span className="font-bold uppercase block truncate text-slate-800">
                      {selectedDonateMethod === "momo"
                        ? appearance.momoName
                        : appearance.bankOwner}
                    </span>
                  </div>

                  {/* Số tiền */}
                  <div>
                    <span className="text-slate-400 block font-medium">
                      Số tiền:
                    </span>
                    <span className="font-black text-xs sm:text-sm block truncate text-slate-800">
                      {Number(donateAmount).toLocaleString("vi-VN")} VNĐ
                    </span>
                  </div>
                </div>

                {/* Khối Nội dung chuyển khoản */}
                <div className="space-y-1 mt-2">
                  <span className="text-[10px] text-slate-400 font-medium block text-left">
                    Nội dung:
                  </span>
                  <div className="flex gap-1">
                    <div className="flex-1 font-black text-center text-xs sm:text-sm py-1.5 px-1.5 rounded-lg border border-dashed select-all uppercase tracking-wider truncate bg-yellow-50 border-yellow-200 text-amber-800">
                      {generatedMemo}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedMemo);
                        setCopiedMemo(true);
                        setTimeout(() => setCopiedMemo(false), 2000);
                      }}
                      className="px-2 rounded-lg text-white transition-all flex items-center justify-center shrink-0 cursor-pointer text-xs font-bold"
                      style={{
                        backgroundColor: appearance.accentColor,
                      }}
                    >
                      {copiedMemo ? (
                        <LucideIcon name="Check" size={12} />
                      ) : (
                        <LucideIcon name="Copy" size={12} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* THANH TOÁN QUA APP: Nằm dưới box chung, dàn ngang dài hết chiều rộng */}
          {/* <div
            className={`p-4 rounded-xl border text-left space-y-2 w-full ${
              isDarkPublic
                ? "bg-slate-900 border-slate-800"
                : "bg-slate-50 border-slate-150"
            }`}
          >
            <div className="space-y-1.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isDarkPublic ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Chọn ứng dụng ngân hàng để thanh toán nhanh:
              </span>
              <div className="flex gap-2 w-full">
                <select
                  value={selectedMobileBank}
                  onChange={(e) => setSelectedMobileBank(e.target.value)}
                  className={`flex-1 p-2.5 rounded-xl border outline-none transition-all text-xs font-bold cursor-pointer min-w-0 ${
                    isDarkPublic
                      ? "bg-slate-850 border-slate-700 text-white"
                      : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                  }`}
                >
                  <option value="mb">MB Bank</option>
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
                  className="px-5 py-2.5 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-xs shrink-0 hover:opacity-90 active:scale-[0.98]"
                  style={{
                    backgroundColor: appearance.accentColor,
                  }}
                >
                  <LucideIcon name="ExternalLink" size={14} />
                  <span>Mở Ứng Dụng</span>
                </button>
              </div>
            </div>
          </div> */}

          {/* Hướng dẫn quy trình */}
          <div
            className={`text-left text-[11px] sm:text-xs leading-relaxed space-y-1.5 p-3 rounded-xl ${
              isDarkPublic ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <p className="font-bold flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              Bước 1: Lưu ảnh QR về thiết bị.
            </p>
            <p className="font-bold flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
              Bước 2: Kiểm tra số tiền chuyển khoản và nội dung đảm bảo chính
              xác.
            </p>
            <p className="font-bold flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 animate-ping" />
              Bước 3: Thực hiện giao dịch.
            </p>
          </div>

          {/* Banner Đang chờ thanh toán */}
          <div className="flex items-center gap-2">
            <div
              className={`flex-1 p-3 rounded-md border flex items-center justify-center gap-2 text-xs font-bold ${
                isDarkPublic
                  ? "bg-slate-900 border-slate-800 text-slate-300"
                  : "bg-emerald-50/50 border-emerald-150 text-emerald-800"
              }`}
            >
              <span className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin shrink-0" />
              <span>Đang chờ chuyển khoản...</span>
            </div>
            <button
              type="button"
              onClick={handleResetDonateForm}
              className="px-3.5 py-3 rounded-md border text-xs font-bold bg-white border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
            >
              <LucideIcon name="RotateCcw" size={13} />
              <span>Đổi số tiền</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
