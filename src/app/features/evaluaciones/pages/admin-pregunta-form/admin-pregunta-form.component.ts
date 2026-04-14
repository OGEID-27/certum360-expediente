import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ArrowLeft,
  Blend,
  CircleCheck,
  CircleDot,
  CircleSlash,
  Ellipsis,
  File,
  Funnel,
  List,
  LucideAngularModule,
  Pyramid,
  Check,
  Eye,
  BookOpen,
  Pencil,
  Plus,
  SquarePen,
  Trash2,
  X,
} from 'lucide-angular';
import { ComponentCardComponent } from '../../../../shared/components/common/component-card/component-card.component';
import {
  FileAnswerValue,
  MixtaAnswerValue,
  Question,
  QuestionType,
  QUESTION_TYPE_LABELS,
  QUESTION_TYPES,
} from '../../models';
import { QuestionDicotomicaComponent } from '../../components/questions/question-dicotomica/question-dicotomica.component';
import { QuestionFileComponent } from '../../components/questions/question-file/question-file.component';
import { QuestionFilterComponent } from '../../components/questions/question-filter/question-filter.component';
import { QuestionLikertComponent } from '../../components/questions/question-likert/question-likert.component';
import { QuestionMixtaComponent } from '../../components/questions/question-mixta/question-mixta.component';
import { QuestionMultipleComponent } from '../../components/questions/question-multiple/question-multiple.component';
import { QuestionMultipleSelectComponent } from '../../components/questions/question-multiple-select/question-multiple-select.component';
import { QuestionNominalScaleComponent } from '../../components/questions/question-nominal-scale/question-nominal-scale.component';
import { QuestionNumericScaleComponent } from '../../components/questions/question-numeric-scale/question-numeric-scale.component';
import { QuestionRankingComponent } from '../../components/questions/question-ranking/question-ranking.component';
import { QuestionTextComponent } from '../../components/questions/question-text/question-text.component';
import { LocalStorageEvaluacionesRepository } from '../../services/local-storage-evaluaciones.repository';

type TypePalette = {
  active: string;
  inactive: string;
};

type LegendDefinition = {
  title: string;
  how: string[];
  example: {
    question: string;
    options?: string[];
    note?: string;
  };
};

@Component({
  selector: 'app-admin-pregunta-form',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
    ComponentCardComponent,
    QuestionMultipleComponent,
    QuestionTextComponent,
    QuestionFileComponent,
    QuestionMixtaComponent,
    QuestionDicotomicaComponent,
    QuestionMultipleSelectComponent,
    QuestionRankingComponent,
    QuestionLikertComponent,
    QuestionNumericScaleComponent,
    QuestionNominalScaleComponent,
    QuestionFilterComponent,
  ],
  templateUrl: './admin-pregunta-form.component.html',
})
export class AdminPreguntaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly ArrowLeft = ArrowLeft;
  readonly Trash2 = Trash2;
  readonly CircleDot = CircleDot;
  readonly SquarePen = SquarePen;
  readonly File = File;
  readonly Blend = Blend;
  readonly CircleSlash = CircleSlash;
  readonly CircleCheck = CircleCheck;
  readonly List = List;
  readonly Ellipsis = Ellipsis;
  readonly Pyramid = Pyramid;
  readonly Funnel = Funnel;
  readonly Check = Check;
  readonly X = X;
  readonly Eye = Eye;
  readonly BookOpen = BookOpen;
  readonly Pencil = Pencil;
  readonly Plus = Plus;

  questions: Question[] = [];
  editingQuestionId: string | null = null;

  readonly questionTypes: QuestionType[] = [...QUESTION_TYPES];
  readonly questionTypeLabels = QUESTION_TYPE_LABELS;
  readonly LEGENDS: Record<QuestionType, LegendDefinition> = {
    MULTIPLE: {
      title: QUESTION_TYPE_LABELS.MULTIPLE,
      how: [
        'El usuario elige SOLO una opcion.',
        'Ideal para decisiones excluyentes y respuestas directas.',
      ],
      example: {
        question: '¿Cual es tu turno?',
        options: ['Matutino', 'Vespertino', 'Nocturno'],
      },
    },
    TEXT: {
      title: QUESTION_TYPE_LABELS.TEXT,
      how: [
        'El usuario escribe una respuesta libre.',
        'Permite recoger detalle cualitativo y contexto.',
      ],
      example: {
        question: 'Describe el procedimiento de bloqueo y etiquetado (LOTO).',
      },
    },
    FILE: {
      title: QUESTION_TYPE_LABELS.FILE,
      how: [
        'El usuario adjunta evidencia en archivo (PDF/imagen).',
        'Util para respaldos documentales o fotograficos.',
      ],
      example: {
        question: 'Adjunta evidencia de inspeccion previa.',
      },
    },
    MIXTA: {
      title: QUESTION_TYPE_LABELS.MIXTA,
      how: [
        'Permite elegir una opcion y tambien escribir "Otros".',
        'Combina seleccion estructurada con flexibilidad.',
      ],
      example: {
        question: '¿Que transporte utilizas?',
        options: ['Auto', 'Camion', 'Bici', 'Otros'],
      },
    },
    DICOTOMICA: {
      title: QUESTION_TYPE_LABELS.DICOTOMICA,
      how: [
        'Solo presenta dos respuestas posibles.',
        'Se usa para validaciones rapidas de Si/No.',
      ],
      example: {
        question: '¿Has recibido capacitacion de seguridad este mes?',
        options: ['Si', 'No'],
      },
    },
    MULTIPLE_SELECT: {
      title: QUESTION_TYPE_LABELS.MULTIPLE_SELECT,
      how: [
        'Permite seleccionar varias opciones al mismo tiempo.',
        'Recomendado cuando pueden coexistir varias respuestas correctas.',
      ],
      example: {
        question: 'Selecciona los riesgos identificados en tu area.',
        options: ['Caidas', 'Quimicos', 'Electrico', 'Ruido'],
      },
    },
    RANKING: {
      title: QUESTION_TYPE_LABELS.RANKING,
      how: [
        'El usuario ordena opciones por prioridad.',
        'Puede arrastrar o mover elementos para definir orden final.',
      ],
      example: {
        question: 'Ordena estas prioridades para inicio de turno.',
        options: ['EPP', 'Checklist', 'Briefing', 'Herramientas'],
      },
    },
    LIKERT: {
      title: QUESTION_TYPE_LABELS.LIKERT,
      how: [
        'Evalua grado de acuerdo en una escala.',
        'Facilita medir percepcion de forma estandarizada.',
      ],
      example: {
        question: 'El area de trabajo esta limpia y ordenada.',
        options: [
          'Totalmente en desacuerdo',
          'En desacuerdo',
          'Ni de acuerdo ni en desacuerdo',
          'De acuerdo',
          'Totalmente de acuerdo',
        ],
      },
    },
    NUMERIC_SCALE: {
      title: QUESTION_TYPE_LABELS.NUMERIC_SCALE,
      how: [
        'El usuario califica con un numero dentro de un rango.',
        'Sirve para obtener una medicion cuantitativa directa.',
      ],
      example: {
        question: 'Del 1 al 10, ¿que tan claro fue el curso?',
        note: 'Rango sugerido: 1-10.',
      },
    },
    NOMINAL_SCALE: {
      title: QUESTION_TYPE_LABELS.NOMINAL_SCALE,
      how: [
        'Permite responder por frecuencia con etiquetas fijas.',
        'Util para seguimiento de habitos y recurrencia.',
      ],
      example: {
        question: '¿Con que frecuencia usas EPP?',
        options: ['Muchas veces', 'A veces', 'Casi nunca', 'Nunca'],
      },
    },
    FILTER: {
      title: QUESTION_TYPE_LABELS.FILTER,
      how: [
        'La respuesta define el siguiente paso del cuestionario.',
        'Puede redirigir a otra pregunta o finalizar flujo.',
      ],
      example: {
        question: '¿Tuviste incidente?',
        options: ['Si', 'No'],
        note: 'Si responde "Si" -> ir a "Describe el incidente"; si "No" -> continuar.',
      },
    },
  };

  readonly defaultLikertLevels = [
    'Totalmente en desacuerdo',
    'En desacuerdo',
    'Ni de acuerdo ni en desacuerdo',
    'De acuerdo',
    'Totalmente de acuerdo',
  ];

  readonly defaultNominalLabels = ['Muchas veces', 'A veces', 'Casi nunca', 'Nunca'];

  readonly previewMultipleControl = new FormControl<string[] | null>(null);
  readonly previewTextControl = new FormControl<string | null>(null);
  readonly previewFileControl = new FormControl<FileAnswerValue | null>(null);
  readonly previewMixtaControl = new FormControl<MixtaAnswerValue | null>(null);
  readonly previewDicotomicaControl = new FormControl<boolean | null>(null);
  readonly previewMultipleSelectControl = new FormControl<string[] | null>(null);
  readonly previewRankingControl = new FormControl<string[] | null>(null);
  readonly previewLikertControl = new FormControl<string | null>(null);
  readonly previewNumericControl = new FormControl<number | null>(null);
  readonly previewNominalControl = new FormControl<string | null>(null);
  readonly previewFilterControl = new FormControl<string | null>(null);
  optionTypeRenderKey = 0;

  questionForm = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(180)]],
    tipo: [null as QuestionType | null, Validators.required],
    obligatoria: [null as boolean | null, [this.requireBoolean]],
    ayuda: [''],

    multiple: [false],
    textMin: [null as number | null],
    textMax: [null as number | null],
    textPlaceholder: [''],
    fileExtensions: ['pdf,jpg,png'],
    fileMaxSize: [10 as number | null, [Validators.min(1), Validators.max(30)]],

    mixtaMultiple: [false],
    mixtaOtherLabel: ['Otros'],
    mixtaOtherPlaceholder: ['Especifica tu respuesta'],

    dicotomicaTrueLabel: ['Si', [Validators.maxLength(50)]],
    dicotomicaFalseLabel: ['No', [Validators.maxLength(50)]],

    numericMin: [1 as number | null],
    numericMax: [10 as number | null, [Validators.min(1), Validators.max(100)]],
    numericStep: [1 as number | null],

    nominalOrientation: ['horizontal' as 'horizontal' | 'vertical'],

    opciones: this.fb.array([]),
    levels: this.fb.array([]),
    rules: this.fb.array([]),
  });

  constructor(private readonly repository: LocalStorageEvaluacionesRepository) {
    this.initializeFromRoute();
  }

  get pageTitle(): string {
    return this.editingQuestionId ? 'Editar pregunta' : 'Nueva pregunta';
  }

  get isCreateMode(): boolean {
    return !this.route.snapshot.paramMap.get('id');
  }

  get opciones(): FormArray {
    return this.questionForm.get('opciones') as FormArray;
  }

  get levels(): FormArray {
    return this.questionForm.get('levels') as FormArray;
  }

  get rules(): FormArray {
    return this.questionForm.get('rules') as FormArray;
  }

  get selectedType(): QuestionType | null {
    return (this.questionForm.get('tipo')?.value as QuestionType | null) ?? null;
  }

  get selectedTypeForPreview(): QuestionType {
    return this.selectedType ?? 'MULTIPLE';
  }

  get selectedLegend(): LegendDefinition | null {
    if (!this.selectedType) {
      return null;
    }

    return this.LEGENDS[this.selectedType];
  }

  get availableRuleAnswerOptions(): { id: string; texto: string }[] {
    return this.opciones.controls
      .map((control) => ({
        id: String(control.get('id')?.value ?? ''),
        texto: String(control.get('texto')?.value ?? '').trim(),
      }))
      .filter((option) => option.id.length > 0);
  }

  get previewQuestion(): Question {
    return {
      id: this.editingQuestionId ?? 'preview_question',
      titulo: this.questionForm.get('titulo')?.value?.trim() || 'Vista previa de la pregunta',
      tipo: this.selectedTypeForPreview,
      obligatoria: !!this.questionForm.get('obligatoria')?.value,
      ayuda: this.questionForm.get('ayuda')?.value?.trim() || undefined,
      createdAt: new Date().toISOString(),
      config: this.buildPreviewConfig(this.selectedTypeForPreview),
    };
  }

  get isTypeInvalid(): boolean {
    const control = this.questionForm.get('tipo');
    return !!control && control.invalid && control.touched;
  }

  get isObligatoriaInvalid(): boolean {
    const control = this.questionForm.get('obligatoria');
    return !!control && control.invalid && control.touched;
  }

  goBack(): void {
    if (globalThis.history.length > 1) {
      this.location.back();
      return;
    }

    this.goToList();
  }

  showCreateForm(): void {
    this.editingQuestionId = null;
    this.questionForm.reset({
      titulo: '',
      tipo: null,
      obligatoria: null,
      ayuda: '',
      multiple: false,
      textMin: null,
      textMax: null,
      textPlaceholder: '',
      fileExtensions: 'pdf,jpg,png',
      fileMaxSize: 10,
      mixtaMultiple: false,
      mixtaOtherLabel: 'Otros',
      mixtaOtherPlaceholder: 'Especifica tu respuesta',
      dicotomicaTrueLabel: 'Si',
      dicotomicaFalseLabel: 'No',
      numericMin: 1,
      numericMax: 10,
      numericStep: 1,
      nominalOrientation: 'horizontal',
    });

    this.clearOptions();
    this.clearLevels();
    this.clearRules();
  }

  selectType(type: QuestionType): void {
    if (this.selectedType === type) {
      this.questionForm.get('tipo')?.markAsTouched();
      return;
    }

    this.questionForm.patchValue({ tipo: type });
    this.questionForm.get('tipo')?.markAsTouched();
    this.questionForm.get('tipo')?.markAsDirty();

    this.clearOptions();
    this.clearLevels();
    this.clearRules();
    this.initializeTypeDefaults(type, true);
    this.refreshOptionTypeUi(type);
  }

  setObligatoria(value: boolean): void {
    this.questionForm.patchValue({ obligatoria: value });
    this.questionForm.get('obligatoria')?.markAsTouched();
    this.questionForm.get('obligatoria')?.markAsDirty();
  }

  isTypeSelected(type: QuestionType): boolean {
    return this.selectedType === type;
  }

  getTypeIcon(type: QuestionType): typeof CircleDot {
    switch (type) {
      case 'MULTIPLE':
        return this.CircleDot;
      case 'TEXT':
        return this.SquarePen;
      case 'FILE':
        return this.File;
      case 'MIXTA':
        return this.Blend;
      case 'DICOTOMICA':
        return this.CircleSlash;
      case 'MULTIPLE_SELECT':
        return this.CircleCheck;
      case 'RANKING':
        return this.List;
      case 'LIKERT':
      case 'NUMERIC_SCALE':
        return this.Ellipsis;
      case 'NOMINAL_SCALE':
        return this.Pyramid;
      case 'FILTER':
        return this.Funnel;
      default:
        return this.CircleDot;
    }
  }

  getTypeChipClass(type: QuestionType): string {
    const palette = this.getTypePalette(type);
    return this.isTypeSelected(type) ? palette.active : palette.inactive;
  }

  isControlInvalid(controlName: string): boolean {
    const control = this.questionForm.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  hasControlError(controlName: string, errorKey: string): boolean {
    const control = this.questionForm.get(controlName);
    return !!control && !!control.errors?.[errorKey] && control.touched;
  }

  clampNumberInput(controlName: 'fileMaxSize' | 'numericMax', max: number): void {
    const control = this.questionForm.get(controlName);
    const value = Number(control?.value);

    if (!Number.isFinite(value)) {
      return;
    }

    if (value > max) {
      control?.setValue(max);
      control?.markAsDirty();
      control?.updateValueAndValidity();
    }
  }

  addOption(id?: string, texto = ''): void {
    this.opciones.push(
      this.fb.group({
        id: [id ?? this.generateOptionId()],
        texto: [texto, [Validators.required, Validators.maxLength(120)]],
      }),
    );

    if (this.selectedType === 'FILTER') {
      this.syncRuleAnswerValues();
    }
  }

  removeOption(index: number): void {
    if (this.opciones.length <= 1) {
      return;
    }

    this.opciones.removeAt(index);
    if (this.selectedType === 'FILTER') {
      this.syncRuleAnswerValues();
    }
  }

  addLevel(value = ''): void {
    this.levels.push(new FormControl(value, { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }));
  }

  removeLevel(index: number): void {
    if (this.levels.length <= 2) {
      return;
    }

    this.levels.removeAt(index);
  }

  addRule(answerValue = '', goToQuestionId = '', endQuiz = false): void {
    this.rules.push(
      this.fb.group({
        answerValue: [answerValue, Validators.required],
        goToQuestionId: [goToQuestionId],
        endQuiz: [endQuiz],
      }),
    );
  }

  removeRule(index: number): void {
    if (this.rules.length <= 1) {
      return;
    }

    this.rules.removeAt(index);
  }

  onRuleEndQuizChange(index: number): void {
    const rule = this.rules.at(index);
    const endQuiz = !!rule.get('endQuiz')?.value;

    if (endQuiz) {
      rule.patchValue({ goToQuestionId: '' });
    }
  }

  cancelForm(): void {
    this.goToList();
  }

  saveQuestion(): void {
    if (this.questionForm.invalid) {
      this.questionForm.markAllAsTouched();
      return;
    }

    const type = this.selectedType;
    if (!type) {
      this.questionForm.get('tipo')?.markAsTouched();
      return;
    }

    const obligatoria = this.questionForm.get('obligatoria')?.value;
    if (typeof obligatoria !== 'boolean') {
      this.questionForm.get('obligatoria')?.markAsTouched();
      return;
    }

    let config: Question['config'];

    switch (type) {
      case 'MULTIPLE': {
        const options = this.buildOptionsFromForm();
        if (options.length === 0) {
          this.opciones.markAllAsTouched();
          return;
        }

        config = {
          opciones: options,
          multiple: false,
        };
        break;
      }
      case 'MULTIPLE_SELECT': {
        const options = this.buildOptionsFromForm();
        if (options.length === 0) {
          this.opciones.markAllAsTouched();
          return;
        }

        config = {
          opciones: options,
        };
        break;
      }
      case 'MIXTA': {
        const options = this.buildOptionsFromForm();
        if (options.length === 0) {
          this.opciones.markAllAsTouched();
          return;
        }

        config = {
          opciones: options,
          multiple: !!this.questionForm.get('mixtaMultiple')?.value,
          otherOptionValue: '__other__',
          otherLabel: this.questionForm.get('mixtaOtherLabel')?.value?.trim() || 'Otros',
          otherPlaceholder: this.questionForm.get('mixtaOtherPlaceholder')?.value?.trim() || 'Especifica tu respuesta',
        };
        break;
      }
      case 'DICOTOMICA': {
        config = {
          trueLabel: this.questionForm.get('dicotomicaTrueLabel')?.value?.trim() || 'Si',
          falseLabel: this.questionForm.get('dicotomicaFalseLabel')?.value?.trim() || 'No',
        };
        break;
      }
      case 'RANKING': {
        const options = this.buildOptionsFromForm();
        if (options.length === 0) {
          this.opciones.markAllAsTouched();
          return;
        }

        config = {
          opciones: options,
        };
        break;
      }
      case 'LIKERT': {
        const levels = this.buildLevelsFromForm();
        if (levels.length < 2) {
          this.levels.markAllAsTouched();
          return;
        }

        config = {
          levels,
        };
        break;
      }
      case 'NUMERIC_SCALE': {
        const min = this.questionForm.get('numericMin')?.value;
        const max = this.questionForm.get('numericMax')?.value;
        const step = this.questionForm.get('numericStep')?.value;

        if (typeof min !== 'number' || typeof max !== 'number') {
          return;
        }

        if (max < min) {
          this.questionForm.get('numericMax')?.setErrors({ ...(this.questionForm.get('numericMax')?.errors ?? {}), min: true });
          this.questionForm.get('numericMax')?.markAsTouched();
          return;
        }

        if (max > 100) {
          this.questionForm.get('numericMax')?.setErrors({ ...(this.questionForm.get('numericMax')?.errors ?? {}), max: true });
          this.questionForm.get('numericMax')?.markAsTouched();
          return;
        }

        config = {
          min,
          max,
          step: typeof step === 'number' && step > 0 ? step : 1,
        };
        break;
      }
      case 'NOMINAL_SCALE': {
        const labels = this.buildLevelsFromForm();
        if (labels.length < 2) {
          this.levels.markAllAsTouched();
          return;
        }

        config = {
          labels,
          orientation: (this.questionForm.get('nominalOrientation')?.value as 'horizontal' | 'vertical') ?? 'horizontal',
        };
        break;
      }
      case 'FILTER': {
        const options = this.buildOptionsFromForm();
        if (options.length === 0) {
          this.opciones.markAllAsTouched();
          return;
        }

        this.syncRuleAnswerValues();

        const rules = this.rules.controls
          .map((control) => ({
            answerValue: String(control.get('answerValue')?.value ?? '').trim(),
            goToQuestionId: String(control.get('goToQuestionId')?.value ?? '').trim(),
            endQuiz: !!control.get('endQuiz')?.value,
          }))
          .filter((rule) => rule.answerValue.length > 0)
          .map((rule) => ({
            answerValue: rule.answerValue,
            goToQuestionId: rule.endQuiz ? undefined : rule.goToQuestionId || undefined,
            endQuiz: rule.endQuiz || undefined,
          }));

        config = {
          opciones: options,
          rules,
        };
        break;
      }
      case 'TEXT': {
        const minLength = this.questionForm.get('textMin')?.value ?? null;
        const maxLength = this.questionForm.get('textMax')?.value ?? null;
        config = {
          minLength: minLength ?? undefined,
          maxLength: maxLength ?? undefined,
          placeholder: this.questionForm.get('textPlaceholder')?.value?.trim() || undefined,
        };
        break;
      }
      case 'FILE':
      default: {
        const extensionsRaw = this.questionForm.get('fileExtensions')?.value ?? '';
        const extensions = extensionsRaw
          .split(',')
          .map((item) => item.trim().toLowerCase())
          .filter((item) => item.length > 0);
        const maxSize = this.questionForm.get('fileMaxSize')?.value ?? null;

        if (typeof maxSize === 'number' && maxSize > 30) {
          this.questionForm.get('fileMaxSize')?.setErrors({ ...(this.questionForm.get('fileMaxSize')?.errors ?? {}), max: true });
          this.questionForm.get('fileMaxSize')?.markAsTouched();
          return;
        }

        config = {
          allowedExtensions: extensions.length > 0 ? extensions : undefined,
          maxSizeMB: maxSize ?? undefined,
        };
        break;
      }
    }

    this.repository.saveQuestion({
      id: this.editingQuestionId ?? undefined,
      titulo: this.questionForm.get('titulo')?.value?.trim() ?? '',
      tipo: type,
      obligatoria,
      ayuda: this.questionForm.get('ayuda')?.value?.trim() || undefined,
      config,
    });

    this.goToList();
  }

  isOptionBasedType(type: QuestionType | null): boolean {
    return !!type && ['MULTIPLE', 'MULTIPLE_SELECT', 'MIXTA', 'RANKING', 'FILTER'].includes(type);
  }

  private initializeFromRoute(): void {
    this.route.paramMap.subscribe((params) => {
      this.loadQuestions();
      const questionId = params.get('id');

      if (!questionId) {
        this.showCreateForm();
        return;
      }

      const question = this.questions.find((item) => item.id === questionId);
      if (!question) {
        this.goToList();
        return;
      }

      this.loadQuestionIntoForm(question);
    });
  }

  private loadQuestions(): void {
    this.questions = this.repository.getQuestions().map((question) => ({
      ...question,
      createdAt: question.createdAt ?? new Date().toISOString(),
    }));
  }

  private loadQuestionIntoForm(question: Question): void {
    this.editingQuestionId = question.id;

    this.questionForm.patchValue({
      titulo: question.titulo,
      tipo: question.tipo,
      obligatoria: question.obligatoria,
      ayuda: question.ayuda ?? '',
      multiple: false,
      textMin: null,
      textMax: null,
      textPlaceholder: '',
      fileExtensions: 'pdf,jpg,png',
      fileMaxSize: 10,
      mixtaMultiple: false,
      mixtaOtherLabel: 'Otros',
      mixtaOtherPlaceholder: 'Especifica tu respuesta',
      dicotomicaTrueLabel: 'Si',
      dicotomicaFalseLabel: 'No',
      numericMin: 1,
      numericMax: 10,
      numericStep: 1,
      nominalOrientation: 'horizontal',
    });

    this.clearOptions();
    this.clearLevels();
    this.clearRules();

    switch (question.tipo) {
      case 'MULTIPLE': {
        const config = question.config as { opciones?: { id: string; texto: string }[] };
        (config.opciones ?? []).forEach((option) => this.addOption(option.id, option.texto));
        if ((config.opciones ?? []).length === 0) {
          this.addOption();
        }
        this.questionForm.patchValue({ multiple: false });
        break;
      }
      case 'MULTIPLE_SELECT':
      case 'RANKING': {
        const config = question.config as { opciones?: { id: string; texto: string }[] };
        (config.opciones ?? []).forEach((option) => this.addOption(option.id, option.texto));
        if ((config.opciones ?? []).length === 0) {
          this.addOption();
        }
        break;
      }
      case 'MIXTA': {
        const config = question.config as {
          opciones?: { id: string; texto: string }[];
          multiple?: boolean;
          otherLabel?: string;
          otherPlaceholder?: string;
        };
        (config.opciones ?? []).forEach((option) => this.addOption(option.id, option.texto));
        if ((config.opciones ?? []).length === 0) {
          this.addOption();
        }
        this.questionForm.patchValue({
          mixtaMultiple: !!config.multiple,
          mixtaOtherLabel: config.otherLabel ?? 'Otros',
          mixtaOtherPlaceholder: config.otherPlaceholder ?? 'Especifica tu respuesta',
        });
        break;
      }
      case 'TEXT': {
        const config = question.config as { minLength?: number; maxLength?: number; placeholder?: string };
        this.questionForm.patchValue({
          textMin: config.minLength ?? null,
          textMax: config.maxLength ?? null,
          textPlaceholder: config.placeholder ?? '',
        });
        break;
      }
      case 'FILE': {
        const config = question.config as { allowedExtensions?: string[]; maxSizeMB?: number };
        this.questionForm.patchValue({
          fileExtensions: (config.allowedExtensions ?? []).join(','),
          fileMaxSize: config.maxSizeMB ?? null,
        });
        break;
      }
      case 'DICOTOMICA': {
        const config = question.config as { trueLabel?: string; falseLabel?: string };
        this.questionForm.patchValue({
          dicotomicaTrueLabel: config.trueLabel ?? 'Si',
          dicotomicaFalseLabel: config.falseLabel ?? 'No',
        });
        break;
      }
      case 'LIKERT': {
        const config = question.config as { levels?: string[] };
        const levels = config.levels && config.levels.length > 0 ? config.levels : this.defaultLikertLevels;
        levels.forEach((level) => this.addLevel(level));
        break;
      }
      case 'NUMERIC_SCALE': {
        const config = question.config as { min?: number; max?: number; step?: number };
        this.questionForm.patchValue({
          numericMin: typeof config.min === 'number' ? config.min : 1,
          numericMax: typeof config.max === 'number' ? config.max : 10,
          numericStep: typeof config.step === 'number' ? config.step : 1,
        });
        break;
      }
      case 'NOMINAL_SCALE': {
        const config = question.config as { labels?: string[]; orientation?: 'horizontal' | 'vertical' };
        const labels = config.labels && config.labels.length > 0 ? config.labels : this.defaultNominalLabels;
        labels.forEach((label) => this.addLevel(label));
        this.questionForm.patchValue({
          nominalOrientation: config.orientation ?? 'horizontal',
        });
        break;
      }
      case 'FILTER': {
        const config = question.config as {
          opciones?: { id: string; texto: string }[];
          rules?: { answerValue: string; goToQuestionId?: string; endQuiz?: boolean }[];
        };

        (config.opciones ?? []).forEach((option) => this.addOption(option.id, option.texto));
        if ((config.opciones ?? []).length === 0) {
          this.addOption();
        }

        (config.rules ?? []).forEach((rule) => {
          this.addRule(rule.answerValue, rule.goToQuestionId ?? '', !!rule.endQuiz);
        });

        if ((config.rules ?? []).length === 0) {
          this.addRule(this.availableRuleAnswerOptions[0]?.id ?? '');
        }
        this.syncRuleAnswerValues();
        break;
      }
      default:
        this.initializeTypeDefaults(question.tipo, true);
        break;
    }

    this.refreshOptionTypeUi(question.tipo);
  }

  private initializeTypeDefaults(type: QuestionType | null, forceReset = false): void {
    if (!type) {
      return;
    }

    if (this.isOptionBasedType(type) && (forceReset || this.opciones.length === 0)) {
      this.addOption(undefined, 'Opcion 1');
      this.addOption(undefined, 'Opcion 2');
    }

    if (type === 'LIKERT' && (forceReset || this.levels.length === 0)) {
      this.defaultLikertLevels.forEach((level) => this.addLevel(level));
    }

    if (type === 'NOMINAL_SCALE' && (forceReset || this.levels.length === 0)) {
      this.defaultNominalLabels.forEach((label) => this.addLevel(label));
    }

    if (type === 'FILTER' && (forceReset || this.rules.length === 0)) {
      const firstOptionId = this.availableRuleAnswerOptions[0]?.id ?? '';
      this.addRule(firstOptionId);
      this.syncRuleAnswerValues();
    }
  }

  private buildOptionsFromForm(): { id: string; texto: string }[] {
    return this.opciones.controls
      .map((control) => ({
        id: String(control.get('id')?.value ?? ''),
        texto: String(control.get('texto')?.value ?? '').trim(),
      }))
      .filter((option) => option.id.length > 0 && option.texto.length > 0);
  }

  private buildLevelsFromForm(): string[] {
    return this.levels.controls
      .map((control) => String(control.value ?? '').trim())
      .filter((value) => value.length > 0);
  }

  private buildPreviewConfig(type: QuestionType): Question['config'] {
    const options = this.buildOptionsFromForm();
    const levels = this.buildLevelsFromForm();

    switch (type) {
      case 'MULTIPLE':
        return {
          opciones: options,
          multiple: false,
        };
      case 'MULTIPLE_SELECT':
        return {
          opciones: options,
        };
      case 'TEXT':
        return {
          minLength: this.questionForm.get('textMin')?.value ?? undefined,
          maxLength: this.questionForm.get('textMax')?.value ?? undefined,
          placeholder: this.questionForm.get('textPlaceholder')?.value?.trim() || undefined,
        };
      case 'FILE': {
        const rawMax = this.questionForm.get('fileMaxSize')?.value;
        return {
          allowedExtensions: String(this.questionForm.get('fileExtensions')?.value ?? '')
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter((item) => item.length > 0),
          maxSizeMB: typeof rawMax === 'number' ? Math.min(rawMax, 30) : undefined,
        };
      }
      case 'MIXTA':
        return {
          opciones: options,
          multiple: !!this.questionForm.get('mixtaMultiple')?.value,
          otherOptionValue: '__other__',
          otherLabel: this.questionForm.get('mixtaOtherLabel')?.value?.trim() || 'Otros',
          otherPlaceholder: this.questionForm.get('mixtaOtherPlaceholder')?.value?.trim() || 'Especifica tu respuesta',
        };
      case 'DICOTOMICA':
        return {
          trueLabel: this.questionForm.get('dicotomicaTrueLabel')?.value?.trim() || 'Si',
          falseLabel: this.questionForm.get('dicotomicaFalseLabel')?.value?.trim() || 'No',
        };
      case 'RANKING':
        return {
          opciones: options,
        };
      case 'LIKERT':
        return {
          levels: levels.length > 0 ? levels : this.defaultLikertLevels,
        };
      case 'NUMERIC_SCALE': {
        const max = this.questionForm.get('numericMax')?.value as number | null;
        return {
          min: (this.questionForm.get('numericMin')?.value as number) ?? 1,
          max: typeof max === 'number' ? Math.min(max, 100) : 10,
          step: (this.questionForm.get('numericStep')?.value as number) ?? 1,
        };
      }
      case 'NOMINAL_SCALE':
        return {
          labels: levels.length > 0 ? levels : this.defaultNominalLabels,
          orientation: (this.questionForm.get('nominalOrientation')?.value as 'horizontal' | 'vertical') ?? 'horizontal',
        };
      case 'FILTER':
      default:
        return {
          opciones: options,
          rules: this.rules.controls
            .map((control) => ({
              answerValue: String(control.get('answerValue')?.value ?? '').trim(),
              goToQuestionId: String(control.get('goToQuestionId')?.value ?? '').trim() || undefined,
              endQuiz: !!control.get('endQuiz')?.value || undefined,
            }))
            .filter((rule) => rule.answerValue.length > 0),
        };
    }
  }

  private syncRuleAnswerValues(): void {
    const validIds = this.availableRuleAnswerOptions.map((option) => option.id);

    this.rules.controls.forEach((ruleControl) => {
      const answerValue = String(ruleControl.get('answerValue')?.value ?? '');
      if (!validIds.includes(answerValue)) {
        ruleControl.patchValue({ answerValue: validIds[0] ?? '' });
      }
    });
  }

  private clearOptions(): void {
    this.questionForm.setControl('opciones', this.fb.array([]));
  }

  private clearLevels(): void {
    while (this.levels.length > 0) {
      this.levels.removeAt(0);
    }
  }

  private clearRules(): void {
    while (this.rules.length > 0) {
      this.rules.removeAt(0);
    }
  }

  private generateOptionId(): string {
    const uid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random()}`;
    return `op_${uid}`;
  }

  private getTypePalette(type: QuestionType): TypePalette {
    void type;

    return {
      active: [
        'border-blue-600 bg-blue-600 text-white',
        'hover:bg-blue-700',
        'dark:border-blue-400 dark:bg-blue-500 dark:text-white',
        'dark:hover:bg-blue-600',
      ].join(' '),
      inactive: [
        'border-blue-300 bg-blue-50 text-blue-700',
        'hover:bg-blue-100',
        'dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200',
        'dark:hover:bg-blue-500/20',
      ].join(' '),
    };
  }

  private requireBoolean(control: AbstractControl): ValidationErrors | null {
    return typeof control.value === 'boolean' ? null : { required: true };
  }

  private refreshOptionTypeUi(type: QuestionType | null): void {
    if (!this.isOptionBasedType(type)) {
      return;
    }

    this.previewMultipleControl.reset(null, { emitEvent: false });
    this.previewMultipleSelectControl.reset(null, { emitEvent: false });
    this.previewRankingControl.reset(null, { emitEvent: false });
    this.previewMixtaControl.reset(null, { emitEvent: false });
    this.previewFilterControl.reset(null, { emitEvent: false });
    this.optionTypeRenderKey += 1;
  }

  private goToList(): void {
    this.router.navigate(['/evaluaciones/admin/preguntas']);
  }
}
