/**
 * ============================================================================
 * BOT AUTOMÁTICO DE REGISTRO DISCORD — FIVEZ & LUMENFALL CITY
 * ============================================================================
 */

require('dotenv').config();
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
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events,
    PermissionsBitField
} = require("discord.js");

const fs = require("fs");

// Busca o Token das variáveis de ambiente do Railway (TOKEN ou DISCORD_TOKEN)
const TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;

// ===============================
// CONFIGURAÇÃO DO SISTEMA
// ===============================

const CONFIG = {
    CANAL_REGISTRO_ID: "1515448138385592361",
    CANAL_LOGS_ID: "1515448473246498866", // Canal de logs correto atualizado!
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
const cooldown = new Map();

// ===============================
// INICIALIZAÇÃO DO CLIENTE DISCORD
// ===============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // IMPORTANTE: Necessário para o comando !limparcargos funcionar!
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
> 🏷️ **Apelido Atualizado Automaticamente:** Com a tag da facção, seu Nome e ID
> 🔓 **Liberação imediata** dos canais e categorias do servidor
> 🎉 **Acesso completo** a eventos, caças e roleplay da cidade

👇 *Clique no botão abaixo, escolha seu grupo e preencha o formulário com seu Nome no Jogo e ID!*`)
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
    console.log("🛡️ Proteção Anti-Spam: 30 segundos");
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
    // ETAPA 1: CLIQUE NO BOTÃO "REALIZAR REGISTRO"
    // ------------------------------------------------------------------------
    if (interaction.isButton() && interaction.customId === "abrir_menu_registro") {
        try {
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
    // ETAPA 2: SELEÇÃO DE GRUPO -> FORMULÁRIO MODAL
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

            const row1 = new ActionRowBuilder().addComponents(inputNome);
            const row2 = new ActionRowBuilder().addComponents(inputId);
            modal.addComponents(row1, row2);

            await interaction.showModal(modal);
        } catch (err) {
            console.error("Erro ao abrir modal:", err);
            return interaction.reply({ content: "❌ Ocorreu um erro ao abrir o formulário.", ephemeral: true }).catch(() => {});
        }
    }

    // ------------------------------------------------------------------------
    // ETAPA 2.5: ENVIO DO MODAL -> LOGS DOS ADMINS
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
                    { name: "🏷️ Novo Apelido (Após Aprovar)", value: "`" + novoApelido + "`", inline: false },
                    { name: "⏰ Data da Solicitação", value: "<t:" + Math.floor(Date.now() / 1000) + ":F>", inline: false }
                )
                .setThumbnail(membro.user.displayAvatarURL({ dynamic: true }))
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
    // ETAPA 3: APROVAÇÃO ✅ OU RECUSA ❌ POR ADMIN
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
            const acao = partes[0];
            const alvoUserId = partes[2];
            const alvoRoleId = partes[3];

            const membroAlvo = await guild.members.fetch(alvoUserId).catch(() => null);
            const grupoInfo = CONFIG.GRUPOS.find(g => g.roleId === alvoRoleId) || { name: "Grupo", emoji: "✅", tag: "|TAG|" };

            if (acao === "aprovar") {
                if (!membroAlvo) {
                    return interaction.reply({ content: "⚠️ O usuário não está mais no servidor ou não pôde ser encontrado.", ephemeral: true });
                }

                if (guild.members.me.roles.highest.position <= 1) {
                    return interaction.reply({ content: "❌ O meu cargo no servidor precisa estar ACIMA dos cargos Morador e Grupos para que eu possa adicioná-los!", ephemeral: true });
                }

                const embedAtual = interaction.message.embeds[0];
                const campoApelido = embedAtual.fields.find(f => f.name.includes("Novo Apelido"));
                const novoApelido = campoApelido ? campoApelido.value.replace(/[`]/g, "").trim() : null;

                const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
                const cargosRemover = membroAlvo.roles.cache.filter(r => todosGruposIds.includes(r.id) && r.id !== alvoRoleId);
                if (cargosRemover.size > 0) {
                    await membroAlvo.roles.remove(cargosRemover).catch(() => {});
                }

                const cargosParaAdicionar = [CONFIG.CARGO_MORADOR_ID];
                if (alvoRoleId && alvoRoleId !== CONFIG.CARGO_MORADOR_ID) {
                    cargosParaAdicionar.push(alvoRoleId);
                }

                await membroAlvo.roles.add(cargosParaAdicionar).catch(err => {
                    throw new Error("Erro ao atribuir cargos no Discord: verifique se o cargo do Bot está no topo da hierarquia!");
                });

                let apelidoAlteradoMsg = "";
                if (novoApelido && membroAlvo.id !== guild.ownerId) {
                    await membroAlvo.setNickname(novoApelido).then(() => {
                        apelidoAlteradoMsg = "\n> 🏷️ **Apelido alterado para:** `" + novoApelido + "`";
                    }).catch(err => {
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
                            .setDescription("Olá **" + membroAlvo.user.username + "**! 👋\n\nSua solicitação de registro para o grupo **" + grupoInfo.emoji + " " + grupoInfo.name + "** foi **APROVADA** pela administração!\n\n> ✅ Você recebeu o cargo **Morador** + **" + grupoInfo.name + "**" + apelidoAlteradoMsg + "\n> 🔓 Todos os canais e categorias de voz/texto foram liberados.\n\nDivirta-se em nossa comunidade!")
                            .setFooter({ text: CONFIG.FOOTER })
                            .setTimestamp()
                    ]
                }).catch(() => {});
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
                                .setDescription("Olá **" + membroAlvo.user.username + "**,\n\nInformamos que sua solicitação para ingressar no grupo **" + grupoInfo.name + "** foi avaliada e **recusada** pela equipe de Administração.\n\nCaso queira refazer seu cadastro com outro nome/ID, clique novamente em **Realizar Registro** no painel.")
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

// ============================================================================
// COMANDOS DE ADMINISTRAÇÃO NO CHAT (!limparcargos)
// ============================================================================
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;

    const lowerContent = message.content.toLowerCase();
    if (lowerContent === "!limparcargos" || lowerContent === "!resetgrupos") {
        try {
            // Verifica permissão do Administrador
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply("❌ Apenas Administradores podem executar a limpeza geral de cargos.");
            }

            const msgStatus = await message.reply("⏳ **Iniciando limpeza de cargos dos Amigos e Facções...** Por favor, aguarde.");
            const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
            let countRemovidos = 0;

            // Faz o fetch de todos os membros (garante que estão cacheados)
            const membros = await message.guild.members.fetch();
            
            for (const [id, mem] of membros) {
                if (mem.user.bot) continue;
                
                const cargosRemover = mem.roles.cache.filter(r => todosGruposIds.includes(r.id));
                if (cargosRemover.size > 0) {
                    await mem.roles.remove(cargosRemover).catch(() => {});
                    countRemovidos++;
                }
            }
            
            await msgStatus.edit("✅ **Limpeza Concluída com Sucesso!**\n> 🧹 Cargos dos Amigos e Facções foram retirados de **" + countRemovidos + "** membros.\n> 📢 O botão do painel está visível e liberado para todos fazerem o registro obrigatório com Tag e ID!");
        } catch (err) {
            message.reply("❌ Erro ao remover cargos: " + (err.message || err)).catch(() => {});
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
    console.error("❌ ERRO CRÍTICO: Token do Bot não foi configurado!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("❌ ERRO AO FAZER LOGIN DO BOT: Verifique seu Token e se as Privileged Intents estão ativadas no Developer Portal!", err);
});
