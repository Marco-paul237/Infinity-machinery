/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : api/stats.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Point d'entrée direct Vercel Serverless pour /api/stats (Indicateurs clés du tableau de bord).
 * ========================================================================================
 */

const handler = require('./index.js');

module.exports = async function statsHandler(req, res) {
  if (!req.url || req.url === '/' || req.url === '') {
    req.url = '/api/stats';
  } else if (!req.url.startsWith('/api/stats')) {
    req.url = '/api/stats' + (req.url.startsWith('?') ? req.url : '/' + req.url);
  }
  return handler(req, res);
};
