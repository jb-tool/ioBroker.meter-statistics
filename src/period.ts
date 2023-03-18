export default class Period {

    private static now: null|Date;
    private readonly perDayFactor: number;
    private readonly extrapolatePerPeriodFactor: number;
    private readonly elapsedInPeriodFactor: number;

    constructor(startOfPeriod: Date|null = null) {
        const now = this.now;

        const periodStartDateTime = startOfPeriod || new Date(now.getFullYear(), 0, 0);
        const periodEndDateTime = this.incrementDatetimeByOneYear(periodStartDateTime);

        const periodStartTimestamp = periodStartDateTime.valueOf();
        const periodEndTimestamp = periodEndDateTime.valueOf();

        const unitsPerDay = (new Date('1900-01-02T00:00:00')).valueOf() - (new Date('1900-01-01T00:00:00')).valueOf();
        const unitsInPeriod = periodEndTimestamp - periodStartTimestamp;
        const elapsedUnitsInPeriod = now.valueOf() - periodStartTimestamp;

        this.perDayFactor = 1 / elapsedUnitsInPeriod * unitsPerDay;
        this.extrapolatePerPeriodFactor = 1 / elapsedUnitsInPeriod * unitsInPeriod;
        this.elapsedInPeriodFactor = 1 / unitsInPeriod * elapsedUnitsInPeriod;
    }

    private get now(): Date {
        if (!Period.now) {
            Period.now = new Date();
        }
        return Period.now;
    }

    private incrementDatetimeByOneYear(date: Date): Date {
        const newDate = new Date(date);
        newDate.setFullYear(date.getFullYear() + 1);
        return newDate;
    }

    public calculateValuePerDay(amountInPeriod: number): number {
        return amountInPeriod * this.perDayFactor;
    }

    public calculateExtrapolateValueForPeriod(amountInPeriod: number): number {
        return amountInPeriod * this.extrapolatePerPeriodFactor;
    }

    public calculateElapsedAmountInPeriod(totalAmountInYear: number): number {
        return totalAmountInYear * this.elapsedInPeriodFactor;
    }
}
