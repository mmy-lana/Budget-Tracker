import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200"
      [class.border-emerald-500]="isDragging()"
      [class.bg-emerald-50\/50]="isDragging()"
      [class.border-slate-300]="!isDragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
      (click)="fileInput.click()">
      
      <input 
        #fileInput 
        type="file" 
        accept="image/*" 
        class="hidden" 
        (change)="onFileSelected($event)" />

      @if (previewUrl()) {
        <div class="relative w-full max-w-xs mx-auto group">
          <img [src]="previewUrl()" alt="Receipt Preview" class="w-full h-40 object-cover rounded-xl shadow-md" />
          <div class="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span class="text-xs text-white font-medium bg-slate-800/80 px-2.5 py-1 rounded-lg">Change Photo</span>
          </div>
        </div>
      } @else {
        <div class="flex flex-col items-center justify-center gap-2">
          <div class="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 rounded-full">
            <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Upload Receipt Photo
          </p>
          <p class="text-xs text-slate-400">PNG, JPG up to 5MB (Auto-compressed to Base64)</p>
        </div>
      }
    </div>
  `
})
export class FileUploaderComponent {
  maxSizeMb = input<number>(5);
  previewUrl = signal<string>('');
  imageUploaded = output<string>();

  isDragging = signal<boolean>(false);

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragging.set(false);
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      this.processFile(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  private processFile(file: File): void {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.compressImage(e.target.result, 800, 0.7, (compressedBase64) => {
        this.previewUrl.set(compressedBase64);
        this.imageUploaded.emit(compressedBase64);
      });
    };
    reader.readAsDataURL(file);
  }

  private compressImage(dataUrl: string, maxWidth: number, quality: number, callback: (result: string) => void): void {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL('image/jpeg', quality));
    };
  }
}