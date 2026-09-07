/* ann tim — единая галерея проектов */

(function () {
  "use strict";

  var gallery = document.querySelector("[data-project-gallery]");
  if (!gallery) return;

  function imagePaths(key) {
    return [1, 2, 3, 4, 5].map(function (number) {
      var file = String(number).padStart(2, "0");
      return {
        full: "../assets/img/projects/" + key + "/" + file + ".webp",
        thumb: "../assets/img/projects/" + key + "/" + file + "-thumb.webp"
      };
    });
  }

  var projects = [
    {
      key: "ostrov-realized-01",
      title: "OSTROV I",
      url: "https://www.behance.net/gallery/253001777/OSTROV-REALIZED"
    },
    {
      key: "mihalkovo-park",
      title: "MIHALKOVO PARK",
      url: "https://www.behance.net/gallery/203480033/MIHALKOVO-PARK"
    },
    {
      key: "avenue-park-new",
      title: "AVENUE PARK",
      url: "https://www.behance.net/gallery/203477253/AVENUE-PARK"
    },
    {
      key: "novopesch-realized",
      title: "NOVOPESCHANAYA",
      url: "https://www.behance.net/gallery/253000679/NOVOPESCHANAYA-REALIZED"
    },
    {
      key: "ostrov-realized-02",
      title: "OSTROV II",
      url: "https://www.behance.net/gallery/252999577/OSTROV-REALIZED"
    }
  ].map(function (project) {
    project.images = imagePaths(project.key);
    return project;
  });

  var tabsBar = gallery.querySelector("[data-project-tabs]");
  var stage = gallery.querySelector("[data-project-stage]");
  var layers = Array.prototype.slice.call(gallery.querySelectorAll("[data-project-image-layer]"));
  var thumbsBar = gallery.querySelector("[data-project-thumbs]");
  var projectNumber = gallery.querySelector("[data-project-number]");
  var projectTitle = gallery.querySelector("[data-project-title]");
  var projectLink = gallery.querySelector("[data-project-link]");
  var imageCounter = gallery.querySelector("[data-image-current]");
  var prevButton = gallery.querySelector("[data-image-prev]");
  var nextButton = gallery.querySelector("[data-image-next]");
  var openLightboxButton = gallery.querySelector("[data-open-lightbox]");
  var lightbox = document.querySelector("[data-project-lightbox]");
  var lightboxStage = lightbox.querySelector("[data-lightbox-stage]");
  var lightboxImage = lightbox.querySelector("[data-lightbox-image]");
  var lightboxTitle = lightbox.querySelector("[data-lightbox-title]");
  var lightboxCounter = lightbox.querySelector("[data-lightbox-current]");
  var closeLightboxButton = lightbox.querySelector("[data-close-lightbox]");
  var lightboxPrevButton = lightbox.querySelector("[data-lightbox-prev]");
  var lightboxNextButton = lightbox.querySelector("[data-lightbox-next]");
  var activeProject = 0;
  var activeImage = 0;
  var activeLayer = 0;
  var imageRequest = 0;
  var pointerStart = null;
  var lightboxPointerStart = null;
  var lightboxReturnFocus = null;

  function twoDigits(number) {
    return String(number).padStart(2, "0");
  }

  function imageAlt(project, imageIndex) {
    return "Проект " + project.title + ", фотография " + (imageIndex + 1) + " из 5";
  }

  function preload(url) {
    var image = new Image();
    image.src = url;
  }

  function settleImage(image) {
    if (image.complete && image.naturalWidth > 0) {
      return typeof image.decode === "function" ? image.decode().catch(function () {}) : Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", reject, { once: true });
    }).then(function () {
      return typeof image.decode === "function" ? image.decode().catch(function () {}) : undefined;
    });
  }

  function syncThumbs() {
    Array.prototype.forEach.call(thumbsBar.querySelectorAll("button"), function (button, index) {
      var selected = index === activeImage;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.setAttribute("tabindex", selected ? "0" : "-1");
    });
    imageCounter.textContent = twoDigits(activeImage + 1);
  }

  function lightboxIsOpen() {
    return !lightbox.hidden;
  }

  function syncLightbox() {
    if (!lightboxIsOpen()) return;
    var project = projects[activeProject];
    lightboxImage.src = project.images[activeImage].full;
    lightboxImage.alt = imageAlt(project, activeImage);
    lightboxTitle.textContent = project.title;
    lightboxCounter.textContent = twoDigits(activeImage + 1);
    lightbox.classList.remove("is-loading");
  }

  function openLightbox() {
    lightboxReturnFocus = document.activeElement;
    lightbox.hidden = false;
    document.body.classList.add("is-lightbox-open");
    syncLightbox();
    window.requestAnimationFrame(function () { closeLightboxButton.focus(); });
  }

  function closeLightbox() {
    if (!lightboxIsOpen()) return;
    lightbox.hidden = true;
    lightbox.classList.remove("is-loading");
    document.body.classList.remove("is-lightbox-open");
    if (lightboxReturnFocus && typeof lightboxReturnFocus.focus === "function") {
      lightboxReturnFocus.focus({ preventScroll: true });
    }
  }

  function showLightboxImage(offset) {
    lightbox.classList.add("is-loading");
    showImage(activeImage + offset).then(function (changed) {
      if (!changed) lightbox.classList.remove("is-loading");
    });
  }

  function showImage(nextIndex, instant) {
    var project = projects[activeProject];
    var next = (nextIndex + project.images.length) % project.images.length;
    var nextSource = project.images[next].full;
    var request = ++imageRequest;

    activeImage = next;
    syncThumbs();
    gallery.classList.add("is-image-loading");
    if (lightboxIsOpen()) lightbox.classList.add("is-loading");

    var current = layers[activeLayer];
    if (current.getAttribute("src") === nextSource && current.naturalWidth > 0) {
      current.alt = imageAlt(project, next);
      gallery.classList.remove("is-image-loading");
      syncLightbox();
      warmNearbyImages();
      return Promise.resolve(true);
    }

    var nextLayer = layers[1 - activeLayer];
    nextLayer.classList.remove("is-active");
    nextLayer.setAttribute("aria-hidden", "true");
    nextLayer.alt = "";
    nextLayer.src = nextSource;

    return settleImage(nextLayer).then(function () {
      if (request !== imageRequest) return false;

      nextLayer.alt = imageAlt(project, next);
      nextLayer.removeAttribute("aria-hidden");
      if (instant) nextLayer.classList.add("is-instant");
      nextLayer.classList.add("is-active");
      current.classList.remove("is-active");
      current.alt = "";
      current.setAttribute("aria-hidden", "true");
      activeLayer = 1 - activeLayer;
      gallery.classList.remove("is-image-loading");
      syncLightbox();

      window.requestAnimationFrame(function () {
        nextLayer.classList.remove("is-instant");
      });
      warmNearbyImages();
      return true;
    }).catch(function () {
      if (request === imageRequest) gallery.classList.remove("is-image-loading");
      if (request === imageRequest) lightbox.classList.remove("is-loading");
      return false;
    });
  }

  function warmNearbyImages() {
    var project = projects[activeProject];
    preload(project.images[(activeImage + 1) % project.images.length].full);
    preload(project.images[(activeImage - 1 + project.images.length) % project.images.length].full);
  }

  function renderThumbs() {
    var project = projects[activeProject];
    thumbsBar.innerHTML = "";

    project.images.forEach(function (image, index) {
      var button = document.createElement("button");
      var thumbnail = document.createElement("img");
      button.type = "button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-label", "Показать фотографию " + (index + 1) + " из 5");
      button.addEventListener("click", function () { showImage(index); });

      thumbnail.src = image.thumb;
      thumbnail.alt = "";
      thumbnail.width = 480;
      thumbnail.height = 480;
      thumbnail.loading = index === 0 ? "eager" : "lazy";
      thumbnail.decoding = "async";
      button.appendChild(thumbnail);
      thumbsBar.appendChild(button);
    });
  }

  function updateHash(project) {
    if (!window.history || !window.history.replaceState) return;
    window.history.replaceState(null, "", "#" + project.key);
  }

  function centerProjectTab(tab, instant) {
    var targetLeft = tab.offsetLeft - (tabsBar.clientWidth - tab.offsetWidth) / 2;
    var left = Math.max(0, targetLeft);
    if (typeof tabsBar.scrollTo === "function") {
      tabsBar.scrollTo({ left: left, behavior: instant ? "auto" : "smooth" });
    } else {
      tabsBar.scrollLeft = left;
    }
  }

  function selectProject(nextIndex, options) {
    var settings = options || {};
    var next = (nextIndex + projects.length) % projects.length;
    var project = projects[next];
    activeProject = next;
    activeImage = 0;

    Array.prototype.forEach.call(tabsBar.querySelectorAll("button"), function (button, index) {
      var selected = index === activeProject;
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.setAttribute("tabindex", selected ? "0" : "-1");
    });

    projectNumber.textContent = twoDigits(activeProject + 1) + " / " + twoDigits(projects.length);
    projectTitle.textContent = project.title;
    projectLink.href = project.url;
    projectLink.setAttribute("aria-label", "Подробнее о проекте " + project.title + " на Behance");
    renderThumbs();
    syncThumbs();
    showImage(0, settings.instant);

    var activeTab = tabsBar.children[activeProject];
    if (activeTab) {
      centerProjectTab(activeTab, settings.instant);
      if (settings.focus) activeTab.focus({ preventScroll: true });
    }

    if (!settings.skipHash) updateHash(project);
    preload(projects[(activeProject + 1) % projects.length].images[0].full);
  }

  projects.forEach(function (project, index) {
    var button = document.createElement("button");
    var number = document.createElement("span");
    var title = document.createElement("span");
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-label", "Проект " + (index + 1) + " из " + projects.length + ": " + project.title);
    number.className = "project-tabs__number";
    number.textContent = twoDigits(index + 1);
    title.className = "project-tabs__title";
    title.textContent = project.title;
    button.appendChild(number);
    button.appendChild(title);
    button.addEventListener("click", function () { selectProject(index); });
    tabsBar.appendChild(button);
  });

  tabsBar.addEventListener("keydown", function (event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    selectProject(activeProject + (event.key === "ArrowRight" ? 1 : -1), { focus: true });
  });

  thumbsBar.addEventListener("keydown", function (event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    var next = activeImage + (event.key === "ArrowRight" ? 1 : -1);
    showImage(next).then(function () {
      var selected = thumbsBar.querySelector('[aria-selected="true"]');
      if (selected) selected.focus();
    });
  });

  prevButton.addEventListener("click", function () { showImage(activeImage - 1); });
  nextButton.addEventListener("click", function () { showImage(activeImage + 1); });
  openLightboxButton.addEventListener("click", openLightbox);
  closeLightboxButton.addEventListener("click", closeLightbox);
  lightboxPrevButton.addEventListener("click", function () { showLightboxImage(-1); });
  lightboxNextButton.addEventListener("click", function () { showLightboxImage(1); });

  stage.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showImage(activeImage + (event.key === "ArrowRight" ? 1 : -1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openLightbox();
    }
  });

  stage.addEventListener("pointerdown", function (event) {
    if (!event.isPrimary) return;
    pointerStart = { x: event.clientX, y: event.clientY };
  });

  stage.addEventListener("pointercancel", function () { pointerStart = null; });

  stage.addEventListener("pointerup", function (event) {
    if (!pointerStart || !event.isPrimary) return;
    var dx = event.clientX - pointerStart.x;
    var dy = event.clientY - pointerStart.y;
    var horizontalSwipe = Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy);
    var tap = Math.abs(dx) < 12 && Math.abs(dy) < 12;

    if (horizontalSwipe) {
      showImage(activeImage + (dx < 0 ? 1 : -1));
    } else if (tap) {
      openLightbox();
    }
    pointerStart = null;
  });

  lightboxStage.addEventListener("pointerdown", function (event) {
    if (!event.isPrimary) return;
    lightboxPointerStart = { x: event.clientX, y: event.clientY };
  });

  lightboxStage.addEventListener("pointercancel", function () { lightboxPointerStart = null; });

  lightboxStage.addEventListener("pointerup", function (event) {
    if (!lightboxPointerStart || !event.isPrimary) return;
    var dx = event.clientX - lightboxPointerStart.x;
    var dy = event.clientY - lightboxPointerStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      showLightboxImage(dx < 0 ? 1 : -1);
    }
    lightboxPointerStart = null;
  });

  lightbox.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showLightboxImage(event.key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (event.key !== "Tab") return;

    var controls = [closeLightboxButton, lightboxPrevButton, lightboxNextButton];
    var first = controls[0];
    var last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  var hashKey = window.location.hash.replace(/^#/, "");
  var initialProject = projects.findIndex(function (project) { return project.key === hashKey; });
  selectProject(initialProject === -1 ? 0 : initialProject, { instant: true, skipHash: !hashKey });
})();
