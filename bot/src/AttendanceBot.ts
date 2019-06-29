import discordJs, { GuildMember, Message } from 'discord.js';
import { UserSnapshots, UserSnapshot, VoiceState } from './models/UserSnapshot';
const AFK_CHANNEL_ID = '330466518771040258';
const ROLE_TO_TRACK = '330466103979540480';

export class AttendanceBot extends discordJs.Client {
  constructor(token: string) {
    super();
    this.setup();
    this.login(token);
  }
  private setup(): void {
    this.on('ready', () => {
      this.on('voiceStateUpdate', this.onVoiceStateUpdate);
      this.on('message', this.handleCommands);
    });
  }
  private async handleCommands(message: Message) {
    if (!message.member) return;
    if (message.author.bot) return;
    if (message.content.indexOf('!') !== 0) return;
    if (!message.member.roles.keyArray().includes(ROLE_TO_TRACK)) {
      return;
    }
    const args = message.content.slice(1).trim().split(/ +/g);
    const command = args.shift()!.toLowerCase();

    if (command === 'everyone') {
      const ranks = await this.rankings();
      ranks.sort((a, b) => b.totalSeconds - a.totalSeconds);
      const lines = ranks
        .map((rank, i) => `${i + 1}. ${rank.username} ${scoreFromSeconds(rank.totalSeconds)}`);
      await message.channel.send(lines.join('\n'));
    }
    if (command === 'me') {
      const userId = message.author.id;
      const ranks = await this.rankings({ userId });
      const lines = ranks
        .map((rank, i) => `${i + 1}. ${rank.username} ${scoreFromSeconds(rank.totalSeconds)}`);
      await message.channel.send(`\n${lines.join('\n')}`);
    }
    if (command === 'attendance') {
      let response = '\n👀 Commands for attendance:';
      response += '\n**!me** - show my points';
      response += "\n**!everyone** - show everyone's points";
      await message.channel.send(`${response}`);
    }
  }
  private onVoiceStateUpdate(prev: GuildMember, curr: GuildMember): void {
    if (prev.roles.keyArray().includes(ROLE_TO_TRACK)) {
      UserSnapshots.create(this.snapshotFromMember(prev));
      UserSnapshots.create(this.snapshotFromMember(curr));
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
      friends: (member.voiceChannel) ? member.voiceChannel.members.size : 0,
    };
  }

  private memberVoiceState(member: GuildMember): VoiceState {
    if (member.voiceChannel && member.voiceChannel.id === AFK_CHANNEL_ID) {
      return 'INACTIVE';
    }
    if (member.deaf) {
      return 'INACTIVE';
    }
    if (member.mute) {
      return 'MUTED';
    }
    return 'ACTIVE';
  }
  private async rankings(query: { userId: string } | {} = {}) {
    const data: UserSnapshot[] = await UserSnapshots.find(query).sort({ timestamp: 1 }).lean();
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
  return `\t\t${Math.floor(time / 60)} points`;
}
