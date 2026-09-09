import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  readFileSync(join(root, "assets/data/project-details.json"), "utf8")
);
const baseUrl = "https://popov-mikhail.github.io/ann-tim-site";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderModules(project) {
  let imageNumber = 0;

  return project.modules.map((module) => {
    const start = imageNumber + 1;
    const images = module.images.map((image) => {
      imageNumber += 1;
      const eager = imageNumber === 1;
      const src = `../../assets/img/project-details/${project.slug}/${image.file}`;
      return `      <figure class="project-detail__figure">
        <button class="project-detail__open" type="button" data-detail-image
                aria-label="Открыть фотографию ${imageNumber} из ${project.imageCount} на весь экран">
          <img class="project-detail__image"
             src="${src}"
             alt="Проект ${escapeHtml(project.title)}, фотография ${imageNumber} из ${project.imageCount}"
             width="${image.width}" height="${image.height}"
             loading="${eager ? "eager" : "lazy"}"
             ${eager ? 'fetchpriority="high" ' : ""}decoding="async">
        </button>
      </figure>`;
    }).join("\n");
    const end = imageNumber;
    const layout = module.images.length > 1 ? "pair" : "single";

    return `    <section class="project-detail__module project-detail__module--${layout}"
             aria-label="Фотографии ${start}–${end}">
${images}
    </section>`;
  }).join("\n");
}

for (const project of manifest.projects) {
  const nextProject = manifest.projects.find((item) => item.slug === project.nextSlug);
  const firstImage = project.modules[0].images[0];
  const canonical = `${baseUrl}/projects/${project.slug}/`;
  const ogImage = `${baseUrl}/assets/img/project-details/${project.slug}/${firstImage.file}`;
  const description = `Фотографии интерьерного проекта ${project.title} студии ann tim.`;
  const outputDirectory = join(root, "projects", project.slug);
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(project.title)} — проекты ann tim</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:title" content="${escapeHtml(project.title)} — ann tim">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ann tim">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="${firstImage.width}">
<meta property="og:image:height" content="${firstImage.height}">
<meta property="og:image:alt" content="Проект ${escapeHtml(project.title)} студии ann tim">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="../../assets/img/favicon.png" type="image/png">
<link rel="stylesheet" href="../../assets/css/styles.css?v=22">
</head>
<body class="project-detail-page">
<a class="skip-link" href="#main">К основному содержанию</a>
<header class="site-header">
  <a class="logo" href="../../" aria-label="ann tim — на главную">
    <picture>
      <source type="image/webp"
              srcset="../../assets/img/logo-100.webp 100w, ../../assets/img/logo-200.webp 200w"
              sizes="(max-width: 860px) 50px, min(4.8vw, 92px)">
      <img src="../../assets/img/logo.png" alt="ann tim" width="238" height="194" decoding="async">
    </picture>
  </a>

  <button class="nav-toggle" type="button" data-nav-toggle
          aria-expanded="false" aria-controls="nav" aria-label="Открыть меню"><span></span></button>

  <nav class="nav" id="nav" data-nav aria-label="Основное меню">
    <ul>
      <li><a href="../" aria-current="page">ПРОЕКТЫ</a></li>
      <li><a href="../../about/">О НАС</a></li>
      <li><a href="../../publications/">ПУБЛИКАЦИИ</a></li>
      <li><a href="../../contacts/">КОНТАКТЫ</a></li>
    </ul>
  </nav>
</header>

<main class="project-detail" id="main" data-project-detail>
  <header class="project-detail__intro">
    <a class="project-detail__back" href="../"><span aria-hidden="true">←</span> Проекты</a>
    <h1 class="project-detail__title">${escapeHtml(project.title)}</h1>
    <p class="project-detail__count">${project.imageCount} кадров</p>
  </header>

  <div class="project-detail__stream">
${renderModules(project)}
  </div>

  <nav class="project-detail__navigation" aria-label="Навигация между проектами">
    <a href="../"><span aria-hidden="true">←</span> Все проекты</a>
    <a href="../${nextProject.slug}/">Следующий: ${escapeHtml(nextProject.title)} <span aria-hidden="true">→</span></a>
  </nav>
</main>

<div class="project-lightbox" data-detail-lightbox role="dialog" aria-modal="true"
     aria-labelledby="project-detail-lightbox-title" hidden>
  <header class="project-lightbox__header">
    <p class="project-lightbox__title" id="project-detail-lightbox-title">${escapeHtml(project.title)}</p>
    <button class="project-lightbox__close" type="button" data-close-detail-lightbox
            aria-label="Закрыть полноэкранный просмотр"><span aria-hidden="true"></span></button>
  </header>
  <div class="project-lightbox__stage" data-detail-lightbox-stage>
    <button class="project-lightbox__arrow project-lightbox__arrow--prev" type="button"
            data-detail-lightbox-prev aria-label="Предыдущая фотография"><span aria-hidden="true">←</span></button>
    <div class="project-lightbox__media">
      <img class="project-lightbox__image" data-detail-lightbox-image alt="" decoding="async">
    </div>
    <button class="project-lightbox__arrow project-lightbox__arrow--next" type="button"
            data-detail-lightbox-next aria-label="Следующая фотография"><span aria-hidden="true">→</span></button>
  </div>
  <p class="project-lightbox__counter" aria-live="polite">
    <span data-detail-lightbox-current>01</span><span aria-hidden="true"> / </span><span>${project.imageCount}</span>
  </p>
</div>

<script src="../../assets/js/main.js?v=6" defer></script>
<script src="../../assets/js/project-detail.js?v=1" defer></script>
</body>
</html>
`;

  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory, "index.html"), html);
  console.log(`✓ ${project.slug}: ${project.imageCount} изображений`);
}
