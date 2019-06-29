import mongoose , { model, version } from 'mongoose';

export type VoiceState = 'ACTIVE' | 'INACTIVE' | 'MUTED';
export interface UserSnapshot{
  userId:string;
  username:string;
  channelId?:string;
  channelName?:string;
  voiceState:VoiceState;
  timestamp:Date;
  friends:Number;
}

const schema : mongoose.Schema = new mongoose.Schema({
  userId:{ type:String, required:true },
  username:{ type:String, required:true },
  channelId:{ type:String, required:false },
  channelName:{ type:String, required:false },
  timestamp:{ type:Date, required:true },
  voiceState:{ type:String, required:true },
  friends: { type:String, required: true },
}, { versionKey:false });

export interface UserSnapshotDocument extends UserSnapshot, mongoose.Document {}

// tslint:disable-next-line: variable-name
export const UserSnapshots = model<UserSnapshotDocument>('UserSnapshot', schema);
