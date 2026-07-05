/**
 * ============================================================================
 * BOT AUTOMÁTICO DE REGISTRO DISCORD — FIVEZ & LUMENFALL CITY
 * ============================================================================
 * 
 * Funcionalidades implementadas:
 *  - Painel persistente que se auto-atualiza ao reiniciar (panel.json).
 *  - Botão interativo de "Realizar Registro" no painel.
 *  - Menu de seleção para escolha de grupos (Amigos, Família, FiveZ Hunters, Lumenfall City).
 *  - Solicitação enviada ao Canal de Logs para análise da Administração.
 *  - Botões de aprovação e recusa para Moderadores (✅ Aprovar / ❌ Recusar).
 *  - Atribuição automática do cargo Morador + cargo do grupo escolhido.
 *  - Envio de Mensagem Direta (DM) notificando o usuário sobre o resultado.
 *  - Proteção Anti-Spam configurada para 30 segundos.
 * ============================================================================
 */
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    Events,
    PermissionsBitField
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.TOKEN;
// ===============================
// CONFIGURAÇÃO DO SISTEMA
// ===============================

const CONFIG = {
    CANAL_REGISTRO_ID: "1515448138385592361",
    CANAL_LOGS_ID: "1515448473246498866",
    CARGO_MORADOR_ID: "1515125842328424640",

    EMBED_COLOR: "#2ECC71",
    FOOTER: "FiveZ & Lumenfall • Sistema Automático",
    SPAM_COOLDOWN_MS: 30000, // 30 segundos em milissegundos

    GRUPOS: [
        {
            "name": "Amigos",
            "roleId": "1515125842328424640",
            "emoji": "🤝",
            "description": "Grupo geral de amigos e parceiros da comunidade"
        },
        {
            "name": "Família",
            "roleId": "1515125828185493675",
            "emoji": "❤️",
            "description": "Membros mais próximos e família do servidor"
        },
        {
            "name": "FiveZ Hunters",
            "roleId": "1515125826780135485",
            "emoji": "🎯",
            "description": "Caçadores de elite de FiveZ e operações táticas"
        },
        {
            "name": "Lumenfall City",
            "roleId": "1520163929106550794",
            "emoji": "🏙️",
            "description": "Cidadãos e moradores oficiais de Lumenfall City"
        }
    ]
};

const PANEL_FILE = "./panel.json";

// Map para controle do Anti-Spam de 30s (UserID -> Timestamp)
const cooldown = new Map();

// ===============================
// INICIALIZAÇÃO DO CLIENTE DISCORD
// ===============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
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
    } catch {
        return null;
    }
}

// ===============================
// VALIDAÇÃO DE ESTRUTURA DO SERVIDOR
// ===============================

async function validarEstrutura(guild) {
    const canalRegistro = await guild.channels.fetch(CONFIG.CANAL_REGISTRO_ID).catch(() => null);
    const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
    const cargoMorador = await guild.roles.fetch(CONFIG.CARGO_MORADOR_ID).catch(() => null);

    if (!canalRegistro) console.log("❌ [ERRO] Canal de Registro (" + CONFIG.CANAL_REGISTRO_ID + ") não encontrado.");
    if (!canalLogs) console.log("❌ [ERRO] Canal de Logs (" + CONFIG.CANAL_LOGS_ID + ") não encontrado.");
    if (!cargoMorador) console.log("❌ [ERRO] Cargo de Morador (" + CONFIG.CARGO_MORADOR_ID + ") não encontrado.");

    return { canalRegistro, canalLogs, cargoMorador };
}

// ===============================
// CONSTRUÇÃO DO PAINEL PRINCIPAL
// ===============================

function criarPainel(guild) {
    const embed = new EmbedBuilder()
        .setColor(CONFIG.EMBED_COLOR)
        .setAuthor({
            name: guild.name,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle("🏡 Sistema de Registro — Cidadania & Grupos")
        .setDescription(`# Seja bem-vindo à nossa Comunidade!

Para desbloquear todos os canais de voz e texto do servidor e registrar sua cidadania, selecione seu grupo abaixo.

### 🎁 Benefícios ao registrar:
> ✅ **Cargo Morador** + Cargo do seu Grupo escolhido
> 🔓 **Liberação imediata** dos canais e categorias do servidor
> 🎉 **Acesso completo** a eventos, caças e roleplay da cidade

👇 *Clique no botão abaixo e escolha sua facção ou grupo na lista!*`)
        .setThumbnail(guild.iconURL({ dynamic: true }) || null)
        .setFooter({ text: CONFIG.FOOTER })
        .setTimestamp();

    const botao = new ButtonBuilder()
        .setCustomId("abrir_menu_registro")
        .setEmoji("🏡")
        .setLabel("Realizar Registro")
        .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(botao);

    return {
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
            const mensagem = await canal.messages.fetch(salvo.messageId);
            await mensagem.edit(painel);
            console.log("✅ Painel de registro existente foi atualizado automaticamente.");
            return;
        } catch {
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
    console.log("🛡️ Proteção Anti-Spam: " + (30) + " segundos");
    console.log("==================================================");

    const guild = client.guilds.cache.first();
    if (!guild) {
        return console.log("❌ O bot não está em nenhum servidor no momento.");
    }

    const estrutura = await validarEstrutura(guild);
    if (estrutura.canalRegistro) {
        await enviarPainel(guild, estrutura.canalRegistro);
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

            // Se já tem o cargo morador, avisa e não deixa prosseguir
            if (membro.roles.cache.has(CONFIG.CARGO_MORADOR_ID)) {
                return interaction.reply({
                    content: "✅ **Você já possui o cargo Morador no servidor!** Seu registro já foi realizado anteriormente.",
                    ephemeral: true
                });
            }

            // Criar menu de seleção com os 4 grupos (Amigos, Família, FiveZ Hunters, Lumenfall City)
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("select_grupo_registro")
                .setPlaceholder("🎯 Selecione seu Grupo / Família desejada...");

            CONFIG.GRUPOS.forEach(g => {
                selectMenu.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(g.name)
                        .setValue(g.roleId)
                        .setEmoji(g.emoji)
                        .setDescription(g.description ? g.description.substring(0, 100) : "Ingressar no grupo " + g.name)
                );
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            return interaction.reply({
                content: "🏡 **Processo de Cidadania:**\nEscolha abaixo qual grupo ou família você deseja participar no servidor. Sua solicitação será enviada para a administração!",
                components: [row],
                ephemeral: true
            });
        } catch (err) {
            console.error("Erro no botão de registro:", err);
            return interaction.reply({ content: "❌ Ocorreu um erro ao abrir o menu de registro.", ephemeral: true }).catch(() => {});
        }
    }

    // ------------------------------------------------------------------------
    // ETAPA 2: USUÁRIO SELECIONOU SEU GRUPO NO MENU -> ENVIA PARA LOGS DOS ADMINS
    // ------------------------------------------------------------------------
    if (interaction.isStringSelectMenu() && interaction.customId === "select_grupo_registro") {
        try {
            const roleIdEscolhido = interaction.values[0];
            const grupoEscolhido = CONFIG.GRUPOS.find(g => g.roleId === roleIdEscolhido) || {
                name: "Grupo Desconhecido",
                roleId: roleIdEscolhido,
                emoji: "👥"
            };

            const membro = await guild.members.fetch(interaction.user.id).catch(() => null);
            if (!membro) return;

            // Ativar cooldown de 30s para não spammar solicitações no canal de logs
            cooldown.set(interaction.user.id, Date.now() + CONFIG.SPAM_COOLDOWN_MS);
            setTimeout(() => {
                cooldown.delete(interaction.user.id);
            }, CONFIG.SPAM_COOLDOWN_MS);

            // Enviar solicitação ao canal de logs (1515125822795546715)
            const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
            if (!canalLogs) {
                return interaction.update({
                    content: "❌ **Erro no Sistema:** O canal de logs da administração não foi encontrado no servidor. Avise um Administrador!",
                    components: []
                });
            }

            const embedLog = new EmbedBuilder()
                .setColor("#3498DB")
                .setTitle("📥 Nova Solicitação de Registro")
                .setDescription("O membro selecionou seu grupo de preferência e aguarda aprovação da Administração.")
                .addFields(
                    { name: "👤 Usuário", value: "<@" + membro.id + "> (" + membro.user.tag + ")", inline: true },
                    { name: "🆔 ID do Usuário", value: "`" + membro.id + "`", inline: true },
                    { name: "⏰ Data da Solicitação", value: "<t:" + Math.floor(Date.now() / 1000) + ":F>", inline: false },
                    { name: "🎯 Grupo Escolhido", value: "" + grupoEscolhido.emoji + " **" + grupoEscolhido.name + "**\n(ID Cargo: `" + grupoEscolhido.roleId + "`)", inline: false }
                )
                .setThumbnail(membro.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: CONFIG.FOOTER })
                .setTimestamp();

            // Botões de Aprovação / Recusa para os Admins
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

            console.log("📥 Solicitação enviada: " + membro.user.tag + " solicitou o grupo " + grupoEscolhido.name);

            // Resposta ao usuário no painel
            return interaction.update({
                content: "✅ **Solicitação Enviada com Sucesso!**\n\nSua escolha para ingressar no grupo **" + grupoEscolhido.emoji + " " + grupoEscolhido.name + "** foi encaminhada para a equipe de Administração. Assim que analisada, você receberá o resultado em sua Mensagem Direta (DM) e terá seus cargos atribuídos automaticamente!",
                components: []
            });

        } catch (err) {
            console.error("Erro no menu select:", err);
            return interaction.update({ content: "❌ Ocorreu um erro ao enviar sua solicitação.", components: [] }).catch(() => {});
        }
    }

    // ------------------------------------------------------------------------
    // ETAPA 3: ADMIN CLICOU EM "✅ APROVAR" OU "❌ RECUSAR" NO CANAL DE LOGS
    // ------------------------------------------------------------------------
    if (interaction.isButton() && (interaction.customId.startsWith("aprovar_reg_") || interaction.customId.startsWith("recusar_reg_"))) {
        try {
            // Verificar permissão de gerenciar cargos ou adm
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
            const grupoInfo = CONFIG.GRUPOS.find(g => g.roleId === alvoRoleId) || { name: "Grupo (" + alvoRoleId + ")", emoji: "✅" };

            // ==========================================
            // FLUXO: APROVAÇÃO ✅
            // ==========================================
            if (acao === "aprovar") {
                if (!membroAlvo) {
                    return interaction.reply({ content: "⚠️ O usuário não está mais no servidor ou não pôde ser encontrado.", ephemeral: true });
                }

                // Verificar hierarquia de cargos do bot
                if (guild.members.me.roles.highest.position <= 1) {
                    return interaction.reply({ content: "❌ O meu cargo no servidor precisa estar ACIMA dos cargos Morador e Grupos para que eu possa adicioná-los!", ephemeral: true });
                }

                // Adicionar o cargo Morador + Cargo do Grupo escolhido
                const cargosParaAdicionar = [CONFIG.CARGO_MORADOR_ID];
                if (alvoRoleId && alvoRoleId !== CONFIG.CARGO_MORADOR_ID) {
                    cargosParaAdicionar.push(alvoRoleId);
                }

                await membroAlvo.roles.add(cargosParaAdicionar).catch(err => {
                    throw new Error("Erro ao atribuir cargos no Discord: verifique se o cargo do Bot está no topo da hierarquia!");
                });

                // Atualizar a embed da log no canal
                const embedAprovada = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor("#2ECC71")
                    .setTitle("✅ Registro Aprovado")
                    .addFields({
                        name: "👮 Avaliado por",
                        value: "<@" + interaction.user.id + "> em <t:" + Math.floor(Date.now() / 1000) + ":f>",
                        inline: false
                    });

                await interaction.update({
                    embeds: [embedAprovada],
                    components: [] // Remove os botões
                });

                // Enviar DM ao Usuário
                await membroAlvo.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#2ECC71")
                            .setTitle("🎉 Cidadania Aprovada! Seja bem-vindo(a)!")
                            .setDescription("Olá **" + membroAlvo.user.username + "**! 👋\n\nSua solicitação de registro para o grupo **" + grupoInfo.emoji + " " + grupoInfo.name + "** foi **APROVADA** pela administração!\n\n> ✅ Você recebeu o cargo **Morador** + **" + grupoInfo.name + "**\n> 🔓 Todos os canais e categorias de voz/texto foram liberados.\n\nDivirta-se em nossa comunidade!")
                            .setFooter({ text: CONFIG.FOOTER })
                            .setTimestamp()
                    ]
                }).catch(() => {
                    console.log("ℹ️ Não foi possível enviar DM para " + membroAlvo.user.tag + " (DM fechada ou bloqueada).");
                });

                console.log("✅ REGISTRO APROVADO: " + membroAlvo.user.tag + " -> " + grupoInfo.name + " (Por: " + interaction.user.tag + ")");
            }

            // ==========================================
            // FLUXO: RECUSA ❌
            // ==========================================
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
                    components: [] // Remove os botões
                });

                if (membroAlvo) {
                    await membroAlvo.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#E74C3C")
                                .setTitle("❌ Solicitação de Registro Recusada")
                                .setDescription("Olá **" + membroAlvo.user.username + "**,\n\nInformamos que sua solicitação para ingressar no grupo **" + grupoInfo.name + "** foi avaliada e **recusada** pela equipe de Administração.\n\nCaso acredite que houve algum engano ou deseje mais informações, por favor abra um ticket em nosso canal de atendimento/suporte.")
                                .setFooter({ text: CONFIG.FOOTER })
                                .setTimestamp()
                        ]
                    }).catch(() => {});
                }

                console.log("❌ REGISTRO RECUSADO: ID " + alvoUserId + " (Por: " + interaction.user.tag + ")");
            }
        } catch (err) {
            console.error("Erro na ação do admin:", err);
            return interaction.reply({
                content: "❌ **Erro ao processar a avaliação:**\n`" + (err.message || err) + "`\n\n*Dica: Verifique em Configurações do Servidor -> Cargos se o cargo do Bot está posicionado acima dos cargos que ele precisa atribuir.*",
                ephemeral: true
            }).catch(() => {});
        }
    }
});

// ===============================
// TRATAMENTO DE ERROS GLOBAIS (ANTI-CRASH)
// ===============================

process.on("unhandledRejection", (reason) => {
    console.error("⚠️ [ANTI-CRASH] Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("⚠️ [ANTI-CRASH] Uncaught Exception:", err);
});

// ===============================
// INICIALIZAR BOT
// ===============================

if (!TOKEN || TOKEN.includes("SEU_TOKEN")) {
    console.error("❌ ERRO CRÍTICO: Token do Bot não foi configurado no arquivo .env ou no script!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("❌ ERRO AO FAZER LOGIN DO BOT: Verifique se o TOKEN está correto e as Intents estão ativadas!", err);
});
