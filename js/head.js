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

let currentModel = null
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
      const size = box.getSize(new THREE.Vector3())
    },
    (xhr) => {
      if (xhr && xhr.total) {
        const percent = Math.floor((xhr.loaded / xhr.total) * 100)
      }
    },
    (error) => {
      console.error('Ошибка загрузки', error)
    },
  )
}

// Отключена загрузка через UI, но сразу подгружаем встроенную модель models/head.glb
loadModelFromURL('./models/head.glb', 'head.glb')

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

canvas.addEventListener(
  'mousemove',
  (e) => {
    updateTargetFromPointer(e.clientX, e.clientY)
  },
  { passive: true },
)

// Поддержка сенсорных экранов
canvas.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches && e.touches[0]) {
      updateTargetFromPointer(e.touches[0].clientX, e.touches[0].clientY)
    }
  },
  { passive: true },
)

// Когда курсор покидает canvas — возвращаем модель в нейтральное положение
canvas.addEventListener('mouseleave', () => {
  targetModelRotationY = 0
  targetModelRotationX = 0
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

function animate() {
  requestAnimationFrame(animate)
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
