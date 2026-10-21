import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {PaywallComponent} from './paywall.component';
import {FirebaseService} from '../services/firebase.service';

describe('subscription checkout entitlements', () => {
  it('renders updated module ranges and emits matching checkout payloads for all tiers', () => {
    TestBed.configureTestingModule({imports: [PaywallComponent], providers: [{provide: FirebaseService, useValue: {isLoggedIn: signal(false)}}]});
    const fixture = TestBed.createComponent(PaywallComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const checkout = vi.fn();
    component.checkoutRequested.subscribe(checkout);
    const ranges = [5, 10, 21, 21];
    const prices = [14.99, 29.99, 49.99, 69.99];
    component.plans.forEach((plan, index) => {
      component.choosePlan(plan);
      fixture.detectChanges();
      expect(checkout.mock.calls[index][0]).toMatchObject({tier: index + 1, moduleAccess: ranges[index], price: prices[index], currency: 'USD'});
      expect(fixture.nativeElement.querySelector('.checkout-access').textContent).toContain(`Modules 1-${ranges[index]}`);
    });
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.pricing-grid > .plan').length).toBe(4);
    expect(element.textContent).toContain('All units in Modules 1-5');
    expect(element.textContent).toContain('All units in Modules 1-10');
    expect(element.textContent).toContain('All 21 modules and supplemental reading');
    expect(element.textContent).toContain('does not collect payment');
  });
});
