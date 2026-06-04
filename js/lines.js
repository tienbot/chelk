;(function () {
  let svgTemplate = ''

  let currentColor = '#C4142D'
  let layerCounter = 0
  let isRunning = true
  let generationInterval = null
  // flags for control flow
    let svgLoaded = false
    let started = false

  // Map mainObject names to desired line colors
  const NAME_COLOR_MAP = {
    'Хорека': '#C4142D',
    'Косметика': '#7B1D7B',
    'Одежда': '#1D737B'
  }

  // Listen for mainObject selection changes and adjust color
  window.addEventListener('mainObjectChange', (ev) => {
    try {
      const name = ev && ev.detail ? ev.detail : ev
      const newColor = NAME_COLOR_MAP[name]
      if (!newColor) return
      if (started && typeof changeColor === 'function') {
        changeColor(newColor)
      } else {
        currentColor = newColor
      }
    } catch (e) {}
  })
  const styleSheet = document.createElement('style')
  document.head.appendChild(styleSheet)

  // Функция получения SVG с текущим цветом (конвертируем hex в rgb)
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${r}, ${g}, ${b})`
  }

  function getSvgString(colorHex) {
    const colorRgb = hexToRgb(colorHex)
    return svgTemplate.replace(/COLOR_PLACEHOLDER/g, colorRgb)
  }

  function createSvgElement(svgMarkup) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml')
    const svg = doc.documentElement
    svg.classList.add('animated-svg')
    if (!svg.hasAttribute('width') || svg.getAttribute('width') === '100%') {
      svg.setAttribute('width', '100%')
      svg.setAttribute('height', 'auto')
    }
    return svg
  }

  const stage = document.getElementById('animationStage')

  // НАСТРОЙКИ
  const ANIMATION_DURATION = 3000 // анимация 1.5 секунды
  const NEW_LAYER_DELAY = 500 // новый слой каждые 0.5 секунды

  function createAndAnimateLayer() {
    const svgString = getSvgString(currentColor)

    const uniqueId = `svg_${Date.now()}_${layerCounter++}`
    let svgElement
    try {
      svgElement = createSvgElement(svgString)
    } catch (e) {
      return
    }

    // Уникальная анимация для каждого слоя
    const animationName = `diveOpacity_${uniqueId}`
    const keyframes = `
            @keyframes ${animationName} {
                0% {
                    transform: translate(-50%, -50%) scale(0.02);
                    opacity: 0;
                }
                15% {
                    opacity: 1;
                }
                40% {
                    transform: translate(-50%, -50%) scale(1.2);
                    opacity: 1;
                }
                70% {
                    transform: translate(-50%, -50%) scale(3.5);
                    opacity: 0.8;
                }
                100% {
                    transform: translate(-50%, -50%) scale(7);
                    opacity: 0;
                }
            }
        `

    styleSheet.textContent += keyframes
    svgElement.style.animation = `${animationName} ${ANIMATION_DURATION}ms linear forwards`
    stage.appendChild(svgElement)

    // Удаляем слой после завершения анимации
    setTimeout(() => {
      if (svgElement && svgElement.parentNode) {
        svgElement.remove()
      }
    }, ANIMATION_DURATION)
  }

  // БЕСКОНЕЧНЫЙ ЦИКЛ
  function startInfiniteAnimation() {
    // Очищаем существующие слои
    const allLayers = document.querySelectorAll('.animated-svg')
    allLayers.forEach((layer) => layer.remove())

    // Запускаем первый круг
    createAndAnimateLayer()

    // Запускаем второй круг через небольшую задержку
    setTimeout(() => {
      if (isRunning) createAndAnimateLayer()
    }, 200)

    // Запускаем третий круг
    setTimeout(() => {
      if (isRunning) createAndAnimateLayer()
    }, 400)

    // Бесконечный интервал для последующих кругов
    if (generationInterval) clearInterval(generationInterval)
    generationInterval = setInterval(() => {
      if (isRunning) {
        createAndAnimateLayer()
      }
    }, NEW_LAYER_DELAY)
  }

  // СМЕНА ЦВЕТА
  function changeColor(newColor) {
    currentColor = newColor
    // Перезапускаем анимацию с новым цветом
    startInfiniteAnimation()
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      isRunning = false
      if (generationInterval) {
        clearInterval(generationInterval)
        generationInterval = null
      }
    } else {
      isRunning = true
      if (!generationInterval) {
        generationInterval = setInterval(() => {
          if (isRunning) createAndAnimateLayer()
        }, NEW_LAYER_DELAY)
      }
    }
  }

  function cleanup() {
    if (generationInterval) {
      clearInterval(generationInterval)
      generationInterval = null
    }
    const allLayers = document.querySelectorAll('.animated-svg')
    allLayers.forEach((layer) => layer.remove())
    styleSheet.textContent = ''
  }

  function initAnimation() {
    cleanup()
    layerCounter = 0
    isRunning = true
    startInfiniteAnimation()
  }

  // Назначаем обработчики на кнопки
  document.querySelectorAll('.color-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color')
      changeColor(color)
    })
  })

  function onSvgLoaded(text) {
    svgTemplate = text || ''
    svgLoaded = true
  }

  window.addEventListener('load', () => {
    fetch('other/lines.svg')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load lines.svg')
        return res.text()
      })
      .then((text) => {
        onSvgLoaded(text)
      })
      .catch((err) => {
        console.error('Error loading SVG template:', err)
        onSvgLoaded('')
      })

    const choiceBtn = document.getElementById('choiseBtn')
    const linesContainer = document.querySelector('.lines')
    if (choiceBtn) {
      choiceBtn.addEventListener('click', () => {
        if (started) return
        started = true
        if (linesContainer) linesContainer.classList.add('visible')
        // Если SVG уже загружен — стартуем, иначе дождёмся загрузки
        if (svgLoaded) {
          initAnimation()
          document.addEventListener('visibilitychange', handleVisibilityChange)
        } else {
          const checkLoaded = setInterval(() => {
            if (svgLoaded) {
              clearInterval(checkLoaded)
              initAnimation()
              document.addEventListener('visibilitychange', handleVisibilityChange)
            }
          }, 100)
          // safety timeout: если SVG не загрузится, всё равно запустим через 2s
          setTimeout(() => {
            if (!svgLoaded) {
              clearInterval(checkLoaded)
              initAnimation()
              document.addEventListener('visibilitychange', handleVisibilityChange)
            }
          }, 2000)
        }
      })
    } else {
      // Если кнопки нет, запускаем сразу (fallback)
      console.warn('choiseBtn not found — starting lines immediately')
      svgLoaded = true
      initAnimation()
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
  })
})()
