import { Injectable } from '@angular/core';
import { AppRole } from './session-role.service';

export type NotificationStatus = 'Nueva' | 'Pendiente' | 'Importante' | 'Leida';
export type NotificationPriority = 'Alta' | 'Media' | 'Baja';
export type NotificationModule = 'Remediacion' | 'Riesgos' | 'Evaluaciones';
export type NotificationType =
  | 'Cuestionario corto disponible'
  | 'Recordatorio de participacion'
  | 'Cuestionario proximo a vencer'
  | 'Nueva solicitud informativa'
  | 'Actualizacion de evaluacion'
  | 'Evaluacion reprobada requiere remediacion'
  | 'Nueva remediacion creada'
  | 'Accion asignada'
  | 'Fecha limite proxima'
  | 'Remediacion vencida'
  | 'Evidencia subida'
  | 'Accion completada'
  | 'Remediacion validada'
  | 'Comentario nuevo en seguimiento'
  | 'Caso listo para validar';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  module: NotificationModule;
  status: NotificationStatus;
  priority: NotificationPriority;
  createdAt: string;
  ctaLabel: string;
  ctaRoute: string;
  roles: Array<Exclude<AppRole, null>>;
  relatedCategory?: string;
  feedsRiskCalculator?: boolean;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  important: number;
  remediationCount: number;
  pendingActionCount: number;
  deadlineCount: number;
  riskCount: number;
}

const NOTIFICATIONS: AppNotification[] = [
  {
    id: 1,
    title: 'Evaluacion reprobada requiere remediacion',
    message:
      'Cumplimiento operativo Q1 quedo reprobado y ya necesita plan de accion y validacion de responsable.',
    type: 'Evaluacion reprobada requiere remediacion',
    module: 'Remediacion',
    status: 'Importante',
    priority: 'Alta',
    createdAt: '2026-03-22T08:25:00',
    ctaLabel: 'Abrir plan',
    ctaRoute: '/plan-remediacion',
    roles: ['admin'],
    relatedCategory: 'Cumplimiento',
  },
  {
    id: 2,
    title: 'Caso listo para validar',
    message:
      'La remediacion REM-002 quedo en revision con evidencia recibida y espera validacion de ADMIN.',
    type: 'Caso listo para validar',
    module: 'Remediacion',
    status: 'Pendiente',
    priority: 'Alta',
    createdAt: '2026-03-22T07:35:00',
    ctaLabel: 'Validar caso',
    ctaRoute: '/plan-remediacion',
    roles: ['admin'],
    relatedCategory: 'Cumplimiento',
  },
  {
    id: 3,
    title: 'Evidencia recibida en remediacion critica',
    message:
      'Adrian Molina subio una politica dummy para el caso de fuga de informacion y requiere revision.',
    type: 'Evidencia subida',
    module: 'Remediacion',
    status: 'Nueva',
    priority: 'Alta',
    createdAt: '2026-03-21T16:20:00',
    ctaLabel: 'Revisar evidencia',
    ctaRoute: '/plan-remediacion',
    roles: ['admin'],
    relatedCategory: 'Fuga de informacion',
  },
  {
    id: 4,
    title: 'Remediacion proxima a vencer',
    message:
      'El caso REM-001 vence en menos de 48 horas y aun sigue en proceso con avance parcial.',
    type: 'Fecha limite proxima',
    module: 'Remediacion',
    status: 'Importante',
    priority: 'Alta',
    createdAt: '2026-03-21T12:10:00',
    ctaLabel: 'Monitorear caso',
    ctaRoute: '/plan-remediacion',
    roles: ['admin'],
    relatedCategory: 'Fuga de informacion',
  },
  {
    id: 5,
    title: 'Riesgo alto en fuga de informacion',
    message:
      'El score de riesgos subio por respuestas inconsistentes y remediaciones abiertas en seguridad de la informacion.',
    type: 'Actualizacion de evaluacion',
    module: 'Riesgos',
    status: 'Pendiente',
    priority: 'Media',
    createdAt: '2026-03-21T10:45:00',
    ctaLabel: 'Ver calculadora',
    ctaRoute: '/calculadora-riesgos',
    roles: ['admin'],
    relatedCategory: 'Fuga de informacion',
  },
  {
    id: 6,
    title: 'Nueva accion asignada',
    message:
      'Se te asigno la remediacion REM-001 para corregir controles de fuga de informacion.',
    type: 'Accion asignada',
    module: 'Remediacion',
    status: 'Nueva',
    priority: 'Alta',
    createdAt: '2026-03-22T08:40:00',
    ctaLabel: 'Ver mi accion',
    ctaRoute: '/plan-remediacion',
    roles: ['user'],
    relatedCategory: 'Fuga de informacion',
  },
  {
    id: 7,
    title: 'Fecha limite proxima de remediacion',
    message:
      'Tu accion de cumplimiento vence pronto y necesitas completar la matriz dummy antes del cierre.',
    type: 'Fecha limite proxima',
    module: 'Remediacion',
    status: 'Importante',
    priority: 'Alta',
    createdAt: '2026-03-22T07:15:00',
    ctaLabel: 'Actualizar avance',
    ctaRoute: '/plan-remediacion',
    roles: ['user'],
    relatedCategory: 'Cumplimiento',
  },
  {
    id: 8,
    title: 'Comentario nuevo en seguimiento',
    message:
      'Roberto Salazar agrego una instruccion para cerrar la remediacion de cumplimiento.',
    type: 'Comentario nuevo en seguimiento',
    module: 'Remediacion',
    status: 'Pendiente',
    priority: 'Media',
    createdAt: '2026-03-21T18:30:00',
    ctaLabel: 'Leer comentario',
    ctaRoute: '/plan-remediacion',
    roles: ['user'],
    relatedCategory: 'Cumplimiento',
  },
  {
    id: 9,
    title: 'Accion completada y en revision',
    message:
      'Tu remediacion documental paso a revision y ahora espera validacion de ADMIN.',
    type: 'Accion completada',
    module: 'Remediacion',
    status: 'Nueva',
    priority: 'Media',
    createdAt: '2026-03-22T08:00:00',
    ctaLabel: 'Ver seguimiento',
    ctaRoute: '/plan-remediacion',
    roles: ['user'],
    relatedCategory: 'Seguridad documental',
  },
  {
    id: 10,
    title: 'Nuevo cuestionario corto sobre fuga de informacion',
    message:
      'Completa la evaluacion breve para actualizar el nivel de riesgo del bloque de fuga de informacion.',
    type: 'Cuestionario corto disponible',
    module: 'Riesgos',
    status: 'Nueva',
    priority: 'Alta',
    createdAt: '2026-03-20T09:15:00',
    ctaLabel: 'Responder ahora',
    ctaRoute: '/evaluaciones/usuario/mis-evaluaciones',
    roles: ['user'],
    feedsRiskCalculator: true,
    relatedCategory: 'Fuga de informacion',
  },
  {
    id: 11,
    title: 'Participa en la evaluacion breve de cumplimiento',
    message:
      'Tu respuesta es necesaria para cerrar el analisis de cumplimiento del periodo actual.',
    type: 'Recordatorio de participacion',
    module: 'Riesgos',
    status: 'Pendiente',
    priority: 'Alta',
    createdAt: '2026-03-19T18:30:00',
    ctaLabel: 'Ir al cuestionario',
    ctaRoute: '/evaluaciones/usuario/mis-evaluaciones',
    roles: ['user'],
    feedsRiskCalculator: true,
    relatedCategory: 'Cumplimiento',
  },
  {
    id: 12,
    title: 'Remediacion validada',
    message:
      'El caso documental asociado a tu evaluacion fue validado por ADMIN y quedo cerrado.',
    type: 'Remediacion validada',
    module: 'Remediacion',
    status: 'Leida',
    priority: 'Baja',
    createdAt: '2026-03-18T16:20:00',
    ctaLabel: 'Ver historial',
    ctaRoute: '/plan-remediacion',
    roles: ['user'],
    relatedCategory: 'Seguridad documental',
  },
];

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  getNotifications(role: AppRole): AppNotification[] {
    if (role !== 'admin' && role !== 'user') {
      return [];
    }

    return NOTIFICATIONS.filter((item) => item.roles.includes(role)).map((item) => ({
      ...item,
    }));
  }

  getRecentNotifications(role: AppRole, limit = 4): AppNotification[] {
    return this.getNotifications(role).slice(0, limit);
  }

  getSummary(role: AppRole): NotificationSummary {
    const notifications = this.getNotifications(role);

    return {
      total: notifications.length,
      unread: notifications.filter((item) => item.status !== 'Leida').length,
      important: notifications.filter(
        (item) => item.status === 'Importante' || item.priority === 'Alta',
      ).length,
      remediationCount: notifications.filter(
        (item) => item.module === 'Remediacion',
      ).length,
      pendingActionCount: notifications.filter(
        (item) => item.status === 'Nueva' || item.status === 'Pendiente',
      ).length,
      deadlineCount: notifications.filter(
        (item) =>
          item.type === 'Fecha limite proxima' || item.type === 'Remediacion vencida',
      ).length,
      riskCount: notifications.filter((item) => item.module === 'Riesgos').length,
    };
  }
}
