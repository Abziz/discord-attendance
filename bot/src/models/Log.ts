import mongoose, { Schema } from 'mongoose';
const LogSchema = new Schema({
  event: { type: String, index: true, required: true },
  time: { type: Date, index: true, required: true },
});
export const Log = mongoose.model('Log', LogSchema);
