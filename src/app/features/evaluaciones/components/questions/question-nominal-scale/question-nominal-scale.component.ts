import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Question } from '../../../models';

@Component({
  selector: 'app-question-nominal-scale',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './question-nominal-scale.component.html',
})
export class QuestionNominalScaleComponent {
  @Input({ required: true }) question!: Question;
  @Input({ required: true }) control!: FormControl<string | null>;
  @Input() showErrors = false;

  get labels(): string[] {
    const config = this.question.config as { labels?: string[] };
    return config.labels && config.labels.length > 0
      ? config.labels
      : ['Muchas veces', 'A veces', 'Casi nunca', 'Nunca'];
  }

  get orientation(): 'horizontal' | 'vertical' {
    const config = this.question.config as { orientation?: 'horizontal' | 'vertical' };
    return config.orientation ?? 'horizontal';
  }

  selectLabel(label: string): void {
    this.control.setValue(label);
    this.control.markAsDirty();
    this.control.markAsTouched();
    this.control.updateValueAndValidity();
  }

  isSelected(label: string): boolean {
    return this.control.value === label;
  }

  get showRequiredError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['required'];
  }
}
