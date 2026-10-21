import { InjectionToken } from '@angular/core';
import { DataProviderInterface } from './data-provider.interface';

export const DATA_PROVIDER = new InjectionToken<DataProviderInterface>('DATA_PROVIDER');
