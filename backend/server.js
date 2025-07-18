import express from "express";
import pkg from "pg";
import cors from "cors";
import ldap from "ldapjs";

const { Client } = pkg;
const app = express();
const port = 3000;

app.use(cors());

app.options("*", cors());

app.use(express.json());

const client = new Client({
  host: "10.17.0.38",
  port: 5432,
  user: "mmesha",
  password: "123456",
  database: "itms",
});

client
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => {
    console.error("Error connecting to PostgreSQL", err);
    // eslint-disable-next-line no-undef
    process.exit(1);
  });

app.post("/authenticate", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Требуются логин и пароль" });
  }

  const ldapClient = ldap.createClient({
    url: "ldap://dc01:389", // Адрес LDAP-сервера
  });

  const username = `iba\\${email}`; // Формируем логин для LDAP

  ldapClient.bind(username, password, (err) => {
    if (err) {
      console.error("Ошибка аутентификации:", err.message);
      return res.status(401).json({ message: "Ошибка аутентификации" });
    }

    console.log("Аутентификация успешна для:", email);

    // Поиск информации о пользователе
    const searchBase = "dc=iba";
    const searchFilter = `(sAMAccountName=${email})`;
    const attributes = ["mail", "displayName", "telephoneNumber", "title"];

    ldapClient.search(
      searchBase,
      { filter: searchFilter, scope: "sub", attributes },
      (err, searchRes) => {
        if (err) {
          console.error("Ошибка поиска:", err.message);
          return res.status(500).json({ message: "Ошибка поиска" });
        }

        let userData = {};

        searchRes.on("searchEntry", (entry) => {
          userData = entry.object;
        });

        searchRes.on("end", () => {
          ldapClient.unbind();
          res.json({
            message: "Аутентификация успешна",
            user: {
              email:
                userData && userData.mail ? userData.mail : "Email отсутствует",
              displayName:
                userData && userData.displayName
                  ? userData.displayName
                  : "DisplayName отсутствует",
            },
          });
        });

        console.log("Email:", email);
        console.log(
          "DisplayName:",
          userData && userData.displayName
            ? userData.displayName
            : "DisplayName отсутствует"
        );
      }
    );
  });
});

app.get("/years", (req, res) => {
  client.query(
    "SELECT DISTINCT code_year FROM dim_app.v_dim_time WHERE code_year IS NOT NULL ORDER BY code_year",
    (err, result) => {
      if (err) {
        console.error("Error fetching years:", err);
        res.status(500).send("Error retrieving years");
      } else {
        res.json(result.rows);
      }
    }
  );
});

app.get("/sce", (req, res) => {
  client.query(
    "SELECT id, code FROM dim_app.v_dim_sce WHERE code <> 'actual' ORDER BY code",
    (err, result) => {
      if (err) {
        console.error("Error fetching sce:", err);
        res.status(500).send("Error retrieving sce");
      } else {
        res.json(result.rows);
      }
    }
  );
});

app.get("/cfo", (req, res) => {
  client.query(
    "SELECT id, code FROM dim_app.v_dim_cfo WHERE is_root IS false ORDER BY id",
    (err, result) => {
      if (err) {
        console.error("Error fetching cfo:", err);
        res.status(500).send("Error retrieving cfo");
      } else {
        res.json(result.rows);
      }
    }
  );
});

app.get("/acct", async (req, res) => {
  const { time_year, sce_id, cfo_id } = req.query;

  if (!time_year || !sce_id || !cfo_id) {
    return res.status(400).send("Укажите параметры time_year, sce_id и cfo_id");
  }

  try {
    const query = `SELECT * FROM dim_app.v_dim_acc WHERE is_root IS FALSE AND description NOT IN (SELECT acc_desc FROM data_mart.v_plan WHERE time_year = $1 AND sce_id = $2 AND cfo_id = $3)`;
    const result = await client.query(query, [time_year, sce_id, cfo_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сервера");
  }
});

app.get("/data", async (req, res) => {
  const { time_year, sce_id, cfo_id } = req.query;

  if (!time_year || !sce_id || !cfo_id) {
    return res.status(400).send("Укажите параметры time_year, sce_id и cfo_id");
  }

  const fixedColumns = [
    "y0_m01",
    "y0_m02",
    "y0_m03",
    "y0_m04",
    "y0_m05",
    "y0_m06",
    "y0_m07",
    "y0_m08",
    "y0_m09",
    "y0_m10",
    "y0_m11",
    "y0_m12",
    "y1_m01",
    "y1_m02",
    "y1_m03",
    "y1_m04",
    "y1_m05",
    "y1_m06",
    "y1_m07",
    "y1_m08",
    "y1_m09",
    "y1_m10",
    "y1_m11",
    "y1_m12",
  ];
  const columnList = fixedColumns.map((col) => `"${col}"`).join(", ");

  try {
    const query = `SELECT p_id, acc_desc, ${columnList} FROM data_mart."v_plan" 
                     WHERE time_year = $1 AND sce_id = $2 AND cfo_id = $3 ORDER BY p_id`;
    const result = await client.query(query, [time_year, sce_id, cfo_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сервера");
  }
});

app.post("/update", async (req, res) => {
  const { p_id, editedFields } = req.body;

  if (!p_id) {
    return res.status(400).send("Не указан p_id для обновления");
  }
  if (!editedFields || Object.keys(editedFields).length === 0) {
    return res.status(400).send("Нет данных для обновления");
  }

  // Преобразуем названия полей в индексы массивов
  const updates = Object.entries(editedFields)
    .map(([column, value]) => {
      const match = column.match(/(y[01])_m(\d+)/); // Находим "y0" или "y1" и номер месяца
      if (!match) return null;

      const arrayName = match[1]; // "y0" или "y1"
      const index = parseInt(match[2], 10); // Число месяца (например, "12" → 12)

      return `${arrayName}[${index}] = ${value}`;
    })
    .filter(Boolean); // Убираем `null`

  if (updates.length === 0) {
    return res.status(400).send("Ошибка обработки данных");
  }

  const query = `
    UPDATE data_mart.plan
    SET ${updates.join(", ")}
    WHERE id = $1;
  `;

  try {
    await client.query(query, [p_id]);
    res.status(200).send("Данные успешно обновлены");
  } catch (err) {
    console.error("Ошибка обновления данных:", err);
    res.status(500).send("Ошибка сервера");
  }
});

app.post("/update-all", async (req, res) => {
  const { changes } = req.body;

  if (!changes || !Array.isArray(changes) || changes.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Нет данных для обновления" });
  }

  // Начинаем транзакцию
  await client.query("BEGIN");

  try {
    const results = [];

    for (const change of changes) {
      const { p_id, editedFields } = change;

      if (!p_id) {
        throw new Error("Не указан p_id для обновления");
      }

      if (!editedFields || Object.keys(editedFields).length === 0) {
        continue;
      }

      const updates = [];
      const values = [];
      let paramIndex = 2; // Начинаем с 2, так как p_id будет $1

      for (const [column, value] of Object.entries(editedFields)) {
        const match = column.match(/(y[01])_m(\d+)/);
        if (!match) continue;

        const arrayName = match[1];
        const index = parseInt(match[2], 10);

        updates.push(`${arrayName}[${index}] = $${paramIndex}`);

        // Преобразуем значение в число, если оно не null
        const parsedValue = value === null ? null : Number(value);
        values.push(parsedValue);

        paramIndex++;
      }

      if (updates.length === 0) continue;

      const query = `
        UPDATE data_mart.plan
        SET ${updates.join(", ")}
        WHERE id = $1
        RETURNING id;
      `;

      const result = await client.query(query, [p_id, ...values]);
      results.push(result.rows[0].id);
    }

    await client.query("COMMIT");
    res.json({
      success: true,
      message: `Успешно обновлено ${results.length} записей`,
      updatedIds: results,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Ошибка массового обновления:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Ошибка сервера при массовом обновлении",
    });
  }
});

app.post("/addAcct", async (req, res) => {
  const { time_year, sce_id, cfo_id, acc_id } = req.body;

  if (!time_year || !sce_id || !cfo_id || !acc_id) {
    return res
      .status(400)
      .send("Необходимо указать time_year, sce_id, cfo_id и acc_id");
  }

  try {
    const insertQuery = `
      INSERT INTO data_mart.plan (time_year, sce_id, cfo_id, acc_id, is_active)
      VALUES ($1, $2, $3, $4, true)
    `;
    await client.query(insertQuery, [time_year, sce_id, cfo_id, acc_id]);
    res.status(201).send("Запись успешно добавлена");
  } catch (err) {
    console.error("Ошибка при вставке:", err);
    res.status(500).send("Ошибка сервера при вставке");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
