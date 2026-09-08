import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors = [];

function filesIn(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git") return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(path, extension);
    return path.endsWith(extension) ? [path] : [];
  });
}

function localTarget(page, rawReference) {
  const reference = rawReference.trim().split(/\s+/)[0];
  if (!reference || /^(?:[a-z]+:|#|\/\/)/i.test(reference)) return null;

  const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
  let target;

  if (clean.startsWith("/ann-tim-site/")) {
    target = join(root, clean.slice("/ann-tim-site/".length));
  } else if (clean.startsWith("/")) {
    target = join(root, clean.slice(1));
  } else {
    target = resolve(dirname(page), clean);
  }

  if (clean.endsWith("/") || (existsSync(target) && statSync(target).isDirectory())) {
    target = join(target, "index.html");
  }

  return normalize(target);
}

const htmlFiles = filesIn(root, ".html");

for (const page of htmlFiles) {
  const html = readFileSync(page, "utf8");
  const label = relative(root, page);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

  if (duplicateIds.length) {
    errors.push(`${label}: повторяющиеся id: ${[...new Set(duplicateIds)].join(", ")}`);
  }

  const references = [
    ...[...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1]),
    ...[...html.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/g)]
      .flatMap((match) => match[1].split(",").map((item) => item.trim()))
  ];

  for (const reference of references) {
    const target = localTarget(page, reference);
    if (target && !existsSync(target)) {
      errors.push(`${label}: не найден ресурс ${reference}`);
    }
  }
}

const publicPages = [
  ["index.html", "https://popov-mikhail.github.io/ann-tim-site/"],
  ["projects/index.html", "https://popov-mikhail.github.io/ann-tim-site/projects/"],
  ["about/index.html", "https://popov-mikhail.github.io/ann-tim-site/about/"],
  ["publications/index.html", "https://popov-mikhail.github.io/ann-tim-site/publications/"],
  ["contacts/index.html", "https://popov-mikhail.github.io/ann-tim-site/contacts/"]
];

for (const [file, expectedUrl] of publicPages) {
  const html = readFileSync(join(root, file), "utf8");
  const requiredPatterns = [
    [/<title>[^<]+<\/title>/, "title"],
    [/<meta name="description" content="[^"]+">/, "description"],
    [/<meta property="og:title" content="[^"]+">/, "og:title"],
    [/<meta property="og:image" content="https:\/\/[^\"]+">/, "og:image"],
    [/<meta name="twitter:card" content="summary_large_image">/, "twitter:card"],
    [/<h1\b/, "h1"]
  ];

  for (const [pattern, name] of requiredPatterns) {
    if (!pattern.test(html)) errors.push(`${file}: отсутствует ${name}`);
  }

  const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  const ogUrl = html.match(/<meta property="og:url" content="([^"]+)">/)?.[1];
  if (canonical !== expectedUrl) errors.push(`${file}: неверный canonical`);
  if (ogUrl !== expectedUrl) errors.push(`${file}: неверный og:url`);
}

const projectScript = readFileSync(join(root, "assets/js/projects.js"), "utf8");
const projectKeys = [...projectScript.matchAll(/\bkey:\s*"([^"]+)"/g)].map((match) => match[1]);

for (const key of projectKeys) {
  for (let number = 1; number <= 6; number += 1) {
    const file = String(number).padStart(2, "0");
    for (const suffix of [".webp", "-thumb.webp"]) {
      const image = join(root, "assets/img/projects", key, `${file}${suffix}`);
      if (!existsSync(image)) errors.push(`projects.js: не найден ${relative(root, image)}`);
    }
  }
}

const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
for (const [, expectedUrl] of publicPages) {
  if (!sitemap.includes(`<loc>${expectedUrl}</loc>`)) {
    errors.push(`sitemap.xml: отсутствует ${expectedUrl}`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `✗ ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`✓ Проверено HTML-страниц: ${htmlFiles.length}`);
  console.log(`✓ Проверено публичных адресов: ${publicPages.length}`);
  console.log(`✓ Проверено галерей проектов: ${projectKeys.length}`);
  console.log("✓ Локальные ссылки, ресурсы и обязательные метаданные в порядке");
}
