import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdminClient } from './_supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // If query action=latest, return cached latest tasks from Supabase
  if (req.method === 'GET' && req.query.action === 'latest' && supabaseAdminClient) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('dashboard_data')
        .select('value, updated_at')
        .eq('key', 'op27_tasks_latest')
        .maybeSingle();

      if (data && data.value) {
        const tasks = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        return res.status(200).json({
          success: true,
          count: Array.isArray(tasks) ? tasks.length : 0,
          tasks,
          syncedAt: data.updated_at
        });
      }
    } catch (e: any) {
      console.warn('Failed to get latest cached op27 tasks:', e.message);
    }
  }

  try {
    const phone = process.env.ELKHETA_SYNC_PHONE || '01124927928';
    const password = process.env.ELKHETA_SYNC_PASSWORD || '01124927928';

    // 1. Authenticate with tasks.elkheta.org (Read-only)
    const loginRes = await fetch('https://tasks.elkheta.org/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });

    const setCookie = loginRes.headers.get('set-cookie');
    if (!setCookie) {
      return res.status(401).json({ error: 'Failed to authenticate with platform' });
    }

    // 2. Fetch metadata & executions (tasks)
    const commonRes = await fetch('https://tasks.elkheta.org/api/common?include=executions,flows,teachers,sections,courses,statuses,teams,permissionRoles,users', {
      headers: { 'Cookie': setCookie }
    });

    if (!commonRes.ok) {
      return res.status(502).json({ error: 'Failed to fetch tasks from platform' });
    }

    const raw = await commonRes.json();
    const { executions = [], teachers = [], sections = [], courses = [] } = raw;

    const teacherMap = new Map<string, any>(teachers.map((t: any) => [t.id, t]));
    const sectionMap = new Map<string, any>(sections.map((s: any) => [s.id, s]));
    const courseMap = new Map<string, any>(courses.map((c: any) => [c.id, c]));

    // 3. Format tasks
    const formattedTasks = executions.map((ex: any, idx: number) => {
      const teacher = teacherMap.get(ex.teacher_id);
      const course = courseMap.get(ex.course_id);
      const section = sectionMap.get(ex.section_id || course?.section_id);

      let lessonTitle = ex.name || '';
      const matchBracket = lessonTitle.match(/\{([^}]+)\}/);
      if (matchBracket) lessonTitle = matchBracket[1];

      let taskStatus = 'Pending';
      if (ex.cancelled) taskStatus = 'Cancelled';
      else {
        const completedSteps = (ex.step_progress || []).filter((sp: any) => sp.status_id && sp.status_id !== '').length;
        const totalSteps = (ex.step_progress || []).length;
        if (totalSteps > 0 && completedSteps === totalSteps) taskStatus = 'Completed';
        else if (completedSteps > 0) taskStatus = 'In Progress';
      }

      return {
        id: ex.id,
        code: ex.code || `OP27-${idx + 1}`,
        fullName: ex.name,
        name: lessonTitle,
        filingName: ex.name,
        teacher: teacher?.name || '---',
        teacherCode: teacher?.code || '',
        subject: teacher?.subject_code || '',
        stage: section?.name || '',
        stageCode: section?.code || '',
        course: course?.name || '',
        startDate: ex.start_date ? ex.start_date.split('T')[0] : '',
        dueDate: ex.due_date ? ex.due_date.split('T')[0] : '',
        priority: ex.priority || 'normal',
        status: taskStatus,
        bunnyVideoId: ex.bunny_video_id || '',
        bunnyLibraryId: ex.bunny_library_id || '',
        bunnyEmbedCode: ex.bunny_embed_code || '',
        stepsCount: ex.step_progress?.length || 0,
        completedSteps: (ex.step_progress || []).filter((sp: any) => sp.status_id).length,
        createdAt: ex.created_at || ''
      };
    });

    const nowIso = new Date().toISOString();

    // 4. Persist to Supabase dashboard_data so it stays permanent across all clients
    if (supabaseAdminClient) {
      try {
        await supabaseAdminClient.from('dashboard_data').upsert({
          key: 'op27_tasks_latest',
          field: 'tasks',
          value: JSON.stringify(formattedTasks),
          updated_at: nowIso
        }, { onConflict: 'key,field' });
      } catch (dbErr: any) {
        console.warn('Failed to upsert op27 tasks in Supabase dashboard_data:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      count: formattedTasks.length,
      tasks: formattedTasks,
      syncedAt: nowIso
    });
  } catch (error: any) {
    console.error('Error in sync-op27 handler:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
