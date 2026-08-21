# 📘 دليل التسليم الشامل وتوثيق المشروع (Project Handover & Context Guide)
### نظام إدارة عمليات التسويق والفيديو (Marketing & Video Operations Hub - MKTG-VED)

> **الغرض من هذا الملف:**
> توفير مرجع فني وشامل لكل تفاصيل المشروع، البنية المعمارية (Architecture)، قواعد البيانات (Supabase)، الواجهات والـ Realtime Sync، مسارات الـ Backend APIs، والأوامر البرمجية؛ بحيث يمكن لأي مطور أو مساعد ذكاء اصطناعي على أي جهاز جديد متابعة العمل فوراً وفهم كافة القرارات الفنية دون الحاجة لبدء النقاش من الصفر.

---

## 📌 1. المعلومات الأساسية وروابط المشروع (Quick Facts)

| البند | البيان / الرابط |
| :--- | :--- |
| **اسم المشروع** | Marketing & Video Dashboard (`marketing-dashboard v1.5` / `MKTG-VED`) |
| **مستودع GitHub** | `https://github.com/e5lam1-design/MKTG-VED.git` |
| **الفرع الأساسي (Branch)** | `main` |
| **الرابط المباشر (Production)** | [https://mktg-ved.vercel.app](https://mktg-ved.vercel.app) |
| **منصة الاستضافة** | Vercel (Vite SPA + Vercel Serverless Functions in `/api`) |
| **قاعدة البيانات والـ Auth** | Supabase (PostgreSQL + Realtime Publications + Auth Admin SDK) |
| **رابط مشروع Supabase** | `https://dppdaqmrrjbldcygadpi.supabase.co` |
| **Supabase Publishable Key** | `sb_publishable_5dbNHxWCrolbJY4j1cYldQ_JRzjs0CG` |
| **حساب المشرف الرئيسي (Super Admin)** | `eslam` (`eslamabdalhamidfb@gmail.com`) |

---

## 🏗️ 2. البنية التكنولوجية والمعمارية (Tech Stack & Architecture)

- **Frontend:**
  - **React 18 + TypeScript + Vite 8** (بيئة فائقة السرعة مع دعم الـ HMR).
  - **Tailwind CSS + Lucide React** لتصميم الواجهات العصرية ذات الطابع الداكن (Cyberpunk/Dark Slate Glassmorphism).
  - **Framer Motion** لإضافة سلاسة وحركات تفاعلية لكافة النوافذ المنبثقة (Modals)، القوائم، والتنبيهات.
- **Backend & Serverless APIs (`/api`):**
  - **Vercel Serverless Functions (Node.js + TypeScript)** للتعامل مع العمليات الحساسة التي تتطلب `SUPABASE_SERVICE_ROLE_KEY`.
- **Database & Live Synchronizations:**
  - **Supabase Realtime WebSockets (`supabase_realtime`)**: لمزامنة التعديلات بين جميع المتصفحات والأجهزة لحظياً بدون إعادة تحميل الصفحة.
  - **Broadcast Channels (`global-sync-hub`)**: قناة بث مباشر لبث تحديثات الحالة، الأزرار، والنشاطات.

---

## 🗄️ 3. بنية قاعدة البيانات وجداول Supabase (Database Schema)

### 1. جدول المستخدمين (`public.user_profiles`)
جدول الملفات الشخصية للمستخدمين والصلاحيات:
- `id` (uuid, Primary Key)
- `name` (text) - الاسم الظاهر (مثل: `eslam`, `Adham elbadry`, `HASSANEN`, ...)
- `email` (text) - البريد الإلكتروني
- `username` (text) - اسم الدخول
- `role` (text) - الصلاحية: `admin` | `manager` | `supervisor` | `junior`
- `team` (text) - فريق العمل: `'marketing'` أو `'video'`
- `allowed_tabs` (jsonb/array) - التبويبات المسموح بها للمستخدم
- `default_mode` (text) - الواجهة الافتراضية (`operations` | `reels` | `designers`)
- `is_active` (boolean) - حالة الحساب (مفعل / معطل)
- `password` (text) - كلمة المرور (يتم حفظها وتعديلها عبر إدارة المستخدمين)
- `last_login_at` (timestamptz) & `last_logout_at` (timestamptz) & `updated_at` (timestamptz)

### 2. جدول التجميعات (`public.tagme3at_26` & `tagme3at_items`)
- `unique_key` (text, Primary Key) - المعرف الفريد للدرس/التجميعة (e.g. `tgm-merge-op27-xxx`)
- `name` (text) - اسم الفيديو / الدرس
- `stage` (text) - المرحلة الدراسية (Junior, Middle, Senior)
- `branch` (text) - الفرع / المادة
- `editor` (text) - اسم المونتير المسند إليه العمل
- `done` (boolean) - حالة الإنجاز (الأخضر)
- `cancel` (boolean) - حالة الإلغاء / التأجيل (الأحمر/البرتقالي)
- `priority` (boolean) - تثبيت الأولوية (نجمة الأولوية)
- `notes` (text) - ملاحظات المونتاج
- `link` (text) - رابط التسليم النهائي

### 3. جداول مراحل العمل (Stages & Reels & Design)
- مراحل العمليات: `stage_j4_26`, `stage_j5_26`, `stage_j6_26`, `stage_m1_26`, `stage_m2_26`, `stage_m3_26`, `stage_s1_26`, `stage_s2_26`, `stage_s3_26`
- مراحل الفيديو والريلز: `reels_shooting_26`, `reels_ve_26`, `reels_cuts_26`
- مراحل التصاميم: `design_tasks`, `designers_team_options`, `designers_catalog`
- جدول التجاوزات اللحظية: `task_overrides`
- جدول سجلات النشاط وتتبع العمليات: `activity_logs` / `user_logs`
- جدول إعدادات الصلاحيات والحدود: `tab_priority_limits`, `dashboard_data`

---

## ⚡ 4. أبرز الإنجازات والحلول الفنية التي تم تنفيذها (Accomplishments & Fixes)

### 1. حل مشكلة أزرار التجميعات (Done الأخضر، Cancel الأحمر، Priority النجمة)
- **المشكلة السابقة:** كانت الأزرار مقفلة برمجياً بشروط معطلة (`disabled={...}`)، وكان هناك خلل في مزامنة الحالة اللحظية (State Tearing) بسبب الاعتماد على `useState` محلي لا يستجيب لتحديثات WebSocket.
- **الحل الجذري:**
  1. تحويل `done`, `cancel`, `priority` داخل `TagmeRow` إلى **Prop-driven State** مشتقة مباشرة من الـ Item.
  2. دعم المطابقة المرنة (Fuzzy Matching) للمفاتيح: إزالة بادئة `tgm-` والمطابقة بالـ ID والاسم.
  3. ربط التغييرات بدالة `broadcastTaskActivity` عبر WebSocket لإرسال `updatedItem` فورياً إلى جميع المتصفحات المفتوحة دون الحاجة لعمل Reload.
  4. التحقق بنجاح عبر اختبارات آلية بـ Playwright على متصفحين متزامنين.

### 2. ميزة إدارة وتغيير كلمات المرور في Supabase (Password Management)
- **المطلوب:** إمكانية تغيير وتعيين كلمة المرور لكل مستخدم وتوثيقها داخل Supabase.
- **التنفيذ:**
  - بناء Serverless API في `api/change-password.ts` و `api/users.ts` يعتمد على `Supabase Admin SDK` (`supabaseAdminClient.auth.admin.updateUserById` و `createUser` fallback).
  - حفظ وتحديث كلمة المرور مباشرة في عمود `password` بجدول `user_profiles` لسهولة المراجعة.
  - إضافة نافذة منبثقة مخصصة بضغطة زر مفتاح `🔑` أمام كل مستخدم داخل صفحة **`👥 المستخدمين`** (User Management) للأدمن والمشرفين مع إمكانية إظهار/إخفاء كلمة المرور وفحص الحد الأدنى (6 خانات).
  - حصر وتأمين الوصول للنافذة داخل صفحة المستخدمين فقط ومنع أي ظهور غير مرغوب به في القوائم العامة.

### 3. معالجة تسلسل الـ Auth و الـ Identifiers
- تحديث `api/resolve-login.ts` للتعامل مع تسجيل الدخول بأسماء المستخدمين المباشرة (مثل `eslam`) ومطابقتها بحسابات البريد المسجلة تلقائياً.
- ضبط توثيق الـ Bearer Token في جميع دوال الـ API لتدعم كلاً من جلسات Supabase الرسمية وجلسات الملفات المحلية.

---

## 💻 5. تشغيل وتطوير المشروع على جهاز جديد (Setup Guide for New Device)

### الخطوة 1: استنساخ المستودع (Clone)
```bash
git clone https://github.com/e5lam1-design/MKTG-VED.git
cd MKTG-VED
```

### الخطوة 2: تثبيت الحزم (Install Dependencies)
```bash
npm install
```

### الخطوة 3: ملف المتغيرات البيئية (`.env`)
أنشئ ملف `.env` في المسار الرئيسي وضع فيه:
```env
VITE_SUPABASE_URL=https://dppdaqmrrjbldcygadpi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_5dbNHxWCrolbJY4j1cYldQ_JRzjs0CG
SUPABASE_URL=https://dppdaqmrrjbldcygadpi.supabase.co
SUPABASE_ANON_KEY=sb_publishable_5dbNHxWCrolbJY4j1cYldQ_JRzjs0CG
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwcGRhcW1ycmpibGRjeWdhZHBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNTIyNSwiZXhwIjoyMDk0ODExMjI1fQ.EBZ2wyV48UA9h9tLM0vUrjovR8xCb8lPLIaVgI9aVwU
```

### الخطوة 4: تشغيل السيرفر المحلي (Local Dev Server)
```bash
npm run dev
```

### الخطوة 5: البناء والنشر على Vercel (Build & Deploy)
```bash
# بناء المشروع والتأكد من خلوه من أخطاء TypeScript:
npm run build

# النشر المباشر على Vercel Production:
npx vercel deploy --prod --yes
```

---

## 📜 6. كود SQL المعتمد لقاعدة بيانات Supabase (SQL Migrations)

لتحديث أو تجهيز أي جداول جديدة، يتم تشغيل الأوامر التالية في **Supabase SQL Editor**:

```sql
-- 1. إضافة عمود كلمة المرور password لجدول user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS password text;

-- 2. إعطاء الصلاحيات الكاملة للـ APIs
GRANT ALL ON public.user_profiles TO postgres, authenticated, service_role, anon;

-- 3. جدول سجل النشاطات (Activity Logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  details text,
  user_name text,
  user_role text,
  created_at timestamptz DEFAULT now()
);

GRANT ALL ON public.activity_logs TO postgres, authenticated, service_role, anon;
```

---

## 📂 7. هيكل الملفات الرئيسي (Key Files Map)

```text
├── api/                           # Vercel Serverless Functions
│   ├── _supabase.ts               # إعداد عملاء Supabase والتحقق من الصلاحيات والـ Tokens
│   ├── change-password.ts         # نقطة نهاية تغيير وحفظ كلمات المرور
│   ├── users.ts                   # إدارة المستخدمين وصلاحياتهم وتعديل بياناتهم
│   ├── resolve-login.ts           # مطابقة الدخول بالاسم أو الإيميل
│   ├── log-activity.ts            # تسجيل وقراءة سجلات تسجيل الدخول والخروج والعمليات
│   └── permissions.ts             # حفظ وجلب صلاحيات الأدوار المختلفة
├── src/
│   ├── App.tsx                    # المحرك الرئيسي للوحة التحكم، التابات، والـ Realtime Sync
│   ├── contexts/
│   │   └── AuthContext.tsx        # إدارة الجلسات والمصادقة وتخزين البروفايل
│   ├── components/
│   │   ├── UserManagement.tsx     # صفحة إدارة المستخدمين وتغيير الباسوردات وسجل النشاط
│   │   ├── Op27View.tsx           # شاشة عمليات 26/27 والتجميعات
│   │   ├── ReelsAnalytics.tsx     # إحصائيات الريلز والفيديو
│   │   ├── DesignersDashboard.tsx # لوحة تحكم المصممين والمهام
│   │   ├── DesignAnalytics.tsx    # إحصائيات التصاميم
│   │   └── FeedbackModal.tsx      # نافذة إرسال الملاحظات والـ Bug Reports
│   └── lib/
│       └── supabase.ts            # تهيئة عميل Supabase للواجهة الأمامية
├── package.json
├── vite.config.ts
└── vercel.json                    # إعدادات التوجيه والـ Serverless Function
```

---

> 🎯 **ملاحظة ختامية للمطور / الذكاء الاصطناعي:**  
> المشروع جاهز ومستقر ويعمل على أحدث إصدار مع مزامنة كاملة للـ WebSockets والـ Auth. عند استئناف العمل على أي ميزة جديدة، ابدأ مباشرة من `src/App.tsx` أو مسار الـ API المعني دون الحاجة لإعادة ضبط بيئة الـ Supabase أو الـ Vercel.
