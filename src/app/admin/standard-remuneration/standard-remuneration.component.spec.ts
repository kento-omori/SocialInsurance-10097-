import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandardRemunerationComponent } from './standard-remuneration.component';

describe('StandardRemunerationComponent', () => {
  let component: StandardRemunerationComponent;
  let fixture: ComponentFixture<StandardRemunerationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StandardRemunerationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StandardRemunerationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
