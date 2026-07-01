import * as THREE from 'three'

export default class MiniMap
{
    /**
     * Top-down minimap in the corner of the screen.
     *
     * Cost: the 3D scene is rendered ONCE (after the reveal animation) from an
     * orthographic top-down camera into a small render target, then copied to a
     * 2D canvas. Every frame afterwards only blits that cached image and draws
     * the car arrow on a tiny canvas, so the recurring cost is negligible.
     *
     * The one-time snapshot is rendered in vertical strips, one per frame. A
     * single full-map render would force-upload every geometry/texture the main
     * camera has never shown (its frustum culls most of the world), freezing the
     * page for seconds; per-strip cameras spread those uploads across ~14 frames.
     */
    constructor(_options)
    {
        // Options
        this.time = _options.time
        this.renderer = _options.renderer
        this.scene = _options.scene
        this.world = _options.world

        // World bounds covered by the map (x right, y up, matching world XY)
        this.bounds = {}
        this.bounds.minX = - 60
        this.bounds.maxX = 115
        this.bounds.minY = - 85
        this.bounds.maxY = 20

        // Low snapshot resolution (upscaled with image-rendering: pixelated)
        const worldWidth = this.bounds.maxX - this.bounds.minX
        const worldHeight = this.bounds.maxY - this.bounds.minY
        this.resolution = {}
        this.resolution.x = 280
        this.resolution.y = Math.round(this.resolution.x * worldHeight / worldWidth)

        this.captured = false

        this.setCamera()
        this.setRenderTarget()
        this.setDom()

        this.time.on('tick', () =>
        {
            this.update()
        })
    }

    setCamera()
    {
        const centerY = (this.bounds.minY + this.bounds.maxY) * 0.5
        const halfHeight = (this.bounds.maxY - this.bounds.minY) * 0.5

        // Covers one vertical strip of the map; repositioned for each strip
        this.strips = {}
        this.strips.count = 14
        this.strips.rendered = 0
        this.strips.worldWidth = (this.bounds.maxX - this.bounds.minX) / this.strips.count
        this.strips.pixelWidth = this.resolution.x / this.strips.count

        this.camera = new THREE.OrthographicCamera(- this.strips.worldWidth * 0.5, this.strips.worldWidth * 0.5, halfHeight, - halfHeight, 1, 100)
        this.camera.position.set(0, centerY, 50)
        this.camera.up.set(0, 1, 0)
        this.camera.lookAt(0, centerY, 0)
    }

    setRenderTarget()
    {
        // Deliberately a default (linear) target: the composer also renders the scene to
        // linear targets, so this reuses the already-compiled shader programs. An sRGB
        // target here changes the program cache key and stalls the page for seconds
        // recompiling every scene shader. Colors are converted to sRGB on the CPU instead.
        this.renderTarget = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution.y)
    }

    setDom()
    {
        // Container
        this.$container = document.createElement('div')
        this.$container.style.cssText = `
            position: fixed;
            top: 12px;
            right: 12px;
            z-index: 2;
            pointer-events: none;
            opacity: 0;
            transition: opacity 1s ease;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.5);
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
        `

        // Display canvas (draws cached snapshot + car arrow each frame)
        this.$canvas = document.createElement('canvas')
        this.$canvas.width = this.resolution.x
        this.$canvas.height = this.resolution.y
        this.$canvas.style.cssText = `
            display: block;
            width: min(32vw, 190px);
            height: auto;
            image-rendering: pixelated;
        `
        this.context = this.$canvas.getContext('2d')

        this.$container.appendChild(this.$canvas)
        document.body.appendChild(this.$container)

        // Touch devices: move to the top-left (joystick is bottom-right) and
        // enlarge — at 32vw the map is too small to read on a phone
        window.addEventListener('touchstart', () =>
        {
            this.$container.style.right = 'auto'
            this.$container.style.left = '12px'
            this.$canvas.style.width = 'min(48vw, 260px)'
        }, { once: true })

        // Offscreen canvas holding the world snapshot + baked labels
        this.background = document.createElement('canvas')
        this.background.width = this.resolution.x
        this.background.height = this.resolution.y
        this.backgroundContext = this.background.getContext('2d')
    }

    // Upload scene textures to the GPU at most one per frame, rescanning for new
    // ones periodically. The gallery photos are multi-megabyte images that load
    // asynchronously and become textures long after startup; without this, their
    // first render (a minimap strip, or driving near a photo board) stalls the
    // page for hundreds of ms uploading them all in a single frame.
    warmTextures()
    {
        if(!this.warmup)
        {
            this.warmup = {}
            this.warmup.seen = new Set()
            this.warmup.queue = []
            this.warmup.rescanCountdown = 0
        }

        if(this.warmup.rescanCountdown <= 0)
        {
            this.collectTextures()
            this.warmup.rescanCountdown = 30
        }
        this.warmup.rescanCountdown--

        if(this.warmup.queue.length > 0)
        {
            this.renderer.initTexture(this.warmup.queue.shift())
        }
    }

    collectTextures()
    {
        const addFromValue = (_value) =>
        {
            if(_value && _value.isTexture && !_value.isVideoTexture && !this.warmup.seen.has(_value))
            {
                this.warmup.seen.add(_value)
                this.warmup.queue.push(_value)
            }
        }

        this.scene.traverse((_object) =>
        {
            if(!_object.material)
            {
                return
            }

            const materials = Array.isArray(_object.material) ? _object.material : [_object.material]
            for(const material of materials)
            {
                for(const key of Object.keys(material))
                {
                    addFromValue(material[key])
                }
                if(material.uniforms)
                {
                    for(const key of Object.keys(material.uniforms))
                    {
                        addFromValue(material.uniforms[key].value)
                    }
                }
            }
        })
    }

    // World XY -> map pixel coordinates
    worldToMap(_x, _y)
    {
        return {
            x: (_x - this.bounds.minX) / (this.bounds.maxX - this.bounds.minX) * this.resolution.x,
            y: (this.bounds.maxY - _y) / (this.bounds.maxY - this.bounds.minY) * this.resolution.y
        }
    }

    renderStrip()
    {
        const index = this.strips.rendered

        // Hide the car so the snapshot doesn't contain a stale copy of it
        const carWasVisible = this.world.car.container.visible
        this.world.car.container.visible = false

        // Hide the floor: it's a screen-space quad, so every strip would repeat
        // the full gradient in its narrow column (vertical banding). The gradient
        // is painted in 2D in finalizeCapture() instead; clear to transparent here.
        const floorWasVisible = this.world.floor.container.visible
        this.world.floor.container.visible = false
        this.renderer.setClearColor(0x000000, 0)

        // Narrow camera frustum so only this strip's objects are drawn/uploaded
        const centerX = this.bounds.minX + (index + 0.5) * this.strips.worldWidth
        this.camera.position.x = centerX

        this.renderTarget.viewport.set(index * this.strips.pixelWidth, 0, this.strips.pixelWidth, this.resolution.y)
        this.renderTarget.scissor.copy(this.renderTarget.viewport)
        this.renderTarget.scissorTest = true

        const previousRenderTarget = this.renderer.getRenderTarget()
        this.renderer.setRenderTarget(this.renderTarget)
        this.renderer.clear()
        this.renderer.render(this.scene, this.camera)
        this.renderer.setRenderTarget(previousRenderTarget)
        this.renderer.setClearColor(0x000000, 1)

        this.world.car.container.visible = carWasVisible
        this.world.floor.container.visible = floorWasVisible

        this.strips.rendered++
        if(this.strips.rendered === this.strips.count)
        {
            this.finalizeCapture()
        }
    }

    finalizeCapture()
    {
        // Read pixels back (~0.2MB, pipeline is drained by now so the sync is cheap)
        const pixels = new Uint8Array(this.resolution.x * this.resolution.y * 4)
        this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, this.resolution.x, this.resolution.y, pixels)

        // No color conversion: this project's shaders already output sRGB-encoded values
        // (see convertLinearToSRGB() on material colors), so the readback matches the screen.

        // WebGL rows are bottom-up: put into a temp canvas, then draw flipped
        const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), this.resolution.x, this.resolution.y)
        const flipCanvas = document.createElement('canvas')
        flipCanvas.width = this.resolution.x
        flipCanvas.height = this.resolution.y
        flipCanvas.getContext('2d').putImageData(imageData, 0, 0)

        // Paint the floor gradient (the 3D floor is hidden during strip renders),
        // then composite the transparent world snapshot on top
        this.paintFloorGradient()
        this.backgroundContext.save()
        this.backgroundContext.scale(1, - 1)
        this.backgroundContext.drawImage(flipCanvas, 0, - this.resolution.y)
        this.backgroundContext.restore()

        this.bakeLabels()

        // Free GPU memory, snapshot lives on the 2D canvas now
        this.renderTarget.dispose()

        this.captured = true
        this.$container.style.opacity = '0.85'
    }

    // Same 4-corner gradient as the 3D floor: a 2x2 canvas scaled up with
    // bilinear smoothing
    paintFloorGradient()
    {
        const corners = document.createElement('canvas')
        corners.width = 2
        corners.height = 2
        const cornersContext = corners.getContext('2d')

        const imageData = cornersContext.createImageData(2, 2)
        const order = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']
        for(let i = 0; i < 4; i++)
        {
            const color = new THREE.Color(this.world.floor.colors[order[i]])
            color.convertLinearToSRGB()
            imageData.data[i * 4] = Math.round(color.r * 255)
            imageData.data[i * 4 + 1] = Math.round(color.g * 255)
            imageData.data[i * 4 + 2] = Math.round(color.b * 255)
            imageData.data[i * 4 + 3] = 255
        }
        cornersContext.putImageData(imageData, 0, 0)

        this.backgroundContext.imageSmoothingEnabled = true
        this.backgroundContext.imageSmoothingQuality = 'high'
        this.backgroundContext.drawImage(corners, - this.resolution.x * 0.5, - this.resolution.y * 0.5, this.resolution.x * 2, this.resolution.y * 2)
    }

    bakeLabels()
    {
        const context = this.backgroundContext

        const labels = [
            { text: 'START', x: 0, y: 2 },
            { text: 'PROJECTS', x: 66, y: - 27 },
            { text: 'ABOUT', x: 1.2, y: - 62 },
            { text: 'PLAYGROUND', x: - 33, y: - 45 }
        ]

        context.font = '700 11px "Comic Neue", sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'middle'

        for(const label of labels)
        {
            const point = this.worldToMap(label.x, label.y)
            context.lineWidth = 3
            context.strokeStyle = 'rgba(60, 30, 5, 0.75)'
            context.strokeText(label.text, point.x, point.y)
            context.fillStyle = '#ffffff'
            context.fillText(label.text, point.x, point.y)
        }
    }

    update()
    {
        const reveal = this.world.reveal
        if(!reveal)
        {
            return
        }

        // Runs forever: late-loading textures (gallery photos) get uploaded one
        // per frame instead of freezing the frame they first appear on screen
        this.warmTextures()

        if(!this.captured)
        {
            // Compile every scene shader in the background (parallel shader compile)
            // before rendering strips: areas the main camera never showed would
            // otherwise compile synchronously while rendering a strip
            if(!this.compileStarted)
            {
                this.compileStarted = true
                this.renderer.compileAsync(this.scene, this.camera).then(() =>
                {
                    this.compileDone = true
                })
                // Safety net: never let a hung compile promise block the capture
                window.setTimeout(() =>
                {
                    this.compileDone = true
                }, 5000)
                return
            }

            // Render strips only after the reveal has finished, shaders are
            // compiled and no texture is waiting for its upload
            if(this.compileDone
                && this.warmup.queue.length === 0
                && reveal.matcapsProgress >= 1 && reveal.floorShadowsProgress >= 1)
            {
                this.renderStrip()
            }
            return
        }

        if(!this.world.car || !this.world.physics)
        {
            return
        }

        const context = this.context
        context.clearRect(0, 0, this.resolution.x, this.resolution.y)
        context.drawImage(this.background, 0, 0)

        // Car arrow (canvas y is flipped relative to world, hence - angle)
        const position = this.world.car.chassis.object.position
        const point = this.worldToMap(position.x, position.y)
        const angle = - this.world.physics.car.angle

        context.save()
        context.translate(point.x, point.y)
        context.rotate(angle)
        context.beginPath()
        context.moveTo(7, 0)
        context.lineTo(- 5, 5)
        context.lineTo(- 2.5, 0)
        context.lineTo(- 5, - 5)
        context.closePath()
        context.fillStyle = '#e01414'
        context.strokeStyle = '#ffffff'
        context.lineWidth = 1.5
        context.stroke()
        context.fill()
        context.restore()
    }
}
