const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Events
} = require("discord.js");

const TOKEN = process.env.TOKEN;

// ==============================
// IDS (CONFIGURAÇÃO DO SERVIDOR)
// ==============================
const CONFIG = {
  CANAL_REGISTRO_ID: "1515448138385592361",
  CANAL_LOGS_ID: "1515448473246498866",
  CARGO_MORADOR_ID: "1515125842328424640"
};

// ==============================
// CLIENT
// ==============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel]
});

// ==============================
// FUNÇÃO: VALIDAR SERVIDOR
// ==============================
async function validarEstrutura(guild) {
  const canalRegistro = await guild.channels.fetch(CONFIG.CANAL_REGISTRO_ID).catch(() => null);
  const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
  const cargo = await guild.roles.fetch(CONFIG.CARGO_MORADOR_ID).catch(() => null);

  if (!canalRegistro) console.log("❌ Canal de registro não encontrado");
  if (!canalLogs) console.log("❌ Canal de logs não encontrado");
  if (!cargo) console.log("❌ Cargo Morador não encontrado");

  return {
    canalRegistro,
    canalLogs,
    cargo
  };
}

// ==============================
// PAINEL DE REGISTRO
// ==============================
async function enviarPainel(canalRegistro) {
  try {
    if (!canalRegistro) return;

    // Remove painéis antigos do bot
    const msgs = await canalRegistro.messages.fetch({ limit: 10 }).catch(() => null);

    if (msgs) {
      const antigas = msgs.filter(m => m.author.id === client.user.id);
      for (const msg of antigas.values()) {
        await msg.delete().catch(() => {});
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("🟢 SISTEMA DE REGISTRO")
      .setDescription(
        "👋 Bem-vindo ao servidor!\n\n" +
        "Clique no botão abaixo para se registrar e receber o cargo **Morador**.\n\n" +
        "✔ Acesso automático após registro"
      )
      .setColor("Green")
      .setFooter({ text: "Sistema Automático do Servidor" });

    const botao = new ButtonBuilder()
      .setCustomId("registrar_entrada")
      .setLabel("Registrar Entrada")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);

    await canalRegistro.send({
      embeds: [embed],
      components: [row]
    });

    console.log("📌 Painel de registro enviado");
  } catch (err) {
    console.error("Erro painel:", err);
  }
}

// ==============================
// READY
// ==============================
client.once(Events.ClientReady, async () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);

  const guild = client.guilds.cache.first();
  if (!guild) return console.log("❌ Nenhum servidor encontrado");

  const estrutura = await validarEstrutura(guild);

  // Envia o painel apenas uma vez ao iniciar
  await enviarPainel(estrutura.canalRegistro);
});

// ==============================
// BOTÃO REGISTRO
// ==============================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "registrar_entrada") return;

  try {
    const guild = interaction.guild;
    if (!guild) return;

    const estrutura = await validarEstrutura(guild);

    if (!estrutura.canalLogs || !estrutura.cargo) {
      return interaction.reply({
        content: "❌ Sistema mal configurado (canais ou cargo não encontrado).",
        ephemeral: true
      });
    }

    const membro = await guild.members.fetch(interaction.user.id).catch(() => null);

    if (!membro) {
      return interaction.reply({
        content: "❌ Usuário não encontrado no servidor.",
        ephemeral: true
      });
    }

    if (membro.roles.cache.has(CONFIG.CARGO_MORADOR_ID)) {
      return interaction.reply({
        content: "✅ Você já está registrado.",
        ephemeral: true
      });
    }

    await membro.roles.add(CONFIG.CARGO_MORADOR_ID);

    await interaction.reply({
      content: "🎉 Registro concluído! Cargo Morador entregue.",
      ephemeral: true
    });

    const log = new EmbedBuilder()
      .setTitle("📥 NOVO REGISTRO")
      .setDescription(
        `👤 Usuário: <@${membro.id}>\n` +
        `🆔 ID: ${membro.id}\n` +
        `⏰ Hora: <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setThumbnail(membro.user.displayAvatarURL({ dynamic: true }))
      .setColor("Blue")
      .setFooter({ text: "Sistema de Registro Automático" })
      .setTimestamp();

    await estrutura.canalLogs.send({
      embeds: [log]
    });

  } catch (err) {
    console.error("Erro interação:", err);

    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({
        content: "❌ Ocorreu um erro ao realizar seu registro.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// ==============================
// LOGIN
// ==============================
client.login(TOKEN);
