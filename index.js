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

const TOKEN = "MTQ5Mzk0ODU2ODA3ODI1ODM0Nw.G7xbrO.OgDdeq5G-nXghec06EckmrHwD1fPOYXqg43aE0";
const CLIENT_ID = "1493948568078258347";
const GUILD_ID = "1477683902041690342";

// COMANDO /organizar
const commands = [
  new SlashCommandBuilder()
    .setName('organizar')
    .setDescription('Organiza todo o Discord do Hospital HP')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(command => command.toJSON());

// REGISTRAR COMANDO
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('✅ Comando registrado!');
})();

// ESTRUTURA
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
    canais: ["💰・vendas","⏳・ausência","🔴・advertências","🏆・promoções","❌・demissões","⬇️・rebaixamento","📋・medidas-disciplinares","📦・acumulados","📊・relatório-equipe","📈・relatório-diretoria","📉・relatório-produção"]
  }
];

const canaisVoz = [
  "🔊 Recepção",
  "🔊 Equipe",
  "🔊 Emergência",
  "🔊 Diretoria",
  "🔊 Reunião"
];

// EVENTO
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'organizar') {
    await interaction.reply({ content: '🔄 Organizando servidor...', ephemeral: true });

    const guild = interaction.guild;

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
        let canal = guild.channels.cache.find(c => c.name === nome);

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
    let categoriaVoz = guild.channels.cache.find(c => c.name === "🔊 CALLS");

    if (!categoriaVoz) {
      categoriaVoz = await guild.channels.create({
        name: "🔊 CALLS",
        type: ChannelType.GuildCategory
      });
    }

    for (const nome of canaisVoz) {
      let canal = guild.channels.cache.find(c => c.name === nome);

      if (!canal) {
        canal = await guild.channels.create({
          name: nome,
          type: ChannelType.GuildVoice
        });
      }

      await canal.setParent(categoriaVoz.id);
    }

    await interaction.editReply('✅ Servidor organizado com sucesso!');
  }
});

client.once('ready', () => {
  console.log(`🤖 Bot online como ${client.user.tag}`);
});

client.login(TOKEN);
