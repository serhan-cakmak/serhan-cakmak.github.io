import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'

export default class InformationSection
{
    constructor(_options)
    {
        // Options
        this.time = _options.time
        this.resources = _options.resources
        this.objects = _options.objects
        this.areas = _options.areas
        this.tiles = _options.tiles
        this.debug = _options.debug
        this.x = _options.x
        this.y = _options.y

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        this.setStatic()
        this.setLinks()
        this.setActivities()
        this.setPublications()
        this.setTiles()
    }

    setStatic()
    {
        // Store the result so setLinks() can clone platform tiles from it
        this._staticObj = this.objects.add({
            base: this.resources.items.informationStaticBase.scene,
            collision: this.resources.items.informationStaticCollision.scene,
            floorShadowTexture: this.resources.items.informationStaticFloorShadowTexture,
            offset: new THREE.Vector3(this.x, this.y, 0),
            mass: 0
        })
    }

    setLinks()
    {
        // Set up
        this.links = {}
        this.links.x = 1.95
        this.links.y = - 1.5
        this.links.halfExtents = {}
        this.links.halfExtents.x = 1
        this.links.halfExtents.y = 1
        this.links.distanceBetween = 2.4
        this.links.labelWidth = this.links.halfExtents.x * 2 + 1
        this.links.labelGeometry = new THREE.PlaneGeometry(this.links.labelWidth, this.links.labelWidth * 0.25, 1, 1)
        this.links.labelOffset = - 1.6
        this.links.items = []

        this.links.container = new THREE.Object3D()
        this.links.container.matrixAutoUpdate = false
        this.container.add(this.links.container)

        // Options
        // All link labels are canvas-generated plain text (no border/box).
        // Canvas 512×128 (4:1) matches PlaneGeometry(3, 0.75).
        // White text on black → alphaMap: white = visible, black = transparent.
        const _lbl = (text) =>
        {
            const c = document.createElement('canvas')
            c.width = 512; c.height = 128
            const x = c.getContext('2d')
            x.fillStyle = '#000000'
            x.fillRect(0, 0, 512, 128)
            x.fillStyle = '#ffffff'
            x.font = 'bold 62px Arial, sans-serif'
            x.textAlign = 'center'
            x.textBaseline = 'middle'
            x.fillText(text, 256, 66)
            return new THREE.CanvasTexture(c)
        }

        // First 4 entries match the baked GLB platform tiles.
        // Entries 5–6 (Letterboxd, Spotify) get synthetic Three.js platform tiles added below.
        this.links.options = [
            {
                href: 'https://drive.google.com/file/d/1pP4FdU0Ev2MDGo1uztkCfD0MyhM2p-8n/view?usp=sharing',
                labelTexture: _lbl('CV')
            },
            {
                href: 'https://github.com/serhan-cakmak',
                labelTexture: _lbl('GitHub')
            },
            {
                href: 'https://www.linkedin.com/in/serhan-%C3%A7akmak-934890219/',
                labelTexture: _lbl('LinkedIn')
            },
            {
                href: 'mailto:cakmakserhan02@icloud.com',
                labelTexture: _lbl('Mail')
            },
            {
                href: 'https://letterboxd.com/serhomate/',
                labelTexture: _lbl('Letterboxd')
            },
            {
                href: 'https://open.spotify.com/user/up9wrrsnd7cq4tmnibcn3n7w9',
                labelTexture: _lbl('Spotify')
            }
        ]

        // Create each link
        let i = 0
        for(const _option of this.links.options)
        {
            const item = {}
            item.x = this.x + this.links.x + this.links.distanceBetween * i
            item.y = this.y + this.links.y
            item.href = _option.href

            item.area = this.areas.add({
                position: new THREE.Vector2(item.x, item.y),
                halfExtents: new THREE.Vector2(this.links.halfExtents.x, this.links.halfExtents.y)
            })
            item.area.on('interact', () => { window.open(_option.href, '_blank') })

            item.texture = _option.labelTexture
            item.texture.magFilter = THREE.NearestFilter
            item.texture.minFilter = THREE.LinearFilter

            item.labelMesh = new THREE.Mesh(this.links.labelGeometry, new THREE.MeshBasicMaterial({ wireframe: false, color: 0xffffff, alphaMap: _option.labelTexture, depthTest: true, depthWrite: false, transparent: true }))
            item.labelMesh.position.x = item.x
            item.labelMesh.position.y = item.y + this.links.labelOffset
            item.labelMesh.matrixAutoUpdate = false
            item.labelMesh.updateMatrix()
            this.links.container.add(item.labelMesh)

            if(i >= 4)
            {
                // Find one platform tile from the already-processed static container.
                // Filter by geometry bounding box: tiles are small (< 3.5 units) and flat (z < 0.5).
                // This avoids picking up the large floor mesh.
                if(!this._tileMeshTemplate && this._staticObj)
                {
                    const _sz = new THREE.Vector3()
                    this._staticObj.container.traverse((child) =>
                    {
                        if(this._tileMeshTemplate || !(child instanceof THREE.Mesh)) return
                        if(!child.geometry.boundingBox) child.geometry.computeBoundingBox()
                        child.geometry.boundingBox.getSize(_sz)
                        if(_sz.x > 0.5 && _sz.x < 3.5 && _sz.y > 0.5 && _sz.y < 3.5 && _sz.z < 0.5)
                            this._tileMeshTemplate = child
                    })
                }

                if(this._tileMeshTemplate)
                {
                    // Clone the exact geometry+material — identical to GitHub, LinkedIn, etc.
                    const clone = this._tileMeshTemplate.clone()
                    clone.position.set(
                        item.x - this.x,                      // local x within static container
                        this._tileMeshTemplate.position.y,    // same y as the other tiles
                        this._tileMeshTemplate.position.z     // same z height
                    )
                    clone.matrixAutoUpdate = false
                    clone.updateMatrix()
                    this._staticObj.container.add(clone)
                }

                // Physics collision body (empty visual base — visuals handled above)
                const emptyBase = new THREE.Object3D()
                const platCollBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
                platCollBox.name = 'box'
                platCollBox.scale.set(1.8, 1.8, 0.2)
                const platColl = new THREE.Object3D()
                platColl.add(platCollBox)

                this.objects.add({
                    base:       emptyBase,
                    collision:  platColl,
                    offset:     new THREE.Vector3(item.x, item.y, 0.1),
                    duplicated: false,
                    mass:       0
                })
            }

            this.links.items.push(item)
            i++
        }
    }

    setActivities()
    {
        // TODO(experience-data): Update the entries array below whenever your CV changes.
        // Each entry: { company, role, period }
        // The canvas is drawn at runtime — no image file needed.
        const experiences = [
            { company: 'AFAR Lab · Cambridge',  role: 'Research Intern',         period: 'Jun – Sep 2024'      },
            { company: 'Bogazici University',    role: 'Research Assistant',      period: 'Oct 2023 – Jan 2024' },
            { company: 'Invent Analytics',       role: 'Software Engineer Intern', period: 'Jun – Sep 2023'     },
            { company: 'KPMG',                   role: 'Software Engineer Intern', period: 'Aug – Sep 2022'     },
        ]

        // Draw to an off-screen canvas. White = visible, black = transparent (alphaMap).
        const canvas = document.createElement('canvas')
        canvas.width  = 1024
        canvas.height = 512
        const ctx = canvas.getContext('2d')

        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 44px Arial, sans-serif'
        ctx.fillText('Experience', 48, 66)
        ctx.fillRect(48, 80, 928, 2)

        let y = 138
        for(const exp of experiences)
        {
            ctx.font = 'bold 34px Arial, sans-serif'
            ctx.fillStyle = '#ffffff'
            ctx.fillText(exp.company, 48, y)

            ctx.font = '28px Arial, sans-serif'
            ctx.fillStyle = '#aaaaaa'
            ctx.fillText(`${exp.role}  ·  ${exp.period}`, 48, y + 40)

            y += 96
        }

        // Set up
        this.activities = {}
        this.activities.x = this.x + 0
        this.activities.y = this.y - 10
        this.activities.multiplier = 5.5

        // Geometry
        this.activities.geometry = new THREE.PlaneGeometry(2 * this.activities.multiplier, 1 * this.activities.multiplier, 1, 1)

        // Texture — generated from canvas, no external file required
        this.activities.texture = new THREE.CanvasTexture(canvas)

        // Material
        this.activities.material = new THREE.MeshBasicMaterial({ wireframe: false, color: 0xffffff, alphaMap: this.activities.texture, transparent: true })

        // Mesh
        this.activities.mesh = new THREE.Mesh(this.activities.geometry, this.activities.material)
        this.activities.mesh.position.x = this.activities.x
        this.activities.mesh.position.y = this.activities.y
        this.activities.mesh.matrixAutoUpdate = false
        this.activities.mesh.updateMatrix()
        this.container.add(this.activities.mesh)
    }

    setTiles()
    {
        // Vertical path leads into the info section — stops at y = this.y = −55, no right turn
        this.tiles.add({
            start: new THREE.Vector2(this.x - 1.2, this.y + 13),
            delta: new THREE.Vector2(0, - 13)
        })
    }

    setPublications()
    {
        // Placed to the right of the experience panel.
        // Experience: x = this.x, width 11 → right edge at this.x + 5.5
        // Publications: same y level, shifted right by 11 (panel width) + 1 (gap) = this.x + 12
        const pubX = this.x + 12
        const pubY = this.y - 10          // same y as experience panel

        const W = 1024, H = 512
        const canvas = document.createElement('canvas')
        canvas.width  = W
        canvas.height = H
        const ctx = canvas.getContext('2d')

        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, W, H)

        // All text centred so it aligns with the area border (which is centred on the mesh)
        ctx.textAlign = 'center'

        // Header
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 44px Arial, sans-serif'
        ctx.fillText('Publications', W / 2, 66)
        ctx.fillRect(48, 82, W - 96, 2)

        // Paper entry
        ctx.font = 'bold 32px Arial, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('Exploring Causality for HRI: A Case Study on', W / 2, 136)
        ctx.fillText('Robotic Mental Well-being Coaching', W / 2, 178)

        ctx.font = '27px Arial, sans-serif'
        ctx.fillStyle = '#aaaaaa'
        ctx.fillText('M. Spitale, S. Babu, S. Cakmak et al.', W / 2, 232)
        ctx.fillText('IEEE RO-MAN 2025', W / 2, 268)

        // Divider before CTA
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(48, 314, W - 96, 1)

        // "READ PAPER →" centred CTA
        ctx.font = 'bold 38px Arial, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('READ PAPER  →', W / 2, 376)

        ctx.font = '24px Arial, sans-serif'
        ctx.fillStyle = '#555555'
        ctx.fillText('drive onto this panel + press ENTER', W / 2, 424)

        this.publications = {}
        this.publications.multiplier = 5.5

        this.publications.geometry = new THREE.PlaneGeometry(
            2 * this.publications.multiplier,
            1 * this.publications.multiplier
        )
        this.publications.texture  = new THREE.CanvasTexture(canvas)
        this.publications.material = new THREE.MeshBasicMaterial({
            wireframe: false, color: 0xffffff,
            alphaMap: this.publications.texture, transparent: true
        })
        this.publications.mesh = new THREE.Mesh(this.publications.geometry, this.publications.material)
        this.publications.mesh.position.x = pubX
        this.publications.mesh.position.y = pubY
        this.publications.mesh.position.z = 0.002  // avoids z-fighting with the floor
        this.publications.mesh.matrixAutoUpdate = false
        this.publications.mesh.updateMatrix()
        this.container.add(this.publications.mesh)

        // Area centre = panel centre, halfExtents smaller than the panel (3.5 × 2 vs panel 5.5 × 2.75).
        // Border stays INSIDE the panel so it appears as a subtle inner glow — never crosses an
        // exposed floor edge, so the car entering from the tile (at the same y) stays deep inside
        // the y dimension and normal oscillations can't reach the boundary → no blinking.
        this.publications.area = this.areas.add({
            position: new THREE.Vector2(pubX, pubY),
            halfExtents: new THREE.Vector2(4.8, 2.4)
        })
        this.publications.area.on('interact', () =>
        {
            window.open('https://ieeexplore.ieee.org/document/11217880', '_blank')
        })
    }



    setCVObject()
    {
        // Place a physics-enabled 3D "CV" TextGeometry block at the first social-link platform.
        // Positioned standing upright (Euler PI/2 around X), matching the intro-letter style.
        // The block sits on the platform and the car can knock it over.
        const fontLoader = new FontLoader()
        fontLoader.load('./fonts/helvetiker_bold.typeface.json', (font) =>
        {
            const geo = new TextGeometry('CV', {
                font,
                size:          0.5,
                depth:         0.22,
                curveSegments: 4,
                bevelEnabled:  true,
                bevelThickness: 0.03,
                bevelSize:     0.02,
                bevelSegments: 2
            })
            geo.computeBoundingBox()

            const w = geo.boundingBox.max.x - geo.boundingBox.min.x
            const h = geo.boundingBox.max.y - geo.boundingBox.min.y
            const d = geo.boundingBox.max.z - geo.boundingBox.min.z

            geo.translate(-(geo.boundingBox.min.x + w / 2), -(geo.boundingBox.min.y + h / 2), -(geo.boundingBox.min.z + d / 2))

            // "shadeOrange" → orange matcap, matching the other 3D objects in the row
            const visualMesh = new THREE.Mesh(geo)
            visualMesh.name = 'shadeOrange'
            const baseScene = new THREE.Object3D()
            baseScene.add(visualMesh)

            // Physics box
            const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
            boxMesh.name = 'box'
            boxMesh.scale.set(w, h, d)
            const collisionScene = new THREE.Object3D()
            collisionScene.add(boxMesh)

            // First platform world position (same as first link item)
            const cvX = this.x + this.links.x
            const cvY = this.y + this.links.y

            this.objects.add({
                base:       baseScene,
                collision:  collisionScene,
                offset:     new THREE.Vector3(cvX, cvY, h / 2 + 0.1),
                rotation:   new THREE.Euler(Math.PI / 2, 0, 0),
                duplicated: false,
                shadow:     { sizeX: w + 0.2, sizeY: d + 0.2, offsetZ: -0.2, alpha: 0.4 },
                mass:       1.5,
                soundName:  'brick'
            })
        })
    }
}
