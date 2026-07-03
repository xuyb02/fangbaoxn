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
    }

    init() {
        if (this.isInitialized) return;
        
        this.container = document.getElementById(this.containerId);
        if (!this.container) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        if (width === 0 || height === 0) return;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0e17);
        this.scene.fog = new THREE.Fog(0x0a0e17, 15, 50);

        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(8, 5, 8);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        this.setupLighting();
        this.createSceneObjects();
        this.addGround();

        window.addEventListener('resize', () => this.onWindowResize());
        
        this.addInteraction();

        this.isInitialized = true;
        this.animate();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(10, 15, 10);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        mainLight.shadow.camera.left = -15;
        mainLight.shadow.camera.right = 15;
        mainLight.shadow.camera.top = 15;
        mainLight.shadow.camera.bottom = -15;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x6366f1, 0.4);
        fillLight.position.set(-10, 5, -10);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.3);
        rimLight.position.set(0, -5, 10);
        this.scene.add(rimLight);
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
        const specimenLength = 0.4;

        const rodMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b8b8b,
            metalness: 0.9,
            roughness: 0.2
        });

        const specimenMaterial = new THREE.MeshStandardMaterial({
            color: 0x6366f1,
            metalness: 0.3,
            roughness: 0.5
        });

        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d3a4f,
            metalness: 0.6,
            roughness: 0.4
        });

        const blueFrameMaterial = new THREE.MeshStandardMaterial({
            color: 0x1e88e5,
            metalness: 0.7,
            roughness: 0.3
        });

        const incidentRod = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius, rodRadius, incidentLength, 32),
            rodMaterial
        );
        incidentRod.rotation.z = Math.PI / 2;
        incidentRod.position.set(-incidentLength / 2 - transmittedLength / 2 - specimenLength / 2, 1.5, 0);
        incidentRod.castShadow = true;
        incidentRod.receiveShadow = true;
        this.meshGroup.add(incidentRod);
        this.sceneObjects.incidentRod = incidentRod;

        const transmittedRod = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius, rodRadius, transmittedLength, 32),
            rodMaterial
        );
        transmittedRod.rotation.z = Math.PI / 2;
        transmittedRod.position.set(transmittedLength / 2 + incidentLength / 2 + specimenLength / 2, 1.5, 0);
        transmittedRod.castShadow = true;
        transmittedRod.receiveShadow = true;
        this.meshGroup.add(transmittedRod);
        this.sceneObjects.transmittedRod = transmittedRod;

        const specimenGeometry = new THREE.CylinderGeometry(rodRadius * 1.2, rodRadius * 1.2, specimenLength, 32);
        const specimen = new THREE.Mesh(specimenGeometry, specimenMaterial);
        specimen.rotation.z = Math.PI / 2;
        specimen.position.set(0, 1.5, 0);
        specimen.castShadow = true;
        specimen.receiveShadow = true;
        this.meshGroup.add(specimen);
        this.sceneObjects.specimen = specimen;

        const createBase = (xPos) => {
            const baseGroup = new THREE.Group();
            
            const verticalSupport = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 1.5, 0.8),
                blueFrameMaterial
            );
            verticalSupport.position.set(xPos, 0.75, 0);
            verticalSupport.castShadow = true;
            baseGroup.add(verticalSupport);

            const horizontalSupport = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 0.1, 0.9),
                blueFrameMaterial
            );
            horizontalSupport.position.set(xPos, 1.5, 0);
            horizontalSupport.castShadow = true;
            baseGroup.add(horizontalSupport);

            const basePlate = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 0.15, 1.2),
                baseMaterial
            );
            basePlate.position.set(xPos, 0.075, 0);
            basePlate.receiveShadow = true;
            baseGroup.add(basePlate);

            return baseGroup;
        };

        const leftBase = createBase(-4);
        this.meshGroup.add(leftBase);
        this.sceneObjects.leftBase = leftBase;

        const rightBase = createBase(4);
        this.meshGroup.add(rightBase);
        this.sceneObjects.rightBase = rightBase;

        const impactor = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 0.9, rodRadius * 0.9, 1.5, 32),
            new THREE.MeshStandardMaterial({
                color: 0xe53935,
                metalness: 0.8,
                roughness: 0.3
            })
        );
        impactor.rotation.z = Math.PI / 2;
        impactor.position.set(-incidentLength / 2 - transmittedLength / 2 - specimenLength / 2 - incidentLength / 2, 1.5, 0);
        impactor.castShadow = true;
        this.meshGroup.add(impactor);
        this.sceneObjects.impactor = impactor;

        const endCap = new THREE.Mesh(
            new THREE.CylinderGeometry(rodRadius * 1.1, rodRadius * 1.1, 0.2, 32),
            new THREE.MeshStandardMaterial({
                color: 0x424242,
                metalness: 0.9,
                roughness: 0.3
            })
        );
        endCap.rotation.z = Math.PI / 2;
        endCap.position.set(transmittedLength / 2 + incidentLength / 2 + specimenLength / 2 + transmittedLength / 2, 1.5, 0);
        endCap.castShadow = true;
        this.meshGroup.add(endCap);
        this.sceneObjects.endCap = endCap;

        this.createPressureIndicator();
        this.createStrainEffect();
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

        this.container.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            targetRotationY += deltaX * 0.005;
            targetRotationX += deltaY * 0.005;
            targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotationX));
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.container.addEventListener('mouseup', () => {
            isDragging = false;
        });

        this.container.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        let scale = 1;
        this.container.addEventListener('wheel', (e) => {
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
        if (!this.isInitialized) return;
        
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
            this.init();
            if (!this.isInitialized) return;
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

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

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
}

function loadThreeJS(callback) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
    script.onload = callback;
    script.onerror = () => {
        console.error('Three.js loading failed');
        callback();
    };
    document.head.appendChild(script);
}