/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : api/repairs.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Point d'entrée direct Vercel Serverless pour /api/repairs (Demandes de diagnostic atelier).
 * ========================================================================================
 */

const handler = require('./index.js');

module.exports = async function repairsHandler(req, res) {
  if (!req.url || req.url === '/' || req.url === '') {
    req.url = '/api/repairs';
  } else if (!req.url.startsWith('/api/repairs')) {
    req.url = '/api/repairs' + (req.url.startsWith('?') ? req.url : '/' + req.url);
  }
  return handler(req, res);
};
