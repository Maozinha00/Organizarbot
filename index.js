/**
 * ============================================================================
 * BOT AUTOMÁTICO DE REGISTRO DISCORD — FIVEZ & LUMENFALL CITY
 * ============================================================================
 * 
 * Funcionalidades completas e seguras:
 *  - Registro de Entrada (GuildMemberAdd) e Saída (GuildMemberRemove) de membros
 *    no canal de ID "1524222632923496509" com embeds modernos e informativos.
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
 *  - Comando Manual de Administração (!limparcargos ou !resetgrupos) com suporte completo a MessageContent.
 *  - Proteção para NÃO remover cargos de quem está em CALL durante a limpeza manual.
 * ============================================================================
 */

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

// Token de conexão do Bot (Pega das variáveis do sistema)
const TOKEN = process.env.TOKEN || process.env.TOKEN;

// ===============================
// CONFIGURAÇÃO DO SISTEMA
// ===============================
export const CONFIG = {
    CANAL_REGISTRO_ID: "1515448138385592361",
    CANAL_LOGS_ID: "1515448473246498866", // Canal de Logs correto atualizado
    CANAL_ENTRADA_SAIDA_ID: "1524222632923496509", // Canal de Logs de entrada e saída solicitado
    CARGO_MORADOR_ID: "1515125842328424640",

    EMBED_COLOR: "#2ECC71",
    FOOTER: "FiveZ & Lumenfall • Sistema Automático",
    SPAM_COOLDOWN_MS: 30000, // 30 segundos
    FORMATO_APELIDO: "{TAG} {NOME} | {ID}",
    PERMITIR_RECADASTRO: true,

    GRUPOS: [
        {
            name: "Amigos",
            roleId: "1515125842328424640",
            emoji: "🤝",
            tag: "|AMG|",
            description: "Grupo geral de amigos e parceiros da comunidade"
        },
        {
            name: "Família",
            roleId: "1515125828185493675",
            emoji: "❤️",
            tag: "|Souza|",
            description: "Membros mais próximos e família do servidor"
        },
        {
            name: "FiveZ Hunters",
            roleId: "1515125826780135485",
            emoji: "🎯",
            tag: "|Hunters|",
            description: "Caçadores de elite de FiveZ e operações táticas"
        },
        {
            name: "Lumenfall City",
            roleId: "1520163929106550794",
            emoji: "🏙️",
            tag: "|Lumen|",
            description: "Cidadãos e moradores oficiais de Lumenfall City"
        }
    ]
};

const PANEL_FILE = "./panel.json";

// Map para controle do Anti-Spam de 30s (UserID -> Timestamp)
const cooldown = new Map<string, number>();

// Logs em memória para exibir na interface web
export interface BotLog {
    id: string;
    type: "entrada" | "saida" | "registro_solicitado" | "registro_aprovado" | "registro_recusado" | "sistema";
    user: string;
    details: string;
    timestamp: Date;
}

export const botLogs: BotLog[] = [];

function addLog(type: BotLog["type"], user: string, details: string) {
    botLogs.unshift({
        id: Math.random().toString(36).substr(2, 9),
        type,
        user,
        details,
        timestamp: new Date()
    });
    if (botLogs.length > 100) {
        botLogs.pop();
    }
}

// Inicializando bot de sistema
addLog("sistema", "Bot", "Sistema de logs em memória iniciado.");

// ===============================
// INICIALIZAÇÃO DO CLIENTE DISCORD
// ===============================
export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // IMPORTANTE: Requer habilitar no portal de desenvolvedor do Discord
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Requer para ler comandos de chat
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
function salvarPainel(messageId: string) {
    try {
        fs.writeFileSync(
            PANEL_FILE,
            JSON.stringify({ messageId, updatedAt: new Date().toISOString() }, null, 4)
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
function criarPainel(guild: any) {
    const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR as any)
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
        .setThumbnail(guild.iconURL({ dynamic: true }) || null)
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

    const botao = new ButtonBuilder()
        .setCustomId("abrir_menu_registro")
        .setEmoji("🏡")
        .setLabel("Realizar Registro")
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(botao);

    return {
        content: "@everyone",
        embeds: [embed],
        components: [row]
    };
}

// ===============================
// ENVIAR / ATUALIZAR PAINEL DE REGISTRO
// ===============================
async function enviarPainel(guild: any, canal: any) {
    if (!canal) return;

    const painel = criarPainel(guild);
    const salvo = carregarPainel();

    if (salvo && salvo.messageId) {
        try {
            const message = await canal.messages.fetch(salvo.messageId);
            await message.edit(painel);
            console.log("✅ Painel de registro existente foi atualizado automaticamente.");
            addLog("sistema", "Painel", "Painel de registro existente atualizado com sucesso.");
            return;
        } catch (e) {
            console.log("ℹ️ Mensagem antiga do painel não foi encontrada. Criando uma nova mensagem...");
        }
    }

    const novaMensagem = await canal.send(painel);
    salvarPainel(novaMensagem.id);
    console.log("✅ Novo painel de registro criado e salvo em panel.json. ID: " + novaMensagem.id);
    addLog("sistema", "Painel", "Novo painel criado com ID: " + novaMensagem.id);
}

// ===============================
// EVENTO: BOT ONLINE
// ===============================
client.once(Events.ClientReady, async () => {
    console.log("==================================================");
    console.log("✅ BOT ONLINE E CONECTADO: " + client.user?.tag);
    console.log("🛡️ Proteção Anti-Spam: " + (CONFIG.SPAM_COOLDOWN_MS / 1000) + " segundos");
    console.log("📢 ID Canal de Logs de Registro: " + CONFIG.CANAL_LOGS_ID);
    console.log("📢 ID Canal de Entrada e Saída: " + CONFIG.CANAL_ENTRADA_SAIDA_ID);
    console.log("==================================================");

    addLog("sistema", "Bot", `Bot inicializado com sucesso como ${client.user?.tag}.`);

    const guild = client.guilds.cache.first();
    if (!guild) {
        console.log("❌ O bot não está em nenhum servidor no momento.");
        addLog("sistema", "Erro", "O bot não está em nenhum servidor de Discord.");
        return;
    }

    const canalRegistro = await guild.channels.fetch(CONFIG.CANAL_REGISTRO_ID).catch(() => null);
    if (canalRegistro) {
        await enviarPainel(guild, canalRegistro);
    } else {
        console.log(`⚠️ Canal de registro (${CONFIG.CANAL_REGISTRO_ID}) não encontrado para envio de painel.`);
    }
});

// ============================================================================
// EVENTOS ADICIONADOS: REGISTRO DE ENTRADA (GUILD_MEMBER_ADD) E SAÍDA (GUILD_MEMBER_REMOVE)
// ============================================================================

// 1. REGISTRO DE ENTRADA (Membro Entrou no Servidor)
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        console.log(`📥 Novo membro entrou: ${member.user.tag} (${member.id})`);
        addLog("entrada", member.user.tag, `Entrou no servidor do Discord.`);

        const canalLog = await member.guild.channels.fetch(CONFIG.CANAL_ENTRADA_SAIDA_ID).catch(() => null);
        if (canalLog && canalLog.isTextBased()) {
            const embed = new EmbedBuilder()
                .setColor("#2ECC71") // Verde Sucesso
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
            console.log(`✅ Log de entrada enviado com sucesso para o canal ${CONFIG.CANAL_ENTRADA_SAIDA_ID}`);
        } else {
            console.log(`⚠️ Canal de Entrada/Saída (${CONFIG.CANAL_ENTRADA_SAIDA_ID}) não pôde ser encontrado.`);
        }
    } catch (err) {
        console.error("❌ Erro ao processar evento de Entrada (GuildMemberAdd):", err);
    }
});

// 2. REGISTRO DE SAÍDA (Membro Saiu do Servidor)
client.on(Events.GuildMemberRemove, async (member) => {
    try {
        console.log(`📤 Membro saiu: ${member.user.tag} (${member.id})`);
        addLog("saida", member.user.tag, `Saiu do servidor do Discord.`);

        const canalLog = await member.guild.channels.fetch(CONFIG.CANAL_ENTRADA_SAIDA_ID).catch(() => null);
        if (canalLog && canalLog.isTextBased()) {
            const joinedAt = member.joinedTimestamp 
                ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)` 
                : "Indisponível";

            const embed = new EmbedBuilder()
                .setColor("#E74C3C") // Vermelho Alerta
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
            console.log(`✅ Log de saída enviado com sucesso para o canal ${CONFIG.CANAL_ENTRADA_SAIDA_ID}`);
        } else {
            console.log(`⚠️ Canal de Entrada/Saída (${CONFIG.CANAL_ENTRADA_SAIDA_ID}) não pôde ser encontrado.`);
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

    if (interaction.isButton() && interaction.customId === "abrir_menu_registro") {
        try {
            if (cooldown.has(interaction.user.id)) {
                const tempoRestante = Math.ceil(((cooldown.get(interaction.user.id) || 0) - Date.now()) / 1000);
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

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

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

            const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(inputNome);
            const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(inputId);
            const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(inputContratou);
            modal.addComponents(row1, row2, row3);

            await interaction.showModal(modal);
        } catch (err) {
            console.error("Erro ao abrir modal:", err);
            return interaction.reply({ content: "❌ Ocorreu um erro ao abrir o formulário.", ephemeral: true }).catch(() => {});
        }
    }

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

            cooldown.set(interaction.user.id, Date.now() + CONFIG.SPAM_COOLDOWN_MS);
            setTimeout(() => {
                cooldown.delete(interaction.user.id);
            }, CONFIG.SPAM_COOLDOWN_MS);

            const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
            if (!canalLogs) {
                return interaction.reply({
                    content: "❌ **Erro no Sistema:** O canal de logs da administração não foi encontrado. Avise um Administrador!",
                    ephemeral: true
                });
            }

            const embedLog = new EmbedBuilder()
                .setColor("#3498DB")
                .setTitle("📥 Nova Solicitação de Registro & Apelido")
                .setDescription("O membro preencheu o formulário de cidadania e aguarda aprovação.")
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

            const rowAdmin = new ActionRowBuilder<ButtonBuilder>().addComponents(btnAprovar, btnRecusar);

            await canalLogs.send({
                embeds: [embedLog],
                components: [rowAdmin]
            });

            console.log("📥 Solicitação enviada: " + membro.user.tag + " -> Apelido: " + novoApelido);
            addLog("registro_solicitado", membro.user.tag, `Solicitou registro no grupo ${grupoEscolhido.name} com apelido "${novoApelido}".`);

            return interaction.reply({
                content: "✅ **Formulário de Registro Enviado com Sucesso!**\n\nSua solicitação para o grupo **" + grupoEscolhido.emoji + " " + grupoEscolhido.name + "** com o novo apelido **`" + novoApelido + "`** foi encaminhada para a equipe de Administração.\nAssim que for aprovada, seus cargos serão adicionados e seu apelido alterado automaticamente!",
                ephemeral: true
            });

        } catch (err) {
            console.error("Erro no formulário de registro:", err);
            return interaction.reply({ content: "❌ Ocorreu um erro ao enviar seu formulário.", ephemeral: true }).catch(() => {});
        }
    }

    if (interaction.isButton() && (interaction.customId.startsWith("aprovar_reg_") || interaction.customId.startsWith("recusar_reg_"))) {
        try {
            const botMembro = guild.members.me;
            const autorInteracao = interaction.member;
            const temPermissao = (autorInteracao as any).permissions.has(PermissionsBitField.Flags.ManageRoles) || (autorInteracao as any).permissions.has(PermissionsBitField.Flags.Administrator);
            if (!temPermissao) {
                return interaction.reply({
                    content: "❌ Você não possui permissão de **Gerenciar Cargos** ou **Administrador** para avaliar registros.",
                    ephemeral: true
                });
            }

            const partes = interaction.customId.split("_");
            const acao = partes[0];
            const alvoUserId = partes[2];
            const alvoRoleId = partes[3];

            const membroAlvo = await guild.members.fetch(alvoUserId).catch(() => null);
            const grupoInfo = CONFIG.GRUPOS.find(g => g.roleId === alvoRoleId) || { name: "Grupo (" + alvoRoleId + ")", emoji: "✅", tag: "|TAG|" };

            if (acao === "aprovar") {
                if (!membroAlvo) {
                    return interaction.reply({ content: "⚠️ O usuário não está mais no servidor ou não pôde ser encontrado.", ephemeral: true });
                }

                const highestRole = botMembro?.roles.highest;
                if (!highestRole || highestRole.position <= 1) {
                    return interaction.reply({ content: "❌ O meu cargo no servidor precisa estar ACIMA dos cargos Morador e Grupos para que eu possa adicioná-los!", ephemeral: true });
                }

                const embedAtual = interaction.message.embeds[0];
                const campoApelido = embedAtual.fields.find(f => f.name.includes("Novo Apelido"));
                const novoApelido = campoApelido ? campoApelido.value.replace(/[`]/g, "").trim() : null;

                const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
                const cargosRemover = membroAlvo.roles.cache.filter(r => todosGruposIds.includes(r.id) && r.id !== alvoRoleId);
                if (cargosRemover.size > 0) {
                    await membroAlvo.roles.remove(cargosRemover).catch(() => console.log("Aviso: Sem permissão para remover cargo antigo"));
                }

                const cargosParaAdicionar = [];
                if (alvoRoleId) cargosParaAdicionar.push(alvoRoleId);
                if (CONFIG.CARGO_MORADOR_ID && !membroAlvo.roles.cache.has(CONFIG.CARGO_MORADOR_ID)) {
                    cargosParaAdicionar.push(CONFIG.CARGO_MORADOR_ID);
                }

                await membroAlvo.roles.add(cargosParaAdicionar).catch(err => {
                    throw new Error("Erro ao atribuir cargos: verifique a hierarquia do cargo do Bot!");
                });

                let apelidoAlteradoMsg = "";
                if (novoApelido && membroAlvo.id !== guild.ownerId) {
                    await membroAlvo.setNickname(novoApelido).then(() => {
                        apelidoAlteradoMsg = "\n> 🏷️ **Apelido alterado para:** `" + novoApelido + "`";
                    }).catch(err => {
                        apelidoAlteradoMsg = "\n> ⚠️ *Não foi possível alterar seu apelido automaticamente.*";
                    });
                } else if (membroAlvo.id === guild.ownerId) {
                    apelidoAlteradoMsg = "\n> ℹ️ *Apelido mantido (Dono do Servidor).*";
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
                            .setDescription("Olá **" + membroAlvo.user.username + "**! 👋\n\nSua solicitação de registro para o grupo **" + grupoInfo.emoji + " " + grupoInfo.name + "** foi **APROVADA** pela administração!\n\n> ✅ Você recebeu o cargo **" + grupoInfo.name + "**" + apelidoAlteradoMsg + "\n> 🔓 Todos os canais e categorias de voz/texto foram liberados.\n\nDivirta-se!")
                            .setFooter({ text: CONFIG.FOOTER })
                            .setTimestamp()
                    ]
                }).catch(() => {});

                console.log("✅ REGISTRO E APELIDO APROVADOS: " + membroAlvo.user.tag + " -> " + grupoInfo.name);
                addLog("registro_aprovado", membroAlvo.user.tag, `Registro aprovado por ${interaction.user.tag} para o grupo ${grupoInfo.name}.`);
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
                                .setDescription("Olá **" + membroAlvo.user.username + "**,\n\nInformamos que sua solicitação para ingressar no grupo **" + grupoInfo.name + "** foi avaliada e **recusada** pela equipe de Administração.\n\nCaso acredite que houve algum engano ou deseje refazer seu cadastro com outro nome/ID, clique novamente em **Realizar Registro** no painel.")
                                .setFooter({ text: CONFIG.FOOTER })
                                .setTimestamp()
                        ]
                    }).catch(() => {});
                    addLog("registro_recusado", membroAlvo.user.tag, `Registro recusado por ${interaction.user.tag} para o grupo ${grupoInfo.name}.`);
                } else {
                    addLog("registro_recusado", `ID: ${alvoUserId}`, `Registro recusado por ${interaction.user.tag} (Membro indisponível).`);
                }

                console.log("❌ REGISTRO RECUSADO: ID " + alvoUserId);
            }
        } catch (err: any) {
            console.error("Erro na ação do admin:", err);
            return interaction.reply({
                content: "❌ **Erro ao processar a avaliação:**\n`" + (err.message || err) + "`\n\n*Dica: Verifique se o cargo do Bot está acima dos cargos que ele precisa atribuir.*",
                ephemeral: true
            }).catch(() => {});
        }
    }
});

// ===============================
// COMANDOS DE ADMINISTRAÇÃO NO CHAT
// ===============================
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;

    const lowerContent = message.content.toLowerCase();
    if (lowerContent === "!limparcargos" || lowerContent === "!resetgrupos") {
        try {
            if (!message.member || !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply("❌ Apenas Administradores podem executar a limpeza geral de cargos para recadastro.");
            }

            await message.delete().catch(() => {});
            console.log("🧹 Comando de limpeza iniciado por: " + message.author.tag);
            addLog("sistema", message.author.tag, "Comando de limpeza geral !limparcargos iniciado.");

            const msgStatus = await message.channel.send("⏳ **Iniciando limpeza de cargos dos Amigos e Facções...** Por favor, aguarde.");
            const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
            let countRemovidos = 0;

            const membros = await message.guild.members.fetch();
            for (const [id, mem] of membros) {
                if (mem.user.bot) continue;
                
                if (mem.voice.channel || mem.voice.channelId) {
                    console.log(`ℹ️ Ignorando limpeza de cargos para ${mem.user.tag} pois está conectado a uma call.`);
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
                        await panelMsg.edit({
                            content: "@everyone",
                            embeds: panelMsg.embeds,
                            components: panelMsg.components
                        }).catch(() => {});
                    }
                }
                await canalRegistro.send("📢 **@everyone Atenção!** Todos os cargos dos Amigos e Facções foram limpos. Por favor, utilizem o painel abaixo para realizar o seu registro obrigatório!").catch(() => {});
            }

            await msgStatus.edit("✅ **Limpeza Concluída com Sucesso!**\n> 🧹 Cargos dos Amigos e Facções foram retirados de **" + countRemovidos + "** membros.\n> 📢 O painel foi marcado com @everyone e liberado para todos fazerem o registro obrigatório com Tag e ID!");
            addLog("sistema", "Limpeza", `Limpeza geral realizada com sucesso. Cargos de ${countRemovidos} membros removidos.`);
        } catch (err: any) {
            console.error("Erro ao executar limpeza de cargos:", err);
            message.reply("❌ Erro ao remover cargos: " + (err.message || err)).catch(() => {});
        }
    }
});

// ===============================
// TRATAMENTO DE ERROS GLOBAIS
// ===============================
process.on("unhandledRejection", (reason) => {
    console.log("⚠️ [ANTI-CRASH] Unhandled Rejection:", reason);
    addLog("sistema", "Erro", `Unhandled Rejection: ${reason}`);
});

process.on("uncaughtException", (err) => {
    console.log("⚠️ [ANTI-CRASH] Uncaught Exception:", err);
    addLog("sistema", "Erro", `Uncaught Exception: ${err.message}`);
});
