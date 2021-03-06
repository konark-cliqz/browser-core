import Spanan from 'spanan';
import omniboxapi from '../../platform/omnibox/omnibox';
import BaseDropdownManager from './base';
import copyToClipboard from '../../platform/clipboard';
import HistoryManager from '../../core/history-manager';
import { cleanMozillaActions, isUrl } from '../../core/url';
import utils from '../../core/utils';
import events from '../../core/events';
import { closeTabsWithUrl } from '../../platform/tabs';

export default class BrowserDropdownManager extends BaseDropdownManager {
  constructor({ cliqz }) {
    super();
    this._cliqz = cliqz;
    this._cache = {
      urlbar: {},
      dropdown: {
        height: 0,
        opened: false,
      },
      lastResult: null,
    };
    this._shouldIgnoreNextBlur = false;
    this._sessionId = 0;
    omniboxapi.urlbarAction.onClicked.addListener(({ text }) => {
      this._setUrlbarValue(text);
      this._queryCliqz(text);
      omniboxapi.focus();
      this._setSelectionRange(0, text.length);
    });
  }

  get _urlbarDetails() {
    if (!this._cache.urlbar) {
      this._cache.urlbar = {};
    }
    return this._cache.urlbar;
  }

  get _dropdownDetails() {
    if (!this._cache.dropdown) {
      this._cache.dropdown = {};
    }
    return this._cache.dropdown;
  }

  get lastResult() {
    return this._cache.lastResult;
  }

  _getSessionId() {
    return this._sessionId;
  }

  _incrementSessionId() {
    this._sessionId = (this._sessionId + 1) % 1e3;
  }

  _endSession() {
    this._incrementSessionId();
    this._cliqz.search.action('resetAssistantStates');
  }

  updateURLBarCache(details) {
    Object.keys(details).forEach((name) => {
      if (typeof details[name] !== 'undefined') {
        this._cache.urlbar[name] = details[name];
      }
    });
  }

  _setURLBarDetails(details) {
    this.updateURLBarCache(details);
    return omniboxapi.update(details);
  }

  _setDropdownDetails({ height, opened }) {
    if (typeof height === 'number') {
      this._dropdownDetails.height = height;
      omniboxapi.setHeight(height);
    }
    if (typeof opened === 'boolean') {
      this._dropdownDetails.opened = opened;
      omniboxapi[opened ? 'open' : 'close']();
    }
  }

  _telemetry(...args) {
    return utils.telemetry(...args);
  }

  _reportHighlight(result) {
    this._cache.lastResult = result;
    this.selectedResult = result;
    this._cliqz.search.action('reportHighlight', result);
  }

  _adultAction(actionName) {
    return this._cliqz.search.action('adultAction', actionName)
      .then(() => {
        this.render({ rawResults: this.previousResults });
      });
  }

  _locationAction(actionName, query, rawResult) {
    return this._cliqz.search.action('locationAction', actionName, query, rawResult);
  }

  _copyToClipboard(val) {
    return copyToClipboard(val);
  }

  _reportClick(selection) {
    events.pub('ui:click-on-url', selection);
  }

  _reportEnter(selection) {
    events.pub('ui:enter', selection);
  }

  async autocompleteQuery(query, completion = '') {
    const value = `${query}${completion}`;
    if (this._getUrlbarValue() !== value) {
      const details = await omniboxapi.complete(query, completion);
      this.updateURLBarCache(details);
    } else if (completion) {
      const { selectionStart, selectionEnd } = this._getSelectionRange();
      if (selectionStart !== query.length && selectionEnd !== value.length) {
        this._setSelectionRange(query.length, value.length);
      }
    }

    this.hasAutocompleted = !!completion;
  }

  async _openLink(
    url,
    {
      newTab,
      eventType,
      result,
      resultOrder,
      meta = {},
    },
  ) {
    let href = url;
    const isFromAutocompletedURL = this.fromAutocompledURL && eventType === 'keyboard';

    if (newTab) {
      const [action, originalUrl] = cleanMozillaActions(href);
      if (action === 'switchtab') {
        href = originalUrl;
      }
    }

    const {
      windowId,
      tabId,
      incognito,
      selectionStart,
      selectionEnd,
      visibleValue: value,
    } = this._urlbarDetails;

    if (newTab) {
      // setting the flag to ignore the next blur event
      this._shouldIgnoreNextBlur = true;
    }

    await omniboxapi.update({ value: href });
    await omniboxapi.enter(newTab);
    if (newTab) {
      await omniboxapi.update({
        value,
        selectionStart,
        selectionEnd,
      });
      await omniboxapi.focus();
      this._shouldIgnoreNextBlur = false;
    } else {
      this._setHeight(0);
    }

    const onUrlClickedPayload = {
      url: href,
      query: result.query,
      rawResult: result,
      resultOrder,
      isNewTab: Boolean(newTab),
      isPrivateMode: incognito,
      isPrivateResult: utils.isPrivateResultType(result.kind),
      isFromAutocompletedURL,
      windowId,
      tabId,
      action: eventType === 'keyboard' ? 'enter' : 'click',
      elementName: meta.elementName,
    };

    this._reportClick(onUrlClickedPayload);

    if (onUrlClickedPayload.isNewTab
        || onUrlClickedPayload.isPrivateMode
        || !onUrlClickedPayload.url
        || onUrlClickedPayload.isFromAutocompletedURL
        || isUrl(result.query)
    ) {
      omniboxapi.urlbarAction.hide({});
    } else {
      omniboxapi.urlbarAction.show({ text: result.query });
    }
  }

  async _handleEnter(newTab = false) {
    const query = this.selectedResult ? this.selectedResult.query : this._getQuery();
    if (!query) {
      return;
    }

    const { windowId, id, incognito, visibleValue } = this._urlbarDetails;

    this._reportEnter({
      isPrivateMode: incognito,
      windowId,
      tabId: id,
      query,
      newTab,
      url: visibleValue,
      isFromAutocompletedURL: this.fromAutocompledURL
    });

    await this._setUrlbarValue(visibleValue);
    omniboxapi.enter(newTab);
  }

  _focus() {
    this.cancelClose();
    const { selectionStart, selectionEnd } = this._getSelectionRange();
    return omniboxapi
      .focus()
      .then(() => omniboxapi.update({ selectionStart, selectionEnd }));
  }

  _setUrlbarValue(value) {
    this._setURLBarDetails({ value });
  }

  _getUrlbarValue() {
    return this._urlbarDetails.visibleValue;
  }

  _setSelectionRange(selectionStart, selectionEnd) {
    this._setURLBarDetails({ selectionStart, selectionEnd });
  }

  _getSelectionRange() {
    const { selectionStart, selectionEnd } = this._urlbarDetails;
    return { selectionStart, selectionEnd };
  }

  _getHeight() {
    return this._dropdownDetails.height;
  }

  _setHeight(height) {
    this._setDropdownDetails({ height });
  }

  _queryCliqz(_query, { allowEmptyQuery } = { allowEmptyQuery: false }) {
    const query = _query || this._getQuery();
    const { windowId, isPasted, incognito } = this._urlbarDetails;
    const keyCode = this.lastEvent && this.lastEvent.code;

    if (query || allowEmptyQuery) {
      this._cliqz.search.action('startSearch', query, {
        allowEmptyQuery,
        isPasted,
        isPrivate: incognito,
        isTyped: true,
        keyCode,
      }, {
        contextId: windowId
      });
    } else {
      this.setHeight(0);
    }
  }

  _removeFromHistory(...args) {
    return HistoryManager.removeFromHistory(...args);
  }

  _removeFromBookmarks(...args) {
    return HistoryManager.removeFromBookmarks(...args);
  }

  _closeTabsWithUrl(url) { return closeTabsWithUrl(url); }

  _getQuery() {
    const query = this._urlbarDetails.value;
    if (this.hasCompletion) {
      return query.slice(0, this._urlbarDetails.selectionStart);
    }
    return query;
  }

  _getAssistantStates() {
    return this._cliqz.search.action('getAssistantStates');
  }

  _getUrlbarAttributes() {
    const { padding, left, width, navbarColor } = this._urlbarDetails;
    return { padding, left, width, navbarColor };
  }

  _getMaxHeight() {
    // TODO
    return 1e4;
  }

  removeFromHistoryAndBookmarks(url) {
    Promise.all([
      this._removeFromHistory(url),
      this._removeFromBookmarks(url),
    ])
      .then(() => this._closeTabsWithUrl(url))
      .then(() => {
        const query = this.lastResult && this.lastResult.query;
        return this._setUrlbarValue(query);
      })
      .then(() => this._queryCliqz());
  }

  onInput(details) {
    this.updateURLBarCache(details);
    if (details.isPasted) {
      this._telemetry({
        type: 'activity',
        action: 'paste',
        current_length: details.value.length,
      });
    }
    return super.onInput();
  }

  onKeydown(ev) {
    this.lastEvent = ev;
    const defaultIsPrevented = ev.defaultPrevented;
    const defaultShouldBePrevented = super.onKeydown(ev);
    if (ev.code === 'ArrowLeft' || ev.code === 'ArrowRight') {
      this.close();
    }
    if (defaultIsPrevented && !defaultShouldBePrevented) {
      // We prevented default behavior for this event while we shouldn't have been.
      // Now we have to simulate default behavior.
      switch (ev.code) {
        case 'Delete':
        case 'Backspace': {
          const { selectionStart, selectionEnd, value } = this._urlbarDetails;
          let newValue = value;
          const cursorPos = selectionStart;
          // delete selection/last/current charachter
          if (selectionStart !== selectionEnd) {
            newValue = value.slice(0, selectionStart) + value.slice(selectionEnd, value.length);
          } else if (ev.code === 'Delete') {
            newValue = value.slice(0, selectionStart)
              + value.slice(selectionStart + 1, value.length);
          } else if (ev.code === 'Backspace') {
            newValue = value.slice(0, selectionStart - 1)
              + value.slice(selectionStart, value.length);
          }
          this._setURLBarDetails({
            value: newValue,
            selectionStart: cursorPos,
            selectionEnd: cursorPos
          });
          break;
        }
        case 'Enter':
        case 'NumpadEnter':
          if (!ev.altKey && !ev.metaKey && !ev.ctrlKey) {
            this._setHeight(0);
          }
          break;
        default:
          break;
      }
    }
  }

  onBlur() {
    if (this._shouldIgnoreNextBlur) {
      this._shouldIgnoreNextBlur = false;
      return;
    }
    this._scheduleClose(() => this._endSession());
  }

  _scheduleClose(callback) {
    this.cancelClose();
    this.closeTimeout = setTimeout(() => {
      this._setHeight(0);
      this.dropdownAction.clear();
      if (callback) {
        callback();
      }
    }, 50);
  }

  cancelClose() {
    clearTimeout(this.closeTimeout);
  }

  onDropmarker() {
    this._queryCliqz('', { allowEmptyQuery: true });
  }

  createIframeWrapper() {
    const iframeWrapper = new Spanan(({ action, ...rest }) => {
      omniboxapi.sendMessage({
        target: 'cliqz-dropdown',
        action,
        ...rest,
      });
    });

    this.iframeWrapper = iframeWrapper;

    omniboxapi.onMessage.addListener(this.onMessage);

    iframeWrapper.export(this.actions, {
      respond(response, request) {
        omniboxapi.sendMessage({
          type: 'response',
          uuid: request.uuid,
          response,
        });
      },
    });

    this.dropdownAction = iframeWrapper.createProxy();
  }

  render(...args) {
    if (this._urlbarDetails.focused) {
      return super.render(...args)
        .then(() => {
          utils._queryLastDraw = Date.now();
        });
    }
    return Promise.resolve();
  }
}
