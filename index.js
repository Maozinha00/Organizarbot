/**
 * ============================================================================
 * BOT AUTOMÁTICO DE REGISTRO DISCORD — FIVEZ & LUMENFALL CITY
 * ============================================================================
 * 
 * REGRA ATIVA: Toda menção ao nome "Hunters" muda para "Recruta" AUTOMATICAMENTE.
 * ----------------------------------------------------------------------------
 * Recursos inclusos:
 *  - Varredura de Segurança: Modifica o apelido de quem já está no servidor.
 *  - Auto-Rename ao Entrar/Digitar/Atualizar: Corrige "Hunters" ➔ "Recruta".
 *  - Limpeza de Cargos (!limparcargos): Remove cargos de facção de membros inativos.
 *  - Proteção de Call: Membros em canal de voz NÃO perdem cargos no reset.
 *  - Painel Interativo de Cidadania com botões, modais e logs na administração.
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
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events,
    PermissionsBitField
} from "discord.js";

// Token de conexão do Bot (Definido nas variáveis de ambiente do seu sistema)
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

// ===============================
// CONFIGURAÇÃO GERAL DO SISTEMA
// ===============================
const CONFIG = {
    CANAL_REGISTRO_ID: "1515448138385592361",
    CANAL_LOGS_ID: "1515448473246498866", 
    CANAL_ENTRADA_SAIDA_ID: "1524222632923496509", 
    CARGO_MORADOR_ID: "1515125822556550000",

    EMBED_COLOR: "#2ECC71",
    FOOTER: "FiveZ & Lumenfall • Sistema Automático",
    FORMATO_APELIDO: "{TAG} {NOME} | {ID}",

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
            "name": "FiveZ Recruta", // Alterado de Hunters para Recruta
            "roleId": "1515125826780135485",
            "emoji": "🎯",
            "tag": "|Recruta|", // Tag padronizada para Recruta
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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.GuildMember, Partials.User]
});

// ============================================================================
// FUNÇÃO AUXILIAR: REGRA DE SUBSTUIÇÃO AUTOMÁTICA
// ============================================================================
function autoRenameHunters(text) {
    if (!text) return { text: '', changed: false };
    
    const regex = /hunters/gi;
    const hasMatch = regex.test(text);
    
    if (hasMatch) {
        const replaced = text.replace(regex, (match) => {
            if (match === 'HUNTERS') return 'RECRUTA';
            if (match === 'hunters') return 'recruta';
            return 'Recruta';
        });
        return { text: replaced, changed: true };
    }
    
    return { text, changed: false };
}

// ============================================================================
// VERIFICAÇÃO E RENOVAÇÃO DE APELIDO
// ============================================================================
async function checkAndRenameMember(member) {
    if (member.user.bot) return;
    
    const currentUsername = member.user.username;
    const currentNickname = member.nickname || '';
    
    const userCheck = autoRenameHunters(currentUsername);
    const nickCheck = autoRenameHunters(currentNickname);
    
    // Se o nome de usuário ou apelido atual contiver "Hunters", realizamos a mudança
    if (userCheck.changed || nickCheck.changed) {
        let newNickname = currentNickname;
        
        if (currentNickname) {
            newNickname = nickCheck.text;
        } else {
            newNickname = userCheck.text;
        }

        // Restringe ao limite de 32 caracteres do Discord
        if (newNickname.length > 32) {
            newNickname = newNickname.substring(0, 32);
        }
        
        try {
            await member.setNickname(newNickname);
            console.log(`[RENAME] @${currentUsername} renomeado para "${newNickname}" com sucesso!`);
            
            // Envia um Log administrativo da correção aplicada
            const logsChannel = member.guild.channels.cache.get(CONFIG.CANAL_LOGS_ID);
            if (logsChannel && logsChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setColor('#F1C40F')
                    .setTitle('🛡️ Correção de Apelido Aplicada')
                    .setDescription(`O bot alterou o apelido do membro para cumprir a regra **Hunters ➔ Recruta**.`)
                    .addFields(
                        { name: '👤 Cidadão', value: `<@${member.id}> (${currentUsername})`, inline: true },
                        { name: '📝 Apelido Corrigido', value: `\`${newNickname}\``, inline: true }
                    )
                    .setFooter({ text: CONFIG.FOOTER })
                    .setTimestamp();
                
                await logsChannel.send({ embeds: [embed] });
            }
        } catch (err) {
            console.error(`[RENAME ERROR] Erro ao redefinir apelido de @${currentUsername}:`, err.message);
        }
    }
}

// ============================================================================
// EVENTO: BOT ONLINE (Varredura de segurança inicial)
// ============================================================================
client.once(Events.ClientReady, async () => {
    console.log(`==================================================`);
    console.log(`✅ BOT ONLINE: ${client.user.tag}`);
    console.log(`🛡️ Regra Ativa: Hunters ➔ Recruta`);
    console.log(`==================================================`);
    
    // Varredura para encontrar quem já está no servidor com nome antigo "Hunters"
    for (const guild of client.guilds.cache.values()) {
        try {
            console.log(`[AUTO-SCAN] Buscando na cidade: ${guild.name}...`);
            const members = await guild.members.fetch();
            let renomeados = 0;
            
            for (const member of members.values()) {
                const usernameContains = /hunters/gi.test(member.user.username);
                const nicknameContains = member.nickname && /hunters/gi.test(member.nickname);
                
                if (usernameContains || nicknameContains) {
                    await checkAndRenameMember(member);
                    renomeados++;
                }
            }
            console.log(`[AUTO-SCAN] Concluído! ${renomeados} moradores rebatizados para Recruta.`);
        } catch (err) {
            console.error(`[AUTO-SCAN ERROR] Erro ao escanear a guilda ${guild.name}:`, err);
        }
    }
});

// ============================================================================
// EVENTO: ENTRADA DE NOVO MEMBRO
// ============================================================================
client.on(Events.GuildMemberAdd, async (member) => {
    console.log(`[JOIN] Membro @${member.user.username} acabou de entrar.`);
    
    // Mensagem de entrada e aviso de cidadania
    const welcomeChannel = member.guild.channels.cache.get(CONFIG.CANAL_ENTRADA_SAIDA_ID);
    if (welcomeChannel && welcomeChannel.isTextBased()) {
        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🏙️ Bem-vindo(a) à nossa Cidade!')
            .setDescription(`Olá <@${member.id}>, bem-vindo! 
            
            Por favor, realize seu registro no canal <#${CONFIG.CANAL_REGISTRO_ID}> para obter seus cargos de morador e a tag da sua facção.
            
            ⚠️ **Atenção:** Se você ficar mais de **3 dias** sem se registrar, será removido automaticamente!`)
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: CONFIG.FOOTER })
            .setTimestamp();
        
        await welcomeChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
    }
    
    // Verifica e corrige o nome no momento da entrada
    await checkAndRenameMember(member);
});

// ============================================================================
// EVENTO: ATUALIZAÇÕES DE PERFIL (Evita que mudem o nome manualmente para Hunters)
// ============================================================================
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    if (oldMember.nickname !== newMember.nickname) {
        await checkAndRenameMember(newMember);
    }
});

// ============================================================================
// EVENTO: MONITORAMENTO DE CHAT & COMANDOS (!limparcargos / !resetgrupos)
// ============================================================================
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // Varre quem enviou a mensagem por segurança
    if (message.member) {
        await checkAndRenameMember(message.member);
    }
    
    const content = message.content.toLowerCase().trim();
    
    if (content === '!limparcargos' || content === '!resetgrupos') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Apenas administradores possuem permissão de limpar cargos.');
        }
        
        const statusMsg = await message.reply('⏳ **Iniciando limpeza e reset periódico de cargos...**');
        
        try {
            const members = await message.guild.members.fetch();
            const groupRoleIds = CONFIG.GRUPOS.map(g => g.roleId);
            
            let countCleaned = 0;
            let countProtected = 0;
            
            for (const member of members.values()) {
                if (member.user.bot) continue;
                
                // PROTEÇÃO DE CALL: Se estiver ativo em uma chamada de voz, não perde os cargos!
                if (member.voice.channelId) {
                    countProtected++;
                    continue;
                }
                
                // Verifica se tem algum cargo cadastrado na lista
                const hasGroupRole = member.roles.cache.some(r => groupRoleIds.includes(r.id));
                if (hasGroupRole) {
                    await member.roles.remove(groupRoleIds).catch(() => {});
                    await member.setNickname(null).catch(() => {});
                    countCleaned++;
                }
            }
            
            const summaryText = `🧹 **Limpeza Concluída com Sucesso!**\n> 🧼 Cargos de facção removidos de **${countCleaned}** membros offline/inativos.\n> 🗣️ **${countProtected}** membros protegidos em Call de Voz mantiveram seus cargos intactos.`;
            await statusMsg.edit(summaryText);
            
            // Notificação geral no canal de registros
            const registerChannel = message.guild.channels.cache.get(CONFIG.CANAL_REGISTRO_ID);
            if (registerChannel && registerChannel.isTextBased()) {
                await registerChannel.send('📢 **@everyone Atenção!** Todos os cargos inativos foram limpos no reset periódico. Por favor, registrem-se novamente clicando no painel acima!');
            }
        } catch (err) {
            console.error(err);
            await statusMsg.edit('❌ Ocorreu um erro ao processar o comando de limpeza.');
        }
    }
});

// ============================================================================
// EVENTO: INTEGRAÇÕES DO PAINEL (Botões de Aprovação, Recusa e Formulários)
// ============================================================================
client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === 'abrir_menu_registro') {
            const modal = new ModalBuilder()
                .setCustomId('modal_registro')
                .setTitle('🏡 Registro de Cidadania FiveZ');
            
            const nomeInput = new TextInputBuilder()
                .setCustomId('registro_nome')
                .setLabel('NOME COMPLETO NO JOGO')
                .setPlaceholder('Ex: Henrique Souza')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
            
            const idInput = new TextInputBuilder()
                .setCustomId('registro_id')
                .setLabel('SEU ID NO JOGO')
                .setPlaceholder('Ex: 1001')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);
                
            const grupoInput = new TextInputBuilder()
                .setCustomId('registro_grupo')
                .setLabel('NOME DA SUA FACÇÃO / GRUPO')
                .setPlaceholder('Ex: Souza / Recruta / Amigos')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const contratadoInput = new TextInputBuilder()
                .setCustomId('registro_contratante')
                .setLabel('QUEM TE CONTRATOU?')
                .setPlaceholder('Ex: Gabriel Diretor')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nomeInput),
                new ActionRowBuilder().addComponents(idInput),
                new ActionRowBuilder().addComponents(grupoInput),
                new ActionRowBuilder().addComponents(contratadoInput)
            );
            
            await interaction.showModal(modal);
        }
        
        // Avaliação de Administradores
        if (interaction.customId.startsWith('aprovar_btn_') || interaction.customId.startsWith('recusar_btn_')) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ Apenas administradores podem avaliar registros.', ephemeral: true });
            }
            
            const isApprove = interaction.customId.startsWith('aprovar_btn_');
            const embed = interaction.message.embeds[0];
            if (!embed) return interaction.reply({ content: '❌ Erro ao ler embed de registro.', ephemeral: true });
            
            const userField = embed.fields.find(f => f.name.includes('Usuário Discord'));
            const userIdMatch = userField?.value.match(/<@!?(\d+)>/);
            const userId = userIdMatch ? userIdMatch[1] : null;
            
            if (!userId) return interaction.reply({ content: '❌ Usuário não localizado no embed.', ephemeral: true });
            
            try {
                const member = await interaction.guild.members.fetch(userId);
                
                if (isApprove) {
                    const nomeField = embed.fields.find(f => f.name.includes('Nome no Jogo'))?.value.replace(/\*\*/g, '');
                    const idField = embed.fields.find(f => f.name.includes('ID no Jogo'))?.value.replace(/\*\*/g, '');
                    const grupoField = embed.fields.find(f => f.name.includes('Grupo Escolhido'))?.value;
                    
                    let matchedGroup = CONFIG.GRUPOS[0];
                    for (const g of CONFIG.GRUPOS) {
                        if (grupoField?.includes(g.name)) {
                            matchedGroup = g;
                            break;
                        }
                    }
                    
                    const finalNickname = `${matchedGroup.tag} ${nomeField} | ${idField}`;
                    
                    await member.roles.add([matchedGroup.roleId, CONFIG.CARGO_MORADOR_ID]);
                    await member.setNickname(finalNickname);
                    
                    const approvedEmbed = EmbedBuilder.from(embed)
                        .setColor('#2ECC71')
                        .setTitle('✅ Registro & Apelido Aprovados')
                        .addFields({ name: '👮 Avaliado por', value: `<@${interaction.user.id}>`, inline: false });
                    
                    await interaction.message.edit({ embeds: [approvedEmbed], components: [] });
                    await interaction.reply({ content: `✅ Registro de <@${userId}> aprovado com sucesso!`, ephemeral: true });
                    
                    await member.send(`🎉 **Seu Registro foi Aprovado!**\nSua cidadania no grupo **${matchedGroup.name}** foi liberada com sucesso.\n\n> 🏷️ **Apelido Atualizado:** \`${finalNickname}\``).catch(() => {});
                } else {
                    const rejectedEmbed = EmbedBuilder.from(embed)
                        .setColor('#E74C3C')
                        .setTitle('❌ Registro Recusado')
                        .addFields({ name: '👮 Avaliado por', value: `<@${interaction.user.id}>`, inline: false });
                    
                    await interaction.message.edit({ embeds: [rejectedEmbed], components: [] });
                    await interaction.reply({ content: `❌ Registro de <@${userId}> recusado.`, ephemeral: true });
                    
                    await member.send(`❌ **Seu Registro foi Recusado!**\nSua solicitação de cidadania foi recusada pela equipe da Administração. Por favor, reenvie o formulário com dados corretos.`).catch(() => {});
                }
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: `❌ Erro ao avaliar registro do membro: ${err.message}`, ephemeral: true });
            }
        }
    }
    
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_registro') {
            const rawNome = interaction.fields.getTextInputValue('registro_nome');
            const rawId = interaction.fields.getTextInputValue('registro_id');
            const rawGrupoText = interaction.fields.getTextInputValue('registro_grupo');
            const rawContratante = interaction.fields.getTextInputValue('registro_contratante');
            
            // REGRA ATIVA: Corrige Hunters -> Recruta nos dados inseridos
            const { text: nome } = autoRenameHunters(rawNome);
            const { text: grupoText } = autoRenameHunters(rawGrupoText);
            const { text: contratante } = autoRenameHunters(rawContratante);
            
            let targetGroup = CONFIG.GRUPOS.find(g => 
                g.name.toLowerCase().includes(grupoText.toLowerCase()) || 
                grupoText.toLowerCase().includes(g.name.toLowerCase())
            );
            
            if (!targetGroup) {
                targetGroup = CONFIG.GRUPOS.find(g => g.name.includes('Recruta')) || CONFIG.GRUPOS[0];
            }
            
            const logsChannel = interaction.guild.channels.cache.get(CONFIG.CANAL_LOGS_ID);
            if (!logsChannel || !logsChannel.isTextBased()) {
                return interaction.reply({ content: '❌ Canal de logs de registro não localizado.', ephemeral: true });
            }
            
            const logEmbed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('📥 Nova Solicitação de Registro & Apelido')
                .setDescription('O membro preencheu o formulário de cidadania e aguarda aprovação da Administração.')
                .addFields(
                    { name: "👤 Usuário Discord", value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
                    { name: "🆔 Discord ID", value: `\`${interaction.user.id}\``, inline: true },
                    { name: "🎯 Grupo Escolhido", value: `🎯 **${targetGroup.name}**\n(Tag: \`${targetGroup.tag}\`)`, inline: false },
                    { name: "📝 Nome no Jogo", value: `**${nome}**`, inline: true },
                    { name: "🔢 ID no Jogo", value: `**${rawId}**`, inline: true },
                    { name: "🤝 Quem te Contratou", value: `**${contratante}**`, inline: false },
                    { name: "🏷️ Novo Apelido (Após Aprovar)", value: `\`${targetGroup.tag} ${nome} | ${rawId}\``, inline: false }
                )
                .setFooter({ text: CONFIG.FOOTER })
                .setTimestamp();
                
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aprovar_btn_${interaction.id}`).setLabel('Aprovar Registro').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId(`recusar_btn_${interaction.id}`).setLabel('Recusar').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );
            
            await logsChannel.send({ embeds: [logEmbed], components: [row] });
            
            await interaction.reply({ 
                content: '🎉 **Seu formulário foi enviado com sucesso!**\nAguarde um administrador avaliar a sua solicitação.', 
                ephemeral: true 
            });
        }
    }
});

client.login(TOKEN);
