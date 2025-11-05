/**
 * Generate Entity Secret for Circle Developer Wallets
 * 
 * This script generates a secure entity secret that you'll need
 * to register with Circle's API.
 * 
 * Usage:
 *   npm run generate-secret
 *   or
 *   node scripts/generateEntitySecret.js
 */

import { generateEntitySecret } from "@circle-fin/developer-controlled-wallets";

async function main() {
    console.log('\n🔐 Generating Entity Secret...\n');
    
    try {
        const entitySecret = await generateEntitySecret();
        
        console.log('✅ Entity Secret Generated Successfully!\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Entity Secret:', entitySecret);
        console.log('═══════════════════════════════════════════════════════════\n');
        
        console.log('📝 IMPORTANT NEXT STEPS:\n');
        console.log('1. SAVE this Entity Secret securely (you\'ll need it for registration)');
        console.log('2. Copy it to your .dev.vars file:');
        console.log('   ENTITY_SECRET=' + entitySecret);
        console.log('\n3. Register it with Circle using:');
        console.log('   npm run register-secret');
        console.log('   or');
        console.log('   node scripts/registerEntitySecret.js YOUR_CIRCLE_API_KEY\n');
        
        console.log('⚠️  SECURITY WARNING:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('- NEVER commit this secret to git');
        console.log('- NEVER share it publicly or with anyone');
        console.log('- Store it in a secure password manager');
        console.log('- Use different secrets for dev/staging/production');
        console.log('- If compromised, generate a new one immediately\n');
        
    } catch (error) {
        console.error('❌ Error generating entity secret:', error.message);
        console.error('\nTroubleshooting:');
        console.error('- Make sure you ran: npm install');
        console.error('- Check your internet connection');
        console.error('- Verify @circle-fin/developer-controlled-wallets is installed\n');
        process.exit(1);
    }
}

main();
