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

// IDS
const CANAL_REGISTRO_ID = "1515448138385592361";
const CANAL_LOGS_ID = "1515448473246498866";
const CARGO_MORADOR_ID = "1515125842328424640";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel]
});

client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);

  // DAR CARGO PARA TODOS QUE JÁ ESTÃO NO SERVIDOR
  for (const guild of client.guilds.cache.values()) {
    await guild.members.fetch();

    const cargo = guild.roles.cache.get(CARGO_MORADOR_ID);
    if (!cargo) {
      console.log("❌ Cargo Morador não encontrado.");
      continue;
    }

    guild.members.cache.forEach(async membro => {
      if (membro.user.bot) return;
      if (membro.roles.cache.has(CARGO_MORADOR_ID)) return;

      await membro.roles.add(CARGO_MORADOR_ID).catch(err => {
        console.log(`❌ Erro ao dar cargo para ${membro.user.tag}:`, err.message);
      });
    });

    console.log("✅ Cargo Morador enviado para todos os membros antigos.");
  }

  const canal = await client.channels.fetch(CANAL_REGISTRO_ID).catch(() => null);
  if (!canal) return console.log("❌ Canal de registro não encontrado.");

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
      "Após o registro, você receberá o cargo **Morador**."
    )
    .setColor("Green")
    .setFooter({ text: "Família Souza • Registro Oficial" });

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
});

// QUANDO ALGUÉM ENTRAR NO SERVIDOR
client.on(Events.GuildMemberAdd, async membro => {
  if (membro.user.bot) return;

  await membro.roles.add(CARGO_MORADOR_ID).catch(err => {
    console.log("❌ Erro ao dar cargo automático:", err.message);
  });

  const canalLogs = await membro.guild.channels.fetch(CANAL_LOGS_ID).catch(() => null);

  if (canalLogs) {
    const log = new EmbedBuilder()
      .setTitle("📥 Novo Morador Entrou")
      .setDescription(
        `👤 Usuário: ${membro}\n` +
        `🆔 ID: ${membro.id}\n` +
        `✅ Cargo Morador dado automaticamente.`
      )
      .setColor("Green")
      .setThumbnail(membro.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: "Sistema de Entrada Automática" });

    await canalLogs.send({ embeds: [log] });
  }
});

// BOTÃO DE REGISTRO
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "registrar_entrada") return;

  const membro = await interaction.guild.members.fetch(interaction.user.id);

  if (membro.roles.cache.has(CARGO_MORADOR_ID)) {
    return interaction.reply({
      content: "✅ Você já está registrado e já possui o cargo **Morador**.",
      ephemeral: true
    });
  }

  await membro.roles.add(CARGO_MORADOR_ID).catch(error => {
    console.log("❌ Erro ao adicionar cargo:", error.message);
  });

  await interaction.reply({
    content: "✅ Registro concluído! Você recebeu o cargo **Morador**.",
    ephemeral: true
  });
});

client.login(TOKEN);
