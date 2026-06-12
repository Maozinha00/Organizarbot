const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
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
    canais: [
      ["📢・divulgação-liberada", ChannelType.GuildText]
    ],
    cargoPermitido: "📢・Divulgação Liberada"
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

  if (!guild) {
    console.log("❌ Servidor não encontrado. Confira o GUILD_ID.");
    return;
  }

  console.log("⚙️ Configurando Discord da Família Souza...");

  await guild.roles.fetch();
  await guild.channels.fetch();

  for (const nome of cargos) {
    let cargo = guild.roles.cache.find(r => r.name === nome);

    if (!cargo) {
      cargo = await guild.roles.create({
        name: nome,
        reason: "Configuração Família Souza"
      });

      console.log(`✅ Cargo criado: ${nome}`);
    }
  }

  await guild.roles.fetch();

  const cargoChefe = guild.roles.cache.find(r => r.name === "👑・Chefe da Família Souza");

  for (const bloco of publicos) {
    let categoria = guild.channels.cache.find(
      c => c.name === bloco.categoria && c.type === ChannelType.GuildCategory
    );

    const overwrites = [];

    if (bloco.cargoPermitido) {
      const cargoPermitido = guild.roles.cache.find(r => r.name === bloco.cargoPermitido);

      overwrites.push(
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.SendMessages],
          allow: [PermissionFlagsBits.ViewChannel]
        }
      );

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

    if (!categoria) {
      categoria = await guild.channels.create({
        name: bloco.categoria,
        type: ChannelType.GuildCategory,
        permissionOverwrites: overwrites
      });

      console.log(`✅ Categoria criada: ${bloco.categoria}`);
    }

    for (const [nomeCanal, tipoCanal] of bloco.canais) {
      let canal = guild.channels.cache.find(c => c.name === nomeCanal);

      if (!canal) {
        canal = await guild.channels.create({
          name: nomeCanal,
          type: tipoCanal,
          parent: categoria.id,
          permissionOverwrites: overwrites
        });

        console.log(`✅ Canal criado: ${nomeCanal}`);
      }
    }
  }

  for (const sala of privadas) {
    const cargoGrupo = guild.roles.cache.find(r => r.name === sala.cargo);

    if (!cargoGrupo) {
      console.log(`❌ Cargo não encontrado: ${sala.cargo}`);
      continue;
    }

    let categoria = guild.channels.cache.find(
      c => c.name === sala.categoria && c.type === ChannelType.GuildCategory
    );

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

    if (!categoria) {
      categoria = await guild.channels.create({
        name: sala.categoria,
        type: ChannelType.GuildCategory,
        permissionOverwrites: permissaoPrivada
      });

      console.log(`🔒 Categoria privada criada: ${sala.categoria}`);
    }

    for (const [nomeCanal, tipoCanal] of sala.canais) {
      let canal = guild.channels.cache.find(c => c.name === nomeCanal);

      if (!canal) {
        canal = await guild.channels.create({
          name: nomeCanal,
          type: tipoCanal,
          parent: categoria.id,
          permissionOverwrites: permissaoPrivada
        });

        console.log(`✅ Canal privado criado: ${nomeCanal}`);
      }
    }
  }

  console.log("✅ Discord da Família Souza configurado com sucesso!");
}

client.once("ready", async () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  await configurarServidor();
});

client.login(TOKEN);
