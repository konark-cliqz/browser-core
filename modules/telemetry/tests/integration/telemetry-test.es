import {
  expect,
  waitForPrefChange,
  app,
} from '../../../tests/core/test-helpers';

import prefs from '../../../core/prefs';
import { isBootstrap } from '../../../core/platform';

export default function () {
  if (!isBootstrap) {
    return;
  }

  context('telemetry tests', function () {
    afterEach(function () {
      prefs.clear('telemetry');
      prefs.clear('uploadEnabled', 'datareporting.healthreport.');
    });

    [
      { telemetry: true, uploadEnabled: true, telemetryExpected: true },
      { telemetry: false, uploadEnabled: true, telemetryExpected: false },
      { telemetry: true, uploadEnabled: false, telemetryExpected: true },
      { telemetry: false, uploadEnabled: false, telemetryExpected: false },
    ].forEach(({ telemetry, uploadEnabled, telemetryExpected }) => {
      context(`telemetry: ${telemetry}, uploadEnabled: ${uploadEnabled}`, function () {
        let telemetryModule;

        beforeEach(async function () {
          telemetryModule = app.modules.telemetry.background;

          const p = waitForPrefChange('telemetry');
          prefs.set('telemetry', telemetry);
          // uploadEnabled is used for testing that it doesn't influence anything
          prefs.set('uploadEnabled', uploadEnabled, 'datareporting.healthreport.');
          await p;
          telemetryModule.trk = [];
          telemetryModule.telemetry({ test: 'test' });
        });

        if (telemetryExpected) {
          it('signal was pushed to environment.trk', function () {
            expect(telemetryModule.trk).to.have.length.above(0);
            expect(telemetryModule.trk[0]).to.have.property('test');
          });
        } else {
          it('signal was not pushed to environment.trk', function () {
            expect(telemetryModule.trk).to.have.length(0);
          });
        }
      });
    });
  });
}
