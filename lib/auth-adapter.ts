import type { Adapter, AdapterAccount, AdapterUser, AdapterSession } from 'next-auth/adapters';
import { getDatabase, getUser, asUser, dbDate, parseDbDate } from './db';

// Keep the existing User/Account/Session IDs and tables. Native D1 reads avoid
// initializing an ORM query compiler on a 10ms Workers Free request.
export function D1AuthAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, 'id'>) {
      const id = crypto.randomUUID(); const now = dbDate();
      await getDatabase().prepare('INSERT INTO User (id,email,name,image,emailVerified,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)').bind(id, user.email, user.name ?? null, user.image ?? null, user.emailVerified ? dbDate(user.emailVerified) : null, now, now).run();
      return (await getUser(id))! as AdapterUser;
    },
    getUser,
    async getUserByEmail(email) {
      const row = await getDatabase().prepare('SELECT * FROM User WHERE email=?').bind(email).first<Record<string, unknown>>();
      return row ? asUser(row) : null;
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const row = await getDatabase().prepare('SELECT u.* FROM User u JOIN Account a ON a.userId=u.id WHERE a.provider=? AND a.providerAccountId=?').bind(provider, providerAccountId).first<Record<string, unknown>>();
      return row ? asUser(row) : null;
    },
    async updateUser(user) {
      const fields = ['email', 'name', 'image', 'emailVerified'] as const;
      const selected = fields.filter(field => user[field] !== undefined);
      if (selected.length) {
        const values = selected.map(field => field === 'emailVerified' ? user.emailVerified ? dbDate(user.emailVerified) : null : user[field] ?? null);
        await getDatabase().prepare(`UPDATE User SET ${selected.map(field => `${field}=?`).join(',')},updatedAt=? WHERE id=?`).bind(...values, dbDate(), user.id).run();
      }
      return (await getUser(user.id))! as AdapterUser;
    },
    async linkAccount(account: AdapterAccount) {
      const fields = ['userId','type','provider','providerAccountId','refresh_token','access_token','expires_at','token_type','scope','id_token','session_state','oauth_token_secret','oauth_token','refresh_token_expires_in'];
      const record = account as unknown as Record<string, string | number | null | undefined>;
      const selected = fields.filter(field => record[field] !== undefined);
      const now = dbDate();
      await getDatabase().prepare(`INSERT INTO Account (id,${selected.join(',')},createdAt,updatedAt) VALUES (${Array(selected.length+3).fill('?').join(',')})`).bind(crypto.randomUUID(), ...selected.map(field => record[field] ?? null), now, now).run();
      return account as AdapterAccount;
    },
    async unlinkAccount({ provider, providerAccountId }) {
      await getDatabase().prepare('DELETE FROM Account WHERE provider=? AND providerAccountId=?').bind(provider, providerAccountId).run();
    },
    async createSession(session) {
      const now = dbDate();
      await getDatabase().prepare('INSERT INTO Session (id,sessionToken,userId,expires,createdAt,updatedAt) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(), session.sessionToken, session.userId, dbDate(session.expires), now, now).run();
      return session;
    },
    async getSessionAndUser(sessionToken) {
      const row = await getDatabase().prepare(`SELECT u.*,s.sessionToken AS authSessionToken,s.userId AS authUserId,s.expires AS authExpires
        FROM Session s JOIN User u ON s.userId=u.id WHERE s.sessionToken=?`).bind(sessionToken).first<Record<string, unknown>>();
      if (!row) return null;
      const { authSessionToken, authUserId, authExpires, ...user } = row;
      return { session: { sessionToken: String(authSessionToken), userId: String(authUserId), expires: parseDbDate(authExpires)! }, user: asUser(user) };
    },
    async updateSession(session) {
      if (session.expires) await getDatabase().prepare('UPDATE Session SET expires=?,updatedAt=? WHERE sessionToken=?').bind(dbDate(session.expires), dbDate(), session.sessionToken).run();
      const row = await getDatabase().prepare('SELECT sessionToken,userId,expires FROM Session WHERE sessionToken=?').bind(session.sessionToken).first<Record<string, unknown>>();
      return row ? { ...row, expires: parseDbDate(row.expires)! } as AdapterSession : null;
    },
    async deleteSession(sessionToken) {
      await getDatabase().prepare('DELETE FROM Session WHERE sessionToken=?').bind(sessionToken).run();
    },
    async createVerificationToken(token) {
      await getDatabase().prepare('INSERT INTO VerificationToken (id,identifier,token,expires,createdAt) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), token.identifier, token.token, dbDate(token.expires), dbDate()).run();
      return token;
    },
    async useVerificationToken({ identifier, token }) {
      const row = await getDatabase().prepare('DELETE FROM VerificationToken WHERE identifier=? AND token=? RETURNING identifier,token,expires').bind(identifier, token).first<Record<string, unknown>>();
      return row ? { identifier: String(row.identifier), token: String(row.token), expires: parseDbDate(row.expires)! } : null;
    },
  };
}
