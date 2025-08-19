import React, { useState, useCallback } from 'react';
import { Battery, AlertTriangle, CheckCircle, Info, Thermometer, Zap, Clock, Download, BarChart3, FileText, TrendingUp, X, Edit2, Check, Moon, Sun } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import './App.css';

const PylontechParser = () => {
  const [parsedData, setParsedData] = useState(null);
  const [selectedSection, setSelectedSection] = useState('info');
  const [loadedBatteries, setLoadedBatteries] = useState([]); // Toutes les batteries chargées
  const [selectedBatteryId, setSelectedBatteryId] = useState(null); // ID de la batterie sélectionnée
  const [showComparison, setShowComparison] = useState(false); // Mode comparaison graphique
  const [editingBatteryId, setEditingBatteryId] = useState(null); // Batterie en cours de renommage
  const [editingName, setEditingName] = useState(''); // Nom temporaire pendant l'édition
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Récupérer la préférence depuis localStorage ou utiliser la préférence système
    const saved = localStorage.getItem('pylontech-dark-mode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [filters, setFilters] = useState({
    temperatureAlert: true,
    voltageAlert: true,
    normalOnly: false,
    showNormalOnly: false,
    showAlertsOnly: false
  });
  
  const [thresholds, setThresholds] = useState({
    tempWarning: 40,
    tempCritical: 45,
    voltageHigh: 53.2,
    voltageLow: 48.0,
    voltageHighCritical: 54.5,
    voltageLowCritical: 46.0
  });

  const parseFile = (content, filename = null) => {
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

  const generateAlerts = (history, thresholds) => {
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

  // Fonction pour générer un ID unique de batterie à partir du nom de fichier
  const generateBatteryId = (filename) => {
    const match = filename.match(/H([A-Z0-9]+)_history/);
    return match ? match[1] : filename.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  };

  // Fonction pour extraire la date et l'heure du nom de fichier
  const extractFileDatetime = (filename) => {
    // Format attendu: H{serial}_history_{YYYYMMDDHHMMSS}.txt
    const match = filename.match(/H[A-Z0-9]+_history_(\d{14})\.txt$/i);
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

  // Fonction pour corriger les dates d'historique en utilisant la date du fichier
  const correctHistoryDates = (history, fileDate) => {
    if (!fileDate || history.length === 0) return history;

    return history.map((entry, index) => {
      // Utiliser la date du fichier comme référence et soustraire l'index pour remonter dans le temps
      // En supposant une fréquence d'enregistrement (ex: toutes les minutes)
      const correctedDate = new Date(fileDate.getTime() - (history.length - 1 - index) * 60000); // 1 minute entre chaque entrée
      
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

  // Fonction pour générer un nom d'affichage intelligent
  const generateDisplayName = (batteryData) => {
    if (batteryData.deviceAddress) {
      return `Batterie ${batteryData.deviceAddress}`;
    }
    if (batteryData.info && batteryData.info['Device address']) {
      return `Batterie ${batteryData.info['Device address']}`;
    }
    // Fallback sur l'ID de la batterie
    return `Batterie ${batteryData.batteryId.slice(0, 8)}`;
  };

  // Fonction pour renommer une batterie
  const renameBattery = (batteryId, newName) => {
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
  };

  // Fonction pour démarrer l'édition d'un nom
  const startEditing = (batteryId, currentName) => {
    setEditingBatteryId(batteryId);
    setEditingName(currentName);
  };

  // Fonction pour annuler l'édition
  const cancelEditing = () => {
    setEditingBatteryId(null);
    setEditingName('');
  };

  // Fonction pour basculer le thème
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('pylontech-dark-mode', JSON.stringify(newTheme));
  };

  const exportData = (format) => {
    if (!parsedData) return;
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `pylontech-export-${timestamp}.${format}`;
    
    let content, mimeType;
    
    if (format === 'csv') {
      const csvHeader = 'Date,Heure,Tension(V),Courant(A),Temperature(°C),SOC,Etat,TempAlert,VoltageAlert\n';
      const csvData = parsedData.history.map(entry => {
        const tempC = (entry.temperature / 1000).toFixed(1);
        const voltageV = (entry.voltage / 1000).toFixed(2);
        const currentA = (entry.current / 1000).toFixed(2);
        const tempAlert = tempC > thresholds.tempWarning;
        const voltageAlert = voltageV > thresholds.voltageHigh || voltageV < thresholds.voltageLow;
        return `${entry.day},${entry.time},${voltageV},${currentA},${tempC},${entry.soc},${entry.baseState},${tempAlert},${voltageAlert}`;
      }).join('\n');
      content = csvHeader + csvData;
      mimeType = 'text/csv';
    } else if (format === 'json') {
      content = JSON.stringify({
        exportDate: new Date().toISOString(),
        systemInfo: parsedData.info,
        statistics: parsedData.stats,
        alerts: parsedData.alerts,
        history: parsedData.history.map(entry => ({
          ...entry,
          temperatureC: (entry.temperature / 1000),
          voltageV: (entry.voltage / 1000),
          currentA: (entry.current / 1000)
        })),
        thresholds: thresholds
      }, null, 2);
      mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReport = () => {
    if (!parsedData) return;
    
    const now = new Date();
    const reportData = {
      generatedAt: now.toLocaleString('fr-FR'),
      systemInfo: parsedData.info,
      statistics: parsedData.stats,
      totalEntries: parsedData.history.length,
      alertsSummary: {
        total: parsedData.alerts.length,
        critical: parsedData.alerts.filter(a => a.type === 'critical').length,
        warning: parsedData.alerts.filter(a => a.type === 'warning').length
      },
      dataRange: {
        from: parsedData.history[0]?.day + ' ' + parsedData.history[0]?.time,
        to: parsedData.history[parsedData.history.length - 1]?.day + ' ' + parsedData.history[parsedData.history.length - 1]?.time
      },
      temperatureStats: {
        avg: (parsedData.history.reduce((acc, entry) => acc + entry.temperature, 0) / parsedData.history.length / 1000).toFixed(1),
        max: (Math.max(...parsedData.history.map(entry => entry.temperature)) / 1000).toFixed(1),
        min: (Math.min(...parsedData.history.map(entry => entry.temperature)) / 1000).toFixed(1)
      },
      voltageStats: {
        avg: (parsedData.history.reduce((acc, entry) => acc + entry.voltage, 0) / parsedData.history.length / 1000).toFixed(2),
        max: (Math.max(...parsedData.history.map(entry => entry.voltage)) / 1000).toFixed(2),
        min: (Math.min(...parsedData.history.map(entry => entry.voltage)) / 1000).toFixed(2)
      }
    };
    
    const reportHtml = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Rapport Pylontech - ${reportData.generatedAt}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin: 20px 0; }
            .alert-critical { color: #d32f2f; font-weight: bold; }
            .alert-warning { color: #f57c00; font-weight: bold; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 10px 0; }
            .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Rapport d'Analyse Pylontech</h1>
            <p>Généré le: ${reportData.generatedAt}</p>
          </div>
          
          <div class="section">
            <h2>Résumé des Alertes</h2>
            <p>Total: ${reportData.alertsSummary.total} alertes</p>
            <p class="alert-critical">Critiques: ${reportData.alertsSummary.critical}</p>
            <p class="alert-warning">Avertissements: ${reportData.alertsSummary.warning}</p>
          </div>
          
          <div class="section">
            <h2>Période d'Analyse</h2>
            <p>Du: ${reportData.dataRange.from}</p>
            <p>Au: ${reportData.dataRange.to}</p>
            <p>Total d'entrées: ${reportData.totalEntries}</p>
          </div>
          
          <div class="section">
            <h2>Statistiques</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <h3>Température</h3>
                <p>Moyenne: ${reportData.temperatureStats.avg}°C</p>
                <p>Maximum: ${reportData.temperatureStats.max}°C</p>
                <p>Minimum: ${reportData.temperatureStats.min}°C</p>
              </div>
              <div class="stat-card">
                <h3>Tension</h3>
                <p>Moyenne: ${reportData.voltageStats.avg}V</p>
                <p>Maximum: ${reportData.voltageStats.max}V</p>
                <p>Minimum: ${reportData.voltageStats.min}V</p>
              </div>
              <div class="stat-card">
                <h3>Système</h3>
                <p>SOH: ${parsedData.stats['SOH'] || 'N/A'}</p>
                <p>Cycles: ${parsedData.stats['CYCLE Times'] || 'N/A'}</p>
                <p>Pourcentage: ${parsedData.stats['Pwr Percent'] || 'N/A'}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-pylontech-${now.toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const prepareChartData = (singleBattery = false) => {
    if (singleBattery && parsedData?.history) {
      return parsedData.history.slice(0, 100).map((entry, index) => ({
        index: index,
        timestamp: `${entry.day.slice(-2)}/${entry.time.slice(0, 5)}`,
        temperature: (entry.temperature / 1000),
        voltage: (entry.voltage / 1000),
        current: (entry.current / 1000),
        soc: parseInt(entry.soc) || 0
      }));
    }
    
    // Mode comparaison : préparer les données pour toutes les batteries
    if (showComparison && loadedBatteries.length > 1) {
      const maxLength = Math.min(100, Math.max(...loadedBatteries.map(b => b.history?.length || 0)));
      return Array.from({ length: maxLength }, (_, index) => {
        const dataPoint = { index };
        
        loadedBatteries.forEach(battery => {
          if (battery.history && battery.history[index]) {
            const entry = battery.history[index];
            const batteryName = battery.batteryId.slice(0, 8);
            dataPoint[`temp_${batteryName}`] = (entry.temperature / 1000);
            dataPoint[`volt_${batteryName}`] = (entry.voltage / 1000);
            dataPoint[`curr_${batteryName}`] = (entry.current / 1000);
            dataPoint[`soc_${batteryName}`] = parseInt(entry.soc) || 0;
            dataPoint.timestamp = `${entry.day.slice(-2)}/${entry.time.slice(0, 5)}`;
          }
        });
        
        return dataPoint;
      });
    }
    
    return [];
  };

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    
    const filePromises = files.map(file => {
      if (file.type === 'text/plain') {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target.result;
            const parsed = parseFile(content, file.name);
            parsed.alerts = generateAlerts(parsed.history, thresholds);
            parsed.batteryId = generateBatteryId(file.name);
            parsed.loadedAt = new Date().toLocaleString('fr-FR');
            // Générer un nom d'affichage intelligent
            parsed.displayName = generateDisplayName(parsed);
            resolve(parsed);
          };
          reader.readAsText(file);
        });
      }
      return Promise.resolve(null);
    });
    
    Promise.all(filePromises).then(results => {
      const validFiles = results.filter(r => r !== null);
      if (validFiles.length > 0) {
        setLoadedBatteries(prev => {
          const existing = prev.filter(battery => 
            !validFiles.some(newBattery => newBattery.batteryId === battery.batteryId)
          );
          const updated = [...existing, ...validFiles];
          
          if (!selectedBatteryId && validFiles.length > 0) {
            setSelectedBatteryId(validFiles[0].batteryId);
            setParsedData(validFiles[0]);
          }
          
          return updated;
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thresholds, selectedBatteryId]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Fonction pour sélectionner une batterie
  const selectBattery = (batteryId) => {
    const battery = loadedBatteries.find(b => b.batteryId === batteryId);
    if (battery) {
      setSelectedBatteryId(batteryId);
      setParsedData(battery);
      setShowComparison(false);
    }
  };

  // Fonction pour supprimer une batterie
  const removeBattery = (batteryId) => {
    setLoadedBatteries(prev => prev.filter(b => b.batteryId !== batteryId));
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
  };

  // Fonction pour obtenir les couleurs de graphique
  const getBatteryColor = (index) => {
    const colors = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#f59e0b', '#06b6d4'];
    return colors[index % colors.length];
  };

  // Fonction pour recharger les seuils sur toutes les batteries
  const updateAllBatteriesThresholds = (newThresholds) => {
    setLoadedBatteries(prev => prev.map(battery => ({
      ...battery,
      alerts: generateAlerts(battery.history, newThresholds)
    })));
    
    if (parsedData) {
      const updatedParsedData = {
        ...parsedData,
        alerts: generateAlerts(parsedData.history, newThresholds)
      };
      setParsedData(updatedParsedData);
    }
  };

  const renderBatterySelector = () => {
    if (loadedBatteries.length === 0) return null;

    return (
      <div className="battery-selector">
        <h3>Batteries chargées ({loadedBatteries.length})</h3>
        <div className="battery-list">
          {loadedBatteries.map((battery, index) => (
            <div 
              key={battery.batteryId} 
              className={`battery-card ${selectedBatteryId === battery.batteryId ? 'active' : ''}`}
            >
              <div className="battery-info">
                <div className="battery-header">
                  {editingBatteryId === battery.batteryId ? (
                    <div className="battery-rename">
                      <input 
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="rename-input"
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            renameBattery(battery.batteryId, editingName);
                          } else if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                      />
                      <button 
                        onClick={() => renameBattery(battery.batteryId, editingName)}
                        className="confirm-btn"
                        title="Confirmer"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={cancelEditing}
                        className="cancel-btn"
                        title="Annuler"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="battery-name-display">
                      <span className="battery-name">🔋 {battery.displayName}</span>
                      <button 
                        onClick={() => startEditing(battery.batteryId, battery.displayName)}
                        className="edit-btn"
                        title="Renommer cette batterie"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={() => removeBattery(battery.batteryId)}
                    className="remove-btn"
                    title="Supprimer cette batterie"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="battery-details">
                  <span className="battery-filename">{battery.filename}</span>
                  <span className="battery-stats">
                    {battery.history.length} entrées | {battery.alerts.length} alertes
                  </span>
                  <span className="battery-loaded">Chargé: {battery.loadedAt}</span>
                </div>
              </div>
              <div className="battery-actions">
                <button 
                  onClick={() => selectBattery(battery.batteryId)}
                  className={`btn-select ${selectedBatteryId === battery.batteryId ? 'active' : ''}`}
                >
                  {selectedBatteryId === battery.batteryId ? 'Sélectionnée' : 'Sélectionner'}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {loadedBatteries.length > 1 && (
          <div className="comparison-controls">
            <button 
              onClick={() => setShowComparison(!showComparison)}
              className={`btn-comparison ${showComparison ? 'active' : ''}`}
            >
              <BarChart3 size={16} />
              {showComparison ? 'Vue normale' : 'Comparaison graphique'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderInfoSection = () => {
    if (!parsedData?.info) return null;
    
    return (
      <div className="section">
        <h2>
          <Info className="text-blue" />
          Informations Système
        </h2>
        <div className="info-grid">
          {Object.entries(parsedData.info).map(([key, value]) => (
            <div key={key} className="info-item">
              <span className="info-key">{key}</span>
              <span className="info-value">{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStatsSection = () => {
    if (!parsedData?.stats) return null;
    
    const importantStats = [
      'Charge Cnt.',
      'Discharge Cnt.',
      'SOH',
      'Pwr Percent',
      'CYCLE Times',
      'Shut Times',
      'Reset Times'
    ];
    
    return (
      <div className="section">
        <h2>
          <Battery className="text-green" />
          Statistiques
        </h2>
        <div className="stats-grid">
          {importantStats.map(stat => (
            parsedData.stats[stat] && (
              <div key={stat} className="stat-item">
                <div className="stat-label">{stat}</div>
                <div className="stat-value">{parsedData.stats[stat]}</div>
              </div>
            )
          ))}
        </div>
      </div>
    );
  };

  const renderAlertsSection = () => {
    if (!parsedData?.alerts?.length) return null;
    
    return (
      <div className="section">
        <h2>
          <AlertTriangle className="text-red" />
          Alertes Détectées ({parsedData.alerts.length})
        </h2>
        <div className="alerts-container">
          {parsedData.alerts.map((alert, index) => (
            <div key={index} className={`alert ${alert.type}`}>
              <AlertTriangle className="status-icon" />
              <span className="alert-message">{alert.message}</span>
              <span className="alert-timestamp">{alert.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHistorySection = () => {
    if (!parsedData?.history?.length) return null;
    
    const filteredHistory = parsedData.history.filter(entry => {
      const tempC = entry.temperature / 1000;
      const voltageV = entry.voltage / 1000;
      
      const hasTemperatureAlert = tempC > thresholds.tempWarning;
      const hasVoltageAlert = voltageV > thresholds.voltageHigh || voltageV < thresholds.voltageLow;
      
      if (filters.showNormalOnly) {
        return !hasTemperatureAlert && !hasVoltageAlert;
      }
      
      if (filters.showAlertsOnly) {
        return hasTemperatureAlert || hasVoltageAlert;
      }
      
      return true;
    });
    
    return (
      <div className="section">
        <h2>
          <Clock className="text-blue" />
          Historique des Données ({filteredHistory.length} entrées)
          {parsedData.hasCorrectedDates && (
            <span className="corrected-dates-badge">📅 Dates corrigées depuis le nom de fichier</span>
          )}
        </h2>
        
        {/* Configuration des seuils */}
        <div className="config-section">
          <h3>Configuration des Seuils</h3>
          <div className="config-grid">
            <div className="config-item">
              <label className="config-label">Temp. Alerte (°C)</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.tempWarning}
                onChange={(e) => {
                  const newThresholds = {...thresholds, tempWarning: parseFloat(e.target.value)};
                  setThresholds(newThresholds);
                  updateAllBatteriesThresholds(newThresholds);
                }}
                className="config-input"
              />
            </div>
            <div className="config-item">
              <label className="config-label">Temp. Critique (°C)</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.tempCritical}
                onChange={(e) => {
                  const newThresholds = {...thresholds, tempCritical: parseFloat(e.target.value)};
                  setThresholds(newThresholds);
                  updateAllBatteriesThresholds(newThresholds);
                }}
                className="config-input"
              />
            </div>
            <div className="config-item">
              <label className="config-label">Tension Haute (V)</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.voltageHigh}
                onChange={(e) => {
                  const newThresholds = {...thresholds, voltageHigh: parseFloat(e.target.value)};
                  setThresholds(newThresholds);
                  updateAllBatteriesThresholds(newThresholds);
                }}
                className="config-input"
              />
            </div>
            <div className="config-item">
              <label className="config-label">Tension Basse (V)</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.voltageLow}
                onChange={(e) => {
                  const newThresholds = {...thresholds, voltageLow: parseFloat(e.target.value)};
                  setThresholds(newThresholds);
                  updateAllBatteriesThresholds(newThresholds);
                }}
                className="config-input"
              />
            </div>
            <div className="config-item">
              <label className="config-label">Tension Critique Haute (V)</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.voltageHighCritical}
                onChange={(e) => {
                  const newThresholds = {...thresholds, voltageHighCritical: parseFloat(e.target.value)};
                  setThresholds(newThresholds);
                  updateAllBatteriesThresholds(newThresholds);
                }}
                className="config-input"
              />
            </div>
            <div className="config-item">
              <label className="config-label">Tension Critique Basse (V)</label>
              <input
                type="number"
                step="0.1"
                value={thresholds.voltageLowCritical}
                onChange={(e) => {
                  const newThresholds = {...thresholds, voltageLowCritical: parseFloat(e.target.value)};
                  setThresholds(newThresholds);
                  updateAllBatteriesThresholds(newThresholds);
                }}
                className="config-input"
              />
            </div>
          </div>
        </div>
        
        {/* Filtres d'affichage */}
        <div className="filters">
          <label className="filter-option">
            <input
              type="radio"
              name="filter"
              checked={!filters.showNormalOnly && !filters.showAlertsOnly}
              onChange={() => setFilters({...filters, showNormalOnly: false, showAlertsOnly: false})}
            />
            Tout afficher
          </label>
          <label className="filter-option">
            <input
              type="radio"
              name="filter"
              checked={filters.showAlertsOnly}
              onChange={() => setFilters({...filters, showNormalOnly: false, showAlertsOnly: true})}
            />
            Seulement les alertes
          </label>
          <label className="filter-option">
            <input
              type="radio"
              name="filter"
              checked={filters.showNormalOnly}
              onChange={() => setFilters({...filters, showNormalOnly: true, showAlertsOnly: false})}
            />
            Seulement normal
          </label>
        </div>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date/Heure</th>
                <th>Tension (V)</th>
                <th>Courant (A)</th>
                <th>Temp (°C)</th>
                <th>SOC</th>
                <th>État</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.slice(0, 100).map((entry, index) => {
                const tempC = entry.temperature / 1000;
                const voltageV = entry.voltage / 1000;
                const currentA = entry.current / 1000;
                
                const tempAlert = tempC > thresholds.tempWarning;
                const voltageAlert = voltageV > thresholds.voltageHigh || voltageV < thresholds.voltageLow;
                const criticalTemp = tempC > thresholds.tempCritical;
                const criticalVoltage = voltageV > thresholds.voltageHighCritical || voltageV < thresholds.voltageLowCritical;
                
                return (
                  <tr key={index} className={
                    criticalTemp || criticalVoltage ? 'critical' : 
                    tempAlert || voltageAlert ? 'warning' : ''
                  }>
                    <td>
                      {entry.useCorrectedDate ? (
                        <div>
                          <div className="corrected-date">{entry.correctedDay} {entry.correctedTime}</div>
                          <div className="original-date" title={`Date originale: ${entry.originalDay} ${entry.originalTime}`}>
                            📅 {entry.originalDay} {entry.originalTime}
                          </div>
                        </div>
                      ) : (
                        `${entry.day} ${entry.time}`
                      )}
                    </td>
                    <td className={voltageAlert ? 'voltage-alert' : ''}>
                      {voltageV.toFixed(2)}
                    </td>
                    <td>{currentA.toFixed(2)}</td>
                    <td className={tempAlert ? 'temp-alert' : ''}>
                      {tempC.toFixed(1)}
                    </td>
                    <td>{entry.soc}</td>
                    <td>
                      <span className={`state-badge ${
                        entry.baseState === 'Charge' ? 'state-charge' :
                        entry.baseState === 'Dischg' ? 'state-dischg' :
                        'state-idle'
                      }`}>
                        {entry.baseState}
                      </span>
                    </td>
                    <td>
                      <div className="status-icons">
                        {tempAlert && (
                          <Thermometer className={`status-icon ${criticalTemp ? 'text-red' : 'text-orange'}`} />
                        )}
                        {voltageAlert && (
                          <Zap className={`status-icon ${criticalVoltage ? 'text-red' : 'text-orange'}`} />
                        )}
                        {!tempAlert && !voltageAlert && (
                          <CheckCircle className="status-icon text-green" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderChartsSection = () => {
    if (showComparison && loadedBatteries.length > 1) {
      return renderComparisonCharts();
    }
    
    if (!parsedData?.history?.length) return null;
    
    const chartData = prepareChartData(true);
    
    return (
      <div className="section">
        <h2>
          <TrendingUp className="text-blue" />
          Graphiques Temporels - {parsedData.displayName}
        </h2>
        
        <div className="charts-container">
          <div className="chart-wrapper">
            <h3>Tension et Courant</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis yAxisId="voltage" orientation="left" domain={['dataMin - 1', 'dataMax + 1']} />
                <YAxis yAxisId="current" orientation="right" />
                <Tooltip formatter={(value, name) => [
                  name === 'voltage' ? `${value.toFixed(2)}V` : `${value.toFixed(2)}A`,
                  name === 'voltage' ? 'Tension' : 'Courant'
                ]} />
                <Legend />
                <Line yAxisId="voltage" type="monotone" dataKey="voltage" stroke="#2563eb" name="Tension (V)" />
                <Bar yAxisId="current" dataKey="current" fill="#dc2626" name="Courant (A)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          <div className="chart-wrapper">
            <h3>Température</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip formatter={(value) => [`${value.toFixed(1)}°C`, 'Température']} />
                <Legend />
                <Area type="monotone" dataKey="temperature" stroke="#f59e0b" fill="#fbbf24" name="Température (°C)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="chart-wrapper">
            <h3>État de Charge (SOC)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'SOC']} />
                <Legend />
                <Line type="monotone" dataKey="soc" stroke="#16a34a" name="SOC (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderComparisonCharts = () => {
    if (loadedBatteries.length < 2) return null;
    
    const chartData = prepareChartData(false);
    
    return (
      <div className="section">
        <h2>
          <BarChart3 className="text-purple" />
          Comparaison Graphique ({loadedBatteries.length} batteries)
        </h2>
        
        <div className="charts-container">
          <div className="chart-wrapper">
            <h3>Comparaison Températures</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip />
                <Legend />
                {loadedBatteries.map((battery, index) => (
                  <Line
                    key={battery.batteryId}
                    type="monotone"
                    dataKey={`temp_${battery.batteryId.slice(0, 8)}`}
                    stroke={getBatteryColor(index)}
                    name={`${battery.displayName} (°C)`}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="chart-wrapper">
            <h3>Comparaison Tensions</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip />
                <Legend />
                {loadedBatteries.map((battery, index) => (
                  <Line
                    key={battery.batteryId}
                    type="monotone"
                    dataKey={`volt_${battery.batteryId.slice(0, 8)}`}
                    stroke={getBatteryColor(index)}
                    name={`${battery.displayName} (V)`}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="chart-wrapper">
            <h3>Comparaison SOC</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                {loadedBatteries.map((battery, index) => (
                  <Line
                    key={battery.batteryId}
                    type="monotone"
                    dataKey={`soc_${battery.batteryId.slice(0, 8)}`}
                    stroke={getBatteryColor(index)}
                    name={`${battery.displayName} (%)`}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // Appliquer le thème au document
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  return (
    <div className="App" data-theme={isDarkMode ? 'dark' : 'light'}>
      {/* Bouton de basculement de thème */}
      <button 
        className="theme-toggle" 
        onClick={toggleTheme}
        title={isDarkMode ? 'Passer au thème clair' : 'Passer au thème sombre'}
      >
        {isDarkMode ? <Sun /> : <Moon />}
      </button>
      
      <div className="container">
        <h1>Parser Pylontech - Analyseur de Logs Multi-Batteries</h1>
        
        {loadedBatteries.length === 0 ? (
          <div
            className="drop-zone"
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
          >
            <div className="upload-icon">📁</div>
            <p>Glissez et déposez vos fichiers historique.txt ici</p>
            <p>📊 Un ou plusieurs fichiers : Analyse et comparaison automatique</p>
            <p>Ou cliquez pour sélectionner</p>
          </div>
        ) : (
          <div>
            {renderBatterySelector()}
            
            {parsedData && (
              <div>
                <div className="top-actions">
                  <div className="file-info">
                    <span className="current-file">📄 {parsedData.displayName}</span>
                  <span className="current-file-detail">{parsedData.filename}</span>
                    {showComparison && (
                      <span className="comparison-badge">🔄 Mode Comparaison ({loadedBatteries.length} batteries)</span>
                    )}
                  </div>
                  
                  <div className="export-actions">
                    <button onClick={() => exportData('csv')} className="btn-export">
                      <Download size={16} />
                      CSV
                    </button>
                    <button onClick={() => exportData('json')} className="btn-export">
                      <Download size={16} />
                      JSON
                    </button>
                    <button onClick={generateReport} className="btn-export">
                      <FileText size={16} />
                      Rapport
                    </button>
                  </div>
                </div>
                
                <div className="tabs">
                  <button
                    onClick={() => setSelectedSection('info')}
                    className={`tab ${selectedSection === 'info' ? 'active' : ''}`}
                  >
                    Infos Système
                  </button>
                  <button
                    onClick={() => setSelectedSection('stats')}
                    className={`tab ${selectedSection === 'stats' ? 'active' : ''}`}
                  >
                    Statistiques
                  </button>
                  <button
                    onClick={() => setSelectedSection('alerts')}
                    className={`tab ${selectedSection === 'alerts' ? 'active' : ''}`}
                  >
                    Alertes
                  </button>
                  <button
                    onClick={() => setSelectedSection('history')}
                    className={`tab ${selectedSection === 'history' ? 'active' : ''}`}
                  >
                    Historique
                  </button>
                  <button
                    onClick={() => setSelectedSection('charts')}
                    className={`tab ${selectedSection === 'charts' ? 'active' : ''}`}
                  >
                    Graphiques
                  </button>
                </div>
                
                {selectedSection === 'info' && renderInfoSection()}
                {selectedSection === 'stats' && renderStatsSection()}
                {selectedSection === 'alerts' && renderAlertsSection()}
                {selectedSection === 'history' && renderHistorySection()}
                {selectedSection === 'charts' && renderChartsSection()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PylontechParser;