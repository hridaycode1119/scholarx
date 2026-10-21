import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BroadcastService } from '../../../core/services/broadcast.service';
import { BroadcastItem, TargetAudience, AdRegistrationRecord } from '../../../core/models';

@Component({
  selector: 'app-admin-broadcasting',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-broadcasting.html',
  styleUrl: './admin-broadcasting.scss'
})
export class AdminBroadcastingComponent {
  readonly broadcastService = inject(BroadcastService);

  // 1. Notice Bar State
  noticeMessage = this.broadcastService.globalNotice().message;
  noticeType = this.broadcastService.globalNotice().type;
  noticeAudience: TargetAudience = this.broadcastService.globalNotice().targetAudience;
  noticeActive = this.broadcastService.globalNotice().active;
  readonly noticeToast = signal<string | null>(null);

  // 2. AI Engine Ad Synthesizer State
  aiTopic = 'National Robotics & Autonomous AI Challenge 2026';
  aiTargetAudience: TargetAudience = 'ALL';
  aiCategory: 'BANNER_AD' | 'CAMPUS_EVENT' | 'EXAM_ALERT' = 'BANNER_AD';
  aiSponsorCollege = 'Apex Institute of Technology';
  aiMentorId = 'SX-M401';
  aiMentorName = 'Prof. Aris Thorne';

  readonly isAiGenerating = signal<boolean>(false);
  readonly generatedAdPreview = signal<Omit<BroadcastItem, 'id' | 'createdAt'> | null>({
    title: 'National 48-Hour Robotics & Autonomous AI Challenge 2026',
    tagline: 'Innovate • Build • Compete for \$30,000 in Grants',
    description: 'Calling all student innovators and engineering researchers! Collaborate in multi-disciplinary squads, solve real-world industry AI challenges, and present solutions directly to tech leaders.',
    fullDetails: `## Official Hackathon Statement & Guidelines
- **Eligibility:** 2nd to 4th-year engineering and computing students.
- **Host Institution:** Apex Institute of Technology
- **Assigned Faculty Mentor:** Prof. Aris Thorne (SX-M401)
- **Direct Application Routing:** Submitted student registration forms will be delivered immediately to Prof. Aris Thorne's directory for verification.`,
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    targetAudience: 'ALL',
    category: 'BANNER_AD',
    ctaText: 'Register Team Now',
    ctaLink: '#robotics-2026',
    active: true,
    sponsorCollege: 'Apex Institute of Technology',
    assignedMentorId: 'SX-M401',
    assignedMentorName: 'Prof. Aris Thorne',
    requiresRegistration: true,
    registrationCount: 0
  });

  // Curated High-Resolution Campus & Tech Images for AI Engine
  readonly aiImagePool = [
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80'
  ];

  // Available Mentors & Campuses for Routing
  readonly mentorOptions = [
    { id: 'SX-M401', name: 'Prof. Aris Thorne', college: 'Apex Institute of Technology', dept: 'Computer Science & AI' },
    { id: 'SX-M402', name: 'Dr. Aisha Khan', college: 'Horizon Engineering College', dept: 'Artificial Intelligence' },
    { id: 'SX-M403', name: 'Prof. Li Wei', college: 'Vanguard University Campus', dept: 'Computer Networks' },
    { id: 'SX-M404', name: 'Dr. Marcus Vance', college: 'Metro Polytechnic Institute', dept: 'Software Engineering' }
  ];

  // 3. Manual Broadcast Ad State
  newAd = {
    title: '',
    tagline: '',
    description: '',
    fullDetails: '',
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    targetAudience: 'ALL' as TargetAudience,
    category: 'BANNER_AD' as const,
    ctaText: 'Register Online',
    ctaLink: '#details',
    sponsorCollege: 'Apex Institute of Technology',
    assignedMentorId: 'SX-M401',
    assignedMentorName: 'Prof. Aris Thorne',
    requiresRegistration: true,
    active: true
  };

  readonly adSuccessToast = signal<string | null>(null);

  onMentorSelect(mentorId: string): void {
    const selected = this.mentorOptions.find(m => m.id === mentorId);
    if (selected) {
      this.aiMentorId = selected.id;
      this.aiMentorName = selected.name;
      this.aiSponsorCollege = selected.college;

      const current = this.generatedAdPreview();
      if (current) {
        this.generatedAdPreview.set({
          ...current,
          assignedMentorId: selected.id,
          assignedMentorName: selected.name,
          sponsorCollege: selected.college
        });
      }
    }
  }

  saveNoticeBar(): void {
    this.broadcastService.updateGlobalNotice(
      this.noticeMessage,
      this.noticeType,
      this.noticeAudience,
      this.noticeActive
    );
    this.showNoticeToast('Global Notice Bar updated live across all dashboards!');
  }

  generateWithAi(): void {
    if (!this.aiTopic.trim()) return;

    this.isAiGenerating.set(true);
    this.broadcastService.generateAdWithAi(
      this.aiTopic,
      this.aiTargetAudience,
      this.aiCategory,
      { id: this.aiMentorId, name: this.aiMentorName, college: this.aiSponsorCollege }
    ).subscribe({
      next: (generated) => {
        this.generatedAdPreview.set(generated);
        this.isAiGenerating.set(false);
        this.showAdToast(`✨ AI synthesized campaign for "${this.aiTopic}" routed to ${this.aiMentorName}!`);
      },
      error: () => this.isAiGenerating.set(false)
    });
  }

  regenerateImage(): void {
    const current = this.generatedAdPreview();
    if (!current) return;

    const remaining = this.aiImagePool.filter(url => url !== current.imageUrl);
    const newImg = remaining[Math.floor(Math.random() * remaining.length)] || this.aiImagePool[0];

    this.generatedAdPreview.set({
      ...current,
      imageUrl: newImg
    });
    this.showAdToast('🔄 Image asset refreshed with new visual variation.');
  }

  publishGeneratedAd(): void {
    const current = this.generatedAdPreview();
    if (!current) return;

    this.broadcastService.addBroadcastItem(current);
    this.showAdToast(`🚀 Broadcast Banner "${current.title}" published and routed to ${current.assignedMentorName}!`);
  }

  previewInPopup(item: BroadcastItem): void {
    this.broadcastService.showAdInPopup(item);
  }

  openDetails(item: BroadcastItem): void {
    this.broadcastService.openAdDetails(item);
  }

  openRegistration(item: BroadcastItem): void {
    this.broadcastService.openAdRegistration(item);
  }

  acceptRegistration(id: string): void {
    this.broadcastService.updateRegistrationStatus(id, 'ACCEPTED');
    this.showAdToast('Student registration accepted!');
  }

  rejectRegistration(id: string): void {
    this.broadcastService.updateRegistrationStatus(id, 'REJECTED');
    this.showAdToast('Student registration declined.');
  }

  toggleAd(item: BroadcastItem): void {
    this.broadcastService.toggleBroadcastActive(item.id);
  }

  deleteAd(item: BroadcastItem): void {
    this.broadcastService.deleteBroadcast(item.id);
  }

  private showNoticeToast(msg: string): void {
    this.noticeToast.set(msg);
    setTimeout(() => this.noticeToast.set(null), 3500);
  }

  private showAdToast(msg: string): void {
    this.adSuccessToast.set(msg);
    setTimeout(() => this.adSuccessToast.set(null), 3500);
  }
}
