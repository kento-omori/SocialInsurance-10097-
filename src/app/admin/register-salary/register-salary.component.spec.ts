import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterSalaryComponent } from './register-salary.component';

describe('RegisterSalaryComponent', () => {
  let component: RegisterSalaryComponent;
  let fixture: ComponentFixture<RegisterSalaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterSalaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterSalaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
