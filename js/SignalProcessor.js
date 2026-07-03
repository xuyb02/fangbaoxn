class SignalProcessor {
    static SHPB_CONFIG = {
        incident_bar_length: 2100,
        transmitted_bar_length: 1800,
        absorption_bar_length: 500,
        bar_diameter: 50,
        specimen_length: 20,
        elastic_modulus: 240e3,
        wave_speed: 5580,
        impedance: 4.35e7,
        strain_gauge_position: 500
    };

    static butterLowpass(cutoff, fs, order = 4) {
        const nyq = 0.5 * fs;
        const normal_cutoff = cutoff / nyq;
        return this.butterCoeffs(order, normal_cutoff);
    }

    static butterCoeffs(order, cutoff) {
        const b = new Array(order + 1).fill(0);
        const a = new Array(order + 1).fill(0);
        b[0] = 1;
        a[0] = 1;
        
        for (let i = 0; i < order; i++) {
            const theta = Math.PI * (2 * i + 1) / (2 * order);
            const pole = -2 * Math.sin(theta) * Math.sin(theta) + 2 * Math.cos(theta) * Math.sqrt(1 - cutoff * cutoff);
            
            for (let j = i + 1; j >= 0; j--) {
                if (j > 0) {
                    b[j] = b[j] + pole * b[j - 1];
                    a[j] = a[j] + pole * a[j - 1];
                }
            }
        }
        
        const gain = b.reduce((sum, val, i) => sum + val * Math.pow(cutoff, i), 0);
        for (let i = 0; i <= order; i++) {
            b[i] /= gain;
            a[i] /= gain;
        }
        
        return { b, a };
    }

    static lowpassFilter(data, cutoff = 10000, fs = 1e6) {
        const { b, a } = this.butterLowpass(cutoff, fs);
        return this.filtfilt(b, a, data);
    }

    static filtfilt(b, a, data) {
        const result = this.lfilter(b, a, data);
        return this.lfilter(b, a, result.slice().reverse()).reverse();
    }

    static lfilter(b, a, data) {
        const result = new Array(data.length);
        
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < b.length; j++) {
                if (i - j >= 0) sum += b[j] * data[i - j];
            }
            for (let j = 1; j < a.length; j++) {
                if (i - j >= 0) sum -= a[j] * result[i - j];
            }
            result[i] = sum / a[0];
        }
        
        return result;
    }

    static baselineCorrect(data) {
        const baseline = data.slice(0, Math.min(100, data.length)).reduce((a, b) => a + b, 0) / Math.min(100, data.length);
        return data.map(v => v - baseline);
    }

    static generateTrapezoidalPulse(riseTime, plateauTime, fallTime, amplitude, fs = 1e6) {
        const tTotal = riseTime + plateauTime + fallTime;
        const t = [];
        const pulse = [];
        const n = Math.floor(tTotal * fs);
        
        for (let i = 0; i < n; i++) {
            const time = i / fs;
            t.push(time);
            
            let val = 0;
            if (time >= 0 && time < riseTime) {
                val = amplitude * time / riseTime;
            } else if (time >= riseTime && time < riseTime + plateauTime) {
                val = amplitude;
            } else if (time >= riseTime + plateauTime && time <= tTotal) {
                val = amplitude * (1 - (time - riseTime - plateauTime) / fallTime);
            }
            pulse.push(val);
        }
        
        return { t, pulse };
    }

    static simulateWaveforms(pressure, aerogelRatio, concreteRatio, porosity, strainRate = 1000) {
        const fs = 1e6;
        const riseTime = 20e-6;
        const plateauTime = 60e-6;
        const fallTime = 20e-6;
        
        const incidentAmplitude = pressure / this.SHPB_CONFIG.elastic_modulus * 50;
        
        const { t, pulse: incidentPulse } = this.generateTrapezoidalPulse(
            riseTime, plateauTime, fallTime, incidentAmplitude, fs
        );
        
        const mixtureModulus = aerogelRatio * (50 * (1 - porosity) + 1 * porosity) +
                              concreteRatio * (30000 * (1 - porosity) + 100 * porosity);
        const mixtureDensity = aerogelRatio * (150 * (1 - porosity) + 10 * porosity) +
                              concreteRatio * (2400 * (1 - porosity) + 200 * porosity);
        
        const specimenWaveSpeed = Math.sqrt(mixtureModulus * 1e6 / mixtureDensity);
        const specimenImpedance = mixtureDensity * specimenWaveSpeed;
        const barImpedance = this.SHPB_CONFIG.impedance;
        
        const R = (specimenImpedance - barImpedance) / (specimenImpedance + barImpedance);
        const T = 2 * specimenImpedance / (specimenImpedance + barImpedance);
        
        const reflectedPulse = incidentPulse.map(v => R * v);
        const transmittedPulse = incidentPulse.map(v => T * v);
        
        const strainRateEffect = 1 + 0.0001 * (strainRate - 1000);
        for (let i = 0; i < transmittedPulse.length; i++) {
            transmittedPulse[i] *= strainRateEffect;
        }
        
        const incidentFiltered = this.lowpassFilter(incidentPulse);
        const reflectedFiltered = this.lowpassFilter(reflectedPulse);
        const transmittedFiltered = this.lowpassFilter(transmittedPulse);
        
        return {
            incident: this.baselineCorrect(incidentFiltered),
            reflected: this.baselineCorrect(reflectedFiltered),
            transmitted: this.baselineCorrect(transmittedFiltered),
            time: t,
            sampling_rate: fs
        };
    }

    static calculateStressStrainThreeWave(incident, reflected, transmitted, time, config = this.SHPB_CONFIG) {
        const A0 = Math.PI * Math.pow(config.bar_diameter / 2000, 2);
        const As = A0;
        
        const stress = transmitted.map(v => config.elastic_modulus * (A0 / As) * v);
        const strainRate = reflected.map(v => -2 * config.wave_speed / (config.specimen_length / 1000) * v);
        
        const dt = time[1] - time[0];
        const strain = [];
        let sum = 0;
        for (let i = 0; i < strainRate.length; i++) {
            sum += strainRate[i] * dt;
            strain.push(sum);
        }
        
        let energyAbsorption = 0;
        for (let i = 0; i < stress.length - 1; i++) {
            energyAbsorption += Math.abs(stress[i] * 1e6) * Math.abs(strain[i + 1] - strain[i]);
        }
        energyAbsorption /= 1e6;
        
        return { stress, strain, strain_rate: strainRate, energy_absorption: Math.round(energyAbsorption * 1000) / 1000, time };
    }

    static calculateStressStrainMissingTransmitted(incident, reflected, time, config = this.SHPB_CONFIG) {
        const A0 = Math.PI * Math.pow(config.bar_diameter / 2000, 2);
        const As = A0;
        
        const stress = incident.map((_, i) => config.elastic_modulus * (A0 / As) * (incident[i] + reflected[i]));
        const strainRate = reflected.map(v => -2 * config.wave_speed / (config.specimen_length / 1000) * v);
        
        const dt = time[1] - time[0];
        const strain = [];
        let sum = 0;
        for (let i = 0; i < strainRate.length; i++) {
            sum += strainRate[i] * dt;
            strain.push(sum);
        }
        
        let energyAbsorption = 0;
        for (let i = 0; i < stress.length - 1; i++) {
            energyAbsorption += Math.abs(stress[i] * 1e6) * Math.abs(strain[i + 1] - strain[i]);
        }
        energyAbsorption /= 1e6;
        
        return {
            stress, strain, strain_rate: strainRate,
            energy_absorption: Math.round(energyAbsorption * 1000) / 1000,
            time, method: 'one_wave_approximation', confidence_degradation: 0.25
        };
    }

    static detectTransmittedWave(transmitted, snrThreshold = 3.0) {
        if (transmitted.length === 0) {
            return { detected: false, snr: 0, reason: '无透射波数据' };
        }
        
        const noiseRegion = transmitted.slice(0, Math.floor(transmitted.length / 4));
        const signalRegion = transmitted.slice(Math.floor(transmitted.length / 4), Math.floor(3 * transmitted.length / 4));
        
        const noiseStd = this.std(noiseRegion);
        const signalMax = Math.max(...signalRegion.map(v => Math.abs(v)));
        
        const snr = noiseStd < 1e-10 ? (signalMax > 1e-10 ? Infinity : 0) : signalMax / noiseStd;
        
        return {
            detected: snr >= snrThreshold,
            snr: Math.round(snr * 100) / 100,
            snr_threshold: snrThreshold,
            reason: snr >= snrThreshold ? `检测到有效透射波信号 (SNR=${snr.toFixed(2)})` : `信噪比不足 (SNR=${snr.toFixed(2)} < ${snrThreshold})`
        };
    }

    static evaluateEnergyAbsorptionEffect(result, transmittedDetection) {
        const ea = result.energy_absorption || 0;
        const plateauStress = result.plateau_stress || 0;
        
        if (!transmittedDetection.detected) {
            return {
                conclusion: '该材料在当前实验条件范围内具有较好吸能效果',
                basis: [
                    `透射波信号未检测到（SNR=${transmittedDetection.snr.toFixed(2)} < ${transmittedDetection.snr_threshold}）`,
                    '大部分冲击能量被材料吸收，导致透射波幅值显著衰减',
                    `计算得到的能量吸收值：${ea} J/cm³`,
                    `计算得到的平台应力：${plateauStress} MPa`
                ],
                confidence: Math.round(Math.max(0.6, 0.8 - transmittedDetection.snr_threshold / 10) * 100) / 100,
                level: 'good'
            };
        }
        
        let level, conclusion;
        if (ea >= 60) { level = 'excellent'; conclusion = '该材料具有优秀的吸能效果'; }
        else if (ea >= 40) { level = 'good'; conclusion = '该材料具有良好的吸能效果'; }
        else if (ea >= 25) { level = 'moderate'; conclusion = '该材料具有中等吸能效果'; }
        else { level = 'poor'; conclusion = '该材料吸能效果较差'; }
        
        return {
            conclusion,
            basis: [`能量吸收值：${ea} J/cm³`, `平台应力：${plateauStress} MPa`, `透射波SNR：${transmittedDetection.snr.toFixed(2)}`],
            confidence: result.model_confidence || 0.7,
            level
        };
    }

    static mean(data) { return data.reduce((a, b) => a + b, 0) / data.length; }
    static std(data) {
        const mean = this.mean(data);
        return Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);
    }
}