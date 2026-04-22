import { useState, useCallback } from "react";
import { buildPrompt, parseResultText, QUICK_PROMPTS } from "../lib/aiHandoff";

const PLATFORMS = [
  { id: "chatgpt", label: "ChatGPT", url: "https://chat.openai.com/" },
  { id: "claude",  label: "Claude",  url: "https://claude.ai/" },
  { id: "gemini",  label: "Gemini",  url: "https://gemini.google.com/" },
  { id: "generic", label: "Other AI", url: null },
];

const COPY_LABELS = {
  en: { title: "Continue with Your AI", desc: "Turn this reading into a real action plan. Copy the prompt below and paste it into ChatGPT, Claude, or Gemini.", sub: "This prompt is built from your KarmaMap results. Use it to get a 30/60/90-day plan — not a summary.", short: "Short", full: "Full", more: "More ▼", goalLabel: "Goal-Specific", weeklyLabel: "Weekly", copy: "📋 Copy Prompt", copied: "Copied! ✓", open: "Open Platform ↗", copyFail: "Please copy manually", quickTitle: "Quick prompts — click to copy", score: "Score", peak: "Peak Year", attack: "Attack", defend: "Defend", goal: "Goal", tryAgain: "Try again — regenerate your reading first." },
  ko: { title: "내 AI와 이어가기", desc: "이 리포트를 실제 실행계획으로 바꾸세요. 아래 프롬프트를 복사해 ChatGPT, Claude, Gemini에 붙여넣으세요.", sub: "이 프롬프트는 KarmaMap 결과 기반으로 만들어졌습니다. 30/60/90일 실행계획을 받으세요 — 요약이 아닙니다.", short: "Short", full: "Full", more: "더보기 ▼", goalLabel: "목표별", weeklyLabel: "주간", copy: "📋 프롬프트 복사", copied: "복사됨! ✓", open: "플랫폼 열기 ↗", copyFail: "수동으로 복사해 주세요", quickTitle: "빠른 프롬프트 — 클릭하여 복사", score: "점수", peak: "전성기", attack: "공격", defend: "방어", goal: "목표", tryAgain: "결과를 먼저 생성해주세요." },
};

function gtag_event(name, params) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", name, params);
  }
}

export default function AIHandoffSection({ result, form, lang, theme, primaryColor }) {
  const [platform, setPlatform]         = useState("chatgpt");
  const [promptType, setPromptType]     = useState("short");
  const [showMore, setShowMore]         = useState(false);
  const [copyState, setCopyState]       = useState("idle"); // idle | copied | fail
  const [quickCopied, setQuickCopied]   = useState(null);

  const lc = COPY_LABELS[lang] || COPY_LABELS.en;
  const p = primaryColor;

  const state = { result, form };
  const promptText = buildPrompt(promptType, lang, state);
  const parsed = parseResultText(result || "");
  const quickList = QUICK_PROMPTS[lang] || QUICK_PROMPTS.en;
  const platformInfo = PLATFORMS.find(pl => pl.id === platform);

  const copyToClipboard = useCallback(async (text, onSuccess, onFail) => {
    try {
      await navigator.clipboard.writeText(text);
      onSuccess();
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        onSuccess();
      } catch {
        onFail();
      }
    }
  }, []);

  const handleCopy = () => {
    if (!promptText) return;
    copyToClipboard(
      promptText,
      () => {
        setCopyState("copied");
        gtag_event("ai_handoff_copy", { prompt_type: promptType, platform, lang });
        setTimeout(() => setCopyState("idle"), 2000);
      },
      () => {
        setCopyState("fail");
        setTimeout(() => setCopyState("idle"), 3000);
      }
    );
  };

  const handleOpen = () => {
    if (platformInfo?.url) {
      window.open(platformInfo.url, "_blank", "noopener");
      gtag_event("ai_handoff_open", { platform });
    }
  };

  const handleQuickCopy = (text, idx) => {
    copyToClipboard(
      text,
      () => {
        setQuickCopied(idx);
        gtag_event("ai_handoff_quick_copy", { prompt_index: idx });
        setTimeout(() => setQuickCopied(null), 1800);
      },
      () => {}
    );
  };

  if (!result) return null;

  const cardBg = theme?.cardBg || "rgba(255,255,255,0.05)";
  const border  = theme?.border || "rgba(255,255,255,0.1)";
  const muted   = theme?.muted  || "rgba(255,255,255,0.5)";
  const text    = theme?.text   || "#fff";
  const fn      = theme?.font   || "'Outfit',sans-serif";

  const TAG = { background: `${p}1a`, border: `1px solid ${p}33`, borderRadius: 6, padding: "3px 9px", fontSize: 11, color: text, fontFamily: fn };
  const TAB_ACTIVE   = { background: `${p}22`, border: `1px solid ${p}`, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: text, fontFamily: fn, transition: "all 0.15s" };
  const TAB_INACTIVE = { background: "transparent", border: `1px solid ${border}`, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: muted, fontFamily: fn, transition: "all 0.15s" };

  return (
    <div style={{ marginTop: 36, marginBottom: 8, background: cardBg, border: `1px solid ${border}`, borderRadius: 18, padding: "22px 18px", fontFamily: fn }}>
      <style>{`
        @media(max-width:480px){
          .aih-platforms{display:grid!important;grid-template-columns:1fr 1fr!important;}
          .aih-prompt{max-height:180px!important;}
          .aih-copy{width:100%!important;}
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: text, margin: 0 }}>{lc.title}</h3>
        </div>
        <p style={{ fontSize: 13, color: text, opacity: 0.85, lineHeight: 1.55, marginBottom: 4 }}>{lc.desc}</p>
        <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{lc.sub}</p>
      </div>

      {/* Mini result card */}
      {(parsed.score || parsed.peakYear || form?.goal) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16, padding: "10px 12px", background: `${p}0d`, border: `1px solid ${p}22`, borderRadius: 10 }}>
          {parsed.score && <span style={TAG}>{lc.score} {parsed.score}/100</span>}
          {parsed.peakYear && <span style={TAG}>{lc.peak} {parsed.peakYear}</span>}
          {parsed.attackQ && <span style={TAG}>{lc.attack} {parsed.attackQ} ⚡</span>}
          {parsed.defendQ && <span style={TAG}>{lc.defend} {parsed.defendQ} 🛡</span>}
          {form?.goal && <span style={{...TAG, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{lc.goal}: {form.goal.replace(/\s*\/.*/, "")}</span>}
        </div>
      )}

      {/* Platform tabs */}
      <div className="aih-platforms" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {PLATFORMS.map(pl => (
          <button key={pl.id} style={platform === pl.id ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setPlatform(pl.id)}>
            {pl.label}
          </button>
        ))}
      </div>

      {/* Prompt type buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        {["short", "full"].map(t => (
          <button key={t} style={promptType === t ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setPromptType(t)}>
            {t === "short" ? lc.short : lc.full}
          </button>
        ))}
        <button style={TAB_INACTIVE} onClick={() => setShowMore(v => !v)}>{lc.more}</button>
        {showMore && ["goal", "weekly"].map(t => (
          <button key={t} style={promptType === t ? TAB_ACTIVE : TAB_INACTIVE} onClick={() => setPromptType(t)}>
            {t === "goal" ? lc.goalLabel : lc.weeklyLabel}
          </button>
        ))}
      </div>

      {/* Prompt box */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        {promptText ? (
          <textarea
            readOnly
            value={promptText}
            className="aih-prompt"
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(0,0,0,0.25)", border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px", fontSize: 12, fontFamily: "monospace", color: text, lineHeight: 1.55, resize: "none", maxHeight: 200, minHeight: 100, overflowY: "auto", outline: "none", userSelect: "text" }}
            onFocus={e => e.target.select()}
          />
        ) : (
          <div style={{ padding: "16px", color: muted, fontSize: 13, textAlign: "center" }}>{lc.tryAgain}</div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <button
          onClick={handleCopy}
          className="aih-copy"
          style={{ flex: 1, minWidth: 140, background: copyState === "copied" ? "#22c55e22" : `${p}22`, border: `1px solid ${copyState === "copied" ? "#22c55e" : p}`, borderRadius: 10, padding: "11px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: copyState === "copied" ? "#22c55e" : p, fontFamily: fn, transition: "all 0.2s" }}
        >
          {copyState === "copied" ? lc.copied : copyState === "fail" ? lc.copyFail : lc.copy}
        </button>
        {platformInfo?.url && (
          <button
            onClick={handleOpen}
            style={{ flex: 1, minWidth: 120, background: "transparent", border: `1px solid ${border}`, borderRadius: 10, padding: "11px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: muted, fontFamily: fn, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = p; e.currentTarget.style.color = text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted; }}
          >
            {lc.open}
          </button>
        )}
      </div>

      {/* Quick prompts */}
      <div>
        <div style={{ fontSize: 11, color: muted, marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>{lc.quickTitle}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {quickList.map((q, i) => (
            <button
              key={i}
              onClick={() => handleQuickCopy(q, i)}
              style={{ textAlign: "left", background: "transparent", border: `1px solid ${quickCopied === i ? p : border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: quickCopied === i ? p : muted, cursor: "pointer", fontFamily: fn, transition: "all 0.15s", lineHeight: 1.4 }}
              onMouseEnter={e => { if (quickCopied !== i) { e.currentTarget.style.borderColor = `${p}66`; e.currentTarget.style.color = text; } }}
              onMouseLeave={e => { if (quickCopied !== i) { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted; } }}
            >
              {quickCopied === i ? "✓ Copied" : `↗ ${q}`}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
