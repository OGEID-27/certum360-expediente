import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MixtaAnswerValue, Question } from '../../../models';

@Component({
  selector: 'app-question-mixta',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './question-mixta.component.html',
})
export class QuestionMixtaComponent {
  @Input({ required: true }) question!: Question;
  @Input({ required: true }) control!: FormControl<MixtaAnswerValue | null>;
  @Input() showErrors = false;

  private readonly defaultOtherOptionValue = '__other__';

  get options() {
    const config = this.question.config as { opciones?: { id: string; texto: string }[] };
    return config.opciones ?? [];
  }

  get isMultiple(): boolean {
    const config = this.question.config as { multiple?: boolean };
    return config.multiple ?? false;
  }

  get otherOptionValue(): string {
    const config = this.question.config as { otherOptionValue?: string };
    return config.otherOptionValue ?? this.defaultOtherOptionValue;
  }

  get otherLabel(): string {
    const config = this.question.config as { otherLabel?: string };
    return config.otherLabel ?? 'Otros';
  }

  get otherPlaceholder(): string {
    const config = this.question.config as { otherPlaceholder?: string };
    return config.otherPlaceholder ?? 'Especifica tu respuesta';
  }

  isChecked(optionId: string): boolean {
    return (this.control.value?.selectedOptionIds ?? []).includes(optionId);
  }

  toggleOption(optionId: string, checked: boolean): void {
    const current = this.getCurrentValue();

    if (this.isMultiple) {
      const selectedOptionIds = checked
        ? Array.from(new Set([...current.selectedOptionIds, optionId]))
        : current.selectedOptionIds.filter((id) => id !== optionId);

      const next: MixtaAnswerValue = {
        selectedOptionIds,
      };

      if (selectedOptionIds.includes(this.otherOptionValue) && current.otherText) {
        next.otherText = current.otherText;
      }

      this.control.setValue(next);
      this.control.markAsDirty();
      this.control.updateValueAndValidity();
      return;
    }

    if (!checked) {
      this.control.setValue({ selectedOptionIds: [] });
      this.control.markAsDirty();
      this.control.updateValueAndValidity();
      return;
    }

    const next: MixtaAnswerValue = { selectedOptionIds: [optionId] };
    if (optionId === this.otherOptionValue && current.otherText) {
      next.otherText = current.otherText;
    }

    this.control.setValue(next);
    this.control.markAsDirty();
    this.control.updateValueAndValidity();
  }

  toggleOther(checked: boolean): void {
    this.toggleOption(this.otherOptionValue, checked);
  }

  updateOtherText(value: string): void {
    const current = this.getCurrentValue();
    const next: MixtaAnswerValue = {
      selectedOptionIds: current.selectedOptionIds,
      otherText: value,
    };

    this.control.setValue(next);
    this.control.markAsDirty();
    this.control.updateValueAndValidity();
  }

  get showOtherTextInput(): boolean {
    return this.isChecked(this.otherOptionValue);
  }

  get showRequiredError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['required'];
  }

  private getCurrentValue(): MixtaAnswerValue {
    const current = this.control.value;
    if (!current) {
      return { selectedOptionIds: [] };
    }

    return {
      selectedOptionIds: Array.isArray(current.selectedOptionIds) ? current.selectedOptionIds : [],
      otherText: current.otherText,
    };
  }
}
