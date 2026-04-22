import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AIHandoffSection from "./components/AIHandoffSection";
import ReferralSection from "./components/ReferralSection";
import { db } from "./lib/firebase";
import { recordReferralVisit, markReferralCompleted, getVisitorId } from "./lib/referral";
import { collection, addDoc, query, orderBy, limit, onSnapshot, updateDoc, doc, increment, serverTimestamp, getDoc, setDoc } from "firebase/firestore";

const THEMES = {
  en: { bg:"linear-gradient(135deg,#0a0a14 0%,#1a0533 50%,#0a1a3a 100%)", primary:"#ff3cac", secondary:"#784ba0", accent:"#2b86c5", cardBg:"rgba(255,255,255,0.05)", border:"rgba(255,255,255,0.1)", text:"#ffffff", muted:"rgba(255,255,255,0.5)", font:"'Outfit',sans-serif", name:"Dark Cosmic" },
  ko: { bg:"linear-gradient(135deg,#0a0a08 0%,#1a1408 50%,#0f0f0a 100%)", primary:"#d4a017", secondary:"#8b6914", accent:"#c4860a", cardBg:"rgba(212,160,23,0.06)", border:"rgba(212,160,23,0.15)", text:"#f5e6c8", muted:"rgba(245,230,200,0.5)", font:"'Cormorant Garamond',serif", name:"K-미스틱" },
  zh: { bg:"linear-gradient(135deg,#1a0000 0%,#3d0000 50%,#1a0808 100%)", primary:"#ff2a2a", secondary:"#cc0000", accent:"#ffd700", cardBg:"rgba(255,42,42,0.08)", border:"rgba(255,42,42,0.2)", text:"#fff5f5", muted:"rgba(255,245,245,0.5)", font:"'Cormorant Garamond',serif", name:"Red Luxury" },
  ms: { bg:"linear-gradient(135deg,#001a0a 0%,#003d1a 50%,#001408 100%)", primary:"#00c896", secondary:"#008f6a", accent:"#ffd700", cardBg:"rgba(0,200,150,0.06)", border:"rgba(0,200,150,0.15)", text:"#f0fff8", muted:"rgba(240,255,248,0.5)", font:"'Outfit',sans-serif", name:"Emerald Modern" },
  in: { bg:"linear-gradient(135deg,#1a0800 0%,#3d1a00 50%,#1a0f00 100%)", primary:"#ff8c00", secondary:"#cc6600", accent:"#20b2aa", cardBg:"rgba(255,140,0,0.08)", border:"rgba(255,140,0,0.2)", text:"#fff8f0", muted:"rgba(255,248,240,0.5)", font:"'Outfit',sans-serif", name:"Orange Vedic" },
};

const LANG_CONFIG = {
  en:{flag:"🌍",code:"EN",nativeName:"English",theme:"en"},
  ko:{flag:"🇰🇷",code:"KR",nativeName:"한국어",theme:"ko"},
  zh:{flag:"🇨🇳",code:"ZH",nativeName:"中文(简体)",theme:"zh"},
  tw:{flag:"🇹🇼",code:"TW",nativeName:"中文(繁體)",theme:"zh"},
  jp:{flag:"🇯🇵",code:"JP",nativeName:"日本語",theme:"en"},
  vn:{flag:"🇻🇳",code:"VN",nativeName:"Tiếng Việt",theme:"en"},
  th:{flag:"🇹🇭",code:"TH",nativeName:"ภาษาไทย",theme:"en"},
  id:{flag:"🇮🇩",code:"ID",nativeName:"Bahasa Indonesia",theme:"ms"},
  ms:{flag:"🇲🇾",code:"MY",nativeName:"Bahasa Melayu",theme:"ms"},
  ph:{flag:"🇵🇭",code:"PH",nativeName:"Filipino",theme:"en"},
  in:{flag:"🇮🇳",code:"IN",nativeName:"हिन्दी",theme:"in"},
  bn:{flag:"🇧🇩",code:"BN",nativeName:"বাংলা",theme:"en"},
};

const FORTUNE_SYSTEMS = [
  {id:"saju",label:"Four Pillars",sub:"사주팔자",callig:"四柱",calligColor:"#c84b2f"},
  {id:"numerology",label:"Numerology",sub:"수비학",callig:"數",calligColor:"#8b6914"},
  {id:"western",label:"Western Astrology",sub:"서양 점성술",callig:"★",calligColor:"#4a7c6f"},
  {id:"vedic",label:"Vedic Jyotish",sub:"베딕 점성술",callig:"☸",calligColor:"#c84b2f"},
];


const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

const RL = {
  en: { loadingLabels:["2026 Destiny Analysis","Career Peak Years","Deep Strategy"] },
  ko: { loadingLabels:["2026 운명 분석","커리어 황금기 분석","심층 전략 수립"] },
  zh: { loadingLabels:["2026运势分析","事业黄金期分析","深度战略制定"] },
};

const ST = {
  en: { s2026:"◈ 2026 Career Destiny Analysis", peaks:"◈ Career Peak Years TOP 5", quarterly:"◈ 2026 Quarterly Strategy", crisis:"◈ Crises to Overcome", limits:"◈ Blind Spots", meet:"◈ Who to Meet", learn:"◈ What to Learn", final:"◈ The Strategist's Final Word" },
  ko: { s2026:"◈ 2026 커리어 운명 분석", peaks:"◈ 커리어 황금기 TOP 5", quarterly:"◈ 2026 분기별 전략", crisis:"◈ 반드시 극복할 위기", limits:"◈ 나의 한계점", meet:"◈ 반드시 만나야 할 사람", learn:"◈ 반드시 배워야 할 것", final:"◈ 책사의 최종 한마디" },
  zh: { s2026:"◈ 2026年事业命运分析", peaks:"◈ 事业黄金期 TOP 5", quarterly:"◈ 2026年度分季策略", crisis:"◈ 必须克服的危机", limits:"◈ 我的局限", meet:"◈ 必须结识的人", learn:"◈ 必须学习的事", final:"◈ 策士的最终之言" },
};

const SYSTEM_MAP = { saju:"사주(四柱)", numerology:"수비학(Numerology)", western:"서양 점성술(Western Astrology)", vedic:"베딕 점성술(Vedic Jyotish)" };

const T = {
  en:{tagline:"Your peak year is already decided.",tagline2:"Do you know when it is?",subtitle:"Not a horoscope. A career timing report.",microCopy:"Results in 30 seconds. No payment required.",startBtn:"Find My Peak Year",step1:"Personal Info",step2:"Career",step3:"Analysis Method",dobLabel:"Date of Birth",nameLabel:"Your Name",timeLabel:"Birth Time (optional)",timePlaceholder:"e.g. 14:30",placeLabel:"Birth City",placePlaceholder:"Search city...",jobLabel:"Current Job / Role",jobPlaceholder:"e.g. CFO, Engineer, Designer, Student...",expLabel:"Years of Experience",goalLabel:"Current Goal",selectGoal:"Select your goal",systemLabel:"Select Fortune Systems (multi-select)",nextBtn:"Next →",backBtn:"← Back",generateBtn:"Begin My Reading",loadingTexts:["Calculating Four Pillars...","Reading the stars...","Mapping career peaks...","Cross-referencing systems...","Building your strategy..."],resultTitle:"Your Destiny & Career Report",tabs:["2026 Overview","Career Peaks","Deep Strategy","AI Chat"],chatPlaceholder:"Ask anything about your reading...",sendBtn:"Send",chatIntro:"I've analyzed your destiny report. What would you like to explore?",shareBtn:"🔗 Share",downloadBtn:"📄 PDF",referralTitle:"Get Your Full PDF Report — Free",referralDesc:"Share with 1 friend → they complete their reading → we email you the full PDF report.",referralEmailPlaceholder:"Your email address",referralSendBtn:"Send PDF & Copy Link",referralCopyBtn:"Copy Link",referralCopied:"Copied!",referralEmailSent:"PDF sent! Check your inbox.",referralBannerTitle:"🎁 Your friend shared their KarmaMap reading!",referralBannerDesc:"Generating your personalized destiny report...",adLabel:"Advertisement",cardBtn:"✨ Share Card",cardTitle:"Your 2026 Destiny Card",cardDownload:"⬇ Save Image",cardShare:"Share",cardScoreLabel:"Fortune Score",cardPeakLabel:"Career Peak",cardGoalLabel:"Goal",cardTagline:"karmamap.app",commentsTitle:"What others discovered 🔮",commentPeakPrefix:"Peak Year:",commentScorePrefix:"2026:",commentNamePlaceholder:"Your name (optional)",commentTextPlaceholder:"Add a comment... (optional)",commentSubmit:"Post",commentEmpty:"Be the first to share your destiny!",commentLangFilter:"My language first",commentPosted:"Posted! ✓",commentSpam:"Please wait before posting again (max 3/hour).",commentError:"Failed to post. Try again.",commentAnon:"Anonymous"},
  ko:{tagline:"당신의 전성기는 정해져 있습니다.",tagline2:"언제인지 알고 있나요?",subtitle:"사주, 별자리, 수비학으로 당신의 정확한 커리어 전성기를 찾습니다 — TOP 5 전성기 연도, 2026 공격/방어 타이밍, 그리고 가장 중요한 날짜.",microCopy:"30초 안에 결과 확인. 결제 불필요.",startBtn:"내 전성기 찾기",step1:"기본 정보",step2:"커리어",step3:"분석 방식",dobLabel:"생년월일",nameLabel:"이름",timeLabel:"태어난 시간 (선택)",timePlaceholder:"예: 14:30",placeLabel:"출생지",placePlaceholder:"도시 검색...",jobLabel:"현재 하는 일",jobPlaceholder:"예: CFO, 엔지니어, 디자이너, 학생...",expLabel:"경력 연수",goalLabel:"현재 목표",selectGoal:"목표를 선택하세요",systemLabel:"운세 시스템 선택 (복수 선택 가능)",nextBtn:"다음 →",backBtn:"← 이전",generateBtn:"운세 생성하기 ✨",loadingTexts:["사주를 계산하는 중...","별의 흐름을 읽는 중...","커리어 전성기 분석 중...","시스템 교차 분석 중...","전략을 수립하는 중..."],resultTitle:"나의 운명 & 커리어 리포트",tabs:["2026 개요","커리어 전성기","심층 전략","AI 채팅"],chatPlaceholder:"리포트에 대해 더 물어보세요...",sendBtn:"전송",chatIntro:"운명 리포트 분석이 완료됐어요. 더 깊이 탐구하고 싶은 게 있나요?",shareBtn:"🔗 공유하기",downloadBtn:"📄 PDF",referralTitle:"공유하고 PDF 받기",referralDesc:"친구에게 링크를 공유하면 친구는 무료 리포트를 받고, 나는 PDF를 이메일로 받을 수 있어요.",referralEmailPlaceholder:"내 이메일 주소",referralSendBtn:"PDF 전송 & 링크 복사",referralCopyBtn:"링크 복사",referralCopied:"복사됨!",referralEmailSent:"PDF 전송 완료! 이메일을 확인하세요.",referralBannerTitle:"🎁 친구가 KarmaMap 리포트를 공유했어요!",referralBannerDesc:"나만의 운명 리포트를 생성하는 중...",adLabel:"광고",cardBtn:"✨ 카드 공유",cardTitle:"나의 2026 운명 카드",cardDownload:"⬇ 이미지 저장",cardShare:"공유하기",cardScoreLabel:"운세 점수",cardPeakLabel:"커리어 전성기",cardGoalLabel:"목표",cardTagline:"karmamap.app",commentsTitle:"다른 사람들의 발견 🔮",commentPeakPrefix:"전성기:",commentScorePrefix:"2026:",commentNamePlaceholder:"이름 (선택사항)",commentTextPlaceholder:"코멘트 추가... (선택사항)",commentSubmit:"등록",commentEmpty:"첫 번째로 운명을 공유해보세요!",commentLangFilter:"내 언어 먼저",commentPosted:"등록 완료! ✓",commentSpam:"잠시 후 다시 시도해주세요 (시간당 최대 3개).",commentError:"등록 실패. 다시 시도해주세요.",commentAnon:"익명"},
  zh:{tagline:"你的事业顶峰早已注定。",tagline2:"你知道是哪一年吗？",subtitle:"AI通过你的四柱、星象和数字，精准定位你的事业窗口 — TOP 5 顶峰年份、2026年进攻与防守时机，以及最重要的那个日期。",microCopy:"30秒出结果。无需付费。",startBtn:"找到我的顶峰年 — 免费",step1:"基本信息",step2:"职业",step3:"分析方式",dobLabel:"出生日期",nameLabel:"姓名",timeLabel:"出生时间（可选）",timePlaceholder:"例：14:30",placeLabel:"出生地",placePlaceholder:"搜索城市...",jobLabel:"目前职业",jobPlaceholder:"例：CFO, 工程师, 设计师, 学生...",expLabel:"工作年限",goalLabel:"当前目标",selectGoal:"选择你的目标",systemLabel:"选择命理系统（可多选）",nextBtn:"下一步 →",backBtn:"← 返回",generateBtn:"生成我的命盘 ✨",loadingTexts:["计算四柱中...","阅读星象中...","分析事业顶峰...","交叉分析系统...","制定战略中..."],resultTitle:"我的命运与事业报告",tabs:["2026运势","事业顶峰","深度战略","AI对话"],chatPlaceholder:"继续询问关于你的命盘...",sendBtn:"发送",chatIntro:"我已分析完你的命运报告。你想深入探索哪方面？",shareBtn:"🔗 分享",downloadBtn:"📄 PDF",referralTitle:"分享并获取PDF",referralDesc:"将链接分享给朋友，朋友可免费获得完整报告，您将收到PDF邮件。",referralEmailPlaceholder:"您的邮箱地址",referralSendBtn:"发送PDF并复制链接",referralCopyBtn:"复制链接",referralCopied:"已复制!",referralEmailSent:"PDF已发送！请查收邮件。",referralBannerTitle:"🎁 您的朋友分享了KarmaMap报告！",referralBannerDesc:"正在为您生成专属命运报告...",adLabel:"广告",cardBtn:"✨ 分享卡片",cardTitle:"我的2026命运卡",cardDownload:"⬇ 保存图片",cardShare:"分享",cardScoreLabel:"运势得分",cardPeakLabel:"事业顶峰",cardGoalLabel:"目标",cardTagline:"karmamap.app",commentsTitle:"其他人的发现 🔮",commentPeakPrefix:"事业顶峰:",commentScorePrefix:"2026:",commentNamePlaceholder:"姓名（可选）",commentTextPlaceholder:"添加评论...（可选）",commentSubmit:"发布",commentEmpty:"成为第一个分享命运的人！",commentLangFilter:"我的语言优先",commentPosted:"发布成功! ✓",commentSpam:"请稍后再试（每小时最多3条）。",commentError:"发布失败，请重试。",commentAnon:"匿名"},
  ms:{tagline:"Tahun puncak kerjaya anda sudah ditentukan.",tagline2:"Adakah anda tahu bilanya?",subtitle:"AI membaca saju, bintang & nombor anda untuk mencari tingkap kerjaya tepat anda — TOP 5 tahun puncak, masa serangan vs pertahanan 2026, dan tarikh terpenting.",microCopy:"Keputusan dalam 30 saat. Tiada bayaran diperlukan.",startBtn:"Cari Tahun Puncak Saya — Percuma",step1:"Maklumat Peribadi",step2:"Kerjaya",step3:"Kaedah Analisis",dobLabel:"Tarikh Lahir",nameLabel:"Nama Anda",timeLabel:"Masa Lahir (pilihan)",timePlaceholder:"cth: 14:30",placeLabel:"Bandar Kelahiran",placePlaceholder:"Cari bandar...",jobLabel:"Pekerjaan / Industri",jobPlaceholder:"cth: Kewangan, Teknologi...",expLabel:"Tahun Pengalaman",goalLabel:"Matlamat Semasa",selectGoal:"Pilih matlamat anda",systemLabel:"Pilih Sistem Ramalan (pelbagai pilihan)",nextBtn:"Seterusnya →",backBtn:"← Kembali",generateBtn:"Jana Nasib Saya ✨",loadingTexts:["Mengira Empat Tiang...","Membaca bintang...","Memetakan puncak kerjaya...","Analisis silang sistem...","Membina strategi..."],resultTitle:"Laporan Nasib & Kerjaya Anda",tabs:["2026 Nasib","Puncak Kerjaya","Strategi Mendalam","AI Chat"],chatPlaceholder:"Tanya apa sahaja tentang bacaan anda...",sendBtn:"Hantar",chatIntro:"Saya telah menganalisis laporan nasib anda.",shareBtn:"🔗 Kongsi",downloadBtn:"📄 PDF",referralTitle:"Kongsi & Dapatkan PDF",referralDesc:"Kongsi pautan dengan rakan — mereka dapat laporan percuma, anda dapat PDF.",referralEmailPlaceholder:"Alamat e-mel anda",referralSendBtn:"Hantar PDF & Salin Pautan",referralCopyBtn:"Salin Pautan",referralCopied:"Disalin!",referralEmailSent:"PDF dihantar! Semak e-mel anda.",referralBannerTitle:"🎁 Rakan anda berkongsi laporan KarmaMap!",referralBannerDesc:"Menjana laporan nasib anda...",adLabel:"Iklan",cardBtn:"✨ Kad Kongsi",cardTitle:"Kad Nasib 2026 Anda",cardDownload:"⬇ Simpan Gambar",cardShare:"Kongsi",cardScoreLabel:"Skor Nasib",cardPeakLabel:"Puncak Kerjaya",cardGoalLabel:"Matlamat",cardTagline:"karmamap.app",commentsTitle:"Penemuan orang lain 🔮",commentPeakPrefix:"Tahun Puncak:",commentScorePrefix:"2026:",commentNamePlaceholder:"Nama anda (pilihan)",commentTextPlaceholder:"Tambah komen... (pilihan)",commentSubmit:"Hantar",commentEmpty:"Jadilah yang pertama berkongsi nasib anda!",commentLangFilter:"Bahasa saya dahulu",commentPosted:"Berjaya dihantar! ✓",commentSpam:"Sila tunggu sebentar (maks 3/jam).",commentError:"Gagal hantar. Cuba lagi.",commentAnon:"Tanpa Nama"},
  in:{tagline:"Your peak year is already written in the stars.",tagline2:"Do you know when it is?",subtitle:"AI reads your Jyotish, saju & numerology to find your exact career windows — Top 5 peak years, 2026 attack vs defend timing, and the one date that matters most.",microCopy:"Results in 30 seconds. No payment required.",startBtn:"Find My Peak Year",step1:"Personal Info",step2:"Career",step3:"Analysis Method",dobLabel:"Date of Birth",nameLabel:"Your Name",timeLabel:"Birth Time (optional)",timePlaceholder:"e.g. 14:30",placeLabel:"Birth City",placePlaceholder:"Search city...",jobLabel:"Current Job / Industry",jobPlaceholder:"e.g. IT, Finance, Business...",expLabel:"Years of Experience",goalLabel:"Current Goal",selectGoal:"Select your goal",systemLabel:"Select Fortune Systems (multi-select)",nextBtn:"Next →",backBtn:"← Back",generateBtn:"Generate My Kundli ✨",loadingTexts:["Calculating Kundli...","Reading planetary positions...","Mapping career dashas...","Cross-referencing systems...","Building your strategy..."],resultTitle:"Your Destiny & Career Report",tabs:["2026 Fortune","Career Peaks","Deep Strategy","AI Chat"],chatPlaceholder:"Ask anything about your reading...",sendBtn:"Send",chatIntro:"I've analyzed your destiny report.",shareBtn:"🔗 Share",downloadBtn:"📄 PDF",referralTitle:"Share & Get PDF",referralDesc:"Share this link with a friend — they get a free full reading instantly. Enter your email to receive your PDF report.",referralEmailPlaceholder:"Your email address",referralSendBtn:"Send PDF & Copy Link",referralCopyBtn:"Copy Link",referralCopied:"Copied!",referralEmailSent:"PDF sent! Check your inbox.",referralBannerTitle:"🎁 Your friend shared their KarmaMap reading!",referralBannerDesc:"Generating your personalized destiny report...",adLabel:"Advertisement",cardBtn:"✨ Share Card",cardTitle:"Your 2026 Destiny Card",cardDownload:"⬇ Save Image",cardShare:"Share",cardScoreLabel:"Fortune Score",cardPeakLabel:"Career Peak",cardGoalLabel:"Goal",cardTagline:"karmamap.app",commentsTitle:"What others discovered 🔮",commentPeakPrefix:"Peak Year:",commentScorePrefix:"2026:",commentNamePlaceholder:"Your name (optional)",commentTextPlaceholder:"Add a comment... (optional)",commentSubmit:"Post",commentEmpty:"Be the first to share your destiny!",commentLangFilter:"My language first",commentPosted:"Posted! ✓",commentSpam:"Please wait before posting again (max 3/hour).",commentError:"Failed to post. Try again.",commentAnon:"Anonymous"},
};

export default function KarmaMap() {
  const [lang, setLang] = useState("en");
  const [step, setStep] = useState("landing");
  const [formStep, setFormStep] = useState(1);
  const [form, setForm] = useState({dob:"",time:"",city:"",systems:["saju","numerology"],name:"",job:""});
  const [dobY, setDobY] = useState("");
  const [dobM, setDobM] = useState("");
  const [dobD, setDobD] = useState("");
  const [birthH, setBirthH] = useState("");
  const [birthMin, setBirthMin] = useState("");
  const [result, setResult] = useState("");
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isReferral, setIsReferral] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentPosted, setCommentPosted] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [langFilter, setLangFilter] = useState(true);
  const [userReactions, setUserReactions] = useState({});
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const chatEndRef = useRef(null);
  const cardCanvasRef = useRef(null);
  const starCanvasRef = useRef(null);
  const langDropdownRef = useRef(null);
  const theme = { ...THEMES[LANG_CONFIG[lang]?.theme||"en"], primary:"#c84b2f", secondary:"#8b6914", text:"#2d1810", muted:"rgba(45,24,16,0.5)", cardBg:"rgba(242,232,213,0.82)", border:"rgba(139,105,20,0.3)", accent:"#8b6914", font:"'Cormorant Garamond',serif" };
  const t = T[lang] || (lang==="tw"?T.zh:lang==="id"?T.ms:T.en);

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [chatMessages]);

  useEffect(() => {
    const handler = (e) => { if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) setLangDropdownOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Star particle background ──
  useEffect(() => {
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const starColor = lang==="ko"?"212,160,23":lang==="zh"?"255,200,100":lang==="ms"?"0,200,150":lang==="in"?"255,140,0":"255,60,172";
    const NUM = 110;
    const stars = Array.from({length:NUM}, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.2,
      op: Math.random() * 0.55 + 0.15,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      tw: Math.random() * Math.PI * 2,
      tws: Math.random() * 0.018 + 0.004,
      gold: Math.random() < 0.18,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(star => {
        star.x += star.vx; star.y += star.vy; star.tw += star.tws;
        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;
        const op = star.op * (0.55 + 0.45 * Math.sin(star.tw));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = star.gold ? `rgba(${starColor},${op})` : `rgba(255,255,255,${op * 0.7})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, [lang]);

  useEffect(() => {
    if (dobY && dobM && dobD) {
      setForm(f => ({...f, dob: `${dobY}-${String(dobM).padStart(2,"0")}-${String(dobD).padStart(2,"0")}`}));
    } else {
      setForm(f => ({...f, dob: ""}));
    }
  }, [dobY, dobM, dobD]);

  useEffect(() => {
    if (birthH !== "" && birthMin !== "") {
      setForm(f => ({...f, time: `${String(birthH).padStart(2,"0")}:${String(birthMin).padStart(2,"0")}`}));
    }
  }, [birthH, birthMin]);

  const getDaysInMonth = (y, m) => (!y || !m) ? 31 : new Date(parseInt(y), parseInt(m), 0).getDate();


  const toggleSystem = (id) => setForm(f => ({...f, systems: f.systems.includes(id) ? f.systems.filter(s=>s!==id) : [...f.systems,id]}));

  const LANG_NAME = (l) => ({ko:"Korean",zh:"Chinese (Simplified)",tw:"Chinese (Traditional)",ms:"Malay",in:"Hindi",id:"Indonesian",jp:"Japanese",vn:"Vietnamese",th:"Thai",ph:"Filipino",bn:"Bengali"})[l] || "English";

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  const buildPrompt1 = (f, l) => {
    const [year, month, day] = f.dob ? f.dob.split('-') : ['?','?','?'];
    const name = f.name || '미입력';
    const time = f.time || '미입력';
    const city = f.city || '미입력';
    const job = f.job || '미입력';
    const lang = LANG_NAME(l);
    const systems = (f.systems||[]).map(s=>SYSTEM_MAP[s]||s).join(', ') || '사주, 서양 점성술, 수비학, 베딕 점성술';
    return `너는 지금부터 나의 책사(제갈량)이 될거야.

[기본 정보]
이름: ${name}
생년월일: ${year}년 ${month}월 ${day}일 ${time}쯤
출생지: ${city}
현재 직업: ${job}
선택한 분석 시스템: ${systems}

2026년 커리어 운을 사주(四柱), 서양 점성술(Astrology), 수비학(Numerology), 베딕 점성술(Vedic Jyotish) 4가지를 기반으로 각각 분석해줘.
선택한 시스템만 분석하고 선택하지 않은 시스템은 빈 문자열로 남겨줘.
(좋은 말하지 말고, 지어내지 말고)
기회뿐 아니라 위기도 함께, 솔직하고 날카롭게 짚어줘.

각 섹션을 최대한 상세하고 풍부하게 작성해줘.
PART 1은 최소 800자 이상. 절대 요약하지 말고 깊이 있게 써줘.

반드시 아래 JSON 형식으로만 답해줘:
{
  "overall_score": 숫자(0-100),
  "overall_verdict": "핵심 한 줄 메시지",
  "section_2026": {
    "saju": "사주 분석 최소 200자 (선택 안 했으면 빈 문자열)",
    "astrology": "서양 점성술 분석 최소 200자 (선택 안 했으면 빈 문자열)",
    "numerology": "수비학 분석 최소 200자 (선택 안 했으면 빈 문자열)",
    "vedic": "베딕 점성술 분석 최소 200자 (선택 안 했으면 빈 문자열)"
  },
  "score_table": [
    { "category": "커리어 성장", "saju": 숫자(0-100), "astrology": 숫자, "numerology": 숫자, "vedic": 숫자 },
    { "category": "금전 수입", "saju": 숫자, "astrology": 숫자, "numerology": 숫자, "vedic": 숫자 },
    { "category": "리더십", "saju": 숫자, "astrology": 숫자, "numerology": 숫자, "vedic": 숫자 },
    { "category": "리스크", "saju": "높음/중간/낮음", "astrology": "높음/중간/낮음", "numerology": "높음/중간/낮음", "vedic": "높음/중간/낮음" }
  ]
}
JSON key는 영어 유지, value는 ${lang} 언어로. score_table의 category 값도 ${lang} 언어로.`;
  };

  const buildPrompt2 = (f, l) => {
    const [year, month, day] = f.dob ? f.dob.split('-') : ['?','?','?'];
    const name = f.name || '미입력';
    const city = f.city || '미입력';
    const lang = LANG_NAME(l);
    return `너는 지금부터 나의 책사(제갈량)이 될거야.

[기본 정보]
이름: ${name}
생년월일: ${year}년 ${month}월 ${day}일
출생지: ${city}

내 인생의 커리어 정점기 TOP 5를 분석해줘.
사주(四柱), 서양 점성술(Astrology), 수비학(Numerology), 베딕 점성술(Vedic Jyotish) 4가지 시스템 기반으로.
TOP 5 정점기는 각각 딱 1년씩만 꼽아줘.
기간이나 범위가 아니라 가장 강력한 단 하나의 연도만.
예: 2033년, 2028년, 2041년 이런 식으로.
각 정점기마다 최소 200자 이상 상세하게. 20대~60대 고르게 분포.
연도와 점수를 정확히 계산해줘. 절대 요약하지 말고 깊이 있게 써줘.

반드시 아래 JSON 형식으로만 답해줘:
{
  "section_peaks": [
    {
      "rank": 1,
      "peak_year": 숫자,
      "age": "몇세",
      "score": 숫자(0-100),
      "label": "이 시기의 성격",
      "description": "상세 설명 최소 200자",
      "systems_scores": { "saju": 숫자, "astrology": 숫자, "numerology": 숫자, "vedic": 숫자 }
    }
  ]
}
JSON key는 영어 유지, value는 ${lang} 언어로.`;
  };

  const buildPrompt3 = (f, l) => {
    const [year, month, day] = f.dob ? f.dob.split('-') : ['?','?','?'];
    const name = f.name || '미입력';
    const city = f.city || '미입력';
    const job = f.job || '미입력';
    const lang = LANG_NAME(l);
    return `너는 지금부터 나의 책사(제갈량)이 될거야.

[기본 정보]
이름: ${name}
생년월일: ${year}년 ${month}월 ${day}일
출생지: ${city}
현재 직업: ${job}

2026년 심층 전략을 아래 섹션별로 작성해줘.
PART 3는 각 항목마다 최소 300자 이상. 절대 요약하지 말고 깊이 있게 써줘.

반드시 아래 JSON 형식으로만 답해줘:
{
  "section_quarterly": {
    "preparation": "전성기 준비 과제 최소 300자",
    "q1": { "score": 숫자, "label": "분기 성격", "strategy": "분기 전략 최소 100자" },
    "q2": { "score": 숫자, "label": "분기 성격", "strategy": "분기 전략 최소 100자" },
    "q3": { "score": 숫자, "label": "분기 성격", "strategy": "분기 전략 최소 100자" },
    "q4": { "score": 숫자, "label": "분기 성격", "strategy": "분기 전략 최소 100자" },
    "critical_date": { "date": "날짜", "reason": "이유 최소 100자" },
    "attack_windows": ["공격 기간1", "공격 기간2"],
    "defend_windows": ["방어 기간1", "방어 기간2"]
  },
  "section_crisis": [
    { "title": "위기 제목", "period": "기간", "description": "위기 설명 최소 150자", "overcome": "극복 방법 최소 100자" },
    { "title": "위기 제목", "period": "기간", "description": "위기 설명 최소 150자", "overcome": "극복 방법 최소 100자" },
    { "title": "위기 제목", "period": "기간", "description": "위기 설명 최소 150자", "overcome": "극복 방법 최소 100자" }
  ],
  "section_limits": ["한계점1 최소 100자", "한계점2 최소 100자", "한계점3 최소 100자"],
  "section_meet": "반드시 만나야 할 사람 유형과 이유 최소 300자",
  "section_learn": "반드시 배워야 할 것과 이유 최소 300자",
  "section_final": "책사의 최종 한마디 — 임팩트 있게 최소 200자"
}
JSON key는 영어 유지, value는 ${lang} 언어로.`;
  };

  const callGemini = async (prompt) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 8000 } })
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const stripped = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try { return JSON.parse(stripped); } catch { return {}; }
  };

  const handleGenerate = useCallback(async (formOverride, langOverride) => {
    const activeForm = formOverride || form;
    const activeLang = langOverride || lang;
    const activeT = T[activeLang];
    setStep("loading");
    setLoadingStep(0);
    let idx=0;
    const interval = setInterval(()=>{idx++;setLoadingIdx(idx%activeT.loadingTexts.length);},900);
    try {
      let done = 0;
      const track = (p) => p.then(r => { setLoadingStep(++done); return r; });
      const [p1, p2, p3] = await Promise.all([
        track(callGemini(buildPrompt1(activeForm, activeLang))),
        track(callGemini(buildPrompt2(activeForm, activeLang))),
        track(callGemini(buildPrompt3(activeForm, activeLang))),
      ]);
      setResult(JSON.stringify({ p1, p2, p3 }));
      setChatMessages([{role:"ai",text:activeT.chatIntro}]);
      const pendingRef = localStorage.getItem("km_ref");
      if (pendingRef) markReferralCompleted(db, pendingRef);
    } catch(e) { console.error("[KarmaMap] fetch error:", e); setResult("API 연결 오류: " + e.message); }
    clearInterval(interval); setStep("result");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, lang]);

  // Detect referral code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    // Accept only short alphanumeric codes (≤16 chars) — new referral system
    if (ref && /^[A-Za-z0-9]{4,16}$/.test(ref)) {
      localStorage.setItem("km_ref", ref);
      setIsReferral(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      recordReferralVisit(db, ref, getVisitorId(), lang);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Share / PDF helpers ---

  const handleDownloadPDF = () => {
    window.print();
  };

  // Auto-fill commentName from form.name when reaching result
  useEffect(() => {
    if (step === "result" && form.name) setCommentName(n => n || form.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Comments: real-time listener ──
  useEffect(() => {
    if (step !== "result") return;
    setCommentsLoading(true);
    const q = query(collection(db, "comments"), orderBy("created_at", "desc"), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCommentsLoading(false);
    }, () => setCommentsLoading(false));
    return () => unsub();
  }, [step]);

  const simpleHash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; }
    return Math.abs(h).toString(36);
  };

  const submitComment = async () => {
    if (commentSubmitting) return;
    setCommentSubmitting(true);
    setCommentError("");

    let ipHash = "unknown";
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      ipHash = simpleHash(ipData.ip);
    } catch(e) {}

    if (ipHash !== "unknown") {
      try {
        const ipRef = doc(db, "ip_limits", ipHash);
        const ipSnap = await getDoc(ipRef);
        if (ipSnap.exists()) {
          const d = ipSnap.data();
          const windowStart = d.window_start?.toDate() || new Date(0);
          if (windowStart > new Date(Date.now() - 3600000) && d.count >= 3) {
            setCommentError(t.commentSpam);
            setCommentSubmitting(false);
            return;
          }
        }
      } catch(e) {}
    }

    const { score, peakYear } = parseResultData(result);
    const goalShort = (form.goal || "").split("/")[0].trim();

    try {
      await addDoc(collection(db, "comments"), {
        name: commentName.trim() || t.commentAnon,
        peak_year: peakYear,
        score_2026: score,
        goal: goalShort,
        comment: commentText.trim(),
        lang,
        reactions: { fire: 0, wow: 0, target: 0 },
        created_at: serverTimestamp(),
        ip_hash: ipHash,
      });

      if (ipHash !== "unknown") {
        const ipRef = doc(db, "ip_limits", ipHash);
        const ipSnap = await getDoc(ipRef);
        const oneHourAgo = new Date(Date.now() - 3600000);
        if (ipSnap.exists() && ipSnap.data().window_start?.toDate() > oneHourAgo) {
          await setDoc(ipRef, { count: (ipSnap.data().count || 0) + 1 }, { merge: true });
        } else {
          await setDoc(ipRef, { count: 1, window_start: serverTimestamp() });
        }
      }

      setCommentName("");
      setCommentText("");
      setCommentPosted(true);
      setTimeout(() => setCommentPosted(false), 3000);
    } catch(e) {
      setCommentError(t.commentError);
    }
    setCommentSubmitting(false);
  };

  const addReaction = async (commentId, emoji) => {
    if (userReactions[commentId]?.includes(emoji)) return;
    try {
      await updateDoc(doc(db, "comments", commentId), { [`reactions.${emoji}`]: increment(1) });
      setUserReactions(prev => ({ ...prev, [commentId]: [...(prev[commentId] || []), emoji] }));
    } catch(e) {}
  };

  // --- SNS Share Card (Canvas 1080×1080) ---

  const parseResultData = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed.p1 || parsed.p2 || parsed.p3) {
        const score = String(parsed.p1?.overall_score ?? "??");
        const peakYear = String(parsed.p2?.section_peaks?.[0]?.peak_year ?? "2027");
        let insight = parsed.p3?.power_move || "";
        if (insight.length > 72) insight = insight.slice(0, 69) + "…";
        return { score, peakYear, insight };
      }
    } catch {}
    // Legacy markdown fallback
    const scoreMatch = text.match(/(\d{2,3})\s*\/\s*100/);
    const score = scoreMatch ? scoreMatch[1] : "??";
    const peakMatch = text.match(/20[2-3]\d/g);
    const peakYear = peakMatch ? peakMatch[0] : "2027";
    const insightMatch = text.match(/One powerful action[^:]*:\s*(.+)/i)
      || text.match(/this month[^:]*:\s*(.+)/i);
    let insight = insightMatch ? insightMatch[1].replace(/\*+/g,"").trim() : "";
    if (insight.length > 72) insight = insight.slice(0, 69) + "…";
    return { score, peakYear, insight };
  };


  const drawRoundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const generateShareCard = () => {
    const canvas = cardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 1080, H = 1080;
    canvas.width = W; canvas.height = H;

    const { score, peakYear, insight } = parseResultData(result);
    const goalShort = (form.goal || "").replace(/\s*\/.*/, "").trim();

    const renderOnCanvas = (bgImage) => {
      // Background
      if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, W, H);
      } else {
        ctx.fillStyle = "#1a1008";
        ctx.fillRect(0, 0, W, H);
      }
      // Dark overlay
      ctx.fillStyle = "rgba(10,6,2,0.52)";
      ctx.fillRect(0, 0, W, H);

      // Title: Karma Map
      ctx.fillStyle = "#f5e6c8";
      ctx.font = "bold italic 72px 'Cormorant Garamond',serif";
      ctx.textAlign = "center";
      ctx.fillText("Karma Map", W / 2, 108);

      // Subtitle
      ctx.fillStyle = "#d4a017";
      ctx.font = "32px 'Cormorant Garamond',serif";
      ctx.fillText("AI Fortune \u00d7 Career Strategy", W / 2, 158);

      // Separator
      const sepGrad = ctx.createLinearGradient(120, 0, W - 120, 0);
      sepGrad.addColorStop(0, "transparent");
      sepGrad.addColorStop(0.5, "rgba(212,160,23,0.55)");
      sepGrad.addColorStop(1, "transparent");
      ctx.strokeStyle = sepGrad; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(120, 180); ctx.lineTo(W - 120, 180); ctx.stroke();

      // Name + 2026 year
      if (form.name) {
        ctx.fillStyle = "#d4a017";
        ctx.font = "bold 28px 'Cinzel',serif";
        ctx.fillText(`${form.name}'s 2026 Destiny`, W / 2, 210);
      }
      ctx.fillStyle = "#f5e6c8";
      ctx.font = "bold 148px 'Cormorant Garamond',serif";
      ctx.fillText("2026", W / 2, 340);

      // Score ring
      const cx = W / 2, cy = 510, ringR = 130;
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 18;
      ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
      const scoreNum = parseInt(score) || 0;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * scoreNum / 100);
      ctx.strokeStyle = "#c84b2f";
      ctx.lineWidth = 18;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(cx, cy, ringR, startAngle, endAngle); ctx.stroke();
      ctx.fillStyle = "rgba(245,230,200,0.7)";
      ctx.font = "26px 'Cormorant Garamond',serif";
      ctx.fillText(t.cardScoreLabel, cx, cy - ringR - 24);
      ctx.fillStyle = "#f5e6c8";
      ctx.font = "bold 88px 'Cormorant Garamond',serif";
      ctx.fillText(score, cx, cy + 30);
      ctx.fillStyle = "#d4a017";
      ctx.font = "bold 30px 'Cormorant Garamond',serif";
      ctx.fillText("/ 100", cx, cy + 72);

      // Stat cards row
      const cardW = 290, cardH = 150, cardY = 710, gap = 30;
      const totalW = cardW * 2 + gap;
      const startX = (W - totalW) / 2;

      const drawStatCard = (x, y, label, value) => {
        drawRoundRect(ctx, x, y, cardW, cardH, 16);
        ctx.fillStyle = "rgba(45,24,16,0.6)";
        ctx.fill();
        drawRoundRect(ctx, x, y, cardW, cardH, 16);
        ctx.strokeStyle = "rgba(212,160,23,0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#d4a017";
        ctx.font = "bold 22px 'Cormorant Garamond',serif";
        ctx.textAlign = "center";
        ctx.fillText(label, x + cardW / 2, y + 44);
        ctx.fillStyle = "#f5e6c8";
        ctx.font = "bold 44px 'Cormorant Garamond',serif";
        ctx.fillText(value, x + cardW / 2, y + 104);
      };

      drawStatCard(startX, cardY, t.cardPeakLabel, peakYear);
      drawStatCard(startX + cardW + gap, cardY, t.cardGoalLabel, goalShort || "Career");

      // Insight
      if (insight) {
        ctx.fillStyle = "rgba(245,230,200,0.5)";
        ctx.font = "italic 24px 'Cormorant Garamond',serif";
        ctx.fillText(`"${insight}"`, W / 2, 906);
      }

      // Bottom separator
      const botGrad = ctx.createLinearGradient(120, 0, W - 120, 0);
      botGrad.addColorStop(0, "transparent");
      botGrad.addColorStop(0.5, "rgba(212,160,23,0.4)");
      botGrad.addColorStop(1, "transparent");
      ctx.strokeStyle = botGrad; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(120, 930); ctx.lineTo(W - 120, 930); ctx.stroke();

      // Footer
      const meta = [form.name, form.dob, form.city].filter(Boolean).join("  \u00b7  ");
      ctx.fillStyle = "rgba(245,230,200,0.5)";
      ctx.font = "24px 'Cormorant Garamond',serif";
      ctx.fillText(meta, W / 2, 974);
      ctx.fillStyle = "#d4a017";
      ctx.font = "bold 28px 'Cormorant Garamond',serif";
      ctx.fillText(t.cardTagline, W / 2, 1028);

      setShowCardModal(true);
    };

    const bgImg = new Image();
    bgImg.onload = () => renderOnCanvas(bgImg);
    bgImg.onerror = () => renderOnCanvas(null);
    bgImg.src = "/images/card-bg.png";
  };

  const downloadCard = () => {
    const canvas = cardCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "karmamap-2026.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const shareCard = async () => {
    const canvas = cardCanvasRef.current;
    if (!canvas) return;
    if (navigator.share && navigator.canShare) {
      canvas.toBlob(async (blob) => {
        const file = new File([blob], "karmamap-2026.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "My KarmaMap 2026 Destiny", url: window.location.origin });
            return;
          } catch(e) { /* user cancelled or not supported */ }
        }
        downloadCard();
      }, "image/png");
    } else {
      downloadCard();
    }
  };

  const handleChat = async () => {
    if(!chatInput.trim()) return;
    const userMsg=chatInput.trim(); setChatInput("");
    setChatMessages(prev=>[...prev,{role:"user",text:userMsg}]); setChatLoading(true);
    try {
      const lang_name=({ko:"Korean",zh:"Chinese (Simplified)",tw:"Chinese (Traditional)",ms:"Malay",in:"Hindi",id:"Indonesian",jp:"Japanese",vn:"Vietnamese",th:"Thai",ph:"Filipino",bn:"Bengali"})[lang]||"English";
      const history=chatMessages.map(m=>({role:m.role==="user"?"user":"model",parts:[{text:m.text}]}));
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({system_instruction:{parts:[{text:`KarmaMap AI. Report: ${result}. Answer in ${lang_name}. Max 4 sentences.`}]},contents:[...history,{role:"user",parts:[{text:userMsg}]}],generationConfig:{temperature:0.7,maxOutputTokens:512}})
      });
      const data=await res.json();
      const reply=data.candidates?.[0]?.content?.parts?.[0]?.text||"오류가 발생했습니다.";
      setChatMessages(prev=>[...prev,{role:"ai",text:reply}]);
    } catch{setChatMessages(prev=>[...prev,{role:"ai",text:"연결 오류"}]);}
    setChatLoading(false);
  };

  const stripEmoji = (s) => s.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu,"").trim();
  const renderInline = (txt, key) => {
    const parts = txt.split(/\*\*(.*?)\*\*/g);
    if (parts.length === 1) return txt;
    return <span key={key}>{parts.map((part,j)=>j%2===0?part:<strong key={j} style={{fontWeight:700,color:"#2d1810",background:"rgba(200,75,47,0.08)",padding:"0 4px",borderRadius:2}}>{part}</strong>)}</span>;
  };
  const formattedResult = useMemo(() => {
    if (!result) return {};
    const rl = RL[lang] || RL.en;
    const card = (children) => <div style={{background:"rgba(212,160,23,0.08)",border:"1px solid rgba(212,160,23,0.22)",borderRadius:6,padding:"12px 14px",marginBottom:10}}>{children}</div>;
    const lbl = (txt) => <div style={{fontSize:11,fontWeight:700,color:"#8b6914",letterSpacing:0.5,marginBottom:6,textTransform:"uppercase"}}>{txt}</div>;
    const body = (txt) => <p style={{fontSize:16,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.8,margin:"0 0 16px"}}>{txt}</p>;

    try {
      const parsed = JSON.parse(result);
      if (parsed.p1 || parsed.p2 || parsed.p3) {
        const { p1={}, p2={}, p3={} } = parsed;

        const t0 = (
          <div>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16,background:"rgba(200,75,47,0.06)",border:"1px solid rgba(200,75,47,0.2)",borderRadius:8,padding:"16px 20px"}}>
              <div style={{textAlign:"center",minWidth:80}}>
                <div style={{fontSize:56,fontWeight:700,color:"#c84b2f",fontFamily:"'Cinzel',serif",lineHeight:1}}>{p1.overall_score??'?'}</div>
                <div style={{fontSize:12,color:"rgba(45,24,16,0.45)"}}>/ 100</div>
              </div>
              <p style={{fontSize:17,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.8,flex:1,margin:0}}>{p1.overall_verdict}</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              {[p1.q1,p1.q2,p1.q3,p1.q4].map((q,i)=>q&&<div key={i} style={{background:"rgba(252,248,240,0.9)",border:"1px solid rgba(139,105,20,0.2)",borderRadius:6,padding:"12px 14px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#8b6914",marginBottom:4}}>Q{i+1} · {q.score}/100</div>
                <div style={{fontSize:14,fontWeight:700,color:"#2d1810",marginBottom:6,fontFamily:"'Cinzel',serif"}}>{q.label}</div>
                <p style={{fontSize:13,color:"rgba(45,24,16,0.75)",lineHeight:1.7,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{q.strategy}</p>
              </div>)}
            </div>
            {(p1.attack_windows?.length>0||p1.defend_windows?.length>0)&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div style={{background:"rgba(200,75,47,0.06)",border:"1px solid rgba(200,75,47,0.2)",borderRadius:6,padding:"12px 14px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#c84b2f",marginBottom:8}}>⚡ {rl.attack}</div>
                {p1.attack_windows?.map((w,i)=><p key={i} style={{fontSize:13,color:"#2d1810",lineHeight:1.7,margin:"2px 0",fontFamily:"'Cormorant Garamond',serif"}}>▪ {w}</p>)}
              </div>
              <div style={{background:"rgba(45,24,16,0.04)",border:"1px solid rgba(45,24,16,0.15)",borderRadius:6,padding:"12px 14px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#2d1810",marginBottom:8}}>🛡 {rl.defend}</div>
                {p1.defend_windows?.map((w,i)=><p key={i} style={{fontSize:13,color:"#2d1810",lineHeight:1.7,margin:"2px 0",fontFamily:"'Cormorant Garamond',serif"}}>▪ {w}</p>)}
              </div>
            </div>}
            {p1.critical_date&&card(<><span style={{fontSize:12,fontWeight:700,color:"#8b6914"}}>📅 {p1.critical_date.date} — </span><span style={{fontSize:14,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif"}}>{p1.critical_date.reason}</span></>)}
            {p1.year_summary&&<p style={{fontSize:17,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.9,marginTop:8}}>{p1.year_summary}</p>}
          </div>
        );

        const lifeDecades = ["20s","30s","40s","50s","60s"];
        const t1 = (
          <div>
            {/* Current Season */}
            {p2.current_season&&<div style={{background:"rgba(45,24,16,0.06)",border:"1px solid rgba(45,24,16,0.15)",borderRadius:8,padding:"14px 18px",marginBottom:16,display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{fontSize:28,minWidth:36,textAlign:"center"}}>{"🌱🌞🍂❄️"[["spring","summer","autumn","winter"].indexOf(p2.current_season.season)]||"🌿"}</div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:"#8b6914",marginBottom:4}}>{rl.currentSeason} · {p2.current_season.period} · {p2.current_season.korean}</div>
                <p style={{fontSize:15,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.7,margin:0}}>{p2.current_season.message}</p>
              </div>
            </div>}
            {/* TOP 5 Peaks */}
            {p2.peaks?.map((pk,i)=><div key={i} style={{border:`1px solid ${i===0?"rgba(200,75,47,0.4)":"rgba(139,105,20,0.2)"}`,borderRadius:8,padding:"14px 18px",marginBottom:10,background:i===0?"rgba(200,75,47,0.05)":"rgba(252,248,240,0.8)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:i===0?"#c84b2f":"rgba(139,105,20,0.15)",color:i===0?"#f5e6c8":"#8b6914",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>#{pk.rank}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:700,color:"#2d1810",fontFamily:"'Cinzel',serif"}}>{pk.year_start}–{pk.year_end} <span style={{fontSize:12,color:"rgba(45,24,16,0.5)"}}>({pk.age})</span></div>
                  <div style={{fontSize:12,color:"#8b6914",marginTop:2}}>{pk.label}</div>
                </div>
                <div style={{fontSize:24,fontWeight:700,color:i===0?"#c84b2f":"#8b6914",fontFamily:"'Cinzel',serif",minWidth:40,textAlign:"right"}}>{pk.score}</div>
              </div>
              <p style={{fontSize:15,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.7,margin:"0 0 8px"}}>{pk.description}</p>
              {pk.systems_scores&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {Object.entries(pk.systems_scores).map(([k,v])=><span key={k} style={{fontSize:11,background:"rgba(139,105,20,0.1)",border:"1px solid rgba(139,105,20,0.2)",borderRadius:4,padding:"3px 10px",color:"#8b6914"}}>{k} {v}</span>)}
              </div>}
            </div>)}
            {/* Life Graph */}
            {p2.life_graph?.length>0&&<div style={{marginTop:8,background:"rgba(252,248,240,0.9)",border:"1px solid rgba(139,105,20,0.2)",borderRadius:8,padding:"16px 18px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#8b6914",marginBottom:14,letterSpacing:0.5,textTransform:"uppercase"}}>Life Fortune Graph</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:8,height:80}}>
                {p2.life_graph.map((score,i)=>{
                  const h = Math.max(8, Math.round((score/100)*72));
                  return (
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <div style={{fontSize:10,color:"#8b6914",fontWeight:700}}>{score}</div>
                      <div style={{width:"100%",height:h,background:i===0?"#c84b2f":score>=70?"#d4a017":"rgba(139,105,20,0.3)",borderRadius:"3px 3px 0 0",transition:"height 0.4s"}}/>
                      <div style={{fontSize:11,color:"rgba(45,24,16,0.55)",fontFamily:"'Cormorant Garamond',serif"}}>{lifeDecades[i]}</div>
                    </div>
                  );
                })}
              </div>
            </div>}
          </div>
        );

        const t2 = (
          <div>
            {p3.power_move&&<div style={{background:"#2d1810",borderRadius:8,padding:"16px 20px",marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"#d4a017",marginBottom:6,letterSpacing:1}}>⚡ {rl.powerMove}</div>
              <p style={{fontSize:16,color:"#f5e6c8",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.8,margin:0}}>{p3.power_move}</p>
            </div>}
            {p3.preparation&&<>{lbl(rl.preparation)}{body(p3.preparation)}</>}
            {p3.crisis_moment&&card(<>
              <div style={{fontSize:12,fontWeight:700,color:"#c84b2f",marginBottom:4}}>⚠ {rl.crisis} · {p3.crisis_moment.period}</div>
              <p style={{fontSize:14,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.7,margin:"0 0 8px"}}>{p3.crisis_moment.description}</p>
              <p style={{fontSize:13,color:"rgba(45,24,16,0.65)",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.7,margin:0}}>→ {p3.crisis_moment.how_to_overcome}</p>
            </>)}
            {p3.blind_spots?.length>0&&<>{lbl(rl.blindSpots)}<div style={{marginBottom:16}}>{p3.blind_spots.map((b,i)=><p key={i} style={{fontSize:15,color:"rgba(45,24,16,0.8)",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.7,margin:"4px 0"}}>▪ {b}</p>)}</div></>}
            {p3.must_meet_person&&<>{lbl(rl.mustMeet)}{body(p3.must_meet_person)}</>}
            {p3.must_learn&&<>{lbl(rl.mustLearn)}{body(p3.must_learn)}</>}
            {p3.career_advice&&<>{lbl(rl.careerAdvice)}{body(p3.career_advice)}</>}
          </div>
        );

        return { t0, t1, t2 };
      }
    } catch {}

    // Legacy markdown fallback
    const legacy = result.split("\n").map((line,i)=>{
      const s=line.trim();
      if(s.startsWith("## ")) return <h3 key={i} style={{color:"#2d1810",fontSize:22,fontWeight:600,margin:"28px 0 12px",fontFamily:"'Cinzel',serif",borderBottom:"1px solid rgba(139,105,20,0.2)",paddingBottom:8}}>◈ {stripEmoji(s.slice(3))}</h3>;
      if(s.startsWith("### ")) return <h4 key={i} style={{color:"#8b6914",fontSize:18,fontWeight:600,margin:"16px 0 6px",fontFamily:"'Cinzel',serif"}}>{stripEmoji(s.slice(4))}</h4>;
      if(/^-{3,}$/.test(s)) return <hr key={i} style={{border:"none",borderTop:"1px solid rgba(139,105,20,0.2)",margin:"16px 0"}}/>;
      if(s.startsWith("- ")||s.startsWith("* ")) return <p key={i} style={{color:"#2d1810",fontSize:18,lineHeight:2,margin:"12px 0",fontFamily:"'Cormorant Garamond',serif"}}>▪ {renderInline(s.slice(2),i)}</p>;
      if(s==="") return <div key={i} style={{height:8}}/>;
      return <p key={i} style={{color:"#2d1810",fontSize:18,lineHeight:2,margin:"12px 0",fontFamily:"'Cormorant Garamond',serif"}}>{renderInline(s,i)}</p>;
    });
    return { t0: legacy };
  }, [result, lang]);

  const p=theme.primary; const fn="'Cormorant Garamond',serif";
  const rootBg = {"landing":"url('/images/landing-bg.png')","form":"url('/images/form-bg.png')","loading":"url('/images/loading-bg.png')","result":"url('/images/report-bg.png')"}[step]||theme.bg;
  const css=`
    *{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes glow{0%,100%{box-shadow:0 0 24px rgba(200,75,47,0.35)}50%{box-shadow:0 0 48px rgba(200,75,47,0.6)}}
    @keyframes scrollUnfurl{0%{height:0;opacity:0}100%{height:320px;opacity:1}}
    @keyframes textFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    .fade-up{animation:fadeUp 0.7s cubic-bezier(.22,1,.36,1) forwards;}
    .cta-btn{background:#c84b2f;border:1px solid #8b6914;color:#f5e6c8;padding:14px 40px;border-radius:3px;font-size:20px;font-weight:600;cursor:pointer;font-family:'Cinzel',serif;letter-spacing:2px;transition:all 0.2s;}
    .cta-btn:hover{background:#a33825;transform:translateY(-1px);box-shadow:0 4px 16px rgba(200,75,47,0.4);}
    .cta-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none;box-shadow:none;}
    .input-field{width:100%;background:rgba(252,248,240,0.95);border:1.5px solid rgba(139,105,20,0.4);color:#2d1810;padding:13px 16px;border-radius:4px;font-size:18px;outline:none;transition:border-color 0.2s;font-family:'Cormorant Garamond',serif;}
    .input-field:focus{border-color:#c84b2f;}
    .input-field::placeholder{color:rgba(45,24,16,0.45);}
    .system-card{background:rgba(252,248,240,0.85);border:1px solid rgba(139,105,20,0.25);border-radius:4px;padding:20px;cursor:pointer;transition:all 0.2s;text-align:center;}
    .system-card:hover{border-color:#c84b2f;background:rgba(255,255,255,0.9);}
    .system-card.selected{border-color:#c84b2f;background:rgba(200,75,47,0.1);}
    .tab-btn{background:transparent;border:none;color:#8b6914;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;border-bottom:2px solid transparent;transition:all 0.2s;font-family:'Cinzel',serif;white-space:nowrap;}
    .tab-btn.active{color:#c84b2f;border-bottom-color:#c84b2f;}
    .chat-ai{background:rgba(242,232,213,0.9);border:1px solid rgba(139,105,20,0.3);border-radius:12px 12px 12px 3px;padding:12px 16px;max-width:82%;font-size:17px;line-height:1.9;animation:fadeUp 0.3s ease;color:#2d1810;font-family:'Cormorant Garamond',serif;}
    .chat-user{background:rgba(200,75,47,0.12);border:1px solid rgba(200,75,47,0.3);border-radius:12px 12px 3px 12px;padding:12px 16px;max-width:82%;font-size:17px;line-height:1.9;margin-left:auto;animation:fadeUp 0.3s ease;color:#2d1810;font-family:'Cormorant Garamond',serif;}
    .action-btn{background:rgba(242,232,213,0.9);border:1px solid #8b6914;color:#2d1810;padding:8px 16px;border-radius:3px;cursor:pointer;font-size:16px;font-weight:600;transition:all 0.2s;font-family:'Cinzel',serif;}
    .action-btn:hover{background:#c84b2f;border-color:#c84b2f;color:#f5e6c8;}
    select option{background:#fff8f0;color:#2d1810;}
    .modal-overlay{position:fixed;inset:0;background:rgba(45,24,16,0.6);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;}
    .modal-box{background:rgba(248,240,220,0.97);backdrop-filter:blur(12px);border:1px solid rgba(139,105,20,0.35);border-radius:4px;padding:28px 24px;width:100%;max-width:480px;position:relative;}
    .modal-close{position:absolute;top:14px;right:16px;background:transparent;border:none;color:rgba(45,24,16,0.5);font-size:20px;cursor:pointer;line-height:1;}
    .referral-banner{background:rgba(200,75,47,0.08);border:1px solid rgba(200,75,47,0.3);border-radius:4px;padding:16px;margin-bottom:20px;text-align:center;}
    .comment-card{background:rgba(242,232,213,0.85);border:1px solid rgba(139,105,20,0.25);border-radius:8px;padding:14px 16px;animation:fadeUp 0.4s ease;}
    .comment-card:hover{border-color:rgba(200,75,47,0.4);}
    .reaction-btn{background:transparent;border:1px solid rgba(139,105,20,0.3);border-radius:20px;padding:4px 10px;cursor:pointer;font-size:14px;color:rgba(45,24,16,0.55);transition:all 0.18s;font-family:'Cormorant Garamond',serif;}
    .reaction-btn:hover{background:rgba(200,75,47,0.1);border-color:#c84b2f;color:#2d1810;}
    .reaction-btn.reacted{background:rgba(200,75,47,0.12);border-color:#c84b2f;color:#2d1810;}
    .filter-toggle{background:transparent;border:1px solid rgba(139,105,20,0.3);border-radius:20px;padding:5px 12px;cursor:pointer;font-size:14px;color:rgba(45,24,16,0.55);transition:all 0.18s;font-family:'Cormorant Garamond',serif;}
    .filter-toggle.active{background:rgba(200,75,47,0.1);border-color:#c84b2f;color:#c84b2f;}
    .ad-placeholder{padding:14px;min-height:70px;display:flex;align-items:center;justify-content:center;border:1px dashed rgba(139,105,20,0.3);border-radius:4px;margin:20px 0;font-size:12px;color:rgba(45,24,16,0.4);letter-spacing:2px;text-transform:uppercase;font-family:'Cormorant Garamond',serif;}
    @media print{
      body *{visibility:hidden;}
      #karmamap-result,#karmamap-result *{visibility:visible;}
      #karmamap-result{position:absolute;left:0;top:0;width:100%;background:#fff;color:#000;padding:24px;}
    }
    @media(max-width:480px){
      html,body{overflow-x:hidden;-webkit-overflow-scrolling:touch;}
      .cta-btn{width:100%!important;height:56px!important;font-size:18px!important;padding:0 20px!important;letter-spacing:1px!important;display:flex!important;align-items:center!important;justify-content:center!important;}
      .input-field{font-size:16px!important;min-height:48px!important;}
      select.input-field{height:52px!important;font-size:16px!important;}
      .action-btn{font-size:14px!important;padding:10px 12px!important;min-height:48px!important;}
      .tab-btn{font-size:13px!important;padding:10px 8px!important;}
      .system-card{padding:16px 12px!important;}
      .system-card .callig{font-size:40px!important;}
      .system-card .card-label{font-size:17px!important;}
      .modal-box{padding:20px 14px!important;}
      .reaction-btn,.filter-toggle{min-height:44px!important;padding:8px 12px!important;font-size:15px!important;}
      .landing-card{width:92vw!important;padding:28px 20px!important;margin:0 auto!important;}
      .landing-title{font-size:56px!important;}
      .landing-headline{font-size:22px!important;line-height:1.5!important;}
      .landing-headline-ko{font-size:15px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
      .landing-subtitle{font-size:16px!important;}
      .landing-badge{font-size:13px!important;}
      .form-h2{font-size:28px!important;}
      .dob-grid{grid-template-columns:1fr!important;}
      .result-title{font-size:24px!important;}
      #karmamap-result{padding:20px 16px!important;}
      #karmamap-result p,#karmamap-result li{font-size:16px!important;line-height:1.9!important;}
      #karmamap-result h3{font-size:20px!important;}
      #karmamap-result h4{font-size:17px!important;}
      .loading-scroll{width:85vw!important;}
      .loading-text{font-size:17px!important;}
      .card-modal-btns{flex-direction:column!important;}
      .card-modal-btns button,.card-modal-btns .action-btn{width:100%!important;height:52px!important;}
      .main-container{padding:0 12px!important;}
      .comment-card input,.comment-card textarea{font-size:16px!important;}
    }
  `;

  return (
    <div style={{minHeight:"100vh",background:`${rootBg} center top / cover no-repeat fixed`,fontFamily:fn,color:"#2d1810",position:"relative",overflowX:"hidden"}}>
      <style>{css}</style>

      {/* ── Star particles ── */}
      <canvas ref={starCanvasRef} style={{position:"fixed",inset:0,zIndex:1,pointerEvents:"none",display:"none"}}/>



      {/* Lang switcher — 랜딩만 표시, 드롭다운 */}
      {step==="landing" && (
        <div ref={langDropdownRef} style={{position:"fixed",top:14,right:14,zIndex:100}}>
          <button
            onClick={()=>setLangDropdownOpen(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:6,background:"rgba(242,232,213,0.92)",border:"1px solid #8b6914",borderRadius:6,padding:"7px 12px",cursor:"pointer",fontFamily:"'Cormorant Garamond',serif",fontSize:13,fontWeight:700,color:"#2d1810",boxShadow:"0 2px 12px rgba(45,24,16,0.12)",whiteSpace:"nowrap"}}
          >
            <span>{LANG_CONFIG[lang]?.flag||"🌍"}</span>
            <span style={{letterSpacing:0.5}}>{LANG_CONFIG[lang]?.code||lang.toUpperCase()}</span>
            <span style={{fontSize:9,opacity:0.6}}>{langDropdownOpen?"▴":"▾"}</span>
          </button>
          {langDropdownOpen && (
            <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"rgba(248,240,220,0.97)",border:"1px solid #8b6914",borderRadius:6,overflow:"hidden",boxShadow:"0 6px 24px rgba(45,24,16,0.18)",minWidth:210,maxHeight:"80vh",overflowY:"auto"}}>
              {Object.entries(LANG_CONFIG).map(([l,cfg])=>(
                <button
                  key={l}
                  onClick={()=>{setLang(l);setLangDropdownOpen(false);}}
                  style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:lang===l?"rgba(200,75,47,0.1)":"transparent",border:"none",padding:"10px 14px",cursor:"pointer",fontFamily:"'Cormorant Garamond',serif",fontSize:13,fontWeight:lang===l?700:400,color:lang===l?"#c84b2f":"#2d1810",textAlign:"left",borderBottom:"1px solid rgba(139,105,20,0.12)"}}
                >
                  <span>{cfg.flag}</span><span>{cfg.nativeName}</span>
                  {lang===l&&<span style={{marginLeft:"auto",color:"#c84b2f",fontSize:11}}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="main-container" style={{maxWidth:600,margin:"0 auto",padding:"0 20px",position:"relative",zIndex:10}}>

        {/* LANDING */}
        {step==="landing" && (
          <div className="fade-up" style={{textAlign:"center",paddingTop:"9vh",paddingBottom:80,position:"relative",zIndex:10}}>

            {/* Text container card */}
            <div className="landing-card" style={{background:"rgba(242,232,213,0.82)",backdropFilter:"blur(3px)",WebkitBackdropFilter:"blur(3px)",borderRadius:16,padding:"32px 28px",border:"1px solid rgba(212,160,23,0.3)",marginBottom:20}}>

              {/* Title */}
              <h1 className="landing-title" style={{fontSize:"clamp(64px,13vw,110px)",fontWeight:700,fontStyle:"normal",fontFamily:"'Cinzel',serif",color:"#2d1810",letterSpacing:"4px",textShadow:"2px 2px 0px rgba(212,160,23,0.3)",lineHeight:1.0,marginBottom:22}}>
                Karma Map
              </h1>

              {/* Headlines */}
              <p className={`landing-headline${lang==="ko"?" landing-headline-ko":""}`} style={{fontSize:lang==="ko"?"clamp(15px,4.2vw,30px)":"clamp(24px,5vw,40px)",color:"#2d1810",marginBottom:4,fontWeight:400,fontFamily:"'Cinzel',serif",lineHeight:1.35,whiteSpace:lang==="ko"?"nowrap":"normal",overflow:lang==="ko"?"hidden":"visible",textOverflow:lang==="ko"?"ellipsis":"clip"}}>
                {t.tagline}
              </p>
              {t.tagline2 && (
                <p className="landing-headline" style={{fontSize:"clamp(18px,3.5vw,28px)",color:"#2d1810",marginBottom:16,fontWeight:400,fontFamily:"'Cinzel',serif",lineHeight:1.4}}>
                  {t.tagline2}
                </p>
              )}

              {/* Subtitle */}
              <p className="landing-subtitle" style={{fontSize:"clamp(18px,3vw,24px)",color:"#3d2010",lineHeight:1.7,maxWidth:400,margin:"0 auto 10px",fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic"}}>
                {t.subtitle}
              </p>
              {t.microCopy && (
                <p style={{fontSize:15,color:"rgba(45,24,16,0.55)",marginBottom:24,fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",letterSpacing:0.3}}>
                  {t.microCopy}
                </p>
              )}

              {/* CTA */}
              <button
                onClick={()=>{setStep("form");setFormStep(1);}}
                style={{background:"#c84b2f",border:"2px solid #d4a017",color:"#f5e6c8",padding:"16px 52px",borderRadius:4,fontSize:20,fontWeight:600,cursor:"pointer",fontFamily:"'Cinzel',serif",letterSpacing:2,boxShadow:"0 4px 24px rgba(200,75,47,0.45),inset 0 1px 0 rgba(212,160,23,0.3)",transition:"all 0.25s",marginBottom:24}}
                onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.05)";e.currentTarget.style.boxShadow="0 6px 40px rgba(200,75,47,0.65),0 0 0 2px #d4a017";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 4px 24px rgba(200,75,47,0.45),inset 0 1px 0 rgba(212,160,23,0.3)";}}
              >
                {t.startBtn}
              </button>

              {/* Bottom badges */}
              <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"nowrap"}}>
                {["🌍 12 Languages","✦ Ancient Wisdom","✦ 30 Seconds"].map(label=>(
                  <span key={label} className="landing-badge" style={{fontSize:14,color:"rgba(45,24,16,0.5)",background:"rgba(212,160,23,0.1)",border:"1px solid rgba(212,160,23,0.3)",padding:"5px 10px",borderRadius:20,fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",whiteSpace:"nowrap"}}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* AdSense */}
            <div style={{padding:"18px 20px",minHeight:90,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:16,border:"1px solid rgba(212,160,23,0.25)",background:"rgba(242,232,213,0.5)"}}>
              <span style={{fontSize:12,color:"rgba(45,24,16,0.3)"}}>{t.adLabel}</span>
            </div>
          </div>
        )}

        {/* FORM */}
        {step==="form" && (
          <div className="fade-up" style={{marginTop:60,paddingBottom:40,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:28}}>
              {[1,2].map((s,i)=>(
                <span key={s} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{width:32,height:32,borderRadius:"50%",background:formStep>=s?"#c84b2f":"rgba(255,255,255,0.5)",border:`2px solid ${formStep>=s?"#c84b2f":"rgba(212,160,23,0.4)"}`,color:formStep>=s?"#fff":"rgba(45,24,16,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{s}</span>
                  {i<1&&<span style={{width:40,height:2,background:formStep>s?"#c84b2f":"rgba(212,160,23,0.3)"}}/>}
                </span>
              ))}
            </div>
            <h2 className="form-h2" style={{fontSize:"clamp(28px,5vw,42px)",fontWeight:600,marginBottom:6,textAlign:"center",color:"#2d1810",fontFamily:"'Cinzel',serif",textShadow:"1px 1px 3px rgba(242,232,213,0.9)"}}>{formStep===1?t.step1:t.step3}</h2>
            <p style={{color:"rgba(45,24,16,0.6)",textAlign:"center",marginBottom:28,fontSize:13,fontFamily:"'Cormorant Garamond',serif",textShadow:"0 1px 3px rgba(242,232,213,0.8)"}}>Step {formStep} of 2</p>

            {/* Step 1: Personal Info */}
            {formStep===1 && (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>

                {/* Name */}
                <div>
                  <label style={{fontSize:17,color:"#2d1810",marginBottom:8,display:"block",fontFamily:"'Cormorant Garamond',serif",textShadow:"0 1px 3px rgba(252,248,240,0.9)",fontWeight:700}}>{t.nameLabel||"Your Name"}</label>
                  <input
                    className="input-field"
                    placeholder="e.g. Roy, 민준, Sarah..."
                    value={form.name}
                    onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                    onFocus={e=>e.target.style.borderColor="#c84b2f"}
                    onBlur={e=>e.target.style.borderColor="rgba(139,105,20,0.4)"}
                    autoComplete="given-name"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label style={{fontSize:17,color:"#2d1810",marginBottom:8,display:"block",fontFamily:"'Cormorant Garamond',serif",textShadow:"0 1px 3px rgba(252,248,240,0.9)",fontWeight:700}}>{t.dobLabel}</label>
                  <div className="dob-grid" style={{display:"grid",gridTemplateColumns:"2fr 2fr 2fr",gap:8}}>
                    <select className="input-field" value={dobY} onChange={e=>setDobY(e.target.value)}>
                      <option value="">Year</option>
                      {Array.from({length:101},(_,i)=>2010-i).map(y=><option key={y} value={y}>{y}</option>)}
                    </select>
                    <select className="input-field" value={dobM} onChange={e=>setDobM(e.target.value)}>
                      <option value="">Month</option>
                      {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((name,i)=>(
                        <option key={i+1} value={i+1}>{String(i+1).padStart(2,"0")} {name}</option>
                      ))}
                    </select>
                    <select className="input-field" value={dobD} onChange={e=>setDobD(e.target.value)}>
                      <option value="">Day</option>
                      {Array.from({length:getDaysInMonth(dobY,dobM)},(_,i)=>i+1).map(d=>(
                        <option key={d} value={d}>{String(d).padStart(2,"0")}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Birth Time */}
                <div>
                  <label style={{fontSize:17,color:"#2d1810",marginBottom:8,display:"block",fontFamily:"'Cormorant Garamond',serif",textShadow:"0 1px 3px rgba(252,248,240,0.9)",fontWeight:700}}>{t.timeLabel}</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <select className="input-field" value={birthH} onChange={e=>setBirthH(e.target.value)}>
                      <option value="">Hour</option>
                      {Array.from({length:24},(_,i)=>i).map(h=>(
                        <option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>
                      ))}
                    </select>
                    <select className="input-field" value={birthMin} onChange={e=>setBirthMin(e.target.value)}>
                      <option value="">Min</option>
                      {[0,5,10,15,20,25,30,35,40,45,50,55].map(m=>(
                        <option key={m} value={m}>{String(m).padStart(2,"0")}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Birth City */}
                <div>
                  <label style={{fontSize:17,color:"#2d1810",marginBottom:8,display:"block",fontFamily:"'Cormorant Garamond',serif",textShadow:"0 1px 3px rgba(252,248,240,0.9)",fontWeight:700}}>{t.placeLabel}</label>
                  <input
                    style={{width:"100%",background:"rgba(252,248,240,0.95)",border:"1.5px solid rgba(139,105,20,0.4)",color:"#2d1810",fontSize:18,padding:"16px 20px",borderRadius:4,outline:"none",fontFamily:"'Cormorant Garamond',serif",transition:"border-color 0.2s"}}
                    placeholder="e.g. Seoul, Singapore, Tokyo..."
                    value={form.city}
                    onChange={e=>setForm(f=>({...f,city:e.target.value}))}
                    onFocus={e=>e.target.style.borderColor="#c84b2f"}
                    onBlur={e=>e.target.style.borderColor="rgba(139,105,20,0.4)"}
                    autoComplete="off"
                  />
                </div>

                {/* Current Job / Role (optional) */}
                <div>
                  <label style={{fontSize:17,color:"#2d1810",marginBottom:8,display:"flex",alignItems:"center",gap:8,fontFamily:"'Cormorant Garamond',serif",textShadow:"0 1px 3px rgba(252,248,240,0.9)",fontWeight:700}}>
                    {t.jobLabel}
                    <span style={{fontSize:12,fontWeight:400,color:"rgba(45,24,16,0.45)",fontStyle:"italic"}}>optional</span>
                  </label>
                  <input
                    className="input-field"
                    placeholder={t.jobPlaceholder}
                    value={form.job}
                    onChange={e=>setForm(f=>({...f,job:e.target.value}))}
                    onFocus={e=>e.target.style.borderColor="#c84b2f"}
                    onBlur={e=>e.target.style.borderColor="rgba(139,105,20,0.4)"}
                    autoComplete="organization-title"
                  />
                </div>

                <button className="cta-btn" style={{marginTop:4}} onClick={()=>setFormStep(2)} disabled={!form.name.trim()||!form.dob||form.city.trim().length<2}>{t.nextBtn}</button>
              </div>
            )}

            {/* Step 2: Fortune Systems */}
            {formStep===2 && (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <label style={{fontSize:17,color:"#2d1810",fontWeight:700,fontFamily:"'Cormorant Garamond',serif",textShadow:"0 1px 3px rgba(252,248,240,0.9)"}}>{t.systemLabel}</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                  {FORTUNE_SYSTEMS.map(s=>(
                    <div key={s.id} className={`system-card ${form.systems.includes(s.id)?"selected":""}`} onClick={()=>toggleSystem(s.id)}>
                      <div style={{fontSize:48,marginBottom:8,color:s.calligColor,fontFamily:"'Cinzel',serif",lineHeight:1}}>{s.callig}</div>
                      <div style={{fontSize:20,fontWeight:600,color:"#2d1810",fontFamily:"'Cinzel',serif"}}>{s.label}</div>
                      <div style={{fontSize:15,color:"rgba(45,24,16,0.55)",marginTop:3,fontFamily:"'Cormorant Garamond',serif"}}>{s.sub}</div>
                      {form.systems.includes(s.id)&&<div style={{marginTop:6,fontSize:14,color:"#c84b2f",fontWeight:700}}>✓</div>}
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:10,marginTop:8}}>
                  <button className="action-btn" onClick={()=>setFormStep(1)} style={{flex:1}}>{t.backBtn}</button>
                  <button className="cta-btn" onClick={()=>handleGenerate()} disabled={form.systems.length===0} style={{flex:2,padding:"14px 20px"}}>{t.generateBtn}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOADING */}
        {step==="loading" && (
          <div className="fade-up" style={{textAlign:"center",paddingTop:"18vh",display:"flex",flexDirection:"column",alignItems:"center"}}>
            {/* Step progress */}
            <div style={{display:"flex",gap:10,marginBottom:24,justifyContent:"center",flexWrap:"wrap"}}>
              {(RL[lang]||RL.en).loadingLabels.map((label,i)=>(
                <div key={i} style={{fontSize:12,padding:"5px 14px",borderRadius:20,background:loadingStep>i?"rgba(200,75,47,0.12)":"rgba(45,24,16,0.05)",border:`1px solid ${loadingStep>i?"rgba(200,75,47,0.4)":"rgba(139,105,20,0.2)"}`,color:loadingStep>i?"#c84b2f":"rgba(45,24,16,0.35)",fontFamily:"'Cinzel',serif",transition:"all 0.4s",whiteSpace:"nowrap"}}>
                  {loadingStep>i?"✓ ":""}{label}
                </div>
              ))}
            </div>
            {/* 두루마리 SVG */}
            <div className="loading-scroll" style={{width:320,maxWidth:"90vw",position:"relative"}}>
              {/* 상단 롤 */}
              <div style={{height:18,background:"#2d1810",borderRadius:"9px 9px 0 0",boxShadow:"0 2px 8px rgba(45,24,16,0.4)"}}/>
              {/* 두루마리 본체 */}
              <div style={{overflow:"hidden",animation:"scrollUnfurl 1.5s ease-out forwards",height:0}}>
                <div style={{background:"#f5e6c8",border:"1px solid rgba(139,105,20,0.3)",borderTop:"none",borderBottom:"none",padding:"28px 32px",minHeight:280,display:"flex",flexDirection:"column",justifyContent:"flex-start",gap:20}}>
                  {t.loadingTexts.map((txt,i)=>(
                    <p key={i} className="loading-text" style={{fontSize:18,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",fontWeight:i===loadingIdx?700:400,opacity:i<=loadingIdx?1:0.25,transition:"all 0.5s",animation:i===loadingIdx?"textFadeIn 0.5s ease forwards":"none",letterSpacing:0.3,margin:0}}>
                      {i<loadingIdx?"✓ ":i===loadingIdx?"▸ ":"◦ "}{txt}
                    </p>
                  ))}
                </div>
              </div>
              {/* 하단 롤 */}
              <div style={{height:18,background:"#2d1810",borderRadius:"0 0 9px 9px",boxShadow:"0 -2px 8px rgba(45,24,16,0.4)"}}/>
            </div>
          </div>
        )}

        {/* Toast */}
        {showToast && (
          <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"#2d6a2d",color:"#fff",padding:"12px 28px",borderRadius:8,fontSize:14,fontWeight:700,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.25)",whiteSpace:"nowrap",fontFamily:"'Cinzel',serif",letterSpacing:0.5}}>
            {lang==="ko"?"✓ 전체 리포트가 공개됐습니다!":lang==="zh"?"✓ 完整报告已解锁！":"✓ Full report unlocked!"}
          </div>
        )}

        {/* RESULT */}
        {step==="result" && (
          <div style={{paddingTop:70,paddingBottom:40}}>
            {isReferral && (
              <div className="referral-banner fade-up">
                <div style={{fontSize:18,marginBottom:6,fontWeight:700,fontFamily:"'Cinzel',serif"}}>
                  {lang==="ko"?"친구가 KarmaMap을 공유했어요!":lang==="zh"?"朋友分享了KarmaMap！":"Your friend shared KarmaMap!"}
                </div>
                <p style={{fontSize:13,color:"rgba(45,24,16,0.55)",fontFamily:"'Cormorant Garamond',serif"}}>
                  {lang==="ko"?"리딩이 완료되면 공유자에게 PDF가 발송됩니다.":lang==="zh"?"完成测算后，链接分享者将收到PDF报告。":"Complete your reading to send the PDF to your friend."}
                </p>
              </div>
            )}
            <div style={{textAlign:"center",marginBottom:20}}>
              <h2 className="result-title" style={{fontSize:32,fontWeight:700,color:"#2d1810",fontFamily:"'Cinzel',serif",textShadow:"1px 1px 3px rgba(242,232,213,0.85)"}}>{t.resultTitle}</h2>
              <p style={{color:"rgba(45,24,16,0.6)",fontSize:16,marginTop:6,fontFamily:"'Cormorant Garamond',serif"}}>{[form.name,form.dob,form.city].filter(Boolean).join(" · ")}</p>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              <button className="action-btn" onClick={handleDownloadPDF}>PDF</button>
              <button className="action-btn" onClick={()=>{setStep("landing");setIsReferral(false);}}>← New</button>
            </div>

            {/* AdSense top */}
            <div className="ad-placeholder">{t.adLabel}</div>

            {/* Inline result — parsed directly */}
            {(() => {
              let p1={}, p2={}, p3={};
              try { const parsed=JSON.parse(result); p1=parsed.p1||{}; p2=parsed.p2||{}; p3=parsed.p3||{}; } catch {}
              const st = ST[lang]||ST.en;
              const secTitle = (text) => (
                <h3 style={{fontSize:16,fontWeight:700,color:"#2d1810",fontFamily:"'Cinzel',serif",borderBottom:"1px solid rgba(139,105,20,0.3)",paddingBottom:8,margin:"32px 0 16px",letterSpacing:0.5}}>{text}</h3>
              );
              const sq = p3.section_quarterly||{};
              const peaks = p2.section_peaks||[];

              return (
                <div id="karmamap-result">

                  {/* ── FREE: Score + verdict ── */}
                  <div style={{background:"rgba(252,248,240,0.95)",border:"1px solid rgba(139,105,20,0.2)",borderRadius:8,padding:"20px",marginBottom:16}}>
                    <div style={{display:"flex",alignItems:"center",gap:20,background:"rgba(200,75,47,0.06)",border:"1px solid rgba(200,75,47,0.2)",borderRadius:8,padding:"20px 24px"}}>
                      <div style={{textAlign:"center",minWidth:90,flexShrink:0}}>
                        <div style={{fontSize:72,fontWeight:700,color:"#c84b2f",fontFamily:"'Cinzel',serif",lineHeight:1}}>{p1.overall_score??'?'}</div>
                        <div style={{fontSize:24,color:"#8b6914",fontFamily:"'Cinzel',serif",lineHeight:1,marginTop:2}}>/ 100</div>
                      </div>
                      <p style={{fontSize:17,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:2.0,flex:1,margin:0,wordBreak:"keep-all"}}>{p1.overall_verdict}</p>
                    </div>
                  </div>

                  {/* ── FREE: 2026 System Analysis ── */}
                  {p1.section_2026&&(
                    <>
                      {secTitle(st.s2026)}
                      {(()=>{
                        const entries = Object.entries(p1.section_2026).filter(([,v])=>v);
                        const SYS_LABEL = { saju:"사주(四柱)", astrology:"서양 점성술", numerology:"수비학", vedic:"베딕 점성술" };
                        return (
                          <div style={{marginBottom:8}}>
                            {entries.map(([key,val],idx)=>(
                              <div key={key}>
                                <div style={{fontSize:18,fontWeight:700,color:"#c84b2f",fontFamily:"'Cinzel',serif",marginBottom:12}}>◈ {SYS_LABEL[key]||key}</div>
                                <p style={{fontSize:17,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:2.0,margin:0,wordBreak:"keep-all"}}>{typeof val==="string"?val:val.analysis||JSON.stringify(val)}</p>
                                {idx<entries.length-1&&<hr style={{border:"none",borderTop:"1px solid rgba(139,105,20,0.15)",margin:"24px 0"}}/>}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {/* score_table */}
                      {p1.score_table?.length>0&&(()=>{
                        const cols = ["saju","astrology","numerology","vedic"];
                        const SYS_SHORT = { saju:"사주", astrology:"점성술", numerology:"수비학", vedic:"베딕" };
                        const riskColor = (v) => v==="높음"||v==="High"||v==="高"?"#c84b2f":v==="낮음"||v==="Low"||v==="低"?"#2d6a2d":"#8b6914";
                        return (
                          <div style={{overflowX:"auto",marginTop:24,marginBottom:8}}>
                            <table style={{width:"100%",borderCollapse:"collapse",fontSize:14,fontFamily:"'Cormorant Garamond',serif"}}>
                              <thead>
                                <tr style={{background:"rgba(45,24,16,0.08)"}}>
                                  <th style={{padding:"10px 12px",textAlign:"left",color:"#2d1810",fontWeight:700,borderBottom:"2px solid rgba(139,105,20,0.2)"}}>분야</th>
                                  {cols.map(c=><th key={c} style={{padding:"10px 12px",textAlign:"center",color:"#8b6914",fontWeight:700,borderBottom:"2px solid rgba(139,105,20,0.2)"}}>{SYS_SHORT[c]}</th>)}
                                  <th style={{padding:"10px 12px",textAlign:"center",color:"#2d1810",fontWeight:700,borderBottom:"2px solid rgba(139,105,20,0.2)"}}>평균</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p1.score_table.map((row,ri)=>{
                                  const numVals = cols.map(c=>Number(row[c])).filter(v=>!isNaN(v));
                                  const avg = numVals.length ? Math.round(numVals.reduce((a,b)=>a+b,0)/numVals.length) : null;
                                  const isRisk = numVals.length===0;
                                  return (
                                    <tr key={ri} style={{borderBottom:"1px solid rgba(139,105,20,0.1)",background:ri%2===0?"transparent":"rgba(252,248,240,0.5)"}}>
                                      <td style={{padding:"10px 12px",color:"#2d1810",fontWeight:600}}>{row.category}</td>
                                      {cols.map(c=>(
                                        <td key={c} style={{padding:"10px 12px",textAlign:"center",color:isRisk?riskColor(row[c]):"#8b6914",fontWeight:isRisk?700:400}}>
                                          {row[c]??"-"}
                                        </td>
                                      ))}
                                      <td style={{padding:"10px 12px",textAlign:"center",fontWeight:700,color:isRisk?"#2d1810":avg>=80?"#c84b2f":avg>=60?"#8b6914":"#2d6a2d"}}>
                                        {isRisk?"🔴":avg??"-"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {/* ── FREE: Career Peaks TOP 5 ── */}
                  {peaks.length>0&&(
                    <>
                      {secTitle(st.peaks)}
                      {(()=>{
                        const MEDALS = ["🥇","🥈","🥉"];
                        const SYS_SHORT = { saju:"사주", astrology:"점성", numerology:"수비", vedic:"베딕" };
                        return (
                          <div style={{display:"flex",flexDirection:"column",gap:16,marginBottom:8}}>
                            {peaks.map((pk,i)=>{
                              const isTop = i===0;
                              const icon = MEDALS[i]||(pk.rank?`${pk.rank}위`:`${i+1}위`);
                              return (
                                <div key={i} style={{background:"rgba(252,248,240,0.95)",border:isTop?"2px solid #d4a017":"1px solid rgba(139,105,20,0.25)",borderRadius:8,padding:"24px",marginBottom:0}}>
                                  {/* 순위 + 연도 + 점수 */}
                                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:8}}>
                                    <div>
                                      <div style={{fontSize:isTop?22:18,marginBottom:6}}>{icon}</div>
                                      <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
                                        <span style={{fontSize:28,fontWeight:700,color:"#c84b2f",fontFamily:"'Cinzel',serif",lineHeight:1}}>{pk.peak_year}</span>
                                        <span style={{fontSize:15,color:"rgba(45,24,16,0.5)",fontFamily:"'Cormorant Garamond',serif"}}>{pk.age}</span>
                                      </div>
                                      <div style={{fontSize:15,color:"#8b6914",marginTop:8,fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic"}}>{pk.label}</div>
                                    </div>
                                    <div style={{textAlign:"right",flexShrink:0}}>
                                      <div style={{fontSize:isTop?36:28,fontWeight:700,color:isTop?"#c84b2f":"#8b6914",fontFamily:"'Cinzel',serif",lineHeight:1}}>{pk.score}</div>
                                      <div style={{fontSize:13,color:"rgba(45,24,16,0.4)",marginTop:2}}>종합 / 100</div>
                                    </div>
                                  </div>
                                  {/* 시스템별 점수 뱃지 */}
                                  {pk.systems_scores&&(
                                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                                      {Object.entries(pk.systems_scores).map(([k,v])=>(
                                        <span key={k} style={{fontSize:14,color:"#8b6914",fontFamily:"'Cormorant Garamond',serif"}}>
                                          {SYS_SHORT[k]||k} <strong style={{color:"#2d1810"}}>{v}</strong>
                                          {Object.keys(pk.systems_scores).indexOf(k)<Object.keys(pk.systems_scores).length-1&&<span style={{color:"rgba(45,24,16,0.25)",margin:"0 4px"}}>·</span>}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {/* 상세 설명 */}
                                  <p style={{fontSize:17,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:2.0,margin:0,wordBreak:"keep-all"}}>{pk.description}</p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {/* ── REFERRAL SECTION ── */}
                  <ReferralSection
                    result={result}
                    form={form}
                    lang={lang}
                    db={db}
                    parseResultData={parseResultData}
                    onUnlock={handleUnlock}
                    isUnlocked={isUnlocked}
                  />

                  {/* ── BLURRED SECTION ── */}
                  <div style={{position:"relative",marginTop:14}}>
                    <div style={{filter:isUnlocked?"none":"blur(6px)",pointerEvents:isUnlocked?"auto":"none",userSelect:isUnlocked?"auto":"none",transition:"filter 0.6s ease"}}>

                      {/* ◈ 2026 분기별 전략 */}
                      {secTitle(st.quarterly)}
                      {sq.preparation&&(
                        <p style={{fontSize:17,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:2.0,marginBottom:20,wordBreak:"keep-all"}}>{sq.preparation}</p>
                      )}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                        {["q1","q2","q3","q4"].map((qk,i)=>sq[qk]&&(
                          <div key={qk} style={{background:"rgba(252,248,240,0.95)",border:"1px solid rgba(139,105,20,0.2)",borderRadius:6,padding:"12px 14px"}}>
                            <div style={{fontSize:11,fontWeight:700,color:"#8b6914",marginBottom:4}}>Q{i+1}{sq[qk].score?` · ${sq[qk].score}/100`:""}</div>
                            <div style={{fontSize:14,fontWeight:700,color:"#2d1810",marginBottom:6,fontFamily:"'Cinzel',serif"}}>{sq[qk].label}</div>
                            <p style={{fontSize:13,color:"rgba(45,24,16,0.75)",lineHeight:1.7,margin:0,fontFamily:"'Cormorant Garamond',serif"}}>{sq[qk].strategy}</p>
                          </div>
                        ))}
                      </div>
                      {sq.critical_date&&(
                        <div style={{background:"rgba(252,248,240,0.95)",border:"1px solid rgba(212,160,23,0.3)",borderRadius:8,padding:"12px 20px",marginBottom:12,display:"flex",alignItems:"center",flexWrap:"wrap",gap:8}}>
                          <span style={{fontSize:13,fontWeight:700,color:"#8b6914",whiteSpace:"nowrap"}}>📅 {sq.critical_date.date}</span>
                          <span style={{fontSize:13,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif"}}>{sq.critical_date.reason}</span>
                        </div>
                      )}
                      {((sq.attack_windows||[]).length>0||(sq.defend_windows||[]).length>0)&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                          {(sq.attack_windows||[]).map((w,i)=>(
                            <span key={`a${i}`} style={{fontSize:12,background:"rgba(200,75,47,0.1)",border:"1px solid rgba(200,75,47,0.3)",borderRadius:20,padding:"5px 14px",color:"#c84b2f",fontWeight:700,fontFamily:"'Cinzel',serif",whiteSpace:"nowrap"}}>⚡ {w}</span>
                          ))}
                          {(sq.defend_windows||[]).map((w,i)=>(
                            <span key={`d${i}`} style={{fontSize:12,background:"rgba(45,24,16,0.06)",border:"1px solid rgba(45,24,16,0.2)",borderRadius:20,padding:"5px 14px",color:"#2d1810",fontWeight:700,fontFamily:"'Cinzel',serif",whiteSpace:"nowrap"}}>🛡 {w}</span>
                          ))}
                        </div>
                      )}

                      {/* ◈ 반드시 극복할 위기 */}
                      {p3.section_crisis?.length>0&&(
                        <>
                          {secTitle(st.crisis)}
                          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:8}}>
                            {p3.section_crisis.map((c,i)=>(
                              <div key={i} style={{background:"rgba(212,160,23,0.06)",border:"1px solid rgba(212,160,23,0.22)",borderRadius:8,padding:"14px 18px"}}>
                                <div style={{fontSize:13,fontWeight:700,color:"#c84b2f",marginBottom:4}}>⚠ {c.title}{c.period?` · ${c.period}`:""}</div>
                                <p style={{fontSize:17,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:2.0,margin:"0 0 10px",wordBreak:"keep-all"}}>{c.description}</p>
                                {c.overcome&&<p style={{fontSize:15,color:"rgba(45,24,16,0.75)",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.9,margin:0,wordBreak:"keep-all"}}>→ {c.overcome}</p>}
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* ◈ 나의 한계점 */}
                      {p3.section_limits?.length>0&&(
                        <>
                          {secTitle(st.limits)}
                          <div style={{marginBottom:8}}>
                            {p3.section_limits.map((b,i)=><p key={i} style={{fontSize:17,color:"rgba(45,24,16,0.85)",fontFamily:"'Cormorant Garamond',serif",lineHeight:2.0,margin:"0 0 10px",wordBreak:"keep-all"}}>▪ {typeof b==="string"?b:b.description||JSON.stringify(b)}</p>)}
                          </div>
                        </>
                      )}

                      {/* ◈ 반드시 만나야 할 사람 */}
                      {p3.section_meet&&(
                        <>
                          {secTitle(st.meet)}
                          <p style={{fontSize:17,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:2.0,marginBottom:8,wordBreak:"keep-all"}}>{typeof p3.section_meet==="string"?p3.section_meet:p3.section_meet.description||JSON.stringify(p3.section_meet)}</p>
                        </>
                      )}

                      {/* ◈ 반드시 배워야 할 것 */}
                      {p3.section_learn&&(
                        <>
                          {secTitle(st.learn)}
                          <p style={{fontSize:17,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:2.0,marginBottom:8,wordBreak:"keep-all"}}>{typeof p3.section_learn==="string"?p3.section_learn:p3.section_learn.description||JSON.stringify(p3.section_learn)}</p>
                        </>
                      )}

                      {/* ◈ 책사의 최종 한마디 */}
                      {p3.section_final&&(
                        <>
                          {secTitle(st.final)}
                          <blockquote style={{borderLeft:"3px solid #c84b2f",paddingLeft:20,margin:"0 0 16px",fontStyle:"italic",fontSize:22,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",lineHeight:1.9,wordBreak:"keep-all"}}>
                            {typeof p3.section_final==="string"?p3.section_final:p3.section_final.message||JSON.stringify(p3.section_final)}
                          </blockquote>
                        </>
                      )}

                    </div>

                    {/* Blur overlay */}
                    {!isUnlocked&&(
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,pointerEvents:"none"}}>
                        <div style={{background:"rgba(242,232,213,0.97)",border:"1px solid rgba(200,75,47,0.35)",borderRadius:10,padding:"18px 28px",textAlign:"center",maxWidth:300,boxShadow:"0 4px 32px rgba(45,24,16,0.18)"}}>
                          <div style={{fontSize:24,marginBottom:8}}>🔒</div>
                          <p style={{fontSize:13,fontWeight:700,color:"#c84b2f",fontFamily:"'Cinzel',serif",lineHeight:1.7,margin:0}}>
                            {lang==="ko"?"링크 복사 → 이메일 입력":lang==="zh"?"复制链接 → 输入邮箱":"Copy link → enter email"}
                          </p>
                          <p style={{fontSize:11,color:"rgba(45,24,16,0.55)",fontFamily:"'Cormorant Garamond',serif",marginTop:6,margin:"6px 0 0"}}>
                            {lang==="ko"?"→ 전체 전략 공개":lang==="zh"?"→ 立即解锁完整报告":"→ Unlock full strategy"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── ALWAYS BOTTOM ── */}
                  <AIHandoffSection result={result} form={form} lang={lang} theme={theme} primaryColor={p}/>

                  {/* AI Chat */}
                  <div style={{marginTop:24}}>
                    <h3 style={{fontSize:16,fontWeight:700,color:"#2d1810",fontFamily:"'Cinzel',serif",borderBottom:"1px solid rgba(139,105,20,0.3)",paddingBottom:8,margin:"32px 0 16px",letterSpacing:0.5}}>◈ AI Chat</h3>
                    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14,maxHeight:"52vh",overflowY:"auto",paddingRight:4}}>
                      {chatMessages.map((msg,i)=>(
                        <div key={i} className={msg.role==="ai"?"chat-ai":"chat-user"}>
                          {msg.role==="ai"&&<span style={{fontSize:10,color:"#8b6914",fontWeight:700,display:"block",marginBottom:4,fontFamily:"'Cormorant Garamond',serif",letterSpacing:0.5}}>◈ KarmaMap AI</span>}
                          {msg.text}
                        </div>
                      ))}
                      {chatLoading&&<div className="chat-ai"><span style={{color:theme.muted}}>...</span></div>}
                      <div ref={chatEndRef}/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <input className="input-field" style={{flex:1,padding:"12px 14px"}} placeholder={t.chatPlaceholder} value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleChat()}/>
                      <button className="cta-btn" style={{padding:"12px 20px",fontSize:14,animation:"none"}} onClick={handleChat}>{t.sendBtn}</button>
                    </div>
                  </div>

                  {/* Share Card */}
                  <div style={{marginTop:24,background:"rgba(252,248,240,0.95)",border:"1px solid rgba(212,160,23,0.3)",borderRadius:8,padding:"20px 24px"}}>
                    <h3 style={{fontSize:15,fontWeight:700,color:"#2d1810",fontFamily:"'Cinzel',serif",margin:"0 0 8px"}}>
                      {lang==="ko"?"결과 카드 공유":lang==="zh"?"分享结果卡片":"Share Your Result"}
                    </h3>
                    <p style={{fontSize:13,color:"rgba(45,24,16,0.65)",fontFamily:"'Cormorant Garamond',serif",marginBottom:14,lineHeight:1.7}}>
                      {lang==="ko"?"결과 카드를 저장해서 인스타/카톡 스토리에 공유하세요":lang==="zh"?"保存并在Instagram或KakaoTalk Story分享您的结果卡片":"Save & share your result card on Instagram or KakaoTalk Story"}
                    </p>
                    <button onClick={generateShareCard} style={{background:"#c84b2f",color:"#f5e6c8",border:"none",padding:"10px 22px",borderRadius:4,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Cinzel',serif",letterSpacing:0.5}}>
                      {lang==="ko"?"카드 공유":lang==="zh"?"分享卡片":"Share Card"}
                    </button>
                  </div>

                </div>
              );
            })()}

            {/* ── Comments Section ── */}
            <div style={{marginTop:32,paddingBottom:60}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:8}}>
                <h3 style={{fontSize:16,fontWeight:700,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif",textShadow:"1px 1px 3px rgba(242,232,213,0.85)"}}>{t.commentsTitle.replace(/🔮/g,"◈")}</h3>
                <button className={`filter-toggle ${langFilter?"active":""}`} onClick={()=>setLangFilter(f=>!f)}>
                  {LANG_CONFIG[lang].flag} {t.commentLangFilter}
                </button>
              </div>
              <div style={{background:"rgba(242,232,213,0.82)",border:"1px solid rgba(139,105,20,0.3)",borderRadius:4,padding:16,marginBottom:20}}>
                {result && (()=>{
                  const {score,peakYear}=parseResultData(result);
                  const goalShort=(form.goal||"").split("/")[0].trim();
                  return (
                    <div style={{fontSize:12,color:"#8b6914",fontWeight:700,marginBottom:12,padding:"6px 10px",background:"rgba(139,105,20,0.08)",borderRadius:4,border:"1px solid rgba(139,105,20,0.25)",fontFamily:"'Cormorant Garamond',serif"}}>
                      {t.commentPeakPrefix} {peakYear} · {t.commentScorePrefix} {score}/100 · {goalShort}
                    </div>
                  );
                })()}
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <input className="input-field" style={{padding:"10px 12px",fontSize:13}} placeholder={t.commentNamePlaceholder} value={commentName} onChange={e=>setCommentName(e.target.value.slice(0,30))} maxLength={30}/>
                  <textarea className="input-field" style={{padding:"10px 12px",fontSize:13,resize:"vertical",minHeight:60,fontFamily:fn}} placeholder={t.commentTextPlaceholder} value={commentText} onChange={e=>setCommentText(e.target.value.slice(0,300))} maxLength={300} rows={2}/>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <span style={{fontSize:11,color:theme.muted}}>{commentText.length}/300</span>
                    <button className="cta-btn" style={{padding:"9px 22px",fontSize:13,animation:"none"}} onClick={submitComment} disabled={commentSubmitting}>
                      {commentSubmitting?"…":commentPosted?t.commentPosted:t.commentSubmit}
                    </button>
                  </div>
                  {commentError&&<p style={{color:"#ff6b6b",fontSize:12,marginTop:2}}>{commentError}</p>}
                </div>
              </div>
              {commentsLoading ? (
                <div style={{textAlign:"center",color:theme.muted,padding:24,fontSize:13}}>⏳</div>
              ) : comments.length===0 ? (
                <div style={{textAlign:"center",color:"rgba(45,24,16,0.45)",padding:24,fontSize:13,fontFamily:"'Cormorant Garamond',serif"}}>{t.commentEmpty}</div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {(langFilter?[...comments].sort((a,b)=>(b.lang===lang?1:0)-(a.lang===lang?1:0)):comments).map(c=>(
                    <div key={c.id} className="comment-card">
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:4}}>
                        <span style={{fontSize:13,fontWeight:700,color:"#2d1810",fontFamily:"'Cormorant Garamond',serif"}}>{LANG_CONFIG[c.lang]?.flag} {c.name}</span>
                        <span style={{fontSize:10,color:"rgba(45,24,16,0.45)"}}>{c.created_at?.toDate?new Date(c.created_at.toDate()).toLocaleDateString():""}</span>
                      </div>
                      <div style={{fontSize:12,color:"#8b6914",fontWeight:600,marginBottom:c.comment?6:8,fontFamily:"'Cormorant Garamond',serif"}}>
                        {t.commentPeakPrefix} {c.peak_year} · {t.commentScorePrefix} {c.score_2026}/100 · {c.goal}
                      </div>
                      {c.comment&&<p style={{fontSize:13,color:"#2d1810",lineHeight:1.7,marginBottom:8,fontFamily:"'Cormorant Garamond',serif"}}>{c.comment}</p>}
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {[["fire","🔥"],["wow","😮"],["target","🎯"]].map(([key,emoji])=>(
                          <button key={key} className={`reaction-btn${userReactions[c.id]?.includes(key)?" reacted":""}`} onClick={()=>addReaction(c.id,key)}>
                            {emoji} {(c.reactions?.[key]||0)>0&&<span style={{marginLeft:2}}>{c.reactions[key]}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AdSense bottom */}
            <div className="ad-placeholder" style={{marginTop:8}}>{t.adLabel}</div>

          </div>
        )}

      </div>

      {/* ── Footer ── */}
      <footer style={{textAlign:"center",padding:"20px 20px 90px",position:"relative",zIndex:10}}>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:10,flexWrap:"wrap",fontSize:12,marginBottom:8}}>
          {[["Privacy Policy","/privacy"],["Terms of Use","/terms"],["About","/about"]].map(([label,href])=>(
            <a key={label} href={href} style={{color:"rgba(45,24,16,0.5)",textDecoration:"none",transition:"color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.color="#c84b2f"}
              onMouseLeave={e=>e.currentTarget.style.color="rgba(45,24,16,0.5)"}
            >{label}</a>
          ))}
          <span style={{color:"rgba(45,24,16,0.3)"}}>·</span>
          <a href="mailto:kohmanner@gmail.com" style={{color:"rgba(45,24,16,0.5)",textDecoration:"none",transition:"color 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#c84b2f"}
            onMouseLeave={e=>e.currentTarget.style.color="rgba(45,24,16,0.5)"}
          >Contact</a>
        </div>
        <p style={{fontSize:11,color:"rgba(45,24,16,0.3)"}}>
          © 2025 KarmaMap · AI Fortune &amp; Career Strategy · Singapore
        </p>
      </footer>

      {/* Hidden canvas for card generation */}
      <canvas ref={cardCanvasRef} style={{display:"none"}} />

      {/* ── SNS Share Card Modal ── */}
      {showCardModal && (
        <div className="modal-overlay" onClick={()=>setShowCardModal(false)}>
          <div className="modal-box fade-up" style={{maxWidth:520,padding:"20px 18px"}} onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setShowCardModal(false)}>✕</button>
            <h3 style={{fontSize:17,fontWeight:800,color:"#d4a017",marginBottom:14,textAlign:"center"}}>{t.cardTitle}</h3>

            {/* Card preview */}
            <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${theme.border}`,marginBottom:16,lineHeight:0}}>
              <img
                src={cardCanvasRef.current?.toDataURL("image/png")}
                alt="KarmaMap destiny card"
                style={{width:"100%",height:"auto",display:"block"}}
              />
            </div>

            {/* Action buttons */}
            <div className="card-modal-btns" style={{display:"flex",gap:10}}>
              <button
                className="cta-btn"
                style={{flex:1,padding:"13px 16px",fontSize:14,animation:"none"}}
                onClick={downloadCard}
              >
                {t.cardDownload}
              </button>
              <button
                className="action-btn"
                style={{flex:1,textAlign:"center",padding:"13px 16px",fontSize:14}}
                onClick={shareCard}
              >
                {t.cardShare}
              </button>
            </div>

            <p style={{fontSize:11,color:theme.muted,textAlign:"center",marginTop:12,lineHeight:1.5}}>
              Save and post to Instagram, X, KakaoTalk, or WhatsApp ✦ Tag #KarmaMap
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
