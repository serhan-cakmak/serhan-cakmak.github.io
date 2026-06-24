import * as THREE from 'three'
import Project from './Project'
import gsap from 'gsap'

export default class ProjectsSection
{
    constructor(_options)
    {
        // Options
        this.time = _options.time
        this.resources = _options.resources
        this.camera = _options.camera
        this.passes = _options.passes
        this.objects = _options.objects
        this.areas = _options.areas
        this.zones = _options.zones
        this.tiles = _options.tiles
        this.debug = _options.debug
        this.x = _options.x
        this.y = _options.y

        // Debug
        if(this.debug)
        {
            this.debugFolder = this.debug.addFolder('projects')
            this.debugFolder.open()
        }

        // Set up
        this.items = []

        this.interDistance = 24
        this.positionRandomess = 5
        this.projectHalfWidth = 9

        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        this.container.updateMatrix()

        this.setGeometries()
        this.setMeshes()
        this.setList()
        this.setZone()

        // Add all project from the list
        for(const _options of this.list)
        {
            this.add(_options)
        }
    }

    setGeometries()
    {
        this.geometries = {}
        this.geometries.floor = new THREE.PlaneGeometry(20, 8)
    }

    setMeshes()
    {
        this.meshes = {}

        this.resources.items.areaOpenTexture.magFilter = THREE.NearestFilter
        this.resources.items.areaOpenTexture.minFilter = THREE.LinearFilter
        this.meshes.boardPlane = this.resources.items.projectsBoardPlane.scene.children[0]
        this.meshes.areaLabel    = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: this.resources.items.areaOpenTexture }))
        this.meshes.areaLabel.matrixAutoUpdate = false

        // Custom labels — white text on black (alphaMap: white = visible)
        this.meshes.enlargeLabel = this._makeCanvasLabel('⬆  ENLARGE IMAGE')
        this.meshes.githubLabel  = this._makeCanvasLabel('GITHUB  ↗')
    }

    _makeCanvasLabel(text)
    {
        const canvas = document.createElement('canvas')
        canvas.width  = 512
        canvas.height = 128
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, 512, 128)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 66px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(text, 256, 66)
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(3.5, 0.875),   // was 2×0.5 — larger world footprint
            new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: new THREE.CanvasTexture(canvas) })
        )
        mesh.matrixAutoUpdate = false
        return mesh
    }

    // Floor texture: alphaMap canvas — white = visible on floor, black = transparent.
    // Canvas 1024×512 matches PlaneGeometry(16,8) 2:1 ratio.
    // Content occupies the top ~55%; the bottom stays black so the OPEN/GITHUB area is clear.
    // Canvas 1280×512 matches the new PlaneGeometry(20, 8) aspect ratio (2.5:1).
    _buildFloorTexture({ title, institution, description })
    {
        const W = 1280, H = 512
        const canvas = document.createElement('canvas')
        canvas.width  = W
        canvas.height = H
        const ctx = canvas.getContext('2d')

        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, W, H)

        ctx.textAlign = 'center'

        // Title
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 72px Arial, sans-serif'
        ctx.fillText(title, W / 2, 92)

        // Divider
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.fillRect(80, 114, W - 160, 2)

        // Institution
        ctx.font = '42px Arial, sans-serif'
        ctx.fillStyle = '#aaaaaa'
        ctx.fillText(institution, W / 2, 162)

        // Description — auto word-wrap so long strings don't overflow
        if(description)
        {
            ctx.font = '38px Arial, sans-serif'
            ctx.fillStyle = '#cccccc'
            const maxLineWidth = W - 140
            const rawLines = Array.isArray(description) ? description : [description]
            let y = 228
            for(const raw of rawLines.slice(0, 2))
            {
                const words = raw.split(' ')
                let current = ''
                for(const word of words)
                {
                    const test = current ? `${current} ${word}` : word
                    if(ctx.measureText(test).width > maxLineWidth && current)
                    {
                        ctx.fillText(current, W / 2, y)
                        y += 50
                        current = word
                    }
                    else { current = test }
                }
                if(current) { ctx.fillText(current, W / 2, y); y += 50 }
            }
        }

        return new THREE.CanvasTexture(canvas)
    }

    setList()
    {
        // TODO(projects-overview): Each object below is one project board in the 3D world.
        // Fields you need to fill in for each project:
        //   name        → displayed as the board title (keep it short, ~15 chars max)
        //   imageSources → array of slide images shown on the board.
        //                  Put them in: static/models/projects/<folderName>/slideA.webp etc.
        //                  Use screenshots, diagrams, or figures from your paper/repo.
        //                  Recommended: 3–4 slides, 1200×675 px, .webp format.
        //   floorTexture → the coloured floor tile under each board.
        //                  File: static/models/projects/<folderName>/floorTexture.webp
        //                  A small (~256×256 px) solid-colour or logo image works well.
        //                  Its resource name must also exist in Resources.js (already done).
        //   link.href   → the URL that opens when the player drives onto the board's button.
        //                  Replace the placeholder profile URL with the specific repo URL.

        this.list = [
            {
                // TODO(project-repo-1): replace href with the specific repo URL when public
                name: 'Data Augmentation with Gaussian Splatting',
                imageSources:
                [
                    './models/projects/gaussianSplatting/slideA.png',
                    './models/projects/gaussianSplatting/slideB.png',
                    './models/projects/gaussianSplatting/slideC.png'
                ],
                floorTexture: this._buildFloorTexture({
                    title:       'Gaussian Splatting',
                    institution: 'BSc Thesis · Bogazici University · 2025',
                    description: [ 'Tackled data scarcity in multi-view classification by synthesising', 'novel views with COLMAP + 3DGS. Accuracy improved 90.9% → 93.2%.' ]
                }),
                link:
                {
                    href: 'https://github.com/serhan-cakmak/MultiView-Classification-with-Gaussian-Splatting-Augmentation',
                    x: - 4.8,
                    y: - 3,
                    halfExtents: { x: 3.2, y: 1.5 }
                },
                distinctions: []
            },
            {
                // TODO(project-repo-2): replace href with the specific repo URL when public
                name: 'Monocular Depth',
                imageSources:
                [
                    './models/projects/monocularDepth/slideA.png',
                    './models/projects/monocularDepth/slideB.png',
                    './models/projects/monocularDepth/slideC.png'
                ],
                floorTexture: this._buildFloorTexture({
                    title:       'Monocular Depth Estimation',
                    institution: 'CIL · ETH Zurich',
                    description: [ 'Extended Depth Anything V2 with FiLM conditioning on the CLS token', 'to inject global scene context and resolve local scale ambiguities.' ]
                }),
                link:
                {
                    href: 'https://github.com/ahmetfirat23/computational_intelligence_lab',
                    x: - 4.8,
                    y: - 3,
                    halfExtents: { x: 3.2, y: 1.5 }
                },
                distinctions: []
            },
            {
                // TODO(project-repo-3): replace href with the specific repo URL when public
                name: 'LLM Throughput',
                imageSources:
                [
                    './models/projects/llmThroughput/slideA.png',
                    './models/projects/llmThroughput/slideB.png'
                ],
                floorTexture: this._buildFloorTexture({
                    title:       'LLM Throughput',
                    institution: 'Large-Scale AI Engineering · ETH Zurich',
                    description: [ 'Optimised training throughput of a 140B Megatron-LM on GH200 GPUs', 'using Flash Attention, 1F1B pipeline and tensor parallelism.' ]
                }),
                link:
                {
                    href: 'https://github.com/serhan-cakmak/Large_ScaleAI',
                    x: - 4.8,
                    y: - 3,
                    halfExtents: { x: 3.2, y: 1.5 }
                },
                distinctions: []
            },
            {
                // TODO(project-repo-4): replace href with the specific repo URL when public
                name: 'Adversarial ML',
                floorTexture: this._buildFloorTexture({
                    title:       'Adversarial Robustness',
                    institution: 'Reliable & Trustworthy AI · ETH Zurich',
                    description: [ 'Built a DeepPoly-based certified verifier and PGD adversarial training', 'under non-convex constraints to harden models against bounded perturbations.' ]
                }),
                link:
                {
                    href: 'https://github.com/serhan-cakmak/fair-representation-robustness-framework',
                    x: - 4.8,
                    y: - 3,
                    halfExtents: { x: 3.2, y: 1.5 }
                },
                distinctions: []
            }
        ]
    }

    setZone()
    {
        const totalWidth = this.list.length * (this.interDistance / 2)

        const zone = this.zones.add({
            position: { x: this.x + totalWidth - this.projectHalfWidth - 6, y: this.y },
            halfExtents: { x: totalWidth, y: 12 },
            data: { cameraAngle: 'projects' }
        })

        zone.on('in', (_data) =>
        {
            this.camera.angle.set(_data.cameraAngle)
            gsap.to(this.passes.horizontalBlurPass.material.uniforms.uStrength.value, { x: 0, duration: 2 })
            gsap.to(this.passes.verticalBlurPass.material.uniforms.uStrength.value, { y: 0, duration: 2 })

        })

        zone.on('out', () =>
        {
            this.camera.angle.set('default')
            gsap.to(this.passes.horizontalBlurPass.material.uniforms.uStrength.value, { x: this.passes.horizontalBlurPass.strength, duration: 2 })
            gsap.to(this.passes.verticalBlurPass.material.uniforms.uStrength.value, { y: this.passes.verticalBlurPass.strength, duration: 2 })
        })
    }

    add(_options)
    {
        const x = this.x + this.items.length * this.interDistance
        let y = this.y
        if(this.items.length > 0)
        {
            y += (Math.random() - 0.5) * this.positionRandomess
        }

        // Create project
        const project = new Project({
            time: this.time,
            resources: this.resources,
            objects: this.objects,
            areas: this.areas,
            zones: this.zones,
            geometries: this.geometries,
            meshes: this.meshes,
            debug: this.debugFolder,
            x: x,
            y: y,
            ..._options
        })

        this.container.add(project.container)

        // Add tiles
        if(this.items.length >= 1)
        {
            const previousProject = this.items[this.items.length - 1]
            const start = new THREE.Vector2(previousProject.x + this.projectHalfWidth, previousProject.y)
            const end = new THREE.Vector2(project.x - this.projectHalfWidth, project.y)
            const delta = end.clone().sub(start)
            this.tiles.add({
                start: start,
                delta: delta
            })
        }

        // Save
        this.items.push(project)
    }
}
