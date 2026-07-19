/**
 * ============================================================================
 * BOT AUTOMÁTICO DE REGISTRO DISCORD — FIVEZ & LUMENFALL CITY (ES MODULES)
 * ============================================================================
 * 
 * REGRA AUTOMÁTICA ADICIONADA: 
 * -> Qualquer nome ou tag contendo "Hunters" é alterado para "Recruta" automaticamente!
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

// ===============================
// FUNÇÃO DE CONVERSÃO AUTOMÁTICA (REGRA PRINCIPAL)
// ===============================
function aplicarRegraRecuta(texto) {
    if (!texto) return texto;
    // Substitui qualquer variação de "Hunters" por "Recruta" (Insensível a maiúsculas/minúsculas)
    return texto.replace(/hunters/gi, (match) => {
        if (match === 'HUNTERS') return 'RECRUTA';
        if (match === 'hunters') return 'recruta';
        return 'Recruta';
    });
}

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

    // GRUPOS CONFIGURADOS COM A REGRA APLICADA
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
            "name": aplicarRegraRecuta("FiveZ Hunters"), // "FiveZ Hunters" -> "FiveZ Recruta" automaticamente
            "roleId": "1515125826780135485",
            "emoji": "🎯",
            "tag": "|Recruta|",
            "description": "Caçadores de elite e recrutas em operações táticas"
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

// Map para controle do Anti-Spam (UserID -> Timestamp)
const cooldown = new Map();

// ===============================
// INICIALIZAÇÃO DO CLIENTE DISCORD
// ===============================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
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
    console.log("📢 Regra de Conversão de Hunters para Recruta: ATIVA 🔄");
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
                .setDescription(`O cidadão **${member.user.username}** mudou-se de nossa cidade. Esperamos vê-lo novamente.`)
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
        }
    } catch (err) {
        console.error("❌ Erro ao processar evento de Saída (GuildMemberRemove):", err);
    }
});

// ============================================================================
// EVENTO: MONITORAMENTO DE CARGOS (GuildMemberUpdate)
// ============================================================================
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    try {
        const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
        const cargosBot = [...todosGruposIds, CONFIG.CARGO_MORADOR_ID].filter(id => id);

        // Se um cargo do bot foi removido do membro, resetamos o apelido
        const cargosRemovidos = oldMember.roles.cache.filter(role => cargosBot.includes(role.id) && !newMember.roles.cache.has(role.id));

        if (cargosRemovidos.size > 0 && newMember.nickname) {
            const guild = newMember.guild;

            if (newMember.id === guild.ownerId) return;

            // Remove o apelido personalizado (tira tag e id)
            await newMember.setNickname(null)
                .then(() => {
                    console.log(`✅ Apelido de ${newMember.user.tag} redefinido devido à remoção de cargo.`);
                })
                .catch(err => {
                    console.error(`❌ Erro ao remover apelido:`, err);
                });
        }
    } catch (err) {
        console.error("❌ Erro no monitoramento de cargos (GuildMemberUpdate):", err);
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
            // Verificar Anti-Spam
            if (cooldown.has(interaction.user.id)) {
                const tempoRestante = Math.ceil((cooldown.get(interaction.user.id) - Date.now()) / 1000);
                if (tempoRestante > 0) {
                    return interaction.reply({
                        content: `⏳ **Proteção Anti-Spam:** Aguarde **${tempoRestante} segundos** para usar o registro novamente.`,
                        ephemeral: true
                    });
                } else {
                    cooldown.delete(interaction.user.id);
                }
            }

            const membro = await guild.members.fetch(interaction.user.id).catch(() => null);
            if (!membro) {
                return interaction.reply({ content: "❌ Erro ao carregar seu perfil.", ephemeral: true });
            }

            if (!CONFIG.PERMITIR_RECADASTRO && membro.roles.cache.has(CONFIG.CARGO_MORADOR_ID)) {
                return interaction.reply({
                    content: "✅ **Você já possui o cargo Morador no servidor!**",
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
                        .setDescription(g.description ? g.description.substring(0, 100) : "Ingressar no grupo")
                );
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            return interaction.reply({
                content: "🏡 **Processo de Cidadania & Apelido:**\nEscolha abaixo qual grupo ou família você deseja participar no servidor.",
                components: [row],
                ephemeral: true
            });
        } catch (err) {
            console.error(err);
        }
    }

    // ------------------------------------------------------------------------
    // ETAPA 2: SELECIONOU SEU GRUPO -> ABRE MODAL FORMULÁRIO
    // ------------------------------------------------------------------------
    if (interaction.isStringSelectMenu() && interaction.customId === "select_grupo_registro") {
        try {
            const roleIdEscolhido = interaction.values[0];
            const grupoEscolhido = CONFIG.GRUPOS.find(g => g.roleId === roleIdEscolhido);

            const modal = new ModalBuilder()
                .setCustomId("modal_reg_" + grupoEscolhido.roleId)
                .setTitle("Registro - " + grupoEscolhido.name.substring(0, 25));

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
                .setPlaceholder("Ex: Henrique Souza")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputNome),
                new ActionRowBuilder().addComponents(inputId),
                new ActionRowBuilder().addComponents(inputContratou)
            );

            await interaction.showModal(modal);
        } catch (err) {
            console.error(err);
        }
    }

    // ------------------------------------------------------------------------
    // ETAPA 2.5: ENVIO DO FORMULÁRIO -> CONVERSÃO HUNTERS -> RECRUTA AUTOMÁTICA
    // ------------------------------------------------------------------------
    if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_reg_")) {
        try {
            const roleIdEscolhido = interaction.customId.replace("modal_reg_", "");
            const grupoEscolhido = CONFIG.GRUPOS.find(g => g.roleId === roleIdEscolhido);

            const membro = await guild.members.fetch(interaction.user.id).catch(() => null);
            if (!membro) return;

            // PEGANDO E APLICANDO A REGRA DO USUÁRIO AUTOMATICAMENTE
            let nomePersonagem = interaction.fields.getTextInputValue("input_nome").trim();
            let quemContratou = interaction.fields.getTextInputValue("input_contratou").trim();
            const idJogo = interaction.fields.getTextInputValue("input_id").trim();

            nomePersonagem = aplicarRegraRecuta(nomePersonagem); // "Hunters" -> "Recruta"
            quemContratou = aplicarRegraRecuta(quemContratou);   // "Hunters" -> "Recruta"

            let novoApelido = CONFIG.FORMATO_APELIDO
                .replace("{TAG}", grupoEscolhido.tag || "|TAG|")
                .replace("{NOME}", nomePersonagem)
                .replace("{ID}", idJogo);

            if (novoApelido.length > 32) novoApelido = novoApelido.substring(0, 32);

            // Cooldown Anti-Spam
            cooldown.set(interaction.user.id, Date.now() + CONFIG.SPAM_COOLDOWN_MS);

            const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
            if (!canalLogs) {
                return interaction.reply({ content: "❌ Canal de logs de administração não encontrado.", ephemeral: true });
            }

            const embedLog = new EmbedBuilder()
                .setColor("#3498DB")
                .setTitle("📥 Nova Solicitação de Cidadania")
                .addFields(
                    { name: "👤 Usuário Discord", value: `<@${membro.id}> (${membro.user.tag})`, inline: true },
                    { name: "🎯 Grupo", value: `${grupoEscolhido.emoji} **${grupoEscolhido.name}**`, inline: true },
                    { name: "📝 Nome no Jogo", value: `**${nomePersonagem}**`, inline: true },
                    { name: "🔢 ID no Jogo", value: `**${idJogo}**`, inline: true },
                    { name: "🤝 Quem Contratou", value: `**${quemContratou}**`, inline: false },
                    { name: "🏷️ Novo Apelido", value: `\`${novoApelido}\``, inline: false }
                )
                .setThumbnail(membro.user.displayAvatarURL())
                .setTimestamp();

            const btnAprovar = new ButtonBuilder()
                .setCustomId(`aprovar_reg_${membro.id}_${grupoEscolhido.roleId}`)
                .setEmoji("✅")
                .setLabel("Aprovar Registro")
                .setStyle(ButtonStyle.Success);

            const btnRecusar = new ButtonBuilder()
                .setCustomId(`recusar_reg_${membro.id}_${grupoEscolhido.roleId}`)
                .setEmoji("❌")
                .setLabel("Recusar")
                .setStyle(ButtonStyle.Danger);

            const rowAdmin = new ActionRowBuilder().addComponents(btnAprovar, btnRecusar);

            await canalLogs.send({ embeds: [embedLog], components: [rowAdmin] });

            return interaction.reply({
                content: `✅ **Solicitação Enviada!**\nSua ficha foi enviada para análise da staff.\n\n> Apelido Solicitado: \`${novoApelido}\``,
                ephemeral: true
            });
        } catch (err) {
            console.error(err);
        }
    }

    // ------------------------------------------------------------------------
    // ETAPA 3: ADMIN CLICOU EM "✅ APROVAR" OU "❌ RECUSAR"
    // ------------------------------------------------------------------------
    if (interaction.isButton() && (interaction.customId.startsWith("aprovar_reg_") || interaction.customId.startsWith("recusar_reg_"))) {
        try {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return interaction.reply({ content: "❌ Sem permissão de **Gerenciar Cargos**.", ephemeral: true });
            }

            const partes = interaction.customId.split("_");
            const acao = partes[0]; 
            const alvoUserId = partes[2];
            const alvoRoleId = partes[3];

            const membroAlvo = await guild.members.fetch(alvoUserId).catch(() => null);
            const grupoInfo = CONFIG.GRUPOS.find(g => g.roleId === alvoRoleId);

            if (acao === "aprovar") {
                if (!membroAlvo) return interaction.reply({ content: "⚠️ Usuário saiu do servidor.", ephemeral: true });

                const embedAtual = interaction.message.embeds[0];
                const campoApelido = embedAtual.fields.find(f => f.name.includes("Novo Apelido"));
                const novoApelido = campoApelido ? campoApelido.value.replace(/[`]/g, "").trim() : null;

                // Remover grupos antigos
                const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
                const cargosRemover = membroAlvo.roles.cache.filter(r => todosGruposIds.includes(r.id) && r.id !== alvoRoleId);
                if (cargosRemover.size > 0) await membroAlvo.roles.remove(cargosRemover).catch(() => {});

                // Adicionar novos cargos
                await membroAlvo.roles.add([alvoRoleId, CONFIG.CARGO_MORADOR_ID]);

                if (novoApelido && membroAlvo.id !== guild.ownerId) {
                    await membroAlvo.setNickname(novoApelido).catch(() => {});
                }

                await interaction.update({
                    embeds: [EmbedBuilder.from(embedAtual).setColor("#2ECC71").setTitle("✅ Registro Aprovado")],
                    components: []
                });

                await membroAlvo.send({
                    content: `🎉 **Seu Registro para o grupo ${grupoInfo.name} foi APROVADO!** Apelido alterado para: \`${novoApelido}\``
                }).catch(() => {});
            }

            if (acao === "recusar") {
                await interaction.update({
                    embeds: [EmbedBuilder.from(interaction.message.embeds[0]).setColor("#E74C3C").setTitle("❌ Registro Recusado")],
                    components: []
                });

                if (membroAlvo) {
                    await membroAlvo.send({ content: `❌ Seu pedido de registro para o grupo ${grupoInfo.name} foi recusado.` }).catch(() => {});
                }
            }
        } catch (err) {
            console.error(err);
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
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply("❌ Apenas administradores.");
            }

            await message.delete().catch(() => {});
            const msgStatus = await message.channel.send("⏳ **Limpando cargos...**");

            const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
            let countRemovidos = 0;

            const membros = await message.guild.members.fetch();
            for (const [id, mem] of membros) {
                if (mem.user.bot) continue;
                
                // PROTEÇÃO: Ignorar quem está em call de voz!
                if (mem.voice.channelId) continue;

                const cargosRemover = mem.roles.cache.filter(r => todosGruposIds.includes(r.id));
                if (cargosRemover.size > 0) {
                    await mem.roles.remove(cargosRemover).catch(() => {});
                    countRemovidos++;
                }
            }

            await msgStatus.edit(`✅ **Limpeza Concluída!**\n> 🧹 Cargos removidos de **${countRemovidos}** membros (ignorando quem estava em call de voz).`);
        } catch (err) {
            console.error(err);
        }
    }
});

// Inicializar Bot
client.login(TOKEN);
