const publish = require('./common/publish');
const urls = require('./common/urls-ghostery');

module.exports = {
  "platform": "react-native",
  "format": "common",
  "baseURL": "/",
  "testsBasePath": "./build/modules",
  "testem_launchers": ["unit-node"],
  "testem_launchers_ci": ["unit-node"],
  "pack": "npm pack",
  "publish": publish.toEdge('browser-core', 'mobile-cards-android'),
  "isMobile": true,
  "settings": Object.assign({}, urls, {
    "RESULTS_TIMEOUT": 3000,
    "ALLOWED_COUNTRY_CODES": ["de", "at", "ch", "es", "us", "fr", "nl", "gb", "it", "se"],
    "RESULTS_PROVIDER_ORDER": ["calculator", "history", "cliqz", "querySuggestions", "instant"],
    "CLEAR_RESULTS_AT_SESSION_START": false,
  }),
  "default_prefs" : {
  },
  "modules": [
    "core",
    "static",
    "mobile-cards",
  ],
  "bundles": [
  ],
  "react_components": {
    "ExtensionApp": "./modules/mobile-cards/cliqz-ios/ExtensionApp"
  },
  "resources": {
    "bundling": "assets",
    "include": [
      "core/logo-database.json",
    ]
  }
};
