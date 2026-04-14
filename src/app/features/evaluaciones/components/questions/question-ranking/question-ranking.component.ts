import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArrowDown, ArrowUp, GripVertical, LucideAngularModule } from 'lucide-angular';
import { Question } from '../../../models';

@Component({
  selector: 'app-question-ranking',
  imports: [CommonModule, ReactiveFormsModule, CdkDropList, CdkDrag, CdkDragPlaceholder, LucideAngularModule],
  templateUrl: './question-ranking.component.html',
})
export class QuestionRankingComponent implements OnInit, OnChanges {
  @Input({ required: true }) question!: Question;
  @Input({ required: true }) control!: FormControl<string[] | null>;
  @Input() showErrors = false;

  readonly ArrowUp = ArrowUp;
  readonly ArrowDown = ArrowDown;
  readonly GripVertical = GripVertical;

  ngOnInit(): void {
    this.ensureOrder();
  }

  ngOnChanges(): void {
    this.ensureOrder();
  }

  get orderedOptionIds(): string[] {
    return this.control.value ?? [];
  }

  get optionsMap(): Map<string, string> {
    const config = this.question.config as { opciones?: { id: string; texto: string }[] };
    const options = config.opciones ?? [];
    return new Map(options.map((option) => [option.id, option.texto]));
  }

  moveUp(index: number): void {
    if (index <= 0) {
      return;
    }
    this.move(index, index - 1);
  }

  moveDown(index: number): void {
    if (index >= this.orderedOptionIds.length - 1) {
      return;
    }
    this.move(index, index + 1);
  }

  onDrop(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const next = [...this.orderedOptionIds];
    moveItemInArray(next, event.previousIndex, event.currentIndex);

    this.control.setValue(next);
    this.control.markAsDirty();
    this.control.markAsTouched();
    this.control.updateValueAndValidity();
  }

  getOptionText(optionId: string): string {
    return this.optionsMap.get(optionId) ?? optionId;
  }

  get showRequiredError(): boolean {
    if (!this.control.errors) {
      return false;
    }
    return (this.control.touched || this.showErrors) && !!this.control.errors['required'];
  }

  private move(fromIndex: number, toIndex: number): void {
    const next = [...this.orderedOptionIds];
    const [item] = next.splice(fromIndex, 1);
    if (!item) {
      return;
    }
    next.splice(toIndex, 0, item);

    this.control.setValue(next);
    this.control.markAsDirty();
    this.control.markAsTouched();
    this.control.updateValueAndValidity();
  }

  private ensureOrder(): void {
    const config = this.question.config as { opciones?: { id: string; texto: string }[] };
    const optionIds = (config.opciones ?? []).map((option) => option.id);

    const current = Array.isArray(this.control.value) ? this.control.value : [];
    const sanitized = current.filter((id) => optionIds.includes(id));
    const missing = optionIds.filter((id) => !sanitized.includes(id));
    const next = [...sanitized, ...missing];

    if (!this.areArraysEqual(current, next)) {
      this.control.setValue(next);
      this.control.updateValueAndValidity();
    }
  }

  private areArraysEqual(a: readonly string[], b: readonly string[]): boolean {
    if (a.length !== b.length) {
      return false;
    }

    return a.every((value, index) => value === b[index]);
  }
}
