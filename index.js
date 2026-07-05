const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  PermissionsBitField
} = require("discord.js");
const fs = require("fs");

// ===============================
// TOKEN
// ===============================
const TOKEN = process.env.TOKEN;

// ===============================
// CONFIGURAÇÃO
// ===============================
const CONFIG = {
  CANAL_PAINEL_ID: "1515448138385592361",
  CANAL_LOGS_ID: "1515125822795546715",
  CARGO_MORADOR_ID: "1515125842328424640",
  CARGO_PERMISSAO_ID: "1515125822795546715", // Cargo necessário para aprovar/recusar
  EMBED_COLOR: "#2ECC71",
  FOOTER: "FiveZ • Sistema Automático"
};

// ===============================
// GRUPOS DE REGISTRO
// ===============================
const GRUPOS = {
  "amigos": {
    nome: "Amigos",
    cargoId: "1515125842328424640",
    emoji: "👥",
    tag: "AMG"
  },
  "familia": {
    nome: "Família",
    cargoId: "1515125828185493675",
    emoji: "👨‍👩‍👧‍👦",
    tag: "Souza"
  },
  "fivez_hunters": {
    nome: "FiveZ Hunters",
    cargoId: "1515125826780135485",
    emoji: "🎯",
    tag: "Hunters"
  },
  "lumenfall_city": {
    nome: "Lumenfall City",
    cargoId: "1520163929106550794",
    emoji: "🏙️",
    tag: "Lumen"
  }
};

const PANEL_FILE = "./panel.json";
const PENDING_FILE = "./pending.json";
const cooldown = new Map();

// ===============================
// CLIENT
// ===============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  partials: [
    Partials.Channel,
    Partials.Message
  ]
});

// ===============================
// JSON - SALVAR/CARREGAR PAINEL
// ===============================
function salvarPainel(id) {
  fs.writeFileSync(
    PANEL_FILE,
    JSON.stringify({ messageId: id }, null, 4)
  );
}

function carregarPainel() {
  if (!fs.existsSync(PANEL_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(PANEL_FILE));
  } catch {
    return null;
  }
}

// ===============================
// JSON - REGISTROS PENDENTES
// ===============================
function carregarPendentes() {
  if (!fs.existsSync(PENDING_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(PENDING_FILE));
  } catch {
    return {};
  }
}

function salvarPendentes(data) {
  fs.writeFileSync(
    PENDING_FILE,
    JSON.stringify(data, null, 4)
  );
}

function adicionarPendente(userId, dados) {
  const pendentes = carregarPendentes();
  pendentes[userId] = {
    ...dados,
    timestamp: Date.now()
  };
  salvarPendentes(pendentes);
}

function obterPendente(userId) {
  const pendentes = carregarPendentes();
  return pendentes[userId] || null;
}

function removerPendente(userId) {
  const pendentes = carregarPendentes();
  delete pendentes[userId];
  salvarPendentes(pendentes);
}

// ===============================
// VALIDAÇÃO DE ESTRUTURA
// ===============================
async function validarEstrutura(guild) {
  const canalPainel = await guild.channels.fetch(CONFIG.CANAL_PAINEL_ID).catch(() => null);
  const canalLogs = await guild.channels.fetch(CONFIG.CANAL_LOGS_ID).catch(() => null);
  const cargoMorador = await guild.roles.fetch(CONFIG.CARGO_MORADOR_ID).catch(() => null);
  const cargoPermissao = await guild.roles.fetch(CONFIG.CARGO_PERMISSAO_ID).catch(() => null);

  if (!canalPainel) console.log("❌ Canal do Painel não encontrado.");
  if (!canalLogs) console.log("❌ Canal de Logs não encontrado.");
  if (!cargoMorador) console.log("❌ Cargo Morador não encontrado.");
  if (!cargoPermissao) console.log("❌ Cargo de Permissão não encontrado.");

  return {
    canalPainel,
    canalLogs,
    cargoMorador,
    cargoPermissao
  };
}

// ===============================
// CRIAR PAINEL DE REGISTRO
// ===============================
function criarPainel(guild) {
  const embed = new EmbedBuilder()
    .setColor(CONFIG.EMBED_COLOR)
    .setAuthor({
      name: guild.name,
      iconURL: guild.iconURL({ dynamic: true })
    })
    .setTitle("🏡 Sistema de Registro")
    .setDescription(`
Seja bem-vindo ao **${guild.name}**!

Para acessar todo o servidor, realize seu registro escolhendo seu grupo abaixo.

**Como funciona:**
1️⃣ Clique no botão "Realizar Registro"
2️⃣ Preencha seu Nome e ID do jogo
3️⃣ Escolha seu grupo no menu
4️⃣ Aguarde a aprovação da staff

Você receberá:
✅ Cargo Morador
✅ Cargo do seu grupo
🏷️ Apelido automático no servidor
🔓 Liberação dos canais
🎉 Acesso completo ao servidor
`)
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setFooter({ text: CONFIG.FOOTER })
    .setTimestamp();

  const botao = new ButtonBuilder()
    .setCustomId("registrar_entrada")
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
// ENVIAR / ATUALIZAR PAINEL
// ===============================
async function enviarPainel(guild, canal) {
  if (!canal) return;

  const painel = criarPainel(guild);
  const salvo = carregarPainel();

  if (salvo) {
    try {
      const mensagem = await canal.messages.fetch(salvo.messageId);
      await mensagem.edit(painel);
      console.log("✅ Painel atualizado com sucesso.");
      return;
    } catch {
      console.log("⚠️ Painel anterior não encontrado, criando novo...");
    }
  }

  const nova = await canal.send(painel);
  salvarPainel(nova.id);
  console.log("✅ Novo painel criado com sucesso.");
}

// ===============================
// CRIAR SOLICITAÇÃO DE REGISTRO
// ===============================
function criarSolicitacao(membro, grupoEscolhido, nomeJogador, idJogador) {
  const grupo = GRUPOS[grupoEscolhido];
  const nickname = `|${grupo.tag}| ${nomeJogador} | ${idJogador}`;

  const embed = new EmbedBuilder()
    .setColor("#FFA500")
    .setTitle("📋 Nova Solicitação de Registro")
    .setDescription("Uma nova solicitação de registro aguardando aprovação.")
    .addFields(
      {
        name: "👤 Usuário",
        value: `${membro.user.tag}`,
        inline: true
      },
      {
        name: "🆔 ID Discord",
        value: `${membro.id}`,
        inline: true
      },
      {
        name: "🎮 Nome do Jogador",
        value: `${nomeJogador}`,
        inline: true
      },
      {
        name: "🔢 ID do Jogador",
        value: `${idJogador}`,
        inline: true
      },
      {
        name: "🏷️ Grupo Escolhido",
        value: `${grupo.emoji} ${grupo.nome}`,
        inline: false
      },
      {
        name: "📛 Apelido que será definido",
        value: `\`${nickname}\``,
        inline: false
      },
      {
        name: "📅 Data da Solicitação",
        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: false
      }
    )
    .setThumbnail(membro.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: CONFIG.FOOTER })
    .setTimestamp();

  const botaoAprovar = new ButtonBuilder()
    .setCustomId(`aprovar_${membro.id}_${grupoEscolhido}`)
    .setEmoji("✅")
    .setLabel("Aprovar")
    .setStyle(ButtonStyle.Success);

  const botaoRecusar = new ButtonBuilder()
    .setCustomId(`recusar_${membro.id}_${grupoEscolhido}`)
    .setEmoji("❌")
    .setLabel("Recusar")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(botaoAprovar, botaoRecusar);

  return {
    content: `<@${membro.id}>`,
    embeds: [embed],
    components: [row]
  };
}

// ===============================
// GERAR APELIDO
// ===============================
function gerarNickname(tag, nome, idJogador) {
  const nick = `|${tag}| ${nome} | ${idJogador}`;
  // Discord limita nicknames a 32 caracteres
  if (nick.length > 32) {
    return nick.substring(0, 32);
  }
  return nick;
}

// ===============================
// READY EVENT
// ===============================
client.once(Events.ClientReady, async () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);

  const guild = client.guilds.cache.first();
  if (!guild) {
    return console.log("❌ Nenhum servidor encontrado.");
  }

  const estrutura = await validarEstrutura(guild);
  await enviarPainel(guild, estrutura.canalPainel);
});

// ===============================
// INTERAÇÃO - BOTÕES E MODAIS
// ===============================
client.on(Events.InteractionCreate, async (interaction) => {

  // ===============================
  // BOTÃO "REALIZAR REGISTRO" - ABRE MODAL
  // ===============================
  if (interaction.isButton() && interaction.customId === "registrar_entrada") {
    try {
      const guild = interaction.guild;
      if (!guild) return;

      // ===============================
      // COOLDOWN ANTI-SPAM (30 segundos)
      // ===============================
      if (cooldown.has(interaction.user.id)) {
        const tempoRestante = Math.ceil((cooldown.get(interaction.user.id) - Date.now()) / 1000);
        return interaction.reply({
          content: `⏳ Aguarde **${tempoRestante} segundos** antes de usar novamente.`,
          ephemeral: true
        });
      }

      cooldown.set(interaction.user.id, Date.now() + 30000);
      setTimeout(() => {
        cooldown.delete(interaction.user.id);
      }, 30000);

      // ===============================
      // VALIDAÇÃO
      // ===============================
      const estrutura = await validarEstrutura(guild);
      if (!estrutura.canalLogs || !estrutura.cargoMorador) {
        return interaction.reply({
          content: "❌ Sistema mal configurado (canais/cargos).",
          ephemeral: true
        });
      }

      const membro = await guild.members.fetch(interaction.user.id).catch(() => null);
      if (!membro) {
        return interaction.reply({
          content: "❌ Usuário não encontrado.",
          ephemeral: true
        });
      }

      // ===============================
      // VERIFICAR SE JÁ ESTÁ REGISTRADO
      // ===============================
      if (membro.roles.cache.has(CONFIG.CARGO_MORADOR_ID)) {
        return interaction.reply({
          content: "✅ Você já está registrado e possui acesso ao servidor!",
          ephemeral: true
        });
      }

      // ===============================
      // ABRIR MODAL PARA NOME E ID
      // ===============================
      const modal = new ModalBuilder()
        .setCustomId("modal_registro")
        .setTitle("📝 Formulário de Registro");

      const inputNome = new TextInputBuilder()
        .setCustomId("nome_jogador")
        .setLabel("Nome do Jogador")
        .setPlaceholder("Ex: João Silva")
        .setStyle(TextInputStyle.Short)
        .setMinLength(2)
        .setMaxLength(20)
        .setRequired(true);

      const inputId = new TextInputBuilder()
        .setCustomId("id_jogador")
        .setLabel("ID do Jogador")
        .setPlaceholder("Ex: 12345")
        .setStyle(TextInputStyle.Short)
        .setMinLength(1)
        .setMaxLength(15)
        .setRequired(true);

      const row1 = new ActionRowBuilder().addComponents(inputNome);
      const row2 = new ActionRowBuilder().addComponents(inputId);

      modal.addComponents(row1, row2);

      await interaction.showModal(modal);

    } catch (err) {
      console.error("Erro no botão de registro:", err);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({
          content: "❌ Ocorreu um erro ao processar sua solicitação.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }

  // ===============================
  // MODAL SUBMETIDO - MOSTRA SELECT MENU
  // ===============================
  if (interaction.isModalSubmit() && interaction.customId === "modal_registro") {
    try {
      const guild = interaction.guild;
      if (!guild) return;

      const nomeJogador = interaction.fields.getTextInputValue("nome_jogador").trim();
      const idJogador = interaction.fields.getTextInputValue("id_jogador").trim();

      // Validar campos
      if (!nomeJogador || nomeJogador.length < 2) {
        return interaction.reply({
          content: "❌ Nome inválido. Deve ter pelo menos 2 caracteres.",
          ephemeral: true
        });
      }

      if (!idJogador || idJogador.length < 1) {
        return interaction.reply({
          content: "❌ ID inválido.",
          ephemeral: true
        });
      }

      // Salvar dados temporariamente
      adicionarPendente(interaction.user.id, {
        nome: nomeJogador,
        idJogador: idJogador
      });

      // ===============================
      // CRIAR SELECT MENU DE GRUPOS
      // ===============================
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("selecionar_grupo")
        .setPlaceholder("Escolha seu grupo...")
        .addOptions(
          Object.entries(GRUPOS).map(([key, grupo]) => ({
            label: grupo.nome,
            value: key,
            emoji: grupo.emoji,
            description: `Registrar como ${grupo.nome}`
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.reply({
        content: `✅ Dados recebidos!\n\n**Nome:** ${nomeJogador}\n**ID:** ${idJogador}\n\n📋 **Agora selecione o grupo ao qual você deseja pertencer:**`,
        components: [row],
        ephemeral: true
      });

    } catch (err) {
      console.error("Erro no modal:", err);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({
          content: "❌ Ocorreu um erro ao processar seus dados.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }

  // ===============================
  // INTERAÇÃO - SELECT MENU DE GRUPOS
  // ===============================
  if (interaction.isStringSelectMenu() && interaction.customId === "selecionar_grupo") {
    try {
      const guild = interaction.guild;
      if (!guild) return;

      const grupoEscolhido = interaction.values[0];
      const grupo = GRUPOS[grupoEscolhido];

      if (!grupo) {
        return interaction.reply({
          content: "❌ Grupo inválido.",
          ephemeral: true
        });
      }

      // Buscar dados pendentes
      const pendente = obterPendente(interaction.user.id);
      if (!pendente) {
        return interaction.reply({
          content: "❌ Dados não encontrados. Por favor, inicie o registro novamente.",
          ephemeral: true
        });
      }

      const estrutura = await validarEstrutura(guild);
      if (!estrutura.canalLogs) {
        return interaction.reply({
          content: "❌ Sistema mal configurado.",
          ephemeral: true
        });
      }

      const membro = await guild.members.fetch(interaction.user.id).catch(() => null);
      if (!membro) {
        return interaction.reply({
          content: "❌ Usuário não encontrado.",
          ephemeral: true
        });
      }

      // ===============================
      // ENVIAR SOLICITAÇÃO NO CANAL DE LOGS
      // ===============================
      const solicitacao = criarSolicitacao(
        membro,
        grupoEscolhido,
        pendente.nome,
        pendente.idJogador
      );
      await estrutura.canalLogs.send(solicitacao);

      await interaction.update({
        content: `✅ Sua solicitação para o grupo **${grupo.nome}** foi enviada!\n\n**Nome:** ${pendente.nome}\n**ID:** ${pendente.idJogador}\n\nAguarde a aprovação da staff. Você receberá uma mensagem privada quando for aprovado.`,
        components: [],
        ephemeral: true
      });

      console.log(`
=================================
📋 NOVA SOLICITAÇÃO DE REGISTRO
👤 ${membro.user.tag}
🆔 ${membro.id}
🎮 Nome: ${pendente.nome}
🔢 ID Jogador: ${pendente.idJogador}
🏷️ Grupo: ${grupo.nome}
⏰ ${new Date().toLocaleString()}
=================================
      `);

    } catch (err) {
      console.error("Erro no select menu:", err);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({
          content: "❌ Ocorreu um erro ao processar sua escolha.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }

  // ===============================
  // INTERAÇÃO - BOTÕES APROVAR/RECUSAR
  // ===============================
  if (interaction.isButton() && (interaction.customId.startsWith("aprovar_") || interaction.customId.startsWith("recusar_"))) {
    try {
      const guild = interaction.guild;
      if (!guild) return;

      const [acao, userId, grupoEscolhido] = interaction.customId.split("_");
      const grupo = GRUPOS[grupoEscolhido];

      if (!grupo) {
        return interaction.reply({
          content: "❌ Grupo inválido.",
          ephemeral: true
        });
      }

      // ===============================
      // VERIFICAR PERMISSÃO
      // ===============================
      const membroStaff = await guild.members.fetch(interaction.user.id).catch(() => null);
      if (!membroStaff || !membroStaff.roles.cache.has(CONFIG.CARGO_PERMISSAO_ID)) {
        return interaction.reply({
          content: "❌ Você não possui permissão para aprovar registros.",
          ephemeral: true
        });
      }

      const membro = await guild.members.fetch(userId).catch(() => null);
      if (!membro) {
        return interaction.reply({
          content: "❌ Usuário não encontrado.",
          ephemeral: true
        });
      }

      // Buscar dados pendentes
      const pendente = obterPendente(userId);
      if (!pendente) {
        return interaction.reply({
          content: "❌ Dados do registro não encontrados.",
          ephemeral: true
        });
      }

      const estrutura = await validarEstrutura(guild);
      if (!estrutura.cargoMorador) {
        return interaction.reply({
          content: "❌ Sistema mal configurado.",
          ephemeral: true
        });
      }

      // ===============================
      // VERIFICAR HIERARQUIA DE CARGOS
      // ===============================
      const cargoMorador = estrutura.cargoMorador;
      const cargoGrupo = await guild.roles.fetch(grupo.cargoId).catch(() => null);

      if (!cargoGrupo) {
        return interaction.reply({
          content: "❌ Cargo do grupo não encontrado.",
          ephemeral: true
        });
      }

      if (cargoMorador.position >= guild.members.me.roles.highest.position) {
        return interaction.reply({
          content: "❌ Meu cargo está abaixo do cargo Morador.",
          ephemeral: true
        });
      }

      if (cargoGrupo.position >= guild.members.me.roles.highest.position) {
        return interaction.reply({
          content: `❌ Meu cargo está abaixo do cargo ${grupo.nome}.`,
          ephemeral: true
        });
      }

      // Verificar hierarquia para mudar nickname
      if (membro.roles.highest.position >= guild.members.me.roles.highest.position) {
        return interaction.reply({
          content: "❌ Meu cargo está abaixo do cargo mais alto do usuário.",
          ephemeral: true
        });
      }

      // ===============================
      // APROVAR REGISTRO
      // ===============================
      if (acao === "aprovar") {
        // Adicionar cargos
        await membro.roles.add([CONFIG.CARGO_MORADOR_ID, grupo.cargoId]);

        // Mudar nickname
        const novoNickname = gerarNickname(grupo.tag, pendente.nome, pendente.idJogador);
        try {
          await membro.setNickname(novoNickname);
        } catch (err) {
          console.error(`⚠️ Erro ao mudar nickname de ${membro.user.tag}:`, err);
        }

        // Editar mensagem original
        const embedAprovado = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("✅ Registro Aprovado")
          .setDescription(`
**Usuário:** ${membro.user.tag}
**ID Discord:** ${membro.id}
**Nome do Jogador:** ${pendente.nome}
**ID do Jogador:** ${pendente.idJogador}
**Grupo:** ${grupo.emoji} ${grupo.nome}
**Apelido Definido:** \`${novoNickname}\`
**Aprovado por:** ${interaction.user.tag}
**Data:** <t:${Math.floor(Date.now() / 1000)}:F>
`)
          .setThumbnail(membro.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: CONFIG.FOOTER })
          .setTimestamp();

        const botaoDesabilitado = new ButtonBuilder()
          .setCustomId("aprovado_disabled")
          .setEmoji("✅")
          .setLabel("Aprovado")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true);

        const rowDesabilitado = new ActionRowBuilder().addComponents(botaoDesabilitado);

        await interaction.update({
          content: `<@${userId}>`,
          embeds: [embedAprovado],
          components: [rowDesabilitado]
        });

        // Enviar DM ao usuário
        const dmEmbed = new EmbedBuilder()
          .setColor("#00FF00")
          .setTitle("🎉 Registro Aprovado!")
          .setDescription(`
Olá ${membro.user.username} 👋

Sua solicitação de registro foi **aprovada**!

**Grupo:** ${grupo.emoji} ${grupo.nome}
**Cargo Morador:** ✅ Adicionado
**Cargo do Grupo:** ✅ Adicionado
**Apelido:** \`${novoNickname}\`

Agora você já pode acessar todos os canais do servidor.
Seja bem-vindo(a)! 🏡
`)
          .setFooter({ text: CONFIG.FOOTER })
          .setTimestamp();

        await membro.send({ embeds: [dmEmbed] }).catch(() => {
          console.log(`⚠️ Não foi possível enviar DM para ${membro.user.tag}`);
        });

        // Remover dos pendentes
        removerPendente(userId);

        console.log(`
=================================
✅ REGISTRO APROVADO
👤 ${membro.user.tag}
🆔 ${membro.id}
🎮 Nome: ${pendente.nome}
🔢 ID: ${pendente.idJogador}
🏷️ Grupo: ${grupo.nome}
📛 Nickname: ${novoNickname}
👮 Aprovado por: ${interaction.user.tag}
⏰ ${new Date().toLocaleString()}
=================================
        `);

        await interaction.followUp({
          content: `✅ Registro de ${membro.user.tag} aprovado com sucesso!\nApelido definido: \`${novoNickname}\``,
          ephemeral: true
        });
      }

      // ===============================
      // RECUSAR REGISTRO
      // ===============================
      if (acao === "recusar") {
        // Editar mensagem original
        const embedRecusado = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("❌ Registro Recusado")
          .setDescription(`
**Usuário:** ${membro.user.tag}
**ID Discord:** ${membro.id}
**Nome do Jogador:** ${pendente.nome}
**ID do Jogador:** ${pendente.idJogador}
**Grupo:** ${grupo.emoji} ${grupo.nome}
**Recusado por:** ${interaction.user.tag}
**Data:** <t:${Math.floor(Date.now() / 1000)}:F>
`)
          .setThumbnail(membro.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: CONFIG.FOOTER })
          .setTimestamp();

        const botaoDesabilitado = new ButtonBuilder()
          .setCustomId("recusado_disabled")
          .setEmoji("❌")
          .setLabel("Recusado")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true);

        const rowDesabilitado = new ActionRowBuilder().addComponents(botaoDesabilitado);

        await interaction.update({
          content: `<@${userId}>`,
          embeds: [embedRecusado],
          components: [rowDesabilitado]
        });

        // Enviar DM ao usuário
        const dmEmbed = new EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("❌ Registro Recusado")
          .setDescription(`
Olá ${membro.user.username} 👋

Infelizmente sua solicitação de registro foi **recusada**.

**Grupo:** ${grupo.emoji} ${grupo.nome}
**Nome:** ${pendente.nome}
**ID:** ${pendente.idJogador}

Se você acredita que houve um erro, entre em contato com a staff do servidor.
`)
          .setFooter({ text: CONFIG.FOOTER })
          .setTimestamp();

        await membro.send({ embeds: [dmEmbed] }).catch(() => {
          console.log(`⚠️ Não foi possível enviar DM para ${membro.user.tag}`);
        });

        // Remover dos pendentes
        removerPendente(userId);

        console.log(`
=================================
❌ REGISTRO RECUSADO
👤 ${membro.user.tag}
🆔 ${membro.id}
🎮 Nome: ${pendente.nome}
🔢 ID: ${pendente.idJogador}
🏷️ Grupo: ${grupo.nome}
👮 Recusado por: ${interaction.user.tag}
⏰ ${new Date().toLocaleString()}
=================================
        `);

        await interaction.followUp({
          content: `❌ Registro de ${membro.user.tag} recusado.`,
          ephemeral: true
        });
      }

    } catch (err) {
      console.error("Erro ao aprovar/recusar registro:", err);
      if (!interaction.replied && !interaction.deferred) {
        interaction.reply({
          content: "❌ Ocorreu um erro ao processar a solicitação.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
});

// ===============================
// ERROS GLOBAIS (SEGURANÇA)
// ===============================
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("⚠️ Uncaught Exception:", err);
});

// ===============================
// LOGIN
// ===============================
client.login(TOKEN);

// ===============================
// FIM DO BOT
// ===============================
