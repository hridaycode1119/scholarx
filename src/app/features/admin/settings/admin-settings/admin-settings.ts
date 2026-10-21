import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.scss'
})
export class AdminSettingsComponent {
  readonly passThreshold = signal<number>(50);
  readonly sessionTimeoutMins = signal<number>(60);
  readonly maintenanceMode = signal<boolean>(false);
  readonly proctoringSensitivity = signal<'STANDARD' | 'STRICT' | 'RELAXED'>('STRICT');
  readonly emailAlerts = signal<boolean>(true);
  readonly savedToast = signal<boolean>(false);

  readonly auditLogs = [
    { id: 'log-1', time: 'Today 15:30', actor: 'Admin Sarah', action: 'ONBOARD_INSTITUTION', target: 'Metro Polytechnic Campus (MET-03)', ip: '192.168.1.42' },
    { id: 'log-2', time: 'Today 14:15', actor: 'Prof. Aris Thorne', action: 'PUBLISH_ASSESSMENT', target: 'CS401 Midterm VIVA (asm-401)', ip: '10.0.4.18' },
    { id: 'log-3', time: 'Today 11:00', actor: 'Security Daemon', action: 'AUTO_DEACTIVATE', target: '2 inactive accounts suspended', ip: '127.0.0.1' },
    { id: 'log-4', time: 'Yesterday 18:22', actor: 'Elena Rostova', action: 'UPDATE_OBE_MATRIX', target: 'Horizon Engineering - HEC-02', ip: '172.16.8.9' }
  ];

  saveSettings(): void {
    this.savedToast.set(true);
    setTimeout(() => this.savedToast.set(false), 3000);
  }
}
