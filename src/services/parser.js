/**
 * Service de parsing pour les fichiers historique Pylontech
 */

import { HISTORY_ENTRY_INTERVAL_MS } from '../constants/thresholds';

/**
 * Génère un ID unique de batterie à partir du nom de fichier
 * @param {string} filename - Nom du fichier
 * @returns {string} ID de la batterie
 */
export const generateBatteryId = (filename) => {
  const match = filename.match(/[HK]([A-Z0-9]+)_history/);
  return match ? match[1] : filename.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
};

/**
 * Extrait la date et l'heure du nom de fichier
 * Format attendu: [H|K]{serial}_history_{YYYYMMDDHHMMSS}.txt
 * @param {string} filename - Nom du fichier
 * @returns {Date|null} Date extraite ou null
 */
export const extractFileDatetime = (filename) => {
  const match = filename.match(/[HK][A-Z0-9]+_history_(\d{14})\.txt$/i);
  if (match) {
    const dateStr = match[1]; // YYYYMMDDHHMMSS
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const minute = dateStr.substring(10, 12);
    const second = dateStr.substring(12, 14);

    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  }
  return null;
};

/**
 * Corrige les dates d'historique en utilisant la date du fichier
 * @param {Array} history - Tableau des entrées d'historique
 * @param {Date} fileDate - Date du fichier
 * @returns {Array} Historique avec dates corrigées
 */
export const correctHistoryDates = (history, fileDate) => {
  if (!fileDate || history.length === 0) return history;

  return history.map((entry, index) => {
    // Utiliser la date du fichier comme référence et soustraire l'index pour remonter dans le temps
    // En supposant une fréquence d'enregistrement (ex: toutes les minutes)
    const correctedDate = new Date(fileDate.getTime() - (history.length - 1 - index) * HISTORY_ENTRY_INTERVAL_MS);

    return {
      ...entry,
      correctedDay: correctedDate.toLocaleDateString('fr-FR'),
      correctedTime: correctedDate.toLocaleTimeString('fr-FR', { hour12: false }),
      originalDay: entry.day,
      originalTime: entry.time,
      useCorrectedDate: true
    };
  });
};

/**
 * Parse les données détaillées des cellules depuis une ligne d'historique
 * @param {Array} parts - Parties de la ligne splitées
 * @returns {Object} Données des cellules
 */
const parseCellData = (parts) => {
  const cellVoltages = [];
  const cellTemperatures = [];
  const cellStates = [];
  const cellPercentages = [];

  // Chercher le démarrage des données de cellules
  let startIndex = -1;

  // Chercher l'index de "50000" puis le premier "1" qui suit
  for (let i = 17; i < parts.length - 1; i++) {
    if (parts[i] === '50000' && parts[i + 1] === '1') {
      startIndex = i + 1; // Commencer au "1" (première cellule)
      break;
    }
  }

  // Si on ne trouve pas "50000", chercher juste le premier "1" après l'index 17
  if (startIndex === -1) {
    for (let i = 17; i < parts.length; i++) {
      if (parts[i] === '1' && i + 5 < parts.length) {
        startIndex = i;
        break;
      }
    }
  }

  // Parser les 15 cellules si on a trouvé le point de départ
  if (startIndex !== -1) {
    // Parser les 15 cellules (chaque cellule = 6 éléments: numéro, tension, température, état1, état2, pourcentage)
    for (let cellNum = 0; cellNum < 15; cellNum++) {
      const baseIndex = startIndex + cellNum * 6;

      // Vérifier qu'on ne dépasse pas la longueur du tableau
      if (baseIndex + 5 >= parts.length) break;

      // Vérifier que nous avons bien un numéro de cellule séquentiel
      const cellNumber = parseInt(parts[baseIndex]);
      if (cellNumber === cellNum + 1) {
        const voltage = parseInt(parts[baseIndex + 1]);
        const temperature = parseInt(parts[baseIndex + 2]);
        const state1 = parts[baseIndex + 3];
        const state2 = parts[baseIndex + 4];
        const percentage = parts[baseIndex + 5];

        if (!isNaN(voltage) && voltage > 0) {
          cellVoltages.push(voltage);
        }
        if (!isNaN(temperature)) {
          cellTemperatures.push(temperature);
        }
        cellStates.push({ state1, state2 });
        cellPercentages.push(percentage);
      } else {
        // Si le numéro ne correspond pas, on arrête (structure incorrecte)
        break;
      }
    }
  }

  return {
    voltages: cellVoltages,
    temperatures: cellTemperatures,
    states: cellStates,
    percentages: cellPercentages,
    cellCount: cellVoltages.length
  };
};

/**
 * Parse un fichier historique Pylontech
 * @param {string} content - Contenu du fichier
 * @param {string|null} filename - Nom du fichier
 * @returns {Object} Données parsées
 */
export const parseFile = (content, filename = null) => {
  const lines = content.split('\n');
  const data = {
    info: {},
    stats: {},
    history: [],
    alerts: [],
    filename: filename,
    fileDate: filename ? extractFileDatetime(filename) : null
  };

  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes('info')) {
      currentSection = 'info';
      continue;
    }

    if (line.includes('stat')) {
      currentSection = 'stats';
      continue;
    }

    if (line.includes('data history') || line.includes('datalist history')) {
      currentSection = 'history';
      continue;
    }

    if (currentSection === 'info' && line.includes(':')) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        data.info[key] = value;
        // Extraire l'adresse device pour un nom plus parlant
        if (key.toLowerCase().includes('device address')) {
          data.deviceAddress = value;
        }
      }
    }

    if (currentSection === 'stats' && line.includes(':')) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        data.stats[key] = value;
      }
    }

    if (currentSection === 'history' && line.match(/^\d+\s+/)) {
      const parts = line.split(/\s+/);
      if (parts.length >= 10) {
        const entry = {
          id: parts[0],
          day: parts[1],
          time: parts[2],
          voltage: parseInt(parts[3]),
          current: parseInt(parts[4]),
          temperature: parseInt(parts[5]),
          tempLow: parseInt(parts[6]),
          tempHigh: parseInt(parts[7]),
          voltageLowest: parseInt(parts[8]),
          voltageHighest: parseInt(parts[9]),
          baseState: parts[10],
          voltageState: parts[11],
          currentState: parts[12],
          tempState: parts[13],
          soc: parts[16]
        };

        // Parser les données détaillées des cellules si disponibles
        if (parts.length > 17) {
          entry.cellData = parseCellData(parts);
        }

        data.history.push(entry);
      }
    }
  }

  // Corriger les dates d'historique si une date de fichier est disponible
  if (data.fileDate && data.history.length > 0) {
    data.history = correctHistoryDates(data.history, data.fileDate);
    data.hasCorrectedDates = true;
  }

  return data;
};

/**
 * Génère un nom d'affichage intelligent pour une batterie
 * @param {Object} batteryData - Données de la batterie
 * @returns {string} Nom d'affichage
 */
export const generateDisplayName = (batteryData) => {
  if (batteryData.deviceAddress) {
    return `Batterie ${batteryData.deviceAddress}`;
  }
  if (batteryData.info && batteryData.info['Device address']) {
    return `Batterie ${batteryData.info['Device address']}`;
  }
  // Fallback sur l'ID de la batterie
  return `Batterie ${batteryData.batteryId.slice(0, 8)}`;
};
