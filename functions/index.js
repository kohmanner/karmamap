const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Resend } = require('resend');

admin.initializeApp();

exports.onReferralComplete = functions.firestore
  .document('referrals/{refCode}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (!before.completed && after.completed && !after.pdfSent) {
      const resend = new Resend(functions.config().resend.key);

      const name = after.name || 'there';
      const email = after.email;
      const score = after.score || '?';
      const peakYear = after.peak_year || '?';
      const lang = after.lang || 'en';

      const isKorean = lang === 'ko';
      const isZh = lang === 'zh' || lang === 'tw';

      const subject = isKorean
        ? '🎴 KarmaMap 전체 리포트가 도착했습니다'
        : isZh
        ? '🎴 您的KarmaMap完整报告已准备好'
        : '🎴 Your KarmaMap Full Report is Ready';

      const greeting = isKorean ? `안녕하세요 ${name}님,` : isZh ? `你好 ${name}，` : `Hi ${name},`;
      const intro = isKorean
        ? '링크를 공유해 주셔서 감사합니다. 약속드린 대로 전체 리포트를 보내드립니다.'
        : isZh
        ? '感谢您分享链接！这是您承诺的完整报告。'
        : 'Thank you for sharing your link! Here is your full KarmaMap report as promised.';
      const scoreLabel = isKorean ? '2026 커리어 운세 점수' : isZh ? '2026运势得分' : '2026 Fortune Score';
      const peakLabel = isKorean ? `커리어 정점기 1위: ${peakYear}년` : isZh ? `事业顶峰年: ${peakYear}` : `Career Peak Year #1: ${peakYear}`;
      const ctaText = isKorean ? '전체 리포트 보기' : isZh ? '查看完整报告' : 'View Full Report';
      const footerNote = isKorean
        ? '이 이메일은 KarmaMap PDF 리포트 시스템을 통해 발송되었습니다.'
        : isZh
        ? '此邮件通过KarmaMap PDF报告系统发送。'
        : 'This email was sent via the KarmaMap PDF report system.';

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { font-family: Georgia, serif; background: #f5e6c8; margin: 0; padding: 20px 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fdf8f0; border-radius: 12px; overflow: hidden; border: 1px solid rgba(212,160,23,0.3); }
    .header { background: #2d1810; padding: 36px 40px; text-align: center; }
    .header h1 { color: #d4a017; font-size: 32px; margin: 0; letter-spacing: 4px; }
    .header p { color: rgba(212,160,23,0.7); margin: 8px 0 0; font-size: 14px; letter-spacing: 1px; }
    .body { padding: 36px 40px; }
    .body p { color: #3d2010; line-height: 1.8; font-size: 16px; }
    .score-box { background: #f5e6c8; border: 1px solid rgba(212,160,23,0.4); border-radius: 8px; padding: 28px 24px; text-align: center; margin: 24px 0; }
    .score-box .num { color: #c84b2f; font-size: 56px; font-weight: 700; line-height: 1; }
    .score-box .denom { color: #8b6914; font-size: 24px; }
    .score-box .label { color: #2d1810; font-size: 13px; margin-top: 8px; letter-spacing: 1px; text-transform: uppercase; }
    .peak-box { background: #2d1810; color: #d4a017; border-radius: 8px; padding: 16px 24px; text-align: center; margin: 16px 0; font-size: 17px; letter-spacing: 1px; }
    .cta { display: block; background: #c84b2f; color: #f5e6c8 !important; text-decoration: none; padding: 16px 32px; border-radius: 4px; text-align: center; font-size: 18px; margin: 32px 0; font-weight: 700; letter-spacing: 1px; }
    .note { color: #8b6914 !important; font-size: 13px !important; }
    .footer { background: rgba(45,24,16,0.06); padding: 20px 40px; text-align: center; color: #8b6914; font-size: 12px; border-top: 1px solid rgba(212,160,23,0.2); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Karma Map</h1>
      <p>AI Fortune × Career Strategy</p>
    </div>
    <div class="body">
      <p>${greeting}</p>
      <p>${intro}</p>
      <div class="score-box">
        <div><span class="num">${score}</span><span class="denom">/100</span></div>
        <div class="label">${scoreLabel}</div>
      </div>
      <div class="peak-box">✦ ${peakLabel} ✦</div>
      <a href="https://karmamap-dd922.web.app" class="cta">${ctaText} →</a>
      <p class="note">${footerNote}</p>
    </div>
    <div class="footer">
      Karma Map · karmamap-dd922.web.app<br>
      © 2025 KarmaMap · Singapore · For self-reflection and planning purposes only.
    </div>
  </div>
</body>
</html>`;

      try {
        await resend.emails.send({
          from: 'KarmaMap <onboarding@resend.dev>',
          to: email,
          subject: subject,
          html: htmlContent,
        });
        await change.after.ref.update({ pdfSent: true });
        functions.logger.info(`✓ Email sent to ${email} for ref ${context.params.refCode}`);
      } catch (error) {
        functions.logger.error('Resend error:', error?.message || error);
      }
    }
    return null;
  });
