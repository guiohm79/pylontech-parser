#  Pylontech Parser - Analyseur de Logs Multi-Batteries

[![React](https://img.shields.io/badge/React-19.1.0-61dafb?logo=react)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/guiohm79/pylontech-parser)

Une application web moderne et puissante pour analyser et visualiser les logs des batteries Pylontech exportés depuis le logiciel **Battery View**. Conçue pour les installateurs, techniciens et professionnels du monitoring de systèmes de stockage d'énergie.

## 📋 Table des Matières

- [À Propos](#-à-propos)
- [Fonctionnalités](#-fonctionnalités)
- [Installation](#-installation)
- [Utilisation](#-utilisation)
- [Format des Fichiers](#-format-des-fichiers)
- [Architecture](#-architecture)
- [Technologies](#-technologies)
- [Tests](#-tests)
- [Contribution](#-contribution)
- [Licence](#-licence)

##  À Propos

**Pylontech Parser** est un outil d'analyse avancé qui permet de transformer les fichiers historiques bruts des batteries Pylontech (format `.txt`) en visualisations interactives et analyses approfondies.

### Origine des Données

Les fichiers analysés par cette application sont exportés depuis le logiciel officiel **Battery View** de Pylontech. Battery View est l'outil de gestion fourni par Pylontech pour surveiller les batteries en temps réel. Cet outil permet d'exporter l'historique complet d'une batterie sous forme de fichiers texte.

**Pylontech Parser** prend ces exports et les transforme en :
-  Graphiques de tendances interactifs
-  Analyses de santé détaillées (SOH, cycles, dégradation)
-  Système d'alertes intelligent
-  Comparaisons multi-batteries
-  Base de données locale persistante
-  Exports et rapports professionnels

### Cas d'Usage

- **Installateurs solaires** : Diagnostic rapide après installation
- **Techniciens SAV** : Analyse de pannes et dégradations
- **Gestionnaires de parcs** : Monitoring de plusieurs batteries
- **Auditeurs énergétiques** : Rapports de performance détaillés
- **Particuliers** : Suivi de leur installation personnelle

##  Fonctionnalités

###  Import et Gestion de Données

- **Drag & Drop** : Glissez-déposez vos fichiers `.txt` directement
- **Multi-fichiers** : Importez plusieurs batteries simultanément
- **Parsing intelligent** : Extraction automatique de toutes les données
- **Correction de dates** : Reconstruction des timestamps à partir des métadonnées
- **Base de données locale** : Stockage persistant avec IndexedDB (Dexie)
- **Import/Export** : Sauvegardez et restaurez vos analyses (JSON)

###  Analyse de Santé des Batteries

#### État de Santé (SOH)
- Calcul multi-méthodes avec fallback automatique
- Estimation basée sur cycles, tension, et power percent
- Classification : Excellent → Très Bon → Bon → Dégradé → Critique
- Durée de vie estimée restante

#### Analyse de Dégradation
- Détection de tendances (stable, modérée, rapide)
- Comparaison tension/SOC ancienne vs récente
- Taux de dégradation calculé
- Alertes préventives

#### Équilibrage Cellulaire
- Analyse du déséquilibre des 15 cellules
- Détection des cellules défectueuses
- Visualisation des écarts de tension
- Seuils configurables

###  Système d'Alertes

- **Alertes de température** : Warning (>40°C) / Critique (>45°C)
- **Alertes de tension** : Haute/Basse avec niveaux critiques
- **Filtrage intelligent** : Par type, par sévérité
- **Seuils configurables** : Adaptez aux spécificités de votre installation
- **Historique complet** : Toutes les alertes horodatées

###  Visualisations Graphiques

#### Graphiques Disponibles
- **Tension** : Line chart avec tendances
- **Température** : Évolution thermique
- **SOC (State of Charge)** : Niveau de charge dans le temps
- **Courant** : Charge et décharge
- **Déséquilibre cellulaire** : Graphiques de voltage par cellule

#### Mode Comparaison
- Superposition de plusieurs batteries
- Comparaison des performances
- Détection des anomalies relatives
- Classement automatique

###  Analyses Avancées

- **Comparaison de performances** : Scoring et classement
- **Évaluation des risques** : Score de risque avec facteurs détaillés
- **Recommandations automatiques** : Maintenance, remplacement, surveillance
- **Recherche détaillée** : Filtrage avancé dans l'historique
- **Analyse cellule par cellule** : Voltage, température, états individuels

###  Export et Rapports

- **CSV** : Données tabulaires pour Excel/LibreOffice
- **JSON** : Format structuré pour traitement automatique
- **PDF** : Rapports imprimables avec statistiques
- **Export base complète** : Sauvegarde de toutes les batteries

###  Interface Utilisateur

- **Thème clair/sombre** : Adaptation automatique ou manuelle
- **Interface responsive** : Optimisée pour desktop et tablettes
- **Navigation par onglets** : Infos, Stats, Alertes, Graphiques, Analyses
- **Renommage de batteries** : Noms personnalisés
- **Mode hors-ligne** : Fonctionne 100% en local

##  Installation

### Prérequis

- **Node.js** 14.0 ou supérieur
- **npm** 6.0 ou supérieur
- Navigateur moderne (Chrome, Firefox, Edge, Safari)

### Installation Standard

```bash
# 1. Cloner le dépôt
git clone https://github.com/guiohm79/pylontech-parser.git
cd pylontech-parser

# 2. Installer les dépendances
npm install

# 3. Lancer en mode développement
npm start

# 4. Ouvrir dans le navigateur
# http://localhost:3000
```

### Build de Production

```bash
# Créer un build optimisé
npm run build

# Servir le build avec un serveur statique
npx serve -s build
```

### Installation Docker (Optionnel)

```bash
# Créer l'image
docker build -t pylontech-parser .

# Lancer le conteneur
docker run -p 3000:3000 pylontech-parser
```

## 📖 Utilisation

### 1. Exporter les Logs depuis Battery View

1. Ouvrez le logiciel **Battery View** de Pylontech
2. Connectez-vous à votre batterie via USB/RS232/RS485
3. Allez dans le menu d'export de l'historique
4. Sélectionnez **"Export History"** ou équivalent
5. Enregistrez le fichier au format `.txt`

Le fichier exporté aura typiquement ce format :
```
HABC1234_history_20240115143000.txt
```

### 2. Importer dans Pylontech Parser

**Méthode 1 : Drag & Drop**
- Glissez-déposez le(s) fichier(s) `.txt` dans la zone d'upload

**Méthode 2 : Sélection de fichier**
- Cliquez sur la zone d'upload
- Sélectionnez un ou plusieurs fichiers

### 3. Naviguer dans l'Interface

#### Onglet "Infos Système"
- Adresse device, firmware, paramètres batterie
- Métadonnées du fichier importé

#### Onglet "Statistiques"
- SOH (State of Health)
- Nombre de cycles de charge
- Power Percent, Efficiency
- Statistiques globales

#### Onglet "Alertes"
- Liste des alertes détectées
- Filtres par type et sévérité
- Réglage des seuils

#### Onglet "Historique"
- Tableau complet des entrées
- Recherche et filtrage
- Export de données sélectionnées

#### Onglet "Graphiques"
- Visualisations interactives
- Zoom, pan, tooltip
- Mode comparaison multi-batteries

#### Onglet "Analyses Avancées"
- Santé des batteries
- Analyse de dégradation
- Équilibrage cellulaire
- Comparaison de performances
- Évaluation des risques
- Recommandations

#### Onglet "Gestion des Données"
- Renommer les batteries
- Supprimer les batteries
- Exporter la base de données
- Importer une sauvegarde
- Statistiques de stockage

### 4. Exporter les Résultats

**Export CSV**
```
Date,Heure,Tension(V),Courant(A),Temperature(°C),SOC,État,TempAlert,VoltageAlert
15/01/2024,14:30:00,52.34,12.5,28.3,85,Charging,false,false
...
```

**Export JSON**
```json
{
  "exportDate": "2024-01-15T14:30:00.000Z",
  "systemInfo": { ... },
  "statistics": { ... },
  "alerts": [ ... ],
  "history": [ ... ]
}
```

**Rapport PDF**
- Génère un rapport imprimable
- Résumé des analyses
- Statistiques clés
- Liste des alertes

##  Format des Fichiers

### Nom de Fichier Attendu

```
[H|K]{SERIAL}_history_{YYYYMMDDHHMMSS}.txt
```

Exemples valides :
- `HABC1234_history_20240115143000.txt`
- `KXYZ9876_history_20231225180000.txt`

### Structure du Fichier

```
info
Device address: 2
Manufacturer: PYLON
Firmware Version: V4.3
Battery Type: LFP

stat
SOH: 95%
Charge Cnt.: 1523
Pwr Percent: 98%

data history
1 15/01/2024 14:30:00 52340 12500 28300 27000 29000 3200 3220 00 00 00 00 85 ... [cellules]
2 15/01/2024 14:29:00 52320 12400 28200 27000 29000 3195 3215 00 00 00 00 85 ... [cellules]
...
```

### Données Extraites

- **Infos système** : Device, firmware, type de batterie
- **Statistiques** : SOH, cycles, power percent
- **Historique** :
  - ID, Date, Heure
  - Tension pack (mV)
  - Courant (mA)
  - Température (m°C)
  - SOC (%)
  - États (base, voltage, current, temp)
  - **15 cellules** : tensions, températures, états individuels

##  Architecture

Le projet suit une architecture modulaire moderne pour améliorer la maintenabilité et la testabilité.

### Structure des Dossiers

```
src/
├── components/          # Composants React UI
├── hooks/              # Custom React hooks
│   ├── useBatteryData.js    # État des batteries
│   ├── useDatabase.js       # Opérations DB
│   └── useTheme.js          # Gestion du thème
├── services/           # Logique métier
│   ├── parser.js            # Parsing des fichiers
│   ├── analysis.js          # Analyses avancées
│   ├── alerts.js            # Système d'alertes
│   └── export.js            # Exports de données
├── utils/              # Fonctions utilitaires
│   └── formatters.js        # Formatage de données
├── constants/          # Constantes
│   └── thresholds.js        # Seuils par défaut
├── database.js         # Gestionnaire Dexie
├── App.js             # Composant principal
└── index.js           # Point d'entrée
```

### Principes de Design

- **Séparation des préoccupations** : Logique métier isolée des composants UI
- **Single Responsibility** : Chaque module a une responsabilité claire
- **Testabilité** : Services indépendants testables unitairement
- **Réutilisabilité** : Code modulaire réutilisable

Pour plus de détails, consultez [ARCHITECTURE.md](./ARCHITECTURE.md).

##  Technologies

### Frontend Framework
- **React 19.1.0** - Framework UI moderne
- **React Hooks** - Gestion d'état fonctionnelle

### Visualisation de Données
- **Recharts 3.1.2** - Bibliothèque de graphiques
  - Line charts, Area charts, Composed charts
  - Responsive et interactif

### Base de Données
- **Dexie 4.2.0** - Wrapper IndexedDB
  - Stockage local persistant
  - Transactions ACID
  - Requêtes optimisées avec indexes

### UI/UX
- **Lucide React 0.525.0** - Icônes modernes
- **Tailwind CSS 4.1.11** - Framework CSS utilitaire
- **CSS Variables** - Thème clair/sombre

### Testing
- **Jest** - Framework de tests
- **React Testing Library** - Tests de composants
- **@testing-library/user-event** - Simulation d'interactions

### Build Tools
- **Create React App** - Configuration webpack
- **Babel** - Transpilation ES6+
- **ESLint** - Linting du code

##  Tests

Le projet inclut une suite complète de tests unitaires.

### Exécuter les Tests

```bash
# Lancer tous les tests
npm test

# Mode watch (développement)
npm test -- --watch

# Avec couverture de code
npm test -- --coverage

# Tests spécifiques
npm test parser
npm test analysis
```

### Couverture de Tests

```
Services:
✓ parser.js      - 11 tests (100% couverture)
✓ analysis.js    - 17 tests (100% couverture)
✓ alerts.js      - Tests à venir
✓ export.js      - Tests à venir

Hooks:
○ useBatteryData.js - Tests à venir
○ useDatabase.js    - Tests à venir
○ useTheme.js       - Tests à venir
```

### Tests Disponibles

#### Parser Service
- Génération d'ID depuis nom de fichier
- Extraction de dates du nom de fichier
- Correction des timestamps d'historique
- Parsing de fichiers complets
- Parsing des données cellulaires

#### Analysis Service
- Calcul du déséquilibre cellulaire
- Analyse de santé des batteries (SOH)
- Détection de dégradation
- Analyse d'équilibre des cellules
- Comparaison de performances multi-batteries
- Évaluation des risques
- Génération de recommandations

##  Contribution

Les contributions sont les bienvenues ! Voici comment contribuer :

### Process de Contribution

1. **Fork** le projet
2. **Créer une branche** pour votre feature
   ```bash
   git checkout -b feature/ma-nouvelle-fonctionnalite
   ```
3. **Commiter** vos changements
   ```bash
   git commit -m "Ajout: Description de la fonctionnalité"
   ```
4. **Pusher** vers la branche
   ```bash
   git push origin feature/ma-nouvelle-fonctionnalite
   ```
5. **Ouvrir une Pull Request**

### Guidelines

- **Code Style** : Suivre les conventions ESLint du projet
- **Tests** : Ajouter des tests pour les nouvelles fonctionnalités
- **Documentation** : Mettre à jour le README si nécessaire
- **Commits** : Messages clairs et descriptifs
- **Pull Requests** : Description détaillée des changements

### Idées de Contributions

-  Nouveaux thèmes de couleurs
-  Nouveaux types de graphiques
-  Algorithmes d'analyse supplémentaires
-  Internationalisation (i18n)
-  Amélioration du responsive mobile
-  Corrections de bugs
-  Améliorations de la documentation

##  Signaler un Bug

Trouvé un bug ? Créez une issue sur GitHub :

1. Vérifier que le bug n'a pas déjà été signalé
2. Ouvrir une nouvelle issue
3. Inclure :
   - Description claire du problème
   - Étapes pour reproduire
   - Comportement attendu vs actuel
   - Captures d'écran si applicable
   - Version du navigateur et OS

##  Changelog

### v1.5 (Actuel)
-  Graphiques de déséquilibre cellulaire
-  Optimisations de la base de données
-  Corrections du thème sombre
-  Nouvelles analyses avancées

### v1.4
-  Recherche avancée dans l'historique
-  Analyse de dégradation améliorée
-  Performances optimisées

### v1.3
-  Framework d'analyse avancée
-  Mode comparaison multi-batteries
-  Gestion améliorée de la base de données

### v1.0
-  Version initiale
-  Import de fichiers Pylontech
-  Graphiques de base
-  Système d'alertes

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

##  Remerciements

- **Pylontech** pour la documentation des formats de fichiers
- **Battery View** pour l'outil d'export
- La communauté Open Source React
- Tous les contributeurs du projet

##  Support & Contact

- **Issues GitHub** : [github.com/guiohm79/pylontech-parser/issues](https://github.com/guiohm79/pylontech-parser/issues)
- **Discussions** : [github.com/guiohm79/pylontech-parser/discussions](https://github.com/guiohm79/pylontech-parser/discussions)

##  Star le Projet

Si ce projet vous est utile, n'hésitez pas à lui donner une étoile sur GitHub ! ⭐

---

