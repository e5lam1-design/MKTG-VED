// Sync script for OP 27 tasks platform
import fs from 'fs';
import path from 'path';

export async function syncOp27Data(phone, password) {
  try {
    const loginRes = await fetch('https://tasks.elkheta.org/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });

    const setCookie = loginRes.headers.get('set-cookie');
    if (!setCookie) throw new Error('Authentication failed');

    const commonRes = await fetch('https://tasks.elkheta.org/api/common?include=executions,flows,teachers,sections,courses,statuses,teams,permissionRoles,users', {
      headers: { 'Cookie': setCookie }
    });

    const raw = await commonRes.json();
    const { executions = [], teachers = [], sections = [], courses = [] } = raw;

    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const sectionMap = new Map(sections.map(s => [s.id, s]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    const formattedTasks = executions.map((ex, idx) => {
      const teacher = teacherMap.get(ex.teacher_id);
      const course = courseMap.get(ex.course_id);
      const section = sectionMap.get(ex.section_id || course?.section_id);

      let lessonTitle = ex.name || '';
      const matchBracket = lessonTitle.match(/\{([^}]+)\}/);
      if (matchBracket) lessonTitle = matchBracket[1];

      let taskStatus = 'Pending';
      if (ex.cancelled) taskStatus = 'Cancelled';
      else {
        const completedSteps = (ex.step_progress || []).filter(sp => sp.status_id && sp.status_id !== '').length;
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
        completedSteps: (ex.step_progress || []).filter(sp => sp.status_id).length,
        createdAt: ex.created_at || ''
      };
    });

    const outDir = path.resolve('./src/data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'op27_tasks.json'), JSON.stringify(formattedTasks, null, 2), 'utf-8');
    return formattedTasks.length;
  } catch (err) {
    console.error('Error syncing Op 27 data:', err);
    throw err;
  }
}
