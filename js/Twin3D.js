class Twin3D {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.meshGroup = null;
        
        this.params = {
            aerogelRatio: 0.4,
            concreteRatio: 0.6,
            porosity: 0.4,
            strainRate: 1000,
            pressure: 50
        };

        this.sceneObjects = {};
        
        this.animationId = null;
        this.isAnimating = false;
        this.animationProgress = 0;
        this.isInitialized = false;
        
        this.debugInfo = {
            initAttempts: 0,
            lastError: null,
            containerReady: false,
            threeLoaded: typeof THREE !== 'undefined',
            containerWidth: 0,
            containerHeight: 0,
            initializationTime: null,
            lastRetryTime: null
        };
        
        this.retryTimer = null;
        this.maxRetryAttempts = 10;
        this.retryDelay = 200;
    }

    init() {
        if (this.isInitialized) {
            console.log('[Twin3D] Already initialized, skipping');
            return;
        }
        
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        
        this.debugInfo.initAttempts++;
        this.debugInfo.lastRetryTime = new Date().toISOString();
        
        try {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                this.debugInfo.lastError = 'Container not found: ' + this.containerId;
                console.error('[Twin3D] Container not found:', this.containerId);
                this.scheduleRetry();
                return;
            }
            
            const computedStyle = window.getComputedStyle(this.container);
            const width = this.container.clientWidth || parseInt(computedStyle.width) || 0;
            const height = this.container.clientHeight || parseInt(computedStyle.height) || 0;
            
            this.debugInfo.containerWidth = width;
            this.debugInfo.containerHeight = height;
            
            if (width === 0 || height === 0) {
                this.debugInfo.lastError = 'Container size is zero: ' + width + 'x' + height;
                console.warn('[Twin3D] Container size is zero (attempt ' + this.debugInfo.initAttempts + '), scheduling retry...');
                this.scheduleRetry();
                return;
            }
            
            this.debugInfo.containerReady = true;
            
            if (typeof THREE === 'undefined') {
                this.debugInfo.lastError = 'THREE is not defined';
                console.error('[Twin3D] THREE.js is not loaded');
                this.scheduleRetry();
                return;
            }
            
            this.debugInfo.threeLoaded = true;
            
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0a0e17);
            this.scene.fog = new THREE.Fog(0x0a0e17, 15, 50);

            this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
            this.camera.position.set(12, 6, 10);
            this.camera.lookAt(0, 1, 0);

            this.debugInfo.webglSupport = this.checkWebGLSupport();
            console.log('[Twin3D] WebGL Support:', this.debugInfo.webglSupport);
            
            if (!this.debugInfo.webglSupport.supported) {
                this.debugInfo.lastError = 'WebGL not supported: ' + this.debugInfo.webglSupport.message;
                console.error('[Twin3D] WebGL not supported:', this.debugInfo.webglSupport);
                return;
            }

            try {
                this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                console.log('[Twin3D] Renderer created successfully');
            } catch (rendererError) {
                this.debugInfo.lastError = 'Renderer creation failed: ' + rendererError.message;
                console.error('[Twin3D] Failed to create WebGLRenderer:', rendererError);
                this.scheduleRetry();
                return;
            }
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            let canvasContainer = this.container.querySelector('.twin-3d-canvas');
            if (!canvasContainer) {
                canvasContainer = document.createElement('div');
                canvasContainer.className = 'twin-3d-canvas';
                canvasContainer.style.width = '100%';
                canvasContainer.style.height = '100%';
                canvasContainer.style.position = 'absolute';
                canvasContainer.style.top = '0';
                canvasContainer.style.left = '0';
                this.container.insertBefore(canvasContainer, this.container.firstChild);
            }
            const existingCanvas = canvasContainer.querySelector('canvas');
            if (existingCanvas) {
                canvasContainer.removeChild(existingCanvas);
            }
            canvasContainer.appendChild(this.renderer.domElement);

            this.setupLighting();
            this.createSceneObjects();
            this.addGround();

            window.addEventListener('resize', () => this.onWindowResize());
            
            this.addInteraction();

            this.isInitialized = true;
            this.debugInfo.initializationTime = new Date().toISOString();
            console.log('[Twin3D] Initialization complete after ' + this.debugInfo.initAttempts + ' attempts');
            this.animate();
            
        } catch (error) {
            this.debugInfo.lastError = error.message;
            console.error('[Twin3D] Initialization failed:', error);
            this.scheduleRetry();
        }
    }

    scheduleRetry() {
        if (this.isInitialized) return;
        if (this.debugInfo.initAttempts >= this.maxRetryAttempts) {
            console.error('[Twin3D] Max retry attempts reached (' + this.maxRetryAttempts + '), giving up');
            return;
        }
        
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
        }
        
        const delay = this.retryDelay * Math.pow(1.5, this.debugInfo.initAttempts - 1);
        console.log('[Twin3D] Scheduling retry in ' + delay + 'ms (attempt ' + this.debugInfo.initAttempts + '/' + this.maxRetryAttempts + ')');
        
        this.retryTimer = setTimeout(() => {
            this.init();
        }, delay);
    }

    checkWebGLSupport() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl', { preserveDrawingBuffer: false });
        const gl2 = canvas.getContext('webgl2', { preserveDrawingBuffer: false });
        
        let supported = false;
        let message = '';
        let version = '';
        
        if (gl2) {
            supported = true;
            version = 'WebGL 2.0';
            message = 'WebGL 2.0 is supported';
        } else if (gl) {
            supported = true;
            version = 'WebGL 1.0';
            message = 'WebGL 1.0 is supported';
        } else {
            supported = false;
            version = 'None';
            message = 'WebGL is not supported in this browser';
        }
        
        if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
        if (gl2) gl2.getExtension('WEBGL_lose_context')?.loseContext();
        
        return {
            supported: supported,
            version: version,
            message: message,
            webgl1: !!gl,
            webgl2: !!gl2
        };
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x4a5568, 0.55);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.3);
        mainLight.position.set(12, 18, 12);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 60;
        mainLight.shadow.camera.left = -20;
        mainLight.shadow.camera.right = 20;
        mainLight.shadow.camera.top = 20;
        mainLight.shadow.camera.bottom = -20;
        mainLight.shadow.bias = -0.0001;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x6366f1, 0.5);
        fillLight.position.set(-12, 8, -12);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.35);
        rimLight.position.set(0, -8, 15);
        this.scene.add(rimLight);

        const warmFillLight = new THREE.DirectionalLight(0xffa726, 0.25);
        warmFillLight.position.set(8, 4, -8);
        this.scene.add(warmFillLight);

        const spotLight1 = new THREE.SpotLight(0xffffff, 0.8);
        spotLight1.position.set(-8, 6, 5);
        spotLight1.angle = Math.PI / 6;
        spotLight1.penumbra = 0.3;
        spotLight1.target.position.set(-5, 1.5, 0);
        this.scene.add(spotLight1);
        this.scene.add(spotLight1.target);

        const spotLight2 = new THREE.SpotLight(0x6366f1, 0.5);
        spotLight2.position.set(8, 6, 5);
        spotLight2.angle = Math.PI / 6;
        spotLight2.penumbra = 0.3;
        spotLight2.target.position.set(5, 1.5, 0);
        this.scene.add(spotLight2);
        this.scene.add(spotLight2.target);

        const pointLight1 = new THREE.PointLight(0x4fc3f7, 0.6, 15);
        pointLight1.position.set(-3, 3, 3);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xffcc80, 0.5, 15);
        pointLight2.position.set(3, 3, 3);
        this.scene.add(pointLight2);

        const hemisphereLight = new THREE.HemisphereLight(0x606dbc, 0x404080, 0.3);
        this.scene.add(hemisphereLight);
    }

    addGround() {
        const groundGeometry = new THREE.PlaneGeometry(40, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a2234,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const gridHelper = new THREE.GridHelper(40, 40, 0x2d3a4f, 0x1e2a3d);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
    }

    createSceneObjects() {
        this.meshGroup = new THREE.Group();
        this.scene.add(this.meshGroup);

        this.createHopkinsonSystem();
    }

    createHopkinsonSystem() {
        const rodRadius = 0.3;
        const incidentLength = 6;
        const transmittedLength = 5;
        const absorbLength = 4;
        const specimenLength = 0.4;
        const impactorLength = 1.5;

        const incidentMaterial = new THREE.MeshStandardMaterial({
            color: 0xe53935,
            metalness: 0.92,
            roughness: 0.18
        });

        const transmittedMaterial = new THREE.MeshStandardMaterial({
            color: 0xfbc02d,
            metalness: 0.92,
            roughness: 0.18
        });

        const absorbMaterial = new THREE.MeshStandardMaterial({
            color: 0x212121,
            metalness: 0.85,
            roughness: 0.35
        });

        const specimenMaterial = new THREE.MeshStandardMaterial({
            color: 0x6366f1,
            metalness: 0.25,
            roughness: 0.55
        });

        const metalMaterial = new THREE.MeshStandardMaterial({
            color: 0x757575,
            metalness: 0.92,
            roughness: 0.25
        });

        const flangeMaterial = new THREE.MeshStandardMaterial({
            color: 0x546e7a,
            metalness: 0.85,
            roughness: 0.2
        });

        const goldMaterial = new THREE.MeshStandardMaterial({
            color: 0xffc107,
            metalness: 0.85,
            roughness: 0.18
        });

        this.createAirGun(-10, 1.5);

        const impactorGroup = new THREE.Group();

        const impactor = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 0.9, rodRadius * 0.9, impactorLength, 32),
            metalMaterial
        );
        impactor.rotation.z = Math.PI / 2;
        impactor.position.set(0, 0, 0);
        impactor.castShadow = true;
        impactorGroup.add(impactor);

        const impactorFrontFlange = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.2, rodRadius * 1.2, 0.08, 32),
            flangeMaterial
        );
        impactorFrontFlange.rotation.z = Math.PI / 2;
        impactorFrontFlange.position.set(impactorLength / 2 - 0.04, 0, 0);
        impactorGroup.add(impactorFrontFlange);

        const impactorBackFlange = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.5, rodRadius * 1.5, 0.12, 32),
            flangeMaterial
        );
        impactorBackFlange.rotation.z = Math.PI / 2;
        impactorBackFlange.position.set(-impactorLength / 2 + 0.06, 0, 0);
        impactorGroup.add(impactorBackFlange);

        for (let i = 0; i < 6; i++) {
            const bolt = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.1, 8),
                new THREE.MeshStandardMaterial({
                    color: 0x424242,
                    metalness: 0.9,
                    roughness: 0.2
                })
            );
            bolt.position.set(
                -impactorLength / 2 + 0.06,
                Math.cos((i / 6) * Math.PI * 2) * rodRadius * 1.35,
                Math.sin((i / 6) * Math.PI * 2) * rodRadius * 1.35
            );
            impactorGroup.add(bolt);
        }

        impactorGroup.position.set(-7.5, 1.5, 0);
        this.meshGroup.add(impactorGroup);
        this.sceneObjects.impactor = impactor;

        const incidentRodGroup = new THREE.Group();

        const incidentRod = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius, rodRadius, incidentLength, 32),
            incidentMaterial
        );
        incidentRod.rotation.z = Math.PI / 2;
        incidentRod.position.set(0, 0, 0);
        incidentRod.castShadow = true;
        incidentRod.receiveShadow = true;
        incidentRodGroup.add(incidentRod);

        for (let i = 0; i < 4; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(rodRadius, 0.02, 8, 32),
                new THREE.MeshStandardMaterial({
                    color: 0xb71c1c,
                    metalness: 0.8,
                    roughness: 0.3
                })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.set(-incidentLength / 2 + 1 + i * 1.3, 0, 0);
            incidentRodGroup.add(ring);
        }

        const incidentFrontFlange = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.4, rodRadius * 1.4, 0.1, 32),
            flangeMaterial
        );
        incidentFrontFlange.rotation.z = Math.PI / 2;
        incidentFrontFlange.position.set(incidentLength / 2 - 0.05, 0, 0);
        incidentRodGroup.add(incidentFrontFlange);

        const incidentBackFlange = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.3, rodRadius * 1.3, 0.08, 32),
            flangeMaterial
        );
        incidentBackFlange.rotation.z = Math.PI / 2;
        incidentBackFlange.position.set(-incidentLength / 2 + 0.04, 0, 0);
        incidentRodGroup.add(incidentBackFlange);

        incidentRodGroup.position.set(-2, 1.5, 0);
        this.meshGroup.add(incidentRodGroup);
        this.sceneObjects.incidentRod = incidentRod;

        this.addStrainGauges(-4, 1.5, rodRadius);
        this.addStrainGauges(-1, 1.5, rodRadius);

        const specimenGroup = new THREE.Group();

        const specimenGeometry = new THREE.CylinderGeometry(rodRadius * 1.2, rodRadius * 1.2, specimenLength, 32);
        const specimen = new THREE.Mesh(specimenGeometry, specimenMaterial);
        specimen.rotation.z = Math.PI / 2;
        specimen.position.set(0, 0, 0);
        specimen.castShadow = true;
        specimen.receiveShadow = true;
        specimenGroup.add(specimen);

        const specimenEndCap1 = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.2, rodRadius * 1.2, 0.03, 32),
            new THREE.MeshStandardMaterial({
                color: 0x455a64,
                metalness: 0.6,
                roughness: 0.4
            })
        );
        specimenEndCap1.rotation.z = Math.PI / 2;
        specimenEndCap1.position.set(-specimenLength / 2 - 0.015, 0, 0);
        specimenGroup.add(specimenEndCap1);

        const specimenEndCap2 = specimenEndCap1.clone();
        specimenEndCap2.position.set(specimenLength / 2 + 0.015, 0, 0);
        specimenGroup.add(specimenEndCap2);

        const clampRing1 = new THREE.Mesh(
            new THREE.TorusGeometry(rodRadius * 1.5, 0.06, 16, 32),
            new THREE.MeshStandardMaterial({
                color: 0x546e7a,
                metalness: 0.75,
                roughness: 0.25
            })
        );
        clampRing1.rotation.x = Math.PI / 2;
        clampRing1.position.set(-specimenLength / 2 - 0.08, 0, 0);
        specimenGroup.add(clampRing1);

        const clampRing2 = clampRing1.clone();
        clampRing2.position.set(specimenLength / 2 + 0.08, 0, 0);
        specimenGroup.add(clampRing2);

        const clampScrew1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8),
            new THREE.MeshStandardMaterial({
                color: 0x757575,
                metalness: 0.85,
                roughness: 0.2
            })
        );
        clampScrew1.position.set(-specimenLength / 2 - 0.08, rodRadius * 1.6, 0);
        specimenGroup.add(clampScrew1);

        const clampScrew2 = clampScrew1.clone();
        clampScrew2.position.set(specimenLength / 2 + 0.08, rodRadius * 1.6, 0);
        specimenGroup.add(clampScrew2);

        specimenGroup.position.set(0, 1.5, 0);
        this.meshGroup.add(specimenGroup);
        this.sceneObjects.specimen = specimen;

        const transmittedRodGroup = new THREE.Group();

        const transmittedRod = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius, rodRadius, transmittedLength, 32),
            transmittedMaterial
        );
        transmittedRod.rotation.z = Math.PI / 2;
        transmittedRod.position.set(0, 0, 0);
        transmittedRod.castShadow = true;
        transmittedRod.receiveShadow = true;
        transmittedRodGroup.add(transmittedRod);

        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(rodRadius, 0.02, 8, 32),
                new THREE.MeshStandardMaterial({
                    color: 0xe65100,
                    metalness: 0.8,
                    roughness: 0.3
                })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.set(-transmittedLength / 2 + 1 + i * 1.5, 0, 0);
            transmittedRodGroup.add(ring);
        }

        const transmittedFrontFlange = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.3, rodRadius * 1.3, 0.08, 32),
            flangeMaterial
        );
        transmittedFrontFlange.rotation.z = Math.PI / 2;
        transmittedFrontFlange.position.set(transmittedLength / 2 - 0.04, 0, 0);
        transmittedRodGroup.add(transmittedFrontFlange);

        const transmittedBackFlange = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.4, rodRadius * 1.4, 0.1, 32),
            flangeMaterial
        );
        transmittedBackFlange.rotation.z = Math.PI / 2;
        transmittedBackFlange.position.set(-transmittedLength / 2 + 0.05, 0, 0);
        transmittedRodGroup.add(transmittedBackFlange);

        transmittedRodGroup.position.set(2.5, 1.5, 0);
        this.meshGroup.add(transmittedRodGroup);
        this.sceneObjects.transmittedRod = transmittedRod;

        this.addStrainGauges(1, 1.5, rodRadius);
        this.addStrainGauges(4, 1.5, rodRadius);

        const absorbRodGroup = new THREE.Group();

        const absorbRod = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.1, rodRadius * 1.1, absorbLength, 32),
            absorbMaterial
        );
        absorbRod.rotation.z = Math.PI / 2;
        absorbRod.position.set(0, 0, 0);
        absorbRod.castShadow = true;
        absorbRod.receiveShadow = true;
        absorbRodGroup.add(absorbRod);

        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(rodRadius * 1.1, 0.025, 8, 32),
                new THREE.MeshStandardMaterial({
                    color: 0x424242,
                    metalness: 0.7,
                    roughness: 0.4
                })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.set(-absorbLength / 2 + 0.8 + i * 1.2, 0, 0);
            absorbRodGroup.add(ring);
        }

        const absorbFrontFlange = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.6, rodRadius * 1.6, 0.12, 32),
            flangeMaterial
        );
        absorbFrontFlange.rotation.z = Math.PI / 2;
        absorbFrontFlange.position.set(absorbLength / 2 - 0.06, 0, 0);
        absorbRodGroup.add(absorbFrontFlange);

        const absorbBackFlange = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.4, rodRadius * 1.4, 0.1, 32),
            flangeMaterial
        );
        absorbBackFlange.rotation.z = Math.PI / 2;
        absorbBackFlange.position.set(-absorbLength / 2 + 0.05, 0, 0);
        absorbRodGroup.add(absorbBackFlange);

        absorbRodGroup.position.set(7, 1.5, 0);
        this.meshGroup.add(absorbRodGroup);
        this.sceneObjects.absorbRod = absorbRod;

        this.createBufferDevice(9.5, 1.5, rodRadius);

        this.createSupports();

        this.createBasePlatform();

        this.createPressureIndicator();
        this.createStrainEffect();
    }

    createAirGun(xPos, yPos) {
        const gunGroup = new THREE.Group();

        const cylinderBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.85, 0.65, 4.5, 32),
            new THREE.MeshStandardMaterial({
                color: 0x424242,
                metalness: 0.85,
                roughness: 0.25
            })
        );
        cylinderBody.rotation.z = Math.PI / 2;
        cylinderBody.position.set(xPos - 1.2, yPos, 0);
        gunGroup.add(cylinderBody);

        for (let i = 0; i < 5; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.85, 0.03, 16, 32),
                new THREE.MeshStandardMaterial({
                    color: 0x616161,
                    metalness: 0.9,
                    roughness: 0.2
                })
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.set(xPos - 3.2 + i * 0.9, yPos, 0);
            gunGroup.add(ring);
        }

        const cylinderEnd = new THREE.Mesh(
            new THREE.CylinderGeometry(0.9, 0.9, 0.35, 32),
            new THREE.MeshStandardMaterial({
                color: 0x37474f,
                metalness: 0.9,
                roughness: 0.15
            })
        );
        cylinderEnd.rotation.z = Math.PI / 2;
        cylinderEnd.position.set(xPos - 3.4, yPos, 0);
        gunGroup.add(cylinderEnd);

        const endFlange = new THREE.Mesh(
            new THREE.CylinderGeometry(1.1, 1.1, 0.08, 32),
            new THREE.MeshStandardMaterial({
                color: 0x546e7a,
                metalness: 0.85,
                roughness: 0.2
            })
        );
        endFlange.rotation.z = Math.PI / 2;
        endFlange.position.set(xPos - 3.58, yPos, 0);
        gunGroup.add(endFlange);

        const gunNozzle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.38, 0.42, 1, 32),
            new THREE.MeshStandardMaterial({
                color: 0x616161,
                metalness: 0.9,
                roughness: 0.15
            })
        );
        gunNozzle.rotation.z = Math.PI / 2;
        gunNozzle.position.set(xPos + 1.3, yPos, 0);
        gunGroup.add(gunNozzle);

        const nozzleInner = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.28, 0.6, 32),
            new THREE.MeshStandardMaterial({
                color: 0x212121,
                metalness: 0.7,
                roughness: 0.5
            })
        );
        nozzleInner.rotation.z = Math.PI / 2;
        nozzleInner.position.set(xPos + 1.7, yPos, 0);
        gunGroup.add(nozzleInner);

        const pressureGauge = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.28, 0.18, 32),
            new THREE.MeshStandardMaterial({
                color: 0xffc107,
                metalness: 0.75,
                roughness: 0.25
            })
        );
        pressureGauge.position.set(xPos - 1, yPos + 1, 0);
        gunGroup.add(pressureGauge);

        const gaugeDial = new THREE.Mesh(
            new THREE.RingGeometry(0.2, 0.26, 48),
            new THREE.MeshStandardMaterial({
                color: 0x0d47a1,
                metalness: 0.4,
                roughness: 0.3,
                side: THREE.DoubleSide
            })
        );
        gaugeDial.position.set(xPos - 1, yPos + 1, 0.095);
        gunGroup.add(gaugeDial);

        const gaugeNeedle = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.2, 0.04),
            new THREE.MeshStandardMaterial({
                color: 0xe53935,
                metalness: 0.6,
                roughness: 0.25
            })
        );
        gaugeNeedle.position.set(xPos - 1, yPos + 1, 0.1);
        gaugeNeedle.rotation.z = -Math.PI / 6;
        gunGroup.add(gaugeNeedle);

        const gaugeCenter = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16),
            new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                metalness: 0.9,
                roughness: 0.2
            })
        );
        gaugeCenter.position.set(xPos - 1, yPos + 1, 0.1);
        gunGroup.add(gaugeCenter);

        const gaugeMount = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.4, 16),
            new THREE.MeshStandardMaterial({
                color: 0x546e7a,
                metalness: 0.7,
                roughness: 0.3
            })
        );
        gaugeMount.position.set(xPos - 1, yPos + 0.7, 0);
        gunGroup.add(gaugeMount);

        const valveBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 0.3, 24),
            new THREE.MeshStandardMaterial({
                color: 0x616161,
                metalness: 0.85,
                roughness: 0.2
            })
        );
        valveBody.position.set(xPos - 2, yPos + 0.6, 0);
        gunGroup.add(valveBody);

        const valveHandle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8),
            new THREE.MeshStandardMaterial({
                color: 0xff5722,
                metalness: 0.7,
                roughness: 0.3
            })
        );
        valveHandle.rotation.x = Math.PI / 2;
        valveHandle.position.set(xPos - 2, yPos + 0.75, 0.18);
        gunGroup.add(valveHandle);

        const valveKnob = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0xff5722,
                metalness: 0.6,
                roughness: 0.3
            })
        );
        valveKnob.position.set(xPos - 1.75, yPos + 0.75, 0.18);
        gunGroup.add(valveKnob);

        const valveKnob2 = valveKnob.clone();
        valveKnob2.position.set(xPos - 2.25, yPos + 0.75, 0.18);
        gunGroup.add(valveKnob2);

        const pressureLine = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8),
            new THREE.MeshStandardMaterial({
                color: 0x424242,
                metalness: 0.8,
                roughness: 0.25
            })
        );
        pressureLine.position.set(xPos - 1.5, yPos + 0.8, 0);
        gunGroup.add(pressureLine);

        this.meshGroup.add(gunGroup);
        this.sceneObjects.airGun = gunGroup;
    }

    addStrainGauges(xPos, yPos, rodRadius) {
        const gaugeGroup = new THREE.Group();
        gaugeGroup.position.set(xPos, yPos, rodRadius + 0.04);

        const gaugeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.05,
            roughness: 0.85
        });

        const gauge1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.35, 0.18),
            gaugeMaterial
        );
        gauge1.position.set(0, 0, 0);
        gaugeGroup.add(gauge1);

        const gauge2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.35, 0.18),
            gaugeMaterial
        );
        gauge2.position.set(0, 0.25, 0);
        gaugeGroup.add(gauge2);

        const gauge3 = new THREE.Mesh(
            new THREE.BoxGeometry(0.015, 0.35, 0.18),
            gaugeMaterial
        );
        gauge3.position.set(0, -0.25, 0);
        gaugeGroup.add(gauge3);

        const terminalBlock = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.2, 0.12),
            new THREE.MeshStandardMaterial({
                color: 0x1a237e,
                metalness: 0.3,
                roughness: 0.6
            })
        );
        terminalBlock.position.set(0, 0.4, 0.08);
        gaugeGroup.add(terminalBlock);

        const terminalScrew1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8),
            new THREE.MeshStandardMaterial({
                color: 0x757575,
                metalness: 0.8,
                roughness: 0.2
            })
        );
        terminalScrew1.position.set(-0.025, 0.43, 0.08);
        gaugeGroup.add(terminalScrew1);

        const terminalScrew2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8),
            new THREE.MeshStandardMaterial({
                color: 0x757575,
                metalness: 0.8,
                roughness: 0.2
            })
        );
        terminalScrew2.position.set(0.025, 0.43, 0.08);
        gaugeGroup.add(terminalScrew2);

        const wireMaterial = new THREE.MeshStandardMaterial({
            color: 0xff5722,
            metalness: 0.5,
            roughness: 0.35
        });

        const wire1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.004, 0.004, 0.35, 8),
            wireMaterial
        );
        wire1.rotation.x = Math.PI / 2;
        wire1.position.set(0, 0.3, 0.1);
        gaugeGroup.add(wire1);

        const wire2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.004, 0.004, 0.35, 8),
            wireMaterial
        );
        wire2.rotation.x = Math.PI / 2;
        wire2.position.set(0, -0.1, 0.1);
        gaugeGroup.add(wire2);

        const connectorPin = new THREE.Mesh(
            new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8),
            new THREE.MeshStandardMaterial({
                color: 0x424242,
                metalness: 0.7,
                roughness: 0.3
            })
        );
        connectorPin.position.set(0, 0.45, 0.08);
        gaugeGroup.add(connectorPin);

        this.meshGroup.add(gaugeGroup);
    }

    createBufferDevice(xPos, yPos, rodRadius) {
        const bufferGroup = new THREE.Group();

        const bufferBody = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 2.8, rodRadius * 2.8, 1.5, 32),
            new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                metalness: 0.85,
                roughness: 0.35
            })
        );
        bufferBody.rotation.z = Math.PI / 2;
        bufferBody.position.set(xPos, yPos, 0);
        bufferGroup.add(bufferBody);

        const bufferInner = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.5, rodRadius * 1.5, 1.2, 32),
            new THREE.MeshStandardMaterial({
                color: 0x212121,
                metalness: 0.6,
                roughness: 0.5
            })
        );
        bufferInner.rotation.z = Math.PI / 2;
        bufferInner.position.set(xPos, yPos, 0);
        bufferGroup.add(bufferInner);

        const bufferEndPlate = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 3.2, rodRadius * 3.2, 0.18, 32),
            new THREE.MeshStandardMaterial({
                color: 0x424242,
                metalness: 0.9,
                roughness: 0.15
            })
        );
        bufferEndPlate.rotation.z = Math.PI / 2;
        bufferEndPlate.position.set(xPos + 0.85, yPos, 0);
        bufferGroup.add(bufferEndPlate);

        const mountingFlange = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 3.5, rodRadius * 3.5, 0.08, 32),
            new THREE.MeshStandardMaterial({
                color: 0x546e7a,
                metalness: 0.8,
                roughness: 0.2
            })
        );
        mountingFlange.rotation.z = Math.PI / 2;
        mountingFlange.position.set(xPos + 0.94, yPos, 0);
        bufferGroup.add(mountingFlange);

        const springMaterial = new THREE.MeshStandardMaterial({
            color: 0x616161,
            metalness: 0.75,
            roughness: 0.25
        });

        const createSpring = (sx, sy, sz) => {
            const springGroup = new THREE.Group();
            for (let i = 0; i < 4; i++) {
                const coil = new THREE.Mesh(
                    new THREE.TorusGeometry(rodRadius * 0.9, 0.06, 8, 24),
                    springMaterial
                );
                coil.rotation.x = Math.PI / 2;
                coil.position.set(sx + i * 0.25, sy, sz);
                springGroup.add(coil);
            }
            return springGroup;
        };

        const spring1 = createSpring(xPos - 0.3, yPos, rodRadius * 1.8);
        bufferGroup.add(spring1);

        const spring2 = createSpring(xPos - 0.3, yPos, -rodRadius * 1.8);
        bufferGroup.add(spring2);

        const spring3 = createSpring(xPos + 0.3, yPos, rodRadius * 1.2);
        bufferGroup.add(spring3);

        const spring4 = createSpring(xPos + 0.3, yPos, -rodRadius * 1.2);
        bufferGroup.add(spring4);

        const dampingRod = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 1, 16),
            new THREE.MeshStandardMaterial({
                color: 0x757575,
                metalness: 0.8,
                roughness: 0.2
            })
        );
        dampingRod.position.set(xPos, yPos + 0.6, 0);
        bufferGroup.add(dampingRod);

        const dampingRod2 = dampingRod.clone();
        dampingRod2.position.set(xPos, yPos - 0.6, 0);
        bufferGroup.add(dampingRod2);

        const rubberPad = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.3, rodRadius * 1.3, 0.12, 32),
            new THREE.MeshStandardMaterial({
                color: 0x37474f,
                metalness: 0.2,
                roughness: 0.7
            })
        );
        rubberPad.rotation.z = Math.PI / 2;
        rubberPad.position.set(xPos - 0.6, yPos, 0);
        bufferGroup.add(rubberPad);

        const retainingRing = new THREE.Mesh(
            new THREE.TorusGeometry(rodRadius * 2.8, 0.05, 16, 32),
            new THREE.MeshStandardMaterial({
                color: 0x546e7a,
                metalness: 0.8,
                roughness: 0.2
            })
        );
        retainingRing.rotation.x = Math.PI / 2;
        retainingRing.position.set(xPos - 0.7, yPos, 0);
        bufferGroup.add(retainingRing);

        this.meshGroup.add(bufferGroup);
        this.sceneObjects.bufferDevice = bufferGroup;
    }

    createSupports() {
        const positions = [-5, -2, 2, 5, 8];

        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x455a64,
            metalness: 0.65,
            roughness: 0.45
        });

        const postMaterial = new THREE.MeshStandardMaterial({
            color: 0x607d8b,
            metalness: 0.55,
            roughness: 0.45
        });

        const cradleMaterial = new THREE.MeshStandardMaterial({
            color: 0x78909c,
            metalness: 0.5,
            roughness: 0.35
        });

        const grooveMaterial = new THREE.MeshStandardMaterial({
            color: 0x546e7a,
            metalness: 0.65,
            roughness: 0.35
        });

        positions.forEach(xPos => {
            const supportGroup = new THREE.Group();

            const basePlate = new THREE.Mesh(
                new THREE.BoxGeometry(1.3, 0.12, 1.1),
                baseMaterial
            );
            basePlate.position.set(xPos, 0.06, 0);
            basePlate.castShadow = true;
            supportGroup.add(basePlate);

            const foot1 = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.08, 0.3),
                baseMaterial
            );
            foot1.position.set(xPos - 0.45, 0.04, 0.35);
            supportGroup.add(foot1);

            const foot2 = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.08, 0.3),
                baseMaterial
            );
            foot2.position.set(xPos + 0.45, 0.04, 0.35);
            supportGroup.add(foot2);

            const foot3 = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.08, 0.3),
                baseMaterial
            );
            foot3.position.set(xPos - 0.45, 0.04, -0.35);
            supportGroup.add(foot3);

            const foot4 = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.08, 0.3),
                baseMaterial
            );
            foot4.position.set(xPos + 0.45, 0.04, -0.35);
            supportGroup.add(foot4);

            const verticalPost = new THREE.Mesh(
                new THREE.BoxGeometry(0.14, 1.4, 0.65),
                postMaterial
            );
            verticalPost.position.set(xPos, 0.75, 0);
            verticalPost.castShadow = true;
            supportGroup.add(verticalPost);

            const postReinforcement = new THREE.Mesh(
                new THREE.BoxGeometry(0.18, 0.15, 0.7),
                postMaterial
            );
            postReinforcement.position.set(xPos, 0.18, 0);
            supportGroup.add(postReinforcement);

            const topCradle = new THREE.Mesh(
                new THREE.BoxGeometry(1.1, 0.14, 0.75),
                cradleMaterial
            );
            topCradle.position.set(xPos, 1.52, 0);
            topCradle.castShadow = true;
            supportGroup.add(topCradle);

            const cradleGroove = new THREE.Mesh(
                new THREE.CylinderGeometry(0.32, 0.32, 0.16, 32),
                grooveMaterial
            );
            cradleGroove.rotation.z = Math.PI / 2;
            cradleGroove.position.set(xPos, 1.52, 0);
            supportGroup.add(cradleGroove);

            const clampBracket = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.25, 0.5),
                new THREE.MeshStandardMaterial({
                    color: 0x546e7a,
                    metalness: 0.7,
                    roughness: 0.3
                })
            );
            clampBracket.position.set(xPos, 1.65, 0.3);
            supportGroup.add(clampBracket);

            const clampBracket2 = clampBracket.clone();
            clampBracket2.position.set(xPos, 1.65, -0.3);
            supportGroup.add(clampBracket2);

            const clampingScrew = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.06, 0.4, 16),
                new THREE.MeshStandardMaterial({
                    color: 0x757575,
                    metalness: 0.85,
                    roughness: 0.2
                })
            );
            clampingScrew.position.set(xPos, 1.75, 0);
            supportGroup.add(clampingScrew);

            const screwHead = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16),
                new THREE.MeshStandardMaterial({
                    color: 0x9e9e9e,
                    metalness: 0.8,
                    roughness: 0.2
                })
            );
            screwHead.position.set(xPos, 1.97, 0);
            supportGroup.add(screwHead);

            const setScrew = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8),
                new THREE.MeshStandardMaterial({
                    color: 0x757575,
                    metalness: 0.8,
                    roughness: 0.2
                })
            );
            setScrew.position.set(xPos + 0.45, 1.52, 0.4);
            supportGroup.add(setScrew);

            const setScrew2 = setScrew.clone();
            setScrew2.position.set(xPos - 0.45, 1.52, 0.4);
            supportGroup.add(setScrew2);

            this.meshGroup.add(supportGroup);
        });
    }

    createBasePlatform() {
        const platformGroup = new THREE.Group();

        const mainPlatform = new THREE.Mesh(
            new THREE.BoxGeometry(30, 0.35, 3.8),
            new THREE.MeshStandardMaterial({
                color: 0x37474f,
                metalness: 0.55,
                roughness: 0.55
            })
        );
        mainPlatform.position.set(0, 0.175, 0);
        mainPlatform.receiveShadow = true;
        platformGroup.add(mainPlatform);

        const platformTopSurface = new THREE.Mesh(
            new THREE.BoxGeometry(30, 0.05, 3.8),
            new THREE.MeshStandardMaterial({
                color: 0x455a64,
                metalness: 0.5,
                roughness: 0.6
            })
        );
        platformTopSurface.position.set(0, 0.35, 0);
        platformGroup.add(platformTopSurface);

        for (let i = -14; i <= 14; i += 2) {
            const gridLine = new THREE.Mesh(
                new THREE.BoxGeometry(0.03, 0.02, 3.6),
                new THREE.MeshStandardMaterial({
                    color: 0x546e7a,
                    metalness: 0.3,
                    roughness: 0.7
                })
            );
            gridLine.position.set(i, 0.36, 0);
            platformGroup.add(gridLine);
        }

        const platformEdge = new THREE.Mesh(
            new THREE.BoxGeometry(30, 0.45, 0.25),
            new THREE.MeshStandardMaterial({
                color: 0x546e7a,
                metalness: 0.65,
                roughness: 0.45
            })
        );
        platformEdge.position.set(0, 0.4, 1.775);
        platformEdge.castShadow = true;
        platformGroup.add(platformEdge);

        const platformEdge2 = platformEdge.clone();
        platformEdge2.position.set(0, 0.4, -1.775);
        platformGroup.add(platformEdge2);

        const platformEndCap1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.25, 0.45, 3.8),
            new THREE.MeshStandardMaterial({
                color: 0x546e7a,
                metalness: 0.65,
                roughness: 0.45
            })
        );
        platformEndCap1.position.set(-14.875, 0.4, 0);
        platformGroup.add(platformEndCap1);

        const platformEndCap2 = platformEndCap1.clone();
        platformEndCap2.position.set(14.875, 0.4, 0);
        platformGroup.add(platformEndCap2);

        const controlPanel = new THREE.Mesh(
            new THREE.BoxGeometry(6.5, 0.28, 2.2),
            new THREE.MeshStandardMaterial({
                color: 0x1e272e,
                metalness: 0.45,
                roughness: 0.5
            })
        );
        controlPanel.position.set(0, 0.51, -2.7);
        controlPanel.castShadow = true;
        platformGroup.add(controlPanel);

        const panelBezel = new THREE.Mesh(
            new THREE.BoxGeometry(6.7, 0.32, 2.3),
            new THREE.MeshStandardMaterial({
                color: 0x455a64,
                metalness: 0.6,
                roughness: 0.4
            })
        );
        panelBezel.position.set(0, 0.48, -2.7);
        platformGroup.add(panelBezel);

        const displayScreen = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 0.03, 2),
            new THREE.MeshStandardMaterial({
                color: 0x00bcd4,
                metalness: 0.25,
                roughness: 0.15,
                emissive: 0x006064,
                emissiveIntensity: 0.35
            })
        );
        displayScreen.position.set(0, 0.57, -2.69);
        platformGroup.add(displayScreen);

        const screenFrame = new THREE.Mesh(
            new THREE.BoxGeometry(3.7, 0.05, 2.1),
            new THREE.MeshStandardMaterial({
                color: 0x1a237e,
                metalness: 0.6,
                roughness: 0.3
            })
        );
        screenFrame.position.set(0, 0.555, -2.68);
        platformGroup.add(screenFrame);

        const ledIndicator1 = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0x4caf50,
                metalness: 0.3,
                roughness: 0.2,
                emissive: 0x2e7d32,
                emissiveIntensity: 0.5
            })
        );
        ledIndicator1.position.set(-1.8, 0.54, -2.69);
        platformGroup.add(ledIndicator1);

        const ledIndicator2 = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0xffc107,
                metalness: 0.3,
                roughness: 0.2,
                emissive: 0xff8f00,
                emissiveIntensity: 0.5
            })
        );
        ledIndicator2.position.set(-1.6, 0.54, -2.69);
        platformGroup.add(ledIndicator2);

        const ledIndicator3 = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0xf44336,
                metalness: 0.3,
                roughness: 0.2,
                emissive: 0xc62828,
                emissiveIntensity: 0.5
            })
        );
        ledIndicator3.position.set(-1.4, 0.54, -2.69);
        platformGroup.add(ledIndicator3);

        const buttonMaterial = new THREE.MeshStandardMaterial({
            metalness: 0.65,
            roughness: 0.35
        });

        const button1 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.07, 0.06, 16),
            buttonMaterial.clone()
        );
        button1.material.color.setHex(0x4caf50);
        button1.position.set(1.6, 0.53, -2.69);
        platformGroup.add(button1);

        const button2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.07, 0.06, 16),
            buttonMaterial.clone()
        );
        button2.material.color.setHex(0xf44336);
        button2.position.set(2.0, 0.53, -2.69);
        platformGroup.add(button2);

        const button3 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.07, 0.06, 16),
            buttonMaterial.clone()
        );
        button3.material.color.setHex(0xffc107);
        button3.position.set(2.4, 0.53, -2.69);
        platformGroup.add(button3);

        const knob = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.14, 0.1, 24),
            new THREE.MeshStandardMaterial({
                color: 0xffc107,
                metalness: 0.75,
                roughness: 0.25
            })
        );
        knob.position.set(-1.2, 0.53, -2.69);
        platformGroup.add(knob);

        const knobTop = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.14, 0.04, 24),
            new THREE.MeshStandardMaterial({
                color: 0xffd54f,
                metalness: 0.7,
                roughness: 0.2
            })
        );
        knobTop.position.set(-1.2, 0.57, -2.69);
        platformGroup.add(knobTop);

        const dialMarks = [];
        for (let i = 0; i < 12; i++) {
            const mark = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.03, 0.01),
                new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    metalness: 0.1,
                    roughness: 0.5
                })
            );
            const angle = (i / 12) * Math.PI * 2;
            mark.position.set(
                -1.2 + Math.cos(angle) * 0.18,
                0.53,
                -2.69 + Math.sin(angle) * 0.005
            );
            mark.rotation.y = -angle;
            dialMarks.push(mark);
        }
        dialMarks.forEach(m => platformGroup.add(m));

        const sliderTrack = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.8, 0.03),
            new THREE.MeshStandardMaterial({
                color: 0x37474f,
                metalness: 0.5,
                roughness: 0.5
            })
        );
        sliderTrack.position.set(2.8, 0.55, -2.69);
        platformGroup.add(sliderTrack);

        const sliderHandle = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.15, 0.05),
            new THREE.MeshStandardMaterial({
                color: 0x64b5f6,
                metalness: 0.6,
                roughness: 0.3
            })
        );
        sliderHandle.position.set(2.8, 0.55, -2.685);
        platformGroup.add(sliderHandle);

        const cableOutlet = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16),
            new THREE.MeshStandardMaterial({
                color: 0x263238,
                metalness: 0.5,
                roughness: 0.4
            })
        );
        cableOutlet.position.set(0, 0.39, -3.8);
        platformGroup.add(cableOutlet);

        const cable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 2, 8),
            new THREE.MeshStandardMaterial({
                color: 0x37474f,
                metalness: 0.3,
                roughness: 0.6
            })
        );
        cable.position.set(0, 0.1, -4.8);
        platformGroup.add(cable);

        const cableEnd = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 0.15, 16),
            new THREE.MeshStandardMaterial({
                color: 0x546e7a,
                metalness: 0.7,
                roughness: 0.3
            })
        );
        cableEnd.position.set(0, 0.025, -5.8);
        platformGroup.add(cableEnd);

        this.meshGroup.add(platformGroup);
    }

    createPressureIndicator() {
        const indicatorGroup = new THREE.Group();
        indicatorGroup.position.set(-4, 2.5, -1.5);

        const gaugeBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.6, 0.1),
            new THREE.MeshStandardMaterial({
                color: 0x2d3a4f,
                metalness: 0.7,
                roughness: 0.3
            })
        );
        indicatorGroup.add(gaugeBase);

        const needle = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.25, 0.05),
            new THREE.MeshStandardMaterial({
                color: 0xe53935,
                metalness: 0.5,
                roughness: 0.3
            })
        );
        needle.position.set(0, 0.125, 0);
        needle.rotation.z = -Math.PI / 4;
        indicatorGroup.add(needle);
        this.sceneObjects.pressureNeedle = needle;

        const dial = new THREE.Mesh(
            new THREE.RingGeometry(0.25, 0.35, 64),
            new THREE.MeshStandardMaterial({
                color: 0x1e88e5,
                metalness: 0.6,
                roughness: 0.4,
                side: THREE.DoubleSide
            })
        );
        dial.position.set(0, -0.15, 0.06);
        indicatorGroup.add(dial);

        this.meshGroup.add(indicatorGroup);
    }

    createStrainEffect() {
        const particlesGeometry = new THREE.BufferGeometry();
        const particleCount = 200;
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 1] = 1.5 + (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1;
            velocities[i * 3] = (Math.random() - 0.5) * 0.02;
            velocities[i * 3 + 1] = Math.random() * 0.01;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particlesMaterial = new THREE.PointsMaterial({
            color: 0x6366f1,
            size: 0.03,
            transparent: true,
            opacity: 0.6
        });

        const particles = new THREE.Points(particlesGeometry, particlesMaterial);
        particles.visible = false;
        this.meshGroup.add(particles);
        this.sceneObjects.strainParticles = particles;
        this.sceneObjects.strainVelocities = velocities;
    }

    addInteraction() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let targetRotationX = 0;
        let targetRotationY = 0;

        const container = this.container;

        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            targetRotationY += deltaX * 0.005;
            targetRotationX += deltaY * 0.005;
            targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotationX));
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        container.addEventListener('mouseup', () => {
            isDragging = false;
        });

        container.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        let scale = 1;
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            scale += e.deltaY * -0.001;
            scale = Math.max(0.5, Math.min(2, scale));
            this.camera.position.set(8 * scale, 5 * scale, 8 * scale);
        });

        this.updateRotation = () => {
            if (this.meshGroup) {
                this.meshGroup.rotation.y += (targetRotationY - this.meshGroup.rotation.y) * 0.05;
                this.meshGroup.rotation.x += (targetRotationX - this.meshGroup.rotation.x) * 0.05;
            }
        };
    }

    updateParams(newParams) {
        if (!this.isInitialized) {
            console.warn('[Twin3D] Cannot update params - not initialized');
            return;
        }
        
        this.params = { ...this.params, ...newParams };
        
        if (this.sceneObjects.specimen) {
            const aerogelColor = new THREE.Color(0x6366f1);
            const concreteColor = new THREE.Color(0x8b7355);
            const mixedColor = aerogelColor.lerp(concreteColor, this.params.concreteRatio);
            this.sceneObjects.specimen.material.color = mixedColor;

            const porosityScale = 1 - this.params.porosity * 0.3;
            this.sceneObjects.specimen.scale.set(porosityScale, porosityScale, porosityScale);
        }

        if (this.sceneObjects.pressureNeedle) {
            const pressureRatio = Math.min(this.params.pressure / 200, 1);
            this.sceneObjects.pressureNeedle.rotation.z = -Math.PI / 4 + pressureRatio * Math.PI / 2;
        }

        if (this.sceneObjects.impactor) {
            const strainRateEffect = 1 + this.params.strainRate / 5000;
            this.sceneObjects.impactor.position.x = -5.2 + Math.sin(Date.now() * 0.001 * strainRateEffect * 0.5) * 0.5;
        }

        if (this.sceneObjects.strainParticles) {
            this.sceneObjects.strainParticles.visible = this.params.strainRate > 500;
        }

        this.isAnimating = true;
    }

    runSimulation() {
        if (!this.isInitialized) {
            console.log('[Twin3D] Running init before simulation');
            this.init();
            if (!this.isInitialized) {
                console.error('[Twin3D] Failed to initialize for simulation');
                return;
            }
        }
        this.isAnimating = true;
        this.animationProgress = 0;
    }

    onWindowResize() {
        if (!this.isInitialized || !this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    checkAndFixCanvasSize() {
        if (!this.isInitialized || !this.container || !this.renderer) return;
        
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        const canvasWidth = this.renderer.domElement.width;
        const canvasHeight = this.renderer.domElement.height;
        
        if (Math.abs(containerWidth - canvasWidth) > 10 || Math.abs(containerHeight - canvasHeight) > 10) {
            console.log('[Twin3D] Canvas size mismatch detected:', canvasWidth + 'x' + canvasHeight, '->', containerWidth + 'x' + containerHeight);
            this.camera.aspect = containerWidth / containerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(containerWidth, containerHeight);
        }
    }

    animate() {
        if (!this.isInitialized) {
            this.animationId = requestAnimationFrame(() => this.animate());
            return;
        }

        this.animationId = requestAnimationFrame(() => this.animate());

        this.checkAndFixCanvasSize();

        if (this.updateRotation) {
            this.updateRotation();
        }

        if (this.isAnimating) {
            this.animationProgress += 0.005;
            
            if (this.sceneObjects.strainParticles && this.params.strainRate > 500) {
                const positions = this.sceneObjects.strainParticles.geometry.attributes.position.array;
                const velocities = this.sceneObjects.strainVelocities;
                
                for (let i = 0; i < positions.length / 3; i++) {
                    positions[i * 3] += velocities[i * 3];
                    positions[i * 3 + 1] += velocities[i * 3 + 1];
                    positions[i * 3 + 2] += velocities[i * 3 + 2];
                    
                    if (positions[i * 3 + 1] > 2.5) {
                        positions[i * 3 + 1] = 1.2;
                        positions[i * 3] = (Math.random() - 0.5) * 2;
                        positions[i * 3 + 2] = (Math.random() - 0.5) * 1;
                    }
                }
                
                this.sceneObjects.strainParticles.geometry.attributes.position.needsUpdate = true;
            }

            if (this.animationProgress > 2) {
                this.isAnimating = false;
            }
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        window.removeEventListener('resize', () => this.onWindowResize());
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.container && this.renderer && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
        
        this.isInitialized = false;
    }

    getDebugInfo() {
        return { ...this.debugInfo };
    }

    checkStatus() {
        const status = {
            isInitialized: this.isInitialized,
            containerExists: !!this.container,
            containerWidth: this.container ? this.container.clientWidth : 0,
            containerHeight: this.container ? this.container.clientHeight : 0,
            threeLoaded: typeof THREE !== 'undefined',
            sceneExists: !!this.scene,
            cameraExists: !!this.camera,
            rendererExists: !!this.renderer,
            meshGroupExists: !!this.meshGroup,
            animationId: this.animationId,
            isAnimating: this.isAnimating,
            debugInfo: this.debugInfo
        };
        
        console.log('[Twin3D] Status Check:', status);
        return status;
    }

    forceInit() {
        if (this.isInitialized) {
            this.destroy();
        }
        this.init();
    }
}

function loadThreeJS(callback) {
    if (typeof THREE !== 'undefined') {
        console.log('[Twin3D] THREE.js already loaded');
        callback();
        return;
    }
    
    console.log('[Twin3D] Loading THREE.js from CDN');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    script.onload = () => {
        console.log('[Twin3D] THREE.js loaded successfully');
        callback();
    };
    script.onerror = () => {
        console.error('[Twin3D] THREE.js loading failed');
        callback();
    };
    document.head.appendChild(script);
}