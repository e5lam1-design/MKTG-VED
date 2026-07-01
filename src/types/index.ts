export type Status = 'Pending' | 'In Progress' | 'Review' | 'Completed' | 'Canceled';

export interface Task {
  id: string;
  videoName: string;
  requirements: string;
  status: Status;
  responsible: string;
  branch: string;
  date: string;
  year: number;
}

export interface Collection {
  id: string;
  title: string;
  type: string;
  count: number;
  lastUpdated: string;
}
