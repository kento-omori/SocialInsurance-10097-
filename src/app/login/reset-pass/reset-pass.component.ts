import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-reset-pass',
  standalone: true,
  imports: [],
  templateUrl: './reset-pass.component.html',
  styleUrl: './reset-pass.component.css'
})
export class ResetPassComponent {
  @Output() backToLogin = new EventEmitter<void>();

  onBackToLogin() {
    this.backToLogin.emit();
  }
}
