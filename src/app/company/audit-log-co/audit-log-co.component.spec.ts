import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditLogCoComponent } from './audit-log-co.component';

describe('AuditLogCoComponent', () => {
  let component: AuditLogCoComponent;
  let fixture: ComponentFixture<AuditLogCoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogCoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuditLogCoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
