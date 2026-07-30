import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BadgeComponent } from '../../shared/ui/atoms/badge/badge.component';

@Component({
  selector: 'app-telegram-sync',
  standalone: true,
  imports: [CommonModule, BadgeComponent],
  template: `
    <div class="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 dark:text-white">Telegram Bot Automation</h1>
        <p class="text-xs text-slate-500 mt-1">Free instant AI parsing & receipt image recognition webhook</p>
      </div>

      <div class="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🤖</span>
            <div>
              <h3 class="text-base font-bold">Webhook Status</h3>
              <p class="text-xs text-slate-400">Listening to Telegram Bot update events</p>
            </div>
          </div>
          <app-badge variant="emerald" [showDot]="true">Active</app-badge>
        </div>

        <div class="space-y-4">
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 font-mono text-xs space-y-2">
            <span class="text-slate-400 uppercase font-semibold text-[10px]">Sample Bot Text Command</span>
            <p class="text-emerald-600 dark:text-emerald-400 font-bold">"buy coffee 25000 rupiah for two cups at starbucks"</p>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 font-mono text-xs space-y-2">
            <span class="text-slate-400 uppercase font-semibold text-[10px]">Photo Upload</span>
            <p class="text-slate-700 dark:text-slate-300">Send receipt picture directly to bot -> Auto-logged to dashboard</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TelegramSyncComponent {}