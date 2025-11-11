/**
 * Service de génération et gestion des alertes
 */

/**
 * Génère des alertes basées sur l'historique et les seuils configurés
 * @param {Array} history - Historique des entrées
 * @param {Object} thresholds - Seuils configurés
 * @returns {Array} Liste des alertes
 */
export const generateAlerts = (history, thresholds) => {
  const alerts = [];

  history.forEach(entry => {
    const tempC = entry.temperature / 1000;
    const voltageV = entry.voltage / 1000;

    if (tempC > thresholds.tempWarning) {
      const displayTimestamp = entry.useCorrectedDate ?
        `${entry.correctedDay} ${entry.correctedTime}` :
        `${entry.day} ${entry.time}`;

      alerts.push({
        type: tempC > thresholds.tempCritical ? 'critical' : 'warning',
        message: `Température élevée: ${tempC.toFixed(1)}°C`,
        timestamp: displayTimestamp,
        entry: entry
      });
    }

    if (voltageV > thresholds.voltageHigh || voltageV < thresholds.voltageLow) {
      const displayTimestamp = entry.useCorrectedDate ?
        `${entry.correctedDay} ${entry.correctedTime}` :
        `${entry.day} ${entry.time}`;

      alerts.push({
        type: (voltageV > thresholds.voltageHighCritical || voltageV < thresholds.voltageLowCritical) ? 'critical' : 'warning',
        message: `Tension ${voltageV > thresholds.voltageHigh ? 'haute' : 'basse'}: ${voltageV.toFixed(2)}V`,
        timestamp: displayTimestamp,
        entry: entry
      });
    }
  });

  return alerts;
};

/**
 * Filtre les alertes selon les filtres fournis
 * @param {Array} alerts - Liste des alertes
 * @param {Object} filters - Filtres à appliquer
 * @returns {Array} Alertes filtrées
 */
export const filterAlerts = (alerts, filters) => {
  return alerts.filter(alert => {
    if (filters.showAlertsOnly && alert.type === 'info') return false;
    if (!filters.temperatureAlert && alert.message.includes('Température')) return false;
    if (!filters.voltageAlert && alert.message.includes('Tension')) return false;
    return true;
  });
};
