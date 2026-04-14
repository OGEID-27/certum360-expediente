import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FileAnswerValue, Question } from '../../../models';

@Component({
  selector: 'app-question-file',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './question-file.component.html',
})
export class QuestionFileComponent {
  @Input({ required: true }) question!: Question;
  @Input({ required: true }) control!: FormControl<FileAnswerValue | null>;
  @Input() showErrors = false;

  fileError = '';

  get allowedExtensions(): string[] {
    const config = this.question.config as { allowedExtensions?: string[] };
    return config.allowedExtensions ?? [];
  }

  get maxSizeMB(): number | null {
    const config = this.question.config as { maxSizeMB?: number };
    return config.maxSizeMB ?? null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.fileError = '';

    if (!file) {
      this.control.setValue(null);
      this.control.markAsDirty();
      this.control.updateValueAndValidity();
      return;
    }

    const extension = file.name.includes('.')
      ? file.name.split('.').pop()?.toLowerCase() ?? ''
      : '';

    if (this.allowedExtensions.length > 0 && !this.allowedExtensions.includes(extension)) {
      this.fileError = `Formato no permitido. Usa: ${this.allowedExtensions.join(', ')}`;
      this.control.setErrors({ ...(this.control.errors ?? {}), invalidFile: true });
      return;
    }

    const maxSizeBytes = this.maxSizeMB ? this.maxSizeMB * 1024 * 1024 : null;
    if (maxSizeBytes && file.size > maxSizeBytes) {
      this.fileError = `El archivo supera ${this.maxSizeMB} MB.`;
      this.control.setErrors({ ...(this.control.errors ?? {}), invalidFile: true });
      return;
    }

    this.control.setValue({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    this.control.setErrors(null);
    this.control.markAsDirty();
    this.control.updateValueAndValidity();
  }

  clearFile(): void {
    this.fileError = '';
    this.control.setValue(null);
    this.control.markAsDirty();
    this.control.updateValueAndValidity();
  }

  get showRequiredError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['required'];
  }

  get showInvalidFileError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['invalidFile'];
  }
}

