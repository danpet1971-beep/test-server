require("dotenv").config();
const express = require("express");
const { neon } = require("@neondatabase/serverless");

const PORT = 5000;
const app = express();
const client = neon(process.env.DATABASE_URL);

app.use(express.json());

app.post("/save", async (req, res) => {
  const { login } = req.body ?? {};
  try {
    await client`INSERT INTO users (login) VALUES (${login})`;
    res.json({ ok: true });
  } catch (err) {
    console.error("Ошибка сохранения в базу данных:", err);
    res
      .status(500)
      .json({ ok: false, error: "Не удалось сохранить пользователя" });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
