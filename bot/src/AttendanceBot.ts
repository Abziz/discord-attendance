import discordJs, { GuildMember, Message, TextChannel, Guild } from 'discord.js';
import { UserSnapshots, UserSnapshot, VoiceState } from './models/UserSnapshot';
const ROLE_TO_TRACK = '330466103979540480';
const COMMANDS_TEXT_CHANNEL = '594662666853810177';
export class AttendanceBot extends discordJs.Client {
  currentGuild?:Guild;
  constructor(token: string) {
    super();
    this.on('ready', this.work);
    this.login(token);
  }
  private takeInitialSnapshot() {
    const guild = this.guilds.first();
    const role = guild.roles.get(ROLE_TO_TRACK)!;
    role.members.filter(member => !member.user.bot).forEach(async (member) => {
      await UserSnapshots.create(this.snapshotFromMember(member));
    });
  }
  private work(): void {
    this.currentGuild = this.guilds.first();
    this.takeInitialSnapshot();
    this.on('voiceStateUpdate', this.onVoiceStateUpdate);
    this.on('message', this.handleCommands);
  }
  private async handleCommands(message: Message) {
    if (!(message.channel instanceof TextChannel)) return;
    if (message.channel.id !== COMMANDS_TEXT_CHANNEL) return;
    if (!message.member) return;
    if (message.author.bot) return;
    if (message.content.indexOf('!') !== 0) return;
    if (!message.member.roles.keyArray().includes(ROLE_TO_TRACK)) return;
    const args = message.content.slice(1).trim().split(/ +/g);
    const command = args.shift()!.toLowerCase();
    if (command === 'everyone') {
      const ranks = await this.rankings();
      ranks.sort((a, b) => b.totalSeconds - a.totalSeconds);
      const lines = ranks.map((rank, i) => {
        const place = i + 1;
        const username = `${i === 0 ? '👑' :'' } **${rank.username}**`;
        const score = scoreFromSeconds(rank.totalSeconds);
        return `${place}.${username} ${score}`;
      });
      await message.channel.send(lines.join('\n'));
    }
    if (command === 'me') {
      const userId = message.author.id;
      const ranks = await this.rankings();
      ranks.sort((a, b) => b.totalSeconds - a.totalSeconds);
      const rank = ranks.findIndex(rank => rank.userId === userId);
      const { username, totalSeconds } = ranks[rank];
      const score = scoreFromSeconds(totalSeconds);
      await message.channel.send(`${rank + 1}.${rank === 0 ? '👑' :''} **${username}**\t${score}`);
    }
    if (command === 'attendance') {

      let response = '\n👀 Commands for attendance:';
      response += '\n**!me** - show my points';
      response += "\n**!everyone** - show everyone's points";
      await message.channel.send(`${response}`);
    }
    if (command === 'admin') {
      if (message.author.id === '161245900365103104') {
        await message.channel.send('You are now bot administrator');
      }else if (message.author.username === 'Izzy') {

        await message.channel.sendEmbed({
          description:'LOL',
          image:{
            url:'https://media.giphy.com/media/2S2Z5gQZAEM7K/giphy.gif',
          },
        });
      } else {
        await message.channel.sendEmbed({
          description:'LOL',
          image:{
            url:'https://i.imgur.com/eibibZy.gif?noredirect',
          },
        });
      }
    }
  }
  private async onVoiceStateUpdate(prev: GuildMember, curr: GuildMember) {
    if (prev.roles.keyArray().includes(ROLE_TO_TRACK)) {
      try {
        await UserSnapshots.create(this.snapshotFromMember(curr));
      }catch (error) {
        console.log(error);
      }
    }
  }

  private snapshotFromMember(member: GuildMember): UserSnapshot {
    return {
      userId: member.user.id,
      username: member.user.username,
      channelId: (member.voiceChannel) ? member.voiceChannel.id : undefined,
      channelName: (member.voiceChannel) ? member.voiceChannel.name : undefined,
      timestamp: new Date(),
      voiceState: this.memberVoiceState(member),
    };
  }

  private memberVoiceState(member: GuildMember): VoiceState {
    if (!member.voiceChannel) return 'INACTIVE';
    if (member.voiceChannel.id === this.currentGuild!.afkChannelID) return 'INACTIVE';
    if (member.deaf) return 'INACTIVE';
    if (member.voiceChannel.members.size === 1) return 'ALONE';
    if (member.mute) return 'MUTED';
    return 'ACTIVE';
  }

  private async rankings(query: { userId: string } | {} = {}) {
    const data: UserSnapshot[] = await UserSnapshots.find(query).sort({ _id: 1 }).lean();
    data.forEach(snap => snap.timestamp = new Date(snap.timestamp));
    const members = data.reduce((prev, curr) => {
      prev[curr.userId] = prev[curr.userId] || [];
      prev[curr.userId].push(curr);
      return prev;
    }, {} as { [key: string]: UserSnapshot[] });
    const ranks: ActivityResult[] = [];
    Object.values(members).forEach((memberSnapshots) => {
      const { userId, username } = memberSnapshots[0];
      const totalSeconds = memberSnapshots.reduce((prev, curr) => {
        if (prev.timestamp === undefined) {
          return {
            timestamp: curr.timestamp,
            voiceState: curr.voiceState,
            seconds: 0,
          };
        }
        const { voiceState: prevState, timestamp: prevTime } = prev;
        const { voiceState: currState, timestamp: currTime } = curr;
        if (prevState === 'ACTIVE') {
          prev.seconds += ((currTime.valueOf() - prevTime.valueOf()) / 1000);
        }
        prev.voiceState = curr.voiceState;
        prev.timestamp = curr.timestamp;
        return prev;
      }, {} as { timestamp: Date, voiceState: VoiceState, seconds: number }).seconds;
      ranks.push({ userId, username, totalSeconds });
    });
    return ranks;
  }
}

export interface ActivityResult {
  userId: string;
  username: string;
  totalSeconds: number;
}

function scoreFromSeconds(time: number): string {
  return `\t${Math.floor(time / 60)} points`;
}
