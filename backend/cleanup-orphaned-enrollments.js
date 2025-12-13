const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupOrphanedData() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all campaigns
    const campaigns = await mongoose.connection.db.collection('campaigns').find({}).project({ _id: 1 }).toArray();
    const campaignIds = campaigns.map(c => c._id);

    console.log('Active campaigns:', campaignIds.length);

    // Clean up orphaned enrollments
    const enrollments = await mongoose.connection.db.collection('campaignenrollments').find({}).toArray();
    const orphanedEnrollments = enrollments.filter(e => !campaignIds.some(id => id.toString() === e.campaignId.toString()));
    console.log('Orphaned enrollments:', orphanedEnrollments.length);

    if (orphanedEnrollments.length > 0) {
        const orphanedEnrollmentIds = orphanedEnrollments.map(e => e._id);
        const result = await mongoose.connection.db.collection('campaignenrollments').deleteMany({
            _id: { $in: orphanedEnrollmentIds }
        });
        console.log('Deleted orphaned enrollments:', result.deletedCount);
    }

    // Clean up orphaned email messages
    const emails = await mongoose.connection.db.collection('emailmessages').find({}).toArray();
    const orphanedEmails = emails.filter(e => e.campaignId && !campaignIds.some(id => id.toString() === e.campaignId.toString()));
    console.log('Orphaned email messages:', orphanedEmails.length);

    if (orphanedEmails.length > 0) {
        const orphanedEmailIds = orphanedEmails.map(e => e._id);
        const result = await mongoose.connection.db.collection('emailmessages').deleteMany({
            _id: { $in: orphanedEmailIds }
        });
        console.log('Deleted orphaned email messages:', result.deletedCount);
    }

    await mongoose.disconnect();
    console.log('Done!');
}

cleanupOrphanedData().catch(console.error);
