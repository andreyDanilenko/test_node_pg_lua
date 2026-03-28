# База данных: таблицы, SQL и сценарии

Документ описывает структуру PostgreSQL, **нативный SQL** (как в приложении, с плейсхолдерами `$1`, `$2`, …) и **порядок запросов** по пользовательским сценариям.

---

## 1. Модель данных

### 1.1. `users`

Гость и другие типы пользователей.

| Колонка      | Тип        | Описание                          |
|-------------|------------|-----------------------------------|
| `id`        | UUID PK    | `gen_random_uuid()`               |
| `user_type` | VARCHAR(20)| по умолчанию `'guest'`            |
| `created_at`| timestamptz|                                   |
| `updated_at`| timestamptz|                                   |

Индекс: `idx_users_user_type` на `user_type`.

---

### 1.2. `user_reward_state`

Одна строка на пользователя: **текущий день цикла** и **время последнего claim** (для кулдауна и сброса серии).

| Колонка            | Тип        | Описание                                      |
|--------------------|------------|-----------------------------------------------|
| `user_id`          | UUID PK, FK → `users(id)` ON DELETE CASCADE   |
| `current_day`      | INTEGER    | NOT NULL DEFAULT 1                            |
| `last_claimed_at`  | timestamptz| NULL = ещё ни разу не забирали награду        |
| `streak_started_at`| timestamptz| начало текущей серии                          |
| `updated_at`       | timestamptz| обновляется триггером при `UPDATE`            |

Триггер `update_user_reward_state_updated_at`: перед каждым `UPDATE` выставляет `updated_at = CURRENT_TIMESTAMP`.

---

### 1.3. `rewards`

История выданных наград: **одна запись на пару (пользователь, день цикла)**.

| Колонка     | Тип        | Описание                                |
|------------|------------|-----------------------------------------|
| `id`       | UUID PK    |                                         |
| `user_id`  | UUID FK    | → `users(id)` ON DELETE CASCADE         |
| `day`      | INTEGER    | номер дня в цикле (1…7)                 |
| `amount`   | INTEGER    | сумма монет                             |
| `claimed_at` | timestamptz | когда записана награда (DEFAULT now)  |
| `created_at` | timestamptz |                                     |

**Ограничение:** `UNIQUE (user_id, day)` — нельзя два раза вставить один и тот же `day` для одного пользователя (после сброса серии старые строки удаляются транзакцией `resetStreak`, чтобы снова можно было день 1).

Индексы: `user_id`, `claimed_at`.

---

### 1.4. Связи

```
users (1) ──< (1) user_reward_state
users (1) ──< (*) rewards
```

При удалении пользователя каскадом удаляются его `user_reward_state` и все `rewards`.

---

## 2. Нативный SQL по методам репозиториев

Параметры: `$1`, `$2`, `$3` — значения, передаваемые драйвером `pg` (не подставлять строки вручную).

### 2.1. `UserRepository.createGuest`

```sql
INSERT INTO users (user_type)
VALUES ('guest')
RETURNING id, user_type AS "userType", created_at AS "createdAt", updated_at AS "updatedAt";
```

---

### 2.2. `UserRepository.findById`

```sql
SELECT id, user_type AS "userType", created_at AS "createdAt", updated_at AS "updatedAt"
FROM users
WHERE id = $1;
```

Параметры: `$1` = UUID пользователя.

---

### 2.3. `RewardRepository.createState`

```sql
INSERT INTO user_reward_state (user_id, streak_started_at)
VALUES ($1, CURRENT_TIMESTAMP)
RETURNING user_id AS "userId", current_day AS "currentDay",
          last_claimed_at AS "lastClaimedAt", streak_started_at AS "streakStartedAt";
```

Параметры: `$1` = `user_id` (UUID).

---

### 2.4. `RewardRepository.getState`

```sql
SELECT user_id AS "userId", current_day AS "currentDay",
       last_claimed_at AS "lastClaimedAt", streak_started_at AS "streakStartedAt"
FROM user_reward_state
WHERE user_id = $1;
```

Параметры: `$1` = UUID.

---

### 2.5. `RewardRepository.getLastReward`

```sql
SELECT id, user_id AS "userId", day, amount, claimed_at AS "claimedAt"
FROM rewards
WHERE user_id = $1
ORDER BY claimed_at DESC
LIMIT 1;
```

Параметры: `$1` = UUID.

---

### 2.6. `RewardRepository.saveReward`

**Шаг 1 — вставка с идемпотентностью по `(user_id, day)`:**

```sql
INSERT INTO rewards (user_id, day, amount)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, day) DO NOTHING
RETURNING id, user_id AS "userId", day, amount, claimed_at AS "claimedAt";
```

Параметры: `$1` = user_id, `$2` = day, `$3` = amount.

**Шаг 2 (если `RETURNING` пустой — конфликт, строка уже была):**

```sql
SELECT id, user_id AS "userId", day, amount, claimed_at AS "claimedAt"
FROM rewards
WHERE user_id = $1 AND day = $2;
```

---

### 2.7. `RewardRepository.updateState`

```sql
UPDATE user_reward_state
SET current_day = $2,
    last_claimed_at = $3,
    updated_at = CURRENT_TIMESTAMP
WHERE user_id = $1;
```

Параметры: `$1` = user_id, `$2` = current_day, `$3` = last_claimed_at (timestamptz).

*(Триггер дополнительно обновит `updated_at` при необходимости согласно миграции.)*

---

### 2.8. `RewardRepository.resetStreak` (одна транзакция)

```sql
BEGIN;

DELETE FROM rewards
WHERE user_id = $1;

UPDATE user_reward_state
SET current_day = 1,
    streak_started_at = CURRENT_TIMESTAMP,
    last_claimed_at = NULL
WHERE user_id = $1;

COMMIT;
```

При ошибке любого шага: `ROLLBACK`. Параметр `$1` = user_id во всех операциях внутри транзакции.

---

## 3. Сценарии: какие запросы выполняются

Ниже — **порядок обращений к БД** (без JWT и HTTP). Логика времени (кулдаун, сброс серии, `maxDay`, `cycleBehavior`) задаётся в `RewardService` и `config`; в SQL попадают только факты из таблиц.

### 3.1. Регистрация гостя — `POST …/auth/guest`

| Шаг | Метод              | SQL (см. раздел)   |
|-----|--------------------|--------------------|
| 1   | `createGuest`      | §2.1               |
| 2   | `createState`      | §2.3               |

После этого у пользователя есть строка в `users` и строка в `user_reward_state` с `last_claimed_at = NULL`.

---

### 3.2. Просмотр состояния наград — `GET …/daily-rewards/` (`getState` в сервисе)

| Шаг | Метод     | SQL |
|-----|-----------|-----|
| 1   | `getState`| §2.4 |

Дальше только вычисления в коде (нет записи в БД).

Особый случай: если строки `user_reward_state` нет (не должно быть после нормального guest flow), API отвечает «как новый пользователь» без SQL-ошибки.

---

### 3.3. Забрать награду — `POST …/daily-rewards/claim`

Сервис сначала всегда читает:

| Шаг | Метод           | SQL   |
|-----|-----------------|-------|
| 1   | `getState`      | §2.4  |
| 2   | `getLastReward` | §2.5  |

Дальше ветки **без SQL** (только логика):

- **Кулдаун:** `timePassed < cooldownSeconds` → ответ `success: false`, **записей в БД нет**.

Дальше по веткам с SQL:

#### A) Первая награда (`last_claimed_at IS NULL`)

| Шаг | Метод        | SQL  |
|-----|--------------|------|
| 3   | `saveReward` | §2.6 (день 1, amount из `amounts[0]`) |
| 4   | `updateState`| §2.7 (current_day = 1, last_claimed_at = время из строки награды) |

#### B) Серия сброшена по времени (`timePassed > streakResetSeconds`)

| Шаг | Метод          | SQL  |
|-----|----------------|------|
| 3   | `resetStreak`  | §2.8 |
| 4   | `saveReward`   | §2.6 (день 1) |
| 5   | `updateState`  | §2.7 (день 1) |

#### C) Обычный следующий день (кулдаун прошёл, серия жива)

Вычисляется `nextDay` от последней награды и настроек цикла (в коде). Затем:

| Шаг | Метод        | SQL  |
|-----|--------------|------|
| 3   | `saveReward` | §2.6 (`$2` = nextDay, `$3` = amount из `amounts[nextDay-1]`) |
| 4   | `updateState`| §2.7 |

---

### 3.4. Проверка JWT / пользователь существует

При валидации токена (если используется `validateToken`):

| Шаг | Метод      | SQL  |
|-----|------------|------|
| 1   | `findById` | §2.2 |

---

### 3.5. Health-check приложения

```sql
SELECT 1;
```

Отдельно от репозиториев; проверяет доступность соединения с PostgreSQL.

---

## 4. Замечания

- Все запросы из приложения — **параметризованные** (`$1`, …), это и есть безопасный «нативный SQL» в `pg`.
- Уникальность `(user_id, day)` в `rewards` связана с бизнес-правилом цикла: при новом «круге» после долгого перерыва `resetStreak` **удаляет** старые награды, чтобы снова можно было вставить день `1`.
- `getState` (превью для UI) опирается на `user_reward_state.current_day`; `claim` при вычислении следующего дня опирается на **`getLastReward`** (последняя строка в `rewards`). При нормальной работе они согласованы через `updateState` после каждого успешного claim.
