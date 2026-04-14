import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArrowLeft,
  Check,
  Eye,
  LucideAngularModule,
  Send,
  Shuffle,
  X,
} from 'lucide-angular';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import { ToastService } from '../../../../shared/services/toast.service';
import {
  Certification,
  Question,
  Questionnaire,
  Section,
} from '../../models';
import { LocalStorageEvaluacionesRepository } from '../../services/local-storage-evaluaciones.repository';
import { ScoringService } from '../../services/scoring.service';
import { WeightsStorageService } from '../../services/weights-storage.service';
import { WeightsValidator } from '../../services/weights-validator';

type PreviewQuestionNode = {
  key: string;
  questionId: string;
  title: string;
  weight: number;
  isScored: boolean;
  answered: boolean;
  correct: boolean;
};

type PreviewSectionNode = {
  sectionId: string;
  title: string;
  weight: number;
  isScored: boolean;
  questions: PreviewQuestionNode[];
};

type PreviewQuestionnaireNode = {
  questionnaireId: string;
  title: string;
  weight: number;
  isScored: boolean;
  sections: PreviewSectionNode[];
};

@Component({
  selector: 'app-admin-certificacion-preview',
  imports: [CommonModule, LucideAngularModule, ComponentCardComponent],
  templateUrl: './admin-certificacion-preview.component.html',
})
export class AdminCertificacionPreviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toastService = inject(ToastService);

  readonly ArrowLeft = ArrowLeft;
  readonly Eye = Eye;
  readonly Shuffle = Shuffle;
  readonly Send = Send;
  readonly Check = Check;
  readonly X = X;
  readonly Math = Math;

  certification?: Certification;
  certificationIsScored = true;
  passScore = 80;
  questionnaires: PreviewQuestionnaireNode[] = [];
  submitMessage = '';
  submitMessageType: 'success' | 'warning' | '' = '';
  loadError = '';

  constructor(
    private readonly repository: LocalStorageEvaluacionesRepository,
    private readonly weightsStorage: WeightsStorageService,
    private readonly scoringService: ScoringService,
  ) {
    this.initialize();
  }

  get answeredCount(): number {
    return this.getAllQuestions().filter((question) => question.answered).length;
  }

  get totalQuestions(): number {
    return this.getAllQuestions().length;
  }

  get finalScoreDecimal(): number {
    return this.scoringService.calculateWeightedScore(
      this.questionnaires.map((questionnaire) => ({
        score: this.getQuestionnaireScore(questionnaire),
        weight: questionnaire.weight,
        isScored: this.certificationIsScored && questionnaire.isScored,
      })),
    );
  }

  get finalScorePercent(): number {
    return this.scoringService.toPercent(this.finalScoreDecimal);
  }

  get isPassed(): boolean {
    if (!this.certificationIsScored) {
      return true;
    }

    return this.finalScorePercent >= this.passScore;
  }

  get canSubmitAttempt(): boolean {
    return this.answeredCount > 0;
  }

  goBack(): void {
    if (globalThis.history.length > 1) {
      this.location.back();
      return;
    }

    this.goToList();
  }

  randomizeAnswers(): void {
    this.submitMessage = '';
    this.submitMessageType = '';

    this.getAllQuestions().forEach((question) => {
      const answered = Math.random() >= 0.35;
      question.answered = answered;
      question.correct = answered ? Math.random() >= 0.4 : false;
    });
  }

  onAnsweredChange(question: PreviewQuestionNode, checked: boolean): void {
    question.answered = checked;
    if (!checked) {
      question.correct = false;
    }

    this.submitMessage = '';
    this.submitMessageType = '';
  }

  onCorrectChange(question: PreviewQuestionNode, checked: boolean): void {
    if (!question.answered) {
      question.correct = false;
      return;
    }

    question.correct = checked;
    this.submitMessage = '';
    this.submitMessageType = '';
  }

  getQuestionContribution(question: PreviewQuestionNode): number {
    if (!question.isScored) {
      return 0;
    }

    const score = this.scoringService.getQuestionScore(
      question.answered,
      question.correct,
    );

    return this.scoringService.toPercent(score * this.scoringService.toDecimal(question.weight));
  }

  getSectionScore(section: PreviewSectionNode): number {
    return this.scoringService.calculateWeightedScore(
      section.questions.map((question) => ({
        score: this.scoringService.getQuestionScore(
          question.answered,
          question.correct,
        ),
        weight: question.weight,
        isScored: section.isScored && question.isScored,
      })),
    );
  }

  getSectionScorePercent(section: PreviewSectionNode): number {
    return this.scoringService.toPercent(this.getSectionScore(section));
  }

  getQuestionnaireScore(questionnaire: PreviewQuestionnaireNode): number {
    return this.scoringService.calculateWeightedScore(
      questionnaire.sections.map((section) => ({
        score: this.getSectionScore(section),
        weight: section.weight,
        isScored: questionnaire.isScored && section.isScored,
      })),
    );
  }

  getQuestionnaireScorePercent(questionnaire: PreviewQuestionnaireNode): number {
    return this.scoringService.toPercent(this.getQuestionnaireScore(questionnaire));
  }

  submitAttempt(): void {
    if (!this.canSubmitAttempt) {
      this.submitMessage =
        'Debes responder al menos una pregunta para enviar el intento de simulacion.';
      this.submitMessageType = 'warning';
      this.toastService.show({
        type: 'warning',
        message: 'No se puede enviar: answeredCount = 0.',
        durationMs: 3200,
      });
      return;
    }

    this.submitMessage = `Intento simulado enviado. Respuestas: ${this.answeredCount}/${this.totalQuestions}. Score final: ${this.finalScorePercent}%.`;
    this.submitMessageType = 'success';
    this.toastService.show({
      type: 'success',
      message: 'Intento simulado enviado.',
      durationMs: 2800,
    });
  }

  private initialize(): void {
    const certificationId = this.route.snapshot.paramMap.get('id');
    if (!certificationId) {
      this.loadError = 'No se encontro la certificacion para preview.';
      return;
    }

    const certification = this.repository
      .getCertifications()
      .find((item) => item.id === certificationId);

    if (!certification) {
      this.loadError = 'La certificacion no existe.';
      return;
    }

    this.certification = certification;

    const certificationWeights =
      this.weightsStorage.getCertificationWeight(certification.id);
    this.certificationIsScored = certificationWeights?.isScored ?? true;
    this.passScore =
      certificationWeights?.passScore ?? certification.rules.minScore ?? 80;

    const questionnaires = this.repository.getQuestionnaires();
    const sections = this.repository.getSections();
    const questions = this.repository.getQuestions();

    this.questionnaires = certification.questionnaireIds
      .map((questionnaireId) =>
        this.buildQuestionnaireNode(
          questionnaireId,
          questionnaires,
          sections,
          questions,
          certificationWeights,
        ),
      )
      .filter(
        (questionnaire): questionnaire is PreviewQuestionnaireNode =>
          !!questionnaire,
      );
  }

  private buildQuestionnaireNode(
    questionnaireId: string,
    allQuestionnaires: Questionnaire[],
    allSections: Section[],
    allQuestions: Question[],
    certificationWeights: ReturnType<
      WeightsStorageService['getCertificationWeight']
    >,
  ): PreviewQuestionnaireNode | undefined {
    const questionnaire = allQuestionnaires.find((item) => item.id === questionnaireId);
    if (!questionnaire) {
      return undefined;
    }

    const certificationWeightItem = certificationWeights?.questionnaires.find(
      (item) => item.questionnaireId === questionnaire.id,
    );

    const questionnaireWeights =
      this.weightsStorage.getQuestionnaireWeight(questionnaire.id);

    const sections = questionnaire.sectionIds
      .map((sectionId) =>
        this.buildSectionNode(
          questionnaire.id,
          sectionId,
          allSections,
          allQuestions,
          questionnaireWeights,
        ),
      )
      .filter((section): section is PreviewSectionNode => !!section);

    return {
      questionnaireId: questionnaire.id,
      title: questionnaire.nombre,
      weight: WeightsValidator.normalizeWeight(certificationWeightItem?.weight ?? 0),
      isScored:
        !!(certificationWeights?.isScored ?? true) &&
        !!(certificationWeightItem?.isScored ?? false),
      sections,
    };
  }

  private buildSectionNode(
    questionnaireId: string,
    sectionId: string,
    allSections: Section[],
    allQuestions: Question[],
    questionnaireWeights: ReturnType<WeightsStorageService['getQuestionnaireWeight']>,
  ): PreviewSectionNode | undefined {
    const section = allSections.find((item) => item.id === sectionId);
    if (!section) {
      return undefined;
    }

    const questionnaireWeightItem = questionnaireWeights?.sections.find(
      (item) => item.sectionId === section.id,
    );

    const sectionWeights = this.weightsStorage.getSectionWeight(section.id);

    const questions = section.questionIds
      .map((questionId) =>
        this.buildQuestionNode(
          questionnaireId,
          section.id,
          questionId,
          allQuestions,
          sectionWeights,
        ),
      )
      .filter((question): question is PreviewQuestionNode => !!question);

    return {
      sectionId: section.id,
      title: section.nombre,
      weight: WeightsValidator.normalizeWeight(questionnaireWeightItem?.weight ?? 0),
      isScored:
        !!(questionnaireWeights?.isScored ?? true) &&
        !!(questionnaireWeightItem?.isScored ?? false),
      questions,
    };
  }

  private buildQuestionNode(
    questionnaireId: string,
    sectionId: string,
    questionId: string,
    allQuestions: Question[],
    sectionWeights: ReturnType<WeightsStorageService['getSectionWeight']>,
  ): PreviewQuestionNode | undefined {
    const question = allQuestions.find((item) => item.id === questionId);
    if (!question) {
      return undefined;
    }

    const sectionWeightItem = sectionWeights?.questions.find(
      (item) => item.questionId === question.id,
    );

    return {
      key: `${questionnaireId}::${sectionId}::${question.id}`,
      questionId: question.id,
      title: question.titulo,
      weight: WeightsValidator.normalizeWeight(sectionWeightItem?.weight ?? 0),
      isScored:
        !!(sectionWeights?.isScored ?? true) && !!(sectionWeightItem?.isScored ?? false),
      answered: false,
      correct: false,
    };
  }

  private getAllQuestions(): PreviewQuestionNode[] {
    return this.questionnaires.flatMap((questionnaire) =>
      questionnaire.sections.flatMap((section) => section.questions),
    );
  }

  private goToList(): void {
    this.router.navigate(['/evaluaciones/admin/certificaciones']);
  }
}
