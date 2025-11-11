/**
 * Constantes pour les seuils d'alertes des batteries Pylontech
 */

export const DEFAULT_THRESHOLDS = {
  tempWarning: 40,
  tempCritical: 45,
  voltageHigh: 53.2,
  voltageLow: 48.0,
  voltageHighCritical: 54.5,
  voltageLowCritical: 46.0
};

export const DEFAULT_FILTERS = {
  temperatureAlert: true,
  voltageAlert: true,
  normalOnly: false,
  showNormalOnly: false,
  showAlertsOnly: false
};

export const DEFAULT_CELL_IMBALANCE_FILTERS = {
  showOnlyImbalanced: false,
  showCellVoltages: false,
  imbalanceThreshold: 20 // mV
};

export const APP_VERSION = 'Pylontech Parser v1.5';

export const BATTERY_CYCLE_LIMIT = 8000; // Cycles de vie nominaux d'une batterie Pylontech

export const CELL_COUNT = 15; // Nombre de cellules dans une batterie Pylontech 48V

export const HISTORY_ENTRY_INTERVAL_MS = 60000; // 1 minute entre chaque entrée d'historique
