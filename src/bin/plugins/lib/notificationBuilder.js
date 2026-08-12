const crypto = require('crypto');

/**
 * Génère un UUID v4 compatible avec Node v12
 */
function generateUUID() {
    const bytes = crypto.randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variante RFC 4122
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Construit un objet ServiceEvent standardisé pour le producteur Kafka
 * @param {string} service - Le nom du service émetteur (ex: 'PADS')
 * @param {Array<string>} channels - Les canaux de notification (ex: ['WEB'])
 * @param {string} title - Le titre de la notification
 * @param {string} message - Le contenu du message
 * @param {string} link - Le lien de redirection
 * @param {string} targetId - L'UID ou l'email de l'utilisateur cible
 * @returns {object} L'objet ServiceEvent conforme au format attendu par l'API
 */
function buildServiceEvent(service, channels, title, message, link, targetId) {
    return {
        header: {
            eventId: generateUUID(),
            priority: "NORMAL",
            service: service || 'PADS',
            channels: channels || ['WEB'],
            createdAt: new Date().toISOString()
        },
        content: {
            title: title,
            message: message,
            link: link
        },
        target: {
            type: 'EMAIL',
            ids: [targetId]
        }
    };
}

module.exports = { buildServiceEvent };