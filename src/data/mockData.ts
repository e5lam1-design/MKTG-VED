import type { Task, Collection } from '../types';

export const mockTasks: Task[] = [
  {
    id: '1',
    videoName: 'رمضان 2024 - إعلان 1',
    requirements: 'مونتاج سريع مع تصحيح ألوان',
    status: 'Completed',
    responsible: 'Ahmed',
    branch: 'Cairo',
    date: '2024-03-10',
    year: 2024
  },
  {
    id: '2',
    videoName: 'افتتاح فرع التجمع',
    requirements: 'تغطية الحدث وإضافة جرافيكس',
    status: 'In Progress',
    responsible: 'Sara',
    branch: 'New Cairo',
    date: '2024-05-12',
    year: 2024
  },
  {
    id: '3',
    videoName: 'تجميعة فيديوهات السوشيال ميديا',
    requirements: 'تحويل الفيديوهات الطويلة لـ Reels',
    status: 'Pending',
    responsible: 'Mostafa',
    branch: 'Alexandria',
    date: '2023-12-05',
    year: 2023
  },
  {
    id: '4',
    videoName: 'حملة الصيف 2025',
    requirements: 'فكرة إبداعية وموشن جرافيكس',
    status: 'Review',
    responsible: 'Ahmed',
    branch: 'Cairo',
    date: '2025-01-20',
    year: 2025
  }
];

export const mockCollections: Collection[] = [
  {
    id: 'c1',
    title: 'تجميعات كاب كات',
    type: 'Templates',
    count: 24,
    lastUpdated: '2024-05-10'
  },
  {
    id: 'c2',
    title: 'مكتبة الموسيقى التصويرية',
    type: 'Audio',
    count: 156,
    lastUpdated: '2024-05-14'
  },
  {
    id: 'c3',
    title: 'مؤثرات بصرية بريمير',
    type: 'Presets',
    count: 45,
    lastUpdated: '2024-04-20'
  }
];
