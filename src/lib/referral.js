import { doc, setDoc, addDoc, collection, updateDoc, serverTimestamp } from "firebase/firestore";

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export const generateRefCode = () =>
  Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

export const getVisitorId = () => {
  let id = localStorage.getItem('km_visitor_id');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('km_visitor_id', id);
  }
  return id;
};

export const saveReferral = async (db, { email, name, lang, peakYear, score }) => {
  const refCode = generateRefCode();
  await setDoc(doc(db, 'referrals', refCode), {
    email: email.trim().toLowerCase(),
    name: name || '',
    lang,
    peak_year: peakYear || '',
    score: score || '',
    createdAt: serverTimestamp(),
    completed: false,
    pdfSent: false,
  });
  return refCode;
};

export const recordReferralVisit = async (db, refCode, visitorId, lang) => {
  try {
    await addDoc(collection(db, 'referral_events'), {
      refCode,
      visitorId,
      lang,
      visitedAt: serverTimestamp(),
      completed: false,
    });
  } catch (e) { /* silently fail */ }
};

export const markReferralCompleted = async (db, refCode) => {
  try {
    await updateDoc(doc(db, 'referrals', refCode), {
      completed: true,
      completedAt: serverTimestamp(),
    });
    localStorage.removeItem('km_ref');
  } catch (e) { console.error('[referral] mark completed failed:', e); }
};
