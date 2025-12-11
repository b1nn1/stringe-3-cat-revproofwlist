require("dotenv").config()
const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require("discord.js")

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

// ==== COMMAND DEFINITIONS ====
const commands = [

  // ==== SRV REVIEW / PROOF ====
  new SlashCommandBuilder()
    .setName("srv")
    .setDescription("Service commands")
    .addSubcommand(sub =>
      sub
        .setName("review")
        .setDescription("Post a service review")
        .addUserOption(o => o.setName("user").setDescription("Reviewer").setRequired(true))
        .addStringOption(o => o.setName("review").setDescription("Feedback").setRequired(true))
        .addIntegerOption(o => o.setName("count").setDescription("Current review number").setRequired(true))
        .addIntegerOption(o => o.setName("rating").setDescription("Rating /10").setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName("proof")
        .setDescription("Post service proof")
        .addUserOption(o => o.setName("user").setDescription("Customer").setRequired(true))
        .addIntegerOption(o => o.setName("rating").setDescription("Rating /10").setRequired(true))
        .addStringOption(o => o.setName("reviewlink").setDescription("Review message link").setRequired(true))
        .addStringOption(o => o.setName("plan").setDescription("Plan").setRequired(true))
        .addAttachmentOption(o => o.setName("image").setDescription("Image proof").setRequired(true))
    ),

  // ==== GFX REVIEW / PROOF ====
  new SlashCommandBuilder()
    .setName("gfx")
    .setDescription("Graphics commands")
    .addSubcommand(sub =>
      sub
        .setName("review")
        .setDescription("Post a gfx review")
        .addUserOption(o => o.setName("user").setDescription("Reviewer").setRequired(true))
        .addStringOption(o => o.setName("review").setDescription("Feedback").setRequired(true))
        .addIntegerOption(o => o.setName("count").setDescription("Current review number").setRequired(true))
        .addIntegerOption(o => o.setName("rating").setDescription("Rating /10").setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName("proof")
        .setDescription("Post gfx proof")
        .addUserOption(o => o.setName("user").setDescription("Customer").setRequired(true))
        .addIntegerOption(o => o.setName("rating").setDescription("Rating /10").setRequired(true))
        .addStringOption(o => o.setName("reviewlink").setDescription("Review message link").setRequired(true))
        .addStringOption(o => o.setName("plan").setDescription("Plan").setRequired(true))
        .addAttachmentOption(o => o.setName("image").setDescription("Image proof").setRequired(true))
    ),

  // ==== UPL REVIEW / PROOF ====
  new SlashCommandBuilder()
    .setName("upl")
    .setDescription("Upload commands")
    .addSubcommand(sub =>
      sub
        .setName("review")
        .setDescription("Post an upload review")
        .addUserOption(o => o.setName("user").setDescription("Reviewer").setRequired(true))
        .addStringOption(o => o.setName("review").setDescription("Feedback").setRequired(true))
        .addIntegerOption(o => o.setName("count").setDescription("Current review number").setRequired(true))
        .addIntegerOption(o => o.setName("rating").setDescription("Rating /10").setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName("proof")
        .setDescription("Post upload proof")
        .addUserOption(o => o.setName("user").setDescription("Customer").setRequired(true))
        .addIntegerOption(o => o.setName("rating").setDescription("Rating /10").setRequired(true))
        .addStringOption(o => o.setName("reviewlink").setDescription("Review message link").setRequired(true))
        .addStringOption(o => o.setName("plan").setDescription("Plan").setRequired(true))
        .addAttachmentOption(o => o.setName("image").setDescription("Image proof").setRequired(true))
        .addStringOption(o => o.setName("server").setDescription("Server where uploaded").setRequired(false))
    ),

  // ==== WAITLIST DROPDOWN ====
  new SlashCommandBuilder()
    .setName("waitlist")
    .setDescription("Post a waitlist status")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("plan").setDescription("Plan").setRequired(true))
]

// ==== REGISTER COMMANDS ====
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN)
;(async () => {
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
  console.log("✅ Commands registered")
})()

client.once("ready", () => console.log(`✅ Logged in as ${client.user.tag}`))

// ==== MAIN INTERACTION HANDLER ====
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isStringSelectMenu()) return

  // ==== WAITLIST STATUS MENU ====
  if (interaction.isStringSelectMenu() && interaction.customId === "wait_status") {
    const selected = interaction.values[0]
    const updatedContent = interaction.message.content.replace(/pending|waiting|processing/i, selected)
    const components = selected === "complete" ? [] : interaction.message.components
    return interaction.update({ content: updatedContent, components })
  }

  if (!interaction.isChatInputCommand()) return
  const cmd = interaction.commandName
  let sub;
  try { sub = interaction.options.getSubcommand() } catch { sub = null }

  let channel
  if (cmd === "srv") {
    if (sub === "review") channel = interaction.guild.channels.cache.get(process.env.SRV_REVIEW_CHANNEL_ID)
    if (sub === "proof") channel = interaction.guild.channels.cache.get(process.env.SRV_PROOF_CHANNEL_ID)
  }
  if (cmd === "gfx") {
    if (sub === "review") channel = interaction.guild.channels.cache.get(process.env.GFX_REVIEW_CHANNEL_ID)
    if (sub === "proof") channel = interaction.guild.channels.cache.get(process.env.GFX_PROOF_CHANNEL_ID)
  }
  if (cmd === "upl") {
    if (sub === "review") channel = interaction.guild.channels.cache.get(process.env.UPL_REVIEW_CHANNEL_ID)
    if (sub === "proof") channel = interaction.guild.channels.cache.get(process.env.UPL_PROOF_CHANNEL_ID)
  }
  if (cmd === "waitlist") channel = interaction.guild.channels.cache.get(process.env.WAITLIST_CHANNEL_ID)

  await interaction.deferReply({ ephemeral: true })

  // ==== REVIEW HANDLER ====
  if (sub === "review") {
    const user = interaction.options.getUser("user")
    const review = interaction.options.getString("review")
    const count = interaction.options.getInteger("count")
    const rating = interaction.options.getInteger("rating")
    const formattedCount = count.toString().padStart(2, "0")

    // Example review embeds
    await channel.send({
      embeds: [
        { color: 16777215, image: { url: "https://media.discordapp.net/attachments/1441578008627642459/1444817759824515333/Untitled161_20251130172943.PNG" } },
        { image: { url: "https://media.discordapp.net/attachments/1433887517119217805/1444807671017508964/jw6p20.WEBP" } }
      ],
      components: []
    })

    await channel.send({
      content: `_ _\n_ _　　　　˚ִִ　霧の 𓈒 𓈒　__　ᥒᥱ__ω　__r__ᥱviᥱω　<:b_orbs:1441630512786706525>　 ᚐׅ೨౿\n\n_ _`,
      embeds: [{
        description: `_ _\n_ _　　𓏼 　ִִ𓈒　　 ᥉ᥱᥒȶ　 **by**　 ${user}　 \n_ _ 　　 <:b_folder:1441630538145206445> 　 ⎯⎯໑　 ${formattedCount}　 rᥱ__vi__ᥱws　𓂃\n_ _ 　　𑁯ᖘ 　˚ ⑅ 　** r**ᥲȶiᥒg:　 ${rating}　*/*　**1O**`,
        color: 16777215,
        thumbnail: { url: "https://images-ext-1.discordapp.net/external/ooHHvidA7YqLWWBqvrJlI_qWXtZDzOyjQVqCKlIwYtA/https/cdn.discordapp.com/emojis/1441650117063999508.png?format=webp&quality=lossless&width=256&height=256" }
      }]
    })

    await channel.send({ content: "https://i.postimg.cc/05W3sY6Y/ezgif-com-gif-maker-89.gif" })
    await channel.send({ embeds: [{ description: review }], components: [] })
  }

  // ==== PROOF HANDLER ====
  if (sub === "proof") {
    const user = interaction.options.getUser("user")
    const rating = interaction.options.getInteger("rating")
    const reviewlink = interaction.options.getString("reviewlink")
    const plan = interaction.options.getString("plan")
    const image = interaction.options.getAttachment("image")
    const server = interaction.options.getString("server")

    // Base content text
    let contentText = `_ _\n_ _　　　 ᜴ ִ۫　 ${cmd === "upl" ? "uթlꪮᥲdᥱd" : "᥉ᥱrviᥴᥱ"}　 **f**ꪮr　 ${user}　<:a_bow:1441630568214429777>\n         　 ⎯⎯໑　** r**ᥲȶ__iᥒg__　 :　 ${rating}*/* **1O** 𓏼˚ִִ𓈒 \n-# ˙ <:b_orbs:1441630512786706525> [their review](${reviewlink}) **f**ꪮr ${plan}𓈒⠀ ❀\n\n_ _`

    await channel.send({ content: contentText, embeds: [{ image: { url: image.url } }],})

    // Send the image proof and optional buttons
    if (cmd === "srv" || cmd === "gfx") {
      await channel.send({
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(cmd === "srv" ? "p_242462375402278953" : "p_242470295078703106")
              .setLabel(" ࣪   𓈒　霧　ᥒf2u　+　ᥒꪮ　ᥴꪮթyiᥒg 　 𑁯ᖘ")
              .setStyle(ButtonStyle.Secondary)
              .setEmoji({ id: "1441630604109156395", name: "b_bubbles", animated: true })
          )
        ]
      })

      await channel.send({
        content: "_ _\n-# _ _　　　　　　　　⎯　ℛᥲyຣ　ᧉxᥲ𑜀pℓᧉs　　<:a_heart:1441630565236473900>\n\n_ _",
        embeds: [
          {
            image: {
              url: "https://media.discordapp.net/attachments/1398052561184882849/1444053912993923072/ezgif-com-gif-maker-89.gif"
            }
          }
        ]
      })
    }

    // UPL proof layout
    if (cmd === "upl") {
      await channel.send({
        content: `_ _\n-# _ _　　　　　　　　⎯　uթlꪮᥲdᥱd in [server](${server || "unknown"}) <:a_heart:1441630565236473900>\n\n_ _`
      })
    }
  }

  // ==== WAITLIST HANDLER ====
  if (cmd === "waitlist") {
    const user = interaction.options.getUser("user")
    const plan = interaction.options.getString("plan")

    // Static images
    await channel.send({
      embeds: [
        { image: { url: "https://media.discordapp.net/attachments/1433887517119217805/1444831996411908299/Untitled161_20251130182557.PNG?ex=69301e67&is=692ecce7&hm=1133ea3b641186c5abc0dd2b6b58b6895d587a7f32e64f7606e2069e8fdcbadf&format=webp&quality=lossless&width=1470&height=1474&" } },
      
      ]
    })

    await channel.send({
      content: "_ _\n_ _　　　__　⎯⎯__⎯ Ი ᰍ __ᥒᥱω__ ꪮrdᥱr 𓈒 𓏸 <:a_exc:1441630573595725958>\n\n_ _",
      embeds: []
    })

    await channel.send({
      embeds: [
        { image: { url: "https://media.discordapp.net/attachments/1433887517119217805/1442988502085013707/Untitled216_20251125145710.png?ex=69300104&is=692eaf84&hm=190094a935d4cb1022a580b61af05a25d7a98844bde8bbcc8c45320cdc81e314&format=webp&quality=lossless&width=794&height=42&" } }
      ]
    })

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("wait_status")
        .setPlaceholder("𓈒 𓈒　　𐔌ྀི　　᥉tᥲtu᥉　　　♡͝")
        .addOptions(
          { label: "⃟", value: "processing", description: "ㆍ թrꪮcꫀ᥉᥉iᥒg", emoji: { id: "1441630510567919727", name: "b_onigiri", animated: true } },
          { label: "⃟", value: "waiting", description: "ㆍ wᥲitiᥒg fꪮr rᥱviᥱw", emoji: { id: "1441630575831289927", name: "a_bunny" } },
          { label: "⃟", value: "complete", description: "ㆍ cꪮოթlꫀtꫀ", emoji: { id: "1441648950103773255", name: "000sang" } }
        )
    )

    await channel.send({
      content: ` _ _\n_ _ 　　　　　 ꒰ 　ᣟ霧˙　ꪮrdᥱrᥱd **b**y ${user} ೨౿\n　　　　　<:b_mochi:1441630508558717099> ˚ִִ𓈒 **b**ꪮughȶ ⎯ ${plan} ᐢ ⑅ ᐢ \n_ _ 　　　　　𓏵 ♪ ༷ pending 𝄞𓈒 <:a_bow:1441630568214429777>`,
      components: [row]
    })

    await channel.send({ content: "https://i.postimg.cc/05W3sY6Y/ezgif-com-gif-maker-89.gif" })
  }

  await interaction.editReply({ content: "✅ Posted!" })
})

client.login(process.env.TOKEN)
