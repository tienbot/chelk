// --- script.js content starts here ---
const WORDS = ['Одежда', 'Хорека', 'Косметика'];
const SVG_COLORS = { Одежда: '#1D737B', Хорека: '#C4142D', Косметика: '#7B1D7B' };
const CAMERA_SETTINGS = { position: { x: 0, y: 0.4, z: 5.8 }, target: { x: 0, y: 0, z: 0 } };
const BASE_SCALE = 0.45;
const BACKGROUND_HEX = 0x121315;

const MODELS_CONFIG = [
  { name: 'Одежда', scale: BASE_SCALE, activeScale: BASE_SCALE * 1.05, file: 't-shirt-black.glb' },
  { name: 'Хорека', scale: BASE_SCALE, activeScale: BASE_SCALE * 1.05, file: 'soda_black.glb' },
  { name: 'Косметика', scale: BASE_SCALE, activeScale: BASE_SCALE * 1.05, file: 'cosmetic-black.glb' },
];

let slidesArray = [];
let threeInstances = [];
let currentSlideIndex = 1;
let currentWordIndex = 1;
let isTransitioning = false;
let carouselTrack = document.getElementById('carouselTrack');
let textOverlay = document.getElementById('textOverlay');
let prevBtn = document.getElementById('prevBtn');
let nextBtn = document.getElementById('nextBtn');
let dotsContainer = document.getElementById('dotsContainer');
let svgBackground = document.getElementById('svgBackground');

let modelFiles = { Одежда: null, Хорека: null, Косметика: null };
let expectedFiles = {
  't-shirt-black.glb': 'Одежда',
  'soda_black.glb': 'Хорека',
  'cosmetic-black.glb': 'Косметика',
};
let mainObject = ''
// Helper to update visible mainObject element and log changes
function updateMainObjectText(text) {
  try {
    const el = document.getElementById('mainObject');
    if (el) {
      el.textContent = text;
    }
    console.log('mainObject:', text);
      try {
        window.dispatchEvent(new CustomEvent('mainObjectChange', { detail: text }));
      } catch (e) {}
  } catch (e) {
    console.warn('updateMainObjectText failed', e);
  }
}

const ANIMATION_DURATION = 1000;

let scrollScaleEnabled = false;
const MIN_MODEL_SCALE = 0.2;
const MAX_MODEL_SCALE = 3.0;
// Scroll/zoom tuning
const SCALE_SENSITIVITY = 0.00009; // legacy sensitivity (not used for time-based scaling)
// Time-based constant scaling rate (scale units per second)
// Reduced to slow down perceived zoom speed
const SCALE_RATE = 0.35;
// Multiplier to make center slide scaling respond faster to scroll
const CENTER_SCROLL_MULTIPLIER = 1.3;
const CAMERA_MOVE_SENSITIVITY = 0.025; // how fast camera moves when "entering" model
const CAMERA_MIN_DISTANCE = 0.2;
const CAMERA_MAX_DISTANCE = 30;
const SCALE_TO_CAMERA_THRESHOLD_MULT = 1.4; // when model scale passes this multiplier of base, start moving camera

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

// Apply darkness (0..1) to an instance's model materials (lerp original color -> black)
function setModelDarkness(inst, factor) {
  // Color-changing disabled per user request. No-op.
  return;
}

// Restore original colors/emissive from userData.origColor/origEmissive
function restoreModelColors(inst) {
  if (!inst || !inst.modelGroup) return;
  inst.modelGroup.traverse((child) => {
    if (child.isMesh && child.material && child.userData) {
      try {
        if (child.userData.origColor && child.material.color) child.material.color.copy(child.userData.origColor);
        if (child.userData.origEmissive && child.material.emissive) child.material.emissive.copy(child.userData.origEmissive);
      } catch (e) {}
    }
  });
}

function onWheelScale(e) {
  if (!scrollScaleEnabled) return;
  const inst = threeInstances[currentSlideIndex];
  if (!inst || !inst.modelGroup) return;
  // set wheel direction and active timeout; actual scaling applied in animateModels per-frame
  const delta = e.deltaY;
  const dir = Math.sign(delta) || 0;
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  inst._wheelDirection = dir;
  inst._wheelActiveUntil = now + 160;
  return;

  // If scrolling out (delta<0) and camera is closer than base distance, move camera back first
  try {
    const cam = inst.camera;
    const tgt = inst.controls.target;
    const baseDist = inst.baseCameraDistance || cam.position.distanceTo(tgt);
    const curDist = cam.position.distanceTo(tgt);
    if (delta < 0 && curDist < baseDist) {
      const dirBack = new THREE.Vector3().subVectors(cam.position, tgt).normalize();
      const moveBack = Math.abs(delta) * CAMERA_MOVE_SENSITIVITY * 0.001;
      cam.position.addScaledVector(dirBack, moveBack);
      // clamp not to exceed baseDist
      const newDist = cam.position.distanceTo(tgt);
      if (newDist > baseDist) {
        // snap to baseDist
        const adj = new THREE.Vector3().subVectors(cam.position, tgt).setLength(baseDist);
        cam.position.copy(new THREE.Vector3().addVectors(tgt, adj));
      }
      inst.controls.update();
        // reduce accumulated darkness when moving back
        try {
        inst.darknessAccumulator = clamp((inst.darknessAccumulator || 0) - Math.abs(delta) * 0.0007, 0, 1);
        // restore lights and slide opacity when moving back (smooth)
        animateInstanceLightFactor(inst, 1, 250);
        try { animateSlideOpacity(inst, 1, 180); } catch (e) {}
      } catch (e) {}
      return;
    }
  } catch (e) {}

  // Otherwise scale the wrapper slowly
  const next = clamp(cur + change, MIN_MODEL_SCALE, MAX_MODEL_SCALE);
  // Prevent scaling further in if camera already at model edge
  try {
    const baseRadius = inst.baseBoundingRadius || 0.5;
    const currentScale = inst.modelGroup.scale.x || 1;
    const modelEdge = baseRadius * currentScale;
    const padding = Math.max(0.03, modelEdge * 0.02);
    const minAllowed = modelEdge + padding;
    const camDist = inst.camera.position.distanceTo(inst.controls.target);
    // if attempting to increase scale but camera is already at or below minAllowed, block further increase
    if (delta > 0 && camDist <= minAllowed + 1e-6) {
      // do not increase
    } else {
      inst.modelGroup.scale.set(next, next, next);
    }
  } catch (e) {
    inst.modelGroup.scale.set(next, next, next);
  }
  // when scaling in/out adjust darkness: start darkening when in last 20% towards max
  try {
    // compute normalized position between min and max
    const base = clamp((next - MIN_MODEL_SCALE) / (MAX_MODEL_SCALE - MIN_MODEL_SCALE), 0, 1);
    const baseDark = Math.max(0, (base - 0.8) / 0.2);
    // if increasing, allow accumulation
    if (delta > 0) inst.darknessAccumulator = clamp((inst.darknessAccumulator || 0) + Math.abs(delta) * 0.0002, 0, 1);
    else inst.darknessAccumulator = clamp((inst.darknessAccumulator || 0) - Math.abs(delta) * 0.0004, 0, 1);
    const totalDark = clamp(baseDark + inst.darknessAccumulator, 0, 1);
    // adjust lights based on scale: when in last 20% reduce lights to zero
    try {
      const baseNorm = base; // 0..1
      if (baseNorm >= 0.8) {
        const t = clamp((baseNorm - 0.8) / 0.2, 0, 1);
        const lightFactor = clamp(1 - t, 0, 1);
        animateInstanceLightFactor(inst, lightFactor, 120);
        try { animateSlideOpacity(inst, lightFactor, 120); } catch (e) {}
      } else {
        animateInstanceLightFactor(inst, 1, 200);
        try { animateSlideOpacity(inst, 1, 200); } catch (e) {}
      }
    } catch (e) {}
  } catch (e) {}
}

function enableCenterScrollScale() {
  if (scrollScaleEnabled) return;
  scrollScaleEnabled = true;
  window.addEventListener('wheel', onWheelScale, { passive: true });
  console.log('enableCenterScrollScale: wheel scaling enabled for center model');
}

// ========== ПЛАВНАЯ СМЕНА ЦВЕТА ==========
function syncSvgColorTransition(newColor) {
  if (!svgBackground) return;
  const svg = svgBackground.querySelector('svg');
  if (!svg) return;
  const paths = svg.querySelectorAll('path, circle');
  const changeColorElements = document.querySelectorAll('.change-color');

  paths.forEach((el) => {
    const targetOpacity = el.id === 'svgPath1' ? '0.85' : el.id === 'svgPath2' ? '0.35' : '0.9';
    el.style.setProperty('transition', `stroke ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), stroke-opacity ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`, 'important');
    el.style.setProperty('stroke-opacity', targetOpacity, 'important');
    el.style.setProperty('stroke', newColor, 'important');
    el.setAttribute('stroke', newColor);
    el.setAttribute('stroke-opacity', targetOpacity);
  });

  // Apply the same color behavior as slider.js for all branded .change-color elements.
  changeColorElements.forEach((el) => {
    el.style.setProperty('transition', 'fill 0.7s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.7s cubic-bezier(0.4, 0, 0.2, 1)', 'important');
    el.setAttribute('fill', newColor);
    el.setAttribute('stroke', newColor);
    el.style.setProperty('fill', newColor, 'important');
    el.style.setProperty('stroke', newColor, 'important');
  });
}

// ========== ТЕКСТОВАЯ АНИМАЦИЯ ==========
let activeTextSlide = null;

// Экспортируем функции для явного вызова после динамического импорта
export { initTextSlides, buildCarousel, initKeyboardControls, enableCenterScrollScale };

function createTextSlide(word, idx, isActive = false) {
  const slideDiv = document.createElement('div');
  slideDiv.className = 'word-slide';
  if (isActive) slideDiv.classList.add('active');
  slideDiv.setAttribute('data-word-idx', idx);
  const chars = word.split('');
  for (let i = 0; i < chars.length; i++) {
    const letterSpan = document.createElement('span');
    letterSpan.className = 'letter';
    letterSpan.textContent = chars[i];
    slideDiv.appendChild(letterSpan);
  }
  return slideDiv;
}

function initTextSlides() {
  textOverlay.innerHTML = '';
  WORDS.forEach((word, idx) => {
    const isActive = idx === currentWordIndex;
    const slide = createTextSlide(word, idx, isActive);
    textOverlay.appendChild(slide);
    if (isActive) activeTextSlide = slide;
  });
  // initial syncs: svg color and mainObject text
  setTimeout(() => {
    syncSvgColorTransition(SVG_COLORS[WORDS[currentWordIndex]]);
    updateMainObjectText(WORDS[currentWordIndex]);
  }, 50);
}

function animateTextSync(oldSlide, newSlide) {
  return new Promise((resolve) => {
    const oldLetters = Array.from(oldSlide.querySelectorAll('.letter'));
    const newLetters = Array.from(newSlide.querySelectorAll('.letter'));

    newLetters.forEach((l) => {
      l.style.animation = 'none';
      l.style.transform = 'rotateX(90deg)';
      l.style.opacity = '0';
      l.style.display = 'inline-block';
    });

    oldLetters.forEach((l) => {
      l.style.animation = 'none';
      l.style.transform = 'rotateX(0deg)';
      l.style.opacity = '1';
    });

    void document.body.offsetHeight;

    let completedAnimations = 0;
    const totalAnimations = oldLetters.length + newLetters.length;

    function checkComplete() {
      completedAnimations++;
      if (completedAnimations === totalAnimations) {
        resolve();
      }
    }

    oldLetters.forEach((l, i) => {
      const delay = Math.min(i * 60, ANIMATION_DURATION * 0.3);
      setTimeout(() => {
        l.style.animation = 'flipLetterOut 0.4s cubic-bezier(0.4,0,0.2,1) forwards';
        l.addEventListener('animationend', checkComplete, { once: true });
      }, delay);
    });

    newLetters.forEach((l, i) => {
      const delay = ANIMATION_DURATION * 0.2 + Math.min(i * 60, ANIMATION_DURATION * 0.3);
      setTimeout(() => {
        l.style.animation = 'flipLetterIn 0.5s cubic-bezier(0.4,0,0.2,1) forwards';
        l.addEventListener('animationend', checkComplete, { once: true });
      }, delay);
    });

    setTimeout(() => resolve(), ANIMATION_DURATION + 100);
  });
}

async function syncSwitchToWord(newIndex) {
  if (newIndex === currentWordIndex) return;
  const oldSlide = activeTextSlide;
  let newSlide = textOverlay.querySelector(`.word-slide[data-word-idx="${newIndex}"]`);
  if (!newSlide) {
    newSlide = createTextSlide(WORDS[newIndex], newIndex, false);
    textOverlay.appendChild(newSlide);
  }

  newSlide.classList.add('active');
  await animateTextSync(oldSlide, newSlide);
  oldSlide.classList.remove('active');

  currentWordIndex = newIndex;
  activeTextSlide = newSlide;
  // Update mainObject and log the new active word
  updateMainObjectText(WORDS[newIndex]);
}

// ========== НАСТРОЙКА ОСВЕЩЕНИЯ (НОВОЕ) ==========
function setupLighting(scene) {
  // Ambient light - общая освещенность
  const ambientLight = new THREE.AmbientLight(0xffffff, 0);
  scene.add(ambientLight);
  
  // Основной направленный свет спереди-сверху
  const mainLight = new THREE.DirectionalLight(0xffffff, 5.81);
  mainLight.position.set(2, 5, 3);
  scene.add(mainLight);
  
  // Дополнительный свет справа
  const rightLight = new THREE.DirectionalLight(0xffffff, 2.03);
  rightLight.position.set(1.8, 2, 1.1);
  scene.add(rightLight);
  
  // Дополнительный свет слева
  const leftLight = new THREE.DirectionalLight(0xffffff, 2.03);
  leftLight.position.set(-8, 4.2, -5);
  scene.add(leftLight);
  
  // Свет сзади для подсветки контуров
  const backLight = new THREE.DirectionalLight(0xffffff, 12);
  backLight.position.set(0.4, 2, -8);
  scene.add(backLight);
  
  // Мягкий свет снизу
  const fillLight = new THREE.PointLight(0xffffff, 5);
  fillLight.position.set(3, -2, 3);
  scene.add(fillLight);
  
  // store lights and their original intensities so they can be adjusted per-instance
  try {
    scene.userData = scene.userData || {};
    scene.userData.lights = [ambientLight, mainLight, rightLight, leftLight, backLight, fillLight];
    scene.userData.lights.forEach((L) => { if (L) L.userData = L.userData || {}; if (L) L.userData.origIntensity = L.intensity || 0; });
  } catch (e) {}

  console.log('✅ Освещение настроено');
}

// Set per-instance light factor (0..1) multiplies original intensities
function setInstanceLightFactor(inst, factor) {
  if (!inst || !inst.scene || typeof factor !== 'number') return;
  factor = clamp(factor, 0, 1);
  try {
    const lights = inst.scene.userData && inst.scene.userData.lights ? inst.scene.userData.lights : [];
    lights.forEach((L) => {
      try {
        const orig = (L && L.userData && typeof L.userData.origIntensity === 'number') ? L.userData.origIntensity : (L && L.intensity) || 1;
        if (L) L.intensity = orig * factor;
      } catch (e) {}
    });
  } catch (e) {}
}

function getInstanceLightFactor(inst) {
  if (!inst || !inst.scene) return 1;
  try {
    const lights = inst.scene.userData && inst.scene.userData.lights ? inst.scene.userData.lights : [];
    if (!lights.length) return 1;
    let sum = 0, count = 0;
    lights.forEach((L) => {
      try {
        const orig = (L && L.userData && typeof L.userData.origIntensity === 'number') ? L.userData.origIntensity : (L && L.intensity) || 1;
        if (orig > 0) { sum += (L.intensity || 0) / orig; count++; }
      } catch (e) {}
    });
    return count ? sum / count : 1;
  } catch (e) { return 1; }
}

function animateInstanceLightFactor(inst, targetFactor, duration = 200) {
  if (!inst) return;
  try {
    // cancel previous
    if (inst._lightAnimCancel) { inst._lightAnimCancel(); inst._lightAnimCancel = null; }
    const start = performance.now();
    const from = getInstanceLightFactor(inst);
    const to = clamp(targetFactor, 0, 1);
    if (Math.abs(from - to) < 0.001) return;
    let rafId = null;
    const step = (now) => {
      const t = clamp((now - start) / Math.max(1, duration), 0, 1);
      const v = from + (to - from) * t;
      setInstanceLightFactor(inst, v);
      if (t < 1) rafId = requestAnimationFrame(step);
      else inst._lightAnimCancel = null;
    };
    rafId = requestAnimationFrame(step);
    inst._lightAnimCancel = () => { if (rafId) cancelAnimationFrame(rafId); inst._lightAnimCancel = null; };
  } catch (e) {}
}

function getSlideOpacity(inst) {
  try {
    const el = inst && inst.slideElement;
    if (!el) return 1;
    const v = parseFloat(window.getComputedStyle(el).opacity);
    return Number.isFinite(v) ? v : 1;
  } catch (e) { return 1; }
}

function animateSlideOpacity(inst, targetOpacity, duration = 200) {
  if (!inst || !inst.slideElement) return;
  try {
    const el = inst.slideElement;
    const to = clamp(targetOpacity, 0, 1);
    // If value already very close, still set to ensure important override
    try { el.style.setProperty('transition', `opacity ${Math.max(1, duration)}ms cubic-bezier(0.4,0,0.2,1)`, 'important'); } catch (e) {}
    try { el.style.setProperty('opacity', String(to), 'important'); } catch (e) {}
    // clear any previously scheduled transition removal and schedule cleanup
    if (inst._slideTransitionRestoreTimer) clearTimeout(inst._slideTransitionRestoreTimer);
    inst._slideTransitionRestoreTimer = setTimeout(() => {
      try { el.style.removeProperty('transition'); } catch (e) {}
      inst._slideTransitionRestoreTimer = null;
    }, Math.max(1, duration) + 80);
  } catch (e) {}
}

// Apply opacity instantly during continuous scroll: disable transitions, set opacity with !important,
// and restore transitions shortly after scrolling stops.
function setSlideOpacityInstant(inst, targetOpacity) {
  if (!inst || !inst.slideElement) return;
  try {
    // cancel any running scripted animation
    if (inst._slideAnimCancel) { inst._slideAnimCancel(); inst._slideAnimCancel = null; }
    const el = inst.slideElement;
    const v = clamp(targetOpacity, 0, 1);
    // disable transitions so change is immediate and override any CSS !important
    try { el.style.setProperty('transition', 'none', 'important'); } catch (e) {}
    try { el.style.setProperty('opacity', String(v), 'important'); } catch (e) {}
    // schedule restoration of transition after user stops scrolling
    if (inst._slideTransitionRestoreTimer) clearTimeout(inst._slideTransitionRestoreTimer);
    inst._slideTransitionRestoreTimer = setTimeout(() => {
      try { el.style.removeProperty('transition'); } catch (e) {}
      inst._slideTransitionRestoreTimer = null;
    }, 220);
  } catch (e) {}
}

// Функция для преобразования материалов модели в MeshStandardMaterial
function enhanceMaterials(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      // Если материал не является MeshStandardMaterial, конвертируем его
      if (!(child.material instanceof THREE.MeshStandardMaterial)) {
        const oldMat = child.material;
        const newMat = new THREE.MeshStandardMaterial({
          color: oldMat.color,
          map: oldMat.map,
          metalness: 0.7,
          roughness: 0.3,
        });
        child.material = newMat;
      }
      // store original colors so we can darken/restore later
      try {
        child.userData = child.userData || {};
        if (child.material && child.material.color) child.userData.origColor = child.material.color.clone();
        if (child.material && child.material.emissive) child.userData.origEmissive = child.material.emissive.clone();
      } catch (e) {}
      // Включаем прием теней для лучшей визуализации
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// ========== 3D МОДЕЛИ ==========
function applyCameraSettings(instance) {
  if (!instance) return;
  instance.camera.position.set(
    CAMERA_SETTINGS.position.x,
    CAMERA_SETTINGS.position.y,
    CAMERA_SETTINGS.position.z,
  );
  instance.controls.target.set(
    CAMERA_SETTINGS.target.x,
    CAMERA_SETTINGS.target.y,
    CAMERA_SETTINGS.target.z,
  );
  instance.controls.update();
}

function updateModelScale(instance, isActive, modelConfig) {
  if (!instance || !instance.modelGroup) return;
  // If the slide element itself has both 'slide' and 'center' classes, do not apply the
  // "active" enlarged scale — keep the base model scale to prevent enlargement.
  const slideEl = instance.slideElement;
  const shouldPreventEnlarge = slideEl && slideEl.classList && slideEl.classList.contains('slide') && slideEl.classList.contains('center');
  let targetScale;
  if (shouldPreventEnlarge) {
    targetScale = modelConfig.scale;
  } else {
    targetScale = isActive ? modelConfig.activeScale || modelConfig.scale : modelConfig.scale;
  }
  instance.modelGroup.scale.set(targetScale, targetScale, targetScale);
}

async function loadModelIntoSlide(slideIndex, modelConfig) {
  const inst = threeInstances[slideIndex];
  if (!inst) return;
  
  if (inst.modelGroup) inst.scene.remove(inst.modelGroup);
  
  const loader = new GLTFLoader();
  const modelPath = `./models/${modelConfig.file}`;
  
  console.log(`🔄 Загрузка модели "${modelConfig.name}" из ${modelPath}`);
  
  try {
    const gltf = await loader.loadAsync(modelPath);
    const model = gltf.scene;
    
    console.log(`[slide ${slideIndex}] GLTF loaded:`, modelConfig.file, gltf);
    try {
      const childrenCount = model.children ? model.children.length : 0;
      console.log(`[slide ${slideIndex}] model children count:`, childrenCount);
    } catch (e) {}

    // Улучшаем материалы для корректного освещения
    enhanceMaterials(model);

    // Wrap model in a parent group so scaling happens around a stable origin
    const wrapper = new THREE.Group();
    // Reset model local scale and use wrapper scale for sizing
    model.scale.set(1, 1, 1);

    // Compute bounding box on the raw model, then center the model inside the wrapper
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    console.log(`[slide ${slideIndex}] model bbox size:`, size, 'center:', center);
    model.position.x = -center.x;
    model.position.z = -center.z;
    model.position.y = -center.y;

      // compute bounding sphere radius (base, unscaled) and store on instance for camera-edge limits
      try {
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        if (threeInstances[slideIndex]) {
          threeInstances[slideIndex].baseBoundingRadius = sphere.radius;
        }
      } catch (e) {}

    // Apply initial scale on wrapper so further scale changes keep model centered
    wrapper.add(model);
    wrapper.scale.set(modelConfig.scale, modelConfig.scale, modelConfig.scale);

    inst.scene.add(wrapper);
    inst.modelGroup = wrapper;
    // ensure renderer uses current canvas size after model added
    try {
      if (inst.updateRendererSizeToCanvas) inst.updateRendererSizeToCanvas();
    } catch (e) {}
    updateModelScale(inst, slideIndex === currentSlideIndex, modelConfig);
    applyCameraSettings(inst);
    console.log(`✅ Модель "${modelConfig.name}" успешно загружена с улучшенным освещением`);
  } catch (err) {
    console.error(`❌ Ошибка загрузки модели "${modelConfig.name}":`, err);
    // Создаем простую фигуру-заглушку
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.3 });
    const fallbackMesh = new THREE.Mesh(geometry, material);
    fallbackMesh.scale.set(0.8, 0.8, 0.8);
    inst.scene.add(fallbackMesh);
    inst.modelGroup = fallbackMesh;
  }
}

async function initThreeForSlide(slideElement, modelConfig, slideIndex) {
  const canvas = document.createElement('canvas');
  // Возвращаем прозрачный фон canvas
  // Сделаем canvas позиционированным и используем CSS cover-подход,
  // чтобы сохранить aspect-ratio, одновременно покрывая контейнер.
  // Ensure slide is absolutely positioned at top/left so slides overlay horizontally
  slideElement.style.position = 'absolute';
  slideElement.style.top = '0';
  slideElement.style.left = '50%';
  slideElement.style.width = slideElement.style.width || '100%';
  slideElement.style.height = slideElement.style.height || '100vh';
  slideElement.style.overflow = 'hidden';
  canvas.style.cssText = '';
  canvas.style.position = 'absolute';
  canvas.style.top = '50%';
  canvas.style.left = '50%';
  canvas.style.transform = 'translate(-50%, -50%)';
  canvas.style.minWidth = '100%';
  canvas.style.minHeight = '100%';
  canvas.style.width = 'auto';
  canvas.style.height = 'auto';
  canvas.style.display = 'block';
  canvas.style.background = 'transparent';
  slideElement.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0); // прозрачный фон

  // Helper: set renderer drawing buffer size to the displayed canvas size (in CSS pixels * DPR)
  function updateRendererSizeToCanvas() {
    try {
      const rect = canvas.getBoundingClientRect();
      const displayW = Math.max(1, Math.floor(rect.width));
      const displayH = Math.max(1, Math.floor(rect.height));
      renderer.setSize(displayW * dpr, displayH * dpr, false);
      if (instance && instance.camera) {
        instance.camera.aspect = displayW / displayH;
        instance.camera.updateProjectionMatrix();
      }
    } catch (e) {
      // ignore
    }
  }

  // Включаем тени
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = null;

  // НАСТРАИВАЕМ ОСВЕЩЕНИЕ
  setupLighting(scene);

  // Compute initial aspect from the displayed canvas rect to avoid undefined w/h
  let initialAspect = 1;
  try {
    const r = canvas.getBoundingClientRect();
    const dw = Math.max(1, Math.floor(r.width));
    const dh = Math.max(1, Math.floor(r.height));
    initialAspect = dw / dh || 1;
  } catch (e) {
    try {
      initialAspect = Math.max(1, slideElement.clientWidth) / Math.max(1, slideElement.clientHeight);
    } catch (e2) {
      initialAspect = 1;
    }
  }
  const camera = new THREE.PerspectiveCamera(42, initialAspect, 0.1, 1000);
  camera.position.set(
    CAMERA_SETTINGS.position.x,
    CAMERA_SETTINGS.position.y,
    CAMERA_SETTINGS.position.z,
  );
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.autoRotate = false;
  // Disable OrbitControls zoom entirely to prevent scroll-based scale/zoom changes
  controls.enableZoom = false;
  controls.zoomSpeed = 0.6;
  controls.enablePan = false;
  controls.target.set(
    CAMERA_SETTINGS.target.x,
    CAMERA_SETTINGS.target.y,
    CAMERA_SETTINGS.target.z,
  );
  controls.update();

  // Keep zoom disabled for all slides; do not toggle on hover.

  const instance = {
    scene,
    camera,
    renderer,
    controls,
    modelGroup: null,
    slideElement,
    modelConfig,
    darknessAccumulator: 0,
    _wheelDirection: 0,
    _wheelActiveUntil: 0,
    _animatePrevTime: (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(),
  };

  threeInstances[slideIndex] = instance;
  // store base camera distance for inside-model zoom behavior
  try {
    instance.baseCameraDistance = instance.camera.position.distanceTo(instance.controls.target);
  } catch (e) {
    instance.baseCameraDistance = CAMERA_SETTINGS.position.z || 5.8;
  }

  // make updateRendererSizeToCanvas available for this instance
  if (typeof updateRendererSizeToCanvas === 'function') {
    // attach helper to instance for external calls
    instance.updateRendererSizeToCanvas = updateRendererSizeToCanvas;
    // call once to sync initial size
    updateRendererSizeToCanvas();
  }

  // Загружаем модель
  try {
    await loadModelIntoSlide(slideIndex, modelConfig);
  } catch (e) {
    console.error(`[slide ${slideIndex}] Ошибка загрузки модели:`, e);
  }

  function animateModels() {
    if (!slideElement.isConnected) return;
    // per-frame timing
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const prev = instance._animatePrevTime || now;
    let dt = (now - prev) / 1000;
    dt = Math.max(0, Math.min(0.05, dt));
    instance._animatePrevTime = now;

    if (controls && slideElement.classList.contains('center')) controls.update();

    if (instance.modelGroup && slideElement.classList.contains('center')) {
      const time = Date.now() * 0.002;
      instance.modelGroup.position.y = Math.sin(time) * 0.008;
      instance.modelGroup.rotation.y = Math.sin(time * 0.5) * 0.02;
    }

    // apply continuous, constant scaling while wheel direction is active for this instance
    try {
      const dir = instance._wheelDirection || 0;
      const activeUntil = instance._wheelActiveUntil || 0;
      if (dir !== 0 && now < activeUntil && instance.modelGroup && slideElement.classList.contains('center')) {
        const cur = instance.modelGroup.scale.x || 1;
        const change = dir * SCALE_RATE * dt * CENTER_SCROLL_MULTIPLIER;
        const next = clamp(cur + change, MIN_MODEL_SCALE, MAX_MODEL_SCALE);
        // always attempt to scale model to keep constant perceived speed
        try {
          const baseRadius = instance.baseBoundingRadius || 0.5;
          const currentScale = instance.modelGroup.scale.x || 1;
          const modelEdge = baseRadius * currentScale;
          const padding = Math.max(0.03, modelEdge * 0.02);
          const minAllowed = modelEdge + padding;
          const camDist = instance.camera.position.distanceTo(instance.controls.target);
          // if camera would be inside model after scaling, move camera back to maintain distance
          if (dir > 0 && camDist <= minAllowed + 1e-6) {
            try {
              const tgt = instance.controls.target;
              const cam = instance.camera;
              const dirBack = new THREE.Vector3().subVectors(cam.position, tgt).normalize();
              const adj = dirBack.multiplyScalar(minAllowed);
              cam.position.copy(new THREE.Vector3().addVectors(tgt, adj));
              instance.controls.update();
            } catch (e) {}
          }
          instance.modelGroup.scale.set(next, next, next);
        } catch (e) {
          instance.modelGroup.scale.set(next, next, next);
        }

        // update darkness/lights same as before
        try {
          const base = clamp((next - MIN_MODEL_SCALE) / (MAX_MODEL_SCALE - MIN_MODEL_SCALE), 0, 1);
          if (dir > 0) instance.darknessAccumulator = clamp((instance.darknessAccumulator || 0) + Math.abs(change) * 0.02, 0, 1);
          else instance.darknessAccumulator = clamp((instance.darknessAccumulator || 0) - Math.abs(change) * 0.04, 0, 1);
          const baseNorm = base;
          if (baseNorm >= 0.8) {
            const t = clamp((baseNorm - 0.8) / 0.2, 0, 1);
            const lightFactor = clamp(1 - t, 0, 1);
            animateInstanceLightFactor(instance, lightFactor, 120);
            try { animateSlideOpacity(instance, lightFactor, 120); } catch (e) {}
          } else {
            animateInstanceLightFactor(instance, 1, 200);
            try { animateSlideOpacity(instance, 1, 200); } catch (e) {}
          }
        } catch (e) {}
      } else {
        // clear direction if inactive
        if (instance._wheelDirection !== 0) instance._wheelDirection = 0;
      }
    } catch (e) {}

    renderer.render(scene, camera);
    requestAnimationFrame(animateModels);
  }
  animateModels();
  return instance;
}

function updateSlidePositions() {
  if (!slidesArray.length) return;
  const leftIndex = (currentSlideIndex - 1 + 3) % 3;
  const centerIndex = currentSlideIndex;
  const rightIndex = (currentSlideIndex + 1) % 3;
  slidesArray.forEach((slide, idx) => {
    slide.classList.remove('left', 'center', 'right');
    if (idx === leftIndex) slide.classList.add('left');
    else if (idx === centerIndex) slide.classList.add('center');
    else slide.classList.add('right');
  });
  threeInstances.forEach((inst, idx) => {
    const slideEl = slidesArray[idx];
    // If renderer exists, resize it to match the current slide size (important when a slide becomes center/fullscreen)
    try {
      if (inst && inst.renderer && slideEl) {
        const canvas = inst.renderer.domElement;
        let displayW = slideEl.clientWidth;
        let displayH = slideEl.clientHeight;
        try {
          const rect = canvas.getBoundingClientRect();
          if (rect.width && rect.height) {
            displayW = Math.max(1, Math.floor(rect.width));
            displayH = Math.max(1, Math.floor(rect.height));
          }
        } catch (e) {}
        const dpr = window.devicePixelRatio || 1;
        inst.renderer.setSize(displayW * dpr, displayH * dpr, false);
        if (inst.camera) {
          inst.camera.aspect = displayW / displayH;
          inst.camera.updateProjectionMatrix();
        }
      }
    } catch (e) {
      // ignore resize errors
    }

    if (inst && inst.modelGroup && inst.modelConfig) {
      updateModelScale(inst, idx === currentSlideIndex, inst.modelConfig);
    }
  });
  // Debug: log slide/renderer status to help diagnose visibility issues
  try {
    slidesArray.forEach((slide, idx) => {
      const inst = threeInstances[idx];
      const canvas = inst && inst.renderer ? inst.renderer.domElement : null;
      const rect = canvas ? canvas.getBoundingClientRect() : null;
      console.log(`[slide-status ${idx}] classes=${slide.className}`, 'hasModel=', !!(inst && inst.modelGroup), 'canvasRect=', rect, 'rendererSize=', inst && inst.renderer ? `${inst.renderer.domElement.width}x${inst.renderer.domElement.height}` : null);
      // ensure renderer drawing buffer follows actual displayed canvas
      try {
        if (inst && inst.updateRendererSizeToCanvas) inst.updateRendererSizeToCanvas();
      } catch (e) {}
    });
  } catch (e) {}
  const dots = document.querySelectorAll('.dot');
  dots.forEach((dot, i) => {
    if (i === currentSlideIndex) dot.classList.add('active');
    else dot.classList.remove('active');
  });
}

// ========== ГЛАВНАЯ СИНХРОННАЯ СМЕНА ==========
async function syncChangeSlide(newSlideIndex) {
  if (isTransitioning || newSlideIndex === currentSlideIndex) return;
  isTransitioning = true;

  const newWord = WORDS[newSlideIndex];
  const newColor = SVG_COLORS[newWord];

  syncSvgColorTransition(newColor);
  const textPromise = syncSwitchToWord(newSlideIndex);
  currentSlideIndex = newSlideIndex;
  updateSlidePositions();

  await textPromise;
  setTimeout(() => {
    isTransitioning = false;
  }, 50);
}

function nextSlide() {
  if (!isTransitioning) syncChangeSlide((currentSlideIndex + 1) % 3);
}

function prevSlide() {
  if (!isTransitioning) syncChangeSlide((currentSlideIndex - 1 + 3) % 3);
}

function setupDragAndDrop() {
  document.body.addEventListener('dragover', (e) => e.preventDefault());
  document.body.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      // ... drag and drop logic ...
    }
  });
}

async function buildCarousel() {
  carouselTrack.innerHTML = '';
  for (let i = 0; i < MODELS_CONFIG.length; i++) {
    const slideDiv = document.createElement('div');
    slideDiv.className = 'slide';
    slideDiv.setAttribute('data-index', i);
    carouselTrack.appendChild(slideDiv);
  }
  slidesArray = document.querySelectorAll('.slide');
  
  for (let i = 0; i < slidesArray.length; i++) {
    await initThreeForSlide(slidesArray[i], MODELS_CONFIG[i], i);
  }
  
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('button');
    dot.classList.add('dot');
    if (i === currentSlideIndex) dot.classList.add('active');
    dot.addEventListener('click', () => syncChangeSlide(i));
    dotsContainer.appendChild(dot);
  }
  updateSlidePositions();
  slidesArray.forEach((slide, idx) =>
    slide.addEventListener('click', () => syncChangeSlide(idx)),
  );
  prevBtn.addEventListener('click', prevSlide);
  nextBtn.addEventListener('click', nextSlide);

  let touchStartX = 0;
  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    if (Math.abs(touchEndX - touchStartX) > 50 && !isTransitioning) {
      if (touchEndX < touchStartX) nextSlide();
      else prevSlide();
    }
  });

  window.addEventListener('resize', () => {
    slidesArray.forEach((slide, idx) => {
      const inst = threeInstances[idx];
      if (!inst || !slide) return;
      try {
        const canvas = inst.renderer.domElement;
        let displayW = slide.clientWidth;
        let displayH = slide.clientHeight;
        try {
          const rect = canvas.getBoundingClientRect();
          if (rect.width && rect.height) {
            displayW = Math.max(1, Math.floor(rect.width));
            displayH = Math.max(1, Math.floor(rect.height));
          }
        } catch (e) {}
        const dpr = window.devicePixelRatio || 1;
        inst.renderer.setSize(displayW * dpr, displayH * dpr, false);
        if (inst.camera) {
          inst.camera.aspect = displayW / displayH;
          inst.camera.updateProjectionMatrix();
        }
      } catch (e) {}
    });
    updateSlidePositions();
  });

  setupDragAndDrop();
  console.log('✅ Синхронная карусель готова!');

  window.addEventListener('wheel', () => {
    threeInstances.forEach((inst, idx) => {
      if (!inst || !inst.modelGroup || !inst.modelConfig) return;
      // Never reset the currently centered model here; allow center wheel handler to control it
      if (idx === currentSlideIndex) return;
      try {
        inst.modelGroup.scale.set(inst.modelConfig.scale, inst.modelConfig.scale, inst.modelConfig.scale);
      } catch (e) {
        // ignore
      }
    });
  }, { passive: true });
}

// ========== УПРАВЛЕНИЕ С КЛАВИАТУРЫ ==========
function initKeyboardControls() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevSlide();
    else if (e.key === 'ArrowRight') nextSlide();
  });
}


// кнопка Выбрать
function initChoiseButton() {
    const choiseButton = document.querySelector('.choise-button');
    
    if (choiseButton) {
        choiseButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Воспроизводим звук
            const audio = new Audio('audio/chelk.mp3');
            audio.play().catch(error => {
                console.log('Ошибка воспроизведения:', error);
            });
            
            const bracketsContainer = choiseButton.querySelector('.choise-button__brackets');
            
            if (bracketsContainer) {
                // Убираем возможность обратной анимации при наведении
                choiseButton.style.pointerEvents = 'none';
                
                // Отключаем hover эффект, убирая transition у brackets
                const brackets = choiseButton.querySelector('.choise-button__brackets');
                brackets.style.setProperty('transition', 'none', 'important');
                
                const leftBracket = bracketsContainer.querySelector('svg:first-child').cloneNode(true);
                const rightBracket = bracketsContainer.querySelector('svg:last-child').cloneNode(true);
                
                // Первая дополнительная (ближняя)
                const leftClone1 = leftBracket.cloneNode(true);
                leftClone1.style.cssText = 'position:absolute; left:0px; top:50%; transform:translateY(-50%) scale(1); opacity:1; pointer-events:none; transition:all 0.8s cubic-bezier(0.15, 0.85, 0.3, 1.05) !important';
                choiseButton.appendChild(leftClone1);
                
                const rightClone1 = rightBracket.cloneNode(true);
                rightClone1.style.cssText = 'position:absolute; right:0px; top:50%; transform:translateY(-50%) scale(1); opacity:1; pointer-events:none; transition:all 0.8s cubic-bezier(0.15, 0.85, 0.3, 1.05) !important';
                choiseButton.appendChild(rightClone1);
                
                // Вторая дополнительная (дальняя)
                const leftClone2 = leftBracket.cloneNode(true);
                leftClone2.style.cssText = 'position:absolute; left:0px; top:50%; transform:translateY(-50%) scale(1); opacity:1; pointer-events:none; transition:all 1s cubic-bezier(0.15, 0.85, 0.3, 1.05) !important';
                choiseButton.appendChild(leftClone2);
                
                const rightClone2 = rightBracket.cloneNode(true);
                rightClone2.style.cssText = 'position:absolute; right:0px; top:50%; transform:translateY(-50%) scale(1); opacity:1; pointer-events:none; transition:all 1s cubic-bezier(0.15, 0.85, 0.3, 1.05) !important';
                choiseButton.appendChild(rightClone2);
                
                // Анимация для brand
                const brandElement = choiseButton.querySelector('.choise-button__brand');
                const textElement = choiseButton.querySelector('.choise-button__text');
                
                if (brandElement) {
                // Сначала показываем brand
                brandElement.style.setProperty('transition', 'opacity 0.2s ease-out, transform 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1)', 'important');
                brandElement.style.setProperty('opacity', '1', 'important');
                    
                // Анимация увеличения и возврата
                brandElement.style.setProperty('transform', 'scale(2.2)', 'important');
                    
                setTimeout(() => {
                  brandElement.style.setProperty('transform', 'scale(1)', 'important');
                }, 30);
              }
                
                if (textElement) {
                  textElement.style.setProperty('transition', 'opacity 0.2s ease-out', 'important');
                  textElement.style.setProperty('opacity', '0', 'important');
                }
                
                // Запускаем анимацию скобок
                requestAnimationFrame(() => {
                    leftClone1.style.left = '-35px';
                    leftClone1.style.transform = 'translateY(-50%) scale(1.5)';
                    leftClone1.style.setProperty('opacity', '0', 'important');
                    rightClone1.style.right = '-35px';
                    rightClone1.style.transform = 'translateY(-50%) scale(1.5)';
                    rightClone1.style.setProperty('opacity', '0', 'important');
                    
                    leftClone2.style.left = '-70px';
                    leftClone2.style.transform = 'translateY(-50%) scale(2)';
                    leftClone2.style.setProperty('opacity', '0', 'important');
                    rightClone2.style.right = '-70px';
                    rightClone2.style.transform = 'translateY(-50%) scale(2)';
                    rightClone2.style.setProperty('opacity', '0', 'important');
                });
                
                // Удаляем дубликаты скобок и плавно исчезаем
                setTimeout(() => {
                    const clones = [leftClone1, rightClone1, leftClone2, rightClone2];
                    clones.forEach(clone => clone.remove());
                    
                    // Плавное исчезновение всей кнопки
                    choiseButton.style.setProperty('transition', 'opacity 0.8s ease-out', 'important');
                    choiseButton.style.setProperty('opacity', '0', 'important');
                    
                    // Удаляем кнопку из верстки после исчезновения
                    setTimeout(() => {
                        if (choiseButton && choiseButton.parentNode) {
                            choiseButton.remove();
                        }
                    }, 800);
                }, 550);
            }
        });
    }
}
initChoiseButton()

// --- Three.js and controls imports ---
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';