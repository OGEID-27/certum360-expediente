export interface QuestionnaireSettings {
  timeLimitMinutes?: number;
  maxAttempts?: number;
  activeFrom?: string;
  activeTo?: string;
  passScore?: number;
}

export interface Questionnaire {
  id: string;
  nombre: string;
  descripcion?: string;
  area?: string;
  sectionIds: string[];
  settings: QuestionnaireSettings;
}

