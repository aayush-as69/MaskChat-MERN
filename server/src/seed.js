import mongoose from 'mongoose';
import { config } from './config.js';
import { User, MentorProfile, MentorApplication } from './models.js';
import { hashPassword } from './auth.js';

const demo = [
  { email: 'student@demo.edu', password: 'StudentDemo123!', alias: 'Curious Panda', role: 'student', interests: ['Data Structures', 'Placement Prep'] },
  { email: 'mentor@demo.edu', password: 'MentorDemo123!', alias: 'Chai Coder', role: 'mentor', interests: ['Data Structures', 'Python', 'Web Development'] },
  { email: 'moderator@demo.edu', password: 'ModeratorDemo123!', alias: 'Campus Guardian', role: 'moderator', interests: [] },
  { email: 'admin@demo.edu', password: 'AdminDemo123!', alias: 'Demo Administrator', role: 'admin', interests: [] }
];
if (config.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production.');
await mongoose.connect(config.MONGODB_URI);
for (const item of demo) {
  const { email, password, ...fields } = item;
  const user = await User.findOneAndUpdate(
    { email }, { $setOnInsert: { ...fields, email, passwordHash: await hashPassword(password), institution: 'Demo University' } },
    { upsert: true, new: true }
  );
  if (user.role === 'mentor') {
    await MentorProfile.findOneAndUpdate(
      { user: user._id }, { $setOnInsert: { user: user._id, bio: 'Friendly peer mentor for coursework and career preparation.', expertise: item.interests, languages: ['English', 'Hindi'], available: true, sessionFormats: ['individual', 'group'], ratingCount: 8, ratingAverage: 4.8 } }, { upsert: true }
    );
    await MentorApplication.findOneAndUpdate({ applicant: user._id, status: 'approved' }, { $setOnInsert: { applicant: user._id, institution: user.institution, pathway: 'senior', skills: item.interests, evidence: 'Development-only seeded mentor account.', academicYear: 3, cohortYear: new Date().getFullYear() - 2, identityStatus: 'verified', status: 'approved', approvedAt: new Date() } }, { upsert: true });
  }
}
console.log('Demo users seeded. Change/remove these accounts before production.');
await mongoose.disconnect();
