import { Component, inject, signal, computed, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { GeminiAiService } from '../../../core/services/gemini-ai.service';
import { ChatChannel, ChatMessage } from '../../../core/models';

@Component({
  selector: 'app-student-communication',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-communication.html',
  styleUrl: './student-communication.scss'
})
export class StudentCommunicationComponent implements AfterViewChecked {
  private readonly studentService = inject(StudentService);
  private readonly geminiService = inject(GeminiAiService);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  readonly channels = signal<ChatChannel[]>([
    {
      id: 'chan-1',
      name: 'CSE-6A: Distributed Systems (CS401)',
      courseCode: 'CS401',
      mentorName: 'Dr. Sarah Jenkins',
      mentorAvatar: 'SJ',
      unreadCount: 2,
      lastMessageSnippet: 'Midterm oral viva schedule is now active. Verify slot timings.',
      lastMessageTime: '10:45 AM'
    },
    {
      id: 'chan-2',
      name: 'CSE-6B: Embedded Microcontrollers (CSE-354)',
      courseCode: 'CSE-354',
      mentorName: 'Prof. David Vance',
      mentorAvatar: 'DV',
      unreadCount: 0,
      lastMessageSnippet: 'Remember to calculate TH1 reload value for 9600 baud rate.',
      lastMessageTime: 'Yesterday'
    },
    {
      id: 'chan-3',
      name: 'CSE-6C: Cloud & Kubernetes Microservices (CS702)',
      courseCode: 'CS702',
      mentorName: 'Dr. Elena Rostova',
      mentorAvatar: 'ER',
      unreadCount: 1,
      lastMessageSnippet: 'Docker container networking slides uploaded to repository.',
      lastMessageTime: '2 days ago'
    }
  ]);

  readonly selectedChannelId = signal<string>('chan-1');
  readonly messageText = signal<string>('');
  readonly isAiThinking = signal<boolean>(false);

  // Messages State keyed by channelId
  readonly channelMessages = signal<Record<string, ChatMessage[]>>({
    'chan-1': [
      {
        id: 'msg-1',
        senderId: 'SX-M401',
        senderName: 'Dr. Sarah Jenkins',
        senderRole: 'FACULTY',
        text: 'Welcome to the Spring 2026 Distributed Systems channel. Pinned announcement: The Oral VIVA proctoring window is now open.',
        timestamp: '09:30 AM',
        isAiBot: false
      },
      {
        id: 'msg-2',
        senderId: '2023308724',
        senderName: 'Sahil Kumar',
        senderRole: 'STUDENT',
        text: 'Thank you Dr. Jenkins. In the Raft leader election derivation, is the randomized timeout between 150ms and 300ms strictly required, or can it scale with cluster RTT?',
        timestamp: '10:15 AM',
        isAiBot: false
      },
      {
        id: 'msg-3',
        senderId: 'SX-M401',
        senderName: 'Dr. Sarah Jenkins',
        senderRole: 'FACULTY',
        text: 'Great question Sahil! It must scale such that T >> network round-trip latency. In wide-area clusters, higher bounds (e.g. 500ms-1000ms) are standard.',
        timestamp: '10:20 AM',
        isAiBot: false
      }
    ],
    'chan-2': [
      {
        id: 'msg-201',
        senderId: 'SX-M402',
        senderName: 'Prof. David Vance',
        senderRole: 'FACULTY',
        text: 'Lab practical instructions for 8051 Timer Mode 2 auto-reload are posted. Please review formula TH1 = 256 - ((Crystal / 384) / Baud).',
        timestamp: 'Yesterday',
        isAiBot: false
      }
    ],
    'chan-3': [
      {
        id: 'msg-301',
        senderId: 'SX-M403',
        senderName: 'Dr. Elena Rostova',
        senderRole: 'FACULTY',
        text: 'Cluster namespaces have been provisioned for the capstone microservices demo.',
        timestamp: '2 days ago',
        isAiBot: false
      }
    ]
  });

  readonly activeChannel = computed(() => {
    return this.channels().find(c => c.id === this.selectedChannelId());
  });

  readonly currentMessages = computed(() => {
    return this.channelMessages()[this.selectedChannelId()] || [];
  });

  readonly quickChips = [
    '@ai Explain Raft split-vote prevention',
    '@ai How does Vector Clock guarantee causal order?',
    '@ai Formula for 8051 baud rate generation'
  ];

  selectChannel(id: string): void {
    this.selectedChannelId.set(id);
    // Clear unread
    this.channels.update(chans =>
      chans.map(c => c.id === id ? { ...c, unreadCount: 0 } : c)
    );
  }

  useChip(text: string): void {
    this.messageText.set(text);
  }

  sendMessage(): void {
    const text = this.messageText().trim();
    if (!text) return;

    const channelId = this.selectedChannelId();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: this.studentService.profile().studentId,
      senderName: this.studentService.profile().fullName,
      senderRole: 'STUDENT',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAiBot: false
    };

    this.channelMessages.update(m => ({
      ...m,
      [channelId]: [...(m[channelId] || []), newMsg]
    }));

    this.messageText.set('');

    // Check if message mentions @ai
    if (text.toLowerCase().includes('@ai')) {
      this.handleAiTutorResponse(text, channelId);
    }
  }

  private handleAiTutorResponse(query: string, channelId: string): void {
    this.isAiThinking.set(true);
    const cleanQuery = query.replace(/@ai/gi, '').trim();

    const prompt = `
You are @ScholarX AI Tutor, an engineering assistant for student Sahil Kumar.
Subject Context: ${this.activeChannel()?.name}
Student Question: "${cleanQuery}"

Provide a concise, grounded explanation with key formulas and examination takeaways.
`;

    this.geminiService.generateText(prompt, 'You are @ScholarX AI Tutor bot. Respond informatively in markdown.').subscribe({
      next: (ans) => {
        const botMsg: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          senderId: 'ai-tutor-bot',
          senderName: 'ScholarX AI Tutor',
          senderRole: 'FACULTY',
          text: ans,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAiBot: true
        };
        this.channelMessages.update(m => ({
          ...m,
          [channelId]: [...(m[channelId] || []), botMsg]
        }));
        this.isAiThinking.set(false);
      },
      error: () => {
        const botMsg: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          senderId: 'ai-tutor-bot',
          senderName: 'ScholarX AI Tutor',
          senderRole: 'FACULTY',
          text: `🤖 **ScholarX AI Tutor Response:**\nRandomized election timers in Raft (typically 150ms–300ms) ensure that when multiple followers timeout simultaneously, one node almost always triggers an election first and captures the majority quorum (N/2 + 1) before peers restart, preventing split-vote livelocks.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAiBot: true
        };
        this.channelMessages.update(m => ({
          ...m,
          [channelId]: [...(m[channelId] || []), botMsg]
        }));
        this.isAiThinking.set(false);
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.messagesContainer?.nativeElement) {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    }
  }
}
