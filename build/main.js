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
var import_calculator = __toESM(require("./calculator"));
var import_round = __toESM(require("./round"));
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
    const meterStates = await this.getMeterStates();
    const calculator = new import_calculator.default(this.config);
    const meterInfos = calculator.calculateMeterInfos(meterStates);
    this.writeMeterInfos(meterInfos);
    this.end();
  }
  writeMeterInfos(meterInfos) {
    for (const meterName in meterInfos) {
      const meterInfo = meterInfos[meterName];
      this.writeState(`meters.${meterName}.balance`, import_round.default.costs(meterInfo.balance));
      this.writeState(`meters.${meterName}.consumptionAverage`, import_round.default.consumption(meterInfo.consumptionAverage));
      this.writeState(`meters.${meterName}.consumptionPredictedTotal`, import_round.default.consumption(meterInfo.consumptionPredictedTotal));
      this.writeState(`meters.${meterName}.consumptionTotal`, import_round.default.consumption(meterInfo.consumptionTotal));
      this.writeState(`meters.${meterName}.costs`, import_round.default.costs(meterInfo.costs));
      this.writeState(`meters.${meterName}.paid`, import_round.default.costs(meterInfo.paid));
      this.writeState(`meters.${meterName}.recommendedPayment`, import_round.default.costs(meterInfo.recommendedPayment));
    }
  }
  writeState(id, value) {
    const promise = this.setStateAsync(id, { val: value, ack: false });
    this.pendingPromises.push(promise);
  }
  getNumericStateValue(state, onErrorMessage) {
    const stateValue = state == null ? void 0 : state.val;
    if (typeof stateValue === "number") {
      return stateValue;
    }
    throw new Error(onErrorMessage);
  }
  async getMeterStates() {
    const meterStates = [];
    for (const meter of this.config.meters) {
      meterStates.push(await this.getMeterState(meter));
    }
    return meterStates;
  }
  async getMeterState(meter) {
    var _a;
    const meterName = meter.alias;
    const currentValueState = await this.getForeignStateAsync(meter.objectId);
    const currentValue = this.getNumericStateValue(
      currentValueState,
      `Could not read meter "${meterName}" with id: ${meter.objectId}`
    ) || 0;
    const startValueState = await this.getStateAsync(`configuration.${meterName}.startValue`);
    let startValueDateTime = null;
    if (!startValueState) {
      await this.setStateAsync(`configuration.${meterName}.startValue`, { val: currentValue, ack: true });
      startValueDateTime = new Date(import_round.default.precise((currentValueState == null ? void 0 : currentValueState.ts) || Date.now(), -3));
      await this.setStateAsync(`configuration.${meterName}.readingDateTime`, { val: startValueDateTime.toISOString(), ack: true });
    }
    const startValue = this.getNumericStateValue(
      startValueState || await this.getStateAsync(`configuration.${meterName}.startValue`),
      `Could not read start value for meter "${meterName}".`
    );
    if (!startValueDateTime) {
      const startValueDateTimeValue = (_a = await this.getStateAsync(`configuration.${meterName}.readingDateTime`)) == null ? void 0 : _a.val;
      if (typeof startValueDateTimeValue === "string") {
        try {
          startValueDateTime = new Date(Date.parse(startValueDateTimeValue));
        } catch (e) {
        }
      }
    }
    return {
      meter,
      currentValue,
      startValue,
      startValueDateTime,
      consumption: currentValue - startValue
    };
  }
  assertObjectsExist() {
    const promises = [];
    for (const meter of this.config.meters) {
      promises.push(...this.assertMeterObjectsExist(meter.alias));
    }
    promises.push(...this.assertMeterObjectsExist(this.config.summaryName, false));
    return Promise.allSettled(promises);
  }
  assertMeterObjectsExist(meterName, hasStartValue = true) {
    const promises = [];
    if (hasStartValue) {
      promises.push(this.setObjectNotExistsAsync(`configuration.${meterName}.startValue`, {
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
      }));
      promises.push(this.setObjectNotExistsAsync(`configuration.${meterName}.readingDateTime`, {
        type: "state",
        common: {
          name: "Timestamp of reading start value",
          desc: "ONLY INFORMATION: Does not affect any calculation yet.",
          type: "string",
          role: "state",
          read: true,
          write: true
        },
        native: {}
      }));
    }
    promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.consumptionAverage`, {
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
    }));
    promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.consumptionTotal`, {
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
    }));
    promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.consumptionPredictedTotal`, {
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
    }));
    promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.costs`, {
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
    }));
    promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.paid`, {
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
    }));
    promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.balance`, {
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
    }));
    promises.push(this.setObjectNotExistsAsync(`meters.${meterName}.recommendedPayment`, {
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
    }));
    return promises;
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
