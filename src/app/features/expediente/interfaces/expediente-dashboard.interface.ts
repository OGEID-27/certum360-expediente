export interface ExpedienteMetric {
  id: 'providers' | 'people' | 'approved' | 'pending' | 'observed' | 'expired';
  title: string;
  value: number;
  detail: string;
}

export interface ExpedienteStatusDistributionItem {
  label: string;
  total: number;
  color: string;
}

export interface ExpedienteMonthlyTrendItem {
  label: string;
  loaded: number;
  reviewed: number;
}

export interface ExpedienteProviderPeopleItem {
  provider: string;
  totalPeople: number;
}

export interface ExpedienteQuickAction {
  id: string;
  title: string;
  description: string;
  sectionId: string;
  ctaLabel: string;
}

export interface ExpedienteProviderSummary {
  id: string;
  name: string;
  sector: string;
  people: number;
  approvedRate: number;
}

export interface ExpedienteExpiryItem {
  id: string;
  personName: string;
  providerName: string;
  daysLeft: number;
  status: 'Urgente' | 'Proximo' | 'Seguimiento';
}

export interface ExpedienteRecentMovement {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'alta' | 'revision' | 'observacion' | 'vencimiento';
}

export interface ExpedienteDashboardData {
  adminName: string;
  heroBadge: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  metrics: ExpedienteMetric[];
  statusDistribution: ExpedienteStatusDistributionItem[];
  monthlyTrend: ExpedienteMonthlyTrendItem[];
  peopleByProvider: ExpedienteProviderPeopleItem[];
  quickActions: ExpedienteQuickAction[];
  topProviders: ExpedienteProviderSummary[];
  expiringFiles: ExpedienteExpiryItem[];
  recentMovements: ExpedienteRecentMovement[];
}
