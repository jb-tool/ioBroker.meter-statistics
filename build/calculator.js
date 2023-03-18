"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var calculator_exports = {};
__export(calculator_exports, {
  default: () => Calculator
});
module.exports = __toCommonJS(calculator_exports);
var import_period = __toESM(require("./period"));
class Calculator {
  constructor(config) {
    this.period = new import_period.default();
    this.config = config;
    this.summaryName = config.summaryName;
  }
  initMeterInfo() {
    return {
      balance: 0,
      consumptionAverage: 0,
      consumptionPredictedTotal: 0,
      consumptionTotal: 0,
      costs: 0,
      paid: 0,
      recommendedPayment: 0
    };
  }
  calculateMeterInfos(meterStates) {
    const summary = this.initMeterInfo();
    const collection = {
      [this.summaryName]: summary
    };
    const meters = [];
    for (const state of meterStates) {
      const info = this.initMeterInfo();
      const definition = state.meter;
      collection[definition.alias] = info;
      meters.push({ info, state, definition });
    }
    for (const { info, state } of meters) {
      info.consumptionTotal = state.consumption;
      info.consumptionAverage = this.period.calculateValuePerDay(state.consumption);
      info.consumptionPredictedTotal = this.period.calculateExtrapolateValueForPeriod(state.consumption);
      summary.consumptionTotal += info.consumptionTotal;
      summary.consumptionAverage += info.consumptionAverage;
      summary.consumptionPredictedTotal += info.consumptionPredictedTotal;
    }
    const basePrice = this.period.calculateElapsedAmountInPeriod(this.config.paymentBasePrice);
    const paid = this.calculatePaid();
    for (const { info, state, definition } of meters) {
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
  calculatePaid() {
    const config = this.config;
    return config.paymentCorrectionOffset + this.period.calculateElapsedAmountInPeriod(config.paymentValue * config.paymentCount);
  }
  calculateRecommendation(costs) {
    return this.period.calculateExtrapolateValueForPeriod(costs) / this.config.paymentCount;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=calculator.js.map
