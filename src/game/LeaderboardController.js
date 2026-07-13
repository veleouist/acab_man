const SCORE_TABLE = "leaderboard_scores";

/** Small REST client for the public, read-and-submit-only leaderboard table. */
export class LeaderboardController {
  constructor({ projectUrl, publishableKey }) {
    this.apiUrl = `${projectUrl.replace(/\/$/, "")}/rest/v1`;
    this.publishableKey = publishableKey;
  }

  async getTopScores(limit = 10) {
    const parameters = new URLSearchParams({
      select: "player_name,score,level,created_at",
      order: "score.desc,created_at.asc",
      limit: String(limit),
    });
    const response = await fetch(`${this.apiUrl}/${SCORE_TABLE}?${parameters}`, {
      headers: this.getHeaders(),
      cache: "no-store",
    });

    return this.readResponse(response);
  }

  async submitScore({ playerName, score, level }) {
    const response = await fetch(`${this.apiUrl}/${SCORE_TABLE}`, {
      method: "POST",
      headers: {
        ...this.getHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ player_name: playerName, score, level }),
    });

    await this.readResponse(response, false);
  }

  getHeaders() {
    return { apikey: this.publishableKey };
  }

  async readResponse(response, expectsJson = true) {
    if (response.ok) return expectsJson ? response.json() : undefined;

    const body = await response.text();
    throw new Error(body || `Leaderboard request failed (${response.status}).`);
  }
}
