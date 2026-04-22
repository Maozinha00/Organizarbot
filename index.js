const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ⚠️ USE .ENV (NUNCA DEIXAR TOKEN FIXO)
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// 🚨 SEGURANÇA
if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.log("❌ Falta TOKEN, CLIENT_ID ou GUILD_ID no .env");
  process.exit(1);
}

// =====================
// SLASH COMMAND
// =====================
const commands = [
  new SlashCommandBuilder()
    .setName('organizar')
    .setDescription('Organiza o servidor automaticamente')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(c => c.toJSON());

// REGISTRAR
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comando registrado!");
  } catch (err) {
    console.log("❌ Erro comando:", err);
  }
})();

// =====================
// ESTRUTURA
// =====================
const estrutura = [
  {
    categoria: "📥 ENTRADA (PÚBLICO)",
    canais: ["👋・bem-vindo","🆕・membros-novos","📩・ticket","📑・contratação","🎁・bonificações","👋・até-logo"]
  },
  {
    categoria: "📢 INFORMAÇÕES",
    canais: ["📕・regras-hp","📘・regras-hp-kids","📢・avisos","📌・informações","🤝・parcerias","🚫・blacklist"]
  },
  {
    categoria: "💬 COMUNICAÇÃO",
    canais: ["💬・chat-geral","👑・chat-diretoria","📢・anúncios","📣・comunicados"]
  },
  {
    categoria: "🧠 GESTÃO / ADMIN",
    canais: ["💰・vendas","⏳・ausência","🔴・advertências","🏆・promoções","❌・demissões","⬇️・rebaixamento","📋・medidas","📦・acumulados","📊・relatórios"]
  }
];

const canaisVoz = [
  "🔊 Recepção",
  "🔊 Equipe",
  "🔊 Emergência",
  "🔊 Diretoria",
  "🔊 Reunião"
];

// =====================
// INTERAÇÃO
// =====================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'organizar') {
    await interaction.reply({ content: "🔄 Organizando servidor...", ephemeral: true });

    const guild = interaction.guild;

    try {

      // CATEGORIAS + TEXTOS
      for (const grupo of estrutura) {

        let categoria = guild.channels.cache.find(
          c => c.name === grupo.categoria && c.type === ChannelType.GuildCategory
        );

        if (!categoria) {
          categoria = await guild.channels.create({
            name: grupo.categoria,
            type: ChannelType.GuildCategory
          });
        }

        for (const nome of grupo.canais) {

          let canal = guild.channels.cache.find(
            c => c.name === nome && c.type === ChannelType.GuildText
          );

          if (!canal) {
            canal = await guild.channels.create({
              name: nome,
              type: ChannelType.GuildText
            });
          }

          await canal.setParent(categoria.id);
        }
      }

      // VOZ
      let categoriaVoz = guild.channels.cache.find(
        c => c.name === "🔊 CALLS" && c.type === ChannelType.GuildCategory
      );

      if (!categoriaVoz) {
        categoriaVoz = await guild.channels.create({
          name: "🔊 CALLS",
          type: ChannelType.GuildCategory
        });
      }

      for (const nome of canaisVoz) {

        let canal = guild.channels.cache.find(
          c => c.name === nome && c.type === ChannelType.GuildVoice
        );

        if (!canal) {
          canal = await guild.channels.create({
            name: nome,
            type: ChannelType.GuildVoice
          });
        }

        await canal.setParent(categoriaVoz.id);
      }

      await interaction.editReply("✅ Servidor organizado com sucesso!");

    } catch (err) {
      console.log("❌ erro organizar:", err);
      await interaction.editReply("❌ Erro ao organizar servidor");
    }
  }
});

// =====================
client.once('ready', () => {
  console.log(`🤖 Bot online: ${client.user.tag}`);
});

client.login(TOKEN);
