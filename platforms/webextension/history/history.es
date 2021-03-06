import { chrome } from '../globals';

export default class {
  static deleteVisit(visitId) {
    return chrome.cliqz.history.deleteVisit(+visitId);
  }

  static deleteVisits(visitIds) {
    return visitIds.reduce(
      (deletePromise, visitId) => deletePromise.then(() => this.deleteVisit(visitId)),
      Promise.resolve()
    );
  }

  static showHistoryDeletionPopup() {
    return chrome.cliqz.history.showHistoryDeletionPopup();
  }

  static fillFromVisit(url, triggeringUrl) {
    return chrome.cliqz.history.fillFromVisit(url, triggeringUrl);
  }

  static markAsHidden(url) {
    return chrome.cliqz.history.markAsHidden(url);
  }

  static cleanupEmptySearches() {
    return chrome.cliqz.history.cleanupEmptySearches();
  }

  static addVisit({ url, title, transition, visitTime }) {
    if (!url || !visitTime) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      chrome.history.addUrl({
        url,
        title,
        transition: transition || chrome.history.TransitionType.TYPED,
        visitTime,
      }, () => {
        const e = chrome.runtime.lastError;
        if (e) {
          reject(e);
        } else {
          resolve();
        }
      });
    });
  }

  static migrate() {
    // There is nothing to migrate on this platform (OR IS IT?)
    return Promise.resolve();
  }

  static query({ limit, frameStartsAt, frameEndsAt, domain, query }) {
    if (typeof frameStartsAt === 'string') {
      // eslint-disable-next-line
      frameStartsAt = +frameStartsAt;
    }
    if (typeof frameEndsAt === 'string') {
      // eslint-disable-next-line
      frameEndsAt = +frameEndsAt;
    }
    return chrome.cliqz.history.query({ limit, frameStartsAt, frameEndsAt, domain, query });
  }

  static queryVisitsForTimespan({ frameStartsAt, frameEndsAt }) {
    return new Promise((resolve) => {
      if (chrome.history) {
        chrome.history.search({
          text: '',
          startTime: frameStartsAt / 1000,
          endTime: frameEndsAt / 1000,
        }, (items) => {
          resolve(items.map(({ url, lastVisitTime }) => ({
            url,
            ts: lastVisitTime
          })));
        });
      } else {
        resolve([]);
      }
    });
  }
}
