// services/backupService.js - Fully Configurable for Multiple Projects
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const mongoose = require('mongoose');

class BackupService {
  constructor(config = {}) {
    // 🔧 CONFIGURABLE: MongoDB Connection
    this.mongoUri = config.mongoUri || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory';
    this.databaseName = config.databaseName || this.extractDatabaseName(this.mongoUri);
    
    // 🔧 CONFIGURABLE: Project settings
    this.projectName = config.projectName || this.databaseName; // Use DB name as project name if not specified
    this.backupDir = config.backupDir || path.join(__dirname, '..', 'backups');
    this.maxBackups = config.maxBackups || 7;
    
    // 🔧 CONFIGURABLE: Backup schedule (cron format)
    this.scheduleTime = config.scheduleTime || '0 2 * * *'; // Default: 2:00 AM daily
    
    // 🔧 CONFIGURABLE: Collections to backup (if empty, backs up all)
    this.specificCollections = config.specificCollections || []; // e.g., ['users', 'products']
    
    // 🔧 CONFIGURABLE: Collections to exclude
    this.excludeCollections = config.excludeCollections || ['sessions', 'logs']; // Skip these
    
    // 🔧 CONFIGURABLE: Connection management
    this.useExistingConnection = config.useExistingConnection !== false; // Default: true
    this.connection = null;
    
    console.log(`🔧 BackupService initialized:`);
    console.log(`   📍 MongoDB URI: ${this.mongoUri}`);
    console.log(`   🗄️ Database: ${this.databaseName}`);
    console.log(`   🏷️ Project: ${this.projectName}`);
    
    this.ensureBackupDirectory();
  }

  // 🔧 NEW: Extract database name from MongoDB URI
  extractDatabaseName(mongoUri) {
    try {
      // Handle different MongoDB URI formats
      const url = new URL(mongoUri);
      const dbName = url.pathname.substring(1); // Remove leading '/'
      
      // If no database in URI, use default
      if (!dbName || dbName === '') {
        console.warn('⚠️ No database name found in MongoDB URI, using "defaultdb"');
        return 'defaultdb';
      }
      
      // Remove query parameters if present
      return dbName.split('?')[0];
    } catch (error) {
      console.warn('⚠️ Could not parse MongoDB URI, using default database name');
      return 'defaultdb';
    }
  }

  // 🔧 NEW: Get or create database connection
  async getConnection() {
    if (this.useExistingConnection && mongoose.connection.readyState === 1) {
      // Use existing mongoose connection if available and connected
      console.log('📡 Using existing mongoose connection');
      return mongoose.connection;
    } else {
      // Create new connection for this backup service
      if (!this.connection || this.connection.readyState !== 1) {
        console.log(`📡 Creating new connection to: ${this.mongoUri}`);
        this.connection = await mongoose.createConnection(this.mongoUri);
        
        this.connection.on('connected', () => {
          console.log(`✅ Connected to ${this.databaseName} database`);
        });
        
        this.connection.on('error', (err) => {
          console.error(`❌ Connection error: ${err}`);
        });
      }
      return this.connection;
    }
  }

  // 🔧 NEW: Close connection when done (optional)
  async closeConnection() {
    if (this.connection && this.connection.readyState === 1) {
      await this.connection.close();
      console.log('📡 Backup service connection closed');
    }
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('Backup directory created');
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().split('T')[0];
    // 🔧 CHANGE: Dynamic filename based on project
    const backupFileName = `backup_${this.projectName}_${timestamp}.json`;
    const backupPath = path.join(this.backupDir, backupFileName);
    
    try {
      console.log(`Starting backup for ${this.projectName}: ${timestamp}`);
      
      // 🔧 CHANGE: Use dynamic connection
      const connection = await this.getConnection();
      const collections = await connection.db.listCollections().toArray();
      
      const backup = {
        timestamp: new Date().toISOString(),
        database: this.databaseName, // 🔧 CHANGE: Dynamic database name
        project: this.projectName,   // 🔧 CHANGE: Project identifier
        mongoUri: this.mongoUri.replace(/\/\/.*:.*@/, '//<credentials>@'), // Hide credentials in backup
        collections: {}
      };
      
      // 🔧 CONFIGURABLE: Filter collections based on settings
      const collectionsToBackup = this.getCollectionsToBackup(collections);
      
      for (const collection of collectionsToBackup) {
        const collectionName = collection.name;
        console.log(`Backing up collection: ${collectionName}`);
        
        try {
          const data = await connection.db.collection(collectionName).find({}).toArray();
          backup.collections[collectionName] = {
            count: data.length,
            data: data
          };
          console.log(`✓ ${collectionName}: ${data.length} documents`);
        } catch (error) {
          console.error(`Error backing up collection ${collectionName}:`, error.message);
          backup.collections[collectionName] = {
            error: error.message,
            data: []
          };
        }
      }
      
      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
      
      const stats = fs.statSync(backupPath);
      const fileSizeInMB = (stats.size / (1024*1024)).toFixed(2);
      
      console.log(`✅ Backup completed for ${this.projectName}!`);
      console.log(`📁 File: ${backupFileName}`);
      console.log(`📊 Size: ${fileSizeInMB} MB`);
      console.log(`📋 Collections backed up: ${Object.keys(backup.collections).length}`);
      
      Object.keys(backup.collections).forEach(name => {
        const col = backup.collections[name];
        if (col.error) {
          console.log(`   ❌ ${name}: ERROR - ${col.error}`);
        } else {
          console.log(`   ✓ ${name}: ${col.count} documents`);
        }
      });
      
      return backupPath;
    } catch (error) {
      console.error(`Backup failed for ${this.projectName}:`, error);
      throw error;
    }
  }

  // 🔧 NEW: Helper method to filter collections
  getCollectionsToBackup(allCollections) {
    let collectionsToBackup = allCollections;
    
    // If specific collections are defined, only backup those
    if (this.specificCollections.length > 0) {
      collectionsToBackup = allCollections.filter(col => 
        this.specificCollections.includes(col.name)
      );
    }
    
    // Exclude specified collections
    if (this.excludeCollections.length > 0) {
      collectionsToBackup = collectionsToBackup.filter(col => 
        !this.excludeCollections.includes(col.name)
      );
    }
    
    return collectionsToBackup;
  }

  async restoreBackup(backupPath) {
    try {
      console.log(`Starting restore from: ${backupPath}`);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
      
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      if (!backupData.collections) {
        throw new Error('Invalid backup file format');
      }
      
      // 🔧 CHANGE: Show project info in restore
      console.log(`📂 Restoring backup from: ${backupData.timestamp}`);
      console.log(`🏷️ Project: ${backupData.project || 'Unknown'}`);
      console.log(`🗄️ Database: ${backupData.database || 'Unknown'}`);
      console.log(`📋 Collections to restore: ${Object.keys(backupData.collections).length}`);
      
      // 🔧 CHANGE: Use dynamic connection
      const connection = await this.getConnection();
      
      for (const [collectionName, collectionData] of Object.entries(backupData.collections)) {
        if (collectionData.error || !collectionData.data) {
          console.log(`⚠️ Skipping ${collectionName} (has errors or no data)`);
          continue;
        }
        
        try {
          console.log(`Restoring collection: ${collectionName}`);
          
          try {
            await connection.db.collection(collectionName).drop();
          } catch (error) {
            // Collection might not exist, that's ok
          }
          
          if (collectionData.data.length > 0) {
            await connection.db.collection(collectionName).insertMany(collectionData.data);
            console.log(`✓ ${collectionName}: ${collectionData.data.length} documents restored`);
          } else {
            console.log(`✓ ${collectionName}: No data to restore`);
          }
        } catch (error) {
          console.error(`❌ Error restoring collection ${collectionName}:`, error.message);
        }
      }
      
      console.log('✅ Restore completed successfully');
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }

  cleanOldBackups() {
    try {
      // 🔧 CHANGE: Dynamic file pattern based on project
      const filePattern = `backup_${this.projectName}_`;
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith(filePattern) && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          time: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);

      console.log(`📂 Found ${files.length} backup files for ${this.projectName}`);

      if (files.length > this.maxBackups) {
        const filesToDelete = files.slice(this.maxBackups);
        
        console.log(`🗑️ Cleaning up ${filesToDelete.length} old backups`);
        filesToDelete.forEach(file => {
          try {
            fs.unlinkSync(file.path);
            console.log(`   ✓ Deleted: ${file.name}`);
          } catch (error) {
            console.error(`   ❌ Error deleting ${file.name}:`, error.message);
          }
        });
      } else {
        console.log('🧹 No old backups to clean');
      }
    } catch (error) {
      console.error('Error cleaning old backups:', error);
    }
  }

  listBackups() {
    try {
      // 🔧 CHANGE: Dynamic file pattern
      const filePattern = `backup_${this.projectName}_`;
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith(filePattern) && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            created: stats.mtime,
            size: `${(stats.size / (1024*1024)).toFixed(2)} MB`
          };
        })
        .sort((a, b) => b.created - a.created);

      return files;
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  scheduleBackups() {
    // 🔧 CONFIGURABLE: Dynamic schedule time
    cron.schedule(this.scheduleTime, async () => {
      console.log(`\n🕐 Starting scheduled backup for ${this.projectName}...`);
      try {
        await this.createBackup();
        this.cleanOldBackups();
        console.log(`✅ Scheduled backup completed for ${this.projectName}\n`);
      } catch (error) {
        console.error(`❌ Scheduled backup failed for ${this.projectName}:`, error.message);
      }
    });
    
    console.log(`📅 Daily backup scheduled for ${this.projectName} at ${this.scheduleTime}`);
  }

  async manualBackup() {
    try {
      console.log(`\n🔧 Manual backup triggered for ${this.projectName}...`);
      const backupPath = await this.createBackup();
      this.cleanOldBackups();
      console.log(`✅ Manual backup completed for ${this.projectName}\n`);
      return backupPath;
    } catch (error) {
      console.error(`❌ Manual backup failed for ${this.projectName}:`, error.message);
      throw error;
    }
  }

  async getBackupStats() {
    const backups = this.listBackups();
    const totalSize = backups.reduce((sum, backup) => {
      return sum + parseFloat(backup.size);
    }, 0);

    return {
      project: this.projectName,
      totalBackups: backups.length,
      totalSize: `${totalSize.toFixed(2)} MB`,
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
      newestBackup: backups.length > 0 ? backups[0].created : null,
      backups: backups
    };
  }
}

module.exports = BackupService;

// 🔧 USAGE EXAMPLES:

// Example 1: Using environment variables (recommended)
// MONGO_URI=mongodb://127.0.0.1:27017/inventory
// const inventoryBackup = new BackupService(); // Uses env vars automatically

// Example 2: E-commerce backend with custom MongoDB URI
// const ecommerceBackup = new BackupService({
//   mongoUri: 'mongodb://127.0.0.1:27017/ecommerce_store',
//   projectName: 'ecommerce', // Optional: will use 'ecommerce_store' if not provided
//   specificCollections: ['products', 'orders', 'users', 'categories'],
//   excludeCollections: ['sessions', 'logs', 'cache'],
//   maxBackups: 10,
//   scheduleTime: '0 3 * * *' // 3:00 AM
// });

// Example 3: Blog backend with different database
// const blogBackup = new BackupService({
//   mongoUri: 'mongodb://127.0.0.1:27017/blog_db',
//   // projectName will be automatically set to 'blog_db'
//   // databaseName will be automatically extracted as 'blog_db'
//   specificCollections: ['posts', 'users', 'comments'],
//   scheduleTime: '0 1 * * *' // 1:00 AM
// });

// Example 4: Multiple databases in one application
// const services = [
//   new BackupService({
//     mongoUri: 'mongodb://127.0.0.1:27017/inventory',
//     scheduleTime: '0 2 * * *'
//   }),
//   new BackupService({
//     mongoUri: 'mongodb://127.0.0.1:27017/users',
//     scheduleTime: '0 3 * * *'
//   }),
//   new BackupService({
//     mongoUri: 'mongodb://127.0.0.1:27017/analytics',
//     scheduleTime: '0 4 * * *'
//   })
// ];
// services.forEach(service => service.scheduleBackups());

// Example 5: Using existing mongoose connection
// const backupService = new BackupService({
//   useExistingConnection: true, // Will use current mongoose.connection
//   projectName: 'my_app'
// });

// Example 6: Remote MongoDB with authentication
// const remoteBackup = new BackupService({
//   mongoUri: 'mongodb://username:password@remote-server:27017/production_db',
//   projectName: 'production',
//   maxBackups: 30, // Keep 30 days
//   scheduleTime: '0 0 * * *' // Midnight
// });