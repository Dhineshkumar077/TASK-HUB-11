import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(import.meta.dirname, '..');

test('production reset clears stale demo data and requires fresh admin registration', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'taskhub-prod-reset-'));
  const dataDir = path.join(tempRoot, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(
    path.join(dataDir, 'taskhub.json'),
    JSON.stringify(
      {
        users: [
          {
            id: 'demo-user-1',
            email: 'admin@taskhub.com',
            mobile: '+10000000000',
            fullName: 'Demo Admin',
            passwordHash: 'hash',
            role: 'ADMIN',
            status: 'ACTIVE',
            emailVerified: true,
            mobileVerified: true,
            rating: 0,
            totalReviews: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'demo-user-2',
            email: 'demo@example.com',
            mobile: '+19999999999',
            fullName: 'Demo User',
            passwordHash: 'hash',
            role: 'SERVICE_SEEKER',
            status: 'ACTIVE',
            emailVerified: true,
            mobileVerified: true,
            rating: 0,
            totalReviews: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        sessions: [{ token: 'demo-token', userId: 'demo-user-1', role: 'ADMIN', createdAt: Date.now(), expiresAt: Date.now() + 60000 }],
        gigs: [{ id: 'demo-gig-1', hostId: 'demo-user-1', title: 'Demo Gig', status: 'OPEN', requiredWorkers: 1, createdAt: new Date().toISOString() }],
        services: [{ id: 'demo-service-1', techPartnerId: 'demo-user-1', techPartnerName: 'Demo', title: 'Demo Service', category: 'Electrician', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
        notifications: [],
        announcements: [],
        reviews: [],
        financialLedger: [],
        wallets: [],
        withdrawals: [],
        disputes: [],
        gigApplications: [],
        gigAttendance: [],
        serviceBookings: [],
        platformSettings: {
          microGigTier1MaxMembers: 5,
          microGigTier1FeePercentage: 10,
          microGigTier2FeePercentage: 5,
          localServiceCommissionPercentage: 10,
        },
      },
      null,
      2
    )
  );

  const previousCwd = process.cwd();
  const previousNodeEnv = process.env.NODE_ENV;
  const previousResetFlag = process.env.TASKHUB_RESET_DB;

  try {
    process.chdir(tempRoot);
    process.env.NODE_ENV = 'production';
    process.env.TASKHUB_RESET_DB = 'true';

    const dbModuleUrl = pathToFileURL(path.join(repoRoot, 'server', 'db.ts')).href + `?t=${Date.now()}`;
    const { db } = await import(dbModuleUrl);

    assert.equal(db.getAdminCount(), 0, 'Production reset should remove any seeded admin accounts');
    assert.equal(db.getUsers().length, 0, 'Production reset should clear persisted demo users');
    assert.equal(db.getGigs().length, 0, 'Production reset should clear persisted demo gigs');
    assert.equal(db.getServices().length, 0, 'Production reset should clear persisted demo services');
    assert.equal(db.getPrimaryAdmin(), undefined, 'Production reset should require a fresh admin registration');
  } finally {
    process.chdir(previousCwd);
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
    if (previousResetFlag === undefined) delete process.env.TASKHUB_RESET_DB; else process.env.TASKHUB_RESET_DB = previousResetFlag;
  }
});
