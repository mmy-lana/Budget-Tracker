// Polyfill global process object for browser environment env variable reads
(window as any).process = (window as any).process || { env: {} };

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));