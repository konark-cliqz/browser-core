import {
  wait,
  registerInterval,
  clearIntervals,
  waitFor,
  Subject
} from './helpers';

import data from './fixtures/amo-all-modules';

describe("Control Center: AMO, all modules are present", function () {
  let subject;

  before(function () {
    subject = new Subject();
    return subject.load();
  })

  after(function () {
    subject.unload();
    clearIntervals();
  });

  it('loads', function () {
    chai.expect(true).to.eql(true);
  });

  describe('pushing data', function () {
    before(() => {
      return subject.pushData(data);
    });

    context('header part', function () {
      it('exists', function () {
        const headerSelector = '#control-center .amo #header';
        chai.expect(subject.query(headerSelector)).to.exist;
      });
    });

    context('current site part', function () {
      it('exists', function () {
        const sitePartSelector = '#control-center .amo #currentsite';
        chai.expect(subject.query(sitePartSelector)).to.exist;
      });
    });

    context('settings part', function () {
      it('exists', function () {
        const settingsSelector = '#control-center .amo #settings';
        chai.expect(subject.query(settingsSelector)).to.exist;
      });

      it('renders antitracking module', function () {
        const antitrackingSelector = '#control-center .amo #settings #anti-tracking';
        chai.expect(subject.query(antitrackingSelector)).to.exist;
      });

      it('renders antiphishing module', function () {
        const antiphishingSelector = '#control-center .amo #settings #anti-phising';
        chai.expect(subject.query(antiphishingSelector)).to.exist;
      });

      it('renders cliqz tab module', function () {
        const cliqzTabSelector = '#control-center .amo #settings #cliqz-tab';
        chai.expect(subject.query(cliqzTabSelector)).to.exist;
      });
    });

    context('other settings part', function () {
      it('exists', function () {
        const otherSettingsSelector = '#control-center .amo #othersettings';
        chai.expect(subject.query(otherSettingsSelector)).to.exist;
      });

      it('renders header', function () {
        const headerSelector = '#control-center .amo #othersettings .header';
        chai.expect(subject.query(headerSelector)).to.exist;
      });

      it('renders Search options', function () {
        const searchSelector = '#control-center .amo #othersettings .accordion .accordion-section-title[href="#accordion-2"]';
        chai.expect(subject.query(searchSelector)).to.exist;
      });

      it('renders History options', function () {
        const historySelector = '#control-center .amo #othersettings .accordion .accordion-section-title[href="#accordion-3"]';
        chai.expect(subject.query(historySelector)).to.exist;
      });

      it('renders MyOffrz options', function () {
        const myOffrzSelector = '#control-center .amo #othersettings .accordion .accordion-section-title[href="#accordion-4"]';
        chai.expect(subject.query(myOffrzSelector)).to.exist;
      });
    });
  });
})
