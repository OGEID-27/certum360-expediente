export type RiskLevel = 'Bajo' | 'Medio' | 'Alto' | 'Critico';
export type RiskTrend = 'Sube' | 'Estable' | 'Disminuye';
export type RiskSourceType = 'Cuestionario base' | 'Cuestionario corto';

export interface RiskKpi {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: 'brand' | 'success' | 'warning' | 'error';
}

export interface RiskCategory {
  name: string;
  score: number;
  level: RiskLevel;
  trend: RiskTrend;
  incidents: number;
  status: string;
  summary: string;
}

export interface RiskTrigger {
  title: string;
  category: string;
  source: RiskSourceType;
  questionnaire: string;
  scoreImpact: number;
  status: 'Atencion inmediata' | 'Seguimiento' | 'Controlado';
  description: string;
  recommendation: string;
}

export interface RiskHistoryItem {
  evaluation: string;
  category: string;
  result: string;
  scoreContribution: number;
  date: string;
  level: RiskLevel;
  source: RiskSourceType;
}

export interface RiskAnalysisSource {
  title: string;
  subtitle: string;
  metrics: Array<{
    label: string;
    value: string;
    tone: 'brand' | 'success' | 'warning' | 'error';
  }>;
}

export interface RiskAnalysisDashboard {
  generatedAt: string;
  executiveSummary: string;
  generalScore: number;
  generalLevel: RiskLevel;
  generalExplanation: string;
  executiveRecommendation: string;
  highestExposureAreas: string[];
  kpis: RiskKpi[];
  categories: RiskCategory[];
  triggers: RiskTrigger[];
  history: RiskHistoryItem[];
  sources: RiskAnalysisSource[];
}

export function getRiskAnalysisDashboardMock(): RiskAnalysisDashboard {
  return {
    generatedAt: '2026-03-22T08:30:00',
    executiveSummary:
      'El modulo concentra resultados de cuestionarios base, respuestas breves enviadas por notificacion e indicadores operativos dummy para estimar exposicion actual.',
    generalScore: 78,
    generalLevel: 'Alto',
    generalExplanation:
      'El score se mantiene en rango alto por hallazgos en fuga de informacion, cumplimiento parcial y respuestas breves pendientes que siguen afectando la confianza del analisis.',
    executiveRecommendation:
      'Priorizar el cierre de cuestionarios cortos pendientes y reforzar controles documentales y de acceso antes del siguiente corte semanal.',
    highestExposureAreas: [
      'Fuga de informacion con tendencia al alza por respuestas inconsistentes.',
      'Cumplimiento con rezagos en cuestionarios breves de validacion.',
      'Seguridad documental con evidencia parcial y seguimiento abierto.',
    ],
    kpis: [
      {
        id: 'general-score',
        label: 'Riesgo general actual',
        value: '78 / 100',
        helper: 'Nivel alto con seguimiento ejecutivo',
        tone: 'error',
      },
      {
        id: 'evaluated',
        label: 'Cuestionarios evaluados',
        value: '48',
        helper: '32 base y 16 complementarios',
        tone: 'brand',
      },
      {
        id: 'critical-factors',
        label: 'Factores criticos detectados',
        value: '5',
        helper: '3 requieren atencion inmediata',
        tone: 'warning',
      },
      {
        id: 'exposure-areas',
        label: 'Areas con mayor exposicion',
        value: '3',
        helper: 'Informacion, cumplimiento y documentos',
        tone: 'warning',
      },
      {
        id: 'alerts',
        label: 'Evaluaciones con alerta',
        value: '6',
        helper: 'Hallazgos recientes por categoria',
        tone: 'error',
      },
      {
        id: 'pending-short',
        label: 'Cuestionarios cortos pendientes',
        value: '4',
        helper: 'Pendientes enviados por notificacion',
        tone: 'brand',
      },
    ],
    categories: [
      {
        name: 'Fuga de informacion',
        score: 86,
        level: 'Critico',
        trend: 'Sube',
        incidents: 4,
        status: 'Escalado',
        summary:
          'Respuestas dispares entre evaluaciones base y cuestionarios breves de confirmacion.',
      },
      {
        name: 'Cumplimiento',
        score: 74,
        level: 'Alto',
        trend: 'Sube',
        incidents: 3,
        status: 'En seguimiento',
        summary:
          'Persisten bloques pendientes en validaciones complementarias de compliance.',
      },
      {
        name: 'Acceso indebido',
        score: 63,
        level: 'Medio',
        trend: 'Estable',
        incidents: 2,
        status: 'Controlado',
        summary:
          'Hay hallazgos moderados en accesos temporales, sin deterioro adicional reciente.',
      },
      {
        name: 'Seguridad documental',
        score: 69,
        level: 'Alto',
        trend: 'Sube',
        incidents: 3,
        status: 'Revision abierta',
        summary:
          'Falta consolidar evidencia documental y respuestas de seguimiento del usuario.',
      },
      {
        name: 'Terceros / proveedores',
        score: 51,
        level: 'Medio',
        trend: 'Disminuye',
        incidents: 1,
        status: 'Mitigando',
        summary:
          'La exposicion baja tras respuestas recientes, aunque sigue un cuestionario por vencer.',
      },
    ],
    triggers: [
      {
        title: 'Respuestas inconsistentes en fuga de informacion',
        category: 'Fuga de informacion',
        source: 'Cuestionario corto',
        questionnaire: 'Breve de fuga de informacion / marzo 2026',
        scoreImpact: 16,
        status: 'Atencion inmediata',
        description:
          'El usuario reporto practicas operativas que no coinciden con el cuestionario base aprobado.',
        recommendation:
          'Solicitar cierre del cuestionario corto y revisar controles de envio y resguardo de datos.',
      },
      {
        title: 'Cumplimiento parcial en validaciones regulatorias',
        category: 'Cumplimiento',
        source: 'Cuestionario base',
        questionnaire: 'Cumplimiento operativo Q1',
        scoreImpact: 12,
        status: 'Seguimiento',
        description:
          'El bloque regulatorio quedo con reactivos reprobados y dependencias abiertas para evidencia.',
        recommendation:
          'Actualizar evidencias pendientes y lanzar un recordatorio breve al usuario responsable.',
      },
      {
        title: 'Pendiente breve de seguridad documental',
        category: 'Seguridad documental',
        source: 'Cuestionario corto',
        questionnaire: 'Solicitud informativa documental / semana 12',
        scoreImpact: 10,
        status: 'Seguimiento',
        description:
          'La ausencia de respuesta mantiene el riesgo elevado y reduce la confianza del score consolidado.',
        recommendation:
          'Escalar el pendiente y cerrar el bloque documental antes del siguiente corte.',
      },
      {
        title: 'Accesos temporales sin validacion final',
        category: 'Acceso indebido',
        source: 'Cuestionario base',
        questionnaire: 'Control de accesos internos',
        scoreImpact: 7,
        status: 'Controlado',
        description:
          'Se detectaron accesos no permanentes aun sin evidencia completa de revocacion.',
        recommendation:
          'Confirmar revocaciones y mantener el monitoreo semanal hasta cerrar el hallazgo.',
      },
    ],
    history: [
      {
        evaluation: 'Breve de fuga de informacion / marzo 2026',
        category: 'Fuga de informacion',
        result: 'Respuestas inconsistentes',
        scoreContribution: 16,
        date: '2026-03-22T09:15:00',
        level: 'Critico',
        source: 'Cuestionario corto',
      },
      {
        evaluation: 'Cumplimiento operativo Q1',
        category: 'Cumplimiento',
        result: 'Reprobado parcial',
        scoreContribution: 12,
        date: '2026-03-21T15:30:00',
        level: 'Alto',
        source: 'Cuestionario base',
      },
      {
        evaluation: 'Solicitud informativa documental / semana 12',
        category: 'Seguridad documental',
        result: 'Pendiente de respuesta',
        scoreContribution: 10,
        date: '2026-03-20T16:10:00',
        level: 'Alto',
        source: 'Cuestionario corto',
      },
      {
        evaluation: 'Control de accesos internos',
        category: 'Acceso indebido',
        result: 'Hallazgo moderado',
        scoreContribution: 7,
        date: '2026-03-19T11:45:00',
        level: 'Medio',
        source: 'Cuestionario base',
      },
      {
        evaluation: 'Seguimiento de terceros / marzo',
        category: 'Terceros / proveedores',
        result: 'Aprobado con observaciones',
        scoreContribution: 5,
        date: '2026-03-18T10:00:00',
        level: 'Medio',
        source: 'Cuestionario base',
      },
      {
        evaluation: 'Recordatorio breve de cumplimiento',
        category: 'Cumplimiento',
        result: 'Sin respuesta',
        scoreContribution: 8,
        date: '2026-03-17T08:20:00',
        level: 'Alto',
        source: 'Cuestionario corto',
      },
    ],
    sources: [
      {
        title: 'Cuestionarios normales',
        subtitle: 'Asignados a usuarios con estatus de aprobacion y seguimiento.',
        metrics: [
          { label: 'Aprobados', value: '18', tone: 'success' },
          { label: 'Reprobados', value: '8', tone: 'error' },
          { label: 'Incompletos', value: '6', tone: 'warning' },
          { label: 'Asignados', value: '32', tone: 'brand' },
        ],
      },
      {
        title: 'Cuestionarios cortos por notificacion',
        subtitle: 'Microbloques enviados al usuario para reforzar el analisis.',
        metrics: [
          { label: 'Enviados', value: '14', tone: 'brand' },
          { label: 'Respondidos', value: '10', tone: 'success' },
          { label: 'Pendientes', value: '4', tone: 'warning' },
          { label: 'Impactando score', value: '4', tone: 'error' },
        ],
      },
      {
        title: 'Indicadores dummy',
        subtitle: 'Senales ejecutivas de cumplimiento y exposicion operativa.',
        metrics: [
          { label: 'Cumplimiento general', value: '84%', tone: 'success' },
          { label: 'Exposicion operativa', value: '3 areas', tone: 'warning' },
          { label: 'Clientes en alerta', value: '6', tone: 'error' },
          { label: 'Monitoreo actualizado', value: 'Hoy', tone: 'brand' },
        ],
      },
    ],
  };
}
