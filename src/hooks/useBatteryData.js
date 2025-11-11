/**
 * Hook pour gérer l'état et les opérations sur les batteries
 */

import { useState, useCallback } from 'react';
import { parseFile, generateBatteryId, generateDisplayName } from '../services/parser';
import { generateAlerts } from '../services/alerts';

/**
 * Hook custom pour gérer les données des batteries
 * @param {Object} thresholds - Seuils configurés
 * @returns {Object} État et fonctions de gestion des batteries
 */
export const useBatteryData = (thresholds) => {
  const [parsedData, setParsedData] = useState(null);
  const [loadedBatteries, setLoadedBatteries] = useState([]);
  const [selectedBatteryId, setSelectedBatteryId] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  const [editingBatteryId, setEditingBatteryId] = useState(null);
  const [editingName, setEditingName] = useState('');

  /**
   * Parse et ajoute des fichiers batteries
   */
  const addBatteryFiles = useCallback((files) => {
    const newBatteries = [];

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedFileData = parseFile(e.target.result, file.name);
          const batteryId = generateBatteryId(file.name);

          // Vérifier si cette batterie existe déjà
          const existingBattery = loadedBatteries.find(b => b.batteryId === batteryId);
          if (existingBattery) {
            alert(`La batterie ${batteryId} est déjà chargée. Utilisez un fichier différent.`);
            return;
          }

          // Générer les alertes
          const alerts = generateAlerts(parsedFileData.history, thresholds);

          const batteryData = {
            ...parsedFileData,
            batteryId,
            displayName: generateDisplayName(parsedFileData),
            alerts,
            loadedAt: new Date().toISOString()
          };

          newBatteries.push(batteryData);

          // Mettre à jour l'état
          setLoadedBatteries(prev => [...prev, batteryData]);

          // Si c'est la première batterie, la sélectionner
          if (loadedBatteries.length === 0 && newBatteries.length === 1) {
            setSelectedBatteryId(batteryId);
            setParsedData(batteryData);
          }
        } catch (error) {
          console.error('Erreur lors du parsing:', error);
          alert(`Erreur lors du parsing du fichier ${file.name}: ${error.message}`);
        }
      };
      reader.readAsText(file);
    });
  }, [loadedBatteries, thresholds]);

  /**
   * Sélectionne une batterie
   */
  const selectBattery = useCallback((batteryId) => {
    const battery = loadedBatteries.find(b => b.batteryId === batteryId);
    if (battery) {
      setSelectedBatteryId(batteryId);
      setParsedData(battery);
    }
  }, [loadedBatteries]);

  /**
   * Supprime une batterie
   */
  const removeBattery = useCallback((batteryId) => {
    setLoadedBatteries(prev => prev.filter(b => b.batteryId !== batteryId));

    // Si la batterie supprimée était sélectionnée, sélectionner une autre
    if (selectedBatteryId === batteryId) {
      const remaining = loadedBatteries.filter(b => b.batteryId !== batteryId);
      if (remaining.length > 0) {
        setSelectedBatteryId(remaining[0].batteryId);
        setParsedData(remaining[0]);
      } else {
        setSelectedBatteryId(null);
        setParsedData(null);
      }
    }
  }, [loadedBatteries, selectedBatteryId]);

  /**
   * Renomme une batterie
   */
  const renameBattery = useCallback((batteryId, newName) => {
    setLoadedBatteries(prev => prev.map(battery =>
      battery.batteryId === batteryId
        ? { ...battery, displayName: newName }
        : battery
    ));

    // Mettre à jour parsedData si c'est la batterie sélectionnée
    if (selectedBatteryId === batteryId && parsedData) {
      setParsedData(prev => ({ ...prev, displayName: newName }));
    }

    setEditingBatteryId(null);
    setEditingName('');
  }, [selectedBatteryId, parsedData]);

  /**
   * Démarre l'édition d'un nom de batterie
   */
  const startEditing = useCallback((batteryId, currentName) => {
    setEditingBatteryId(batteryId);
    setEditingName(currentName);
  }, []);

  /**
   * Annule l'édition d'un nom
   */
  const cancelEditing = useCallback(() => {
    setEditingBatteryId(null);
    setEditingName('');
  }, []);

  /**
   * Charge des batteries depuis la base de données
   */
  const setLoadedBatteriesFromDB = useCallback((batteries) => {
    setLoadedBatteries(batteries);

    // Sélectionner la première batterie si aucune n'est sélectionnée
    if (batteries.length > 0 && !selectedBatteryId) {
      setSelectedBatteryId(batteries[0].batteryId);
      setParsedData(batteries[0]);
    }
  }, [selectedBatteryId]);

  /**
   * Bascule le mode comparaison
   */
  const toggleComparison = useCallback(() => {
    setShowComparison(prev => !prev);
  }, []);

  return {
    parsedData,
    loadedBatteries,
    selectedBatteryId,
    showComparison,
    editingBatteryId,
    editingName,
    addBatteryFiles,
    selectBattery,
    removeBattery,
    renameBattery,
    startEditing,
    cancelEditing,
    setLoadedBatteriesFromDB,
    toggleComparison,
    setParsedData,
    setSelectedBatteryId
  };
};
