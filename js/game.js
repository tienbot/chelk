const bubblesContainer = document.querySelector('.bubbles-container2')
const grayColor = '#9E9E9E'
const MAIN_OBJECT_COLORS = {
  'Хорека': '#C4142D',
  'Одежда': '#1D737B',
  'Косметика': '#7B1D7B',
}

function getSelectedColorVariant() {
  const mainText = document.getElementById('mainObject')?.textContent?.trim() || window.mainObject || ''
  return MAIN_OBJECT_COLORS[mainText] || '#1D737B'
}

let selectedColorVariant = getSelectedColorVariant()
const lottiePatternElement = document.querySelector('.lottie-pattern')
const popSoundPaths = ['./audio/pop1.mp3', './audio/pop2.mp3']

function playPopSound() {
  const sound = new Audio(popSoundPaths[Math.floor(Math.random() * popSoundPaths.length)])
  sound.volume = 0.6
  sound.play().catch(() => {})
}

function loadPatternSvg(color) {
  if (!lottiePatternElement) return
  fetch('./other/pattern.svg')
    .then((response) => {
      if (!response.ok) throw new Error('Pattern SVG not found')
      return response.text()
    })
    .then((svgText) => {
      const coloredSvg = svgText
        .replace(/<path([^>]*\bid=['"]patternTail['"][^>]*)>/gi, (match, attrs) => {
          let updated = match.replace(/stroke="[^"]*"/gi, '')
          if (/fill="[^"]*"/i.test(updated)) {
            updated = updated.replace(/fill="[^"]*"/gi, `fill="${color}"`)
          } else {
            updated = updated.replace(/(\s*\/?>)$/, ` fill="${color}"$1`)
          }
          return updated
        })
        .replace(/stroke="[^"]*"/g, `stroke="${color}"`)
      lottiePatternElement.innerHTML = coloredSvg
    })
    .catch(() => {
      lottiePatternElement.innerHTML = '<img src="./other/pattern.svg" alt="pattern">'
    })
}

const gameColors = [grayColor, selectedColorVariant]

function syncSelectedColorVariant() {
  selectedColorVariant = getSelectedColorVariant()
  loadPatternSvg(selectedColorVariant)
  gameColors[1] = selectedColorVariant
  const platformElement = document.querySelector('.platform')
  if (platformElement) applyPlatformColor(platformElement, selectedColorVariant)
}

window.addEventListener('mainObjectChange', syncSelectedColorVariant)

loadPatternSvg(selectedColorVariant)
let initialColoredSpawned = false
let isMerging = false
let mixedDone = false
const MAX_LIQUID_LEVEL = 7

const platformDevice = document.querySelector('.platform .device')
const points = Array.from(document.querySelectorAll('.points-wrapper .game-point'))
const pointsWrapper = document.querySelector('.points-wrapper')
const pointsCounter = document.getElementById('pointsCounter')
const controlsPanel = document.getElementById('controlsPanel')
const messagePanel = document.getElementById('messagePanel')
const mixWrapper = document.getElementById('mixWrapper')
const mixBtn = document.getElementById('mixBtn')
const rangeInputs = Array.from(document.querySelectorAll('.range-input'))

function playCheklSound() {
  try {
    const audio = new Audio('audio/chelk.mp3')
    audio.volume = 0.9
    audio.play().catch(() => {})
  } catch (e) {
    // ignore playback errors
  }
}

function updatePlatformLiquid(scoreValue) {
  const level = Math.max(0, Math.min(MAX_LIQUID_LEVEL, scoreValue))
  const percent = Math.round((level / MAX_LIQUID_LEVEL) * 100)
  if (platformDevice) platformDevice.style.setProperty('--progress', percent + '%')
  updatePointsDisplay(scoreValue)
}

function updatePointsDisplay(scoreValue) {
  const defaultOpacities = [0.3, 0.42, 0.53, 0.65, 0.77, 0.88, 1]
  const activeCount = Math.max(0, Math.min(points.length, scoreValue))
  points.forEach((point, index) => {
    if (index < activeCount) {
      point.style.backgroundColor = selectedColorVariant
      point.style.opacity = defaultOpacities[index]
    } else {
      point.style.backgroundColor = '#303132'
      point.style.opacity = defaultOpacities[index]
    }
  })
}

function applyPlatformColor(platformElement, color) {
  if (!platformElement) return
  const device = platformElement.classList.contains('device')
    ? platformElement
    : platformElement.querySelector('.device')
  if (!device) return
  for (let i = 1; i <= 5; i++) {
    device.style.setProperty(`--c${i}`, color)
  }
}

function applyPlatformProgress(platformElement, percent) {
  const device = platformElement.querySelector('.device')
  if (!device) return
  device.style.setProperty('--progress', `${percent}%`)
}

const bottleStates = ['empty', 'half', 'full']
const bottleStateValue = { empty: 0, half: 1, full: 2 }
const messageMap = {
  0: {
    empty: 'Визуал не спорит с текстом, потому что его считай нет. Добавь Креатива!',
    full: 'Идея в порядке. Реальность попросила пощады.',
  },
  1: {
    empty: 'Целевая аудитория — все. От восьми до восьмидесяти. Необходима Стратегия!',
    full: 'Архитектура бренда настолько безупречна, что её жалко портить реальными продажами. ',
  },
  2: {
    empty: 'Эстетика абсолютной стабильности: эпохи меняются, а этот шрифт остаётся. Отслеживай Тренды!',
    full: 'Пока концепт шёл по цепочке согласований, он успел стать кринжем, пост-иронией и в итоге абсолютной базой.',
  },
  3: {
    empty: 'Бренд, с которым всем комфортно. Включая конкурентов. Нужна Провокация!',
    full: 'Половина команды в восторге. Вторая — просит убрать фамилии.',
  },
  4: {
    empty: 'Удача — это проклятие дилетантов. Используй Х-фактор!',
    full: 'Кармический джекпот. Сошлись правильный день недели, фаза Луны и идеальное похмелье арт-директора.',
  },
}
const messageLabels = {
  0: 'Креатив',
  1: 'Стратегия',
  2: 'Тренды',
  3: 'Провокация',
  4: 'X-фактор',
}

function getTotalBottleUnits() {
  const bottles = Array.from(bubblesContainer.querySelectorAll('.platform, .platform-copy'))
  return bottles.reduce((sum, bottle) => {
    const state = bottle.dataset.state || 'empty'
    return sum + (bottleStateValue[state] || 0)
  }, 0)
}

function updateBottleUnitsDisplay() {
  const used = getTotalBottleUnits()
  updatePointsDisplay(used)
  if (pointsCounter) {
    const percent = Math.round((used / TARGET_SCORE) * 100)
    pointsCounter.textContent = `${used} / ${TARGET_SCORE} частей (${percent}% жидкости)`
  }
  updateRangeLinePositions()
  updateMessagePanel()
  updateMixButtonVisibility()
}

function getMessageLines() {
  const used = getTotalBottleUnits()
  if (used !== TARGET_SCORE) return []

  const bottles = Array.from(bubblesContainer.querySelectorAll('.platform, .platform-copy'))
  const states = bottles.map((bottle) => ({
    index: Number(bottle.dataset.index),
    state: bottle.dataset.state || 'empty',
  }))
  const emptyBottle = states.find((item) => item.state === 'empty')
  if (emptyBottle) {
    return [
      {
        state: 'empty',
        label: messageLabels[emptyBottle.index],
        text: messageMap[emptyBottle.index].empty,
      },
    ]
  }
  return states
    .filter((item) => item.state === 'full')
    .map((item) => ({
      state: 'full',
      label: messageLabels[item.index],
      text: messageMap[item.index].full,
    }))
}

function updateMessagePanel() {
  if (!messagePanel) return
  const messages = getMessageLines()
  if (!messages.length) {
    messagePanel.innerHTML = ''
    messagePanel.classList.remove('show')
    return
  }
  messagePanel.innerHTML = messages
    .map((message) => {
      const icon =
        message.state === 'full' ? '<img src="./other/white-icon.svg" alt="full message icon" />' : '<img src="./other/red-icon.svg" alt="empty message icon" />'
      const nullStateClass = message.state === 'empty' ? ' message-item-null' : ''
      return `
          <div class="message-item ${nullStateClass}">
            <div class='message-icon'>${icon}</div>
            <div class='message-content'>
              <p class="message-label">✦ ${message.label} ✦</p>
              <p>${message.text}</p>
            </div>
          </div>
        `
    })
    .join('')
  messagePanel.classList.add('show')
}

function updateRangeLineForIndex(index, state) {
  const input = rangeInputs.find((input) => Number(input.dataset.index) === index)
  if (!input) return
  const line = input.closest('.glass-range')?.querySelector('.range-line')
  if (!line) return
  const position = state === 'empty' ? '0%' : state === 'half' ? '50%' : '100%'
  line.style.left = position
}

function updateRangeLinePositions() {
  const bottles = Array.from(bubblesContainer.querySelectorAll('.platform, .platform-copy'))
  bottles.forEach((bottle) => {
    const index = Number(bottle.dataset.index)
    const state = bottle.dataset.state || 'empty'
    updateRangeLineForIndex(index, state)
  })
}

function hasEmptyBottle() {
  return Array.from(bubblesContainer.querySelectorAll('.platform, .platform-copy')).some((bottle) => (bottle.dataset.state || 'empty') === 'empty')
}

function updateMixButtonVisibility() {
  const used = getTotalBottleUnits()
  const empty = hasEmptyBottle()
  if (mixWrapper) {
    if (!mixedDone && used === TARGET_SCORE && platformRowShown && !empty) {
      mixWrapper.classList.add('show')
    } else {
      mixWrapper.classList.remove('show')
    }
  }
  if (mixBtn) {
    const disabled = used !== TARGET_SCORE || empty || isMerging || mixedDone
    mixBtn.disabled = disabled
    mixBtn.classList.toggle('disabled-mix', disabled)
  }
}

let lottieScriptLoading = null
let lottieAnimation = null
let lottieScrollHandler = null

function loadLottieLib() {
  if (window.lottie) return Promise.resolve(window.lottie)
  if (lottieScriptLoading) return lottieScriptLoading
  lottieScriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js'
    script.onload = () => resolve(window.lottie)
    script.onerror = () => reject(new Error('Lottie failed to load'))
    document.body.appendChild(script)
  })
  return lottieScriptLoading
}

function getMergedBottleColor(color) {
  if (color === '#1D737B') return '#3A6F71'
  if (color === '#7B1D7B') return '#4F0C49'
  if (color === '#C4142D') return '#740220'
  return color
}

function getLottiePathForColor(color) {
  if (color === '#C4142D') return './other/red.json'
  if (color === '#7B1D7B') return './other/purple.json'
  if (color === '#1D737B') return './other/green.json'
  return './other/green.json'
}

function clearLottieScrollListener() {
  const scrollArea = document.getElementById('lottieScrollArea')
  if (scrollArea && lottieScrollHandler) {
    scrollArea.removeEventListener('scroll', lottieScrollHandler)
    lottieScrollHandler = null
  }
}

function playLottieAnimation(path) {
  const overlay = document.getElementById('lottieOverlay')
  const lottieContainerEl = document.getElementById('lottieContainer')
  const scrollArea = document.getElementById('lottieScrollArea')
  if (!overlay || !lottieContainerEl || !scrollArea) return
  scrollArea.style.overflowY = 'auto'
  scrollArea.scrollTop = 0
  lottieContainerEl.innerHTML = ''
  clearLottieScrollListener()
  if (lottieAnimation) {
    lottieAnimation.destroy()
    lottieAnimation = null
  }
  loadLottieLib()
    .then((lottie) => {
      lottieAnimation = lottie.loadAnimation({
        container: lottieContainerEl,
        renderer: 'svg',
        loop: false,
        autoplay: false,
        path,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid slice',
        },
      })

      const updateFrame = () => {
        if (!lottieAnimation) return
        const totalFrames = lottieAnimation.totalFrames || 1
        const maxScroll = scrollArea.scrollHeight - scrollArea.clientHeight
        const progress = maxScroll > 0 ? Math.min(scrollArea.scrollTop / maxScroll, 1) : 0
        const frame = Math.round(progress * (totalFrames - 1))
        lottieAnimation.goToAndStop(frame, true)

        const section = document.getElementById('lottieSection')
        if (section) {
          const sectionThreshold = Math.min(1, 163 / Math.max(totalFrames - 1, 1))
          const sectionProgress = sectionThreshold < 1 ? Math.max(0, Math.min((progress - sectionThreshold) / (1 - sectionThreshold), 1)) : 0
          section.style.transform = `translateX(${100 - sectionProgress * 100}%)`
          // section.style.opacity = sectionProgress;
          // section.style.visibility = sectionProgress > 0 ? 'visible' : 'hidden';
        }
      }

      lottieScrollHandler = updateFrame
      scrollArea.addEventListener('scroll', lottieScrollHandler)
      lottieAnimation.addEventListener('DOMLoaded', () => {
        overlay.classList.add('show')
        updateFrame()
      })
    })
    .catch(() => {
      overlay.classList.remove('show')
    })
}

function createFlashEffect(colorHex) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.style.position = 'fixed'
    overlay.style.top = '0'
    overlay.style.left = '0'
    overlay.style.width = '100%'
    overlay.style.height = '100%'
    overlay.style.backgroundColor = colorHex || 'rgba(196, 20, 45, 0.4)'
    overlay.style.pointerEvents = 'none'
    overlay.style.zIndex = '200'
    overlay.style.opacity = '0'
    overlay.style.transition = 'opacity 0.25s ease-out'
    document.body.appendChild(overlay)
    requestAnimationFrame(() => {
      overlay.style.opacity = '1'
      requestAnimationFrame(() => resolve())
      setTimeout(() => {
        overlay.style.opacity = '0'
        setTimeout(() => {
          if (overlay.parentNode) overlay.remove()
        }, 300)
      }, 150)
    })
  })
}

function startMixAnimation() {
  if (mixedDone || isMerging) return
  const used = getTotalBottleUnits()
  if (used !== TARGET_SCORE) return
  if (hasEmptyBottle()) return

  isMerging = true
  mixedDone = true
  if (platform) {
    platform.style.cursor = 'default'
    const rotator = platform.querySelector('.device-rotator')
    if (rotator) rotator.style.cursor = 'default'
  }
  updateMixButtonVisibility()

  const bottles = Array.from(bubblesContainer.querySelectorAll('.platform, .platform-copy'))
  const positions = bottles.map((bottle) => bottle.getBoundingClientRect())
  const centerBottle = bottles.find((bottle) => Number(bottle.dataset.index) === 2) || bottles[0]
  const centerPos = centerBottle.getBoundingClientRect()
  if (controlsPanel) controlsPanel.classList.add('fade-out-ui')
  if (messagePanel) messagePanel.classList.add('fade-out-ui')
  if (pointsWrapper) pointsWrapper.classList.add('fade-out-ui')
  if (pointsCounter) pointsCounter.classList.add('fade-out-ui')
  if (mixWrapper) mixWrapper.classList.add('fade-out-ui')

  bottles.forEach((bottle, i) => {
    bottle.style.position = 'fixed'
    bottle.style.left = `${positions[i].left}px`
    bottle.style.top = `${positions[i].top}px`
    bottle.style.margin = '0'
    bottle.style.zIndex = '12'
    bottle.style.transition = 'all 0.85s cubic-bezier(0.4, 0, 0.2, 1)'
    bottle.style.width = 'max-content'
  })

  requestAnimationFrame(() => {
    bottles.forEach((bottle) => {
      bottle.style.left = `${centerPos.left}px`
      bottle.style.top = `${centerPos.top}px`
      if (Number(bottle.dataset.index) !== 2) {
        bottle.style.opacity = '0'
      }
    })
  })

  setTimeout(() => {
    bottles.forEach((bottle) => {
      if (Number(bottle.dataset.index) !== 2 && bottle.parentNode) bottle.parentNode.removeChild(bottle)
    })
    const centralBottle = getBottleByIndex(2)
    if (centralBottle) {
      centralBottle.style.position = 'relative'
      centralBottle.style.left = 'auto'
      centralBottle.style.top = 'auto'
      centralBottle.style.opacity = '1'
      centralBottle.style.zIndex = 'auto'
      setBottleState(centralBottle, 'full')
      applyPlatformColor(centralBottle, getMergedBottleColor(selectedColorVariant))
      updateBottleUnitsDisplay()
      const thermostat = centralBottle.querySelector('.thermostat')
      if (thermostat) {
        thermostat.style.transition = 'transform 0.5s ease'
        thermostat.style.transform = 'scale(2.1)'
      }
      centralBottle.style.transition = 'transform 0.5s ease'
      centralBottle.classList.add('merged-central')
      createFlashEffect(selectedColorVariant).then(() => {
        playLottieAnimation(getLottiePathForColor(selectedColorVariant))
      })
      const sparkContainer = document.createElement('div')
      sparkContainer.style.position = 'fixed'
      sparkContainer.style.inset = '0'
      sparkContainer.style.pointerEvents = 'none'
      sparkContainer.style.zIndex = '150'
      document.body.appendChild(sparkContainer)
      const rect = centralBottle.getBoundingClientRect()
      for (let i = 0; i < 40; i++) {
        const spark = document.createElement('div')
        spark.style.position = 'absolute'
        const size = 2 + Math.random() * 6
        spark.style.width = `${size}px`
        spark.style.height = `${size}px`
        spark.style.borderRadius = '50%'
        spark.style.backgroundColor = selectedColorVariant
        spark.style.left = `${rect.left + rect.width / 2 + (Math.random() - 0.5) * 70}px`
        spark.style.top = `${rect.top + rect.height / 2 + (Math.random() - 0.5) * 60}px`
        spark.style.opacity = '0.9'
        spark.style.transition = 'all 0.8s ease-out'
        sparkContainer.appendChild(spark)
        const dx = (Math.random() - 0.5) * 140
        const dy = -60 - Math.random() * 100
        requestAnimationFrame(() => {
          spark.style.transform = `translate(${dx}px, ${dy}px)`
          spark.style.opacity = '0'
        })
      }
      setTimeout(() => {
        if (sparkContainer.parentNode) sparkContainer.parentNode.removeChild(sparkContainer)
      }, 1000)
    }
    isMerging = false
    updateMixButtonVisibility()
  }, 950)
}

function setBottleState(platformElement, state) {
  if (!platformElement) return
  platformElement.dataset.state = state
  const percent = state === 'empty' ? 0 : state === 'half' ? 60 : 100
  applyPlatformProgress(platformElement, percent)
  const index = Number(platformElement.dataset.index)
  if (!Number.isNaN(index)) updateRangeLineForIndex(index, state)
}

function cycleBottleState(platformElement) {
  if (!platformElement || !platformRowShown || mixedDone) return false
  const current = platformElement.dataset.state || 'half'
  const next = current === 'empty' ? 'half' : current === 'half' ? 'full' : 'empty'
  const delta = bottleStateValue[next] - bottleStateValue[current]
  const used = getTotalBottleUnits()
  if (delta > 0 && used + delta > TARGET_SCORE) return false
  setBottleState(platformElement, next)
  updateBottleUnitsDisplay()
  return true
}

function getBottleByIndex(index) {
  return bubblesContainer.querySelector(`.platform[data-index="${index}"]`) || bubblesContainer.querySelector(`.platform-copy[data-index="${index}"]`)
}

const winColorPalettes = {
  '#1D737B': ['#608A8F', '#00D0E0', '#0F4254', '#1A917A', '#2BA0AD'],
  '#C4142D': ['#E32A3E', '#D43B1A', '#B0133B', '#5C1033', '#FF3B6A'],
  '#7B1D7B': ['#622D47', '#FF2AFF', '#3D0B4D', '#8E47AB', '#C43BC4'],
}

function getWinColors() {
  return (
    winColorPalettes[selectedColorVariant] || [
      selectedColorVariant,
      selectedColorVariant,
      selectedColorVariant,
      selectedColorVariant,
      selectedColorVariant,
    ]
  )
}

if (platformDevice) {
  platformDevice.style.setProperty('--c1', selectedColorVariant)
  platformDevice.style.setProperty('--c2', selectedColorVariant)
  platformDevice.style.setProperty('--c3', selectedColorVariant)
  platformDevice.style.setProperty('--c4', selectedColorVariant)
  platformDevice.style.setProperty('--c5', selectedColorVariant)
}
updatePlatformLiquid(0)
loadLottieLib()

const BUBBLE_SIZE = 200
const GAP = 16

let columnsCount = 1
let columnsOccupied = []

function updateColumns() {
  const width = Math.max(320, bubblesContainer.clientWidth)
  columnsCount = Math.max(1, Math.floor(width / (BUBBLE_SIZE + GAP)))
  columnsOccupied = new Array(columnsCount).fill(false)
}

window.addEventListener('resize', updateColumns)
updateColumns()

function spawnDrop(forceColor = false) {
  if (!gameActive) return
  const sessionId = gameSessionId
  // find available columns
  const available = []
  for (let i = 0; i < columnsCount; i++) if (!columnsOccupied[i]) available.push(i)
  if (available.length === 0) return // no free column, skip spawn

  const col = available[Math.floor(Math.random() * available.length)]
  columnsOccupied[col] = true

  const bubble = document.createElement('div')
  bubble.className = 'bubble'
  bubble.style.width = BUBBLE_SIZE + 'px'
  bubble.style.left = computeLeftForColumn(col) + 'px'
  bubble.dataset.col = String(col)
  bubble.style.top = `-${BUBBLE_SIZE}px`

  const colorOptions = forceColor || !initialColoredSpawned ? [selectedColorVariant] : gameColors
  const color = colorOptions[Math.floor(Math.random() * colorOptions.length)]
  if (color !== grayColor) initialColoredSpawned = true
  bubble.style.setProperty('--bubble-color', color)
  bubble.dataset.color = color
  bubble.innerHTML = '<span class="bubble-inner"><span></span></span>'
  bubblesContainer.appendChild(bubble)

  const duration = 3000 + Math.random() * 2500 // 3s .. 5.5s

  const anim = bubble.animate(
    [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: `translateY(${bubblesContainer.clientHeight + BUBBLE_SIZE}px)`, opacity: 0.95 },
    ],
    {
      duration: duration,
      easing: 'linear',
      fill: 'forwards',
    },
  )

  anim.onfinish = () => {
    // ignore completed bubbles from an older game session
    if (sessionId !== gameSessionId) {
      if (bubble.parentNode) bubble.parentNode.removeChild(bubble)
      columnsOccupied[col] = false
      return
    }

    // ignore completed bubbles after game ended/reset
    if (!gameActive) {
      if (bubble.parentNode) bubble.parentNode.removeChild(bubble)
      columnsOccupied[col] = false
      return
    }

    // if bubble reached bottom without being caught
    const wasCaught = bubble.dataset.caught === '1'
    if (!wasCaught) {
      // miss: if it was a colored bubble, apply penalty
      if (bubble.dataset.color === selectedColorVariant) {
        score -= 1
        if (scoreEl) scoreEl.textContent = score
        updatePlatformLiquid(score)
        if (score <= -3) {
          resetGame(true)
        }
      }
    }
    if (bubble.parentNode) bubble.parentNode.removeChild(bubble)
    columnsOccupied[col] = false
  }
}

function computeLeftForColumn(colIndex) {
  const totalWidth = columnsCount * BUBBLE_SIZE + (columnsCount - 1) * GAP
  const offset = Math.max(0, (bubblesContainer.clientWidth - totalWidth) / 2)
  return Math.round(offset + colIndex * (BUBBLE_SIZE + GAP))
}

// game state
let gameActive = false
let gameSessionId = 0
let allowStart = true
let platformRowShown = false
const TARGET_SCORE = 7 // score needed to win/lose
const SPAWN_INTERVAL = 1500 // ms (reduced frequency)
let spawnIntervalId = null
let spawnTimeoutIds = []

const glassText = document.querySelector('.glass-text')
const gameText = document.querySelector('.game-text')

function startGame() {
  if (gameActive || !allowStart) return
  score = 0
  if (scoreEl) scoreEl.textContent = score
  updatePlatformLiquid(score)
  gameSessionId += 1
  gameActive = true
  if (glassText) glassText.classList.add('fade-out')
  if (gameText) gameText.classList.add('fade-out')
  startSpawning()
}

function startSpawning() {
  if (spawnIntervalId !== null) clearInterval(spawnIntervalId)
  spawnTimeoutIds.forEach(clearTimeout)
  spawnTimeoutIds = []
  const sessionId = gameSessionId
  spawnIntervalId = setInterval(() => {
    if (gameActive && sessionId === gameSessionId) spawnDrop()
  }, SPAWN_INTERVAL)
  for (let i = 0; i < Math.min(columnsCount, 3); i++) {
    const timeoutId = setTimeout(() => {
      if (gameActive && sessionId === gameSessionId) spawnDrop(i === 0)
    }, i * 250)
    spawnTimeoutIds.push(timeoutId)
  }
}

function showPlatformRow() {
  if (platformRowShown) return
  playCheklSound()
  platformRowShown = true

  const baseLeft = platform.offsetLeft
  const baseTop = platform.offsetTop
  const width = platform.offsetWidth
  const rowWidth = 1055
  const rowCenter = baseLeft + width / 2
  const startLeft = rowCenter - rowWidth / 2
  const margin = (rowWidth / 5 - width) / 2
  const gap = width + 2 * margin
  const positions = [0, 1, 2, 3, 4].map((i) => startLeft + margin + i * gap)
  const winColors = getWinColors()
  const targetIndices = [0, 1, 3, 4]

  const clones = []
  for (let i = 0; i < 4; i++) {
    const clone = platform.cloneNode(true)
    clone.classList.add('platform-copy')
    clone.dataset.index = String(targetIndices[i])
    clone.dataset.state = 'half'
    clone.style.left = `${baseLeft}px`
    clone.style.top = `${baseTop}px`
    clone.style.opacity = '0'
    clone.style.pointerEvents = 'auto'
    applyPlatformColor(clone, winColors[targetIndices[i]])
    applyPlatformProgress(clone, 0)
    bubblesContainer.appendChild(clone)
    clones.push(clone)
  }

  platform.dataset.index = '2'
  platform.dataset.state = 'half'

  requestAnimationFrame(() => {
    clones.forEach((clone, index) => {
      const targetIndex = index < 2 ? index : index + 1
      clone.style.setProperty('left', `${positions[targetIndex]}px`, 'important')
      clone.style.setProperty('top', `${baseTop}px`, 'important')
      clone.style.opacity = '1'
      applyPlatformProgress(clone, 60)
    })
    platform.style.setProperty('left', `${positions[2]}px`, 'important')
    applyPlatformColor(platform, winColors[2])
    setBottleState(platform, 'half')
    updateBottleUnitsDisplay()
  })
  if (pointsWrapper) {
    pointsWrapper.classList.add('expanded')
  }
  if (pointsCounter) {
    pointsCounter.classList.add('show')
  }
  if (controlsPanel) controlsPanel.classList.add('show')
}

bubblesContainer.addEventListener('click', (event) => {
  if (!platformRowShown) return
  const clickedPlatform = event.target.closest('.platform, .platform-copy')
  if (!clickedPlatform) return
  playCheklSound()
  cycleBottleState(clickedPlatform)
})

rangeInputs.forEach((input) => {
  const index = Number(input.dataset.index)
  input.addEventListener('click', () => {
    if (!platformRowShown) return
    const bottle = getBottleByIndex(index)
    if (bottle) {
      playCheklSound()
      cycleBottleState(bottle)
    }
  })
})

if (mixBtn) {
  mixBtn.addEventListener('click', () => {
    if (!mixBtn.disabled) {
      playCheklSound()
      startMixAnimation()
    }
  })
}

function resetGame(preservePosition = false) {
  gameActive = false
  allowStart = true
  platformRowShown = false
  gameSessionId += 1
  if (spawnIntervalId !== null) {
    clearInterval(spawnIntervalId)
    spawnIntervalId = null
  }
  spawnTimeoutIds.forEach(clearTimeout)
  spawnTimeoutIds = []

  score = 0
  if (scoreEl) scoreEl.textContent = score
  updatePlatformLiquid(score)
  if (glassText) glassText.classList.remove('fade-out')
  if (gameText) gameText.classList.remove('fade-out')
  platform.classList.remove('end-vertical')
  platform.style.transform = ''

  if (!preservePosition) {
    platform.style.left = initialX + 'px'
    platform.style.bottom = '-50px'
    platform.style.top = ''
  }

  const all = Array.from(bubblesContainer.querySelectorAll('.bubble2'))
  for (const b of all) if (b.parentNode) b.parentNode.removeChild(b)
  columnsOccupied = new Array(columnsCount).fill(false)
  initialColoredSpawned = false
  if (pointsWrapper) pointsWrapper.classList.remove('expanded')
  if (pointsCounter) pointsCounter.classList.remove('show')
  if (controlsPanel) controlsPanel.classList.remove('show')
  if (mixWrapper) mixWrapper.classList.remove('show')
}

// platform and collision logic
const platform = document.querySelector('.platform')
// set initial platform position to center of bubblesContainer before start
const initialPlatformX = bubblesContainer.getBoundingClientRect().left + bubblesContainer.clientWidth / 2
const initialPlatformWidth = platform.offsetWidth || 220
const rect = bubblesContainer.getBoundingClientRect()
const minX = 150
const maxX = Math.max(minX, rect.width - 150 - initialPlatformWidth)
let initialX = initialPlatformX - rect.left - initialPlatformWidth / 2
initialX = Math.max(minX, Math.min(maxX, initialX))
platform.style.left = initialX + 'px'

platform.addEventListener('click', (event) => {
  if (!allowStart && !platformRowShown) {
    event.stopPropagation()
    playCheklSound()
    showPlatformRow()
  } else {
    playCheklSound()
    startGame()
  }
})

const deviceRotator = platform.querySelector('.device-rotator')
if (deviceRotator) {
  deviceRotator.addEventListener('click', () => {
    if (!platformRowShown) return
    playCheklSound()
  })
}

// single score counter
let score = 0
const scoreEl = document.getElementById('score')
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

function updatePlatformPosition(clientX) {
  if (!gameActive) return
  const rect = bubblesContainer.getBoundingClientRect()
  const pEl = platform.querySelector('.device-rotator') || platform
  const pW = pEl.offsetWidth || 220
  const minX = 150
  const maxX = Math.max(minX, rect.width - 150 - pW)
  let x = clientX - rect.left - pW / 2
  x = clamp(x, minX, maxX)
  platform.style.left = x + 'px'
}

bubblesContainer.addEventListener('mousemove', (e) => {
  updatePlatformPosition(e.clientX)
})

// touch support
bubblesContainer.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches && e.touches[0]) updatePlatformPosition(e.touches[0].clientX)
  },
  { passive: true },
)

function checkCollisions() {
  if (!gameActive) {
    requestAnimationFrame(checkCollisions)
    return
  }

  // Use rotated geometry of .glass-container for collision detection.
  const rotator = document.querySelector('.device-rotator')
  const glass = rotator ? rotator.querySelector('.glass-container') : platform.querySelector('.glass-container')
  if (!glass) {
    requestAnimationFrame(checkCollisions)
    return
  }

  // get transform angle of rotator
  const rotStyle = rotator ? getComputedStyle(rotator).transform : 'none'
  const angle = (() => {
    if (!rotStyle || rotStyle === 'none') return 0
    const m = rotStyle.match(/matrix\(([^)]+)\)/)
    if (!m) return 0
    const parts = m[1].split(',').map(Number)
    const a = parts[0],
      b = parts[1]
    return Math.atan2(b, a)
  })()

  const gRect = glass.getBoundingClientRect()
  const gW = glass.offsetWidth
  const gH = glass.offsetHeight
  const gCenterX = gRect.left + gRect.width / 2
  const gCenterY = gRect.top + gRect.height / 2

  const bubbles = Array.from(bubblesContainer.querySelectorAll('.bubble, .bubble2'))
  for (const b of bubbles) {
    if (b.dataset.caught === '1') continue
    const br = b.getBoundingClientRect()
    const bx = br.left + br.width / 2
    const by = br.top + br.height / 2
    const radius = Math.max(br.width, br.height) / 2

    // sample points around bubble perimeter (8 samples)
    const samples = 8
    let hit = false
    const cos = Math.cos(-angle)
    const sin = Math.sin(-angle)
    const gLeft = gCenterX - gW / 2
    const gTop = gCenterY - gH / 2

    for (let i = 0; i < samples; i++) {
      const theta = (i / samples) * Math.PI * 2
      const sx = bx + Math.cos(theta) * radius
      const sy = by + Math.sin(theta) * radius

      // rotate sample into glass's unrotated coordinate space
      const rx = cos * (sx - gCenterX) - sin * (sy - gCenterY) + gCenterX
      const ry = sin * (sx - gCenterX) + cos * (sy - gCenterY) + gCenterY

      if (rx >= gLeft && rx <= gLeft + gW && ry >= gTop && ry <= gTop + gH) {
        hit = true
        break
      }
    }

    if (hit) {
      const col = b.dataset.col
      const bcolor = b.dataset.color
      if (bcolor === grayColor) score -= 1
      else if (bcolor === selectedColorVariant) score += 1
      if (scoreEl) scoreEl.textContent = score
      updatePlatformLiquid(score)

      if (col && columnsOccupied[Number(col)]) columnsOccupied[Number(col)] = false
      if (b.dataset.caught === '1') continue
      b.dataset.caught = '1'
      playPopSound()
      b.style.pointerEvents = 'none'
      const bubbleHitDuration = 100
      b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }], {
        duration: bubbleHitDuration,
        easing: 'ease-out',
        fill: 'forwards',
        composite: 'add',
      })
      const fadeAnim = b.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: bubbleHitDuration,
        easing: 'ease-out',
        fill: 'forwards',
      })
      fadeAnim.onfinish = () => {
        if (b.parentNode) b.parentNode.removeChild(b)
      }

      if (score <= -TARGET_SCORE) {
        resetGame(true)
        break
      } else if (score >= TARGET_SCORE) {
        endGame()
        break
      }
    }
  }

  requestAnimationFrame(checkCollisions)
}

requestAnimationFrame(checkCollisions)

function endGame(preservePosition = false) {
  if (!gameActive) return
  gameActive = false
  allowStart = false
  platformRowShown = false
  gameSessionId += 1
  if (spawnIntervalId !== null) {
    clearInterval(spawnIntervalId)
    spawnIntervalId = null
  }
  spawnTimeoutIds.forEach(clearTimeout)
  spawnTimeoutIds = []

  if (!preservePosition) {
    const rect = platform.getBoundingClientRect()
    platform.style.left = rect.left + 'px'
    platform.style.top = rect.top + 'px'
    platform.offsetHeight // force layout before transition
    platform.classList.add('end-vertical')
  }

  // remove remaining bubbles
  const all = Array.from(bubblesContainer.querySelectorAll('.bubble2'))
  for (const b of all) if (b.parentNode) b.parentNode.removeChild(b)
}
