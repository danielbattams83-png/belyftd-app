import {ChangeDetectionStrategy, Component, computed, inject, input, signal} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {CurriculumService} from '../services/curriculum.service';

@Component({
  selector: 'app-courses-curriculum',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './courses-curriculum.component.html',
  styleUrl: './courses-curriculum.component.scss',
})
export class CoursesCurriculumComponent {
  readonly curriculum = inject(CurriculumService);
  readonly filter = input<'all' | 'completed' | 'in-progress'>('all');
  readonly visibleModules = computed(() => this.curriculum.modules().map(module => ({
    ...module,
    allUnitCount: module.units.length,
    percent: this.curriculum.completionPercent(module),
    units: module.units.filter(unit => this.filter() === 'all' ||
      (this.filter() === 'completed' ? this.curriculum.isCompleted(module.id, unit.id) : !this.curriculum.isCompleted(module.id, unit.id))),
  })).filter(module => module.units.length));
  readonly defaultExpanded = computed(() => this.visibleModules().find(module => this.curriculum.canAccess(module.id) && module.percent < 100)?.id
    ?? this.visibleModules().find(module => this.curriculum.canAccess(module.id))?.id
    ?? this.visibleModules()[0]?.id);
  private readonly expansion = signal<Record<string, boolean>>({});
  isExpanded(id: string): boolean { return this.expansion()[id] ?? this.defaultExpanded() === id; }
  onToggle(id: string, event: Event): void {
    const open = (event.target as HTMLDetailsElement).open;
    if (open !== this.isExpanded(id)) this.expansion.update(current => ({...current, [id]: open}));
  }
}
