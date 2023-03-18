/**
 * This is a dummy TypeScript test file using chai and mocha
 *
 * It's automatically excluded from npm and its build output is excluded from both git and npm.
 * It is advised to test all your modules with accompanying *.test.ts-files
 */

import {expect} from 'chai';
import Calculator from './calculator';
import Period from './period';

describe('calculator => calculateMeterInfos', () => {
    // initializing logic
    const summaryName = 'summary';
    const meterNameOne = 'meterOne';
    const meterNameTwo = 'meterTwo';

    (Period as any).now = new Date(`2003-01-05 00:00:00`);

    const calculator = new Calculator({
        paymentBasePrice: 365,
        paymentCorrectionOffset: 10,
        paymentCount: 365,
        paymentValue: 1,
        summaryName,
    });
    const result = calculator.calculateMeterInfos([
        {
            consumption: 50,
            currentValue: 50,
            meter: {
                pricePerUnit: 0.1,
                alias: meterNameOne,
                objectId: 'object-id',
            },
            startValue: 0,
            startValueDateTime: new Date('2003-01-01T00:00:00Z'),
        },
        {
            consumption: 50,
            currentValue: 50,
            meter: {
                pricePerUnit: 0.1,
                alias: meterNameTwo,
                objectId: 'object-id',
            },
            startValue: 0,
            startValueDateTime: new Date('2003-01-01T00:00:00Z'),
        },
    ])

    it(`should have ${summaryName} object`, () => {
        expect(result[summaryName]).to.be.an('object');
    });
    it(`should have ${meterNameOne} object`, () => {
        expect(result[meterNameOne]).to.be.an('object');
    });
    it(`should have ${meterNameTwo} object`, () => {
        expect(result[meterNameTwo]).to.be.an('object');
    });

    const meterResult = result[meterNameOne];
    it(`${meterNameOne}.consumptionTotal is 50`, () => {
        expect(meterResult.consumptionTotal).to.approximately(50, 0.001);
    });
    it(`${meterNameOne}.consumptionAverage is 10`, () => {
        expect(meterResult.consumptionAverage).to.approximately(10, 0.001);
    });
    it(`${meterNameOne}.consumptionPredictedTotal is 3650`, () => {
        expect(meterResult.consumptionPredictedTotal).to.approximately(3650, 0.001);
    });
    const meterCosts = 5 / 2 + 50 * 0.1;
    it(`${meterNameOne}.costs is ${meterCosts} (2,5 + 5)`, () => {
        expect(meterResult.costs).to.approximately(meterCosts, 0.001);
    });
    const meterPaid = (5 + 10) / 2;
    it(`${meterNameOne}.paid is ${meterPaid} (15 / 2)`, () => {
        expect(meterResult.paid).to.approximately(meterPaid, 0.001);
    });
    it(`${meterNameOne}.balance is ${meterPaid - meterCosts}`, () => {
        expect(meterResult.balance).to.approximately(meterPaid - meterCosts, 0.001);
    });
    it(`${meterNameOne}.recommendedPayment is ${meterCosts / 5}`, () => {
        expect(meterResult.recommendedPayment).to.approximately(meterCosts / 5, 0.001);
    });

    const summaryResult = result[summaryName];
    it(`${summaryName}.consumptionTotal is ${50 * 2}`, () => {
        expect(summaryResult.consumptionTotal).to.approximately(50 * 2, 0.001);
    });
    it(`${summaryName}.consumptionAverage is ${50 / 5 * 2}`, () => {
        expect(summaryResult.consumptionAverage).to.approximately(50 / 5 * 2, 0.001);
    });
    it(`${summaryName}.consumptionPredictedTotal is ${3650 * 2}`, () => {
        expect(summaryResult.consumptionPredictedTotal).to.approximately(3650 * 2, 0.001);
    });
    const summaryCosts = 5 * (365 / 365) + 50 * 2 * 0.1;
    it(`${summaryName}.costs is ${summaryCosts}`, () => {
        expect(summaryResult.costs).to.approximately(summaryCosts, 0.001);
    });
    const summaryPaid = 5 + 10;
    it(`${summaryName}.paid is ${summaryPaid}`, () => {
        expect(summaryResult.paid).to.approximately(summaryPaid, 0.001);
    });
    it(`${summaryName}.balance is ${summaryPaid - summaryCosts}`, () => {
        expect(summaryResult.balance).to.approximately(summaryPaid - summaryCosts, 0.001);
    });
    it(`${summaryName}.recommendedPayment is ${summaryCosts / 5}`, () => {
        expect(summaryResult.recommendedPayment).to.approximately(summaryCosts / 5, 0.001);
    });
    // ... more tests => it

    (Period as any).now = null;
});

// ... more test suites => describe
