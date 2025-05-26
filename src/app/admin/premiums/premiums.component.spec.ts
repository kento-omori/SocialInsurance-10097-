import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PremiumsComponent } from './premiums.component';

describe('PremiumsComponent', () => {
  let component: PremiumsComponent;
  let fixture: ComponentFixture<PremiumsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PremiumsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PremiumsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
