const browserBase = require('../browser-legacy');
const ciUrl = require('./common/urls');

module.exports = Object.assign({}, browserBase, {
  settings: Object.assign({}, browserBase.settings, {
    channel: '99',
    onBoardingVersion: -1, // Disable onboarding
  }, ciUrl),
  default_prefs: Object.assign({}, browserBase.default_prefs, {
    freshtabConfig: JSON.stringify({
      background: {
        image: 'bg-default'
      }
    }),
  }),
  modules: browserBase.modules
    .concat([
      'dropdown-tests',
      'integration-tests',
    ]),
  bundles: browserBase.bundles
    .concat([
      "core/content-tests.bundle.js",
      "core/integration-tests.bundle.js",
      "integration-tests/run.bundle.js",
    ]),
});
