import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Question } from '../../../models';

@Component({
  selector: 'app-question-numeric-scale',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './question-numeric-scale.component.html',
})
export class QuestionNumericScaleComponent {
  @Input({ required: true }) question!: Question;
  @Input({ required: true }) control!: FormControl<number | null>;
  @Input() showErrors = false;

  get minValue(): number {
    const config = this.question.config as { min?: number };
    return typeof config.min === 'number' ? config.min : 1;
  }

  get maxValue(): number {
    const config = this.question.config as { max?: number };
    return typeof config.max === 'number' ? config.max : 5;
  }

  get stepValue(): number {
    const config = this.question.config as { step?: number };
    return typeof config.step === 'number' && config.step > 0 ? config.step : 1;
  }

  get values(): number[] {
    const values: number[] = [];
    const min = this.minValue;
    const max = this.maxValue;
    const step = this.stepValue;

    for (let current = min; current <= max; current += step) {
      values.push(Number(current.toFixed(4)));
    }

    return values;
  }

  selectValue(value: number): void {
    this.control.setValue(value);
    this.control.markAsDirty();
    this.control.markAsTouched();
    this.control.updateValueAndValidity();
  }

  isSelected(value: number): boolean {
    return this.control.value === value;
  }

  get showRequiredError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['required'];
  }
}
