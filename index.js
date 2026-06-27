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
// IDS
// ==============================
const CANAL_REGISTRO_ID = "1515448138385592361";
const CANAL_LOGS_ID = "1515448473246498866";
const CARGO_MORADOR_ID = "1515125842328424640";

const CANAL_AMOR_ID = "1515125878097711244";
const AURORA_ID = "569766846056759300";

// ==============================
// MENSAGENS DE AMOR
// ==============================
const mensagensAmor = [
  "💖 Bom dia, Aurora! O Henrique te ama mais do que tudo ❤️",
  "🌹 Você é o motivo do sorriso do Henrique todos os dias 💕",
  "💘 Henrique te ama hoje, amanhã e sempre ❤️",
  "✨ Você é a pessoa mais especial da vida dele 💖",
  "🥰 Ele agradece todos os dias por ter você ❤️",
  "🌷 Você ilumina a vida do Henrique 💕",
  "💞 O amor dele por você nunca vai acabar ❤️",
  "🌸 Você é o maior presente da vida dele 💖",
  "❤️ Henrique ama cada detalhe seu",
  "💝 Você é o amor da vida dele Aurora 🥰"
];

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
// FUNÇÃO: MENSAGEM DE AMOR
// ==============================
async function enviarMensagemAmor() {
  try {
    const canal = await client.channels.fetch(CANAL_AMOR_ID).catch(() => null);
    if (!canal) return;

    const mensagem =
      mensagensAmor[Math.floor(Math.random() * mensagensAmor.length)];

    const embed = new EmbedBuilder()
      .setColor("#ff4d88")
      .setTitle("💖 Mensagem Especial do Henrique 💖")
      .setDescription(mensagem)
      .setThumbnail(client.user.displayAvatarURL())
      .setImage("https://media.tenor.com/qm7JxM4i6D8AAAAC/love-heart.gif")
      .setFooter({ text: "Com todo amor ❤️" })
      .setTimestamp();

    await canal.send({
      content: `🌹 Bom dia <@${AURORA_ID}> ❤️`,
      embeds: [embed]
    });

    console.log("💖 Mensagem de amor enviada.");
  } catch (err) {
    console.error("Erro ao enviar mensagem de amor:", err);
  }
}

// ==============================
// READY EVENT
// ==============================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  // ==========================
  // PAINEL DE REGISTRO
  // ==========================
  const canal = await client.channels.fetch(CANAL_REGISTRO_ID).catch(() => null);

  if (canal) {
    const mensagens = await canal.messages.fetch({ limit: 10 }).catch(() => null);

    if (mensagens) {
      const antigas = mensagens.filter(m => m.author.id === client.user.id);
      for (const msg of antigas.values()) {
        await msg.delete().catch(() => {});
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("✅ Registro de Entrada")
      .setDescription(
        "Clique abaixo para se registrar e receber o cargo de Morador."
      )
      .setColor("Green");

    const botao = new ButtonBuilder()
      .setCustomId("registrar_entrada")
      .setLabel("Registrar Entrada")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);

    await canal.send({ embeds: [embed], components: [row] });

    console.log("📌 Painel de registro enviado.");
  }

  // ==========================
  // LOOP MENSAGEM DE AMOR
  // ==========================
  setInterval(() => {
    const agora = new Date();

    // 08:10 todos os dias
    if (agora.getHours() === 8 && agora.getMinutes() === 10) {
      enviarMensagemAmor();
    }
  }, 60000);

  console.log("💖 Sistema de amor ativado (08:10)");
});

// ==============================
// INTERAÇÕES (BOTÃO REGISTRO)
// ==============================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId !== "registrar_entrada") return;

  const membro = await interaction.guild.members.fetch(interaction.user.id);

  if (membro.roles.cache.has(CARGO_MORADOR_ID)) {
    return interaction.reply({
      content: "Você já está registrado.",
      ephemeral: true
    });
  }

  await membro.roles.add(CARGO_MORADOR_ID).catch(() => {});

  await interaction.reply({
    content: "Registro concluído! Você recebeu o cargo de Morador.",
    ephemeral: true
  });

  const canalLogs = await interaction.guild.channels.fetch(CANAL_LOGS_ID).catch(() => null);

  if (canalLogs) {
    const log = new EmbedBuilder()
      .setTitle("📥 Novo Registro")
      .setDescription(`Usuário: <@${membro.id}>`)
      .setColor("Blue")
      .setTimestamp();

    await canalLogs.send({ embeds: [log] });
  }
});

// ==============================
// LOGIN
// ==============================
client.login(TOKEN);
