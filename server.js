require("dotenv").config();
const express = require("express");
const { neon } = require("@neondatabase/serverless");
const {Bot} = require('grammy')
const cors = require("cors");

const PORT = 5000;
const app = express();
const client = neon(process.env.DATABASE_URL);
const bot = new Bot(process.env.BOT_TOKEN)

sendTelegramMessage = async (chatId, message) => {
  try {
    await bot.api.sendMessage(chatId, message);
    console.log("Сообщение отправлено!");
  } catch (error) {
    console.error("Ошибка отправки:", error);
  }
}

app.use(express.json());
app.use(cors({
  origin: "chrome-extension://eboadfllildekgjmpbdcgbhdmacehndf",
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.post("/save", async (req, res) => {
  const { login } = req.body ?? {};
  try {
    await client`INSERT INTO users (login) VALUES (${login})`;
    await sendTelegramMessage(process.env.CHAT_ID, `Новый пользователь: ${login}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Ошибка сохранения в базу данных:", err);
    res
      .status(500)
      .json({ ok: false, error: "Не удалось сохранить пользователя" });
  }
});
app.get("/users", async (req, res) => {
  try {
    const users = await client`SELECT * FROM users`;  
    await sendTelegramMessage(process.env.CHAT_ID, `Запрошены все пользователи /n${JSON.stringify(users)}`);
    res.json({ ok: true, users });
  } catch (err) {
    console.error("Ошибка получения пользователей из базы данных:", err);
    res
      .status(500)
      .json({ ok: false, error: "Не удалось получить пользователей" });
  }
}); 
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
