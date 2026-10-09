# Медиа-библиотека

React + TypeScript frontend и Express backend. Метаданные пользователей и медиа хранятся в MongoDB, бинарные файлы хранятся на диске контейнера в `media-storage/`. В production frontend и API обслуживаются одним процессом на порту `2486`.

## Локальный запуск

Требуются Node.js 18+ и MongoDB. Из корня проекта:

```bash
npm install
cd server && npm install && cd ..
npm run build
npm start
```

Сервер доступен по адресу `http://localhost:2486`. По умолчанию backend подключается к `mongodb://127.0.0.1:27017/media-library`. Можно переопределить `PORT` и `MONGODB_URI` переменными окружения.

Для разработки frontend можно запустить через `npm run dev`; backend при этом отдельно запускается командой `npm start` из корня или `node index.js` из `server/`.

## Portainer / Docker Compose

Стек описан в `docker-compose.yml`. Используется закреплённый тег `mongo:7.0`: MongoDB 8 на Linux kernel 6.19+ может завершаться при старте с ошибкой совместимости `SERVER-121912`. В Portainer можно создать Stack из этого Compose-файла и собрать образ из репозитория. Наружу опубликован только порт `2486` приложения. Сервис MongoDB подключён только к внутренней сети `media_internal` и не имеет секции `ports`, поэтому его порт недоступен с хоста/сервера.

Если MongoDB 8 уже успела записать данные в volume `mongo_data`, нельзя подключать этот же volume напрямую к MongoDB 7.0: переход на предыдущую major-версию не поддерживается. Сначала сделайте `mongodump`, затем восстановите данные в новый чистый volume MongoDB 7.0. Для пустой БД достаточно пересоздать MongoDB-контейнер на новом теге.

Для этого Compose-стека отдельный `.env` и дополнительные переменные в Portainer не нужны. Compose сохраняет MongoDB в volume `mongo_data`, а загруженные файлы в `media_files`.

```bash
docker compose up --build -d
```

После первого входа задайте администратору новый пароль до публикации сервиса в интернете. Пароли пользователей хранятся только в виде salted scrypt-хеша. Сессии хранятся в MongoDB как SHA-256-хеши случайных токенов и автоматически удаляются после истечения срока действия.

## Авторизация и доступ

- Регистрация создаёт пользователя с уникальным UUID, логином и публичным именем. По умолчанию `whitelisted: false`.
- Войти и смотреть публичные медиа может любой зарегистрированный пользователь; гости тоже видят публичные материалы.
- Неавторизованные пользователи не видят приватные медиа ни в списке, ни через прямой URL файла.
- Администратор одобряет пользователей в панели «Управление», добавляя их в white-list.
- Загрузка разрешена только администратору или пользователю с `whitelisted: true`.
- Автор медиа и администратор могут менять название, категории, публичность и удалять медиа.
- На сайте отображается имя автора, а в документе медиа сохраняется только ссылка `authorUuid` на UUID пользователя.

## Загрузка файлов

При добавлении файла можно указать название, ноль или несколько категорий, публичность и сам файл. Название необязательно; если оно не заполнено, используется имя выбранного файла без расширения. Исходное имя файла нигде в MongoDB не сохраняется. Описание не используется. Расширение и UUID генерируются/определяются сервером.

Файлы лежат в:

- `media-storage/videos/<uuid>.<extension>`
- `media-storage/images/<uuid>.<extension>`

Модель медиа не хранит `src`: API формирует URL выдачи по UUID и типу файла. Удаление медиа удаляет MongoDB-документ и бинарный файл.

## MongoDB

База по умолчанию: `media-library`. Mongoose использует коллекции `accounts`, `media_items` и `sessions`.

### `accounts`

```json
{
  "uuid": "UUID пользователя",
  "login": "уникальный логин",
  "name": "имя, видимое на сайте",
  "passwordHash": "salt:scrypt-hash",
  "isAdmin": false,
  "whitelisted": false,
  "favorites": ["UUID медиа"],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

`uuid` и `login` уникальны. Поле `whitelisted` означает одобрение администрацией для добавления медиа, а не право на вход в систему. В документе медиа автор связан с пользователем через `authorUuid`.

### `media_items`

```json
{
  "uuid": "UUID файла и медиа",
  "title": "Название",
  "type": "video | image",
  "extension": "mp4",
  "categories": ["anime", "clips"],
  "isPublic": true,
  "authorUuid": "UUID пользователя из accounts",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

В MongoDB намеренно нет `fileNameOnDisk`, `originalName`, отдельного поля `src` или описания. Имя файла на диске формируется как `<uuid>.<extension>`, а `type` выбирает папку `videos` или `images`.

### `sessions`

```json
{
  "tokenHash": "SHA-256 hash of opaque bearer token",
  "userUuid": "UUID пользователя из accounts",
  "expiresAt": "Date"
}
```

MongoDB TTL-индекс удаляет просроченные сессии автоматически. Исходное значение токена хранится только у клиента.

### Основные маршруты API

- `POST /api/auth/register` — регистрация `{ login, password, name? }`.
- `POST /api/auth/login` — вход `{ login, password }`.
- `GET /api/auth/me` — текущий пользователь.
- `GET /api/media` — список доступных текущему пользователю медиа и категорий.
- `GET /api/media/:uuid/file` — выдача файла с проверкой публичности/авторства/администратора.
- `POST /api/media` — загрузка медиа для администратора или участника white-list.
- `PATCH /api/media/:uuid` — изменение названия, категорий, публичности автором или администратором.
- `DELETE /api/media/:uuid` — удаление автором или администратором.
- `GET /api/admin/users` — список пользователей для администратора.
- `PATCH /api/admin/users/:uuid` — изменение `whitelisted` администратором.
- `GET/POST /api/users/me/favorites` — избранное текущего пользователя.

## Структура проекта

- `src/` — React frontend.
- `server/index.js` — Express API, MongoDB-модели и авторизация.
- `media-storage/` — локальное файловое хранилище (создаётся автоматически, в Docker хранится в volume).
- `Dockerfile`, `docker-compose.yml` — контейнерный запуск приложения и MongoDB.
- `scripts/build.mjs` — сборка frontend в `dist/`.
