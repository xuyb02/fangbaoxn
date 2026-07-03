class App {
    constructor() {
        this.calculator = new MaterialCalculator();
        this.optimizer = new BayesianOptimizer();
        
        this.hopkinsonResult = null;
        this.optimizationResult = null;
        this.morphologyResult = null;
        
        this.waveformChart = null;
        this.stressStrainChart = null;
        this.simulationChart = null;
        this.batchChart = null;
        
        this.twin3D = null;
        this.threeLoaded = false;
        
        this.currentApiKey = localStorage.getItem("dashscope_api_key") || "";
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initSliderControls();
        this.initTwin3D();
    }

    initTwin3D() {
        loadThreeJS(() => {
            if (typeof THREE !== 'undefined') {
                this.threeLoaded = true;
                this.twin3D = new Twin3D('twin-3d-container');
            }
        });
    }

    setupEventListeners() {
        document.getElementById('saveApiKeyBtn').addEventListener('click', () => this.saveApiKey());
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });
        
        document.getElementById('calculate-hopkinson-btn').addEventListener('click', () => this.calculateHopkinson());
        document.getElementById('run-optimize-btn').addEventListener('click', () => this.runOptimization());
        document.getElementById('analyze-morph-btn').addEventListener('click', () => this.analyzeMorphology());
        document.getElementById('run-simulation-btn').addEventListener('click', () => this.runSimulation());
        document.getElementById('run-batch-btn').addEventListener('click', () => this.runBatchAnalysis());
        document.getElementById('generate-report-btn').addEventListener('click', () => this.generateReport());
        
        document.getElementById('hopkinson-aerogel').addEventListener('input', () => this.updateHopkinsonRatio());
        document.getElementById('hopkinson-concrete').addEventListener('input', () => this.updateHopkinsonRatio());
        
        const fileUpload = document.getElementById('hopkinson-file-upload');
        fileUpload.addEventListener('dragover', (e) => { e.preventDefault(); fileUpload.classList.add('dragover'); });
        fileUpload.addEventListener('dragleave', (e) => { e.preventDefault(); fileUpload.classList.remove('dragover'); });
        fileUpload.addEventListener('drop', (e) => { e.preventDefault(); fileUpload.classList.remove('dragover'); this.handleHopkinsonFileSelect(e.dataTransfer.files[0]); });
        
        document.getElementById('hopkinson-file-input').addEventListener('change', (e) => this.handleHopkinsonFileSelect(e.target.files[0]));
        
        document.getElementById('morph-file-input').addEventListener('change', (e) => this.handleMorphFileSelect(e.target.files[0]));
        
        document.getElementById('morph-crop-btn').addEventListener('click', () => this.showToast('裁剪功能开发中'));
        document.getElementById('morph-rotate-btn').addEventListener('click', () => this.showToast('旋转功能开发中'));
        document.getElementById('morph-annotate-btn').addEventListener('click', () => this.showToast('标注功能开发中'));
    }

    saveApiKey() {
        const key = document.getElementById('apiKey').value.trim();
        if (key) {
            this.currentApiKey = key;
            localStorage.setItem("dashscope_api_key", key);
            this.showToast("API Key已保存");
        } else {
            this.showToast("请输入API Key", "error");
        }
    }

    switchTab(e) {
        const btn = e.currentTarget;
        const targetTab = btn.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        
        btn.classList.add('active');
        const panel = document.getElementById(`${targetTab}-panel`);
        if (panel) {
            panel.classList.add('active');
        }
    }

    updateHopkinsonRatio() {
        const aerogel = parseFloat(document.getElementById('hopkinson-aerogel').value) || 0;
        const concrete = parseFloat(document.getElementById('hopkinson-concrete').value) || 0;
        
        const total = aerogel + concrete;
        const totalRatioEl = document.getElementById('hopkinson-total-ratio');
        const summaryEl = document.getElementById('hopkinson-ratio-summary');
        
        totalRatioEl.textContent = `${total}%`;
        
        if (Math.abs(total - 100) > 1) {
            totalRatioEl.style.color = '#f59e0b';
            summaryEl.classList.add('warning');
        } else {
            totalRatioEl.style.color = '#10b981';
            summaryEl.classList.remove('warning');
        }
    }

    initSliderControls() {
        const sliders = [
            { id: 'sim-aerogel', valId: 'sim-aerogel-val', suffix: '%' },
            { id: 'sim-concrete', valId: 'sim-concrete-val', suffix: '%' },
            { id: 'sim-porosity', valId: 'sim-porosity-val', suffix: '%' },
            { id: 'sim-strain-rate', valId: 'sim-strain-rate-val', suffix: ' s⁻¹' }
        ];
        
        sliders.forEach(({ id, valId, suffix }) => {
            const slider = document.getElementById(id);
            const val = document.getElementById(valId);
            if (slider && val) {
                slider.addEventListener('input', (e) => {
                    val.textContent = e.target.value + suffix;
                    this.updateTwinParams();
                });
                val.textContent = slider.value + suffix;
            }
        });
    }

    updateTwinParams() {
        if (!this.twin3D) return;
        
        const aerogel = parseFloat(document.getElementById('sim-aerogel').value) / 100;
        const concrete = parseFloat(document.getElementById('sim-concrete').value) / 100;
        const porosity = parseFloat(document.getElementById('sim-porosity').value) / 100;
        const strainRate = parseFloat(document.getElementById('sim-strain-rate').value);
        
        document.getElementById('twin-aerogel-val').textContent = `${(aerogel * 100).toFixed(0)}%`;
        document.getElementById('twin-porosity-val').textContent = `${(porosity * 100).toFixed(0)}%`;
        
        this.twin3D.updateParams({
            aerogelRatio: aerogel,
            concreteRatio: concrete,
            porosity: porosity,
            strainRate: strainRate,
            pressure: 50
        });
    }

    async calculateHopkinson() {
        const aerogel = parseFloat(document.getElementById('hopkinson-aerogel').value) / 100;
        const concrete = parseFloat(document.getElementById('hopkinson-concrete').value) / 100;
        const porosity = parseFloat(document.getElementById('hopkinson-porosity').value) / 100;
        const strainRate = parseFloat(document.getElementById('hopkinson-strain-rate').value);
        const pressure = parseFloat(document.getElementById('hopkinson-pressure').value);
        
        if (!aerogel || !concrete || !porosity) {
            this.showToast("请填写完整的材料参数", "error");
            return;
        }
        
        this.showLoading('hopkinson-loading');
        this.hideResults('hopkinson-results');
        
        try {
            let waveforms, stressStrain;
            const fileInput = document.getElementById('hopkinson-file-input');
            
            if (fileInput.files.length > 0) {
                const parsedData = await FileParser.parseFile(fileInput.files[0]);
                
                waveforms = {
                    incident: SignalProcessor.lowpassFilter(parsedData.incident),
                    reflected: SignalProcessor.lowpassFilter(parsedData.reflected),
                    transmitted: parsedData.transmitted.length > 0 ? 
                        SignalProcessor.lowpassFilter(parsedData.transmitted) : [],
                    time: parsedData.time,
                    sampling_rate: 1e6
                };
                
                waveforms.incident = SignalProcessor.baselineCorrect(waveforms.incident);
                waveforms.reflected = SignalProcessor.baselineCorrect(waveforms.reflected);
                if (waveforms.transmitted.length > 0) {
                    waveforms.transmitted = SignalProcessor.baselineCorrect(waveforms.transmitted);
                }
            } else {
                waveforms = SignalProcessor.simulateWaveforms(pressure, aerogel, concrete, porosity, strainRate);
            }
            
            const transmittedDetection = SignalProcessor.detectTransmittedWave(waveforms.transmitted);
            const useThreeWave = transmittedDetection.detected && waveforms.transmitted.length > 0;
            
            if (useThreeWave) {
                stressStrain = SignalProcessor.calculateStressStrainThreeWave(
                    waveforms.incident, waveforms.reflected, waveforms.transmitted, waveforms.time
                );
            } else {
                stressStrain = SignalProcessor.calculateStressStrainMissingTransmitted(
                    waveforms.incident, waveforms.reflected, waveforms.time
                );
            }
            
            const mixtureProps = this.calculator.calculateMixtureProperties(aerogel, concrete, porosity);
            const modelPrediction = this.calculator.predictEnergyAbsorption(aerogel, porosity, mixtureProps.plateau_stress / 100);
            
            const strainRateEffect = 1 + 0.0001 * (strainRate - 1000);
            
            const result = {
                density: mixtureProps.density,
                modulus: mixtureProps.modulus,
                plateau_stress: mixtureProps.plateau_stress * strainRateEffect,
                densification_strain: mixtureProps.densification_strain,
                energy_absorption: stressStrain.energy_absorption,
                strain_rate: strainRate,
                aerogel_ratio: aerogel,
                concrete_ratio: concrete,
                porosity: porosity,
                pressure: pressure,
                analysis_method: useThreeWave ? 'three_wave_method' : 'one_wave_approximation',
                model_predicted_ea: modelPrediction.energy_absorption,
                model_confidence: Math.max(0, modelPrediction.confidence - (useThreeWave ? 0 : 0.25)),
                waveforms: waveforms,
                stress_strain: stressStrain,
                transmitted_detection: transmittedDetection,
                energy_absorption_evaluation: SignalProcessor.evaluateEnergyAbsorptionEffect({
                    energy_absorption: stressStrain.energy_absorption,
                    plateau_stress: mixtureProps.plateau_stress * strainRateEffect,
                    model_confidence: modelPrediction.confidence
                }, transmittedDetection)
            };
            
            this.hopkinsonResult = result;
            this.displayHopkinsonResult(result);
            
        } catch (error) {
            console.error(error);
            this.showToast("计算失败：" + error.message, "error");
        } finally {
            this.hideLoading('hopkinson-loading');
            this.showResults('hopkinson-results');
        }
    }

    displayHopkinsonResult(result) {
        document.getElementById('hopkinson-ea-value').textContent = result.energy_absorption;
        document.getElementById('hopkinson-density').textContent = result.density;
        document.getElementById('hopkinson-modulus').textContent = result.modulus;
        document.getElementById('hopkinson-plateau-stress').textContent = result.plateau_stress;
        document.getElementById('hopkinson-densification').textContent = result.densification_strain;
        
        const eaStatus = this.getEaStatus(result.energy_absorption);
        const eaStatusEl = document.getElementById('hopkinson-ea-status');
        eaStatusEl.textContent = eaStatus.label;
        eaStatusEl.className = `kpi-status ${eaStatus.class}`;
        
        const confidence = result.model_confidence || 0.7;
        document.getElementById('hopkinson-confidence-fill').style.width = `${confidence * 100}%`;
        document.getElementById('hopkinson-confidence-value').textContent = `${(confidence * 100).toFixed(0)}%`;
        
        this.updateWaveformChart(result.waveforms, result.analysis_method === 'three_wave_method');
        
        if (result.stress_strain) {
            this.updateStressStrainChart(result.stress_strain);
        }
        
        if (result.energy_absorption_evaluation) {
            this.updateEaEvaluation(result.energy_absorption_evaluation);
        }
    }

    getEaStatus(eaValue) {
        if (eaValue >= 60) return { label: "优秀", class: "excellent" };
        if (eaValue >= 40) return { label: "良好", class: "good" };
        if (eaValue >= 25) return { label: "一般", class: "warning" };
        return { label: "较差", class: "poor" };
    }

    updateWaveformChart(waveforms, showTransmitted) {
        const ctx = document.getElementById('waveform-chart');
        if (!ctx) return;
        
        if (this.waveformChart) this.waveformChart.destroy();
        
        const downsampleFactor = Math.max(1, Math.floor(waveforms.time.length / 500));
        const downsampledTime = waveforms.time.filter((_, i) => i % downsampleFactor === 0);
        const downsampledIncident = waveforms.incident.filter((_, i) => i % downsampleFactor === 0);
        const downsampledReflected = waveforms.reflected.filter((_, i) => i % downsampleFactor === 0);
        const downsampledTransmitted = waveforms.transmitted.filter((_, i) => i % downsampleFactor === 0);
        
        const datasets = [
            { label: "入射波", data: downsampledIncident, borderColor: "rgba(14, 165, 233, 0.8)", backgroundColor: "rgba(14, 165, 233, 0.1)", borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0 },
            { label: "反射波", data: downsampledReflected, borderColor: "rgba(239, 68, 68, 0.8)", backgroundColor: "rgba(239, 68, 68, 0.1)", borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0 }
        ];
        
        if (showTransmitted && downsampledTransmitted.length > 0) {
            datasets.push({ label: "透射波", data: downsampledTransmitted, borderColor: "rgba(34, 197, 94, 0.8)", backgroundColor: "rgba(34, 197, 94, 0.1)", borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0 });
        }
        
        this.waveformChart = new Chart(ctx.getContext('2d'), {
            type: "line",
            data: { labels: downsampledTime.map(t => (t * 1e6).toFixed(0)), datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true }, tooltip: { backgroundColor: "rgba(0, 0, 0, 0.8)", titleColor: "#fff", bodyColor: "#fff" } },
                scales: {
                    y: { beginAtZero: false, grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "rgba(255, 255, 255, 0.6)" } },
                    x: { grid: { display: false }, ticks: { color: "rgba(255, 255, 255, 0.6)", maxTicksLimit: 10 } }
                }
            }
        });
    }

    updateStressStrainChart(data) {
        const ctx = document.getElementById('stress-strain-chart');
        if (!ctx) return;
        
        if (this.stressStrainChart) this.stressStrainChart.destroy();
        
        const downsampleFactor = Math.max(1, Math.floor(data.strain.length / 500));
        const downsampledStrain = data.strain.filter((_, i) => i % downsampleFactor === 0);
        const downsampledStress = data.stress.filter((_, i) => i % downsampleFactor === 0);
        
        this.stressStrainChart = new Chart(ctx.getContext('2d'), {
            type: "line",
            data: { labels: downsampledStrain.map(s => s.toFixed(4)), datasets: [{ label: "应力-应变曲线", data: downsampledStress, borderColor: "rgba(168, 85, 247, 0.8)", backgroundColor: "rgba(168, 85, 247, 0.1)", borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: "rgba(0, 0, 0, 0.8)", titleColor: "#fff", bodyColor: "#fff" } },
                scales: {
                    y: { title: { display: true, text: "应力 (MPa)", color: "rgba(255, 255, 255, 0.6)" }, grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "rgba(255, 255, 255, 0.6)" } },
                    x: { title: { display: true, text: "应变", color: "rgba(255, 255, 255, 0.6)" }, grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "rgba(255, 255, 255, 0.6)" } }
                }
            }
        });
    }

    updateEaEvaluation(evaluation) {
        document.getElementById('ea-eval-title').textContent = evaluation.level === 'excellent' ? '优秀' : 
                                                               evaluation.level === 'good' ? '良好' :
                                                               evaluation.level === 'moderate' ? '一般' : '较差';
        document.getElementById('ea-eval-conclusion').textContent = evaluation.conclusion;
        document.getElementById('ea-eval-confidence').textContent = `${(evaluation.confidence * 100).toFixed(0)}%`;
        
        const basisEl = document.getElementById('ea-eval-basis');
        basisEl.innerHTML = '';
        evaluation.basis.forEach(item => {
            const p = document.createElement('p');
            p.textContent = item;
            basisEl.appendChild(p);
        });
    }

    handleHopkinsonFileSelect(file) {
        if (file) {
            const infoEl = document.getElementById('hopkinson-file-info');
            infoEl.textContent = `已选择: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            infoEl.style.display = 'block';
            this.showToast(`已加载实验数据文件: ${file.name}`);
        }
    }

    async runOptimization() {
        const targetEa = parseFloat(document.getElementById('opt-target-ea').value);
        const targetDensity = parseFloat(document.getElementById('opt-target-density').value);
        const targetModulus = parseFloat(document.getElementById('opt-target-modulus').value);
        const iterations = parseInt(document.getElementById('opt-iterations').value);
        
        if (!targetEa || !targetDensity || !targetModulus) {
            this.showToast("请填写完整的目标参数", "error");
            return;
        }
        
        this.showLoading('optimize-loading');
        this.hideResults('optimize-results');
        
        try {
            const result = this.optimizer.optimize({
                energy_absorption: targetEa,
                density: targetDensity,
                modulus: targetModulus
            }, iterations);
            
            this.optimizationResult = result;
            
            document.getElementById('opt-confidence').textContent = `${(result.confidence * 100).toFixed(0)}%`;
            document.getElementById('opt-aerogel').textContent = `${(result.aerogel_ratio * 100).toFixed(1)}%`;
            document.getElementById('opt-concrete').textContent = `${(result.concrete_ratio * 100).toFixed(1)}%`;
            document.getElementById('opt-porosity').textContent = `${(result.porosity * 100).toFixed(1)}%`;
            document.getElementById('opt-pred-ea').textContent = result.predicted_properties?.energy_absorption || "-";
            document.getElementById('opt-pred-density').textContent = result.predicted_properties?.density || "-";
            document.getElementById('opt-pred-modulus').textContent = result.predicted_properties?.modulus || "-";
            
            this.showToast("优化完成");
            
        } catch (error) {
            console.error(error);
            this.showToast("优化失败：" + error.message, "error");
        } finally {
            this.hideLoading('optimize-loading');
            this.showResults('optimize-results');
        }
    }

    handleMorphFileSelect(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('morph-image-preview').src = e.target.result;
                document.getElementById('morph-image-editor').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    async analyzeMorphology() {
        if (!this.currentApiKey) {
            this.showToast("AI分析功能需要API Key", "warning");
            return;
        }
        
        const file = document.getElementById('morph-file-input').files[0];
        if (!file) {
            this.showToast("请上传形貌照片", "error");
            return;
        }
        
        this.showLoading('morph-loading');
        this.hideResults('morph-results');
        
        try {
            this.showToast("AI分析功能需要后端服务支持", "warning");
            
        } catch (error) {
            console.error(error);
            this.showToast("分析失败：" + error.message, "error");
        } finally {
            this.hideLoading('morph-loading');
        }
    }

    runSimulation() {
        const aerogel = parseFloat(document.getElementById('sim-aerogel').value) / 100;
        const concrete = parseFloat(document.getElementById('sim-concrete').value) / 100;
        const porosity = parseFloat(document.getElementById('sim-porosity').value) / 100;
        const strainRate = parseFloat(document.getElementById('sim-strain-rate').value);
        
        const result = this.calculator.calculateHopkinsonResponse(aerogel, concrete, porosity, strainRate);
        
        document.getElementById('sim-ea').textContent = result.energy_absorption;
        document.getElementById('sim-density').textContent = result.density;
        document.getElementById('sim-modulus').textContent = result.modulus;
        
        this.updateSimulationChart(result);
        
        if (this.twin3D) {
            this.twin3D.updateParams({
                aerogelRatio: aerogel,
                concreteRatio: concrete,
                porosity: porosity,
                strainRate: strainRate,
                pressure: 50
            });
            this.twin3D.runSimulation();
        }
        
        this.showToast("模拟完成");
    }

    updateSimulationChart(result) {
        const ctx = document.getElementById('simulation-chart');
        if (!ctx) return;
        
        if (this.simulationChart) this.simulationChart.destroy();
        
        this.simulationChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['能量吸收', '密度', '模量'],
                datasets: [{
                    label: '模拟结果',
                    data: [result.energy_absorption, result.density / 10, result.modulus / 1000],
                    backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(14, 165, 233, 0.8)', 'rgba(168, 85, 247, 0.8)'],
                    borderColor: ['rgba(99, 102, 241, 1)', 'rgba(14, 165, 233, 1)', 'rgba(168, 85, 247, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "rgba(255, 255, 255, 0.6)" } },
                    x: { grid: { display: false }, ticks: { color: "rgba(255, 255, 255, 0.6)" } }
                }
            }
        });
    }

    async runBatchAnalysis() {
        const aerogelMin = parseFloat(document.getElementById('batch-aerogel-min').value) / 100;
        const aerogelMax = parseFloat(document.getElementById('batch-aerogel-max').value) / 100;
        const porosityMin = parseFloat(document.getElementById('batch-porosity-min').value) / 100;
        const porosityMax = parseFloat(document.getElementById('batch-porosity-max').value) / 100;
        const samples = parseInt(document.getElementById('batch-samples').value);
        
        if (!aerogelMin || !aerogelMax || !porosityMin || !porosityMax) {
            this.showToast("请填写完整的参数范围", "error");
            return;
        }
        
        this.showLoading('batch-loading');
        this.hideResults('batch-results');
        
        try {
            const results = [];
            for (let i = 0; i < samples; i++) {
                const aerogel = aerogelMin + (aerogelMax - aerogelMin) * i / (samples - 1);
                const porosity = porosityMin + (porosityMax - porosityMin) * (i % 5) / 4;
                const concrete = 1 - aerogel;
                
                const result = this.calculator.calculateHopkinsonResponse(aerogel, concrete, porosity);
                results.push(result);
            }
            
            this.updateBatchChart(results);
            
            this.showToast(`批量分析完成，共 ${results.length} 组数据`);
            
        } catch (error) {
            console.error(error);
            this.showToast("批量分析失败：" + error.message, "error");
        } finally {
            this.hideLoading('batch-loading');
            this.showResults('batch-results');
        }
    }

    updateBatchChart(results) {
        const ctx = document.getElementById('batch-chart');
        if (!ctx) return;
        
        if (this.batchChart) this.batchChart.destroy();
        
        const labels = results.map((r, i) => `组${i + 1}`);
        const eaData = results.map(r => r.energy_absorption);
        const densityData = results.map(r => r.density);
        
        this.batchChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '能量吸收', data: eaData, borderColor: 'rgba(99, 102, 241, 0.8)', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderWidth: 2, fill: true },
                    { label: '密度', data: densityData, borderColor: 'rgba(14, 165, 233, 0.8)', backgroundColor: 'rgba(14, 165, 233, 0.1)', borderWidth: 2, fill: true, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: {
                    y: { type: 'linear', display: true, position: 'left', grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "rgba(255, 255, 255, 0.6)" } },
                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: "rgba(255, 255, 255, 0.6)" } },
                    x: { grid: { display: false }, ticks: { color: "rgba(255, 255, 255, 0.6)" } }
                }
            }
        });
    }

    generateReport() {
        if (!this.hopkinsonResult && !this.optimizationResult) {
            this.showToast("请先完成至少一项分析", "error");
            return;
        }
        
        let report = `# 材料性能分析报告\n\n`;
        report += `## 一、基本信息\n\n`;
        report += `- 生成时间: ${new Date().toLocaleString()}\n`;
        report += `- 分析类型: 霍普金森压杆实验\n\n`;
        
        if (this.hopkinsonResult) {
            report += `## 二、霍普金森分析结果\n\n`;
            report += `### 材料参数\n`;
            report += `- 气凝胶比例: ${(this.hopkinsonResult.aerogel_ratio * 100).toFixed(1)}%\n`;
            report += `- 混凝土比例: ${(this.hopkinsonResult.concrete_ratio * 100).toFixed(1)}%\n`;
            report += `- 孔隙率: ${(this.hopkinsonResult.porosity * 100).toFixed(1)}%\n`;
            report += `- 应变率: ${this.hopkinsonResult.strain_rate} s⁻¹\n\n`;
            
            report += `### 计算结果\n`;
            report += `- 能量吸收: ${this.hopkinsonResult.energy_absorption} J/cm³\n`;
            report += `- 密度: ${this.hopkinsonResult.density} kg/m³\n`;
            report += `- 弹性模量: ${this.hopkinsonResult.modulus} MPa\n`;
            report += `- 平台应力: ${this.hopkinsonResult.plateau_stress} MPa\n`;
            report += `- 致密化应变: ${this.hopkinsonResult.densification_strain}\n\n`;
        }
        
        if (this.optimizationResult) {
            report += `## 三、配比优化结果\n\n`;
            report += `- 最优气凝胶比例: ${(this.optimizationResult.aerogel_ratio * 100).toFixed(1)}%\n`;
            report += `- 最优混凝土比例: ${(this.optimizationResult.concrete_ratio * 100).toFixed(1)}%\n`;
            report += `- 最优孔隙率: ${(this.optimizationResult.porosity * 100).toFixed(1)}%\n\n`;
            
            report += `### 预测性能\n`;
            report += `- 能量吸收: ${this.optimizationResult.predicted_properties?.energy_absorption || '-'} J/cm³\n`;
            report += `- 密度: ${this.optimizationResult.predicted_properties?.density || '-'} kg/m³\n`;
            report += `- 弹性模量: ${this.optimizationResult.predicted_properties?.modulus || '-'} MPa\n\n`;
        }
        
        report += `## 四、结论\n\n`;
        report += `分析完成，数据已保存。\n`;
        
        document.getElementById('report-body').innerHTML = marked.parse(report);
        document.getElementById('report-content').style.display = 'block';
        
        this.showToast("报告生成完成");
    }

    showLoading(id) {
        document.getElementById(id).style.display = 'flex';
    }

    hideLoading(id) {
        document.getElementById(id).style.display = 'none';
    }

    showResults(id) {
        document.getElementById(id).style.display = 'flex';
    }

    hideResults(id) {
        document.getElementById(id).style.display = 'none';
    }

    showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add("fade-out");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});