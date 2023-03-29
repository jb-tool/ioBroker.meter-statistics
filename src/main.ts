/*
 * Created with @iobroker/create-adapter v2.3.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
import {MeterDefinition, MeterInfoCollection, MeterState} from './lib/typedef';
import Calculator from './calculator';
import Round from './round';

// Load your modules here, e.g.:
// import * as fs from "fs";

class MeterStatistics extends utils.Adapter {

    private unloaded = false;

    private pendingPromises: Array<Promise<any>> = [];

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'meter-statistics',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private async onReady(): Promise<void> {

        await this.assertObjectsExist();

        const meterStates = await this.getMeterStates();

        const calculator = new Calculator(this.config);

        const meterInfos = calculator.calculateMeterInfos(meterStates);

        this.writeMeterInfos(meterInfos);

        this.end();
    }

    private writeMeterInfos(meterInfos: MeterInfoCollection): void {
        for (const meterName in meterInfos) {
            const meterInfo = meterInfos[meterName];

            this.writeState(`meters.${meterName}.balance`,                   Round.costs(meterInfo.balance));
            this.writeState(`meters.${meterName}.consumptionAverage`,        Round.consumption(meterInfo.consumptionAverage));
            this.writeState(`meters.${meterName}.consumptionPredictedTotal`, Round.consumption(meterInfo.consumptionPredictedTotal));
            this.writeState(`meters.${meterName}.consumptionTotal`,          Round.consumption(meterInfo.consumptionTotal));
            this.writeState(`meters.${meterName}.costs`,                     Round.costs(meterInfo.costs));
            this.writeState(`meters.${meterName}.paid`,                      Round.costs(meterInfo.paid));
            this.writeState(`meters.${meterName}.recommendedPayment`,        Round.costs(meterInfo.recommendedPayment));
        }
    }


    private writeState(id: string, value: any): void {
        const promise = this.setStateAsync(id, {val: value, ack: false});
        this.pendingPromises.push(promise);
    }

    private getNumericStateValue(state: null|undefined|ioBroker.State, onErrorMessage: string): number {
        const stateValue = state?.val;
        if (typeof stateValue === 'number') {
            return stateValue;
        }
        throw new Error(onErrorMessage);
    }

    private async getMeterStates(): Promise<MeterState[]> {

        const meterStates = [];

        for (const meter of this.config.meters) {
            meterStates.push(await this.getMeterState(meter));
        }

        return meterStates;
    }

    private async getMeterState(meter: MeterDefinition): Promise<MeterState> {

        const meterName = meter.alias;
        const currentValueState = await this.getForeignStateAsync(meter.objectId);
        const currentValue = this.getNumericStateValue(
            currentValueState,
            `Could not read meter "${meterName}" with id: ${meter.objectId}`
        ) || 0;

        const startValueState = await this.getStateAsync(`configuration.${meterName}.startValue`);
        let startValueDateTime: Date|null = null;
        if (!startValueState) {
            await this.setStateAsync(`configuration.${meterName}.startValue`, {val: currentValue, ack: true});
            startValueDateTime = new Date(Round.precise(currentValueState?.ts || Date.now(), -3));
            await this.setStateAsync(`configuration.${meterName}.readingDateTime`, {val: startValueDateTime.toISOString(), ack: true});
        }
        const startValue = this.getNumericStateValue(
            startValueState || await this.getStateAsync(`configuration.${meterName}.startValue`),
            `Could not read start value for meter "${meterName}".`
        );
        if (!startValueDateTime) {
            const startValueDateTimeValue = (await this.getStateAsync(`configuration.${meterName}.readingDateTime`))?.val;
            if (typeof startValueDateTimeValue === 'string') {
                try {
                    startValueDateTime = new Date(Date.parse(startValueDateTimeValue));
                } catch (e) {}
            }
        }

        return {
            meter,
            currentValue,
            startValue,
            startValueDateTime,
            consumption: currentValue - startValue,
        };
    }

    private assertObjectsExist(): Promise<any> {
        const promises = [];

        for (const meter of this.config.meters) {
            promises.push(...this.assertMeterObjectsExist(meter.alias));
        }
        promises.push(...this.assertMeterObjectsExist(this.config.summaryName, false));

        return Promise.allSettled(promises);
    }

    private assertMeterObjectsExist(meterName: string, hasStartValue = true): ioBroker.SetObjectPromise[] {
        const promises = [];

        promises.push(this.setObjectNotExistsAsync(`configuration.${meterName}`, {
            type: 'device',
            common: {
                name: `configuration.${meterName}`,
                icon: `/icons/${hasStartValue ? 'device' : 'summary'}-icon.svg`,
            },
            native: {},
        }));

        if (hasStartValue) {
            promises.push(this.setObjectNotExistsAsync(`configuration.${meterName}.startValue`, {
                type: 'state',
                common: {
                    name: 'Start value',
                    type: 'number',
                    role: 'state',
                    read: true,
                    write: true,
                    unit: this.config.meterUnit,
                },
                native: {
                },
            }));
            promises.push(this.setObjectNotExistsAsync(`configuration.${meterName}.readingDateTime`, {
                type: 'state',
                common: {
                    name: 'Timestamp of reading start value',
                    desc: 'ONLY INFORMATION: Does not affect any calculation yet.',
                    type: 'string',
                    role: 'state',
                    read: true,
                    write: true,
                },
                native: {},
            }));
        }
        promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.consumptionAverage`, {
            type: 'state',
            common: {
                name: 'Average consumption in period',
                type: 'number',
                role: 'state',
                read: true,
                write: false,
                unit: this.config.meterUnit,
            },
            native: {},
        }));
        promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.consumptionTotal`, {
            type: 'state',
            common: {
                name: 'Total consumption in period',
                type: 'number',
                role: 'state',
                read: true,
                write: false,
                unit: this.config.meterUnit,
            },
            native: {},
        }));
        promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.consumptionPredictedTotal`, {
            type: 'state',
            common: {
                name: 'Total predicted consumption in period',
                type: 'number',
                role: 'state',
                read: true,
                write: false,
                unit: this.config.meterUnit,
            },
            native: {},
        }));
        promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.costs`, {
            type: 'state',
            common: {
                name: 'Total costs',
                type: 'number',
                role: 'state',
                read: true,
                write: false,
                unit: this.config.paymentUnit,
            },
            native: {},
        }));
        promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.paid`, {
            type: 'state',
            common: {
                name: 'Total paid value',
                type: 'number',
                role: 'state',
                read: true,
                write: false,
                unit: this.config.paymentUnit,
            },
            native: {},
        }));
        promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.balance`, {
            type: 'state',
            common: {
                name: 'Current balance',
                type: 'number',
                role: 'state',
                read: true,
                write: false,
                unit: this.config.paymentUnit,
            },
            native: {},
        }));
        promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.recommendedPayment`, {
            type: 'state',
            common: {
                name: 'Recommended payment per payment interval',
                type: 'number',
                role: 'state',
                read: true,
                write: false,
                unit: this.config.paymentUnit,
            },
            native: {},
        }));

        return promises;
    }

    end(): void {
        if (this.unloaded) return;
        Promise.allSettled(this.pendingPromises).finally(() => {
            if (this.stop) {
                this.stop();
            }
        });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private onUnload(callback: () => void): void {
        this.unloaded = true;
        try {
            // Here you must clear all timeouts or intervals that may still be active
            callback();
        } catch (e) {
            callback();
        }
    }

}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new MeterStatistics(options);
} else {
    // otherwise start the instance directly
    (() => new MeterStatistics())();
}
