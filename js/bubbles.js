const container = document.querySelector('.bubbles-container')
// store placed rectangles to avoid overlaps
const placedRects = []

const itemsGreen = [
  {
    color: '#9E9E9E',
    text1: '<p>Хочу что-то уникальное… как у всех</p>',
    text2: '<p>Уникально повторим</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Мне пока все нравится, но что-то не то</p>',
    text2: '<p>✨Ему все нравится✨</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Нам важно, чтобы это работало</p>',
    text2: '<p>На всё воля божья</p>',
  },
  {
    color: '#1D737B',
    text1: '<p>Давайте сначала разберемся, что мы делаем</p>',
    text2: '<p>А какую цель вы хотите достичь?</p>',
  },
  {
    color: '#1D737B',
    text1: '<p>Хочу в Forbes</p>',
    text2: '<p>Хочу выиграть Design Lion в Каннах</p>',
  },
  {
    color: '#1D737B',
    text1: '<p>Конкуренты громче. Мы — лучше</p>',
    text2: '<p>Позвольте это исправить</p>',
  },
]

const itemsRed = [
  {
    color: '#9E9E9E',
    text1: '<p>Хочется сделать и не переделывать никогда</p>',
    text2: '<p>Ахахахахвхаххазахв</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Давайте без брифа, там всё понятно</p>',
    text2: '<p>6 years later…</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Переделайте, как сейчас в тренде</p>',
    text2: '<p>Составим новый договор или оформим годовую подписку?</p>',
  },
  {
    color: '#C4142D',
    text1: '<p>Устал извиняться за сайт на переговорах</p>',
    text2: '<p>Больше не придётся</p>',
  },
  {
    color: '#C4142D',
    text1: '<p>Главное — чтобы это решало задачи бизнеса, а не просто мне нравилось</p>',
    text2: '<p>Мы нашли друг друга)</p>',
  },
  {
    color: '#C4142D',
    text1: '<p>Мы понимаем, что сильный продукт не делается за три дня, поэтому готовы заложить адекватные сроки</p>',
    text2: '<p>Вы только что увеличили мою мотивацию в три раза</p>',
  },
]

const itemsPurple = [
  {
    color: '#9E9E9E',
    text1: '<p>Начали за здравие, ушли в редизайн</p>',
    text2: '<p>Маршрут перестроен</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Это сработает?</p>',
    text2: '<p>Бюджет заложен на «да»</p>',
  },
  {
    color: '#9E9E9E',
    text1: '<p>Почти зафиналили, но давайте сначала</p>',
    text2: '<p>Сто шагов назад…</p>',
  },
  {
    color: '#7B1D7B',
    text1: '<p>Давайте не будем копировать лидеров рынка, у нас свой путь</p>',
    text2: '<p>Похоже у ребят большое будущее</p>',
  },
  {
    color: '#7B1D7B',
    text1: '<p>Наш продукт сложный, помогите упаковать его так, чтобы понял даже ребенок</p>',
    text2: '<p>Я проведу кастдевы с вашими клиентами и сотрудниками</p>',
  },
  {
    color: '#7B1D7B',
    text1: '<p>Мы наняли вас ради вашей экспертизы, так что финальное визуальное решение за вами</p>',
    text2: '<p>Улыбка в ответ</p>',
  },
]

// NOTE: initial bubbles removed — page starts empty.
// Helper: find non-overlapping random position for a bubble and register its rect
function placeNonOverlapping(bubble) {
  const cRect = container.getBoundingClientRect()
  const bRect = bubble.getBoundingClientRect()
  const maxLeft = Math.max(0, cRect.width - bRect.width)
  const maxTop = Math.max(0, cRect.height - bRect.height)
  const padding = Math.max(8, Math.round(bRect.width * 0.06))

  let placed = false
  let left = 0,
    top = 0
  const tries = 200

  for (let i = 0; i < tries; i++) {
    left = Math.round(Math.random() * maxLeft)
    top = Math.round(Math.random() * maxTop)
    const rect = { left, top, right: left + bRect.width, bottom: top + bRect.height }

    let overlap = false
    for (const pr of placedRects) {
      if (!(rect.right + padding < pr.left || rect.left - padding > pr.right || rect.bottom + padding < pr.top || rect.top - padding > pr.bottom)) {
        overlap = true
        break
      }
    }

    if (!overlap) {
      bubble.style.left = left + 'px'
      bubble.style.top = top + 'px'
      placedRects.push(rect)
      placed = true
      break
    }
  }

  if (!placed) {
    left = Math.round(Math.random() * maxLeft)
    top = Math.round(Math.random() * maxTop)
    bubble.style.left = left + 'px'
    bubble.style.top = top + 'px'
    placedRects.push({ left, top, right: left + bRect.width, bottom: top + bRect.height })
  }

  return { left: parseInt(bubble.style.left, 10), top: parseInt(bubble.style.top, 10) }
}

function attachBehavior(bubble, item) {
  const inner = bubble.querySelector('.bubble-inner')
  const textElement = bubble.querySelector('.bubble-text')
  let timeoutId = null
  let showingAlt = false // is text2 currently shown
  let swapTimeout = null

  function startRandomShake() {
    const delay = 2000 + Math.random() * 5000
    timeoutId = setTimeout(() => {
      if (!inner.matches(':hover')) {
        inner.classList.add('shake')
        setTimeout(() => inner.classList.remove('shake'), 420)
      }
      startRandomShake()
    }, delay)
  }

  startRandomShake()

  inner.addEventListener('mouseenter', () => {
    if (timeoutId) clearTimeout(timeoutId)
    inner.classList.remove('shake')

    // Smoothly pause float: capture computed transform and apply as inline transform
    const cs = getComputedStyle(bubble)
    const currentTransform = cs.transform
    if (currentTransform && currentTransform !== 'none') {
      bubble.style.transition = 'transform 180ms linear'
      bubble.style.transform = currentTransform
      bubble.style.animationPlayState = 'paused'
      bubble.style.webkitAnimationPlayState = 'paused'
      setTimeout(() => {
        bubble.style.transition = ''
      }, 200)
    } else {
      bubble.style.animationPlayState = 'paused'
      bubble.style.webkitAnimationPlayState = 'paused'
    }
    // allow CSS :hover to control opacity (show text)
    textElement.style.opacity = ''
  })

  inner.addEventListener('mouseleave', () => {
    // Resume float: re-enable animation and remove inline transform
    bubble.style.animation = ''
    bubble.style.animationPlayState = 'running'
    bubble.style.webkitAnimationPlayState = 'running'
    void bubble.offsetWidth // reflow
    bubble.style.transform = ''
    startRandomShake()

    // hide text on mouseleave immediately and cancel pending swaps
    if (swapTimeout) {
      clearTimeout(swapTimeout)
      swapTimeout = null
    }
    textElement.style.transition = 'opacity 0.35s ease'
    textElement.style.opacity = '0'

    // if alternate text is showing, revert its content to text1 (kept hidden)
    if (showingAlt) {
      // swap content but keep hidden; when user re-enters, CSS will show current content
      swapText(item.text1)
      showingAlt = false
    }
  })

  function swapText(newHtml) {
    clearTimeout(swapTimeout)
    textElement.style.transition = 'opacity 0.6s ease'
    // fade out first
    textElement.style.opacity = '0'
    swapTimeout = setTimeout(() => {
      textElement.innerHTML = newHtml
      void textElement.offsetWidth
      // if currently hovered, remove inline opacity so CSS :hover makes it visible;
      // otherwise keep it hidden (opacity 0)
      if (inner.matches(':hover')) {
        textElement.style.opacity = ''
      } else {
        textElement.style.opacity = '0'
      }
    }, 650)
  }

  inner.addEventListener('click', () => {
    // toggle between text1 and text2 with symmetric animation
    if (!showingAlt) {
      swapText(item.text2)
      showingAlt = true
    } else {
      swapText(item.text1)
      showingAlt = false
    }
  })
}

// Вынесенная функция: спавнит один пузырь по дуге из кнопки
function spawnBubble(item, fixedTarget) {
  const bubble = document.createElement('div')
  bubble.className = 'bubble'
  bubble.style.setProperty('--bubble-color', item.color)
  const dur = (4 + Math.random() * 6).toFixed(2) + 's'
  const x = (Math.random() * 12 - 6).toFixed(3) + 'vw'
  bubble.style.setProperty('--float-duration', dur)
  bubble.style.setProperty('--float-x', x)
  bubble.style.animation = 'none'

  bubble.innerHTML = `
        <span class="bubble-inner">
          <span></span>
          <div class="bubble-text"></div>
        </span>
      `

  container.appendChild(bubble)
  bubble.classList.add('spawning')

  requestAnimationFrame(() => {
    const cRect = container.getBoundingClientRect()
    const bRect = bubble.getBoundingClientRect()
    const btnRect = document.querySelector('.bubbles-btn').getBoundingClientRect()

    const startLeft = Math.round(btnRect.left - cRect.left + btnRect.width / 2 - bRect.width / 2)
    const startTop = Math.round(btnRect.top - cRect.top + btnRect.height / 2 - bRect.height / 2)

    const maxLeft = Math.max(0, cRect.width - bRect.width)
    const maxTop = Math.max(0, cRect.height - bRect.height)
    const padding = Math.max(8, Math.round(bRect.width * 0.06))

    let targetLeft = startLeft,
      targetTop = startTop
    if (fixedTarget && typeof fixedTarget.fx === 'number' && typeof fixedTarget.fy === 'number') {
      // fixedTarget coordinates are fractions (0..1) of available area
      targetLeft = Math.round(fixedTarget.fx * maxLeft)
      targetTop = Math.round(fixedTarget.fy * maxTop)
      placedRects.push({ left: targetLeft, top: targetTop, right: targetLeft + bRect.width, bottom: targetTop + bRect.height })
    } else {
      let placed = false
      const tries = 200
      for (let i = 0; i < tries; i++) {
        const l = Math.round(Math.random() * maxLeft)
        const t = Math.round(Math.random() * maxTop)
        const rect = { left: l, top: t, right: l + bRect.width, bottom: t + bRect.height }

        let overlap = false
        for (const pr of placedRects) {
          if (
            !(rect.right + padding < pr.left || rect.left - padding > pr.right || rect.bottom + padding < pr.top || rect.top - padding > pr.bottom)
          ) {
            overlap = true
            break
          }
        }

        if (!overlap) {
          targetLeft = l
          targetTop = t
          placedRects.push(rect)
          placed = true
          break
        }
      }

      if (!placed) {
        targetLeft = Math.round(Math.random() * maxLeft)
        targetTop = Math.round(Math.random() * maxTop)
        placedRects.push({ left: targetLeft, top: targetTop, right: targetLeft + bRect.width, bottom: targetTop + bRect.height })
      }
    }

    bubble.style.left = startLeft + 'px'
    bubble.style.top = startTop + 'px'
    bubble.style.opacity = '0'
    bubble.style.transform = 'translate(0,0) scale(0.2)'

    const dx = targetLeft - startLeft
    const dy = targetTop - startTop
    const arcHeight = Math.max(60, Math.round(bRect.height * 0.6))

    const anim = bubble.animate(
      [
        { transform: `translate(0px, 0px) scale(0.2)`, opacity: 0 },
        { transform: `translate(${Math.round(dx / 2)}px, ${Math.round(dy / 2 - arcHeight)}px) scale(1.05)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 1 },
      ],
      {
        duration: 700,
        easing: 'cubic-bezier(.22,.9,.31,1)',
      },
    )

    anim.onfinish = () => {
      bubble.style.left = targetLeft + 'px'
      bubble.style.top = targetTop + 'px'
      bubble.style.transform = ''
      bubble.style.opacity = '1'

      bubble.style.animation = ''
      bubble.classList.remove('spawning')

      const textElement = bubble.querySelector('.bubble-text')
      textElement.innerHTML = item.text1

      attachBehavior(bubble, item)
    }
  })
}

const spawnBtn = document.querySelector('.bubbles-btn')
let spawnLocked = false // prevent multiple rapid clicks
// helper: try to remove the placedRects entry for a bubble
function removePlacedRectForBubble(bubble) {
  const left = parseInt(bubble.style.left || 0, 10)
  const top = parseInt(bubble.style.top || 0, 10)
  for (let i = 0; i < placedRects.length; i++) {
    const pr = placedRects[i]
    if (Math.abs(pr.left - left) < 8 && Math.abs(pr.top - top) < 8) {
      placedRects.splice(i, 1)
      return
    }
  }
}

function removeBubbleImmediate(bubble) {
  removePlacedRectForBubble(bubble)
  if (bubble.parentNode) bubble.parentNode.removeChild(bubble)
}

function spawnThreeWithStagger(done, forcedGroup) {
  const stagger = 220 // ms between spawns
  // fixed relative target positions for the three bubbles (fractions of available area)
  const fixedTargets = [
    { fx: 0.9, fy: 0.56 },
    { fx: 0.12, fy: 0.78 },
    { fx: 0.74, fy: 0.1 },
  ]

  const groups = [itemsGreen, itemsRed, itemsPurple]

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
  }

  // Choose group strictly based on forcedGroup or current mainObject value (no random group selection)
  let picks = null
  let chosenGroup = null
  if (Array.isArray(forcedGroup) && forcedGroup.length > 0) {
    chosenGroup = forcedGroup
  } else {
    // determine active mainObject (normalized)
    let activeMain = null
    try {
      const el = document.getElementById('mainObject')
      if (el && el.textContent) activeMain = String(el.textContent).trim()
    } catch (e) {}
    try { if (!activeMain && typeof window !== 'undefined' && window.mainObject) activeMain = String(window.mainObject); } catch (e) {}
    const nm = (activeMain || '').toLowerCase()
    if (nm === 'хорека') chosenGroup = itemsRed
    else if (nm === 'одежда') chosenGroup = itemsGreen
    else if (nm === 'косметика') chosenGroup = itemsPurple
    else chosenGroup = itemsGreen // default group when mainObject not set
    if (chosenGroup) console.log('[bubbles] chosen group by mainObject (spawn):', activeMain || '<none>')
  }

  // pick first 3 items from chosenGroup (shuffle to vary order)
  if (chosenGroup) {
    const copy = chosenGroup.slice()
    shuffleArray(copy)

    // pick up to 3 items but allow at most 2 items of the same color
    picks = []
    const colorCounts = {}
    for (let i = 0; i < copy.length && picks.length < 3; i++) {
      const it = copy[i]
      const c = it && it.color ? it.color : ''
      const cnt = colorCounts[c] || 0
      if (cnt < 2) {
        picks.push(it)
        colorCounts[c] = cnt + 1
      }
    }

    // if we couldn't gather 3 items under the constraint, fill remaining slots ignoring color
    if (picks.length < 3) {
      for (let i = 0; i < copy.length && picks.length < 3; i++) {
        const it = copy[i]
        if (!picks.includes(it)) picks.push(it)
      }
    }
  }

  // finally spawn the three picked items in order with stagger
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      spawnBubble(picks[i], fixedTargets[i])
    }, i * stagger)
  }

  if (typeof done === 'function') {
    const totalSpawnTime = (3 - 1) * stagger + 700 + 80 // last spawn start + anim duration + buffer
    setTimeout(() => done(), totalSpawnTime)
  }
}

if (spawnBtn) {
  spawnBtn.addEventListener('click', () => {
    if (spawnLocked) return
    spawnLocked = true
    spawnBtn.disabled = true

    const existing = Array.from(container.querySelectorAll('.bubble'))
    if (existing.length === 0) {
      // determine active mainObject from DOM or global fallback and normalize
      let activeMain = null
      try {
        const el = document.getElementById('mainObject')
        if (el && el.textContent) activeMain = String(el.textContent).trim()
      } catch (e) {}
      try { if (!activeMain && typeof window !== 'undefined' && window.mainObject) activeMain = String(window.mainObject); } catch (e) {}

      let forcedGroup = null
      const nm = (activeMain || '').toLowerCase()
      if (nm === 'хорека') forcedGroup = itemsRed
      else if (nm === 'одежда') forcedGroup = itemsGreen
      else if (nm === 'косметика') forcedGroup = itemsPurple

      if (forcedGroup) console.log('[bubbles] forced group by mainObject:', activeMain)
      spawnThreeWithStagger(() => {
        spawnLocked = false
        spawnBtn.disabled = false
      }, forcedGroup)
      return
    }

    // trigger fall for all existing bubbles with a smoother motion and shorter fade
    const fallDuration = 2000 // ms for translate (shorter, smoother)
    const fadeBefore = 300 // ms before end to start fade
    existing.forEach((b) => {
      // stop float animation so computed transform is stable
      b.style.animation = 'none'
      b.style.animationPlayState = 'paused'

      // read current computed transform (may be a matrix or translate)
      const cs = getComputedStyle(b)
      const startTransform = cs.transform && cs.transform !== 'none' ? cs.transform : 'translate3d(0px,0px,0px)'
      const fallPx = Math.round(window.innerHeight * 1.2)
      const endTransform = startTransform + ` translate3d(0px, ${fallPx}px, 0)`

      // animate transform via WAAPI to preserve current X component
      try {
        const anim = b.animate([{ transform: startTransform }, { transform: endTransform }], {
          duration: fallDuration,
          easing: 'ease-in-out',
          fill: 'forwards',
        })
        // also schedule opacity fade near the end
        setTimeout(
          () => {
            b.style.opacity = '0'
          },
          Math.max(0, fallDuration - fadeBefore),
        )
        anim.onfinish = () => {
          // ensure final transform stays applied
          b.style.transform = endTransform
        }
      } catch (e) {
        // fallback: apply inline transform transition
        let tx = 0,
          ty = 0
        try {
          const m = new DOMMatrixReadOnly(startTransform)
          tx = m.m41 || 0
          ty = m.m42 || 0
        } catch (er) {}
        b.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
        b.style.transition = `transform ${fallDuration}ms ease-in, opacity 600ms linear`
        void b.offsetWidth
        b.style.transform = `translate3d(${tx}px, ${ty + fallPx}px, 0)`
        setTimeout(
          () => {
            b.style.opacity = '0'
          },
          Math.max(0, fallDuration - fadeBefore),
        )
      }
    })

    // wait for the fall + fade to finish, then remove DOM nodes and spawn new bubbles
    const fallWait = fallDuration + 80 // small buffer after fade
    setTimeout(() => {
      existing.forEach(removeBubbleImmediate)
      // determine active mainObject for next spawn (normalized)
      let activeMain2 = null
      try {
        const el2 = document.getElementById('mainObject')
        if (el2 && el2.textContent) activeMain2 = String(el2.textContent).trim()
      } catch (e) {}
      try { if (!activeMain2 && typeof window !== 'undefined' && window.mainObject) activeMain2 = String(window.mainObject); } catch (e) {}
      let forcedGroup2 = null
      const nm2 = (activeMain2 || '').toLowerCase()
      if (nm2 === 'хорека') forcedGroup2 = itemsRed
      else if (nm2 === 'одежда') forcedGroup2 = itemsGreen
      else if (nm2 === 'косметика') forcedGroup2 = itemsPurple
      if (forcedGroup2) console.log('[bubbles] forced group by mainObject (after fall):', activeMain2)

      spawnThreeWithStagger(() => {
        spawnLocked = false
        spawnBtn.disabled = false
      }, forcedGroup2)
    }, fallWait)
  })
}