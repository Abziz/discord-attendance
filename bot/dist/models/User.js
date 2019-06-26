"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    display_name: { type: String, index: true, required: true },
    discord_tag: { type: String, index: true, required: true },
    last_online: { type: Date },
    points: { type: Number, required: true, default: 0 }
});
exports.User = mongoose_1.default.model('User', UserSchema);
