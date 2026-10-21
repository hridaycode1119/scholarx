import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { WorkloadService } from '../../../core/services/workload.service';
import { FacultyWorkloadItem, UnassignedStudentCandidate, VivaStudentQueueItem } from '../../../core/models';

@Component({
  selector: 'app-admin-workload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-workload.html',
  styleUrl: './admin-workload.scss'
})
export class AdminWorkloadComponent {
  readonly workloadService = inject(WorkloadService);

  // Directly exposed reactive signals for template
  readonly overallStats = this.workloadService.overallStats;
  readonly facultyList = this.workloadService.facultyList;
  readonly filteredFaculty = this.workloadService.filteredFaculty;
  readonly unassignedStudents = this.workloadService.unassignedStudents;
  readonly selectedDepartment = this.workloadService.selectedDepartment;
  readonly selectedCollege = this.workloadService.selectedCollege;
  readonly collegeList = this.workloadService.collegeList;
  readonly groupedByCollege = this.workloadService.groupedByCollege;
  readonly allSubjects = this.workloadService.allSubjects;
  readonly selectedSubjectFilter = this.workloadService.selectedSubjectFilter;

  // Search input model
  searchTerm = '';

  // UI State
  readonly isBalancing = signal<boolean>(false);
  readonly balanceSuccessToast = signal<string | null>(null);
  readonly expandedFacultyId = signal<string | null>('SX-M401');
  readonly selectedQuickAssignStudent = signal<UnassignedStudentCandidate | null>(null);
  selectedTargetFacultyId = 'SX-M404';

  departments = [
    { key: 'ALL', label: 'All Departments' },
    { key: 'Computer Science & AI', label: 'CS & Artificial Intelligence' },
    { key: 'Computer Networks', label: 'Computer Networks' },
    { key: 'Software Engineering', label: 'Software Engineering' },
    { key: 'Electrical & Robotics', label: 'Robotics & Control' }
  ];

  setCollegeFilter(college: string): void {
    this.workloadService.selectedCollege.set(college);
  }

  setDepartmentFilter(dept: string): void {
    this.workloadService.selectedDepartment.set(dept);
  }

  setSubjectFilter(code: string): void {
    this.workloadService.selectedSubjectFilter.set(code);
  }

  onSearchChange(val: string): void {
    this.searchTerm = val;
    this.workloadService.searchSubject.set(val);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.workloadService.searchSubject.set('');
    this.workloadService.selectedCollege.set('ALL');
    this.workloadService.selectedDepartment.set('ALL');
    this.workloadService.selectedSubjectFilter.set('ALL');
  }

  toggleExpandFaculty(facultyId: string): void {
    if (this.expandedFacultyId() === facultyId) {
      this.expandedFacultyId.set(null);
    } else {
      this.expandedFacultyId.set(facultyId);
    }
  }

  // Trigger 1-Click AI Auto-Balancer
  runAiAutoBalancer(): void {
    this.isBalancing.set(true);
    setTimeout(() => {
      const result = this.workloadService.autoBalanceWorkload();
      this.isBalancing.set(false);
      this.showToast(`✨ ${result.summaryMessage}`);
    }, 850);
  }

  // Reassign single viva
  reassignViva(viva: VivaStudentQueueItem, fromFaculty: FacultyWorkloadItem, toFacultyId: string): void {
    if (!toFacultyId || toFacultyId === fromFaculty.facultyId) return;

    this.workloadService.reassignViva(viva.id, fromFaculty.facultyId, toFacultyId);
    const target = this.workloadService.facultyList().find(f => f.facultyId === toFacultyId);
    this.showToast(`Transferred ${viva.studentName}'s viva to ${target?.name || 'mentor'}.`);
  }

  // Quick Assign Unallocated Student
  openAssignModal(student: UnassignedStudentCandidate): void {
    this.selectedQuickAssignStudent.set(student);
  }

  confirmAssign(targetFacultyId: string): void {
    const student = this.selectedQuickAssignStudent();
    if (!student || !targetFacultyId) return;

    this.workloadService.assignStudentToFaculty(student.id, targetFacultyId);
    const target = this.workloadService.facultyList().find(f => f.facultyId === targetFacultyId);
    this.selectedQuickAssignStudent.set(null);
    this.showToast(`Assigned ${student.studentName} to ${target?.name || 'faculty'}!`);
  }

  private showToast(msg: string): void {
    this.balanceSuccessToast.set(msg);
    setTimeout(() => this.balanceSuccessToast.set(null), 4500);
  }
}
