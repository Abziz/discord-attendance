import mongoose , { model } from 'mongoose';

export interface ChannelSnapshot extends mongoose.Document {
  channelId:string;
  channelName:string;
  timestamp:Date;
  members:UserSnapshot[];
}
export interface UserSnapshot {
  userId: string;
  username: string;
  voiceState: 'ACTIVE' | 'MUTED' | 'DEAF';
}

const schema : mongoose.Schema = new mongoose.Schema({
  channelId:{ type:String, required:true },
  channelName:{ type:String, required:true },
  timestamp:{ type:Date, required:true },
  members:[{
    userId:{
      type:String,
      required:true,
    },
    username:{
      type:String,
      required:true,
    },
    voiceState:{
      type:String,
      required:true,
    },
  }],
});

export interface ChannelSnapshotDocument extends ChannelSnapshot, mongoose.Document {}

// tslint:disable-next-line: variable-name
export const ChannelSnapshots = model<ChannelSnapshotDocument>('ChannelSnapshot', schema);
