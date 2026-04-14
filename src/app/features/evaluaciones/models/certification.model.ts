export interface CertificationRules {
  requireAll: boolean;
  minScore?: number;
}

export interface Certification {
  id: string;
  nombre: string;
  descripcion?: string;
  questionnaireIds: string[];
  rules: CertificationRules;
}

