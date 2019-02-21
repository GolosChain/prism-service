# PRISM-SERVICE

**PRISM-SERVICE** является сервисом дисперсии данных блокчейна CyberWay, которые после вторичной обработки другими
микросервисами могут быть использованы в [golos.io](https://golos.io) и приложениях.

API JSON-RPC:

```
getProfile:                        // Получение профиля пользователя
    requestedUserId <string>       // Идентификатор пользователя

getPost:                           // Получение конкретного поста
    currentUserId <string/null>    // Идентификатор текущего пользователя
    requestedUserId <string>       // Идетификатор запрошенного пользователя
    permlink <string>              // Пермлинк поста
    refBlockNum <number>           // Привязанный блок поста

getFeed:                           // Получение ленты постов
    type <string>('community')     // Тип ленты
        [
          community                // Лента комьюнити, требует communityId
        | subscriptions            // Лента подписок пользователя, требует requestedUserId
        | byUser                   // Лента постов самого пользователя, требует requestedUserId
        ]
    sortBy <string>('time')        // Способ сортировки
        [
          time                     // Сначала старые, потом новые
        | timeInverted             // Сначала новые, потом старые
        ]
    sequenceKey <string/null>      // Идентификатор пагинации для получения следующего контента
    limit <number>                 // Количество элементов
    currentUserId <string/null>    // Идентификатор текущего пользователя
    requestedUserId <string/null>  // Идетификатор запрошенного пользователя
    communityId <string/null>      // Идентификатор комьюнити

getComments:                       // Получение ленты комментариев
    sortBy <string>('time')        // Способ сортировки
        [
          time                     // Сначала старые, потом новые
        | timeInverted             // Сначала новые, потом старые
        ]
    sequenceKey <string/null>      // Идентификатор пагинации для получения следующего контента
    limit <number>(10)             // Количество элементов
    type <string>('post')          // Тип ленты
        [
          'user'                   // Получить комментарии пользователя, требует requestedUserId
        | 'post'                   // Получить комментарии для поста, требует requestedUserId, permlink, refBlockNum
        ]
    currentUserId <string/null>    // Идентификатор текущего пользователя
    requestedUserId <string/null>  // Идетификатор запрошенного пользователя
    permlink <string/null>         // Пермлинк поста
    refBlockNum <number/null>      // Привязанный блок поста
```

Возможные переменные окружения `ENV`:

- `GLS_CONNECTOR_HOST` _(обязательно)_ - адрес, который будет использован для входящих подключений связи микросервисов.  
 Дефолтное значение - `127.0.0.1`

- `GLS_CONNECTOR_PORT` _(обязательно)_ - адрес порта, который будет использован для входящих подключений связи микросервисов.  
 Дефолтное значение - `3000`

- `GLS_METRICS_HOST` _(обязательно)_ - адрес хоста для метрик StatsD.  
 Дефолтное значение - `127.0.0.1`

- `GLS_METRICS_PORT` _(обязательно)_ - адрес порта для метрик StatsD.  
 Дефолтное значение при запуске без докера - `8125`

- `GLS_MONGO_CONNECT` - строка подключения к базе MongoDB.  
 Дефолтное значение - `mongodb://mongo/admin`

- `GLS_DAY_START` - время начала нового дня в часах относительно UTC.  
 Дефолтное значение - `3` (день начинается в 00:00 по Москве)

- `GLS_MAX_FEED_LIMIT` - максимальное количество постов отдаваемое в ленту на 1 запрос за 1 раз.  
 Дефолтное значение - `100`

- `GLS_DELEGATION_ROUND_LENGTH` - количество раундов подписи блока в блокчейне.  
 Дефолтное значение - `21`

- `GLS_REVERT_TRACE_CLEANER_INTERVAL` - интервал запуска клинера неактуальных записей восстановления в случае форков.  
 Дефолтное значение - `300000`

Для запуска сервиса достаточно вызвать команду `docker-compose up --build` в корне проекта, предварительно указав
необходимые `ENV` переменные.
