export interface MeterState {
    meter: MeterDefinition;
    startValue: number;
    currentValue: number;
    consumption: number;
}

export interface MeterDefinition {
    objectId: string;
    alias: string;
    pricePerUnit: number;
}

export interface MeterConsumption {
    total: number;
    average: number;
}

export interface DayInfo {
    firstDayOfYear: Date;
    daysInYear: number;
    daysSinceStartOfYear: number;
}
