// Unit tests for cardSearch.ts and userCatalog.ts / catalog.ts.
// Uses vitest with a mocked global fetch — no real network calls.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------- helpers --------------------------------------------------------

type FetchMock = ReturnType<typeof vi.fn>;

function makeFetch(responses: Map<string, unknown>): FetchMock {
  return vi.fn(async (url: string) => {
    // Find the first matching key (substring match so we can key on domain).
    let body: unknown = null;
    for (const [key, val] of responses) {
      if (url.includes(key)) { body = val; break; }
    }
    if (body === null) {
      return { ok: false, json: async () => ({}) };
    }
    return { ok: true, json: async () => body };
  });
}

// ---------- Pokémon mapping ------------------------------------------------

describe('searchCards — Pokémon mapping', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('maps name / set / number and picks holofoil market price first', async () => {
    const pokemonData = {
      data: [
        {
          id: 'swsh1-001',
          name: 'Charizard',
          set: { name: 'Sword & Shield' },
          number: '25',
          rarity: 'Rare Holo',
          images: { large: 'https://example.com/charizard.jpg', small: 'https://example.com/charizard-sm.jpg' },
          tcgplayer: {
            prices: {
              holofoil: { market: 42.5 },
              reverseHolofoil: { market: 10.0 },
              normal: { market: 5.0 },
            },
          },
          cardmarket: { prices: { trendPrice: 38.0 } },
        },
      ],
    };
    // MTG returns 404 → empty array
    const fetch = makeFetch(new Map([
      ['pokemontcg.io', pokemonData],
      ['scryfall.com', null],           // null → ok:false → []
    ]));
    vi.stubGlobal('fetch', fetch);

    const { searchCards } = await import('@/lib/data/cardSearch');
    const results = await searchCards('Charizard');

    expect(results).toHaveLength(1);
    const card = results[0];
    expect(card.id).toBe('swsh1-001');
    expect(card.category).toBe('Pokemon');
    expect(card.name).toBe('Charizard');
    expect(card.set).toBe('Sword & Shield');
    expect(card.number).toBe('25');
    expect(card.rarity).toBe('Rare Holo');
    expect(card.image).toBe('https://example.com/charizard.jpg');
    // holofoil.market (42.5) should win over reverseHolofoil and normal
    expect(card.marketUsd).toBe(42.5);
  });

  it('falls back to reverseHolofoil → normal → cardmarket in order', async () => {
    const pokemonData = {
      data: [
        {
          id: 'swsh1-002',
          name: 'Pikachu',
          set: { name: 'Base Set' },
          number: '58',
          rarity: 'Common',
          images: { small: 'https://example.com/pikachu-sm.jpg' },
          tcgplayer: {
            prices: {
              // holofoil absent, reverseHolofoil present
              reverseHolofoil: { market: 7.5 },
            },
          },
          cardmarket: { prices: { trendPrice: 6.0 } },
        },
      ],
    };
    const fetch = makeFetch(new Map([
      ['pokemontcg.io', pokemonData],
      ['scryfall.com', null],
    ]));
    vi.stubGlobal('fetch', fetch);

    const { searchCards } = await import('@/lib/data/cardSearch');
    const results = await searchCards('Pikachu');
    expect(results[0].marketUsd).toBe(7.5);
    // uses images.small when large is absent
    expect(results[0].image).toBe('https://example.com/pikachu-sm.jpg');
  });
});

// ---------- MTG mapping ----------------------------------------------------

describe('searchCards — MTG mapping', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('maps id with scry- prefix, set_name, collector_number, prices.usd', async () => {
    const scryfallData = {
      data: [
        {
          id: 'abc-123-uuid',
          name: 'Lightning Bolt',
          set_name: 'Limited Edition Alpha',
          collector_number: '161',
          rarity: 'common',
          image_uris: { normal: 'https://cards.scryfall.io/normal/lightning-bolt.jpg' },
          prices: { usd: '1500.00' },
        },
      ],
    };
    const fetch = makeFetch(new Map([
      ['pokemontcg.io', { data: [] }],
      ['scryfall.com', scryfallData],
    ]));
    vi.stubGlobal('fetch', fetch);

    const { searchCards } = await import('@/lib/data/cardSearch');
    const results = await searchCards('Lightning Bolt');

    const mtgCard = results.find((c) => c.category === 'MTG');
    expect(mtgCard).toBeDefined();
    expect(mtgCard!.id).toBe('scry-abc-123-uuid');
    expect(mtgCard!.category).toBe('MTG');
    expect(mtgCard!.name).toBe('Lightning Bolt');
    expect(mtgCard!.set).toBe('Limited Edition Alpha');
    expect(mtgCard!.number).toBe('161');
    expect(mtgCard!.image).toBe('https://cards.scryfall.io/normal/lightning-bolt.jpg');
    expect(mtgCard!.marketUsd).toBe(1500);
  });

  it('uses card_faces[0].image_uris.normal when image_uris is absent', async () => {
    const scryfallData = {
      data: [
        {
          id: 'dfc-uuid',
          name: 'Delver of Secrets',
          set_name: 'Innistrad',
          collector_number: '51',
          rarity: 'common',
          // No top-level image_uris — double-faced card
          card_faces: [
            { image_uris: { normal: 'https://cards.scryfall.io/normal/delver-front.jpg' } },
            { image_uris: { normal: 'https://cards.scryfall.io/normal/delver-back.jpg' } },
          ],
          prices: { usd: '5.00' },
        },
      ],
    };
    const fetch = makeFetch(new Map([
      ['pokemontcg.io', { data: [] }],
      ['scryfall.com', scryfallData],
    ]));
    vi.stubGlobal('fetch', fetch);

    const { searchCards } = await import('@/lib/data/cardSearch');
    const results = await searchCards('Delver');
    expect(results[0].image).toBe('https://cards.scryfall.io/normal/delver-front.jpg');
  });
});

// ---------- edge cases -----------------------------------------------------

describe('searchCards — edge cases', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns [] for query shorter than 2 chars without calling fetch', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const { searchCards } = await import('@/lib/data/cardSearch');
    expect(await searchCards('')).toEqual([]);
    expect(await searchCards('a')).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns [] and does not throw when both providers fail', async () => {
    const fetch = vi.fn(async () => { throw new Error('Network error'); });
    vi.stubGlobal('fetch', fetch);
    const { searchCards } = await import('@/lib/data/cardSearch');
    await expect(searchCards('Pikachu')).resolves.toEqual([]);
  });

  it('returns Pokémon results even when MTG fetch fails', async () => {
    let callCount = 0;
    const fetch = vi.fn(async (url: string) => {
      callCount++;
      if (url.includes('pokemontcg')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'base1-4',
                name: 'Charizard',
                set: { name: 'Base Set' },
                number: '4',
                rarity: 'Rare Holo',
                images: { large: 'https://example.com/c.jpg' },
                tcgplayer: { prices: { normal: { market: 300 } } },
              },
            ],
          }),
        };
      }
      throw new Error('Scryfall down');
    });
    vi.stubGlobal('fetch', fetch);
    const { searchCards } = await import('@/lib/data/cardSearch');
    const results = await searchCards('Charizard');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].category).toBe('Pokemon');
  });

  it('filters out entries with empty image', async () => {
    const pokemonData = {
      data: [
        {
          id: 'no-image',
          name: 'Ghost Card',
          set: { name: 'Test Set' },
          number: '1',
          rarity: 'Common',
          images: {},           // no large or small
          tcgplayer: { prices: {} },
        },
        {
          id: 'has-image',
          name: 'Real Card',
          set: { name: 'Test Set' },
          number: '2',
          rarity: 'Common',
          images: { large: 'https://example.com/real.jpg' },
          tcgplayer: { prices: { normal: { market: 1.0 } } },
        },
      ],
    };
    const fetch = makeFetch(new Map([
      ['pokemontcg.io', pokemonData],
      ['scryfall.com', null],
    ]));
    vi.stubGlobal('fetch', fetch);
    const { searchCards } = await import('@/lib/data/cardSearch');
    const results = await searchCards('Real');
    expect(results.every((c) => c.image !== '')).toBe(true);
    expect(results.find((c) => c.id === 'no-image')).toBeUndefined();
  });
});

// ---------- userCatalog + resolveCard --------------------------------------

describe('userCatalog', () => {
  beforeEach(async () => {
    // Reset module state between tests by re-importing fresh modules via
    // vi.resetModules(). Because vitest caches modules, we need to clear them.
    vi.resetModules();
    // Provide a minimal AsyncStorage stub.
    vi.doMock('@react-native-async-storage/async-storage', () => ({
      default: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => {}),
      },
    }));
    // Stub react for useSyncExternalStore
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return { ...actual };
    });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

  it('addUserCard then getUserCard resolves the added card', async () => {
    const { addUserCard, getUserCard } = await import('@/lib/data/userCatalog');
    const card = {
      id: 'scry-test-uuid',
      category: 'MTG' as const,
      name: 'Test Card',
      set: 'Test Set',
      number: '42',
      rarity: 'rare',
      image: 'https://example.com/test.jpg',
      marketUsd: 99.99,
    };
    addUserCard(card);
    expect(getUserCard('scry-test-uuid')).toEqual(card);
  });

  it('getUserCard returns undefined for unknown id', async () => {
    const { getUserCard } = await import('@/lib/data/userCatalog');
    expect(getUserCard('not-a-real-id')).toBeUndefined();
  });
});

describe('resolveCard', () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

  it('prefers userCatalog over seed for the same id', async () => {
    // The seed has ex13-103 (Mewtwo) — override it in userCatalog.
    vi.doMock('@react-native-async-storage/async-storage', () => ({
      default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => {}) },
    }));
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return { ...actual };
    });

    const { addUserCard } = await import('@/lib/data/userCatalog');
    const { resolveCard } = await import('@/lib/data/catalog');

    const overrideCard = {
      id: 'ex13-103',
      category: 'Pokemon' as const,
      name: 'Custom Override',
      set: 'Override Set',
      number: '103',
      rarity: 'Rare',
      image: 'https://example.com/override.jpg',
      marketUsd: 1234,
    };
    addUserCard(overrideCard);
    const resolved = resolveCard('ex13-103');
    expect(resolved?.name).toBe('Custom Override');
  });

  it('falls back to seed when id not in userCatalog', async () => {
    vi.doMock('@react-native-async-storage/async-storage', () => ({
      default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => {}) },
    }));
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return { ...actual };
    });

    const { resolveCard } = await import('@/lib/data/catalog');
    const resolved = resolveCard('ex13-103');
    // Should find it in seed
    expect(resolved).toBeDefined();
    expect(resolved?.name).toBe('Mewtwo ★');
  });

  it('returns undefined for completely unknown id', async () => {
    vi.doMock('@react-native-async-storage/async-storage', () => ({
      default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => {}) },
    }));
    vi.doMock('react', async (importOriginal) => {
      const actual = await importOriginal<typeof import('react')>();
      return { ...actual };
    });
    const { resolveCard } = await import('@/lib/data/catalog');
    expect(resolveCard('totally-unknown-id')).toBeUndefined();
  });
});
