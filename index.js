require("dotenv").config()
const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionFlagsBits
} = require("discord.js")

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ] 
})

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

  // ==== WAITLIST ====
  new SlashCommandBuilder()
    .setName("waitlist")
    .setDescription("Post a waitlist status")
    .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
    .addStringOption(o => o.setName("plan").setDescription("Plan").setRequired(true)),

  // ==== TICKET SETUP ====
  new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription("Post ticket selection menu")
]

// ==== REGISTER COMMANDS ====
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN)
;(async () => {
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })
  console.log("✅ Commands registered")
})()

// Set bot status when ready
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`)

  // Set status
  client.user.setPresence({
    activities: [{
      name: "a biohzrd bot",
      type: 0 // PLAYING
    }],
    status: "dnd" // online, idle, dnd, invisible
  })
})

// ==== HELPER: Send Components V2 Message ====
async function sendV2Message(channelId, payload) {
  return await rest.post(Routes.channelMessages(channelId), { body: payload })
}

// ==== STORAGE FOR TICKET DATA ====
const ticketData = new Map() // Store modal data temporarily

// ==== MAIN INTERACTION HANDLER ====
client.on("interactionCreate", async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction)
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction)
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction)
    } else if (interaction.isButton()) {
      await handleButton(interaction)
    }
  } catch (error) {
    console.error("Error handling interaction:", error)
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ An error occurred!", ephemeral: true }).catch(() => {})
    } else if (interaction.deferred) {
      await interaction.editReply({ content: "❌ An error occurred!" }).catch(() => {})
    }
  }
})

// ==== COMMAND HANDLER ====
async function handleCommand(interaction) {
  const cmd = interaction.commandName
  let sub
  try { sub = interaction.options.getSubcommand() } catch { sub = null }

  // ==== TICKET SETUP HANDLER ====
  if (cmd === "ticket-setup") {
    // Check if user has admin role
    if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "❌ You don't have permission to use this command!", ephemeral: true })
    }
    await interaction.deferReply({ ephemeral: true })

    const channelToPost = interaction.channel

    // Spacer message
    await channelToPost.send({ content: "_ _\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n_ _" })

    // Header image
    await sendV2Message(channelToPost.id, {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 12,
              items: [{ media: { url: "https://media.discordapp.net/attachments/1442939881356656780/1451314262826811463/Untitled186_20251218154412.PNG?ex=6945b93c&is=694467bc&hm=6feaf09f904047eed50d85996fbd858cf94294dc1dbfd8f1510b8671d2b1a205&=&format=webp&quality=lossless&width=1470&height=1474" } }]
            },
            { type: 14 },
            {
              type: 1,
              components: [
                { style: 2, type: 2, emoji: { id: "1450607652458467338", name: "a4_cardigan" }, custom_id: "ticket_btn_1" },
                { style: 2, type: 2, emoji: { id: "1441650111217274921", name: "0z" }, custom_id: "ticket_btn_2" },
                { style: 2, type: 2, emoji: { id: "1450607631449198592", name: "c_flower", animated: true }, custom_id: "ticket_btn_3" },
                { style: 2, type: 2, emoji: { id: "1441650100400033833", name: "0z" }, custom_id: "ticket_btn_4" },
                { style: 2, type: 2, emoji: { id: "1448751265633931274", name: "000bowz" }, custom_id: "ticket_btn_5" }
              ]
            }
          ]
        }
      ]
    })

    // Support info
    await sendV2Message(channelToPost.id, {
      flags: 32768,
      components: [
        {
          type: 12,
          items: [{ media: { url: "https://media.discordapp.net/attachments/1441600886068613161/1450860325774688287/Untitled216_20251125145710.png?ex=694563f9&is=69441279&hm=2cb1fa07ad8975c85fe8228ba843417d87308fca7a102735fad6e7ff51d45b81&=&format=webp&quality=lossless&width=794&height=42" } }]
        },
        {
          type: 9,
          components: [{
            type: 10,
            content: "_ _\n _ _ 　 　 　　⎯⎯⎯⎯໑ᣟ݂ᚐ　<a:002_clover:1450606715731968161>♡︎ ྀི༷　__ຣupp__ꪮrt𓈒. 𓏽ཾ 　✿ᩧ             ༷\n _ _ 　　<a:i_wing:1450606714012307596> 𓏵ᣟ݂ ̥՞　𓈒　**use**　 ۫ɕmmᥒ　 ۫ ִ⑅ sꫀ͟nse　𓈒.  Ი ᰍ ྀི༷  \n-#  _ _ 　 　　 　　 𓐇 ྀི ݂۫  그는 정말 잘생겼어요　𓈒. fꪮlloω　[__tos__](https://discord.com/channels/1441570514752508056/1441599753937879191)  ᣟ݂♪ ͜　<a:y_03:1450607636801257493>𓈈𓈒.　_ _"
          }],
          accessory: {
            type: 11,
            media: { url: "https://media.discordapp.net/attachments/1441600886068613161/1451317986660192307/Untitled176_20251218155916.PNG?ex=6945bcb4&is=69446b34&hm=67fd0547335766e80037f163eafd5bce1486258f6560d570f93c62070aa8a7b1&=&format=webp&quality=lossless&width=2108&height=2108" }
          }
        }
      ]
    })

    // Select menu
    await sendV2Message(channelToPost.id, {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: 16777215,
          components: [
            {
              type: 12,
              items: [{ media: { url: "https://media.discordapp.net/attachments/1441600012894212127/1444354909855289404/stars_in_embed_whitecolor_1764079802351.gif?ex=69457455&is=694422d5&hm=1a26fd928d88efedf8a50d5d55cf9939badb9f3c494e21157ddc03f966b19e34&=&width=794&height=42" } }]
            }
          ]
        },
        { type: 14 },
        {
          type: 12,
          items: [{ media: { url: "https://media.discordapp.net/attachments/1398055003117064214/1447585977433591919/Untitled228_20251208084944.png?ex=694557ff&is=6944067f&hm=b6b686d6e2ba073676a8614b03c976b694b4d5c10a825743facfeac2275c10cd&=&format=webp&quality=lossless&width=518&height=50" } }]
        },
        {
          type: 10,
          content: "> -# _ _ 　  𓏸  ྀི༷　<a:002_bus:1450606718081044622>　　⎯__⎯⎯ 　__　 ᣟ݂ 　 𓈒ׄ  𑅛 **h**ᥲ͟ve 　𓈒ֺּׅ𓏽ཾ [թᥲ͟ymntຣ ](https://discord.com/channels/1441570514752508056/1441600012894212127)　 rꫀ͟ady　   ۫ ִ⑅  𓈒"
        },
        {
          type: 1,
          components: [{
            type: 3,
            options: [
              { label: "⃟", value: "gfx", description: "　 ⎯⎯໑　purchase　gfx" },
              { label: "⃟", value: "deco", description: "　♡︎ ྀི༷　purchase　server　deco", emoji: { id: "1450606701437784084", name: "d_sandals" } },
              { label: "⃟", value: "upload", description: "　 ⎯⎯໑　hire　me　4　uploads" },
              { label: "⃟", value: "other", description: "　♡︎ ྀི༷　other　reasons　or　prtnr", emoji: { id: "1450560996484841574", name: "emoji_30" } }
            ],
            placeholder: "ᣟ ✿ᩧ  　 ˳   𓈈𓈒.　𓏸     ♬͟  𓈒　 ⁠݂𓈒추락하는 양⁺　 𓏵ᣟ݂　🍦",
            custom_id: "ticket_select"
          }]
        }
      ]
    })

    await interaction.editReply({ content: "✅ Ticket system posted!" })
    return
  }

  // For review/proof/waitlist commands, defer reply
  await interaction.deferReply({ ephemeral: true })

  let channelId
  if (cmd === "srv") {
    if (sub === "review") channelId = process.env.SRV_REVIEW_CHANNEL_ID
    if (sub === "proof") channelId = process.env.SRV_PROOF_CHANNEL_ID
  }
  if (cmd === "gfx") {
    if (sub === "review") channelId = process.env.GFX_REVIEW_CHANNEL_ID
    if (sub === "proof") channelId = process.env.GFX_PROOF_CHANNEL_ID
  }
  if (cmd === "upl") {
    if (sub === "review") channelId = process.env.UPL_REVIEW_CHANNEL_ID
    if (sub === "proof") channelId = process.env.UPL_PROOF_CHANNEL_ID
  }
  if (cmd === "waitlist") channelId = process.env.WAITLIST_CHANNEL_ID

  // ==== REVIEW HANDLER ====
  if (sub === "review") {
    const user = interaction.options.getUser("user")
    const review = interaction.options.getString("review")
    const count = interaction.options.getInteger("count")
    const rating = interaction.options.getInteger("rating")
    const formattedCount = count.toString().padStart(2, "0")

    // Message 1: Header images
    await sendV2Message(channelId, {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 12,
              items: [{ media: { url: "https://media.discordapp.net/attachments/1398050347146285167/1450964910409515050/Untitled186_20251217163615.PNG?ex=694473e0&is=69432260&hm=ce2a845d2c7e84a7114fc8d8b88a9f2337ef7b9aaedbdadc1d53bafb35411bef&=&format=webp&quality=lossless&width=1470&height=1474" } }]
            },
            { type: 14 },
            {
              type: 1,
              components: [{
                type: 3,
                options: [{ label: "high", value: "q5XNeoiX8g" }],
                placeholder: "𓈒　🍯　   ྀི༷　𓈒.   어떻게 나에게 이럴 수가 있어? 𓈒　𓈒.  𓐇۪ ᣟ݂",
                disabled: true,
                custom_id: "p_248557581096718344"
              }]
            }
          ]
        },
        {
          type: 12,
          items: [{ media: { url: "https://media.discordapp.net/attachments/1441600886068613161/1450860325774688287/Untitled216_20251125145710.png?ex=69441279&is=6942c0f9&hm=784cfbe39f76f6eee131471b81a98375c88da107c5777652193b9d95ac731972&=&format=webp&quality=lossless&width=794&height=42" } }]
        }
      ]
    })

    // Message 2: New review text with thumbnail
    await sendV2Message(channelId, {
      flags: 32768,
      components: [{
        type: 9,
        components: [{
          type: 10,
          content: "-# _ _ \n\n-# _ _   　　　 ᣟ ⠀✿ᩧ ⎯__⎯⎯ 　__ 　 ♬͟  𓈒 𓏸  ᣟ݂ 眠そうな目 強͟が͟る͟癖͟ ᩧ\n_ _ 　   　𓈒ֺּׅ𓏽ཾ　𓈈𓈒.　 ˳ 𓏵   𓈒ׄ    <a:002_clover:1450606715731968161>　ᥒꫀ͟ω 　𓐇 ྀི[rꫀviᥱω](https://discord.com/channels/1441570514752508056/1441599685516197959)　 ˳ 愛♡ᣟ݂　 \n-# _ _   　　　　𓈒ׄ  𑅛⎯⎯⎯⎯⎯⎯⎯　  ᜴ׁ༷  𓈒݂　ℛ͟ᥲ͟ y'ຣ ᣟ݂ᚐ　shꪮթ 　𓈒 ꒱꒱݂"
        }],
        accessory: {
          type: 11,
          media: { url: "https://cdn.discordapp.com/attachments/1398050347146285167/1450965537168560190/Untitled176_20251217163843.PNG?ex=69447475&is=694322f5&hm=9b8da5fa965ade7ad29c09229e3ccffe9becc8219b6ff932b9f7fbb5d5765c29" }
        }
      }]
    })

    // Message 3: Review info
    await sendV2Message(channelId, {
      flags: 32768,
      components: [{
        type: 17,
        accent_color: 16317942,
        components: [
          {
            type: 9,
            components: [{
              type: 10,
              content: `_ _\n-# _ _　　　　 　𓈒.𓎢𓎟𓎡𓈒　 𝒮ꫀ͟nt　**by** __𓐇۪ __ᣟ݂ᚐ　 ${user}\n-# _ _ 　　　　　<a:y_03:1450607636801257493>　 𓈒ׄ  　__${formattedCount}__　**r**ꫀviꫀws　借る 𓈒 ᣟ݂ 　　　　　_ _\n-# _ _ 　　　　　𓈒.  Ი ᰍ　  ྀི༷𓈒.　 𓏻𓈒rᥲting⑅ 　${rating}　/　 **1O**　_ _`
            }],
            accessory: {
              style: 2,
              type: 2,
              emoji: { id: "1450607652458467338", name: "a4_cardigan" },
              custom_id: "p_248623107558871333"
            }
          },
          { type: 14 },
          {
            type: 12,
            items: [{ media: { url: "https://media.discordapp.net/attachments/1441578008627642459/1449026181402726440/Untitled234_20251208222924.png?ex=6944a68b&is=6943550b&hm=e5990536e3e40674e39be8fcbe92de99447047500f66cbacd0a75e708acc3896&=&format=webp&quality=lossless&width=794&height=42" } }]
          }
        ]
      }]
    })

    // Message 4: GIF separator
    await sendV2Message(channelId, {
      flags: 32768,
      components: [
        {
          type: 12,
          items: [{ media: { url: "https://media.discordapp.net/attachments/1441600012894212127/1444354909855289404/stars_in_embed_whitecolor_1764079802351.gif?ex=694422d5&is=6942d155&hm=5ef1bd00963db097dd7ca599d660115553763d305aabd7e042cd7770c0f5161b&=&width=794&height=42" } }]
        },
        {
          type: 17,
          components: [{ type: 10, content: review }]
        }
      ]
    })
  }

  // ==== PROOF HANDLER ====
  if (sub === "proof") {
    const user = interaction.options.getUser("user")
    const rating = interaction.options.getInteger("rating")
    const reviewlink = interaction.options.getString("reviewlink")
    const plan = interaction.options.getString("plan")
    const image = interaction.options.getAttachment("image")
    const server = interaction.options.getString("server")

    if (cmd === "upl") {
      console.log("=== DEBUG START ===")
      console.log("cmd value:", cmd)
      console.log("server value:", server)
      console.log("server type:", typeof server)
      console.log("server truthy?:", !!server)
      // Upload proof
      await sendV2Message(channelId, {
        flags: 32768,
        components: [
          {
            type: 17,
            components: [
              {
                type: 12,
                items: [{ media: { url: image.url } }]
              },
              { type: 14 },
              {
                type: 1,
                components: [{
                  type: 3,
                  options: [{ label: "for decor only", value: "fbIvEO6pYc" }],
                  placeholder: "𓈒͝𓏵   ᣟ݂ ๑﹒ .  ྀི  ᥒᥱω𓐇۪𓐇 　𓈒ֺּׅᧉxᥲ𑜀plᧉ　 ᚐׅ✿ᩧ　🍦　 ݁  𓈒 ",
                  disabled: true,
                  custom_id: "p_246429647619756049"
                }]
              }
            ]
          },
          {
            type: 12,
            items: [{ media: { url: "https://media.discordapp.net/attachments/1441600886068613161/1450860325774688287/Untitled216_20251125145710.png?ex=69441279&is=6942c0f9&hm=784cfbe39f76f6eee131471b81a98375c88da107c5777652193b9d95ac731972&=&format=webp&quality=lossless&width=794&height=42" } }]
          }
        ]
      })

      await sendV2Message(channelId, {
        flags: 32768,
        components: [
          {
            type: 9,
            components: [{
              type: 10,
              content: `_ _\n-# _ _　　　　 　. 𓈒ֺּׅ𓏽ཾ  　 ꒰ ᩧ 　𓈈𓈒.　[𝒰ploᥲdꫀ͟d](https://discord.com/channels/1441570514752508056/1442937590075363479)　fꪮr 　${user}　ᣟ݂ 𓏵  <a:c_flower:1450607631449198592>\n-# _ _ 　　　　⎯__⎯⎯ 　__　‌‌‌݂۫ **r♡͝tiᥒg̲　recꫀ͟ived** 　__:__ 　${rating} 　*/*　**1O**　　   𓈒\n-# _ _ 　　　　　<a:5_green:1450607639401730059>　 𓈒ׄ  𑅛　[thꫀir rꫀviꫀw](${reviewlink}) 　__ᣟ݂ for__ 　${plan} 　[⠀](${server} )     ♬͟  𓈒 𓏸  ྀི༷　𓈒. _ _`
            }],
            accessory: {
              type: 11,
              media: { url: "https://cdn.discordapp.com/attachments/1441600886068613161/1451034639270543441/Untitled176_20251217211323.PNG?ex=6944b4d0&is=69436350&hm=d38a5debe43e3e301324505b378289daf43402730ab5aab1d84aa550d96c164f" }
            }
          },
          {
            type: 1,
            components: [{
              style: 2,
              type: 2,
              label: "𓈒ֺּׅ𓏽ཾ 　 ˳ 나는 당신을 사랑했어요   ˳  ༷   ׁ　",
              emoji: { id: "1450606711609102346", name: "i_angel", animated: true },
              custom_id: "p_248627772962902095"
            }]
          },
          {
            type: 12,
            items: [{ media: { url: "https://media.discordapp.net/attachments/1441600012894212127/1444354909855289404/stars_in_embed_whitecolor_1764079802351.gif?ex=694422d5&is=6942d155&hm=5ef1bd00963db097dd7ca599d660115553763d305aabd7e042cd7770c0f5161b&=&width=794&height=42" } }]
          }
        ]
      })

      await sendV2Message(channelId, {
        flags: 32768,
        components: [{
          type: 17,
          components: [{
            type: 10,
            content: `⎯⎯⎯⎯✿ᩧ　ᣟ݂ dᥒs 　ꪮr 　ɕopy 　ოy 　__drᥲ͟wn__  　uթldຣ.  ྀི 𓈒݂　꒱꒱݂.`
          }],
          accent_color: 16777215
        }]
      })
      console.log("About to check server condition")
      // Server link message
      if (server) {
        console.log("SERVER CONDITION PASSED - SENDING MESSAGE")
        await rest.post(Routes.channelMessages(channelId), {
          body: {
            content: `[⠀](${server})`
          }
        })
      }
      console.log("Server message sent successfully")
    } else {
      console.log("SERVER CONDITION FAILED - server is:", server)
      console.log("=== DEBUG END ===")
      // Service/GFX proof
      await sendV2Message(channelId, {
        flags: 32768,
        components: [
          {
            type: 17,
            components: [
              {
                type: 12,
                items: [{ media: { url: image.url } }]
              },
              { type: 14 },
              {
                type: 1,
                components: [{
                  type: 3,
                  options: [{ label: "deco only", value: "u8RIJvOpeb" }],
                  placeholder: "𓈒͝𓏵   ᣟ݂ ๑﹒ .  ྀི  ᥒᥱω𓐇۪𓐇 　𓈒ֺּׅᧉxᥲ𑜀plᧉ　 ᚐׅ✿ᩧ　🌾　 ݁  𓈒 ",
                  disabled: true,
                  custom_id: "p_248642671785021511"
                }]
              }
            ]
          },
          {
            type: 12,
            items: [{ media: { url: "https://media.discordapp.net/attachments/1441600886068613161/1450860325774688287/Untitled216_20251125145710.png?ex=69441279&is=6942c0f9&hm=784cfbe39f76f6eee131471b81a98375c88da107c5777652193b9d95ac731972&=&format=webp&quality=lossless&width=794&height=42" } }]
          }
        ]
      })

      await sendV2Message(channelId, {
        flags: 32768,
        components: [
          {
            type: 9,
            components: [{
              type: 10,
              content: `_ _\n-# _ _　　　　 　. 𓈒ֺּׅ𓏽ཾ  　 ꒰ ᩧ 　𓈈𓈒.　[.𝒮ꫀ͟r͟v͟iɕꫀ](https://discord.com/channels/1441570514752508056/1441599685516197959)　fꪮr 　${user}　ᣟ݂ 𓏵  <:d_clovermsg:1426976812117786726>\n-# _ _ 　　　　⎯__⎯⎯ 　__　‌‌‌݂۫ **r♡͝tiᥒg̲　recꫀ͟ived** 　__:__ 　${rating} 　*/*　**1O**　　   𓈒\n-# _ _ 　　　　　<a:c_star:1450607626240131112>　 𓈒ׄ  𑅛　[thꫀir rꫀviꫀw](${reviewlink}) 　__ᣟ݂ for__ 　${plan} 　     ♬͟  𓈒 𓏸  ྀི༷　𓈒. _ _`
            }],
            accessory: {
              type: 11,
              media: { url: "https://media.discordapp.net/attachments/1441600780116299907/1451047357650305227/Untitled176_20251217220351.PNG?ex=6944c0a9&is=69436f29&hm=6038b562bd21ad8addd7e07f9018e0c05dacbaa97581a9af35617331d3a0c0e0&=&format=webp&quality=lossless&width=2316&height=2316" }
            }
          },
          {
            type: 1,
            components: [{
              style: 2,
              type: 2,
              label: "𓈒ֺּׅ𓏽ཾ 　 ˳ 하지만 효과가 없었어요   ˳  ༷   ׁ　",
              emoji: { id: "1441630586111262746", name: "a_bandge", animated: true },
              custom_id: "p_248643520393384009"
            }]
          },
          {
            type: 12,
            items: [{ media: { url: "https://media.discordapp.net/attachments/1441600012894212127/1444354909855289404/stars_in_embed_whitecolor_1764079802351.gif?ex=694422d5&is=6942d155&hm=5ef1bd00963db097dd7ca599d660115553763d305aabd7e042cd7770c0f5161b&=&width=794&height=42" } }]
          }
        ]
      })

      await sendV2Message(channelId, {
        flags: 32768,
        components: [{
          type: 17,
          components: [{ type: 10, content: cmd === "upl" ? "⎯⎯⎯⎯✿ᩧ　ᣟ݂ dᥒs 　ꪮr 　ɕopy 　ოy 　__drᥲ͟wn__  　uթldຣ.  ྀི 𓈒݂　꒱꒱݂." : "⎯⎯⎯⎯✿ᩧ　ᣟ݂ dᥒs 　ꪮr 　ɕopy 　ოy　wꪮr͟k.  ྀི 𓈒݂　꒱꒱݂.　　　　ᣟ݂" }],
          accent_color: 16777215
        }]
      })
    }
  }

  // ==== TICKET SETUP HANDLER (already handled at start) ====
  if (cmd === "waitlist") {
    const user = interaction.options.getUser("user")
    const plan = interaction.options.getString("plan")

    // Message 1: Header images
    await sendV2Message(channelId, {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 12,
              items: [{ media: { url: "https://media.discordapp.net/attachments/1441600780116299907/1451058250702258246/Untitled186_20251217224700.PNG?ex=6944cace&is=6943794e&hm=4aa42244d093247cf0bc1049efc0977b7ed350f44d04ff38f1394c8e6b0b2337&=&format=webp&quality=lossless&width=1470&height=1474" } }]
            },
            { type: 14 },
            {
              type: 1,
              components: [{
                type: 3,
                options: [{ label: "deco only", value: "oiVFtLCScJ" }],
                placeholder: "𓈒　🧇　   ྀི༷　𓈒.   절대 나를 떠나지 마세요 𓈒　𓈒.  𓐇۪ ᣟ݂",
                disabled: true,
                custom_id: "p_248648402861035522"
              }]
            }
          ]
        },
        {
          type: 12,
          items: [{ media: { url: "https://media.discordapp.net/attachments/1441600886068613161/1450860325774688287/Untitled216_20251125145710.png?ex=6944bb39&is=694369b9&hm=b86b38c958005ba6b705caa57009dcc179f8bf900d76b079d3674062adf20348&=&format=webp&quality=lossless&width=794&height=42" } }]
        }
      ]
    })

    // Message 2: Order info with thumbnail
    await sendV2Message(channelId, {
      flags: 32768,
      components: [{
        type: 9,
        components: [        {
          type: 10,
          content: `-# _ _\n-# _ _ 　　　　  𓏸  ྀི༷　추락하는 양  <:c_lemoncake:1450607623723417620>　 ᜴ׁ༷  𓈒݂　ℛ͟ᥲ͟ y'ຣ ᣟ݂ᚐ　shꪮթ　 𓈒　𓈒　𓈒\n _ _ 　　   ۫ ִ⑅ 　⎯⎯⎯⎯໑　𓐇۪ ᣟ݂ᥒꫀ͟ω 　[ꪮrdꫀ͟r](https://discord.com/channels/1441570514752508056/1441602188093821039)  　𓈒ֺּׅ𓏽ཾ 　𓈒\n-# _ _  　　　 𓈒ׄ  𑅛　  𓈈𓈒.　♬͟ ᩧ** ordered ྀི༷ 　by‌‌‌݂۫  **　${user} 　 <a:002_bus:1450606718081044622>𓈒　 𓏸   𓏵ᣟ݂`
        }],
        accessory: {
          type: 11,
          media: { url: "https://media.discordapp.net/attachments/1441600780116299907/1451058568395489311/Untitled176_20251217224821.PNG?ex=6944cb1a&is=6943799a&hm=432e0ee7c796e905ca369d6ba743270ed468e0f3aa58c22385b31114258d5ced&=&format=webp&quality=lossless&width=2316&height=2316" }
        }
      }]
    })

    // Message 3: Plan info with status dropdown
    await sendV2Message(channelId, {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: `\n-# _ _ 　     　  𓈒.  Ი ᰍ𓏽ཾ 　꒰꒰𓈒　 __**bꪮught**__ 　${plan}　 ˳♡͝   ׁ　 \n-# _ _ 　   　<a:teasie:1450607647182164211> 𓈒　 ✿ᩧ𓈒ֺּׅ　𓈒.     noted 　𓈒. 교묘한 취급 　𓈒 𓏸   ♬͟  𓈒　　　　　　　　　_ _`
            },
            { type: 14 },
            {
              type: 12,
              items: [{ media: { url: "https://media.discordapp.net/attachments/1398055003117064214/1447585977433591919/Untitled228_20251208084944.png?ex=6944067f&is=6942b4ff&hm=cb2e9236db2c5492402bfa9a5beae322dda31004645d72b9bfc574d7e405f983&=&format=webp&quality=lossless&width=518&height=50" } }]
            }
          ],
          accent_color: 16777215
        }
      ]
    })

    // Message 4: Buttons
    await sendV2Message(channelId, {
      flags: 32768,
      components: [
        {
          type: 12,
          items: [{ media: { url: "https://media.discordapp.net/attachments/1441600012894212127/1444354909855289404/stars_in_embed_whitecolor_1764079802351.gif?ex=694422d5&is=6942d155&hm=5ef1bd00963db097dd7ca599d660115553763d305aabd7e042cd7770c0f5161b&=&width=794&height=42" } }]
        },
        {
          type: 1,
          components: [
            {
              style: 2,
              type: 2,
              label: "♪ 𓈒 𓐇 ྀིprocꫀ͟ssing𓈒 ꒱݂۫",
              emoji: { id: "1450606701437784084", name: "d_sandals" },
              custom_id: "waitlist_processing"
            },
            {
              style: 2,
              type: 2,
              label: "♡︎ ྀི༷　𓈒.   ω4r  ",
              emoji: { id: "1450607631449198592", name: "c_flower", animated: true },
              custom_id: "waitlist_w4r"
            },
            {
              style: 2,
              type: 2,
              label: "𓈈𓈒.　𓐇۪ dꪮnꫀ͟",
              emoji: { id: "1450606714012307596", name: "i_wing", animated: true },
              custom_id: "waitlist_done"
            }
          ]
        }
      ]
    })
  }

  // ==== TICKET SETUP HANDLER ====
  if (cmd === "ticket-setup") {
    await interaction.deferReply({ ephemeral: true })

    const channelToPost = interaction.channel

    // Spacer message
    await channelToPost.send({ content: "_ _\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n_ _" })

    // Header image
    await sendV2Message(channelToPost.id, {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 12,
              items: [{ media: { url: "https://media.discordapp.net/attachments/1442939881356656780/1451314262826811463/Untitled186_20251218154412.PNG?ex=6945b93c&is=694467bc&hm=6feaf09f904047eed50d85996fbd858cf94294dc1dbfd8f1510b8671d2b1a205&=&format=webp&quality=lossless&width=1470&height=1474" } }]
            },
            { type: 14 },
            {
              type: 1,
              components: [
                { style: 2, type: 2, emoji: { id: "1450607652458467338", name: "a4_cardigan" }, custom_id: "ticket_btn_1" },
                { style: 2, type: 2, emoji: { id: "1441650111217274921", name: "0z" }, custom_id: "ticket_btn_2" },
                { style: 2, type: 2, emoji: { id: "1450607631449198592", name: "c_flower", animated: true }, custom_id: "ticket_btn_3" },
                { style: 2, type: 2, emoji: { id: "1441650100400033833", name: "0z" }, custom_id: "ticket_btn_4" },
                { style: 2, type: 2, emoji: { id: "1448751265633931274", name: "000bowz" }, custom_id: "ticket_btn_5" }
              ]
            }
          ]
        }
      ]
    })

    // Support info
    await sendV2Message(channelToPost.id, {
      flags: 32768,
      components: [
        {
          type: 12,
          items: [{ media: { url: "https://media.discordapp.net/attachments/1441600886068613161/1450860325774688287/Untitled216_20251125145710.png?ex=694563f9&is=69441279&hm=2cb1fa07ad8975c85fe8228ba843417d87308fca7a102735fad6e7ff51d45b81&=&format=webp&quality=lossless&width=794&height=42" } }]
        },
        {
          type: 9,
          components: [{
            type: 10,
            content: `_ _\n _ _ 　 　 　　⎯⎯⎯⎯໑ᣟ݂ᚐ　<a:002_clover:1450606715731968161>♡︎ ྀི༷　__ຣupp__ꪮrt𓈒. 𓏽ཾ 　✿ᩧ             ༷\n _ _ 　　<a:i_wing:1450606714012307596> 𓏵ᣟ݂ ̥՞　𓈒　**use**　 ۫ɕmmᥒ　 ۫ ִ⑅ sꫀ͟nse　𓈒.  Ი ᰍ ྀི༷  \n-# _ _ 　 　　 　　 𓐇 ྀི ݂۫  그는 정말 잘생겼어요　𓈒. fꪮlloω　[__tos__](https://discord.com/channels/1441570514752508056/1441599753937879191)  ᣟ݂♪ ͜　<a:y_03:1450607636801257493>𓈈𓈒.　\n\n_ _`
          }],
          accessory: {
            type: 11,
            media: { url: "https://media.discordapp.net/attachments/1441600886068613161/1451317986660192307/Untitled176_20251218155916.PNG?ex=6945bcb4&is=69446b34&hm=67fd0547335766e80037f163eafd5bce1486258f6560d570f93c62070aa8a7b1&=&format=webp&quality=lossless&width=2108&height=2108" }
          }
        }
      ]
    })

    // Select menu
    await sendV2Message(channelToPost.id, {
      flags: 32768,
      components: [
        {
          type: 17,
          accent_color: 16777215,
          components: [
            {
              type: 12,
              items: [{ media: { url: "https://media.discordapp.net/attachments/1441600012894212127/1444354909855289404/stars_in_embed_whitecolor_1764079802351.gif?ex=69457455&is=694422d5&hm=1a26fd928d88efedf8a50d5d55cf9939badb9f3c494e21157ddc03f966b19e34&=&width=794&height=42" } }]
            }
          ]
        },
        { type: 14 },
        {
          type: 12,
          items: [{ media: { url: "https://media.discordapp.net/attachments/1398055003117064214/1447585977433591919/Untitled228_20251208084944.png?ex=694557ff&is=6944067f&hm=b6b686d6e2ba073676a8614b03c976b694b4d5c10a825743facfeac2275c10cd&=&format=webp&quality=lossless&width=518&height=50" } }]
        },
        {
          type: 10,
          content: "> -# _ _ 　  𓏸  ྀི༷　<a:002_bus:1450606718081044622>　　⎯__⎯⎯ 　__　 ᣟ݂ 　 𓈒ׄ  𑅛 **h**ᥲ͟ve 　𓈒ֺּׅ𓏽ཾ [թᥲ͟ymntຣ ](https://discord.com/channels/1441570514752508056/1441600012894212127)　 rꫀ͟ady　   ۫ ִ⑅  𓈒"
        },
        {
          type: 1,
          components: [{
            type: 3,
            options: [
              { label: "⃟", value: "gfx", description: "　 ⎯⎯໑　purchase　gfx" },
              { label: "⃟", value: "deco", description: "　♡︎ ྀི༷　purchase　server　deco", emoji: { id: "1450606701437784084", name: "d_sandals" } },
              { label: "⃟", value: "upload", description: "　 ⎯⎯໑　hire　me　4　uploads" },
              { label: "⃟", value: "other", description: "　♡︎ ྀི༷　other　reasons　or　prtnr", emoji: { id: "1450560996484841574", name: "emoji_30" } }
            ],
            placeholder: "ᣟ ✿ᩧ  　 ˳   𓈈𓈒.　𓏸     ♬͟  𓈒　 ⁠݂𓈒추락하는 양⁺　 𓏵ᣟ݂　🍦",
            custom_id: "ticket_select"
          }]
        }
      ]
    })

    await interaction.editReply({ content: "✅ Ticket system posted!" })
    return
  }

  if (!interaction.replied && !interaction.deferred) {
    await interaction.editReply({ content: "✅ Posted!" })
  }
}

// ==== SELECT MENU HANDLER ====
async function handleSelectMenu(interaction) {
  // Waitlist status update
  if (interaction.customId === "wait_status") {
    if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
      return interaction.reply({ content: "❌ You don't have permission to use this!", ephemeral: true })
    }
    const selected = interaction.values[0]
    const messageId = interaction.message.id
    const channelId = interaction.channelId

    const currentMessage = await rest.get(Routes.channelMessage(channelId, messageId))

    function updateComponents(components) {
      return components.map(comp => {
        if (comp.components) {
          return { ...comp, components: updateComponents(comp.components) }
        }
        if (comp.type === 10 && comp.content) {
          const hasStatus = /noted|processing|waiting|completed/i.test(comp.content)
          if (hasStatus) {
            return { ...comp, content: comp.content.replace(/(noted|processing|waiting|completed)/i, selected) }
          }
        }
        return comp
      })
    }

    const updatedComponents = updateComponents(currentMessage.components)
    const finalComponents = selected === "completed" 
      ? updatedComponents.filter(c => !(c.type === 1 && c.components?.some(comp => comp.type === 3)))
      : updatedComponents

    await rest.patch(Routes.channelMessage(channelId, messageId), {
      body: { flags: 32768, components: finalComponents }
    })

    return interaction.deferUpdate()
  }

  // Ticket select menu
  if (interaction.customId === "ticket_select") {
    const selected = interaction.values[0]

    console.log(`Ticket selected: ${selected} by ${interaction.user.tag}`)

    if (selected === "other") {
      // Create ticket directly without modal
      const guild = interaction.guild
      const user = interaction.user

      try {
        const ticketChannel = await guild.channels.create({
          name: `other-${user.username}`,
          type: ChannelType.GuildText,
          parent: process.env.TICKET_CATEGORY_ID,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: process.env.ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
          ]
        })

        console.log(`Ticket channel created: ${ticketChannel.name}`)

        // Initial ticket message
        await sendV2Message(ticketChannel.id, {
          flags: 32768,
          components: [
            {
              type: 10,
              content: `_ _\n-# _ _ ${user} + <@${process.env.RAY_USER_ID}>`
            },
            {
              type: 17,
              components: [{
                type: 1,
                components: [
                  {
                    style: 2,
                    type: 2,
                    label: "  ⎯  close",
                    emoji: { id: "1450606711609102346", name: "i_angel", animated: true },
                    custom_id: "ticket_close"
                  },
                  {
                    style: 2,
                    type: 2,
                    label: "  ⎯  lock",
                    emoji: { id: "1450606698820796566", name: "d_drop", animated: true },
                    custom_id: "ticket_lock"
                  }
                ]
              }]
            }
          ]
        })

        await interaction.reply({ content: `✅ Ticket created: ${ticketChannel}`, ephemeral: true })
      } catch (error) {
        console.error("Error creating ticket:", error)
        await interaction.reply({ content: `❌ Error creating ticket: ${error.message}`, ephemeral: true })
      }
      return
    }

    // Show modal for gfx/deco/upload
    const modal = new ModalBuilder()
      .setCustomId(`ticket_modal_${selected}`)
      .setTitle(selected === "gfx" ? "#   ⎯⎯ 𓐇 ྀི 　gfx　♡͝" : selected === "deco" ? "#   ⎯⎯ 𓐇 ྀི 　server　deco　♡͝" : "#   ⎯⎯ 𓐇 ྀི 　uplds　♡͝")

    const orderInput = new TextInputBuilder()
      .setCustomId("order")
      .setLabel(selected === "gfx" ? "what kind of gfx are you buying?" : selected === "deco" ? "what server deco do you want to buy?" : "what upload plan are you buying?")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(selected === "gfx" ? "e.g. x3 banners, x1 divider" : selected === "deco" ? "e.g. 4 complex webhooks, 2 layouts" : "e.g. 400 uplds")
      .setRequired(true)

    const mopInput = new TextInputBuilder()
      .setCustomId("mop")
      .setLabel("whats your method of payment?")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("ca, pp, rbx, nitro, deco, review")
      .setRequired(true)

    modal.addComponents(
      new ActionRowBuilder().addComponents(orderInput),
      new ActionRowBuilder().addComponents(mopInput)
    )

    await interaction.showModal(modal)
  }
}

// ==== MODAL SUBMIT HANDLER ====
async function handleModalSubmit(interaction) {
  // Ticket modals
  if (interaction.customId.startsWith("ticket_modal_")) {
    await interaction.deferReply({ ephemeral: true })

    const orderType = interaction.customId.replace("ticket_modal_", "")
    const order = interaction.fields.getTextInputValue("order")
    const mop = interaction.fields.getTextInputValue("mop").toLowerCase()

    const guild = interaction.guild
    const user = interaction.user

    console.log(`Creating ticket: ${orderType} for ${user.tag}`)

    try {
      // Create ticket channel
      const ticketChannel = await guild.channels.create({
        name: `${orderType}-${user.username}`,
        type: ChannelType.GuildText,
        parent: process.env.TICKET_CATEGORY_ID,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: process.env.ADMIN_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
      })

      console.log(`Ticket channel created: ${ticketChannel.name}`)

      // Store ticket data
      ticketData.set(ticketChannel.id, { user, order, mop, orderType })

      // Initial ticket message
      await sendV2Message(ticketChannel.id, {
        flags: 32768,
        components: [
          {
            type: 10,
            content: `_ _\n-# _ _ ${user} + <@${process.env.RAY_USER_ID}>`
          },
          {
            type: 17,
            components: [{
              type: 1,
              components: [
                {
                  style: 2,
                  type: 2,
                  label: "  ⎯  close",
                  emoji: { id: "1450606711609102346", name: "i_angel", animated: true },
                  custom_id: "ticket_close"
                },
                {
                  style: 2,
                  type: 2,
                  label: "  ⎯  lock",
                  emoji: { id: "1450606698820796566", name: "d_drop", animated: true },
                  custom_id: "ticket_lock"
                }
              ]
            }]
          }
        ]
      })

      // Modal info message with confirm button
      await sendV2Message(ticketChannel.id, {
        flags: 32768,
        components: [{
          type: 17,
          accent_color: 16777215,
          components: [
            {
              type: 9,
              components: [{
                type: 10,
                content: `_ _\n_ _　 ⎯⎯໑ 𓈒ׄ ${user}'s　**ꪮrder** ⑅　𓈒\n_ _　　⠀ 𓐇۪ ᣟ݂ 　[__buyiᥒg__](https://discord.com/channels/1441570514752508056/1441600012894212127)　${order}\n_ _　　　𓈒.✿ᩧ 　**mo**թ　${mop}　<a:a_bandge:1441630586111262746>   ֯    ⑅
\n-# _ _ 　　𓈈𓈒.　𓏵ᣟ݂ ̥՞　cꪮnfirm　pᥲ͟ymnt　.  Ი ᰍ ྀི༷`
              }],
              accessory: {
                style: 2,
                type: 2,
                emoji: { id: "1450606715731968161", name: "002_clover", animated: true },
                disabled: false,
                custom_id: "ticket_confirm_admin"
              }
            },
            { type: 14 },
            {
              type: 1,
              components: [{
                style: 2,
                type: 2,
                label: " 　 ֯ ♡︎ ྀི༷.　 cꪮnfirm 　 .ᣟ݂ ݂ ౿",
                emoji: { id: "1450607631449198592", name: "c_flower", animated: true },
                custom_id: "ticket_confirm"
              }]
            }
          ]
        }]
      })

      await interaction.editReply({ content: `✅ Ticket created: ${ticketChannel}` })
    } catch (error) {
      console.error("Error creating ticket:", error)
      await interaction.editReply({ content: `❌ Error creating ticket: ${error.message}` })
    }
  }

  // Receipt modal - first stage
  if (interaction.customId === "receipt_modal") {
    const purchased = interaction.fields.getTextInputValue("purchased")
    const summary = interaction.fields.getTextInputValue("summary")
    const changes = interaction.fields.getTextInputValue("changes")
    const payment = interaction.fields.getTextInputValue("payment")
    const userField = interaction.fields.getTextInputValue("user")

    // Store data temporarily and ask for dates
    ticketData.set(`${interaction.channelId}_receipt_data`, {
      purchased, summary, changes, payment, userField
    })

    // Reply with button to continue
    await interaction.reply({
      content: "✅ First part saved! Click the button below to add date details.",
      components: [{
        type: 1,
        components: [{
          type: 2,
          style: 1,
          label: "Add Dates",
          custom_id: "receipt_continue"
        }]
      }],
      ephemeral: true
    })
  }

  // Handle completion date follow-up
  if (interaction.customId === "receipt_completion_modal") {
    const orderedDate = interaction.fields.getTextInputValue("ordered_date")
    const completedDate = interaction.fields.getTextInputValue("completed_date")

    // Get stored receipt data
    const receiptData = ticketData.get(`${interaction.channelId}_receipt_data`)
    if (!receiptData) {
      return interaction.reply({ content: "❌ Receipt data not found!", ephemeral: true })
    }

    await interaction.reply({
      content: `_ _ \n_ _   𓏸  ྀི༷   __     ⎯⎯__⎯໑      **ꪮrdꫀ͟r    cꪮmplꫀ͟te**    𓈒.  Ი ᰍ ྀི༷   <a:002_bus:1450606718081044622> \n_ _\n\n-#  _ _       <:emoji_28:1450558336822153407>  ⠀𓏵⠀**purchased**　⎯　${receiptData.purchased}⠀⠀__𓎢𓎡__\n-#  _ _　         ﹒ .  ྀི 𓈒݂     **summary** : ${receiptData.summary}     ๑ 𓈒\n\n-#  _ _        <a:5_green:1450607639401730059>     𓏵   **changes**   ${receiptData.changes}        ⑅   ♬͟    𓏻𓈒 \n-#  _ _            𓐇۪ ᣟ݂ᚐ⠀⠀**payment**　⎯　${receiptData.payment}⠀𓈈𓈒.⠀ ✿ᩧ\n\n-#  _ _        <a:y_03:1450607636801257493>  ⠀𓏵⠀**ordered on**　⎯　${orderedDate}⠀⠀__𓎢𓎡__\n-#  _ _　         ﹒ .  ྀི 𓈒݂      **completed on** : ${completedDate}     ๑ 𓈒\n\n> -#  _ _          ۫ ִ⑅  𓈒     ** review   in   __this   ticket__**       <${receiptData.userField}>      <a:000aDNS:1448751246587461853>`
    })

    ticketData.delete(`${interaction.channelId}_receipt_data`)
  }

  // Cancel modal
  if (interaction.customId === "cancel_modal") {
    const ordered = interaction.fields.getTextInputValue("ordered")
    const reason = interaction.fields.getTextInputValue("reason")
    const refundable = interaction.fields.getTextInputValue("refundable")
    const payment = interaction.fields.getTextInputValue("payment")
    const orderedDate = interaction.fields.getTextInputValue("ordered_date")

    await interaction.reply({
      content: `_ _\n_ _   𓏸  ྀི༷   __     ⎯⎯__⎯໑      **ꪮrdꫀ͟r    cᥲnc__ꫀ__lled**    𓈒.  Ი ᰍ ྀི༷   <a:002_bus:1450606718081044622> \n_ _\n-#  _ _       <:emoji_28:1450558336822153407>  ⠀𓏵⠀**ordered**　⎯　${ordered}⠀⠀__𓎢𓎡__\n-#  _ _　         ﹒ .  ྀི 𓈒݂     **reason** : ${reason}     ๑ 𓈒\n\n-# _ _        <a:5_green:1450607639401730059>     𓏵   **refundable?**   ${refundable}        ⑅   ♬͟    𓏻𓈒 \n-# _ _            𓐇۪ ᣟ݂ᚐ⠀⠀**payment**　⎯　${payment}⠀𓈈𓈒.⠀ ✿ᩧ\n\n-# _ _        <a:y_03:1450607636801257493>  ⠀𓏵⠀**ordered on**　⎯　${orderedDate}⠀⠀__𓎢𓎡__`
    })
  }
}

// ==== BUTTON HANDLER ====
async function handleButton(interaction) {
  const ticketChannelId = interaction.channelId
  const data = ticketData.get(ticketChannelId)

  // ==== TICKET CONFIRM BUTTON (ADMIN) ====
  if (interaction.customId === "ticket_confirm" || interaction.customId === "ticket_confirm_admin") {
    if (!data) {
      return interaction.reply({ content: "❌ No ticket data found!", ephemeral: true })
    }

    const { mop } = data
    let mopMessage = {}

    // Determine MOP message based on payment method
    if (mop.includes("nitro") || mop.includes("deco") || mop.includes("dcr") || mop.includes("nbst") || mop.includes("nba")) {
      mopMessage = {
        content: "_ _\n_ _　 　　  𓈒  ᩧ𓐇   **__nitrꪮ__　ᵒʳ　𓈒.dꫀ͟co**　  𓈒ֺּׅ ♡ ྀི༷\n-# _ _　<a:teasie:1421374111074222102>　𓈒. ✿ᩧ　__wait__　for　ray　to　confirm\n-# _ _　 ᜴ׁ༷   　sending　w/o　conf　=　**voided**\n> \n-# _ _  　　　　⑅.　ִִ𓈒     send　gift　link　in　dms\n-# _ _　<a:c_star:1450607626240131112>　 ♬𓈒　must　be　**lgl**　or　have　**warr**\n-# _ _　　⎯໑     　  ྀི༷　𓐇۪ ᣟ݂ᚐ not　taking　unstable　links\n_ _",
        components: [{
          type: 1,
          components: [{
            style: 2,
            type: 2,
            label: "　𓈒. 　nꪮted　ᥲ͟nd　թrocessiᥒg　   ♬͟ ",
            emoji: { id: "1450558221071814666", name: "emoji_27" },
            custom_id: "ticket_noted"
          }]
        }]
      }
    } else if (mop.includes("ca") || mop.includes("cashapp")) {
      mopMessage = {
        flags: 32768,
        components: [
          {
            type: 10,
            content: "_ _\n_ _　 　　  𓈒  ᩧ𓐇   **__cᥲ͟ຣh__　𓈒.ᥲ͟pp**　  𓈒ֺּׅ ♡ ྀི༷\n-# _ _　<a:teasie:1421374111074222102>　𓈒. ✿ᩧ　__wait__　for　ray　to　confirm\n-# _ _　 ᜴ׁ༷   　sending　w/o　conf　=　**voided**\n> \n-# _ _  　　　　⑅.　ִִ𓈒     send　[__balance__](https://cash.app/$6Iives)　only\n-# _ _　<a:c_star:1450607626240131112>　 ♬𓈒　only　send　**emoji**　notes\n-# _ _　　⎯໑     　  ྀི༷　𓐇۪ ᣟ݂ᚐ send　ss　of　__receipt__\n_ _"
          },
          {
            type: 1,
            components: [{
              style: 2,
              type: 2,
              label: "　𓈒. 　nꪮted　ᥲ͟nd　թrocessiᥒg　   ♬͟ ",
              emoji: { id: "1450558221071814666", name: "emoji_27" },
              custom_id: "ticket_noted"
            }]
          }
        ]
      }
    } else if (mop.includes("pp") || mop.includes("paypal")) {
      mopMessage = {
        content: "_ _\n_ _　 　　  𓈒  ᩧ𓐇   **__pᥲ͟y__　𓈒.pᥲ͟l**　  𓈒ֺּׅ ♡ ྀི༷\n-# _ _　<a:teasie:1421374111074222102>　𓈒. ✿ᩧ　__wait__　for　ray　to　confirm\n-# _ _　 ᜴ׁ༷   　sending　w/o　conf　=　**voided**\n> \n-# _ _  　　　　⑅.　ִִ𓈒     send　[fnf](https://www.paypal.me/stingedup)　only\n-# _ _　<a:c_star:1450607626240131112>　 ♬𓈒　only　send　**emoji**　notes\n-# _ _　　⎯໑     　  ྀི༷　𓐇۪ ᣟ݂ᚐ send　ss　of　__receipt__\n_ _",
        components: [{
          type: 1,
          components: [{
            style: 2,
            type: 2,
            label: "𓈒. 　nꪮted　ᥲ͟nd　թrocessiᥒg　   ♬͟",
            emoji: { id: "1450558221071814666", name: "emoji_27" },
            custom_id: "ticket_noted"
          }]
        }]
      }
    } else if (mop.includes("rbx") || mop.includes("roblox") || mop.includes("robux")) {
      mopMessage = {
        content: " _ _\n_ _　 　　  𓈒  ᩧ𓐇   **__rbꪎ__　𓈒.pᥲ͟yment**　  𓈒ֺּׅ ♡ ྀི༷\n-# _ _　<a:teasie:1421374111074222102>　𓈒. ✿ᩧ　__wait__　for　ray　to　confirm\n-# _ _　 ᜴ׁ༷   　sending　w/o　conf　=　**voided**\n> \n-# _ _  　　　　⑅.　ִִ𓈒     find　[amt](https://www.roblox.com/games/2571614859/what#!/store)　here\n-# _ _　<a:c_star:1450607626240131112>　 ♬𓈒　if　not　**listed**,　wait\n-# _ _　　⎯໑     　  ྀི༷　𓐇۪ ᣟ݂ᚐ send　ss　of　__gp__\n_ _",
        components: [{
          type: 1,
          components: [{
            style: 2,
            type: 2,
            label: "𓈒. 　nꪮted　ᥲ͟nd　թrocessiᥒg　   ♬͟",
            emoji: { id: "1450558221071814666", name: "emoji_27" },
            custom_id: "ticket_noted"
          }]
        }]
      }
    } else if (mop.includes("review") || mop.includes("free") || mop.includes("rvw") || mop.includes("rev") || mop.includes("long rev") || mop.includes("med rev") || mop.includes("short rev")) {
      mopMessage = {
        content: `_ _　 　　  𓈒  ᩧ𓐇   **__review__　𓈒.pᥲ͟yment**　  𓈒ֺּׅ ♡ ྀི༷\n-# _ _　<a:teasie:1421374111074222102>　𓈒. ✿ᩧ　__wait__　for　ray　to　confirm\n-# _ _　　　 ᜴ׁ༷   　for　free　services　**only**\n> \n-# _ _  　　　　⑅.　ִִ𓈒     no　review　=　ban　+　deleted\n-# _ _　<a:c_star:1450607626240131112>　 ♬𓈒　all　reviews　**in**　ticket\n_ _`,
        components: [{
          type: 1,
          components: [{
            style: 2,
            type: 2,
            label: "　𓈒. 　nꪮted　ᥲ͟nd　թrocessiᥒg　   ♬͟ ",
            emoji: { id: "1450558221071814666", name: "emoji_27" },
            custom_id: "ticket_noted"
          }]
        }]
      }
    }

    await interaction.channel.send(mopMessage)
    await interaction.reply({ content: "✅ Payment method confirmed!", ephemeral: true })
  }

  // ==== NOTED AND PROCESSING BUTTON ====
  if (interaction.customId === "ticket_noted") {
    if (!data) {
      return interaction.reply({ content: "❌ No ticket data found!", ephemeral: true })
    }

    const { user, order } = data
    const queueChannelId = process.env.WAITLIST_CHANNEL_ID

    // Send waitlist message in queue channel
    await sendV2Message(queueChannelId, {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 12,
              items: [{ media: { url: "https://media.discordapp.net/attachments/1441600780116299907/1451058250702258246/Untitled186_20251217224700.PNG?ex=6944cace&is=6943794e&hm=4aa42244d093247cf0bc1049efc0977b7ed350f44d04ff38f1394c8e6b0b2337&=&format=webp&quality=lossless&width=1470&height=1474" } }]
            },
            { type: 14 },
            {
              type: 1,
              components: [{
                type: 3,
                options: [{ label: "deco only", value: "oiVFtLCScJ" }],
                placeholder: "𓈒　🧇　   ྀི༷　𓈒.   절대 나를 떠나지 마세요 𓈒　𓈒.  𓐇۪ ᣟ݂",
                disabled: true,
                custom_id: "p_248648402861035522"
              }]
            }
          ]
        },
        {
          type: 12,
          items: [{ media: { url: "https://media.discordapp.net/attachments/1441600886068613161/1450860325774688287/Untitled216_20251125145710.png?ex=6944bb39&is=694369b9&hm=b86b38c958005ba6b705caa57009dcc179f8bf900d76b079d3674062adf20348&=&format=webp&quality=lossless&width=794&height=42" } }]
        }
      ]
    })

    await sendV2Message(queueChannelId, {
      flags: 32768,
      components: [{
        type: 9,
        components: [{
          type: 10,
          content: `_ _\n-# _ _ 　　　　  𓏸  ྀི༷　추락하는 양  <:c_lemoncake:1450607623723417620>　 ᜴ׁ༷  𓈒݂　ℛ͟ᥲ͟ y'ຣ ᣟ݂ᚐ　shꪮթ　 𓈒　𓈒　𓈒\n _ _ 　　   ۫ ִ⑅ 　⎯⎯⎯⎯໑　𓐇۪ ᣟ݂ᥒꫀ͟ω 　[ꪮrdꫀ͟r](https://discord.com/channels/1441570514752508056/1441602188093821039)  　𓈒ֺּׅ𓏽ཾ 　𓈒\n-# _ _  　　　 𓈒ׄ  𑅛　  𓈈𓈒.　♬͟ ᩧ** ordered ྀི༷ 　by‌‌‌݂۫  **　${user} 　 <a:002_bus:1450606718081044622>𓈒　 𓏸   𓏵ᣟ݂`
        }],
        accessory: {
          type: 11,
          media: { url: "https://media.discordapp.net/attachments/1441600780116299907/1451058568395489311/Untitled176_20251217224821.PNG?ex=6944cb1a&is=6943799a&hm=432e0ee7c796e905ca369d6ba743270ed468e0f3aa58c22385b31114258d5ced&=&format=webp&quality=lossless&width=2316&height=2316" }
        }
      }]
    })

    await sendV2Message(queueChannelId, {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: `\n
-# _ _ 　     　  𓈒.  Ი ᰍ𓏽ཾ 　꒰꒰𓈒　 __**bꪮught**__ 　${order}　 ˳♡͝   ׁ　 
-# _ _ 　   　<a:teasie:1450607647182164211> 𓈒　 ✿ᩧ𓈒ֺּׅ　𓈒.     noted 　𓈒. 教묘한 취급 　𓈒 𓏸   ♬͟  𓈒　　　　　　　　　_ _`
            },
            { type: 14 },
            {
              type: 12,
              items: [{ media: { url: "https://media.discordapp.net/attachments/1398055003117064214/1447585977433591919/Untitled228_20251208084944.png?ex=6944067f&is=6942b4ff&hm=cb2e9236db2c5492402bfa9a5beae322dda31004645d72b9bfc574d7e405f983&=&format=webp&quality=lossless&width=518&height=50" } }]
            }
          ],
          accent_color: 16777215
        }
      ]
    })

    await sendV2Message(queueChannelId, {
      flags: 32768,
      components: [
        {
          type: 12,
          items: [{ media: { url: "https://media.discordapp.net/attachments/1441600012894212127/1444354909855289404/stars_in_embed_whitecolor_1764079802351.gif?ex=694422d5&is=6942d155&hm=5ef1bd00963db097dd7ca599d660115553763d305aabd7e042cd7770c0f5161b&=&width=794&height=42" } }]
        },
        {
          type: 1,
          components: [
            {
              style: 2,
              type: 2,
              label: "♪ 𓈒 𓐇 ྀིprocꫀ͟ssing𓈒 ꒱݂۫",
              emoji: { id: "1450606701437784084", name: "d_sandals" },
              custom_id: "waitlist_processing"
            },
            {
              style: 2,
              type: 2,
              label: "♡︎ ྀི༷　𓈒.   ω4r  ",
              emoji: { id: "1450607631449198592", name: "c_flower", animated: true },
              custom_id: "waitlist_w4r"
            },
            {
              style: 2,
              type: 2,
              label: "𓈈𓈒.　𓐇۪ dꪮnꫀ͟",
              emoji: { id: "1450606714012307596", name: "i_wing", animated: true },
              custom_id: "waitlist_done"
            }
          ]
        }
      ]
    })

    // Send confirmation in ticket
    await sendV2Message(ticketChannelId, {
      flags: 32768,
      components: [
        {
          type: 10,
          content: `-# ${user}`
        },
        {
          type: 17,
          accent_color: 16777215,
          components: [{
            type: 9,
            components: [{
              type: 10,
              content: `_ _\n-# _ _　　 𓈒ׄ  𑅛　<a:10_noodles:1450607654928912546>𓐇۪ ᣟ݂　you　are　now　in　__queue__　𓐇۪ ᣟ݂\n-# _ _　　 ྀི༷　must　leave　[**review**](https://discord.com/channels/1441570514752508056/1441600012894212127)　in　48h　𓏵ᣟ݂\n-# _ _　　꒰꒰ ᩧ　 ִ⑅　rushing　=　__cancelled__  ྀི༷<:c_lemoncake:1450607623723417620>\n\n-# _ _　⎯⎯⎯໑　𓏼ᣟ　no　**refunds**　unless　stated 　✿ᩧ　𓈒ֺּׅ𓏽ཾ\n-# _ _　　𓈒 𓏸𝜗𐑞　<:d_stamp:1450606709180465426>　follow　my　[__tos__](https://discord.com/channels/1441570514752508056/1441599753937879191)  　♡ ྀི༷`
            }],
            accessory: {
              type: 11,
              media: { url: "https://media.discordapp.net/attachments/1398050347146285167/1450964910409515050/Untitled186_20251217163615.PNG?ex=69451ca0&is=6943cb20&hm=035f14d6c1b9a8ca43dd92def8a8ec996c32dbb5aa776f73e5645cebd591ad83&=&format=webp&quality=lossless&width=1470&height=1474" }
            }
          }]
        },
        { type: 14 },
        {
          type: 1,
          components: [
            {
              style: 2,
              type: 2,
              label: "　 ⎯　 cancel",
              emoji: { id: "1450558336822153407", name: "emoji_28" },
              custom_id: "ticket_cancel_btn"
            },
            {
              style: 2,
              type: 2,
              label: "　 ⎯　 receipt",
              emoji: { id: "1450606706877796462", name: "d_button", animated: true },
              custom_id: "ticket_receipt_btn"
            },
            {
              style: 2,
              type: 2,
              label: "　 ⎯　 done",
              emoji: { id: "1450606714012307596", name: "i_wing", animated: true },
              custom_id: "ticket_done"
            }
          ]
        },
        {
          type: 12,
          items: [{ media: { url: "https://media.discordapp.net/attachments/1441600012894212127/1444354909855289404/stars_in_embed_whitecolor_1764079802351.gif?ex=694422d5&is=6942d155&hm=5ef1bd00963db097dd7ca599d660115553763d305aabd7e042cd7770c0f5161b&=&width=794&height=42" } }]
        }
      ]
    })

    await interaction.reply({ content: "✅ Added to queue and notified user!", ephemeral: true })
  }

  // ==== CANCEL BUTTON (Show Modal) ====
  if (interaction.customId === "ticket_cancel_btn") {
    const modal = new ModalBuilder()
      .setCustomId("cancel_modal")
      .setTitle("# order cancelled")

    const orderedInput = new TextInputBuilder()
      .setCustomId("ordered")
      .setLabel("ordered")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("reason")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)

    const refundableInput = new TextInputBuilder()
      .setCustomId("refundable")
      .setLabel("refundable")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("yes/no")
      .setRequired(true)

    const paymentInput = new TextInputBuilder()
      .setCustomId("payment")
      .setLabel("payment")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const orderedDateInput = new TextInputBuilder()
      .setCustomId("ordered_date")
      .setLabel("ordered on")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("date")
      .setRequired(true)

    modal.addComponents(
      new ActionRowBuilder().addComponents(orderedInput),
      new ActionRowBuilder().addComponents(reasonInput),
      new ActionRowBuilder().addComponents(refundableInput),
      new ActionRowBuilder().addComponents(paymentInput),
      new ActionRowBuilder().addComponents(orderedDateInput)
    )

    await interaction.showModal(modal)
  }

  // ==== RECEIPT BUTTON (Show Modal) ====
  if (interaction.customId === "ticket_receipt_btn") {
    const modal = new ModalBuilder()
      .setCustomId("receipt_modal")
      .setTitle("# order completion")

    const purchasedInput = new TextInputBuilder()
      .setCustomId("purchased")
      .setLabel("user purchased")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const summaryInput = new TextInputBuilder()
      .setCustomId("summary")
      .setLabel("summary")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)

    const changesInput = new TextInputBuilder()
      .setCustomId("changes")
      .setLabel("changes")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const paymentInput = new TextInputBuilder()
      .setCustomId("payment")
      .setLabel("payment")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const userInput = new TextInputBuilder()
      .setCustomId("user")
      .setLabel("user id")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    modal.addComponents(
      new ActionRowBuilder().addComponents(purchasedInput),
      new ActionRowBuilder().addComponents(summaryInput),
      new ActionRowBuilder().addComponents(changesInput),
      new ActionRowBuilder().addComponents(paymentInput),
      new ActionRowBuilder().addComponents(userInput)
    )

    await interaction.showModal(modal)
  }

  // ==== RECEIPT CONTINUE BUTTON ====
  if (interaction.customId === "receipt_continue") {
    const modal2 = new ModalBuilder()
      .setCustomId("receipt_completion_modal")
      .setTitle("# dates")

    const orderedDateInput = new TextInputBuilder()
      .setCustomId("ordered_date")
      .setLabel("ordered on date")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    const completedDateInput = new TextInputBuilder()
      .setCustomId("completed_date")
      .setLabel("completed on date")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)

    modal2.addComponents(
      new ActionRowBuilder().addComponents(orderedDateInput),
      new ActionRowBuilder().addComponents(completedDateInput)
    )

    await interaction.showModal(modal2)
  }

  // ==== WAITLIST BUTTONS ====
  if (interaction.customId === "waitlist_processing" || interaction.customId === "waitlist_w4r" || interaction.customId === "waitlist_done") {
    const channelId = interaction.channelId

    console.log(`Waitlist button pressed: ${interaction.customId}`)

    // Determine new status text
    let newStatus = "processing"
    if (interaction.customId === "waitlist_w4r") newStatus = "w4r"
    if (interaction.customId === "waitlist_done") newStatus = "completed"

    console.log(`Changing status to: ${newStatus}`)

    // Fetch recent messages to find the one with status text
    const messages = await interaction.channel.messages.fetch({ limit: 10 })

    // Find the message that contains the status text
    let targetMessage = null
    for (const [id, msg] of messages) {
      // Check if message has components with text that contains status
      if (msg.components && msg.components.length > 0) {
        const messageData = await rest.get(Routes.channelMessage(channelId, id))

        function hasStatusText(components) {
          for (const comp of components) {
            if (comp.components) {
              if (hasStatusText(comp.components)) return true
            }
            if (comp.type === 10 && comp.content && /noted|processing|w4r|completed/i.test(comp.content)) {
              return true
            }
          }
          return false
        }

        if (hasStatusText(messageData.components)) {
          targetMessage = { id, data: messageData }
          console.log(`Found target message: ${id}`)
          break
        }
      }
    }

    if (!targetMessage) {
      return interaction.reply({ content: "❌ Could not find status message to update!", ephemeral: true })
    }

    // Update the status text in the found message
    function updateComponents(components) {
      return components.map(comp => {
        if (comp.components) {
          return { ...comp, components: updateComponents(comp.components) }
        }
        if (comp.type === 10 && comp.content && /noted|processing|w4r|completed/i.test(comp.content)) {
          console.log(`FOUND STATUS! Replacing in: ${comp.content.substring(0, 100)}`)
          return { 
            ...comp, 
            content: comp.content.replace(/(noted|processing|w4r|completed)/i, newStatus)
          }
        }
        return comp
      })
    }

    const updatedComponents = updateComponents(targetMessage.data.components)

    await rest.patch(Routes.channelMessage(channelId, targetMessage.id), {
      body: { flags: targetMessage.data.flags, components: updatedComponents }
    })

    // Also remove buttons if completed
    if (interaction.customId === "waitlist_done") {
      const buttonMessageId = interaction.message.id
      const buttonMessage = await rest.get(Routes.channelMessage(channelId, buttonMessageId))
      const noButtons = buttonMessage.components.filter(c => c.type !== 1)

      await rest.patch(Routes.channelMessage(channelId, buttonMessageId), {
        body: { flags: buttonMessage.flags, components: noButtons }
      })
    }

    await interaction.reply({ content: `✅ Status updated to ${newStatus}!`, ephemeral: true })
  }

  // ==== DONE BUTTON ====
  if (interaction.customId === "ticket_done") {
    await interaction.deferReply({ ephemeral: true })

    // Generate transcript
    const channel = interaction.channel
    const messages = await channel.messages.fetch({ limit: 100 })

    let transcript = `📝 Transcript for: ${channel.name}\n`
    transcript += `Created: ${channel.createdAt.toLocaleString()}\n`
    transcript += `Closed: ${new Date().toLocaleString()}\n`
    transcript += `${"=".repeat(50)}\n\n`

    messages.reverse().forEach(msg => {
      const timestamp = msg.createdAt.toLocaleString()
      const author = msg.author.tag
      const content = msg.content || "[Embed/Attachment]"
      transcript += `[${timestamp}] ${author}: ${content}\n`

      if (msg.embeds.length > 0) {
        transcript += `   📎 ${msg.embeds.length} embed(s)\n`
      }
      if (msg.attachments.size > 0) {
        transcript += `   📎 ${msg.attachments.size} attachment(s)\n`
      }
    })

    // Send to transcript channel
    const transcriptChannel = interaction.guild.channels.cache.get(process.env.TRANSCRIPT_CHANNEL_ID)
    if (transcriptChannel) {
      // Split if too long (Discord 2000 char limit)
      if (transcript.length > 1900) {
        const chunks = transcript.match(/[\s\S]{1,1900}/g) || []
        for (const chunk of chunks) {
          await transcriptChannel.send(`\`\`\`\n${chunk}\n\`\`\``)
        }
      } else {
        await transcriptChannel.send(`\`\`\`\n${transcript}\n\`\`\``)
      }
    }

    await interaction.editReply({ content: "🔒 Transcript saved! Closing ticket..." })

    // Delete ticket channel
    setTimeout(() => channel.delete(), 2000)
  }

  // ==== CLOSE BUTTON ====
  if (interaction.customId === "ticket_close") {
    await interaction.deferReply({ ephemeral: true })

    // Generate transcript
    const channel = interaction.channel
    const messages = await channel.messages.fetch({ limit: 100 })

    let transcript = `📝 Transcript for: ${channel.name}\n`
    transcript += `Created: ${channel.createdAt.toLocaleString()}\n`
    transcript += `Closed: ${new Date().toLocaleString()}\n`
    transcript += `${"=".repeat(50)}\n\n`

    messages.reverse().forEach(msg => {
      const timestamp = msg.createdAt.toLocaleString()
      const author = msg.author.tag
      const content = msg.content || "[Embed/Attachment]"
      transcript += `[${timestamp}] ${author}: ${content}\n`

      if (msg.embeds.length > 0) {
        transcript += `   📎 ${msg.embeds.length} embed(s)\n`
      }
      if (msg.attachments.size > 0) {
        transcript += `   📎 ${msg.attachments.size} attachment(s)\n`
      }
    })

    const transcriptChannel = interaction.guild.channels.cache.get(process.env.TRANSCRIPT_CHANNEL_ID)
    if (transcriptChannel) {
      if (transcript.length > 1900) {
        const chunks = transcript.match(/[\s\S]{1,1900}/g) || []
        for (const chunk of chunks) {
          await transcriptChannel.send(`\`\`\`\n${chunk}\n\`\`\``)
        }
      } else {
        await transcriptChannel.send(`\`\`\`\n${transcript}\n\`\`\``)
      }
    }

    await interaction.editReply({ content: "🔒 Transcript saved! Closing ticket..." })

    setTimeout(() => channel.delete(), 2000)
  }

  // ==== LOCK BUTTON ====
  if (interaction.customId === "ticket_lock") {
    const ticketOpener = ticketData.get(ticketChannelId)?.user
    if (ticketOpener) {
      await interaction.channel.permissionOverwrites.edit(ticketOpener.id, {
        SendMessages: false
      })
      await interaction.reply({ content: "🔒 Ticket locked!", ephemeral: true })
    }
  }
}

client.login(process.env.TOKEN)