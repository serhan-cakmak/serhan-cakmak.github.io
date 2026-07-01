import EventEmitter from '../Utils/EventEmitter'

export default class Controls extends EventEmitter
{
    constructor(_options)
    {
        super()

        this.config = _options.config
        this.sizes = _options.sizes
        this.time = _options.time
        this.camera = _options.camera
        this.sounds = _options.sounds

        this.setActions()
        this.setKeyboard()
    }

    setActions()
    {
        this.actions = {}
        this.actions.up = false
        this.actions.right = false
        this.actions.down = false
        this.actions.left = false
        this.actions.brake = false
        this.actions.boost = false

        const resetAll = () =>
        {
            this.actions.up = false
            this.actions.right = false
            this.actions.down = false
            this.actions.left = false
            this.actions.brake = false
            this.actions.boost = false

            if(this.touch && this.touch.joystick)
            {
                this.touch.joystick.active = false
                this.touch.joystick.$limit.style.opacity = '0.25'
                this.touch.joystick.$cursor.style.transform = 'translateX(0px) translateY(0px)'
                document.removeEventListener('touchend', this.touch.joystick.events.touchend)
                document.removeEventListener('touchmove', this.touch.joystick.events.touchmove)
            }
        }

        // visibilitychange: tab comes back into view (Android, most browsers)
        // pageshow persisted: page restored from iOS bfcache after back-navigation
        document.addEventListener('visibilitychange', () => { if(!document.hidden) resetAll() })
        window.addEventListener('pageshow', (e) => { if(e.persisted) resetAll() })
    }

    setKeyboard()
    {
        this.keyboard = {}
        this.keyboard.events = {}

        this.keyboard.events.keyDown = (_event) =>
        {
            switch(_event.code)
            {
                case 'ArrowUp':
                case 'KeyW':
                    this.camera.pan.reset()
                    this.actions.up = true
                    break

                case 'ArrowRight':
                case 'KeyD':
                    this.actions.right = true
                    break

                case 'ArrowDown':
                case 'KeyS':
                    this.camera.pan.reset()
                    this.actions.down = true
                    break

                case 'ArrowLeft':
                case 'KeyA':
                    this.actions.left = true
                    break

                case 'ControlLeft':
                case 'ControlRight':
                case 'Space':
                    this.actions.brake = true
                    break

                case 'ShiftLeft':
                case 'ShiftRight':
                    this.actions.boost = true
                    break

                // case ' ':
                //     this.jump(true)
                //     break
            }
        }

        this.keyboard.events.keyUp = (_event) =>
        {
            switch(_event.code)
            {
                case 'ArrowUp':
                case 'KeyW':
                    this.actions.up = false
                    break

                case 'ArrowRight':
                case 'KeyD':
                    this.actions.right = false
                    break

                case 'ArrowDown':
                case 'KeyS':
                    this.actions.down = false
                    break

                case 'ArrowLeft':
                case 'KeyA':
                    this.actions.left = false
                    break

                case 'ControlLeft':
                case 'ControlRight':
                case 'Space':
                    this.actions.brake = false
                    break

                case 'ShiftLeft':
                case 'ShiftRight':
                    this.actions.boost = false
                    break

                case 'KeyR':
                    this.trigger('action', ['reset'])
                    break
            }
        }

        document.addEventListener('keydown', this.keyboard.events.keyDown)
        document.addEventListener('keyup', this.keyboard.events.keyUp)
    }

    setTouch()
    {
        this.touch = {}

        /**
         * Joystick
         */
        this.touch.joystick = {}
        this.touch.joystick.active = false

        // Element
        this.touch.joystick.$element = document.createElement('div')
        this.touch.joystick.$element.style.userSelect = 'none'
        this.touch.joystick.$element.style.position = 'fixed'
        this.touch.joystick.$element.style.bottom = '10px'
        this.touch.joystick.$element.style.left = '10px'
        this.touch.joystick.$element.style.width = '170px'
        this.touch.joystick.$element.style.height = '170px'
        this.touch.joystick.$element.style.borderRadius = '50%'
        this.touch.joystick.$element.style.transition = 'opacity 0.3s 0.0s'
        this.touch.joystick.$element.style.willChange = 'opacity'
        this.touch.joystick.$element.style.opacity = '0'
        // this.touch.joystick.$element.style.backgroundColor = '#ff0000'
        document.body.appendChild(this.touch.joystick.$element)

        this.touch.joystick.$cursor = document.createElement('div')
        this.touch.joystick.$cursor.style.position = 'absolute'
        this.touch.joystick.$cursor.style.top = 'calc(50% - 30px)'
        this.touch.joystick.$cursor.style.left = 'calc(50% - 30px)'
        this.touch.joystick.$cursor.style.width = '60px'
        this.touch.joystick.$cursor.style.height = '60px'
        this.touch.joystick.$cursor.style.border = '2px solid #ffffff'
        this.touch.joystick.$cursor.style.borderRadius = '50%'
        this.touch.joystick.$cursor.style.boxSizing = 'border-box'
        this.touch.joystick.$cursor.style.pointerEvents = 'none'
        this.touch.joystick.$cursor.style.willChange = 'transform'
        this.touch.joystick.$element.appendChild(this.touch.joystick.$cursor)

        this.touch.joystick.$limit = document.createElement('div')
        this.touch.joystick.$limit.style.position = 'absolute'
        this.touch.joystick.$limit.style.top = 'calc(50% - 75px)'
        this.touch.joystick.$limit.style.left = 'calc(50% - 75px)'
        this.touch.joystick.$limit.style.width = '150px'
        this.touch.joystick.$limit.style.height = '150px'
        this.touch.joystick.$limit.style.border = '2px solid #ffffff'
        this.touch.joystick.$limit.style.borderRadius = '50%'
        this.touch.joystick.$limit.style.opacity = '0.25'
        this.touch.joystick.$limit.style.pointerEvents = 'none'
        this.touch.joystick.$limit.style.boxSizing = 'border-box'
        this.touch.joystick.$element.appendChild(this.touch.joystick.$limit)

        // Angle
        this.touch.joystick.angle = {}

        // Screen-to-world rotation. Recomputed each tick from the live camera
        // angle: the camera azimuth changes in the projects area (and tweens
        // between zones), and a stale offset rotates the joystick mapping —
        // pushes near the forward/reverse boundary then read as reverse.
        this.touch.joystick.angle.offset = Math.PI * 0.18

        this.touch.joystick.angle.center = {}
        this.touch.joystick.angle.center.x = 0
        this.touch.joystick.angle.center.y = 0

        this.touch.joystick.angle.current = {}
        this.touch.joystick.angle.current.x = 0
        this.touch.joystick.angle.current.y = 0

        this.touch.joystick.angle.originalValue = 0
        this.touch.joystick.angle.value = - Math.PI * 0.5

        // Resize
        this.touch.joystick.resize = () =>
        {
            const boundings = this.touch.joystick.$element.getBoundingClientRect()

            this.touch.joystick.angle.center.x = boundings.left + boundings.width * 0.5
            this.touch.joystick.angle.center.y = boundings.top + boundings.height * 0.5
        }

        this.sizes.on('resize', this.touch.joystick.resize)
        this.touch.joystick.resize()

        // Time tick
        this.time.on('tick', () =>
        {
            // Joystick active
            if(this.touch.joystick.active)
            {
                // Derive the screen-to-world offset from where the camera sits:
                // world direction of "screen up" on the ground, minus the π/2 the
                // joystick already reports for an upward push
                const cameraAngle = this.camera.angle.value
                this.touch.joystick.angle.offset = Math.atan2(- cameraAngle.y, - cameraAngle.x) - Math.PI * 0.5

                // Calculate joystick angle
                this.touch.joystick.angle.originalValue = - Math.atan2(
                    this.touch.joystick.angle.current.y - this.touch.joystick.angle.center.y,
                    this.touch.joystick.angle.current.x - this.touch.joystick.angle.center.x
                )
                this.touch.joystick.angle.value = this.touch.joystick.angle.originalValue + this.touch.joystick.angle.offset

                // Update joystick visual
                const distance = Math.hypot(this.touch.joystick.angle.current.y - this.touch.joystick.angle.center.y, this.touch.joystick.angle.current.x - this.touch.joystick.angle.center.x)
                let radius = distance
                if(radius > 20)
                {
                    radius = 20 + Math.log(distance - 20) * 5
                }
                if(radius > 43)
                {
                    radius = 43
                }
                const cursorX = Math.sin(this.touch.joystick.angle.originalValue + Math.PI * 0.5) * radius
                const cursorY = Math.cos(this.touch.joystick.angle.originalValue + Math.PI * 0.5) * radius
                this.touch.joystick.$cursor.style.transform = `translateX(${cursorX}px) translateY(${cursorY}px)`

                if(distance > 10)
                {
                    this.camera.pan.reset()
                }
                this.touch.joystick.distance = distance
            }
            else
            {
                this.touch.joystick.distance = 0
            }
        })

        // Events
        this.touch.joystick.events = {}
        this.touch.joystick.touchIdentifier = null
        this.touch.joystick.events.touchstart = (_event) =>
        {
            _event.preventDefault()

            const touch = _event.changedTouches[0]

            if(touch)
            {
                this.touch.joystick.active = true

                this.touch.joystick.touchIdentifier = touch.identifier

                this.touch.joystick.angle.current.x = touch.clientX
                this.touch.joystick.angle.current.y = touch.clientY

                this.touch.joystick.$limit.style.opacity = '0.5'

                document.addEventListener('touchend', this.touch.joystick.events.touchend)
                document.addEventListener('touchmove', this.touch.joystick.events.touchmove, { passive: false })

                this.trigger('joystickStart')
            }
        }

        this.touch.joystick.events.touchmove = (_event) =>
        {
            _event.preventDefault()

            const touches = [..._event.changedTouches]
            const touch = touches.find((_touch) => _touch.identifier === this.touch.joystick.touchIdentifier)

            if(touch)
            {
                this.touch.joystick.angle.current.x = touch.clientX
                this.touch.joystick.angle.current.y = touch.clientY

                this.trigger('joystickMove')
            }
        }

        this.touch.joystick.events.touchend = (_event) =>
        {
            const touches = [..._event.changedTouches]
            const touch = touches.find((_touch) => _touch.identifier === this.touch.joystick.touchIdentifier)

            if(touch)
            {
                this.touch.joystick.active = false

                this.touch.joystick.$limit.style.opacity = '0.25'

                this.touch.joystick.$cursor.style.transform = 'translateX(0px) translateY(0px)'

                document.removeEventListener('touchend', this.touch.joystick.events.touchend)

                this.trigger('joystickEnd')
            }
        }

        this.touch.joystick.$element.addEventListener('touchstart', this.touch.joystick.events.touchstart, { passive: false })

        // touchcancel fires when the OS interrupts touches (e.g. switching tabs mid-drag)
        document.addEventListener('touchcancel', () =>
        {
            if(this.touch.joystick.active)
            {
                this.touch.joystick.active = false
                this.touch.joystick.$limit.style.opacity = '0.25'
                this.touch.joystick.$cursor.style.transform = 'translateX(0px) translateY(0px)'
                document.removeEventListener('touchend', this.touch.joystick.events.touchend)
                document.removeEventListener('touchmove', this.touch.joystick.events.touchmove)
            }
        })

        /**
         * Brake button — hold to stop without flipping into reverse
         * (the joystick's backward pull brakes but then reverses)
         */
        this.touch.brake = {}

        this.touch.brake.$element = document.createElement('div')
        this.touch.brake.$element.style.cssText = `
            user-select: none;
            -webkit-user-select: none;
            -webkit-tap-highlight-color: transparent;
            position: fixed;
            bottom: 45px;
            right: 25px;
            width: 90px;
            height: 90px;
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-family: Arial, sans-serif;
            font-size: 14px;
            letter-spacing: 1px;
            opacity: 0;
            transition: opacity 0.3s;
            will-change: opacity;
        `
        this.touch.brake.$element.textContent = 'BRAKE'
        document.body.appendChild(this.touch.brake.$element)

        this.touch.brake.touchIdentifier = null
        this.touch.brake.$element.addEventListener('touchstart', (_event) =>
        {
            _event.preventDefault()
            const touch = _event.changedTouches[0]
            if(touch)
            {
                this.touch.brake.touchIdentifier = touch.identifier
                this.actions.brake = true
                this.touch.brake.$element.style.background = 'rgba(255, 255, 255, 0.25)'
            }
        }, { passive: false })

        const brakeRelease = (_event) =>
        {
            const touches = [..._event.changedTouches]
            const touch = touches.find((_touch) => _touch.identifier === this.touch.brake.touchIdentifier)
            if(touch)
            {
                this.touch.brake.touchIdentifier = null
                this.actions.brake = false
                this.touch.brake.$element.style.background = 'transparent'
            }
        }
        document.addEventListener('touchend', brakeRelease)
        document.addEventListener('touchcancel', brakeRelease)

        // Reveal
        this.touch.reveal = () =>
        {
            this.touch.joystick.$element.style.opacity = 1
            this.touch.brake.$element.style.opacity = 0.5
        }
    }
}
