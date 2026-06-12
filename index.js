const {
    Client,
    GatewayIntentBits,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = "COLOQUE_SEU_TOKEN_AQUI";

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

const categorias = [
    {
        nome: "👑 CASA DA FAMÍLIA SOUZA",
        canais: [
            ["💬・chat-da-família", ChannelType.GuildText],
            ["📢・avisos-da-família", ChannelType.GuildText],
            ["📸・fotos-da-família", ChannelType.GuildText],
            ["🎬・clips-e-momentos", ChannelType.GuildText],
            ["❤️・casais", ChannelType.GuildText]
        ]
    },
    {
        nome: "🌌 ASTRAL CITY",
        canais: [
            ["💬・chat-astral-city", ChannelType.GuildText],
            ["📸・fotos-astral-city", ChannelType.GuildText],
            ["📺・lives-astral", ChannelType.GuildText],
            ["🎉・eventos-astral", ChannelType.GuildText]
        ]
    },
    {
        nome: "☣️ FIVEZ",
        canais: [
            ["💬・chat-fivez", ChannelType.GuildText],
            ["📸・fotos-fivez", ChannelType.GuildText]
        ]
    },
    {
        nome: "🤖 BOTS",
        canais: [
            ["🤖・comandos", ChannelType.GuildText],
            ["🎮・jogos", ChannelType.GuildText]
        ]
    },
    {
        nome: "🎙️ CALLS",
        canais: [
            ["🔊・Resenha Família", ChannelType.GuildVoice],
            ["🔊・Geral 1", ChannelType.GuildVoice],
            ["🔊・Geral 2", ChannelType.GuildVoice],
            ["🔇・Sem Microfone", ChannelType.GuildVoice]
        ]
    }
];

client.once("ready", () => {
    console.log(`✅ ${client.user.tag} online!`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content === "!familia") {

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply("❌ Você precisa ser administrador.");
        }

        const guild = message.guild;

        await message.channel.send("⚙️ Configurando Família Souza...");

        // Criar cargos
        for (const nomeCargo of cargos) {
            if (!guild.roles.cache.find(r => r.name === nomeCargo)) {
                await guild.roles.create({
                    name: nomeCargo,
                    reason: "Configuração Família Souza"
                });
            }
        }

        // Criar categorias e canais
        for (const categoriaInfo of categorias) {

            let categoria = guild.channels.cache.find(
                c => c.name === categoriaInfo.nome &&
                c.type === ChannelType.GuildCategory
            );

            if (!categoria) {
                categoria = await guild.channels.create({
                    name: categoriaInfo.nome,
                    type: ChannelType.GuildCategory
                });
            }

            for (const canal of categoriaInfo.canais) {

                const nomeCanal = canal[0];
                const tipoCanal = canal[1];

                if (!guild.channels.cache.find(c => c.name === nomeCanal)) {
                    await guild.channels.create({
                        name: nomeCanal,
                        type: tipoCanal,
                        parent: categoria.id
                    });
                }
            }
        }

        // SALA PRIVADA CHEFE
        let categoriaChefe = guild.channels.cache.find(
            c => c.name === "👑 CHEFE DA FAMÍLIA" &&
            c.type === ChannelType.GuildCategory
        );

        const cargoChefe = guild.roles.cache.find(r => r.name === "👑・Chefe da Família Souza");

        if (!categoriaChefe) {

            categoriaChefe = await guild.channels.create({
                name: "👑 CHEFE DA FAMÍLIA",
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: cargoChefe.id,
                        allow: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });

            await guild.channels.create({
                name: "🔊・Call do Chefe",
                type: ChannelType.GuildVoice,
                parent: categoriaChefe.id
            });
        }

        // CATEGORIAS PRIVADAS
        const privadas = [
            {
                nome: "❤️ Henrique & Aurora",
                cargo: "❤️・Henrique & Aurora",
                texto: "📸・fotos-henrique-e-aurora",
                chat: "💬・chat-henrique-e-aurora",
                voz: "🔊・Call Henrique & Aurora"
            },
            {
                nome: "💜 Filhos da Família Souza",
                cargo: "💜・Filhos da Família Souza",
                texto: "📸・fotos-dos-filhos",
                chat: "💬・chat-dos-filhos",
                voz: "🔊・Call dos Filhos"
            },
            {
                nome: "🌌 Astral City",
                cargo: "🌌・Astral City",
                texto: "📸・fotos-astral-city-privado",
                chat: "💬・chat-astral-city-privado",
                voz: "🔊・Call Astral City"
            },
            {
                nome: "☣️ FiveZ",
                cargo: "☣️・FiveZ",
                texto: "📸・fotos-fivez-privado",
                chat: "💬・chat-fivez-privado",
                voz: "🔊・Call FiveZ"
            }
        ];

        for (const sala of privadas) {

            const cargo = guild.roles.cache.find(r => r.name === sala.cargo);

            if (!guild.channels.cache.find(c => c.name === sala.nome)) {

                const categoria = await guild.channels.create({
                    name: sala.nome,
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: cargo.id,
                            allow: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: cargoChefe.id,
                            allow: [PermissionFlagsBits.ViewChannel]
                        }
                    ]
                });

                await guild.channels.create({
                    name: sala.texto,
                    type: ChannelType.GuildText,
                    parent: categoria.id
                });

                await guild.channels.create({
                    name: sala.chat,
                    type: ChannelType.GuildText,
                    parent: categoria.id
                });

                await guild.channels.create({
                    name: sala.voz,
                    type: ChannelType.GuildVoice,
                    parent: categoria.id
                });
            }
        }

        message.channel.send("✅ Família Souza configurada com sucesso!");
    }
});

client.login(TOKEN);
