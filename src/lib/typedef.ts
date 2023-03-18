export interface MeterState {
    meter: MeterDefinition;
    startValue: number;
    startValueDateTime: Date|null;
    currentValue: number;
    consumption: number;
}

export interface MeterDefinition {
    objectId: string;
    alias: string;
    pricePerUnit: number;
}

export interface CalculatorConfig {
    paymentValue: number;
    paymentCount: number;
    paymentCorrectionOffset: number;
    paymentBasePrice: number;
    summaryName: string;
}

export interface MeterConsumption {
    total: number;
    average: number;
    predicted: number;
}

export interface MeterInfo {
    balance: number;
    consumptionAverage: number;
    consumptionPredictedTotal: number;
    consumptionTotal: number;
    costs: number;
    paid: number;
    recommendedPayment: number;
}

export interface MeterInfoCollection {
    [key: string]: MeterInfo
}

export interface DayInfo {
    firstDayOfYear: Date;
    daysInYear: number;
    daysSinceStartOfYear: number;
}
