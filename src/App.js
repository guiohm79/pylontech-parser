import React, { useState, useCallback } from 'react';
import { Upload, Battery, AlertTriangle, CheckCircle, Info, Thermometer, Zap, Clock } from 'lucide-react';
import './App.css';

const PylontechParser = () => {
  const [fileData, setFileData] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [selectedSection, setSelectedSection] = useState('info');
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

  const parseFile = (content) => {
    const lines = content.split('\n');
    const data = {
      info: {},
      stats: {},
      history: [],
      alerts: []
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
    
    return data;
  };

  const generateAlerts = (history, thresholds) => {
    const alerts = [];
    
    history.forEach(entry => {
      const tempC = entry.temperature / 1000;
      const voltageV = entry.voltage / 1000;
      
      if (tempC > thresholds.tempWarning) {
        alerts.push({
          type: tempC > thresholds.tempCritical ? 'critical' : 'warning',
          message: `Température élevée: ${tempC.toFixed(1)}°C`,
          timestamp: `${entry.day} ${entry.time}`,
          entry: entry
        });
      }
      
      if (voltageV > thresholds.voltageHigh || voltageV < thresholds.voltageLow) {
        alerts.push({
          type: (voltageV > thresholds.voltageHighCritical || voltageV < thresholds.voltageLowCritical) ? 'critical' : 'warning',
          message: `Tension ${voltageV > thresholds.voltageHigh ? 'haute' : 'basse'}: ${voltageV.toFixed(2)}V`,
          timestamp: `${entry.day} ${entry.time}`,
          entry: entry
        });
      }
    });
    
    return alerts;
  };

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setFileData(content);
        const parsed = parseFile(content);
        parsed.alerts = generateAlerts(parsed.history, thresholds);
        setParsedData(parsed);
      };
      reader.readAsText(file);
    }
  }, [thresholds]);

  const handleDragOver = (e) => {
    e.preventDefault();
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
                  if (parsedData) {
                    const newParsedData = {...parsedData};
                    newParsedData.alerts = generateAlerts(parsedData.history, newThresholds);
                    setParsedData(newParsedData);
                  }
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
                  if (parsedData) {
                    const newParsedData = {...parsedData};
                    newParsedData.alerts = generateAlerts(parsedData.history, newThresholds);
                    setParsedData(newParsedData);
                  }
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
                  if (parsedData) {
                    const newParsedData = {...parsedData};
                    newParsedData.alerts = generateAlerts(parsedData.history, newThresholds);
                    setParsedData(newParsedData);
                  }
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
                  if (parsedData) {
                    const newParsedData = {...parsedData};
                    newParsedData.alerts = generateAlerts(parsedData.history, newThresholds);
                    setParsedData(newParsedData);
                  }
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
                  if (parsedData) {
                    const newParsedData = {...parsedData};
                    newParsedData.alerts = generateAlerts(parsedData.history, newThresholds);
                    setParsedData(newParsedData);
                  }
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
                  if (parsedData) {
                    const newParsedData = {...parsedData};
                    newParsedData.alerts = generateAlerts(parsedData.history, newThresholds);
                    setParsedData(newParsedData);
                  }
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
                    <td>{entry.day} {entry.time}</td>
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
 
  return (
    <div className="App">
      <div className="container">
        <h1>Parser Pylontech - Analyseur de Logs</h1>
        
        {!parsedData ? (
          <div
            className="drop-zone"
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
          >
            <div className="upload-icon">📁</div>
            <p>Glissez et déposez votre fichier historique.txt ici</p>
            <p>Ou cliquez pour sélectionner un fichier</p>
          </div>
        ) : (
          <div>
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
            </div>
            
            {selectedSection === 'info' && renderInfoSection()}
            {selectedSection === 'stats' && renderStatsSection()}
            {selectedSection === 'alerts' && renderAlertsSection()}
            {selectedSection === 'history' && renderHistorySection()}
          </div>
        )}
      </div>
    </div>
  );
};

export default PylontechParser;