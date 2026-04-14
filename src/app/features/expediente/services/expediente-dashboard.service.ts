import { Injectable } from '@angular/core';
import { ExpedienteDashboardData } from '../interfaces/expediente-dashboard.interface';
import { EXPEDIENTE_DASHBOARD_MOCK } from '../mocks/expediente-dashboard.mock';

@Injectable({ providedIn: 'root' })
export class ExpedienteDashboardService {
  getDashboardData(): ExpedienteDashboardData {
    return structuredClone(EXPEDIENTE_DASHBOARD_MOCK);
  }
}
