import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { DATA_PROVIDER } from './core/api/api-provider.token';
import { HttpDataProvider } from './core/api/http-data-provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    // Connect to Standalone Backend Service as Single Source of Truth
    {
      provide: DATA_PROVIDER,
      useClass: HttpDataProvider
    }
  ]
};
