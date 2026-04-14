import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type RemediationPriority = 'Baja' | 'Media' | 'Alta' | 'Critica';
export type RemediationStatus =
  | 'Pendiente'
  | 'En proceso'
  | 'En revision'
  | 'Vencido'
  | 'Completado'
  | 'Validado';
export type RemediationRiskLevel = 'Bajo' | 'Medio' | 'Alto' | 'Critico';
export type RemediationSource =
  | 'Evaluacion reprobada'
  | 'Cuestionario reprobado'
  | 'Incumplimiento relevante';
export type RemediationHistoryTone = 'brand' | 'success' | 'warning' | 'error';

export interface RemediationEvidence {
  id: string;
  name: string;
  uploadedAt: string;
  uploadedBy: string;
  status: 'Pendiente' | 'Recibida' | 'Validada';
  description: string;
}

export interface RemediationComment {
  id: string;
  author: string;
  authorRole: 'admin' | 'user';
  createdAt: string;
  message: string;
  internal: boolean;
}

export interface RemediationHistoryItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  actor: string;
  tone: RemediationHistoryTone;
}

export interface RemediationCase {
  id: string;
  title: string;
  clientName: string;
  evaluationName: string;
  source: RemediationSource;
  sourceStatus: 'Reprobado' | 'Incumplimiento';
  assignedUserName: string;
  assignedUserEmail: string;
  assignedUserArea: string;
  responsibleName: string;
  responsibleRole: string;
  category: string;
  failureReason: string;
  riskLevel: RemediationRiskLevel;
  priority: RemediationPriority;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
  status: RemediationStatus;
  evidenceRequired: string[];
  correctiveActions: string[];
  internalCommentsNote: string;
  isCriticalAlert: boolean;
  requiresValidation: boolean;
  evidence: RemediationEvidence[];
  comments: RemediationComment[];
  history: RemediationHistoryItem[];
}

type AdminPlanUpdate = Pick<
  RemediationCase,
  | 'priority'
  | 'responsibleName'
  | 'responsibleRole'
  | 'dueDate'
  | 'status'
  | 'internalCommentsNote'
> & {
  evidenceRequired: string[];
  correctiveActions: string[];
};

type UserProgressUpdate = {
  progress: number;
  status: Extract<
    RemediationStatus,
    'Pendiente' | 'En proceso' | 'En revision' | 'Completado'
  >;
};

const STORAGE_KEY = 'remediation_cases_v1';

const INITIAL_CASES: RemediationCase[] = [
  {
    id: 'REM-001',
    title: 'Corregir controles de fuga de informacion',
    clientName: 'Grupo Delta Industrial',
    evaluationName: 'Cuestionario de seguridad de la informacion / marzo 2026',
    source: 'Cuestionario reprobado',
    sourceStatus: 'Reprobado',
    assignedUserName: 'Adrian Molina',
    assignedUserEmail: 'adrian@moontest.mx',
    assignedUserArea: 'Sistemas',
    responsibleName: 'Laura Mendoza',
    responsibleRole: 'Lider de seguridad',
    category: 'Fuga de informacion',
    failureReason:
      'El cuestionario quedo reprobado por politicas de envio y resguardo sin evidencia vigente.',
    riskLevel: 'Critico',
    priority: 'Critica',
    dueDate: '2026-03-27T18:00:00',
    createdAt: '2026-03-20T09:15:00',
    updatedAt: '2026-03-22T08:40:00',
    progress: 45,
    status: 'En proceso',
    evidenceRequired: [
      'Captura dummy de restriccion de acceso al repositorio',
      'Acuse de politica interna actualizada',
    ],
    correctiveActions: [
      'Actualizar politica de envio de informacion sensible',
      'Reforzar control de accesos compartidos',
      'Documentar aprobacion del responsable de area',
    ],
    internalCommentsNote:
      'Caso vinculado a hallazgo critico en la ultima revision operativa.',
    isCriticalAlert: true,
    requiresValidation: false,
    evidence: [
      {
        id: 'EVD-001',
        name: 'Politica_seguridad_v2.pdf',
        uploadedAt: '2026-03-21T16:20:00',
        uploadedBy: 'Adrian Molina',
        status: 'Recibida',
        description: 'Version dummy de politica actualizada.',
      },
    ],
    comments: [
      {
        id: 'COM-001',
        author: 'Laura Mendoza',
        authorRole: 'admin',
        createdAt: '2026-03-20T10:00:00',
        message:
          'Priorizar este caso porque afecta el score de seguridad de la informacion.',
        internal: false,
      },
      {
        id: 'COM-002',
        author: 'Adrian Molina',
        authorRole: 'user',
        createdAt: '2026-03-21T16:25:00',
        message: 'Ya se actualizo la politica y estoy reuniendo la evidencia restante.',
        internal: false,
      },
    ],
    history: [
      {
        id: 'HIS-001',
        title: 'Remediacion creada',
        description: 'Se genero plan correctivo tras cuestionario reprobado.',
        createdAt: '2026-03-20T09:15:00',
        actor: 'Sistema ADMIN',
        tone: 'error',
      },
      {
        id: 'HIS-002',
        title: 'Caso asignado',
        description: 'Laura Mendoza quedo como responsable del seguimiento.',
        createdAt: '2026-03-20T09:30:00',
        actor: 'Roberto Salazar',
        tone: 'brand',
      },
      {
        id: 'HIS-003',
        title: 'Evidencia parcial recibida',
        description: 'El usuario subio una politica dummy para validacion.',
        createdAt: '2026-03-21T16:20:00',
        actor: 'Adrian Molina',
        tone: 'warning',
      },
    ],
  },
  {
    id: 'REM-002',
    title: 'Cerrar rezago documental de cumplimiento',
    clientName: 'Grupo Delta Industrial',
    evaluationName: 'Cumplimiento operativo Q1',
    source: 'Evaluacion reprobada',
    sourceStatus: 'Reprobado',
    assignedUserName: 'Adrian Molina',
    assignedUserEmail: 'adrian@moontest.mx',
    assignedUserArea: 'Sistemas',
    responsibleName: 'Roberto Salazar',
    responsibleRole: 'Administrador de evaluaciones',
    category: 'Cumplimiento',
    failureReason:
      'Se detectaron bloques sin evidencia y respuestas inconsistentes en reactivos regulatorios.',
    riskLevel: 'Alto',
    priority: 'Alta',
    dueDate: '2026-03-25T17:00:00',
    createdAt: '2026-03-19T14:20:00',
    updatedAt: '2026-03-22T07:30:00',
    progress: 80,
    status: 'En revision',
    evidenceRequired: [
      'Matriz dummy de cumplimiento actualizada',
      'Comentario de cierre por responsable funcional',
    ],
    correctiveActions: [
      'Completar matriz de cumplimiento faltante',
      'Validar respuestas del bloque regulatorio',
    ],
    internalCommentsNote:
      'El usuario ya resolvio la mayor parte, pendiente validacion de ADMIN.',
    isCriticalAlert: false,
    requiresValidation: true,
    evidence: [
      {
        id: 'EVD-002',
        name: 'Matriz_cumplimiento_dummy.xlsx',
        uploadedAt: '2026-03-22T07:10:00',
        uploadedBy: 'Adrian Molina',
        status: 'Recibida',
        description: 'Matriz de seguimiento compartida para revision.',
      },
    ],
    comments: [
      {
        id: 'COM-003',
        author: 'Roberto Salazar',
        authorRole: 'admin',
        createdAt: '2026-03-19T14:30:00',
        message: 'Sube la matriz final y agrega comentario de cierre.',
        internal: false,
      },
    ],
    history: [
      {
        id: 'HIS-004',
        title: 'Caso en revision',
        description: 'El usuario marco el caso listo para validar.',
        createdAt: '2026-03-22T07:30:00',
        actor: 'Adrian Molina',
        tone: 'warning',
      },
    ],
  },
  {
    id: 'REM-003',
    title: 'Regularizar accesos temporales de terceros',
    clientName: 'Norte Logistica',
    evaluationName: 'Control de accesos internos',
    source: 'Incumplimiento relevante',
    sourceStatus: 'Incumplimiento',
    assignedUserName: 'Sofia Reyes',
    assignedUserEmail: 'sofia@moontest.mx',
    assignedUserArea: 'Operaciones',
    responsibleName: 'Ernesto Guerra',
    responsibleRole: 'Coordinador operativo',
    category: 'Acceso indebido',
    failureReason:
      'Persisten accesos temporales activos sin revocacion documentada en terceros.',
    riskLevel: 'Alto',
    priority: 'Alta',
    dueDate: '2026-03-18T13:00:00',
    createdAt: '2026-03-15T09:00:00',
    updatedAt: '2026-03-22T06:20:00',
    progress: 60,
    status: 'Vencido',
    evidenceRequired: [
      'Captura dummy de revocacion de acceso',
      'Bitacora de cierre firmada',
    ],
    correctiveActions: [
      'Revocar usuarios temporales',
      'Actualizar bitacora de accesos',
    ],
    internalCommentsNote:
      'Caso vencido con seguimiento semanal abierto por el area de operaciones.',
    isCriticalAlert: true,
    requiresValidation: false,
    evidence: [],
    comments: [
      {
        id: 'COM-004',
        author: 'Ernesto Guerra',
        authorRole: 'admin',
        createdAt: '2026-03-18T09:10:00',
        message: 'Escalar si no se recibe evidencia hoy mismo.',
        internal: true,
      },
    ],
    history: [
      {
        id: 'HIS-005',
        title: 'Fecha compromiso vencida',
        description: 'El caso no fue cerrado dentro del plazo comprometido.',
        createdAt: '2026-03-18T13:00:00',
        actor: 'Sistema ADMIN',
        tone: 'error',
      },
    ],
  },
  {
    id: 'REM-004',
    title: 'Actualizar evidencia de seguridad documental',
    clientName: 'Finanzas Atlas',
    evaluationName: 'Checklist documental / semana 12',
    source: 'Cuestionario reprobado',
    sourceStatus: 'Reprobado',
    assignedUserName: 'Carla Jimenez',
    assignedUserEmail: 'carla@moontest.mx',
    assignedUserArea: 'Legal',
    responsibleName: 'Valeria Soto',
    responsibleRole: 'Compliance manager',
    category: 'Seguridad documental',
    failureReason:
      'La evidencia documental cargada no coincide con la version requerida por el checklist.',
    riskLevel: 'Medio',
    priority: 'Media',
    dueDate: '2026-03-29T18:00:00',
    createdAt: '2026-03-21T08:15:00',
    updatedAt: '2026-03-21T10:00:00',
    progress: 20,
    status: 'Pendiente',
    evidenceRequired: [
      'Documento dummy con control de version',
      'Acuse interno de aprobacion',
    ],
    correctiveActions: [
      'Cargar evidencia correcta',
      'Validar control de versiones con legal',
    ],
    internalCommentsNote:
      'Se mantiene pendiente a la espera de actualizacion de evidencia.',
    isCriticalAlert: false,
    requiresValidation: false,
    evidence: [],
    comments: [],
    history: [
      {
        id: 'HIS-006',
        title: 'Plan creado',
        description: 'Se abrio remediacion por documentacion inconsistente.',
        createdAt: '2026-03-21T08:15:00',
        actor: 'Valeria Soto',
        tone: 'brand',
      },
    ],
  },
  {
    id: 'REM-005',
    title: 'Confirmar remediacion de evaluacion documental',
    clientName: 'Grupo Delta Industrial',
    evaluationName: 'Seguimiento documental Q1',
    source: 'Evaluacion reprobada',
    sourceStatus: 'Reprobado',
    assignedUserName: 'Adrian Molina',
    assignedUserEmail: 'adrian@moontest.mx',
    assignedUserArea: 'Sistemas',
    responsibleName: 'Laura Mendoza',
    responsibleRole: 'Lider de seguridad',
    category: 'Seguridad documental',
    failureReason:
      'Faltaban evidencias de seguimiento y trazabilidad del ultimo lote documental.',
    riskLevel: 'Medio',
    priority: 'Media',
    dueDate: '2026-03-23T18:00:00',
    createdAt: '2026-03-18T11:00:00',
    updatedAt: '2026-03-22T08:00:00',
    progress: 100,
    status: 'Completado',
    evidenceRequired: ['Bitacora dummy firmada', 'Checklist final de cierre'],
    correctiveActions: [
      'Subir bitacora final',
      'Solicitar validacion de ADMIN',
    ],
    internalCommentsNote:
      'Caso completado por el usuario, pendiente cambio a validado si corresponde.',
    isCriticalAlert: false,
    requiresValidation: true,
    evidence: [
      {
        id: 'EVD-003',
        name: 'Checklist_cierre.pdf',
        uploadedAt: '2026-03-22T07:55:00',
        uploadedBy: 'Adrian Molina',
        status: 'Recibida',
        description: 'Checklist dummy entregado por el usuario.',
      },
    ],
    comments: [
      {
        id: 'COM-005',
        author: 'Adrian Molina',
        authorRole: 'user',
        createdAt: '2026-03-22T08:00:00',
        message: 'Accion terminada y lista para validacion.',
        internal: false,
      },
    ],
    history: [
      {
        id: 'HIS-007',
        title: 'Accion completada',
        description: 'El usuario marco la remediacion como completada.',
        createdAt: '2026-03-22T08:00:00',
        actor: 'Adrian Molina',
        tone: 'success',
      },
    ],
  },
  {
    id: 'REM-006',
    title: 'Validacion final de terceros completada',
    clientName: 'Norte Logistica',
    evaluationName: 'Seguimiento de terceros / marzo',
    source: 'Incumplimiento relevante',
    sourceStatus: 'Incumplimiento',
    assignedUserName: 'Sofia Reyes',
    assignedUserEmail: 'sofia@moontest.mx',
    assignedUserArea: 'Operaciones',
    responsibleName: 'Ernesto Guerra',
    responsibleRole: 'Coordinador operativo',
    category: 'Terceros / proveedores',
    failureReason:
      'Se requirio evidencia adicional para cierre de observaciones con proveedor critico.',
    riskLevel: 'Bajo',
    priority: 'Baja',
    dueDate: '2026-03-16T12:00:00',
    createdAt: '2026-03-10T09:00:00',
    updatedAt: '2026-03-16T11:50:00',
    progress: 100,
    status: 'Validado',
    evidenceRequired: ['Acuse dummy del proveedor'],
    correctiveActions: ['Cerrar observacion y validar proveedor'],
    internalCommentsNote: 'Caso cerrado y validado.',
    isCriticalAlert: false,
    requiresValidation: false,
    evidence: [
      {
        id: 'EVD-004',
        name: 'Acuse_proveedor.pdf',
        uploadedAt: '2026-03-15T16:40:00',
        uploadedBy: 'Sofia Reyes',
        status: 'Validada',
        description: 'Acuse dummy del proveedor con cierre final.',
      },
    ],
    comments: [],
    history: [
      {
        id: 'HIS-008',
        title: 'Remediacion validada',
        description: 'ADMIN cerro el caso despues de revisar evidencia.',
        createdAt: '2026-03-16T11:50:00',
        actor: 'Ernesto Guerra',
        tone: 'success',
      },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class RemediationCenterService {
  private readonly casesSubject = new BehaviorSubject<RemediationCase[]>(
    this.readCases(),
  );

  readonly cases$ = this.casesSubject.asObservable();

  listCases(): RemediationCase[] {
    return this.casesSubject.value.map((item) => this.cloneCase(item));
  }

  getCaseById(caseId: string): RemediationCase | undefined {
    const item = this.casesSubject.value.find((entry) => entry.id === caseId);
    return item ? this.cloneCase(item) : undefined;
  }

  updateAdminPlan(caseId: string, update: AdminPlanUpdate): void {
    this.patchCase(caseId, (item) => ({
      ...item,
      ...update,
      requiresValidation:
        update.status === 'En revision' ||
        update.status === 'Completado' ||
        item.requiresValidation,
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: this.buildId('HIS'),
          title: 'Plan actualizado',
          description:
            'ADMIN ajusto prioridad, responsable, fecha compromiso o acciones correctivas.',
          createdAt: new Date().toISOString(),
          actor: 'Roberto Salazar',
          tone: 'brand',
        },
        ...item.history,
      ],
    }));
  }

  updateUserProgress(caseId: string, update: UserProgressUpdate): void {
    this.patchCase(caseId, (item) => ({
      ...item,
      progress: update.progress,
      status: update.status,
      requiresValidation:
        update.status === 'En revision' || update.status === 'Completado',
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: this.buildId('HIS'),
          title: 'Avance actualizado',
          description: `El usuario actualizo el progreso a ${update.progress}% y cambio el estatus a ${update.status}.`,
          createdAt: new Date().toISOString(),
          actor: item.assignedUserName,
          tone: update.status === 'Completado' ? 'success' : 'brand',
        },
        ...item.history,
      ],
    }));
  }

  updateStatus(caseId: string, status: RemediationStatus, actor = 'Roberto Salazar'): void {
    this.patchCase(caseId, (item) => ({
      ...item,
      status,
      requiresValidation: status === 'En revision' || status === 'Completado',
      updatedAt: new Date().toISOString(),
      history: [
        {
          id: this.buildId('HIS'),
          title: `Estatus cambiado a ${status}`,
          description: 'Se actualizo el flujo de seguimiento de la remediacion.',
          createdAt: new Date().toISOString(),
          actor,
          tone:
            status === 'Validado'
              ? 'success'
              : status === 'Vencido'
                ? 'error'
                : 'brand',
        },
        ...item.history,
      ],
    }));
  }

  validateCase(caseId: string): void {
    this.patchCase(caseId, (item) => ({
      ...item,
      status: 'Validado',
      progress: 100,
      requiresValidation: false,
      updatedAt: new Date().toISOString(),
      evidence: item.evidence.map((evidence) => ({
        ...evidence,
        status: 'Validada',
      })),
      history: [
        {
          id: this.buildId('HIS'),
          title: 'Remediacion validada',
          description: 'ADMIN reviso evidencia y autorizo el cierre del caso.',
          createdAt: new Date().toISOString(),
          actor: 'Roberto Salazar',
          tone: 'success',
        },
        ...item.history,
      ],
    }));
  }

  addComment(
    caseId: string,
    payload: {
      author: string;
      authorRole: 'admin' | 'user';
      message: string;
      internal: boolean;
    },
  ): void {
    const message = payload.message.trim();
    if (!message) {
      return;
    }

    this.patchCase(caseId, (item) => ({
      ...item,
      updatedAt: new Date().toISOString(),
      comments: [
        {
          id: this.buildId('COM'),
          author: payload.author,
          authorRole: payload.authorRole,
          createdAt: new Date().toISOString(),
          message,
          internal: payload.internal,
        },
        ...item.comments,
      ],
      history: [
        {
          id: this.buildId('HIS'),
          title: 'Nuevo comentario',
          description:
            payload.authorRole === 'admin'
              ? 'ADMIN agrego comentario de seguimiento al plan.'
              : 'El usuario agrego comentario y actualizacion operativa.',
          createdAt: new Date().toISOString(),
          actor: payload.author,
          tone: 'brand',
        },
        ...item.history,
      ],
    }));
  }

  addEvidence(
    caseId: string,
    payload: { name: string; description: string; uploadedBy: string },
  ): void {
    const name = payload.name.trim();
    if (!name) {
      return;
    }

    this.patchCase(caseId, (item) => ({
      ...item,
      updatedAt: new Date().toISOString(),
      evidence: [
        {
          id: this.buildId('EVD'),
          name,
          uploadedAt: new Date().toISOString(),
          uploadedBy: payload.uploadedBy,
          status: 'Recibida',
          description: payload.description.trim() || 'Evidencia dummy cargada desde el modulo.',
        },
        ...item.evidence,
      ],
      history: [
        {
          id: this.buildId('HIS'),
          title: 'Evidencia recibida',
          description: 'Se agrego un nuevo archivo dummy al caso.',
          createdAt: new Date().toISOString(),
          actor: payload.uploadedBy,
          tone: 'warning',
        },
        ...item.history,
      ],
    }));
  }

  private patchCase(
    caseId: string,
    updater: (item: RemediationCase) => RemediationCase,
  ): void {
    const nextItems = this.casesSubject.value.map((item) =>
      item.id === caseId ? updater(this.cloneCase(item)) : item,
    );
    this.persist(nextItems);
  }

  private persist(items: RemediationCase[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    this.casesSubject.next(items.map((item) => this.cloneCase(item)));
  }

  private readCases(): RemediationCase[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return INITIAL_CASES.map((item) => this.cloneCase(item));
    }

    try {
      const parsed = JSON.parse(raw) as RemediationCase[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => this.cloneCase(item));
      }
    } catch {
      return INITIAL_CASES.map((item) => this.cloneCase(item));
    }

    return INITIAL_CASES.map((item) => this.cloneCase(item));
  }

  private cloneCase(item: RemediationCase): RemediationCase {
    return {
      ...item,
      evidenceRequired: [...item.evidenceRequired],
      correctiveActions: [...item.correctiveActions],
      evidence: item.evidence.map((evidence) => ({ ...evidence })),
      comments: item.comments.map((comment) => ({ ...comment })),
      history: item.history.map((history) => ({ ...history })),
    };
  }

  private buildId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
}
