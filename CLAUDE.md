# Karma Map — Project Context

항상 한국어로 대화해줘.

---

## 1. 프로젝트 개요

- **이름**: Karma Map
- **목적**: AI 운세 + 커리어 전략 웹앱
- **타겟**: 싱가포르 + SEA (한국계, 중화계, 인도계, 말레이계, 서양인)
- **URL**: https://karmamap-dd922.web.app
- **Firebase 프로젝트**: `karmamap-dd922`
- **수익 모델**: Google AdSense 100% (와이프 계정 `ca-pub-2448306889621853`)
- **PDF 수령**: 리퍼럴 시스템으로만 — 친구가 리딩 완료 시 이메일 발송
- **GitHub**: kohmanner/karmamap

---

## 2. 기술 스택

- **프론트엔드**: React (Create React App), 인라인 CSS-in-JS
- **호스팅**: Firebase Hosting (`firebase deploy`)
- **DB**: Firestore (댓글, 리액션)
- **AI**: Gemini API (`gemini-2.0-flash`), 키는 `.env` → `REACT_APP_GEMINI_API_KEY`
- **라우팅**: 없음 (React Router 미사용, step state로 화면 전환)
- **상태관리**: useState만 사용 (Redux 없음)

---

## 3. 파일 구조

```
src/
  App.js                        # 메인 컴포넌트 (전체 로직 + UI)
  translations.js               # T 객체 — 언어별 복사 문자열
  themes.js                     # THEMES 객체 — 언어별 테마 색상
  lib/
    gemini.js                   # Gemini API 호출 래퍼
    firestore.js                # Firestore 댓글/리액션 CRUD
    aiHandoff.js                # AI Handoff 프롬프트 빌더
    share.js                    # SNS 공유카드 Canvas 생성
  components/
    ResultTabs.jsx              # 결과 탭 4개 렌더러
    ReferralSection.jsx         # 리퍼럴 섹션
    CommentsSection.jsx         # 댓글/리액션 섹션
    AIHandoffSection.jsx        # AI 이어받기 섹션

public/
  index.html                    # SEO 메타태그 + AdSense 스크립트
  about.html                    # About 페이지 (/about)
  privacy.html                  # Privacy Policy (/privacy)
  terms.html                    # Terms of Use (/terms)
  sitemap.xml
  robots.txt
  images/
    landing-bg.png              # 민화 십장생 배경
    form-bg.png                 # 한복 여인 배경
    loading-bg.png              # 두루마리 길 배경
    report-bg.png               # 처마+눈 배경
```

---

## 4. 디자인 시스템

### 배경 이미지 (단계별 교체)

| Step | 이미지 |
|------|--------|
| landing | `url('/images/landing-bg.png')` |
| form | `url('/images/form-bg.png')` |
| loading | `url('/images/loading-bg.png')` |
| result | `url('/images/report-bg.png')` |

공통: `center top / cover no-repeat fixed`

### 색상 팔레트

- **메인 텍스트**: `#2d1810` (먹색)
- **포인트 레드**: `#c84b2f` (주홍)
- **포인트 골드**: `#d4a017` (금색)
- **카드 배경**: `rgba(242,232,213,0.82)` (한지색 반투명)
- **카드 테두리**: `1px solid rgba(212,160,23,0.3)`
- **인풋 배경**: `rgba(255,255,255,0.7)`

### 타이포그래피

- **타이틀**: `"Karma Map"` — Noto Serif KR italic 900, `#2d1810`, letter-spacing 4px, text-shadow `2px 2px 0px rgba(212,160,23,0.3)`
- **본문**: Outfit 400/600/700
- **폼 헤딩**: Outfit 800

### MINHWA_COLORS

언어별 포인트 컬러 객체 (`mc.sun`, `mc.point`, `mc.btn`). 현재 랜딩 정리 후 직접 사용은 최소화됨.

---

## 5. 언어 시스템

| 코드 | 언어 | 상태 |
|------|------|------|
| en | English | 완전 번역 |
| ko | 한국어 | 완전 번역 |
| zh | 中文 (简体) | 완전 번역 |
| tw | 中文 (繁體) | 완전 번역 |
| id | Indonesia | 완전 번역 |
| ms | Bahasa Melayu | 완전 번역 |
| in | हिन्दी | 완전 번역 |
| jp | 日本語 | 영어 UI 유지 |
| vn | Tiếng Việt | 영어 UI 유지 |
| th | ภาษาไทย | 영어 UI 유지 |
| ph | Filipino | 영어 UI 유지 |
| bn | বাংলা | 영어 UI 유지 |

- `T` 객체: 복사 문자열 키는 **모든 지원 언어에 추가**해야 함
- Gemini가 결과를 해당 언어로 직접 생성
- 언어 버튼: EN KR ZH MY IN 텍스트 코드 표시 (플래그 이모지 사용 안 함)

---

## 6. 핵심 기능 흐름

### 입력 폼 (3단계)

- **Step 1**: 생년월일 (드롭다운), 출생 시간 (선택), 출생 도시 (자동완성)
- **Step 2**: 직업/업종, 경력 연수, 현재 목표 (이직/창업/승진/연봉협상/사업확장)
- **Step 3**: 운세 시스템 다중 선택 (사주팔자/Numerology/Western Astrology/Vedic Jyotish/紫微斗數)

### Gemini 호출 (3개 프롬프트 순차 실행)

1. **Prompt 1**: 2026 커리어 운 분석 → `2026 Score X/100`, Q1-Q4 breakdown, attack/defend window
2. **Prompt 2**: 커리어 정점기 TOP5 → 연도별 peak 분석
3. **Prompt 3**: 심층 전략 → 실행계획, 리스크, 네트워크 전략

### 결과 탭 4개

| 탭 | 내용 |
|----|------|
| Tab 1: 2026 Overview | Prompt 1 결과 |
| Tab 2: Career Peaks | Prompt 2 결과 |
| Tab 3: Deep Strategy | Prompt 3 결과 |
| Tab 4: AI Chat | 결과 기반 후속 Q&A |

### AI Handoff 섹션

- 결과 하단에 위치
- 프롬프트 타입: Short / Full / Goal / Weekly
- 플랫폼 연결: ChatGPT / Claude / Gemini / Other
- `src/lib/aiHandoff.js` + `src/components/AIHandoffSection.jsx`

### 리퍼럴 시스템

- URL 형식: `?ref=BASE64_JSON` (JSON = `{ form, lang }`)
- 친구가 리딩 완료 → sharer에게 PDF 이메일 발송
- 현재 `mailto:` fallback — SendGrid/EmailJS로 교체 예정

### 댓글 시스템 (Firestore)

- 익명 닉네임 + 댓글 텍스트 + 리액션 (👍❤️🔮)
- IP 기반 rate-limit (시간당 3개)
- `src/components/CommentsSection.jsx`

### SNS 공유카드

- Canvas API로 1080×1080px 카드 생성 (html2canvas 미사용)
- `src/lib/share.js`의 `generateShareCard()`

---

## 7. AdSense 슬롯 3곳

| 위치 | 코드 |
|------|------|
| 랜딩 하단 | `<div>` in landing section |
| 결과 상단 | `className="ad-placeholder"` |
| 결과 하단 | `className="ad-placeholder"` |

- `<ins>` 태그는 현재 JSX 주석 처리됨
- **승인 후**: 실제 slot ID로 교체 필요 (`XXXXXXXXXXXXXXXX` → 실제 값)
- AdSense 스크립트: `index.html`, `about.html`, `privacy.html`, `terms.html`에 포함

---

## 8. 배포 방법

```bash
npm run build
firebase deploy
# 또는
firebase deploy --only hosting
```

---

## 9. 환경 변수 / 보안

- **절대 GitHub push 금지**: `.env` 파일 (Gemini API 키 포함)
- `.env` 키: `REACT_APP_GEMINI_API_KEY`
- AdSense pub-ID `ca-pub-2448306889621853` — 승인 완료, 활성 상태
- Firestore rules: `firestore.rules` 참고

---

## 10. 앞으로 할 것

- [ ] 전체 플로우 E2E 테스트 및 버그 수정
- [ ] AdSense 슬롯 실제 ins 태그 활성화 (승인 후)
- [ ] 나머지 언어 번역 완성 (JP/VN/TH/PH/BN)
- [ ] 도메인 연결 검토 (`karmamap.app`)
- [ ] PDF 이메일 API 연동 (SendGrid 또는 EmailJS)
- [ ] Gemini 프롬프트 튜닝 및 결과 품질 개선

---

## 11. 아키텍처 주의사항

- **단일 컴포넌트**: `src/App.js`에 대부분의 로직과 UI 집중 (의도적 설계)
- **CSS 방식**: 템플릿 리터럴로 생성된 CSS string → `<style>` 태그 주입 (테마 변수 동적 반영)
- **테마**: `THEMES[LANG_CONFIG[lang].theme]` → `theme.primary/secondary/cardBg/border/text/muted/font`
- **번역**: `T[lang]` → `t` 변수로 사용, 모든 언어 키 동기화 필수
- **Print CSS**: `#karmamap-result` div만 프린트 영역으로 격리
