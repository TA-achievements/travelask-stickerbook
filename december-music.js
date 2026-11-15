// Первый трек — 1 декабря, последний — 31 декабря.
// Формат: ["Название", "Исполнитель", "Короткая подпись", "Прямая ссылка (необязательно)"].
(() => {
  const tracks = [
    ["Let It Snow! Let It Snow! Let It Snow!", "Dean Martin", "Включить гирлянду и заварить чай."],
    ["Christmas Time Is Here", "Vince Guaraldi Trio", "Немного мягкого джаза в начале декабря."],
    ["В лесу родилась ёлочка", "Большой детский хор", "Знакомая мелодия под бумажные снежинки."],
    ["Jingle Bells", "Bing Crosby & The Andrews Sisters", "Звон бубенцов и повод подпеть с первых нот."],
    ["Dance of the Sugar Plum Fairy", "Пётр Чайковский", "Щелкунчик и звон челесты."],
    ["Carol of the Bells", "Pentatonix", "Под эту мелодию особенно красиво смотреть на огни в окнах."],
    ["Sleigh Ride", "The Ronettes", "Звон бубенцов и настроение праздничной открытки."],
    ["Кабы не было зимы", "Валентина Толкунова", "Зимний привет из Простоквашино."],
    ["The Christmas Song", "Nat King Cole", "Мягкий голос и кружка какао."],
    ["Once Upon a December", "Liz Callaway", "Вальс из «Анастасии» к окошку с зимней историей."],
    ["Rockin’ Around the Christmas Tree", "Brenda Lee", "Включить, пока мастеришь праздничный декор."],
    ["Winter Wonderland", "Ella Fitzgerald", "Лёгкий свинг под прогулку или каток."],
    ["It’s Beginning to Look a Lot Like Christmas", "Michael Bublé", "Под прогулку между праздничными витринами."],
    ["Have Yourself a Merry Little Christmas", "Judy Garland", "Для тихого вечера между праздничными делами."],
    ["A Holly Jolly Christmas", "Burl Ives", "Короткая песня, после которой хочется улыбнуться."],
    ["Santa Tell Me", "Ariana Grande", "Бодрый фон, пока шуршит упаковочная бумага."],
    ["Feliz Navidad", "José Feliciano", "Новогодний привет с другого конца света."],
    ["River", "Joni Mitchell", "Для тихого вечера с тёплым пледом."],
    ["Last Christmas", "Wham!", "Для тех, кто готов подпевать с первых нот."],
    ["Underneath the Tree", "Kelly Clarkson", "Бодрая песня для дня, когда наряжаешь ёлку."],
    ["Skating", "Vince Guaraldi Trio", "Лёгкое фортепиано для зимнего пазла."],
    ["Santa Claus Is Comin’ to Town", "The Jackson 5", "Саундтрек к примерке праздничного наряда."],
    ["Believe", "Josh Groban", "Музыка из «Полярного экспресса»."],
    ["Step Into Christmas", "Elton John", "На одну песню можно отложить дела и потанцевать."],
    ["Happy Xmas (War Is Over)", "John Lennon & Yoko Ono", "Песня о том, чтобы встретиться и побыть рядом."],
    ["Somewhere in My Memory", "John Williams", "Мелодия из «Один дома»."],
    ["Christmas (Baby Please Come Home)", "Darlene Love", "Громкая и радостная песня на семейный вечер."],
    ["Christmas Lights", "Coldplay", "Для вечера у окна, пока город светится огнями."],
    ["Снежинка", "Ольга Рождественская", "Песня из «Чародеев» про желание, которое хочется загадать."],
    ["Три белых коня", "Лариса Долина", "Проводить последние дни декабря с музыкой из «Чародеев»."],
    ["Пять минут", "Людмила Гурченко", "Песня из «Карнавальной ночи» для последних минут перед Новым годом."],
  ];

  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow", year: "numeric", month: "numeric", day: "numeric",
  });
  const linkFor = ([title, artist, , link]) =>
    link || `https://www.youtube.com/results?search_query=${encodeURIComponent(artist + " " + title)}`;

  function showAdventTrack(day) {
    const link = document.querySelector("#adventMusicLink");
    const track = tracks[day - 1];
    if (!link || !track) return;
    link.href = linkFor(track);
    link.textContent = `♫ ${track[0]} — ${track[1]}`;
    link.hidden = false;
  }

  function renderDailyMusic() {
    const card = document.querySelector("#decemberMusic");
    if (!card) return;
    const history = card.querySelector("details");
    const list = history.querySelector("ol");
    let renderedDay = 0;

    function refresh() {
      const parts = Object.fromEntries(clock.formatToParts().map(part => [part.type, part.value]));
      const day = parts.month === "12" ? Number(parts.day) : 0;
      card.hidden = !day;
      if (!day || day === renderedDay) return;
      renderedDay = day;
      const track = tracks[day - 1];
      card.querySelector("time").dateTime = `${parts.year}-12-${parts.day.padStart(2, "0")}`;
      card.querySelector("time").textContent = `${day} декабря`;
      card.querySelector(".music-track").textContent = track[0];
      card.querySelector(".music-artist").textContent = track[1];
      card.querySelector(".music-note").textContent = track[2];
      card.querySelector(".music-play").href = linkFor(track);
      history.hidden = day === 1;
      list.replaceChildren();
      for (let index = day - 2; index >= 0; index--) {
        const previous = tracks[index];
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.href = linkFor(previous);
        link.textContent = `${index + 1} декабря · ${previous[0]} — ${previous[1]}`;
        item.append(link);
        list.append(item);
      }
    }

    refresh();
    setInterval(refresh, 15000);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
  }

  window.STICKERBOOK_MUSIC = { showAdventTrack };
  renderDailyMusic();
})();
