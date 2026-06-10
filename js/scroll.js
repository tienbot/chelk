// 3D scroll effect (translateZ based)
let zSpacing = -1000,
    lastPos = 0,
    $frames = document.getElementsByClassName('frame'),
    frames = Array.from($frames),
    zVals = []

// Virtual scroll support: if document scrolling is disabled (overflow:hidden),
// we listen to wheel/touch and update a virtual `top` value.
let virtualTop = 0
const maxTop = Math.max(1, frames.length * Math.abs(zSpacing))
let ticking = false
// whether the carousel video has been activated by user click
let videoActivated = false
// timeout id for hiding the scroll-section after fade
let hideScrollSectionTimeout = null
// timer to restore slide transitions after scroll stops
let slideTransformRestoreTimer = null

function updateFrames(top){
    const delta = lastPos - top
    lastPos = top
    // During active scroll, disable CSS transitions on the center slide so its
    // transform/scale updates apply immediately (prevents lag vs frames).
    try {
        const sc = document.querySelector('.slide.center')
        if (sc) {
            // only touch inline style if not already disabled
            if (sc._savedTransition === undefined) sc._savedTransition = sc.style.transition || ''
            sc.style.transition = 'none'
            if (slideTransformRestoreTimer) clearTimeout(slideTransformRestoreTimer)
            slideTransformRestoreTimer = setTimeout(() => {
                try { sc.style.transition = sc._savedTransition || '' } catch (e) {}
                slideTransformRestoreTimer = null
            }, 120)
        }
    } catch (e) {}
    let maxOpacity = 0
    frames.forEach(function(frame, i){
        if (zVals[i] === undefined) zVals[i] = (i * zSpacing) + zSpacing
        zVals[i] += delta * -5.5
        const transform = `translateZ(${zVals[i]}px)`
        // compute smooth opacity based on depth (closer => more opaque)
        const distance = Math.abs(zVals[i])
        const visibleStart = Math.abs(zSpacing) / 4 // start of full visibility
        const fadeRange = Math.abs(zSpacing) // range over which it fades out
        let opacity = 1 - Math.min(Math.max((distance - visibleStart) / fadeRange, 0), 1)
        // small numeric stability
        if (Math.abs(opacity) < 0.001) opacity = 0
        frame.style.transform = transform
        frame.style.opacity = String(opacity)
        if (opacity > maxOpacity) maxOpacity = opacity
    })
    // allow pointer events on visible frames (opacity > 0) and
    // set z-index ordering by depth (closer frames on top)
    const indices = frames.map((_, i) => i)
    // sort indices by zVals descending (larger z => closer to viewer)
    indices.sort((a, b) => zVals[b] - zVals[a])
    indices.forEach((idx, rank) => {
        const frame = frames[idx]
        const isVisible = Number(frame.style.opacity) > 0.03
        frame.style.pointerEvents = isVisible ? 'auto' : 'none'
        // higher rank (closer) gets higher z-index
        frame.style.zIndex = String(100 + (indices.length - rank))
    })

    // determine whether we've reached the end of the virtual scroll
    const endThreshold = 0.98
    const endReached = (top / maxTop) >= endThreshold
    // compute center slide opacity (if available) and treat it as authoritative
    let centerOpacity = null
    try {
        const slideCenter = document.querySelector('.slide.center')
        if (slideCenter) {
            const cs = window.getComputedStyle(slideCenter)
            centerOpacity = Number(cs && cs.opacity != null ? cs.opacity : null)
        }
    } catch(e) {}
    // if centerOpacity is not available, fall back to endReached
    const centerIsTinyZero = (centerOpacity !== null) ? (centerOpacity === 2.22045e-16) : endReached

    // toggle carousel background video visibility only after user activated it,
    // and synchronized with center slide opacity
    try {
        const carouselVideo = document.querySelector('#carousel .scroll-bg-video')
        if (carouselVideo && videoActivated) {
            if (centerIsTinyZero) {
                carouselVideo.classList.remove('visible')
                try { carouselVideo.pause && carouselVideo.pause() } catch(e){}
            } else {
                carouselVideo.classList.add('visible')
                try { carouselVideo.play && carouselVideo.play().catch(()=>{}) } catch(e){}
            }
        }
    } catch(e) {}

    // show/hide head section based on centerIsTinyZero
    try {
        const headSection = document.querySelector('.head')
        if (headSection) {
            if (top === 0) {
                headSection.classList.remove('visible')
            } else if (centerIsTinyZero) {
                headSection.classList.add('visible')
            } else {
                headSection.classList.remove('visible')
            }
            // Toggle `.lines` visibility opposite to `head`, but only after user has enabled lines (choiseBtn click)
            try {
                if (window._linesEnabled && !window.bubbleClick) {
                    const linesEl = document.querySelector('.lines') || document.querySelector('section.lines') || document.getElementById('lines')
                    if (linesEl) {
                        if (headSection.classList.contains('visible')) {
                            linesEl.classList.remove('visible')
                        } else {
                            linesEl.classList.add('visible')
                        }
                    }
                }
            } catch (e) {}
        }
    } catch(e) {}

    // when all frames are faded, hide the entire .scroll-section (display:none)
    try {
        const scrollSection = document.querySelector('.scroll-section')
        if (scrollSection) {
            if (endReached) {
                // wait for CSS opacity transition to finish before setting display:none
                if (!hideScrollSectionTimeout) {
                    hideScrollSectionTimeout = setTimeout(() => {
                        scrollSection.style.display = 'none'
                        hideScrollSectionTimeout = null
                    }, 900)
                }
            } else {
                // cancel pending hide and ensure section is visible again
                if (hideScrollSectionTimeout) {
                    clearTimeout(hideScrollSectionTimeout)
                    hideScrollSectionTimeout = null
                }
                if (scrollSection.style.display === 'none') scrollSection.style.display = ''
            }
        }
    } catch(e) {}
}

function onScrollNative(){
    const top = document.documentElement.scrollTop || document.body.scrollTop
    updateFrames(top)
}

function onWheel(e){
    virtualTop = Math.min(Math.max(0, virtualTop + e.deltaY), maxTop)
    if (!ticking) {
        window.requestAnimationFrame(() => {
            updateFrames(virtualTop)
            ticking = false
        })
        ticking = true
    }
}

function onTouch(e){
    if (e.touches && e.touches.length) {
        // use touchmove's clientY to influence virtualTop
        // handled via touchmove listener below
    }
}

let lastTouchY = null
function onTouchMove(e){
    if (!e.touches || !e.touches.length) return
    const y = e.touches[0].clientY
    if (lastTouchY !== null) {
        const deltaY = lastTouchY - y
        virtualTop = Math.min(Math.max(0, virtualTop + deltaY), maxTop)
        updateFrames(virtualTop)
    }
    lastTouchY = y
}

window.addEventListener('scroll', onScrollNative, {passive: true})
window.addEventListener('wheel', onWheel, {passive: true})
window.addEventListener('touchstart', e => { lastTouchY = e.touches[0] ? e.touches[0].clientY : null }, {passive: true})
window.addEventListener('touchmove', onTouchMove, {passive: true})

// kickstart positions
updateFrames(0)

// preserve existing card open/close behaviour
document.querySelectorAll('.scroll-card__button').forEach(button => {
    const card = button.closest('.scroll-card')
    if (!card) return
    // initialize aria
    button.setAttribute('aria-expanded', 'false')
    button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true'
        button.setAttribute('aria-expanded', String(!expanded))
        card.classList.toggle('open', !expanded)
    })
})

// Show background video inside carousel after user clicks the choice button
try {
    const choiceBtn = document.getElementById('choiseBtn')
    const carouselVideo = document.querySelector('#carousel .scroll-bg-video')
    if (choiceBtn && carouselVideo) {
        choiceBtn.addEventListener('click', () => {
            // mark activation so updateFrames won't auto-show video before click
            videoActivated = true
            carouselVideo.classList.add('visible')
            // user gesture; ensure playback starts
            carouselVideo.play && carouselVideo.play().catch(() => {})
        })
    }
} catch (e) {
    // ignore
}