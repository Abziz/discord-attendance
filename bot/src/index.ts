import Discord from 'discord.js';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

connect().then( (db) => {
    console.log("connected");
});

function start() {
    const client = new Discord.Client();
    client.on('ready', async () => {
        console.log(`logged in as ${client.user.tag}`);
        // const channels = client.channels.filter((channel) => channel.type === 'voice').map((ch) => ch as VoiceChannel);
        // channels.forEach((ch) => console.log(`${ch.name}: ${ch.members.map((mem) => mem).join(",")}`));
    });
    client.login(process.env.DISCORD_TOKEN);
}

function connect() {
    mongoose.connection
    .on('connect', () => {console.log('connected'); })
    .on('error', console.error)
    .once('open', start);
    return mongoose.connect(process.env.MONGODB_URI!, { useNewUrlParser: true});
}
