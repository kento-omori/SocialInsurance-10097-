import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandardBonusAmountComponent } from './standard-bonus-amount.component';

describe('StandardBonusAmountComponent', () => {
  let component: StandardBonusAmountComponent;
  let fixture: ComponentFixture<StandardBonusAmountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandardBonusAmountComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StandardBonusAmountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
