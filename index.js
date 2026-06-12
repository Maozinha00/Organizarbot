const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const cargos = [
  "👑・Chefe da Família Souza",
  "💍・Matriarca Souza",
  "🔥・Sub Chefe",
  "🥇・Sub Diretor Souza",
  "❤️・Henrique & Aurora",
  "💜・Filhos da Família Souza",
  "🌌・Astral City",
  "☣️・FiveZ",
  "💎・Família Souza",
  "🧬・Filho Souza",
  "🌸・Filha Souza",
  "👶・Neto Souza",
  "⭐・Nora Souza",
  "⭐・Genro Souza",
  "⭐・Irmã Souza",
  "⭐・Cunhado Souza",
  "⭐・Cunhada Souza",
  "❤️・Casado(a)",
  "💕・Namorando(a)",
  "🎉・Organizador de Eventos",
  "📣・Divulgador",
  "🎬・Streamer",
  "🛡️・Staff da Família",
  "🤝・Parceria",
  "💜・Nitro Booster",
  "🔞・+18",
  "🔇・Sem Microfone"
];

const publicos = [
  {
    categoria: "👑 CASA DA FAMÍLIA SOUZA",
    canais: [
      ["💬・chat-da-família", ChannelType.GuildText],
      ["📢・avisos-da-família", ChannelType.GuildText],
      ["📸・fotos-da-família", ChannelType.GuildText],
      ["🎬・clips-e-momentos", ChannelType.GuildText],
      ["❤️・casais", ChannelType.GuildText]
    ]
  },
  {
    categoria: "🌌 ASTRAL CITY",
    canais: [
      ["💬・chat-astral-city", ChannelType.GuildText],
      ["📸・fotos-astral-city", ChannelType.GuildText],
      ["📺・lives-astral", ChannelType.GuildText],
      ["🎉・eventos-astral", ChannelType.GuildText]
    ]
  },
  {
    categoria: "☣️ FIVEZ",
    canais: [
      ["💬・chat-fivez", ChannelType.GuildText],
      ["📸・fotos-fivez", ChannelType.GuildText],
      ["📢・avisos-fivez", ChannelType.GuildText]
    ]
  },
  {
    categoria: "🎙️ CALLS GERAIS",
    canais: [
      ["🔊・Resenha Família", ChannelType.GuildVoice],
      ["🔊・Geral 1", ChannelType.GuildVoice],
      ["🔊・Geral 2", ChannelType.GuildVoice],
      ["🔇・Sem Microfone", ChannelType.GuildVoice]
    ]
  },
  {
    categoria: "🤖 BOTS",
    canais: [
      ["🤖・comandos", ChannelType.GuildText],
      ["🎮・jogos", ChannelType.GuildText]
    ]
  }
];

const privadas = [
  {
    categoria: "❤️ Henrique & Aurora",
    cargo: "❤️・Henrique & Aurora",
    canais: [
      ["📸・fotos-henrique-e-aurora", ChannelType.GuildText],
      ["💬・chat-henrique-e-aurora", ChannelType.GuildText],
      ["🔊・Call Henrique & Aurora", ChannelType.GuildVoice]
    ]
  },
  {
    categoria: "💜 Filhos da Família Souza",
    cargo: "💜・Filhos da Família Souza",
    canais: [
      ["📸・fotos-dos-filhos", ChannelType.GuildText],
      ["💬・chat-dos-filhos", ChannelType.GuildText],
      ["🔊・Call dos Filhos", ChannelType.GuildVoice]
    ]
  },
  {
    categoria: "🌌 Privado Astral City",
    cargo: "🌌・Astral City",
    canais: [
      ["📸・fotos-astral-city-privado", ChannelType.GuildText],
      ["💬・chat-astral-city-privado", ChannelType.GuildText],
      ["🔊・Call Astral City", ChannelType.GuildVoice]
    ]
  },
  {
    categoria: "☣️ Privado FiveZ",
    cargo: "☣️・FiveZ",
    canais: [
      ["📸・fotos-fivez-privado", ChannelType.GuildText],
      ["💬・chat-fivez-privado", ChannelType.GuildText],
      ["🔊・Call FiveZ", ChannelType.GuildVoice]
    ]
  }
];

client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content !== "!familia") return;

  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply("❌ Você precisa ser administrador.");
  }

  const guild = client.guilds.cache.get(GUILD_ID);

  if (!guild) {
    return message.reply("❌ Servidor não encontrado. Veja se o GUILD_ID está certo nas Variables.");
  }

  await message.reply("⚙️ Configurando Discord da Família Souza...");

  for (const nome of cargos) {
    if (!guild.roles.cache.find(r => r.name === nome)) {
      await guild.roles.create({
        name: nome,
        reason: "Configuração Família Souza"
      });
    }
  }

  const cargoChefe = guild.roles.cache.find(r => r.name === "👑・Chefe da Família Souza");

  for (const bloco of publicos) {
    let categoria = guild.channels.cache.find(
      c => c.name === bloco.categoria && c.type === ChannelType.GuildCategory
    );

    if (!categoria) {
      categoria = await guild.channels.create({
        name: bloco.categoria,
        type: ChannelType.GuildCategory
      });
    }

    for (const [nomeCanal, tipoCanal] of bloco.canais) {
      if (!guild.channels.cache.find(c => c.name === nomeCanal)) {
        await guild.channels.create({
          name: nomeCanal,
          type: tipoCanal,
          parent: categoria.id
        });
      }
    }
  }

  let categoriaChefe = guild.channels.cache.find(
    c => c.name === "👑 PRIVADO DO CHEFE" && c.type === ChannelType.GuildCategory
  );

  if (!categoriaChefe) {
    categoriaChefe = await guild.channels.create({
      name: "👑 PRIVADO DO CHEFE",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: cargoChefe.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak
          ]
        }
      ]
    });
  }

  const canaisChefe = [
    ["📸・fotos-do-chefe", ChannelType.GuildText],
    ["💬・chat-do-chefe", ChannelType.GuildText],
    ["🔊・Call do Chefe", ChannelType.GuildVoice]
  ];

  for (const [nomeCanal, tipoCanal] of canaisChefe) {
    if (!guild.channels.cache.find(c => c.name === nomeCanal)) {
      await guild.channels.create({
        name: nomeCanal,
        type: tipoCanal,
        parent: categoriaChefe.id
      });
    }
  }

  for (const sala of privadas) {
    const cargoGrupo = guild.roles.cache.find(r => r.name === sala.cargo);

    let categoria = guild.channels.cache.find(
      c => c.name === sala.categoria && c.type === ChannelType.GuildCategory
    );

    if (!categoria) {
      categoria = await guild.channels.create({
        name: sala.categoria,
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: cargoGrupo.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak
            ]
          },
          {
            id: cargoChefe.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak
            ]
          }
        ]
      });
    }

    for (const [nomeCanal, tipoCanal] of sala.canais) {
      if (!guild.channels.cache.find(c => c.name === nomeCanal)) {
        await guild.channels.create({
          name: nomeCanal,
          type: tipoCanal,
          parent: categoria.id
        });
      }
    }
  }

  message.channel.send("✅ Discord da **Família Souza** configurado com sucesso!");
});

client.login(TOKEN);
