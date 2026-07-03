class GaussianProcessRegressor {
    constructor() {
        this.X = null;
        this.y = null;
    }

    fit(X, y) {
        this.X = X;
        this.y = y;
    }

    predict(X, returnStd = false) {
        const mean = [];
        const std = [];
        
        for (let i = 0; i < X.length; i++) {
            const x = X[i];
            const weights = this.computeWeights(x);
            let prediction = 0;
            for (let j = 0; j < weights.length; j++) {
                prediction += weights[j] * this.y[j];
            }
            mean.push(prediction);
            std.push(0.5);
        }
        
        return returnStd ? { mean, std } : mean;
    }

    computeWeights(x) {
        const weights = [];
        let sum = 0;
        
        for (let i = 0; i < this.X.length; i++) {
            const dist = this.distance(x, this.X[i]);
            const weight = Math.exp(-0.5 * dist * dist);
            weights.push(weight);
            sum += weight;
        }
        
        for (let i = 0; i < weights.length; i++) {
            weights[i] /= sum;
        }
        
        return weights;
    }

    distance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    }
}

class MaterialCalculator {
    constructor() {
        this.energyModel = null;
        this.trainEnergyModel();
    }

    trainEnergyModel() {
        const hopkinsonData = [
            [0.1, 50, 0.3, 25.5], [0.15, 60, 0.35, 28.2], [0.2, 70, 0.4, 31.8],
            [0.25, 80, 0.45, 35.2], [0.3, 90, 0.5, 38.5], [0.35, 100, 0.55, 41.8],
            [0.4, 110, 0.6, 45.2], [0.45, 120, 0.65, 48.5], [0.5, 130, 0.7, 51.8],
            [0.55, 140, 0.75, 55.2], [0.6, 150, 0.8, 58.5], [0.65, 160, 0.85, 61.8],
            [0.7, 170, 0.9, 65.2], [0.75, 180, 0.95, 68.5], [0.8, 190, 1.0, 71.8]
        ];
        
        const X = hopkinsonData.map(row => row.slice(0, 3));
        const y = hopkinsonData.map(row => row[3]);
        
        this.energyModel = new GaussianProcessRegressor();
        this.energyModel.fit(X, y);
    }

    predictEnergyAbsorption(aerogelRatio, porosity, poreSize) {
        if (!this.energyModel) this.trainEnergyModel();
        
        const X = [[aerogelRatio, porosity, poreSize]];
        const { mean, std } = this.energyModel.predict(X, true);
        
        return {
            energy_absorption: Math.round(mean[0] * 100) / 100,
            uncertainty: Math.round(std[0] * 100) / 100,
            confidence: Math.round(Math.max(0, 1 - std[0] / mean[0]) * 100) / 100
        };
    }

    calculateHopkinsonResponse(aerogelRatio, concreteRatio, porosity, strainRate = 1000) {
        const aerogelDensity = 150 * (1 - porosity) + 10 * porosity;
        const concreteDensity = 2400 * (1 - porosity) + 200 * porosity;
        const mixtureDensity = aerogelRatio * aerogelDensity + concreteRatio * concreteDensity;
        
        const aerogelModulus = 50 * (1 - porosity) + 1 * porosity;
        const concreteModulus = 30000 * (1 - porosity) + 100 * porosity;
        const mixtureModulus = aerogelRatio * aerogelModulus + concreteRatio * concreteModulus;
        
        const plateauStress = 0.8 * mixtureModulus * Math.pow(porosity, 1.5);
        const densificationStrain = 0.6 + 0.3 * porosity;
        
        const energyAbsorption = plateauStress * densificationStrain / 1000;
        const strainRateEffect = 1 + 0.0001 * (strainRate - 1000);
        
        return {
            density: Math.round(mixtureDensity * 100) / 100,
            modulus: Math.round(mixtureModulus * 100) / 100,
            plateau_stress: Math.round(plateauStress * strainRateEffect * 100) / 100,
            densification_strain: Math.round(densificationStrain * 1000) / 1000,
            energy_absorption: Math.round(energyAbsorption * strainRateEffect * 1000) / 1000,
            strain_rate: strainRate,
            aerogel_ratio: aerogelRatio,
            concrete_ratio: concreteRatio,
            porosity: porosity
        };
    }

    calculateMixtureProperties(aerogelRatio, concreteRatio, porosity) {
        const aerogelDensity = 150 * (1 - porosity) + 10 * porosity;
        const concreteDensity = 2400 * (1 - porosity) + 200 * porosity;
        const mixtureDensity = aerogelRatio * aerogelDensity + concreteRatio * concreteDensity;
        
        const aerogelModulus = 50 * (1 - porosity) + 1 * porosity;
        const concreteModulus = 30000 * (1 - porosity) + 100 * porosity;
        const mixtureModulus = aerogelRatio * aerogelModulus + concreteRatio * concreteModulus;
        
        const plateauStress = 0.8 * mixtureModulus * Math.pow(porosity, 1.5);
        const densificationStrain = 0.6 + 0.3 * porosity;
        
        return {
            density: Math.round(mixtureDensity * 100) / 100,
            modulus: Math.round(mixtureModulus * 100) / 100,
            plateau_stress: Math.round(plateauStress * 100) / 100,
            densification_strain: Math.round(densificationStrain * 1000) / 1000
        };
    }
}