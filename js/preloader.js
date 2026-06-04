// Прелоадер: логика и экспорт функции запуска
export function runPreloader({ onComplete }) {
  const loadingSection = document.querySelector('section.loading');
  const tensElement = document.getElementById('tens');
  const unitsElement = document.getElementById('units');

  const TOTAL_STEPS = 1 + 3; // window + 3 glb
  let loadedSteps = 0;
  let currentPercent = 0;
  let animationFrame = null;
  let startTime = null;
  const DELAY_MS = 1000;
  let finished = false;

  function animateDigit(element, newValue) {
    const oldValue = element.textContent;
    if (oldValue === newValue.toString()) return;
    element.textContent = newValue;
  }

  function setLoadingPercent(p) {
    currentPercent = Math.max(currentPercent, p);
    let percent = Math.round(currentPercent);
    if (percent > 99) percent = 99;
    const tens = Math.floor(percent / 10);
    const units = percent % 10;
    animateDigit(unitsElement, units);
    if (percent === 0 || units === 0) {
      animateDigit(tensElement, tens);
    }
  }

  function animateProgress() {
    if (finished) return;
    const now = Date.now();
    const elapsed = now - startTime;
    let percent = Math.min(100, (elapsed / DELAY_MS) * 100);
    setLoadingPercent(percent);
    if (elapsed < DELAY_MS) {
      animationFrame = requestAnimationFrame(animateProgress);
    }
  }

  function finishPreloader() {
    finished = true;
      const mainSection = document.getElementById('main-section');
      if (mainSection) {
        mainSection.classList.remove('visible');
        mainSection.style.opacity = '0';
      }
      if (onComplete) {
        // onComplete может быть async, ждем его завершения
        Promise.resolve(onComplete()).then(() => {
          setTimeout(() => {
            hideLoading();
          }, 300);
        });
      }
  }

  function stepLoaded() {
    loadedSteps++;
    if (loadedSteps >= TOTAL_STEPS) {
      // Если загрузка завершилась раньше времени — добиваем прогресс до 100% за оставшееся время
      const now = Date.now();
      const elapsed = now - startTime;
      const left = Math.max(0, DELAY_MS - elapsed);
      setTimeout(finishPreloader, left);
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
          // Play background music (user gesture allows autoplay)
          try {
            // play chelk once and a looping background music2
            const chelkAudio = new Audio('audio/chelk.mp3');
            chelkAudio.loop = false;
            chelkAudio.play().catch((err) => console.warn('chelk playback failed:', err));

            const music2 = new Audio('audio/music2.mp3');
            music2.loop = true;
            // small startup delay so playback begins 0.1s after click
            window.bgAudio = music2;
            setTimeout(() => {
              music2.play().catch((err) => console.warn('music2 playback failed:', err));
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

            // Build carousel (create .slide elements) after user gesture so canvases get correct size
            try {
              import('./script.js').then((script) => {
                if (script && script.buildCarousel) {
                  script.buildCarousel();
                }
              }).catch((e) => console.warn('Failed to import script for buildCarousel:', e));
            } catch (e) {
              console.warn('Error scheduling buildCarousel:', e);
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
          const audio = window.bgAudio;
          if (audio && !audio.paused) {
            fadeOutAndStop(audio, 800);
          } else {
            try {
              // same behavior as soundBtn: play chelk once and looping music2 with delay
              const chelkAudio = new Audio('audio/chelk.mp3');
              chelkAudio.loop = false;
              chelkAudio.play().catch((err) => console.warn('chelk playback failed:', err));

              const music2 = new Audio('audio/music2.mp3');
              music2.loop = true;
              // expose before starting so other handlers can reference
              window.bgAudio = music2;
              window.chelkAudio = chelkAudio;
              setTimeout(() => {
                music2.play().catch((err) => console.warn('music2 playback failed:', err));
              }, 500);
            } catch (e) {
              console.warn('Failed to start music:', e);
            }
          }
        };
      }
    }, 900);
  }

  // Ждем полной загрузки window, затем запускаем анимацию прогресса
  function startPreloader() {
    startTime = Date.now();
    animateProgress();
    // Если загрузка не завершилась за DELAY_MS, всё равно завершаем
    setTimeout(() => {
      if (!finished) finishPreloader();
    }, DELAY_MS);
  }
  if (document.readyState === 'complete') {
    startPreloader();
  } else {
    window.addEventListener('load', startPreloader);
  }
}
