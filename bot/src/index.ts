import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AttendanceBot } from './AttendanceBot';

dotenv.config();

connect();

function connect() {
  mongoose.connection
    .on('connect', () => { console.log('connected'); })
    .on('error', console.error)
    .once('open', start);
  return mongoose.connect(process.env.MONGODB_URI!, { useNewUrlParser: true });
}

function start() {
  new AttendanceBot(process.env.DISCORD_TOKEN!);
}
