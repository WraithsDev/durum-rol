const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const { ChannelType, ActivityType, EmbedBuilder } = require('discord.js');

module.exports = async (client, config) => {
    client.once('ready', async () => {
        console.log('Bot hazır!');
        const guild = client.guilds.cache.get(config.guildid);

        if (guild) {
            const channel = guild.channels.cache.get(config.sesid);
            if (channel && channel.type === ChannelType.GuildVoice) {
                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                });

                connection.on(VoiceConnectionStatus.Ready, () => {
                    console.log('Bot sesli kanala başarıyla bağlandı.');
                });

                connection.on(VoiceConnectionStatus.Disconnected, () => {
                    console.log('Bot sesli kanaldan ayrıldı.');
                });

                connection.on('error', (error) => {
                    console.error('Sesli kanalda hata: ', error);
                });
            } else {
                console.error('Sesli kanal bulunamadı veya geçersiz kanal türü.');
            }

            // Oynuyor mesajını ayarlama
            try {
                const activityName = config.activity;
                const activityType = config.type.toLowerCase();

                const activityTypeMap = {
                    'playing': ActivityType.Playing,
                    'streaming': ActivityType.Streaming,
                    'listening': ActivityType.Listening,
                    'watching': ActivityType.Watching,
                    'custom': ActivityType.Custom,
                    'competing': ActivityType.Competing
                };

                const activityTypeEnum = activityTypeMap[activityType] || ActivityType.Playing;

                await client.user.setPresence({
                    activities: [{ name: activityName, type: activityTypeEnum }],
                    status: 'online'
                });
                console.log('Oynuyor mesajı ayarlandı.');
            } catch (error) {
                console.error('Oynuyor mesajı ayarlanırken hata: ', error);
            }

            // Sürüm kontrolü
            if (config.surum === "yeni") {
                // Yeni işleyiş - Tam eşleşme
                try {
                    const members = await guild.members.fetch();
                    members.forEach(member => {
                        if (member.presence) {
                            const presenceText = config.durum.trim();
                            const presenceStatuses = member.presence.activities
                                .filter(activity => activity.type === ActivityType.Custom)
                                .map(activity => activity.state ? activity.state.trim() : 'Boş');

                            if (presenceStatuses.includes(presenceText)) {
                                addRoleToMember(member);
                            } else {
                                removeRoleFromMember(member);
                            }
                        }
                    });
                } catch (error) {
                    console.error('Üyelerin özel durumları kontrol edilirken hata: ', error);
                }
            } else if (config.surum === "eski") {
                // Eski işleyiş - İçerme kontrolü
                try {
                    const members = await guild.members.fetch();
                    members.forEach(member => {
                        if (member.presence) {
                            const presenceText = config.durum.trim();
                            const presenceStatuses = member.presence.activities
                                .filter(activity => activity.type === ActivityType.Custom)
                                .map(activity => activity.state ? activity.state.trim() : 'Boş');

                            if (presenceStatuses.some(status => status.includes(presenceText))) {
                                addRoleToMember(member);
                            } else {
                                removeRoleFromMember(member);
                            }
                        }
                    });
                } catch (error) {
                    console.error('Üyelerin özel durumları kontrol edilirken hata: ', error);
                }
            }
        }
    });

    function addRoleToMember(member) {
        if (!member.roles.cache.has(config.rolid)) {
            member.roles.add(config.rolid).then(() => {
                sendRoleChangeEmbed(member, 'Rol Verildi!', `Hoş geldin! ${member.user.username}`, new Date());
            }).catch(error => {
                console.error(`Rol verilirken hata: ${error}`);
            });
        }
    }

    function removeRoleFromMember(member) {
        if (member.roles.cache.has(config.rolid)) {
            member.roles.remove(config.rolid).then(() => {
                sendRoleChangeEmbed(member, 'Rol Alındı!', `Üzgünüz! ${member.user.username}`, new Date());
            }).catch(error => {
                console.error(`Rol alınırken hata: ${error}`);
            });
        }
    }

    async function sendRoleChangeEmbed(member, title, description, date) {
        const role = member.guild.roles.cache.get(config.rolid);
        const roleName = role ? role.name : 'Rol Bulunamadı';

        const embed = new EmbedBuilder()
            .setColor(title === 'Rol Verildi!' ? '#00FF00' : '#FF0000')
            .setTitle(title)
            .setDescription(description)
            .addFields([
                { name: 'Üye', value: member.user.username, inline: true },
                { name: 'Rol Adı', value: roleName, inline: true }
            ])
            .setThumbnail(member.user.displayAvatarURL({ format: 'png', dynamic: true }))
            .setFooter({ text: `Tarih: ${date.toLocaleString('tr-TR')}` })
            .setTimestamp();

        const logChannel = member.guild.channels.cache.get(config.logid);
        if (logChannel) {
            logChannel.send({ embeds: [embed] }).catch(console.error);
        }
    }
};
