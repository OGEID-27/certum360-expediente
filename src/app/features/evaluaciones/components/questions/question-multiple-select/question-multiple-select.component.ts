import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Question } from '../../../models';

@Component({
  selector: 'app-question-multiple-select',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './question-multiple-select.component.html',
})
export class QuestionMultipleSelectComponent {
  @Input({ required: true }) question!: Question;
  @Input({ required: true }) control!: FormControl<string[] | null>;
  @Input() showErrors = false;

  get options() {
    const config = this.question.config as { opciones?: { id: string; texto: string }[] };
    return config.opciones ?? [];
  }

  isChecked(optionId: string): boolean {
    const value = this.control.value ?? [];
    return value.includes(optionId);
  }

  toggleOption(optionId: string, checked: boolean): void {
    const value = [...(this.control.value ?? [])];
    const next = checked
      ? Array.from(new Set([...value, optionId]))
      : value.filter((id) => id !== optionId);

    this.control.setValue(next);
    this.control.markAsDirty();
    this.control.updateValueAndValidity();
  }

  get showRequiredError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['required'];
  }
}
