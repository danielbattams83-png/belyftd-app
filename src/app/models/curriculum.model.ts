export interface CurriculumUnit {
  id: string;
  title: string;
  hasText: boolean;
  hasMedia: boolean;
}

export interface CurriculumModule {
  supplemental?: boolean;
  id: string;
  title: string;
  units: CurriculumUnit[];
}

export function sortCurriculum(modules: readonly CurriculumModule[]): CurriculumModule[] {
  const number = (id: string) => Number(id.split('-').pop());
  return modules.filter(module => /^module-[1-9][0-9]*$/.test(module.id)).map(module => ({
    ...module,
    units: module.units.filter(unit => /^unit-[1-9][0-9]*$/.test(unit.id) && unit.hasText)
      .sort((a, b) => number(a.id) - number(b.id)),
  })).filter(module => module.units.length).sort((a, b) => number(a.id) - number(b.id));
}
