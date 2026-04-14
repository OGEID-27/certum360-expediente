import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTheme,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleAlert,
  ClipboardList,
  Clock,
  DollarSign,
  FileCheck2,
  LayoutDashboard,
  Layers3,
  LucideAngularModule,
  LucideIconData,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-angular';
import {
  DashboardHealthCard,
  MoonTestDashboardAssignment,
  MoonTestDashboardSummary,
  getMoonTestDashboardSummary,
  getPaymentStatusClass,
  getPaymentStatusLabel,
} from './moon-test-dashboard.data';
import { SessionRoleService } from '../../../core/services/session-role.service';

type DashboardKpi = {
  id: string;
  title: string;
  value: string;
  detail: string;
  icon: LucideIconData;
  toneClass: string;
  valueClass?: string;
};

type DashboardData = {
  userName: string;
  summary: MoonTestDashboardSummary;
  kpis: DashboardKpi[];
};

@Component({
  selector: 'app-ecommerce',
  imports: [CommonModule, LucideAngularModule, NgApexchartsModule],
  templateUrl: './ecommerce.component.html',
})
export class EcommerceComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly sessionRoleService = inject(SessionRoleService);

  readonly LayoutDashboard = LayoutDashboard;
  readonly RefreshCcw = RefreshCcw;
  readonly ArrowRight = ArrowRight;
  readonly Building2 = Building2;
  readonly Users = Users;
  readonly BadgeCheck = BadgeCheck;
  readonly ClipboardList = ClipboardList;
  readonly DollarSign = DollarSign;
  readonly Clock = Clock;
  readonly FileCheck2 = FileCheck2;
  readonly Layers3 = Layers3;
  readonly ShieldCheck = ShieldCheck;
  readonly CircleAlert = CircleAlert;

  readonly kpiSkeleton = Array.from({ length: 6 });
  readonly listSkeleton = Array.from({ length: 5 });
  readonly heroImageSrc = '/images/dashboard/character_dashboard.png';

  isLoading = true;
  isDarkMode = false;
  userName = 'Roberto';
  kpis: DashboardKpi[] = [];
  summary: MoonTestDashboardSummary = getMoonTestDashboardSummary();

  donutSeries: ApexNonAxisChartSeries = [];
  donutLabels: string[] = [];
  donutChart: ApexChart = { type: 'donut' };
  donutLegend: ApexLegend = {};
  donutStroke: ApexStroke = {};
  donutPlotOptions: ApexPlotOptions = {};
  donutDataLabels: ApexDataLabels = {};
  donutTooltip: ApexTooltip = {};
  donutTheme: ApexTheme = {};
  donutResponsive: ApexResponsive[] = [];
  donutColors: string[] = [];

  activitySeries: ApexAxisChartSeries = [];
  activityChart: ApexChart = { type: 'area' };
  activityXAxis: ApexXAxis = {};
  activityYAxis: ApexYAxis = {};
  activityGrid: ApexGrid = {};
  activityStroke: ApexStroke = {};
  activityFill: ApexFill = {};
  activityLegend: ApexLegend = {};
  activityDataLabels: ApexDataLabels = {};
  activityTooltip: ApexTooltip = {};
  activityTheme: ApexTheme = {};
  activityColors: string[] = [];

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private themeObserver: MutationObserver | null = null;

  ngOnInit(): void {
    this.isDarkMode = this.document.documentElement.classList.contains('dark');
    this.bindThemeObserver();
    this.refreshDashboard();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.themeObserver?.disconnect();
  }

  get latestAssignments(): MoonTestDashboardAssignment[] {
    return this.summary.latestAssignments;
  }

  get healthCards(): DashboardHealthCard[] {
    return this.summary.healthCards;
  }

  refreshDashboard(): void {
    this.isLoading = true;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      const dashboardData = this.getDashboardData();
      this.summary = dashboardData.summary;
      this.userName = dashboardData.userName;
      this.kpis = dashboardData.kpis;
      this.configureCharts();
      this.isLoading = false;
    }, 260);
  }

  openAssignments(): void {
    this.router.navigate(['/evaluaciones/admin/asignaciones']);
  }

  getPaymentStatusLabel = getPaymentStatusLabel;
  getPaymentStatusClass = getPaymentStatusClass;

  trackByKpi(_: number, item: DashboardKpi): string {
    return item.id;
  }

  trackByAssignment(_: number, item: MoonTestDashboardAssignment): string {
    return item.id;
  }

  trackByTop(_: number, item: MoonTestDashboardSummary['topCertifications'][number]): string {
    return item.id;
  }

  trackByHealth(_: number, item: DashboardHealthCard): string {
    return item.id;
  }

  getInitials(name: string): string {
    const segments = name
      .split(/\s+/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    if (segments.length === 0) {
      return 'MT';
    }

    if (segments.length === 1) {
      return segments[0].slice(0, 2).toUpperCase();
    }

    return `${segments[0][0] ?? ''}${segments[1][0] ?? ''}`.toUpperCase();
  }

  getHealthIcon(card: DashboardHealthCard): LucideIconData {
    switch (card.iconKey) {
      case 'questions':
        return this.FileCheck2;
      case 'sections':
        return this.Layers3;
      case 'questionnaires':
        return this.ClipboardList;
      case 'certifications':
        return this.BadgeCheck;
      case 'operation-ok':
        return this.ShieldCheck;
      default:
        return this.CircleAlert;
    }
  }

  formatAssignmentAmount(assignment: MoonTestDashboardAssignment): string {
    return `${assignment.currency} ${this.formatCurrency(assignment.price, assignment.currency)}`;
  }

  formatTopCertificationRevenue(label: string): string {
    return label.replace('Â·', '·');
  }

  private getDashboardData(): DashboardData {
    const summary = getMoonTestDashboardSummary();
    const certificationsDetail =
      summary.healthCards.find((card) => card.id === 'certifications-ready')?.detail ??
      'Sin contenido certificado';

    return {
      userName: this.getCurrentUserName(),
      summary,
      kpis: [
        {
          id: 'clients',
          title: 'Clientes',
          value: this.formatCount(summary.totalClients),
          detail: summary.metrics.find((metric) => metric.id === 'clients')?.detail ?? 'Alta-clientes',
          icon: this.Building2,
          toneClass:
            'bg-brand-500/10 text-brand-700 ring-brand-500/20 dark:bg-brand-500/15 dark:text-brand-200',
        },
        {
          id: 'users',
          title: 'Usuarios',
          value: this.formatCount(summary.totalUsers),
          detail: summary.metrics.find((metric) => metric.id === 'users')?.detail ?? 'Usuarios vinculados',
          icon: this.Users,
          toneClass:
            'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-200',
        },
        {
          id: 'certifications',
          title: 'Certificaciones',
          value: this.formatCount(summary.totalCertifications),
          detail: certificationsDetail,
          icon: this.BadgeCheck,
          toneClass:
            'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200',
        },
        {
          id: 'assignments',
          title: 'Asignaciones',
          value: this.formatCount(summary.totalAssignments),
          detail:
            summary.metrics.find((metric) => metric.id === 'assignments')?.detail ??
            'Seguimiento comercial reciente',
          icon: this.ClipboardList,
          toneClass:
            'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:bg-violet-500/15 dark:text-violet-200',
        },
        {
          id: 'revenue',
          title: 'Ingresos esperados',
          value: this.formatRevenueKpi(summary),
          detail: 'Cobro proyectado por moneda',
          icon: this.DollarSign,
          toneClass:
            'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-200',
          valueClass: 'text-lg sm:text-xl xl:text-[1.05rem] 2xl:text-xl',
        },
        {
          id: 'pending',
          title: 'Pagos pendientes',
          value: this.formatCount(summary.pendingPayments),
          detail:
            summary.pendingPayments > 0
              ? 'PENDING + WAITING por validar'
              : 'Sin pagos pendientes',
          icon: this.Clock,
          toneClass:
            'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-200',
        },
      ],
    };
  }

  private configureCharts(): void {
    this.configureDonutChart();
    this.configureActivityChart();
  }

  private configureDonutChart(): void {
    this.donutSeries = this.summary.statusSeries.map((item) => item.total);
    this.donutLabels = this.summary.statusSeries.map((item) => item.label);
    this.donutChart = {
      type: 'donut',
      height: 320,
      fontFamily: 'Outfit, sans-serif',
      background: 'transparent',
      toolbar: { show: false },
    };
    this.donutLegend = {
      show: true,
      position: 'right',
      fontSize: '12px',
      labels: { colors: this.isDarkMode ? '#CBD5E1' : '#475569' },
      itemMargin: { horizontal: 10, vertical: 8 },
    };
    this.donutStroke = { width: 0 };
    this.donutPlotOptions = {
      pie: {
        donut: {
          size: '74%',
          labels: {
            show: true,
            name: {
              show: true,
              color: this.isDarkMode ? '#94A3B8' : '#64748B',
              offsetY: 18,
            },
            total: {
              show: true,
              label: 'Total',
              color: this.isDarkMode ? '#E2E8F0' : '#111827',
              formatter: () => `${this.summary.totalAssignments}`,
            },
            value: {
              color: this.isDarkMode ? '#F8FAFC' : '#111827',
              fontSize: '26px',
              fontWeight: '700',
              offsetY: -14,
            },
          },
        },
      },
    };
    this.donutDataLabels = { enabled: false };
    this.donutTooltip = {
      theme: this.isDarkMode ? 'dark' : 'light',
      y: { formatter: (value: number) => `${value} asignaciones` },
    };
    this.donutTheme = { mode: this.isDarkMode ? 'dark' : 'light' };
    this.donutResponsive = [
      {
        breakpoint: 1280,
        options: {
          legend: { position: 'bottom' },
          chart: { height: 360, background: 'transparent' },
        },
      },
    ];
    this.donutColors = ['#22C55E', '#60A5FA', '#F59E0B', '#F87171'];
  }

  private configureActivityChart(): void {
    this.activitySeries = [
      {
        name: 'Asignaciones',
        data: this.summary.monthlyActivity.map((item) => item.total),
      },
    ];
    this.activityChart = {
      type: 'area',
      height: 320,
      fontFamily: 'Outfit, sans-serif',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
    };
    this.activityXAxis = {
      categories: this.summary.monthlyActivity.map((item) => item.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: this.isDarkMode ? '#94A3B8' : '#64748B',
          fontSize: '12px',
        },
      },
    };
    this.activityYAxis = {
      min: 0,
      tickAmount: 4,
      labels: {
        style: {
          colors: this.isDarkMode ? '#94A3B8' : '#64748B',
          fontSize: '12px',
        },
        formatter: (value: number) => `${Math.round(value)}`,
      },
    };
    this.activityGrid = {
      borderColor: this.isDarkMode ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.18)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    };
    this.activityStroke = {
      curve: 'smooth',
      width: 3,
    };
    this.activityFill = {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.25,
        opacityTo: 0.02,
        stops: [0, 90, 100],
      },
    };
    this.activityLegend = { show: false };
    this.activityDataLabels = { enabled: false };
    this.activityTooltip = {
      theme: this.isDarkMode ? 'dark' : 'light',
      y: { formatter: (value: number) => `${value} asignaciones` },
    };
    this.activityTheme = { mode: this.isDarkMode ? 'dark' : 'light' };
    this.activityColors = ['#5B67F1'];
  }

  private bindThemeObserver(): void {
    this.themeObserver = new MutationObserver(() => {
      const nextValue = this.document.documentElement.classList.contains('dark');
      if (nextValue === this.isDarkMode) {
        return;
      }

      this.isDarkMode = nextValue;
      this.configureCharts();
    });

    this.themeObserver.observe(this.document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  private getCurrentUserName(): string {
    return this.sessionRoleService.getSession()?.name.split(' ')[0] ?? 'Roberto';
  }

  private formatRevenueKpi(summary: MoonTestDashboardSummary): string {
    return `MXN ${this.formatCurrency(summary.revenueByCurrency.MXN, 'MXN')} · USD ${this.formatCurrency(summary.revenueByCurrency.USD, 'USD')}`;
  }

  private formatCount(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      notation: value >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(value);
  }

  private formatCurrency(value: number, currency: 'MXN' | 'USD'): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
}
