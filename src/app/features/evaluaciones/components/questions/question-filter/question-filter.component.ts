import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FilterQuestionConfig, Question } from '../../../models';

@Component({
  selector: 'app-question-filter',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './question-filter.component.html',
})
export class QuestionFilterComponent {
  @Input({ required: true }) question!: Question;
  @Input({ required: true }) control!: FormControl<string | null>;
  @Input() showErrors = false;

  get config(): FilterQuestionConfig {
    return this.question.config as FilterQuestionConfig;
  }

  get options() {
    return this.config.opciones ?? [];
  }

  get rules() {
    return this.config.rules ?? [];
  }

  selectOption(value: string): void {
    this.control.setValue(value);
    this.control.markAsDirty();
    this.control.markAsTouched();
    this.control.updateValueAndValidity();
  }

  isSelected(value: string): boolean {
    return this.control.value === value;
  }

  get selectedRule(): FilterQuestionConfig['rules'][number] | null {
    const selectedValue = this.control.value;
    if (!selectedValue) {
      return null;
    }

    return this.rules.find((rule) => rule.answerValue === selectedValue) ?? null;
  }

  get showRequiredError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['required'];
  }
}
