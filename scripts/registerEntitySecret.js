/**
 * Register Entity Secret with Circle
 * 
 * This script registers your entity secret with Circle's API
 * and generates a recovery file.
 * 
 * Usage:
 *   npm run register-secret
 *   or
 *   node scripts/registerEntitySecret.js [YOUR_CIRCLE_API_KEY]
 * 
 * Prerequisites:
 *   1. Generated an entity secret (run: npm run generate-secret)
 *   2. Have your Circle API key ready
 */

import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function registerSecret(apiKey, entitySecret) {
    try {
        console.log('\n📡 Registering Entity Secret with Circle...\n');
        
        const response = await registerEntitySecretCiphertext({
            apiKey: apiKey,
            entitySecret: entitySecret
        });

        if (response.data?.recoveryFile) {
            const timestamp = Date.now();
            const filename = `recovery_file_${timestamp}.dat`;
            
            fs.writeFileSync(filename, response.data.recoveryFile);
            
            console.log('✅ Entity Secret Registered Successfully!\n');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📁 Recovery file saved as:', filename);
            console.log('═══════════════════════════════════════════════════════════\n');
            
            console.log('⚠️  CRITICAL: BACKUP YOUR RECOVERY FILE!\n');
            console.log('This recovery file is ESSENTIAL for:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('✓ Recovering your wallets if you lose access');
            console.log('✓ Disaster recovery scenarios');
            console.log('✓ Moving to a different environment');
            console.log('✓ Compliance and audit requirements\n');
            
            console.log('🔒 RECOMMENDED BACKUP ACTIONS:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('1. ✅ Store in multiple secure locations (minimum 3)');
            console.log('2. ✅ Upload to encrypted cloud storage (1Password, etc)');
            console.log('3. ✅ Keep offline backup in a safe location');
            console.log('4. ✅ Document where backups are stored');
            console.log('5. ❌ NEVER commit to git or version control');
            console.log('6. ❌ NEVER share publicly or via email\n');
            
        } else {
            console.error('❌ No recovery file received in the response');
            console.error('Response:', JSON.stringify(response.data, null, 2));
        }
    } catch (error) {
        console.error('❌ Error registering entity secret:', error.message);
        if (error.response) {
            console.error('\nError details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     Circle Entity Secret Registration Tool               ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    // Get API key from command line or prompt
    let apiKey = process.argv[2];
    
    if (!apiKey) {
        console.log('No API key provided as argument.\n');
        apiKey = await question('Enter your Circle API Key: ');
        
        if (!apiKey || apiKey.trim() === '') {
            console.error('❌ Circle API Key is required!');
            console.log('\nUsage:');
            console.log('  npm run register-secret');
            console.log('  or');
            console.log('  node scripts/registerEntitySecret.js YOUR_CIRCLE_API_KEY\n');
            console.log('Get your API key from: https://console.circle.com/\n');
            rl.close();
            process.exit(1);
        }
    }
    
    // Get entity secret
    const entitySecret = await question('\nEnter your Entity Secret: ');
    
    if (!entitySecret || entitySecret.trim() === '') {
        console.error('❌ Entity Secret is required!');
        console.log('\nGenerate one first:');
        console.log('  npm run generate-secret');
        console.log('  or');
        console.log('  node scripts/generateEntitySecret.js\n');
        rl.close();
        process.exit(1);
    }
    
    rl.close();
    
    // Confirm before registering
    console.log('\n⚠️  You are about to register this Entity Secret with Circle.');
    console.log('This action will permanently link it to your Circle account.\n');
    
    try {
        await registerSecret(apiKey, entitySecret);
        console.log('✅ Registration complete! You can now use this Entity Secret.\n');
        console.log('Next steps:');
        console.log('1. Add to .dev.vars: ENTITY_SECRET=' + entitySecret);
        console.log('2. For production, use: wrangler secret put ENTITY_SECRET');
        console.log('3. Continue with deployment: npm run deploy\n');
    } catch (error) {
        console.error('\n❌ Registration failed. Please check your credentials and try again.');
        console.error('Common issues:');
        console.error('- Invalid API key format');
        console.error('- Network connection problems');
        console.error('- Entity secret already registered\n');
        process.exit(1);
    }
}

main();
