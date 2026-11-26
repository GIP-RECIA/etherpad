'use strict'

import crypto from 'crypto'
import log4js from 'log4js'
import settings from './Settings'

const logger = log4js.getLogger('notification')

interface ServiceEvent {
  header: {
    channels: Channel[]
    createdAt: string
    eventId: string
    priority: Priority
    service: string
  },
  content: {
    link: string | undefined
    message: string
    title: string
  },
  target: {
    type: TargetType,
    ids: string[]
  }
}

enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

enum TargetType {
  GROUP = 'GROUP',
  UID = 'UID',
  EMAIL = 'EMAIL',
  LOGIN = 'LOGIN',
}

export enum Channel {
  WEB = 'WEB',
  MAIL = 'MAIL',
  PUSH = 'PUSH',
}

/**
 * Génère un UUID v4
 */
function generateUUID() {
  const bytes = crypto.randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // Variante RFC 4122
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Construit un objet ServiceEvent standardisé pour le producteur Kafka
 * @param {string} service - Le nom du service émetteur (ex: 'PADS')
 * @param {Array<string>} channels - Les canaux de notification (ex: ['WEB', 'MAIL', 'PUSH'])
 * @param {string} title - Le titre de la notification
 * @param {string} message - Le contenu du message
 * @param {string} link - Le lien de redirection
 * @param {string} targetId - L'UID ou l'email de l'utilisateur cible
 * @returns {object} L'objet ServiceEvent conforme au format attendu par l'API
 */
function buildServiceEvent(
  title: string,
  message: string,
  link: string | undefined,
  targetId: string,
  channels?: Channel[],
): ServiceEvent {
  return {
    header: {
      eventId: generateUUID(),
      priority: Priority.NORMAL,
      service: 'MyPads',
      channels: channels || [Channel.WEB, Channel.MAIL, Channel.PUSH],
      createdAt: new Date().toISOString()
    },
    content: {
      title: title,
      message: message,
      link: link
    },
    target: {
      type: TargetType.EMAIL,
      ids: [targetId]
    }
  }
}

async function sendServiceEvent(
  serviceEvent: ServiceEvent,
): Promise<void> {
  const { apiUrl, apiKey } = settings.notifications ?? {}
  if (!apiUrl || !apiKey) {
    logger.info(`Notifications settings are not defined`)
    return
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(serviceEvent),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok)
      throw new Error(response.statusText)

    logger.info(`Notification '${serviceEvent.content.title}' sent to '${serviceEvent.target.ids.join(', ')}': ${response.status}`)
  } catch (err) {
    logger.error(`Error while sending notification '${serviceEvent.content.title}' to '${serviceEvent.target.ids.join(', ')}': ${err}`)
  }
}

export {
  buildServiceEvent,
  sendServiceEvent
}
