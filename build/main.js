"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var utils = __toESM(require("@iobroker/adapter-core"));
class MeterStatistics extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "meter-statistics"
    });
    this.unloaded = false;
    this.pendingPromises = [];
    this.on("ready", this.onReady.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    await this.assertObjectsExist();
    const dayInfo = this.getDayInfo();
    const meterStates = await this.getMeterStates();
    const { total, average } = this.calculateMeterConsumption(meterStates, dayInfo);
    this.writeState("calculated.consumption.total", this.roundConsumption(total));
    this.writeState("calculated.consumption.average", this.roundConsumption(average));
    const costs = this.calculateCosts(meterStates);
    this.writeState("calculated.costs.used", this.roundCosts(costs));
    const paid = this.calculatePaid(dayInfo);
    this.writeState("calculated.costs.paid", this.roundCosts(paid));
    const current = paid - costs;
    this.writeState("calculated.costs.current", this.roundCosts(current));
    const recommendedPayment = this.calculateRecommendation(costs, dayInfo);
    this.writeState("calculated.costs.recommendedPayment", this.roundCosts(recommendedPayment));
    this.end();
  }
  addPendingPromise(promise) {
    this.pendingPromises.push(promise);
  }
  calculateMeterConsumption(meterStates, dayInfo) {
    let totalConsumption = 0;
    for (const meterState of meterStates) {
      totalConsumption += meterState.consumption;
    }
    return {
      total: totalConsumption,
      average: totalConsumption / dayInfo.daysSinceStartOfYear
    };
  }
  calculateCosts(meterStates) {
    let usedCosts = 0;
    for (const meterState of meterStates) {
      usedCosts += meterState.consumption * meterState.meter.price;
    }
    return usedCosts;
  }
  calculatePaid(dayInfo) {
    let paid = this.config.paymentCorrectionOffset;
    paid += this.config.paymentValue * this.config.paymentCount / dayInfo.daysInYear * dayInfo.daysSinceStartOfYear;
    return paid;
  }
  calculateRecommendation(costs, dayInfo) {
    const suggestedPayment = this.roundCosts(costs / dayInfo.daysSinceStartOfYear * dayInfo.daysInYear / this.config.paymentCount);
    return suggestedPayment;
  }
  roundCosts(costs) {
    return Math.round(costs * 100) / 100;
  }
  roundConsumption(consumption) {
    return Math.round(consumption * 1e3) / 1e3;
  }
  getDaysInYear() {
    return 365;
  }
  getDaysSince(start) {
    const now = new Date();
    const diff = now.valueOf() - start.valueOf();
    const oneDay = 1e3 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }
  writeState(id, value) {
    this.addPendingPromise(this.setStateAsync(id, { val: value, ack: true }));
  }
  async getMeterStates() {
    const meterStates = [];
    for (const meter of this.config.meters) {
      meterStates.push(await this.getMeterState(meter));
    }
    return meterStates;
  }
  async getMeterState(meter) {
    const currentValueState = await this.getForeignStateAsync(meter.objectId);
    const currentValue = currentValueState == null ? void 0 : currentValueState.val;
    if (!currentValueState || typeof currentValue !== "number") {
      throw new Error(`Could not read meter "${meter.alias}" with id: ${meter.objectId}`);
    }
    const startValueState = await this.getStateAsync(`meter.${meter.alias}.startValue`);
    const startValue = startValueState == null ? void 0 : startValueState.val;
    if (!currentValueState || typeof startValue !== "number") {
      throw new Error(`Could not read start value for meter "${meter.alias}".`);
    }
    return {
      meter,
      currentValue,
      startValue,
      consumption: currentValue - startValue
    };
  }
  getDayInfo() {
    const firstDayOfYear = new Date(new Date().getFullYear(), 0, 0);
    const daysInYear = this.getDaysInYear();
    const daysSinceStartOfYear = this.getDaysSince(firstDayOfYear);
    return { firstDayOfYear, daysInYear, daysSinceStartOfYear };
  }
  async assertObjectsExist() {
    for (const meter of this.config.meters) {
      await this.setObjectNotExistsAsync(`meter.${meter.alias}.startValue`, {
        type: "state",
        common: {
          name: "Start value",
          type: "number",
          role: "state",
          read: true,
          write: true,
          unit: this.config.meterUnit
        },
        native: {}
      });
    }
    await this.setObjectNotExistsAsync(`calculated.consumption.total`, {
      type: "state",
      common: {
        name: "Total consumption in period",
        type: "number",
        role: "state",
        read: true,
        write: false,
        unit: this.config.meterUnit
      },
      native: {}
    });
    await this.setObjectNotExistsAsync(`calculated.consumption.average`, {
      type: "state",
      common: {
        name: "Average consumption in period",
        type: "number",
        role: "state",
        read: true,
        write: false,
        unit: this.config.meterUnit
      },
      native: {}
    });
    await this.setObjectNotExistsAsync(`calculated.costs.paid`, {
      type: "state",
      common: {
        name: "Total paid value",
        type: "number",
        role: "state",
        read: true,
        write: false,
        unit: this.config.paymentUnit
      },
      native: {}
    });
    await this.setObjectNotExistsAsync(`calculated.costs.used`, {
      type: "state",
      common: {
        name: "Total costs",
        type: "number",
        role: "state",
        read: true,
        write: false,
        unit: this.config.paymentUnit
      },
      native: {}
    });
    await this.setObjectNotExistsAsync(`calculated.costs.current`, {
      type: "state",
      common: {
        name: "Current payment value",
        type: "number",
        role: "state",
        read: true,
        write: false,
        unit: this.config.paymentUnit
      },
      native: {}
    });
    await this.setObjectNotExistsAsync(`calculated.costs.recommendedPayment`, {
      type: "state",
      common: {
        name: "Recommended payment per payment interval",
        type: "number",
        role: "state",
        read: true,
        write: false,
        unit: this.config.paymentUnit
      },
      native: {}
    });
  }
  end() {
    if (this.unloaded)
      return;
    Promise.allSettled(this.pendingPromises).finally(() => {
      if (this.stop) {
        this.stop();
      }
    });
  }
  onUnload(callback) {
    this.unloaded = true;
    try {
      callback();
    } catch (e) {
      callback();
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new MeterStatistics(options);
} else {
  (() => new MeterStatistics())();
}
//# sourceMappingURL=main.js.map
