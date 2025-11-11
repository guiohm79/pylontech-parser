/**
 * Service d'analyse avancée des batteries
 */

import { BATTERY_CYCLE_LIMIT } from '../constants/thresholds';

/**
 * Calcule le déséquilibre des cellules pour une entrée d'historique
 * @param {Object} entry - Entrée d'historique
 * @returns {Object|null} Données de déséquilibre ou null
 */
export const calculateCellImbalance = (entry) => {
  if (!entry.cellData || !entry.cellData.voltages.length) return null;

  const voltages = entry.cellData.voltages.map(v => v / 1000); // Conversion mV -> V
  const minVoltage = Math.min(...voltages);
  const maxVoltage = Math.max(...voltages);
  const avgVoltage = voltages.reduce((acc, v) => acc + v, 0) / voltages.length;
  const imbalance = maxVoltage - minVoltage;

  return {
    voltages,
    minVoltage,
    maxVoltage,
    avgVoltage,
    imbalance,
    cellCount: voltages.length,
    timestamp: entry.day + ' ' + entry.time
  };
};

/**
 * Analyse la santé des batteries
 * @param {Array} loadedBatteries - Liste des batteries chargées
 * @returns {Array} Résultats d'analyse de santé
 */
export const analyzeBatteryHealth = (loadedBatteries) => {
  return loadedBatteries.map(battery => {
    // Récupérer le SOH avec plusieurs méthodes de fallback
    let soh = parseInt(battery.stats['SOH']?.replace('%', '') || '0');
    const cycles = parseInt(battery.stats['Charge Cnt.'] || '0');
    const powerPercent = parseInt(battery.stats['Pwr Percent']?.replace('%', '') || '100');

    // Si SOH est 0 ou non disponible, essayer d'estimer
    if (soh === 0 || !battery.stats['SOH']) {
      // Méthode 1: Utiliser le Power Percent comme indicateur
      if (powerPercent > 0) {
        soh = Math.max(70, powerPercent - 10); // Estimation conservative
      }

      // Méthode 2: Estimer selon les cycles (batteries lithium typiques)
      if (soh === 0 && cycles > 0) {
        if (cycles < 1000) soh = 95;
        else if (cycles < 2000) soh = 90;
        else if (cycles < 3000) soh = 85;
        else if (cycles < 5000) soh = 80;
        else if (cycles < 7000) soh = 75;
        else soh = 70;
      }

      // Méthode 3: Analyser la tendance des tensions dans l'historique
      if (soh === 0 && battery.history.length > 10) {
        const recentEntries = battery.history.slice(0, 50);
        const avgVoltage = recentEntries.reduce((acc, entry) => acc + entry.voltage, 0) / recentEntries.length / 1000;

        // Estimation basée sur la tension moyenne (pour batteries 48V)
        if (avgVoltage > 51) soh = 95;
        else if (avgVoltage > 50) soh = 88;
        else if (avgVoltage > 49) soh = 82;
        else if (avgVoltage > 48) soh = 75;
        else soh = 65;
      }

      // Si toujours 0, utiliser une valeur par défaut
      if (soh === 0) soh = 75; // Estimation neutre
    }

    let healthStatus = 'Excellent';
    let healthScore = soh; // Commencer avec le SOH de base

    // Déterminer le statut de santé basé sur le SOH uniquement
    if (soh < 70) {
      healthStatus = 'Critique';
    } else if (soh < 80) {
      healthStatus = 'Dégradé';
    } else if (soh < 90) {
      healthStatus = 'Bon';
    } else if (soh < 95) {
      healthStatus = 'Très Bon';
    } else {
      healthStatus = 'Excellent';
    }

    // Ajustements mineurs basés sur les cycles (sans inverser l'ordre)
    if (cycles > 6000) healthScore -= Math.min(5, (cycles - 6000) / 1000 * 2);
    else if (cycles > 4000) healthScore -= Math.min(3, (cycles - 4000) / 1000 * 1.5);
    else if (cycles > 2000) healthScore -= Math.min(2, (cycles - 2000) / 1000);

    // Ajustement selon les alertes (impact plus modéré)
    const criticalAlerts = battery.alerts.filter(a => a.type === 'critical').length;
    if (criticalAlerts > 0) healthScore -= Math.min(criticalAlerts * 3, 10);

    // S'assurer que le score reste cohérent avec le SOH (pas plus de 10% d'écart)
    const minScore = Math.max(0, soh - 10);
    const maxScore = Math.min(100, soh + 5);
    healthScore = Math.max(minScore, Math.min(maxScore, healthScore));

    return {
      batteryId: battery.batteryId,
      displayName: battery.displayName,
      soh,
      sohSource: battery.stats['SOH'] ? 'direct' : 'estimé',
      cycles,
      powerPercent,
      healthStatus,
      healthScore,
      estimatedLifeRemaining: Math.max(0, (BATTERY_CYCLE_LIMIT - cycles) / 365) // années estimées
    };
  });
};

/**
 * Analyse la dégradation des batteries
 * @param {Array} loadedBatteries - Liste des batteries chargées
 * @returns {Array} Résultats d'analyse de dégradation
 */
export const analyzeDegradation = (loadedBatteries) => {
  return loadedBatteries.map(battery => {
    if (!battery.history || battery.history.length < 10) {
      return {
        batteryId: battery.batteryId,
        displayName: battery.displayName,
        degradationRate: 0,
        trend: 'Données insuffisantes'
      };
    }

    const recent = battery.history.slice(0, Math.min(50, battery.history.length));
    const older = battery.history.slice(-Math.min(50, battery.history.length));

    const recentAvgVoltage = recent.reduce((acc, entry) => acc + entry.voltage, 0) / recent.length / 1000;
    const olderAvgVoltage = older.reduce((acc, entry) => acc + entry.voltage, 0) / older.length / 1000;

    const recentAvgSOC = recent.reduce((acc, entry) => acc + parseInt(entry.soc || '0'), 0) / recent.length;
    const olderAvgSOC = older.reduce((acc, entry) => acc + parseInt(entry.soc || '0'), 0) / older.length;

    const voltageDegradation = ((olderAvgVoltage - recentAvgVoltage) / olderAvgVoltage) * 100;
    const socDegradation = ((olderAvgSOC - recentAvgSOC) / olderAvgSOC) * 100;

    let trend = 'Stable';
    if (voltageDegradation > 2 || socDegradation > 5) trend = 'Dégradation rapide';
    else if (voltageDegradation > 1 || socDegradation > 2) trend = 'Dégradation modérée';
    else if (voltageDegradation < -1) trend = 'Amélioration';

    return {
      batteryId: battery.batteryId,
      displayName: battery.displayName,
      degradationRate: Math.abs(voltageDegradation).toFixed(2),
      socDegradation: Math.abs(socDegradation).toFixed(2),
      trend,
      recentAvgVoltage: recentAvgVoltage.toFixed(2),
      olderAvgVoltage: olderAvgVoltage.toFixed(2)
    };
  });
};

/**
 * Analyse l'équilibre des cellules
 * @param {Array} loadedBatteries - Liste des batteries chargées
 * @returns {Array} Résultats d'analyse d'équilibre
 */
export const analyzeCellBalance = (loadedBatteries) => {
  return loadedBatteries.map(battery => {
    if (!battery.history || battery.history.length === 0) {
      return {
        batteryId: battery.batteryId,
        displayName: battery.displayName,
        balanceStatus: 'Données insuffisantes',
        imbalance: 0,
        worstCells: []
      };
    }

    // Analyser les dernières entrées pour l'équilibrage des cellules
    const recentEntries = battery.history.slice(0, 10);

    // Extraire les tensions de cellules depuis les données historiques
    const voltageSpread = recentEntries.map(entry =>
      (entry.voltageHighest - entry.voltageLowest) / 1000
    );

    const avgSpread = voltageSpread.reduce((acc, val) => acc + val, 0) / voltageSpread.length;
    const maxSpread = Math.max(...voltageSpread);

    let balanceStatus = 'Bien équilibré';
    if (maxSpread > 0.1) balanceStatus = 'Déséquilibré critique';
    else if (maxSpread > 0.05) balanceStatus = 'Déséquilibré modéré';
    else if (maxSpread > 0.02) balanceStatus = 'Légèrement déséquilibré';

    return {
      batteryId: battery.batteryId,
      displayName: battery.displayName,
      balanceStatus,
      imbalance: (maxSpread * 1000).toFixed(0), // en mV
      avgImbalance: (avgSpread * 1000).toFixed(0),
      worstSpread: (maxSpread * 1000).toFixed(0)
    };
  });
};

/**
 * Compare les performances de plusieurs batteries
 * @param {Array} loadedBatteries - Liste des batteries chargées
 * @returns {Array} Comparaison des performances
 */
export const comparePerformance = (loadedBatteries) => {
  if (loadedBatteries.length < 2) return [];

  const comparison = loadedBatteries.map((battery) => {
    const soh = parseInt(battery.stats['SOH']?.replace('%', '') || '0');
    const cycles = parseInt(battery.stats['Charge Cnt.'] || '0');
    const avgVoltage = battery.history.length > 0 ?
      battery.history.reduce((acc, entry) => acc + entry.voltage, 0) / battery.history.length / 1000 : 0;
    const avgTemp = battery.history.length > 0 ?
      battery.history.reduce((acc, entry) => acc + entry.temperature, 0) / battery.history.length / 1000 : 0;

    return {
      batteryId: battery.batteryId,
      displayName: battery.displayName,
      soh,
      cycles,
      avgVoltage: avgVoltage.toFixed(2),
      avgTemp: avgTemp.toFixed(1),
      alerts: battery.alerts.length,
      performanceScore: (soh * 0.4) + ((BATTERY_CYCLE_LIMIT - cycles) / BATTERY_CYCLE_LIMIT * 30) + (Math.min(avgVoltage / 54 * 20, 20)) + (Math.max(20 - (battery.alerts.length * 2), 0)) + ((avgTemp > 15 && avgTemp < 35) ? 10 : Math.max(0, 10 - Math.abs(avgTemp - 25)))
    };
  });

  // Trier par score de performance
  comparison.sort((a, b) => b.performanceScore - a.performanceScore);

  return comparison.map((battery, index) => ({
    ...battery,
    rank: index + 1,
    relativePerformance: index === 0 ? 'Meilleure' :
      index < comparison.length / 2 ? 'Au-dessus de la moyenne' : 'En-dessous de la moyenne'
  }));
};

/**
 * Évalue les risques associés aux batteries
 * @param {Array} loadedBatteries - Liste des batteries chargées
 * @returns {Array} Évaluation des risques
 */
export const assessRisk = (loadedBatteries) => {
  return loadedBatteries.map(battery => {
    let riskScore = 0;
    let riskFactors = [];

    const soh = parseInt(battery.stats['SOH']?.replace('%', '') || '100');
    const cycles = parseInt(battery.stats['Charge Cnt.'] || '0');
    const criticalAlerts = battery.alerts.filter(a => a.type === 'critical').length;
    const warningAlerts = battery.alerts.filter(a => a.type === 'warning').length;

    // Facteurs de risque basés sur SOH
    if (soh < 70) {
      riskScore += 40;
      riskFactors.push('SOH critique (< 70%)');
    } else if (soh < 80) {
      riskScore += 25;
      riskFactors.push('SOH dégradé (< 80%)');
    } else if (soh < 90) {
      riskScore += 10;
      riskFactors.push('SOH légèrement dégradé (< 90%)');
    }

    // Facteurs de risque basés sur les cycles
    if (cycles > 6000) {
      riskScore += 30;
      riskFactors.push('Cycles très élevés (> 6000)');
    } else if (cycles > 4000) {
      riskScore += 15;
      riskFactors.push('Cycles élevés (> 4000)');
    } else if (cycles > 2000) {
      riskScore += 5;
      riskFactors.push('Cycles modérés (> 2000)');
    }

    // Facteurs de risque basés sur les alertes
    if (criticalAlerts > 0) {
      riskScore += criticalAlerts * 20;
      riskFactors.push(`${criticalAlerts} alerte(s) critique(s)`);
    }

    if (warningAlerts > 10) {
      riskScore += 15;
      riskFactors.push(`Nombreuses alertes (${warningAlerts})`);
    } else if (warningAlerts > 5) {
      riskScore += 8;
      riskFactors.push(`Plusieurs alertes (${warningAlerts})`);
    }

    // Vérification de cohérence - éviter les faux positifs
    if (soh >= 95 && cycles < 1000 && criticalAlerts === 0) {
      riskScore = Math.min(riskScore, 10); // Plafonner le risque pour les batteries excellentes
    }

    let riskLevel = 'Faible';
    if (riskScore > 70) riskLevel = 'Critique';
    else if (riskScore > 40) riskLevel = 'Élevé';
    else if (riskScore > 20) riskLevel = 'Modéré';

    return {
      batteryId: battery.batteryId,
      displayName: battery.displayName,
      riskScore: Math.min(100, riskScore),
      riskLevel,
      riskFactors
    };
  });
};

/**
 * Génère des recommandations basées sur l'analyse
 * @param {Array} loadedBatteries - Liste des batteries chargées
 * @returns {Array} Liste des recommandations
 */
export const generateRecommendations = (loadedBatteries) => {
  const recommendations = [];

  loadedBatteries.forEach(battery => {
    const soh = parseInt(battery.stats['SOH']?.replace('%', '') || '100');
    const cycles = parseInt(battery.stats['Charge Cnt.'] || '0');
    const criticalAlerts = battery.alerts.filter(a => a.type === 'critical').length;

    if (soh < 80) {
      recommendations.push({
        type: 'critical',
        battery: battery.displayName,
        message: 'Remplacement urgent recommandé - SOH critique',
        priority: 1
      });
    } else if (soh < 90) {
      recommendations.push({
        type: 'warning',
        battery: battery.displayName,
        message: 'Surveillance renforcée recommandée - SOH en baisse',
        priority: 2
      });
    }

    if (cycles > 5000) {
      recommendations.push({
        type: 'info',
        battery: battery.displayName,
        message: 'Planifier le remplacement - Cycles élevés',
        priority: 2
      });
    }

    if (criticalAlerts > 0) {
      recommendations.push({
        type: 'critical',
        battery: battery.displayName,
        message: 'Intervention immédiate requise - Alertes critiques',
        priority: 1
      });
    }
  });

  // Recommandations générales si plusieurs batteries
  if (loadedBatteries.length > 1) {
    const avgSOH = loadedBatteries.reduce((acc, b) => acc + parseInt(b.stats['SOH']?.replace('%', '') || '100'), 0) / loadedBatteries.length;

    if (avgSOH < 85) {
      recommendations.push({
        type: 'warning',
        battery: 'Système global',
        message: 'Vieillissement généralisé du parc de batteries',
        priority: 2
      });
    }
  }

  // Trier par priorité
  recommendations.sort((a, b) => a.priority - b.priority);

  return recommendations;
};

/**
 * Effectue une analyse avancée complète
 * @param {Array} loadedBatteries - Liste des batteries chargées
 * @returns {Object} Résultats d'analyse complète
 */
export const performAdvancedAnalysis = (loadedBatteries) => {
  if (loadedBatteries.length === 0) return null;

  return {
    batteryHealth: analyzeBatteryHealth(loadedBatteries),
    degradationAnalysis: analyzeDegradation(loadedBatteries),
    cellBalance: analyzeCellBalance(loadedBatteries),
    performanceComparison: comparePerformance(loadedBatteries),
    riskAssessment: assessRisk(loadedBatteries),
    recommendations: generateRecommendations(loadedBatteries)
  };
};
