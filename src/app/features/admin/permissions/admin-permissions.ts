import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PermissionsService } from '../../../core/services/permissions.service';
import {
  InstitutionalRoleDefinition,
  PermissionCapabilityCategory,
  UserPermissionAssignment,
  SecurityAuditLogEntry,
  TemporaryDelegationPass
} from '../../../core/models';

@Component({
  selector: 'app-admin-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-permissions.html',
  styleUrls: ['./admin-permissions.scss']
})
export class AdminPermissionsComponent implements OnInit {
  readonly permissionsService = inject(PermissionsService);
  private readonly route = inject(ActivatedRoute);

  // UI State Signals
  readonly showDelegationModal = signal<boolean>(false);
  readonly showUserModal = signal<boolean>(false);
  readonly selectedUser = signal<UserPermissionAssignment | null>(null);
  readonly successToast = signal<string | null>(null);

  // New Delegation Form
  delegationForm = {
    granteeName: '',
    granteeEmail: '',
    collegeName: 'Apex Institute of Technology',
    department: 'Computer Science & AI',
    scopeDescription: '',
    targetRoleKey: 'EXTERNAL_EXAMINER',
    targetRoleName: 'Guest External Viva Examiner',
    issuedBy: 'Dr. Aris Thorne (HOD)',
    validFrom: '2026-09-15 09:00',
    validUntil: '2026-09-18 18:00'
  };

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const tab = params['tab'].toUpperCase();
        if (tab === 'MATRIX' || tab === 'USERS' || tab === 'DELEGATIONS' || tab === 'AUDIT_LOG') {
          this.permissionsService.activeTab.set(tab as any);
        }
      }
      if (params['college']) {
        this.permissionsService.selectedCollegeId.set(params['college']);
      }
      if (params['modal'] === 'delegation') {
        this.showDelegationModal.set(true);
      }
    });
  }

  selectCampus(collegeId: string) {
    this.permissionsService.selectedCollegeId.set(collegeId);
  }

  selectTab(tab: 'MATRIX' | 'USERS' | 'DELEGATIONS' | 'AUDIT_LOG') {
    this.permissionsService.activeTab.set(tab);
  }

  toggleCapability(roleKey: string, capabilityKey: string) {
    this.permissionsService.toggleRoleCapability(roleKey, capabilityKey);
    this.showToast(`Updated capability "${capabilityKey}" for role tier ${roleKey}.`);
  }

  onUserRoleChange(user: UserPermissionAssignment, newRoleKey: string) {
    this.permissionsService.assignUserRole(user.userId, newRoleKey);
    this.showToast(`Reassigned ${user.userName} to ${newRoleKey}. Security ledger updated.`);
  }

  openUserModal(user: UserPermissionAssignment) {
    this.selectedUser.set(user);
    this.showUserModal.set(true);
  }

  closeUserModal() {
    this.showUserModal.set(false);
    this.selectedUser.set(null);
  }

  submitDelegationPass() {
    if (!this.delegationForm.granteeName || !this.delegationForm.granteeEmail) return;

    const selectedCollege = this.permissionsService.registeredColleges().find(c => c.name === this.delegationForm.collegeName) ||
      this.permissionsService.registeredColleges()[0];

    const pass = this.permissionsService.issueDelegationPass({
      granteeName: this.delegationForm.granteeName,
      granteeEmail: this.delegationForm.granteeEmail,
      collegeId: selectedCollege.id,
      collegeName: selectedCollege.name,
      department: this.delegationForm.department,
      scopeDescription: this.delegationForm.scopeDescription,
      targetRoleKey: this.delegationForm.targetRoleKey,
      targetRoleName: this.delegationForm.targetRoleName,
      issuedBy: this.delegationForm.issuedBy,
      validFrom: this.delegationForm.validFrom,
      validUntil: this.delegationForm.validUntil
    });

    this.showDelegationModal.set(false);
    this.showToast(`Delegation token ${pass.passCode} issued successfully to ${pass.granteeName}!`);

    // Reset
    this.delegationForm.granteeName = '';
    this.delegationForm.granteeEmail = '';
    this.delegationForm.scopeDescription = '';
  }

  revokePass(passId: string) {
    this.permissionsService.revokeDelegationPass(passId);
    this.showToast(`Delegation pass ${passId} revoked immediately.`);
  }

  enforceBaseline() {
    const msg = this.permissionsService.resetAllToCampusStandard();
    this.showToast(msg);
  }

  private showToast(msg: string) {
    this.successToast.set(msg);
    setTimeout(() => {
      this.successToast.set(null);
    }, 4500);
  }
}
