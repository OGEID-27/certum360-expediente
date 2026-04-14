import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Question } from '../../../models';

@Component({
  selector: 'app-question-dicotomica',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './question-dicotomica.component.html',
})
export class QuestionDicotomicaComponent {
  @Input({ required: true }) question!: Question;
  @Input({ required: true }) control!: FormControl<boolean | null>;
  @Input() showErrors = false;

  get trueLabel(): string {
    const config = this.question.config as { trueLabel?: string };
    return config.trueLabel ?? 'Si';
  }

  get falseLabel(): string {
    const config = this.question.config as { falseLabel?: string };
    return config.falseLabel ?? 'No';
  }

  setValue(value: boolean): void {
    this.control.setValue(value);
    this.control.markAsDirty();
    this.control.markAsTouched();
    this.control.updateValueAndValidity();
  }

  isSelected(value: boolean): boolean {
    return this.control.value === value;
  }

  get showRequiredError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['required'];
  }
}
