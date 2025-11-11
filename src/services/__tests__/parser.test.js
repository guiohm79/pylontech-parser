/**
 * Tests unitaires pour le service de parsing
 */

import {
  generateBatteryId,
  extractFileDatetime,
  correctHistoryDates,
  parseFile,
  generateDisplayName
} from '../parser';

describe('Parser Service', () => {
  describe('generateBatteryId', () => {
    test('doit extraire l\'ID depuis un nom de fichier Pylontech standard', () => {
      const filename = 'HABC123_history_20240115120000.txt';
      const result = generateBatteryId(filename);
      expect(result).toBe('ABC123');
    });

    test('doit gérer les fichiers commençant par K', () => {
      const filename = 'KXYZ789_history_20240115120000.txt';
      const result = generateBatteryId(filename);
      expect(result).toBe('XYZ789');
    });

    test('doit retourner un ID nettoyé si le format n\'est pas standard', () => {
      const filename = 'unknown-format-file.txt';
      const result = generateBatteryId(filename);
      expect(result).toBe('unknownforma');
      expect(result.length).toBeLessThanOrEqual(12);
    });
  });

  describe('extractFileDatetime', () => {
    test('doit extraire la date depuis un nom de fichier valide', () => {
      const filename = 'HABC123_history_20240115143000.txt';
      const result = extractFileDatetime(filename);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // Janvier = 0
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });

    test('doit retourner null si le format est invalide', () => {
      const filename = 'invalid-file.txt';
      const result = extractFileDatetime(filename);
      expect(result).toBeNull();
    });

    test('doit gérer les fichiers avec K prefix', () => {
      const filename = 'KXYZ789_history_20231225180000.txt';
      const result = extractFileDatetime(filename);
      expect(result).toBeInstanceOf(Date);
      expect(result.getMonth()).toBe(11); // Décembre = 11
      expect(result.getDate()).toBe(25);
    });
  });

  describe('correctHistoryDates', () => {
    test('doit corriger les dates d\'historique en utilisant la date du fichier', () => {
      const fileDate = new Date('2024-01-15T14:30:00');
      const history = [
        { id: '1', day: '01/01', time: '10:00:00', voltage: 52000 },
        { id: '2', day: '01/01', time: '10:01:00', voltage: 52100 },
        { id: '3', day: '01/01', time: '10:02:00', voltage: 52200 }
      ];

      const result = correctHistoryDates(history, fileDate);

      expect(result).toHaveLength(3);
      expect(result[0].useCorrectedDate).toBe(true);
      expect(result[0].originalDay).toBe('01/01');
      expect(result[0].correctedDay).toBeDefined();

      // La dernière entrée devrait être proche de la date du fichier
      expect(result[2].correctedDay).toContain('15/01/2024');
    });

    test('doit retourner l\'historique inchangé si fileDate est null', () => {
      const history = [{ id: '1', day: '01/01', time: '10:00:00', voltage: 52000 }];
      const result = correctHistoryDates(history, null);
      expect(result).toEqual(history);
    });

    test('doit retourner l\'historique inchangé si l\'historique est vide', () => {
      const fileDate = new Date('2024-01-15T14:30:00');
      const result = correctHistoryDates([], fileDate);
      expect(result).toEqual([]);
    });
  });

  describe('parseFile', () => {
    test('doit parser un fichier Pylontech minimal', () => {
      const content = `
info
Device address: 2
Manufacturer: PYLON
stat
SOH: 95%
Charge Cnt.: 100
data history
1 01/01 10:00:00 52000 1000 25000 24000 26000 3200 3300 00 00 00 00 00 00 50000 50000
      `.trim();

      const result = parseFile(content, 'HABC123_history_20240115120000.txt');

      expect(result.info['Device address']).toBe('2');
      expect(result.info['Manufacturer']).toBe('PYLON');
      expect(result.stats['SOH']).toBe('95%');
      expect(result.stats['Charge Cnt.']).toBe('100');
      expect(result.history).toHaveLength(1);
      expect(result.history[0].voltage).toBe(52000);
      expect(result.history[0].temperature).toBe(25000);
      expect(result.filename).toBe('HABC123_history_20240115120000.txt');
    });

    test('doit gérer un fichier vide sans erreur', () => {
      const content = '';
      const result = parseFile(content, 'test.txt');

      expect(result.info).toEqual({});
      expect(result.stats).toEqual({});
      expect(result.history).toEqual([]);
    });
  });

  describe('generateDisplayName', () => {
    test('doit générer un nom depuis deviceAddress', () => {
      const batteryData = { deviceAddress: '2' };
      const result = generateDisplayName(batteryData);
      expect(result).toBe('Batterie 2');
    });

    test('doit générer un nom depuis info["Device address"]', () => {
      const batteryData = { info: { 'Device address': '5' } };
      const result = generateDisplayName(batteryData);
      expect(result).toBe('Batterie 5');
    });

    test('doit utiliser l\'ID de la batterie en fallback', () => {
      const batteryData = { batteryId: 'ABC123456789' };
      const result = generateDisplayName(batteryData);
      expect(result).toBe('Batterie ABC12345');
    });
  });
});
