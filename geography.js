const viewport = document.querySelector("#mapViewport");
const world = document.querySelector("#worldMap");
const details = document.querySelector("#placeDetails");
const zoomIn = document.querySelector("#zoomIn");
const zoomOut = document.querySelector("#zoomOut");
const zoomReset = document.querySelector("#zoomReset");
const teamByName = new Map(
  (window.STICKERBOOK_DATA?.team ?? []).map(member => [member.name.trim(), member])
);
const maxScale = 16;
let scale = 1;
let labelsFrame;
let selectedMarker;
let selectedPlaceButton;

const placeList = document.querySelector("#placeList");

const countryLayer = document.querySelector("#countryLabels");
const countryLabels = [...countryLayer.children];

function layoutCountryLabels() {
  countryLayer.hidden = false;
  for (const label of countryLabels) label.hidden = false;

  const mapBounds = world.getBoundingClientRect();
  const occupied = [...world.querySelectorAll(".geo-marker")].map(marker => marker.getBoundingClientRect());
  const labelBounds = countryLabels.map(label => label.getBoundingClientRect());
  for (const [index, box] of labelBounds.entries()) {
    const fits = box.left >= mapBounds.left && box.right <= mapBounds.right &&
      box.top >= mapBounds.top && box.bottom <= mapBounds.bottom;
    const overlaps = occupied.some(other =>
      box.left < other.right + 5 && box.right > other.left - 5 &&
      box.top < other.bottom + 3 && box.bottom > other.top - 3
    );
    countryLabels[index].hidden = !fits || overlaps;
    if (!countryLabels[index].hidden) occupied.push(box);
  }
}

function scheduleCountryLabels() {
  if (labelsFrame !== undefined) return;
  labelsFrame = requestAnimationFrame(() => {
    labelsFrame = undefined;
    layoutCountryLabels();
  });
}

function setZoom(value, from, to = from) {
  const next = Math.min(maxScale, Math.max(1, value));
  const anchor = from ?? { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 };
  const target = to ?? anchor;
  const mapX = (viewport.scrollLeft + anchor.x) / scale;
  const mapY = (viewport.scrollTop + anchor.y) / scale;

  if (scale !== next) {
    scale = next;
    world.style.width = `${next * 100}%`;
    viewport.toggleAttribute("data-zoomed", next > 1);
    zoomIn.disabled = next === maxScale;
    zoomOut.disabled = zoomReset.disabled = next === 1;
    scheduleCountryLabels();
  }
  viewport.scrollLeft = mapX * next - target.x;
  viewport.scrollTop = mapY * next - target.y;
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let focusFrame;

function cancelCityFocus() {
  if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
  focusFrame = undefined;
}

function focusCity(place, marker) {
  cancelCityFocus();
  const bounds = viewport.getBoundingClientRect();
  if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
    viewport.scrollIntoView({ block: "center", behavior: reducedMotion.matches ? "instant" : "smooth" });
  }

  const halfWidth = viewport.clientWidth / 2;
  const halfHeight = viewport.clientHeight / 2;
  const mapWidth = world.getBoundingClientRect().width / scale;
  const startScale = scale;
  const endScale = Math.max(scale, 8);
  const startX = viewport.scrollLeft;
  const startY = viewport.scrollTop;
  const cityX = mapWidth * (place.lon + 180) / 360;
  const cityY = mapWidth * (90 - place.lat) / 360;

  function move(progress) {
    const next = startScale + (endScale - startScale) * progress;
    setZoom(next);
    viewport.scrollLeft = startX + (cityX * endScale - halfWidth - startX) * progress;
    viewport.scrollTop = startY + (cityY * endScale - halfHeight + 18 - startY) * progress;
  }

  function highlight() {
    if (reducedMotion.matches) return;
    marker.animate([
      { filter: "drop-shadow(0 0 2px #e5b14f)" },
      { filter: "drop-shadow(0 0 8px #e5b14f)" },
      { filter: "drop-shadow(0 0 2px #e5b14f)" },
      { filter: "none" },
    ], { duration: 1150 });
  }

  if (reducedMotion.matches) {
    move(1);
    return;
  }

  let started;
  function frame(now) {
    started ??= now;
    const progress = Math.min((now - started) / 600, 1);
    move(1 - (1 - progress) ** 3);
    focusFrame = progress < 1 ? requestAnimationFrame(frame) : undefined;
    if (progress === 1) highlight();
  }
  focusFrame = requestAnimationFrame(frame);
}

function showPlace(place, label, marker, placeButton) {
  selectedPlaceButton?.setAttribute("aria-pressed", "false");
  placeButton.setAttribute("aria-pressed", "true");
  selectedPlaceButton = placeButton;
  selectedMarker?.setAttribute("aria-pressed", "false");
  marker.setAttribute("aria-pressed", "true");
  selectedMarker = marker;

  const heading = document.createElement("h3");
  heading.textContent = label;
  const description = document.createElement("p");
  description.textContent = place.city ? place.country : "Город не указан";
  const names = document.createElement("ul");

  for (const name of place.members) {
    const item = document.createElement("li");
    const memberId = teamByName.get(name.trim())?.id;
    if (memberId) {
      const link = document.createElement("a");
      link.href = `member.html?id=${encodeURIComponent(memberId)}`;
      link.textContent = name;
      item.append(link);
    } else {
      item.textContent = name;
    }
    names.append(item);
  }

  details.replaceChildren(heading, description, names);
}

const pointers = new Map();
let dragged = false;

function mapPoint(event) {
  const bounds = viewport.getBoundingClientRect();
  return {
    x: event.clientX - bounds.left - viewport.clientLeft,
    y: event.clientY - bounds.top - viewport.clientTop,
  };
}

function pinchGeometry() {
  const [first, second] = pointers.values();
  return {
    center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
    distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)),
  };
}

viewport.addEventListener("pointerdown", event => {
  if (event.button !== 0 || pointers.size >= 2) return;
  cancelCityFocus();
  if (!pointers.size) dragged = false;
  const point = mapPoint(event);
  pointers.set(event.pointerId, { ...point, start: point });
  if (pointers.size === 2) {
    dragged = true;
    for (const id of pointers.keys()) viewport.setPointerCapture(id);
    viewport.setAttribute("data-dragging", "");
  }
});

window.addEventListener("pointermove", event => {
  const previous = pointers.get(event.pointerId);
  if (!previous) return;
  const point = mapPoint(event);
  const before = pointers.size === 2 ? pinchGeometry() : undefined;
  pointers.set(event.pointerId, { ...point, start: previous.start });

  if (before) {
    const after = pinchGeometry();
    setZoom(scale * after.distance / before.distance, before.center, after.center);
    return;
  }
  if (scale === 1) return;
  if (!dragged) {
    if (Math.hypot(point.x - previous.start.x, point.y - previous.start.y) < 5) return;
    dragged = true;
    viewport.setPointerCapture(event.pointerId);
    viewport.setAttribute("data-dragging", "");
    viewport.scrollLeft += previous.start.x - point.x;
    viewport.scrollTop += previous.start.y - point.y;
    return;
  }

  viewport.scrollLeft += previous.x - point.x;
  viewport.scrollTop += previous.y - point.y;
});

function endPointer(event) {
  if (!pointers.delete(event.pointerId)) return;
  if (!pointers.size) viewport.removeAttribute("data-dragging");
}

window.addEventListener("pointerup", endPointer);
window.addEventListener("pointercancel", endPointer);
viewport.addEventListener("lostpointercapture", event => {
  if (event.target === viewport) endPointer(event);
});
viewport.addEventListener("click", event => {
  if (dragged && event.detail !== 0) event.stopPropagation();
}, true);

viewport.addEventListener("wheel", event => {
  if (!event.deltaY) return;
  event.preventDefault();
  cancelCityFocus();
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
  const delta = Math.max(-400, Math.min(400, event.deltaY * unit));
  setZoom(scale * Math.exp(-delta * .0025), mapPoint(event));
}, { passive: false });

zoomIn.addEventListener("click", () => {
  cancelCityFocus();
  setZoom(scale * 2);
});
zoomOut.addEventListener("click", () => {
  cancelCityFocus();
  setZoom(scale / 2);
});
zoomReset.addEventListener("click", () => {
  cancelCityFocus();
  setZoom(1);
});

const preview = document.querySelector("#geoPreview");
const previewPhotos = preview.querySelector(".geo-preview-photos");
const previewLabel = preview.querySelector(".geo-preview-label");
let previewMarker;

function createPhoto(name) {
  const photo = document.createElement("span");
  photo.className = "geo-photo";
  photo.setAttribute("aria-hidden", "true");

  const initials = document.createElement("span");
  initials.textContent = name.trim().split(/\s+/).slice(0, 2)
    .map(word => word[0]).join("").toUpperCase();
  photo.append(initials);

  const avatarSrc = teamByName.get(name.trim())?.avatarSrc;
  if (avatarSrc) {
    const image = document.createElement("img");
    image.alt = "";
    image.draggable = false;
    image.decoding = "async";
    image.addEventListener("error", () => image.remove(), { once: true });
    image.src = avatarSrc;
    photo.append(image);
  }
  return photo;
}

function closePreview(restoreFocus = false) {
  if (!previewMarker) return;
  preview.hidden = true;
  previewMarker.setAttribute("aria-expanded", "false");
  if (restoreFocus) previewMarker.focus({ preventScroll: true });
  previewMarker = undefined;
}

function togglePreview(marker, label, members, keyboard) {
  if (previewMarker === marker) {
    closePreview(keyboard);
    return;
  }
  closePreview();
  previewMarker = marker;
  previewPhotos.replaceChildren(...members.slice(0, 2).map(createPhoto));
  previewLabel.textContent = label;
  preview.toggleAttribute("data-pair", members.length > 1);
  preview.hidden = false;
  marker.setAttribute("aria-expanded", "true");
  if (keyboard) preview.focus({ preventScroll: true });
}

preview.addEventListener("click", event => closePreview(event.detail === 0 || document.activeElement === preview));
viewport.addEventListener("click", event => {
  if (!event.target.closest(".geo-marker")) closePreview();
});
preview.closest(".atlas-sheet").addEventListener("keydown", event => {
  if (event.key === "Escape" && !preview.hidden) closePreview(true);
});

for (const place of window.STICKERBOOK_GEOGRAPHY) {
  const { city, country, lat, lon, members } = place;
  const label = city || country;
  if (!label || !Array.isArray(members) || !members.length ||
      !Number.isFinite(lat) || Math.abs(lat) > 90 ||
      !Number.isFinite(lon) || Math.abs(lon) > 180) continue;

  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "geo-marker";
  marker.style.left = `${(lon + 180) / 3.6}%`;
  marker.style.top = `${(90 - lat) / 1.8}%`;
  for (const name of members.slice(0, 2)) marker.append(createPhoto(name));
  marker.setAttribute("aria-expanded", "false");
  marker.title = label;
  marker.setAttribute("aria-label", `${label}: ${members.join(", ")}`);
  marker.setAttribute("aria-controls", "placeDetails");
  marker.setAttribute("aria-pressed", "false");
  const placeButton = document.createElement("button");
  placeButton.type = "button";
  placeButton.className = "geo-place";
  const placeName = document.createElement("span");
  placeName.textContent = label;
  const placeCount = document.createElement("span");
  placeCount.className = "geo-count";
  placeCount.textContent = members.length;
  placeButton.append(placeName, placeCount);
  placeButton.setAttribute("aria-controls", "placeDetails");
  placeButton.setAttribute("aria-pressed", "false");

  const selectPlace = () => showPlace(place, label, marker, placeButton);
  marker.addEventListener("click", event => {
    selectPlace();
    togglePreview(marker, label, members, event.detail === 0);
  });
  placeButton.addEventListener("click", () => {
    closePreview();
    selectPlace();
    focusCity(place, marker);
  });
  world.append(marker);
  placeList.append(placeButton);
}

layoutCountryLabels();
new ResizeObserver(layoutCountryLabels).observe(viewport);

if (placeList.childElementCount) {
  details.firstElementChild.textContent = "Здесь откроется карточка выбранного города.";
}
