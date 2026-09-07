/* ann tim — карусель на главной и меню на мобильных */

(function () {
  "use strict";

  /* ---------------------------------------------------------- карусель -- */

  var hero = document.querySelector("[data-carousel]");

  if (hero) {
    var slides = Array.prototype.slice.call(hero.querySelectorAll(".slide"));
    var dots = Array.prototype.slice.call(hero.querySelectorAll(".hero__dots button"));
    var mobileView = window.matchMedia("(max-width: 860px)");
    var index = 0;
    var timer = null;
    var switchRequest = 0;
    var leavingTimer = null;
    var DELAY = 6000;   // пауза между кадрами, мс
    var IMAGE_WAIT_TIMEOUT = 10000;
    var FADE_CLEANUP_DELAY = 1200;

    function available(items) {
      if (mobileView.matches) return items;
      return items.filter(function (item) {
        return !item.hasAttribute("data-mobile-only");
      });
    }

    function syncAvailability(currentSlides, currentDots) {
      slides.forEach(function (slide) {
        var isAvailable = currentSlides.indexOf(slide) !== -1;
        slide.hidden = !isAvailable;
        if (!isAvailable) {
          slide.classList.remove("is-active", "is-leaving");
          slide.setAttribute("aria-hidden", "true");
        }
      });

      dots.forEach(function (dot) {
        dot.hidden = currentDots.indexOf(dot) === -1;
      });
    }

    function afterNextPaint(callback) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(callback);
      });
    }

    function prepareImage(slide) {
      var image = slide && slide.querySelector("img");
      if (!image) return Promise.resolve(true);

      image.setAttribute("loading", "eager");

      return new Promise(function (resolve) {
        var settled = false;
        var timeout = window.setTimeout(function () { finish(false); }, IMAGE_WAIT_TIMEOUT);

        function cleanup() {
          window.clearTimeout(timeout);
          image.removeEventListener("load", onLoad);
          image.removeEventListener("error", onError);
        }

        function finish(ready) {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(ready);
        }

        function finishAfterPaint() {
          afterNextPaint(function () { finish(image.naturalWidth > 0); });
        }

        function decodeLoadedImage() {
          if (typeof image.decode !== "function") {
            finishAfterPaint();
            return;
          }

          image.decode().then(finishAfterPaint, finishAfterPaint);
        }

        function onLoad() { decodeLoadedImage(); }
        function onError() { finish(false); }

        if (image.complete) {
          image.naturalWidth > 0 ? decodeLoadedImage() : finish(false);
        } else {
          image.addEventListener("load", onLoad);
          image.addEventListener("error", onError);
        }
      });
    }

    function warmFollowingImages(currentSlides, activeIndex) {
      [1, 2].forEach(function (offset) {
        var slide = currentSlides[(activeIndex + offset) % currentSlides.length];
        var image = slide && slide.querySelector("img");
        if (!image) return;
        image.setAttribute("loading", "eager");
        if (image.complete && image.naturalWidth > 0 && typeof image.decode === "function") {
          image.decode().catch(function () {});
        }
      });
    }

    function activateSlide(currentSlides, currentDots, nextIndex) {
      var nextSlide = currentSlides[nextIndex];
      var activeSlide = hero.querySelector(".slide.is-active");

      window.clearTimeout(leavingTimer);
      slides.forEach(function (slide) { slide.classList.remove("is-leaving"); });

      if (activeSlide && activeSlide !== nextSlide) {
        activeSlide.classList.remove("is-active");
        activeSlide.classList.add("is-leaving");
        activeSlide.setAttribute("aria-hidden", "true");
      }

      nextSlide.classList.remove("is-leaving");
      nextSlide.classList.add("is-active");
      nextSlide.setAttribute("aria-hidden", "false");

      slides.forEach(function (slide) {
        if (slide !== nextSlide && slide !== activeSlide) {
          slide.classList.remove("is-active");
          slide.setAttribute("aria-hidden", "true");
        }
      });

      currentDots.forEach(function (dot, dotIndex) {
        var isActive = dotIndex === nextIndex;
        dot.setAttribute("aria-selected", isActive ? "true" : "false");
        dot.setAttribute("tabindex", isActive ? "0" : "-1");
        dot.setAttribute("aria-label", "Кадр " + (dotIndex + 1) + " из " + currentDots.length);
      });

      if (activeSlide && activeSlide !== nextSlide) {
        leavingTimer = window.setTimeout(function () {
          activeSlide.classList.remove("is-leaving");
        }, FADE_CLEANUP_DELAY);
      }
    }

    function show(next) {
      var currentSlides = available(slides);
      var currentDots = available(dots);
      var nextIndex = (next + currentSlides.length) % currentSlides.length;
      var nextSlide = currentSlides[nextIndex];
      var request = ++switchRequest;

      syncAvailability(currentSlides, currentDots);

      if (nextSlide.classList.contains("is-active")) {
        index = nextIndex;
        activateSlide(currentSlides, currentDots, index);
        return prepareImage(nextSlide).then(function (ready) {
          if (ready && request === switchRequest) warmFollowingImages(currentSlides, index);
          return ready && request === switchRequest;
        });
      }

      // Не убираем текущий кадр, пока Safari не загрузил и не декодировал новый.
      return prepareImage(nextSlide).then(function (ready) {
        if (!ready || request !== switchRequest) return false;
        if (available(slides).indexOf(nextSlide) === -1) return false;

        index = nextIndex;
        activateSlide(currentSlides, currentDots, index);
        warmFollowingImages(currentSlides, index);
        return true;
      });
    }

    function play() {
      if (available(slides).length < 2) return;
      stop();
      timer = window.setInterval(function () { show(index + 1); }, DELAY);
    }

    function stop() {
      if (timer) { window.clearInterval(timer); timer = null; }
    }

    function goTo(next) {
      var transition = show(next);
      play();
      return transition;
    }

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        var dotIndex = available(dots).indexOf(dot);
        if (dotIndex !== -1) goTo(dotIndex);
      });
    });

    // Стрелки на клавиатуре, когда фокус на точках
    hero.querySelector(".hero__dots").addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(e.key === "ArrowRight" ? index + 1 : index - 1).then(function (changed) {
          if (changed) available(dots)[index].focus();
        });
      }
    });

    // Пауза только над самими точками: карусель занимает почти весь
    // экран, и пауза по наведению на неё останавливала бы слайд-шоу
    // практически всегда.
    var dotsBar = hero.querySelector(".hero__dots");
    dotsBar.addEventListener("mouseenter", stop);
    dotsBar.addEventListener("mouseleave", play);

    // Пауза, пока пользователь листает с клавиатуры
    hero.addEventListener("focusin", stop);
    hero.addEventListener("focusout", play);

    // Пауза, пока вкладка неактивна
    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : play();
    });

    // Свайп и невидимые зоны тапа на мобильных: слева — назад, справа — вперёд.
    var startX = null;
    var startY = null;
    hero.addEventListener("touchstart", function (e) {
      if (e.target.closest && e.target.closest(".hero__dots")) {
        startX = null;
        startY = null;
        return;
      }

      startX = e.changedTouches[0].clientX;
      startY = e.changedTouches[0].clientY;
      stop();
    }, { passive: true });

    hero.addEventListener("touchcancel", function () {
      startX = null;
      startY = null;
      play();
    }, { passive: true });

    hero.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var touch = e.changedTouches[0];
      var dx = touch.clientX - startX;
      var dy = touch.clientY - startY;
      var isHorizontalSwipe = Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy);
      var isTap = Math.abs(dx) < 12 && Math.abs(dy) < 12;
      var handled = false;

      if (isHorizontalSwipe) {
        goTo(dx < 0 ? index + 1 : index - 1);
        handled = true;
      } else if (mobileView.matches && isTap) {
        var heroRect = hero.getBoundingClientRect();
        var goForward = touch.clientX >= heroRect.left + heroRect.width / 2;
        goTo(goForward ? index + 1 : index - 1);
        handled = true;
      }

      startX = null;
      startY = null;
      if (!handled) play();
    }, { passive: true });

    function switchVersion() {
      stop();
      switchRequest += 1;
      window.clearTimeout(leavingTimer);
      slides.forEach(function (slide) { slide.classList.remove("is-leaving"); });
      show(0);
      play();
    }

    if (mobileView.addEventListener) {
      mobileView.addEventListener("change", switchVersion);
    } else {
      mobileView.addListener(switchVersion);
    }

    show(0);
    play();
  }

  /* ------------------------------------------------ меню на мобильных -- */

  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");

  if (toggle && nav) {
    function closeNav() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Открыть меню");
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      document.body.style.overflow = open ? "hidden" : "";
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeNav();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        closeNav();
        toggle.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) closeNav();
    });
  }

  /* --------------------------------------- переходы между страницами -- */

  var pageLeaveTimer = null;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!e.target.closest) return;

    var link = e.target.closest("a");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

    var rawHref = link.getAttribute("href");
    if (!rawHref || rawHref.charAt(0) === "#") return;

    var targetUrl = new URL(link.href, window.location.href);
    var localNavigation = targetUrl.protocol === "file:" || targetUrl.origin === window.location.origin;
    if (!localNavigation || (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:" && targetUrl.protocol !== "file:")) return;

    var sameDocument = targetUrl.pathname === window.location.pathname &&
                       targetUrl.search === window.location.search;
    if (sameDocument && targetUrl.hash) return;
    if (sameDocument) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    window.clearTimeout(pageLeaveTimer);
    document.body.classList.add("is-page-leaving");

    var delay = reducedMotion.matches ? 0 : 240;
    pageLeaveTimer = window.setTimeout(function () {
      window.location.href = targetUrl.href;
    }, delay);
  });

  window.addEventListener("pageshow", function () {
    window.clearTimeout(pageLeaveTimer);
    document.body.classList.remove("is-page-leaving");
  });
})();
