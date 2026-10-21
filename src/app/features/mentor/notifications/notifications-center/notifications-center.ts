import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { MentorNotification } from '../../../../core/models';

@Component({
  selector: 'app-notifications-center',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notifications-center.html',
  styleUrl: './notifications-center.scss'
})
export class NotificationsCenterComponent implements OnInit {
  private readonly provider = inject(DATA_PROVIDER);

  readonly notifications = signal<MentorNotification[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly activeFilter = signal<'ALL' | 'ENROLLMENT' | 'ASSESSMENT' | 'PROCTORING' | 'SYSTEM'>('ALL');

  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  readonly filteredNotifications = computed(() => {
    const list = this.notifications();
    const filter = this.activeFilter();
    if (filter === 'ALL') return list;
    return list.filter(n => n.type === filter);
  });

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.isLoading.set(true);
    this.provider.getNotifications().subscribe({
      next: (data) => {
        this.notifications.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  markAsRead(id: string): void {
    this.provider.markNotificationAsRead(id).subscribe({
      next: () => {
        this.notifications.update(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
      }
    });
  }

  markAllAsRead(): void {
    this.provider.markAllNotificationsAsRead().subscribe({
      next: () => {
        this.notifications.update(prev =>
          prev.map(n => ({ ...n, read: true }))
        );
      }
    });
  }

  getIcon(type: string): string {
    switch (type) {
      case 'PROCTORING': return '🚨';
      case 'ENROLLMENT': return '👥';
      case 'ASSESSMENT': return '📝';
      case 'SYSTEM': return '⚙️';
      default: return '🔔';
    }
  }
}
