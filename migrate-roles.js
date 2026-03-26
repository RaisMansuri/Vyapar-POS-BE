const { sequelize } = require('./src/config/db.config');
const User = require('./src/models/user.model');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB');
        
        const users = await User.findAll();
        console.log(`Found ${users.length} users`);
        
        for (const user of users) {
            const oldRole = user.role;
            const newRole = oldRole.toLowerCase();
            if (oldRole !== newRole) {
                console.log(`Updating ${user.email}: ${oldRole} -> ${newRole}`);
                // Use raw query or disable validation because ENUM might block the save if it's strict
                await sequelize.queryInterface.bulkUpdate('Users', 
                    { role: newRole }, 
                    { id: user.id }
                );
            }
        }
        
        console.log('Migration completed');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
