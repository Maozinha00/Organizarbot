const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    Events, 
    PermissionsBitField,
    TextChannel
} = require("discord.js");
const fs = require("fs");
require("dotenv").config();

// Inicialização do Client do Discord com as devidas Intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates // Necessário para detectar quem está em call
    ]
});

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

// Configuração Centralizada do Bot
const CONFIG_FILE = "./config.json";
let CONFIG = {
    CANAL_REGISTRO_ID: "",
    CANAL_LOGS_ID: "",
    CARGO_MORADOR_ID: "",
    FOOTER: "FiveZ & Lumenfall",
    GRUPOS: [
        { id: "1", name: "Amigos", emoji: "👥", tag: "AMIGOS", roleId: "" },
        { id: "2", name: "Bratva", emoji: "🩸", tag: "BRATVA", roleId: "" },
        { id: "3", name: "Medellin", emoji: "⚖️", tag: "MEDELLIN", roleId: "" },
        { id: "4", name: "Yakuza", emoji: "🐲", tag: "YAKUZA", roleId: "" },
        { id: "5", name: "Turquia", emoji: "🕌", tag: "TURQUIA", roleId: "" },
        { id: "6", name: "Máfia", emoji: "🎩", tag: "MAFIA", roleId: "" }
    ]
};

// Funções Auxiliares de Configuração
function carregarConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
        } catch (e) {
            console.error("Erro ao ler arquivo de configuração:", e);
        }
    }
}
carregarConfig();

// Painel de Registro Salvo
const PANEL_FILE = "./panel_state.json";
function salvarPainel(data) {
    fs.writeFileSync(PANEL_FILE, JSON.stringify(data, null, 2));
}
function carregarPainel() {
    if (fs.existsSync(PANEL_FILE)) {
        return JSON.parse(fs.readFileSync(PANEL_FILE, "utf-8"));
    }
    return null;
}

// ===============================================
// FUNÇÃO DE LIMPEZA E AVISO AUTOMÁTICO (3 DIAS)
// ===============================================
async function verificarEAvisarNaoRegistrados(guild) {
    try {
        console.log("⏳ [AUTOKICK - AVISO] Iniciando verificação de membros não registrados...");
        
        const membros = await guild.members.fetch();
        const agora = Date.now();
        const tresDiasMs = 3 * 24 * 60 * 60 * 1000; // 3 dias em milissegundos
        
        const cargosRelacionados = CONFIG.GRUPOS.map(g => g.roleId);
        let countAvisados = 0;
        
        for (const [id, member] of membros) {
            if (member.user.bot) continue;
            if (member.id === guild.ownerId) continue;
            if (member.permissions.has(PermissionsBitField.Flags.Administrator) || member.permissions.has(PermissionsBitField.Flags.ManageRoles)) continue;
            
            // Verifica se o usuário tem algum dos cargos de grupo
            const temCargoRelacionado = member.roles.cache.some(role => cargosRelacionados.includes(role.id));
            
            if (!temCargoRelacionado) {
                const tempoNoServidor = agora - member.joinedTimestamp;
                if (tempoNoServidor > tresDiasMs) {
                    console.log(`⚠️ [AVISO] Membro não registrado no prazo de 3 dias: ${member.user.tag} (${member.id}) — Enviando Notificação`);
                    
                    // Envia uma DM avisando o usuário
                    await member.send({
                        content: `⚠️ **Olá, você foi identificado(a) no servidor ${guild.name} sem realizar o seu registro dentro do prazo limite de 3 dias.**\n\nPor favor, realize seu registro o quanto antes no canal correspondente para evitar ser removido(a) futuramente!`
                    }).catch(() => console.log(`Aviso: DM fechada para ${member.user.tag}`));
                    
                    // LINHA DE KICK COMENTADA SEGURAMENTE CONFORME SOLICITADO:
                    // await member.kick("Não se registrou no prazo de 3 dias.").catch(err => console.error(err));
                    
                    countAvisados++;
                }
            }
        }
        
        console.log(`✅ [AVISO] Verificação concluída. ${countAvisados} membros avisados.`);
        
        if (countAvisados > 0) {
            const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
            if (canalLogs) {
                const embedAutokick = new EmbedBuilder()
                    .setColor("#E74C3C")
                    .setTitle("🛡️ Limpeza Automática — Aviso de Não Registrados (Sem Kick)")
                    .setDescription(`O sistema identificou e notificou via DM **${countAvisados}** membros que estão no servidor há mais de 3 dias sem realizar o registro ou possuir os cargos correspondentes.`)
                    .setTimestamp();
                await canalLogs.send({ embeds: [embedAutokick] }).catch(() => {});
            }
        }
    } catch (err) {
        console.error("Erro na rotina de autokick/aviso:", err);
    }
}

// ===============================================
// CONSTRUÇÃO E ENVIO DO PAINEL DE REGISTRO
// ===============================================
function gerarPainelEmbed(guild) {
    const embed = new EmbedBuilder()
        .setColor("#2C3E50")
        .setTitle("🏡 Sistema de Registro — Cidadania & Grupos")
        .setDescription(`# Seja bem-vindo à nossa Comunidade!
 
📢 **AVISO IMPORTANTE PARA TODOS (@everyone):**
> ⚠️ **PRAZO LIMITE DE REGISTRO:** Todo membro que entrar no servidor tem um prazo máximo de **3 dias** para realizar o registro de cidadania.
> 🚫 Se você passar de **3 dias** no servidor sem realizar o seu registro (ficando sem os cargos dos grupos), você receberá avisos automáticos e poderá perder o acesso ao servidor!

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
        .setCustomId("iniciar_registro")
        .setLabel("Realizar Registro")
        .setEmoji("📝")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(botao);

    return {
        content: "@everyone",
        embeds: [embed],
        components: [row]
    };
}

async function enviarPainel(guild, canalId) {
    try {
        const canal = await guild.channels.fetch(canalId).catch(() => null);
        if (!canal) return;

        const painelData = gerarPainelEmbed(guild);
        const salvo = carregarPainel();
        let messageEdited = false;

        if (salvo && salvo.messageId) {
            try {
                const msg = await canal.messages.fetch(salvo.messageId);
                await msg.edit(painelData);
                messageEdited = true;
                console.log("✏️ Painel de Registro atualizado com sucesso!");
            } catch (e) {
                console.log("Aviso: Painel salvo não foi encontrado para edição, enviando novo...");
            }
        }

        if (!messageEdited) {
            const novaMsg = await canal.send(painelData);
            salvarPainel({ messageId: novaMsg.id });
            console.log("📬 Novo painel de Registro enviado!");
        }
    } catch (e) {
        console.error("Erro ao enviar painel de registro:", e);
    }
}

// ===============================================
// EVENTO: BOT ONLINE
// ===============================================
client.once(Events.ClientReady, async () => {
    console.log(`🤖 Bot conectado como: ${client.user.tag}`);
    
    const guild = client.guilds.cache.first();
    if (guild) {
        await enviarPainel(guild, CONFIG.CANAL_REGISTRO_ID);

        // Executa a verificação/aviso automático dos 3 dias ao iniciar
        await verificarEAvisarNaoRegistrados(guild);

        // Agenda a verificação para rodar a cada 1 hora
        setInterval(async () => {
            await verificarEAvisarNaoRegistrados(guild);
        }, 3600000);
    }
});

// ===============================================
// TRATAMENTO DE INTERAÇÕES (BOTÕES E FORMULÁRIOS)
// ===============================================
client.on(Events.InteractionCreate, async (interaction) => {
    const guild = interaction.guild;
    if (!guild) return;

    // 1. Clicou em "Realizar Registro"
    if (interaction.isButton() && interaction.customId === "iniciar_registro") {
        try {
            // Cria botões dinâmicos de seleção de grupos
            const rows = [];
            let currentRow = new ActionRowBuilder();

            CONFIG.GRUPOS.forEach((g, index) => {
                if (index > 0 && index % 5 === 0) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                }

                currentRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`selecionar_grupo_${g.roleId}`)
                        .setLabel(g.name)
                        .setEmoji(g.emoji)
                        .setStyle(ButtonStyle.Secondary)
                );
            });

            if (currentRow.components.length > 0) {
                rows.push(currentRow);
            }

            return interaction.reply({
                content: "👋 **Seja bem-vindo(a)!** Selecione abaixo qual será o seu grupo/facção para continuar com seu registro de cidadania:",
                components: rows,
                ephemeral: true
            });
        } catch (err) {
            console.error("Erro ao iniciar registro:", err);
            return interaction.reply({ content: "❌ Ocorreu um erro ao abrir as opções de grupo.", ephemeral: true }).catch(() => {});
        }
    }

    // 2. Selecionou um Grupo -> Abre o formulário correspondente
    if (interaction.isButton() && interaction.customId.startsWith("selecionar_grupo_")) {
        try {
            const roleId = interaction.customId.replace("selecionar_grupo_", "");
            const grupoEscolhido = CONFIG.GRUPOS.find(g => g.roleId === roleId);

            if (!grupoEscolhido) {
                return interaction.reply({ content: "❌ Grupo selecionado é inválido ou não foi encontrado nas configurações.", ephemeral: true });
            }

            // Exibe formulário modal
            const modal = new ModalBuilder()
                .setCustomId(`modal_registro_${roleId}`)
                .setTitle(`Registro: ${grupoEscolhido.name}`);

            const campoNome = new TextInputBuilder()
                .setCustomId("nome_personagem")
                .setLabel("Nome no Jogo (Ex: Jones Souza)")
                .setStyle(TextInputStyle.Short)
                .setMinLength(3)
                .setMaxLength(20)
                .setRequired(true);

            const campoID = new TextInputBuilder()
                .setCustomId("id_jogo")
                .setLabel("Seu ID no Jogo (Ex: 1245)")
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(6)
                .setRequired(true);

            const campoContratou = new TextInputBuilder()
                .setCustomId("quem_contratou")
                .setLabel("Quem te contratou?")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Nome do Líder, Recrutador ou Amigo")
                .setMaxLength(30)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(campoNome),
                new ActionRowBuilder().addComponents(campoID),
                new ActionRowBuilder().addComponents(campoContratou)
            );

            await interaction.showModal(modal);
        } catch (err) {
            console.error("Erro ao exibir modal de registro:", err);
        }
    }

    // 3. Envio do Formulário Modal -> Envia para avaliação dos Administradores
    if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_registro_")) {
        try {
            const roleId = interaction.customId.replace("modal_registro_", "");
            const grupoEscolhido = CONFIG.GRUPOS.find(g => g.roleId === roleId);

            if (!grupoEscolhido) {
                return interaction.reply({ content: "❌ Ocorreu um erro ao processar seu grupo selecionado.", ephemeral: true });
            }

            const nomePersonagem = interaction.fields.getTextInputValue("nome_personagem").trim();
            const idJogo = interaction.fields.getTextInputValue("id_jogo").trim();
            const quemContratou = interaction.fields.getTextInputValue("quem_contratou").trim();

            const membro = interaction.member;
            const tagGrupo = grupoEscolhido.tag || "TAG";
            
            // Formato de Apelido: [TAG] Nome | ID
            const novoApelido = `[${tagGrupo}] ${nomePersonagem} | ${idJogo}`;

            const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
            if (!canalLogs) {
                return interaction.reply({
                    content: "⚠️ **Erro no envio:** O canal de avaliação da Administração não está configurado corretamente. Entre em contato com um Administrador.",
                    ephemeral: true
                });
            }

            // Embed com o Formulário preenchido
            const embedLog = new EmbedBuilder()
                .setColor("#3498DB")
                .setTitle("📥 Novo Formulário de Registro Recebido")
                .setDescription("O membro preencheu o formulário de cidadania e aguarda aprovação da Administração.")
                .addFields(
                    { name: "👤 Usuário Discord", value: `<@${membro.id}> (${membro.user.tag})`, inline: true },
                    { name: "🆔 Discord ID", value: `\`${membro.id}\``, inline: true },
                    { name: "🎯 Grupo Escolhido", value: `${grupoEscolhido.emoji} **${grupoEscolhido.name}**\n(Tag: \`${grupoEscolhido.tag || "|TAG|"}\`)`, inline: false },
                    { name: "📝 Nome no Jogo", value: `**${nomePersonagem}**`, inline: true },
                    { name: "🔢 ID no Jogo", value: `**${idJogo}**`, inline: true },
                    { name: "🤝 Quem te Contratou", value: `**${quemContratou}**`, inline: false },
                    { name: "🏷️ Novo Apelido (Após Aprovar)", value: `\`${novoApelido}\``, inline: false },
                    { name: "⏰ Data da Solicitação", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                )
                .setThumbnail(membro.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: CONFIG.FOOTER })
                .setTimestamp();

            // Botões de Aprovação / Recusa
            const btnAprovar = new ButtonBuilder()
                .setCustomId(`aprovar_reg_${membro.id}_${roleId}`)
                .setEmoji("✅")
                .setLabel("Aprovar Registro")
                .setStyle(ButtonStyle.Success);

            const btnRecusar = new ButtonBuilder()
                .setCustomId(`recusar_reg_${membro.id}_${roleId}`)
                .setEmoji("❌")
                .setLabel("Recusar")
                .setStyle(ButtonStyle.Danger);

            const rowAdmin = new ActionRowBuilder().addComponents(btnAprovar, btnRecusar);

            await canalLogs.send({
                embeds: [embedLog],
                components: [rowAdmin]
            });

            return interaction.reply({
                content: `✅ **Formulário de Registro Enviado com Sucesso!**\n\nSua solicitação para o grupo **${grupoEscolhido.emoji} ${grupoEscolhido.name}** foi encaminhada para a equipe de Administração.\nAssim que for aprovada, seus cargos serão adicionados e seu apelido alterado automaticamente!`,
                ephemeral: true
            });

        } catch (err) {
            console.error("Erro no formulário de registro:", err);
            return interaction.reply({ content: "❌ Ocorreu um erro ao enviar seu formulário.", ephemeral: true }).catch(() => {});
        }
    }

    // 4. Admin Clicou em "Aprovar" ou "Recusar"
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
            const grupoInfo = CONFIG.GRUPOS.find(g => g.roleId === alvoRoleId) || { name: `Grupo (${alvoRoleId})`, emoji: "✅", tag: "|TAG|" };

            if (acao === "aprovar") {
                if (!membroAlvo) {
                    return interaction.reply({ content: "⚠️ O usuário não está mais no servidor ou não pôde ser encontrado.", ephemeral: true });
                }

                const highestRole = guild.members.me.roles.highest;
                if (highestRole.position <= 1) {
                    return interaction.reply({ content: "❌ O meu cargo no servidor precisa estar ACIMA dos cargos Morador e Grupos para que eu possa adicioná-los!", ephemeral: true });
                }

                // Obtém o apelido formatado
                const embedAtual = interaction.message.embeds[0];
                const campoApelido = embedAtual.fields.find(f => f.name.includes("Novo Apelido"));
                const novoApelido = campoApelido ? campoApelido.value.replace(/[`]/g, "").trim() : null;

                // Remove os outros grupos anteriores
                const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
                const cargosRemover = membroAlvo.roles.cache.filter(r => todosGruposIds.includes(r.id) && r.id !== alvoRoleId);
                if (cargosRemover.size > 0) {
                    await membroAlvo.roles.remove(cargosRemover).catch(() => {});
                }

                // Adiciona o novo cargo selecionado
                await membroAlvo.roles.add(alvoRoleId).catch(err => {
                    throw new Error("Erro ao atribuir cargo: verifique se o cargo do Bot está no topo da hierarquia!");
                });

                // Altera apelido no servidor
                let apelidoAlteradoMsg = "";
                if (novoApelido && membroAlvo.id !== guild.ownerId) {
                    await membroAlvo.setNickname(novoApelido).then(() => {
                        apelidoAlteradoMsg = `\n> 🏷️ **Apelido alterado para:** \`${novoApelido}\``;
                    }).catch(() => {
                        apelidoAlteradoMsg = `\n> ⚠️ *Não foi possível alterar seu apelido automaticamente.*`;
                    });
                }

                const embedAprovada = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor("#2ECC71")
                    .setTitle("✅ Registro & Apelido Aprovados")
                    .addFields({
                        name: "👮 Avaliado por",
                        value: `<@${interaction.user.id}> em <t:${Math.floor(Date.now() / 1000)}:f>`,
                        inline: false
                    });

                await interaction.update({
                    embeds: [embedAprovada],
                    components: []
                });

                // Notifica o usuário por DM
                await membroAlvo.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#2ECC71")
                            .setTitle("🎉 Cidadania e Apelido Aprovados!")
                            .setDescription(`Olá **${membroAlvo.user.username}**! 👋\n\nSua solicitação de registro para o grupo **${grupoInfo.emoji} ${grupoInfo.name}** foi **APROVADA**!\n\n> ✅ Você recebeu o cargo **${grupoInfo.name}**${apelidoAlteradoMsg}\n> 🔓 Todos os canais foram liberados.`)
                            .setFooter({ text: CONFIG.FOOTER })
                            .setTimestamp()
                    ]
                }).catch(() => {});

            } else if (acao === "recusar") {
                const embedRecusada = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor("#E74C3C")
                    .setTitle("❌ Registro Recusado")
                    .addFields({
                        name: "👮 Avaliado por",
                        value: `<@${interaction.user.id}> em <t:${Math.floor(Date.now() / 1000)}:f>`,
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
                                .setDescription(`Olá **${membroAlvo.user.username}**,\n\nSua solicitação de registro para o grupo **${grupoInfo.name}** foi avaliada e **recusada** pela administração.\n\nCaso queira refazer seu cadastro, clique novamente em **Realizar Registro** no painel do servidor.`)
                                .setFooter({ text: CONFIG.FOOTER })
                                .setTimestamp()
                        ]
                    }).catch(() => {});
                }
            }
        } catch (err) {
            console.error(err);
        }
    }
});

// ===============================================
// COMANDOS DE ADMINISTRAÇÃO (CHAT COM PROTEÇÃO DE CALL)
// ===============================================
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;

    const lowerContent = message.content.toLowerCase();
    if (lowerContent === "!limparcargos" || lowerContent === "!resetgrupos") {
        try {
            if (!message.member || !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply("❌ Apenas Administradores podem executar a limpeza geral de cargos para recadastro.");
            }

            await message.delete().catch(() => {});

            const msgStatus = await message.channel.send("⏳ **Iniciando limpeza de cargos...** Por favor, aguarde.");
            const todosGruposIds = CONFIG.GRUPOS.map(g => g.roleId);
            let countRemovidos = 0;
            let countIgnoradosCall = 0;

            const membros = await message.guild.members.fetch();
            for (const [id, mem] of membros) {
                if (mem.user.bot) continue;

                // 🎙️ SE O MEMBRO JÁ ESTÁ CONECTADO A UMA CALL, NÃO REMOVE OS CARGOS DELE!
                if (mem.voice.channel || mem.voice.channelId) {
                    console.log(`ℹ️ Ignorando limpeza de cargos para ${mem.user.tag} pois está em call.`);
                    countIgnoradosCall++;
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
                        await panelMsg.edit({ content: "@everyone" }).catch(() => {});
                    }
                }
                await canalRegistro.send("📢 **@everyone Atenção!** Os cargos foram limpos (exceto para quem estava em call). Por favor, utilizem o painel para realizar o seu registro obrigatório!").catch(() => {});
            }

            await msgStatus.edit(`✅ **Limpeza Concluída com Sucesso!**\n\n> 🧹 Cargos limpos de **${countRemovidos}** membros.\n> 🎙️ **${countIgnoradosCall}** membros foram poupados/ignorados por estarem em call.\n\n📢 Canal de registro notificado com @everyone.`);
        } catch (err) {
            console.error(err);
            message.reply(`❌ Erro ao remover cargos: ${err.message}`).catch(() => {});
        }
    }
});

// Tratamento global de erros para o bot nunca cair (Anti-Crash)
process.on("unhandledRejection", (reason) => console.error("⚠️ [ANTI-CRASH]:", reason));
process.on("uncaughtException", (err) => console.error("⚠️ [ANTI-CRASH]:", err));

if (TOKEN) {
    client.login(TOKEN).catch(e => console.error(e));
}
