# TravelAsk Stickerbook — редактируемая версия

Эта сборка специально сделана так, чтобы сайт было удобно поддерживать вручную через GitHub.

## Структура

- `index.html` — главная
- `member.html` — страница участника
- `achievements.html` — каталог ачивок
- `styles.css` — оформление
- `script.js` — логика сайта
- `data.js` — участники, роли, даты, списки ачивок
- `team/` — фотографии участников
- `background/` — фон сайта
- `achievements/knowledge/` — знания
- `achievements/activity/` — активность
- `achievements/individual/` — индивидуальные
- `achievements/holidays/` — праздники
- `achievements/tenure/` — стаж
- `achievements/departments/` — отделы
- `achievements/other/` — прочее

## Как менять фото участника

1. Открой папку `team`.
2. Замени нужный JPG/PNG на новый файл с тем же именем.
3. Сделай Commit changes.

Если хочешь использовать новое имя файла, поменяй у участника поле `avatarSrc` в `data.js`, например:

`"avatarSrc": "team/Alena-new.jpg"`

## Как добавить новую ачивку

1. Загрузи PNG/JPG в подходящую папку внутри `achievements`.
2. В `data.js` в массиве `achievements` добавь объект для новой ачивки по образцу существующих.
3. У нужного участника в массив `achievements` добавь ID новой ачивки.
4. Сделай Commit changes.

Пример пути:

`"src": "achievements/knowledge/my_new_achievement.png"`

## Как загрузить всё на GitHub через браузер

Не тащи весь проект одной пачкой: GitHub ограничивает веб-загрузку примерно 100 файлами за раз.

Сначала загрузи корневые файлы сайта, потом папку `team`, затем подпапки `achievements` по одной. В каждой из них файлов заметно меньше лимита.

После этого включи GitHub Pages:
Settings → Pages → Deploy from branch → `main` → `/ (root)`.
