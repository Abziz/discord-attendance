import discordJs, { GuildMember, Message, TextChannel, Guild } from 'discord.js';
import { UserSnapshots, UserSnapshot, VoiceState } from './models/UserSnapshot';
const ROLE_TO_TRACK = '330466103979540480';
const COMMANDS_TEXT_CHANNEL = '594662666853810177';
const MEMBERS_WHITE_LIST = [
  '180644941398016010', // Jendalar
  '166243972660854784', // Leopard
  '166212864191758337', // merstik
  '166205132499976192', // wag
  '161245900365103104', // Abziz
  '159300491367546880', // Izzy
  '161159040221577216', // DLF,
  '155359990884990976', // RealGigex,
];

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
    role.members
    .filter(member => !member.user.bot)
    .filter(this.isInTrackedRole)
    .filter(this.isWhiteListed)
    .forEach(async (member) => {
      await UserSnapshots.create({
        userId:member.user.id,
        username: member.user.username,
        timestamp: new Date(),
        channelId: member.voiceChannel ? member.voiceChannel.id :undefined,
        channelName: member.voiceChannel ? member.voiceChannel.name : undefined,
        voiceState:this.memberVoiceState(member),
      });
    });
  }
  private work(): void {
    this.currentGuild = this.guilds.first();
    this.takeInitialSnapshot();
    this.on('voiceStateUpdate', this.onVoiceStateUpdate);
    this.on('message', this.handleCommands);
  }
  private async handleCommands({ channel, member, author, content }: Message) {
    if (!(channel instanceof TextChannel)
      || channel.id !== COMMANDS_TEXT_CHANNEL
      || !member
      || author.bot
      || content.indexOf('!') !== 0
      || !this.isInTrackedRole(member)
      || !this.isWhiteListed(member)) {
      return;
    }
    const args = content.slice(1).trim().split(/ +/g);
    const command = args.shift()!.toLowerCase();
    if (command === 'everyone') {
      const ranks = await this.rankings();
      ranks.sort((a, b) => b.totalSeconds - a.totalSeconds);
      const lines = ranks.map((rank, i) => {
        const emoji = rank.totalSeconds === ranks[ranks.length - 1].totalSeconds ? '😭' :'🍔';
        const name = `**${rank.username}**`;
        const score = scoreFromSeconds(rank.totalSeconds);
        return `${emoji} ${name} ${score}`;
      });
      await channel.send(lines.join('\n'));
    }
    if (command === 'me') {
      const userId = author.id;
      const ranks = await this.rankings();
      ranks.sort((a, b) => b.totalSeconds - a.totalSeconds);
      const rank = ranks.findIndex(rank => rank.userId === userId);
      const { username, totalSeconds } = ranks[rank];
      const emoji = totalSeconds === ranks[ranks.length - 1].totalSeconds ? '😭' :'🍔';
      const name = `**${username}**`;
      const score = scoreFromSeconds(totalSeconds);
      await channel.send(`${emoji} ${name} ${score}`);
    }
    if (command === 'help' || command === 'commands') {
      let response = '\n👀 Commands for attendance:';
      response += '\n**!me** - show my points';
      response += "\n**!everyone** - show everyone's points";
      await channel.send(`${response}`);
    }
  }
  private async onVoiceStateUpdate(prev: GuildMember, curr: GuildMember) {
    if (!this.isInTrackedRole(curr) || !this.isWhiteListed(curr)) {
      return;
    }
    try {
      const snapshots = this.snapshotsFromMember(curr);
      await UserSnapshots.create(snapshots);
    }catch (error) {
      console.error(error);
    }
  }

  private snapshotsFromMember(member: GuildMember): UserSnapshot[] {
    const members:GuildMember[] = [];
    if (member.voiceChannel) {
      member.voiceChannel.members
      .filter(mem => !mem.user.bot)
      .filter(this.isInTrackedRole)
      .filter(this.isWhiteListed)
      .forEach((mem) => { members.push(mem); });
    }else {
      members.push(member);
    }
    const now = new Date();
    return members.map<UserSnapshot>(mem => ({
      userId:mem.user.id,
      username: mem.user.username,
      timestamp: now,
      channelId: mem.voiceChannel ? mem.voiceChannel.id :undefined,
      channelName: mem.voiceChannel ? mem.voiceChannel.name : undefined,
      voiceState:this.memberVoiceState(mem),
    }));
  }

  private memberVoiceState(member: GuildMember) : VoiceState {
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
  private isWhiteListed(member:GuildMember):boolean {
    return MEMBERS_WHITE_LIST.includes(member.user.id);
  }
  private isInTrackedRole(member:GuildMember):boolean {
    return member.roles.has(ROLE_TO_TRACK);
  }
}

export interface ActivityResult {
  userId: string;
  username: string;
  totalSeconds: number;
}
function scoreFromSeconds(time: number): string {
  return `**${Math.floor(time / 60)}** points`;
}
