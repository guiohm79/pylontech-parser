/**
 * Service d'export de données
 */

import { getFileTimestamp, downloadFile, mvToV, maToA, mCtoC } from '../utils/formatters';
import { APP_VERSION } from '../constants/thresholds';

/**
 * Exporte une batterie au format CSV
 * @param {Object} batteryData - Données de la batterie
 * @param {Object} thresholds - Seuils configurés
 */
export const exportToCSV = (batteryData, thresholds) => {
  if (!batteryData) return;

  const timestamp = getFileTimestamp();
  const filename = `pylontech-export-${timestamp}.csv`;

  const csvHeader = 'Date,Heure,Tension(V),Courant(A),Temperature(°C),SOC,Etat,TempAlert,VoltageAlert\n';
  const csvData = batteryData.history.map(entry => {
    const tempC = mCtoC(entry.temperature).toFixed(1);
    const voltageV = mvToV(entry.voltage).toFixed(2);
    const currentA = maToA(entry.current).toFixed(2);
    const tempAlert = tempC > thresholds.tempWarning;
    const voltageAlert = voltageV > thresholds.voltageHigh || voltageV < thresholds.voltageLow;
    return `${entry.day},${entry.time},${voltageV},${currentA},${tempC},${entry.soc},${entry.baseState},${tempAlert},${voltageAlert}`;
  }).join('\n');

  const content = csvHeader + csvData;
  downloadFile(content, filename, 'text/csv');
};

/**
 * Exporte une batterie au format JSON
 * @param {Object} batteryData - Données de la batterie
 * @param {Object} thresholds - Seuils configurés
 */
export const exportToJSON = (batteryData, thresholds) => {
  if (!batteryData) return;

  const timestamp = getFileTimestamp();
  const filename = `pylontech-export-${timestamp}.json`;

  const exportData = {
    exportDate: new Date().toISOString(),
    systemInfo: batteryData.info,
    statistics: batteryData.stats,
    alerts: batteryData.alerts,
    history: batteryData.history.map(entry => ({
      ...entry,
      temperatureC: mCtoC(entry.temperature),
      voltageV: mvToV(entry.voltage),
      currentA: maToA(entry.current)
    })),
    thresholds: thresholds
  };

  const content = JSON.stringify(exportData, null, 2);
  downloadFile(content, filename, 'application/json');
};

/**
 * Exporte toutes les batteries au format JSON
 * @param {Array} loadedBatteries - Liste des batteries chargées
 * @param {Object} thresholds - Seuils configurés
 */
export const exportAllBatteries = (loadedBatteries, thresholds) => {
  if (loadedBatteries.length === 0) {
    alert('Aucune batterie à exporter');
    return;
  }

  const timestamp = getFileTimestamp();
  const exportData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    appVersion: APP_VERSION,
    batteriesCount: loadedBatteries.length,
    thresholds: thresholds,
    batteries: loadedBatteries.map(battery => ({
      ...battery,
      exportedAt: new Date().toISOString()
    }))
  };

  const content = JSON.stringify(exportData, null, 2);
  const filename = `pylontech-battery-history-${timestamp}.json`;
  downloadFile(content, filename, 'application/json');
};

/**
 * Génère un rapport PDF HTML
 * @param {Object} batteryData - Données de la batterie
 * @returns {string} HTML du rapport
 */
export const generateReport = (batteryData) => {
  if (!batteryData) return;

  const now = new Date();
  const reportData = {
    generatedAt: now.toLocaleString('fr-FR'),
    systemInfo: batteryData.info,
    statistics: batteryData.stats,
    totalEntries: batteryData.history.length,
    alertsSummary: {
      total: batteryData.alerts.length,
      critical: batteryData.alerts.filter(a => a.type === 'critical').length,
      warning: batteryData.alerts.filter(a => a.type === 'warning').length
    },
    dataRange: {
      from: batteryData.history[0]?.day + ' ' + batteryData.history[0]?.time,
      to: batteryData.history[batteryData.history.length - 1]?.day + ' ' + batteryData.history[batteryData.history.length - 1]?.time
    },
    temperatureStats: {
      avg: (batteryData.history.reduce((acc, entry) => acc + entry.temperature, 0) / batteryData.history.length / 1000).toFixed(1),
      max: (Math.max(...batteryData.history.map(entry => entry.temperature)) / 1000).toFixed(1),
      min: (Math.min(...batteryData.history.map(entry => entry.temperature)) / 1000).toFixed(1)
    },
    voltageStats: {
      avg: (batteryData.history.reduce((acc, entry) => acc + entry.voltage, 0) / batteryData.history.length / 1000).toFixed(2),
      max: (Math.max(...batteryData.history.map(entry => entry.voltage)) / 1000).toFixed(2),
      min: (Math.min(...batteryData.history.map(entry => entry.voltage)) / 1000).toFixed(2)
    }
  };

  const reportHtml = `
    <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport Batterie Pylontech</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2c3e50; }
          .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
          .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .stat-item { padding: 10px; background: #f5f5f5; }
          .critical { color: red; }
          .warning { color: orange; }
        </style>
      </head>
      <body>
        <h1>Rapport d'Analyse Batterie Pylontech</h1>
        <p>Généré le: ${reportData.generatedAt}</p>

        <div class="section">
          <h2>Informations Système</h2>
          ${Object.entries(reportData.systemInfo).map(([key, value]) =>
            `<p><strong>${key}:</strong> ${value}</p>`
          ).join('')}
        </div>

        <div class="section">
          <h2>Statistiques</h2>
          ${Object.entries(reportData.statistics).map(([key, value]) =>
            `<p><strong>${key}:</strong> ${value}</p>`
          ).join('')}
        </div>

        <div class="section">
          <h2>Résumé des Alertes</h2>
          <div class="stat-grid">
            <div class="stat-item">Total: ${reportData.alertsSummary.total}</div>
            <div class="stat-item critical">Critiques: ${reportData.alertsSummary.critical}</div>
            <div class="stat-item warning">Avertissements: ${reportData.alertsSummary.warning}</div>
          </div>
        </div>

        <div class="section">
          <h2>Statistiques de Température</h2>
          <div class="stat-grid">
            <div class="stat-item">Moyenne: ${reportData.temperatureStats.avg}°C</div>
            <div class="stat-item">Maximum: ${reportData.temperatureStats.max}°C</div>
            <div class="stat-item">Minimum: ${reportData.temperatureStats.min}°C</div>
          </div>
        </div>

        <div class="section">
          <h2>Statistiques de Tension</h2>
          <div class="stat-grid">
            <div class="stat-item">Moyenne: ${reportData.voltageStats.avg}V</div>
            <div class="stat-item">Maximum: ${reportData.voltageStats.max}V</div>
            <div class="stat-item">Minimum: ${reportData.voltageStats.min}V</div>
          </div>
        </div>

        <div class="section">
          <h2>Plage de Données</h2>
          <p>De: ${reportData.dataRange.from}</p>
          <p>À: ${reportData.dataRange.to}</p>
          <p>Total d'entrées: ${reportData.totalEntries}</p>
        </div>
      </body>
    </html>
  `;

  // Ouvrir dans une nouvelle fenêtre pour impression
  const printWindow = window.open('', '_blank');
  printWindow.document.write(reportHtml);
  printWindow.document.close();
  printWindow.print();
};

/**
 * Exporte les données selon le format demandé
 * @param {string} format - Format d'export (csv, json)
 * @param {Object} batteryData - Données de la batterie
 * @param {Object} thresholds - Seuils configurés
 */
export const exportData = (format, batteryData, thresholds) => {
  switch (format) {
    case 'csv':
      exportToCSV(batteryData, thresholds);
      break;
    case 'json':
      exportToJSON(batteryData, thresholds);
      break;
    default:
      console.error('Format d\'export non supporté:', format);
  }
};
