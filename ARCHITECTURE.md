# Architecture du Projet Pylontech-Parser

## Vue d'ensemble

Ce document décrit l'architecture refactorisée de l'application Pylontech-Parser. La refactorisation a pour objectif d'améliorer la maintenabilité, la testabilité et la réutilisabilité du code.

## Problèmes de l'ancienne architecture

- **Composant monolithique**: App.js contenait 2971 lignes de code
- **Couplage fort**: Logique métier, UI et état mélangés
- **Tests difficiles**: Impossible de tester les fonctions isolément
- **Réutilisabilité limitée**: Code difficilement réutilisable
- **Maintenance complexe**: Modifications risquées et difficiles

## Nouvelle architecture

### Structure des dossiers

```
src/
├── components/          # Composants React UI (à créer progressivement)
│   └── (futurs composants)
├── hooks/              # Custom React hooks
│   ├── useBatteryData.js
│   ├── useDatabase.js
│   └── useTheme.js
├── services/           # Logique métier
│   ├── __tests__/     # Tests unitaires des services
│   │   ├── parser.test.js
│   │   └── analysis.test.js
│   ├── parser.js      # Parsing des fichiers Pylontech
│   ├── analysis.js    # Analyse de santé et dégradation
│   ├── alerts.js      # Génération et filtrage d'alertes
│   └── export.js      # Export CSV, JSON, PDF
├── utils/             # Fonctions utilitaires
│   └── formatters.js  # Formatage de données
├── constants/         # Constantes de l'application
│   └── thresholds.js  # Seuils et valeurs par défaut
├── database.js        # Gestionnaire de base de données (Dexie)
├── App.js            # Composant principal (à refactoriser)
└── index.js          # Point d'entrée
```

## Modules créés

### 1. Constants (`/constants`)

**`thresholds.js`**
- Constantes pour les seuils d'alertes
- Filtres par défaut
- Configuration de l'application

```javascript
export const DEFAULT_THRESHOLDS = {
  tempWarning: 40,
  tempCritical: 45,
  voltageHigh: 53.2,
  voltageLow: 48.0,
  // ...
};
```

### 2. Services (`/services`)

#### **`parser.js`** - Service de parsing
Responsabilités:
- Parser les fichiers historique Pylontech
- Extraire les dates depuis les noms de fichiers
- Corriger les timestamps
- Générer les IDs de batteries
- Parser les données cellulaires

Fonctions principales:
- `parseFile(content, filename)` - Parse un fichier complet
- `generateBatteryId(filename)` - Génère un ID unique
- `extractFileDatetime(filename)` - Extrait la date du fichier
- `correctHistoryDates(history, fileDate)` - Corrige les timestamps
- `generateDisplayName(batteryData)` - Génère un nom lisible

#### **`analysis.js`** - Service d'analyse
Responsabilités:
- Analyser la santé des batteries (SOH, cycles, dégradation)
- Calculer les déséquilibres cellulaires
- Comparer les performances
- Évaluer les risques
- Générer des recommandations

Fonctions principales:
- `analyzeBatteryHealth(batteries)` - Analyse SOH et santé globale
- `analyzeDegradation(batteries)` - Détecte la dégradation
- `analyzeCellBalance(batteries)` - Analyse l'équilibre des cellules
- `comparePerformance(batteries)` - Compare plusieurs batteries
- `assessRisk(batteries)` - Évalue les risques
- `generateRecommendations(batteries)` - Génère des recommandations
- `performAdvancedAnalysis(batteries)` - Analyse complète

#### **`alerts.js`** - Service d'alertes
Responsabilités:
- Générer des alertes basées sur les seuils
- Filtrer les alertes

Fonctions principales:
- `generateAlerts(history, thresholds)` - Génère les alertes
- `filterAlerts(alerts, filters)` - Filtre les alertes

#### **`export.js`** - Service d'export
Responsabilités:
- Exporter en CSV
- Exporter en JSON
- Générer des rapports PDF
- Télécharger des fichiers

Fonctions principales:
- `exportToCSV(batteryData, thresholds)` - Export CSV
- `exportToJSON(batteryData, thresholds)` - Export JSON
- `exportAllBatteries(batteries, thresholds)` - Export multi-batteries
- `generateReport(batteryData)` - Génère un rapport HTML
- `exportData(format, batteryData, thresholds)` - Export générique

### 3. Utils (`/utils`)

#### **`formatters.js`** - Utilitaires de formatage
Fonctions utilitaires:
- `getFileTimestamp()` - Timestamp pour noms de fichiers
- `downloadFile(content, filename, mimeType)` - Télécharge un fichier
- `mvToV(milliVolts)` - Convertit mV → V
- `maToA(milliAmps)` - Convertit mA → A
- `mCtoC(milliCelsius)` - Convertit m°C → °C
- `formatNumber(value, decimals)` - Formate les nombres

### 4. Hooks (`/hooks`)

#### **`useTheme.js`** - Gestion du thème
- Gère le thème clair/sombre
- Persistence dans localStorage
- Détection de la préférence système

```javascript
const { isDarkMode, toggleTheme } = useTheme();
```

#### **`useDatabase.js`** - Gestion de la base de données
- Opérations CRUD sur les batteries
- Statistiques de la base
- Export/Import
- Mise à jour automatique des stats

```javascript
const {
  dbStats,
  saveBatteries,
  loadBatteries,
  updateBatteryName,
  deleteBattery,
  clearDatabase,
  exportDatabase,
  importFromJSON
} = useDatabase();
```

#### **`useBatteryData.js`** - Gestion des données batteries
- État des batteries chargées
- Sélection de batteries
- Mode comparaison
- Édition de noms
- Ajout/Suppression de batteries

```javascript
const {
  parsedData,
  loadedBatteries,
  selectedBatteryId,
  showComparison,
  addBatteryFiles,
  selectBattery,
  removeBattery,
  renameBattery,
  toggleComparison
} = useBatteryData(thresholds);
```

## Tests unitaires

### Tests du service Parser (`parser.test.js`)
- ✅ Génération d'ID depuis nom de fichier
- ✅ Extraction de dates depuis nom de fichier
- ✅ Correction des timestamps d'historique
- ✅ Parsing de fichiers complets
- ✅ Génération de noms d'affichage

### Tests du service Analysis (`analysis.test.js`)
- ✅ Calcul du déséquilibre cellulaire
- ✅ Analyse de santé des batteries
- ✅ Détection de dégradation
- ✅ Analyse d'équilibre des cellules
- ✅ Comparaison de performances
- ✅ Évaluation des risques
- ✅ Génération de recommandations

### Exécution des tests

```bash
npm test                    # Lance tous les tests
npm test -- --watch        # Mode watch
npm test parser            # Tests du parser uniquement
npm test analysis          # Tests d'analyse uniquement
```

## Avantages de la nouvelle architecture

### 1. **Séparation des préoccupations**
- Logique métier isolée dans `/services`
- État géré par des hooks custom
- UI dans les composants (à refactoriser)

### 2. **Testabilité**
- Services testables unitairement
- Couverture de code mesurable
- Tests indépendants du framework

### 3. **Réutilisabilité**
- Services utilisables dans d'autres projets
- Hooks réutilisables
- Utilitaires génériques

### 4. **Maintenabilité**
- Code organisé par fonctionnalité
- Fichiers de taille raisonnable (< 400 lignes)
- Responsabilités claires

### 5. **Extensibilité**
- Facile d'ajouter de nouvelles analyses
- Nouveaux formats d'export simples à implémenter
- Architecture préparée pour TypeScript

## Migration progressive

L'ancienne version de App.js (2971 lignes) est sauvegardée dans `App.js.old`.

### Prochaines étapes recommandées:

1. **Refactoriser App.js progressivement**
   - Remplacer les fonctions locales par les imports de services
   - Utiliser les hooks custom
   - Extraire les fonctions de rendu en composants

2. **Créer des composants UI**
   ```
   components/
   ├── BatterySelector.jsx
   ├── InfoSection.jsx
   ├── StatsSection.jsx
   ├── AlertsSection.jsx
   ├── ChartsSection.jsx
   └── ...
   ```

3. **Migration TypeScript (optionnel)**
   - Installer TypeScript
   - Créer des types/interfaces
   - Migrer progressivement les fichiers

4. **Améliorer les tests**
   - Tests pour les hooks
   - Tests d'intégration
   - Tests E2E avec Cypress

## Exemple de refactorisation

### Avant (App.js - 2971 lignes)
```javascript
const PylontechParser = () => {
  // 20+ useState
  // 40+ fonctions helper inline
  // 10+ fonctions de rendu inline
  // 2971 lignes de code mélangé

  const parseFile = (content, filename) => {
    // 150 lignes de parsing
  };

  const analyzeBatteryHealth = () => {
    // 80 lignes d'analyse
  };

  // ... 2700+ lignes de plus
};
```

### Après (App.js refactorisé)
```javascript
import { useTheme } from './hooks/useTheme';
import { useDatabase } from './hooks/useDatabase';
import { useBatteryData } from './hooks/useBatteryData';
import { performAdvancedAnalysis } from './services/analysis';
import { exportData, generateReport } from './services/export';

const PylontechParser = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { dbStats, loadBatteries, saveBatteries } = useDatabase();
  const {
    parsedData,
    loadedBatteries,
    addBatteryFiles,
    selectBattery
  } = useBatteryData(thresholds);

  // Logique UI simplifiée
  // ~500-800 lignes au lieu de 2971
};
```

## Performance

La nouvelle architecture n'impacte pas les performances:
- Même algorithmes de parsing
- Même logique d'analyse
- Meilleure organisation du code
- Possibilité d'optimiser les imports (code splitting)

## Compatibilité

- ✅ Compatibilité totale avec les fichiers Pylontech existants
- ✅ Compatibilité avec les exports JSON précédents
- ✅ Compatibilité avec IndexedDB existante
- ✅ Pas de breaking changes dans l'API

## Conclusion

Cette refactorisation pose les bases d'une application plus maintenable et évolutive. L'architecture modulaire permet:
- Des tests unitaires complets
- Une maintenance facilitée
- Une évolution progressive
- Une collaboration d'équipe améliorée

Le code existant dans `App.js` continue de fonctionner, permettant une migration progressive sans risque.
