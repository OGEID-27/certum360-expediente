export type AssignmentStatus = 'ACTIVE' | 'INACTIVE';

export interface Assignment {
  id: string;
  targetUserId: string;
  questionnaireId: string;
  status: AssignmentStatus;
  createdAt: string;
}

