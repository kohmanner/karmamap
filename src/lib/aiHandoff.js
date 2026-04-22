// null/undefined 안전 처리
const f = (val, fallback = '') =>
  val !== null && val !== undefined && val !== '' ? String(val) : fallback;

// 배열 → "A, B, C"
const fList = (arr, fallback = '') =>
  Array.isArray(arr) && arr.length > 0 ? arr.join(', ') : fallback;

// 마크다운 기호 제거
const cleanText = (text) => {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^\s*[\*\-]\s/gm, '• ')
    .replace(/---/g, '──────')
    .replace(/🔮|💼|⚡|📍|🤖/g, '')
    .trim();
};

// goal 분류
const detectGoalType = (goal = '') => {
  const g = goal.toLowerCase();
  if (g.includes('promot') || g.includes('manager') || g.includes('director') || g.includes('승진')) return 'promotion';
  if (g.includes('change') || g.includes('switch') || g.includes('new job') || g.includes('이직')) return 'job_change';
  if (g.includes('startup') || g.includes('founder') || g.includes('business') || g.includes('창업')) return 'startup';
  if (g.includes('salary') || g.includes('income') || g.includes('money') || g.includes('연봉')) return 'income_growth';
  if (g.includes('lead') || g.includes('executive') || g.includes('influence')) return 'leadership';
  return 'general';
};

// result 텍스트에서 핵심 값 추출
export const parseResultText = (text = '') => {
  const scoreMatch = text.match(/(\d{2,3})\s*\/\s*100/);
  const score = scoreMatch ? scoreMatch[1] : null;
  const yearMatches = text.match(/20[2-3]\d/g) || [];
  const peakYear = yearMatches[0] || null;
  const attackMatch = text.match(/attack[^:.\n]*?(Q[1-4])/i) || text.match(/(Q[1-4])[^.\n]*?attack/i);
  const defendMatch = text.match(/defend[^:.\n]*?(Q[1-4])/i) || text.match(/(Q[1-4])[^.\n]*?defend/i);
  const attackQ = attackMatch ? (attackMatch[1] || attackMatch[0].match(/Q[1-4]/i)?.[0]) : null;
  const defendQ = defendMatch ? (defendMatch[1] || defendMatch[0].match(/Q[1-4]/i)?.[0]) : null;
  return { score, peakYear, attackQ, defendQ };
};

// SHORT PROMPT (EN)
export const buildShortPromptEN = (state) => {
  const { result = '', form = {} } = state;
  const { score, peakYear, attackQ, defendQ } = parseResultText(result);

  return `I received a KarmaMap destiny & career reading.

My profile:
${form.name ? `- My name: ${form.name}` : ''}
${form.dob ? `- Date of birth: ${form.dob}` : ''}
${form.city ? `- Birth city: ${form.city}` : ''}
${form.job ? `- Job: ${form.job}` : ''}
${form.exp ? `- Experience: ${form.exp} years` : ''}
${form.goal ? `- Goal: ${form.goal}` : ''}
${form.systems?.length ? `- Systems analyzed: ${form.systems.join(', ')}` : ''}

Key results:
- 2026 score: ${f(score, '?')}/100
${peakYear ? `- Career peak year (top): ${peakYear}` : ''}
${attackQ ? `- Attack window: ${attackQ}` : ''}
${defendQ ? `- Defend window: ${defendQ}` : ''}

My full reading:
---
${cleanText(result).slice(0, 1800)}
---

Use this as strategic context only. Do NOT re-summarize it.

Do these 4 things:
1. What this means for my real career situation right now
2. My top 3 priorities for the next 90 days
3. 3 mistakes to avoid in 2026
4. The single strongest move I should make now

Be specific. No generic advice.`.trim();
};

// SHORT PROMPT (KO)
export const buildShortPromptKO = (state) => {
  const { result = '', form = {} } = state;
  const { score, peakYear, attackQ, defendQ } = parseResultText(result);

  return `나는 KarmaMap 운명 & 커리어 리포트를 받았다.

내 프로필:
${form.name ? `- 이름: ${form.name}` : ''}
${form.dob ? `- 생년월일: ${form.dob}` : ''}
${form.city ? `- 출생지: ${form.city}` : ''}
${form.job ? `- 직업: ${form.job}` : ''}
${form.exp ? `- 경력: ${form.exp}년` : ''}
${form.goal ? `- 목표: ${form.goal}` : ''}
${form.systems?.length ? `- 분석 시스템: ${form.systems.join(', ')}` : ''}

주요 결과:
- 2026 점수: ${f(score, '?')}/100
${peakYear ? `- 커리어 정점기 1위: ${peakYear}년` : ''}
${attackQ ? `- 공격 구간: ${attackQ}` : ''}
${defendQ ? `- 방어 구간: ${defendQ}` : ''}

내 전체 리포트:
---
${cleanText(result).slice(0, 1800)}
---

이 결과를 전략적 맥락으로만 써줘. 다시 요약하지 마.

아래 4가지만 해줘:
1. 이게 내 실제 커리어에서 어떤 의미인지
2. 앞으로 90일 핵심 우선순위 3개
3. 2026년에 피해야 할 실수 3개
4. 지금 당장 해야 할 가장 강한 행동 1개

구체적으로, 일반론 없이.`.trim();
};

// FULL PROMPT (EN)
export const buildFullPromptEN = (state) => {
  const { result = '', form = {} } = state;
  const { score, peakYear, attackQ, defendQ } = parseResultText(result);

  return `I received a KarmaMap destiny & career reading and want to turn it into a concrete action plan.

My profile:
${form.name ? `- My name: ${form.name}` : ''}
${form.dob ? `- Date of birth: ${form.dob}` : ''}
${form.time ? `- Birth time: ${form.time}` : ''}
${form.city ? `- Birth city: ${form.city}` : ''}
${form.job ? `- Job / Industry: ${form.job}` : ''}
${form.exp ? `- Experience: ${form.exp} years` : ''}
- Goal: ${f(form.goal, 'career growth')}
${form.systems?.length ? `- Systems analyzed: ${form.systems.join(', ')}` : ''}

Key 2026 results:
- Score: ${f(score, '?')}/100
${peakYear ? `- Career peak year (top): ${peakYear}` : ''}
${attackQ ? `- Attack window: ${attackQ}` : ''}
${defendQ ? `- Defend window: ${defendQ}` : ''}

Full reading:
---
${cleanText(result)}
---

Use this reading as strategic context only.
Do NOT re-explain it. Do NOT give vague advice.

Transform it into:
1. Reality Check — what this means for my situation NOW
2. 30/60/90-Day Action Plan
3. Risks to avoid in 2026
4. People / Network strategy
5. Skills / Capability to build
6. 5 decision rules for 2026 (what to say yes/no to)
7. Weekly execution checklist
8. One-sentence operating principle for 2026

Be specific, practical, strategic. Tailored to my goal.`.trim();
};

// FULL PROMPT (KO)
export const buildFullPromptKO = (state) => {
  const { result = '', form = {} } = state;
  const { score, peakYear, attackQ, defendQ } = parseResultText(result);

  return `나는 KarmaMap 운명 & 커리어 리포트를 받았다. 이걸 구체적인 실행계획으로 바꿔줘.

내 프로필:
${form.name ? `- 이름: ${form.name}` : ''}
${form.dob ? `- 생년월일: ${form.dob}` : ''}
${form.time ? `- 태어난 시간: ${form.time}` : ''}
${form.city ? `- 출생지: ${form.city}` : ''}
${form.job ? `- 직업 / 업종: ${form.job}` : ''}
${form.exp ? `- 경력: ${form.exp}년` : ''}
- 목표: ${f(form.goal, '커리어 성장')}
${form.systems?.length ? `- 분석 시스템: ${form.systems.join(', ')}` : ''}

주요 2026 결과:
- 점수: ${f(score, '?')}/100
${peakYear ? `- 커리어 정점기 1위: ${peakYear}년` : ''}
${attackQ ? `- 공격 구간: ${attackQ}` : ''}
${defendQ ? `- 방어 구간: ${defendQ}` : ''}

전체 리포트:
---
${cleanText(result)}
---

이 리포트를 전략 맥락으로만 사용해줘.
다시 설명하거나 막연한 조언 하지 마.

다음으로 변환해줘:
1. 현실 점검 — 지금 내 상황에서 이게 의미하는 것
2. 30/60/90일 실행계획
3. 2026년 피해야 할 리스크
4. 사람 / 네트워크 전략
5. 키워야 할 스킬 / 역량
6. 2026년 의사결정 5원칙 (무엇에 yes/no 할지)
7. 주간 실행 체크리스트
8. 2026년 한 문장 운영 원칙

구체적, 실용적, 전략적으로. 내 목표에 맞게.`.trim();
};

// GOAL-FOCUSED PROMPT (EN)
export const buildGoalPromptEN = (state) => {
  const goalType = detectGoalType(state?.form?.goal);
  const focusMap = {
    promotion: 'internal visibility, sponsorship, and positioning for promotion',
    job_change: 'timing your move, interview readiness, and offer negotiation',
    startup: 'launch timing, co-founder/partner selection, and early focus',
    income_growth: 'leverage, negotiation, and monetizable skill building',
    leadership: 'authority, trust-building, and decision-making',
    general: 'career momentum, positioning, and key opportunities',
  };
  const focus = focusMap[goalType];
  return buildShortPromptEN(state) + `\n\nFocus especially on: ${focus}.`;
};

// GOAL-FOCUSED PROMPT (KO)
export const buildGoalPromptKO = (state) => {
  const goalType = detectGoalType(state?.form?.goal);
  const focusMap = {
    promotion: '내부 가시성, 스폰서십, 승진 포지셔닝',
    job_change: '이직 타이밍, 면접 준비, 연봉 협상',
    startup: '런칭 타이밍, 공동창업자/파트너 선택, 초기 집중',
    income_growth: '레버리지, 협상, 수익화 가능한 스킬 개발',
    leadership: '권위, 신뢰 구축, 의사결정',
    general: '커리어 모멘텀, 포지셔닝, 핵심 기회',
  };
  const focus = focusMap[goalType];
  return buildShortPromptKO(state) + `\n\n특히 이 부분에 집중해줘: ${focus}.`;
};

// WEEKLY PROMPT (EN)
export const buildWeeklyPromptEN = (state) => {
  const { result = '', form = {} } = state;
  const { score, attackQ, defendQ } = parseResultText(result);
  return `Based on my KarmaMap reading, give me a practical plan for this week.

Context:
- Goal: ${f(form.goal, 'career growth')}
${form.job ? `- Job: ${form.job}` : ''}
- 2026 score: ${f(score, '?')}/100
${attackQ ? `- Attack window: ${attackQ}` : ''}
${defendQ ? `- Defend window: ${defendQ}` : ''}

Tell me:
1. Top 3 priorities this week
2. One thing to avoid
3. One person type to reach out to
4. One skill or task to strengthen
5. One sentence to keep in mind

Brief and practical.`.trim();
};

// WEEKLY PROMPT (KO)
export const buildWeeklyPromptKO = (state) => {
  const { result = '', form = {} } = state;
  const { score, attackQ, defendQ } = parseResultText(result);
  return `KarmaMap 결과를 바탕으로 이번 주 실행계획을 줘.

맥락:
- 목표: ${f(form.goal, '커리어 성장')}
${form.job ? `- 직업: ${form.job}` : ''}
- 2026 점수: ${f(score, '?')}/100
${attackQ ? `- 공격 구간: ${attackQ}` : ''}
${defendQ ? `- 방어 구간: ${defendQ}` : ''}

알려줘:
1. 이번 주 핵심 우선순위 3개
2. 피해야 할 것 1개
3. 연락해야 할 사람 유형 1개
4. 강화해야 할 스킬/태스크 1개
5. 기억해야 할 한 문장

간결하고 실용적으로.`.trim();
};

// QUICK PROMPTS
export const QUICK_PROMPTS = {
  en: [
    "Turn this reading into a 90-day action plan.",
    "What should I do differently in Q2 versus Q3?",
    "What are the biggest mistakes I could make in 2026?",
    "Who should I learn from or work with based on this reading?",
    "Turn this into a weekly execution checklist.",
  ],
  ko: [
    "이 결과를 90일 실행계획으로 바꿔줘.",
    "Q2와 Q3에서 각각 어떻게 다르게 움직여야 하는지 알려줘.",
    "2026년에 내가 저지를 가장 큰 실수를 알려줘.",
    "이 결과를 바탕으로 누구에게 배우고 누구와 일해야 하는지 알려줘.",
    "이 결과를 주간 실행 체크리스트로 바꿔줘.",
  ],
};

// 통합 export
export const buildPrompt = (type, lang, state) => {
  const isKo = lang === 'ko';
  if (type === 'short') return isKo ? buildShortPromptKO(state) : buildShortPromptEN(state);
  if (type === 'full') return isKo ? buildFullPromptKO(state) : buildFullPromptEN(state);
  if (type === 'goal') return isKo ? buildGoalPromptKO(state) : buildGoalPromptEN(state);
  if (type === 'weekly') return isKo ? buildWeeklyPromptKO(state) : buildWeeklyPromptEN(state);
  return isKo ? buildShortPromptKO(state) : buildShortPromptEN(state);
};
