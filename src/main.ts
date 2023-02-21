/*
 * Created with @iobroker/create-adapter v2.2.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';
import {MeterState, MeterDefinition, MeterConsumption, DayInfo} from './lib/typedef';

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

        const dayInfo = this.getDayInfo();
        const meterStates = await this.getMeterStates();

        const {total, average} = this.calculateMeterConsumption(meterStates, dayInfo);
        this.writeState('calculated.consumption.total', this.roundConsumption(total));
        this.writeState('calculated.consumption.average', this.roundConsumption(average));

        const costs = this.calculateCosts(meterStates, dayInfo);
        this.writeState('calculated.costs.used', this.roundCosts(costs));

        const paid = this.calculatePaid(dayInfo);
        this.writeState('calculated.costs.paid', this.roundCosts(paid));

        const current = paid - costs;
        this.writeState('calculated.costs.current', this.roundCosts(current));

        const recommendedPayment = this.calculateRecommendation(costs, dayInfo);
        this.writeState('calculated.costs.recommendedPayment', this.roundCosts(recommendedPayment));

        this.end();
    }

    private addPendingPromise(promise: Promise<any>): void {
        this.pendingPromises.push(promise);
    }

    private calculateMeterConsumption(meterStates: MeterState[], dayInfo: DayInfo): MeterConsumption {

        let totalConsumption = 0;

        for (const meterState of meterStates) {
            totalConsumption += meterState.consumption;
        }

        return {
            total: totalConsumption,
            average: totalConsumption / dayInfo.daysSinceStartOfYear,
        };
    }

    private calculateCosts(meterStates: MeterState[], dayInfo: DayInfo): number {

        let usedCosts = 0;

        for (const meterState of meterStates) {
            usedCosts += meterState.consumption * meterState.meter.pricePerUnit + meterState.meter.basePrice * dayInfo.daysSinceStartOfYear;
        }

        return usedCosts;
    }

    private calculatePaid(dayInfo: DayInfo): number {

        let paid = this.config.paymentCorrectionOffset;

        paid += (this.config.paymentValue * this.config.paymentCount / dayInfo.daysInYear) * dayInfo.daysSinceStartOfYear;

        return paid;
    }

    private calculateRecommendation(costs: number, dayInfo: DayInfo): number {
        const suggestedPayment = this.roundCosts(costs / dayInfo.daysSinceStartOfYear * dayInfo.daysInYear / this.config.paymentCount);

        return suggestedPayment;
    }

    public roundCosts(costs: number): number {
        return Math.round(costs * 100) / 100;
    }

    public roundConsumption(consumption: number): number {
        return Math.round(consumption * 1000) / 1000;
    }

    public getDaysInYear(): number {
        return 365;
    }

    public getDaysSince(start: Date): number {
        const now = new Date();
        const diff = now.valueOf() - start.valueOf();
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }

    private writeState(id: string, value: any): void {
        this.addPendingPromise(this.setStateAsync(id, {val: value, ack: true}));
    }

    private async getMeterStates(): Promise<MeterState[]> {

        const meterStates = [];

        for (const meter of this.config.meters) {
            meterStates.push(await this.getMeterState(meter));
        }

        return meterStates;
    }

    private async getMeterState(meter: MeterDefinition): Promise<MeterState> {

        const currentValueState = await this.getForeignStateAsync(meter.objectId);
        const currentValue = currentValueState?.val;
        if (!currentValueState || typeof currentValue !== 'number') {
            throw new Error(`Could not read meter "${meter.alias}" with id: ${meter.objectId}`);
        }

        const startValueState = await this.getStateAsync(`meter.${meter.alias}.startValue`);
        const startValue = startValueState?.val;
        if (!currentValueState || typeof startValue !== 'number') {
            throw new Error(`Could not read start value for meter "${meter.alias}".`);
        }

        return {
            meter,
            currentValue,
            startValue,
            consumption: currentValue - startValue,
        };
    }

    private getDayInfo(): DayInfo {

        const firstDayOfYear = new Date((new Date()).getFullYear(), 0, 0);
        const daysInYear = this.getDaysInYear();
        const daysSinceStartOfYear = this.getDaysSince(firstDayOfYear);

        return {firstDayOfYear, daysInYear, daysSinceStartOfYear};
    }

    private async assertObjectsExist(): Promise<void> {

        for (const meter of this.config.meters) {

            await this.setObjectNotExistsAsync(`meter.${meter.alias}.startValue`, {
                type: 'state',
                common: {
                    name: 'Start value',
                    type: 'number',
                    role: 'state',
                    read: true,
                    write: true,
                    unit: this.config.meterUnit,
                },
                native: {},
            });

        }

        await this.setObjectNotExistsAsync(`calculated.consumption.total`, {
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
        });

        await this.setObjectNotExistsAsync(`calculated.consumption.average`, {
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
        });

        await this.setObjectNotExistsAsync(`calculated.costs.paid`, {
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
        });

        await this.setObjectNotExistsAsync(`calculated.costs.used`, {
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
        });

        await this.setObjectNotExistsAsync(`calculated.costs.current`, {
            type: 'state',
            common: {
                name: 'Current payment value',
                type: 'number',
                role: 'state',
                read: true,
                write: false,
                unit: this.config.paymentUnit,
            },
            native: {},
        });

        await this.setObjectNotExistsAsync(`calculated.costs.recommendedPayment`, {
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
        });
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