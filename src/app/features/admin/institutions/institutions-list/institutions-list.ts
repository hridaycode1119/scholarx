import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { Institution } from '../../../../core/models';

@Component({
  selector: 'app-institutions-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './institutions-list.html',
  styleUrl: './institutions-list.scss'
})
export class InstitutionsListComponent implements OnInit {
  private readonly provider = inject(DATA_PROVIDER);

  readonly institutions = signal<Institution[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly showOnboardModal = signal<boolean>(false);
  readonly isOnboarding = signal<boolean>(false);
  readonly onboardSuccess = signal<boolean>(false);
  readonly toastMessage = signal<string | null>(null);

  newCampus = {
    name: '',
    code: '',
    domain: '',
    accreditationBody: 'NBA Tier-1 / NAAC Grade A+'
  };

  ngOnInit(): void {
    this.loadInstitutions();
  }

  loadInstitutions(): void {
    this.isLoading.set(true);
    this.provider.getInstitutions().subscribe({
      next: (data) => {
        this.institutions.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openOnboardModal(): void {
    this.newCampus = {
      name: '',
      code: '',
      domain: '',
      accreditationBody: 'NBA Tier-1 / NAAC Grade A+'
    };
    this.onboardSuccess.set(false);
    this.showOnboardModal.set(true);
  }

  closeOnboardModal(): void {
    this.showOnboardModal.set(false);
  }

  submitOnboarding(): void {
    if (!this.newCampus.name.trim() || !this.newCampus.code.trim()) return;

    this.isOnboarding.set(true);
    this.provider.onboardInstitution(this.newCampus).subscribe({
      next: (inst) => {
        this.institutions.update(prev => [...prev, inst]);
        this.isOnboarding.set(false);
        this.onboardSuccess.set(true);
        this.showToast(`Campus "${inst.name}" onboarded successfully.`);
        setTimeout(() => {
          this.showOnboardModal.set(false);
          this.onboardSuccess.set(false);
        }, 1500);
      },
      error: () => this.isOnboarding.set(false)
    });
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }
}
