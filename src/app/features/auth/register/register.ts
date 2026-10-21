import { Component } from '@angular/core';
import { LoginComponent } from '../login/login';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [LoginComponent],
  template: `<app-login></app-login>`
})
export class RegisterComponent {}
