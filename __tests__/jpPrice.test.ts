// Unit tests for lib/data/jpPrice.ts
// Uses vitest with a mocked global fetch — no real network calls.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchJpCards, getJpPrice } from '@/lib/data/jpPrice';

// ---------- helpers ----------------------------------------------------------

function makeOkFetch(body: unknown) {
  return vi.fn(async () => ({ ok: true, json: async () => body }));
}

function makeErrorFetch() {
  return vi.fn(async () => { throw new Error('Network error'); });
}

// ---------- searchJpCards ----------------------------------------------------

describe('searchJpCards — short-circuit', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns [] immediately for empty string without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchJpCards('')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns [] immediately for single char without calling fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchJpCards('a')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('searchJpCards — TCGdex shape mapping', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('maps id, localId, name, and appends /high.png to image', async () => {
    const tcgdexData = [
      { id: 'swsh1-001', localId: '001', name: 'リザードン', image: 'https://assets.tcgdex.net/ja/swsh/swsh1/001' },
      { id: 'swsh1-025', localId: '025', name: 'ピカチュウ', image: 'https://assets.tcgdex.net/ja/swsh/swsh1/025' },
    ];
    vi.stubGlobal('fetch', makeOkFetch(tcgdexData));
    const results = await searchJpCards('リザードン');
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: 'swsh1-001',
      localId: '001',
      name: 'リザードン',
      image: 'https://assets.tcgdex.net/ja/swsh/swsh1/001/high.png',
    });
    expect(results[1].image).toBe('https://assets.tcgdex.net/ja/swsh/swsh1/025/high.png');
  });

  it('sets image to null when card has no image field', async () => {
    const tcgdexData = [
      { id: 'promo-001', localId: '001', name: 'テスト' },
    ];
    vi.stubGlobal('fetch', makeOkFetch(tcgdexData));
    const results = await searchJpCards('テスト');
    expect(results[0].image).toBeNull();
  });

  it('caps results at 30 cards', async () => {
    const tcgdexData = Array.from({ length: 50 }, (_, i) => ({
      id: `id-${i}`,
      localId: String(i),
      name: `カード${i}`,
      image: `https://example.com/${i}`,
    }));
    vi.stubGlobal('fetch', makeOkFetch(tcgdexData));
    const results = await searchJpCards('カード');
    expect(results).toHaveLength(30);
  });

  it('returns [] when response is not an array', async () => {
    vi.stubGlobal('fetch', makeOkFetch({ error: 'not an array' }));
    expect(await searchJpCards('テスト')).toEqual([]);
  });

  it('returns [] on fetch rejection', async () => {
    vi.stubGlobal('fetch', makeErrorFetch());
    await expect(searchJpCards('リザードン')).resolves.toEqual([]);
  });

  it('returns [] when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => [] })));
    expect(await searchJpCards('テスト')).toEqual([]);
  });
});

// ---------- getJpPrice -------------------------------------------------------

describe('getJpPrice — number/localId matching', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('matches when number and localId have no leading zeros', async () => {
    const workerData = {
      source: '遊々亭',
      currency: 'JPY',
      count: 1,
      cards: [
        { ver: 'holo', id: 'test-76', name: 'リザードン', number: '76/108', sellJpy: 3000, buyJpy: 1500, sellUrl: 'https://yuyu.example/sell', buyUrl: 'https://yuyu.example/buy' },
      ],
    };
    vi.stubGlobal('fetch', makeOkFetch(workerData));
    const result = await getJpPrice('リザードン', '76');
    expect(result).not.toBeNull();
    expect(result!.sellJpy).toBe(3000);
    expect(result!.buyJpy).toBe(1500);
    expect(result!.sellUrl).toBe('https://yuyu.example/sell');
    expect(result!.buyUrl).toBe('https://yuyu.example/buy');
    expect(result!.source).toBe('遊々亭');
  });

  it('strips leading zeros: localId "076" matches number "76/108"', async () => {
    const workerData = {
      source: '遊々亭',
      currency: 'JPY',
      count: 1,
      cards: [
        { ver: 'holo', id: 'test-076', name: 'リザードン', number: '76/108', sellJpy: 2500, buyJpy: 1200, sellUrl: null, buyUrl: null },
      ],
    };
    vi.stubGlobal('fetch', makeOkFetch(workerData));
    const result = await getJpPrice('リザードン', '076');
    expect(result).not.toBeNull();
    expect(result!.sellJpy).toBe(2500);
  });

  it('strips leading zeros: localId "5" matches number "005/..."', async () => {
    const workerData = {
      source: '遊々亭',
      currency: 'JPY',
      count: 1,
      cards: [
        { ver: 'normal', id: 'test-005', name: 'ピカチュウ', number: '005/100', sellJpy: 500, buyJpy: 200, sellUrl: 'https://yuyu.example/pika', buyUrl: null },
      ],
    };
    vi.stubGlobal('fetch', makeOkFetch(workerData));
    const result = await getJpPrice('ピカチュウ', '5');
    expect(result).not.toBeNull();
    expect(result!.sellJpy).toBe(500);
  });

  it('returns null when no card number matches the localId', async () => {
    const workerData = {
      source: '遊々亭',
      currency: 'JPY',
      count: 1,
      cards: [
        { ver: 'holo', id: 'test-99', name: 'リザードン', number: '99/108', sellJpy: 3000, buyJpy: 1500, sellUrl: null, buyUrl: null },
      ],
    };
    vi.stubGlobal('fetch', makeOkFetch(workerData));
    const result = await getJpPrice('リザードン', '76');
    expect(result).toBeNull();
  });

  it('returns null when cards array is empty', async () => {
    const workerData = { source: '遊々亭', currency: 'JPY', count: 0, cards: [] };
    vi.stubGlobal('fetch', makeOkFetch(workerData));
    expect(await getJpPrice('リザードン', '76')).toBeNull();
  });

  it('returns null on fetch rejection', async () => {
    vi.stubGlobal('fetch', makeErrorFetch());
    await expect(getJpPrice('リザードン', '76')).resolves.toBeNull();
  });

  it('returns null when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    expect(await getJpPrice('テスト', '1')).toBeNull();
  });

  it('handles null sellJpy and buyJpy gracefully', async () => {
    const workerData = {
      source: '遊々亭',
      currency: 'JPY',
      count: 1,
      cards: [
        { ver: 'holo', id: 'test-1', name: 'メタモン', number: '1/100', sellJpy: null, buyJpy: null, sellUrl: null, buyUrl: null },
      ],
    };
    vi.stubGlobal('fetch', makeOkFetch(workerData));
    const result = await getJpPrice('メタモン', '1');
    expect(result).not.toBeNull();
    expect(result!.sellJpy).toBeNull();
    expect(result!.buyJpy).toBeNull();
  });

  it('uses fallback source string when data.source is absent', async () => {
    const workerData = {
      currency: 'JPY',
      count: 1,
      cards: [
        { ver: 'holo', id: 'test-1', name: 'テスト', number: '1/100', sellJpy: 100, buyJpy: 50, sellUrl: null, buyUrl: null },
      ],
    };
    vi.stubGlobal('fetch', makeOkFetch(workerData));
    const result = await getJpPrice('テスト', '1');
    expect(result).not.toBeNull();
    expect(result!.source).toBe('遊々亭');
  });
});
