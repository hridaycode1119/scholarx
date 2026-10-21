import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BroadcastService } from '../../../core/services/broadcast.service';

@Component({
  selector: 'app-admin-ai-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-ai-control.html',
  styleUrl: './admin-ai-control.scss'
})
export class AdminAiControlComponent {
  readonly broadcastService = inject(BroadcastService);

  readonly availableModels = [
    { id: 'llama-3.3-70b', name: 'Llama-3.3-70B-Instruct-vLLM (FP8 TensorRT-LLM)', family: 'Meta Llama 3', vram: '72 GB' },
    { id: 'deepseek-coder-v2', name: 'DeepSeek-Coder-V2-Lite-Instruct (16B/236B MoE)', family: 'DeepSeek MoE', vram: '38 GB' },
    { id: 'qwen-2.5-32b', name: 'Qwen-2.5-Coder-32B-Instruct-GPTQ', family: 'Alibaba Qwen', vram: '44 GB' },
    { id: 'mistral-nemo-12b', name: 'Mistral-Nemo-Instruct-2407 (12B Compact)', family: 'Mistral AI', vram: '24 GB' }
  ];

  selectedModel = this.broadcastService.aiEngineConfig().activeModel;
  temperature = this.broadcastService.aiEngineConfig().temperature;
  maxTokens = this.broadcastService.aiEngineConfig().maxTokens;
  topP = this.broadcastService.aiEngineConfig().topP;
  contextWindow = this.broadcastService.aiEngineConfig().contextWindow;

  readonly isUpdatingModel = signal<boolean>(false);
  readonly updateProgress = signal<number>(0);
  readonly toastMessage = signal<string | null>(null);

  updateHyperparameters(): void {
    this.broadcastService.updateAiConfig({
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      topP: this.topP,
      contextWindow: this.contextWindow
    });
    this.showToast('AI Engine generation hyperparameters updated!');
  }

  hotSwapModel(): void {
    this.isUpdatingModel.set(true);
    this.updateProgress.set(15);

    setTimeout(() => {
      this.updateProgress.set(55);
      this.broadcastService.addLog({
        level: 'INFO',
        component: 'vLLM-Supervisor',
        message: `Loading weights for ${this.selectedModel} into unified GPU pool...`
      });
    }, 500);

    setTimeout(() => {
      this.updateProgress.set(85);
    }, 1000);

    setTimeout(() => {
      this.updateProgress.set(100);
      this.isUpdatingModel.set(false);
      this.broadcastService.updateAiConfig({
        activeModel: this.selectedModel,
        status: 'ONLINE'
      });
      this.showToast(`AI Model hot-swapped successfully to: ${this.selectedModel}`);
      this.broadcastService.addLog({
        level: 'INFO',
        component: 'vLLM-Supervisor',
        message: `Inference server warm and ready. Active Model: ${this.selectedModel}.`
      });
    }, 1500);
  }

  runBenchmark(): void {
    this.broadcastService.runBenchmark();
    this.showToast('Benchmark test execution launched on AI worker cluster.');
  }

  flushKvCache(): void {
    this.broadcastService.flushKvCache();
    this.showToast('PagedAttention KV Cache cleared successfully. VRAM reclaimed.');
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
