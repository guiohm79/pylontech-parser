/**
 * Tests unitaires pour le service d'analyse
 */

import {
  calculateCellImbalance,
  analyzeBatteryHealth,
  analyzeDegradation,
  analyzeCellBalance,
  comparePerformance,
  assessRisk,
  generateRecommendations
} from '../analysis';

describe('Analysis Service', () => {
  describe('calculateCellImbalance', () => {
    test('doit calculer le déséquilibre des cellules correctement', () => {
      const entry = {
        day: '15/01/2024',
        time: '14:30:00',
        cellData: {
          voltages: [3200, 3210, 3205, 3198, 3215, 3200, 3205, 3210, 3195, 3208, 3202, 3212, 3199, 3207, 3203]
        }
      };

      const result = calculateCellImbalance(entry);

      expect(result).not.toBeNull();
      expect(result.voltages).toHaveLength(15);
      expect(result.minVoltage).toBeCloseTo(3.195, 3);
      expect(result.maxVoltage).toBeCloseTo(3.215, 3);
      expect(result.imbalance).toBeCloseTo(0.020, 3); // 20mV
      expect(result.cellCount).toBe(15);
    });

    test('doit retourner null si pas de données cellulaires', () => {
      const entry = { day: '15/01/2024', time: '14:30:00' };
      const result = calculateCellImbalance(entry);
      expect(result).toBeNull();
    });

    test('doit retourner null si voltages array est vide', () => {
      const entry = {
        day: '15/01/2024',
        time: '14:30:00',
        cellData: { voltages: [] }
      };
      const result = calculateCellImbalance(entry);
      expect(result).toBeNull();
    });
  });

  describe('analyzeBatteryHealth', () => {
    test('doit analyser la santé d\'une batterie avec SOH direct', () => {
      const batteries = [
        {
          batteryId: 'ABC123',
          displayName: 'Batterie 1',
          stats: {
            'SOH': '95%',
            'Charge Cnt.': '500',
            'Pwr Percent': '98%'
          },
          history: [],
          alerts: []
        }
      ];

      const result = analyzeBatteryHealth(batteries);

      expect(result).toHaveLength(1);
      expect(result[0].soh).toBe(95);
      expect(result[0].sohSource).toBe('direct');
      expect(result[0].healthStatus).toBe('Excellent');
      expect(result[0].cycles).toBe(500);
    });

    test('doit estimer le SOH si non disponible', () => {
      const batteries = [
        {
          batteryId: 'ABC123',
          displayName: 'Batterie 1',
          stats: {
            'Charge Cnt.': '2500'
          },
          history: [],
          alerts: []
        }
      ];

      const result = analyzeBatteryHealth(batteries);

      expect(result).toHaveLength(1);
      expect(result[0].soh).toBeGreaterThan(0);
      expect(result[0].sohSource).toBe('estimé');
    });

    test('doit calculer le statut de santé correctement', () => {
      const testCases = [
        { soh: 96, expected: 'Excellent' },
        { soh: 92, expected: 'Très Bon' },
        { soh: 88, expected: 'Bon' },
        { soh: 75, expected: 'Dégradé' },
        { soh: 65, expected: 'Critique' }
      ];

      testCases.forEach(({ soh, expected }) => {
        const batteries = [{
          batteryId: 'TEST',
          displayName: 'Test',
          stats: { 'SOH': `${soh}%`, 'Charge Cnt.': '100' },
          history: [],
          alerts: []
        }];

        const result = analyzeBatteryHealth(batteries);
        expect(result[0].healthStatus).toBe(expected);
      });
    });
  });

  describe('analyzeDegradation', () => {
    test('doit détecter une dégradation stable', () => {
      const history = [];
      for (let i = 0; i < 100; i++) {
        history.push({
          voltage: 52000,
          soc: '80',
          temperature: 25000
        });
      }

      const batteries = [{
        batteryId: 'ABC123',
        displayName: 'Batterie 1',
        history
      }];

      const result = analyzeDegradation(batteries);

      expect(result).toHaveLength(1);
      expect(result[0].trend).toBe('Stable');
    });

    test('doit détecter une dégradation rapide', () => {
      const history = [];
      // Entrées récentes avec tension plus basse
      for (let i = 0; i < 50; i++) {
        history.push({
          voltage: 49000,
          soc: '75',
          temperature: 25000
        });
      }
      // Entrées anciennes avec tension plus haute
      for (let i = 0; i < 50; i++) {
        history.push({
          voltage: 52000,
          soc: '85',
          temperature: 25000
        });
      }

      const batteries = [{
        batteryId: 'ABC123',
        displayName: 'Batterie 1',
        history
      }];

      const result = analyzeDegradation(batteries);

      expect(result).toHaveLength(1);
      expect(result[0].trend).toContain('Dégradation');
    });

    test('doit gérer les données insuffisantes', () => {
      const batteries = [{
        batteryId: 'ABC123',
        displayName: 'Batterie 1',
        history: []
      }];

      const result = analyzeDegradation(batteries);

      expect(result).toHaveLength(1);
      expect(result[0].trend).toBe('Données insuffisantes');
    });
  });

  describe('analyzeCellBalance', () => {
    test('doit détecter un bon équilibrage', () => {
      const history = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          voltageLowest: 3200,
          voltageHighest: 3210 // Spread de 10mV
        });
      }

      const batteries = [{
        batteryId: 'ABC123',
        displayName: 'Batterie 1',
        history
      }];

      const result = analyzeCellBalance(batteries);

      expect(result).toHaveLength(1);
      expect(result[0].balanceStatus).toBe('Bien équilibré');
    });

    test('doit détecter un déséquilibre critique', () => {
      const history = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          voltageLowest: 3000,
          voltageHighest: 3150 // Spread de 150mV
        });
      }

      const batteries = [{
        batteryId: 'ABC123',
        displayName: 'Batterie 1',
        history
      }];

      const result = analyzeCellBalance(batteries);

      expect(result).toHaveLength(1);
      expect(result[0].balanceStatus).toBe('Déséquilibré critique');
    });
  });

  describe('comparePerformance', () => {
    test('doit comparer plusieurs batteries et les classer', () => {
      const batteries = [
        {
          batteryId: 'BAT1',
          displayName: 'Batterie 1',
          stats: { 'SOH': '95%', 'Charge Cnt.': '500' },
          history: [{ voltage: 52000, temperature: 25000 }],
          alerts: []
        },
        {
          batteryId: 'BAT2',
          displayName: 'Batterie 2',
          stats: { 'SOH': '85%', 'Charge Cnt.': '3000' },
          history: [{ voltage: 51000, temperature: 28000 }],
          alerts: []
        }
      ];

      const result = comparePerformance(batteries);

      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result[0].performanceScore).toBeGreaterThan(result[1].performanceScore);
    });

    test('doit retourner un array vide si moins de 2 batteries', () => {
      const batteries = [{
        batteryId: 'BAT1',
        displayName: 'Batterie 1',
        stats: { 'SOH': '95%' },
        history: [],
        alerts: []
      }];

      const result = comparePerformance(batteries);
      expect(result).toEqual([]);
    });
  });

  describe('assessRisk', () => {
    test('doit évaluer un risque faible pour une batterie saine', () => {
      const batteries = [{
        batteryId: 'ABC123',
        displayName: 'Batterie 1',
        stats: { 'SOH': '95%', 'Charge Cnt.': '500' },
        alerts: []
      }];

      const result = assessRisk(batteries);

      expect(result).toHaveLength(1);
      expect(result[0].riskLevel).toBe('Faible');
      expect(result[0].riskScore).toBeLessThan(20);
    });

    test('doit évaluer un risque critique pour une batterie dégradée', () => {
      const batteries = [{
        batteryId: 'ABC123',
        displayName: 'Batterie 1',
        stats: { 'SOH': '65%', 'Charge Cnt.': '7000' },
        alerts: [
          { type: 'critical' },
          { type: 'critical' },
          { type: 'warning' }
        ]
      }];

      const result = assessRisk(batteries);

      expect(result).toHaveLength(1);
      expect(result[0].riskLevel).toBe('Critique');
      expect(result[0].riskScore).toBeGreaterThan(70);
      expect(result[0].riskFactors.length).toBeGreaterThan(0);
    });
  });

  describe('generateRecommendations', () => {
    test('doit générer des recommandations critiques pour SOH bas', () => {
      const batteries = [{
        batteryId: 'ABC123',
        displayName: 'Batterie 1',
        stats: { 'SOH': '75%', 'Charge Cnt.': '500' },
        alerts: []
      }];

      const result = generateRecommendations(batteries);

      expect(result.length).toBeGreaterThan(0);
      const criticalRec = result.find(r => r.type === 'critical');
      expect(criticalRec).toBeDefined();
      expect(criticalRec.message).toContain('Remplacement urgent');
    });

    test('doit générer des recommandations pour cycles élevés', () => {
      const batteries = [{
        batteryId: 'ABC123',
        displayName: 'Batterie 1',
        stats: { 'SOH': '92%', 'Charge Cnt.': '5500' },
        alerts: []
      }];

      const result = generateRecommendations(batteries);

      const cycleRec = result.find(r => r.message.includes('Cycles'));
      expect(cycleRec).toBeDefined();
    });

    test('doit trier les recommandations par priorité', () => {
      const batteries = [
        {
          batteryId: 'BAT1',
          displayName: 'Batterie 1',
          stats: { 'SOH': '75%', 'Charge Cnt.': '6000' },
          alerts: [{ type: 'critical' }]
        },
        {
          batteryId: 'BAT2',
          displayName: 'Batterie 2',
          stats: { 'SOH': '88%', 'Charge Cnt.': '3000' },
          alerts: []
        }
      ];

      const result = generateRecommendations(batteries);

      // Vérifier que les recommandations de priorité 1 viennent en premier
      for (let i = 1; i < result.length; i++) {
        expect(result[i].priority).toBeGreaterThanOrEqual(result[i - 1].priority);
      }
    });
  });
});
