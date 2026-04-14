export type WeightStatus = 'DRAFT' | 'READY';

export class WeightsValidator {
  private static readonly TARGET_TOTAL = 100;

  static normalizeWeight(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    const rounded = Math.round(parsed * 100) / 100;
    return Math.min(this.TARGET_TOTAL, Math.max(0, rounded));
  }

  static sumWeights(items: Array<{ isScored: boolean; weight: number }>): number {
    const total = items.reduce((acc, item) => {
      if (!item.isScored) {
        return acc;
      }

      return acc + this.normalizeWeight(item.weight);
    }, 0);

    return Math.round(total * 100) / 100;
  }

  static getRemaining(total: number): number {
    return Math.max(0, this.TARGET_TOTAL - this.normalizeWeight(total));
  }

  static isOverLimit(total: number): boolean {
    return this.normalizeWeight(total) > this.TARGET_TOTAL;
  }

  static hasExactTotal(total: number): boolean {
    return Math.abs(this.normalizeWeight(total) - this.TARGET_TOTAL) < 0.001;
  }

  static canPublish(isScored: boolean, total: number): boolean {
    if (!isScored) {
      return true;
    }

    return this.hasExactTotal(total);
  }

  static getMaxAllowedForRow(othersTotal: number): number {
    return Math.max(0, this.TARGET_TOTAL - this.normalizeWeight(othersTotal));
  }

  static getStatus(isScored: boolean, total: number): WeightStatus {
    if (!isScored) {
      return 'READY';
    }

    return this.hasExactTotal(total) ? 'READY' : 'DRAFT';
  }
}