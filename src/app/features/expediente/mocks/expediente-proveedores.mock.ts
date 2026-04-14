import {
  ExpedienteProviderDetail,
  ExpedienteProviderFiscalData,
  ExpedienteProviderPerson,
  ExpedienteProviderTemplate,
  ExpedienteTemplateCustomField,
} from '../interfaces/expediente-proveedores.interface';
import {
  buildDocumentSummaryFromStatus,
  createDefaultTemplateBaseFields,
  getDocumentCompletionPercent,
  getRequestedTemplateDocuments,
} from '../utils/expediente-template.utils';

type ExpedienteProviderSeed = Omit<
  ExpedienteProviderDetail,
  'observations' | 'logoUrl' | 'fiscalData' | 'people' | 'template'
> & {
  people: ProviderSeedPerson[];
  template: ProviderSeedTemplate;
};

type ProviderSeedPerson = Omit<
  ExpedienteProviderPerson,
  | 'email'
  | 'phone'
  | 'documentSummary'
  | 'complianceSummary'
  | 'lastLinkSentAt'
  | 'reviewState'
  | 'submittedAt'
>;

type ProviderSeedTemplate = Pick<
  ExpedienteProviderTemplate,
  'name' | 'version' | 'assignedBy' | 'updatedAt'
> & {
  customFields: ExpedienteTemplateCustomField[];
};

const PROVIDER_FISCAL_DATA: Record<string, ExpedienteProviderFiscalData> = {
  'atlas-seguridad-integral': {
    rfc: 'ASI190412QX7',
    taxRegime: 'General de Ley Personas Morales',
    taxAddress: 'Av. Industria Segura 140, Parque Empresarial Norte',
    postalCode: '66215',
    city: 'San Pedro Garza Garcia',
    state: 'Nuevo Leon',
    country: 'Mexico',
    fiscalClassification: 'Servicios especializados con cumplimiento patronal',
  },
  'gapsa-logistica-operativa': {
    rfc: 'GLO180921PZ4',
    taxRegime: 'General de Ley Personas Morales',
    taxAddress: 'Carretera a Colombia Km 12, Bodega 8',
    postalCode: '66052',
    city: 'Escobedo',
    state: 'Nuevo Leon',
    country: 'Mexico',
    fiscalClassification: 'Prestacion de servicios logisticos y maniobras',
  },
  'nordel-servicios-industriales': {
    rfc: 'NSI170605MB2',
    taxRegime: 'General de Ley Personas Morales',
    taxAddress: 'Blvd. Metalurgia 280, Zona Industrial Oriente',
    postalCode: '44490',
    city: 'Guadalajara',
    state: 'Jalisco',
    country: 'Mexico',
    fiscalClassification: 'Servicios tecnicos e industriales especializados',
  },
  'futura-construcciones-corporativas': {
    rfc: 'FCC160728TR6',
    taxRegime: 'General de Ley Personas Morales',
    taxAddress: 'Av. Constructoras 884, Torre Obra',
    postalCode: '03230',
    city: 'Benito Juarez',
    state: 'Ciudad de Mexico',
    country: 'Mexico',
    fiscalClassification: 'Contratista de obra civil y servicios de campo',
  },
  'bioflex-servicios-ambientales': {
    rfc: 'BSA200311AL5',
    taxRegime: 'General de Ley Personas Morales',
    taxAddress: 'Calle Bosque Tecnico 54, Piso 2',
    postalCode: '72160',
    city: 'Puebla',
    state: 'Puebla',
    country: 'Mexico',
    fiscalClassification: 'Servicios ambientales y monitoreo especializado',
  },
  'orbita-automatizacion-industrial': {
    rfc: 'OAI181114KC9',
    taxRegime: 'General de Ley Personas Morales',
    taxAddress: 'Parque de Control 96, Nave 4',
    postalCode: '66600',
    city: 'Apodaca',
    state: 'Nuevo Leon',
    country: 'Mexico',
    fiscalClassification: 'Ingenieria de automatizacion y control industrial',
  },
};

const PROVIDER_OBSERVATIONS: Record<string, string> = {
  'atlas-seguridad-integral':
    'Seguimiento puntual a constancias medicas y credenciales de acceso para personal de cobertura nocturna.',
  'gapsa-logistica-operativa':
    'Mantener ventana semanal de validacion para licencias, examenes medicos y renovacion de accesos vehiculares.',
  'nordel-servicios-industriales':
    'Proveedor estable con foco preventivo en recertificaciones tecnicas del equipo de especialidades.',
  'futura-construcciones-corporativas':
    'Operacion prioritaria con observaciones abiertas en alturas, aptos medicos y control de accesos de frente.',
  'bioflex-servicios-ambientales':
    'Seguimiento ligero a certificados de calibracion para no comprometer la siguiente revision trimestral.',
  'orbita-automatizacion-industrial':
    'Concentrar validacion en perfiles de programacion, permisos energizados y evidencias de acceso tecnico.',
};

const buildPersonPhone = (providerIndex: number, personIndex: number): string => {
  const areaCode = providerIndex % 2 === 0 ? '55' : '81';
  const middleBlock = `${42 + providerIndex}${personIndex + 3}`.padStart(4, '0');
  const endBlock = `${88 + providerIndex}${10 + personIndex}`.padStart(4, '0');
  return `${areaCode} ${middleBlock} ${endBlock}`;
};

const buildPersonEmail = (name: string, contactEmail: string): string => {
  const domain = contactEmail.split('@')[1] ?? 'certum360.mx';
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join('.');

  return `${slug || 'persona'}.${domain}`;
};

const buildComplianceSummary = (
  status: ProviderSeedPerson['recordStatus'],
  role: string,
): string => {
  switch (status) {
    case 'Vigente':
      return `Expediente estable para ${role.toLowerCase()} con carga documental completa.`;
    case 'En revision':
      return `Registro en validacion documental para ${role.toLowerCase()} con seguimiento abierto.`;
    case 'Por vencer':
      return `Perfil de ${role.toLowerCase()} con documentos proximos a renovar.`;
    case 'Observado':
    default:
      return `Se mantiene revision puntual en el expediente de ${role.toLowerCase()} por observaciones activas.`;
  }
};

const buildReviewState = (
  status: ProviderSeedPerson['recordStatus'],
): ExpedienteProviderPerson['reviewState'] => {
  switch (status) {
    case 'Vigente':
      return 'Aprobado';
    case 'En revision':
      return 'En revision';
    case 'Por vencer':
      return 'Pendiente';
    case 'Observado':
    default:
      return 'Observado';
  }
};

const buildSubmittedAt = (lastUpdate: string, personIndex: number): string => {
  const submittedDate = new Date(lastUpdate);
  submittedDate.setDate(submittedDate.getDate() - (personIndex + 2));
  submittedDate.setHours(9 + personIndex, 15, 0, 0);
  return submittedDate.toISOString();
};

const buildTemplate = (
  template: ProviderSeedTemplate,
): ExpedienteProviderTemplate => ({
  name: template.name,
  version: template.version,
  assignedBy: template.assignedBy,
  updatedAt: template.updatedAt,
  baseFields: createDefaultTemplateBaseFields(),
  customFields: structuredClone(template.customFields),
});

const withProviderPresentationData = (
  provider: ExpedienteProviderSeed,
  providerIndex: number,
): ExpedienteProviderDetail => {
  const template = buildTemplate(provider.template);
  const requestedDocuments = getRequestedTemplateDocuments(template).length;

  return {
    ...provider,
    people: provider.people.map((person, personIndex) => {
      const documentSummary = buildDocumentSummaryFromStatus(
        requestedDocuments,
        person.recordStatus,
      );

      return {
        ...person,
        email: buildPersonEmail(person.name, provider.contactEmail),
        phone: buildPersonPhone(providerIndex, personIndex),
        reviewState: buildReviewState(person.recordStatus),
        submittedAt: buildSubmittedAt(person.lastUpdate, personIndex),
        documentSummary,
        complianceSummary: buildComplianceSummary(person.recordStatus, person.role),
        lastLinkSentAt: person.recordStatus === 'Vigente' ? provider.updatedAt : null,
      };
    }),
    template,
    observations: PROVIDER_OBSERVATIONS[provider.id] ?? '',
    logoUrl: null,
    fiscalData: PROVIDER_FISCAL_DATA[provider.id] ?? {
      rfc: '',
      taxRegime: '',
      taxAddress: '',
      postalCode: '',
      city: '',
      state: '',
      country: 'Mexico',
      fiscalClassification: '',
    },
    compliancePercent:
      provider.people.length > 0
        ? Math.round(
            provider.people.reduce((accumulator, person) => {
              const summary = buildDocumentSummaryFromStatus(
                requestedDocuments,
                person.recordStatus,
              );

              return accumulator + getDocumentCompletionPercent(summary);
            }, 0) / provider.people.length,
          )
        : provider.compliancePercent,
  };
};

const BASE_EXPEDIENTE_PROVIDERS: ExpedienteProviderSeed[] = [
  {
    id: 'atlas-seguridad-integral',
    name: 'Atlas Seguridad Integral',
    businessName: 'Atlas Seguridad Integral S.A. de C.V.',
    serviceType: 'Seguridad industrial',
    contactName: 'Andrea Salgado',
    contactEmail: 'andrea.salgado@atlasseguridad.com',
    contactPhone: '55 4123 8801',
    status: 'Activo',
    complianceStatus: 'Al corriente',
    reviewStatus: 'Revision semanal',
    registeredPeople: 48,
    activeRecords: 42,
    pendingItems: 3,
    expiringDocuments: 4,
    compliancePercent: 94,
    updatedAt: '2026-04-08T17:40:00',
    nextReviewAt: '2026-04-12T09:00:00',
    executiveSummary:
      'Proveedor con operacion estable y cumplimiento documental alto. Mantiene seguimiento puntual en credenciales operativas y constancias medicas por vigencia corta.',
    people: [
      { id: 'atlas-p1', name: 'Laura Mena', role: 'Supervisora HSE', recordStatus: 'Vigente', validUntil: '2026-08-18', lastUpdate: '2026-04-08T10:20:00' },
      { id: 'atlas-p2', name: 'Carlos Ureta', role: 'Coordinador de sitio', recordStatus: 'Por vencer', validUntil: '2026-04-15', lastUpdate: '2026-04-07T16:10:00' },
      { id: 'atlas-p3', name: 'Diana Rojas', role: 'Tecnica de seguridad', recordStatus: 'En revision', validUntil: '2026-07-02', lastUpdate: '2026-04-08T08:50:00' },
      { id: 'atlas-p4', name: 'Manuel Tovar', role: 'Auditor operativo', recordStatus: 'Vigente', validUntil: '2026-09-11', lastUpdate: '2026-04-06T11:30:00' },
    ],
    template: {
      name: 'Plantilla Seguridad Multisitio',
      version: 'v3.2',
      assignedBy: 'Mesa documental corporativa',
      updatedAt: '2026-03-28T14:10:00',
      customFields: [
        {
          id: 'atlas-custom-1',
          label: 'Numero de gafete',
          type: 'TEXT',
          required: true,
          description: 'Identificador interno para control de acceso del personal.',
          placeholder: 'Ej. ASI-204',
        },
        {
          id: 'atlas-custom-2',
          label: 'Zona operativa',
          type: 'SELECT',
          required: true,
          description: 'Frente o zona donde prestara servicio la persona.',
          options: ['Patio norte', 'Acceso principal', 'Bodega central', 'Area administrativa'],
        },
        {
          id: 'atlas-custom-3',
          label: 'Constancia DC-3 vigente',
          type: 'FILE',
          required: true,
          description: 'Evidencia adicional para personal con funciones de seguridad industrial.',
        },
      ],
    },
    repositoryCategories: [
      { id: 'atlas-c1', name: 'Laboral', totalDocuments: 64, currentDocuments: 60, pendingDocuments: 4, lastMovementAt: '2026-04-08T17:40:00', health: 'Estable' },
      { id: 'atlas-c2', name: 'Seguridad industrial', totalDocuments: 38, currentDocuments: 35, pendingDocuments: 3, lastMovementAt: '2026-04-08T12:15:00', health: 'Seguimiento' },
      { id: 'atlas-c3', name: 'Accesos', totalDocuments: 19, currentDocuments: 17, pendingDocuments: 2, lastMovementAt: '2026-04-07T15:05:00', health: 'Seguimiento' },
    ],
    latestDocuments: [
      { id: 'atlas-d1', name: 'Constancia de capacitacion DC-3', category: 'Seguridad industrial', owner: 'Diana Rojas', updatedAt: '2026-04-08T12:15:00', status: 'Vigente' },
      { id: 'atlas-d2', name: 'Examen medico ocupacional', category: 'Laboral', owner: 'Carlos Ureta', updatedAt: '2026-04-07T16:10:00', status: 'Por vencer' },
      { id: 'atlas-d3', name: 'Credencial de acceso a planta', category: 'Accesos', owner: 'Laura Mena', updatedAt: '2026-04-06T14:20:00', status: 'Vigente' },
    ],
    history: [
      { id: 'atlas-h1', title: 'Revision semanal cerrada', description: 'Se confirmo continuidad operativa con 42 expedientes vigentes y tres observaciones menores.', timestamp: '2026-04-08T17:40:00', type: 'revision' },
      { id: 'atlas-h2', title: 'Actualizacion documental recibida', description: 'Se integraron constancias DC-3 correspondientes al equipo de supervision.', timestamp: '2026-04-08T12:15:00', type: 'documento' },
      { id: 'atlas-h3', title: 'Ajuste en plantilla asignada', description: 'Se agrego evidencia obligatoria de acceso para personal de vigilancia.', timestamp: '2026-03-28T14:10:00', type: 'plantilla' },
      { id: 'atlas-h4', title: 'Alta de personal operativo', description: 'Se registraron cuatro personas nuevas para cobertura del turno nocturno.', timestamp: '2026-03-25T09:30:00', type: 'alta' },
    ],
  },
  {
    id: 'gapsa-logistica-operativa',
    name: 'Grupo Gapsa',
    businessName: 'Gapsa Logistica Operativa S. de R.L. de C.V.',
    serviceType: 'Logistica y maniobras',
    contactName: 'Rafael Ortega',
    contactEmail: 'rortega@gapsalogistica.mx',
    contactPhone: '81 2281 4410',
    status: 'En revision',
    complianceStatus: 'En seguimiento',
    reviewStatus: 'Documentos por vencer',
    registeredPeople: 62,
    activeRecords: 51,
    pendingItems: 7,
    expiringDocuments: 9,
    compliancePercent: 86,
    updatedAt: '2026-04-09T08:25:00',
    nextReviewAt: '2026-04-11T10:30:00',
    executiveSummary:
      'Mantiene carga documental robusta, pero el volumen operativo exige seguimiento continuo en licencias de montacargas y aptos medicos del personal de patio.',
    people: [
      { id: 'gapsa-p1', name: 'Emilio Garza', role: 'Jefe de maniobras', recordStatus: 'Vigente', validUntil: '2026-10-03', lastUpdate: '2026-04-08T18:05:00' },
      { id: 'gapsa-p2', name: 'Paola Ibarra', role: 'Supervisora de patio', recordStatus: 'En revision', validUntil: '2026-06-25', lastUpdate: '2026-04-09T08:25:00' },
      { id: 'gapsa-p3', name: 'Jorge Villarreal', role: 'Operador de montacargas', recordStatus: 'Por vencer', validUntil: '2026-04-19', lastUpdate: '2026-04-08T13:40:00' },
      { id: 'gapsa-p4', name: 'Susana Cantu', role: 'Control de accesos', recordStatus: 'Vigente', validUntil: '2026-07-30', lastUpdate: '2026-04-04T09:15:00' },
    ],
    template: {
      name: 'Plantilla Logistica Operativa',
      version: 'v2.8',
      assignedBy: 'Coordinacion de expediente',
      updatedAt: '2026-03-30T11:00:00',
      customFields: [
        {
          id: 'gapsa-custom-1',
          label: 'Numero de empleado',
          type: 'NUMBER',
          required: true,
          description: 'Clave interna para control operativo y asignaciones.',
          placeholder: 'Ej. 1064',
        },
        {
          id: 'gapsa-custom-2',
          label: 'Turno asignado',
          type: 'SELECT',
          required: true,
          description: 'Horario operativo asociado a la persona.',
          options: ['Matutino', 'Vespertino', 'Nocturno'],
        },
        {
          id: 'gapsa-custom-3',
          label: 'Licencia de operador vigente',
          type: 'FILE',
          required: true,
          description: 'Documento extra para maniobras y equipo movil.',
        },
      ],
    },
    repositoryCategories: [
      { id: 'gapsa-c1', name: 'Operadores', totalDocuments: 88, currentDocuments: 74, pendingDocuments: 14, lastMovementAt: '2026-04-09T08:25:00', health: 'Seguimiento' },
      { id: 'gapsa-c2', name: 'Salud ocupacional', totalDocuments: 33, currentDocuments: 28, pendingDocuments: 5, lastMovementAt: '2026-04-08T13:40:00', health: 'Seguimiento' },
      { id: 'gapsa-c3', name: 'Accesos y unidades', totalDocuments: 29, currentDocuments: 24, pendingDocuments: 5, lastMovementAt: '2026-04-07T17:55:00', health: 'Prioritario' },
    ],
    latestDocuments: [
      { id: 'gapsa-d1', name: 'Licencia de operador', category: 'Licencias y permisos', owner: 'Jorge Villarreal', updatedAt: '2026-04-08T13:40:00', status: 'Por vencer' },
      { id: 'gapsa-d2', name: 'Examen toxicologico', category: 'Salud ocupacional', owner: 'Paola Ibarra', updatedAt: '2026-04-08T11:10:00', status: 'En revision' },
      { id: 'gapsa-d3', name: 'Permiso de ingreso vehicular', category: 'Accesos y unidades', owner: 'Emilio Garza', updatedAt: '2026-04-07T17:55:00', status: 'Vigente' },
    ],
    history: [
      { id: 'gapsa-h1', title: 'Corte prioritario abierto', description: 'Se detectaron nueve documentos con vigencia corta y se programo revision express.', timestamp: '2026-04-09T08:25:00', type: 'revision' },
      { id: 'gapsa-h2', title: 'Reemplazo de evidencia medica', description: 'Se recibio nueva carga para el bloque de salud ocupacional del personal de patio.', timestamp: '2026-04-08T11:10:00', type: 'documento' },
      { id: 'gapsa-h3', title: 'Alta de cuadrilla nocturna', description: 'Se incorporaron seis personas al padron operativo del cliente principal.', timestamp: '2026-04-04T12:20:00', type: 'alta' },
      { id: 'gapsa-h4', title: 'Plantilla ajustada por maniobras', description: 'Se agrego requisito de licencia vigente para todos los operadores de equipo.', timestamp: '2026-03-30T11:00:00', type: 'plantilla' },
    ],
  },
  {
    id: 'nordel-servicios-industriales',
    name: 'Nordel Servicios',
    businessName: 'Nordel Servicios Industriales S.A.P.I. de C.V.',
    serviceType: 'Mantenimiento industrial',
    contactName: 'Marcela Cuevas',
    contactEmail: 'mcuevas@nordel.mx',
    contactPhone: '33 2044 1990',
    status: 'Activo',
    complianceStatus: 'Al corriente',
    reviewStatus: 'Revision mensual',
    registeredPeople: 37,
    activeRecords: 33,
    pendingItems: 2,
    expiringDocuments: 2,
    compliancePercent: 92,
    updatedAt: '2026-04-07T18:10:00',
    nextReviewAt: '2026-04-30T09:00:00',
    executiveSummary:
      'Operacion controlada con trazabilidad documental madura. Los pendientes actuales corresponden a recertificaciones tecnicas ya programadas.',
    people: [
      { id: 'nordel-p1', name: 'Hector Linares', role: 'Tecnico electromecanico', recordStatus: 'Vigente', validUntil: '2026-11-01', lastUpdate: '2026-04-07T15:55:00' },
      { id: 'nordel-p2', name: 'Miriam Ochoa', role: 'Coordinadora de cuadrilla', recordStatus: 'Vigente', validUntil: '2026-08-04', lastUpdate: '2026-04-07T18:10:00' },
      { id: 'nordel-p3', name: 'Ruben Perez', role: 'Soldador certificado', recordStatus: 'En revision', validUntil: '2026-07-18', lastUpdate: '2026-04-05T09:45:00' },
      { id: 'nordel-p4', name: 'Fatima Reyes', role: 'Tecnica de mantenimiento', recordStatus: 'Vigente', validUntil: '2026-09-09', lastUpdate: '2026-04-03T13:30:00' },
    ],
    template: {
      name: 'Plantilla Mantenimiento Critico',
      version: 'v4.0',
      assignedBy: 'Auditoria operativa',
      updatedAt: '2026-03-20T16:35:00',
      customFields: [
        {
          id: 'nordel-custom-1',
          label: 'Especialidad tecnica',
          type: 'TEXT',
          required: true,
          description: 'Perfil tecnico principal del colaborador.',
          placeholder: 'Ej. Soldadura TIG',
        },
        {
          id: 'nordel-custom-2',
          label: 'Nivel de acceso',
          type: 'SELECT',
          required: false,
          description: 'Permisos de ingreso requeridos para la operacion.',
          options: ['General', 'Cuarto electrico', 'Linea critica'],
        },
        {
          id: 'nordel-custom-3',
          label: 'Certificacion tecnica vigente',
          type: 'FILE',
          required: true,
          description: 'Documento de respaldo para especialidades industriales.',
        },
      ],
    },
    repositoryCategories: [
      { id: 'nordel-c1', name: 'Tecnicos certificados', totalDocuments: 52, currentDocuments: 48, pendingDocuments: 4, lastMovementAt: '2026-04-07T18:10:00', health: 'Estable' },
      { id: 'nordel-c2', name: 'Seguridad y acceso', totalDocuments: 31, currentDocuments: 29, pendingDocuments: 2, lastMovementAt: '2026-04-06T10:25:00', health: 'Estable' },
      { id: 'nordel-c3', name: 'Bitacora de servicio', totalDocuments: 18, currentDocuments: 17, pendingDocuments: 1, lastMovementAt: '2026-04-05T09:45:00', health: 'Seguimiento' },
    ],
    latestDocuments: [
      { id: 'nordel-d1', name: 'Certificacion de soldadura', category: 'Especialidades tecnicas', owner: 'Ruben Perez', updatedAt: '2026-04-05T09:45:00', status: 'En revision' },
      { id: 'nordel-d2', name: 'Constancia de seguridad en alturas', category: 'Seguridad industrial', owner: 'Hector Linares', updatedAt: '2026-04-04T17:05:00', status: 'Vigente' },
      { id: 'nordel-d3', name: 'Gafete de acceso corporativo', category: 'Accesos', owner: 'Miriam Ochoa', updatedAt: '2026-04-03T12:10:00', status: 'Vigente' },
    ],
    history: [
      { id: 'nordel-h1', title: 'Revision mensual completada', description: 'Se liberaron 33 expedientes vigentes con observaciones puntuales en certificaciones tecnicas.', timestamp: '2026-04-07T18:10:00', type: 'revision' },
      { id: 'nordel-h2', title: 'Actualizacion de bitacora de servicio', description: 'Se consolidaron evidencias de mantenimiento preventivo del ultimo corte.', timestamp: '2026-04-06T10:25:00', type: 'documento' },
      { id: 'nordel-h3', title: 'Alta de tecnico electromecanico', description: 'Se integro un nuevo tecnico certificado para cobertura del frente norte.', timestamp: '2026-03-26T08:40:00', type: 'alta' },
      { id: 'nordel-h4', title: 'Version nueva de plantilla', description: 'Se actualizo la matriz documental para trabajos criticos y especialidades.', timestamp: '2026-03-20T16:35:00', type: 'plantilla' },
    ],
  },
  {
    id: 'futura-construcciones-corporativas',
    name: 'Futura Construcciones',
    businessName: 'Futura Construcciones Corporativas S.A. de C.V.',
    serviceType: 'Obra civil',
    contactName: 'Gabriela Nava',
    contactEmail: 'gabriela.nava@futuracorp.com',
    contactPhone: '55 7340 2288',
    status: 'Observado',
    complianceStatus: 'Atencion prioritaria',
    reviewStatus: 'Documentos por vencer',
    registeredPeople: 54,
    activeRecords: 38,
    pendingItems: 11,
    expiringDocuments: 12,
    compliancePercent: 74,
    updatedAt: '2026-04-09T07:10:00',
    nextReviewAt: '2026-04-10T08:30:00',
    executiveSummary:
      'Proveedor con alta carga operativa y dispersion documental. Requiere cierre inmediato de observaciones en estudios medicos, seguridad en alturas y renovacion de accesos.',
    people: [
      { id: 'futura-p1', name: 'Ricardo Solis', role: 'Residente de obra', recordStatus: 'En revision', validUntil: '2026-05-03', lastUpdate: '2026-04-09T07:10:00' },
      { id: 'futura-p2', name: 'Nadia Escobar', role: 'Supervisora de seguridad', recordStatus: 'Por vencer', validUntil: '2026-04-14', lastUpdate: '2026-04-08T18:30:00' },
      { id: 'futura-p3', name: 'Ivan Monroy', role: 'Operador de plataforma', recordStatus: 'Observado', validUntil: '2026-04-12', lastUpdate: '2026-04-08T09:20:00' },
      { id: 'futura-p4', name: 'Alicia Dominguez', role: 'Control administrativo', recordStatus: 'Vigente', validUntil: '2026-08-21', lastUpdate: '2026-04-05T15:50:00' },
    ],
    template: {
      name: 'Plantilla Obra Civil Mayor',
      version: 'v5.1',
      assignedBy: 'Gerencia de cumplimiento',
      updatedAt: '2026-04-01T13:20:00',
      customFields: [
        {
          id: 'futura-custom-1',
          label: 'Frente de obra',
          type: 'SELECT',
          required: true,
          description: 'Proyecto o frente donde se asigna el colaborador.',
          options: ['Corporativo sur', 'Torre norte', 'Plataforma logisticas'],
        },
        {
          id: 'futura-custom-2',
          label: 'Observaciones operativas',
          type: 'TEXTAREA',
          required: false,
          description: 'Espacio para indicar restricciones o notas de ingreso.',
          placeholder: 'Notas relevantes para seguridad o acceso.',
        },
        {
          id: 'futura-custom-3',
          label: 'Apto medico para trabajo en altura',
          type: 'FILE',
          required: true,
          description: 'Documento adicional requerido para personal de campo.',
        },
      ],
    },
    repositoryCategories: [
      { id: 'futura-c1', name: 'Frente de obra', totalDocuments: 97, currentDocuments: 71, pendingDocuments: 26, lastMovementAt: '2026-04-09T07:10:00', health: 'Prioritario' },
      { id: 'futura-c2', name: 'Seguridad en alturas', totalDocuments: 44, currentDocuments: 30, pendingDocuments: 14, lastMovementAt: '2026-04-08T18:30:00', health: 'Prioritario' },
      { id: 'futura-c3', name: 'Administrativo', totalDocuments: 21, currentDocuments: 18, pendingDocuments: 3, lastMovementAt: '2026-04-05T15:50:00', health: 'Seguimiento' },
    ],
    latestDocuments: [
      { id: 'futura-d1', name: 'Apto medico de trabajo en altura', category: 'Salud ocupacional', owner: 'Nadia Escobar', updatedAt: '2026-04-08T18:30:00', status: 'Por vencer' },
      { id: 'futura-d2', name: 'Constancia de operador de plataforma', category: 'Seguridad en alturas', owner: 'Ivan Monroy', updatedAt: '2026-04-08T09:20:00', status: 'Observado' },
      { id: 'futura-d3', name: 'Pase de acceso a proyecto', category: 'Accesos a obra', owner: 'Ricardo Solis', updatedAt: '2026-04-07T12:00:00', status: 'En revision' },
    ],
    history: [
      { id: 'futura-h1', title: 'Proveedor marcado en atencion prioritaria', description: 'Se elevo el nivel de seguimiento por concentracion de documentos por vencer en personal de campo.', timestamp: '2026-04-09T07:10:00', type: 'revision' },
      { id: 'futura-h2', title: 'Observacion documental registrada', description: 'Se devolvio evidencia de certificacion por inconsistencias en firma y vigencia.', timestamp: '2026-04-08T09:20:00', type: 'documento' },
      { id: 'futura-h3', title: 'Actualizacion de plantilla de obra', description: 'Se agrego requisito de apto medico para trabajos verticales y maniobra especializada.', timestamp: '2026-04-01T13:20:00', type: 'plantilla' },
      { id: 'futura-h4', title: 'Alta de administracion de frente', description: 'Se registraron perfiles de control administrativo para el nuevo proyecto corporativo.', timestamp: '2026-03-29T10:45:00', type: 'alta' },
    ],
  },
  {
    id: 'bioflex-servicios-ambientales',
    name: 'Bioflex Servicios',
    businessName: 'Bioflex Servicios Ambientales S.A. de C.V.',
    serviceType: 'Servicios ambientales',
    contactName: 'Valeria Santos',
    contactEmail: 'valeria.santos@bioflex.com.mx',
    contactPhone: '222 987 1104',
    status: 'Activo',
    complianceStatus: 'Al corriente',
    reviewStatus: 'Revision trimestral',
    registeredPeople: 24,
    activeRecords: 22,
    pendingItems: 1,
    expiringDocuments: 1,
    compliancePercent: 96,
    updatedAt: '2026-04-06T16:00:00',
    nextReviewAt: '2026-06-15T11:00:00',
    executiveSummary:
      'Operacion controlada con una base documental compacta y estable. Solo mantiene una renovacion pendiente en calibracion de equipo ambiental.',
    people: [
      { id: 'bioflex-p1', name: 'Marina Chavez', role: 'Analista ambiental', recordStatus: 'Vigente', validUntil: '2026-10-19', lastUpdate: '2026-04-06T16:00:00' },
      { id: 'bioflex-p2', name: 'Tomas Franco', role: 'Tecnico de muestreo', recordStatus: 'Vigente', validUntil: '2026-08-02', lastUpdate: '2026-04-05T10:15:00' },
      { id: 'bioflex-p3', name: 'Sandra Pina', role: 'Coordinadora de campo', recordStatus: 'Por vencer', validUntil: '2026-04-22', lastUpdate: '2026-04-04T13:05:00' },
      { id: 'bioflex-p4', name: 'Victor Mejia', role: 'Supervisor tecnico', recordStatus: 'Vigente', validUntil: '2026-09-27', lastUpdate: '2026-04-03T08:50:00' },
    ],
    template: {
      name: 'Plantilla Ambiental y Monitoreo',
      version: 'v2.4',
      assignedBy: 'Expediente sectorial',
      updatedAt: '2026-03-18T09:40:00',
      customFields: [
        {
          id: 'bioflex-custom-1',
          label: 'Area de muestreo',
          type: 'TEXT',
          required: true,
          description: 'Zona o cliente donde se realiza el monitoreo.',
          placeholder: 'Ej. Planta de tratamiento',
        },
        {
          id: 'bioflex-custom-2',
          label: 'Equipo asignado',
          type: 'SELECT',
          required: false,
          description: 'Equipo principal bajo resguardo del colaborador.',
          options: ['Sonda multiparametrica', 'Bomba de muestreo', 'Detector portatil'],
        },
        {
          id: 'bioflex-custom-3',
          label: 'Certificado de calibracion',
          type: 'FILE',
          required: true,
          description: 'Evidencia adicional para instrumentos y equipo ambiental.',
        },
      ],
    },
    repositoryCategories: [
      { id: 'bioflex-c1', name: 'Acreditaciones', totalDocuments: 28, currentDocuments: 27, pendingDocuments: 1, lastMovementAt: '2026-04-06T16:00:00', health: 'Estable' },
      { id: 'bioflex-c2', name: 'Equipo y calibracion', totalDocuments: 17, currentDocuments: 16, pendingDocuments: 1, lastMovementAt: '2026-04-05T10:15:00', health: 'Seguimiento' },
      { id: 'bioflex-c3', name: 'Operativo', totalDocuments: 12, currentDocuments: 12, pendingDocuments: 0, lastMovementAt: '2026-04-04T13:05:00', health: 'Estable' },
    ],
    latestDocuments: [
      { id: 'bioflex-d1', name: 'Certificado de calibracion', category: 'Equipo y calibracion', owner: 'Sandra Pina', updatedAt: '2026-04-05T10:15:00', status: 'Por vencer' },
      { id: 'bioflex-d2', name: 'Constancia de acreditacion tecnica', category: 'Acreditaciones tecnicas', owner: 'Marina Chavez', updatedAt: '2026-04-04T16:20:00', status: 'Vigente' },
      { id: 'bioflex-d3', name: 'Permiso de acceso a laboratorio', category: 'Acceso a instalaciones', owner: 'Victor Mejia', updatedAt: '2026-04-03T08:50:00', status: 'Vigente' },
    ],
    history: [
      { id: 'bioflex-h1', title: 'Revision trimestral programada', description: 'El proveedor permanece en condicion estable con una sola renovacion de equipo en seguimiento.', timestamp: '2026-04-06T16:00:00', type: 'revision' },
      { id: 'bioflex-h2', title: 'Documento tecnico actualizado', description: 'Se reemplazo el certificado de acreditacion del laboratorio externo.', timestamp: '2026-04-04T16:20:00', type: 'documento' },
      { id: 'bioflex-h3', title: 'Plantilla ambiental reasignada', description: 'Se ajusto version de plantilla para incorporar calibracion de equipo especializado.', timestamp: '2026-03-18T09:40:00', type: 'plantilla' },
      { id: 'bioflex-h4', title: 'Alta de supervisor tecnico', description: 'Se incorporo personal de supervision para la zona centro con expediente completo.', timestamp: '2026-03-15T11:35:00', type: 'alta' },
    ],
  },
  {
    id: 'orbita-automatizacion-industrial',
    name: 'Orbita Automatizacion',
    businessName: 'Orbita Automatizacion Industrial S.A. de C.V.',
    serviceType: 'Automatizacion industrial',
    contactName: 'Cesar Villasenor',
    contactEmail: 'cesar.villasenor@orbita-ai.mx',
    contactPhone: '81 6645 9120',
    status: 'En revision',
    complianceStatus: 'En seguimiento',
    reviewStatus: 'Revision mensual',
    registeredPeople: 31,
    activeRecords: 26,
    pendingItems: 4,
    expiringDocuments: 3,
    compliancePercent: 88,
    updatedAt: '2026-04-08T19:05:00',
    nextReviewAt: '2026-04-25T10:00:00',
    executiveSummary:
      'Proveedor especializado con buena base documental. Mantiene pendientes localizados en perfiles de programacion y evidencias de acceso a tablero energizado.',
    people: [
      { id: 'orbita-p1', name: 'Lorena Padilla', role: 'Ingeniera de automatizacion', recordStatus: 'Vigente', validUntil: '2026-09-16', lastUpdate: '2026-04-08T19:05:00' },
      { id: 'orbita-p2', name: 'Bruno Zamora', role: 'Programador PLC', recordStatus: 'En revision', validUntil: '2026-06-30', lastUpdate: '2026-04-08T17:30:00' },
      { id: 'orbita-p3', name: 'Daniela Ayala', role: 'Tecnica de instrumentacion', recordStatus: 'Vigente', validUntil: '2026-08-09', lastUpdate: '2026-04-06T12:40:00' },
      { id: 'orbita-p4', name: 'Omar Tellez', role: 'Especialista en tableros', recordStatus: 'Por vencer', validUntil: '2026-04-20', lastUpdate: '2026-04-05T14:15:00' },
    ],
    template: {
      name: 'Plantilla Automatizacion y Control',
      version: 'v3.0',
      assignedBy: 'Control documental tecnico',
      updatedAt: '2026-03-22T12:25:00',
      customFields: [
        {
          id: 'orbita-custom-1',
          label: 'Especialidad de control',
          type: 'TEXT',
          required: true,
          description: 'Enfoque principal de automatizacion del colaborador.',
          placeholder: 'Ej. PLC Siemens',
        },
        {
          id: 'orbita-custom-2',
          label: 'Nivel de tablero',
          type: 'SELECT',
          required: false,
          description: 'Tipo de acceso tecnico requerido para la actividad.',
          options: ['Baja tension', 'Media tension', 'Centro de control'],
        },
        {
          id: 'orbita-custom-3',
          label: 'Permiso de trabajo energizado',
          type: 'FILE',
          required: true,
          description: 'Evidencia documental adicional para trabajos tecnicos criticos.',
        },
      ],
    },
    repositoryCategories: [
      { id: 'orbita-c1', name: 'Especialidades', totalDocuments: 39, currentDocuments: 34, pendingDocuments: 5, lastMovementAt: '2026-04-08T19:05:00', health: 'Seguimiento' },
      { id: 'orbita-c2', name: 'Seguridad tecnica', totalDocuments: 24, currentDocuments: 22, pendingDocuments: 2, lastMovementAt: '2026-04-08T17:30:00', health: 'Seguimiento' },
      { id: 'orbita-c3', name: 'Acceso a tableros', totalDocuments: 18, currentDocuments: 15, pendingDocuments: 3, lastMovementAt: '2026-04-05T14:15:00', health: 'Prioritario' },
    ],
    latestDocuments: [
      { id: 'orbita-d1', name: 'Certificacion de programacion PLC', category: 'Programacion y certificaciones', owner: 'Bruno Zamora', updatedAt: '2026-04-08T17:30:00', status: 'En revision' },
      { id: 'orbita-d2', name: 'Permiso de trabajo energizado', category: 'Acceso a tableros', owner: 'Omar Tellez', updatedAt: '2026-04-05T14:15:00', status: 'Por vencer' },
      { id: 'orbita-d3', name: 'Constancia de seguridad electrica', category: 'Seguridad operativa', owner: 'Lorena Padilla', updatedAt: '2026-04-04T18:10:00', status: 'Vigente' },
    ],
    history: [
      { id: 'orbita-h1', title: 'Revision mensual abierta', description: 'Se dejaron cuatro pendientes concentrados en certificaciones y accesos a tablero energizado.', timestamp: '2026-04-08T19:05:00', type: 'revision' },
      { id: 'orbita-h2', title: 'Actualizacion de certificacion PLC', description: 'Se recibio nueva evidencia para el personal de programacion y control.', timestamp: '2026-04-08T17:30:00', type: 'documento' },
      { id: 'orbita-h3', title: 'Nueva version de plantilla tecnica', description: 'Se incorporo control especifico para ingreso a tableros energizados.', timestamp: '2026-03-22T12:25:00', type: 'plantilla' },
      { id: 'orbita-h4', title: 'Alta de ingeniera de automatizacion', description: 'Se habilito expediente integral para personal tecnico del frente norte.', timestamp: '2026-03-18T09:15:00', type: 'alta' },
    ],
  },
];

export const EXPEDIENTE_PROVIDERS_MOCK: ExpedienteProviderDetail[] =
  BASE_EXPEDIENTE_PROVIDERS.map(withProviderPresentationData);
