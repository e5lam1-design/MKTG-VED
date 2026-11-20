export const getTargetStage26 = (item: any) => {
  const code = String(item?.stageCode || '').toUpperCase().trim();
  const stage = String(item?.stage || '').toUpperCase().trim();
  const full = String(item?.fullName || item?.filingName || item?.name || item?.course || '').toUpperCase();
  const combined = `${code} | ${stage} | ${full}`;

  // 1. Check exact stageCode first (highest priority and precision matching Supabase stage tables)
  if (code === 'S1') return { gid: '1640460225', label: 'Senior 1', year: 's1' };
  if (code === 'S2') return { gid: '595027661', label: 'Senior 2', year: 's2' };
  if (code === 'S3') return { gid: '286303232', label: 'Senior 3', year: 's3' };
  if (code === 'M1') return { gid: '458352282', label: 'Middle 1', year: 'm1' };
  if (code === 'M2') return { gid: '2113852114', label: 'Middle 2', year: 'm2' };
  if (code === 'M3') return { gid: '2089699920', label: 'Middle 3', year: 'm3' };
  if (code === 'J4') return { gid: '497207661', label: 'Junior 4', year: 'j4' };
  if (code === 'J5') return { gid: '96752860', label: 'Junior 5', year: 'j5' };
  if (code === 'J6') return { gid: '346788121', label: 'Junior 6', year: 'j6' };

  // 2. Check stage names (Senior / Secondary / Middle / Preparatory / Junior / Primary)
  if (stage.includes('SECONDARY 3') || stage.includes('SENIOR 3') || combined.includes('SENIOR 3') || combined.includes('SECONDARY 3') || combined.includes('ثالثة ثانوي') || combined.includes('3RD SEC') || /[\b\-_]S3[\b\-_]/.test(combined) || combined.startsWith('S3-')) {
    return { gid: '286303232', label: 'Senior 3', year: 's3' };
  }
  if (stage.includes('SECONDARY 2') || stage.includes('SENIOR 2') || combined.includes('SENIOR 2') || combined.includes('SECONDARY 2') || combined.includes('ثانية ثانوي') || combined.includes('2ND SEC') || /[\b\-_]S2[\b\-_]/.test(combined) || combined.startsWith('S2-')) {
    return { gid: '595027661', label: 'Senior 2', year: 's2' };
  }
  if (stage.includes('SECONDARY 1') || stage.includes('SENIOR 1') || combined.includes('SENIOR 1') || combined.includes('SECONDARY 1') || combined.includes('أولى ثانوي') || combined.includes('اولي ثانوي') || combined.includes('1ST SEC') || /[\b\-_]S1[\b\-_]/.test(combined) || combined.startsWith('S1-')) {
    return { gid: '1640460225', label: 'Senior 1', year: 's1' };
  }

  if (stage.includes('MIDDLE 3') || stage.includes('PREPARATORY 3') || combined.includes('MIDDLE 3') || combined.includes('ثالثة إعدادي') || combined.includes('ثالثة اعدادي') || /[\b\-_]M3[\b\-_]/.test(combined) || combined.startsWith('M3-')) {
    return { gid: '2089699920', label: 'Middle 3', year: 'm3' };
  }
  if (stage.includes('MIDDLE 2') || stage.includes('PREPARATORY 2') || combined.includes('MIDDLE 2') || combined.includes('ثانية إعدادي') || combined.includes('ثانية اعدادي') || /[\b\-_]M2[\b\-_]/.test(combined) || combined.startsWith('M2-')) {
    return { gid: '2113852114', label: 'Middle 2', year: 'm2' };
  }
  if (stage.includes('MIDDLE 1') || stage.includes('PREPARATORY 1') || combined.includes('MIDDLE 1') || combined.includes('أولى إعدادي') || combined.includes('اولي اعدادي') || /[\b\-_]M1[\b\-_]/.test(combined) || combined.startsWith('M1-')) {
    return { gid: '458352282', label: 'Middle 1', year: 'm1' };
  }

  if (stage.includes('JUNIOR 6') || stage.includes('PRIMARY 6') || combined.includes('JUNIOR 6') || combined.includes('سادسة ابتدائي') || /[\b\-_]J6[\b\-_]/.test(combined) || combined.startsWith('J6-')) {
    return { gid: '346788121', label: 'Junior 6', year: 'j6' };
  }
  if (stage.includes('JUNIOR 5') || stage.includes('PRIMARY 5') || combined.includes('JUNIOR 5') || combined.includes('خامسة ابتدائي') || /[\b\-_]J5[\b\-_]/.test(combined) || combined.startsWith('J5-')) {
    return { gid: '96752860', label: 'Junior 5', year: 'j5' };
  }
  if (stage.includes('JUNIOR 4') || stage.includes('PRIMARY 4') || combined.includes('JUNIOR 4') || combined.includes('رابعة ابتدائي') || /[\b\-_]J4[\b\-_]/.test(combined) || combined.startsWith('J4-')) {
    return { gid: '497207661', label: 'Junior 4', year: 'j4' };
  }

  return { gid: '1640460225', label: 'Senior 1', year: 's1' };
};
