import discordJs, { VoiceChannel, GuildMember } from 'discord.js';
import { UserSnapshot, ChannelSnapshots, ChannelSnapshot } from './models/ChannelSnapshot';

export class AttendanceBot extends discordJs.Client {
  constructor(token:string) {
    super();
    this.setup();
    this.login(token);
  }
  setup(): void {
    this.on('ready', () => {
      this.on('voiceStateUpdate', this.onVoiceStateUpdate);
    });
  }

  private onVoiceStateUpdate(prev:GuildMember, curr:GuildMember) {
    const prevSnap = this.snapshotFromVoiceChannel(prev.voiceChannel);
    const currSnap = this.snapshotFromVoiceChannel(curr.voiceChannel);
    if (prevSnap) {
      ChannelSnapshots.create(prevSnap);
    }
    if (currSnap) {
      ChannelSnapshots.create(currSnap);
    }
  }
  private snapshotFromVoiceChannel(channel:VoiceChannel): ChannelSnapshot | undefined {
    if (channel) {
      const result:ChannelSnapshot = {} as any;
      result.channelId = channel.id;
      result.channelName = channel.name;
      result.timestamp = new Date();
      result.members = this.membersFromVoiceChannel(channel);
      return result;
    }
  }
  private membersFromVoiceChannel(channel:VoiceChannel):UserSnapshot[] {
    return channel.members.map(member => ({
      userId:member.id,
      username:member.user.username,
      voiceState: this.memberVoiceState(channel, member),
    }));
  }
  private memberVoiceState(channel:VoiceChannel, member:GuildMember) : 'DEAF' | 'MUTED' | 'ACTIVE' {
    if (channel.id === '330466518771040258' || member.deaf) {
      return 'DEAF';
    }
    if (member.mute) {
      return 'MUTED';
    }
    return 'ACTIVE';
  }
}
