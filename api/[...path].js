/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : api/[...path].js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Routeur catch-all natif Vercel (@vercel/node).
 * Intercepte automatiquement toutes les sous-routes dynamiques /api/* :
 * - /api/inventory/reset
 * - /api/inventory/:id/stock
 * - /api/inventory/:id
 * - /api/orders/:id/status
 * - etc.
 * 
 * Ce fichier évite d'avoir recours à des rewrites fragiles dans vercel.json.
 * ========================================================================================
 */

const handler = require('./index.js');

module.exports = async function catchAllHandler(req, res) {
  return handler(req, res);
};
