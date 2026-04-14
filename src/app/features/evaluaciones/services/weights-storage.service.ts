import { Injectable } from '@angular/core';
import { WeightStatus, WeightsValidator } from './weights-validator';

export interface SectionQuestionWeight {
  questionId: string;
  isScored: boolean;
  weight: number;
}

export interface SectionWeightsEntry {
  isScored: boolean;
  status: WeightStatus;
  questions: SectionQuestionWeight[];
}

export interface QuestionnaireSectionWeight {
  sectionId: string;
  isScored: boolean;
  weight: number;
}

export interface QuestionnaireWeightsEntry {
  isScored: boolean;
  status: WeightStatus;
  sections: QuestionnaireSectionWeight[];
}

export interface CertificationQuestionnaireWeight {
  questionnaireId: string;
  isScored: boolean;
  weight: number;
}

export interface CertificationWeightsEntry {
  isScored: boolean;
  passScore: number;
  status: WeightStatus;
  questionnaires: CertificationQuestionnaireWeight[];
}

type SectionWeightsMap = Record<string, SectionWeightsEntry>;
type QuestionnaireWeightsMap = Record<string, QuestionnaireWeightsEntry>;
type CertificationWeightsMap = Record<string, CertificationWeightsEntry>;

@Injectable({ providedIn: 'root' })
export class WeightsStorageService {
  readonly storageKeys = {
    sectionWeights: 'dynEval.sectionWeights.v1',
    questionnaireWeights: 'dynEval.questionnaireWeights.v1',
    certificationWeights: 'dynEval.certificationWeights.v1',
  } as const;

  // localStorage structure:
  // sectionWeights[sectionId] = { isScored, status, questions: [{ questionId, isScored, weight }] }
  // questionnaireWeights[questionnaireId] = { isScored, status, sections: [{ sectionId, isScored, weight }] }
  // certificationWeights[certificationId] = { isScored, passScore, status, questionnaires: [{ questionnaireId, isScored, weight }] }

  getSectionWeightsMap(): SectionWeightsMap {
    return this.readMap<SectionWeightsEntry>(this.storageKeys.sectionWeights, this.normalizeSectionEntry);
  }

  getSectionWeight(sectionId: string): SectionWeightsEntry | undefined {
    return this.getSectionWeightsMap()[sectionId];
  }

  saveSectionWeight(sectionId: string, entry: SectionWeightsEntry): void {
    const map = this.getSectionWeightsMap();
    map[sectionId] = this.normalizeSectionEntry(entry);
    this.writeMap(this.storageKeys.sectionWeights, map);
  }

  deleteSectionWeight(sectionId: string): void {
    const map = this.getSectionWeightsMap();
    delete map[sectionId];
    this.writeMap(this.storageKeys.sectionWeights, map);
  }

  getQuestionnaireWeightsMap(): QuestionnaireWeightsMap {
    return this.readMap<QuestionnaireWeightsEntry>(
      this.storageKeys.questionnaireWeights,
      this.normalizeQuestionnaireEntry,
    );
  }

  getQuestionnaireWeight(questionnaireId: string): QuestionnaireWeightsEntry | undefined {
    return this.getQuestionnaireWeightsMap()[questionnaireId];
  }

  saveQuestionnaireWeight(questionnaireId: string, entry: QuestionnaireWeightsEntry): void {
    const map = this.getQuestionnaireWeightsMap();
    map[questionnaireId] = this.normalizeQuestionnaireEntry(entry);
    this.writeMap(this.storageKeys.questionnaireWeights, map);
  }

  deleteQuestionnaireWeight(questionnaireId: string): void {
    const map = this.getQuestionnaireWeightsMap();
    delete map[questionnaireId];
    this.writeMap(this.storageKeys.questionnaireWeights, map);
  }

  getCertificationWeightsMap(): CertificationWeightsMap {
    return this.readMap<CertificationWeightsEntry>(
      this.storageKeys.certificationWeights,
      this.normalizeCertificationEntry,
    );
  }

  getCertificationWeight(certificationId: string): CertificationWeightsEntry | undefined {
    return this.getCertificationWeightsMap()[certificationId];
  }

  saveCertificationWeight(certificationId: string, entry: CertificationWeightsEntry): void {
    const map = this.getCertificationWeightsMap();
    map[certificationId] = this.normalizeCertificationEntry(entry);
    this.writeMap(this.storageKeys.certificationWeights, map);
  }

  deleteCertificationWeight(certificationId: string): void {
    const map = this.getCertificationWeightsMap();
    delete map[certificationId];
    this.writeMap(this.storageKeys.certificationWeights, map);
  }

  private readMap<T>(
    key: string,
    normalize: (entry: unknown) => T,
  ): Record<string, T> {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {};
      }

      return Object.entries(parsed).reduce<Record<string, T>>((acc, [entryKey, entryValue]) => {
        acc[entryKey] = normalize(entryValue);
        return acc;
      }, {});
    } catch {
      return {};
    }
  }

  private writeMap<T>(key: string, value: Record<string, T>): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  private normalizeSectionEntry = (entry: unknown): SectionWeightsEntry => {
    const safe = entry && typeof entry === 'object' && !Array.isArray(entry)
      ? (entry as Partial<SectionWeightsEntry>)
      : {};

    const questions = Array.isArray(safe.questions)
      ? safe.questions.map((question) => ({
          questionId: String(question.questionId ?? ''),
          isScored: !!question.isScored,
          weight: WeightsValidator.normalizeWeight(question.weight),
        }))
      : [];

    const total = WeightsValidator.sumWeights(questions);

    return {
      isScored: !!safe.isScored,
      status: safe.status === 'READY' ? 'READY' : WeightsValidator.getStatus(!!safe.isScored, total),
      questions,
    };
  };

  private normalizeQuestionnaireEntry = (entry: unknown): QuestionnaireWeightsEntry => {
    const safe = entry && typeof entry === 'object' && !Array.isArray(entry)
      ? (entry as Partial<QuestionnaireWeightsEntry>)
      : {};

    const sections = Array.isArray(safe.sections)
      ? safe.sections.map((section) => ({
          sectionId: String(section.sectionId ?? ''),
          isScored: !!section.isScored,
          weight: WeightsValidator.normalizeWeight(section.weight),
        }))
      : [];

    const total = WeightsValidator.sumWeights(sections);

    return {
      isScored: !!safe.isScored,
      status: safe.status === 'READY' ? 'READY' : WeightsValidator.getStatus(!!safe.isScored, total),
      sections,
    };
  };

  private normalizeCertificationEntry = (entry: unknown): CertificationWeightsEntry => {
    const safe = entry && typeof entry === 'object' && !Array.isArray(entry)
      ? (entry as Partial<CertificationWeightsEntry>)
      : {};

    const questionnaires = Array.isArray(safe.questionnaires)
      ? safe.questionnaires.map((questionnaire) => ({
          questionnaireId: String(questionnaire.questionnaireId ?? ''),
          isScored: !!questionnaire.isScored,
          weight: WeightsValidator.normalizeWeight(questionnaire.weight),
        }))
      : [];

    const total = WeightsValidator.sumWeights(questionnaires);

    return {
      isScored: !!safe.isScored,
      passScore: WeightsValidator.normalizeWeight(safe.passScore ?? 80),
      status:
        safe.status === 'READY'
          ? 'READY'
          : WeightsValidator.getStatus(!!safe.isScored, total),
      questionnaires,
    };
  };
}
