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
var round_exports = {};
__export(round_exports, {
  default: () => round_default
});
module.exports = __toCommonJS(round_exports);
class Round {
  costs(costs) {
    return this.precise(costs, 2);
  }
  consumption(consumption) {
    return this.precise(consumption, 3);
  }
  precise(value, scale) {
    if (null === value) {
      return value;
    }
    const factor = Math.pow(10, scale);
    return Math.round(value * factor) / factor;
  }
}
var round_default = new Round();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
//# sourceMappingURL=round.js.map
