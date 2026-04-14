import { Cliente, UsuarioCliente } from '../../alta-clientes/alta-clientes.models';
import { Certification, Question, Questionnaire, Section } from '../../../features/evaluaciones/models';
import { EvaluationAssignment } from '../../../features/evaluaciones/services/assignments-storage.service';

type StatusKey = EvaluationAssignment['paymentStatus'];

type RevenueByCurrency = Record<'MXN' | 'USD', number>;

export type DashboardMetric = {
  id: string;
  title: string;
  value: string;
  detail: string;
  iconKey: 'clients' | 'users' | 'certifications' | 'assignments' | 'revenue' | 'pending';
  toneClass: string;
};

export type DashboardHealthCard = {
  id: string;
  label: string;
  value: number | string;
  detail: string;
  iconKey: 'questions' | 'sections' | 'questionnaires' | 'certifications' | 'operation-ok' | 'operation-alert';
  toneClass: string;
};

export type MoonTestDashboardAssignment = EvaluationAssignment & {
  client?: Cliente;
  userCount: number;
};

type TopCertificationRow = {
  id: string;
  name: string;
  assignments: number;
  totals: RevenueByCurrency;
};

type ContentHealthSummary = {
  questions: number;
  readySections: number;
  readyQuestionnaires: number;
  readyCertifications: number;
  isReadyToOperate: boolean;
};

export type MoonTestDashboardSummary = {
  hasAnyData: boolean;
  totalClients: number;
  totalUsers: number;
  totalCertifications: number;
  totalAssignments: number;
  pendingPayments: number;
  metrics: DashboardMetric[];
  latestAssignments: MoonTestDashboardAssignment[];
  topCertifications: Array<{
    id: string;
    name: string;
    assignments: number;
    revenueLabel: string;
  }>;
  healthCards: DashboardHealthCard[];
  statusSeries: Array<{ key: StatusKey; label: string; total: number }>;
  monthlyActivity: Array<{ label: string; total: number }>;
  revenueByCurrency: RevenueByCurrency;
};

const STATUS_ORDER: StatusKey[] = ['PAID', 'WAITING', 'PENDING', 'CANCELED'];

export function getMoonTestDashboardSummary(): MoonTestDashboardSummary {
  const clients = readClients();
  const clientUsersMap = readClientUsersMap();
  const questions = readArray<Question>(['dynEval.questions.v1', 'preguntas']);
  const sections = readArray<Section>(['dynEval.sections.v1', 'secciones']);
  const questionnaires = readArray<Questionnaire>([
    'dynEval.questionnaires.v1',
    'cuestionarios',
  ]);
  const certifications = readArray<Certification>([
    'dynEval.certifications.v1',
    'certificaciones',
  ]);
  const assignments = readAssignments();
  const sectionWeights = readMap(['dynEval.sectionWeights.v1']);
  const questionnaireWeights = readMap(['dynEval.questionnaireWeights.v1']);
  const certificationWeights = readMap(['dynEval.certificationWeights.v1']);

  const clientsById = new Map(clients.map((client) => [String(client.id), client]));
  const userRecords = Object.values(clientUsersMap).flat();
  const normalizedAssignments = assignments
    .map((assignment) => ({
      ...assignment,
      client: clientsById.get(String(assignment.clientId)),
      userCount: assignment.users.length,
    }))
    .sort(
      (left, right) =>
        safeDate(right.createdAt).getTime() - safeDate(left.createdAt).getTime(),
    );

  const health = buildContentHealth(
    clients,
    questions,
    sections,
    questionnaires,
    certifications,
    sectionWeights,
    questionnaireWeights,
    certificationWeights,
  );
  const revenueByCurrency = sumRevenueByCurrency(normalizedAssignments);
  const pendingPayments = normalizedAssignments.filter((assignment) =>
    assignment.paymentStatus === 'PENDING' || assignment.paymentStatus === 'WAITING',
  ).length;
  const topCertifications = buildTopCertifications(normalizedAssignments);
  const totalClients = clients.length;
  const totalUsers = userRecords.length;
  const totalAssignments = normalizedAssignments.length;
  const hasAnyData =
    clients.length > 0 ||
    userRecords.length > 0 ||
    questions.length > 0 ||
    sections.length > 0 ||
    questionnaires.length > 0 ||
    certifications.length > 0 ||
    normalizedAssignments.length > 0;

  return {
    hasAnyData,
    totalClients,
    totalUsers,
    totalCertifications: certifications.length,
    totalAssignments,
    pendingPayments,
    metrics: [
      {
        id: 'clients',
        title: 'Clientes',
        value: formatCompactNumber(totalClients),
        detail: buildDeltaLabel(clients.map((item) => item.createdAt), '30 dias'),
        iconKey: 'clients',
        toneClass:
          'bg-brand-500/10 text-brand-700 ring-brand-500/20 dark:bg-brand-500/15 dark:text-brand-200',
      },
      {
        id: 'users',
        title: 'Usuarios',
        value: formatCompactNumber(totalUsers),
        detail: buildDeltaLabel(userRecords.map((item) => item.createdAt), '30 dias'),
        iconKey: 'users',
        toneClass:
          'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-200',
      },
      {
        id: 'certifications',
        title: 'Certificaciones',
        value: formatCompactNumber(certifications.length),
        detail: `${health.readyCertifications} listas para asignar`,
        iconKey: 'certifications',
        toneClass:
          'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200',
      },
      {
        id: 'assignments',
        title: 'Asignaciones',
        value: formatCompactNumber(totalAssignments),
        detail: buildDeltaLabel(
          normalizedAssignments.map((item) => item.createdAt),
          '30 dias',
        ),
        iconKey: 'assignments',
        toneClass:
          'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:bg-violet-500/15 dark:text-violet-200',
      },
      {
        id: 'revenue',
        title: 'Ingresos esperados',
        value: getRevenueHeadline(revenueByCurrency),
        detail: getRevenueBreakdown(revenueByCurrency),
        iconKey: 'revenue',
        toneClass:
          'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-200',
      },
      {
        id: 'pending',
        title: 'Pagos pendientes',
        value: formatCompactNumber(pendingPayments),
        detail:
          totalAssignments > 0
            ? `${Math.round((pendingPayments / totalAssignments) * 100)}% del total`
            : 'Sin pagos por validar',
        iconKey: 'pending',
        toneClass:
          'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-200',
      },
    ],
    latestAssignments: normalizedAssignments.slice(0, 5),
    topCertifications: topCertifications.map((item) => ({
      id: item.id,
      name: item.name,
      assignments: item.assignments,
      revenueLabel: getRevenueBreakdown(item.totals),
    })),
    healthCards: [
      {
        id: 'questions',
        label: 'Preguntas en banco',
        value: health.questions,
        detail: health.questions > 0 ? 'Inventario disponible' : 'Sin banco cargado',
        iconKey: 'questions',
        toneClass:
          'bg-brand-500/10 text-brand-700 ring-brand-500/20 dark:bg-brand-500/15 dark:text-brand-200',
      },
      {
        id: 'sections',
        label: 'Secciones listas',
        value: health.readySections,
        detail: 'Peso total validado o contenido utilizable',
        iconKey: 'sections',
        toneClass:
          'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-200',
      },
      {
        id: 'questionnaires',
        label: 'Cuestionarios listos',
        value: health.readyQuestionnaires,
        detail: 'Con secciones disponibles para operar',
        iconKey: 'questionnaires',
        toneClass:
          'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200',
      },
      {
        id: 'certifications-ready',
        label: 'Certificaciones listas',
        value: health.readyCertifications,
        detail: 'Configuradas para asignacion comercial',
        iconKey: 'certifications',
        toneClass:
          'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-200',
      },
      {
        id: 'operation',
        label: 'Listo para operar',
        value: health.isReadyToOperate ? 'Si' : 'No',
        detail: health.isReadyToOperate
          ? 'La base minima del sistema esta completa'
          : 'Falta contenido clave para operar sin friccion',
        iconKey: health.isReadyToOperate ? 'operation-ok' : 'operation-alert',
        toneClass: health.isReadyToOperate
          ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200'
          : 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-200',
      },
    ],
    statusSeries: STATUS_ORDER.map((status) => ({
      key: status,
      label: getPaymentStatusLabel(status),
      total: normalizedAssignments.filter((item) => item.paymentStatus === status).length,
    })),
    monthlyActivity: buildMonthlyActivity(normalizedAssignments),
    revenueByCurrency,
  };
}

export function createMoonTestDashboardDemo(): void {
  const demo = buildDemoPayload();

  localStorage.setItem('tenant_clients', JSON.stringify(demo.clients));
  localStorage.setItem('tenant_client_users', JSON.stringify(demo.clientUsers));
  localStorage.setItem('dynEval.questions.v1', JSON.stringify(demo.questions));
  localStorage.setItem('dynEval.sections.v1', JSON.stringify(demo.sections));
  localStorage.setItem('dynEval.questionnaires.v1', JSON.stringify(demo.questionnaires));
  localStorage.setItem('dynEval.certifications.v1', JSON.stringify(demo.certifications));
  localStorage.setItem('evaluaciones.assignments', JSON.stringify(demo.assignments));
  localStorage.setItem('dynEval.sectionWeights.v1', JSON.stringify(demo.sectionWeights));
  localStorage.setItem(
    'dynEval.questionnaireWeights.v1',
    JSON.stringify(demo.questionnaireWeights),
  );
  localStorage.setItem(
    'dynEval.certificationWeights.v1',
    JSON.stringify(demo.certificationWeights),
  );
}

export function getPaymentStatusLabel(status: StatusKey): string {
  if (status === 'WAITING') {
    return 'En validacion';
  }

  if (status === 'PAID') {
    return 'Pagado';
  }

  if (status === 'CANCELED') {
    return 'Cancelado';
  }

  return 'Pendiente';
}

export function getPaymentStatusClass(status: StatusKey): string {
  if (status === 'WAITING') {
    return 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300';
  }

  if (status === 'PAID') {
    return 'border-success-300 bg-success-50 text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300';
  }

  if (status === 'CANCELED') {
    return 'border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300';
  }

  return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300';
}

export function getRevenueHeadline(totals: RevenueByCurrency): string {
  if (totals.MXN > 0 && totals.USD === 0) {
    return formatCurrency(totals.MXN, 'MXN');
  }

  if (totals.USD > 0 && totals.MXN === 0) {
    return formatCurrency(totals.USD, 'USD');
  }

  if (totals.MXN === 0 && totals.USD === 0) {
    return '$0';
  }

  return 'MXN + USD';
}

export function getRevenueBreakdown(totals: RevenueByCurrency): string {
  const parts: string[] = [];

  if (totals.MXN > 0 || (totals.MXN === 0 && totals.USD === 0)) {
    parts.push(`MXN ${formatCurrency(totals.MXN, 'MXN')}`);
  }

  if (totals.USD > 0) {
    parts.push(`USD ${formatCurrency(totals.USD, 'USD')}`);
  }

  return parts.join(' · ');
}

export function getClientImageUrl(client?: Cliente): string | null {
  const imageUrl = client?.photoUrl?.trim();
  return imageUrl ? imageUrl : null;
}

function readClients(): Cliente[] {
  return readArray<Cliente>(['tenant_clients', 'clientes'])
    .filter((client) => typeof client?.id === 'number')
    .sort((left, right) => left.id - right.id);
}

function readClientUsersMap(): Record<number, UsuarioCliente[]> {
  const map = readMap<UsuarioCliente[]>(['tenant_client_users', 'clientes.usuarios']);

  return Object.entries(map).reduce<Record<number, UsuarioCliente[]>>((acc, [key, users]) => {
    const numericKey = Number(key);
    if (!Number.isFinite(numericKey)) {
      return acc;
    }

    acc[numericKey] = Array.isArray(users) ? users : [];
    return acc;
  }, {});
}

function readAssignments(): EvaluationAssignment[] {
  return readArray<EvaluationAssignment>(['evaluaciones.assignments']).map((assignment) => ({
    id: String(assignment.id ?? ''),
    clientId: String(assignment.clientId ?? ''),
    clientName: String(assignment.clientName ?? 'Cliente sin nombre'),
    certificationId: String(assignment.certificationId ?? ''),
    certificationName: String(assignment.certificationName ?? 'Certificacion sin nombre'),
    users: Array.isArray(assignment.users)
      ? assignment.users.map((user) => ({
          userId: String(user.userId ?? ''),
          userName: String(user.userName ?? 'Usuario sin nombre'),
          userArea: String(user.userArea ?? 'Otro'),
          questionnaireId: String(user.questionnaireId ?? ''),
          questionnaireName: String(user.questionnaireName ?? 'Sin cuestionario'),
          questionnaireArea: String(user.questionnaireArea ?? 'Otro'),
        }))
      : [],
    currency: assignment.currency === 'USD' ? 'USD' : 'MXN',
    price: Number.isFinite(Number(assignment.price)) ? Number(assignment.price) : 0,
    paymentStatus: normalizeStatus(assignment.paymentStatus),
    createdAt: String(assignment.createdAt ?? new Date().toISOString()),
    paidAt: assignment.paidAt ? String(assignment.paidAt) : undefined,
  }));
}

function normalizeStatus(value: unknown): StatusKey {
  if (value === 'WAITING' || value === 'PAID' || value === 'CANCELED') {
    return value;
  }

  return 'PENDING';
}

function buildTopCertifications(
  assignments: MoonTestDashboardAssignment[],
): TopCertificationRow[] {
  const rows = new Map<string, TopCertificationRow>();

  assignments.forEach((assignment) => {
    const current =
      rows.get(assignment.certificationId) ??
      {
        id: assignment.certificationId,
        name: assignment.certificationName || 'Certificacion sin nombre',
        assignments: 0,
        totals: { MXN: 0, USD: 0 },
      };

    current.assignments += 1;
    current.totals[assignment.currency] += Number(assignment.price) || 0;
    rows.set(assignment.certificationId, current);
  });

  return Array.from(rows.values())
    .sort((left, right) => {
      if (right.assignments !== left.assignments) {
        return right.assignments - left.assignments;
      }

      return right.totals.MXN + right.totals.USD - (left.totals.MXN + left.totals.USD);
    })
    .slice(0, 5);
}

function buildContentHealth(
  clients: Cliente[],
  questions: Question[],
  sections: Section[],
  questionnaires: Questionnaire[],
  certifications: Certification[],
  sectionWeights: Record<string, unknown>,
  questionnaireWeights: Record<string, unknown>,
  certificationWeights: Record<string, unknown>,
): ContentHealthSummary {
  const readySections = sections.filter((section) =>
    isWeightEntryReady(sectionWeights[section.id], section.questionIds.length > 0),
  ).length;

  const readyQuestionnaires = questionnaires.filter((questionnaire) =>
    isWeightEntryReady(questionnaireWeights[questionnaire.id], questionnaire.sectionIds.length > 0),
  ).length;

  const readyCertifications = certifications.filter((certification) =>
    isWeightEntryReady(
      certificationWeights[certification.id],
      certification.questionnaireIds.length > 0,
    ),
  ).length;

  return {
    questions: questions.length,
    readySections,
    readyQuestionnaires,
    readyCertifications,
    isReadyToOperate:
      clients.length > 0 &&
      questions.length > 0 &&
      readySections > 0 &&
      readyQuestionnaires > 0 &&
      readyCertifications > 0,
  };
}

function isWeightEntryReady(entry: unknown, fallbackReady: boolean): boolean {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return fallbackReady;
  }

  const candidate = entry as { status?: string; isScored?: boolean };
  if (candidate.status === 'READY' || candidate.isScored === false) {
    return true;
  }

  return fallbackReady;
}

function sumRevenueByCurrency(assignments: MoonTestDashboardAssignment[]): RevenueByCurrency {
  return assignments.reduce(
    (acc, assignment) => {
      acc[assignment.currency] += Number(assignment.price) || 0;
      return acc;
    },
    { MXN: 0, USD: 0 },
  );
}

function buildMonthlyActivity(
  assignments: MoonTestDashboardAssignment[],
): Array<{ label: string; total: number }> {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('es-MX', { month: 'short' });
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: formatter.format(date).replace('.', ''),
      total: 0,
    };
  });

  const counts = new Map(buckets.map((item) => [item.key, item.total]));
  assignments.forEach((assignment) => {
    const date = safeDate(assignment.createdAt);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!counts.has(key)) {
      return;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const hasRealData = Array.from(counts.values()).some((value) => value > 0);
  if (!hasRealData && assignments.length > 0) {
    return buckets.map((item, index) => ({
      label: item.label,
      total: [2, 4, 3, 5, 4, 6][index] ?? 0,
    }));
  }

  return buckets.map((item) => ({
    label: item.label,
    total: counts.get(item.key) ?? 0,
  }));
}

function buildDeltaLabel(dates: string[], periodLabel: string): string {
  const now = Date.now();
  const currentWindowStart = now - 30 * 24 * 60 * 60 * 1000;
  const previousWindowStart = now - 60 * 24 * 60 * 60 * 1000;

  const current = dates.filter((value) => {
    const timestamp = safeDate(value).getTime();
    return timestamp >= currentWindowStart && timestamp <= now;
  }).length;
  const previous = dates.filter((value) => {
    const timestamp = safeDate(value).getTime();
    return timestamp >= previousWindowStart && timestamp < currentWindowStart;
  }).length;
  const delta = current - previous;

  if (delta > 0) {
    return `+${delta} vs ${periodLabel} previos`;
  }

  if (delta < 0) {
    return `${delta} vs ${periodLabel} previos`;
  }

  return current > 0 ? 'Sin variacion reciente' : 'Sin movimiento reciente';
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCurrency(value: number, currency: 'MXN' | 'USD'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function safeDate(value: string | undefined): Date {
  const parsed = value ? new Date(value) : new Date('');
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function readArray<T>(keys: string[]): T[] {
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
    } catch {
      continue;
    }
  }

  return [];
}

function readMap<T>(keys: string[]): Record<string, T> {
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, T>;
      }
    } catch {
      continue;
    }
  }

  return {};
}

function buildDemoPayload() {
  const now = new Date();
  const iso = (monthOffset: number, day: number) =>
    new Date(now.getFullYear(), now.getMonth() + monthOffset, day).toISOString();

  const clients: Cliente[] = [
    {
      id: 1,
      photoUrl: '/images/user/user-01.jpg',
      tipoCliente: 'MORAL',
      nombreCliente: 'Moon Logistics',
      sector: 'Transporte',
      rfc: 'MLO240201AB1',
      contactoNombre: 'Valeria Soto',
      correoPrincipal: 'valeria.soto@moonlogistics.mx',
      estatus: 'Activo',
      telefono: '5551234567',
      notas: 'Cuenta enterprise para operaciones regionales.',
      razonSocialFiscal: 'Moon Logistics SA de CV',
      nombreFiscal: '',
      regimenFiscal: '601 - General de Ley Personas Morales',
      cpFiscal: '64000',
      domicilioFiscal: {
        calle: 'Av. Universidad',
        numeroExt: '480',
        numeroInt: '12',
        colonia: 'Del Valle',
        municipio: 'Monterrey',
        estado: 'Nuevo Leon',
        pais: 'Mexico',
      },
      correoFacturacion: 'facturacion@moonlogistics.mx',
      createdAt: iso(-5, 2),
      updatedAt: iso(-1, 18),
    },
    {
      id: 2,
      photoUrl: '/images/user/user-02.jpg',
      tipoCliente: 'MORAL',
      nombreCliente: 'Grupo Clinico Horizonte',
      sector: 'Salud',
      rfc: 'GCH230815KD2',
      contactoNombre: 'Ana Luisa Rivera',
      correoPrincipal: 'ana.rivera@horizonte.mx',
      estatus: 'Activo',
      telefono: '2221113344',
      notas: 'Programa activo de certificaciones regulatorias.',
      razonSocialFiscal: 'Grupo Clinico Horizonte SA de CV',
      nombreFiscal: '',
      regimenFiscal: '601 - General de Ley Personas Morales',
      cpFiscal: '72160',
      domicilioFiscal: {
        calle: '14 Sur',
        numeroExt: '701',
        numeroInt: '3B',
        colonia: 'La Paz',
        municipio: 'Puebla',
        estado: 'Puebla',
        pais: 'Mexico',
      },
      correoFacturacion: 'facturas@horizonte.mx',
      createdAt: iso(-3, 10),
      updatedAt: iso(0, 3),
    },
    {
      id: 3,
      tipoCliente: 'FISICA',
      nombreCliente: 'Altura Industrial',
      sector: 'Infraestructura',
      rfc: 'AINA890101L9A',
      contactoNombre: 'Miguel Nava',
      correoPrincipal: 'miguel.nava@alturaindustrial.mx',
      estatus: 'Pendiente',
      telefono: '5587654321',
      notas: 'En proceso de cierre comercial.',
      razonSocialFiscal: '',
      nombreFiscal: 'Miguel Nava Alvarez',
      regimenFiscal: '612 - Personas Fisicas con Actividades Empresariales y Profesionales',
      cpFiscal: '03100',
      domicilioFiscal: {
        calle: 'Gabriel Mancera',
        numeroExt: '224',
        numeroInt: '',
        colonia: 'Del Valle',
        municipio: 'Benito Juarez',
        estado: 'Ciudad de Mexico',
        pais: 'Mexico',
      },
      correoFacturacion: 'contabilidad@alturaindustrial.mx',
      createdAt: iso(-1, 22),
      updatedAt: iso(-1, 28),
    },
  ];

  const clientUsers: Record<number, UsuarioCliente[]> = {
    1: [
      {
        id: 1,
        clientId: 1,
        nombres: 'Daniel',
        apellidos: 'Lopez',
        email: 'daniel.lopez@moonlogistics.mx',
        telefono: '5551112233',
        area: 'Operaciones',
        estatus: 'Activo',
        createdAt: iso(-5, 5),
        updatedAt: iso(-1, 7),
      },
      {
        id: 2,
        clientId: 1,
        nombres: 'Paola',
        apellidos: 'Gutierrez',
        email: 'paola.gutierrez@moonlogistics.mx',
        telefono: '5552223344',
        area: 'Sistemas',
        estatus: 'Activo',
        createdAt: iso(-2, 12),
        updatedAt: iso(0, 2),
      },
    ],
    2: [
      {
        id: 1,
        clientId: 2,
        nombres: 'Lucia',
        apellidos: 'Perez',
        email: 'lucia.perez@horizonte.mx',
        telefono: '2229876543',
        area: 'RH',
        estatus: 'Activo',
        createdAt: iso(-3, 11),
        updatedAt: iso(-1, 15),
      },
      {
        id: 2,
        clientId: 2,
        nombres: 'Oscar',
        apellidos: 'Martinez',
        email: 'oscar.martinez@horizonte.mx',
        telefono: '2226781234',
        area: 'Legal',
        estatus: 'Bloqueado',
        createdAt: iso(-1, 4),
        updatedAt: iso(-1, 12),
      },
    ],
    3: [
      {
        id: 1,
        clientId: 3,
        nombres: 'Miguel',
        apellidos: 'Nava',
        email: 'miguel.nava@alturaindustrial.mx',
        telefono: '5587654321',
        area: 'Operaciones',
        estatus: 'Activo',
        createdAt: iso(-1, 24),
        updatedAt: iso(-1, 24),
      },
    ],
  };

  const questions: Question[] = Array.from({ length: 12 }, (_, index) => ({
    id: `q_dashboard_${index + 1}`,
    titulo: `Pregunta operativa ${index + 1}`,
    tipo: index % 3 === 0 ? 'MULTIPLE' : index % 3 === 1 ? 'TEXT' : 'LIKERT',
    obligatoria: true,
    ayuda: 'Contenido demo para visualizar el dashboard.',
    createdAt: iso(-5 + Math.min(index, 5), 3 + index),
    config:
      index % 3 === 0
        ? {
            opciones: [
              { id: `opt_${index}_1`, texto: 'Opcion A' },
              { id: `opt_${index}_2`, texto: 'Opcion B' },
            ],
            multiple: false,
          }
        : index % 3 === 1
          ? {
              minLength: 20,
              maxLength: 240,
              placeholder: 'Respuesta abierta',
            }
          : {
              levels: ['Bajo', 'Medio', 'Alto', 'Critico'],
            },
  }));

  const sections: Section[] = [
    {
      id: 'section_safety',
      nombre: 'Seguridad Operativa',
      descripcion: 'Bloque base de cumplimiento.',
      questionIds: ['q_dashboard_1', 'q_dashboard_2', 'q_dashboard_3', 'q_dashboard_4'],
    },
    {
      id: 'section_quality',
      nombre: 'Calidad',
      descripcion: 'Control y trazabilidad.',
      questionIds: ['q_dashboard_5', 'q_dashboard_6', 'q_dashboard_7', 'q_dashboard_8'],
    },
    {
      id: 'section_service',
      nombre: 'Servicio',
      descripcion: 'Medicion de experiencia.',
      questionIds: ['q_dashboard_9', 'q_dashboard_10', 'q_dashboard_11', 'q_dashboard_12'],
    },
  ];

  const questionnaires: Questionnaire[] = [
    {
      id: 'questionnaire_ops',
      nombre: 'Ingreso a operacion',
      descripcion: 'Validacion para personal nuevo.',
      area: 'Operaciones',
      sectionIds: ['section_safety', 'section_quality'],
      settings: {
        timeLimitMinutes: 25,
        maxAttempts: 2,
      },
    },
    {
      id: 'questionnaire_supervisor',
      nombre: 'Supervisor multisector',
      descripcion: 'Control de cumplimiento por lider.',
      area: 'Sistemas',
      sectionIds: ['section_safety', 'section_service'],
      settings: {
        timeLimitMinutes: 35,
        maxAttempts: 2,
      },
    },
    {
      id: 'questionnaire_customer',
      nombre: 'Experiencia de servicio',
      descripcion: 'Encuesta de percepcion operativa.',
      area: 'RH',
      sectionIds: ['section_service'],
      settings: {
        timeLimitMinutes: 15,
        maxAttempts: 1,
      },
    },
  ];

  const certifications: Certification[] = [
    {
      id: 'cert_ops',
      nombre: 'Certificacion Operador Seguro',
      descripcion: 'Requisito base para acceso operativo.',
      questionnaireIds: ['questionnaire_ops'],
      rules: {
        requireAll: true,
        minScore: 80,
      },
    },
    {
      id: 'cert_supervisor',
      nombre: 'Certificacion Lider de Campo',
      descripcion: 'Ruta para coordinadores y supervisores.',
      questionnaireIds: ['questionnaire_ops', 'questionnaire_supervisor'],
      rules: {
        requireAll: true,
        minScore: 85,
      },
    },
    {
      id: 'cert_service',
      nombre: 'Certificacion Calidad de Servicio',
      descripcion: 'Programa orientado a atencion y experiencia.',
      questionnaireIds: ['questionnaire_customer'],
      rules: {
        requireAll: false,
        minScore: 75,
      },
    },
  ];

  const assignments: EvaluationAssignment[] = [
    {
      id: 'assignment_demo_1',
      clientId: '1',
      clientName: 'Moon Logistics',
      certificationId: 'cert_ops',
      certificationName: 'Certificacion Operador Seguro',
      users: [
        {
          userId: '1',
          userName: 'Daniel Lopez',
          userArea: 'Operaciones',
          questionnaireId: 'questionnaire_ops',
          questionnaireName: 'Ingreso a operacion',
          questionnaireArea: 'Operaciones',
        },
        {
          userId: '2',
          userName: 'Paola Gutierrez',
          userArea: 'Sistemas',
          questionnaireId: 'questionnaire_ops',
          questionnaireName: 'Ingreso a operacion',
          questionnaireArea: 'Operaciones',
        },
      ],
      currency: 'MXN',
      price: 18500,
      paymentStatus: 'PAID',
      createdAt: iso(-5, 8),
      paidAt: iso(-5, 15),
    },
    {
      id: 'assignment_demo_2',
      clientId: '2',
      clientName: 'Grupo Clinico Horizonte',
      certificationId: 'cert_supervisor',
      certificationName: 'Certificacion Lider de Campo',
      users: [
        {
          userId: '1',
          userName: 'Lucia Perez',
          userArea: 'RH',
          questionnaireId: 'questionnaire_customer',
          questionnaireName: 'Experiencia de servicio',
          questionnaireArea: 'RH',
        },
        {
          userId: '2',
          userName: 'Oscar Martinez',
          userArea: 'Legal',
          questionnaireId: 'questionnaire_supervisor',
          questionnaireName: 'Supervisor multisector',
          questionnaireArea: 'Sistemas',
        },
      ],
      currency: 'USD',
      price: 2400,
      paymentStatus: 'WAITING',
      createdAt: iso(-3, 12),
    },
    {
      id: 'assignment_demo_3',
      clientId: '1',
      clientName: 'Moon Logistics',
      certificationId: 'cert_service',
      certificationName: 'Certificacion Calidad de Servicio',
      users: [
        {
          userId: '1',
          userName: 'Daniel Lopez',
          userArea: 'Operaciones',
          questionnaireId: 'questionnaire_customer',
          questionnaireName: 'Experiencia de servicio',
          questionnaireArea: 'RH',
        },
      ],
      currency: 'MXN',
      price: 9200,
      paymentStatus: 'PENDING',
      createdAt: iso(-2, 6),
    },
    {
      id: 'assignment_demo_4',
      clientId: '3',
      clientName: 'Altura Industrial',
      certificationId: 'cert_ops',
      certificationName: 'Certificacion Operador Seguro',
      users: [
        {
          userId: '1',
          userName: 'Miguel Nava',
          userArea: 'Operaciones',
          questionnaireId: 'questionnaire_ops',
          questionnaireName: 'Ingreso a operacion',
          questionnaireArea: 'Operaciones',
        },
      ],
      currency: 'MXN',
      price: 11200,
      paymentStatus: 'CANCELED',
      createdAt: iso(-1, 19),
    },
    {
      id: 'assignment_demo_5',
      clientId: '2',
      clientName: 'Grupo Clinico Horizonte',
      certificationId: 'cert_supervisor',
      certificationName: 'Certificacion Lider de Campo',
      users: [
        {
          userId: '1',
          userName: 'Lucia Perez',
          userArea: 'RH',
          questionnaireId: 'questionnaire_customer',
          questionnaireName: 'Experiencia de servicio',
          questionnaireArea: 'RH',
        },
      ],
      currency: 'USD',
      price: 3100,
      paymentStatus: 'PAID',
      createdAt: iso(0, 2),
      paidAt: iso(0, 5),
    },
    {
      id: 'assignment_demo_6',
      clientId: '1',
      clientName: 'Moon Logistics',
      certificationId: 'cert_ops',
      certificationName: 'Certificacion Operador Seguro',
      users: [
        {
          userId: '2',
          userName: 'Paola Gutierrez',
          userArea: 'Sistemas',
          questionnaireId: 'questionnaire_supervisor',
          questionnaireName: 'Supervisor multisector',
          questionnaireArea: 'Sistemas',
        },
      ],
      currency: 'MXN',
      price: 13400,
      paymentStatus: 'WAITING',
      createdAt: iso(0, 9),
    },
  ];

  return {
    clients,
    clientUsers,
    questions,
    sections,
    questionnaires,
    certifications,
    assignments,
    sectionWeights: {
      section_safety: {
        isScored: true,
        status: 'READY',
      },
      section_quality: {
        isScored: true,
        status: 'READY',
      },
      section_service: {
        isScored: false,
        status: 'READY',
      },
    },
    questionnaireWeights: {
      questionnaire_ops: {
        isScored: true,
        status: 'READY',
      },
      questionnaire_supervisor: {
        isScored: true,
        status: 'READY',
      },
      questionnaire_customer: {
        isScored: false,
        status: 'READY',
      },
    },
    certificationWeights: {
      cert_ops: {
        isScored: true,
        status: 'READY',
      },
      cert_supervisor: {
        isScored: true,
        status: 'READY',
      },
      cert_service: {
        isScored: false,
        status: 'READY',
      },
    },
  };
}
