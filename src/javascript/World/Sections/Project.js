import * as THREE from 'three'

import ProjectBoardMaterial from '../../Materials/ProjectBoard.js'
import gsap from 'gsap'

export default class Project
{
    constructor(_options)
    {
        // Options
        this.config = _options.config
        this.time = _options.time
        this.resources = _options.resources
        this.objects = _options.objects
        this.areas = _options.areas
        this.zones = _options.zones
        this.physics = _options.physics
        this.name = _options.name
        this.geometries = _options.geometries
        this.meshes = _options.meshes
        this.debug = _options.debug
        this.name = _options.name
        this.x = _options.x
        this.y = _options.y
        this.imageSources = _options.imageSources
        this.textSlides = _options.textSlides   // optional: array of { title, lines[] } objects
        this.floorTexture = _options.floorTexture
        this.link = _options.link
        this.distinctions = _options.distinctions

        // Set up
        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false
        // this.container.updateMatrix()

        this.setBoards()
        this.setFloor()
    }

    setBoards()
    {
        // Set up
        this.boards = {}
        this.boards.items = []
        this.boards.xStart = - 5
        this.boards.xInter = 5
        this.boards.y = 5
        this.boards.color = '#8e7161'
        this.boards.threeColor = new THREE.Color(this.boards.color)

        if(this.debug)
        {
            this.debug.addColor(this.boards, 'color').name('boardColor').onChange(() =>
            {
                this.boards.threeColor.set(this.boards.color)
            })
        }

        const slides = this.textSlides || (this.imageSources || []).map(src => ({ _imageSource: src }))

        // Centre of the board row in local x — used below to align the GitHub label
        const n = slides.length
        this.boardsRowCentreX = n > 0
            ? this.boards.xStart + (n - 1) * this.boards.xInter / 2
            : 0

        // Create each board
        let i = 0

        for(const slide of slides)
        {
            // Set up
            const board = {}
            board.x = this.x + this.boards.xStart + i * this.boards.xInter
            board.y = this.y + this.boards.y

            // Create structure with collision
            this.objects.add({
                base: this.resources.items.projectsBoardStructure.scene,
                collision: this.resources.items.projectsBoardCollision.scene,
                floorShadowTexture: this.resources.items.projectsBoardStructureFloorShadowTexture,
                offset: new THREE.Vector3(board.x, board.y, 0),
                rotation: new THREE.Euler(0, 0, 0),
                duplicated: true,
                mass: 0
            })

            // Plane mesh setup (shared between both slide types)
            board.planeMesh = this.meshes.boardPlane.clone()
            board.planeMesh.position.x = board.x
            board.planeMesh.position.y = board.y
            board.planeMesh.matrixAutoUpdate = false
            board.planeMesh.updateMatrix()
            board.planeMesh.material = new ProjectBoardMaterial()
            board.planeMesh.material.uniforms.uColor.value = this.boards.threeColor
            board.planeMesh.material.uniforms.uTextureAlpha.value = 0
            this.container.add(board.planeMesh)

            if(slide._imageSource)
            {
                // --- image file slide (original behaviour) ---
                const image = new Image()
                image.addEventListener('load', () =>
                {
                    board.texture = new THREE.Texture(image)
                    board.texture.anisotropy = 4
                    board.texture.needsUpdate = true
                    board.planeMesh.material.uniforms.uTexture.value = board.texture
                    gsap.to(board.planeMesh.material.uniforms.uTextureAlpha, { value: 1, duration: 1, ease: 'power4.inOut' })
                })
                image.src = slide._imageSource

                // Visible floor button + tight trigger zone.
                // Button canvas: white circle ring + "▲ VIEW" — drawn as alphaMap (white = visible).
                // Zone halfExtents match the button size so the image only appears when car is on it.
                if(this.zones)
                {
                    // Build button texture once per board (each board shares the same design)
                    const btnSize = 256
                    const btnCanvas = document.createElement('canvas')
                    btnCanvas.width = btnCanvas.height = btnSize
                    const btnCtx = btnCanvas.getContext('2d')
                    btnCtx.fillStyle = '#000000'
                    btnCtx.fillRect(0, 0, btnSize, btnSize)
                    // Outer ring
                    btnCtx.strokeStyle = '#ffffff'
                    btnCtx.lineWidth = 10
                    btnCtx.beginPath()
                    btnCtx.arc(128, 128, 104, 0, Math.PI * 2)
                    btnCtx.stroke()
                    // Subtle inner fill
                    btnCtx.fillStyle = 'rgba(255,255,255,0.12)'
                    btnCtx.beginPath()
                    btnCtx.arc(128, 128, 94, 0, Math.PI * 2)
                    btnCtx.fill()
                    // Icon + label
                    btnCtx.fillStyle = '#ffffff'
                    btnCtx.font = 'bold 52px Arial, sans-serif'
                    btnCtx.textAlign = 'center'
                    btnCtx.textBaseline = 'middle'
                    btnCtx.fillText('▲', 128, 108)
                    btnCtx.font = '26px Arial, sans-serif'
                    btnCtx.fillText('VIEW', 128, 166)

                    const btnTexture = new THREE.CanvasTexture(btnCanvas)
                    board.viewBtn = new THREE.Mesh(
                        new THREE.PlaneGeometry(1.6, 1.6),
                        new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: btnTexture })
                    )
                    board.viewBtn.position.set(board.x, board.y - 2, 0.002)
                    board.viewBtn.matrixAutoUpdate = false
                    board.viewBtn.updateMatrix()
                    this.container.add(board.viewBtn)

                    // Zone matches the button footprint (1.2 × 1.2).
                    // The car stops fully when the image opens; any movement key,
                    // Esc, or leaving the zone dismisses it.
                    board.viewZone = this.zones.add({
                        position:    { x: board.x, y: board.y - 2 },
                        halfExtents: { x: 1.2, y: 1.2 }
                    })
                    board.viewZone.on('in', () =>
                    {
                        this._showPanel(slide._imageSource)
                        this._showHint()
                        board._escHandler = (e) =>
                        {
                            if(e.key === 'Escape')
                            {
                                this._hidePanel()
                                window.removeEventListener('keydown', board._escHandler)
                                board._escHandler = null
                            }
                        }
                        window.addEventListener('keydown', board._escHandler)
                    })
                    board.viewZone.on('out', () =>
                    {
                        this._hidePanel()
                        if(board._escHandler)
                        {
                            window.removeEventListener('keydown', board._escHandler)
                            board._escHandler = null
                        }
                    })
                }
            }
            else
            {
                // --- canvas text slide ---
                // TODO(slide-canvas): Edit the textSlides array in ProjectsSection.js to update
                // the content shown on each board. Each slide has { title, lines[] }.
                board.texture = this._buildTextCanvas(slide)
                board.planeMesh.material.uniforms.uTexture.value = board.texture
                gsap.to(board.planeMesh.material.uniforms.uTextureAlpha, { value: 1, duration: 0.5, ease: 'power4.inOut' })
            }

            // Save
            this.boards.items.push(board)

            i++
        }
    }

    _hidePanel()
    {
        const backdrop = document.getElementById('sc-view-backdrop')
        const panel    = document.getElementById('sc-view-panel')
        const hint     = document.getElementById('sc-img-hint')
        if(backdrop) backdrop.style.display = 'none'
        if(panel)    panel.style.display    = 'none'
        if(hint)     hint.style.display     = 'none'

        if(this._driveCloseHandler)
        {
            window.removeEventListener('keydown', this._driveCloseHandler)
        }
    }

    _showHint()
    {
        let hint = document.getElementById('sc-img-hint')
        if(!hint)
        {
            hint = document.createElement('div')
            hint.id = 'sc-img-hint'
            hint.style.cssText = [
                'position:fixed', 'bottom:28px', 'left:50%',
                'transform:translateX(-50%)',
                'background:rgba(0,0,0,0.72)', 'color:#fff',
                'padding:10px 22px', 'border-radius:20px',
                'font-family:Arial,sans-serif', 'font-size:13px',
                'letter-spacing:.3px', 'z-index:10001',
                'pointer-events:none', 'display:none',
                'box-shadow:0 2px 12px rgba(0,0,0,0.4)'
            ].join(';')
            document.body.appendChild(hint)
        }
        hint.textContent = this.config && this.config.touch
            ? '👆  Tap outside the image to close'
            : '🎮  Steer away to close  ·  Esc to dismiss'
        hint.style.display = 'block'
    }

    _showPanel(src)
    {
        if(!document.getElementById('sc-view-panel'))
        {
            // Semi-transparent backdrop — 3D scene still visible behind it
            const backdrop = document.createElement('div')
            backdrop.id = 'sc-view-backdrop'
            backdrop.style.cssText = [
                'display:none', 'position:fixed', 'inset:0',
                'background:rgba(0,0,0,0.55)',
                'backdrop-filter:blur(6px)', '-webkit-backdrop-filter:blur(6px)',
                'z-index:9998', 'cursor:pointer'
            ].join(';')
            document.body.appendChild(backdrop)

            // Centered panel (~65 % of viewport)
            const panel = document.createElement('div')
            panel.id = 'sc-view-panel'
            panel.style.cssText = [
                'display:none', 'position:fixed',
                'top:50%', 'left:50%', 'transform:translate(-50%,-50%)',
                'z-index:9999', 'background:#111',
                'border-radius:10px', 'overflow:hidden',
                'box-shadow:0 24px 80px rgba(0,0,0,0.8)',
                'max-width:65vw', 'max-height:68vh'
            ].join(';')

            const img = document.createElement('img')
            img.id = 'sc-view-img'
            img.style.cssText = 'display:block;max-width:65vw;max-height:68vh;object-fit:contain;'
            panel.appendChild(img)

            // Visible close button
            const btn = document.createElement('button')
            btn.textContent = '✕'
            btn.style.cssText = [
                'position:absolute', 'top:10px', 'right:14px',
                'background:rgba(255,255,255,0.15)', 'border:none',
                'color:#fff', 'font-size:16px',
                'width:32px', 'height:32px', 'border-radius:50%',
                'cursor:pointer', 'display:flex',
                'align-items:center', 'justify-content:center'
            ].join(';')
            panel.appendChild(btn)

            // Dismiss hint
            const hint = document.createElement('p')
            hint.textContent = this.config && this.config.touch
                ? 'Tap outside to close'
                : 'Drive away or press Esc to close'
            hint.style.cssText = [
                'position:absolute', 'bottom:-28px', 'left:50%',
                'transform:translateX(-50%)',
                'color:rgba(255,255,255,0.35)', 'font-family:Arial,sans-serif',
                'font-size:12px', 'margin:0', 'white-space:nowrap'
            ].join(';')
            panel.appendChild(hint)

            document.body.appendChild(panel)

            const close = () => this._hidePanel()

            backdrop.addEventListener('click', close)
            btn.addEventListener('click', (e) => { e.stopPropagation(); close() })
            document.addEventListener('keydown', (e) => { if(e.key === 'Escape') close() })
        }

        document.getElementById('sc-view-img').src = src
        document.getElementById('sc-view-backdrop').style.display = 'block'
        document.getElementById('sc-view-panel').style.display = 'block'

        // Same behavior as the gallery boards: stop the car completely while
        // the image is up. Engine power is untouched, so driving away
        // (which also closes the panel) is instant.
        if(this.physics)
        {
            const body = this.physics.car.chassis.body
            body.velocity.set(0, 0, 0)
            body.angularVelocity.set(0, 0, 0)
        }

        // The image stays up until the user drives (movement key) or presses
        // Escape (handled elsewhere) or leaves the zone
        if(!this._driveCloseHandler)
        {
            this._driveCloseHandler = (_event) =>
            {
                const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D']
                if(keys.includes(_event.key))
                {
                    this._hidePanel()
                }
            }
        }
        window.addEventListener('keydown', this._driveCloseHandler)
    }

    _buildTextCanvas(slide)
    {
        const W = 512, H = 512
        const canvas = document.createElement('canvas')
        canvas.width  = W
        canvas.height = H
        const ctx = canvas.getContext('2d')

        ctx.fillStyle = '#8e7161'
        ctx.fillRect(0, 0, W, H)

        // Title
        ctx.textAlign = 'center'
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 46px Arial, sans-serif'
        const titleLines = this._wrapText(ctx, slide.title, W - 48, 46)
        let y = 60
        for(const line of titleLines)
        {
            ctx.fillText(line, W / 2, y)
            y += 54
        }

        // Divider
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.fillRect(32, y + 4, W - 64, 2)
        y += 22

        // Body — stop when we reach the bottom margin
        ctx.font = '32px Arial, sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.textAlign = 'left'
        for(const line of (slide.lines || []))
        {
            if(y > H - 24) break
            const wrapped = this._wrapText(ctx, line, W - 56, 32)
            for(const wl of wrapped)
            {
                if(y > H - 24) break
                ctx.fillText(wl, 28, y)
                y += 42
            }
        }

        return new THREE.CanvasTexture(canvas)
    }

    _wrapText(ctx, text, maxWidth, fontSize)
    {
        const words = text.split(' ')
        const lines = []
        let current = ''
        for(const word of words)
        {
            const test = current ? `${current} ${word}` : word
            if(ctx.measureText(test).width > maxWidth && current)
            {
                lines.push(current)
                current = word
            }
            else
            {
                current = test
            }
        }
        if(current) lines.push(current)
        return lines
    }

    setFloor()
    {
        this.floor = {}

        this.floor.x = 0
        this.floor.y = - 2

        // Container
        this.floor.container = new THREE.Object3D()
        this.floor.container.position.x = this.x + this.floor.x
        this.floor.container.position.y = this.y + this.floor.y
        this.floor.container.matrixAutoUpdate = false
        this.floor.container.updateMatrix()
        this.container.add(this.floor.container)

        // Texture
        this.floor.texture = this.floorTexture
        this.floor.texture.magFilter = THREE.NearestFilter
        this.floor.texture.minFilter = THREE.LinearFilter

        // Geometry
        this.floor.geometry = this.geometries.floor

        // Material
        this.floor.material =  new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, alphaMap: this.floor.texture })

        // Mesh
        this.floor.mesh = new THREE.Mesh(this.floor.geometry, this.floor.material)
        this.floor.mesh.matrixAutoUpdate = false
        this.floor.container.add(this.floor.mesh)

        // Distinctions
        if(this.distinctions)
        {
            for(const _distinction of this.distinctions)
            {
                let base = null
                let collision = null
                let shadowSizeX = null
                let shadowSizeY = null

                switch(_distinction.type)
                {
                    case 'awwwards':
                        base = this.resources.items.projectsDistinctionsAwwwardsBase.scene
                        collision = this.resources.items.projectsDistinctionsAwwwardsCollision.scene
                        shadowSizeX = 1.5
                        shadowSizeY = 1.5
                        break

                    case 'fwa':
                        base = this.resources.items.projectsDistinctionsFWABase.scene
                        collision = this.resources.items.projectsDistinctionsFWACollision.scene
                        shadowSizeX = 2
                        shadowSizeY = 1
                        break

                    case 'cssda':
                        base = this.resources.items.projectsDistinctionsCSSDABase.scene
                        collision = this.resources.items.projectsDistinctionsCSSDACollision.scene
                        shadowSizeX = 1.2
                        shadowSizeY = 1.2
                        break
                }

                this.objects.add({
                    base: base,
                    collision: collision,
                    offset: new THREE.Vector3(this.x + this.floor.x + _distinction.x, this.y + this.floor.y + _distinction.y, 0),
                    rotation: new THREE.Euler(0, 0, 0),
                    duplicated: true,
                    shadow: { sizeX: shadowSizeX, sizeY: shadowSizeY, offsetZ: - 0.1, alpha: 0.5 },
                    mass: 1.5,
                    soundName: 'woodHit'
                })
            }
        }

        // Area — x centred on the board row, same as the label
        this.floor.area = this.areas.add({
            position: new THREE.Vector2(this.x + this.boardsRowCentreX, this.y + this.floor.y + this.link.y),
            halfExtents: new THREE.Vector2(this.link.halfExtents.x, this.link.halfExtents.y)
        })
        this.floor.area.on('interact', () =>
        {
            window.open(this.link.href, '_blank')
        })

        // GitHub label centred under the board row, not at the fixed link.x offset
        this.floor.areaLabel = this.meshes.githubLabel.clone()
        this.floor.areaLabel.position.x = this.boardsRowCentreX
        this.floor.areaLabel.position.y = this.link.y
        this.floor.areaLabel.position.z = 0.001
        this.floor.areaLabel.matrixAutoUpdate = false
        this.floor.areaLabel.updateMatrix()
        this.floor.container.add(this.floor.areaLabel)
    }
}
