/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : api/inventory.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Point d'entrée direct Vercel Serverless pour /api/inventory.
 * Permet à Vercel de router immédiatement les requêtes GET et POST sur /api/inventory
 * sans passer par un rewrite.
 * ========================================================================================
 */

const handler = require('./index.js');

module.exports = async function inventoryHandler(req, res) {
  // S'assurer que le pathname commence par /api/inventory
  if (!req.url || req.url === '/' || req.url === '') {
    req.url = '/api/inventory';
  } else if (!req.url.startsWith('/api/inventory')) {
    req.url = '/api/inventory' + (req.url.startsWith('?') ? req.url : '/' + req.url);
  }
  return handler(req, res);
};
