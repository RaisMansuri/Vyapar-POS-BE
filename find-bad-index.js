require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.POSTGRES_URL, {
  dialect: 'postgres',
  dialectModule: require('pg'),
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function findProblematicIndex() {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        i.relname AS name,
        pg_get_indexdef(ix.indexrelid) AS definition
      FROM
        pg_class t,
        pg_class i,
        pg_index ix
      WHERE
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND t.relname = 'Sales';
    `);

    console.log(`Checking ${rows.length} indices...`);
    const regex = /ON .*? (?:USING .*?\s)?\(([^]*)\)/gi;

    for (const row of rows) {
      const match = regex.exec(row.definition);
      // Reset regex state because of 'g' flag
      regex.lastIndex = 0;
      
      if (!match) {
        console.log('❌ FAILED MATCH for index:', row.name);
        console.log('Definition:', row.definition);
      } else if (!match[1]) {
        console.log('⚠️ MATCHED BUT NO GROUP 1 for index:', row.name);
        console.log('Definition:', row.definition);
      }
    }
    console.log('Check complete.');

  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

findProblematicIndex();
