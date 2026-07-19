/**
 * ============================================================================
 * BOT AUTOMÁTICO DE REGISTRO DISCORD — FIVEZ & LUMENFALL CITY
 * ============================================================================
 * 
 * Funcionalidades completas, seguras e com proteção contra falhas de Admin:
 *  - Registro de Entrada e Saída de membros no canal de ID "1524222632923496509".
 *  - Painel de Registro interativo que se atualiza automaticamente.
 *  - Formulário Modal (Popup) obrigatório solicitando Nome, ID e Quem Contratou.
 *  - Envio de logs para aprovação da Staff com botões (✅ Aprovar / ❌ Recusar).
 *  - Atribuição automática de cargos e alteração de apelido.
 *  - Proteção Anti-Spam de 30 segundos.
 *  - Rotina automática de Auditoria de Cargos com permissão de Administrador.
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

// Token de conexão do Bot (Pega do arquivo .env)
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

// ==========================================
// CONFIGURAÇÃO DO SISTEMA
// ==========================================
const CONFIG = {
    CANAL_REGISTRO_ID: "1515448138385592361",
    CANAL_LOGS_ID: "1515448473246498866",          // Canal de Logs de Aprovação
    CANAL_ENTRADA_SAIDA_ID: "1524222632923496509", // Canal para Entrada e Saída de membros
    CARGO_MORADOR_ID: "1515125842328424640",
    CARGO_CHEFE_ID: "1515125820836941985",         // "1515125820836941985" - O ÚNICO QUE PODE TUDO

    EMBED_COLOR: "#2ECC71",
    FOOTER: "FiveZ & Lumenfall • Sistema Automático",
    SPAM_COOLDOWN_MS: 30000,                       // 30 segundos de proteção
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

// Map para controle do Anti-Spam
const cooldown = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // Requer ativar no Discord Developer Portal
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ],
    partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.User
    ]
});

// ==========================================
// AUDITORIA AUTOMÁTICA DE VULNERABILIDADE
// ==========================================
async function verificarVulnerabilidadesAdmin(guild) {
    try {
        console.log("🔍 Iniciando varredura de segurança nos cargos...");
        const roles = await guild.roles.fetch();
        const cargosVulneraveis = [];

        roles.forEach(role => {
            // Se o cargo tem Administrador ativo e NÃO é o cargo do Chefe nem o próprio bot
            if (role.permissions.has(PermissionsBitField.Flags.Administrator)) {
                if (role.id !== CONFIG.CARGO_CHEFE_ID && role.id !== guild.members.me.roles.highest.id && !role.managed) {
                    cargosVulneraveis.push(role);
                }
            }
        });

        const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
        if (canalLogs && canalLogs.isTextBased() && cargosVulneraveis.length > 0) {
            const embedAuditoria = new EmbedBuilder()
                .setColor("#E74C3C")
                .setTitle("🚨 Alerta de Segurança: Vulnerabilidade de Permissões!")
                .setDescription(`Foi detectado que um ou mais cargos possuem a permissão global de **Administrador** ativada.

**Por que isso é um problema?**
No Discord, cargos com permissão de **Administrador** fura-bloqueiam canais de forma nativa. Eles conseguem ver canais de grupos privados e cofres mesmo que você tente bloqueá-los nas configurações do canal!`)
                .setTimestamp();

            cargosVulneraveis.forEach(role => {
                embedAuditoria.addFields({
                    name: `⚠️ Cargo com Risco: ${role.name}`,
                    value: `• ID: \`${role.id}\`\n• **Problema:** Ignora bloqueios de canais. \n• **Solução:** Desative "Administrador" e marque manualmente apenas o que eles precisam nas configurações de cargo do Discord.`,
                    inline: false
                });
            });

            embedAuditoria.addFields({
                name: "👑 Único Cargo com permissão divina ativa:",
                value: `<@&${CONFIG.CARGO_CHEFE_ID}> (Chefe pode ver e fazer tudo)`,
                inline: false
            });

            await canalLogs.send({ embeds: [embedAuditoria] });
            console.log(`🚨 Alerta de segurança enviado para os logs: ${cargosVulneraveis.length} cargos vulneráveis.`);
        }
    } catch (err) {
        console.error("Erro na auditoria de segurança de cargos:", err);
    }
}

// ==========================================
// PERSISTÊNCIA E LOGIN
// ==========================================
function salvarPainel(messageId) {
    try {
        fs.writeFileSync(PANEL_FILE, JSON.stringify({ messageId, updatedAt: new Date().toISOString() }, null, 4));
    } catch (err) {
        console.error("Erro ao salvar panel.json:", err);
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

function criarPainel(guild) {
    const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL() || undefined })
        .setTitle("🏡 Sistema de Registro — Cidadania & Grupos")
        .setDescription(`# Seja bem-vindo à nossa Comunidade!

📢 **AVISO IMPORTANTE PARA TODOS (@everyone):**
> ⚠️ **PRAZO LIMITE DE REGISTRO:** Todo membro que entrar no servidor tem um prazo máximo de **3 dias** para realizar o registro de cidadania.
> 🚫 Se você passar de **3 dias** no servidor sem realizar o seu registro (ficando sem os cargos dos grupos), você será **kickado automaticamente** pelo sistema!

Para desbloquear todos os canais de voz e texto do servidor e registrar sua cidadania, selecione seu grupo abaixo.

### 🎁 Benefícios ao registrar:
> ✅ **Cargo do seu Grupo escolhido**
> 🏷️ **Apelido Atualizado:** Com a tag da facção, seu Nome, ID e quem te contratou
> 🔓 **Liberação imediata** dos canais e categorias do servidor

👇 *Clique no botão abaixo, escolha seu grupo e preencha o formulário!*`)
        .setThumbnail(guild.iconURL() || null)
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

    const botao = new ButtonBuilder()
        .setCustomId("abrir_menu_registro")
        .setEmoji("🏡")
        .setLabel("Realizar Registro")
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);

    return { content: "@everyone", embeds: [embed], components: [row] };
}

async function enviarPainel(guild, canal) {
    if (!canal) return;
    const painel = criarPainel(guild);
    const salvo = carregarPainel();

    if (salvo && salvo.messageId) {
        try {
            const message = await canal.messages.fetch(salvo.messageId);
            await message.edit(painel);
            console.log("✅ Painel existente atualizado.");
            return;
        } catch (e) {
            console.log("ℹ️ Criando novo painel de registro...");
        }
    }

    const novaMensagem = await canal.send(painel);
    salvarPainel(novaMensagem.id);
}

client.once(Events.ClientReady, async () => {
    console.log(`✅ BOT ONLINE: ${client.user.tag}`);
    const guild = client.guilds.cache.first();
    if (!guild) return;

    // Realiza auditoria de segurança dos cargos ao ligar o bot
    await verificarVulnerabilidadesAdmin(guild);

    const canalRegistro = await guild.channels.fetch(CONFIG.CANAL_REGISTRO_ID).catch(() => null);
    if (canalRegistro) {
        await enviarPainel(guild, canalRegistro);
    }
});

// ==========================================
// REGISTRO DE ENTRADA
// ==========================================
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        const canalLog = await member.guild.channels.fetch(CONFIG.CANAL_ENTRADA_SAIDA_ID).catch(() => null);
        if (canalLog && canalLog.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor("#2ECC71")
                .setAuthor({ name: "Membro Entrou", iconURL: member.user.displayAvatarURL() })
                .setTitle(`Seja bem-vindo(a), ${member.user.username}! 🏙️`)
                .setDescription(`Olá ${member}! Desejamos que tenha uma excelente jornada em nossa cidade. 

⚠️ Você tem até **3 dias** para se registrar no canal <#${CONFIG.CANAL_REGISTRO_ID}> e evitar remoção automática.`)
                .addFields(
                    { name: "👤 Usuário Discord", value: `${member.user.tag} (${member})`, inline: true },
                    { name: "🆔 Discord ID", value: `\`${member.id}\``, inline: true },
                    { name: "📊 População Atual", value: `\`${member.guild.memberCount}\` cidadãos`, inline: true }
                )
                .setFooter({ text: CONFIG.FOOTER })
                .setTimestamp();

            await canalLog.send({ content: `${member}, bem-vindo!`, embeds: [embed] });
        }
    } catch (err) {
        console.error("Erro no evento de Entrada:", err);
    }
});

// ==========================================
// REGISTRO DE SAÍDA
// ==========================================
client.on(Events.GuildMemberRemove, async (member) => {
    try {
        const canalLog = await member.guild.channels.fetch(CONFIG.CANAL_ENTRADA_SAIDA_ID).catch(() => null);
        if (canalLog && canalLog.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor("#E74C3C")
                .setAuthor({ name: "Membro Saiu", iconURL: member.user.displayAvatarURL() })
                .setTitle(`Desconexão de Cidadão 🏃‍♂️💨`)
                .setDescription(`O cidadão **${member.user.username}** decidiu se mudar de nossa cidade.`)
                .addFields(
                    { name: "👤 Usuário", value: `**${member.user.tag}**`, inline: true },
                    { name: "🆔 ID", value: `\`${member.id}\``, inline: true },
                    { name: "📊 População", value: `\`${member.guild.memberCount}\` cidadãos`, inline: true }
                )
                .setFooter({ text: CONFIG.FOOTER })
                .setTimestamp();

            await canalLog.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error("Erro no evento de Saída:", err);
    }
});

// ==========================================
// TRATAMENTO DE INTERAÇÕES E MODAL
// ==========================================
client.on(Events.InteractionCreate, async (interaction) => {
    const guild = interaction.guild;
    if (!guild) return;

    if (interaction.isButton() && interaction.customId === "abrir_menu_registro") {
        if (cooldown.has(interaction.user.id)) {
            const tempo = Math.ceil((cooldown.get(interaction.user.id) - Date.now()) / 1000);
            if (tempo > 0) {
                return interaction.reply({
                    content: `⏳ **Anti-Spam:** Aguarde **${tempo} segundos** para tentar se registrar novamente.`,
                    ephemeral: true
                });
            }
        }

        const membro = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (!membro) return interaction.reply({ content: "Erro ao carregar seu perfil.", ephemeral: true });

        if (!CONFIG.PERMITIR_RECADASTRO && membro.roles.cache.has(CONFIG.CARGO_MORADOR_ID)) {
            return interaction.reply({ content: "✅ Você já possui o cargo de Morador registrado!", ephemeral: true });
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
                    .setDescription(g.description.substring(0, 100))
            );
        });

        const row = new ActionRowBuilder().addComponents(selectMenu);
        return interaction.reply({ content: "Escolha abaixo qual grupo você deseja participar:", components: [row], ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "select_grupo_registro") {
        const roleId = interaction.values[0];
        const grupo = CONFIG.GRUPOS.find(g => g.roleId === roleId);

        const modal = new ModalBuilder()
            .setCustomId(`modal_reg_${grupo.roleId}`)
            .setTitle(`Registro - ${grupo.name}`);

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

        const inputContratou = new TextInputBuilder()
            .setCustomId("input_contratou")
            .setLabel("Quem te contratou?")
            .setPlaceholder("Nome de quem te recrutou")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(inputNome),
            new ActionRowBuilder().addComponents(inputId),
            new ActionRowBuilder().addComponents(inputContratou)
        );

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_reg_")) {
        const roleId = interaction.customId.replace("modal_reg_", "");
        const grupo = CONFIG.GRUPOS.find(g => g.roleId === roleId);
        const membro = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (!membro) return;

        const nome = interaction.fields.getTextInputValue("input_nome").trim();
        const idJogo = interaction.fields.getTextInputValue("input_id").trim();
        const contratou = interaction.fields.getTextInputValue("input_contratou").trim();

        let novoApelido = CONFIG.FORMATO_APELIDO.replace("{TAG}", grupo.tag).replace("{NOME}", nome).replace("{ID}", idJogo);
        if (novoApelido.length > 32) novoApelido = novoApelido.substring(0, 32);

        cooldown.set(interaction.user.id, Date.now() + CONFIG.SPAM_COOLDOWN_MS);
        setTimeout(() => cooldown.delete(interaction.user.id), CONFIG.SPAM_COOLDOWN_MS);

        const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
        if (!canalLogs) return interaction.reply({ content: "Erro: Canal de logs não configurado.", ephemeral: true });

        const embedLog = new EmbedBuilder()
            .setColor("#3498DB")
            .setTitle("📥 Nova Solicitação de Registro & Apelido")
            .addFields(
                { name: "👤 Usuário Discord", value: `<@${membro.id}> (${membro.user.tag})`, inline: true },
                { name: "🎯 Grupo Escolhido", value: `${grupo.emoji} **${grupo.name}**`, inline: true },
                { name: "📝 Nome no Jogo", value: `**${nome}**`, inline: true },
                { name: "🔢 ID no Jogo", value: `**${idJogo}**`, inline: true },
                { name: "🤝 Quem Contratou", value: `**${contratou}**`, inline: false },
                { name: "🏷️ Novo Apelido sugerido", value: `\`${novoApelido}\``, inline: false }
            )
            .setThumbnail(membro.user.displayAvatarURL())
            .setFooter({ text: CONFIG.FOOTER })
            .setTimestamp();

        const rowAdmin = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`aprovar_reg_${membro.id}_${grupo.roleId}`).setEmoji("✅").setLabel("Aprovar").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`recusar_reg_${membro.id}_${grupo.roleId}`).setEmoji("❌").setLabel("Recusar").setStyle(ButtonStyle.Danger)
        );

        await canalLogs.send({ embeds: [embedLog], components: [rowAdmin] });

        return interaction.reply({
            content: `✅ **Formulário enviado!** Solicitação enviada para avaliação dos administradores.`,
            ephemeral: true
        });
    }

    if (interaction.isButton() && (interaction.customId.startsWith("aprovar_reg_") || interaction.customId.startsWith("recusar_reg_"))) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "❌ Você não tem permissão de **Gerenciar Cargos** para avaliar.", ephemeral: true });
        }

        const partes = interaction.customId.split("_");
        const acao = partes[0];
        const alvoId = partes[2];
        const roleId = partes[3];

        const membroAlvo = await guild.members.fetch(alvoId).catch(() => null);
        const grupo = CONFIG.GRUPOS.find(g => g.roleId === roleId);

        if (acao === "aprovar") {
            if (!membroAlvo) return interaction.reply({ content: "Membro não encontrado no servidor.", ephemeral: true });

            const highest = guild.members.me.roles.highest;
            if (highest.position <= 1) {
                return interaction.reply({ content: "❌ Meu cargo está muito abaixo na hierarquia para adicionar esses cargos!", ephemeral: true });
            }

            const embedAtual = interaction.message.embeds[0];
            const campoApelido = embedAtual.fields.find(f => f.name.includes("Novo Apelido"));
            const novoApelido = campoApelido ? campoApelido.value.replace(/[`]/g, "").trim() : null;

            // Remove outros cargos de grupo anteriores
            const todosGrupos = CONFIG.GRUPOS.map(g => g.roleId);
            const aRemover = membroAlvo.roles.cache.filter(r => todosGrupos.includes(r.id) && r.id !== roleId);
            if (aRemover.size > 0) await membroAlvo.roles.remove(aRemover).catch(() => {});

            // Adiciona cargos
            const aAdicionar = [roleId];
            if (!membroAlvo.roles.cache.has(CONFIG.CARGO_MORADOR_ID)) aAdicionar.push(CONFIG.CARGO_MORADOR_ID);
            await membroAlvo.roles.add(aAdicionar);

            let msgApelido = "";
            if (novoApelido && membroAlvo.id !== guild.ownerId) {
                await membroAlvo.setNickname(novoApelido).then(() => {
                    msgApelido = `\n> 🏷️ Apelido atualizado para: \`${novoApelido}\``;
                }).catch(() => {
                    msgApelido = `\n> ⚠️ Não consegui alterar seu apelido automaticamente.`;
                });
            }

            const embedAprovada = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor("#2ECC71")
                .setTitle("✅ Registro Aprovado")
                .addFields({ name: "👮 Aprovador por", value: `<@${interaction.user.id}>` });

            await interaction.update({ embeds: [embedAprovada], components: [] });

            await membroAlvo.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#2ECC71")
                        .setTitle("🎉 Cidadania e Apelido Aprovados!")
                        .setDescription(`Olá **${membroAlvo.user.username}**! 👋\n\nSeu registro para o grupo **${grupo.name}** foi **APROVADO**!\n\n> ✅ Cargo **${grupo.name}** adicionado.${msgApelido}\n> 🔓 Canais liberados.`)
                        .setFooter({ text: CONFIG.FOOTER })
                ]
            }).catch(() => {});
        }

        if (acao === "recusar") {
            const embedRecusada = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor("#E74C3C")
                .setTitle("❌ Registro Recusado")
                .addFields({ name: "👮 Recusado por", value: `<@${interaction.user.id}>` });

            await interaction.update({ embeds: [embedRecusada], components: [] });

            if (membroAlvo) {
                await membroAlvo.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#E74C3C")
                            .setTitle("❌ Registro Recusado")
                            .setDescription(`Olá **${membroAlvo.user.username}**,\n\nSua solicitação de registro foi recusada pela Administração. Refaça no canal de registro se necessário.`)
                            .setFooter({ text: CONFIG.FOOTER })
                    ]
                }).catch(() => {});
            }
        }
    }
});

client.login(TOKEN);
