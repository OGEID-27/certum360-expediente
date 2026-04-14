import { Injectable } from '@angular/core';
import { WeightsValidator } from './weights-validator';

export interface WeightedScoreItem {
  score: number;
  weight: number;
  isScored: boolean;
}

@Injectable({ providedIn: 'root' })
export class ScoringService {
  toDecimal(weight: number): number {
    return WeightsValidator.normalizeWeight(weight) / 100;
  }

  toPercent(decimalScore: number): number {
    const safe = Number.isFinite(decimalScore) ? decimalScore : 0;
    const clamped = Math.min(1, Math.max(0, safe));
    return Math.round(clamped * 10000) / 100;
  }

  calculateWeightedScore(items: WeightedScoreItem[]): number {
    const total = items.reduce((acc, item) => {
      if (!item.isScored) {
        return acc;
      }

      const safeScore = Number.isFinite(item.score) ? Math.min(1, Math.max(0, item.score)) : 0;
      return acc + safeScore * this.toDecimal(item.weight);
    }, 0);

    return Math.min(1, Math.max(0, total));
  }

  getQuestionScore(answered: boolean, correct: boolean): number {
    if (!answered) {
      return 0;
    }

    return correct ? 1 : 0;
  }
}
