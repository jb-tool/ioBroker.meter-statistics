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
    const { total, average, predicted } = this.calculateMeterConsumption(meterStates, dayInfo);
    this.writeState("summary.consumptionTotal", this.roundConsumption(total));
    this.writeState("summary.consumptionAverage", this.roundConsumption(average));
    this.writeState("summary.consumptionPredictedTotal", this.roundConsumption(predicted));
    const costs = this.calculateCosts(meterStates, dayInfo);
    this.writeState("summary.costs", this.roundCosts(costs));
    const paid = this.calculatePaid(dayInfo);
    this.writeState("summary.paid", this.roundCosts(paid));
    const current = paid - costs;
    this.writeState("summary.balance", this.roundCosts(current));
    const recommendedPayment = this.calculateRecommendation(costs, dayInfo);
    this.writeState("summary.recommendedPayment", this.roundCosts(recommendedPayment));
    this.end();
  }
  addPendingPromise(promise) {
    this.pendingPromises.push(promise);
  }
  calculateMeterConsumption(meterStates, dayInfo) {
    let totalConsumption = 0;
    for (const meterState of meterStates) {
      const meter = meterState.meter;
      this.writeState(`meter.${meter.alias}.consumptionTotal`, this.roundConsumption(meterState.consumption));
      this.writeState(`meter.${meter.alias}.consumptionAverage`, this.roundConsumption(meterState.consumption / dayInfo.daysSinceStartOfYear));
      this.writeState(`meter.${meter.alias}.consumptionPredictedTotal`, this.roundConsumption(meterState.consumption / dayInfo.daysSinceStartOfYear * dayInfo.daysInYear));
      totalConsumption += meterState.consumption;
    }
    return {
      total: totalConsumption,
      average: totalConsumption / dayInfo.daysSinceStartOfYear,
      predicted: totalConsumption / dayInfo.daysSinceStartOfYear * dayInfo.daysInYear
    };
  }
  calculateCosts(meterStates, dayInfo) {
    let usedCosts = 0;
    const basePricePerDay = this.config.paymentBasePrice / dayInfo.daysInYear;
    usedCosts += basePricePerDay * dayInfo.daysSinceStartOfYear;
    for (const meterState of meterStates) {
      const meter = meterState.meter;
      this.writeState(`meter.${meter.alias}.costs`, this.roundCosts(meterState.consumption * meterState.meter.pricePerUnit));
      usedCosts += meterState.consumption * meterState.meter.pricePerUnit;
    }
    return usedCosts;
  }
  calculatePaid(dayInfo) {
    let paid = this.config.paymentCorrectionOffset;
    const paymentPerDay = this.config.paymentValue * this.config.paymentCount / dayInfo.daysInYear;
    paid += paymentPerDay * dayInfo.daysSinceStartOfYear;
    return paid;
  }
  calculateRecommendation(costs, dayInfo) {
    return this.roundCosts(costs / dayInfo.daysSinceStartOfYear * dayInfo.daysInYear / this.config.paymentCount);
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
  getNumericStateValue(state, onErrorMessage) {
    const stateValue = state == null ? void 0 : state.val;
    if (typeof stateValue === "number") {
      return stateValue;
    }
    throw new Error(onErrorMessage);
  }
  async getMeterState(meter) {
    const currentValue = this.getNumericStateValue(
      await this.getForeignStateAsync(meter.objectId),
      `Could not read meter "${meter.alias}" with id: ${meter.objectId}`
    );
    const startValue = this.getNumericStateValue(
      await this.getStateAsync(`meter.${meter.alias}.startValue`),
      `Could not read start value for meter "${meter.alias}".`
    );
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
      await this.setObjectNotExistsAsync(`meter.${meter.alias}.consumptionAverage`, {
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
      await this.setObjectNotExistsAsync(`meter.${meter.alias}.consumptionTotal`, {
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
      await this.setObjectNotExistsAsync(`meter.${meter.alias}.consumptionPredicted`, {
        type: "state",
        common: {
          name: "Total predicted consumption in period",
          type: "number",
          role: "state",
          read: true,
          write: false,
          unit: this.config.meterUnit
        },
        native: {}
      });
      await this.setObjectNotExistsAsync(`meter.${meter.alias}.costs`, {
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
    }
    await this.setObjectNotExistsAsync(`summary.consumptionTotal`, {
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
    await this.setObjectNotExistsAsync(`summary.consumptionPredictedTotal`, {
      type: "state",
      common: {
        name: "Total predicted consumption in period",
        type: "number",
        role: "state",
        read: true,
        write: false,
        unit: this.config.meterUnit
      },
      native: {}
    });
    await this.setObjectNotExistsAsync(`summary.consumptionAverage`, {
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
    await this.setObjectNotExistsAsync(`summary.paid`, {
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
    await this.setObjectNotExistsAsync(`summary.costs`, {
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
    await this.setObjectNotExistsAsync(`summary.balance`, {
      type: "state",
      common: {
        name: "Current balance",
        type: "number",
        role: "state",
        read: true,
        write: false,
        unit: this.config.paymentUnit
      },
      native: {}
    });
    await this.setObjectNotExistsAsync(`summary.recommendedPayment`, {
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
