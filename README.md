# ניהול חשבוניות — גרסה ראשונית (MVP)

אפליקציית PWA אישית בעברית (RTL) לריכוז וניהול חשבוניות.
כרגע עובדת על **נתוני דמה** בלבד.

## הרצה מקומית
```bash
npm install
npm run dev
```
פותחים את הכתובת שמופיעה במסוף (בדרך כלל http://localhost:5173).

## בנייה לפרודקשן
```bash
npm run build
npm run preview
```

## פריסה ב-Vercel
1. מעלים את התיקייה ל-GitHub.
2. ב-Vercel: New Project → בוחרים את הריפו.
3. Framework Preset: **Vite** (מזוהה אוטומטית). Build: `npm run build`, Output: `dist`.
4. Deploy.

## מבנה
- `src/types.ts` — מודל הנתונים.
- `src/lib/invoicesRepo.ts` — שכבת הנתונים (נקודת ההחלפה ל-Supabase בהמשך).
- `src/lib/mockInvoices.ts` — נתוני הדמה.
- `src/lib/selectors.ts` — לוגיקת סינון וסיכום.
- `src/lib/labels.ts` — תוויות וצבעים.
- `src/components/` — רכיבי המסך.
