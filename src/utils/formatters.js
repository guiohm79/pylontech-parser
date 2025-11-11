/**
 * Fonctions utilitaires de formatage
 */

/**
 * Génère un timestamp formaté pour les noms de fichiers
 * @returns {string} Timestamp au format YYYY-MM-DDTHH-MM-SS
 */
export const getFileTimestamp = () => {
  return new Date().toISOString().slice(0, 19).replace(/:/g, '-');
};

/**
 * Télécharge un contenu sous forme de fichier
 * @param {string} content - Contenu à télécharger
 * @param {string} filename - Nom du fichier
 * @param {string} mimeType - Type MIME du fichier
 */
export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Formate un nombre en string avec décimales fixes
 * @param {number} value - Valeur à formater
 * @param {number} decimals - Nombre de décimales
 * @returns {string} Nombre formaté
 */
export const formatNumber = (value, decimals = 2) => {
  return value.toFixed(decimals);
};

/**
 * Convertit mV en V
 * @param {number} milliVolts - Valeur en millivolts
 * @returns {number} Valeur en volts
 */
export const mvToV = (milliVolts) => {
  return milliVolts / 1000;
};

/**
 * Convertit mA en A
 * @param {number} milliAmps - Valeur en milliampères
 * @returns {number} Valeur en ampères
 */
export const maToA = (milliAmps) => {
  return milliAmps / 1000;
};

/**
 * Convertit milli-°C en °C
 * @param {number} milliCelsius - Valeur en milli-degrés Celsius
 * @returns {number} Valeur en degrés Celsius
 */
export const mCtoC = (milliCelsius) => {
  return milliCelsius / 1000;
};
