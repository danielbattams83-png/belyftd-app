import {TestBed} from '@angular/core/testing';
import {AudioTrack, Mentor} from '../models/app.models';
import {CurriculumMentorHubComponent} from './curriculum-mentor-hub.component';

const mentor = (id: string): Mentor => ({id, name: id, title: 'Learning mentor', avatar: '/mentor.png', languages: ['English', 'French'], mediaPaths: [], organization: '', bannerGradient: '', specialties: [], bio: '', verified: true, recommendedFor: []});
const track = (id: string, language: string): AudioTrack => ({id, language, title: `Lesson ${id}`, speaker: 'Mentor', speakerRole: '', speakerAvatar: '', category: 'Mindset', duration: '1:00', durationSec: 60, transcript: '', moodTags: [], likes: 0, isFavorite: false});

describe('curriculum mentor audio hub', () => {
  function setup() {
    TestBed.configureTestingModule({imports: [CurriculumMentorHubComponent]});
    const fixture = TestBed.createComponent(CurriculumMentorHubComponent);
    const component = fixture.componentInstance;
    const english = track('english', 'English');
    const french = track('french', 'French');
    const second = track('second', 'English');
    fixture.componentRef.setInput('options', [{mentor: mentor('First'), tracks: [english, french]}, {mentor: mentor('Second'), tracks: [second]}]);
    fixture.detectChanges();
    return {fixture, component, element: fixture.nativeElement as HTMLElement, english, french, second};
  }

  it('plays the selected language and resets selection when switching mentors', () => {
    const {fixture, component, element, french, second} = setup();
    const play = vi.fn();
    component.playRecording.subscribe(play);
    Array.from(element.querySelectorAll<HTMLButtonElement>('.language-chips button')).find(button => button.textContent === 'French')!.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.play-button')!.click();
    expect(play).toHaveBeenLastCalledWith(french);
    element.querySelectorAll<HTMLButtonElement>('.mentor-tabs button')[1].click();
    fixture.detectChanges();
    expect(component.selectedTrack()).toEqual(second);
    element.querySelector<HTMLButtonElement>('.play-button')!.click();
    expect(play).toHaveBeenLastCalledWith(second);
  });

  it('updates the lesson selection and removes unavailable recordings', () => {
    const {fixture, component, element, english} = setup();
    const other = track('other', 'English');
    fixture.componentRef.setInput('options', [{mentor: mentor('First'), tracks: [english, other]}]);
    fixture.detectChanges();
    const select = element.querySelector<HTMLSelectElement>('select')!;
    select.value = other.id;
    select.dispatchEvent(new Event('change'));
    expect(component.selectedTrack()).toEqual(other);
    fixture.componentRef.setInput('options', [{mentor: mentor('First'), tracks: [english]}]);
    fixture.detectChanges();
    expect(component.selectedTrack()).toEqual(english);
    fixture.componentRef.setInput('options', [{mentor: mentor('First'), tracks: []}]);
    fixture.detectChanges();
    expect(element.querySelector('.play-button')).toBeNull();
    expect(element.textContent).toContain('No recordings available');
  });

  it('shows loading, errors and the real mentor chooser without fake recordings', () => {
    const {fixture, component, element} = setup();
    fixture.componentRef.setInput('options', [{mentor: mentor('First'), tracks: []}]);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(element.textContent).toContain('Loading recordings');
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', 'Audio catalog unavailable');
    fixture.detectChanges();
    expect(element.textContent).toContain('Audio catalog unavailable');
    fixture.componentRef.setInput('options', []);
    fixture.componentRef.setInput('signedIn', true);
    fixture.detectChanges();
    const choose = vi.fn();
    component.chooseMentors.subscribe(choose);
    element.querySelector<HTMLButtonElement>('.play-button')!.click();
    expect(choose).toHaveBeenCalledOnce();
    expect(element.textContent).toContain('Choose your mentors');
  });
});
