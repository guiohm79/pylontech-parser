import React, { useState, useCallback, useRef } from 'react';
import { Battery, AlertTriangle, CheckCircle, Info, Thermometer, Zap, Clock, Download, BarChart3, FileText, TrendingUp, X, Edit2, Check, Moon, Sun, Activity, Cpu, TrendingDown, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import './App.css';

const PylontechParser = () => {
  const [parsedData, setParsedData] = useState(null);
  const [selectedSection, setSelectedSection] = useState('info');
  // const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [selectedCellEntry, setSelectedCellEntry] = useState(null);
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

  // Référence pour l'input file caché
  const fileInputRef = useRef(null);

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
          
          // Parser les données détaillées des cellules
          // Format: après l'index 17, nous avons des groupes pour chaque cellule
          // Chaque cellule: numéro tension température état1 état2 pourcentage
          if (parts.length > 17) {
            const cellVoltages = [];
            const cellTemperatures = [];
            const cellStates = [];
            const cellPercentages = [];
            
            // Chercher le démarrage des données de cellules 
            // D'après votre exemple, il semble y avoir "50000" puis les cellules commencent
            let startIndex = -1;
            
            // Chercher l'index de "50000" puis le premier "1" qui suit
            for (let i = 17; i < parts.length - 1; i++) {
              if (parts[i] === '50000' && parts[i + 1] === '1') {
                startIndex = i + 1; // Commencer au "1" (première cellule)
                break;
              }
            }
            
            // Si on ne trouve pas "50000", chercher juste le premier "1" après l'index 17
            if (startIndex === -1) {
              for (let i = 17; i < parts.length; i++) {
                if (parts[i] === '1' && i + 5 < parts.length) {
                  startIndex = i;
                  break;
                }
              }
            }
            
            // Parser les 15 cellules si on a trouvé le point de départ
            if (startIndex !== -1) {
              // Parser les 15 cellules (chaque cellule = 6 éléments: numéro, tension, température, état1, état2, pourcentage)
              for (let cellNum = 0; cellNum < 15; cellNum++) {
                const baseIndex = startIndex + cellNum * 6;
                
                // Vérifier qu'on ne dépasse pas la longueur du tableau
                if (baseIndex + 5 >= parts.length) break;
                
                // Vérifier que nous avons bien un numéro de cellule séquentiel
                const cellNumber = parseInt(parts[baseIndex]);
                if (cellNumber === cellNum + 1) {
                  const voltage = parseInt(parts[baseIndex + 1]);
                  const temperature = parseInt(parts[baseIndex + 2]);
                  const state1 = parts[baseIndex + 3];
                  const state2 = parts[baseIndex + 4];
                  const percentage = parts[baseIndex + 5];
                  
                  if (!isNaN(voltage) && voltage > 0) {
                    cellVoltages.push(voltage);
                  }
                  if (!isNaN(temperature)) {
                    cellTemperatures.push(temperature);
                  }
                  cellStates.push({ state1, state2 });
                  cellPercentages.push(percentage);
                } else {
                  // Si le numéro ne correspond pas, on arrête (structure incorrecte)
                  break;
                }
              }
            }
            
            entry.cellData = {
              voltages: cellVoltages,
              temperatures: cellTemperatures,
              states: cellStates,
              percentages: cellPercentages,
              cellCount: cellVoltages.length
            };
          }
          
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
    const match = filename.match(/[HK]([A-Z0-9]+)_history/);
    return match ? match[1] : filename.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
  };

  // Fonction pour extraire la date et l'heure du nom de fichier
  const extractFileDatetime = (filename) => {
    // Format attendu: [H|K]{serial}_history_{YYYYMMDDHHMMSS}.txt
    const match = filename.match(/[HK][A-Z0-9]+_history_(\d{14})\.txt$/i);
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
      return parsedData.history.slice(0, 100).map((entry, index) => {
        // Utiliser les dates corrigées si disponibles, sinon les dates originales
        const displayDay = entry.useCorrectedDate && entry.correctedDay ? entry.correctedDay : entry.day;
        const displayTime = entry.useCorrectedDate && entry.correctedTime ? entry.correctedTime : entry.time;
        
        // Améliorer le format de timestamp pour une meilleure lisibilité
        const formattedTime = displayTime.length >= 8 ? displayTime.slice(0, 8) : displayTime;
        const formattedDay = displayDay.includes('/') ? displayDay.split('/').slice(0, 2).join('/') : displayDay.slice(-5);
        
        return {
          index: index,
          timestamp: `${formattedDay} ${formattedTime}`,
          temperature: (entry.temperature / 1000),
          voltage: (entry.voltage / 1000),
          current: (entry.current / 1000),
          soc: parseInt(entry.soc) || 0
        };
      });
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
            
            // Utiliser les dates corrigées si disponibles, sinon les dates originales
            const displayDay = entry.useCorrectedDate && entry.correctedDay ? entry.correctedDay : entry.day;
            const displayTime = entry.useCorrectedDate && entry.correctedTime ? entry.correctedTime : entry.time;
            
            // Améliorer le format de timestamp pour une meilleure lisibilité
            const formattedTime = displayTime.length >= 8 ? displayTime.slice(0, 8) : displayTime;
            const formattedDay = displayDay.includes('/') ? displayDay.split('/').slice(0, 2).join('/') : displayDay.slice(-5);
            dataPoint.timestamp = `${formattedDay} ${formattedTime}`;
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

  // Fonction pour gérer la sélection de fichiers via l'input
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
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
              parsed.displayName = generateDisplayName(parsed);
              resolve(parsed);
            };
            reader.readAsText(file);
          });
        } else {
          return Promise.resolve(null);
        }
      });

      Promise.all(filePromises).then(results => {
        const validResults = results.filter(result => result !== null);
        if (validResults.length > 0) {
          setLoadedBatteries(prev => [...prev, ...validResults]);
          if (validResults.length === 1) {
            setSelectedBatteryId(validResults[0].batteryId);
            setParsedData(validResults[0]);
          }
        }
      });

      // Réinitialiser l'input pour permettre la sélection du même fichier
      e.target.value = '';
    }
  };

  // Fonction pour ouvrir l'explorateur de fichiers
  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
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

  // Fonction pour obtenir les couleurs des cellules (réservée pour usage futur)
  // const getCellColor = (index) => {
  //   const cellColors = [
  //     '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  //     '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  //     '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'
  //   ];
  //   return cellColors[index % cellColors.length];
  // };

  // Fonction pour analyser les données des cellules
  const analyzeCellData = (entry) => {
    if (!entry.cellData || !entry.cellData.voltages.length) return null;

    const voltages = entry.cellData.voltages;
    const temperatures = entry.cellData.temperatures;
    
    // Calculs statistiques pour les tensions
    const maxVoltage = Math.max(...voltages) / 1000;  // Conversion mV vers V
    const minVoltage = Math.min(...voltages) / 1000;  // Conversion mV vers V  
    const avgVoltage = voltages.reduce((acc, v) => acc + v, 0) / voltages.length / 1000;  // Conversion mV vers V
    const voltageSpread = (maxVoltage - minVoltage);
    
    // Identifier les cellules avec des problèmes (basé sur l'écart à la moyenne)
    const problematicCells = [];
    const significantDeviation = 0.020; // 20mV de tolérance
    
    voltages.forEach((voltage, index) => {
      const v = voltage / 1000;  // Conversion mV vers V
      const deviationFromAvg = Math.abs(v - avgVoltage);
      
      // Une cellule est problématique si elle s'écarte de plus de 20mV de la moyenne
      if (deviationFromAvg > significantDeviation) {
        const temp = temperatures[index] ? temperatures[index] / 1000 : null;  // Conversion mK vers °C
        problematicCells.push({
          cellIndex: index,
          voltage: v,
          temperature: temp,
          issue: v < avgVoltage ? 'Tension faible' : 'Tension élevée'
        });
      }
    });

    return {
      cellCount: voltages.length,
      maxVoltage,
      minVoltage,
      avgVoltage,
      voltageSpread,
      problematicCells,
      hasTemperatureData: temperatures.length > 0
    };
  };

  // Fonction pour préparer les données graphiques des cellules
  const prepareCellChartData = (entry) => {
    if (!entry.cellData || !entry.cellData.voltages.length) return [];

    const voltages = entry.cellData.voltages;
    const temperatures = entry.cellData.temperatures;
    const states = entry.cellData.states || [];
    const percentages = entry.cellData.percentages || [];

    return voltages.map((voltage, index) => ({
      cell: `Cell ${index + 1}`,
      voltage: voltage / 1000,  // Conversion depuis mV vers V
      temperature: temperatures[index] ? temperatures[index] / 1000 : null,  // Conversion depuis mK vers °C
      state1: states[index]?.state1 || 'N/A',
      state2: states[index]?.state2 || 'N/A',
      percentage: percentages[index] || 'N/A'
    }));
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

  // Fonctions d'analyse avancée
  const performAdvancedAnalysis = () => {
    if (loadedBatteries.length === 0) return;

    const results = {
      batteryHealth: analyzeBatteryHealth(),
      degradationAnalysis: analyzeDegradation(),
      cellBalance: analyzeCellBalance(),
      performanceComparison: comparePerformance(),
      riskAssessment: assessRisk(),
      recommendations: generateRecommendations()
    };

    setAnalysisResults(results);
    // setShowAdvancedAnalysis(true);
    setSelectedSection('advanced');
  };

  const analyzeBatteryHealth = () => {
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
        estimatedLifeRemaining: Math.max(0, (8000 - cycles) / 365) // années estimées (8000 cycles typique)
      };
    });
  };

  const analyzeDegradation = () => {
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

  const analyzeCellBalance = () => {
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
      // const cellVoltages = []; // Pas utilisé pour le moment
      
      // Extraire les tensions de cellules depuis les données historiques
      // Note: Les données de cellules individuelles ne sont pas parsées dans la version actuelle
      // Nous utilisons les données disponibles (voltageLowest, voltageHighest)
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

  const comparePerformance = () => {
    if (loadedBatteries.length < 2) return [];

    const comparison = loadedBatteries.map((battery, index) => {
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
        performanceScore: (soh * 0.4) + ((8000 - cycles) / 8000 * 30) + (Math.min(avgVoltage / 54 * 20, 20)) + (Math.max(20 - (battery.alerts.length * 2), 0)) + ((avgTemp > 15 && avgTemp < 35) ? 10 : Math.max(0, 10 - Math.abs(avgTemp - 25)))
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

  const assessRisk = () => {
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
      
      // Détermination du niveau de risque
      let riskLevel = 'Faible';
      if (riskScore >= 70) riskLevel = 'Critique';
      else if (riskScore >= 40) riskLevel = 'Élevé';
      else if (riskScore >= 20) riskLevel = 'Modéré';
      
      return {
        batteryId: battery.batteryId,
        displayName: battery.displayName,
        riskScore: Math.min(100, riskScore),
        riskLevel,
        riskFactors
      };
    });
  };

  const generateRecommendations = () => {
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
          message: 'SOH moyen du système bas - Évaluer le remplacement du parc',
          priority: 1
        });
      }
      
      // Vérifier la disparité entre batteries
      const sohValues = loadedBatteries.map(b => parseInt(b.stats['SOH']?.replace('%', '') || '100'));
      const sohRange = Math.max(...sohValues) - Math.min(...sohValues);
      
      if (sohRange > 15) {
        recommendations.push({
          type: 'warning',
          battery: 'Système global',
          message: 'Grande disparité entre batteries - Rééquilibrage recommandé',
          priority: 2
        });
      }
    }
    
    return recommendations.sort((a, b) => a.priority - b.priority);
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
                <XAxis 
                  dataKey="timestamp" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
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
                <XAxis 
                  dataKey="timestamp" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
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
                <XAxis 
                  dataKey="timestamp" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
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

  const renderAdvancedAnalysisSection = () => {
    if (!analysisResults) return null;

    return (
      <div className="section advanced-analysis">
        <h2>
          <Activity className="text-purple" />
          Analyses Avancées - Évaluation Complète du Système
        </h2>

        {/* Vue d'ensemble */}
        <div className="analysis-overview">
          <h3>Vue d'Ensemble du Système</h3>
          <div className="overview-cards">
            <div className="overview-card">
              <div className="card-icon">🔋</div>
              <div className="card-content">
                <div className="card-value">{loadedBatteries.length}</div>
                <div className="card-label">Batteries analysées</div>
              </div>
            </div>
            <div className="overview-card">
              <div className="card-icon">💚</div>
              <div className="card-content">
                <div className="card-value">
                  {analysisResults.batteryHealth.filter(b => b.healthStatus === 'Excellent').length}
                </div>
                <div className="card-label">En excellent état</div>
              </div>
            </div>
            <div className="overview-card">
              <div className="card-icon">⚠️</div>
              <div className="card-content">
                <div className="card-value">
                  {analysisResults.riskAssessment.filter(r => r.riskLevel === 'Élevé' || r.riskLevel === 'Critique').length}
                </div>
                <div className="card-label">À risque</div>
              </div>
            </div>
            <div className="overview-card">
              <div className="card-icon">📋</div>
              <div className="card-content">
                <div className="card-value">{analysisResults.recommendations.length}</div>
                <div className="card-label">Recommandations</div>
              </div>
            </div>
          </div>
        </div>

        {/* État de santé des batteries */}
        <div className="analysis-section">
          <h3>
            <Battery className="text-green" />
            État de Santé (SOH) et Performances
          </h3>
          <div className="health-grid">
            {analysisResults.batteryHealth.map((battery) => (
              <div key={battery.batteryId} className="health-card">
                <div className="health-header">
                  <h4>{battery.displayName}</h4>
                  <span className={`health-badge health-${battery.healthStatus.toLowerCase()}`}>
                    {battery.healthStatus}
                  </span>
                </div>
                <div className="health-metrics">
                  <div className="metric">
                    <span className="metric-label">SOH:</span>
                    <span className="metric-value">
                      {battery.soh}%
                      {battery.sohSource === 'estimé' && (
                        <span className="soh-estimated" title="Valeur estimée - SOH non disponible dans le fichier">*</span>
                      )}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Cycles:</span>
                    <span className="metric-value">{battery.cycles.toLocaleString()}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Score santé:</span>
                    <span className="metric-value">{battery.healthScore}/100</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Vie estimée:</span>
                    <span className="metric-value">{battery.estimatedLifeRemaining.toFixed(1)} ans</span>
                  </div>
                </div>
                <div className="health-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${battery.healthScore}%`,
                        backgroundColor: battery.healthScore > 90 ? '#22c55e' : 
                                      battery.healthScore > 70 ? '#f59e0b' : '#ef4444'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {analysisResults.batteryHealth.some(b => b.sohSource === 'estimé') && (
            <div className="soh-legend">
              <p><span className="soh-estimated">*</span> SOH estimé - La valeur SOH n'était pas disponible dans le fichier historique. L'estimation est basée sur les cycles de charge, la tension moyenne et le pourcentage de puissance.</p>
            </div>
          )}
        </div>

        {/* Analyse de dégradation */}
        <div className="analysis-section">
          <h3>
            <TrendingDown className="text-orange" />
            Analyse de Dégradation
          </h3>
          <div className="degradation-table">
            <table>
              <thead>
                <tr>
                  <th>Batterie</th>
                  <th>Tendance</th>
                  <th>Taux de dégradation</th>
                  <th>Dégradation SOC</th>
                  <th>Tension récente</th>
                  <th>Tension ancienne</th>
                </tr>
              </thead>
              <tbody>
                {analysisResults.degradationAnalysis.map((analysis) => (
                  <tr key={analysis.batteryId}>
                    <td>{analysis.displayName}</td>
                    <td>
                      <span className={`trend-badge trend-${analysis.trend.toLowerCase().replace(/\s+/g, '-')}`}>
                        {analysis.trend}
                      </span>
                    </td>
                    <td>{analysis.degradationRate}%</td>
                    <td>{analysis.socDegradation}%</td>
                    <td>{analysis.recentAvgVoltage}V</td>
                    <td>{analysis.olderAvgVoltage}V</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Équilibrage des cellules */}
        <div className="analysis-section">
          <h3>
            <Cpu className="text-blue" />
            Équilibrage des Cellules
          </h3>
          <div className="cell-balance-grid">
            {analysisResults.cellBalance.map((balance) => (
              <div key={balance.batteryId} className="balance-card">
                <h4>{balance.displayName}</h4>
                <div className="balance-status">
                  <span className={`balance-badge balance-${balance.balanceStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                    {balance.balanceStatus}
                  </span>
                </div>
                <div className="balance-metrics">
                  <div className="metric">
                    <span className="metric-label">Déséquilibre max:</span>
                    <span className="metric-value">{balance.imbalance} mV</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Déséquilibre moyen:</span>
                    <span className="metric-value">{balance.avgImbalance} mV</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparaison des performances */}
        {loadedBatteries.length > 1 && (
          <div className="analysis-section">
            <h3>
              <BarChart3 className="text-purple" />
              Comparaison des Performances
            </h3>
            <div className="performance-table">
              <table>
                <thead>
                  <tr>
                    <th>Rang</th>
                    <th>Batterie</th>
                    <th>Performance</th>
                    <th>SOH</th>
                    <th>Cycles</th>
                    <th>Tension moy.</th>
                    <th>Temp. moy.</th>
                    <th>Alertes</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResults.performanceComparison.map((perf) => (
                    <tr key={perf.batteryId}>
                      <td className={`rank-${perf.rank <= 2 ? 'top' : perf.rank <= loadedBatteries.length / 2 ? 'middle' : 'bottom'}`}>
                        #{perf.rank}
                      </td>
                      <td>{perf.displayName}</td>
                      <td>
                        <span className={`performance-badge performance-${perf.relativePerformance.toLowerCase().replace(/\s+/g, '-')}`}>
                          {perf.relativePerformance}
                        </span>
                      </td>
                      <td>{perf.soh}%</td>
                      <td>{perf.cycles.toLocaleString()}</td>
                      <td>{perf.avgVoltage}V</td>
                      <td>{perf.avgTemp}°C</td>
                      <td>{perf.alerts}</td>
                      <td>{perf.performanceScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Évaluation des risques */}
        <div className="analysis-section">
          <h3>
            <AlertCircle className="text-red" />
            Évaluation des Risques
          </h3>
          <div className="risk-grid">
            {analysisResults.riskAssessment.map((risk) => (
              <div key={risk.batteryId} className="risk-card">
                <div className="risk-header">
                  <h4>{risk.displayName}</h4>
                  <span className={`risk-badge risk-${risk.riskLevel.toLowerCase()}`}>
                    {risk.riskLevel}
                  </span>
                </div>
                <div className="risk-score">
                  <div className="score-circle">
                    <div 
                      className="score-fill" 
                      style={{ 
                        background: `conic-gradient(${
                          risk.riskScore > 60 ? '#ef4444' : 
                          risk.riskScore > 30 ? '#f59e0b' : '#22c55e'
                        } ${risk.riskScore * 3.6}deg, #f3f4f6 0deg)`
                      }}
                    >
                      <div className="score-inner">
                        <span className="score-value">{risk.riskScore}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="risk-factors">
                  <h5>Facteurs de risque:</h5>
                  {risk.riskFactors.length > 0 ? (
                    <ul>
                      {risk.riskFactors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-risk">Aucun facteur de risque identifié</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommandations */}
        <div className="analysis-section">
          <h3>
            <CheckCircle className="text-green" />
            Recommandations
          </h3>
          <div className="recommendations-list">
            {analysisResults.recommendations.length > 0 ? (
              analysisResults.recommendations.map((rec, index) => (
                <div key={index} className={`recommendation recommendation-${rec.type}`}>
                  <div className="recommendation-icon">
                    {rec.type === 'critical' ? <AlertCircle /> : 
                     rec.type === 'warning' ? <AlertTriangle /> : <Info />}
                  </div>
                  <div className="recommendation-content">
                    <div className="recommendation-battery">{rec.battery}</div>
                    <div className="recommendation-message">{rec.message}</div>
                  </div>
                  <div className="recommendation-priority">
                    Priorité {rec.priority}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-recommendations">
                <CheckCircle className="text-green" />
                <p>Aucune recommandation critique. Toutes les batteries fonctionnent dans les paramètres normaux.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDetailedAnalysisSection = () => {
    if (!showDetailedAnalysis || !parsedData?.history?.length) return null;

    // Trouver les entrées avec des données de cellules
    const entriesWithCellData = parsedData.history.filter(entry => 
      entry.cellData && entry.cellData.voltages.length > 0
    );

    if (entriesWithCellData.length === 0) {
      return (
        <div className="section detailed-analysis">
          <h2>
            <Cpu className="text-blue" />
            Recherche Détaillée - Analyse par Cellule
          </h2>
          <div className="no-cell-data">
            <p>Aucune donnée détaillée de cellule trouvée dans ce fichier historique.</p>
            <p>Les données de cellules individuelles ne sont peut-être pas disponibles dans cette version du fichier.</p>
          </div>
        </div>
      );
    }

    // const latestEntry = entriesWithCellData[0];

    return (
      <div className="section detailed-analysis">
        <h2>
          <Cpu className="text-blue" />
          Recherche Détaillée - Analyse par Cellule
        </h2>
        <div className="detailed-analysis-controls">
          <button 
            onClick={() => {
              setShowDetailedAnalysis(false);
              setSelectedCellEntry(null);
              setSelectedSection('info');
            }}
            className="btn-close-detailed"
          >
            <X size={16} />
            Fermer l'analyse détaillée
          </button>
        </div>

        {/* Sélecteur d'entrée temporelle */}
        <div className="time-selector">
          <h3>Sélectionner une entrée temporelle</h3>
          <div className="time-entries">
            {entriesWithCellData.slice(0, 20).map((entry, index) => {
              const displayTime = entry.useCorrectedDate ? 
                `${entry.correctedDay} ${entry.correctedTime}` : 
                `${entry.day} ${entry.time}`;
              
              return (
                <button
                  key={entry.id}
                  onClick={() => setSelectedCellEntry(entry)}
                  className={`time-entry ${selectedCellEntry?.id === entry.id ? 'active' : ''}`}
                >
                  <span className="entry-time">{displayTime}</span>
                  <span className="entry-cells">{entry.cellData.cellCount} cellules</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Analyse de l'entrée sélectionnée ou la plus récente */}
        {(() => {
          const currentEntry = selectedCellEntry || entriesWithCellData[0];
          const currentAnalysis = analyzeCellData(currentEntry);
          const currentChartData = prepareCellChartData(currentEntry);

          if (!currentAnalysis) return null;

          const displayTime = currentEntry.useCorrectedDate ? 
            `${currentEntry.correctedDay} ${currentEntry.correctedTime}` : 
            `${currentEntry.day} ${currentEntry.time}`;

          return (
            <div className="cell-analysis-content">
              <h3>Analyse détaillée - {displayTime}</h3>
              
              {/* Statistiques générales */}
              <div className="cell-stats-overview">
                <div className="stat-card">
                  <div className="stat-label">Cellules analysées</div>
                  <div className="stat-value">{currentAnalysis.cellCount}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Tension moyenne</div>
                  <div className="stat-value">{currentAnalysis.avgVoltage.toFixed(3)}V</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Écart de tension</div>
                  <div className="stat-value">{(currentAnalysis.voltageSpread * 1000).toFixed(0)}mV</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Cellules problématiques</div>
                  <div className="stat-value">{currentAnalysis.problematicCells.length}</div>
                </div>
              </div>

              {/* Graphique des tensions par cellule */}
              <div className="cell-charts-container">
                <div className="chart-wrapper">
                  <h4>Tensions des Cellules</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={currentChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cell" />
                      <YAxis 
                        yAxisId="voltage" 
                        orientation="left" 
                        domain={['dataMin - 0.01', 'dataMax + 0.01']}
                        tickFormatter={(value) => `${Number(value).toFixed(3)}`}
                        type="number"
                      />
                      <Tooltip formatter={(value, name, props) => {
                        if (props.dataKey === 'voltage') {
                          return [`${value.toFixed(3)}V`, 'Tension'];
                        } else if (props.dataKey === 'temperature') {
                          return [`${value?.toFixed(1)}°C`, 'Température'];
                        }
                        return [value, name];
                      }} />
                      <Legend />
                      <Bar yAxisId="voltage" dataKey="voltage" fill="#3b82f6" name="Tension (V)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {currentAnalysis.hasTemperatureData && (
                  <div className="chart-wrapper">
                    <h4>Températures des Cellules</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={currentChartData.filter(d => d.temperature !== null)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="cell" />
                        <YAxis domain={['dataMin - 1', 'dataMax + 1']} />
                        <Tooltip formatter={(value) => [`${value?.toFixed(1)}°C`, 'Température']} />
                        <Legend />
                        <Bar dataKey="temperature" fill="#f59e0b" name="Température (°C)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Tableau détaillé des cellules */}
              <div className="cells-detail-table">
                <h4>Détail par Cellule</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Cellule</th>
                        <th>Tension (V)</th>
                        <th>Écart moy. (mV)</th>
                        {currentAnalysis.hasTemperatureData && <th>Température (°C)</th>}
                        <th>État cellule</th>
                        <th>Charge (%)</th>
                        <th>Statut global</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentEntry.cellData.voltages.map((voltage, index) => {
                        const v = voltage / 1000;  // Conversion mV vers V
                        const temp = currentEntry.cellData.temperatures[index] ? 
                          currentEntry.cellData.temperatures[index] / 1000 : null;  // Conversion mK vers °C
                        const deviation = ((v - currentAnalysis.avgVoltage) * 1000);
                        const cellState = currentEntry.cellData.states ? currentEntry.cellData.states[index] : null;
                        const percentage = currentEntry.cellData.percentages ? currentEntry.cellData.percentages[index] : null;
                        
                        let status = 'normal';
                        if (Math.abs(deviation) > 20) status = 'warning';
                        if (Math.abs(deviation) > 50) status = 'critical';
                        
                        // Vérifier aussi les états de la cellule pour déterminer le statut
                        if (cellState && (cellState.state1 !== 'Normal' || cellState.state2 !== 'Normal')) {
                          status = 'warning';
                        }
                        
                        return (
                          <tr key={index} className={status}>
                            <td>Cellule {index + 1}</td>
                            <td>{v.toFixed(3)}</td>
                            <td className={deviation > 0 ? 'positive-deviation' : 'negative-deviation'}>
                              {deviation > 0 ? '+' : ''}{deviation.toFixed(0)}
                            </td>
                            {currentAnalysis.hasTemperatureData && (
                              <td>{temp ? temp.toFixed(1) : 'N/A'}</td>
                            )}
                            <td>
                              {cellState ? (
                                <div className="cell-state-details">
                                  <span className={`state-indicator ${cellState.state1 === 'Normal' ? 'state-normal' : 'state-warning'}`}>
                                    {cellState.state1}
                                  </span>
                                  <span className={`state-indicator ${cellState.state2 === 'Normal' ? 'state-normal' : 'state-warning'}`}>
                                    {cellState.state2}
                                  </span>
                                </div>
                              ) : 'N/A'}
                            </td>
                            <td>{percentage || 'N/A'}</td>
                            <td>
                              <span className={`cell-status cell-status-${status}`}>
                                {status === 'normal' ? '✓ Normal' :
                                 status === 'warning' ? '⚠ Attention' : '❌ Critique'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cellules problématiques */}
              {currentAnalysis.problematicCells.length > 0 && (
                <div className="problematic-cells">
                  <h4>Cellules Nécessitant une Attention</h4>
                  <div className="problem-cells-grid">
                    {currentAnalysis.problematicCells.map((cell, index) => (
                      <div key={index} className="problem-cell-card">
                        <div className="problem-cell-header">
                          <span className="cell-number">Cellule {cell.cellIndex + 1}</span>
                          <span className="cell-issue">{cell.issue}</span>
                        </div>
                        <div className="problem-cell-details">
                          <div className="cell-detail">
                            <span className="detail-label">Tension:</span>
                            <span className="detail-value">{cell.voltage.toFixed(3)}V</span>
                          </div>
                          {cell.temperature && (
                            <div className="cell-detail">
                              <span className="detail-label">Température:</span>
                              <span className="detail-value">{cell.temperature.toFixed(1)}°C</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
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
          <>
            {/* Input file caché pour l'ouverture de l'explorateur */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".txt"
              multiple
              style={{ display: 'none' }}
            />
            <div
              className="drop-zone"
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onClick={handleDropZoneClick}
            >
            <div className="upload-icon">📁</div>
            <p>Glissez et déposez vos fichiers historique.txt ici</p>
            <p>📊 Un ou plusieurs fichiers : Analyse et comparaison automatique</p>
            <p>Ou cliquez pour sélectionner</p>
            </div>
          </>
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
                  <button
                    onClick={() => {
                      if (!analysisResults) {
                        performAdvancedAnalysis();
                      }
                      setSelectedSection('advanced');
                    }}
                    className={`tab ${selectedSection === 'advanced' ? 'active' : ''}`}
                  >
                    <Activity size={16} />
                    Analyses Avancées
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailedAnalysis(true);
                      setSelectedSection('detailed');
                    }}
                    className={`tab ${selectedSection === 'detailed' ? 'active' : ''}`}
                  >
                    <Cpu size={16} />
                    Recherche Détaillée
                  </button>
                </div>
                
                {selectedSection === 'info' && renderInfoSection()}
                {selectedSection === 'stats' && renderStatsSection()}
                {selectedSection === 'alerts' && renderAlertsSection()}
                {selectedSection === 'history' && renderHistorySection()}
                {selectedSection === 'charts' && renderChartsSection()}
                {selectedSection === 'advanced' && renderAdvancedAnalysisSection()}
                {selectedSection === 'detailed' && renderDetailedAnalysisSection()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PylontechParser;