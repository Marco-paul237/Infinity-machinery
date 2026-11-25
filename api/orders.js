/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : api/orders.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Point d'entrée direct Vercel Serverless pour /api/orders.
 * ========================================================================================
 */

const handler = require('./index.js');

module.exports = async function ordersHandler(req, res) {
  if (!req.url || req.url === '/' || req.url === '') {
    req.url = '/api/orders';
  } else if (!req.url.startsWith('/api/orders')) {
    req.url = '/api/orders' + (req.url.startsWith('?') ? req.url : '/' + req.url);
  }
  return handler(req, res);
};
