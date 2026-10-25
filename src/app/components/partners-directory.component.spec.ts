import {TestBed} from '@angular/core/testing';
import {FirebaseService} from '../services/firebase.service';
import {partnerFixture} from '../testing/partner.fixture';
import {PartnersDirectoryComponent} from './partners-directory.component';
import {PartnerWithUsComponent} from './partner-page.component';

describe('subscriptions and active partners', () => {
  const getPartners = vi.fn();

  beforeEach(() => {
    getPartners.mockReset();
    getPartners.mockResolvedValue([partnerFixture()]);
    TestBed.configureTestingModule({providers: [{provide: FirebaseService, useValue: {getPartners}}]});
  });

  it('shows all four prices and selection buttons without the removed sections', async () => {
    const fixture = TestBed.createComponent(PartnerWithUsComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    for (const price of ['$14.99', '$29.99', '$49.99', '$69.99']) expect(element.textContent).toContain(price);
    expect(element.querySelectorAll('.plan button')).toHaveLength(4);
    expect(element.textContent).toContain('Our Partners');
    expect(element.textContent).not.toMatch(/Have a Partner Redemption Code|Become a Partner Sponsor|Explore Impact Leader|Explore Enterprise Sponsor/);
    expect(element.querySelector('input')).toBeNull();
    (element.querySelector('.plan button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelector('[role="dialog"]')?.textContent).toContain('Checkout - Starter Partner');
  });

  it('shows active partners with their branding and website links', async () => {
    getPartners.mockResolvedValue([partnerFixture(), {...partnerFixture('inactive'), active: false}]);
    const fixture = TestBed.createComponent(PartnersDirectoryComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.partner-card')).toHaveLength(1);
    const card = element.querySelector('a')!;
    expect(card.textContent).toContain('Harbour City Rowing');
    expect(card.textContent).toContain('Official Performance Partner');
    expect(card.querySelector('img')?.getAttribute('src')).toBe('/partners/harbour-city-rowing.png');
    expect(card.getAttribute('href')).toBe('https://example.org/');
    expect(card.target).toBe('_blank');
    expect(card.rel).toContain('noopener');
  });

  it('falls back to the hub for missing or unsafe website URLs', () => {
    const directory = TestBed.createComponent(PartnersDirectoryComponent).componentInstance;
    for (const websiteUrl of ['', 'invalid', 'javascript:alert(1)']) {
      expect(directory.partnerLink({...partnerFixture(), websiteUrl})).toBe('/p/harbour-city');
    }
  });

  it('shows a retryable error without substituting demo partners', async () => {
    getPartners.mockRejectedValueOnce(new Error('Offline'));
    const fixture = TestBed.createComponent(PartnersDirectoryComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.componentInstance.partners()).toEqual([]);
    await fixture.componentInstance.loadPartners();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.partner-card')).toHaveLength(1);
  });
});
