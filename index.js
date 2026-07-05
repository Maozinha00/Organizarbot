/**
 * ============================================================================
 * BOT AUTOMÁTICO DE REGISTRO DISCORD — FIVEZ & LUMENFALL CITY (ES MODULES)
 * ============================================================================
 */

import dotenv from 'dotenv';
dotenv.config();

import {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events,
    PermissionsBitField
} from "discord.js";

import fs from "fs";

// Token de conexão do Bot (Pega do .env ou das variáveis do Railway)
const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;

// ===============================
// CONFIGURAÇÃO DO SISTEMA
// ===============================

const CONFIG = {
    CANAL_REGISTRO_ID: "1515448138385592361",
    CANAL_LOGS_ID: "1515448473246498866", // Canal de Logs correto atualizado
    CARGO_MORADOR_ID: "1515125842328424640",

    EMBED_COLOR: "#2ECC71",
    FOOTER: "FiveZ & Lumenfall • Sistema Automático",
    SPAM_COOLDOWN_MS: 30000, // 30 segundos de cooldown
    FORMATO_APELIDO: "{TAG} {NOME} | {ID}",
    PERMITIR_RECADASTRO: true,

    GRUPOS: [
        {
            "name": "Amigos",
            "roleId": "1515125842328424640",
            "emoji": "🤝",
            "tag": "|AMG|",
            "description": "Grupo geral de amigos e parceiros da comunidade"
        },
        {
            "name": "Família",
            "roleId": "1515125828185493675",
            "emoji": "❤️",
            "tag": "|Souza|",
            "description": "Membros mais próximos e família do servidor"
        },
        {
            "name": "FiveZ Hunters",
            "roleId": "1515125826780135485",
            "emoji": "🎯",
            "tag": "|Hunters|",
            "description": "Caçadores de elite de FiveZ e operações táticas"
        },
        {
            "name": "Lumenfall City",
            "roleId": "1520163929106550794",
            "emoji": "🏙️",
            "tag": "|Lumen|",
            "description": "Cidadãos e moradores oficiais de Lumenfall City"
        }
    ]
};

const PANEL_FILE = "./panel.json";
const cooldown = new Map();

// Inicialização do cliente Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Ativado para leitura de comandos como !limparcargos
    ],
    partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.User
    ]
});

// Salvamento persistente do painel de registro
function salvarPainel(messageId) {
    try {
        fs.writeFileSync(PANEL_FILE, JSON.stringify({ messageId, updatedAt: new Date().toISOString() }, null, 4));
    } catch (err) {
        console.error("⚠️ Erro ao salvar o painel:", err);
    }
}

function carregarPainel() {
    if (!fs.existsSync(PANEL_FILE)) return null;
    try {
        return JSON.parse(fs.readFileSync(PANEL_FILE, "utf-8"));
    } catch (e) {
        return null;
    }
}

async function validarEstrutura(guild) {
    const canalRegistro = await guild.channels.fetch(CONFIG.CANAL_REGISTRO_ID).catch(() => null);
    const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
    const cargoMorador = await guild.roles.fetch(CONFIG.CARGO_MORADOR_ID).catch(() => null);
    return { canalRegistro, canalLogs, cargoMorador };
}

function criarPainel(guild) {
    const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) || undefined })
        .setTitle("🏡 Sistema de Registro — Cidadania & Grupos")
        .setDescription(`# Seja bem-vindo à nossa Comunidade!\n\nPara desbloquear todos os canais de voz e texto do servidor e registrar sua cidadania, selecione seu grupo abaixo.\n\n### 🎁 Benefícios ao registrar:\n> ✅ **Cargo Morador** + Cargo do seu Grupo escolhido\n> 🏷️ **Apelido Atualizado Automaticamente:** Com a tag da facção, seu Nome e ID\n> 🔓 **Liberação imediata** dos canais e categorias do servidor\n> 🎉 **Acesso completo** a eventos e roleplay da cidade\n\n👇 *Clique no botão abaixo, escolha seu grupo e preencha o formulário!*`)
        .setThumbnail(guild.iconURL({ dynamic: true }) || null)
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

    const botao = new ButtonBuilder()
        .setCustomId("abrir_menu_registro")
        .setEmoji("🏡")
        .setLabel("Realizar Registro")
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);
    return { embeds: [embed], components: [row] };
}

async function enviarPainel(guild, canal) {
    if (!canal) return;
    const painel = criarPainel(guild);
    const salvo = carregarPainel();

    if (salvo && salvo.messageId) {
        try {
            const mensagem = await canal.messages.fetch(salvo.messageId);
            await mensagem.edit(painel);
            console.log("✅ Painel atualizado com sucesso!");
            return;
        } catch (e) {
            console.log("ℹ️ Criando novo painel...");
        }
    }

    const novaMensagem = await canal.send(painel);
    salvarPainel(novaMensagem.id);
}

client.once(Events.ClientReady, async () => {
    console.log("==================================================");
    console.log("✅ BOT ONLINE NO RAILWAY: " + client.user.tag);
    console.log("==================================================");

    const guild = client.guilds.cache.first();
    if (!guild) return;

    const estrutura = await validarEstrutura(guild);
    if (estrutura.canalRegistro) {
        await enviarPainel(guild, estrutura.canalRegistro);
    }
});

// Eventos de interação e Botões/Menus
client.on(Events.InteractionCreate, async (interaction) => {
    const guild = interaction.guild;
    if (!guild) return;

    // Abrir o menu de registro
    if (interaction.isButton() && interaction.customId === "abrir_menu_registro") {
        if (cooldown.has(interaction.user.id)) {
            const tempoRestante = Math.ceil((cooldown.get(interaction.user.id) - Date.now()) / 1000);
            if (tempoRestante > 0) {
                return interaction.reply({
                    content: `⏳ **Anti-Spam:** Aguarde ${tempoRestante} segundos antes de tentar novamente.`,
                    ephemeral: true
                });
            }
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("select_grupo_registro")
            .setPlaceholder("🎯 Selecione seu Grupo / Facção na lista...");

        CONFIG.GRUPOS.forEach(g => {
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${g.name} (${g.tag})`)
                    .setValue(g.roleId)
                    .setEmoji(g.emoji)
                    .setDescription(g.description || `Ingressar no grupo ${g.name}`)
            );
        });

        const row = new ActionRowBuilder().addComponents(selectMenu);
        return interaction.reply({
            content: "🏡 **Escolha seu grupo abaixo para iniciar o registro:**",
            components: [row],
            ephemeral: true
        });
    }

    // Formulário popup (Modal)
    if (interaction.isStringSelectMenu() && interaction.customId === "select_grupo_registro") {
        const roleIdEscolhido = interaction.values[0];
        const grupoEscolhido = CONFIG.GRUPOS.find(g => g.roleId === roleIdEscolhido);

        const modal = new ModalBuilder()
            .setCustomId("modal_reg_" + roleIdEscolhido)
            .setTitle("Registro - " + grupoEscolhido.name);

        const inputNome = new TextInputBuilder()
            .setCustomId("input_nome")
            .setLabel("Seu Nome no Jogo / Personagem")
            .setPlaceholder("Ex: Henrique Souza")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const inputId = new TextInputBuilder()
            .setCustomId("input_id")
            .setLabel("Seu ID no Jogo / Cidade")
            .setPlaceholder("Ex: 15420")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(inputNome),
            new ActionRowBuilder().addComponents(inputId)
        );

        await interaction.showModal(modal);
    }

    // Enviar formulário para logs
    if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_reg_")) {
        const roleIdEscolhido = interaction.customId.replace("modal_reg_", "");
        const grupoEscolhido = CONFIG.GRUPOS.find(g => g.roleId === roleIdEscolhido);

        const nome = interaction.fields.getTextInputValue("input_nome").trim();
        const idJogo = interaction.fields.getTextInputValue("input_id").trim();
        let novoApelido = CONFIG.FORMATO_APELIDO.replace("{TAG}", grupoEscolhido.tag).replace("{NOME}", nome).replace("{ID}", idJogo);

        if (novoApelido.length > 32) novoApelido = novoApelido.substring(0, 32);

        cooldown.set(interaction.user.id, Date.now() + CONFIG.SPAM_COOLDOWN_MS);
        setTimeout(() => cooldown.delete(interaction.user.id), CONFIG.SPAM_COOLDOWN_MS);

        const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
        if (!canalLogs) return interaction.reply({ content: "❌ Canal de logs de registros não encontrado.", ephemeral: true });

        const embedLog = new EmbedBuilder()
            .setColor("#3498DB")
            .setTitle("📥 Nova Solicitação de Registro & Apelido")
            .addFields(
                { name: "👤 Membro", value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: "🎯 Grupo", value: `${grupoEscolhido.emoji} **${grupoEscolhido.name}**`, inline: true },
                { name: "📝 Nome", value: nome, inline: true },
                { name: "🔢 ID", value: idJogo, inline: true },
                { name: "🏷️ Apelido Solicitado", value: `\`${novoApelido}\``, inline: false }
            )
            .setTimestamp();

        const btnAprovar = new ButtonBuilder().setCustomId(`aprovar_reg_${interaction.user.id}_${roleIdEscolhido}`).setEmoji("✅").setLabel("Aprovar").setStyle(ButtonStyle.Success);
        const btnRecusar = new ButtonBuilder().setCustomId(`recusar_reg_${interaction.user.id}_${roleIdEscolhido}`).setEmoji("❌").setLabel("Recusar").setStyle(ButtonStyle.Danger);

        await canalLogs.send({ embeds: [embedLog], components: [new ActionRowBuilder().addComponents(btnAprovar, btnRecusar)] });

        return interaction.reply({ content: "✅ **Solicitação de registro enviada à administração!** Por favor, aguarde a aprovação.", ephemeral: true });
    }

    // Ações do Moderador (Aprovar / Recusar)
    if (interaction.isButton() && (interaction.customId.startsWith("aprovar_reg_") || interaction.customId.startsWith("recusar_reg_"))) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ Você não tem permissão para gerenciar registros.", ephemeral: true });
        }

        const partes = interaction.customId.split("_");
        const acao = partes[0];
        const alvoUserId = partes[2];
        const alvoRoleId = partes[3];

        const membroAlvo = await guild.members.fetch(alvoUserId).catch(() => null);
        const grupo = CONFIG.GRUPOS.find(g => g.roleId === alvoRoleId);

        if (acao === "aprovar") {
            if (!membroAlvo) return interaction.reply({ content: "⚠️ Membro não está no servidor.", ephemeral: true });

            const embedOriginal = interaction.message.embeds[0];
            const campoApelido = embedOriginal.fields.find(f => f.name.includes("Apelido"));
            const novoApelido = campoApelido ? campoApelido.value.replace(/[`]/g, "").trim() : null;

            // Atribuir cargos
            await membroAlvo.roles.add([CONFIG.CARGO_MORADOR_ID, alvoRoleId]).catch(err => {
                throw new Error("Coloque meu cargo acima dos cargos que preciso atribuir nas configurações!");
            });

            // Mudar Apelido
            if (novoApelido && membroAlvo.id !== guild.ownerId) {
                await membroAlvo.setNickname(novoApelido).catch(() => {});
            }

            await interaction.update({
                embeds: [EmbedBuilder.from(embedOriginal).setColor("#2ECC71").setTitle("✅ Registro Aprovado!")],
                components: []
            });

            await membroAlvo.send({ content: `🎉 **Seu registro na comunidade foi Aprovado!** O cargo de Morador e de **${grupo.name}** foram entregues.` }).catch(() => {});
        } else if (acao === "recusar") {
            await interaction.update({
                embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setColor("#E74C3C").setTitle("❌ Registro Recusado")],
                components: []
            });
            if (membroAlvo) {
                await membroAlvo.send({ content: `❌ **Sua solicitação de registro para ${grupo.name} foi recusada.** Você pode refazer o cadastro no painel do servidor.` }).catch(() => {});
            }
        }
    }
});

// Comandos por mensagem de texto (!limparcargos ou !resetgrupos)
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;

    const content = message.content.toLowerCase();
    if (content === "!limparcargos" || content === "!resetgrupos") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ Apenas Administradores podem usar este comando.");
        }

        const msgStatus = await message.reply("⏳ **Limpando cargos antigos dos membros...** Aguarde.");
        const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
        let count = 0;

        const membros = await message.guild.members.fetch();
        for (const [id, mem] of membros) {
            if (mem.user.bot) continue;
            const cargosRemover = mem.roles.cache.filter(r => todosGruposIds.includes(r.id));
            if (cargosRemover.size > 0) {
                await mem.roles.remove(cargosRemover).catch(() => {});
                count++;
            }
        }

        await msgStatus.edit(`✅ **Limpeza Geral Concluída!** Os cargos foram retirados de **${count}** membros. O painel está liberado para recadastro!`);
    }
});

// Anti-Crash do processo do Bot
process.on("unhandledRejection", (r) => console.error("Unhandled Rejection:", r));
process.on("uncaughtException", (e) => console.error("Uncaught Exception:", e));

client.login(TOKEN);
