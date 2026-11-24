require("dotenv").config();
const express = require("express");
const { neon } = require("@neondatabase/serverless");
const {Bot} = require('grammy')

const PORT = 5000;
const app = express();
const client = neon(process.env.DATABASE_URL);
const bot = new Bot(process.env.BOT_TOKEN)

bot.api.setMyCommands([
  { command: 'get', description: 'Проверка работы бота' }
])

bot.command('get', async (ctx) => {
  try {
    await ctx.reply('Bot working')
  } catch (error) {
    console.error(error)
  }
})
bot.start()
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
