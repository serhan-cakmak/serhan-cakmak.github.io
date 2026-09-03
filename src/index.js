import './style/main.css'
import Application from './javascript/Application.js'

const $entry = document.querySelector('.js-entry-choice')
const $startGame = document.querySelector('.js-start-game')

window.application = new Application({
    $canvas: document.querySelector('.js-canvas'),
    useComposer: true
})

// Assets can load behind the entry screen, but rendering waits until the
// visitor chooses the game so the menu and WebGL never compete for frames.
window.application.time.stop()

$startGame.addEventListener('click', () =>
{
    document.body.classList.add('is-playing')
    $entry.hidden = true

    window.application.time.current = Date.now()
    window.application.time.tick()
})
