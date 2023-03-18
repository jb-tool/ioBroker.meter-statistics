/**
 * This is a dummy TypeScript test file using chai and mocha
 *
 * It's automatically excluded from npm and its build output is excluded from both git and npm.
 * It is advised to test all your modules with accompanying *.test.ts-files
 */

import { expect } from 'chai';
import Round from './round';

describe('Round => precise', () => {

    const data = [
        {input: 1.23456789, scale: 0, expected: 1},
        {input: 1.23456789, scale: 1, expected: 1.2},
        {input: 1.23456789, scale: 2, expected: 1.23},
        {input: 1.23456789, scale: 3, expected: 1.235},
        {input: 1.23456789, scale: 4, expected: 1.2346},
        {input: 1.23456789, scale: 5, expected: 1.23457},
        {input: 1.23456789, scale: -1, expected: 0},
    ];

    for (const {input, scale, expected} of data) {
        it(`scale of ${scale} should return ${expected}`, () => {
            const result = Round.precise(input, scale);
            // assign result a value from functionToTest
            expect(result).to.equal(expected);
        });
    }
});
describe('Round => costs', () => {

    it(`should return 2 digits`, () => {
        const result = Round.costs(1.2345);
        // assign result a value from functionToTest
        expect(`${result}`.length).to.equal(2+2);
    });
});
describe('Round => consumption', () => {

    it(`should return 3 digits`, () => {
        const result = Round.consumption(1.2345);
        // assign result a value from functionToTest
        expect(`${result}`.length).to.equal(2+3);
    });

});

// ... more test suites => describe
