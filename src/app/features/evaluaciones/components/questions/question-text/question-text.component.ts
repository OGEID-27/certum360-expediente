import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Question } from '../../../models';

@Component({
  selector: 'app-question-text',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './question-text.component.html',
})
export class QuestionTextComponent {
  @Input({ required: true }) question!: Question;
  @Input({ required: true }) control!: FormControl<string | null>;
  @Input() showErrors = false;

  get placeholder(): string {
    const config = this.question.config as { placeholder?: string };
    return config.placeholder ?? 'Escribe tu respuesta';
  }

  get minLength(): number | null {
    const config = this.question.config as { minLength?: number };
    return config.minLength ?? null;
  }

  get maxLength(): number | null {
    const config = this.question.config as { maxLength?: number };
    return config.maxLength ?? null;
  }

  get showRequiredError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['required'];
  }

  get showMinError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['minlength'];
  }

  get showMaxError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['maxlength'];
  }
}

