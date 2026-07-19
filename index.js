/**
 * ============================================================================
 * BOT AUTOMÁTICO DE REGISTRO DISCORD — FIVEZ & LUMENFALL CITY
 * ============================================================================
 * Versão Segura com Sistema de Defesa Ativa e Proteção de Canais Privados
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

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

const CONFIG = {
    CANAL_REGISTRO_ID: "1515448138385592361",
    CANAL_LOGS_ID: "1515448473246498866",
    CANAL_ENTRADA_SAIDA_ID: "1524222632923496509",
    CARGO_MORADOR_ID: "1515125842328424640",
    CARGO_CHEFE_ID: "1515125820836941985", // "1515125820836941985" - Esse cargo Chefe Supremo pode fazer tudo!

    EMBED_COLOR: "#2ECC71",
    FOOTER: "FiveZ & Lumenfall • Sistema Automático",
    SPAM_COOLDOWN_MS: 30000,
    FORMATO_APELIDO: "{TAG} {NOME} | {ID}",
    PERMITIR_RECADASTRO: true,

    GRUPOS: [
        { name: "Amigos", roleId: "1515125842328424640", emoji: "🤝", tag: "|AMG|" },
        { name: "Família", roleId: "1515125828185493675", emoji: "❤️", tag: "|Souza|" },
        { name: "FiveZ Hunters", roleId: "1515125826780135485", emoji: "🎯", tag: "|Hunters|" },
        { name: "Lumenfall City", roleId: "1520163929106550794", emoji: "🏙️", tag: "|Lumen|" }
    ]
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.User]
});

// ============================================================================
// FUNÇÃO DE SEGURANÇA ATIVA: RESTRINGIR AUTOMATICAMENTE CARGOS COM ADMIN
// ============================================================================
async function autoRestringirCargosVulneraveis(guild) {
    try {
        console.log("🔒 Executando contenção ativa de segurança de canais...");
        const roles = await guild.roles.fetch();
        const logsCanal = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);

        // Permissões de moderação avançadas, mas sem o privilégio de burlar canais privados!
        const safePermissions = [
            PermissionsBitField.Flags.ViewAuditLog,
            PermissionsBitField.Flags.KickMembers,
            PermissionsBitField.Flags.BanMembers,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.MuteMembers,
            PermissionsBitField.Flags.DeafenMembers,
            PermissionsBitField.Flags.MoveMembers,
            PermissionsBitField.Flags.ManageNicknames,
            PermissionsBitField.Flags.ModerateMembers,
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.Speak
        ];

        for (const [id, role] of roles) {
            // Ignorar o cargo Chefe (1515125820836941985), o próprio bot e o @everyone
            if (role.id === CONFIG.CARGO_CHEFE_ID || role.managed || role.id === guild.members.me.roles.highest.id || role.id === guild.id) {
                continue;
            }

            if (role.permissions.has(PermissionsBitField.Flags.Administrator)) {
                console.log(`🚨 Restringindo cargo "${role.name}" (${role.id}) que estava com Administrador ativo...`);

                // Remove a permissão Administrador e ativa apenas as permissões de moderação seguras
                const currentPerms = role.permissions;
                const newPerms = currentPerms
                    .remove(PermissionsBitField.Flags.Administrator)
                    .add(safePermissions);

                await role.setPermissions(newPerms, "Segurança Ativa: Apenas o cargo Chefe pode ter a permissão de Administrador!");

                if (logsCanal && logsCanal.isTextBased()) {
                    const embedAlerta = new EmbedBuilder()
                        .setColor("#E74C3C")
                        .setTitle("🛡️ Defesa Ativa: Cargo com Administrador Restringido!")
                        .setDescription(`O bot detectou que o cargo **${role.name}** estava com a permissão global de **Administrador** ativa e o restringiu automaticamente para proteger a privacidade dos canais!`)
                        .addFields(
                            { name: "👤 Cargo Afetado", value: `${role} (\`${role.id}\`)`, inline: true },
                            { name: "🔒 Nova Configuração", value: "Permissão de **Administrador Desativada**.\nPermissões de **Moderação Segura Ativadas** (Banir, Expulsar, Gerenciar Mensagens, Mute, etc.).", inline: false },
                            { name: "💡 Por que isso foi feito?", value: "Cargos com permissão de Administrador ignoram bloqueios de canais e calls privados. Agora, o Discord respeitará corretamente os canais bloqueados por cargo!", inline: false }
                        )
                        .setTimestamp();

                    await logsCanal.send({ embeds: [embedAlerta] });
                }
            }
        }
    } catch (err) {
        console.error("Erro ao auto-restringir cargos:", err);
    }
}

// ============================================================================
// EVENTO: BOT ONLINE
// ============================================================================
client.once(Events.ClientReady, async () => {
    console.log("==================================================");
    console.log("✅ BOT ONLINE E CONECTADO: " + client.user.tag);
    console.log("==================================================");

    const guild = client.guilds.cache.first();
    if (guild) {
        // Corrige automaticamente qualquer cargo com Admin na inicialização!
        await autoRestringirCargosVulneraveis(guild);
    }
});

// ============================================================================
// EVENTO: MONITORAR EDIT DE CARGOS EM TEMPO REAL (Prevenir burla de Admin)
// ============================================================================
client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
    try {
        // Ignora o cargo Chefe, o bot em si, e cargos gerenciados automaticamente
        if (newRole.id === CONFIG.CARGO_CHEFE_ID || newRole.managed || newRole.id === newRole.guild.members.me.roles.highest.id) {
            return;
        }

        // Se alguém tentar ativar a permissão de Administrador nesse cargo
        const hadAdmin = oldRole.permissions.has(PermissionsBitField.Flags.Administrator);
        const hasAdmin = newRole.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!hadAdmin && hasAdmin) {
            console.log(`🚨 Tentativa de burlar segurança! Administrador ativado em "${newRole.name}". Corrigindo...`);
            await autoRestringirCargosVulneraveis(newRole.guild);
        }
    } catch (err) {
        console.error("Erro no evento GuildRoleUpdate:", err);
    }
});

client.login(TOKEN);
