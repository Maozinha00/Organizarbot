const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    Events,
    PermissionsBitField
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.TOKEN;

// ===============================
// CONFIGURAÇÃO
// ===============================

const CONFIG = {
    CANAL_REGISTRO_ID: "1515448138385592361",
    CANAL_LOGS_ID: "1515448473246498866",
    CARGO_MORADOR_ID: "1515125842328424640",

    EMBED_COLOR: "#2ECC71",
    FOOTER: "FiveZ • Sistema Automático"
};

const PANEL_FILE = "./panel.json";

const cooldown = new Map();

// ===============================
// CLIENT
// ===============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ],
    partials: [
        Partials.Channel
    ]
});

// ===============================
// JSON
// ===============================

function salvarPainel(id) {
    fs.writeFileSync(
        PANEL_FILE,
        JSON.stringify({ messageId: id }, null, 4)
    );
}

function carregarPainel() {

    if (!fs.existsSync(PANEL_FILE))
        return null;

    try {
        return JSON.parse(
            fs.readFileSync(PANEL_FILE)
        );
    } catch {
        return null;
    }

}

// ===============================
// VALIDAÇÃO
// ===============================

async function validarEstrutura(guild) {

    const canalRegistro =
        await guild.channels.fetch(CONFIG.CANAL_REGISTRO_ID).catch(() => null);

    const canalLogs =
        await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);

    const cargo =
        await guild.roles.fetch(CONFIG.CARGO_MORADOR_ID).catch(() => null);

    if (!canalRegistro)
        console.log("❌ Canal Registro não encontrado.");

    if (!canalLogs)
        console.log("❌ Canal Logs não encontrado.");

    if (!cargo)
        console.log("❌ Cargo Morador não encontrado.");

    return {
        canalRegistro,
        canalLogs,
        cargo
    };

}

// ===============================
// EMBED DO PAINEL
// ===============================

function criarPainel(guild) {

    const embed = new EmbedBuilder()

        .setColor(CONFIG.EMBED_COLOR)

        .setAuthor({
            name: guild.name,
            iconURL: guild.iconURL({ dynamic: true })
        })

        .setTitle("🏡 Sistema de Registro")

        .setDescription(`
# Seja bem-vindo!

Para acessar todo o servidor basta realizar seu registro.

### Você receberá:

> ✅ Cargo Morador

> 🔓 Liberação dos canais

> 🎉 Acesso completo ao servidor

Clique no botão abaixo.
`)

        .setThumbnail(
            guild.iconURL({ dynamic: true })
        )

        .setFooter({
            text: CONFIG.FOOTER
        })

        .setTimestamp();

    const botao = new ButtonBuilder()

        .setCustomId("registrar_entrada")

        .setEmoji("🏡")

        .setLabel("Realizar Registro")

        .setStyle(ButtonStyle.Success);

    const row =
        new ActionRowBuilder().addComponents(botao);

    return {
        embeds: [embed],
        components: [row]
    };

}

// ===============================
// ENVIAR / ATUALIZAR PAINEL
// ===============================

async function enviarPainel(guild, canal) {

    if (!canal) return;

    const painel = criarPainel(guild);

    const salvo = carregarPainel();

    if (salvo) {

        try {

            const mensagem =
                await canal.messages.fetch(salvo.messageId);

            await mensagem.edit(painel);

            console.log("✅ Painel atualizado.");

            return;

        } catch {}

    }

    const nova =
        await canal.send(painel);

    salvarPainel(nova.id);

    console.log("✅ Novo painel criado.");

}
// ===============================
// READY EVENT
// ===============================

client.once(Events.ClientReady, async () => {

    console.log(`✅ BOT ONLINE: ${client.user.tag}`);

    const guild = client.guilds.cache.first();

    if (!guild) {
        return console.log("❌ Nenhum servidor encontrado.");
    }

    const estrutura = await validarEstrutura(guild);

    await enviarPainel(
        guild,
        estrutura.canalRegistro
    );

});

// ===============================
// REGISTRO (BOTÃO)
// ===============================

client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.isButton())
        return;

    if (interaction.customId !== "registrar_entrada")
        return;

    try {

        const guild = interaction.guild;

        if (!guild) return;

        // ===============================
        // COOLDOWN ANTI-SPAM
        // ===============================

        if (cooldown.has(interaction.user.id)) {

            return interaction.reply({
                content: "⏳ Aguarde alguns segundos antes de usar novamente.",
                ephemeral: true
            });

        }

        cooldown.set(interaction.user.id, true);

        setTimeout(() => {
            cooldown.delete(interaction.user.id);
        }, 5000);

        // ===============================
        // VALIDAÇÃO
        // ===============================

        const estrutura = await validarEstrutura(guild);

        if (!estrutura.canalLogs || !estrutura.cargo) {

            return interaction.reply({
                content: "❌ Sistema mal configurado (canais/cargo).",
                ephemeral: true
            });

        }

        if (!guild.members.me.permissions.has(
            PermissionsBitField.Flags.ManageRoles
        )) {

            return interaction.reply({
                content: "❌ Não tenho permissão para gerenciar cargos.",
                ephemeral: true
            });

        }

        const membro = await guild.members.fetch(interaction.user.id)
            .catch(() => null);

        if (!membro) {

            return interaction.reply({
                content: "❌ Usuário não encontrado.",
                ephemeral: true
            });

        }

        // ===============================
        // JÁ REGISTRADO
        // ===============================

        if (membro.roles.cache.has(CONFIG.CARGO_MORADOR_ID)) {

            return interaction.reply({
                content: "✅ Você já está registrado.",
                ephemeral: true
            });

        }

        // ===============================
        // HIERARQUIA
        // ===============================

        if (
            estrutura.cargo.position >=
            guild.members.me.roles.highest.position
        ) {

            return interaction.reply({
                content: "❌ Meu cargo está abaixo do cargo Morador.",
                ephemeral: true
            });

        }

        // ===============================
        // ADD ROLE
        // ===============================

        await membro.roles.add(CONFIG.CARGO_MORADOR_ID);

        await interaction.reply({
            content: "🎉 Registro concluído com sucesso!",
            ephemeral: true
        });

        // ===============================
        // LOGS
        // ===============================

        const log = new EmbedBuilder()
            .setColor("#3498db")
            .setTitle("📥 Novo Registro")
            .addFields(
                {
                    name: "👤 Usuário",
                    value: `${membro.user.tag}`,
                    inline: true
                },
                {
                    name: "🆔 ID",
                    value: membro.id,
                    inline: true
                },
                {
                    name: "⏰ Data",
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: false
                }
            )
            .setThumbnail(
                membro.displayAvatarURL({ dynamic: true })
            )
            .setFooter({
                text: CONFIG.FOOTER
            })
            .setTimestamp();

        await estrutura.canalLogs.send({
            embeds: [log]
        });
// ===============================
// MENSAGEM PRIVADA (DM)
// ===============================

        await membro.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("🎉 Você foi registrado!")
                    .setDescription(`
Olá **${membro.user.username}** 👋

Seu registro foi concluído com sucesso!

Agora você já pode acessar todos os canais do servidor.

Seja bem-vindo(a)! 🏡
                    `)
                    .setFooter({ text: CONFIG.FOOTER })
                    .setTimestamp()
            ]
        }).catch(() => {

            // Ignora caso usuário esteja com DM fechada
        });

        // ===============================
        // LOG NO CONSOLE
        // ===============================

        console.log(`
=================================
📥 NOVO REGISTRO
👤 ${membro.user.tag}
🆔 ${membro.id}
⏰ ${new Date().toLocaleString()}
=================================
        `);

    } catch (err) {

        console.error("Erro no registro:", err);

        if (!interaction.replied) {

            interaction.reply({
                content: "❌ Ocorreu um erro ao processar o registro.",
                ephemeral: true
            }).catch(() => { });

        }

    }

});
// ===============================
// ERROS GLOBAIS (SEGURANÇA)
// ===============================

process.on("unhandledRejection", (reason) => {
    console.error("⚠️ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("⚠️ Uncaught Exception:", err);
});

// ===============================
// LOGIN
// ===============================

client.login(TOKEN);

// ===============================
// FIM DO BOT
// ===============================
