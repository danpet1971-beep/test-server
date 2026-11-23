require("dotenv").config();
const express = require("express");
const { Bot } = require("grammy");

const PORT = 5000;
const { BOT_TOKEN, CHAT_ID } = process.env;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("Укажите BOT_TOKEN и CHAT_ID в файле .env");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);
const app = express();

app.use(express.json());

app.post("/send", async (req, res) => {
  const { text } = req.body ?? {};

  try {
    await bot.api.sendMessage(CHAT_ID, text);
    res.json({ ok: true });
  } catch (err) {
    console.error("Ошибка отправки в Telegram:", err);
    res.status(500).json({ ok: false, error: "Не удалось отправить сообщение" });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});