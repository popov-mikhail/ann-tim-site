/* ann tim — полноэкранный просмотр подробной галереи проекта */

(function () {
  "use strict";

  var page = document.querySelector("[data-project-detail]");
  var lightbox = document.querySelector("[data-detail-lightbox]");
  if (!page || !lightbox) return;

  var triggers = Array.prototype.slice.call(page.querySelectorAll("[data-detail-image]"));
  var images = triggers.map(function (trigger) {
    return trigger.querySelector(".project-detail__image");
  });
  var lightboxStage = lightbox.querySelector("[data-detail-lightbox-stage]");
  var lightboxImage = lightbox.querySelector("[data-detail-lightbox-image]");
  var lightboxCurrent = lightbox.querySelector("[data-detail-lightbox-current]");
  var closeButton = lightbox.querySelector("[data-close-detail-lightbox]");
  var prevButton = lightbox.querySelector("[data-detail-lightbox-prev]");
  var nextButton = lightbox.querySelector("[data-detail-lightbox-next]");
  var activeImage = 0;
  var request = 0;
  var pointerStart = null;
  var returnFocus = null;

  function twoDigits(number) {
    return String(number).padStart(2, "0");
  }

  function isOpen() {
    return !lightbox.hidden;
  }

  function imageSource(index) {
    return images[index].currentSrc || images[index].src;
  }

  function preload(index) {
    var image = new Image();
    image.fetchPriority = "low";
    image.src = imageSource((index + images.length) % images.length);
  }

  function showImage(index) {
    var next = (index + images.length) % images.length;
    var currentRequest = ++request;
    activeImage = next;
    lightbox.classList.add("is-loading");
    lightboxImage.src = imageSource(next);
    lightboxImage.alt = images[next].alt;
    lightboxCurrent.textContent = twoDigits(next + 1);

    function settle() {
      if (currentRequest !== request) return;
      lightbox.classList.remove("is-loading");
      preload(next + 1);
      preload(next - 1);
    }

    if (lightboxImage.complete && lightboxImage.naturalWidth > 0) {
      if (typeof lightboxImage.decode === "function") {
        lightboxImage.decode().catch(function () {}).then(settle);
      } else {
        settle();
      }
      return;
    }

    lightboxImage.addEventListener("load", settle, { once: true });
    lightboxImage.addEventListener("error", settle, { once: true });
  }

  function openLightbox(index, trigger) {
    returnFocus = trigger;
    lightbox.hidden = false;
    document.body.classList.add("is-lightbox-open");
    showImage(index);
    window.requestAnimationFrame(function () { closeButton.focus(); });
  }

  function closeLightbox() {
    if (!isOpen()) return;
    lightbox.hidden = true;
    lightbox.classList.remove("is-loading");
    document.body.classList.remove("is-lightbox-open");
    lightboxImage.removeAttribute("src");
    if (returnFocus && typeof returnFocus.focus === "function") {
      returnFocus.focus({ preventScroll: true });
    }
  }

  triggers.forEach(function (trigger, index) {
    trigger.addEventListener("click", function () { openLightbox(index, trigger); });
  });

  closeButton.addEventListener("click", closeLightbox);
  prevButton.addEventListener("click", function () { showImage(activeImage - 1); });
  nextButton.addEventListener("click", function () { showImage(activeImage + 1); });

  lightboxStage.addEventListener("pointerdown", function (event) {
    if (!event.isPrimary) return;
    pointerStart = { x: event.clientX, y: event.clientY };
  });

  lightboxStage.addEventListener("pointercancel", function () { pointerStart = null; });

  lightboxStage.addEventListener("pointerup", function (event) {
    if (!pointerStart || !event.isPrimary) return;
    var dx = event.clientX - pointerStart.x;
    var dy = event.clientY - pointerStart.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      showImage(activeImage + (dx < 0 ? 1 : -1));
    }
    pointerStart = null;
  });

  lightbox.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showImage(activeImage + (event.key === "ArrowRight" ? 1 : -1));
      return;
    }
    if (event.key !== "Tab") return;

    var controls = [closeButton, prevButton, nextButton];
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
})();
