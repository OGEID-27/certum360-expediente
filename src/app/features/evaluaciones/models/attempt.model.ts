import { QuestionType } from './question.model';

export interface FileAnswerValue {
  fileName: string;
  fileSize: number;
  fileType: string;
}

export interface MixtaAnswerValue {
  selectedOptionIds: string[];
  otherText?: string;
}

export interface FilterAnswerValue {
  selectedValue: string;
  matchedRule?: {
    goToQuestionId?: string;
    endQuiz?: boolean;
  };
}

export type AnswerValue =
  | string[]
  | string
  | number
  | boolean
  | FileAnswerValue
  | MixtaAnswerValue
  | FilterAnswerValue
  | null;

export interface Answer {
  questionId: string;
  type: QuestionType;
  value: AnswerValue;
}

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED';
export type AttemptReviewStatus = 'PENDING_REVIEW' | 'GRADED';

export interface Attempt {
  id: string;
  assignmentId: string;
  userId: string;
  questionnaireId?: string;
  startedAt: string;
  submittedAt?: string;
  status: AttemptStatus;
  reviewStatus?: AttemptReviewStatus;
  answers: Answer[];
}

