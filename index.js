const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const CANAL_NAO_APAGAR = "1456655599608660047";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const cargosNovos = [
  "👑・Chefe da Família Souza",
  "💍・Matriarca Souza",
  "🔥・Sub Chefe",
  "🥇・Sub Diretor Souza",
  "❤️・Henrique & Aurora",
  "💜・Filhos da Família Souza",
  "🌌・Astral City",
  "☣️・FiveZ",
  "📢・Divulgação Liberada",
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
    categoria: "📢 DIVULGAÇÃO",
    cargoPermitido: "📢・Divulgação Liberada",
    canais: [
      ["📢・divulgação-liberada", ChannelType.GuildText]
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
    categoria: "👑 PRIVADO DO CHEFE",
    cargo: "👑・Chefe da Família Souza",
    canais: [
      ["📸・fotos-do-chefe", ChannelType.GuildText],
      ["💬・chat-do-chefe", ChannelType.GuildText],
      ["🔊・Call do Chefe", ChannelType.GuildVoice]
    ]
  },
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

async function configurarServidor() {
  if (!TOKEN || !GUILD_ID) {
    console.log("❌ TOKEN ou GUILD_ID não configurado nas Variables.");
    return;
  }

  const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
  if (!guild) return console.log("❌ Servidor não encontrado.");

  await guild.channels.fetch();
  await guild.roles.fetch();

  const botMember = await guild.members.fetchMe();
  const canalMantido = guild.channels.cache.get(CANAL_NAO_APAGAR);
  const categoriaMantidaId = canalMantido?.parentId || null;

  console.log("🗑️ Apagando todos os canais, menos o canal protegido...");

  for (const canal of guild.channels.cache.values()) {
    if (canal.id === CANAL_NAO_APAGAR) continue;
    if (canal.id === categoriaMantidaId) continue;

    try {
      await canal.delete("Limpeza Família Souza");
      console.log(`🗑️ Canal apagado: ${canal.name}`);
    } catch {
      console.log(`❌ Não consegui apagar: ${canal.name}`);
    }
  }

  console.log("🗑️ Apagando cargos antigos...");

  for (const cargo of guild.roles.cache.values()) {
    if (cargo.name === "@everyone") continue;
    if (cargo.managed) continue;
    if (cargo.id === botMember.roles.highest.id) continue;
    if (cargo.position >= botMember.roles.highest.position) continue;

    try {
      await cargo.delete("Limpeza de cargos antigos Família Souza");
      console.log(`🗑️ Cargo apagado: ${cargo.name}`);
    } catch {
      console.log(`❌ Não consegui apagar cargo: ${cargo.name}`);
    }
  }

  await guild.channels.fetch();
  await guild.roles.fetch();

  console.log("⚙️ Criando cargos novos...");

  for (const nome of cargosNovos) {
    if (!guild.roles.cache.find(r => r.name === nome)) {
      await guild.roles.create({
        name: nome,
        reason: "Cargos novos Família Souza"
      });
      console.log(`✅ Cargo criado: ${nome}`);
    }
  }

  await guild.roles.fetch();

  const cargoChefe = guild.roles.cache.find(r => r.name === "👑・Chefe da Família Souza");

  console.log("⚙️ Criando canais públicos...");

  for (const bloco of publicos) {
    let overwrites = [];

    if (bloco.cargoPermitido) {
      const cargoPermitido = guild.roles.cache.find(r => r.name === bloco.cargoPermitido);

      overwrites = [
        {
          id: guild.roles.everyone.id,
          allow: [PermissionFlagsBits.ViewChannel],
          deny: [PermissionFlagsBits.SendMessages]
        }
      ];

      if (cargoPermitido) {
        overwrites.push({
          id: cargoPermitido.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        });
      }

      if (cargoChefe) {
        overwrites.push({
          id: cargoChefe.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        });
      }
    }

    const categoria = await guild.channels.create({
      name: bloco.categoria,
      type: ChannelType.GuildCategory,
      permissionOverwrites: overwrites
    });

    for (const [nomeCanal, tipoCanal] of bloco.canais) {
      await guild.channels.create({
        name: nomeCanal,
        type: tipoCanal,
        parent: categoria.id,
        permissionOverwrites: overwrites
      });

      console.log(`✅ Canal criado: ${nomeCanal}`);
    }
  }

  console.log("🔒 Criando salas privadas...");

  for (const sala of privadas) {
    const cargoGrupo = guild.roles.cache.find(r => r.name === sala.cargo);
    if (!cargoGrupo) continue;

    const permissaoPrivada = [
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
      }
    ];

    if (cargoChefe && cargoChefe.id !== cargoGrupo.id) {
      permissaoPrivada.push({
        id: cargoChefe.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak
        ]
      });
    }

    const categoria = await guild.channels.create({
      name: sala.categoria,
      type: ChannelType.GuildCategory,
      permissionOverwrites: permissaoPrivada
    });

    for (const [nomeCanal, tipoCanal] of sala.canais) {
      await guild.channels.create({
        name: nomeCanal,
        type: tipoCanal,
        parent: categoria.id,
        permissionOverwrites: permissaoPrivada
      });

      console.log(`🔒 Canal privado criado: ${nomeCanal}`);
    }
  }

  console.log("✅ Tudo pronto! Só ficou o canal protegido e a estrutura nova.");
}

client.once("ready", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  await configurarServidor();
});

client.login(TOKEN);
