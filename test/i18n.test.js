import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOCALE, LOCALES, MESSAGES, detectLocale, translate } from '../src/i18n.js';

test('every locale defines the same message keys', () => {
  const keys = Object.keys(MESSAGES[DEFAULT_LOCALE]).sort();
  for (const locale of LOCALES) {
    assert.deepEqual(Object.keys(MESSAGES[locale]).sort(), keys, `keys differ for ${locale}`);
  }
});

test('translate uses the requested locale and falls back to the default locale', () => {
  assert.equal(translate('en', 'controls.play'), 'Auto-play');
  assert.equal(translate('da', 'controls.play'), 'Auto-afspilning');
  assert.equal(translate('fr', 'controls.play'), 'Auto-play');
  assert.equal(translate('en', 'unknown.key'), 'unknown.key');
});

test('detectLocale follows the browser language and falls back to English', () => {
  assert.equal(detectLocale('da-DK'), 'da');
  assert.equal(detectLocale('en-GB'), 'en');
  assert.equal(detectLocale('fr-FR'), DEFAULT_LOCALE);
  assert.equal(detectLocale(''), DEFAULT_LOCALE);
});
