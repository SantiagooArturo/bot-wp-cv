const express = require('express');
const bodyParser = require('body-parser');
const config = require('./config');
const bot = require('./bot');
const handlers = require('./handlers');
const logger = require('../utils/logger');

const app = express();
app.use(bodyParser.json());

// Verificación del webhook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Webhook verification request received', { mode, token });

  if (mode && token) {
    if (mode === 'subscribe' && token === config.verifyToken) {
      logger.info('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      logger.error('Webhook verification failed', { mode, token });
      res.sendStatus(403);
    }
  }
});

// Manejo de mensajes
app.post('/webhook', async (req, res) => {
  try {
    logger.info('========== WEBHOOK REQUEST BODY ============');
    logger.info(JSON.stringify(req.body, null, 2));
    logger.info('===========================================');
    
    const message = await bot.handleWebhook(req.body);
    
    if (!message) {
      logger.info('No message to process');
      return res.sendStatus(200);
    }

    logger.info('Processing message', { message });

    const { from, type, text, document, image, audio, video } = message;
    
    if (document) {
      logger.info('Document details:', JSON.stringify(document, null, 2));
    }

    switch (type) {
      case 'text':
        logger.info('Handling text message', { from, text });
        if (text === '!start') {
          await handlers.handleStart(from);
        } else {
          await handlers.handleText(from, text);
        }
        break;
      case 'document':
        logger.info('Handling document message', { from, document });
        await handlers.handleDocument(from, document);
        break;
      case 'image':
        logger.info('Handling image message', { from, image });
        await handlers.handleImage(from, image);
        break;
      case 'audio':
        logger.info('Handling audio message', { from, audio });
        await handlers.handleAudio(from, audio);
        break;
      case 'video':
        logger.info('Handling video message', { from, video });
        await handlers.handleVideo(from, video);
        break;
      case 'button':
      case 'interactive':
        logger.info('Handling interactive message', { from, text });
        await handlers.handleText(from, text || 'Mensaje interactivo');
        break;
      default:
        logger.info('Handling unknown message type', { from, type });
        await handlers.handleUnknown(from);
    }

    res.sendStatus(200);
  } catch (error) {
    logger.error(`Error processing webhook: ${error.message}`, { error });
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`WhatsApp bot server is running on port ${PORT}`);
}); 