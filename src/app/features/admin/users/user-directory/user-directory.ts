import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { AdminUser, UserRole } from '../../../../core/models';

@Component({
  selector: 'app-user-directory',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-directory.html',
  styleUrl: './user-directory.scss'
})
export class UserDirectoryComponent implements OnInit {
  private readonly provider = inject(DATA_PROVIDER);

  readonly users = signal<AdminUser[]>([]);
  readonly isLoading = signal<boolean>(true);

  readonly activeRoleFilter = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly selectedUser = signal<AdminUser | null>(null);
  readonly toastMessage = signal<string | null>(null);

  readonly filteredUsers = computed(() => {
    let list = this.users();
    const role = this.activeRoleFilter();
    const query = this.searchQuery().trim().toLowerCase();

    if (role !== 'ALL') {
      list = list.filter(u => u.role === role);
    }

    if (query) {
      list = list.filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.institutionName.toLowerCase().includes(query) ||
        (u.department && u.department.toLowerCase().includes(query))
      );
    }

    return list;
  });

  readonly allCount = computed(() => this.users().length);
  readonly studentCount = computed(() => this.users().filter(u => u.role === 'STUDENT').length);
  readonly facultyCount = computed(() => this.users().filter(u => u.role === 'FACULTY' || u.role === 'MENTOR').length);
  readonly adminCount = computed(() => this.users().filter(u => u.role === 'INSTITUTION_ADMIN' || u.role === 'SYSTEM_ADMIN').length);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.provider.getAdminUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  toggleStatus(user: AdminUser, event?: Event): void {
    if (event) event.stopPropagation();
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.provider.toggleUserStatus(user.id, newStatus).subscribe({
      next: () => {
        user.status = newStatus;
        this.showToast(`User ${user.name} status updated to ${newStatus}.`);
      }
    });
  }

  openUserDrawer(user: AdminUser): void {
    this.selectedUser.set(user);
  }

  closeUserDrawer(): void {
    this.selectedUser.set(null);
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
