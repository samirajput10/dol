import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOOK, FASHION_CHALLENGES, PRESET_CHARACTERS } from '../data/catalog';
import {
  applyGarmentSelection,
  computeExpressionWeights,
  computeIdentityMorphWeights,
  evaluateChallengeLook,
  getStylistLevel,
  validatePhotoSetClient,
} from './studioLogic';
import type { UploadedPhoto } from '../types/studio';

test('computeIdentityMorphWeights clamps and preserves distinct facial profiles', () => {
  const camille = PRESET_CHARACTERS[0].identity;
  const amara = PRESET_CHARACTERS[2].identity;

  const wCamille = computeIdentityMorphWeights(camille);
  const wAmara = computeIdentityMorphWeights(amara);

  assert.ok(wAmara.lipsFull > wCamille.lipsFull, 'Full-lipped identity should yield higher lipsFull weight');
  assert.ok(wAmara.cheekHigh >= wCamille.cheekHigh, 'High diamond cheekbones should yield higher cheekHigh');
  for (const val of Object.values(wCamille)) {
    assert.ok(val >= 0 && val <= 1, 'All morph weights must remain within [0, 1]');
  }
});

test('computeExpressionWeights scales with intensity and preserves wink/laugh targets', () => {
  const halfSmile = computeExpressionWeights('smiling', 0.5);
  const fullLaugh = computeExpressionWeights('laughing', 1.0);
  const wink = computeExpressionWeights('winking', 1.0);

  assert.ok(halfSmile.smile > 0 && halfSmile.smile < 0.5);
  assert.ok(fullLaugh.jawOpen > 0.5 && fullLaugh.smile === 1);
  assert.equal(wink.winkLeft, 1);
});

test('applyGarmentSelection handles dress vs separates without clearing unrelated accessories', () => {
  const withTop = applyGarmentSelection(DEFAULT_LOOK, 'top', {
    id: 'top_silk_blouse',
    color: '#FFFFFF',
    finish: 'silk',
  });
  assert.equal(withTop.dress, null);
  assert.equal(withTop.top?.id, 'top_silk_blouse');
  assert.equal(withTop.shoes?.id, DEFAULT_LOOK.shoes?.id);

  const backToDress = applyGarmentSelection(withTop, 'dress', {
    id: 'dress_evening_gown',
    color: '#3B234A',
    finish: 'sequin',
  });
  assert.equal(backToDress.top, null);
  assert.equal(backToDress.bottom, null);
  assert.equal(backToDress.dress?.id, 'dress_evening_gown');
});

test('validatePhotoSetClient rejects missing photos, low-res photos, and missing consent', () => {
  const emptyRes = validatePhotoSetClient({}, false);
  assert.equal(emptyRes.ready, false);
  assert.equal(emptyRes.errors.length, 5);

  const samplePhoto = (slot: UploadedPhoto['slot'], w = 512): UploadedPhoto => ({
    slot,
    dataUrl: 'data:image/png;base64,AAAA',
    fileName: `${slot}.png`,
    width: w,
    height: w,
    crop: { zoom: 1, offsetX: 0, offsetY: 0 },
  });

  const lowRes = validatePhotoSetClient(
    {
      front: samplePhoto('front', 120),
      left_3_4: samplePhoto('left_3_4'),
      right_3_4: samplePhoto('right_3_4'),
      side_profile: samplePhoto('side_profile'),
    },
    true,
  );
  assert.equal(lowRes.ready, false);
  assert.match(lowRes.errors[0], /resolution is too low/i);

  const valid = validatePhotoSetClient(
    {
      front: samplePhoto('front'),
      left_3_4: samplePhoto('left_3_4'),
      right_3_4: samplePhoto('right_3_4'),
      side_profile: samplePhoto('side_profile'),
    },
    true,
  );
  assert.equal(valid.ready, true);
  assert.equal(valid.errors.length, 0);
});

test('evaluateChallengeLook scores themed outfits and progresses stylist levels', () => {
  const parisChallenge = FASHION_CHALLENGES[0];
  const result = evaluateChallengeLook(DEFAULT_LOOK, parisChallenge);
  assert.ok(result.score >= 70, `Expected passing score, got ${result.score}`);
  assert.equal(result.passed, true);

  const lvl1 = getStylistLevel(0);
  const lvl3 = getStylistLevel(450);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl3.level, 3);
});
