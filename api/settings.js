/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : api/settings.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Point d'entrée direct Vercel Serverless pour /api/settings (Paramètres boutique & autobiographie).
 * ========================================================================================
 */

const handler = require('./index.js');

module.exports = async function settingsHandler(req, res) {
  if (!req.url || req.url === '/' || req.url === '') {
    req.url = '/api/settings';
  } else if (!req.url.startsWith('/api/settings')) {
    req.url = '/api/settings' + (req.url.startsWith('?') ? req.url : '/' + req.url);
  }
  return handler(req, res);
};
