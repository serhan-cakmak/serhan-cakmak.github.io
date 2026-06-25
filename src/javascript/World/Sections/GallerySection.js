import * as THREE from 'three'
import ProjectBoardMaterial from '../../Materials/ProjectBoard.js'
import gsap from 'gsap'

export default class GallerySection
{
    constructor(_options)
    {
        this.resources = _options.resources
        this.objects   = _options.objects
        this.zones     = _options.zones
        this.time      = _options.time

        this.container = new THREE.Object3D()
        this.container.matrixAutoUpdate = false

        this.boardPlane = this.resources.items.projectsBoardPlane.scene.children[0]

        // TODO(gallery-positions): adjust x/y to relocate; add/remove entries for more/fewer boards.
        // Images go in static/models/gallery/ — name them photo_01.jpg … photo_N.jpg (jpg/png/webp).
        // Project boards occupy roughly x=25–107, y=−18 to −42 — gallery boards stay clear of that zone.
        // Map zones to stay clear of:
        //   Playground: x≈−48 to −28, y≈−24 to −44
        //   Projects:   x≈25  to 107, y≈−18 to −45
        //   Info path:  x≈−8  to  15, y≈−48 to −80  (road at x≈0)
        this.items = [
            // ── Right at the start ───────────────────────────────────────────
            { x:  -8, y:  -5, src: './models/gallery/photo_01.jpg' },
            { x:  10, y:  -6, src: './models/gallery/photo_02.jpg' },
            { x:  -4, y: -18, src: './models/gallery/photo_03.jpg' },

            // ── Close left ───────────────────────────────────────────────────
            { x: -14, y: -12, src: './models/gallery/photo_04.jpg' },
            { x: -52, y: -14, src: './models/gallery/photo_05.jpg' },
            { x: -56, y: -20, src: './models/gallery/photo_06.jpg' },
            { x: -24, y: -35, src: './models/gallery/photo_07.jpg' },

            // ── Close right + mid right — spread across all y levels ─────────
            { x:  16, y: -14, src: './models/gallery/photo_08.jpg' },
            { x:  26, y: -12, src: './models/gallery/photo_09.jpg' },
            { x:  18, y: -15, src: './models/gallery/photo_10.jpg' },
            { x:  36, y: -15, src: './models/gallery/photo_11.jpg' },
            { x:  48, y: -12, src: './models/gallery/photo_12.jpg' },
            { x:  54, y: -10, src: './models/gallery/photo_13.jpg' },
            { x:  68, y: -16, src: './models/gallery/photo_14.jpg' },
            { x:  82, y: -12, src: './models/gallery/photo_15.jpg' },
            { x:  30, y: -54, src: './models/gallery/photo_16.jpg' },
            { x:  56, y: -54, src: './models/gallery/photo_17.jpg' },
            { x:  72, y: -54, src: './models/gallery/photo_18.jpg' },
            { x:  88, y: -54, src: './models/gallery/photo_19.jpg' },
            { x:  24, y: -48, src: './models/gallery/photo_20.jpg' },
            { x:  44, y: -54, src: './models/gallery/photo_21.jpg' },
            { x:  64, y: -46, src: './models/gallery/photo_22.jpg' },
            { x:  80, y: -50, src: './models/gallery/photo_23.jpg' },

            // ── Left mid ─────────────────────────────────────────────────────
            { x: -62, y: -36, src: './models/gallery/photo_24.jpg' },
            { x: -55, y: -46, src: './models/gallery/photo_25.jpg' },
            { x: -25, y: -64, src: './models/gallery/photo_26.jpg' },
            { x: -18, y: -55, src: './models/gallery/photo_27.jpg' },
            { x: -60, y: -52, src: './models/gallery/photo_28.jpg' },
            { x: -32, y: -56, src: './models/gallery/photo_29.jpg' },

            // ── South of info — more density here ────────────────────────────
            { x:  28, y: -60, src: './models/gallery/photo_30.jpg' },
            { x:  50, y: -62, src: './models/gallery/photo_31.jpg' },
            { x: -22, y: -64, src: './models/gallery/photo_32.jpg' },
            { x:  70, y: -60, src: './models/gallery/photo_33.jpg' },
            { x: -40, y: -68, src: './models/gallery/photo_34.jpg' },
            { x:  36, y: -70, src: './models/gallery/photo_35.jpg' },
            { x: -56, y: -68, src: './models/gallery/photo_36.jpg' },
            { x:  60, y: -72, src: './models/gallery/photo_37.jpg' },
            { x: -16, y: -74, src: './models/gallery/photo_38.jpg' },
            { x:  20, y: -76, src: './models/gallery/photo_39.jpg' },
            { x:  80, y: -68, src: './models/gallery/photo_40.jpg' },
            { x: -44, y: -78, src: './models/gallery/photo_41.jpg' },
            { x:  44, y: -80, src: './models/gallery/photo_42.jpg' },
            { x: -26, y: -82, src: './models/gallery/photo_43.jpg' },
            { x:  62, y: -82, src: './models/gallery/photo_44.jpg' },
            { x:  -4, y: -86, src: './models/gallery/photo_45.jpg' },
            { x:  30, y: -88, src: './models/gallery/photo_46.jpg' },
        ]

        for(const item of this.items)
        {
            this._addBoard(item)
        }
    }

    _addBoard({ x, y, src })
    {
        // ← Change this one number to resize all gallery boards
        //   1.0 = same as project boards  |  0.7 = 70%  |  0.5 = half-size
        const SCALE = 0.6

        // Both the board structure AND the display plane live inside the same wrapper
        // so the scale applies to both identically — no mismatch.
        const wrapper = new THREE.Object3D()
        wrapper.position.set(x, y, 0)
        wrapper.scale.setScalar(SCALE)
        this.container.add(wrapper)

        // Clone + scale the collision scene so CANNON shapes match the visual size.
        // addObjectFromThree reads mesh.scale/position directly, so scaling these
        // produces physics boxes that are SCALE-sized at SCALE-proportional positions.
        const scaledColl = this.resources.items.projectsBoardCollision.scene.clone(true)
        scaledColl.traverse((child) =>
        {
            if(child instanceof THREE.Mesh)
            {
                child.scale.multiplyScalar(SCALE)
                child.position.multiplyScalar(SCALE)
            }
        })

        const boardObj = this.objects.add({
            base:               this.resources.items.projectsBoardStructure.scene,
            collision:          scaledColl,
            floorShadowTexture: this.resources.items.projectsBoardStructureFloorShadowTexture,
            offset:    new THREE.Vector3(x, y, 0),
            rotation:  new THREE.Euler(0, 0, 0),
            duplicated: true,
            mass: 0
        })
        // Reset container to local (0,0,0) so the wrapper's position/scale takes over
        boardObj.container.position.set(0, 0, 0)
        boardObj.container.updateMatrix()
        this.objects.container.remove(boardObj.container)
        wrapper.add(boardObj.container)

        // Display plane — no manual scale, the wrapper scales it with everything else.
        // Only x/y are zeroed (wrapper handles world position); z is kept from the GLB clone
        // so the plane sits at the correct height inside the frame.
        const planeMesh = this.boardPlane.clone()
        planeMesh.position.x = 0
        planeMesh.position.y = 0
        planeMesh.matrixAutoUpdate = false

        const mat = new ProjectBoardMaterial()
        mat.uniforms.uColor.value        = new THREE.Color('#8e7161')
        mat.uniforms.uTextureAlpha.value = 0
        planeMesh.material = mat
        planeMesh.updateMatrix()
        wrapper.add(planeMesh)   // inside wrapper, not this.container

        // Load photo and fade in
        const img = new Image()
        img.addEventListener('load', () =>
        {
            const tex = new THREE.Texture(img)
            tex.anisotropy  = 4
            tex.needsUpdate = true
            mat.uniforms.uTexture.value = tex
            gsap.to(mat.uniforms.uTextureAlpha, { value: 1, duration: 1, ease: 'power4.inOut' })
        })
        img.src = src

        if(!this.zones) return

        // Small ▲ VIEW floor button
        const btnCanvas = document.createElement('canvas')
        btnCanvas.width = btnCanvas.height = 256
        const ctx = btnCanvas.getContext('2d')
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, 256, 256)
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 10
        ctx.beginPath(); ctx.arc(128, 128, 100, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.1)'
        ctx.beginPath(); ctx.arc(128, 128, 90, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 48px Arial, sans-serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText('▲', 128, 110)
        ctx.font = '24px Arial, sans-serif'
        ctx.fillText('VIEW', 128, 164)

        const btnMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1.2, 1.2),
            new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: 0xffffff, alphaMap: new THREE.CanvasTexture(btnCanvas) })
        )
        // Button distance scales with board size so it stays just in front of the board
        const btnOffset = 2.2 * SCALE
        btnMesh.position.set(x, y - btnOffset, 0.002)
        btnMesh.matrixAutoUpdate = false
        btnMesh.updateMatrix()
        this.container.add(btnMesh)

        const zone = this.zones.add({
            position:    { x, y: y - btnOffset },
            halfExtents: { x: 1.0, y: 1.0 }
        })

        zone.on('in', () =>
        {
            this._showPanel(src)
            this._showHint()
            zone._escHandler = (e) =>
            {
                if(e.key === 'Escape')
                {
                    this._hidePanel()
                    window.removeEventListener('keydown', zone._escHandler)
                    zone._escHandler = null
                }
            }
            window.addEventListener('keydown', zone._escHandler)
        })

        zone.on('out', () =>
        {
            this._hidePanel()
            if(zone._escHandler)
            {
                window.removeEventListener('keydown', zone._escHandler)
                zone._escHandler = null
            }
        })
    }

    _showPanel(src)
    {
        if(!document.getElementById('sc-view-panel'))
        {
            const backdrop = document.createElement('div')
            backdrop.id = 'sc-view-backdrop'
            backdrop.style.cssText = [
                'display:none', 'position:fixed', 'inset:0',
                'background:rgba(0,0,0,0.55)',
                'backdrop-filter:blur(6px)', '-webkit-backdrop-filter:blur(6px)',
                'z-index:9998', 'cursor:pointer'
            ].join(';')
            document.body.appendChild(backdrop)

            const panel = document.createElement('div')
            panel.id = 'sc-view-panel'
            panel.style.cssText = [
                'display:none', 'position:fixed',
                'top:50%', 'left:50%', 'transform:translate(-50%,-50%)',
                'z-index:9999', 'background:#111', 'border-radius:10px',
                'overflow:hidden', 'box-shadow:0 24px 80px rgba(0,0,0,0.8)',
                'max-width:65vw', 'max-height:68vh'
            ].join(';')

            const img = document.createElement('img')
            img.id = 'sc-view-img'
            img.style.cssText = 'display:block;max-width:65vw;max-height:68vh;object-fit:contain;'
            panel.appendChild(img)

            const btn = document.createElement('button')
            btn.textContent = '✕'
            btn.style.cssText = [
                'position:absolute', 'top:10px', 'right:14px',
                'background:rgba(255,255,255,0.15)', 'border:none',
                'color:#fff', 'font-size:16px', 'width:32px', 'height:32px',
                'border-radius:50%', 'cursor:pointer'
            ].join(';')
            panel.appendChild(btn)
            document.body.appendChild(panel)

            const close = () =>
            {
                backdrop.style.display = 'none'
                panel.style.display    = 'none'
                const hint = document.getElementById('sc-img-hint')
                if(hint) hint.style.display = 'none'
            }
            backdrop.addEventListener('click', close)
            btn.addEventListener('click', (e) => { e.stopPropagation(); close() })
            document.addEventListener('keydown', (e) => { if(e.key === 'Escape') close() })
        }

        document.getElementById('sc-view-img').src = src
        document.getElementById('sc-view-backdrop').style.display = 'block'
        document.getElementById('sc-view-panel').style.display    = 'block'
    }

    _hidePanel()
    {
        const backdrop = document.getElementById('sc-view-backdrop')
        const panel    = document.getElementById('sc-view-panel')
        const hint     = document.getElementById('sc-img-hint')
        if(backdrop) backdrop.style.display = 'none'
        if(panel)    panel.style.display    = 'none'
        if(hint)     hint.style.display     = 'none'
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
                'z-index:10001', 'pointer-events:none', 'display:none',
                'box-shadow:0 2px 12px rgba(0,0,0,0.4)'
            ].join(';')
            hint.textContent = '🎮  Steer away to close  ·  Esc to dismiss'
            document.body.appendChild(hint)
        }
        hint.style.display = 'block'
    }
}
