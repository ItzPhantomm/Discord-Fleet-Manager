const { Client, GatewayIntentBits, Collection } = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});
client.commands = new Collection();
client.once('ready', () => {
  console.log(`[PHANTOM Bot] Logged in as ${client.user.tag}`);
  console.log(`[PHANTOM Bot] Serving ${client.guilds.cache.size} guilds`);
});
client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;
  if (msg.content.startsWith('!ping')) msg.reply('Pong! 🏓');
});
client.on('error', (err) => console.error(`[PHANTOM Bot] Error: ${err.message}`));
client.login(process.env.BOT_TOKEN).catch(err => {
  console.error(`[PHANTOM Bot] Login failed: ${err.message}`);
  process.exit(1);
});
