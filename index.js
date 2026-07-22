/**
 * ============================================================================
 * BOT AUTOMÁTICO DE REGISTRO E REGRAS DISCORD — CLÃ HUNTERS & FIVEZ
 * ============================================================================
 * 
 * REGRAS ATIVAS:
 * 1. LEITURA OBRIGATÓRIA DE REGRAS DO CLÃ HUNTERS:
 *    Ao receber o cargo de Recruta/Hunters (ID: 1515125826780135485), o bot envia
 *    automaticamente no PV (DM) ou no canal de regras (1522910276268069025) as regras
 *    oficiais do Clã Hunters e EXIGE a confirmação do jogador via botão interativo.
 * 
 * 2. SUBSTITUIÇÃO AUTOMÁTICA DE APELIDO (Hunters ➔ Recruta):
 *    Modifica automaticamente qualquer apelido/nome com "Hunters" para "Recruta".
 * 
 * 3. PAINEL DE REGISTRO & CIDADANIA:
 *    Painel interativo com botões, modais e aprovação administrativa com logs.
 * 
 * 4. COMANDOS ADMINISTRATIVOS:
 *    - !limparcargos / !resetgrupos (com proteção para quem está em Call de Voz)
 *    - !postarregras (envia o painel oficial de regras no canal 1522910276268069025)
 *    - !painel (envia o painel de registro no canal 1515448138385592361)
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
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events,
    PermissionsBitField
} = require("discord.js");

// Token do Bot (Definido em .env como DISCORD_TOKEN ou TOKEN)
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

// ===============================
// CONFIGURAÇÃO GERAL DO SISTEMA
// ===============================
const CONFIG = {
    CANAL_REGISTRO_ID: "1515448138385592361",
    CANAL_LOGS_ID: "1515448473246498866", 
    CANAL_ENTRADA_SAIDA_ID: "1524222632923496509", 
    CANAL_REGRAS_HUNTERS_ID: "1522910276268069025", // Canal Oficial das Regras
    CARGO_HUNTERS_RECRUTA_ID: "1515125826780135485", // Cargo do Clã Hunters / Recruta
    CARGO_MORADOR_ID: "1515125822556550000",

    EMBED_COLOR: "#2ECC71",
    COLOR_HUNTERS: "#C0392B",
    FOOTER: "FiveZ & Lumenfall • Sistema Clã Hunters",
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
            "name": "FiveZ Recruta", // Cargo do Clã Hunters
            "roleId": "1515125826780135485",
            "emoji": "🎯",
            "tag": "|Recruta|",
            "description": "Caçadores de elite de FiveZ e operações táticas do Clã Hunters"
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
// FUNÇÃO AUXILIAR: REGRA DE CORREÇÃO AUTOMÁTICA DE APELIDO (Hunters -> Recruta)
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
// FUNÇÃO AUXILIAR: ENVIAR REGRAS OBRIGATÓRIAS DO CLÃ HUNTERS
// ============================================================================
async function sendHuntersMandatoryRules(member) {
    try {
        const rulesEmbed = new EmbedBuilder()
            .setColor(CONFIG.COLOR_HUNTERS)
            .setTitle("☣️ CLÃ HUNTERS — REGRAS OFICIAIS DO DISCORD")
            .setDescription(`
⚠️ **LEITURA OBRIGATÓRIA PARA TODOS OS MEMBROS DO CLÃ HUNTERS**

Olá <@${member.id}>! Você recebeu o cargo do **Clã Hunters**. Para participar das atividades do clã, você **DEVE** ler e concordar com todas as regras oficiais abaixo:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👑 **01 • RESPEITO**
✅ Respeite **TODOS** os membros e a liderança.
✅ Mantenha sempre a educação nos canais e nas chamadas.
❌ **Desrespeito, brigas, xingamentos ou provocações NÃO serão tolerados.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 **02 • HIERARQUIA**
❌ **NÃO PEÇA CARGO OU PROMOÇÃO.**
✅ A hierarquia é conquistada com:
• Presença
• Metas
• Dedicação
• Confiança
• Respeito

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👕 **03 • UNIFORME**
✅ O **Preset Hunters** é **OBRIGÁTORIO** durante ações, eventos e atividades do clã.
❌ **É PROIBIDO** participar sem uniforme.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 **04 • METAS**
✅ **Entregue suas metas** para receber o **Kit do Clã**.
✅ Mantenha-se ativo e colaborando com a equipe.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **05 • ATIVIDADE**
✅ O **Painel do Clã** é atualizado diariamente.
❌ Quem ficar **03 DIAS SEM ENTRAR NO SERVIDOR**, sem avisar a liderança, será removido e perderá a vaga no Clã.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎙️ **06 • DISCORD**
✅ Entre em call quando for convocado e utilize os canais corretamente.
❌ **Spam, flood, divulgações ou atrapalhar a comunicação são proibidos.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚫 **07 • TOLERÂNCIA ZERO**
⛔ Cheat | Hack | Macro | Exploit | Roubo interno | Compartilhar informações | Retirar itens sem autorização.
> **Infrações resultam em expulsão imediata.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ **08 • PUNIÇÕES**
🟡 **1ª Infração:** Advertência | 🟠 **2ª Infração:** Suspensão | 🔴 **3ª Infração:** Expulsão

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 **RESPEITO • DISCIPLINA • LEALDADE • UNIÃO** 🔥

*"AQUI NINGUÉM PEDE CARGO. A HIERARQUIA É CONQUISTADA COM DEDICAÇÃO, METAS E RESPEITO."*
`)
            .setFooter({ text: `Canal de Regras: #${CONFIG.CANAL_REGRAS_HUNTERS_ID} • ${CONFIG.FOOTER}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('aceitar_regras_hunters')
                .setLabel('LI E ACEITO AS REGRAS DO CLÃ HUNTERS')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📜')
        );

        // Tenta enviar via DM primeiro
        try {
            await member.send({ embeds: [rulesEmbed], components: [row] });
            console.log(`[REGRAS HUNTERS] DM enviada para @${member.user.username}`);
        } catch (dmErr) {
            // Se DM estiver fechada, envia no canal oficial de regras marcando o usuário
            const rulesChannel = member.guild.channels.cache.get(CONFIG.CANAL_REGRAS_HUNTERS_ID);
            if (rulesChannel && rulesChannel.isTextBased()) {
                await rulesChannel.send({
                    content: `⚠️ <@${member.id}> **Você recebeu o cargo do Clã Hunters! Leia e aceite as regras abaixo para prosseguir:**`,
                    embeds: [rulesEmbed],
                    components: [row]
                });
                console.log(`[REGRAS HUNTERS] Regras enviadas no canal para @${member.user.username}`);
            }
        }
    } catch (err) {
        console.error(`[REGRAS ERROR] Erro ao enviar regras para @${member.user.username}:`, err.message);
    }
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
    
    if (userCheck.changed || nickCheck.changed) {
        let newNickname = currentNickname ? nickCheck.text : userCheck.text;

        if (newNickname.length > 32) {
            newNickname = newNickname.substring(0, 32);
        }
        
        try {
            await member.setNickname(newNickname);
            console.log(`[RENAME] @${currentUsername} renomeado para "${newNickname}"`);
            
            const logsChannel = member.guild.channels.cache.get(CONFIG.CANAL_LOGS_ID);
            if (logsChannel && logsChannel.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setColor('#F1C40F')
                    .setTitle('🛡️ Correção de Apelido Aplicada')
                    .setDescription(`Apelido alterado para cumprir a regra **Hunters ➔ Recruta**.`)
                    .addFields(
                        { name: '👤 Membro', value: `<@${member.id}> (${currentUsername})`, inline: true },
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
// EVENTO: BOT ONLINE
// ============================================================================
client.once(Events.ClientReady, async () => {
    console.log(`==================================================`);
    console.log(`✅ BOT ONLINE: ${client.user.tag}`);
    console.log(`🛡️ Regra Ativa: Hunters ➔ Recruta`);
    console.log(`☣️ Módulo Ativo: Leitura Obrigatória de Regras do Clã Hunters`);
    console.log(`==================================================`);
    
    for (const guild of client.guilds.cache.values()) {
        try {
            console.log(`[AUTO-SCAN] Buscando membros em: ${guild.name}...`);
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
            console.log(`[AUTO-SCAN] Concluído! ${renomeados} membros ajustados.`);
        } catch (err) {
            console.error(`[AUTO-SCAN ERROR] Erro ao escanear guilda ${guild.name}:`, err);
        }
    }
});

// ============================================================================
// EVENTO: ENTRADA DE NOVO MEMBRO
// ============================================================================
client.on(Events.GuildMemberAdd, async (member) => {
    console.log(`[JOIN] Membro @${member.user.username} entrou no servidor.`);
    
    const welcomeChannel = member.guild.channels.cache.get(CONFIG.CANAL_ENTRADA_SAIDA_ID);
    if (welcomeChannel && welcomeChannel.isTextBased()) {
        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🏙️ Bem-vindo(a) ao Servidor!')
            .setDescription(`Olá <@${member.id}>, bem-vindo! 
            
Por favor, realize seu registro no canal <#${CONFIG.CANAL_REGISTRO_ID}> para obter seus cargos.
            
⚠️ **Atenção:** Se você receber o cargo do **Clã Hunters**, você deverá aceitar as regras obrigatórias no canal <#${CONFIG.CANAL_REGRAS_HUNTERS_ID}>.`)
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: CONFIG.FOOTER })
            .setTimestamp();
        
        await welcomeChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
    }
    
    await checkAndRenameMember(member);
});

// ============================================================================
// EVENTO: MONITORAMENTO DE CARGOS (Dispara Regras ao receber cargo Hunters)
// ============================================================================
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    if (oldMember.nickname !== newMember.nickname) {
        await checkAndRenameMember(newMember);
    }

    const hadHuntersRole = oldMember.roles.cache.has(CONFIG.CARGO_HUNTERS_RECRUTA_ID);
    const hasHuntersRole = newMember.roles.cache.has(CONFIG.CARGO_HUNTERS_RECRUTA_ID);

    if (!hadHuntersRole && hasHuntersRole) {
        console.log(`[ROLE TRIGGER] Membro @${newMember.user.username} recebeu o cargo do Clã Hunters!`);
        await sendHuntersMandatoryRules(newMember);
    }
});

// ============================================================================
// EVENTO: COMANDOS (!limparcargos, !postarregras, !painel)
// ============================================================================
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    
    if (message.member) {
        await checkAndRenameMember(message.member);
    }
    
    const content = message.content.toLowerCase().trim();
    
    // Comando para enviar o Painel de Registro
    if (content === '!painel' || content === '!postarpainel') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Apenas administradores podem postar o painel.');
        }

        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🏙️ CIDADANIA & REGISTRO DE GRUPOS')
            .setDescription(`Clique no botão abaixo para preencher o formulário de registro e obter seus cargos de morador e grupo.`)
            .setFooter({ text: CONFIG.FOOTER });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_menu_registro')
                .setLabel('REGISTRAR-SE AGORA')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📝')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        return message.reply('✅ Painel de registro publicado com sucesso!');
    }

    // Comando para postar o canal oficial de Regras do Clã Hunters
    if (content === '!postarregras' || content === '!regrashunters') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Apenas administradores podem postar as regras.');
        }

        const targetChannel = message.guild.channels.cache.get(CONFIG.CANAL_REGRAS_HUNTERS_ID) || message.channel;

        const rulesEmbed = new EmbedBuilder()
            .setColor(CONFIG.COLOR_HUNTERS)
            .setTitle('☣️ CLÃ HUNTERS — REGRAS OFICIAIS DO DISCORD')
            .setDescription(`
# ╔════════════════════════════════════════════════════╗
# ☣️ **CLÃ HUNTERS**
# 💬 **REGRAS OFICIAIS DO DISCORD**
# ╚════════════════════════════════════════════════════╝

> ## ⚠️ **LEIA AS REGRAS ANTES DE PARTICIPAR DO CLÃ**
> **O descumprimento das regras poderá resultar em advertência, suspensão ou expulsão.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 👑 **01 • RESPEITO**
✅ Respeite **TODOS** os membros e a liderança.
✅ Mantenha sempre a educação nos canais e nas chamadas.
❌ **Desrespeito, brigas, xingamentos ou provocações NÃO serão tolerados.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 🏆 **02 • HIERARQUIA**
❌ **NÃO PEÇA CARGO OU PROMOÇÃO.**
✅ A hierarquia é conquistada com: Presença, Metas, Dedicação, Confiança e Respeito.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 👕 **03 • UNIFORME**
✅ O **Preset Hunters** é **OBRIGÁTORIO** durante ações e atividades do clã.
❌ **É PROIBIDO** participar sem uniforme.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 📦 **04 • METAS**
✅ **Entregue suas metas** para receber o **Kit do Clã**.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 📋 **05 • ATIVIDADE**
❌ Quem ficar **03 DIAS SEM ENTRAR NO SERVIDOR**, sem avisar a liderança, será removido.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 🎙️ **06 • DISCORD**
✅ Entre em call quando for convocado e utilize os canais corretamente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 🚫 **07 • TOLERÂNCIA ZERO**
⛔ Cheat | Hack | Macro | Exploit | Roubo interno | Informações vazadas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ⚖️ **08 • PUNIÇÕES**
🟡 **1ª Infração:** Advertência | 🟠 **2ª Infração:** Suspensão | 🔴 **3ª Infração:** Expulsão

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# 🦅 **CLÃ HUNTERS**
## **🔥 RESPEITO • DISCIPLINA • LEALDADE • UNIÃO 🔥**

> # **"AQUI NINGUÉM PEDE CARGO. A HIERARQUIA É CONQUISTADA COM DEDICAÇÃO, METAS E RESPEITO."**

<@&${CONFIG.CARGO_HUNTERS_RECRUTA_ID}>
`)
            .setFooter({ text: CONFIG.FOOTER });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('aceitar_regras_hunters')
                .setLabel('LI E ACEITO AS REGRAS DO CLÃ HUNTERS')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📜')
        );

        await targetChannel.send({ embeds: [rulesEmbed], components: [row] });
        return message.reply(`✅ Regras do Clã Hunters postadas no canal <#${targetChannel.id}>!`);
    }

    // Comando de Limpeza de Cargos
    if (content === '!limparcargos' || content === '!resetgrupos') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Apenas administradores possuem permissão de limpar cargos.');
        }
        
        const statusMsg = await message.reply('⏳ **Iniciando limpeza e reset de cargos...**');
        
        try {
            const members = await message.guild.members.fetch();
            const groupRoleIds = CONFIG.GRUPOS.map(g => g.roleId);
            
            let countCleaned = 0;
            let countProtected = 0;
            
            for (const member of members.values()) {
                if (member.user.bot) continue;
                
                if (member.voice.channelId) {
                    countProtected++;
                    continue;
                }
                
                const hasGroupRole = member.roles.cache.some(r => groupRoleIds.includes(r.id));
                if (hasGroupRole) {
                    await member.roles.remove(groupRoleIds).catch(() => {});
                    await member.setNickname(null).catch(() => {});
                    countCleaned++;
                }
            }
            
            const summaryText = `🧹 **Limpeza Concluída!**\n> 🧼 Cargos removidos de **${countCleaned}** membros offline.\n> 🗣️ **${countProtected}** membros em Call de Voz foram protegidos.`;
            await statusMsg.edit(summaryText);
        } catch (err) {
            console.error(err);
            await statusMsg.edit('❌ Erro ao processar o comando de limpeza.');
        }
    }
});

// ============================================================================
// EVENTO: BOTÕES E MODAIS
// ============================================================================
client.on(Events.InteractionCreate, async (interaction) => {
    // 1. Confirmação do Leitura de Regras do Clã Hunters
    if (interaction.isButton() && interaction.customId === 'aceitar_regras_hunters') {
        const confirmEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('✅ TERMO DE ACEITE CONCLUÍDO!')
            .setDescription(`Obrigado <@${interaction.user.id}>! Você confirmou a leitura e o compromisso com as **Regras Oficiais do Clã Hunters**.\n\n🔥 **Lembre-se:** Disciplina, Lealdade, União e Respeito acima de tudo.`)
            .setFooter({ text: CONFIG.FOOTER })
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

        // Envia confirmação nos logs da Administração
        const logsChannel = interaction.guild?.channels.cache.get(CONFIG.CANAL_LOGS_ID);
        if (logsChannel && logsChannel.isTextBased()) {
            const logEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('📜 Confirmação de Regras do Clã Hunters')
                .setDescription(`O membro aceitou formalmente as regras do Clã Hunters.`)
                .addFields(
                    { name: '👤 Jogador', value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
                    { name: '🆔 ID Discord', value: `\`${interaction.user.id}\``, inline: true },
                    { name: 'STATUS', value: '🟢 **Regras Lidas e Aceitas**', inline: false }
                )
                .setFooter({ text: CONFIG.FOOTER })
                .setTimestamp();

            await logsChannel.send({ embeds: [logEmbed] });
        }
        return;
    }

    // 2. Abertura do Modal de Registro
    if (interaction.isButton() && interaction.customId === 'abrir_menu_registro') {
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
            .setPlaceholder('Ex: Recruta / Souza / Amigos')
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
        return;
    }

    // 3. Avaliação de Registro por Administrador
    if (interaction.isButton() && (interaction.customId.startsWith('aprovar_btn_') || interaction.customId.startsWith('recusar_btn_'))) {
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
                
                await member.send(`🎉 **Seu Registro foi Aprovado!**\nSua cidadania no grupo **${matchedGroup.name}** foi liberada.\n\n> 🏷️ **Apelido Atualizado:** \`${finalNickname}\``).catch(() => {});

                // Se o cargo aprovado for do Clã Hunters, dispara a confirmação de regras!
                if (matchedGroup.roleId === CONFIG.CARGO_HUNTERS_RECRUTA_ID) {
                    await sendHuntersMandatoryRules(member);
                }
            } else {
                const rejectedEmbed = EmbedBuilder.from(embed)
                    .setColor('#E74C3C')
                    .setTitle('❌ Registro Recusado')
                    .addFields({ name: '👮 Avaliado por', value: `<@${interaction.user.id}>`, inline: false });
                
                await interaction.message.edit({ embeds: [rejectedEmbed], components: [] });
                await interaction.reply({ content: `❌ Registro de <@${userId}> recusado.`, ephemeral: true });
                
                await member.send(`❌ **Seu Registro foi Recusado!**\nSua solicitação de cidadania foi recusada pela administração.`).catch(() => {});
            }
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: `❌ Erro ao avaliar registro do membro: ${err.message}`, ephemeral: true });
        }
        return;
    }

    // 4. Submit do Modal de Registro
    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro') {
        const rawNome = interaction.fields.getTextInputValue('registro_nome');
        const rawId = interaction.fields.getTextInputValue('registro_id');
        const rawGrupoText = interaction.fields.getTextInputValue('registro_grupo');
        const rawContratante = interaction.fields.getTextInputValue('registro_contratante');
        
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
});

client.login(TOKEN);
