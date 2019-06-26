import mongoose, { Schema } from 'mongoose';
const UserSchema = new Schema({
   display_name: {type: String, index: true, required: true},
   discord_tag: {type: String, index: true, required: true},
   last_online: {type: Date},
   points: {type: Number, required: true, default: 0}
});
export const User = mongoose.model('User', UserSchema);
