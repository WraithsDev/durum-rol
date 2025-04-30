const { Client, GatewayIntentBits, Events, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates 
    ]
});

require('./events/ready')(client, config);
require('./events/voiceStateUpdate')(client, config);

client.on(Events.PresenceUpdate, (oldPresence, newPresence) => {
    const member = newPresence.member;
    if (!member) return;

    // Kullanıcı görünmez değilse (online, idle, dnd) durumunu kontrol et
    if (['online', 'idle', 'dnd'].includes(member.presence?.status)) {
        const newPresenceStatuses = newPresence.activities
            .filter(activity => activity.type === 4) // 4: CUSTOM_STATUS
            .map(activity => activity.state ? activity.state.trim() : 'Boş');

        const presenceText = config.durum.trim();

        if (config.surum === "eski") {
            // Eski işleyiş: Durum içeriğinde belirli bir metin olup olmadığını kontrol et
            if (newPresenceStatuses.some(status => status.includes(presenceText))) {
                if (!member.roles.cache.has(config.rolid)) {
                    addRoleToMember(member);
                }
            } else {
                if (member.roles.cache.has(config.rolid)) {
                    removeRoleFromMember(member);
                }
            }
        } else if (config.surum === "yeni") {
            // Yeni işleyiş: Tam eşleşme durumunu kontrol et
            if (newPresenceStatuses.includes(presenceText)) {
                if (!member.roles.cache.has(config.rolid)) {
                    addRoleToMember(member);
                }
            } else {
                if (member.roles.cache.has(config.rolid)) {
                    removeRoleFromMember(member);
                }
            }
        }
    } else {
        // Kullanıcı görünmez ise rolü kontrol etme
        // Burada görünmez olan kullanıcıların rolünü almıyoruz
    }
});

async function checkAllMembersPresence(guild) {
    const members = await guild.members.fetch();
    members.forEach(member => {
        if (['online', 'idle', 'dnd'].includes(member.presence?.status)) {
            const presenceText = config.durum.trim();
            const presenceStatuses = member.presence.activities
                .filter(activity => activity.type === 4) // 4: CUSTOM_STATUS
                .map(activity => activity.state ? activity.state.trim() : 'Boş');

            if (config.surum === "eski") {
                // Eski işleyiş
                if (presenceStatuses.some(status => status.includes(presenceText))) {
                    addRoleToMember(member);
                } else {
                    removeRoleFromMember(member);
                }
            } else if (config.surum === "yeni") {
                // Yeni işleyiş
                if (presenceStatuses.includes(presenceText)) {
                    addRoleToMember(member);
                } else {
                    removeRoleFromMember(member);
                }
            }
        }
    });
}

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

client.login(config.token);
