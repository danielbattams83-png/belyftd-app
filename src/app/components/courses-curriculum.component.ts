import {ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, signal, viewChild} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {CurriculumService} from '../services/curriculum.service';

const RING_RADIUS = 17;

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
  readonly circumference = 2 * Math.PI * RING_RADIUS;
  readonly track = viewChild<ElementRef<HTMLElement>>('track');

  readonly visibleModules = computed(() => this.curriculum.modules().map(module => {
    const completedUnits = module.units.filter(unit => this.curriculum.isCompleted(module.id, unit.id)).length;
    return {
      ...module,
      allUnitCount: module.units.length,
      totalUnits: module.units.length,
      completedUnits,
      percent: this.curriculum.completionPercent(module),
      units: module.units.filter(unit => this.filter() === 'all' ||
        (this.filter() === 'completed' ? this.curriculum.isCompleted(module.id, unit.id) : !this.curriculum.isCompleted(module.id, unit.id))),
    };
  }).filter(module => module.units.length));

  readonly defaultExpanded = computed(() => this.visibleModules().find(module => this.curriculum.canAccess(module.id) && module.percent < 100)?.id
    ?? this.visibleModules().find(module => this.curriculum.canAccess(module.id))?.id
    ?? this.visibleModules()[0]?.id);

  private readonly selectedModuleId = signal<string | null>(null);
  readonly activeModuleId = computed(() => {
    const selected = this.selectedModuleId();
    return selected && this.visibleModules().some(module => module.id === selected) ? selected : this.defaultExpanded();
  });
  readonly activeModule = computed(() => this.visibleModules().find(module => module.id === this.activeModuleId()));
  readonly activeModuleList = computed(() => {
    const module = this.activeModule();
    return module ? [module] : [];
  });

  private initiallyCentered = false;

  constructor() {
    effect(() => {
      const track = this.track()?.nativeElement;
      const activeId = this.activeModuleId();
      if (!track || !activeId || this.initiallyCentered || typeof requestAnimationFrame === 'undefined') return;
      this.initiallyCentered = true;
      requestAnimationFrame(() => {
        const card = track.querySelector<HTMLElement>('.module-card.is-active');
        if (card) track.scrollLeft = card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2;
      });
    });
  }

  calculateOffset(percent: number): number {
    return this.circumference * (1 - percent / 100);
  }

  moduleNumber(id: string): string {
    return id.split('-')[1].padStart(2, '0');
  }

  unitNumber(id: string): string {
    return id.split('-')[1];
  }

  private get scrollBehavior(): ScrollBehavior {
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reduced ? 'auto' : 'smooth';
  }

  selectModule(moduleId: string, event?: Event): void {
    this.selectedModuleId.set(moduleId);
    if (event?.currentTarget) {
      (event.currentTarget as HTMLElement).scrollIntoView({behavior: this.scrollBehavior, inline: 'center', block: 'nearest'});
    }
  }

  scrollTrack(direction: -1 | 1): void {
    this.track()?.nativeElement.scrollBy({left: direction * 330, behavior: this.scrollBehavior});
  }
}
