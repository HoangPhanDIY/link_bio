import React, { useState, useEffect } from "react";
import {
  Volume2,
  Tv,
  Settings,
  Play,
  Copy,
  Check,
  Sparkles,
  Upload,
  VolumeX,
  Clock,
  ExternalLink,
  Music,
  Image as ImageIcon,
  History,
} from "lucide-react";
import { AppearanceSettings } from "../types";
import { supabase, DBDonation, DBUser } from "../supabase";
import { dbService } from "../dbService";

interface StreamTabProps {
  appearance: AppearanceSettings;
  onUpdateAppearance: (updates: Partial<AppearanceSettings>) => void;
  onSaveStreamSettings: () => Promise<void>;
  dbUser: DBUser | null;
}

export default function StreamTab({
  appearance,
  onUpdateAppearance,
  onSaveStreamSettings,
  dbUser,
}: StreamTabProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isUploadingGif, setIsUploadingGif] = useState(false);
  const [isUploadingSound, setIsUploadingSound] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Test state
  const [testName, setTestName] = useState("Nguyễn Văn A");
  const [testAmount, setTestAmount] = useState(50000);
  const [testMessage, setTestMessage] = useState(
    "Chúc bạn live stream vui vẻ và gặt hái nhiều thành công!",
  );

  // List of today's donations
  const [todayDonations, setTodayDonations] = useState<DBDonation[]>([]);
  const [isLoadingDonations, setIsLoadingDonations] = useState(false);

  // Asset reuse lists
  const [historicalGifs, setHistoricalGifs] = useState<string[]>([]);
  const [historicalSounds, setHistoricalSounds] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTab, setHistoryTab] = useState<"gif" | "sound">("gif");

  // System voices list
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Fetch dynamic list of system voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const filtered = voices.filter(
          (v) => v.lang.startsWith("vi") || v.lang.includes("VI"),
        );
        setSystemVoices(filtered);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Fetch today's donations
  const fetchTodayDonations = async () => {
    setIsLoadingDonations(true);
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("ung_ho")
        .select("*")
        .eq("trang_thai", 1)
        .gte("created_at", startOfToday.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      const filtered = (data || []).filter(
        (item) => item.noi_dung_ck !== "test_alert",
      );
      setTodayDonations(filtered);
    } catch (err) {
      console.warn("Lỗi tải danh sách ủng hộ hôm nay:", err);
    } finally {
      setIsLoadingDonations(false);
    }
  };

  // Fetch uploaded historical assets
  const fetchHistoricalAssets = async () => {
    setIsLoadingHistory(true);
    try {
      const { gifs, sounds } = await dbService.listDonateAssets();
      setHistoricalGifs(gifs);
      setHistoricalSounds(sounds);
    } catch (err) {
      console.warn("Lỗi tải lịch sử tài nguyên:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchTodayDonations();
    fetchHistoricalAssets();
  }, []);

  // OBS Link
  const obsLink = `${window.location.origin}?view=stream-overlay`;

  const copyOBSLink = () => {
    navigator.clipboard.writeText(obsLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Upload file function supporting the "donate" folder in bucket
  const uploadToDonateFolder = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      const filePath = `donate/${fileName}`; // Saved in "donate/" folder path inside the "images" bucket

      const { data, error } = await supabase.storage
        .from("images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      // Refresh list of history
      fetchHistoricalAssets();

      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error("Lỗi tải tệp lên bucket Supabase:", err);
      alert(`Không thể tải tệp lên bucket: ${err.message || err}`);
      return null;
    }
  };

  // Upload GIF
  const handleGifUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingGif(true);
    try {
      const publicUrl = await uploadToDonateFolder(file);
      if (publicUrl) {
        onUpdateAppearance({ streamAlertGif: publicUrl });
        window.showNotification?.(
          "Tải lên GIF mới và lưu vào thư mục donate thành công!",
          "success",
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingGif(false);
    }
  };

  // Upload Sound
  const handleSoundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSound(true);
    try {
      const publicUrl = await uploadToDonateFolder(file);
      if (publicUrl) {
        onUpdateAppearance({ streamAlertSound: publicUrl });
        window.showNotification?.(
          "Tải lên âm thanh mới và lưu vào thư mục donate thành công!",
          "success",
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingSound(false);
    }
  };

  // Trigger test alert: directly write to Supabase table (works flawlessly on Vercel & serverless)
  const handleSendTestAlert = async (
    name: string,
    amount: number,
    message: string,
  ) => {
    setIsTesting(true);
    try {
      const { error } = await supabase.from("ung_ho").insert({
        ten_nguoi_ung_ho: name,
        so_tien: amount,
        noi_dung: message,
        phuong_thuc: 0,
        trang_thai: 1, // Active immediately so StreamOverlay catches it via subscription or polling
        noi_dung_ck: "test_alert", // Flagged so it is hidden from stats, admin and history
      });

      if (error) throw error;

      window.showNotification?.(
        "Đã gửi thông báo chạy thử thành công lên OBS Stream Overlay!",
        "success",
      );
    } catch (err: any) {
      console.error("Gửi thông báo test thất bại:", err);
      window.showNotification?.("Lỗi kết nối khi gửi thông báo test.", "error");
    } finally {
      setIsTesting(false);
    }
  };

  // Save Config to DB
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await onSaveStreamSettings();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="stream-tab-container" className="space-y-6">
      {/* Overview Card */}
      <div className=" border border-indigo-500/20 rounded-md p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-black font-semibold text-lg">
              <Tv className="w-5 h-5 animate-pulse" />
              <span>Tích Hợp Live Stream</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                fetchHistoricalAssets();
                setShowHistoryModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-white hover:text-white border rounded-md transition text-sm font-medium"
              style={{ backgroundColor: appearance.accentColor }}
            >
              <History className="w-4 h-4 text-white" />
              <span>Thư viện</span>
            </button>
            <a
              href={obsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-slate-200 hover:text-white border rounded-md transition text-sm font-medium"
              style={{ backgroundColor: appearance.accentColor }}
            >
              <span>Mở Overlay</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* OBS Copy link component */}
        <div className="mt-6 p-4 rounded-md space-y-2">
          <label className="text-xs font-semibold text-black uppercase tracking-wider block">
            Đường dẫn nguồn trình duyệt
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={obsLink}
              className="flex-1 border border-slate-700/80 text-black px-3 py-2 rounded-lg text-xs  focus:outline-none"
            />
            <button
              onClick={copyOBSLink}
              className="px-4 py-2 text-white rounded-md bg- transition text-xs font-semibold flex items-center gap-1 shrink-0"
              style={{ backgroundColor: appearance.accentColor }}
            >
              {isCopied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{isCopied ? "Đã copy" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Settings */}
        <div className="lg:col-span-7 space-y-6">
          <div className="border border-slate-800 rounded-md p-6 shadow-md space-y-6">
            <h3 className="font-semibold text-black flex items-center gap-2 text-base pb-3 border-b border-slate-800">
              <Settings className="w-4.5 h-4.5 text-black" />
              <span>Hiệu ứng thông báo</span>
            </h3>

            {/* GIF Selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-black block">
                  Ảnh động hiển thị
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryTab("gif");
                    setShowHistoryModal(true);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <History className="w-3 h-3" /> Sử dụng lại ảnh cũ
                </button>
              </div>
              <div className="flex gap-4 items-center">
                <div className="w-20 h-20 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={appearance.streamAlertGif || "/giphy.webp"}
                    alt="Alert GIF"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={appearance.streamAlertGif || ""}
                    onChange={(e) =>
                      onUpdateAppearance({ streamAlertGif: e.target.value })
                    }
                    placeholder="URL ảnh động .gif hoặc tệp tải lên"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg transition text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isUploadingGif ? "Đang tải lên..." : "Tải lên tệp GIF"}
                    </span>
                    <input
                      type="file"
                      accept="image/gif,image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleGifUpload}
                      disabled={isUploadingGif}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Sound Selector */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-black block">
                  Âm thanh thông báo
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setHistoryTab("sound");
                    setShowHistoryModal(true);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <History className="w-3 h-3" /> Thư viện
                </button>
              </div>
              <div className="flex flex-col gap-3 w-full">
                {/* Ô input nằm trọn vẹn ở hàng trên */}
                <input
                  type="text"
                  value={appearance.streamAlertSound || ""}
                  onChange={(e) =>
                    onUpdateAppearance({ streamAlertSound: e.target.value })
                  }
                  placeholder="URL âm thanh .mp3 / .wav"
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />

                {/* Hàng chứa 2 nút ở dưới, nằm ngang hàng nhau */}
                <div className="flex gap-2 items-center w-full">
                  {appearance.streamAlertSound && (
                    <button
                      type="button"
                      onClick={() => {
                        const a = new Audio(appearance.streamAlertSound);
                        a.volume = 0.6;
                        a.play().catch((err) => {
                          window.showNotification?.(
                            "Không thể phát âm thanh này. Hãy kiểm tra URL.",
                            "error",
                          );
                        });
                      }}
                      className="flex-1 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold text-center transition"
                    >
                      Nghe thử
                    </button>
                  )}

                  <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg transition text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isUploadingSound ? "Đang tải..." : "Tải lên âm thanh"}
                    </span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleSoundUpload}
                      disabled={isUploadingSound}
                    />
                  </label>
                </div>
              </div>

              {/* Quick direct sound selector for both system and bucket assets */}
              <div className="space-y-2 mt-2 bg-slate-950/40 p-3 rounded-md border border-slate-800/80">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Thư viện âm thanh</span>
                  <span className="text-[10px] text-slate-400">
                    ({historicalSounds.length} tệp đã tải lên)
                  </span>
                </div>
                <div className="max-h-52 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {/* Uploaded sounds in bucket */}
                  {historicalSounds.length > 0 ? (
                    <div>
                      <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1 mt-1">
                        Đã tải lên
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {historicalSounds.map((url, idx) => {
                          const name =
                            url.split("/").pop() || `Sound_${idx + 1}`;
                          const cleanName = decodeURIComponent(name).replace(
                            /^\d+-/,
                            "",
                          );
                          return (
                            <div
                              key={`uploaded-${idx}`}
                              className={`p-2 rounded-lg border flex items-center justify-between gap-1 transition ${
                                appearance.streamAlertSound === url
                                  ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                              }`}
                            >
                              <span
                                className="text-xs truncate max-w-[125px]"
                                title={cleanName}
                              >
                                {cleanName}
                              </span>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const a = new Audio(url);
                                    a.volume = 0.5;
                                    a.play().catch(() => {});
                                  }}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                                  title="Nghe thử"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onUpdateAppearance({
                                      streamAlertSound: url,
                                    });
                                  }}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-semibold"
                                >
                                  Chọn
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 p-4 border border-dashed border-slate-800 rounded-md text-center">
                      Chưa có âm thanh nào được tải lên. Hãy tải lên âm thanh
                      của riêng bạn phía trên để sử dụng!
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Template text */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-black block">
                  Chữ thông báo
                </label>
              </div>
              <input
                type="text"
                value={appearance.streamAlertTemplate || ""}
                onChange={(e) =>
                  onUpdateAppearance({ streamAlertTemplate: e.target.value })
                }
                placeholder="Nhập nội dung (ví dụ: đã ủng hộ bạn, vừa tặng stream...)"
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* TTS Settings section */}
            <div className="space-y-4 p-4 bg-slate-950/50 border border-slate-800/80 rounded-md">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Cấu hình giọng đọc Google
                (TTS)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200 block">
                    Bật đọc giọng nói (TTS)
                  </label>
                  <div className="flex items-center h-10 bg-slate-950 px-3 rounded-lg border border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer w-full select-none text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={appearance.streamAlertTts !== false}
                        onChange={(e) =>
                          onUpdateAppearance({
                            streamAlertTts: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Kích hoạt phát âm thanh đọc</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200 block">
                    Giọng đọc mong muốn
                  </label>
                  <select
                    value={
                      appearance.streamAlertVoiceGender === "default"
                        ? "female"
                        : appearance.streamAlertVoiceGender || "female"
                    }
                    onChange={(e) =>
                      onUpdateAppearance({
                        streamAlertVoiceGender: e.target.value,
                      })
                    }
                    className="w-full h-10 bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="female">Giọng Nữ (Giọng Chị Google)</option>
                    <option value="male">Giọng Nam (Tiếng Việt)</option>
                  </select>
                </div>
              </div>

              {/* Nghe thử giọng đọc button */}
              <div className="pt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    let alertWord =
                      appearance.streamAlertTemplate || "đã ủng hộ bạn";
                    alertWord = alertWord
                      .replace(/{name}/g, "")
                      .replace(/{amount}/g, "")
                      .replace(/Đ/g, "")
                      .replace(/đ/g, "")
                      .replace(/đồng/g, "")
                      .replace(/\s+/g, " ")
                      .trim();

                    if (!alertWord) {
                      alertWord = "đã ủng hộ bạn";
                    }

                    let speakText = `${testName} ${alertWord} ${testAmount.toLocaleString("vi-VN")} đồng`;

                    if (testMessage) {
                      speakText += `. Lời nhắn: ${testMessage}`;
                    }

                    const rawGender =
                      appearance.streamAlertVoiceGender || "female";
                    const gender =
                      rawGender === "default" ? "female" : rawGender;
                    const encodedText = encodeURIComponent(
                      speakText.substring(0, 200),
                    );
                    const googleTtsUrl = `/api/tts?text=${encodedText}&lang=vi&gender=${gender}`;
                    const ttsAudio = new Audio(googleTtsUrl);
                    ttsAudio.volume = 1.0;
                    ttsAudio.play().catch((err) => {
                      console.warn(
                        "Server TTS failed/blocked, falling back to local speech synthesis:",
                        err,
                      );
                      playLocalSpeechSynthesis(speakText);
                    });

                    function playLocalSpeechSynthesis(text: string) {
                      if (!("speechSynthesis" in window)) {
                        (window as any).showNotification?.(
                          "Trình duyệt không hỗ trợ đọc giọng nói.",
                          "error",
                        );
                        return;
                      }
                      try {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(text);
                        utterance.lang = "vi-VN";
                        utterance.rate = 1.0;
                        utterance.pitch = 1.0;

                        const voices = window.speechSynthesis.getVoices();
                        let selectedVoice = null;

                        if (appearance.streamAlertVoiceName) {
                          selectedVoice = voices.find(
                            (v) => v.name === appearance.streamAlertVoiceName,
                          );
                        }

                        if (!selectedVoice) {
                          const viVoices = voices.filter(
                            (v) =>
                              v.lang.startsWith("vi") || v.lang.includes("VI"),
                          );
                          if (appearance.streamAlertVoiceGender === "male") {
                            selectedVoice = viVoices.find(
                              (v) =>
                                v.name.toLowerCase().includes("nam") ||
                                v.name.toLowerCase().includes("male") ||
                                v.name.toLowerCase().includes("minh"),
                            );
                            if (!selectedVoice) {
                              utterance.pitch = 0.75;
                              selectedVoice = viVoices[0];
                            }
                          } else if (
                            appearance.streamAlertVoiceGender === "female"
                          ) {
                            selectedVoice = viVoices.find(
                              (v) =>
                                v.name.toLowerCase().includes("nữ") ||
                                v.name.toLowerCase().includes("female") ||
                                v.name.toLowerCase().includes("lý") ||
                                v.name.toLowerCase().includes("hoaimy"),
                            );
                            if (!selectedVoice) {
                              utterance.pitch = 1.15;
                              selectedVoice = viVoices[0];
                            }
                          } else {
                            selectedVoice =
                              viVoices.find((v) =>
                                v.name.toLowerCase().includes("google"),
                              ) || viVoices[0];
                          }
                        }

                        if (selectedVoice) {
                          utterance.voice = selectedVoice;
                        }

                        window.speechSynthesis.speak(utterance);
                      } catch (e) {
                        console.error(e);
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 rounded-lg transition text-xs font-semibold"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Nghe thử giọng đọc</span>
                </button>
                <span className="text-[10px] text-slate-400 italic">
                  * Nhấp để phát thử giọng đọc theo thiết lập
                </span>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold rounded-md shadow-lg transition text-sm"
              >
                {isSaving
                  ? "Đang lưu cấu hình..."
                  : "Lưu cấu hình và bảng (cau_hinh)"}
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Test Area & Replay List */}
        <div className="lg:col-span-5 space-y-6">
          {/* Test area */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-md p-6 shadow-md space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2 text-base pb-3 border-b border-slate-800">
              <Sparkles className="w-4.5 h-4.5 text-amber-400" />
              <span>Chạy thử thông báo</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">
                  Tên người donate test
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">
                  Số tiền donate test (đ)
                </label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-medium">
                  Lời nhắn test
                </label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() =>
                  handleSendTestAlert(testName, testAmount, testMessage)
                }
                disabled={isTesting}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold rounded-lg transition text-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {isTesting ? "Đang gửi..." : "GỬI TEST LÊN STREAM (OBS)"}
                </span>
              </button>
            </div>
          </div>

          {/* Today's donations list */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-md p-6 shadow-md space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h3 className="font-semibold text-white flex items-center gap-2 text-base">
                <Clock className="w-4.5 h-4.5 text-emerald-400" />
                <span>Đã chuyển hôm nay</span>
              </h3>
              <button
                onClick={fetchTodayDonations}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Làm mới
              </button>
            </div>

            {isLoadingDonations ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Đang tải danh sách ủng hộ...
              </div>
            ) : todayDonations.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                Chưa có ai chuyển khoản hôm nay (trang_thai = 1).
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {todayDonations.map((don) => (
                  <div
                    key={don.id}
                    className="p-3 bg-slate-950/60 rounded-md border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-emerald-400">
                        {don.ten_nguoi_ung_ho || "Ẩn danh"}
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {don.so_tien.toLocaleString("vi-VN")}đ
                      </div>
                      {don.noi_dung && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                          "{don.noi_dung}"
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        handleSendTestAlert(
                          don.ten_nguoi_ung_ho || "Người ủng hộ",
                          don.so_tien,
                          don.noi_dung || "",
                        )
                      }
                      className="px-2.5 py-1 bg-indigo-600/40 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg transition text-[10px] font-semibold shrink-0"
                    >
                      Phát lại Alert
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reusable Asset History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-md overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">Thư viện</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                Đóng ✕
              </button>
            </div>

            {/* Modal Navigation */}
            <div className="flex border-b border-slate-800 bg-slate-950/40">
              <button
                onClick={() => setHistoryTab("gif")}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                  historyTab === "gif"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Ảnh động ({historicalGifs.length})</span>
              </button>
              <button
                onClick={() => setHistoryTab("sound")}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
                  historyTab === "sound"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Music className="w-4 h-4" />
                <span>Âm thanh / Nhạc ({historicalSounds.length})</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {isLoadingHistory ? (
                <div className="text-center py-12 text-slate-400">
                  Đang tải thư viện tài nguyên...
                </div>
              ) : historyTab === "gif" ? (
                historicalGifs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 italic text-sm">
                    Chưa có ảnh nào được tải lên trong thư mục donate/
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {historicalGifs.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onUpdateAppearance({ streamAlertGif: url });
                          setShowHistoryModal(false);
                          window.showNotification?.(
                            "Đã chọn sử dụng lại ảnh động!",
                            "success",
                          );
                        }}
                        className={`group relative aspect-square bg-slate-950 border border-slate-800 rounded-md overflow-hidden hover:border-indigo-500 transition-all ${
                          appearance.streamAlertGif === url
                            ? "ring-2 ring-indigo-500"
                            : ""
                        }`}
                      >
                        <img
                          src={url}
                          alt="Historical resource"
                          className="w-full h-full object-contain p-1"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold bg-indigo-600 px-2 py-1 rounded">
                            CHỌN
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : historicalSounds.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic text-sm">
                  Chưa có âm thanh nào được tải lên trong thư mục donate/
                </div>
              ) : (
                <div className="space-y-2">
                  {historicalSounds.map((url, i) => {
                    const name = url.split("/").pop() || `Sound_${i + 1}`;
                    return (
                      <div
                        key={i}
                        className={`p-3 bg-slate-950/80 border rounded-md flex items-center justify-between gap-3 ${
                          appearance.streamAlertSound === url
                            ? "border-indigo-500"
                            : "border-slate-800"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-slate-200  truncate block">
                            {decodeURIComponent(name)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const a = new Audio(url);
                              a.volume = 0.5;
                              a.play().catch(() => {});
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
                          >
                            Nghe thử
                          </button>
                          <button
                            onClick={() => {
                              onUpdateAppearance({ streamAlertSound: url });
                              setShowHistoryModal(false);
                              window.showNotification?.(
                                "Đã chọn sử dụng lại âm thanh!",
                                "success",
                              );
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                          >
                            Chọn dùng
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
