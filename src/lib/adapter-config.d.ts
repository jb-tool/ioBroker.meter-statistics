// This file extends the AdapterConfig type from "@types/iobroker"

import { MeterDefinition } from './typedef';

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            meterUnit: string;
            paymentUnit: string;
            paymentValue: number;
            paymentCount: number;
            paymentCorrectionOffset: number;
            meters: Array<MeterDefinition>;
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};