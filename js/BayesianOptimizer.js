class BayesianOptimizer {
    constructor() {
        this.calculator = new MaterialCalculator();
    }

    fitnessFunction(x, targetProps) {
        const aerogelRatio = x[0];
        const concreteRatio = 1 - aerogelRatio;
        const porosity = x[1];
        
        const result = this.calculator.calculateHopkinsonResponse(aerogelRatio, concreteRatio, porosity);
        
        const weights = { energy_absorption: 0.4, density: 0.3, modulus: 0.15, cost: 0.15 };
        
        const eaScore = Math.abs(result.energy_absorption - (targetProps.energy_absorption || 50)) / 100;
        const densityScore = Math.abs(result.density - (targetProps.density || 500)) / 1000;
        const modulusScore = Math.abs(result.modulus - (targetProps.modulus || 5000)) / 30000;
        const costScore = aerogelRatio * 0.5;
        
        return eaScore * weights.energy_absorption +
               densityScore * weights.density +
               modulusScore * weights.modulus +
               costScore * weights.cost;
    }

    optimize(targetProps, nIter = 25) {
        const bounds = [[0.1, 0.9], [0.1, 0.8]];
        
        const X = [];
        const y = [];
        
        for (let i = 0; i < 6; i++) {
            const x = [
                bounds[0][0] + Math.random() * (bounds[0][1] - bounds[0][0]),
                bounds[1][0] + Math.random() * (bounds[1][1] - bounds[1][0])
            ];
            X.push(x);
            y.push(this.fitnessFunction(x, targetProps));
        }
        
        let bestScore = Infinity;
        let bestParams = null;
        
        for (let iter = 0; iter < nIter; iter++) {
            const newX = this.minimizeAcquisition(X, y, bounds);
            const newY = this.fitnessFunction(newX, targetProps);
            
            X.push(newX);
            y.push(newY);
            
            if (newY < bestScore) {
                bestScore = newY;
                bestParams = newX;
            }
        }
        
        if (!bestParams) {
            const minIdx = y.indexOf(Math.min(...y));
            bestParams = X[minIdx];
        }
        
        const aerogelRatio = bestParams[0];
        const concreteRatio = 1 - aerogelRatio;
        const porosity = bestParams[1];
        
        const predictedProps = this.calculator.calculateHopkinsonResponse(aerogelRatio, concreteRatio, porosity);
        const confidence = Math.max(0, Math.min(1, 1 - bestScore * 3));
        
        return {
            aerogel_ratio: Math.round(aerogelRatio * 10000) / 10000,
            concrete_ratio: Math.round(concreteRatio * 10000) / 10000,
            porosity: Math.round(porosity * 10000) / 10000,
            predicted_properties: predictedProps,
            confidence: Math.round(confidence * 100) / 100,
            algorithm: 'Bayesian Optimization',
            iterations: nIter,
            fitness_score: Math.round(bestScore * 10000) / 10000
        };
    }

    minimizeAcquisition(X, y, bounds) {
        const center = [0, 0];
        for (let i = 0; i < X[0].length; i++) {
            center[i] = X.reduce((sum, x) => sum + x[i], 0) / X.length;
        }
        
        return this.simpleMinimize((x) => this.acquisition(x, X, y), center, bounds);
    }

    acquisition(x, X, y) {
        const mean = this.gpMean(x, X, y);
        const std = this.gpStd(x, X, y);
        return mean - 0.15 * std;
    }

    gpMean(x, X, y) {
        const weights = [];
        let sum = 0;
        
        for (let i = 0; i < X.length; i++) {
            const dist = this.distance(x, X[i]);
            const weight = Math.exp(-0.5 * dist * dist);
            weights.push(weight);
            sum += weight;
        }
        
        let mean = 0;
        for (let i = 0; i < weights.length; i++) {
            mean += (weights[i] / sum) * y[i];
        }
        
        return mean;
    }

    gpStd(x, X, y) {
        const mean = this.gpMean(x, X, y);
        let variance = 0;
        
        for (let i = 0; i < X.length; i++) {
            const dist = this.distance(x, X[i]);
            const weight = Math.exp(-0.5 * dist * dist);
            variance += weight * Math.pow(y[i] - mean, 2);
        }
        
        return Math.sqrt(variance / X.length) + 0.1;
    }

    distance(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    }

    simpleMinimize(func, x0, bounds) {
        let bestX = [...x0];
        let bestVal = func(x0);
        
        const stepSize = 0.01;
        const maxIter = 50;
        
        for (let iter = 0; iter < maxIter; iter++) {
            let improved = false;
            
            for (let i = 0; i < x0.length; i++) {
                const candidates = [
                    bestX.map((v, j) => j === i ? Math.max(bounds[j][0], v - stepSize) : v),
                    bestX.map((v, j) => j === i ? Math.min(bounds[j][1], v + stepSize) : v)
                ];
                
                for (const candidate of candidates) {
                    const val = func(candidate);
                    if (val < bestVal) {
                        bestVal = val;
                        bestX = candidate;
                        improved = true;
                    }
                }
            }
            
            if (!improved) break;
        }
        
        return bestX;
    }
}