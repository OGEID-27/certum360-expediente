
import { Component, Input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-component-card',
  imports: [LucideAngularModule],
  templateUrl: './component-card.component.html',
  styles: ``
})
export class ComponentCardComponent {

  @Input() title!: string;
  @Input() desc: string = '';
  @Input() className: string = '';
  @Input() titleIcon?: unknown;
  @Input() titleIconClass = 'h-4 w-4 text-gray-600 dark:text-gray-300';
}
