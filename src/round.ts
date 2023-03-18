class Round {

    public costs(costs: number): number {
        return this.precise(costs, 2);
    }

    public consumption(consumption: number): number {
        return this.precise(consumption, 3);
    }

    public precise(value: number, scale: number): number {
        if (null === value) {
            return value;
        }
        const factor = Math.pow(10, scale);
        return Math.round(value * factor) / factor;
    }

}

export default new Round();
