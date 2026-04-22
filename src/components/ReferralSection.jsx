import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const COPY = {
  en: {
    title: "Unlock Your 2026 Strategy",
    desc: "Copy the link → send to a friend → enter your email → unlock full report",
    copyBtn: "Copy Link",
    copyBtnDone: "Copied! ✓",
    statusCopied: "✓ Link copied! Now enter your email to get the PDF",
    emailPlaceholder: "Your email address",
    getBtn: "Get My PDF",
    saving: "Sending...",
    statusDone: (email) => `✓ PDF report sent to ${email}!`,
    error: "Please enter a valid email address.",
    errorSave: "Failed to save. Please try again.",
  },
  ko: {
    title: "2026 전략 전체 보기",
    desc: "링크를 복사 → 친구에게 카톡/문자로 공유 → 이메일 입력\n→ 2026 전체 전략 즉시 공개",
    copyBtn: "링크 복사",
    copyBtnDone: "복사됨! ✓",
    statusCopied: "✓ 복사됐어요! 이메일을 입력하면 PDF 발송해드려요",
    emailPlaceholder: "이메일 주소",
    getBtn: "PDF 받기",
    saving: "발송 중...",
    statusDone: (email) => `✓ PDF가 ${email}로 발송됐습니다!`,
    error: "올바른 이메일 주소를 입력해주세요.",
    errorSave: "저장 실패. 다시 시도해주세요.",
  },
  zh: {
    title: "解锁2026完整策略",
    desc: "复制链接 → 发给朋友 → 输入邮箱 → 立即解锁完整报告",
    copyBtn: "复制链接",
    copyBtnDone: "已复制! ✓",
    statusCopied: "✓ 链接已复制！输入邮箱即可获取PDF",
    emailPlaceholder: "您的邮箱地址",
    getBtn: "获取PDF",
    saving: "发送中...",
    statusDone: (email) => `✓ PDF报告已发送至 ${email}！`,
    error: "请输入有效的邮箱地址。",
    errorSave: "保存失败，请重试。",
  },
};

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BASE_URL = "https://karmamap-dd922.web.app";
const LS_KEY = "km_ref_code";

export default function ReferralSection({ result, form, lang, db, parseResultData, onUnlock, isUnlocked }) {
  const [refCode, setRefCode] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let code = localStorage.getItem(LS_KEY);
    if (!code) {
      code = nanoid(8);
      localStorage.setItem(LS_KEY, code);
    }
    setRefCode(code);
  }, []);

  const lc = COPY[lang] || COPY.en;
  const referralUrl = refCode ? `${BASE_URL}?ref=${refCode}` : "";
  const displayUrl = refCode ? `karmamap-dd922.web.app?ref=${refCode}` : "생성 중...";

  const handleCopy = async () => {
    if (!referralUrl) return;
    try { await navigator.clipboard.writeText(referralUrl); }
    catch {
      const el = document.createElement("textarea");
      el.value = referralUrl;
      document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setLinkCopied(true);
  };

  const handleSave = async () => {
    setError("");
    if (!VALID_EMAIL.test(email.trim())) { setError(lc.error); return; }
    setSaving(true);
    try {
      const { score, peakYear: py } = parseResultData(result);
      await setDoc(doc(db, "referrals", refCode), {
        email: email.trim().toLowerCase(),
        name: form.name || "",
        lang,
        score: score || "",
        peak_year: py || "",
        completed: true,
        pdfSent: false,
        createdAt: serverTimestamp(),
        completedAt: serverTimestamp(),
      });
      setDone(true);
      localStorage.removeItem(LS_KEY);
      if (onUnlock) onUnlock();
    } catch (e) {
      setError(lc.errorSave);
      console.error("[referral] save error:", e);
    }
    setSaving(false);
  };

  const red = "#c84b2f";
  const fn = "'Cormorant Garamond',serif";
  const rowStyle = { display: "flex", gap: 8, flexWrap: "wrap" };
  const boxStyle = {
    flex: 1, minWidth: 180,
    background: "rgba(255,255,255,0.9)",
    border: `1.5px solid ${error ? red : "rgba(139,105,20,0.35)"}`,
    color: "#2d1810", padding: "11px 14px", borderRadius: 4,
    fontSize: 14, fontFamily: fn, outline: "none",
  };
  const btnStyle = (disabled) => ({
    background: disabled ? "rgba(200,75,47,0.4)" : red,
    color: "#f5e6c8", border: "none",
    padding: "11px 22px", borderRadius: 4, fontSize: 14, fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    fontFamily: "'Cinzel',serif", letterSpacing: 0.5,
    whiteSpace: "nowrap", transition: "all 0.2s",
  });

  if (isUnlocked && done) return null;

  return (
    <div style={{ marginTop: 20, marginBottom: 4 }}>
      <div style={{ background: "rgba(242,232,213,0.97)", border: "2px solid rgba(200,75,47,0.35)", borderRadius: 10, padding: "20px 24px", boxShadow: "0 2px 16px rgba(45,24,16,0.1)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#2d1810", fontFamily: "'Cinzel',serif", margin: "0 0 6px" }}>
          {lc.title}
        </h3>

        {/* Step 1: Show link, copy button */}
        {!linkCopied && !done && (
          <>
            <p style={{ fontSize: 13, color: "rgba(45,24,16,0.6)", fontFamily: fn, marginBottom: 14, lineHeight: 1.7, whiteSpace: "pre-line" }}>
              {lc.desc}
            </p>
            <div style={rowStyle}>
              <div style={{ ...boxStyle, display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "rgba(45,24,16,0.65)", wordBreak: "break-all" }}>{displayUrl}</span>
              </div>
              <button onClick={handleCopy} disabled={!refCode} style={btnStyle(!refCode)}>
                {lc.copyBtn}
              </button>
            </div>
          </>
        )}

        {/* Step 2: Link copied, show email input */}
        {linkCopied && !done && (
          <>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#8b6914", fontFamily: fn, marginBottom: 14, lineHeight: 1.7 }}>
              {lc.statusCopied}
            </p>
            <div style={rowStyle}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                placeholder={lc.emailPlaceholder}
                style={boxStyle}
                onFocus={e => { e.target.style.borderColor = red; }}
                onBlur={e => { e.target.style.borderColor = error ? red : "rgba(139,105,20,0.35)"; }}
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving || !email.trim()}
                style={btnStyle(saving || !email.trim())}
              >
                {saving ? lc.saving : lc.getBtn}
              </button>
            </div>
            {error && <p style={{ fontSize: 12, color: red, marginTop: 6, fontFamily: fn }}>{error}</p>}
          </>
        )}

        {/* Step 3: Done */}
        {done && (
          <p style={{ fontSize: 14, fontWeight: 700, color: "#2d6a2d", fontFamily: fn, marginTop: 4, lineHeight: 1.7 }}>
            {lc.statusDone(email.trim())}
          </p>
        )}
      </div>
    </div>
  );
}
