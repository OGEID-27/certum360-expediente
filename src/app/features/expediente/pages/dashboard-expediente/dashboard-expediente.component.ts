import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
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
  BookUser,
  Building2,
  CircleAlert,
  ClipboardList,
  Clock,
  FileCheck2,
  FolderOpen,
  LayoutDashboard,
  LucideAngularModule,
  LucideIconData,
  NotebookPen,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-angular';
import { ExpedienteDashboardService } from '../../services/expediente-dashboard.service';
import {
  ExpedienteDashboardData,
  ExpedienteExpiryItem,
  ExpedienteMetric,
  ExpedienteQuickAction,
  ExpedienteRecentMovement,
} from '../../interfaces/expediente-dashboard.interface';

@Component({
  selector: 'app-dashboard-expediente',
  imports: [CommonModule, LucideAngularModule, NgApexchartsModule],
  templateUrl: './dashboard-expediente.component.html',
})
export class DashboardExpedienteComponent implements OnInit, OnDestroy {
  private readonly expedienteDashboardService = inject(ExpedienteDashboardService);
  private readonly document = inject(DOCUMENT);

  readonly LayoutDashboard = LayoutDashboard;
  readonly RefreshCcw = RefreshCcw;
  readonly ArrowRight = ArrowRight;
  readonly FolderOpen = FolderOpen;
  readonly Clock = Clock;
  readonly heroImageSrc = '/images/dashboard/character_dashboard.png';
  readonly metricSkeleton = Array.from({ length: 6 });
  readonly listSkeleton = Array.from({ length: 4 });

  isLoading = true;
  isDarkMode = false;
  dashboardData: ExpedienteDashboardData =
    this.expedienteDashboardService.getDashboardData();

  statusSeries: ApexNonAxisChartSeries = [];
  statusLabels: string[] = [];
  statusChart: ApexChart = { type: 'donut' };
  statusLegend: ApexLegend = {};
  statusStroke: ApexStroke = {};
  statusPlotOptions: ApexPlotOptions = {};
  statusDataLabels: ApexDataLabels = {};
  statusTooltip: ApexTooltip = {};
  statusTheme: ApexTheme = {};
  statusResponsive: ApexResponsive[] = [];
  statusColors: string[] = [];

  trendSeries: ApexAxisChartSeries = [];
  trendChart: ApexChart = { type: 'area' };
  trendXAxis: ApexXAxis = {};
  trendYAxis: ApexYAxis = {};
  trendGrid: ApexGrid = {};
  trendStroke: ApexStroke = {};
  trendFill: ApexFill = {};
  trendLegend: ApexLegend = {};
  trendDataLabels: ApexDataLabels = {};
  trendTooltip: ApexTooltip = {};
  trendTheme: ApexTheme = {};
  trendColors: string[] = [];

  providerSeries: ApexAxisChartSeries = [];
  providerChart: ApexChart = { type: 'bar' };
  providerXAxis: ApexXAxis = {};
  providerYAxis: ApexYAxis = {};
  providerGrid: ApexGrid = {};
  providerPlotOptions: ApexPlotOptions = {};
  providerDataLabels: ApexDataLabels = {};
  providerTooltip: ApexTooltip = {};
  providerTheme: ApexTheme = {};
  providerColors: string[] = [];

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

  get metrics(): ExpedienteMetric[] {
    return this.dashboardData?.metrics ?? [];
  }

  get quickActions(): ExpedienteQuickAction[] {
    return this.dashboardData?.quickActions ?? [];
  }

  get expiringFiles(): ExpedienteExpiryItem[] {
    return this.dashboardData?.expiringFiles ?? [];
  }

  get recentMovements(): ExpedienteRecentMovement[] {
    return this.dashboardData?.recentMovements ?? [];
  }

  refreshDashboard(): void {
    this.isLoading = true;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = setTimeout(() => {
      this.dashboardData = this.expedienteDashboardService.getDashboardData();
      this.configureCharts();
      this.isLoading = false;
    }, 260);
  }

  jumpToSection(sectionId: string): void {
    this.document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  trackByMetric(_: number, item: ExpedienteMetric): string {
    return item.id;
  }

  trackByAction(_: number, item: ExpedienteQuickAction): string {
    return item.id;
  }

  trackByProvider(
    _: number,
    item: ExpedienteDashboardData['topProviders'][number],
  ): string {
    return item.id;
  }

  trackByExpiry(_: number, item: ExpedienteExpiryItem): string {
    return item.id;
  }

  trackByMovement(_: number, item: ExpedienteRecentMovement): string {
    return item.id;
  }

  getMetricIcon(metric: ExpedienteMetric): LucideIconData {
    switch (metric.id) {
      case 'providers':
        return this.Building2;
      case 'people':
        return this.Users;
      case 'approved':
        return this.BadgeCheck;
      case 'pending':
        return this.Clock;
      case 'observed':
        return this.CircleAlert;
      case 'expired':
      default:
        return this.FileCheck2;
    }
  }

  getMetricToneClass(metric: ExpedienteMetric): string {
    switch (metric.id) {
      case 'providers':
        return 'bg-brand-500/10 text-brand-700 ring-brand-500/20 dark:bg-brand-500/15 dark:text-brand-200';
      case 'people':
        return 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-200';
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-200';
      case 'pending':
        return 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-200';
      case 'observed':
        return 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-200';
      case 'expired':
      default:
        return 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:bg-rose-500/15 dark:text-rose-200';
    }
  }

  getQuickActionIcon(action: ExpedienteQuickAction): LucideIconData {
    switch (action.id) {
      case 'providers':
        return this.BookUser;
      case 'review':
        return this.ClipboardList;
      case 'new-person':
        return this.Users;
      case 'templates':
      default:
        return this.NotebookPen;
    }
  }

  getQuickActionTone(action: ExpedienteQuickAction): string {
    switch (action.id) {
      case 'providers':
        return 'bg-brand-500/10 text-brand-700 ring-brand-500/15 dark:bg-brand-500/15 dark:text-brand-200';
      case 'review':
        return 'bg-blue-500/10 text-blue-700 ring-blue-500/15 dark:bg-blue-500/15 dark:text-blue-200';
      case 'new-person':
        return 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/15 dark:bg-emerald-500/15 dark:text-emerald-200';
      case 'templates':
      default:
        return 'bg-violet-500/10 text-violet-700 ring-violet-500/15 dark:bg-violet-500/15 dark:text-violet-200';
    }
  }

  getExpiryBadgeClass(item: ExpedienteExpiryItem): string {
    switch (item.status) {
      case 'Urgente':
        return 'border-error-300 bg-error-50 text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300';
      case 'Proximo':
        return 'border-warning-300 bg-warning-50 text-warning-700 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-300';
      case 'Seguimiento':
      default:
        return 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300';
    }
  }

  getMovementIcon(item: ExpedienteRecentMovement): LucideIconData {
    switch (item.type) {
      case 'alta':
        return this.Users;
      case 'revision':
        return this.ShieldCheck;
      case 'observacion':
        return this.CircleAlert;
      case 'vencimiento':
      default:
        return this.Clock;
    }
  }

  getMovementTone(item: ExpedienteRecentMovement): string {
    switch (item.type) {
      case 'alta':
        return 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200';
      case 'revision':
        return 'bg-brand-500/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200';
      case 'observacion':
        return 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200';
      case 'vencimiento':
      default:
        return 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200';
    }
  }

  private readonly Building2 = Building2;
  private readonly Users = Users;
  private readonly BadgeCheck = BadgeCheck;
  private readonly CircleAlert = CircleAlert;
  private readonly FileCheck2 = FileCheck2;
  private readonly BookUser = BookUser;
  private readonly ClipboardList = ClipboardList;
  private readonly NotebookPen = NotebookPen;
  private readonly ShieldCheck = ShieldCheck;

  private configureCharts(): void {
    this.configureStatusChart();
    this.configureTrendChart();
    this.configureProviderChart();
  }

  private configureStatusChart(): void {
    this.statusSeries = this.dashboardData.statusDistribution.map((item) => item.total);
    this.statusLabels = this.dashboardData.statusDistribution.map((item) => item.label);
    this.statusColors = this.dashboardData.statusDistribution.map((item) => item.color);
    this.statusChart = {
      type: 'donut',
      height: 320,
      fontFamily: 'Outfit, sans-serif',
      background: 'transparent',
      toolbar: { show: false },
    };
    this.statusLegend = {
      show: true,
      position: 'right',
      fontSize: '12px',
      labels: { colors: this.isDarkMode ? '#CBD5E1' : '#475569' },
      itemMargin: { horizontal: 10, vertical: 8 },
    };
    this.statusStroke = { width: 0 };
    this.statusPlotOptions = {
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
              formatter: () =>
                `${this.dashboardData.statusDistribution.reduce(
                  (total, item) => total + item.total,
                  0,
                )}`,
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
    this.statusDataLabels = { enabled: false };
    this.statusTooltip = {
      theme: this.isDarkMode ? 'dark' : 'light',
      y: { formatter: (value: number) => `${value} expedientes` },
    };
    this.statusTheme = { mode: this.isDarkMode ? 'dark' : 'light' };
    this.statusResponsive = [
      {
        breakpoint: 1280,
        options: {
          legend: { position: 'bottom' },
          chart: { height: 360, background: 'transparent' },
        },
      },
    ];
  }

  private configureTrendChart(): void {
    this.trendSeries = [
      {
        name: 'Cargados',
        data: this.dashboardData.monthlyTrend.map((item) => item.loaded),
      },
      {
        name: 'Revisados',
        data: this.dashboardData.monthlyTrend.map((item) => item.reviewed),
      },
    ];
    this.trendChart = {
      type: 'area',
      height: 320,
      fontFamily: 'Outfit, sans-serif',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
    };
    this.trendXAxis = {
      categories: this.dashboardData.monthlyTrend.map((item) => item.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: this.isDarkMode ? '#94A3B8' : '#64748B',
          fontSize: '12px',
        },
      },
    };
    this.trendYAxis = {
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
    this.trendGrid = {
      borderColor: this.isDarkMode
        ? 'rgba(148,163,184,0.14)'
        : 'rgba(148,163,184,0.18)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    };
    this.trendStroke = {
      curve: 'smooth',
      width: 3,
    };
    this.trendFill = {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.25,
        opacityTo: 0.02,
        stops: [0, 90, 100],
      },
    };
    this.trendLegend = {
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: this.isDarkMode ? '#CBD5E1' : '#475569' },
    };
    this.trendDataLabels = { enabled: false };
    this.trendTooltip = {
      theme: this.isDarkMode ? 'dark' : 'light',
      y: { formatter: (value: number) => `${value} expedientes` },
    };
    this.trendTheme = { mode: this.isDarkMode ? 'dark' : 'light' };
    this.trendColors = ['#2563EB', '#14B8A6'];
  }

  private configureProviderChart(): void {
    this.providerSeries = [
      {
        name: 'Personas',
        data: this.dashboardData.peopleByProvider.map((item) => item.totalPeople),
      },
    ];
    this.providerChart = {
      type: 'bar',
      height: 320,
      fontFamily: 'Outfit, sans-serif',
      background: 'transparent',
      toolbar: { show: false },
    };
    this.providerXAxis = {
      categories: this.dashboardData.peopleByProvider.map((item) => item.provider),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: this.isDarkMode ? '#94A3B8' : '#64748B',
          fontSize: '11px',
        },
      },
    };
    this.providerYAxis = {
      labels: {
        style: {
          colors: this.isDarkMode ? '#94A3B8' : '#64748B',
          fontSize: '12px',
        },
      },
    };
    this.providerGrid = {
      borderColor: this.isDarkMode
        ? 'rgba(148,163,184,0.14)'
        : 'rgba(148,163,184,0.18)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    };
    this.providerPlotOptions = {
      bar: {
        borderRadius: 10,
        columnWidth: '42%',
      },
    };
    this.providerDataLabels = { enabled: false };
    this.providerTooltip = {
      theme: this.isDarkMode ? 'dark' : 'light',
      y: { formatter: (value: number) => `${value} personas` },
    };
    this.providerTheme = { mode: this.isDarkMode ? 'dark' : 'light' };
    this.providerColors = ['#5B67F1'];
  }

  private bindThemeObserver(): void {
    this.themeObserver = new MutationObserver(() => {
      const nextValue = this.document.documentElement.classList.contains('dark');
      if (nextValue === this.isDarkMode || !this.dashboardData) {
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
}
