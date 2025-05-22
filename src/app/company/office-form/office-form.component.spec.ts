import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfficeFormComponent } from './office-form.component';

describe('OfficeFormComponent', () => {
  let component: OfficeFormComponent;
  let fixture: ComponentFixture<OfficeFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfficeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
