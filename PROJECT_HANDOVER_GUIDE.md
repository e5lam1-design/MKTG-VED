# 📘 دليل التسليم الشامل وتوثيق المشروع (Project Handover & Context Guide)
### نظام إدارة عمليات التسويق ومونتاج الفيديو (Marketing & Video Operations Hub - MKTG-VED)

> ⚠️ **القاعدة الذهبية الصارمة للتعامل مع هذا المشروع:**  
> **"المشروع ده شغال وعليه شغل وتيم كبير، ذاكره كويس جداً وافهم تفاصيله، وأهم حاجة ممنوع تبوّظ أو تكسر أي حاجة كانت معمولة وشغالة قبل كده!"**  
> كل تعديل يجب أن يحافظ على استقرار الواجهات الحالية، والـ Realtime Sync، والصلاحيات بدون أي State Tearing أو حذف للميزات السابقة.

---

## 📌 1. المعلومات الأساسية وروابط المشروع (Quick Facts)

| البند | البيان / الرابط |
| :--- | :--- |
| **اسم المشروع** | Marketing & Video Operations Hub (`marketing-dashboard` / `MKTG-VED`) |
| **مستودع GitHub** | `https://github.com/e5lam1-design/MKTG-VED.git` |
| **الفرع الأساسي (Branch)** | `main` |
| **رابط الإنتاج المباشر (Production)** | [https://mktg-ved.vercel.app](https://mktg-ved.vercel.app) |
| **منصة الاستضافة** | Vercel (Vite SPA Client + Vercel Serverless Functions in `/api`) |
| **قاعدة البيانات والمصادقة (Auth)** | Supabase (PostgreSQL + Realtime WebSockets + Supabase Auth Admin) |
| **رابط مشروع Supabase** | `https://dppdaqmrrjbldcygadpi.supabase.co` |
| **مفتاح Supabase العام (Anon Key)** | `sb_publishable_5dbNHxWCrolbJY4j1cYldQ_JRzjs0CG` |
| **حساب المشرف الرئيسي (Super Admin)** | `eslam` (`eslamabdalhamidfb@gmail.com`) |

---

## 🏗️ 2. البنية التكنولوجية والمعمارية (Tech Stack & Architecture)

- **Frontend:**
  - **React 18 / 19 + TypeScript + Vite 8** (بيئة تجميع سريعة وخفيفة تدعم الـ HMR).
  - **Tailwind CSS + Lucide React**: واجهة مستخدم داكنة وعصرية (Dark Slate / Cyberpunk Glassmorphism).
  - **Framer Motion**: حركات سلسة للبطاقات، النوافذ المنبثقة (Modals)، الإعلانات والشاشات الانتقالية.
- **Backend & Serverless APIs (`/api`):**
  - **Vercel Serverless Functions (Node.js + TypeScript)**: لتنفيذ العمليات الحساسة التي تتطلب `SUPABASE_SERVICE_ROLE_KEY` مثل تغيير كلمات المرور، إدارة المستخدمين، وسجلات النشاط.
- **Database & Realtime Synchronizations:**
  - **Supabase Realtime WebSockets (`supabase_realtime`)**: لمزامنة التعديلات بين جميع المتصفحات فوراً دون الحاجة لإعادة تحميل الصفحة (Reload).
  - **Broadcast Channels (`global-sync-hub`)**: قنوات بث لحظي لحالات المهام، الأزرار، وتنبيهات النشاط.
- **Resilience & Fallback Mechanism:**
  - `src/lib/supabase.ts` مزود بـ **Fallback Credentials** ثابتة تضمن عدم تعطل الموقع بشاشة سوداء إذا لم يتم تمرير متغيرات البيئة في سيرفر Vercel.
  - `SplashScreen` مصمم كطبقة غير حاجزة (`pointer-events-none` overlay) بمؤقت انصهار تلقائي لا يعلق التطبيق أبداً.

---

## 🗄️ 3. بنية قاعدة البيانات وجداول Supabase (Database Schema)

### 1. جدول المستخدمين والصلاحيات (`public.user_profiles`)
- `id` (uuid, Primary Key)
- `name` (text) - الاسم الظاهر للموظف (مثل: `eslam`, `Adham elbadry`, `WAEL`, `KIRO`, `SHROUK`, ...)
- `email` (text) - البريد الإلكتروني
- `username` (text) - اسم المستخدم للدخول
- `role` (text) - الصلاحية: `admin` | `manager` | `supervisor` | `junior`
- `team` (text) - الفريق: `'marketing'` أو `'video'`
- `allowed_tabs` (jsonb/array) - التبويبات المصرح له برؤيتها (إذا كانت فارغة يخضع للدور العام)
- `default_mode` (text) - الواجهة الافتراضية عند تسجيل الدخول (`operations` | `reels` | `designers`)
- `password` (text) - كلمة المرور المشفرة/المسجلة
- `is_active` (boolean) - حالة الحساب (مفعل / معطل)
- `last_login_at`, `last_logout_at`, `updated_at` (timestamptz)

### 2. جدول التجميعات (`public.tagme3at_items` & `tagme3at_26`)
- `unique_key` (text, Primary Key) - المعرف الفريد للدرس أو التجميعة
- `name` (text) - الاسم الكامل للدرس
- `filing_name` (text) - اسم الأرشفة والعرض
- `op_sheet` (text) - المرحلة المصدر (Senior 1, Senior 2, Middle 1, ...)
- `branch` (text) - المادة أو الفرع
- `editor` (text) - اسم المونتير المسند إليه العمل
- `done` (boolean) - حالة الإنجاز (الأخضر)
- `cancel` (boolean) - حالة الإلغاء / التأجيل (الأحمر)
- `priority` (boolean) - علامة الأولوية العاجلة (النجمة)
- `notes_marketing`, `notes_editors` (text) - ملاحظات التسويق والمونتاج والتعديلات المطلوبة
- `uploaded` (boolean) & `youtube_link` (text) & `thumbnail_link` (text)

### 3. جداول مراحل العمل للعمليات (Stage Tables - Operations 26)
جداول منفصلة لكل مرحلة دراسية في Supabase تُربط برقم الـ GID المخصص:
- `Junior 4` (Gid `497207661`) ➔ `public.stage_j4_26`
- `Junior 5` (Gid `96752860`) ➔ `public.stage_j5_26`
- `Junior 6` (Gid `346788121`) ➔ `public.stage_j6_26`
- `Middle 1` (Gid `458352282`) ➔ `public.stage_m1_26`
- `Middle 2` (Gid `2113852114`) ➔ `public.stage_m2_26`
- `Middle 3` (Gid `2089699920`) ➔ `public.stage_m3_26`
- `Senior 1` (Gid `1640460225`) ➔ `public.stage_s1_26`
- `Senior 2` (Gid `595027661`) ➔ `public.stage_s2_26`
- `Senior 3` (Gid `286303232`) ➔ `public.stage_s3_26`

**أهم أعمدة جداول المراحل:** `unique_key`, `name`, `filing_name`, `subject`, `week`, `date`, `branch`, `op_sheet`, `time`, `delivered`, `uploaded`, `youtube_link`.

### 4. جداول الريلز والتصاميم (Reels & Design Tables)
- الريلز: `public.reels_shooting_26`, `public.reels_ve_26`, `public.reels_cuts_26`
- التصاميم: `public.design_tasks`, `public.designers_team_options`, `public.designers_catalog`

### 5. جدول الإعلانات والتوجيهات الموحد (`public.page_announcements`)
- `id` (uuid, Primary Key)
- `page_key` (text, Unique) - معرف الصفحة (مثل: `home`, `op_27`, `1535230545`, `stage_s1_26`, إلخ)
- `page_label` (text) - اسم الصفحة الظاهر
- `message` (text) - نص الإعلان أو التوجيهات
- `type` (text) - نوع ولون التنبيه: `info` (أزرق) | `warning` (برتقالي) | `alert` (أحمر) | `success` (أخضر)
- `is_active` (boolean) - مفعل / معطل
- `updated_by` (text) - اسم المانجر أو الأدمن
- `updated_at` (timestamptz)

---

## 🚀 4. التبويبات والميزات الرئيسية في النظام (Core Modules)

### 1. تاب "الرئيسية (Home)" 🏠 (`src/components/HomeView.tsx`)
- يظهر في أعلى القائمة الجانبية.
- يجمع للمستخدم الحالي تلقائياً كافة المهام المسندة إليه من التجميعات، الريلز، التصاميم، ومراحل العمل.
- **فرز ذكي للتعديلات والملاحظات:**
  - ⏳ **قيد العمل** (In Progress)
  - 📝 **بها تعديلات وملاحظات** (تظهر الملاحظات والتعديلات المطلوبة في كادر مميز لسرعة مراجعتها)
  - ✅ **تم الإنجاز** (Completed)
- **بطاقات KPI إحصائية** لحساب إنتاجية الموظف.
- **الانتقال السريع ➔**: زر أمام كل مهمة ينقل الموظف مباشرة لشيتها الأصلي مع توهج مضيء للسطر.
- **ميزة فحص الموظفين (User Switcher)**: متاحة للمانجر والأدمن فقط لاستعراض مهام أي عضو في الفريق ومتابعة التعديلات المعلقة.

### 2. نظام إعلانات وتوجيهات الصفحات (`Page Announcements`) 📢 (`src/components/PageAnnouncementBar.tsx`)
- شريط علوي يظهر في كل صفحة على حدة بكلام وتوجيهات مستقلة.
- المانجر (`manager`) والأدمن (`admin`) فقط يملكون أزرار الإضافة والتعديل والحذف.
- الموظفون يظهر لهم التنبيه للقراءة فقط مع إمكانية طيه/إخفائه (`Collapse`).
- متصل بـ `public.page_announcements` مع دعم Fallback لـ `dashboard_data`.

### 3. شاشة عمليات 26/27 ونقل اليوتيوب (`Op27View.tsx`) 🎬
- شاشة مركزية لجدول عمليات الدفعة الجديدة.
- **تحويل اليوتيوب الفردي `[📺]`**: ينقل الدرس بنقرة زر إلى شيت المرحلة المناسب وجدول Supabase الخاص بها دون مغادرة الصفحة.
- دالة `getTargetStage26` الذكية: تستخرج المرحلة تلقائياً من أكواد الدروس (مثل `S1-T1...` ➔ `Senior 1` و `stage_s1_26`).
- الضغط مجدداً على الزر يلغي التحويل ويحذفه من جدول المرحلة فوراً.

### 4. نظام الصلاحيات والأدوار (`src/lib/supabase.ts`) 🛡️
- **Admin**: صلاحية كاملة على كل التابات، إدارة المستخدمين، تعديل الباسوردات وسجلات النشاط.
- **Manager**: صلاحية إدارية كاملة لإدارة المهام والإعلانات ومتابعة الفرق.
- **Supervisor**: مشرف فريق، يتابع المهام ويعدل الملاحظات والأولويات.
- **Junior**: موظف تنفيذ (مونتير / مصمم / مسوق)، يرى التابات المصرح بها وينفذ مهامه.

---

## 💻 5. دليل تشغيل وتطوير المشروع محلياً (Developer Setup)

### 1. استنساخ المستودع (Clone)
```bash
git clone https://github.com/e5lam1-design/MKTG-VED.git
cd MKTG-VED
```

### 2. تثبيت الحزم (Install Dependencies)
```bash
npm install
```

### 3. ملف البيئة (`.env`) في المجلد الرئيسي
```env
VITE_SUPABASE_URL=https://dppdaqmrrjbldcygadpi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_5dbNHxWCrolbJY4j1cYldQ_JRzjs0CG
SUPABASE_URL=https://dppdaqmrrjbldcygadpi.supabase.co
SUPABASE_ANON_KEY=sb_publishable_5dbNHxWCrolbJY4j1cYldQ_JRzjs0CG
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcGRhcW1ycmpibGRjeWdhZHBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNTIyNSwiZXhwIjoyMDk0ODExMjI1fQ.EBZ2wyV48UA9h9tLM0vUrjovR8xCb8lPLIaVgI9aVwU
```

### 4. تشغيل السيرفر المحلي (Dev Server)
```bash
npm run dev
```

### 5. اختبار البناء والنشر (Build & Production Deploy)
```bash
# 1. اختبار البناء المحلي وخلوه من أخطاء الـ TypeScript:
npm run build

# 2. النشر المباشر على Vercel Production:
npx vercel deploy --prod --yes
```

---

## 📂 6. خريطة الملفات الرئيسية (Key Files Structure)

```text
├── api/                                # Vercel Serverless Functions
│   ├── _supabase.ts                    # تهيئة عميل الـ Admin والتحقق من الجلسات
│   ├── change-password.ts              # تغيير وحفظ كلمات المرور للمستخدمين
│   ├── users.ts                        # إضافة وتعديل وتفعيل المستخدمين
│   ├── resolve-login.ts                # دعم تسجيل الدخول بالاسم أو البريد
│   └── log-activity.ts                 # تدوين سجلات النشاط والأحداث
├── src/
│   ├── App.tsx                         # المحرك الرئيسي للتطبيق، توجيه التابات، والـ Realtime
│   ├── contexts/
│   │   └── AuthContext.tsx             # سياق المصادقة وإدارة الجلسات وحساب المستخدم
│   ├── components/
│   │   ├── HomeView.tsx                # تاب الرئيسية المخصص لمهام وتعديلات كل موظف
│   │   ├── PageAnnouncementBar.tsx     # شريط الإعلانات والتوجيهات المخصصة لكل صفحة
│   │   ├── Op27View.tsx                # جدول عمليات 26/27 وأزرار نقل اليوتيوب
│   │   ├── UserManagement.tsx          # نافذة إدارة المستخدمين وتغيير الباسوردات
│   │   ├── ReelsAnalytics.tsx          # تحليلات وإحصائيات الريلز
│   │   ├── DesignersDashboard.tsx      # لوحة مهام فريق التصميم
│   │   └── DesignAnalytics.tsx         # تحليلات وإحصائيات التصاميم
│   └── lib/
│       ├── supabase.ts                 # عميل Supabase للواجهة مع Fallback للإنتاج
│       ├── announcements.ts            # دوال جلب وحفظ وحذف إعلانات الصفحات
│       └── toast.ts                    # نظام الإشعارات والتنبيهات الموحد
├── supabase_page_announcements.sql      # كود SQL لجدول الإعلانات الموحد
├── package.json
└── vercel.json                         # إعدادات التوجيه والتخزين المؤقت في Vercel
```

---

> 💡 **نصيحة لأي مطور أو ذكاء اصطناعي قادم:**  
> قبل كتابة أو تعديل أي سطر برمجي، افحص `src/App.tsx` وتأكد من أن المكونات تستخدم `import type` للأنواع (بسبب محرك Vite/Rolldown)، وحافظ دوماً على التوافق مع جداول Supabase القائمة.
