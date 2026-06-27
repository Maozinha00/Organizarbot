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
// ENVIAR MENSAGEM DE AMOR
// ==============================

async function enviarMensagemAmor() {
  try {
    const canal = await client.channels.fetch(CANAL_AMOR_ID);

    if (!canal) return;

    const mensagem =
      mensagensAmor[Math.floor(Math.random() * mensagensAmor.length)];

    const embed = new EmbedBuilder()
      .setColor("#ff4d88")
      .setTitle("💖 Mensagem do Henrique para Aurora 💖")
      .setDescription(mensagem)
      .setThumbnail(client.user.displayAvatarURL())
      .setImage("https://media.tenor.com/qm7JxM4i6D8AAAAC/love-heart.gif")
      .setFooter({
        text: "Com todo amor do Henrique ❤️"
      })
      .setTimestamp();

    await canal.send({
      embeds: [embed]
    });

    console.log("💖 Mensagem de amor enviada.");
  } catch (err) {
    console.log("Erro ao enviar mensagem de amor:", err);
  }
}

// ==============================
// READY
// ==============================

client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  // Painel de Registro
  const canal = await client.channels.fetch(CANAL_REGISTRO_ID).catch(() => null);

  if (!canal) {
    console.log("❌ Canal de registro não encontrado.");
  } else {

    const mensagens = await canal.messages.fetch({ limit: 10 }).catch(() => null);

    if (mensagens) {
      const antigas = mensagens.filter(msg => msg.author.id === client.user.id);

      for (const msg of antigas.values()) {
        await msg.delete().catch(() => {});
      }
    }

    const embed = new EmbedBuilder()
      .setTitle("✅ Registro de Entrada")
      .setDescription(
        "Seja bem-vindo ao servidor!\n\n" +
        "Clique no botão abaixo para registrar sua entrada.\n\n" +
        "Após o registro, você receberá o cargo **Morador** e terá acesso aos canais."
      )
      .setColor("Green")
      .setFooter({
        text: "Família Souza • Registro Oficial"
      });

    const botao = new ButtonBuilder()
      .setCustomId("registrar_entrada")
      .setLabel("Registrar Entrada")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);

    await canal.send({
      embeds: [embed],
      components: [row]
    });

    console.log("✅ Painel de registro enviado.");
  }

  // Verifica a hora a cada minuto
  setInterval(() => {
    const agora = new Date();

    if (agora.getHours() === 8 && agora.getMinutes() === 10) {
      enviarMensagemAmor();
    }
  }, 60000);

  console.log("💖 Sistema de mensagens de amor iniciado.");
});

// ==============================
// BOTÃO DE REGISTRO
// ==============================

client.on(Events.InteractionCreate, async interaction => {

  if (!interaction.isButton()) return;

  if (interaction.customId !== "registrar_entrada") return;

  const membro = await interaction.guild.members.fetch(interaction.user.id);

  if (membro.roles.cache.has(CARGO_MORADOR_ID)) {
    return interaction.reply({
      content: "✅ Você já está registrado.",
      ephemeral: true
    });
  }

  await membro.roles.add(CARGO_MORADOR_ID).catch(error => {
    console.log(error);
  });

  await interaction.reply({
    content: "✅ Registro concluído! Você recebeu o cargo **Morador**.",
    ephemeral: true
  });

  const canalLogs = await interaction.guild.channels.fetch(CANAL_LOGS_ID).catch(() => null);

  if (canalLogs) {

    const log = new EmbedBuilder()
      .setTitle("📥 Novo Registro")
      .setDescription(
        `👤 Usuário: ${membro}\n` +
        `🆔 ID: ${membro.id}\n` +
        `📅 Registrado em: <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setColor("Blue")
      .setThumbnail(membro.user.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: "Sistema de Registro"
      });

    await canalLogs.send({
      embeds: [log]
    });

  }

});

// ==============================
// LOGIN
// ==============================

client.login(TOKEN);
