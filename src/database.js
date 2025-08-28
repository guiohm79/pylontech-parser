import Dexie from 'dexie';

// Base de données Dexie pour les batteries Pylontech
class PylontechDatabase extends Dexie {
  constructor() {
    super('PylontechBatteries');
    
    this.version(1).stores({
      batteries: 'batteryId, displayName, filename, fileDate, deviceAddress, loadedAt, createdAt',
      settings: 'key, value, updatedAt'
    });

    // Types pour TypeScript (optionnel mais aide à la documentation)
    this.batteries = this.table('batteries');
    this.settings = this.table('settings');
  }
}

class DatabaseManager {
  constructor() {
    this.db = new PylontechDatabase();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.db.open();
      this.initialized = true;
      console.log('Base de données Dexie initialisée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la base de données:', error);
      throw error;
    }
  }

  // Opérations sur les batteries
  async saveBattery(battery) {
    await this.initialize();
    
    try {
      const batteryData = {
        batteryId: battery.batteryId,
        displayName: battery.displayName || battery.batteryId,
        filename: battery.filename || null,
        fileDate: battery.fileDate || null,
        deviceAddress: battery.deviceAddress || null,
        loadedAt: battery.loadedAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        data: JSON.stringify(battery) // Stocker toutes les données en JSON
      };
      
      await this.db.batteries.put(batteryData);
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la batterie:', error);
      return false;
    }
  }

  async saveBatteries(batteries) {
    if (!batteries || batteries.length === 0) return true;

    await this.initialize();
    
    try {
      const transaction = this.db.transaction('rw', this.db.batteries, async () => {
        for (const battery of batteries) {
          await this.saveBattery(battery);
        }
      });
      
      await transaction;
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des batteries:', error);
      return false;
    }
  }

  async getAllBatteries() {
    await this.initialize();
    
    try {
      const batteries = await this.db.batteries.orderBy('createdAt').reverse().toArray();
      
      return batteries.map(batteryRecord => {
        try {
          return JSON.parse(batteryRecord.data);
        } catch (parseError) {
          console.warn('Erreur lors du parsing de la batterie:', batteryRecord.batteryId, parseError);
          return null;
        }
      }).filter(battery => battery !== null);
      
    } catch (error) {
      console.error('Erreur lors de la récupération des batteries:', error);
      return [];
    }
  }

  async deleteBattery(batteryId) {
    await this.initialize();
    
    try {
      await this.db.batteries.delete(batteryId);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de la batterie:', error);
      return false;
    }
  }

  async updateBatteryName(batteryId, newName) {
    await this.initialize();
    
    try {
      // Récupérer la batterie actuelle
      const batteryRecord = await this.db.batteries.get(batteryId);
      if (!batteryRecord) return false;
      
      // Parser les données, mettre à jour le nom, et sauvegarder
      const batteryData = JSON.parse(batteryRecord.data);
      batteryData.displayName = newName;
      
      await this.db.batteries.update(batteryId, {
        displayName: newName,
        data: JSON.stringify(batteryData)
      });
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du nom:', error);
      return false;
    }
  }

  // Opérations utilitaires
  async getDatabaseStats() {
    await this.initialize();
    
    try {
      const batteries = await this.getAllBatteries();
      
      const batteriesCount = batteries.length;
      const totalEntries = batteries.reduce((total, b) => total + (b.history?.length || 0), 0);
      const totalAlerts = batteries.reduce((total, b) => total + (b.alerts?.length || 0), 0);
      
      // Estimer la taille de la base (approximation)
      const estimatedSize = JSON.stringify(batteries).length;
      
      return {
        batteriesCount,
        totalHistoryEntries: totalEntries,
        totalAlerts,
        databaseSize: estimatedSize
      };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return {
        batteriesCount: 0,
        totalHistoryEntries: 0,
        totalAlerts: 0,
        databaseSize: 0
      };
    }
  }

  async clearDatabase() {
    await this.initialize();
    
    try {
      await this.db.batteries.clear();
      await this.db.settings.clear();
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression des données:', error);
      return false;
    }
  }

  // Export/Import JSON pour compatibilité
  async exportToJSON() {
    const batteries = await this.getAllBatteries();
    return {
      exportDate: new Date().toISOString(),
      version: '1.0',
      appVersion: 'Pylontech Parser v1.43',
      batteriesCount: batteries.length,
      batteries: batteries.map(battery => ({
        ...battery,
        exportedAt: new Date().toISOString()
      }))
    };
  }

  async importFromJSON(jsonData) {
    try {
      if (!jsonData.batteries || !Array.isArray(jsonData.batteries)) {
        throw new Error('Format JSON invalide');
      }

      const existingBatteries = await this.getAllBatteries();
      const existingIds = existingBatteries.map(b => b.batteryId);
      
      const newBatteries = jsonData.batteries.filter(b => 
        b.batteryId && !existingIds.includes(b.batteryId)
      );

      if (newBatteries.length === 0) {
        return { success: false, message: 'Aucune nouvelle batterie à importer' };
      }

      await this.saveBatteries(newBatteries);
      
      return { 
        success: true, 
        message: `${newBatteries.length} batterie(s) importée(s) avec succès`,
        imported: newBatteries
      };
      
    } catch (error) {
      console.error('Erreur lors de l\'import JSON:', error);
      return { success: false, message: 'Erreur lors de l\'import: ' + error.message };
    }
  }

  // Méthodes d'information
  getLastUpdate() {
    return new Date().toLocaleString('fr-FR');
  }
}

// Instance singleton
const dbManager = new DatabaseManager();
export default dbManager;