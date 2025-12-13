const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupOrphanedEnrollments() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const enrollments = await mongoose.connection.db.collection('campaignenrollments').find({}).toArray();
    const campaigns = await mongoose.connection.db.collection('campaigns').find({}).project({ _id: 1 }).toArray();

    const campaignIds = campaigns.map(c => c._id.toString());
    const orphaned = enrollments.filter(e => !campaignIds.includes(e.campaignId.toString()));

    console.log('Total enrollments:', enrollments.length);
    console.log('Active campaigns:', campaignIds.length);
    console.log('Orphaned enrollments:', orphaned.length);

    if (orphaned.length > 0) {
        const orphanedIds = orphaned.map(e => e._id);
        const result = await mongoose.connection.db.collection('campaignenrollments').deleteMany({
            _id: { $in: orphanedIds }
        });
        console.log('Deleted orphaned enrollments:', result.deletedCount);
    } else {
        console.log('No orphaned enrollments to clean up.');
    }

    await mongoose.disconnect();
    console.log('Done!');
}

cleanupOrphanedEnrollments().catch(console.error);
