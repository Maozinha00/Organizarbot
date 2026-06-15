const { Client, GatewayIntentBits } = require("discord.js");

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const molduras = [
  { original: "👑 CASA DA FAMÍLIA SOUZA", moldura: "╔════ 👑 CASA DA FAMÍLIA SOUZA ════╗" },
  { original: "📢 DIVULGAÇÃO", moldura: "╔════ 📢 DIVULGAÇÃO ════╗" },
  { original: "🌌 ASTRAL CITY", moldura: "╔════ 🌌 ASTRAL CITY ════╗" },
  { original: "☣️ FIVEZ", moldura: "╔════ ☣️ FIVEZ ════╗" },
  { original: "🎙️ CALLS GERAIS", moldura: "╔════ 🎙️ CALLS GERAIS ════╗" },
  { original: "🤖 BOTS", moldura: "╔════ 🤖 BOTS ════╗" },
  { original: "👑 PRIVADO DO CHEFE", moldura: "╔════ 👑 PRIVADO DO CHEFE ════╗" },
  { original: "❤️ Henrique & Aurora", moldura: "╔════ ❤️ HENRIQUE & AURORA ════╗" },
  { original: "💜 Filhos da Família Souza", moldura: "╔════ 💜 FILHOS DA FAMÍLIA SOUZA ════╗" },
  { original: "🌌 Privado Astral City", moldura: "╔════ 🌌 PRIVADO ASTRAL CITY ════╗" },
  { original: "☣️ Privado FiveZ", moldura: "╔════ ☣️ PRIVADO FIVEZ ════╗" }
];

async function ajustarMolduras() {
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.channels.fetch();

  for (const moldura of    for (const moldura of molduras) {
        const categoria = guild.channels.cache.find(
            c => c.type === 4 && c.name === moldura.original
        );

        if (categoria) {
            await categoria.setName(moldura.moldura);
            console.log(`✅ Categoria ajustada: ${moldura.moldura}`);
        } else {
            console.log(`⚠️ Categoria não encontrada: ${moldura.original}`);
        }
    }

    console.log("✅ Molduras ajustadas!");
}

client.once("ready", async () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
    await ajustarMolduras();
});

client.login(TOKEN);
