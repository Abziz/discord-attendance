import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AttendanceBot } from './AttendanceBot';
dotenv.config();

mongoose.connection.on('open', () => {
  new AttendanceBot(process.env.DISCORD_TOKEN!);
});
mongoose.connect(process.env.MONGODB_URI!, { useNewUrlParser: true });
