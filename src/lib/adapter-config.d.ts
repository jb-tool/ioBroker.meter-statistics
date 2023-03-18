// This file extends the AdapterConfig type from "@types/iobroker"

import {CalculatorConfig, MeterDefinition} from './typedef';

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig extends CalculatorConfig {
            meterUnit: string;
            paymentUnit: string;
            meters: Array<MeterDefinition>;
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
