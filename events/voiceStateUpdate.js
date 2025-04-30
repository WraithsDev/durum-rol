const { joinVoiceChannel, VoiceConnectionStatus, VoiceConnection } = require('@discordjs/voice');

module.exports = (client, config) => {
    let connection; 

    client.on('voiceStateUpdate', (oldState, newState) => {
        const guild = newState.guild;
        const botVoiceChannel = oldState.channel;
        const userVoiceChannel = newState.channel;

        if (userVoiceChannel && userVoiceChannel.id === config.sesid) {
            
            if (!connection) {
                console.log('Bot sesli kanala bağlanıyor...');
                connection = joinVoiceChannel({
                    channelId: userVoiceChannel.id,
                    guildId: guild.id,
                    adapterCreator: guild.voiceAdapterCreator,
                });

                connection.on(VoiceConnectionStatus.Disconnected, () => {
                    console.log('Bot sesli kanaldan ayrıldı.');
                    setTimeout(() => {
                        
                        reconnectToVoiceChannel(guild, userVoiceChannel);
                    }, 222);
                });

            }
        } else if (botVoiceChannel && botVoiceChannel.id === config.sesid && !userVoiceChannel) {
            
            if (connection) {
                console.log('Bot sesli kanaldan ayrıldı.');
                connection.destroy(); 
                connection = null; 
                setTimeout(() => {
                    reconnectToVoiceChannel(guild, botVoiceChannel);
                }, 222); 
            }
        }
    });

    function reconnectToVoiceChannel(guild, channel) {
        if (!channel) return;
        console.log('Bot sesli kanala tekrar bağlanıyor...');
        connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log('Bot sesli kanala başarıyla tekrar bağlandı.');
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log('Bot sesli kanaldan ayrıldı.');
            setTimeout(() => {
                reconnectToVoiceChannel(guild, channel);
            }, 222);  
        });
    }
};
