/**
 * Hook pour gérer les opérations de base de données
 */

import { useState, useEffect, useCallback } from 'react';
import dbManager from '../database';

/**
 * Hook custom pour gérer la base de données des batteries
 * @returns {Object} Fonctions et état de la base de données
 */
export const useDatabase = () => {
  const [dbStats, setDbStats] = useState({
    batteriesCount: 0,
    totalHistoryEntries: 0,
    totalAlerts: 0,
    databaseSize: 0
  });

  /**
   * Met à jour les statistiques de la base de données
   */
  const updateDbStats = useCallback(async () => {
    try {
      const stats = await dbManager.getDatabaseStats();
      setDbStats(stats);
    } catch (error) {
      console.warn('Erreur lors de la mise à jour des statistiques:', error);
    }
  }, []);

  /**
   * Sauvegarde les batteries dans la base de données
   */
  const saveBatteries = useCallback(async (batteries) => {
    try {
      await dbManager.saveBatteries(batteries);
      await updateDbStats();
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde base de données:', error);
    }
  }, [updateDbStats]);

  /**
   * Charge toutes les batteries depuis la base de données
   */
  const loadBatteries = useCallback(async () => {
    try {
      const batteries = await dbManager.getAllBatteries();
      await updateDbStats();
      return batteries;
    } catch (error) {
      console.warn('Erreur lors du chargement base de données:', error);
      return [];
    }
  }, [updateDbStats]);

  /**
   * Met à jour le nom d'une batterie
   */
  const updateBatteryName = useCallback(async (batteryId, newName) => {
    try {
      const success = await dbManager.updateBatteryName(batteryId, newName);
      if (success) {
        await updateDbStats();
      }
      return success;
    } catch (error) {
      console.error('Erreur lors du renommage:', error);
      return false;
    }
  }, [updateDbStats]);

  /**
   * Supprime une batterie de la base de données
   */
  const deleteBattery = useCallback(async (batteryId) => {
    try {
      const success = await dbManager.deleteBattery(batteryId);
      if (success) {
        await updateDbStats();
      }
      return success;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      return false;
    }
  }, [updateDbStats]);

  /**
   * Vide complètement la base de données
   */
  const clearDatabase = useCallback(async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vider la base de données ? Cette action supprimera toutes les batteries sauvegardées.')) {
      try {
        const success = await dbManager.clearDatabase();
        if (success) {
          await updateDbStats();
          alert('Base de données vidée avec succès');
        } else {
          throw new Error('Erreur lors de la suppression');
        }
        return success;
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de la base de données');
        return false;
      }
    }
    return false;
  }, [updateDbStats]);

  /**
   * Exporte la base de données complète vers JSON
   */
  const exportDatabase = useCallback(async () => {
    try {
      const exportData = await dbManager.exportToJSON();
      if (!exportData) {
        alert('Erreur lors de l\'export de la base de données');
        return null;
      }
      return exportData;
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      alert('Erreur lors de l\'export de la base de données');
      return null;
    }
  }, []);

  /**
   * Importe des données JSON dans la base de données
   */
  const importFromJSON = useCallback(async (importedData) => {
    try {
      const result = await dbManager.importFromJSON(importedData);
      if (result.success) {
        await updateDbStats();
      }
      return result;
    } catch (error) {
      console.error('Erreur lors de l\'import JSON:', error);
      return { success: false, message: 'Erreur lors de l\'import: ' + error.message };
    }
  }, [updateDbStats]);

  // Charger les stats au montage du hook
  useEffect(() => {
    updateDbStats();
  }, [updateDbStats]);

  return {
    dbStats,
    saveBatteries,
    loadBatteries,
    updateBatteryName,
    deleteBattery,
    clearDatabase,
    exportDatabase,
    importFromJSON,
    updateDbStats
  };
};
