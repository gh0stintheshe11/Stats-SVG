import { createTtlCache } from '../../lib/cache.js';
import { HttpError } from '../../lib/errors.js';
import { fetchJson } from '../../lib/http.js';
import { withRetry } from '../../lib/retry.js';

const STEAM_API_BASE_URL = 'https://api.steampowered.com';
const steamCDNBaseUrl = 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/';

const PERSONA_STATES = ['Offline', 'Online', 'Busy', 'Away', 'Snooze', 'Looking to trade', 'Looking to play'];

const cache = createTtlCache({ ttlMs: 2 * 60 * 1000, maxEntries: 500 });

/**
 * Calls a Steam Web API method over HTTPS and returns its `response` object.
 * The key and Steam ID are passed as encoded query parameters, never concatenated into the URL.
 */
async function steamApi(path, params, { deadline }) {
  const key = process.env.STEAM_API_KEY;
  if (!key) {
    throw new HttpError(500, 'STEAM_API_KEY environment variable is not set', { expose: false });
  }

  const url = new URL(path, STEAM_API_BASE_URL);
  url.search = new URLSearchParams({ key, format: 'json', ...params }).toString();

  return withRetry(async () => {
    // Steam answers 403 for an invalid API key, so only the default 429 means "rate limited".
    const body = await fetchJson('Steam', url, { deadline });
    return body?.response ?? {};
  }, { deadline });
}

/**
 * @param {string} steamID 64-bit Steam ID (already validated by the API handler).
 * @param {object} [options]
 * @param {number} [options.deadline] Epoch ms by which all Steam calls must finish.
 */
const fetchSteamStatus = async (steamID, { deadline = Date.now() + 8000 } = {}) => {
  const cached = cache.get(steamID);
  if (cached) return cached;

  const options = { deadline };
  const startedAt = Date.now();
  const [userProfile, recentGames, ownedGames, badges, animatedAvatar] = await Promise.all([
    steamApi('/ISteamUser/GetPlayerSummaries/v0002/', { steamids: steamID }, options),
    steamApi('/IPlayerService/GetRecentlyPlayedGames/v0001/', { steamid: steamID }, options),
    steamApi('/IPlayerService/GetOwnedGames/v0001/', { steamid: steamID, include_played_free_games: true }, options),
    steamApi('/IPlayerService/GetBadges/v1/', { steamid: steamID }, options),
    steamApi('/IPlayerService/GetAnimatedAvatar/v1/', { steamid: steamID }, options),
  ]);
  console.log(`Steam API calls (${steamID}): ${Date.now() - startedAt}ms`);

  const userProfileData = userProfile.players?.[0];
  if (!userProfileData) {
    throw new HttpError(404, `Steam user "${steamID}" not found`);
  }

  const recentGamesData = recentGames.games || [];
  const ownedGamesData = ownedGames.games || [];
  const animatedAvatarImage = animatedAvatar.avatar?.image_small;

  const steamData = {
    username: userProfileData.personaname,
    // Fall back to the regular avatar when the user has no animated one.
    avatar: animatedAvatarImage ? `${steamCDNBaseUrl}${animatedAvatarImage}` : userProfileData.avatarfull,
    profile_url: userProfileData.profileurl,
    user_status: PERSONA_STATES[userProfileData.personastate] ?? 'Unknown',
    last_logoff: userProfileData.lastlogoff,
    created: userProfileData.timecreated,
    steam_level: badges.player_level,
    recent_played_games: recentGamesData,
    recent_played_games_count: recentGames.total_count,
    total_owned_games: ownedGames.game_count,
    total_playtime: ownedGamesData.reduce((total, game) => total + (game.playtime_forever || 0), 0),
    total_playtime_list: [],
    playtime_percentage_list: [],
  };

  const platformPlaytimes = {
    windows: 'playtime_windows_forever',
    mac: 'playtime_mac_forever',
    linux: 'playtime_linux_forever',
    deck: 'playtime_deck_forever',
  };

  const playtimesByPlatform = Object.fromEntries(Object.entries(platformPlaytimes).map(([platform, playtimeKey]) => [
    platform,
    ownedGamesData.reduce((total, game) => total + (game[playtimeKey] || 0), 0),
  ]));

  const platformTotal = Object.values(playtimesByPlatform).reduce((sum, playtime) => sum + playtime, 0);
  const unknownPlaytime = steamData.total_playtime - platformTotal;
  if (unknownPlaytime > 0) {
    playtimesByPlatform.unknown = unknownPlaytime;
  }

  steamData.total_playtime_list = Object.entries(playtimesByPlatform)
    .map(([platform, playtime]) => ({ [platform]: playtime }))
    .sort((a, b) => Object.values(b)[0] - Object.values(a)[0]);

  // Private profiles report no playtime; avoid dividing by zero.
  if (steamData.total_playtime > 0) {
    steamData.playtime_percentage_list = steamData.total_playtime_list
      .map((item) => {
        const [platform, playtime] = Object.entries(item)[0];
        return { [platform]: Number(((playtime / steamData.total_playtime) * 100).toFixed(5)) };
      })
      .filter((item) => Object.values(item)[0] > 0);
  }

  cache.set(steamID, steamData);
  return steamData;
};

export default fetchSteamStatus;
