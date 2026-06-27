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
// CONTROLE ANTI-SPAM
// ==============================
let ultimoEnvioAmor = null;

// ==============================
// MENSAGENS DE AMOR
// ==============================
const mensagensAmor = [
  "💖 Bom dia, Aurora! O Henrique quer que você saiba que ele te ama mais do que qualquer coisa neste mundo. ❤️",
  "🌹 Aurora, você ilumina todos os dias do Henrique. Ele te ama infinitamente. 💕",
  "🥰 Henrique é apaixonado por você e agradece todos os dias por ter você em sua vida. ❤️",
  "💞 Aurora, você é o motivo do sorriso do Henrique. Nunca esqueça que ele te ama muito.",
  "✨ Você é a pessoa mais especial da vida do Henrique. Te amo para sempre, Aurora. ❤️",
  "🌸 Aurora, cada segundo ao seu lado vale uma eternidade. Henrique ama você demais. 💖",
  "💘 Henrique ama você hoje, amanhã e por toda a vida. ❤️",
  "🌺 Aurora, você faz o coração do Henrique bater mais forte todos os dias.",
  "💕 O amor do Henrique por você cresce a cada amanhecer. Tenha um dia maravilhoso, Aurora!",
  "❤️ Henrique só queria lembrar que você é o amor da vida dele.",
  "💝 Aurora, você é linda, incrível e perfeita aos olhos do Henrique.",
  "🌷 Henrique sempre vai cuidar de você com todo carinho do mundo. ❤️",
  "💖 Você é o sonho realizado do Henrique, Aurora.",
  "🥹 Henrique agradece a Deus todos os dias por ter encontrado você.",
  "❤️ Não existe distância, tempo ou dificuldade que diminua o amor que Henrique sente por você.",
  "🌹 Aurora, você é a melhor parte da vida do Henrique.",
  "💕 Henrique ama seu sorriso, seu jeito e tudo o que faz você ser especial.",
  "💞 Você é o presente mais precioso que a vida deu ao Henrique.",
  "✨ Aurora, nunca duvide: Henrique ama você de todo coração.",
  "❤️ Que seu dia seja lindo, meu amor. Henrique sempre estará ao seu lado."
];
];

// ==============================
// CLIENT (INTENTS CORRETOS)
// ==============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ==============================
// FUNÇÃO: AMOR
// ==============================
async function enviarMensagemAmor() {
  try {
    const canal = await client.channels.fetch(CANAL_AMOR_ID).catch(() => null);
    if (!canal) return;

    const msg =
      mensagensAmor[Math.floor(Math.random() * mensagensAmor.length)];

    const embed = new EmbedBuilder()
      .setColor("#ff4d88")
      .setTitle("💖 Mensagem Especial do Henrique 💖")
      .setDescription(msg)
      .setImage("https://media.tenor.com/qm7JxM4i6D8AAAAC/love-heart.gif")
      .setTimestamp();

    await canal.send({
      content: `🌹 <@${AURORA_ID}> ❤️ O Henrique te ama muito!`,
      embeds: [embed]
    });

    console.log("💖 Mensagem de amor enviada");
  } catch (err) {
    console.error(err);
  }
}

// ==============================
// READY
// ==============================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  // ==========================
  // PAINEL REGISTRO
  // ==========================
  const canal = await client.channels.fetch(CANAL_REGISTRO_ID).catch(() => null);

  if (canal) {
    const msgs = await canal.messages.fetch({ limit: 10 }).catch(() => null);

    if (msgs) {
      const antigas = msgs.filter(m => m.author.id === client.user.id);
      for (const msg of antigas.values()) {
        await msg.delete().catch(() => {});
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("✅ Registro de Entrada")
      .setDescription("Clique no botão para se registrar e receber o cargo Morador.")
      .setColor("Green");

    const botao = new ButtonBuilder()
      .setCustomId("registrar_entrada")
      .setLabel("Registrar Entrada")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);

    await canal.send({
      embeds: [embed],
      components: [row]
    });
  }

  // ==========================
  // AUTOMÁTICO 08:30
  // ==========================
  setInterval(() => {
    const now = new Date();
    const today = now.toDateString();

    if (
      now.getHours() === 8 &&
      now.getMinutes() === 30 &&
      ultimoEnvioAmor !== today
    ) {
      ultimoEnvioAmor = today;
      enviarMensagemAmor();
    }
  }, 30000);

  console.log("💖 Sistema de amor ativo (08:30)");
});

// ==============================
// BOTÃO REGISTRO
// ==============================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "registrar_entrada") return;

  const membro = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

  if (!membro) {
    return interaction.reply({
      content: "❌ Usuário não encontrado.",
      ephemeral: true
    });
  }

  if (membro.roles.cache.has(CARGO_MORADOR_ID)) {
    return interaction.reply({
      content: "✅ Você já está registrado.",
      ephemeral: true
    });
  }

  await membro.roles.add(CARGO_MORADOR_ID).catch(() => {});

  await interaction.reply({
    content: "✅ Registro concluído! Você recebeu o cargo Morador.",
    ephemeral: true
  });

  const canalLogs = await interaction.guild.channels.fetch(CANAL_LOGS_ID).catch(() => null);

  if (canalLogs) {
    const log = new EmbedBuilder()
      .setTitle("📥 Novo Registro")
      .setDescription(`👤 Usuário: <@${membro.id}>\n🆔 ID: ${membro.id}`)
      .setColor("Blue")
      .setTimestamp();

    await canalLogs.send({ embeds: [log] });
  }
});

// ==============================
// COMANDO !AMOR (CORRIGIDO)
// ==============================
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  if (message.content === "!amor") {
    try {
      const canal = await client.channels.fetch(CANAL_AMOR_ID).catch(() => null);

      if (!canal) {
        return message.reply("❌ Canal de amor não encontrado.");
      }

      const msg =
        mensagensAmor[Math.floor(Math.random() * mensagensAmor.length)];

      const embed = new EmbedBuilder()
        .setColor("#ff4d88")
        .setTitle("💖 Amor do Henrique 💖")
        .setDescription(msg)
        .setImage("https://media.tenor.com/qm7JxM4i6D8AAAAC/love-heart.gif");

      await canal.send({
        content: `🌹 <@${AURORA_ID}> 💖 Mensagem do Henrique`,
        embeds: [embed]
      });

      await message.reply("💖 Mensagem enviada no canal de amor!");
    } catch (err) {
      console.error("Erro no !amor:", err);
    }
  }
});

// ==============================
// LOGIN
// ==============================
client.login(TOKEN);
