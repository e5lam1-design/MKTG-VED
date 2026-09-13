-- ==============================================================================
-- جدول الإعلانات الموحد لجميع تابات وصفحات الداشبورد (Page Announcements)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.page_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_key TEXT NOT NULL UNIQUE,          -- معرف التاب أو الصفحة (مثال: 'home', '1476192399', 'op_27', 'stage_s1_26', إلخ)
    page_label TEXT,                        -- اسم الصفحة المعروض
    message TEXT NOT NULL DEFAULT '',       -- نص التنبيه أو التوجيهات
    type TEXT DEFAULT 'info',               -- نوع التنبيه: 'info' | 'warning' | 'alert' | 'success'
    is_active BOOLEAN DEFAULT true,         -- هل التنبيه نشط أم محذوف
    updated_by TEXT,                        -- اسم المانجر أو الأدمن
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- سياسات الأمان (Row Level Security)
ALTER TABLE public.page_announcements ENABLE ROW LEVEL SECURITY;

-- السماح لجميع المستخدمين بقراءة التنبيهات
CREATE POLICY "Allow public read on page_announcements" 
ON public.page_announcements 
FOR SELECT 
USING (true);

-- السماح للعمليات بالإضافة والتعديل والحذف
CREATE POLICY "Allow all operations on page_announcements" 
ON public.page_announcements 
FOR ALL 
USING (true);
