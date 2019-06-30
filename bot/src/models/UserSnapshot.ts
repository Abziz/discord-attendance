import mongoose , { model } from 'mongoose';
const mongooseSequence = require('mongoose-sequence')(mongoose);
export type VoiceState = 'ACTIVE' | 'INACTIVE' | 'MUTED' | 'ALONE';
export interface UserSnapshot{
  userId:string;
  username:string;
  channelId?:string;
  channelName?:string;
  voiceState:VoiceState;
  timestamp:Date;
}

const schema : mongoose.Schema = new mongoose.Schema({
  _id:{ type:Number },
  userId:{ type:String, required:true },
  username:{ type:String, required:true },
  channelId:{ type:String, required:false },
  channelName:{ type:String, required:false },
  timestamp:{ type:Date, required:true },
  voiceState:{ type:String, required:true },
}, { versionKey:false, _id:false });
schema.plugin(mongooseSequence);
export interface UserSnapshotDocument extends UserSnapshot, mongoose.Document {}

// tslint:disable-next-line: variable-name
export const UserSnapshots = model<UserSnapshotDocument>('UserSnapshot', schema);
