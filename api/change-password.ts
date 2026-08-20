// api/change-password.ts – Serverless Function for changing user password in Supabase Auth
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRequesterProfile, handleApiError, supabaseAdminClient } from './_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabaseAdminClient) {
      throw new Error('Supabase admin client is not configured');
    }

    const requester = await getRequesterProfile(req);
    const { userId, newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      const err: any = new Error('كلمة المرور يجب أن تكون 6 أحرف/أرقام على الأقل');
      err.status = 400;
      throw err;
    }

    const cleanPassword = newPassword.trim();
    const targetId = userId || requester.id;

    // Authorization check: only admin or manager can change other users' passwords
    if (targetId !== requester.id && !['admin', 'manager'].includes(requester.role)) {
      const err: any = new Error('ليس لديك صلاحية لتغيير كلمة مرور مستخدم آخر');
      err.status = 403;
      throw err;
    }

    // Load target user profile
    const { data: targetProfile, error: profileErr } = await supabaseAdminClient
      .from('user_profiles')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (profileErr || !targetProfile) {
      const err: any = new Error('المستخدم غير موجود');
      err.status = 404;
      throw err;
    }

    // If manager, verify they are not modifying an admin
    if (requester.role === 'manager' && targetProfile.role === 'admin' && targetId !== requester.id) {
      const err: any = new Error('لا يمكن للمدير تعديل كلمة مرور الأدمن');
      err.status = 403;
      throw err;
    }

    // 1. Update password and updated_at on user_profiles table (Always succeeds)
    const { error: profUpdErr } = await supabaseAdminClient
      .from('user_profiles')
      .update({ 
        password: cleanPassword,
        updated_at: new Date().toISOString() 
      })
      .eq('id', targetId);

    if (profUpdErr) {
      console.error('[change-password] profile update error:', profUpdErr);
      throw profUpdErr;
    }

    // 2. Sync to Supabase Auth
    try {
      const { error: updateAuthErr } = await supabaseAdminClient.auth.admin.updateUserById(
        targetId,
        { password: cleanPassword }
      );

      if (updateAuthErr) {
        const email = targetProfile.email || `${targetProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@local.user`;
        await supabaseAdminClient.auth.admin.createUser({
          id: targetId,
          email,
          password: cleanPassword,
          email_confirm: true,
          user_metadata: { name: targetProfile.name, role: targetProfile.role },
        }).catch(e => console.warn('[change-password] createUser caught:', e));
      }
    } catch (authCatchErr) {
      console.warn('[change-password] auth update warning:', authCatchErr);
    }

    // 4. Log activity
    try {
      await supabaseAdminClient.from('activity_logs').insert({
        action: 'تغيير كلمة المرور',
        details: `تم تغيير كلمة المرور للمستخدم: ${targetProfile.name} (${targetProfile.role}) بواسطة: ${requester.name}`,
        user_name: requester.name,
        user_role: requester.role,
        created_at: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn('[change-password] Failed to log activity:', logErr);
    }

    return res.status(200).json({
      success: true,
      message: `تم تحديث كلمة المرور للمستخدم ${targetProfile.name} بنجاح`,
      userId: targetId,
    });
  } catch (err: any) {
    handleApiError(res, err);
  }
}
