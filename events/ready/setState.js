const { ActivityType } = require("discord.js");

module.exports = (client) => {
  client.user.setActivity({
    name: "discord 봇 개발 공부",
    type: ActivityType.Playing,
  });
};