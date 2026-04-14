import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Question } from '../../../models';

@Component({
  selector: 'app-question-multiple',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './question-multiple.component.html',
})
export class QuestionMultipleComponent {
  @Input({ required: true }) question!: Question;
  @Input({ required: true }) control!: FormControl<string[] | null>;
  @Input() showErrors = false;

  get options() {
    const config = this.question.config as { opciones?: { id: string; texto: string }[] };
    return config.opciones ?? [];
  }

  get isMultiple(): boolean {
    const config = this.question.config as { multiple?: boolean };
    return config.multiple ?? false;
  }

  isChecked(optionId: string): boolean {
    const value = this.control.value ?? [];
    return value.includes(optionId);
  }

  toggleOption(optionId: string, checked: boolean): void {
    const value = [...(this.control.value ?? [])];

    if (this.isMultiple) {
      const next = checked
        ? Array.from(new Set([...value, optionId]))
        : value.filter((id) => id !== optionId);
      this.control.setValue(next);
      this.control.markAsDirty();
      return;
    }

    this.control.setValue(checked ? [optionId] : []);
    this.control.markAsDirty();
  }

  get showRequiredError(): boolean {
    return this.control.invalid && (this.control.touched || this.showErrors);
  }
}

