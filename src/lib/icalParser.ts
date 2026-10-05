/**
 * icalParser.ts - Robust iCalendar (.ics) parser for Google Calendar imports
 */

export interface ParsedGoogleEvent {
  id: string;
  uid?: string;
  title: string;
  teacher: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (24-hour)
  endTime: string; // HH:MM (24-hour)
  branch: string; // 'اسكندرية' | 'دسوق' | 'القاهرة'
  notes: string;
  location: string;
  selected: boolean;
}

/**
 * Detect branch from event text / location
 */
export function detectBranch(text: string, defaultBranch: string = 'القاهرة'): string {
  const lower = (text || '').toLowerCase();
  if (lower.includes('اسكندر') || lower.includes('alex') || lower.includes('إسكندر')) {
    return 'اسكندرية';
  }
  if (lower.includes('دسوق') || lower.includes('desouk') || lower.includes('desouq')) {
    return 'دسوق';
  }
  if (lower.includes('قاهر') || lower.includes('cairo') || lower.includes('معادي') || lower.includes('نصر')) {
    return 'القاهرة';
  }
  return defaultBranch;
}

/**
 * Clean teacher name / title
 */
export function cleanTeacherName(title: string): string {
  if (!title) return '';
  let res = title;
  const sep = ['-', ':', '\u2014'].join('');
  const sepPattern = '\\s*[' + sep + ']?\\s*';
  res = res.replace(new RegExp('^حجز\\s*(استوديو|أستوديو)?' + sepPattern, 'i'), '');
  res = res.replace(new RegExp('^تصوير\\s*(ريلز|فيديو)?' + sepPattern, 'i'), '');
  res = res.replace(new RegExp('^جلسة\\s*(تصوير)?' + sepPattern, 'i'), '');
  res = res.replace(new RegExp('^(مستر|أستاذ|دكتور|أ\\/|د\\/)\\s*', 'i'), '');
  return res.trim();
}

/**
 * Parse an ICS date string to { date: 'YYYY-MM-DD', time: 'HH:MM' }
 */
export function parseIcsDateTime(rawVal: string): { date: string; time: string; isAllDay: boolean } {
  const val = (rawVal || '').trim();

  // Case 1: Date only (e.g., 20261005 or VALUE=DATE:20261005)
  if (val.length === 8 && /^\d{8}$/.test(val)) {
    const yyyy = val.substring(0, 4);
    const mm = val.substring(4, 6);
    const dd = val.substring(6, 8);
    return { date: `${yyyy}-${mm}-${dd}`, time: '10:00', isAllDay: true };
  }

  // Case 2: UTC format: 20261005T090000Z
  if (val.includes('Z')) {
    const clean = val.replace(/[^0-9TZ]/g, '');
    const m = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?Z?$/);
    if (m) {
      const year = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      const hour = parseInt(m[4], 10);
      const min = parseInt(m[5], 10);
      const sec = parseInt(m[6] || '0', 10);

      // Construct UTC date and convert to client's local timezone
      const utcDate = new Date(Date.UTC(year, month, day, hour, min, sec));
      const pad = (n: number) => String(n).padStart(2, '0');
      const localYear = utcDate.getFullYear();
      const localMonth = pad(utcDate.getMonth() + 1);
      const localDay = pad(utcDate.getDate());
      const localHours = pad(utcDate.getHours());
      const localMinutes = pad(utcDate.getMinutes());

      return {
        date: `${localYear}-${localMonth}-${localDay}`,
        time: `${localHours}:${localMinutes}`,
        isAllDay: false
      };
    }
  }

  // Case 3: Local/floating format: 20261005T130000
  const localMatch = val.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (localMatch) {
    const [, yyyy, mm, dd, hh, min] = localMatch;
    return {
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${min}`,
      isAllDay: false
    };
  }

  // Fallback to today
  const today = new Date().toISOString().split('T')[0];
  return { date: today, time: '12:00', isAllDay: false };
}

/**
 * Main parser for ICS text
 */
export function parseIcsContent(icsContent: string, defaultBranch: string = 'القاهرة'): ParsedGoogleEvent[] {
  if (!icsContent) return [];

  // 1. Unfold lines according to RFC 5545 (lines beginning with space or tab continue previous line)
  const unfolded = icsContent.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events: ParsedGoogleEvent[] = [];
  let inEvent = false;
  let currentProps: Record<string, string> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentProps = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      inEvent = false;
      if (currentProps.SUMMARY || currentProps.DTSTART) {
        const title = (currentProps.SUMMARY || 'موعد جديد').trim();
        const teacher = cleanTeacherName(title);
        const location = currentProps.LOCATION || '';
        const notes = (currentProps.DESCRIPTION || '')
          .replace(/\\n/g, '\n')
          .replace(/\\,/g, ',')
          .replace(/\\;/g, ';')
          .trim();

        const startParsed = parseIcsDateTime(currentProps.DTSTART || '');
        let endParsed = currentProps.DTEND ? parseIcsDateTime(currentProps.DTEND) : null;

        // If no end time, or end is before start, default to 2 hours after start
        let startTime = startParsed.time;
        let endTime = endParsed?.time || '';

        if (!endTime || startParsed.isAllDay) {
          const [sh, sm] = startTime.split(':').map(Number);
          const endH = Math.min(23, (sh || 10) + 2);
          endTime = `${String(endH).padStart(2, '0')}:${String(sm || 0).padStart(2, '0')}`;
        }

        const branch = detectBranch(`${location} ${title} ${notes}`, defaultBranch);
        const id = `gcal_${currentProps.UID || Math.random().toString(36).substring(2, 9)}_${startParsed.date}_${startTime.replace(':', '')}`;

        events.push({
          id,
          uid: currentProps.UID,
          title,
          teacher: teacher || title,
          date: startParsed.date,
          startTime,
          endTime,
          branch,
          notes,
          location,
          selected: true
        });
      }
      continue;
    }

    if (inEvent) {
      // Parse KEY;PARAMS:VALUE or KEY:VALUE
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const keyPart = line.substring(0, colonIdx);
        const valuePart = line.substring(colonIdx + 1);
        const baseKey = keyPart.split(';')[0].toUpperCase().trim();
        currentProps[baseKey] = valuePart;
      }
    }
  }

  // Sort events chronologically by date then startTime
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return events;
}
