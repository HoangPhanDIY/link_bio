import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, DBDonation, DBUser } from "../supabase";
import { dbService } from "../dbService";

export default function StreamOverlay() {
  const [profile, setProfile] = useState<DBUser | null>(null);
  const [streamSettings, setStreamSettings] = useState<any>({
    stream_alert_gif: "/giphy.webp",
    stream_alert_sound:
      "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav",
    stream_alert_template: "{name} đã ủng hộ bạn {amount}Đ",
    stream_alert_tts: true,
    stream_alert_duration: 8,
    stream_alert_voice_gender: "default",
    stream_alert_voice_name: "",
  });

  const [currentAlert, setCurrentAlert] = useState<{
    id: string;
    name: string;
    amount: number;
    message: string;
  } | null>(null);

  const [queue, setQueue] = useState<any[]>([]);
  const displayedIdsRef = useRef<Set<string>>(new Set());
  const isPlayingRef = useRef(false);
  const [showUnlockOverlay, setShowUnlockOverlay] = useState(false);

  // Helper to unlock browser's strict autoplay block (retained as a helper for compatibility but hidden by default)
  const unlockAudio = () => {
    setShowUnlockOverlay(false);

    // Play a quick sound to unlock audio context
    if (streamSettings.stream_alert_sound) {
      const audio = new Audio(streamSettings.stream_alert_sound);
      audio.volume = 0.3;
      audio.play().catch((err) => console.log("Unlock sound failed:", err));
    }

    // Trigger SpeechSynthesis once to unlock web speech API
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        "Đã kích hoạt giọng đọc thành công!",
      );
      utterance.lang = "vi-VN";
      window.speechSynthesis.speak(utterance);
    }
  };

  // 1. Fetch settings from cau_hinh and profile to load alert configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("vai_tro", 1) // Admin (1 is admin, 0 is user)
          .limit(1)
          .maybeSingle();

        if (profileData) {
          setProfile(profileData);
        }

        const settings = await dbService.getStreamAlertSettings();
        if (settings && Object.keys(settings).length > 0) {
          setStreamSettings({
            stream_alert_gif:
              settings.stream_alert_gif ||
              profileData?.stream_alert_gif ||
              "/giphy.webp",
            stream_alert_sound:
              settings.stream_alert_sound ||
              profileData?.stream_alert_sound ||
              "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav",
            stream_alert_template:
              settings.stream_alert_template ||
              profileData?.stream_alert_template ||
              "{name} đã ủng hộ bạn {amount}Đ",
            stream_alert_tts:
              settings.stream_alert_tts !== undefined
                ? settings.stream_alert_tts
                : profileData?.stream_alert_tts !== false,
            stream_alert_duration:
              settings.stream_alert_duration ||
              profileData?.stream_alert_duration ||
              8,
            stream_alert_voice_gender:
              settings.stream_alert_voice_gender || "default",
            stream_alert_voice_name: settings.stream_alert_voice_name || "",
          });
        } else if (profileData) {
          setStreamSettings({
            stream_alert_gif: profileData.stream_alert_gif || "/giphy.webp",
            stream_alert_sound:
              profileData.stream_alert_sound ||
              "https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav",
            stream_alert_template:
              profileData.stream_alert_template ||
              "{name} đã ủng hộ bạn {amount}Đ",
            stream_alert_tts: profileData.stream_alert_tts !== false,
            stream_alert_duration: profileData.stream_alert_duration || 8,
            stream_alert_voice_gender: "default",
            stream_alert_voice_name: "",
          });
        }
      } catch (err) {
        console.warn("Lỗi tải cấu hình live stream:", err);
      }
    }
    loadConfig();
  }, []);

  // 2. Initialize already completed donations so we don't alert pre-existing items on startup
  useEffect(() => {
    async function initializePreExistingDonations() {
      try {
        const { data, error } = await supabase
          .from("ung_ho")
          .select("id")
          .eq("trang_thai", 1);

        if (data) {
          data.forEach((item) => {
            displayedIdsRef.current.add(item.id);
          });
          console.log(
            `Đã nạp ${displayedIdsRef.current.size} lịch sử donate để bỏ qua trùng lặp.`,
          );
        }
      } catch (err) {
        console.warn("Lỗi đồng bộ danh sách donate cũ:", err);
      }
    }
    initializePreExistingDonations();
  }, []);

  // 3. Subscribe to Supabase updates (using pure Realtime subscription for optimal performance without polling overhead)
  useEffect(() => {
    let active = true;

    // Real-time Subscription via Supabase Channel (provides instant sound/TTS on live without polling lag)
    const channel = supabase
      .channel("realtime-donations")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT and UPDATE events
          schema: "public",
          table: "ung_ho",
        },
        (payload) => {
          if (!active) return;
          const item = payload.new as DBDonation;
          if (
            item &&
            item.trang_thai === 1 &&
            !displayedIdsRef.current.has(item.id)
          ) {
            displayedIdsRef.current.add(item.id);
            setQueue((prev) => [
              ...prev,
              {
                id: item.id,
                name: item.ten_nguoi_ung_ho || "Ẩn danh",
                amount: item.so_tien,
                message: item.noi_dung || "",
              },
            ]);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // 4. Alert playback engine
  useEffect(() => {
    if (isPlayingRef.current || queue.length === 0) return;

    isPlayingRef.current = true;
    const nextAlert = queue[0];

    // Remove from queue
    setQueue((prev) => prev.slice(1));
    setCurrentAlert(nextAlert);

    const playNotification = async () => {
      const startTime = Date.now();
      let isChimePlaying = false;
      let isTtsPlaying = false;

      // Safe clean up function
      const finishAlert = () => {
        setCurrentAlert(null);
        isPlayingRef.current = false;
      };

      // Set a maximum safety timeout of 35 seconds to prevent getting stuck
      const safetyTimeout = setTimeout(() => {
        console.warn(
          "Safety timeout triggered: alert was playing for too long, dismissing...",
        );
        finishAlert();
      }, 35000);

      // 1. Play Chime Sound (if configured)
      const playChime = () => {
        return new Promise<void>((resolve) => {
          if (!streamSettings.stream_alert_sound) {
            resolve();
            return;
          }
          try {
            isChimePlaying = true;
            const audio = new Audio(streamSettings.stream_alert_sound);
            audio.volume = 0.6;

            // Resolve when sound finishes, or after 10s if it's super long
            const maxDurationTimer = setTimeout(() => {
              if (isChimePlaying) {
                isChimePlaying = false;
                resolve();
              }
            }, 10000);

            audio.onended = () => {
              clearTimeout(maxDurationTimer);
              if (isChimePlaying) {
                isChimePlaying = false;
                resolve();
              }
            };

            audio.onerror = (e) => {
              console.warn("Lỗi tải/phát âm thanh thông báo:", e);
              clearTimeout(maxDurationTimer);
              isChimePlaying = false;
              resolve();
            };

            audio.play().catch((err) => {
              console.log("Không thể tự động phát nhạc:", err);
              clearTimeout(maxDurationTimer);
              isChimePlaying = false;
              resolve();
            });
          } catch (e) {
            console.error("Lỗi khởi tạo âm thanh:", e);
            isChimePlaying = false;
            resolve();
          }
        });
      };

      // 2. Play TTS (if configured)
      const playTTS = () => {
        return new Promise<void>((resolve) => {
          if (!streamSettings.stream_alert_tts) {
            resolve();
            return;
          }

          // Build TTS text: strictly enforce Vietnamese custom reading syntax: (tên) + (Chữ thông báo) + số tiền rồi đọc nội dung
          let alertWord =
            streamSettings.stream_alert_template || "đã ủng hộ bạn";
          // If the template contains placeholders like {name} or {amount}, strip them out to get the plain alert text
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

          let speakText = `${nextAlert.name} ${alertWord} ${nextAlert.amount.toLocaleString("vi-VN")} đồng`;

          if (nextAlert.message) {
            speakText += `. Lời nhắn: ${nextAlert.message}`;
          }

          const rawGender =
            streamSettings.stream_alert_voice_gender || "female";
          const gender = rawGender === "default" ? "female" : rawGender;

          try {
            isTtsPlaying = true;
            const encodedText = encodeURIComponent(speakText.substring(0, 200));
            const googleTtsUrl = `/api/tts?text=${encodedText}&lang=vi&gender=${gender}`;
            const ttsAudio = new Audio(googleTtsUrl);
            ttsAudio.volume = 1.0;

            const maxTtsTimer = setTimeout(() => {
              if (isTtsPlaying) {
                isTtsPlaying = false;
                resolve();
              }
            }, 25000);

            ttsAudio.onended = () => {
              clearTimeout(maxTtsTimer);
              if (isTtsPlaying) {
                isTtsPlaying = false;
                resolve();
              }
            };

            ttsAudio.onerror = (e) => {
              console.warn(
                "Server TTS failed/blocked, trying direct client-side Google Translate TTS:",
                e,
              );
              clearTimeout(maxTtsTimer);
              isTtsPlaying = false;
              playClientGoogleTTS(speakText, resolve);
            };

            ttsAudio.play().catch((err) => {
              console.warn(
                "Server TTS autoplay failed, trying direct client-side Google Translate TTS:",
                err,
              );
              clearTimeout(maxTtsTimer);
              isTtsPlaying = false;
              playClientGoogleTTS(speakText, resolve);
            });
          } catch (err) {
            console.error(err);
            playClientGoogleTTS(speakText, resolve);
          }
        });
      };

      const playClientGoogleTTS = (text: string, resolveFn: () => void) => {
        try {
          isTtsPlaying = true;
          const encodedText = encodeURIComponent(text.substring(0, 200));
          const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodedText}`;
          const ttsAudio = new Audio(directUrl);
          ttsAudio.volume = 1.0;

          const maxTtsTimer = setTimeout(() => {
            if (isTtsPlaying) {
              isTtsPlaying = false;
              resolveFn();
            }
          }, 25000);

          ttsAudio.onended = () => {
            clearTimeout(maxTtsTimer);
            if (isTtsPlaying) {
              isTtsPlaying = false;
              resolveFn();
            }
          };

          ttsAudio.onerror = (e) => {
            console.warn(
              "Direct client-side Google TTS failed, falling back to local speech synthesis:",
              e,
            );
            clearTimeout(maxTtsTimer);
            isTtsPlaying = false;
            playLocalSpeechSynthesis(text, resolveFn);
          };

          ttsAudio.play().catch((err) => {
            console.warn(
              "Direct client-side Google TTS autoplay failed, falling back to local speech synthesis:",
              err,
            );
            clearTimeout(maxTtsTimer);
            isTtsPlaying = false;
            playLocalSpeechSynthesis(text, resolveFn);
          });
        } catch (err) {
          console.error(
            "Direct client-side Google TTS init failed, falling back to local speech synthesis:",
            err,
          );
          isTtsPlaying = false;
          playLocalSpeechSynthesis(text, resolveFn);
        }
      };

      const playLocalSpeechSynthesis = (
        text: string,
        resolveFn: () => void,
      ) => {
        if (!("speechSynthesis" in window)) {
          resolveFn();
          return;
        }

        try {
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(text);
          // Store utterance in a global property to prevent Chrome garbage-collection bug (crucial for OBS browser source)
          (window as any)._activeUtterance = utterance;
          utterance.lang = "vi-VN";
          utterance.rate = 1.0;
          utterance.pitch = 1.0;

          const voices = window.speechSynthesis.getVoices();
          let selectedVoice = null;

          if (streamSettings.stream_alert_voice_name) {
            selectedVoice = voices.find(
              (v) => v.name === streamSettings.stream_alert_voice_name,
            );
          }

          if (!selectedVoice) {
            const viVoices = voices.filter(
              (v) => v.lang.startsWith("vi") || v.lang.includes("VI"),
            );

            if (streamSettings.stream_alert_voice_gender === "male") {
              selectedVoice = viVoices.find(
                (v) =>
                  v.name.toLowerCase().includes("nam") ||
                  v.name.toLowerCase().includes("male") ||
                  v.name.toLowerCase().includes("minh"),
              );
              if (!selectedVoice) {
                utterance.pitch = 0.75;
                utterance.rate = 0.95;
                selectedVoice = viVoices[0];
              }
            } else if (streamSettings.stream_alert_voice_gender === "female") {
              selectedVoice = viVoices.find(
                (v) =>
                  v.name.toLowerCase().includes("nữ") ||
                  v.name.toLowerCase().includes("female") ||
                  v.name.toLowerCase().includes("lý") ||
                  v.name.toLowerCase().includes("linh") ||
                  v.name.toLowerCase().includes("an") ||
                  v.name.toLowerCase().includes("hoaimy") ||
                  v.name.toLowerCase().includes("google"),
              );
              if (!selectedVoice) {
                utterance.pitch = 1.15;
                selectedVoice = viVoices[0];
              }
            } else {
              selectedVoice =
                viVoices.find((v) => v.name.toLowerCase().includes("google")) ||
                viVoices[0];
            }
          }

          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }

          let localTtsPlaying = true;
          const maxLocalTtsTimer = setTimeout(() => {
            if (localTtsPlaying) {
              localTtsPlaying = false;
              resolveFn();
            }
          }, 20000);

          utterance.onend = () => {
            clearTimeout(maxLocalTtsTimer);
            if (localTtsPlaying) {
              localTtsPlaying = false;
              resolveFn();
            }
          };

          utterance.onerror = (e) => {
            console.warn("Local speech synthesis error on utterance:", e);
            clearTimeout(maxLocalTtsTimer);
            if (localTtsPlaying) {
              localTtsPlaying = false;
              resolveFn();
            }
          };

          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.error("Local speech synthesis execution error:", e);
          resolveFn();
        }
      };

      // Execute sequential steps
      await playChime();
      await playTTS();

      // Ensure the alert is shown for at least stream_alert_duration seconds
      const elapsed = Date.now() - startTime;
      let durationSecs = Number(streamSettings.stream_alert_duration);
      if (isNaN(durationSecs) || durationSecs <= 0) {
        durationSecs = 8;
      }
      const minDuration = durationSecs * 1000;
      if (elapsed < minDuration) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, minDuration - elapsed),
        );
      }

      // Clear safety timeout and finish!
      clearTimeout(safetyTimeout);
      finishAlert();
    };

    playNotification();
  }, [queue, currentAlert, streamSettings]);

  return (
    <div
      id="stream-overlay-root"
      className="relative w-screen h-screen bg-transparent flex flex-col items-center justify-center overflow-hidden select-none"
    >
      {/* 1. Unlock Autoplay Interaction Screen */}
      {showUnlockOverlay && (
        <div
          className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center pointer-events-auto cursor-pointer"
          onClick={unlockAudio}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-md p-8 rounded-3xl border border-indigo-500/30 bg-slate-900/80 shadow-[0_0_50px_rgba(99,102,241,0.2)] space-y-6 flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-indigo-600/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400 animate-bounce">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                Kích hoạt âm thanh & giọng đọc
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Trình duyệt yêu cầu bạn tương tác với màn hình một lần để cho
                phép phát âm thanh thông báo và đọc giọng nói tự động.
              </p>
            </div>

            <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition transform hover:scale-105">
              🔊 Click để kích hoạt âm thanh
            </button>

            <span className="text-[11px] text-slate-500">
              * Đối với OBS: Click chuột phải vào Browser Source → Chọn "Tương
              tác" (Interact) rồi bấm nút này.
            </span>
          </motion.div>
        </div>
      )}

      {/* 2. Main Alert Overlay Content */}
      <div className="w-full h-full flex items-center justify-center pointer-events-none">
        <AnimatePresence>
          {currentAlert && (
            <motion.div
              key={currentAlert.id}
              initial={{ opacity: 0, y: 100, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -100, scale: 0.8 }}
              transition={{ type: "spring", damping: 15, stiffness: 100 }}
              className="flex flex-col items-center text-center space-y-4 max-w-xl p-8 rounded-3xl bg-slate-950/95 border-2 border-indigo-500 shadow-[0_0_50px_rgba(79,70,229,0.3)] backdrop-blur-md"
            >
              {/* Custom Alert Gif */}
              <div className="w-56 h-56 flex items-center justify-center overflow-hidden rounded-2xl bg-black/40">
                <img
                  src={streamSettings.stream_alert_gif}
                  alt="Alert Effect"
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Alert content */}
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-amber-400 tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-pulse-subtle">
                  {(() => {
                    const cleanTemplate =
                      streamSettings.stream_alert_template || "đã ủng hộ bạn";
                    if (
                      cleanTemplate.includes("{name}") ||
                      cleanTemplate.includes("{amount}")
                    ) {
                      return cleanTemplate
                        .replace("{name}", currentAlert.name)
                        .replace(
                          "{amount}",
                          currentAlert.amount.toLocaleString("vi-VN"),
                        );
                    }
                    return `${currentAlert.name} ${currentAlert.amount.toLocaleString("vi-VN")}đ ${cleanTemplate}`;
                  })()}
                </h2>
                {currentAlert.message && (
                  <div className="px-6 py-3 bg-slate-900/80 border border-indigo-500/10 rounded-xl">
                    <p className="text-base text-slate-200 font-medium italic drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                      "{currentAlert.message}"
                    </p>
                  </div>
                )}
              </div>

              {/* Accent light shine effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent rounded-3xl pointer-events-none" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
