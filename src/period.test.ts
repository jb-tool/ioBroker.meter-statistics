/**
 * This is a dummy TypeScript test file using chai and mocha
 *
 * It's automatically excluded from npm and its build output is excluded from both git and npm.
 * It is advised to test all your modules with accompanying *.test.ts-files
 */

import { expect } from 'chai';
import Period from './period';
// import { functionToTest } from "./moduleToTest";

describe('Period Calculator', () => {

    const testCaseData = [
        {
            startOfPeriodString: '2001-01-01 00:00:00',
            daysInYear: 365,
            daysSinceStartOfPeriod: 5,
        },
        {
            startOfPeriodString: '2000-01-01 00:00:00',
            daysInYear: 366,
            daysSinceStartOfPeriod: 100,
        },
    ];

    for (const {startOfPeriodString, daysInYear, daysSinceStartOfPeriod} of testCaseData) {
        // initializing logic
        const startOfPeriod = new Date(startOfPeriodString);

        const acceptedDeviation = 0.0001;
        it(`calculateValuePerDay should return 1`, () => {
            (Period as any).now = new Date(startOfPeriod.valueOf() + daysSinceStartOfPeriod * (24 * 60 * 60 * 1000));
            const period = new Period(startOfPeriod);

            const result = period.calculateValuePerDay(daysSinceStartOfPeriod);
            // assign result a value from functionToTest
            expect(result).to.approximately(1, acceptedDeviation);

        });

        it(`calculateExtrapolateValueForPeriod should return ${daysInYear}`, () => {
            (Period as any).now = new Date(startOfPeriod.valueOf() + daysSinceStartOfPeriod * (24 * 60 * 60 * 1000));
            const period = new Period(startOfPeriod);

            const result = period.calculateExtrapolateValueForPeriod(daysSinceStartOfPeriod);
            // assign result a value from functionToTest
            expect(result).to.approximately(daysInYear, acceptedDeviation);

        });

        it(`calculateElapsedAmountInPeriod should return ${daysSinceStartOfPeriod}`, () => {
            (Period as any).now = new Date(startOfPeriod.valueOf() + daysSinceStartOfPeriod * (24 * 60 * 60 * 1000));
            const period = new Period(startOfPeriod);

            const result = period.calculateElapsedAmountInPeriod(daysInYear);
            // assign result a value from functionToTest
            expect(result).to.approximately(daysSinceStartOfPeriod, acceptedDeviation);
        });
    }
    // ... more tests => it
    (Period as any).now = null;

});

// ... more test suites => describe
