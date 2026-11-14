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
const markers = [];
let fan;
let markerGroups = new Map();

function closeFan() {
  fan = undefined;
  arrangeMarkers();
}

function arrangeMarkers() {
  const groups = [];
  const width = world.clientWidth;
  const height = world.clientHeight;

  for (const entry of markers) {
    const near = groups.filter(group => group.some(other =>
      Math.abs(entry.x - other.x) * width < 36 &&
      Math.abs(entry.y - other.y) * height < 37
    ));
    for (const group of near) groups.splice(groups.indexOf(group), 1);
    groups.push([entry, ...near.flat()]);
  }

  markerGroups = new Map();
  for (const group of groups) {
    const lead = group.find(entry => entry.marker === selectedMarker) ?? group[0];
    const open = group.includes(fan);
    for (const entry of group) {
      const { marker, label, members } = entry;
      const stacked = group.length > 1 && !open;
      markerGroups.set(entry, group);
      marker.toggleAttribute("data-covered", stacked && entry !== lead);
      marker.toggleAttribute("data-stack", stacked && entry === lead);
      marker.toggleAttribute("data-fanned", open);
      marker.setAttribute("aria-label", stacked && entry === lead
        ? `Развернуть фотокарточки: ${group.map(item => item.label).join(", ")}`
        : `${label}: ${members.join(", ")}`);
      marker.title = stacked && entry === lead
        ? group.map(item => item.label).join(" · ")
        : label;
    }
  }
}

function openFan(entry, group, keyboard) {
  closePreview();
  fan = entry;
  arrangeMarkers();

  const gap = 45;
  const columns = Math.min(group.length, Math.max(1, Math.floor((viewport.clientWidth - 12) / gap)));
  const rows = Math.ceil(group.length / columns);
  const originX = entry.x * world.clientWidth;
  const originY = entry.y * world.clientHeight;
  const left = viewport.scrollLeft;
  const top = viewport.scrollTop;
  const startX = Math.max(left + 22, Math.min(
    originX - (columns - 1) * gap / 2,
    left + viewport.clientWidth - 22 - (columns - 1) * gap
  ));
  const startY = Math.max(top + 44, Math.min(
    originY, top + viewport.clientHeight - 6 - (rows - 1) * gap
  ));

  group.forEach((item, index) => {
    const { marker } = item;
    const column = index % columns;
    const x = startX + column * gap - item.x * world.clientWidth;
    const y = startY + Math.floor(index / columns) * gap - item.y * world.clientHeight;
    marker.style.setProperty("--fan-offset", `${x}px ${y}px`);
    marker.style.setProperty("--fan-tilt", `${(column - (columns - 1) / 2) * 12}deg`);
    if (!reducedMotion.matches) {
      marker.animate([{ translate: "0 0" }, { translate: `${x}px ${y}px` }],
        { duration: 260, easing: "cubic-bezier(.2,.75,.25,1)" });
    }
  });
  if (keyboard) entry.marker.focus({ preventScroll: true });
}

function layoutCountryLabels() {
  countryLayer.hidden = false;
  for (const label of countryLabels) label.hidden = false;

  const mapBounds = world.getBoundingClientRect();
  const occupied = [...world.querySelectorAll(".geo-marker:not([data-covered])")].map(marker => marker.getBoundingClientRect());
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
    arrangeMarkers();
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
    if (fan) closeFan();
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
let previewMarker;
let previewAnimation;

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
  previewAnimation?.cancel();
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
  previewPhotos.replaceChildren(...members.slice(0, 2).map(name => {
    const card = document.createElement("span");
    card.className = "geo-polaroid";
    const caption = document.createElement("span");
    caption.className = "geo-polaroid-caption";
    const person = document.createElement("strong");
    person.textContent = name;
    const city = document.createElement("span");
    city.textContent = label;
    caption.append(person, city);
    card.append(createPhoto(name), caption);
    return card;
  }));
  preview.setAttribute("aria-label", `Закрыть фото: ${members.slice(0, 2).join(", ")} — ${label}`);
  preview.toggleAttribute("data-pair", members.length > 1);
  preview.hidden = false;
  marker.setAttribute("aria-expanded", "true");
  if (!reducedMotion.matches) {
    const source = marker.firstElementChild.getBoundingClientRect();
    const target = preview.getBoundingClientRect();
    const x = source.left + source.width / 2 - target.left - target.width / 2;
    const y = source.top + source.height / 2 - target.top - target.height / 2;
    const startScale = Math.min(source.width / target.width, source.height / target.height);
    previewAnimation = preview.animate([
      { transform: `translate(${x}px, ${y}px) scale(${startScale}) rotate(-6deg)` },
      { transform: "none" },
    ], { duration: 350, easing: "cubic-bezier(.2,.75,.25,1)" });
  }
  if (keyboard) preview.focus({ preventScroll: true });
}

preview.addEventListener("click", event => closePreview(event.detail === 0 || document.activeElement === preview));
viewport.addEventListener("click", event => {
  if (!event.target.closest(".geo-marker")) {
    closePreview();
    if (fan) closeFan();
  }
});
preview.closest(".atlas-sheet").addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (!preview.hidden) closePreview(true);
  else if (fan) {
    const entry = fan;
    closeFan();
    (markerGroups.get(entry)?.find(item => !item.marker.hasAttribute("data-covered")) ?? entry)
      .marker.focus({ preventScroll: true });
  }
});

const countries = [...document.querySelector("#countryShapes").children];
const countryKey = name => name?.trim().toLowerCase().replaceAll("ё", "е");
const countryByName = new Map();
for (const country of countries) {
  for (const name of country.dataset.names.split("|")) countryByName.set(countryKey(name), country);
}
for (const place of window.STICKERBOOK_GEOGRAPHY) {
  const { city, country, lat, lon, members } = place;
  const label = city || country;
  if (!label || !Array.isArray(members) || !members.length ||
      !Number.isFinite(lat) || Math.abs(lat) > 90 ||
      !Number.isFinite(lon) || Math.abs(lon) > 180) continue;

  const countryCode = countryKey(place.countryCode);
  const countryName = countryKey(country);
  const region = countryByName.get(countryCode) ?? countryByName.get(countryName) ??
    countryByName.get(countryName?.split(",").at(-1).trim());
  region?.setAttribute("data-team", "");

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

  const entry = { marker, label, members, x: (lon + 180) / 360, y: (90 - lat) / 180 };
  markers.push(entry);
  const selectPlace = () => showPlace(place, label, marker, placeButton);
  marker.addEventListener("click", event => {
    const group = markerGroups.get(entry);
    if (group?.length > 1 && !group.includes(fan)) {
      openFan(entry, group, event.detail === 0);
      return;
    }
    selectPlace();
    togglePreview(marker, label, members, event.detail === 0);
  });
  placeButton.addEventListener("click", () => {
    closePreview();
    selectPlace();
    closeFan();
    focusCity(place, marker);
  });
  world.append(marker);
  placeList.append(placeButton);
}

arrangeMarkers();
layoutCountryLabels();
new ResizeObserver(() => {
  closeFan();
  layoutCountryLabels();
}).observe(viewport);

if (placeList.childElementCount) {
  details.firstElementChild.textContent = "Здесь откроется карточка выбранного города.";
}
