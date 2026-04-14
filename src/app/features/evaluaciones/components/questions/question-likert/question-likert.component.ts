import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Question } from '../../../models';

@Component({
  selector: 'app-question-likert',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './question-likert.component.html',
})
export class QuestionLikertComponent {
  @Input({ required: true }) question!: Question;
  @Input({ required: true }) control!: FormControl<string | null>;
  @Input() showErrors = false;

  get levels(): string[] {
    const config = this.question.config as { levels?: string[] };
    return config.levels && config.levels.length > 0
      ? config.levels
      : [
          'Totalmente en desacuerdo',
          'En desacuerdo',
          'Ni de acuerdo ni en desacuerdo',
          'De acuerdo',
          'Totalmente de acuerdo',
        ];
  }

  selectLevel(level: string): void {
    this.control.setValue(level);
    this.control.markAsDirty();
    this.control.markAsTouched();
    this.control.updateValueAndValidity();
  }

  isSelected(level: string): boolean {
    return this.control.value === level;
  }

  get showRequiredError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['required'];
  }
}
