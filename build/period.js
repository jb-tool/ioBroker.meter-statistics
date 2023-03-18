"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var period_exports = {};
__export(period_exports, {
  default: () => Period
});
module.exports = __toCommonJS(period_exports);
class Period {
  constructor(startOfPeriod = null) {
    const now = this.now;
    const periodStartDateTime = startOfPeriod || new Date(now.getFullYear(), 0, 0);
    const periodEndDateTime = this.incrementDatetimeByOneYear(periodStartDateTime);
    const periodStartTimestamp = periodStartDateTime.valueOf();
    const periodEndTimestamp = periodEndDateTime.valueOf();
    const unitsPerDay = new Date("1900-01-02T00:00:00").valueOf() - new Date("1900-01-01T00:00:00").valueOf();
    const unitsInPeriod = periodEndTimestamp - periodStartTimestamp;
    const elapsedUnitsInPeriod = now.valueOf() - periodStartTimestamp;
    this.perDayFactor = 1 / elapsedUnitsInPeriod * unitsPerDay;
    this.extrapolatePerPeriodFactor = 1 / elapsedUnitsInPeriod * unitsInPeriod;
    this.elapsedInPeriodFactor = 1 / unitsInPeriod * elapsedUnitsInPeriod;
  }
  get now() {
    if (!Period.now) {
      Period.now = new Date();
    }
    return Period.now;
  }
  incrementDatetimeByOneYear(date) {
    const newDate = new Date(date);
    newDate.setFullYear(date.getFullYear() + 1);
    return newDate;
  }
  calculateValuePerDay(amountInPeriod) {
    return amountInPeriod * this.perDayFactor;
  }
  calculateExtrapolateValueForPeriod(amountInPeriod) {
    return amountInPeriod * this.extrapolatePerPeriodFactor;
  }
  calculateElapsedAmountInPeriod(totalAmountInYear) {
    return totalAmountInYear * this.elapsedInPeriodFactor;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=period.js.map
