import gsap from 'gsap'

export default class ThreejsJourney
{
    constructor(_options)
    {
        // Options
        this.config = _options.config
        this.time = _options.time
        this.world = _options.world

        // Setup
        this.$container = document.querySelector('.js-threejs-journey')
        this.$messages = [...this.$container.querySelectorAll('.js-message')]
        this.$yes = this.$container.querySelector('.js-yes')
        this.$no = this.$container.querySelector('.js-no')
        this.step = 0
        this.maxStep = this.$messages.length - 1
        this.shown = false
        this.traveledDistance = 0
        // Fixed distance — no localStorage scaling so it always fires after ~80 units of driving.
        this.minTraveledDistance = this.config.debug ? 5 : 300

        if(this.config.debug)
            this.start()

        this.setYesNo()
        this.setLog()

        this.time.on('tick', () =>
        {
            if(this.world.physics)
            {
                this.traveledDistance += this.world.physics.car.forwardSpeed

                if(!this.config.touch && !this.shown && this.traveledDistance > this.minTraveledDistance)
                {
                    this.start()
                }
            }
        })
    }

    setYesNo()
    {
        // Clicks
        this.$yes.addEventListener('click', () =>
        {
            this.next()
            gsap.delayedCall(5, () =>
            {
                this.hide()
            })
        })

        this.$no.addEventListener('click', () =>
        {
            this.next()

            gsap.delayedCall(5, () =>
            {
                this.hide()
            })
        })

        // Hovers
        this.$yes.addEventListener('mouseenter', () =>
        {
            this.$container.classList.remove('is-hover-none')
            this.$container.classList.remove('is-hover-no')
            this.$container.classList.add('is-hover-yes')
        })

        this.$no.addEventListener('mouseenter', () =>
        {
            this.$container.classList.remove('is-hover-none')
            this.$container.classList.add('is-hover-no')
            this.$container.classList.remove('is-hover-yes')
        })

        this.$yes.addEventListener('mouseleave', () =>
        {
            this.$container.classList.add('is-hover-none')
            this.$container.classList.remove('is-hover-no')
            this.$container.classList.remove('is-hover-yes')
        })

        this.$no.addEventListener('mouseleave', () =>
        {
            this.$container.classList.add('is-hover-none')
            this.$container.classList.remove('is-hover-no')
            this.$container.classList.remove('is-hover-yes')
        })
    }

    setLog()
    {
//         console.log(
//             `%c 
// ▶
// ▶▶▶▶
// ▶▶▶▶▶▶▶
// ▶▶▶▶▶▶▶▶▶▶
// ▶▶▶▶▶▶▶▶     ▶
// ▶▶▶▶      ▶▶▶▶▶▶▶▶
// ▶     ▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶
//    ▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶
//       ▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶      
// ▶▶        ▶▶▶▶▶▶▶▶▶▶     ▶   ▶▶▶
// ▶▶▶▶▶▶        ▶      ▶▶▶▶▶   ▶▶▶▶▶▶
// ▶▶▶▶▶▶▶▶▶▶▶       ▶▶▶▶▶▶▶▶   ▶▶▶▶▶▶▶▶▶
// ▶▶▶▶▶▶▶▶▶▶▶▶▶   ▶▶▶▶▶▶▶▶▶▶   ▶▶▶▶▶▶▶
// ▶▶▶▶▶▶▶▶▶▶▶▶▶   ▶▶▶▶▶▶▶▶▶▶   ▶▶▶▶
// ▶▶▶▶▶▶▶▶▶▶▶▶▶   ▶▶▶▶▶▶▶▶▶▶   ▶
//  ▶▶▶▶▶▶▶▶▶▶▶▶   ▶▶▶▶▶▶▶▶▶▶
//      ▶▶▶▶▶▶▶▶   ▶▶▶▶▶▶▶
// ▶▶▶▶     ▶▶▶▶   ▶▶▶
// ▶▶▶▶▶▶▶     ▶   
// ▶▶▶▶▶▶▶▶▶▶
// ▶▶▶▶▶▶▶
// ▶▶
//             `,
//             'color: #705df2;'
//         )
        // TODO(console-message): This is the easter egg message developers see when they
        // open DevTools on your site. Customise the text and colour however you like.
        // The colour string (#32ffce) is a CSS color value.
        console.log('%cHey, sneaky developer! 👋', 'color: #32ffce');
        console.log('%cGlad you peeked under the hood.', 'color: #32ffce');
        console.log('%cFeel free to reach out 👉 https://github.com/serhan-cakmak', 'color: #32ffce');
        console.log('%c— Serhan', 'color: #777777');
    }

    hide()
    {
        for(const _$message of this.$messages)
        {
            _$message.classList.remove('is-visible')
        }

        gsap.delayedCall(0.5, () =>
        {
            this.$container.classList.remove('is-active')
        })
    }

    start()
    {
        this.$container.classList.add('is-active')

        window.requestAnimationFrame(() =>
        {
            this.next()

            gsap.delayedCall(4, () =>
            {
                this.next()
            })
            gsap.delayedCall(7, () =>
            {
                this.next()
            })
        })

        this.shown = true
    }

    updateMessages()
    {
        let i = 0

        // Visibility
        for(const _$message of this.$messages)
        {
            if(i < this.step)
                _$message.classList.add('is-visible')

            i++
        }

        // Position
        this.$messages.reverse()

        let height = 0
        i = this.maxStep
        for(const _$message of this.$messages)
        {
            const messageHeight = _$message.offsetHeight
            if(i < this.step)
            {
                _$message.style.transform = `translateY(${- height}px)`
                height += messageHeight + 20
            }
            else
            {
                _$message.style.transform = `translateY(${messageHeight}px)`
            }

            i--
        }


        this.$messages.reverse()
    }

    next()
    {
        if(this.step > this.maxStep)
            return

        this.step++

        this.updateMessages()
    }
}