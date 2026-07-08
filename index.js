/**
 * ============================================================================
 * BOT AUTOMÁTICO DE REGISTRO DISCORD — FIVEZ & LUMENFALL CITY (ES MODULES)
 * ============================================================================
 * 
 * Funcionalidades completas e seguras:
 *  - Registro de Entrada e Saída de membros no canal de ID "1524222632923496509".
 *  - Painel persistente que se auto-atualiza ao reiniciar (panel.json).
 *  - Botão interativo de "Realizar Registro" no painel.
 *  - Menu de seleção para escolha de grupos (Amigos, Família, FiveZ Hunters, Lumenfall City).
 *  - Formulário Modal (Popup) obrigatório solicitando Nome do Personagem, ID na Cidade e Quem Contratou.
 *  - Formatação automática de Apelido com Tag do Grupo + Nome + ID.
 *  - Solicitação enviada ao Canal de Logs para análise da Administração.
 *  - Botões de aprovação e recusa para Moderadores (✅ Aprovar / ❌ Recusar).
 *  - Atribuição automática do cargo Morador + cargo do grupo escolhido + alteração de Apelido.
 *  - Envio de Mensagem Direta (DM) notificando o usuário sobre o resultado.
 *  - Proteção Anti-Spam configurada para 30 segundos.
 *  - Comandos Manuais de Administração (!limparcargos ou !resetgrupos).
 *  - Proteção para NÃO remover cargos de quem está em CALL durante a limpeza manual.
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

// Token de conexão do Bot (Pega do .env)
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

// ===============================
// CONFIGURAÇÃO DO SISTEMA
// ===============================

const CONFIG = {
    CANAL_REGISTRO_ID: "1515448138385592361",
    CANAL_LOGS_ID: "1515448473246498866", // Canal de Logs de Aprovação
    CANAL_ENTRADA_SAIDA_ID: "1524222632923496509", // Canal solicitado para Entrada e Saída
    CARGO_MORADOR_ID: "1515125842328424640",

    EMBED_COLOR: "#2ECC71",
    FOOTER: "FiveZ & Lumenfall • Sistema Automático",
    SPAM_COOLDOWN_MS: 30000, // 30 segundos
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

// Map para controle do Anti-Spam (UserID -> Timestamp) sem tipagem TypeScript
const cooldown = new Map();

// ===============================
// INICIALIZAÇÃO DO CLIENTE DISCORD
// ===============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // Requer ativar na aba "Bot" no painel de desenvolvedor do Discord
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Requer ativar para ler os comandos como !limparcargos
    ],
    partials: [
        Partials.Channel,
        Partials.GuildMember,
        Partials.User
    ]
});

// ===============================
// GERENCIAMENTO DE PERSISTÊNCIA DO PAINEL (JSON)
// ===============================

function salvarPainel(messageId) {
    try {
        fs.writeFileSync(
            PANEL_FILE,
            JSON.stringify({ messageId: messageId, updatedAt: new Date().toISOString() }, null, 4)
        );
    } catch (err) {
        console.error("⚠️ Erro ao salvar o arquivo do painel (panel.json):", err);
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

// ===============================
// CONSTRUÇÃO DO PAINEL PRINCIPAL
// ===============================

function criarPainel(guild) {
    const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setAuthor({
            name: guild.name,
            iconURL: guild.iconURL() || undefined
        })
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
> 🎉 **Acesso completo** a eventos, caças e roleplay da cidade

👇 *Clique no botão abaixo, escolha seu grupo e preencha o formulário com seu Nome no Jogo, ID e quem te contratou!*`)
        .setThumbnail(guild.iconURL() || null)
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

    const botao = new ButtonBuilder()
        .setCustomId("abrir_menu_registro")
        .setEmoji("🏡")
        .setLabel("Realizar Registro")
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);

    return {
        content: "@everyone",
        embeds: [embed],
        components: [row]
    };
}

// ===============================
// ENVIAR / ATUALIZAR PAINEL DE REGISTRO
// ===============================

async function enviarPainel(guild, canal) {
    if (!canal) return;

    const painel = criarPainel(guild);
    const salvo = carregarPainel();

    if (salvo && salvo.messageId) {
        try {
            const message = await canal.messages.fetch(salvo.messageId);
            await message.edit(painel);
            console.log("✅ Painel de registro existente foi atualizado automaticamente.");
            return;
        } catch (e) {
            console.log("ℹ️ Mensagem antiga do painel não foi encontrada. Criando uma nova mensagem...");
        }
    }

    const novaMensagem = await canal.send(painel);
    salvarPainel(novaMensagem.id);
    console.log("✅ Novo painel de registro criado e salvo em panel.json. ID: " + novaMensagem.id);
}

// ===============================
// EVENTO: BOT ONLINE
// ===============================

client.once(Events.ClientReady, async () => {
    console.log("==================================================");
    console.log("✅ BOT ONLINE E CONECTADO: " + client.user.tag);
    console.log("🛡️ Proteção Anti-Spam: " + (CONFIG.SPAM_COOLDOWN_MS / 1000) + " segundos");
    console.log("📢 ID Canal de Entrada e Saída: " + CONFIG.CANAL_ENTRADA_SAIDA_ID);
    console.log("==================================================");

    const guild = client.guilds.cache.first();
    if (!guild) {
        return console.log("❌ O bot não está em nenhum servidor no momento. Use o link de convite do Bot.");
    }

    const canalRegistro = await guild.channels.fetch(CONFIG.CANAL_REGISTRO_ID).catch(() => null);
    if (canalRegistro) {
        await enviarPainel(guild, canalRegistro);
    }
});

// ============================================================================
// REGISTRO DE ENTRADA (Membro Entrou no Servidor)
// ============================================================================
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        console.log(`📥 Novo membro entrou: ${member.user.tag} (${member.id})`);

        const canalLog = await member.guild.channels.fetch(CONFIG.CANAL_ENTRADA_SAIDA_ID).catch(() => null);
        if (canalLog && canalLog.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor("#2ECC71") // Verde
                .setAuthor({
                    name: "Membro Entrou no Servidor",
                    iconURL: member.user.displayAvatarURL()
                })
                .setTitle(`Seja bem-vindo(a) à nossa Cidade, ${member.user.username}! 🏙️`)
                .setDescription(`Olá ${member}! Desejamos que tenha uma excelente jornada em nossa comunidade. 

⚠️ **Atenção:** Você tem até **3 dias** para se registrar no canal <#${CONFIG.CANAL_REGISTRO_ID}> e obter seus cargos de cidadão/grupo para evitar o desligamento automático.`)
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: "👤 Usuário Discord", value: `${member.user.tag} (${member})`, inline: true },
                    { name: "🆔 Discord ID", value: `\`${member.id}\``, inline: true },
                    { name: "📅 Conta Criada Em", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: false },
                    { name: "📊 População Atual", value: `\`${member.guild.memberCount}\` cidadãos`, inline: true }
                )
                .setFooter({ text: CONFIG.FOOTER })
                .setTimestamp();

            await canalLog.send({ content: `${member}, bem-vindo!`, embeds: [embed] });
            console.log(`✅ Registro de Entrada enviado para o canal ${CONFIG.CANAL_ENTRADA_SAIDA_ID}`);
        }
    } catch (err) {
        console.error("❌ Erro ao processar evento de Entrada (GuildMemberAdd):", err);
    }
});

// ============================================================================
// REGISTRO DE SAÍDA (Membro Saiu do Servidor)
// ============================================================================
client.on(Events.GuildMemberRemove, async (member) => {
    try {
        console.log(`📤 Membro saiu: ${member.user.tag} (${member.id})`);

        const canalLog = await member.guild.channels.fetch(CONFIG.CANAL_ENTRADA_SAIDA_ID).catch(() => null);
        if (canalLog && canalLog.isTextBased()) {
            const joinedAt = member.joinedTimestamp 
                ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)` 
                : "Indisponível";

            const embed = new EmbedBuilder()
                .setColor("#E74C3C") // Vermelho
                .setAuthor({
                    name: "Membro Saiu do Servidor",
                    iconURL: member.user.displayAvatarURL()
                })
                .setTitle(`Desconexão de Cidadão 🏃‍♂️💨`)
                .setDescription(`O cidadão **${member.user.username}** decidiu se mudar de nossa cidade. Esperamos vê-lo novamente.`)
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: "👤 Usuário Discord", value: `**${member.user.tag}**`, inline: true },
                    { name: "🆔 Discord ID", value: `\`${member.id}\``, inline: true },
                    { name: "📅 Estava Conosco Desde", value: joinedAt, inline: false },
                    { name: "📊 População Atual", value: `\`${member.guild.memberCount}\` cidadãos`, inline: true }
                )
                .setFooter({ text: CONFIG.FOOTER })
                .setTimestamp();

            await canalLog.send({ embeds: [embed] });
            console.log(`✅ Registro de Saída enviado para o canal ${CONFIG.CANAL_ENTRADA_SAIDA_ID}`);
        }
    } catch (err) {
        console.error("❌ Erro ao processar evento de Saída (GuildMemberRemove):", err);
    }
});

// ===============================
// EVENTO: INTERAÇÕES COM BOTÕES E MENUS
// ===============================

client.on(Events.InteractionCreate, async (interaction) => {
    const guild = interaction.guild;
    if (!guild) return;

    // ------------------------------------------------------------------------
    // ETAPA 1: CLIQUE NO BOTÃO "REALIZAR REGISTRO" -> ABRE MENU DE ESCOLHA
    // ------------------------------------------------------------------------
    if (interaction.isButton() && interaction.customId === "abrir_menu_registro") {
        try {
            // Verificar Anti-Spam (30 segundos)
            if (cooldown.has(interaction.user.id)) {
                const tempoRestante = Math.ceil((cooldown.get(interaction.user.id) - Date.now()) / 1000);
                if (tempoRestante > 0) {
                    return interaction.reply({
                        content: "⏳ **Proteção Anti-Spam:** Por favor, aguarde **" + tempoRestante + " segundos** para utilizar o sistema de registro novamente.",
                        ephemeral: true
                    });
                } else {
                    cooldown.delete(interaction.user.id);
                }
            }

            const membro = await guild.members.fetch(interaction.user.id).catch(() => null);
            if (!membro) {
                return interaction.reply({ content: "❌ Erro ao carregar seu perfil no servidor.", ephemeral: true });
            }

            // Se recadastro não for permitido e usuário já tiver cargo morador, bloquear
            if (!CONFIG.PERMITIR_RECADASTRO && membro.roles.cache.has(CONFIG.CARGO_MORADOR_ID)) {
                return interaction.reply({
                    content: "✅ **Você já possui o cargo Morador no servidor!** Seu registro já foi realizado anteriormente.",
                    ephemeral: true
                });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("select_grupo_registro")
                .setPlaceholder("🎯 Selecione seu Grupo / Facção na lista...");

            CONFIG.GRUPOS.forEach(g => {
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(g.name + " (" + (g.tag || '|TAG|') + ")")
                        .setValue(g.roleId)
                        .setEmoji(g.emoji)
                        .setDescription(g.description ? g.description.substring(0, 100) : "Ingressar no grupo " + g.name)
                );
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            return interaction.reply({
                content: "🏡 **Processo de Cidadania & Apelido:**\nEscolha abaixo qual grupo ou família você deseja participar no servidor.\n*Em seguida, você preencherá seu Nome no Jogo e ID para padronização do seu apelido!*",
                components: [row],
                ephemeral: true
            });
        } catch (err) {
            console.error("Erro no botão de registro:", err);
            return interaction.reply({ content: "❌ Ocorreu um erro ao abrir o menu de registro.", ephemeral: true }).catch(() => {});
        }
    }

    // ------------------------------------------------------------------------
    // ETAPA 2: USUÁRIO SELECIONOU SEU GRUPO NO MENU -> ABRE FORMULÁRIO MODAL
    // ------------------------------------------------------------------------
    if (interaction.isStringSelectMenu() && interaction.customId === "select_grupo_registro") {
        try {
            const roleIdEscolhido = interaction.values[0];
            const grupoEscolhido = CONFIG.GRUPOS.find(g => g.roleId === roleIdEscolhido) || {
                name: "Grupo Desconhecido",
                roleId: roleIdEscolhido,
                emoji: "👥",
                tag: "|TAG|"
            };

            const modal = new ModalBuilder()
                .setCustomId("modal_reg_" + grupoEscolhido.roleId)
                .setTitle("Registro - " + grupoEscolhido.name.replace(/[^a-zA-Z0-9 -]/g, "").trim().substring(0, 28));

            const inputNome = new TextInputBuilder()
                .setCustomId("input_nome")
                .setLabel("Seu Nome no Jogo / Personagem")
                .setPlaceholder("Ex: Henrique Souza")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(20);

            const inputId = new TextInputBuilder()
                .setCustomId("input_id")
                .setLabel("Seu ID no Jogo / Cidade")
                .setPlaceholder("Ex: 15420")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(10);

            const inputContratou = new TextInputBuilder()
                .setCustomId("input_contratou")
                .setLabel("Quem te contratou?")
                .setPlaceholder("Ex: Henrique Souza")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(2)
                .setMaxLength(30);

            const row1 = new ActionRowBuilder().addComponents(inputNome);
            const row2 = new ActionRowBuilder().addComponents(inputId);
            const row3 = new ActionRowBuilder().addComponents(inputContratou);
            modal.addComponents(row1, row2, row3);

            await interaction.showModal(modal);
        } catch (err) {
            console.error("Erro ao abrir modal:", err);
            return interaction.reply({ content: "❌ Ocorreu um erro ao abrir o formulário.", ephemeral: true }).catch(() => {});
        }
    }

    // ------------------------------------------------------------------------
    // ETAPA 2.5: USUÁRIO PREENCHEU O MODAL -> ENVIA PARA LOGS DOS ADMINS
    // ------------------------------------------------------------------------
    if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_reg_")) {
        try {
            const roleIdEscolhido = interaction.customId.replace("modal_reg_", "");
            const grupoEscolhido = CONFIG.GRUPOS.find(g => g.roleId === roleIdEscolhido) || {
                name: "Grupo Desconhecido",
                roleId: roleIdEscolhido,
                emoji: "👥",
                tag: "|TAG|"
            };

            const membro = await guild.members.fetch(interaction.user.id).catch(() => null);
            if (!membro) return;

            const nomePersonagem = interaction.fields.getTextInputValue("input_nome").trim();
            const idJogo = interaction.fields.getTextInputValue("input_id").trim();
            const quemContratou = interaction.fields.getTextInputValue("input_contratou").trim();

            let novoApelido = CONFIG.FORMATO_APELIDO
                .replace("{TAG}", grupoEscolhido.tag || "|TAG|")
                .replace("{NOME}", nomePersonagem)
                .replace("{ID}", idJogo);

            if (novoApelido.length > 32) {
                novoApelido = novoApelido.substring(0, 32);
            }

            // Ativar cooldown de 30s
            cooldown.set(interaction.user.id, Date.now() + CONFIG.SPAM_COOLDOWN_MS);
            setTimeout(() => {
                cooldown.delete(interaction.user.id);
            }, CONFIG.SPAM_COOLDOWN_MS);

            const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
            if (!canalLogs) {
                return interaction.reply({
                    content: "❌ **Erro no Sistema:** O canal de logs da administração não foi encontrado no servidor. Avise um Administrador!",
                    ephemeral: true
                });
            }

            const embedLog = new EmbedBuilder()
                .setColor("#3498DB")
                .setTitle("📥 Nova Solicitação de Registro & Apelido")
                .setDescription("O membro preencheu o formulário de cidadania e aguarda aprovação da Administração.")
                .addFields(
                    { name: "👤 Usuário Discord", value: "<@" + membro.id + "> (" + membro.user.tag + ")", inline: true },
                    { name: "🆔 Discord ID", value: "`" + membro.id + "`", inline: true },
                    { name: "🎯 Grupo Escolhido", value: "" + grupoEscolhido.emoji + " **" + grupoEscolhido.name + "**\n(Tag: `" + (grupoEscolhido.tag || '|TAG|') + "`)", inline: false },
                    { name: "📝 Nome no Jogo", value: "**" + nomePersonagem + "**", inline: true },
                    { name: "🔢 ID no Jogo", value: "**" + idJogo + "**", inline: true },
                    { name: "🤝 Quem te Contratou", value: "**" + quemContratou + "**", inline: false },
                    { name: "🏷️ Novo Apelido (Após Aprovar)", value: "`" + novoApelido + "`", inline: false },
                    { name: "⏰ Data da Solicitação", value: "<t:" + Math.floor(Date.now() / 1000) + ":F>", inline: false }
                )
                .setThumbnail(membro.user.displayAvatarURL())
                .setFooter({ text: CONFIG.FOOTER })
                .setTimestamp();

            const btnAprovar = new ButtonBuilder()
                .setCustomId("aprovar_reg_" + membro.id + "_" + grupoEscolhido.roleId)
                .setEmoji("✅")
                .setLabel("Aprovar Registro")
                .setStyle(ButtonStyle.Success);

            const btnRecusar = new ButtonBuilder()
                .setCustomId("recusar_reg_" + membro.id + "_" + grupoEscolhido.roleId)
                .setEmoji("❌")
                .setLabel("Recusar")
                .setStyle(ButtonStyle.Danger);

            const rowAdmin = new ActionRowBuilder().addComponents(btnAprovar, btnRecusar);

            await canalLogs.send({
                embeds: [embedLog],
                components: [rowAdmin]
            });

            console.log("📥 Solicitação com formulário enviada: " + membro.user.tag + " -> Apelido: " + novoApelido);

            return interaction.reply({
                content: "✅ **Formulário de Registro Enviado com Sucesso!**\n\nSua solicitação para o grupo **" + grupoEscolhido.emoji + " " + grupoEscolhido.name + "** com o novo apelido **`" + novoApelido + "`** foi encaminhada para a equipe de Administração.\nAssim que for aprovada, seus cargos serão adicionados e seu apelido alterado automaticamente!",
                ephemeral: true
            });

        } catch (err) {
            console.error("Erro no formulário de registro:", err);
            return interaction.reply({ content: "❌ Ocorreu um erro ao enviar seu formulário.", ephemeral: true }).catch(() => {});
        }
    }

    // ------------------------------------------------------------------------
    // ETAPA 3: ADMIN CLICOU EM "✅ APROVAR" OU "❌ RECUSAR" NO CANAL DE LOGS
    // ------------------------------------------------------------------------
    if (interaction.isButton() && (interaction.customId.startsWith("aprovar_reg_") || interaction.customId.startsWith("recusar_reg_"))) {
        try {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({
                    content: "❌ Você não possui permissão de **Gerenciar Cargos** ou **Administrador** para avaliar registros.",
                    ephemeral: true
                });
            }

            const partes = interaction.customId.split("_");
            const acao = partes[0]; // "aprovar" ou "recusar"
            const alvoUserId = partes[2];
            const alvoRoleId = partes[3];

            const membroAlvo = await guild.members.fetch(alvoUserId).catch(() => null);
            const grupoInfo = CONFIG.GRUPOS.find(g => g.roleId === alvoRoleId) || { name: "Grupo (" + alvoRoleId + ")", emoji: "✅", tag: "|TAG|" };

            if (acao === "aprovar") {
                if (!membroAlvo) {
                    return interaction.reply({ content: "⚠️ O usuário não está mais no servidor ou não pôde ser encontrado.", ephemeral: true });
                }

                const highestRole = guild.members.me.roles.highest;
                if (highestRole.position <= 1) {
                    return interaction.reply({ content: "❌ O meu cargo no servidor precisa estar ACIMA dos cargos Morador e Grupos para que eu possa adicioná-los!", ephemeral: true });
                }

                const embedAtual = interaction.message.embeds[0];
                const campoApelido = embedAtual.fields.find(f => f.name.includes("Novo Apelido"));
                const novoApelido = campoApelido ? campoApelido.value.replace(/[`]/g, "").trim() : null;

                // Remover grupos antigos
                const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
                const cargosRemover = membroAlvo.roles.cache.filter(r => todosGruposIds.includes(r.id) && r.id !== alvoRoleId);
                if (cargosRemover.size > 0) {
                    await membroAlvo.roles.remove(cargosRemover).catch(() => {});
                }

                // Adicionar cargo do grupo e de morador
                const cargosParaAdicionar = [];
                if (alvoRoleId) cargosParaAdicionar.push(alvoRoleId);
                if (CONFIG.CARGO_MORADOR_ID && !membroAlvo.roles.cache.has(CONFIG.CARGO_MORADOR_ID)) {
                    cargosParaAdicionar.push(CONFIG.CARGO_MORADOR_ID);
                }

                await membroAlvo.roles.add(cargosParaAdicionar).catch(err => {
                    throw new Error("Erro ao atribuir cargos no Discord: verifique se o cargo do Bot está no topo da hierarquia!");
                });

                let apelidoAlteradoMsg = "";
                if (novoApelido && membroAlvo.id !== guild.ownerId) {
                    await membroAlvo.setNickname(novoApelido).then(() => {
                        apelidoAlteradoMsg = "\n> 🏷️ **Apelido alterado para:** `" + novoApelido + "`";
                    }).catch(() => {
                        apelidoAlteradoMsg = "\n> ⚠️ *Não foi possível alterar seu apelido automaticamente.*";
                    });
                }

                const embedAprovada = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor("#2ECC71")
                    .setTitle("✅ Registro & Apelido Aprovados")
                    .addFields({
                        name: "👮 Avaliado por",
                        value: "<@" + interaction.user.id + "> em <t:" + Math.floor(Date.now() / 1000) + ":f>",
                        inline: false
                    });

                await interaction.update({
                    embeds: [embedAprovada],
                    components: []
                });

                await membroAlvo.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#2ECC71")
                            .setTitle("🎉 Cidadania e Apelido Aprovados! Seja bem-vindo(a)!")
                            .setDescription("Olá **" + membroAlvo.user.username + "**! 👋\n\nSua solicitação de registro para o grupo **" + grupoInfo.emoji + " " + grupoInfo.name + "** foi **APROVADA** pela administração!\n\n> ✅ Você recebeu o cargo **" + grupoInfo.name + "**" + apelidoAlteradoMsg + "\n> 🔓 Todos os canais e categorias foram liberados.")
                            .setFooter({ text: CONFIG.FOOTER })
                            .setTimestamp()
                    ]
                }).catch(() => {});

                console.log("✅ REGISTRO APROVADO: " + membroAlvo.user.tag + " -> " + grupoInfo.name);
            }

            if (acao === "recusar") {
                const embedRecusada = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor("#E74C3C")
                    .setTitle("❌ Registro Recusado")
                    .addFields({
                        name: "👮 Avaliado por",
                        value: "<@" + interaction.user.id + "> em <t:" + Math.floor(Date.now() / 1000) + ":f>",
                        inline: false
                    });

                await interaction.update({
                    embeds: [embedRecusada],
                    components: []
                });

                if (membroAlvo) {
                    await membroAlvo.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#E74C3C")
                                .setTitle("❌ Solicitação de Registro Recusada")
                                .setDescription("Olá **" + membroAlvo.user.username + "**,\n\nSua solicitação para ingressar no grupo **" + grupoInfo.name + "** foi **recusada** pela equipe de Administração.\n\nClique novamente em **Realizar Registro** no painel caso deseje refazer.")
                                .setFooter({ text: CONFIG.FOOTER })
                                .setTimestamp()
                        ]
                    }).catch(() => {});
                }
            }
        } catch (err) {
            console.error("Erro na ação do admin:", err);
            return interaction.reply({
                content: "❌ **Erro ao processar a avaliação:**\n`" + (err.message || err) + "`",
                ephemeral: true
            }).catch(() => {});
        }
    }
});

// ===============================
// COMANDOS DE CHAT (!limparcargos ou !resetgrupos)
// ===============================

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;

    const lowerContent = message.content.toLowerCase();
    if (lowerContent === "!limparcargos" || lowerContent === "!resetgrupos") {
        try {
            if (!message.member || !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply("❌ Apenas Administradores podem executar a limpeza geral de cargos.");
            }

            await message.delete().catch(() => {});

            const msgStatus = await message.channel.send("⏳ **Iniciando limpeza de cargos...** Aguarde.");
            const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
            let countRemovidos = 0;

            const membros = await message.guild.members.fetch();
            for (const [id, mem] of membros) {
                if (mem.user.bot) continue;
                
                // Ignorar quem está em call de voz
                if (mem.voice.channel || mem.voice.channelId) {
                    continue;
                }

                const cargosRemover = mem.roles.cache.filter(r => todosGruposIds.includes(r.id));
                if (cargosRemover.size > 0) {
                    await mem.roles.remove(cargosRemover).catch(() => {});
                    countRemovidos++;
                }
            }

            const canalRegistro = await message.guild.channels.fetch(CONFIG.CANAL_REGISTRO_ID).catch(() => null);
            if (canalRegistro) {
                const salvo = carregarPainel();
                if (salvo && salvo.messageId) {
                    const panelMsg = await canalRegistro.messages.fetch(salvo.messageId).catch(() => null);
                    if (panelMsg) {
                        await panelMsg.edit({ content: "@everyone", embeds: panelMsg.embeds, components: panelMsg.components }).catch(() => {});
                    }
                }
                await canalRegistro.send("📢 **@everyone Atenção!** Todos os cargos foram limpos. Registrem-se novamente no painel acima!").catch(() => {});
            }

            await msgStatus.edit("✅ **Limpeza Concluída!**\n> 🧹 Cargos removidos de **" + countRemovidos + "** membros.");
        } catch (err) {
            console.error("Erro ao limpar cargos:", err);
            message.reply("❌ Erro ao remover cargos: " + err.message).catch(() => {});
        }
    }
});

// ===============================
// INICIALIZAR BOT
// ===============================

if (!TOKEN || TOKEN.trim() === "") {
    console.log("❌ ERRO: O Token do Discord não foi configurado nas variáveis de ambiente!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.log("❌ Falha ao logar o bot no Discord. Verifique o Token:", err);
});
