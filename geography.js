const viewport = document.querySelector("#mapViewport");
const world = document.querySelector("#worldMap");
const details = document.querySelector("#placeDetails");
const zoomIn = document.querySelector("#zoomIn");
const zoomOut = document.querySelector("#zoomOut");
const zoomReset = document.querySelector("#zoomReset");
const teamByName = new Map(
  (window.STICKERBOOK_DATA?.team ?? []).map(member => [member.name.trim(), member.id])
);
const zoomLevels = [1, 2, 4, 8, 16];
let zoomIndex = 0;
let selectedMarker;

function setZoom(index) {
  const previous = zoomLevels[zoomIndex];
  const next = zoomLevels[index];
  const halfWidth = viewport.clientWidth / 2;
  const halfHeight = viewport.clientHeight / 2;
  const centerX = (viewport.scrollLeft + halfWidth) / previous;
  const centerY = (viewport.scrollTop + halfHeight) / previous;

  zoomIndex = index;
  world.style.width = `${next * 100}%`;
  viewport.scrollLeft = centerX * next - halfWidth;
  viewport.scrollTop = centerY * next - halfHeight;
  zoomIn.disabled = index === zoomLevels.length - 1;
  zoomOut.disabled = zoomReset.disabled = index === 0;
}

function showPlace(place, label, marker) {
  selectedMarker?.setAttribute("aria-pressed", "false");
  marker.setAttribute("aria-pressed", "true");
  selectedMarker = marker;

  const heading = document.createElement("h2");
  heading.textContent = label;
  const description = document.createElement("p");
  description.textContent = place.city ? place.country : "Город не указан";
  const names = document.createElement("ul");

  for (const name of place.members) {
    const item = document.createElement("li");
    const memberId = teamByName.get(name.trim());
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

zoomIn.addEventListener("click", () => setZoom(zoomIndex + 1));
zoomOut.addEventListener("click", () => setZoom(zoomIndex - 1));
zoomReset.addEventListener("click", () => setZoom(0));

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
  marker.textContent = members.length;
  marker.title = label;
  marker.setAttribute("aria-label", `${label} · ${members.length}`);
  marker.setAttribute("aria-controls", "placeDetails");
  marker.setAttribute("aria-pressed", "false");
  marker.addEventListener("click", () => showPlace(place, label, marker));
  world.append(marker);
}

if (world.childElementCount) {
  details.firstElementChild.textContent = "Нажми на отметку, чтобы узнать, кто оттуда.";
}
