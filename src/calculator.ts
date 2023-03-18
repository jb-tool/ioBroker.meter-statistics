import {CalculatorConfig, MeterDefinition, MeterInfo, MeterInfoCollection, MeterState} from './lib/typedef';
import Period from './period';

export default class Calculator {

    private readonly summaryName: string;

    private readonly config: CalculatorConfig;
    private readonly period: Period;

    constructor(config: CalculatorConfig) {
        this.period = new Period();
        this.config = config;
        this.summaryName = config.summaryName;
    }

    private initMeterInfo(): MeterInfo {
        return {
            balance: 0,
            consumptionAverage: 0,
            consumptionPredictedTotal: 0,
            consumptionTotal: 0,
            costs: 0,
            paid: 0,
            recommendedPayment: 0,
        };
    }
    public calculateMeterInfos(meterStates: MeterState[]): MeterInfoCollection
    {
        const summary = this.initMeterInfo();
        const collection: MeterInfoCollection = {
            [this.summaryName]: summary,
        };

        const meters: Array<{info: MeterInfo, state: MeterState, definition: MeterDefinition}> = [];

        for (const state of meterStates) {
            const info = this.initMeterInfo();

            const definition = state.meter;
            collection[definition.alias] = info;

            meters.push({info, state, definition});
        }

        for (const {info, state} of meters) {
            // TODO use period depending on state.startValueDateTime
            // const startValueDateTime = state.startValueDateTime;
            info.consumptionTotal = state.consumption;
            info.consumptionAverage = this.period.calculateValuePerDay(state.consumption);
            info.consumptionPredictedTotal = this.period.calculateExtrapolateValueForPeriod(state.consumption);

            summary.consumptionTotal += info.consumptionTotal;
            summary.consumptionAverage += info.consumptionAverage;
            summary.consumptionPredictedTotal += info.consumptionPredictedTotal;
        }

        const basePrice = this.period.calculateElapsedAmountInPeriod(this.config.paymentBasePrice);
        const paid = this.calculatePaid();
        for (const {info, state, definition} of meters) {
            const factor = info.consumptionTotal / summary.consumptionTotal;

            info.costs = state.consumption * definition.pricePerUnit + basePrice * factor;
            info.paid = paid * factor;
            info.balance = info.paid - info.costs;
            info.recommendedPayment = this.calculateRecommendation(info.costs);

            summary.costs += info.costs;
            summary.paid += info.paid;
            summary.balance += info.balance;
            summary.recommendedPayment += info.recommendedPayment;
        }

        return collection;
    }


    private calculatePaid(): number {
        const config = this.config;
        return config.paymentCorrectionOffset + this.period.calculateElapsedAmountInPeriod(config.paymentValue * config.paymentCount);
    }

    private calculateRecommendation(costs: number): number {
        return this.period.calculateExtrapolateValueForPeriod(costs) / this.config.paymentCount;
    }

}
