import Ajv from 'ajv';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

async function validateServerJson() {
  const ajv = new Ajv({ strict: false });
  const schemaUrl =
    'https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json';
  const dataPath = path.resolve(process.cwd(), 'server.json');

  try {
    console.log(`Fetching schema from ${schemaUrl}...`);
    const schemaResponse = await axios.get(schemaUrl);
    const schema = schemaResponse.data;

    console.log('Reading server.json...');
    const data = JSON.parse(await fs.readFile(dataPath, 'utf-8'));

    console.log('Compiling schema and validating data...');
    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (valid) {
      console.log('✅ server.json is valid!');
    } else {
      console.error('❌ server.json is invalid:');
      console.error(validate.errors);
      process.exit(1);
    }
  } catch (error) {
    console.error('An error occurred during validation:', error);
    process.exit(1);
  }
}

validateServerJson();
