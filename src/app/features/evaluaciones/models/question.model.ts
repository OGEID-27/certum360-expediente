export type QuestionType =
  | 'MULTIPLE'
  | 'TEXT'
  | 'FILE'
  | 'MIXTA'
  | 'DICOTOMICA'
  | 'MULTIPLE_SELECT'
  | 'RANKING'
  | 'LIKERT'
  | 'NUMERIC_SCALE'
  | 'NOMINAL_SCALE'
  | 'FILTER';

export const QUESTION_TYPES: readonly QuestionType[] = [
  'MULTIPLE',
  'TEXT',
  'FILE',
  'MIXTA',
  'DICOTOMICA',
  'MULTIPLE_SELECT',
  'RANKING',
  'LIKERT',
  'NUMERIC_SCALE',
  'NOMINAL_SCALE',
  'FILTER',
];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  FILE: 'Archivo',
  TEXT: 'Abierta',
  MULTIPLE: 'Opcion unica',
  MULTIPLE_SELECT: 'Eleccion multiple',
  MIXTA: 'Mixta (con otros)',
  DICOTOMICA: 'Dicotomica',
  RANKING: 'Ranking',
  LIKERT: 'Escala Likert',
  NUMERIC_SCALE: 'Escala numerica',
  NOMINAL_SCALE: 'Escala nominal',
  FILTER: 'Filtro (condicional)',
};

export interface MultipleQuestionOption {
  id: string;
  texto: string;
}

export interface MultipleQuestionConfig {
  opciones: MultipleQuestionOption[];
  multiple: boolean;
}

export interface TextQuestionConfig {
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
}

export interface FileQuestionConfig {
  allowedExtensions?: string[];
  maxSizeMB?: number;
}

export interface MixtaQuestionConfig {
  opciones: MultipleQuestionOption[];
  multiple?: boolean;
  otherOptionValue?: string;
  otherLabel?: string;
  otherPlaceholder?: string;
}

export interface DicotomicaQuestionConfig {
  trueLabel?: string;
  falseLabel?: string;
}

export interface MultipleSelectQuestionConfig {
  opciones: MultipleQuestionOption[];
}

export interface RankingQuestionConfig {
  opciones: MultipleQuestionOption[];
}

export interface LikertQuestionConfig {
  levels?: string[];
}

export interface NumericScaleQuestionConfig {
  min: number;
  max: number;
  step?: number;
}

export interface NominalScaleQuestionConfig {
  labels: string[];
  orientation?: 'horizontal' | 'vertical';
}

export interface FilterRule {
  answerValue: string;
  goToQuestionId?: string;
  endQuiz?: boolean;
}

export interface FilterQuestionConfig {
  opciones: MultipleQuestionOption[];
  rules: FilterRule[];
}

export type QuestionConfig =
  | MultipleQuestionConfig
  | TextQuestionConfig
  | FileQuestionConfig
  | MixtaQuestionConfig
  | DicotomicaQuestionConfig
  | MultipleSelectQuestionConfig
  | RankingQuestionConfig
  | LikertQuestionConfig
  | NumericScaleQuestionConfig
  | NominalScaleQuestionConfig
  | FilterQuestionConfig;

export interface Question {
  id: string;
  titulo: string;
  tipo: QuestionType;
  obligatoria: boolean;
  ayuda?: string;
  createdAt: string;
  config: QuestionConfig;
}

export function getQuestionTypeLabel(question: Pick<Question, 'tipo' | 'config'>): string {
  if (
    question.tipo === 'MULTIPLE' &&
    typeof question.config === 'object' &&
    question.config !== null &&
    'multiple' in question.config &&
    !!question.config.multiple
  ) {
    return QUESTION_TYPE_LABELS.MULTIPLE_SELECT;
  }

  return QUESTION_TYPE_LABELS[question.tipo];
}

