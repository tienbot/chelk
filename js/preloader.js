// Прелоадер: логика и экспорт функции запуска
let preloaderHasRun = false;
const soundAudioCache = {
  chelk: new Audio('audio/chelk.mp3'),
  music: new Audio('audio/music.mp3'),
};
Object.values(soundAudioCache).forEach((audio) => {
  audio.preload = 'auto';
  audio.load();
});

export function runPreloader({ onComplete }) {
  const loadingSection = document.querySelector('section.loading');
  const tensElement = document.getElementById('tens');
  const unitsElement = document.getElementById('units');

  const preloaderState = {
    windowLoaded: false,
    modelLoaded: false,
    modelProgress: 0,
    modelTotal: 0,
    waitTasks: [],
  }
  let displayedPercent = 0;
  let targetPercent = 0;
  let animationFrame = null;
  let finished = false;
  let soundBtnClicked = false;
  const MAX_WAIT_MS = 15000;

  function animateDigit(element, newValue) {
    const oldValue = element.textContent;
    if (oldValue === newValue.toString()) return;
    element.textContent = newValue;
  }

  function renderPercent(value) {
    const percent = Math.min(99, Math.max(0, Math.round(value)));
    const tens = Math.floor(percent / 10);
    const units = percent % 10;
    if (tensElement.textContent !== tens.toString()) {
      animateDigit(tensElement, tens);
    }
    if (unitsElement.textContent !== units.toString()) {
      animateDigit(unitsElement, units);
    }
  }

  function setLoadingPercent(p) {
    const percent = Math.min(99, Math.max(0, Math.round(p)));
    if (percent > targetPercent) {
      targetPercent = percent;
    }
  }

  function getCombinedProgress() {
    const windowFraction = preloaderState.windowLoaded ? 1 : 0;
    const modelFraction = preloaderState.modelLoaded
      ? 1
      : preloaderState.modelTotal > 0
      ? Math.min(1, preloaderState.modelProgress / preloaderState.modelTotal)
      : 0;
    return (windowFraction + modelFraction) / 2;
  }

  function updatePreloaderProgress() {
    setLoadingPercent(getCombinedProgress() * 100);
  }

  function reportModelProgress(loaded, total) {
    preloaderState.modelProgress = loaded;
    preloaderState.modelTotal = total || preloaderState.modelTotal;
    updatePreloaderProgress();
  }

  function markModelLoaded() {
    preloaderState.modelLoaded = true;
    if (!preloaderState.modelTotal) preloaderState.modelTotal = preloaderState.modelProgress || 1;
    updatePreloaderProgress();
    tryFinishPreloader();
  }

  function addWaitTask(task) {
    if (!task || typeof task.then !== 'function') return;
    const tracker = { done: false };
    preloaderState.waitTasks.push(tracker);
    Promise.resolve(task)
      .catch(() => {})
      .finally(() => {
        tracker.done = true;
        tryFinishPreloader();
      });
  }

  function areWaitTasksComplete() {
    return preloaderState.waitTasks.every((tracker) => tracker.done);
  }

  function markWindowLoaded() {
    preloaderState.windowLoaded = true;
    updatePreloaderProgress();
    tryFinishPreloader();
  }

  function tryFinishPreloader() {
    if (finished) return;
    if (preloaderState.windowLoaded && preloaderState.modelLoaded && areWaitTasksComplete()) {
      setTimeout(finishPreloader, 300);
    }
  }

  if (typeof window !== 'undefined') {
    window.preloader = window.preloader || {};
    const queued = Array.isArray(window.preloader._queue) ? window.preloader._queue.slice() : [];
    window.preloader.reportModelProgress = reportModelProgress;
    window.preloader.markModelLoaded = markModelLoaded;
    window.preloader.markWindowLoaded = markWindowLoaded;
    window.preloader.addWaitTask = addWaitTask;
    if (queued.length > 0) {
      window.preloader._queue = [];
      queued.forEach((item) => {
        const [name, ...args] = item;
        if (typeof window.preloader[name] === 'function') {
          window.preloader[name](...args);
        }
      });
    }
  }

  function animateProgress() {
    if (finished) return;
    if (displayedPercent < targetPercent) {
      displayedPercent += 1;
      renderPercent(displayedPercent);
    }
    animationFrame = requestAnimationFrame(animateProgress);
  }

  function finishPreloader() {
    if (finished) return;
    finished = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    targetPercent = 99;
    displayedPercent = 99;
    renderPercent(99);
    const mainSection = document.getElementById('main-section');
    if (mainSection) {
      mainSection.classList.remove('visible');
      mainSection.style.opacity = '0';
    }
    if (onComplete) {
      Promise.resolve(onComplete()).then(() => {
        setTimeout(() => {
          hideLoading();
        }, 300);
      });
    } else {
      setTimeout(() => {
        hideLoading();
      }, 300);
    }
  }

  function hideLoading() {
    loadingSection.classList.add('hide');
    // Плавно показать основной контент только после исчезновения прелоадера
    setTimeout(() => {
      // Скрыть все элементы, кроме svg-background и показать soundOverlay
      const mainSection = document.getElementById('main-section');
      if (mainSection) {
        mainSection.style.opacity = '';
        // Скрыть текст, карусель, элементы управления
        mainSection.querySelectorAll('.carousel, .text-overlay, .controls-wrapper').forEach(el => {
          el.classList.add('hidden-on-start');
        });
        // svg-background показать
        const svgBg = mainSection.querySelector('.svg-background');
        if (svgBg) {
          svgBg.classList.add('visible');
        }
      }
      // Показать soundOverlay
      const soundOverlay = document.getElementById('soundOverlay');
      const soundBtn = document.getElementById('soundBtn');
      const soundDescr = document.getElementById('soundDescr');
      const svgBg = mainSection ? mainSection.querySelector('.svg-background') : null;
      if (soundOverlay && soundBtn) {
        soundOverlay.style.display = 'block';
        // Сначала svg-background
        if (svgBg) svgBg.classList.add('visible');
        // Затем с задержкой появляется soundBtn
        setTimeout(() => {
          soundBtn.classList.add('visible');
          soundDescr.classList.add('visible');
        }, 700);
      }
      loadingSection.style.display = 'none';
    }, 850);

    // Обработчик для кнопки sound
    setTimeout(() => {
      const soundBtn = document.getElementById('soundBtn');
      const soundDescr = document.getElementById('soundDescr');
      const header = document.getElementById('header');
      const carousel = document.getElementById('carousel');
      const choiseBtn = document.getElementById('choiseBtn');
      const slideCenter = document.querySelector('.slide.center');
      const slideLeft = document.querySelector('.slide.left');
      const slideRight = document.querySelector('.slide.right');
      
      if (soundBtn) {
        soundBtn.onclick = () => {
          if (soundBtnClicked) return;
          soundBtnClicked = true;
          soundBtn.disabled = true;
          soundBtn.classList.add('disabled');

          // Play background music (user gesture allows autoplay)
          try {
            // play chelk once and a looping background music
            const chelkAudio = soundAudioCache.chelk;
            chelkAudio.loop = false;
            chelkAudio.currentTime = 0;
            chelkAudio.play().catch((err) => console.warn('chelk playback failed:', err));

            const music = soundAudioCache.music;
            music.loop = true;
            music.currentTime = 0;
            // small startup delay so playback begins 0.1s after click
            window.bgAudio = music;
            setTimeout(() => {
              music.play().catch((err) => console.warn('music playback failed:', err));
            }, 500);

            // expose for debugging/control: bgAudio refers to looping music
            window.chelkAudio = chelkAudio;

            // Log current mainObject text to console on sound button click
            try {
              const mainObj = document.getElementById('mainObject');
              if (mainObj) console.log('mainObject on soundBtn:', mainObj.textContent);
            } catch (e) {
              console.warn('Failed to read #mainObject:', e);
            }
          } catch (e) {
            console.warn('Failed to start music:', e);
          }
          // Плавно показать все элементы
          const mainSection = document.getElementById('main-section');
          if (mainSection) {

            // If the carousel is not already prepared, build it now.
            if (!window.carouselBuildPromise) {
              try {
                window.carouselBuildPromise = import('./script.js').then((script) => {
                  if (script && script.buildCarousel) {
                    return script.buildCarousel();
                  }
                  return Promise.resolve();
                }).catch((e) => {
                  console.warn('Failed to import script for buildCarousel:', e);
                });
              } catch (e) {
                console.warn('Error scheduling buildCarousel:', e);
              }
            }

            setTimeout(() => {
              mainSection.classList.add('visible');
              mainSection.style.opacity = '';
              mainSection.querySelectorAll('.carousel, .text-overlay, .controls-wrapper').forEach(el => {
                  // show header after small delay
                  setTimeout(() => {
                    const header = document.getElementById('header');
                    if (header) {
                      header.classList.add('visible');
                      header.style.opacity = '';
                    }
                  }, 900);

                  setTimeout(() => {
                    const carousel = document.getElementById('carousel');
                    if (carousel) {
                      carousel.classList.add('visible');
                      carousel.style.opacity = '';
                    }

                    // slides are created by buildCarousel; query them fresh
                    const slideCenter = document.querySelector('.slide.center');
                    if (slideCenter) {
                      slideCenter.classList.add('visible');
                      slideCenter.style.opacity = '';
                    }

                      // If element is controls-wrapper, also mark it visible
                      el.classList.add('show-after-sound');
                      el.classList.remove('hidden-on-start');
                      if (el.classList && el.classList.contains('controls-wrapper')) {
                        el.classList.add('visible');
                      }
                  }, 2400);
                  
                  setTimeout(() => {
                    const slideLeft = document.querySelector('.slide.left');
                    const slideRight = document.querySelector('.slide.right');
                    if (slideLeft) {
                      slideLeft.classList.add('visible');
                      slideLeft.style.opacity = '';
                    }
                    if (slideRight) {
                      slideRight.classList.add('visible');
                      slideRight.style.opacity = '';
                    }

                    const choiseBtn = document.getElementById('choiseBtn');
                    if (choiseBtn) {
                      choiseBtn.classList.add('visible');
                      choiseBtn.style.opacity = '';
                    }

                    // When user confirms choice, fade out side slides, controls, text and svg, then remove from DOM
                    if (choiseBtn) {
                      choiseBtn.addEventListener('click', () => {
                        // show the scroll-section when user confirms choice
                        try {
                          const scrollSec = document.querySelector('.scroll-section');
                          if (scrollSec) {
                            scrollSec.classList.add('visible');
                          }
                        } catch (e) {}

                        const slideLeft = document.querySelector('.slide.left');
                        const slideRight = document.querySelector('.slide.right');
                        const controls = document.querySelector('.controls-wrapper');
                        const textOverlay = document.querySelector('.text-overlay');
                        const svgBg = document.querySelector('.svg-background');

                        const targets = [slideLeft, slideRight, controls, textOverlay, svgBg].filter(Boolean);
                        // start fade animation on elements and their canvases (WebGL canvas needs explicit transition)
                        // enable wheel-scaling for center model when user confirms
                        try {
                          import('./script.js').then((m) => {
                            if (m && m.enableCenterScrollScale) m.enableCenterScrollScale();
                          }).catch(() => {});
                        } catch (e) {}

                        targets.forEach((el) => {
                          el.classList.add('fade-out');
                          // also fade any canvas inside the element to ensure smooth WebGL fade
                          try {
                            const canvases = el.querySelectorAll && el.querySelectorAll('canvas');
                            if (canvases && canvases.length) {
                              canvases.forEach((c) => {
                                c.classList.add('fade-out');
                                c.style.transition = 'opacity 1.6s cubic-bezier(0.4,0,0.2,1)';
                              });
                            }
                          } catch (e) {
                            // ignore
                          }
                        });

                        // After transition, remove elements from DOM
                        const REMOVE_DELAY = 1700; // match CSS transition duration (1.6s) + small buffer
                        setTimeout(() => {
                          targets.forEach((el) => {
                            try {
                              if (el && el.parentNode) el.parentNode.removeChild(el);
                            } catch (e) {
                              console.warn('Failed to remove element after fade:', e);
                            }
                          });
                        }, REMOVE_DELAY);
                      }, { once: true });
                    }
                  }, 4000);
              });

            }, 400);


            // Масштабируем svg-background
            const svgBg = mainSection.querySelector('.svg-background');
            if (svgBg) svgBg.classList.add('scale-full');
          }
          soundBtn.classList.remove('visible');
          soundDescr.classList.remove('visible');
          setTimeout(() => {
            const soundOverlay = document.getElementById('soundOverlay');
            if (soundOverlay) soundOverlay.style.display = 'none';
          }, 800);
        };
      }
      // Music toggle button: плавное затухание и повторное проигрывание с начала
      const musicToggleBtn = document.getElementById('musicToggleBtn');
      function fadeOutAndStop(audio, duration = 800) {
        if (!audio) return;
        const initialVolume = Number.isFinite(audio.volume) ? audio.volume : 1;
        const steps = 20;
        const stepTime = Math.max(10, Math.round(duration / steps));
        let currentStep = 0;
        const fadeInterval = setInterval(() => {
          currentStep++;
          const newVol = Math.max(0, initialVolume * (1 - currentStep / steps));
          audio.volume = newVol;
          if (currentStep >= steps) {
            clearInterval(fadeInterval);
            try { audio.pause(); } catch (e) {}
            try { audio.currentTime = 0; } catch (e) {}
            audio.volume = 1;
          }
        }, stepTime);
      }
      if (musicToggleBtn) {
        musicToggleBtn.onclick = () => {
          try {
            const chelkAudio = new Audio('audio/chelk.mp3');
            chelkAudio.loop = false;
            chelkAudio.play().catch((err) => console.warn('chelk playback failed:', err));
          } catch (e) {
            console.warn('Failed to play chelk audio:', e);
          }

          const audio = window.bgAudio;
          if (audio && !audio.paused) {
            fadeOutAndStop(audio, 800);
          } else {
            try {
              // same behavior as soundBtn: play chelk once and looping music with delay
              const music = new Audio('audio/music.mp3');
              music.loop = true;
              // expose before starting so other handlers can reference
              window.bgAudio = music;
              setTimeout(() => {
                music.play().catch((err) => console.warn('music playback failed:', err));
              }, 500);
            } catch (e) {
              console.warn('Failed to start music:', e);
            }
          }
        };
      }

      const phoneLink = document.querySelector('a[href="tel:+79162077558"]');
      if (phoneLink) {
        phoneLink.addEventListener('click', () => {
          try {
            const chelkAudio = new Audio('audio/chelk.mp3');
            chelkAudio.loop = false;
            chelkAudio.play().catch((err) => console.warn('chelk playback failed:', err));
          } catch (e) {
            console.warn('Failed to play chelk audio on phone click:', e);
          }
        });
      }
    }, 900);
  }

  // Ждем полной загрузки window, затем запускаем анимацию прогресса
  function startPreloader() {
    animateProgress();
    setTimeout(() => {
      if (!finished) {
        preloaderState.windowLoaded = true;
        preloaderState.modelLoaded = true;
        finishPreloader();
      }
    }, MAX_WAIT_MS);
  }

  if (document.readyState === 'complete') {
    markWindowLoaded();
    if (preloaderHasRun) {
      markModelLoaded();
    }
    startPreloader();
  } else {
    window.addEventListener('load', () => {
      markWindowLoaded();
      startPreloader();
    });
  }
  preloaderHasRun = true;
}

if (typeof window !== 'undefined') {
  window.runPreloader = window.runPreloader || runPreloader;
  window.preloader = window.preloader || {};
  window.preloader.addWaitTask = window.preloader.addWaitTask || addWaitTask;
}
