# PRISM-SERVICE

**PRISM-SERVICE** является сервисом дисперсии данных блокчейна CyberWay, которые после вторичной обработки другими
микросервисами могут быть использованы в [golos.io](https://golos.io) и приложениях.

Запуск:

-   Установить `docker` и `docker-compose`
-   Установить необходимые ENV-переменные в `.env` файл (шаблон есть в `.env.example`)
-   Вызвать команду `docker-compose up --build` в корне проекта

API JSON-RPC:

```
search:                            // Поиск по данным из призмы
    type <string>('matchPrefix')   // Тип поиска. Принимает значения "matchPrefix" и "match"
        [
          match                    // Ищет по вхождениям слов. Например, на запрос `app` найдет только `app`
        | matchPrefix              // Ищет по вхождениям частей слов. Например, на запрос `app` найдет и `app`, и `apple`
        ]
    where <string>('all')          // Модель, в которой нужно искать
        [
          all                      // Ищет везде
        | comment                  // Ищет только в комментах
        | post                     // Ищет только в постах
        ]
    text <string>                  // Текст, который требуется найти
    field <string>('all')          // Поле, по которому требуется выполнить поиск
        [
          all                      // Ищет по всем полям
        | title                    // Ищет только в `title` (доступно для `comments` и `posts`)
        | preview                  // Ищет только в `preview` (доступно для `comments` и `posts`)
        | raw                      // Ищет только в `raw` (доступно для `comments` и `posts`)
        | full                     // Ищет только в `full` (доступно для `comments` и `posts`)
        | permlink                 // Ищет только в `permlink` (доступно для `comments` и `posts`)
        ]
    limit <number>(10)             // Ограничение на размер найденных результатов
    offset <number>(0)             // Количество результатов, которое надо "пропустить"

getProfile:                        // Получение профиля пользователя
    requestedUserId <string>       // Идентификатор пользователя
    username <string>              // Имя пользователя относительно домена
    app <string>('cyber')          // Тип приложения / домена
        [
          cyber                    // CyberWay
        | gls                      // Golos
        ]

    @deprecated
    type <string>('cyber')         // Тип профиля (устарело)
        [
          cyber                    // CyberWay
        | gls                      // Golos
        ]

getPost:                           // Получение конкретного поста
    currentUserId <string/null>    // Идентификатор текущего пользователя
    requestedUserId <string>       // Идетификатор запрошенного пользователя
    username <string>              // Имя пользователя относительно домена
    app <string>('cyber')          // Тип приложения / домена
        [
          cyber                    // CyberWay
        | gls                      // Golos
        ]
    permlink <string>              // Пермлинк поста
    contentType <string>('web')    // Определить тип получаемого контента
        [
          web                      // Контент, пригодный для веб-клиентов
        | mobile                   // Контент, пригодный для мобильных устройств
        | raw                      // Сырой контент без обработки
        ]

getComment:                        // Получение конкретного комментария
    currentUserId <string/null>    // Идентификатор текущего пользователя
    requestedUserId <string/null>  // Идетификатор запрошенного пользователя
    username <string>              // Имя пользователя относительно домена
    app <string>('cyber')          // Тип приложения / домена
        [
          cyber                    // CyberWay
        | gls                      // Golos
        ]
    permlink <string>              // Пермлинк поста
    contentType <string>('web')    // Определить тип получаемого контента
        [
          web                      // Контент, пригодный для веб-клиентов
        | mobile                   // Контент, пригодный для мобильных устройств
        | raw                      // Сырой контент без обработки
        ]

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
        | timeDesc                 // Сначала новые, потом старые
        | popular                  // По популярности (только для community)
        ]
    timeframe <string>('day')      // Область выборки сортировки (только для community + popular)
        [
          day                      // За день
        | week                     // За неделю
        | month                    // За месяц
        | year                     // За год
        | all                      // За всё время
        | WilsonHot                // Aлгоритм Вилсона, актуальный контент сейчас
        | WilsonTrending           // Aлгоритм Вилсона, в целом популярный контент
        ]
    sequenceKey <string/null>      // Идентификатор пагинации для получения следующего контента
    limit <number>                 // Количество элементов
    currentUserId <string/null>    // Идентификатор текущего пользователя
    requestedUserId <string/null>  // Идетификатор запрошенного пользователя
    communityId <string/null>      // Идентификатор комьюнити
    tags <string[]/null>           // Теги для фильтрации (только для community и сортировкой по времени)
    contentType <string>('web')    // Определить тип получаемого контента
        [
          web                      // Контент, пригодный для веб-клиентов
        | mobile                   // Контент, пригодный для мобильных устройств
        | raw                      // Сырой контент без обработки
        ]
    username <string>              // Имя пользователя относительно домена
    app <string>('cyber')          // Тип приложения / домена
        [
          cyber                    // CyberWay
        | gls                      // Golos
        ]

getComments:                       // Получение ленты комментариев
    sortBy <string>('time')        // Способ сортировки
        [
          time                     // Сначала старые, потом новые
        | timeDesc                 // Сначала новые, потом старые
        ]
    sequenceKey <string/null>      // Идентификатор пагинации для получения следующего контента
    limit <number>(10)             // Количество элементов
    type <string>('post')          // Тип ленты
        [
          user                     // Получить комментарии пользователя, требует requestedUserId
        | post                     // Получить комментарии для поста, требует requestedUserId, permlink
        | replies                  // Получить комментарии, которые были оставлены пользователю, требует userId
        ]
    currentUserId <string/null>    // Идентификатор текущего пользователя
    requestedUserId <string/null>  // Идетификатор запрошенного пользователя
    permlink <string/null>         // Пермлинк поста
    contentType <string>('web')    // Определить тип получаемого контента
        [
          web                      // Контент, пригодный для веб-клиентов
        | mobile                   // Контент, пригодный для мобильных устройств
        | raw                      // Сырой контент без обработки
        ]
    username <string>              // Имя пользователя относительно домена
    app <string>('cyber')          // Тип приложения / домена
        [
          cyber                    // CyberWay
        | gls                      // Golos
        ]

getNotifyMeta:                // Получение мета-данных для отображения нотификации
    userId <string>           // Получить данные пользователя по идентификатору
    communityId <string>      // Получить данные комьюнити по идентификатору
    postId:                   // Получить данные поста по идентификатору
        userId <string>       // Идентификатор пользователя-автора
        permlink <string>     // Пермлинк контента
    commentId:                // Получить данные комментария по идентификатору
        userId <string>       // Идентификатор пользователя-автора
        permlink <string>     // Пермлинк контента
    contentId:                // Получить данные поста/комментария по идентификатору
        userId <string>       // Идентификатор пользователя-автора
        permlink <string>     // Пермлинк контента

getPostVotes:                 // Получение списка голосов за пост
    userId <string>           // Идентификатор пользователя
    permlink <string>         // Пермлинк поста

getCommentVotes:              // Получение списка голосов за коммент
    userId <string>           // Идентификатор пользователя
    permlink <string>         // Пермлинк коммента

resolveProfile:               // Резолв идентификатора пользователя и аватара по имени с доменом
    username <string>         // Имя пользователя относительно домена
    app <string>('cyber')     // Тип приложения / домена
        [
          cyber               // CyberWay
        | gls                 // Golos
        ]

getSubscriptions:                // Получить подписки пользователя
    userId <string>              // Идентификатор пользователя
    type <string>('user')        // Тип подписки
        [
          user                   // Подписчики-пользователи
        | community              // Подписчики-сообщества
        ]
    sequenceKey <string/null>    // Идентификатор пагинации для получения следующего контента
    limit <number>(10)           // Количество элементов
    app <string>('cyber')        // Тип приложения / домена
        [
          cyber                  // CyberWay
        | gls                    // Golos
        ]

getSubscribers:                  // Получить подписчиков пользователя
    userId <string>              // Идентификатор пользователя
    type <string>('user')        // Тип подписки
        [
          user                   // Подписчики-пользователи
        | community              // Подписчики-сообщества
        ]
    sequenceKey <string/null>    // Идентификатор пагинации для получения следующего контента
    limit <number>(10)           // Количество элементов
    app <string>('cyber')        // Тип приложения / домена
        [
          cyber                  // CyberWay
        | gls                    // Golos
        ]

getHashTagTop:                   // Получение топа хеш-тегов
    communityId <string>         // Идентификатор комьюнити
    limit <number>(10)           // Количество элементов
    sequenceKey <string/null>    // Идентификатор пагинации для получения следующего контента

getLeadersTop:                   // Получить топ лидеров
    currentUserId <string/null>  // Идентификатор текущего пользователя
    communityId <string>         // Идентификатор комьюнити
    sequenceKey <string/null>    // Идентификатор пагинации для получения следующего контента
    limit <number>(10)           // Количество элементов
    app <string>('cyber')        // Тип приложения / домена
        [
          cyber                  // CyberWay
        | gls                    // Golos
        ]

waitForBlock                     // Дождаться и получить ответ когда призма обработает указанный блок
    blockNum <number>            // Номер блока

waitForTransaction               // Дождаться и получить ответ когда призма обработает указанную транзакцию
    transactionId <string>       // Идентификатор транзакции

```

Возможные переменные окружения `ENV`:

-   `GLS_CONNECTOR_HOST` _(обязательно)_ - адрес, который будет использован для входящих подключений связи микросервисов.  
    Дефолтное значение - `127.0.0.1`

-   `GLS_CONNECTOR_PORT` _(обязательно)_ - адрес порта, который будет использован для входящих подключений связи микросервисов.  
    Дефолтное значение - `3000`

-   `GLS_METRICS_HOST` _(обязательно)_ - адрес хоста для метрик StatsD.  
    Дефолтное значение - `127.0.0.1`

-   `GLS_METRICS_PORT` _(обязательно)_ - адрес порта для метрик StatsD.  
    Дефолтное значение - `8125`

-   `GLS_MONGO_CONNECT` - строка подключения к базе MongoDB.  
    Дефолтное значение - `mongodb://mongo/admin`

-   `GLS_DAY_START` - время начала нового дня в часах относительно UTC.  
    Дефолтное значение - `3` (день начинается в 00:00 по Москве)

-   `GLS_MAX_FEED_LIMIT` - максимальное количество постов отдаваемое в ленту на 1 запрос за 1 раз.  
    Дефолтное значение - `100`

-   `GLS_DELEGATION_ROUND_LENGTH` - количество раундов подписи блока в блокчейне.  
    Дефолтное значение - `21`

-   `GLS_REVERT_TRACE_CLEANER_INTERVAL` - интервал запуска клинера неактуальных записей восстановления в случае форков.  
    Дефолтное значение - `300000` _(5 минут)_

-   `GLS_FEED_CACHE_INTERVAL` - интервал перерассчета кешей для кешируемых типов лент (но полное удаление старого происходит по `GLS_FEED_CACHE_TTL`).  
    Дефолтное значение - `300000` _(5 минут)_

-   `GLS_FEED_CACHE_TTL` - время жизни каждого кеша ленты.  
    Дефолтное значение - `28800000` _(8 часов)_

-   `GLS_FEED_CACHE_MAX_ITEMS` - максимальное количество элементов, кешированных для каждого типа ленты.
    Дефолтное значение - `10000` _(10 000)_

-   `GLS_FACADE_CONNECT` _(обязательно)_ - адрес подключения к микросервису фасаду.

-   `GLS_MAX_HASH_TAG_SIZE` - максимальный размер хеш-тега для контента.  
    Дефолтное значение - `32`

-   `GLS_RECENT_TRANSACTION_ID_TTL` - интервал хранения идентификаторов обработанных транзакций.  
    Дефолтное значение - `180000` _(3 минуты)_

-   `GLS_MAX_WAIT_FOR_BLOCKCHAIN_TIMEOUT` - максимальное время, которое может ждать `waitForBlock` и подобные методы API.  
    Дефолтное значение - `20000` _(20 секунд)_

-   `GLS_SEARCH_SYNC_TIMEOUT` - интеравал синхронизации новых записей в призме с поисковым индексом.
    Дефолтное значение - `1000` _(1 секунда)_

-   `GLS_SEARCH_DELETE_TIMEOUT` - интеравал синхронизации удаленных записей из призмы с поисковым индексом.
    Дефолтное значение - `3600000` _(1 час)_

-   `GLS_SEARCH_CONNECTION_STRING` _(обязательно)_ - строка подключения к поисковому индексу

-   `GLS_SEARCH_ENABLED` - определяет, должно ли происходить индексирование для полнотекстого поиска.
    Дефолтное значение - `true`

-   `GLS_USE_GENESIS` - необходимо ли ожидать загрузки генезис-данных.
    Дефолтное значение - `true`
