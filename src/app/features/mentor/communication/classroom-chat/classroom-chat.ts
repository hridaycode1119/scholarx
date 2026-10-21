import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DATA_PROVIDER } from '../../../../core/api/api-provider.token';
import { GeminiAiService } from '../../../../core/services/gemini-ai.service';
import { ChatChannel, ChatMessage } from '../../../../core/models';

@Component({
  selector: 'app-classroom-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './classroom-chat.html',
  styleUrl: './classroom-chat.scss'
})
export class ClassroomChatComponent implements OnInit {
  private readonly provider = inject(DATA_PROVIDER);
  private readonly geminiService = inject(GeminiAiService);

  readonly channels = signal<ChatChannel[]>([]);
  readonly selectedChannelId = signal<string>('chan-1');
  readonly messages = signal<ChatMessage[]>([]);
  readonly messageText = signal<string>('');
  readonly isSending = signal<boolean>(false);
  readonly isAiThinking = signal<boolean>(false);
  readonly isLoading = signal<boolean>(true);
  readonly pinnedAnnouncement = signal<string | null>(
    '📢 Mandatory Midterm Oral Evaluation VIVA schedule is active. Check individual slots on the Class Scheduler.'
  );

  readonly activeChannel = computed(() => {
    return this.channels().find(c => c.id === this.selectedChannelId());
  });

  readonly quickPrompts = [
    'Explain Raft Consensus Quorum Rules',
    'What is the difference between gRPC and REST for high throughput?',
    '@ai Summarize key topics for the upcoming Oral VIVA'
  ];

  ngOnInit(): void {
    this.provider.getChatChannels().subscribe({
      next: (chans) => {
        this.channels.set(chans);
        if (chans.length > 0) {
          this.selectedChannelId.set(chans[0].id);
          this.loadMessages(chans[0].id);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  selectChannel(id: string): void {
    this.selectedChannelId.set(id);
    this.loadMessages(id);
  }

  loadMessages(channelId: string): void {
    this.provider.getChannelMessages(channelId).subscribe({
      next: (msgs) => {
        this.messages.set(msgs);
        this.scrollToBottom();
      }
    });
  }

  sendQuickPrompt(promptText: string): void {
    this.messageText.set(promptText);
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.messageText().trim();
    if (!text) return;

    this.isSending.set(true);
    this.provider.sendChatMessage(this.selectedChannelId(), text).subscribe({
      next: (msg) => {
        this.messages.update(prev => [...prev, msg]);
        this.messageText.set('');
        this.isSending.set(false);
        this.scrollToBottom();

        // If message asks AI or has a question, trigger live Gemini AI Assistant
        if (text.toLowerCase().includes('@ai') || text.includes('?') || text.toLowerCase().includes('explain') || text.toLowerCase().includes('what is')) {
          this.triggerAiBotResponse(text);
        }
      },
      error: () => this.isSending.set(false)
    });
  }

  private triggerAiBotResponse(queryText: string): void {
    this.isAiThinking.set(true);
    this.scrollToBottom();
    const channelName = this.activeChannel()?.name || 'Distributed Systems';
    const courseCode = this.activeChannel()?.courseCode || 'CS401';

    const systemPrompt = `You are ScholarX AI Academic Tutor bot for course ${courseCode} (${channelName}). 
Provide a concise, academically rigorous answer (2-3 sentences max) citing core syllabus principles. Include 1 key formula or bullet point.`;

    this.geminiService.generateText(queryText, systemPrompt).subscribe({
      next: (aiReply) => {
        const botMessage: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          channelId: this.selectedChannelId(),
          senderId: 'bot-scholarx-ai',
          senderName: 'ScholarX AI Tutor',
          senderRole: 'AI',
          content: aiReply.trim(),
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          isMe: false
        };
        this.messages.update(prev => [...prev, botMessage]);
        this.isAiThinking.set(false);
        this.scrollToBottom();
      },
      error: () => {
        this.isAiThinking.set(false);
      }
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const container = document.getElementById('chat-scroll-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
