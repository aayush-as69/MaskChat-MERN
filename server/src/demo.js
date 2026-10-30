import crypto from 'node:crypto';
import { User, MentorProfile, MentorApplication } from './models.js';
import { hashPassword } from './auth.js';

// Public demo accounts. They are shared, sandboxed to the "Demo University" institution
// (mentor discovery, matching, groups and the forum are all institution-scoped), have no
// usable password, and can only be entered through POST /api/v1/auth/demo while DEMO_MODE=true.
// Privileged roles (moderator/admin) are intentionally NOT available as demo accounts because
// those queues are global and expose real reports, applications and uploaded ID documents.
export const DEMO_INSTITUTION = 'Demo University';
export const DEMO_ACCOUNTS = {
  student: {
    email: 'student@demo.maskchat.invalid',
    alias: 'Demo Student',
    role: 'student',
    interests: ['Data Structures', 'Placement Prep'],
    label: 'Student',
    description: 'Find a mentor, join the matching queue, chat and use the forum.'
  },
  mentor: {
    email: 'mentor@demo.maskchat.invalid',
    alias: 'Demo Mentor',
    role: 'mentor',
    interests: ['Data Structures', 'Python', 'Web Development'],
    label: 'Mentor',
    description: 'Receive match offers, accept sessions and host group sessions.'
  }
};

export function demoAccountList() {
  return Object.entries(DEMO_ACCOUNTS).map(([key, a]) => ({ key, label: a.label, description: a.description }));
}

async function findOrCreateUser(account) {
  const existing = await User.findOne({ email: account.email });
  if (existing) return existing;
  try {
    // A random password nobody knows: the demo account can never be used with /auth/login.
    const passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
    return await User.create({
      email: account.email, passwordHash, alias: account.alias, role: account.role,
      interests: account.interests, institution: DEMO_INSTITUTION, isDemo: true
    });
  } catch (err) {
    if (err?.code === 11000) return User.findOne({ email: account.email }); // concurrent first request
    throw err;
  }
}

export async function ensureDemoUser(key) {
  const account = DEMO_ACCOUNTS[key];
  if (!account) return null;
  const user = await findOrCreateUser(account);
  if (!user?.isDemo) return null; // never hijack a non-demo account that happens to share the email
  if (account.role === 'mentor') {
    await MentorProfile.findOneAndUpdate(
      { user: user._id },
      {
        $setOnInsert: { user: user._id, bio: 'Demo peer mentor for coursework and career preparation.', expertise: account.interests, languages: ['English', 'Hindi'], sessionFormats: ['individual', 'group'], ratingCount: 8, ratingAverage: 4.8 },
        $set: { available: true }
      },
      { upsert: true }
    );
    await MentorApplication.findOneAndUpdate(
      { applicant: user._id, status: 'approved' },
      { $setOnInsert: { applicant: user._id, institution: DEMO_INSTITUTION, pathway: 'senior', skills: account.interests, evidence: 'Public demo mentor account.', academicYear: 3, cohortYear: new Date().getFullYear() - 2, identityStatus: 'verified', status: 'approved', approvedAt: new Date() } },
      { upsert: true }
    );
  }
  return user;
}
