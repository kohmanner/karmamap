import { useState, useEffect, useRef, useCallback } from "react";
import AIHandoffSection from "./components/AIHandoffSection";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, updateDoc, doc, increment, serverTimestamp, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: `${process.env.REACT_APP_FIREBASE_PROJECT_ID || "karmamap-dd922"}.firebaseapp.com`,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "karmamap-dd922",
  storageBucket: `${process.env.REACT_APP_FIREBASE_PROJECT_ID || "karmamap-dd922"}.firebasestorage.app`,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};
const fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

const THEMES = {
  en: { bg:"linear-gradient(135deg,#0a0a14 0%,#1a0533 50%,#0a1a3a 100%)", primary:"#ff3cac", secondary:"#784ba0", accent:"#2b86c5", cardBg:"rgba(255,255,255,0.05)", border:"rgba(255,255,255,0.1)", text:"#ffffff", muted:"rgba(255,255,255,0.5)", font:"'Outfit',sans-serif", name:"Dark Cosmic" },
  ko: { bg:"linear-gradient(135deg,#0a0a08 0%,#1a1408 50%,#0f0f0a 100%)", primary:"#d4a017", secondary:"#8b6914", accent:"#c4860a", cardBg:"rgba(212,160,23,0.06)", border:"rgba(212,160,23,0.15)", text:"#f5e6c8", muted:"rgba(245,230,200,0.5)", font:"'Noto Serif KR',serif", name:"K-미스틱" },
  zh: { bg:"linear-gradient(135deg,#1a0000 0%,#3d0000 50%,#1a0808 100%)", primary:"#ff2a2a", secondary:"#cc0000", accent:"#ffd700", cardBg:"rgba(255,42,42,0.08)", border:"rgba(255,42,42,0.2)", text:"#fff5f5", muted:"rgba(255,245,245,0.5)", font:"'Noto Serif SC',serif", name:"Red Luxury" },
  ms: { bg:"linear-gradient(135deg,#001a0a 0%,#003d1a 50%,#001408 100%)", primary:"#00c896", secondary:"#008f6a", accent:"#ffd700", cardBg:"rgba(0,200,150,0.06)", border:"rgba(0,200,150,0.15)", text:"#f0fff8", muted:"rgba(240,255,248,0.5)", font:"'Outfit',sans-serif", name:"Emerald Modern" },
  in: { bg:"linear-gradient(135deg,#1a0800 0%,#3d1a00 50%,#1a0f00 100%)", primary:"#ff8c00", secondary:"#cc6600", accent:"#20b2aa", cardBg:"rgba(255,140,0,0.08)", border:"rgba(255,140,0,0.2)", text:"#fff8f0", muted:"rgba(255,248,240,0.5)", font:"'Outfit',sans-serif", name:"Orange Vedic" },
};

const LANG_CONFIG = {
  en:{flag:"🌍",label:"EN",theme:"en"}, ko:{flag:"🇰🇷",label:"KO",theme:"ko"},
  zh:{flag:"🇨🇳",label:"ZH",theme:"zh"}, ms:{flag:"🇲🇾",label:"MS",theme:"ms"}, in:{flag:"🇮🇳",label:"IN",theme:"in"},
};

const FORTUNE_SYSTEMS = [
  {id:"saju",label:"사주팔자",sub:"Korean Four Pillars",flag:"🇰🇷"},
  {id:"numerology",label:"Numerology",sub:"수비학",flag:"🔢"},
  {id:"western",label:"Western Astrology",sub:"서양 점성술",flag:"🌍"},
  {id:"vedic",label:"Vedic Jyotish",sub:"베딕 점성술",flag:"🇮🇳"},
  {id:"ziwei",label:"紫微斗數",sub:"자미두수",flag:"🇨🇳"},
];

const GOALS = ["이직 / Job Change","창업 / Startup","승진 / Promotion","연봉협상 / Salary Negotiation","사업확장 / Business Expansion"];

const MINHWA_COLORS = {
  en: { sun:"#ff3cac", sunLight:"#ff80cc", sunDark:"#c0005a", point:"#ff3cac", btn:"linear-gradient(135deg,#ff3cac,#784ba0)" },
  ko: { sun:"#c84b2f", sunLight:"#f5823a", sunDark:"#8b2010", point:"#d4a017", btn:"linear-gradient(135deg,#c84b2f,#8b2010)" },
  zh: { sun:"#ff2a2a", sunLight:"#ff6060", sunDark:"#cc0000", point:"#ffd700", btn:"linear-gradient(135deg,#cc0000,#880000)" },
  ms: { sun:"#00c896", sunLight:"#40dbb0", sunDark:"#006b50", point:"#ffd700", btn:"linear-gradient(135deg,#008f6a,#005a42)" },
  in: { sun:"#ff8c00", sunLight:"#ffaa44", sunDark:"#cc5500", point:"#20b2aa", btn:"linear-gradient(135deg,#ff8c00,#cc6600)" },
};

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

const T = {
  en:{tagline:"Your peak year is already decided.",tagline2:"Do you know when it is?",subtitle:"AI reads your 사주, stars & numbers to find your exact career windows — your Top 5 peak years, 2026 attack vs defend timing, and the one date that matters most.",microCopy:"Results in 30 seconds. No payment required.",startBtn:"Find My Peak Year — Free",step1:"Personal Info",step2:"Career",step3:"Analysis Method",dobLabel:"Date of Birth",timeLabel:"Birth Time (optional)",timePlaceholder:"e.g. 14:30",placeLabel:"Birth City",placePlaceholder:"Search city...",jobLabel:"Current Job / Industry",jobPlaceholder:"e.g. Finance, Tech, F&B...",expLabel:"Years of Experience",goalLabel:"Current Goal",selectGoal:"Select your goal",systemLabel:"Select Fortune Systems (multi-select)",nextBtn:"Next →",backBtn:"← Back",generateBtn:"Generate My Fortune ✨",loadingTexts:["Calculating Four Pillars...","Reading the stars...","Mapping career peaks...","Cross-referencing systems...","Building your strategy..."],resultTitle:"Your Destiny & Career Report",tabs:["Fortune","AI Chat"],chatPlaceholder:"Ask anything about your reading...",sendBtn:"Send",chatIntro:"I've analyzed your destiny report. What would you like to explore?",shareBtn:"🔗 Share",downloadBtn:"📄 PDF",referralTitle:"Get Your Full PDF Report — Free",referralDesc:"Share with 1 friend → they complete their reading → we email you the full PDF report.",referralEmailPlaceholder:"Your email address",referralSendBtn:"Send PDF & Copy Link",referralCopyBtn:"Copy Link",referralCopied:"Copied!",referralEmailSent:"PDF sent! Check your inbox.",referralBannerTitle:"🎁 Your friend shared their KarmaMap reading!",referralBannerDesc:"Generating your personalized destiny report...",adLabel:"Advertisement",cardBtn:"✨ Share Card",cardTitle:"Your 2026 Destiny Card",cardDownload:"⬇ Save Image",cardShare:"Share",cardScoreLabel:"Fortune Score",cardPeakLabel:"Career Peak",cardGoalLabel:"Goal",cardTagline:"karmamap.app",commentsTitle:"What others discovered 🔮",commentPeakPrefix:"Peak Year:",commentScorePrefix:"2026:",commentNamePlaceholder:"Your name (optional)",commentTextPlaceholder:"Add a comment... (optional)",commentSubmit:"Post",commentEmpty:"Be the first to share your destiny!",commentLangFilter:"My language first",commentPosted:"Posted! ✓",commentSpam:"Please wait before posting again (max 3/hour).",commentError:"Failed to post. Try again.",commentAnon:"Anonymous"},
  ko:{tagline:"당신의 전성기는 이미 정해져 있습니다.",tagline2:"언제인지 알고 있나요?",subtitle:"사주, 별자리, 수비학으로 당신의 정확한 커리어 전성기를 찾습니다 — TOP 5 전성기 연도, 2026 공격/방어 타이밍, 그리고 가장 중요한 날짜.",microCopy:"30초 안에 결과 확인. 결제 불필요.",startBtn:"내 전성기 찾기 — 무료",step1:"기본 정보",step2:"커리어",step3:"분석 방식",dobLabel:"생년월일",timeLabel:"태어난 시간 (선택)",timePlaceholder:"예: 14:30",placeLabel:"출생지",placePlaceholder:"도시 검색...",jobLabel:"현재 직업 / 업종",jobPlaceholder:"예: 금융, IT, F&B...",expLabel:"경력 연수",goalLabel:"현재 목표",selectGoal:"목표를 선택하세요",systemLabel:"운세 시스템 선택 (복수 선택 가능)",nextBtn:"다음 →",backBtn:"← 이전",generateBtn:"운세 생성하기 ✨",loadingTexts:["사주를 계산하는 중...","별의 흐름을 읽는 중...","커리어 전성기 분석 중...","시스템 교차 분석 중...","전략을 수립하는 중..."],resultTitle:"나의 운명 & 커리어 리포트",tabs:["운세","AI 채팅"],chatPlaceholder:"리포트에 대해 더 물어보세요...",sendBtn:"전송",chatIntro:"운명 리포트 분석이 완료됐어요. 더 깊이 탐구하고 싶은 게 있나요?",shareBtn:"🔗 공유하기",downloadBtn:"📄 PDF",referralTitle:"공유하고 PDF 받기",referralDesc:"친구에게 링크를 공유하면 친구는 무료 리포트를 받고, 나는 PDF를 이메일로 받을 수 있어요.",referralEmailPlaceholder:"내 이메일 주소",referralSendBtn:"PDF 전송 & 링크 복사",referralCopyBtn:"링크 복사",referralCopied:"복사됨!",referralEmailSent:"PDF 전송 완료! 이메일을 확인하세요.",referralBannerTitle:"🎁 친구가 KarmaMap 리포트를 공유했어요!",referralBannerDesc:"나만의 운명 리포트를 생성하는 중...",adLabel:"광고",cardBtn:"✨ 카드 공유",cardTitle:"나의 2026 운명 카드",cardDownload:"⬇ 이미지 저장",cardShare:"공유하기",cardScoreLabel:"운세 점수",cardPeakLabel:"커리어 전성기",cardGoalLabel:"목표",cardTagline:"karmamap.app",commentsTitle:"다른 사람들의 발견 🔮",commentPeakPrefix:"전성기:",commentScorePrefix:"2026:",commentNamePlaceholder:"이름 (선택사항)",commentTextPlaceholder:"코멘트 추가... (선택사항)",commentSubmit:"등록",commentEmpty:"첫 번째로 운명을 공유해보세요!",commentLangFilter:"내 언어 먼저",commentPosted:"등록 완료! ✓",commentSpam:"잠시 후 다시 시도해주세요 (시간당 최대 3개).",commentError:"등록 실패. 다시 시도해주세요.",commentAnon:"익명"},
  zh:{tagline:"你的事业顶峰早已注定。",tagline2:"你知道是哪一年吗？",subtitle:"AI通过你的四柱、星象和数字，精准定位你的事业窗口 — TOP 5 顶峰年份、2026年进攻与防守时机，以及最重要的那个日期。",microCopy:"30秒出结果。无需付费。",startBtn:"找到我的顶峰年 — 免费",step1:"基本信息",step2:"职业",step3:"分析方式",dobLabel:"出生日期",timeLabel:"出生时间（可选）",timePlaceholder:"例：14:30",placeLabel:"出生地",placePlaceholder:"搜索城市...",jobLabel:"当前职业 / 行业",jobPlaceholder:"例：金融、科技、餐饮...",expLabel:"工作年限",goalLabel:"当前目标",selectGoal:"选择你的目标",systemLabel:"选择命理系统（可多选）",nextBtn:"下一步 →",backBtn:"← 返回",generateBtn:"生成我的命盘 ✨",loadingTexts:["计算四柱中...","阅读星象中...","分析事业顶峰...","交叉分析系统...","制定战略中..."],resultTitle:"我的命运与事业报告",tabs:["运势","AI对话"],chatPlaceholder:"继续询问关于你的命盘...",sendBtn:"发送",chatIntro:"我已分析完你的命运报告。你想深入探索哪方面？",shareBtn:"🔗 分享",downloadBtn:"📄 PDF",referralTitle:"分享并获取PDF",referralDesc:"将链接分享给朋友，朋友可免费获得完整报告，您将收到PDF邮件。",referralEmailPlaceholder:"您的邮箱地址",referralSendBtn:"发送PDF并复制链接",referralCopyBtn:"复制链接",referralCopied:"已复制!",referralEmailSent:"PDF已发送！请查收邮件。",referralBannerTitle:"🎁 您的朋友分享了KarmaMap报告！",referralBannerDesc:"正在为您生成专属命运报告...",adLabel:"广告",cardBtn:"✨ 分享卡片",cardTitle:"我的2026命运卡",cardDownload:"⬇ 保存图片",cardShare:"分享",cardScoreLabel:"运势得分",cardPeakLabel:"事业顶峰",cardGoalLabel:"目标",cardTagline:"karmamap.app",commentsTitle:"其他人的发现 🔮",commentPeakPrefix:"事业顶峰:",commentScorePrefix:"2026:",commentNamePlaceholder:"姓名（可选）",commentTextPlaceholder:"添加评论...（可选）",commentSubmit:"发布",commentEmpty:"成为第一个分享命运的人！",commentLangFilter:"我的语言优先",commentPosted:"发布成功! ✓",commentSpam:"请稍后再试（每小时最多3条）。",commentError:"发布失败，请重试。",commentAnon:"匿名"},
  ms:{tagline:"Tahun puncak kerjaya anda sudah ditentukan.",tagline2:"Adakah anda tahu bilanya?",subtitle:"AI membaca saju, bintang & nombor anda untuk mencari tingkap kerjaya tepat anda — TOP 5 tahun puncak, masa serangan vs pertahanan 2026, dan tarikh terpenting.",microCopy:"Keputusan dalam 30 saat. Tiada bayaran diperlukan.",startBtn:"Cari Tahun Puncak Saya — Percuma",step1:"Maklumat Peribadi",step2:"Kerjaya",step3:"Kaedah Analisis",dobLabel:"Tarikh Lahir",timeLabel:"Masa Lahir (pilihan)",timePlaceholder:"cth: 14:30",placeLabel:"Bandar Kelahiran",placePlaceholder:"Cari bandar...",jobLabel:"Pekerjaan / Industri",jobPlaceholder:"cth: Kewangan, Teknologi...",expLabel:"Tahun Pengalaman",goalLabel:"Matlamat Semasa",selectGoal:"Pilih matlamat anda",systemLabel:"Pilih Sistem Ramalan (pelbagai pilihan)",nextBtn:"Seterusnya →",backBtn:"← Kembali",generateBtn:"Jana Nasib Saya ✨",loadingTexts:["Mengira Empat Tiang...","Membaca bintang...","Memetakan puncak kerjaya...","Analisis silang sistem...","Membina strategi..."],resultTitle:"Laporan Nasib & Kerjaya Anda",tabs:["Nasib","AI Chat"],chatPlaceholder:"Tanya apa sahaja tentang bacaan anda...",sendBtn:"Hantar",chatIntro:"Saya telah menganalisis laporan nasib anda.",shareBtn:"🔗 Kongsi",downloadBtn:"📄 PDF",referralTitle:"Kongsi & Dapatkan PDF",referralDesc:"Kongsi pautan dengan rakan — mereka dapat laporan percuma, anda dapat PDF.",referralEmailPlaceholder:"Alamat e-mel anda",referralSendBtn:"Hantar PDF & Salin Pautan",referralCopyBtn:"Salin Pautan",referralCopied:"Disalin!",referralEmailSent:"PDF dihantar! Semak e-mel anda.",referralBannerTitle:"🎁 Rakan anda berkongsi laporan KarmaMap!",referralBannerDesc:"Menjana laporan nasib anda...",adLabel:"Iklan",cardBtn:"✨ Kad Kongsi",cardTitle:"Kad Nasib 2026 Anda",cardDownload:"⬇ Simpan Gambar",cardShare:"Kongsi",cardScoreLabel:"Skor Nasib",cardPeakLabel:"Puncak Kerjaya",cardGoalLabel:"Matlamat",cardTagline:"karmamap.app",commentsTitle:"Penemuan orang lain 🔮",commentPeakPrefix:"Tahun Puncak:",commentScorePrefix:"2026:",commentNamePlaceholder:"Nama anda (pilihan)",commentTextPlaceholder:"Tambah komen... (pilihan)",commentSubmit:"Hantar",commentEmpty:"Jadilah yang pertama berkongsi nasib anda!",commentLangFilter:"Bahasa saya dahulu",commentPosted:"Berjaya dihantar! ✓",commentSpam:"Sila tunggu sebentar (maks 3/jam).",commentError:"Gagal hantar. Cuba lagi.",commentAnon:"Tanpa Nama"},
  in:{tagline:"Your peak year is already written in the stars.",tagline2:"Do you know when it is?",subtitle:"AI reads your Jyotish, saju & numerology to find your exact career windows — Top 5 peak years, 2026 attack vs defend timing, and the one date that matters most.",microCopy:"Results in 30 seconds. No payment required.",startBtn:"Find My Peak Year — Free",step1:"Personal Info",step2:"Career",step3:"Analysis Method",dobLabel:"Date of Birth",timeLabel:"Birth Time (optional)",timePlaceholder:"e.g. 14:30",placeLabel:"Birth City",placePlaceholder:"Search city...",jobLabel:"Current Job / Industry",jobPlaceholder:"e.g. IT, Finance, Business...",expLabel:"Years of Experience",goalLabel:"Current Goal",selectGoal:"Select your goal",systemLabel:"Select Fortune Systems (multi-select)",nextBtn:"Next →",backBtn:"← Back",generateBtn:"Generate My Kundli ✨",loadingTexts:["Calculating Kundli...","Reading planetary positions...","Mapping career dashas...","Cross-referencing systems...","Building your strategy..."],resultTitle:"Your Destiny & Career Report",tabs:["Fortune","AI Chat"],chatPlaceholder:"Ask anything about your reading...",sendBtn:"Send",chatIntro:"I've analyzed your destiny report.",shareBtn:"🔗 Share",downloadBtn:"📄 PDF",referralTitle:"Share & Get PDF",referralDesc:"Share this link with a friend — they get a free full reading instantly. Enter your email to receive your PDF report.",referralEmailPlaceholder:"Your email address",referralSendBtn:"Send PDF & Copy Link",referralCopyBtn:"Copy Link",referralCopied:"Copied!",referralEmailSent:"PDF sent! Check your inbox.",referralBannerTitle:"🎁 Your friend shared their KarmaMap reading!",referralBannerDesc:"Generating your personalized destiny report...",adLabel:"Advertisement",cardBtn:"✨ Share Card",cardTitle:"Your 2026 Destiny Card",cardDownload:"⬇ Save Image",cardShare:"Share",cardScoreLabel:"Fortune Score",cardPeakLabel:"Career Peak",cardGoalLabel:"Goal",cardTagline:"karmamap.app",commentsTitle:"What others discovered 🔮",commentPeakPrefix:"Peak Year:",commentScorePrefix:"2026:",commentNamePlaceholder:"Your name (optional)",commentTextPlaceholder:"Add a comment... (optional)",commentSubmit:"Post",commentEmpty:"Be the first to share your destiny!",commentLangFilter:"My language first",commentPosted:"Posted! ✓",commentSpam:"Please wait before posting again (max 3/hour).",commentError:"Failed to post. Try again.",commentAnon:"Anonymous"},
};

export default function KarmaMap() {
  const [lang, setLang] = useState("en");
  const [step, setStep] = useState("landing");
  const [formStep, setFormStep] = useState(1);
  const [form, setForm] = useState({dob:"",time:"",city:"",systems:["saju","numerology"]});
  const [dobY, setDobY] = useState("");
  const [dobM, setDobM] = useState("");
  const [dobD, setDobD] = useState("");
  const [birthH, setBirthH] = useState("");
  const [birthMin, setBirthMin] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [result, setResult] = useState("");
  const [loadingIdx, setLoadingIdx] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [referralEmail, setReferralEmail] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [pdfEmailSent, setPdfEmailSent] = useState(false);
  const [isReferral, setIsReferral] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentPosted, setCommentPosted] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [langFilter, setLangFilter] = useState(true);
  const [userReactions, setUserReactions] = useState({});
  const chatEndRef = useRef(null);
  const cardCanvasRef = useRef(null);
  const starCanvasRef = useRef(null);
  const citySearchTimer = useRef(null);
  const theme = THEMES[LANG_CONFIG[lang].theme];
  const t = T[lang];

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [chatMessages]);

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

  const handleCityInput = (value) => {
    setForm(f => ({...f, city: value}));
    setShowCitySuggestions(true);
    clearTimeout(citySearchTimer.current);
    if (value.length < 2) { setCitySuggestions([]); return; }
    citySearchTimer.current = setTimeout(async () => {
      setCityLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=7&addressdetails=1`, {headers:{"Accept-Language":"en"}});
        const data = await res.json();
        const seen = new Set();
        const cities = data
          .map(p => {
            const parts = p.display_name.split(", ");
            const label = parts.slice(0, 3).join(", ");
            const val = parts[0];
            return { label, value: val };
          })
          .filter(c => { if (seen.has(c.label)) return false; seen.add(c.label); return true; });
        setCitySuggestions(cities);
      } catch(e) { setCitySuggestions([]); }
      setCityLoading(false);
    }, 400);
  };

  const toggleSystem = (id) => setForm(f => ({...f, systems: f.systems.includes(id) ? f.systems.filter(s=>s!==id) : [...f.systems,id]}));

  const buildPrompt = (activeForm, activeLang) => {
    const f = activeForm || form;
    const l = activeLang || lang;
    const sys = FORTUNE_SYSTEMS.filter(s=>f.systems.includes(s.id)).map(s=>s.label).join(", ");
    const lang_name = l==="ko"?"Korean":l==="zh"?"Chinese":l==="ms"?"Malay":"English";
    return `You are an expert fortune teller AND career strategist. Analyze using ${sys}.
Person: DOB ${f.dob}, Birth Time ${f.time||"Unknown"}, City ${f.city}.
Respond in ${lang_name} with these sections:
## 🔮 2026 Fortune Analysis
- Overall 2026 Score: X/100
- Q1/Q2/Q3/Q4 scores and strategy
- Most important date in 2026
## 💼 Career Strategy
- Career Peak Years TOP 5 (year + score)
- Current Life Season
- Specific advice for goal: ${f.goal}
- Key person to meet / Key skill to develop
## ⚡ Key Insights
- When to ATTACK (best timing)
- When to DEFEND (be cautious)
- One powerful action to take this month
Be specific and strategic. No vague answers. Real career moves tied to timing windows.`;
  };

  const handleGenerate = useCallback(async (formOverride, langOverride) => {
    const activeForm = formOverride || form;
    const activeLang = langOverride || lang;
    const activeT = T[activeLang];
    setStep("loading");
    let idx=0;
    const interval = setInterval(()=>{idx++;setLoadingIdx(idx%activeT.loadingTexts.length);},900);
    try {
      console.log("[KarmaMap] API Key:", GEMINI_API_KEY ? GEMINI_API_KEY.slice(0,8)+"…" : "MISSING");
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({contents:[{parts:[{text:buildPrompt(activeForm, activeLang)}]}],generationConfig:{temperature:0.8,maxOutputTokens:2048}})
      });
      const data = await res.json();
      console.log("[KarmaMap] Gemini response:", JSON.stringify(data).slice(0,300));
      if (!res.ok) {
        const errMsg = data.error?.message || res.statusText;
        console.error("[KarmaMap] API error:", res.status, errMsg);
        setResult(`API 오류 (${res.status}): ${errMsg}`);
        clearInterval(interval); setStep("result"); return;
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error";
      setResult(text);
      setChatMessages([{role:"ai",text:activeT.chatIntro}]);
    } catch(e) { console.error("[KarmaMap] fetch error:", e); setResult("API 연결 오류: " + e.message); }
    clearInterval(interval); setStep("result");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, lang]);

  // Detect referral from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(ref))));
        if (decoded.form && decoded.lang) {
          setForm(decoded.form);
          setLang(decoded.lang);
          setIsReferral(true);
          // Clean URL without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
          handleGenerate(decoded.form, decoded.lang);
        }
      } catch(e) { /* invalid ref param — ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Referral / Share helpers ---

  const buildReferralUrl = () => {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ form, lang }))));
    return `${window.location.origin}${window.location.pathname}?ref=${payload}`;
  };

  const handleShare = () => {
    setShowShareModal(true);
    setLinkCopied(false);
    setPdfEmailSent(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(buildReferralUrl());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch(e) {
      // fallback: select input text
      const el = document.getElementById("referral-link-input");
      if (el) { el.select(); document.execCommand("copy"); setLinkCopied(true); }
    }
  };

  const handleSendPdfEmail = () => {
    if (!referralEmail.trim()) return;
    // In production: replace this with a real email API call (e.g., SendGrid, EmailJS).
    // For now we open the user's mail client with the report summary pre-filled.
    const subject = encodeURIComponent("Your KarmaMap Destiny Report – PDF");
    const body = encodeURIComponent(
      `Your KarmaMap report is ready!\n\nDOB: ${form.dob} | City: ${form.city} | Job: ${form.job}\n\nOpen the link to view / save your full PDF:\n${buildReferralUrl()}\n\n—KarmaMap AI`
    );
    window.open(`mailto:${referralEmail}?subject=${subject}&body=${body}`);
    setPdfEmailSent(true);
  };

  const handleDownloadPDF = () => {
    window.print();
  };

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
    const scoreMatch = text.match(/(\d{2,3})\s*\/\s*100/);
    const score = scoreMatch ? scoreMatch[1] : "??";

    // Grab the first 4-digit year that looks like a career peak (2020-2040)
    const peakMatch = text.match(/20[2-3]\d/g);
    const peakYear = peakMatch ? peakMatch[0] : "2027";

    // Grab first bullet or sentence after "Key Insights" as the power action
    const insightMatch = text.match(/One powerful action[^:]*:\s*(.+)/i)
      || text.match(/this month[^:]*:\s*(.+)/i)
      || text.match(/ATTACK[^:]*:\s*(.+)/i);
    let insight = insightMatch ? insightMatch[1].replace(/\*+/g,"").trim() : "";
    if (insight.length > 72) insight = insight.slice(0, 69) + "…";

    return { score, peakYear, insight };
  };

  // Theme palette for canvas (hex values needed for Canvas API)
  const CARD_PALETTES = {
    en: { bg1:"#0a0a14", bg2:"#1a0533", bg3:"#0a1a3a", primary:"#ff3cac", accent:"#2b86c5", orb1:"#ff3cac", orb2:"#784ba0" },
    ko: { bg1:"#0a0a08", bg2:"#1c1508", bg3:"#0f0f0a", primary:"#d4a017", accent:"#c4860a", orb1:"#d4a017", orb2:"#8b6914" },
    zh: { bg1:"#1a0000", bg2:"#3d0000", bg3:"#1a0808", primary:"#ff2a2a", accent:"#ffd700", orb1:"#ff2a2a", orb2:"#cc0000" },
    ms: { bg1:"#001a0a", bg2:"#003d1a", bg3:"#001408", primary:"#00c896", accent:"#ffd700", orb1:"#00c896", orb2:"#008f6a" },
    in: { bg1:"#1a0800", bg2:"#3d1a00", bg3:"#1a0f00", primary:"#ff8c00", accent:"#20b2aa", orb1:"#ff8c00", orb2:"#cc6600" },
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

    const pal = CARD_PALETTES[LANG_CONFIG[lang].theme];
    const { score, peakYear, insight } = parseResultData(result);
    const goalShort = (form.goal || "").replace(/\s*\/.*/, "").trim();

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, pal.bg1);
    bg.addColorStop(0.5, pal.bg2);
    bg.addColorStop(1, pal.bg3);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Glow orbs
    const drawOrb = (x, y, r, color, alpha) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color + Math.round(alpha * 255).toString(16).padStart(2,"0"));
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };
    drawOrb(-60, -60, 500, pal.orb1, 0.18);
    drawOrb(W + 60, H + 60, 480, pal.orb2, 0.15);
    drawOrb(W * 0.5, H * 0.5, 340, pal.orb1, 0.07);

    // Subtle grid lines
    ctx.strokeStyle = pal.primary + "18";
    ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 90) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    }
    for (let i = 0; i < H; i += 90) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
    }

    // Top bar: logo + tagline
    ctx.fillStyle = pal.primary;
    ctx.font = "bold 38px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🔮 KarmaMap", W / 2, 96);
    ctx.fillStyle = "#ffffff88";
    ctx.font = "26px Arial";
    ctx.fillText("AI Fortune × Career Strategy", W / 2, 140);

    // Thin separator line
    const sepGrad = ctx.createLinearGradient(120, 0, W - 120, 0);
    sepGrad.addColorStop(0, "transparent");
    sepGrad.addColorStop(0.5, pal.primary + "88");
    sepGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = sepGrad; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(120, 166); ctx.lineTo(W - 120, 166); ctx.stroke();

    // Year badge
    const yearX = W / 2, yearY = 260;
    ctx.font = "bold 120px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff14";
    ctx.fillText("2026", yearX, yearY + 6);   // shadow
    const yearGrad = ctx.createLinearGradient(yearX - 200, yearY - 100, yearX + 200, yearY + 20);
    yearGrad.addColorStop(0, "#ffffff");
    yearGrad.addColorStop(0.5, pal.primary);
    yearGrad.addColorStop(1, pal.accent);
    ctx.fillStyle = yearGrad;
    ctx.fillText("2026", yearX, yearY);

    // Score ring
    const cx = W / 2, cy = 480, ringR = 130;
    // Outer ring (track)
    ctx.strokeStyle = "#ffffff14";
    ctx.lineWidth = 18;
    ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke();
    // Score arc
    const scoreNum = parseInt(score) || 0;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * scoreNum / 100);
    const arcGrad = ctx.createLinearGradient(cx - ringR, cy, cx + ringR, cy);
    arcGrad.addColorStop(0, pal.primary);
    arcGrad.addColorStop(1, pal.accent);
    ctx.strokeStyle = arcGrad;
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(cx, cy, ringR, startAngle, endAngle); ctx.stroke();
    // Score number
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 88px Arial";
    ctx.textAlign = "center";
    ctx.fillText(score, cx, cy + 28);
    ctx.fillStyle = pal.primary;
    ctx.font = "bold 28px Arial";
    ctx.fillText("/ 100", cx, cy + 68);
    ctx.fillStyle = "#ffffff88";
    ctx.font = "26px Arial";
    ctx.fillText(t.cardScoreLabel, cx, cy - ringR - 28);

    // Stat cards row
    const cardW = 290, cardH = 150, cardY = 660, gap = 30;
    const totalW = cardW * 2 + gap;
    const startX = (W - totalW) / 2;

    const drawStatCard = (x, y, label, value, sub) => {
      drawRoundRect(ctx, x, y, cardW, cardH, 20);
      ctx.fillStyle = pal.primary + "22";
      ctx.fill();
      drawRoundRect(ctx, x, y, cardW, cardH, 20);
      ctx.strokeStyle = pal.primary + "55";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = pal.primary;
      ctx.font = "bold 22px Arial";
      ctx.textAlign = "center";
      ctx.fillText(label, x + cardW / 2, y + 44);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 42px Arial";
      ctx.fillText(value, x + cardW / 2, y + 94);
      if (sub) {
        ctx.fillStyle = "#ffffff66";
        ctx.font = "20px Arial";
        ctx.fillText(sub, x + cardW / 2, y + 124);
      }
    };

    drawStatCard(startX, cardY, t.cardPeakLabel, peakYear, "Peak Year");
    drawStatCard(startX + cardW + gap, cardY, t.cardGoalLabel, goalShort || "Career", form.city || "");

    // Insight line
    if (insight) {
      ctx.fillStyle = "#ffffff55";
      ctx.font = "italic 26px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`"${insight}"`, W / 2, 872);
    }

    // Bottom separator
    const botGrad = ctx.createLinearGradient(120, 0, W - 120, 0);
    botGrad.addColorStop(0, "transparent");
    botGrad.addColorStop(0.5, pal.primary + "55");
    botGrad.addColorStop(1, "transparent");
    ctx.strokeStyle = botGrad; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(120, 920); ctx.lineTo(W - 120, 920); ctx.stroke();

    // Footer: dob · city  +  url
    ctx.fillStyle = "#ffffff44";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    const meta = [form.dob, form.city].filter(Boolean).join("  ·  ");
    ctx.fillText(meta, W / 2, 964);
    ctx.fillStyle = pal.primary + "cc";
    ctx.font = "bold 26px Arial";
    ctx.fillText(t.cardTagline, W / 2, 1020);

    setShowCardModal(true);
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
            await navigator.share({ files: [file], title: "My KarmaMap 2026 Destiny", url: buildReferralUrl() });
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
      const lang_name=lang==="ko"?"Korean":lang==="zh"?"Chinese":"English";
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

  const formatResult = (text) => text.split("\n").map((line,i)=>{
    if(line.startsWith("## ")) return <h3 key={i} style={{color:theme.primary,fontSize:17,fontWeight:800,margin:"18px 0 6px"}}>{line.replace("## ","")}</h3>;
    if(line.startsWith("- ")) return <p key={i} style={{color:theme.text,fontSize:14,lineHeight:1.7,marginLeft:12,marginBottom:3}}>• {line.replace("- ","")}</p>;
    if(line.startsWith("**")) return <p key={i} style={{color:theme.accent,fontSize:15,fontWeight:700,marginBottom:5}}>{line.replace(/\*\*/g,"")}</p>;
    if(line.trim()==="") return <div key={i} style={{height:6}}/>;
    return <p key={i} style={{color:theme.text,fontSize:14,lineHeight:1.7,marginBottom:3}}>{line}</p>;
  });

  const p=theme.primary; const s=theme.secondary; const fn=theme.font;
  const minhwaMode = step==="landing";
  const mc = MINHWA_COLORS[lang] || MINHWA_COLORS.en;
  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=Noto+Serif+KR:wght@400;700&family=Noto+Serif+SC:wght@400;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes float{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-14px) scale(1.04)}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes glow{0%,100%{box-shadow:0 0 24px ${p}55}50%{box-shadow:0 0 60px ${p}99,0 0 100px ${p}44}}
    @keyframes crystalPulse{0%,100%{transform:scale(1);opacity:0.5}50%{transform:scale(1.18);opacity:0.85}}
    @keyframes crystalRingOut{0%,100%{transform:scale(1);opacity:0.35}50%{transform:scale(1.12);opacity:0.7}}
    @keyframes shimmer{0%{background-position:-400% center}100%{background-position:400% center}}
    @keyframes inkFade{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
    @keyframes orbDrift{0%,100%{transform:translate(0,0)}33%{transform:translate(30px,-20px)}66%{transform:translate(-20px,15px)}}
    .fade-up{animation:fadeUp 0.7s cubic-bezier(.22,1,.36,1) forwards;}
    .crystal-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;width:160px;height:160px;margin-bottom:8px;}
    .crystal-ring{position:absolute;border-radius:50%;border:1.5px solid ${p};}
    .crystal-ring-1{inset:-22px;animation:crystalRingOut 3s ease-in-out infinite;}
    .crystal-ring-2{inset:-10px;animation:crystalRingOut 3s ease-in-out infinite 0.5s;}
    .crystal-glow{position:absolute;inset:-4px;border-radius:50%;background:radial-gradient(circle,${p}44 0%,${p}11 50%,transparent 70%);animation:crystalPulse 2.8s ease-in-out infinite;}
    .crystal-emoji{font-size:100px;line-height:1;position:relative;z-index:2;animation:float 5s ease-in-out infinite;filter:drop-shadow(0 0 24px ${p}88);}
    .title-shimmer{background:linear-gradient(90deg,${p},#fff8e7,${p},${theme.accent},#ffffff,${p});background-size:300% auto;animation:shimmer 4s linear infinite;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
    .lang-bar{display:flex;gap:4px;background:rgba(0,0,0,0.45);backdrop-filter:blur(16px);padding:5px 7px;border-radius:32px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 4px 24px rgba(0,0,0,0.3);}
    .lang-btn{background:transparent;border:none;color:${theme.muted};padding:5px 9px;border-radius:24px;cursor:pointer;font-size:18px;line-height:1;transition:all 0.2s;font-family:${fn};}
    .lang-btn:hover{background:rgba(255,255,255,0.08);transform:scale(1.15);}
    .lang-btn.active{background:${p}33;box-shadow:0 0 10px ${p}55;transform:scale(1.1);}
    .lang-dot{position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:${p};box-shadow:0 0 6px ${p};}
    .cta-btn{background:linear-gradient(135deg,${p},${s});border:none;color:#fff;padding:16px 44px;border-radius:50px;font-size:17px;font-weight:700;cursor:pointer;animation:glow 2.5s ease-in-out infinite;transition:transform 0.2s;font-family:${fn};}
    .cta-btn:hover{transform:scale(1.05);}
    .cta-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none;animation:none;}
    .input-field{width:100%;background:${theme.cardBg};border:1px solid ${theme.border};color:${theme.text};padding:13px 16px;border-radius:12px;font-size:15px;outline:none;transition:border-color 0.2s;font-family:${fn};}
    .input-field:focus{border-color:${p};}
    .input-field::placeholder{color:${theme.muted};}
    .system-card{background:${theme.cardBg};border:2px solid ${theme.border};border-radius:14px;padding:14px 12px;cursor:pointer;transition:all 0.2s;text-align:center;}
    .system-card:hover{border-color:${p};}
    .system-card.selected{border-color:${p};background:${p}22;box-shadow:0 0 16px ${p}33;}
    .tab-btn{background:transparent;border:none;color:${theme.muted};padding:10px 20px;cursor:pointer;font-size:14px;font-weight:600;border-bottom:2px solid transparent;transition:all 0.2s;font-family:${fn};white-space:nowrap;}
    .tab-btn.active{color:${p};border-bottom-color:${p};}
    .chat-ai{background:${theme.cardBg};border:1px solid ${theme.border};border-radius:16px 16px 16px 4px;padding:12px 16px;max-width:82%;font-size:14px;line-height:1.6;animation:fadeUp 0.3s ease;color:${theme.text};}
    .chat-user{background:${p}22;border:1px solid ${p}44;border-radius:16px 16px 4px 16px;padding:12px 16px;max-width:82%;font-size:14px;line-height:1.6;margin-left:auto;animation:fadeUp 0.3s ease;color:${theme.text};}
    .action-btn{background:${theme.cardBg};border:1px solid ${theme.border};color:${theme.text};padding:9px 18px;border-radius:30px;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s;font-family:${fn};}
    .action-btn:hover{background:${p}22;border-color:${p};}
    select option{background:#1a0533;color:#fff;}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;}
    .modal-box{background:linear-gradient(160deg,${theme.cardBg},rgba(0,0,0,0.95));backdrop-filter:blur(20px);border:1px solid ${p}44;border-radius:20px;padding:28px 24px;width:100%;max-width:480px;position:relative;}
    .modal-close{position:absolute;top:14px;right:16px;background:transparent;border:none;color:${theme.muted};font-size:20px;cursor:pointer;line-height:1;}
    .ad-slot{position:relative;overflow:hidden;border-radius:16px;margin:28px 0;background:linear-gradient(135deg,${p}09,${theme.accent}07);border:1px solid ${p}1a;}
    .ad-slot::before{content:"SPONSORED";position:absolute;top:8px;right:12px;font-size:9px;letter-spacing:2px;color:${theme.muted};font-family:${fn};}
    .referral-banner{background:linear-gradient(135deg,${p}22,${theme.accent}22);border:1px solid ${p}44;border-radius:14px;padding:16px;margin-bottom:20px;text-align:center;}
    .system-badge{background:${theme.cardBg};border:1px solid ${theme.border};padding:7px 15px;border-radius:22px;font-size:13px;color:${theme.text};transition:border-color 0.2s;}
    .system-badge:hover{border-color:${p}66;}
    @keyframes sunPulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 18px #c84b2f99)}50%{transform:scale(1.06);filter:drop-shadow(0 0 38px #c84b2fcc)}}
    @keyframes moonFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-10px) scale(1.03)}}
    @keyframes cloudDrift{0%,100%{transform:translateX(0)}50%{transform:translateX(12px)}}
    @keyframes craneFlap{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-18px) rotate(2deg)}}
    .minhwa-title{font-family:'Noto Serif KR',serif;color:#d4a017;text-shadow:2px 3px 0 #0a0a08,4px 5px 0 rgba(0,0,0,0.5),0 0 40px rgba(196,134,10,0.4);}
    .comment-card{background:${theme.cardBg};border:1px solid ${theme.border};border-radius:14px;padding:14px 16px;animation:fadeUp 0.4s ease;}
    .comment-card:hover{border-color:${p}44;}
    .reaction-btn{background:transparent;border:1px solid ${theme.border};border-radius:20px;padding:4px 10px;cursor:pointer;font-size:13px;color:${theme.muted};transition:all 0.18s;font-family:${fn};}
    .reaction-btn:hover{background:${p}22;border-color:${p}66;color:${theme.text};}
    .reaction-btn.reacted{background:${p}22;border-color:${p};color:${theme.text};}
    .filter-toggle{background:transparent;border:1px solid ${theme.border};border-radius:20px;padding:5px 12px;cursor:pointer;font-size:12px;color:${theme.muted};transition:all 0.18s;font-family:${fn};}
    .filter-toggle.active{background:${p}22;border-color:${p};color:${p};}
    @keyframes waveSlide{from{transform:translateX(0)}to{transform:translateX(-50%)}}
    @keyframes craneGlide{0%,100%{transform:translate(0px,0px)}25%{transform:translate(38px,-18px)}50%{transform:translate(76px,7px)}75%{transform:translate(38px,-11px)}}
    @keyframes minhwaSunPulse{0%,100%{filter:drop-shadow(0 0 16px ${mc.sun}b3)}50%{filter:drop-shadow(0 0 36px ${mc.sun}ff) drop-shadow(0 0 60px ${mc.point}80)}}
    @media print{
      body *{visibility:hidden;}
      #karmamap-result,#karmamap-result *{visibility:visible;}
      #karmamap-result{position:absolute;left:0;top:0;width:100%;background:#fff;color:#000;padding:24px;}
    }
  `;

  return (
    <div style={{minHeight:"100vh",background:minhwaMode?"url('/images/landing-bg.png') center top / cover no-repeat":theme.bg,fontFamily:fn,color:minhwaMode?"#2d1810":theme.text,position:"relative",overflow:"hidden"}}>
      <style>{css}</style>

      {/* ── Star particles ── */}
      <canvas ref={starCanvasRef} style={{position:"fixed",inset:0,zIndex:1,pointerEvents:"none",display:minhwaMode?"none":"block"}}/>

      {/* ── Ambient orbs ── */}
      {!minhwaMode && (<>
        <div style={{position:"fixed",top:-120,left:-120,width:500,height:500,background:step==="landing"?"#c84b2f":p,borderRadius:"50%",filter:"blur(140px)",opacity:step==="landing"?0.16:0.13,pointerEvents:"none",zIndex:1,animation:"orbDrift 18s ease-in-out infinite"}}/>
        <div style={{position:"fixed",bottom:80,right:-100,width:380,height:380,background:step==="landing"?"#4a9e8a":s,borderRadius:"50%",filter:"blur(120px)",opacity:step==="landing"?0.14:0.11,pointerEvents:"none",zIndex:1,animation:"orbDrift 22s ease-in-out infinite reverse"}}/>
        <div style={{position:"fixed",top:"40%",left:"60%",width:260,height:260,background:step==="landing"?"#d4a017":theme.accent,borderRadius:"50%",filter:"blur(110px)",opacity:step==="landing"?0.09:0.07,pointerEvents:"none",zIndex:1}}/>
      </>)}

      {/* ── Bottom decoration: Mountain (non-landing only) ── */}
      {!minhwaMode && (
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:2,pointerEvents:"none",height:"38vh",minHeight:200}}>
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style={{width:"100%",height:"100%",display:"block"}}>
            <defs>
              <linearGradient id="mtFar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s} stopOpacity="0.09"/>
                <stop offset="100%" stopColor={s} stopOpacity="0.04"/>
              </linearGradient>
              <linearGradient id="mtMid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={p} stopOpacity="0.07"/>
                <stop offset="100%" stopColor={p} stopOpacity="0.02"/>
              </linearGradient>
              <linearGradient id="mtNear" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.55"/>
                <stop offset="100%" stopColor="#000000" stopOpacity="0.82"/>
              </linearGradient>
              <linearGradient id="mtFog" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#0a0a14" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="transparent"/>
              </linearGradient>
              <filter id="inkBlur"><feGaussianBlur stdDeviation="2.5"/></filter>
            </defs>
            <path filter="url(#inkBlur)" d="M0,220 C80,180 140,150 220,165 C300,180 340,140 430,128 C520,116 560,155 640,160 C720,165 760,130 850,118 C940,106 990,148 1080,150 C1170,152 1230,125 1320,130 L1440,140 L1440,320 L0,320 Z" fill="url(#mtFar)"/>
            <path filter="url(#inkBlur)" d="M0,250 C60,210 110,190 190,205 C270,220 310,185 400,172 C490,159 530,195 620,200 C710,205 750,175 840,162 C930,149 980,182 1070,185 C1160,188 1220,160 1310,165 L1440,170 L1440,320 L0,320 Z" fill="url(#mtMid)"/>
            <path d="M0,272 C40,248 80,235 140,250 C200,265 240,240 310,228 C380,216 420,242 490,248 C560,254 600,232 670,222 C740,212 790,238 860,244 C930,250 970,228 1050,220 C1130,212 1190,238 1260,242 C1330,246 1390,230 1440,235 L1440,320 L0,320 Z" fill="url(#mtNear)"/>
            <rect x="0" y="230" width="1440" height="90" fill="url(#mtFog)" opacity="0.5"/>
          </svg>
        </div>
      )}


      {/* Lang switcher — flags only */}
      <div style={{position:"fixed",top:14,right:14,zIndex:100}}>
        <div className="lang-bar" style={minhwaMode?{background:"rgba(242,232,213,0.85)",borderColor:"rgba(45,24,16,0.15)",boxShadow:"0 4px 20px rgba(45,24,16,0.12)"}:{}}>
          {Object.entries(LANG_CONFIG).map(([l,cfg])=>(
            <div key={l} style={{position:"relative"}}>
              <button
                className={`lang-btn ${lang===l?"active":""}`}
                onClick={()=>setLang(l)}
                title={cfg.label}
                aria-label={cfg.label}
                style={minhwaMode?{color:"#2d1810"}:{}}
              >{cfg.flag}</button>
              {lang===l && <div className="lang-dot"/>}
            </div>
          ))}
        </div>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"0 20px",position:"relative",zIndex:10}}>

        {/* LANDING — 민화 십장생 (all languages) */}
        {step==="landing" && (
          <div className="fade-up" style={{textAlign:"center",paddingTop:"9vh",paddingBottom:220,position:"relative",zIndex:10}}>

            {/* 민화 프레임 장식 테두리 */}
            <div style={{position:"absolute",top:"-2vh",left:-8,right:-8,bottom:0,border:`1px solid ${mc.point}1e`,borderRadius:4,pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:"-2vh",left:4,right:4,bottom:8,border:`1px solid ${mc.point}0f`,borderRadius:4,pointerEvents:"none"}}/>

            {/* 오방색 점 */}
            <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:22,alignItems:"center"}}>
              {[mc.sun,"#d4a017","#2d1810","#4a9e8a","#1a3d2b"].map((c,i)=>(
                <div key={i} style={{width:i===2?10:7,height:i===2?10:7,borderRadius:"50%",background:c,boxShadow:`0 0 10px ${c}99`,opacity:0.9}}/>
              ))}
            </div>

            {/* 운명 헤더 */}
            <div style={{fontSize:10,letterSpacing:6,color:mc.sun,fontWeight:700,marginBottom:18,fontFamily:"'Noto Serif KR',serif",opacity:0.88}}>
              運命 · 命運 · DESTINY
            </div>


            {/* KarmaMap 타이틀 — 먹색 + 포인트 컬러 테두리 */}
            <h1 style={{fontSize:"clamp(50px,12vw,78px)",fontWeight:900,lineHeight:1.0,marginBottom:6,letterSpacing:"4px",fontFamily:"'Noto Serif KR',serif",color:"#2d1810",textShadow:`1px 2px 0 rgba(45,24,16,0.18),0 0 40px ${mc.point}1e`,WebkitTextStroke:`0.8px ${mc.point}`}}>
              KarmaMap
            </h1>
            <div style={{fontSize:13,letterSpacing:8,color:"#4a7c6f",fontFamily:"'Noto Serif KR',serif",marginBottom:12,opacity:0.85}}>
              카르마맵
            </div>

            {/* 민화 구분선 */}
            <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center",margin:"14px auto 18px",maxWidth:320}}>
              <div style={{flex:1,height:1,background:`linear-gradient(90deg,transparent,${mc.sun}99)`}}/>
              <svg width="26" height="26" viewBox="0 0 26 26">
                <circle cx="13" cy="13" r="9" fill="none" stroke={mc.point} strokeWidth="1.2" opacity="0.75"/>
                <circle cx="13" cy="13" r="4" fill={mc.point} opacity="0.55"/>
                <line x1="13" y1="2" x2="13" y2="24" stroke={mc.point} strokeWidth="0.8" opacity="0.45"/>
                <line x1="2" y1="13" x2="24" y2="13" stroke={mc.point} strokeWidth="0.8" opacity="0.45"/>
              </svg>
              <div style={{flex:1,height:1,background:`linear-gradient(90deg,${mc.sun}99,transparent)`}}/>
            </div>

            {/* 태그라인 */}
            <p style={{fontSize:"clamp(16px,4vw,22px)",color:"#2d1810",marginBottom:t.tagline2?2:6,fontWeight:800,fontFamily:"'Noto Serif KR',serif",opacity:0.92,lineHeight:1.25}}>
              {t.tagline}
            </p>
            {t.tagline2 && (
              <p style={{fontSize:"clamp(14px,3.5vw,18px)",color:mc.sun,marginBottom:10,fontWeight:700,fontFamily:"'Noto Serif KR',serif",opacity:0.88}}>
                {t.tagline2}
              </p>
            )}
            <p style={{fontSize:13,color:"rgba(45,24,16,0.8)",marginBottom:t.microCopy?10:30,lineHeight:1.7,maxWidth:380,margin:t.microCopy?"0 auto 10px":"0 auto 30px",fontFamily:"'Noto Serif KR',serif"}}>
              {t.subtitle}
            </p>
            {t.microCopy && (
              <p style={{fontSize:11,color:"rgba(45,24,16,0.45)",marginBottom:28,fontFamily:"'Noto Serif KR',serif",letterSpacing:0.3}}>
                {t.microCopy}
              </p>
            )}

            {/* 운세 시스템 badges */}
            <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",marginBottom:36}}>
              {FORTUNE_SYSTEMS.map(sys=>(
                <span key={sys.id} style={{background:`${mc.point}26`,border:`1px solid ${mc.point}`,padding:"6px 14px",borderRadius:20,fontSize:13,color:"#2d1810",fontFamily:"'Noto Serif KR',serif"}}>
                  {sys.flag} {sys.label}
                </span>
              ))}
            </div>

            {/* CTA 버튼 */}
            <button
              onClick={()=>{setStep("form");setFormStep(1);}}
              style={{background:"#c84b2f",border:"2px solid #d4a017",color:"#f5e6c8",padding:"16px 52px",borderRadius:4,fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:"'Noto Serif KR',serif",letterSpacing:2,boxShadow:"0 4px 24px rgba(200,75,47,0.45),inset 0 1px 0 rgba(212,160,23,0.3)",transition:"all 0.25s",animation:"glow 2.5s ease-in-out infinite"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.05)";e.currentTarget.style.boxShadow="0 6px 40px rgba(200,75,47,0.65),0 0 0 2px #d4a017";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 4px 24px rgba(200,75,47,0.45),inset 0 1px 0 rgba(212,160,23,0.3)";}}
            >
              {t.startBtn}
            </button>

            {/* 하단 특징 배지 */}
            <div style={{marginTop:32,display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap"}}>
              {(lang==="ko"?[["✦","AI 분석"],["🌏","5개 언어"],["💎","무료"],["🔒","프라이빗"]]:
                lang==="zh"?[["✦","AI分析"],["🌏","5语言"],["💎","免费"],["🔒","隐私"]]:
                lang==="ms"?[["✦","AI Analisis"],["🌏","5 Bahasa"],["💎","Percuma"],["🔒","Privat"]]:
                lang==="in"?[["✦","AI Analysis"],["🌏","5 Languages"],["💎","Free"],["🔒","Private"]]:
                [["✦","AI-Powered"],["🌏","5 Languages"],["💎","Free Forever"],["🔒","Private"]]
              ).map(([icon,label])=>(
                <span key={label} style={{fontSize:12,color:"rgba(45,24,16,0.52)",background:`${mc.point}1a`,border:`1px solid ${mc.point}52`,padding:"5px 13px",borderRadius:2,fontFamily:"'Noto Serif KR',serif"}}>
                  {icon} {label}
                </span>
              ))}
            </div>

            {/* AdSense */}
            <div style={{marginTop:36,padding:"18px 20px",minHeight:90,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:16,border:`1px solid ${mc.point}38`,background:`${mc.point}12`}}>
              <span style={{fontSize:12,color:"rgba(45,24,16,0.3)"}}>{t.adLabel}</span>
            </div>
          </div>
        )}

        {/* FORM */}
        {step==="form" && (
          <div className="fade-up" style={{paddingTop:80,paddingBottom:40}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:28}}>
              {[1,2].map((s,i)=>(
                <span key={s} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{width:32,height:32,borderRadius:"50%",background:formStep>=s?p:theme.cardBg,border:`2px solid ${formStep>=s?p:theme.border}`,color:formStep>=s?"#fff":theme.muted,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{s}</span>
                  {i<1&&<span style={{width:40,height:2,background:formStep>s?p:theme.border}}/>}
                </span>
              ))}
            </div>
            <h2 style={{fontSize:24,fontWeight:800,marginBottom:6,textAlign:"center"}}>{formStep===1?t.step1:t.step3}</h2>
            <p style={{color:theme.muted,textAlign:"center",marginBottom:28,fontSize:13}}>Step {formStep} of 2</p>

            {/* Step 1: Personal Info */}
            {formStep===1 && (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>

                {/* Date of Birth */}
                <div>
                  <label style={{fontSize:12,color:theme.muted,marginBottom:8,display:"block"}}>{t.dobLabel}</label>
                  <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 2fr",gap:8}}>
                    <select className="input-field" value={dobY} onChange={e=>setDobY(e.target.value)}>
                      <option value="">Year</option>
                      {Array.from({length:60},(_,i)=>2005-i).map(y=><option key={y} value={y}>{y}</option>)}
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
                  <label style={{fontSize:12,color:theme.muted,marginBottom:8,display:"block"}}>{t.timeLabel}</label>
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

                {/* Birth City — Nominatim autocomplete */}
                <div style={{position:"relative"}}>
                  <label style={{fontSize:12,color:theme.muted,marginBottom:8,display:"block"}}>{t.placeLabel}</label>
                  <input
                    className="input-field"
                    placeholder={t.placePlaceholder}
                    value={form.city}
                    onChange={e=>handleCityInput(e.target.value)}
                    onFocus={()=>form.city.length>=2&&setShowCitySuggestions(true)}
                    onBlur={()=>setTimeout(()=>setShowCitySuggestions(false),200)}
                    autoComplete="off"
                  />
                  {cityLoading&&<div style={{position:"absolute",right:12,top:"62%",fontSize:12,color:theme.muted}}>⏳</div>}
                  {showCitySuggestions&&citySuggestions.length>0&&(
                    <div style={{position:"absolute",top:"100%",left:0,right:0,background:"rgba(10,8,16,0.97)",border:`1px solid ${p}44`,borderRadius:"0 0 12px 12px",zIndex:50,maxHeight:220,overflowY:"auto"}}>
                      {citySuggestions.map((c,i)=>(
                        <div key={i}
                          style={{padding:"10px 14px",cursor:"pointer",fontSize:13,color:theme.text,borderBottom:i<citySuggestions.length-1?`1px solid ${theme.border}`:"none"}}
                          onMouseDown={()=>{setForm(f=>({...f,city:c.value}));setShowCitySuggestions(false);setCitySuggestions([]);}}
                          onMouseEnter={e=>e.currentTarget.style.background=`${p}22`}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                        >{c.label}</div>
                      ))}
                    </div>
                  )}
                </div>

                <button className="cta-btn" style={{marginTop:4}} onClick={()=>setFormStep(2)} disabled={!form.dob||!form.city}>{t.nextBtn}</button>
              </div>
            )}

            {/* Step 2: Fortune Systems */}
            {formStep===2 && (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <label style={{fontSize:13,color:theme.muted,fontWeight:600}}>{t.systemLabel}</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
                  {FORTUNE_SYSTEMS.map(s=>(
                    <div key={s.id} className={`system-card ${form.systems.includes(s.id)?"selected":""}`} onClick={()=>toggleSystem(s.id)}>
                      <div style={{fontSize:26,marginBottom:4}}>{s.flag}</div>
                      <div style={{fontSize:13,fontWeight:700,color:theme.text}}>{s.label}</div>
                      <div style={{fontSize:11,color:theme.muted,marginTop:2}}>{s.sub}</div>
                      {form.systems.includes(s.id)&&<div style={{marginTop:6,fontSize:16,color:p}}>✓</div>}
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
          <div className="fade-up" style={{textAlign:"center",paddingTop:"30vh"}}>
            <div style={{fontSize:60,marginBottom:24,animation:"spin 3s linear infinite",display:"inline-block"}}>⭐</div>
            <p style={{fontSize:18,color:theme.text,fontWeight:600}}>{t.loadingTexts[loadingIdx]}</p>
            <div style={{marginTop:20,display:"flex",justifyContent:"center",gap:8}}>
              {t.loadingTexts.map((_,i)=>(
                <div key={i} style={{width:8,height:8,borderRadius:"50%",background:i===loadingIdx?p:theme.border,transition:"background 0.3s"}}/>
              ))}
            </div>
          </div>
        )}

        {/* RESULT */}
        {step==="result" && (
          <div style={{paddingTop:70,paddingBottom:40}}>
            {isReferral && (
              <div className="referral-banner fade-up">
                <div style={{fontSize:22,marginBottom:6}}>{t.referralBannerTitle}</div>
                <p style={{fontSize:13,color:theme.muted}}>{form.dob} · {form.city} · {form.job}</p>
              </div>
            )}
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:28,marginBottom:8}}>✨</div>
              <h2 style={{fontSize:22,fontWeight:800}}>{t.resultTitle}</h2>
              <p style={{color:theme.muted,fontSize:12,marginTop:4}}>{form.dob} · {form.city} · {form.job}</p>
            </div>
            {/* Google AdSense – Top of result */}
            <div className="ad-placeholder">
              {/* Replace with your AdSense <ins> tag */}
              {/* <ins className="adsbygoogle" style={{display:"block"}} data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" data-ad-slot="XXXXXXXXXX" data-ad-format="auto" data-full-width-responsive="true" /> */}
              {t.adLabel}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              <button className="action-btn" onClick={handleShare}>{t.shareBtn}</button>
              <button className="action-btn" onClick={handleDownloadPDF}>{t.downloadBtn}</button>
              <button className="action-btn" style={{background:`${p}22`,borderColor:p,color:p,fontWeight:700}} onClick={generateShareCard}>{t.cardBtn}</button>
              <button className="action-btn" onClick={()=>{setStep("landing");setIsReferral(false);}}>← New Reading</button>
            </div>
            <div style={{display:"flex",overflowX:"auto",borderBottom:`1px solid ${theme.border}`,marginBottom:20,gap:4}}>
              {t.tabs.map((tab,i)=>(
                <button key={i} className={`tab-btn ${activeTab===i?"active":""}`} onClick={()=>setActiveTab(i)}>{tab}</button>
              ))}
            </div>
            {activeTab===0 && (
              <div id="karmamap-result" style={{background:theme.cardBg,border:`1px solid ${theme.border}`,borderRadius:16,padding:24}}>{formatResult(result)}</div>
            )}
            {activeTab===1 && (
              <div>
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14,maxHeight:"52vh",overflowY:"auto",paddingRight:4}}>
                  {chatMessages.map((msg,i)=>(
                    <div key={i} className={msg.role==="ai"?"chat-ai":"chat-user"}>
                      {msg.role==="ai"&&<span style={{fontSize:10,color:p,fontWeight:700,display:"block",marginBottom:4}}>🔮 KarmaMap AI</span>}
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
            )}
            {/* Google AdSense – Bottom of result */}
            <div className="ad-placeholder" style={{marginTop:24}}>
              {/* Replace with your AdSense <ins> tag */}
              {/* <ins className="adsbygoogle" style={{display:"block"}} data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" data-ad-slot="XXXXXXXXXX" data-ad-format="auto" data-full-width-responsive="true" /> */}
              {t.adLabel}
            </div>

            {/* ── AI Handoff Section ── */}
            <AIHandoffSection
              result={result}
              form={form}
              lang={lang}
              theme={theme}
              primaryColor={p}
            />

            {/* ── Comments Section ── */}
            <div style={{marginTop:32,paddingBottom:60}}>
              {/* Section header */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:8}}>
                <h3 style={{fontSize:17,fontWeight:800,color:p}}>{t.commentsTitle}</h3>
                <button
                  className={`filter-toggle ${langFilter?"active":""}`}
                  onClick={()=>setLangFilter(f=>!f)}
                >
                  {LANG_CONFIG[lang].flag} {t.commentLangFilter}
                </button>
              </div>

              {/* Submit form */}
              <div style={{background:theme.cardBg,border:`1px solid ${theme.border}`,borderRadius:16,padding:16,marginBottom:20}}>
                {/* Auto-generated line preview */}
                {result && (()=>{
                  const {score,peakYear}=parseResultData(result);
                  const goalShort=(form.goal||"").split("/")[0].trim();
                  return (
                    <div style={{fontSize:12,color:p,fontWeight:700,marginBottom:12,padding:"6px 10px",background:`${p}11`,borderRadius:8,border:`1px solid ${p}33`}}>
                      {t.commentPeakPrefix} {peakYear} · {t.commentScorePrefix} {score}/100 · {goalShort}
                    </div>
                  );
                })()}
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <input
                    className="input-field"
                    style={{padding:"10px 12px",fontSize:13}}
                    placeholder={t.commentNamePlaceholder}
                    value={commentName}
                    onChange={e=>setCommentName(e.target.value.slice(0,30))}
                    maxLength={30}
                  />
                  <textarea
                    className="input-field"
                    style={{padding:"10px 12px",fontSize:13,resize:"vertical",minHeight:60,fontFamily:fn}}
                    placeholder={t.commentTextPlaceholder}
                    value={commentText}
                    onChange={e=>setCommentText(e.target.value.slice(0,300))}
                    maxLength={300}
                    rows={2}
                  />
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <span style={{fontSize:11,color:theme.muted}}>{commentText.length}/300</span>
                    <button
                      className="cta-btn"
                      style={{padding:"9px 22px",fontSize:13,animation:"none"}}
                      onClick={submitComment}
                      disabled={commentSubmitting}
                    >
                      {commentSubmitting?"…":commentPosted?t.commentPosted:t.commentSubmit}
                    </button>
                  </div>
                  {commentError&&<p style={{color:"#ff6b6b",fontSize:12,marginTop:2}}>{commentError}</p>}
                </div>
              </div>

              {/* Comments list */}
              {commentsLoading ? (
                <div style={{textAlign:"center",color:theme.muted,padding:24,fontSize:13}}>⏳</div>
              ) : comments.length === 0 ? (
                <div style={{textAlign:"center",color:theme.muted,padding:24,fontSize:13}}>{t.commentEmpty}</div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {(langFilter
                    ? [...comments].sort((a,b)=>(b.lang===lang?1:0)-(a.lang===lang?1:0))
                    : comments
                  ).map(c=>(
                    <div key={c.id} className="comment-card">
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:4}}>
                        <span style={{fontSize:13,fontWeight:700,color:theme.text}}>
                          {LANG_CONFIG[c.lang]?.flag} {c.name}
                        </span>
                        <span style={{fontSize:10,color:theme.muted}}>
                          {c.created_at?.toDate ? new Date(c.created_at.toDate()).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <div style={{fontSize:12,color:p,fontWeight:600,marginBottom:c.comment?6:8}}>
                        {t.commentPeakPrefix} {c.peak_year} · {t.commentScorePrefix} {c.score_2026}/100 · {c.goal}
                      </div>
                      {c.comment&&<p style={{fontSize:13,color:theme.text,lineHeight:1.6,marginBottom:8}}>{c.comment}</p>}
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {[["fire","🔥"],["wow","😮"],["target","🎯"]].map(([key,emoji])=>(
                          <button
                            key={key}
                            className={`reaction-btn${userReactions[c.id]?.includes(key)?" reacted":""}`}
                            onClick={()=>addReaction(c.id,key)}
                          >
                            {emoji} {(c.reactions?.[key]||0)>0&&<span style={{marginLeft:2}}>{c.reactions[key]}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── Footer ── */}
      <footer style={{textAlign:"center",padding:"20px 20px 90px",position:"relative",zIndex:10}}>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:10,flexWrap:"wrap",fontSize:12,marginBottom:8}}>
          {[["Privacy Policy","/privacy"],["Terms of Use","/terms"]].map(([label,href])=>(
            <a key={label} href={href} style={{color:minhwaMode?"rgba(45,24,16,0.5)":theme.muted,textDecoration:"none",transition:"color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.color=minhwaMode?"#c84b2f":p}
              onMouseLeave={e=>e.currentTarget.style.color=minhwaMode?"rgba(45,24,16,0.5)":theme.muted}
            >{label}</a>
          ))}
          <span style={{color:minhwaMode?"rgba(45,24,16,0.3)":theme.muted}}>·</span>
          <a href="mailto:kohmanner@gmail.com" style={{color:minhwaMode?"rgba(45,24,16,0.5)":theme.muted,textDecoration:"none",transition:"color 0.2s"}}
            onMouseEnter={e=>e.currentTarget.style.color=minhwaMode?"#c84b2f":p}
            onMouseLeave={e=>e.currentTarget.style.color=minhwaMode?"rgba(45,24,16,0.5)":theme.muted}
          >Contact</a>
          <span style={{color:minhwaMode?"rgba(45,24,16,0.3)":theme.muted}}>·</span>
          <span style={{color:minhwaMode?"rgba(45,24,16,0.4)":theme.muted}}>About KarmaMap</span>
        </div>
        <p style={{fontSize:11,color:minhwaMode?"rgba(45,24,16,0.3)":theme.muted}}>
          © 2025 KarmaMap · AI Fortune & Career Strategy · Singapore
        </p>
      </footer>

      {/* ── Share & PDF Modal ── */}
      {showShareModal && (
        <div className="modal-overlay" onClick={()=>setShowShareModal(false)}>
          <div className="modal-box fade-up" onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setShowShareModal(false)}>✕</button>
            <h3 style={{fontSize:18,fontWeight:800,color:p,marginBottom:8}}>{t.referralTitle}</h3>
            <p style={{fontSize:13,color:theme.muted,marginBottom:18,lineHeight:1.6}}>{t.referralDesc}</p>

            {/* Shareable link */}
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              <input
                id="referral-link-input"
                readOnly
                className="input-field"
                style={{flex:1,fontSize:12,padding:"10px 12px"}}
                value={buildReferralUrl()}
              />
              <button className="action-btn" onClick={handleCopyLink} style={{whiteSpace:"nowrap",background:linkCopied?`${p}33`:undefined,borderColor:linkCopied?p:undefined}}>
                {linkCopied ? t.referralCopied : t.referralCopyBtn}
              </button>
            </div>

            {/* PDF by email */}
            <div style={{borderTop:`1px solid ${theme.border}`,paddingTop:18}}>
              <label style={{fontSize:12,color:theme.muted,marginBottom:8,display:"block"}}>📧 PDF via email</label>
              <div style={{display:"flex",gap:8}}>
                <input
                  className="input-field"
                  type="email"
                  placeholder={t.referralEmailPlaceholder}
                  value={referralEmail}
                  onChange={e=>setReferralEmail(e.target.value)}
                  style={{flex:1,padding:"10px 12px",fontSize:14}}
                  onKeyDown={e=>e.key==="Enter"&&handleSendPdfEmail()}
                />
                <button
                  className="cta-btn"
                  style={{padding:"10px 16px",fontSize:13,animation:"none",whiteSpace:"nowrap"}}
                  onClick={handleSendPdfEmail}
                  disabled={!referralEmail.trim()}
                >
                  {t.referralSendBtn}
                </button>
              </div>
              {pdfEmailSent && (
                <p style={{color:p,fontSize:13,marginTop:10,fontWeight:600}}>✓ {t.referralEmailSent}</p>
              )}
            </div>

            {/* Download PDF directly */}
            <button
              className="action-btn"
              style={{marginTop:18,width:"100%",textAlign:"center",padding:"12px"}}
              onClick={handleDownloadPDF}
            >
              {t.downloadBtn} (browser print)
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas for card generation */}
      <canvas ref={cardCanvasRef} style={{display:"none"}} />

      {/* ── SNS Share Card Modal ── */}
      {showCardModal && (
        <div className="modal-overlay" onClick={()=>setShowCardModal(false)}>
          <div className="modal-box fade-up" style={{maxWidth:520,padding:"20px 18px"}} onClick={e=>e.stopPropagation()}>
            <button className="modal-close" onClick={()=>setShowCardModal(false)}>✕</button>
            <h3 style={{fontSize:17,fontWeight:800,color:p,marginBottom:14,textAlign:"center"}}>{t.cardTitle}</h3>

            {/* Card preview */}
            <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${theme.border}`,marginBottom:16,lineHeight:0}}>
              <img
                src={cardCanvasRef.current?.toDataURL("image/png")}
                alt="KarmaMap destiny card"
                style={{width:"100%",height:"auto",display:"block"}}
              />
            </div>

            {/* Action buttons */}
            <div style={{display:"flex",gap:10}}>
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
