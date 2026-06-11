import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

// --- ИНИЦИАЛИЗАЦИЯ ---
const canvas = document.getElementById('canvas')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setClearColor(0x121315, 1)
renderer.shadowMap.enabled = false

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x121315)

// === ПРЕДУСТАНОВЛЕННЫЕ НАСТРОЙКИ КАМЕРЫ ===
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0.0, 0.8, 0.5)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.rotateSpeed = 1.5
controls.zoomSpeed = 1.3
controls.panSpeed = 0.9
controls.target.set(0.0, 0.6, -0.1)
// Запрещаем вращение камеры пользователем — модель не будет вращаться от управления камерой
controls.enableRotate = false
// Запрещаем изменение масштаба камеры (скролл/пинч) — модель не будет увеличиваться/уменьшаться
controls.enableZoom = false

// === ОСВЕЩЕНИЕ (предустановленные параметры) ===

// Окружающий свет
const ambientLight = new THREE.AmbientLight(0xffffff, 0.35)
scene.add(ambientLight)

// Контровой левый
const rimLeftLight = new THREE.PointLight(0xc4142d, 0.7)
rimLeftLight.position.set(-2.4, 1.2, -7.0)
rimLeftLight.distance = 20
rimLeftLight.decay = 1.0
scene.add(rimLeftLight)

// Контровой правый
const rimRightLight = new THREE.PointLight(0xc4142d, 2.1)
rimRightLight.position.set(2.8, -1.0, -6.0)
rimRightLight.distance = 20
rimRightLight.decay = 1.0
scene.add(rimRightLight)

// Передний свет (фиксированный белый)
const frontLight = new THREE.PointLight(0xffffff, 2.5)
frontLight.position.set(1.4, 1.7, 3.0)
frontLight.distance = 10
frontLight.decay = 1.0
scene.add(frontLight)

// Fill light (фиксированный голубой)
const fillLight = new THREE.PointLight(0x87a9fe, 0.45)
fillLight.position.set(1.2, 1.0, 2.0)
fillLight.distance = 12
fillLight.decay = 1.0
scene.add(fillLight)

// Группа для экспорта
const exportGroup = new THREE.Group()
scene.add(exportGroup)
exportGroup.add(ambientLight)
exportGroup.add(rimLeftLight)
exportGroup.add(rimRightLight)
exportGroup.add(frontLight)
exportGroup.add(fillLight)

const headHighlightLight = new THREE.PointLight(0xFFAA66, 0.0)
headHighlightLight.position.set(0, 0.7, 0.5)
headHighlightLight.distance = 3.0
headHighlightLight.decay = 1.2
scene.add(headHighlightLight)

const headGlowLight = new THREE.PointLight(0xFF8855, 0.0)
headGlowLight.distance = 2.5
headGlowLight.decay = 1.5
scene.add(headGlowLight)

exportGroup.add(headHighlightLight)
exportGroup.add(headGlowLight)

let currentModel = null
let raycaster = new THREE.Raycaster()
let mouseVector = new THREE.Vector2()
let targetHighlightIntensity = 0
let currentHighlightIntensity = 0
let targetGlowIntensity = 0
let currentGlowIntensity = 0
let headMeshes = []

// Параметры слежения модели за курсором (горизонталь + вертикаль)
let targetModelRotationY = 0
let targetModelRotationX = 0
// Горизонталь: немного увеличим общую амплитуду и добавим отдельный множитель для левой стороны
const maxFollowAngle = Math.PI / 5 // ~36°
const maxLeftMultiplier = 2.8 // левый поворот сильнее (умножает амплитуду влево)
// Вертикаль: уменьшаем амплитуду вверх/вниз
const maxPitch = Math.PI / 36 // ~5°
// Когда курсор поднимается вверх, усиливаем вертикальную амплитуду
const upPitchMultiplier = 4.0 // множитель амплитуды при движении вверх (увеличен)
const followLerp = 0.04 // сглаживание поворота (уменьшено для более плавного движения)

// === УПРАВЛЕНИЕ ЦВЕТОМ ===
function updateLightColor(color) {
  rimLeftLight.color.set(color)
  rimRightLight.color.set(color)
}

// Map `mainObject` names to rim colors and apply when selection changes
function applyColorForMainObject(name) {
  if (!name) return;
  const map = {
    'Хорека': '#C4142D',
    'Косметика': '#7B1D7B',
    'Одежда': '#1D737B'
  };
  const color = map[name] || null;
  if (color) updateLightColor(color);
}

// Listen for selection changes dispatched from script.js
window.addEventListener('mainObjectChange', (e) => {
  try { applyColorForMainObject(e && e.detail ? e.detail : null); } catch (err) {}
});

// Initial sync: if there's an element `#mainObject` present, set color accordingly
try {
  const el = document.getElementById('mainObject');
  if (el && el.textContent) applyColorForMainObject(el.textContent.trim());
} catch (e) {}

// Color preset UI removed — color controlled programmatically

// === ЗАГРУЗКА МОДЕЛИ ===
const loader = new GLTFLoader()

// Загружает модель по URL (локальный файл в проекте)
function loadModelFromURL(url, name = '') {

  loader.load(
    url,
    (gltf) => {
      if (currentModel) {
        exportGroup.remove(currentModel)
        currentModel = null
      }

      currentModel = gltf.scene

      currentModel.position.set(0.01, -0.02, 0.01)
      currentModel.rotation.set(0, 0, 0)
      currentModel.scale.setScalar(1.0)

      exportGroup.add(currentModel)

      const box = new THREE.Box3().setFromObject(currentModel)
      const modelCenterX = (box.min.x + box.max.x) / 2
      const modelCenterZ = (box.min.z + box.max.z) / 2
      const headHeight = box.max.y
      headHighlightLight.position.set(modelCenterX, headHeight - 0.1, modelCenterZ + 0.3)
      headGlowLight.position.set(modelCenterX, headHeight - 0.15, modelCenterZ + 0.25)
      findHeadMeshes(currentModel)
      const size = box.getSize(new THREE.Vector3())
      try {
        if (window.preloader && typeof window.preloader.markModelLoaded === 'function') {
          window.preloader.markModelLoaded()
        }
      } catch (e) {}
    },
    (xhr) => {
      if (xhr && xhr.total) {
        const percent = Math.floor((xhr.loaded / xhr.total) * 100)
        try {
          if (window.preloader && typeof window.preloader.reportModelProgress === 'function') {
            window.preloader.reportModelProgress(xhr.loaded, xhr.total)
          }
        } catch (e) {}
      }
    },
    (error) => {
      console.error('Ошибка загрузки', error)
    },
  )
}

// Отключена загрузка через UI, но сразу подгружаем встроенную модель models/head.glb
loadModelFromURL('./models/head.glb', 'head.glb')

function findHeadMeshes(model) {
  headMeshes = []
  model.traverse((child) => {
    if (child.isMesh) {
      const name = child.name.toLowerCase()
      if (name.includes('head') || name.includes('skull') || name.includes('face') || name.includes('cranium') || name === 'neck' || name.includes('helmet') || name.includes('hair')) {
        headMeshes.push(child)
      }
    }
  })

  if (headMeshes.length === 0) {
    let highestY = -Infinity
    let highestMesh = null
    model.traverse((child) => {
      if (child.isMesh) {
        const box = new THREE.Box3().setFromObject(child)
        const centerY = (box.min.y + box.max.y) / 2
        if (centerY > highestY) {
          highestY = centerY
          highestMesh = child
        }
      }
    })
    if (highestMesh) {
      headMeshes = [highestMesh]
    } else {
      headMeshes = null
    }
  }
}

function updateHeadlightIntensity(deltaTime) {
  const lerpSpeed = 8.0
  currentHighlightIntensity += (targetHighlightIntensity - currentHighlightIntensity) * Math.min(1.0, lerpSpeed * deltaTime)
  currentGlowIntensity += (targetGlowIntensity - currentGlowIntensity) * Math.min(1.0, lerpSpeed * deltaTime)
  headHighlightLight.intensity = currentHighlightIntensity
  headGlowLight.intensity = currentGlowIntensity
  const boostedColor = rimLeftLight.color.clone().multiplyScalar(1.3)
  headHighlightLight.color.set(boostedColor)
  headGlowLight.color.set(rimLeftLight.color)
}

function checkHeadHover(clientX, clientY) {
  if (!currentModel) {
    targetHighlightIntensity = 0
    targetGlowIntensity = 0
    return
  }

  const rect = renderer.domElement.getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
    targetHighlightIntensity = 0
    targetGlowIntensity = 0
    return
  }

  mouseVector.x = (x / rect.width) * 2 - 1
  mouseVector.y = -(y / rect.height) * 2 + 1
  raycaster.setFromCamera(mouseVector, camera)

  let intersects = []
  if (Array.isArray(headMeshes) && headMeshes.length > 0) {
    intersects = raycaster.intersectObjects(headMeshes, true)
  } else if (headMeshes === null) {
    const allMeshes = []
    currentModel.traverse((child) => { if (child.isMesh) allMeshes.push(child) })
    const allIntersects = raycaster.intersectObjects(allMeshes, true)
    if (allIntersects.length > 0) {
      const hitPoint = allIntersects[0].point
      const modelBox = new THREE.Box3().setFromObject(currentModel)
      const headThreshold = modelBox.min.y + (modelBox.max.y - modelBox.min.y) * 0.7
      if (hitPoint.y > headThreshold) intersects = [allIntersects[0]]
    }
  }

  if (intersects.length > 0) {
    targetHighlightIntensity = 2.2
    targetGlowIntensity = 1.5
    const hitPoint = intersects[0].point
    headHighlightLight.position.copy(hitPoint.clone().add(new THREE.Vector3(0.1, 0.25, 0.25)))
    headGlowLight.position.copy(hitPoint.clone().add(new THREE.Vector3(0.05, 0.15, 0.2)))
    if (renderer && renderer.domElement) renderer.domElement.style.cursor = 'pointer'
    return true
  } else {
    targetHighlightIntensity = 0
    targetGlowIntensity = 0
    if (renderer && renderer.domElement) renderer.domElement.style.cursor = 'default'
    return false
  }
}

// Обработчики указателя: обновляют целевой угол поворота модели
function updateTargetFromPointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect()
  // Горизонталь
  const x = (clientX - rect.left) / rect.width // 0..1
  const nx = (x - 0.5) * 2 // -1..1
  // Для правой стороны используем базовую амплитуду, для левой — усилитель
  if (nx >= 0) {
    targetModelRotationY = nx * maxFollowAngle
  } else {
    targetModelRotationY = nx * maxFollowAngle * maxLeftMultiplier
  }
  // Вертикальное смещение игнорируем — модель двигается только влево/вправо
  targetModelRotationX = 0
}

// Track pointer globally so the head follows the cursor even when hovering UI elements.
// Use Pointer Events to cover mouse and touch in one handler; keep buttons clickable.
function playHeadClickSound() {
  try {
    const audio = new Audio('audio/chelk.mp3')
    audio.loop = false
    audio.play().catch((err) => console.warn('Head chelk playback failed:', err))
  } catch (err) {
    console.warn('Failed to play head click sound:', err)
  }
}

window.addEventListener('pointermove', (e) => {
  try {
    updateTargetFromPointer(e.clientX, e.clientY)
    checkHeadHover(e.clientX, e.clientY)
  } catch (err) {}
}, { passive: true })

window.addEventListener('pointerdown', (e) => {
  try {
    const headSection = document.querySelector('section.head') || document.querySelector('.head')
    if (!headSection || !headSection.classList.contains('visible')) return
    if (checkHeadHover(e.clientX, e.clientY) && typeof window.triggerBubbleSpawn === 'function') {
      playHeadClickSound()
      window.triggerBubbleSpawn({ triggeredBy: 'head' })
    }
  } catch (err) {}
}, { passive: true })

// When pointer leaves the page/window (relatedTarget === null), reset head to neutral.
window.addEventListener('pointerout', (e) => {
  try {
    if (!e.relatedTarget) {
      targetModelRotationY = 0
      targetModelRotationX = 0
      targetHighlightIntensity = 0
      targetGlowIntensity = 0
    }
  } catch (err) {}
})

// reset view UI removed; keep programmatic reset function if needed
function resetView() {
  camera.position.set(0.0, 0.8, 0.5)
  controls.target.set(0.0, 0.6, -0.1)
  controls.update()
  if (currentModel) {
    currentModel.position.set(0.01, -0.02, 0.01)
    currentModel.rotation.set(0, 0, 0)
    currentModel.scale.setScalar(1.0)
  }
}

// Загрузка моделей отключена (UI скрыт и обработчики блокированы)

// === ЭКСПОРТ В GLB ===
// Export UI removed; exporter function kept if needed programmatically
function exportSceneToGLB(filename = 'exported_scene.glb') {
  if (!currentModel) {
    console.warn('Export skipped — no model loaded')
    return
  }
  const exportScene = new THREE.Scene()
  exportScene.background = scene.background.clone()
  const lightsToClone = [ambientLight, rimLeftLight, rimRightLight, frontLight, fillLight]
  lightsToClone.forEach((light) => {
    const clonedLight = light.clone()
    clonedLight.position.copy(light.position)
    clonedLight.intensity = light.intensity
    clonedLight.color = light.color.clone()
    clonedLight.distance = light.distance
    clonedLight.decay = light.decay
    clonedLight.visible = light.visible
    exportScene.add(clonedLight)
  })
  if (currentModel) {
    const clonedModel = currentModel.clone(true)
    clonedModel.position.copy(currentModel.position)
    clonedModel.rotation.copy(currentModel.rotation)
    clonedModel.scale.copy(currentModel.scale)
    exportScene.add(clonedModel)
  }
  const exporter = new GLTFExporter()
  exporter.parse(exportScene, (result) => {
    const blob = new Blob([result], { type: 'application/octet-stream' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    console.log('Export finished:', filename)
  }, (error) => { console.error('Ошибка экспорта:', error) }, { binary: true, animations: [] })

}

// Settings UI removed

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Fade head elements on scroll while keeping bubbles visible.
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function initHeadScrollFade() {
  try {
    const canvasEl = document.getElementById('canvas');
    const titleL = document.querySelector('.head__title.left');
    const titleR = document.querySelector('.head__title.right');
    const desc = document.querySelector('.head__description');
    const headSection = document.querySelector('section.head') || document.querySelector('.head');
    const linesEl = document.querySelector('.lines');
    const carouselTrack = document.querySelector('.carousel-track');
    const scrollSection = document.querySelector('.scroll-section');
    const bubblesContainer = headSection.querySelector('.bubbles-container');
    if (!canvasEl || !headSection) return;

    // Simple, predictable opacity transitions
    [headSection, canvasEl, titleL, titleR, desc, bubblesContainer].forEach((el) => {
      try { if (el) el.style.transition = 'opacity 1200ms ease'; } catch (e) {}
    });
    if (headSection) {
      try {
        headSection.style.transition = 'opacity 1200ms ease, visibility 0ms linear 0ms';
      } catch (e) {}
    }
    if (carouselTrack) {
      try { carouselTrack.style.transition = 'opacity 600ms cubic-bezier(0.2,0,0.1,1), visibility 0ms linear 0ms'; } catch (e) {}
    }

    let fadeWheel = 0;
    let lastExtrasVisible = null;
    let hasScrolled = false;
    let headPermanentlyHidden = false;
    const fadeMax = Math.max(window.innerHeight * 0.8, 320);
    const gameSection = document.querySelector('.game');

    if (gameSection) {
      try {
        gameSection.style.transition = 'opacity 900ms ease';
        gameSection.style.opacity = '0';
        gameSection.style.pointerEvents = 'none';
        gameSection.style.visibility = 'hidden';
      } catch (e) {}
    }

    function showExtras() {
      try {
        if (linesEl) {
          linesEl.classList.remove('visible');
        }
        if (scrollSection) {
          scrollSection.classList.remove('visible');
          scrollSection.style.display = 'none';
        }
      } catch (e) {}
    }

    function updateExtras() {
      if (lastExtrasVisible === false) return;
      lastExtrasVisible = false;
      showExtras();
    }

    function shouldRunFade() {
      return Boolean(window.bubbleClick) && !headPermanentlyHidden;
    }

    let headHideTimeout = null;
    function clearHeadHideTimeout() {
      if (headHideTimeout) {
        clearTimeout(headHideTimeout);
        headHideTimeout = null;
      }
    }
    function scheduleHeadHide() {
      clearHeadHideTimeout();
      if (!headSection) return;
      headHideTimeout = setTimeout(() => {
        try {
          if (parseFloat(headSection.style.opacity) <= 0.01) {
            headSection.style.setProperty('display', 'none', 'important');
            headSection.classList.remove('visible');
            headSection.classList.add('head-hidden-permanent');
            headPermanentlyHidden = true;
          }
        } catch (e) {}
        headHideTimeout = null;
      }, 80);
    }

    function updateFade(opacity) {
      if (headPermanentlyHidden) return;
      const visibleOpacity = String(opacity);
      if (headSection && opacity > 0 && headSection.style.display === 'none') {
        headSection.style.display = 'flex';
      }
      [headSection, canvasEl, titleL, titleR, desc, bubblesContainer].forEach((el) => { try { if (el) el.style.opacity = visibleOpacity; } catch (e) {} });
      if (headSection) {
        try {
          headSection.style.pointerEvents = opacity > 0.05 ? '' : 'none';
          headSection.style.visibility = opacity > 0 ? 'visible' : 'hidden';
          if (opacity <= 0.01) {
            scheduleHeadHide();
          } else {
            clearHeadHideTimeout();
          }
        } catch (e) {}
      }
      if (carouselTrack) {
        try {
          carouselTrack.style.opacity = '';
          carouselTrack.style.pointerEvents = '';
          carouselTrack.style.visibility = '';
        } catch (e) {}
      }
      if (gameSection) {
        const gameOp = 1 - opacity;
        try {
          gameSection.style.opacity = String(gameOp);
          gameSection.style.pointerEvents = gameOp > 0.05 ? 'auto' : 'none';
          gameSection.style.visibility = gameOp > 0 ? 'visible' : 'hidden';
        } catch (e) {}
      }
      updateExtras(opacity);
    }

    function handleWheel(e) {
      if (!shouldRunFade()) return;
      try {
        const delta = e.deltaY || 0;
        if (delta !== 0) hasScrolled = true;
        fadeWheel = Math.max(0, Math.min(fadeMax, fadeWheel + delta));
        const progress = fadeWheel / fadeMax;
        const op = 1 - Math.pow(Math.min(1, progress), 2);
        updateFade(op);
      } catch (e) {}
    }

    function handleTouchMove(e) {
      if (!shouldRunFade() || !e.touches || !e.touches.length) return;
      try {
        const y = e.touches[0].clientY;
        if (typeof window._lastHeadTouchY === 'number') {
          const delta = window._lastHeadTouchY - y;
          if (delta !== 0) hasScrolled = true;
          fadeWheel = Math.max(0, Math.min(fadeMax, fadeWheel + delta));
          const progress = fadeWheel / fadeMax;
          const op = 1 - Math.pow(Math.min(1, progress), 2);
          updateFade(op);
        }
        window._lastHeadTouchY = y;
      } catch (e) {}
    }

    function resetTouch() {
      window._lastHeadTouchY = null;
    }

    window.resetHeadScrollFade = function() {
      headPermanentlyHidden = false;
      fadeWheel = 0;
      clearHeadHideTimeout();
      if (headSection) {
        headSection.style.display = 'flex';
        headSection.classList.remove('head-hidden-permanent');
        headSection.classList.add('visible');
        headSection.style.opacity = '1';
        headSection.style.pointerEvents = 'auto';
        headSection.style.visibility = 'visible';
      }
      if (carouselTrack) {
        carouselTrack.style.opacity = '';
        carouselTrack.style.pointerEvents = '';
        carouselTrack.style.visibility = '';
      }
      if (gameSection) {
        gameSection.style.opacity = '0';
        gameSection.style.pointerEvents = 'none';
        gameSection.style.visibility = 'hidden';
      }
      if (linesEl) {
        linesEl.classList.add('visible');
      }
      if (scrollSection) {
        scrollSection.classList.add('visible');
        scrollSection.style.display = '';
      }
    }

    function onScroll() {
      if (!shouldRunFade()) return;
      const top = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      if (top !== 0) hasScrolled = true;
      fadeWheel = Math.max(0, Math.min(fadeMax, top));
      const progress = fadeWheel / fadeMax;
      const op = 1 - Math.pow(Math.min(1, progress), 2);
      updateFade(op);
    }

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', resetTouch, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      fadeWheel = Math.min(fadeWheel, Math.max(window.innerHeight * 0.8, 320));
    }, { passive: true });
    if (window.bubbleClick) {
      updateFade(1);
    }
  } catch (e) {}
}

// init on load (if head elements already present)
try { if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(initHeadScrollFade, 80); else window.addEventListener('DOMContentLoaded', () => setTimeout(initHeadScrollFade, 80)); } catch (e) {}

let lastFrameTime = performance.now()
function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const delta = Math.min(0.033, (now - lastFrameTime) / 1000)
  lastFrameTime = now
  updateHeadlightIntensity(delta)
  controls.update()
  // Плавный поворот модели к целевому углу, вычисленному по указателю
  if (currentModel) {
    // Горизонталь (yaw)
    const deltaY = targetModelRotationY - currentModel.rotation.y
    currentModel.rotation.y += deltaY * followLerp
    // Вертикаль (pitch) не используется — плавно возвращаемся к 0
    currentModel.rotation.x += (0 - currentModel.rotation.x) * followLerp
  }
  renderer.render(scene, camera)
}
animate()
