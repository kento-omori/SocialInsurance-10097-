import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfficeListComponent } from './office-list.component';

describe('OfficeListComponent', () => {
  let component: OfficeListComponent;
  let fixture: ComponentFixture<OfficeListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfficeListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
